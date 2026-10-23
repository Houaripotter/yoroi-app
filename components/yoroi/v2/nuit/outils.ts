/**
 * Couleurs, formats et echelle de temps communs a l'ecran « Ta nuit » (16 octobre 2026).
 * Phases : de l'or (eveil, le soleil) a l'indigo profond (sommeil profond), plus c'est sombre plus c'est profond.
 * Verifie au validateur de palette : ecarts daltonisme et vision normale suffisants entre voisines, dans les deux modes ;
 * les phases claires ont toujours leur nom ecrit a cote (lignes du graphique et liste).
 */
import type { PhaseNuit } from '@/lib/v2/sante/nuit';
import { traduire } from '@/lib/i18n/tr';

export const PHASES_CLAIR: Record<PhaseNuit, string> = {
  eveil: '#C9963A',
  paradoxal: '#86A2EC',
  leger: '#3A5FC4',
  profond: '#1A2B70',
  endormi: '#6F86BE',
};

export const PHASES_SOMBRE: Record<PhaseNuit, string> = {
  eveil: '#D9B25C',
  paradoxal: '#B3C6F7',
  leger: '#7392E6',
  profond: '#3F5BC0',
  endormi: '#8C9FCB',
};

export function couleursPhases(sombre: boolean): Record<PhaseNuit, string> {
  return sombre ? PHASES_SOMBRE : PHASES_CLAIR;
}

/** Nom court des lignes du graphique */
export const NOM_LIGNE: Record<PhaseNuit, string> = {
  eveil: traduire('Éveil'),
  paradoxal: 'Paradoxal',
  leger: traduire('Léger'),
  profond: 'Profond',
  endormi: 'Endormi',
};

/** Ordre des lignes, de haut en bas, comme Sante */
export const ORDRE_LIGNES: PhaseNuit[] = ['eveil', 'endormi', 'paradoxal', 'leger', 'profond'];

/** 43 min, 2 h 04 */
export function duree(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

/** 2 h 19 */
export function heure(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Heure pleine avant le debut et apres la fin : meme echelle pour le graphique des phases et celui du coeur */
export function domaineHeures(debut: number, fin: number): { t0: number; t1: number; ticks: number[] } {
  const a = new Date(debut);
  const t0 = new Date(a.getFullYear(), a.getMonth(), a.getDate(), a.getHours()).getTime();
  const b = new Date(fin);
  let t1 = new Date(b.getFullYear(), b.getMonth(), b.getDate(), b.getHours()).getTime();
  if (t1 < fin) t1 += 3600000;
  if (t1 <= t0) t1 = t0 + 3600000;
  const heures = (t1 - t0) / 3600000;
  const pas = heures > 6 ? 3 : heures > 3 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = t0; t <= t1; t += 3600000) {
    if (new Date(t).getHours() % pas === 0) ticks.push(t);
  }
  return { t0, t1, ticks };
}

/** Marge a droite commune aux deux graphiques (graduations du coeur) : les heures tombent au meme pixel */
export const MARGE_DROITE = 30;
