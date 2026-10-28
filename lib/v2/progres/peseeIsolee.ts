/**
 * Progres, courbe de poids (maquette C, 28 octobre 2026) : la courbe trace ta TENDANCE lissee, et une pesee tres
 * eloignee de ta tendance reste un point a part, avec l'etiquette « pesee isolee » (plus jamais de trait qui plonge).
 * Une pesee est isolee quand :
 *  - le filtre de ta tendance l'a bornee (lib/v2/pesee/tendance.ts : plus de 2,5 ecarts types de l'attendu), ou
 *  - elle s'ecarte de ta tendance de 2 kg ou plus (le meme seuil que « Pesée à vérifier » sur la carte de l'accueil).
 * Le calcul de la tendance ne change pas : on ne fait que lire ce que le filtre rend deja. Fonctions pures, testees
 * (__tests__/unit/peseeIsolee.test.ts).
 */
import { filtrerTendance } from '@/lib/v2/pesee/tendance';
import type { PointTendance } from '@/lib/v2/pesee/tendance';

/** a partir de cet ecart avec ta tendance (kg), la pesee est isolee (meme seuil que l'alerte de l'accueil) */
export const SEUIL_ISOLEE_KG = 2;

export type PointCourbe = PointTendance & { isolee: boolean };

/** Ta tendance pesee par pesee, chaque pesee marquee isolee ou non */
export function courbeTendance(series: { date: string; value: number }[], today?: string): PointCourbe[] {
  return filtrerTendance(series, today).map((p, i) => ({ ...p, isolee: i > 0 && (p.aberrante || Math.abs(p.ecart) >= SEUIL_ISOLEE_KG) }));
}

/** Les pesees isolees seules, de la plus ancienne a la plus recente */
export function peseesIsolees(series: { date: string; value: number }[], today?: string): PointCourbe[] {
  return courbeTendance(series, today).filter((p) => p.isolee);
}
