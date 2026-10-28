/**
 * Quand proposer la copie dans le cloud (iCloud Drive, Google Drive), sans empiler les fenetres (28 octobre 2026).
 * Houari : « fais ce qui est le mieux pour les utilisateurs ».
 *
 * Avant : la carte de l'accueil (components/yoroi/v2/accueil/BackupNotice.tsx) attendait 48 heures apres
 * l'installation. Des donnees saisies le premier jour restaient sans copie deux jours.
 * Maintenant, la proposition d'activer la copie automatique vient des que tu as quelque chose a proteger :
 *  - juste apres la visite guidee (faite ou passee) ET une fois la proposition du coach repondue
 *    (lib/v2/onboarding/propositionCoach.ts) : une seule carte a la fois sur l'accueil ;
 *  - ou des ta premiere pesee saisie a la main ou ta premiere seance enregistree (si la visite n'a pas eu lieu),
 *    toujours apres la carte du coach ;
 *  - au plus tard 48 heures apres l'installation, comme avant.
 * Jamais pendant la visite guidee.
 * « Plus tard » la range 7 jours (au plus une fois par semaine apres un refus), aussi pour la carte de fin de seance.
 * Fin de seance (components/yoroi/v2/seance/fin/CopieCloud.tsx) : la meme proposition, mais jamais le meme jour
 * que la carte de l'accueil. La premiere montree ce jour-la garde la place. Une copie automatique deja reliee
 * part toujours en silence a la fin de la seance (ce n'est pas une proposition).
 * Mode manuel (pas de module natif) : sans aucune copie, memes moments ; avec une copie, rappel apres 7 jours.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EtatProtection } from './copieAuto';

export const DELAI_MAX_HEURES = 48;
export const JOURS_APRES_REFUS = 7;
export const JOURS_RAPPEL_MANUEL = 7;

export const CLE_INSTALLATION = '@yoroi_install_date';
export const CLE_PLUS_TARD = '@yoroi_rappel_copie_plus_tard';
export const CLE_MONTREE_ACCUEIL = '@yoroi_copie_proposee_accueil_jour';
export const CLE_MONTREE_FIN_SEANCE = '@yoroi_copie_proposee_fin_seance_jour';

export type ContexteCopie = {
  etat: EtatProtection;
  /** mode manuel : jours depuis la derniere copie hors du telephone, null si jamais */
  joursDepuisCopie: number | null;
  /** heures depuis l'installation */
  heuresDepuisInstallation: number;
  visiteFaite: boolean;
  visiteEnCours: boolean;
  /** la carte du coach attend encore une reponse sur l'accueil */
  coachEnAttente: boolean;
  /** au moins une pesee saisie a la main ou une seance */
  aDesDonnees: boolean;
  /** « Plus tard » (ISO), null si jamais */
  plusTardLe: string | null;
  /** jour (AAAA-MM-JJ) ou l'autre carte (accueil ou fin de seance) a deja propose la copie */
  autreCarteLe: string | null;
  /** aujourd'hui, AAAA-MM-JJ local */
  aujourdhui: string;
  now?: number;
};

/** « Plus tard » il y a moins de 7 jours */
export function refusRecent(plusTardLe: string | null, now = Date.now()): boolean {
  if (!plusTardLe) return false;
  const t = new Date(plusTardLe).getTime();
  return Number.isFinite(t) && (now - t) / 86400000 < JOURS_APRES_REFUS;
}

/** Le premier moment est arrive : rien d'autre a l'ecran, et quelque chose a proteger (ou 48 heures passees) */
export function premierMomentArrive(c: Pick<ContexteCopie, 'visiteFaite' | 'visiteEnCours' | 'coachEnAttente' | 'aDesDonnees' | 'heuresDepuisInstallation'>): boolean {
  if (c.visiteEnCours) return false;
  if (c.heuresDepuisInstallation >= DELAI_MAX_HEURES) return true;
  return !c.coachEnAttente && (c.visiteFaite || c.aDesDonnees);
}

/** La carte de l'accueil se montre-t-elle ? */
export function montrerCarteAccueil(c: ContexteCopie): boolean {
  const now = c.now ?? Date.now();
  if (c.visiteEnCours || c.etat === 'protege') return false;
  if (refusRecent(c.plusTardLe, now)) return false;
  if (c.autreCarteLe === c.aujourdhui) return false;
  if (c.etat === 'en_panne') return true;
  if (c.etat === 'a_activer') return premierMomentArrive(c);
  // mode manuel
  return c.joursDepuisCopie === null ? premierMomentArrive(c) : c.joursDepuisCopie >= JOURS_RAPPEL_MANUEL;
}

/**
 * La carte de fin de seance propose-t-elle la copie ? (une seance enregistree : il y a quelque chose a proteger)
 * Copie automatique reliee : toujours true, elle part en silence et le dit en une ligne.
 */
export function montrerFinSeance(c: Pick<ContexteCopie, 'etat' | 'plusTardLe' | 'autreCarteLe' | 'aujourdhui' | 'now'>): boolean {
  if (c.etat === 'protege') return true;
  if (refusRecent(c.plusTardLe, c.now ?? Date.now())) return false;
  return c.autreCarteLe !== c.aujourdhui;
}

// ---- stockage (petites lectures, jamais bloquantes) ----

const lire = async (k: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(k);
  } catch {
    return null;
  }
};
const ecrire = async (k: string, v: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(k, v);
  } catch {
    // sans importance : au pire la carte revient une fois
  }
};

/** Heures depuis l'installation ; la premiere lecture note l'installation */
export async function heuresDepuisInstallation(now = Date.now()): Promise<number> {
  const raw = await lire(CLE_INSTALLATION);
  if (!raw) {
    await ecrire(CLE_INSTALLATION, new Date(now).toISOString());
    return 0;
  }
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? Math.max(0, (now - t) / 3600000) : 0;
}

export const lirePlusTard = () => lire(CLE_PLUS_TARD);
export const noterPlusTard = (now = Date.now()) => ecrire(CLE_PLUS_TARD, new Date(now).toISOString());
export const lireMontreeAccueil = () => lire(CLE_MONTREE_ACCUEIL);
export const lireMontreeFinSeance = () => lire(CLE_MONTREE_FIN_SEANCE);
export const noterMontreeAccueil = (jour: string) => ecrire(CLE_MONTREE_ACCUEIL, jour);
export const noterMontreeFinSeance = (jour: string) => ecrire(CLE_MONTREE_FIN_SEANCE, jour);
