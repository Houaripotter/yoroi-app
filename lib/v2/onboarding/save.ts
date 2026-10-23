/**
 * Ecritures de l'onboarding, chacune a son moment et sans doublon :
 * la pesee du jour (ecran Poids), puis le profil, les reglages et l'espace (ecran de preparation).
 * Aucune lecture ni ecriture ici ne demande d'autorisation, sauf connectHealth (bouton explicite).
 * 18 octobre 2026 (INSTALLATION) : l'onboarding peut tourner sur des donnees deja la (reinstallation avec
 * un profil dans le trousseau, Studio « Simuler une premiere installation ») : rien n'est jamais efface ni
 * ecrase, tout est fusionne (lib/v2/onboarding/fusion.ts), et une lecture ratee n'ecrit rien.
 */
import { setProprietes, track } from '@/utils/telemetry';
import { DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { getProfile, getWeights, saveProfile } from '@/lib/database';
import { getUserSettingsStrict, saveUserSettings } from '@/lib/storage';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { setUserMode, setUserSport, setUserWeightCategory } from '@/lib/fighterModeService';
import { SPORTS } from '@/lib/sports';
import { getWeightCategories } from '@/lib/fighterMode';
import type { Sport, WeightCategory } from '@/lib/fighterMode';
import { saveEspace } from '@/lib/v2/espace';
import { choisirUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { lundiVersJs, saveHabitudePesee } from '@/lib/v2/pesee/rappelHabitude';
import { syncArmure } from '@/lib/v2/armure';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { importHealthDay, saveWeighIn } from '@/lib/v2/pesee/save';
import { readHealthWeighIns } from '@/lib/v2/pesee/health';
import type { HealthDay } from '@/lib/v2/pesee/health';
import { markTourSeen } from '@/components/yoroi/v2/tour/keys';
import { markWhatsNewSeen } from '@/components/WhatsNewModal';
import type { Draft, Reward, WeighInDone } from './draft';
import { objectifsDuBrouillon, weightGoalDe } from './objectifs';
import { NOUVEAUTES_30_KEY } from './parcours';
import { peseeAConserver, profilFusionne } from './fusion';
import { connecterSante } from '@/lib/v2/sante/connecter';
import type { IssueConnexion } from '@/lib/v2/sante/connexion';

export const LEGAL_ACCEPTED_KEY = '@yoroi_legal_accepted';
export const ONBOARDING_DONE_KEY = 'yoroi_onboarding_done';

const COMBAT_CATEGORIES = ['combat_grappling', 'combat_striking'];

export const todayIso = () => format(new Date(), 'yyyy-MM-dd');

/** Premier sport de combat parmi les sports choisis */
export function combatSportOf(sports: string[]): string | null {
  return sports.find((id) => COMBAT_CATEGORIES.includes(SPORTS.find((s) => s.id === id)?.category ?? '')) ?? null;
}

/** Sport qui a des categories de poids officielles parmi les sports choisis */
export function categorySportOf(sports: string[]): string | null {
  return sports.find((id) => getWeightCategories(id as Sport).length > 0) ?? null;
}

/** Categories de poids du sport, selon ton genre ('femme' ou 'female' : la liste femmes) */
export function categoriesOf(sport: string | null, gender?: string | null): WeightCategory[] {
  return sport ? getWeightCategories(sport as Sport, gender) : [];
}

// ============================================================
// Pesee du jour et ce qu'elle rapporte vraiment
// ============================================================

/**
 * Enregistre la pesee (une seule ligne : une nouvelle validation met a jour la meme pesee du jour)
 * et calcule ce que le moteur d'armure a reellement credite, en comparant son journal avant et apres.
 */
export async function saveOnboardingWeighIn(args: {
  weight: number;
  origin: 'manual' | 'health';
  health: HealthDay | null;
  previous: WeighInDone | null;
}): Promise<{ done: WeighInDone; reward: Reward | null }> {
  const before = await syncArmure(true).catch(() => null);
  const beforeKeys = new Set((before?.ledger ?? []).map((e) => e.key));
  const platesBefore = before?.state.plates ? before.state.plates.progress * before.state.plates.total : 0;

  const fromHealth = args.origin === 'health' && !!args.health?.weight && Math.abs(args.health.weight - args.weight) < 0.05;
  // 18 octobre 2026 : lecture stricte (une lecture ratee n'ecrit rien, l'ecran propose de reessayer)
  // et jamais de seconde pesee sur un jour qui en a deja une (reinstallation, restauration, Studio)
  const history = (await getWeights()) ?? [];
  const jour = fromHealth && args.health ? args.health.date : todayIso();
  let done: WeighInDone;
  if (peseeAConserver(history, jour, args.previous)) {
    // la pesee deja enregistree ce jour-la est gardee telle quelle : rien n'est ecrit ni remplace
    done = { date: jour, weight: args.weight, origin: fromHealth ? 'health' : 'manual', conservee: true };
  } else if (fromHealth && args.health) {
    // telle qu'Apple Sante l'a recue : rien n'est reecrit vers la sante, aucun doublon
    await importHealthDay(args.health);
    done = { date: args.health.date, weight: args.weight, origin: 'health' };
  } else {
    await saveWeighIn({ date: todayIso(), weight: args.weight, compo: {} }, history);
    done = { date: todayIso(), weight: args.weight, origin: 'manual' };
  }
  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);

  // deja recompensee une premiere fois : on ne refait pas la fete
  if (args.previous) return { done, reward: null };

  try {
    const after = await syncArmure(true);
    const lines = after.ledger
      .filter((e) => !beforeKeys.has(e.key))
      .map((e) => ({ label: e.label, amount: e.amount }))
      .sort((a, b) => a.amount - b.amount);
    const plates = after.state.plates;
    return {
      done,
      reward: {
        lines,
        total: lines.reduce((s, l) => s + l.amount, 0),
        platesBefore,
        platesAfter: plates ? plates.progress * plates.total : 0,
        rankName: after.state.rank.name,
      },
    };
  } catch (e) {
    logger.warn('[Onboarding] recompense de la pesee illisible', e);
    return { done, reward: null };
  }
}

// ============================================================
// Apple Sante ou Health Connect (seulement sur appui)
// ============================================================

export const healthName = () => (Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé');

/**
 * Connexion a la sante avec verification reelle (14 octobre 2026, SANTE CONNEXION) : une seule demande a la fois,
 * delai de securite, retour des Reglages reverifie, « connecte » seulement si une lecture renvoie des donnees.
 * L'import initial part en arriere-plan et se voit dans le bandeau (lib/v2/sante/connecter.ts).
 */
export async function connecterSanteSuivi(): Promise<IssueConnexion> {
  const issue = await connecterSante();
  track('sante_connexion', { plateforme: Platform.OS === 'android' ? 'health_connect' : 'apple_sante', resultat: issue === 'connecte' ? 'ok' : issue === 'abandon' ? 'annule' : issue === 'rien_lu' ? 'rien' : issue === 'erreur' || issue === 'indisponible' ? 'erreur' : 'refuse' });
  setProprietes({ sante_connectee: issue === 'connecte' ? 'oui' : 'non' });
  return issue;
}

/** Vrai seulement si une lecture reelle a reussi */
export async function connectHealth(): Promise<boolean> {
  return (await connecterSanteSuivi()) === 'connecte';
}

/** La pesee la plus recente recue par la sante ces 31 derniers jours */
export async function latestHealthWeighIn(): Promise<HealthDay | null> {
  const read = await Promise.race([readHealthWeighIns(31), new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000))]);
  if (!read) return null;
  const days = Object.values(read.days)
    .filter((d) => d.weight)
    .sort((a, b) => b.date.localeCompare(a.date));
  return days[0] ?? null;
}

