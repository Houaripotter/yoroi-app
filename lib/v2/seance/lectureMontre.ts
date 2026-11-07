/**
 * Lecture des entrainements de la montre dans Apple Sante, pour la seance en direct (7 novembre 2026).
 * Reprend la lecture des seances de l'import (lib/healthConnect.ios.ts, lireEntrainementsDepuis) : aucune
 * nouvelle autorisation. iPhone seulement, hors Expo Go. Les regles sont dans ./montreCardio.ts (pur, teste).
 */
import { Platform } from 'react-native';
import { lireEntrainement } from './montreCardio';
import type { EntrainementMontre, SeanceSanteBrute } from './montreCardio';

export type LectureMontre =
  /** lecture faite (la liste peut etre vide) */
  | { etat: 'ok'; liste: EntrainementMontre[] }
  /** Apple Sante n'a jamais ete connecte, ou rien n'est lisible : proposer la connexion a Sante */
  | { etat: 'acces' }
  /** pas d'Apple Sante ici (Android, Expo Go, web) */
  | { etat: 'indisponible' };

type Service = {
  statutDemande?: () => Promise<'a_demander' | 'repondu' | 'inconnu'>;
  lectureReelle?: () => Promise<boolean>;
  lireEntrainementsDepuis?: (depuisMs: number) => Promise<SeanceSanteBrute[] | null>;
};

/** Vrai sur iPhone : le bouton « Récupérer depuis ta montre » y est montre (sans Sante lisible, il le dit) */
export function surIphone(): boolean {
  return Platform.OS === 'ios';
}

/** Vrai si l'iPhone peut lire Apple Sante dans cette version de l'app */
export function santeLisible(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const w = require('@/lib/healthKit.wrapper') as typeof import('@/lib/healthKit.wrapper');
    return !!w.isHealthKitAvailable && !w.isRunningInExpoGo && !w.isMockMode;
  } catch {
    return false;
  }
}

/**
 * Les entrainements finis apres `depuisMs`. `verifierAcces` (appui sur le bouton) : sans aucune seance lisible,
 * un essai de lecture dit si l'acces a Sante manque ; sans (banniere discrete), on ne demande rien.
 */
export async function lireEntrainementsMontre(depuisMs: number, verifierAcces: boolean): Promise<LectureMontre> {
  if (!santeLisible()) return { etat: 'indisponible' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const svc = (require('@/lib/healthConnect') as { healthConnect: Service }).healthConnect;
    if (!svc?.lireEntrainementsDepuis) return { etat: 'indisponible' };
    const statut = svc.statutDemande ? await svc.statutDemande().catch(() => 'inconnu' as const) : 'inconnu';
    if (statut === 'a_demander') return { etat: 'acces' };
    const brut = await svc.lireEntrainementsDepuis(depuisMs);
    if (brut && brut.length) return { etat: 'ok', liste: brut.map(lireEntrainement).filter((w): w is EntrainementMontre => !!w) };
    if (verifierAcces && svc.lectureReelle && !(await svc.lectureReelle().catch(() => false))) return { etat: 'acces' };
    return { etat: 'ok', liste: [] };
  } catch {
    return { etat: 'ok', liste: [] };
  }
}
