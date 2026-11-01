/**
 * « Ce que tu suis » (1er novembre 2026, demande AU, point 1) : trois niveaux d'affichage du corps.
 *  - Essentiel (debutant) : poids, tendance, IMC, tour de taille, WHtR, masse grasse si disponible.
 *  - Sportif : + composition detaillee, mensurations completes, FFMI, questionnaire de forme, pesees multiples.
 *  - Athlete : + plis cutanes, biomarqueurs, segments.
 * Par defaut : Sportif si tu vises 3 seances ou plus par semaine ou si tu pratiques un sport de combat, sinon Essentiel.
 * Le niveau ne cache JAMAIS une donnee deja enregistree : seules les cartes vides et les invitations a saisir en
 * dependent (voirInvitation). Propose une fois (app/niveau-suivi.tsx), modifiable dans les Reglages.
 * Cle yoroi_niveau_suivi_v1 (objet), synchronisee comme reglage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { logger } from '@/lib/security/logger';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';

export const CLE_NIVEAU_SUIVI = 'yoroi_niveau_suivi_v1';
export const EVENEMENT_NIVEAU = 'YOROI_NIVEAU_SUIVI';

export type NiveauSuivi = 'essentiel' | 'sportif' | 'athlete';
export const NIVEAUX: NiveauSuivi[] = ['essentiel', 'sportif', 'athlete'];

export type BlocCorps =
  | 'poids' | 'tendance' | 'imc' | 'tour_de_taille' | 'whtr' | 'graisse'
  | 'composition_detaillee' | 'mensurations_plus' | 'ffmi' | 'forme_matin' | 'pesees_multiples'
  | 'plis' | 'biomarqueurs' | 'segments';

const NIVEAU_DU_BLOC: Record<BlocCorps, NiveauSuivi> = {
  poids: 'essentiel', tendance: 'essentiel', imc: 'essentiel', tour_de_taille: 'essentiel', whtr: 'essentiel', graisse: 'essentiel',
  composition_detaillee: 'sportif', mensurations_plus: 'sportif', ffmi: 'sportif', forme_matin: 'sportif', pesees_multiples: 'sportif',
  plis: 'athlete', biomarqueurs: 'athlete', segments: 'athlete',
};

export type EtatNiveau = { niveau: NiveauSuivi; /** choisi par toi (sinon : par defaut) */ choisi: boolean; /** l'ecran de choix a deja ete montre */ propose: boolean; majLe?: string };

/** Le bloc fait-il partie du niveau (pour une carte vide ou une invitation a saisir) */
export function blocDuNiveau(niveau: NiveauSuivi, bloc: BlocCorps): boolean {
  return NIVEAUX.indexOf(niveau) >= NIVEAUX.indexOf(NIVEAU_DU_BLOC[bloc]);
}

/** Afficher le bloc : toujours s'il a des donnees, sinon seulement si ton niveau le prevoit */
export function voirBloc(niveau: NiveauSuivi, bloc: BlocCorps, aDesDonnees: boolean): boolean {
  return aDesDonnees || blocDuNiveau(niveau, bloc);
}

/** Niveau par defaut : Sportif a 3 seances par semaine ou plus, ou avec un sport de combat ; sinon Essentiel */
export function niveauParDefaut(p: { seancesParSemaine?: number | null; sports?: string[] | null; sportsDeCombat?: Set<string> | string[] }): NiveauSuivi {
  const combat = new Set(p.sportsDeCombat ?? []);
  if ((p.seancesParSemaine ?? 0) >= 3) return 'sportif';
  if ((p.sports ?? []).some((s) => combat.has(s))) return 'sportif';
  return 'essentiel';
}

export function lireEtatBrut(brut: string | null): Partial<EtatNiveau> | null {
  if (!brut) return null;
  try {
    const o = JSON.parse(brut) as Partial<EtatNiveau>;
    if (!o || typeof o !== 'object') return null;
    return { ...(NIVEAUX.includes(o.niveau as NiveauSuivi) ? { niveau: o.niveau } : {}), choisi: o.choisi === true, propose: o.propose === true, ...(typeof o.majLe === 'string' ? { majLe: o.majLe } : {}) };
  } catch {
    return null;
  }
}

/** Ton niveau : celui choisi, sinon le niveau par defaut (calcule a chaque lecture tant que tu n'as pas choisi) */
export async function lireNiveau(defaut: NiveauSuivi): Promise<EtatNiveau> {
  try {
    const e = lireEtatBrut(await AsyncStorage.getItem(CLE_NIVEAU_SUIVI));
    if (e?.choisi && e.niveau) return { niveau: e.niveau, choisi: true, propose: true, majLe: e.majLe };
    return { niveau: defaut, choisi: false, propose: !!e?.propose };
  } catch (err) {
    logger.warn('[Niveau] lecture impossible', err);
    return { niveau: defaut, choisi: false, propose: false };
  }
}

async function ecrire(e: EtatNiveau): Promise<void> {
  await AsyncStorage.setItem(CLE_NIVEAU_SUIVI, JSON.stringify(e));
  try { DeviceEventEmitter.emit(EVENEMENT_NIVEAU, e.niveau); } catch { /* sans ecran */ }
  signalerASynchroniser();
}

export async function choisirNiveau(niveau: NiveauSuivi): Promise<void> {
  try {
    await ecrire({ niveau, choisi: true, propose: true, majLe: new Date().toISOString() });
  } catch (err) {
    logger.warn('[Niveau] enregistrement impossible', err);
  }
}

/** L'ecran de choix a ete montre (sans choix : le niveau par defaut reste) */
export async function marquerPropose(): Promise<void> {
  try {
    const e = lireEtatBrut(await AsyncStorage.getItem(CLE_NIVEAU_SUIVI));
    if (e?.propose) return;
    await AsyncStorage.setItem(CLE_NIVEAU_SUIVI, JSON.stringify({ ...(e ?? {}), propose: true, choisi: e?.choisi === true }));
  } catch (err) {
    logger.warn('[Niveau] marque impossible', err);
  }
}