// ============================================================
// Enregistrement final
// ============================================================

export async function saveOnboarding(d: Draft): Promise<void> {
  const name = d.name.trim();
  // vague 29 : plusieurs objectifs possibles, le profil garde le sens du poids qui en decoule
  const objectifs = objectifsDuBrouillon(d);
  // 18 octobre 2026 : lecture stricte du profil. Si elle echoue, rien n'est ecrit (la preparation propose
  // de reessayer) : saveProfile remplace toute la ligne, il ne doit jamais partir d'un profil inconnu.
  const existing = await getProfile();
  // sans objectif choisi, l'objectif deja enregistre reste
  const weightGoal = objectifs.length ? weightGoalDe(objectifs) : existing?.weight_goal ?? 'maintain';
  const startWeight = d.weighIn?.weight ?? d.weight ?? undefined;

  // fusion : tes reponses remplacent, le reste (depart, photo, naissance, age, champs laisses vides) est garde
  await saveProfile(
    profilFusionne(existing, { name, gender: d.gender, height: d.height, target: d.target, startWeight, weightGoal, today: todayIso() }),
  );
  // reglages du trousseau : fusionnes par saveUserSettings, et seulement s'ils sont lisibles
  // (sinon l'ecriture repartirait des valeurs par defaut et effacerait les autres reglages)
  let reglagesLisibles = true;
  try {
    await getUserSettingsStrict();
  } catch (e) {
    reglagesLisibles = false;
    logger.warn('[Onboarding] reglages illisibles, rien n est ecrit dans le trousseau', e);
  }
  if (reglagesLisibles) {
    await saveUserSettings({
      ...(name ? { username: name } : {}),
      ...(d.gender ? { gender: d.gender === 'femme' ? 'female' : 'male' } : {}),
      ...(d.height ? { height: d.height } : {}),
      ...(d.target ? { targetWeight: d.target } : {}),
      goal: weightGoal,
      onboardingCompleted: true,
    });
  }

  const competiteur = objectifs.includes('combat');
  await setUserMode(competiteur ? 'competiteur' : 'loisir');
  const combat = categorySportOf(d.sports) ?? combatSportOf(d.sports);
  if (competiteur && combat) await setUserSport(combat as Sport);
  if (competiteur && d.category) await setUserWeightCategory(d.category);

  await saveEspace({
    sportsFavoris: d.sports,
    ...(objectifs.length ? { objectifs } : {}),
    // vague 27 : ce qui t'a freine choisit les conseils du jour de l'accueil
    ...(d.freins.length ? { freins: d.freins } : {}),
    // objectif choisi par l'utilisateur sur l'ecran Rythme ; sans choix, rien n'est impose
    ...(d.sessions ? { objectifSemaine: d.sessions, objectifChoisi: true } : { objectifChoisi: false }),
    // vague 28 : tes jours d'entrainement (semaine type legere). Le planning, s'il a des creneaux, reste prioritaire
    // a l'affichage (lib/v2/seances/joursPrevus.ts) et n'est jamais modifie ici.
    ...(d.jours.length ? { joursSemaine: d.jours } : {}),
  });
  // Vague 45 : l'univers choisi (Japon, Classique ou Sans personnage) pose le personnage et, si besoin, la scene
  await choisirUnivers(d.univers ?? 'japon', d.gender === 'femme' ? 'f' : 'h');

  // moment habituel de la pesee : le rappel doux ne sera programme que si les notifications sont autorisees
  if (d.peseeMoment) {
    await saveHabitudePesee({
      moment: d.peseeMoment,
      actif: d.peseeMoment !== 'inconnu',
      // vague 28 : seulement tes jours de pesee (stockes comme Date.getDay(), 0 = dimanche)
      jours: d.peseeJours.map(lundiVersJs),
      heure: d.peseeMoment === 'heure' ? d.peseeHeure ?? '07:00' : null,
    });
  }

  await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
  // nouvel utilisateur : la bienvenue remplace la visite guidee et les nouveautes
  await AsyncStorage.setItem('@yoroi_onboarding_tour_done', 'true').catch(() => {});
  // 14 octobre 2026 : l'onboarding complet contient deja les etapes de la 3.0 (univers, Sante) : pas de « Nouveautes »
  await AsyncStorage.setItem(NOUVEAUTES_30_KEY, 'true').catch(() => {});
  await Promise.all([markTourSeen(), markWhatsNewSeen()]);
  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  logger.info('Onboarding completed', { step: 'all' });
}
