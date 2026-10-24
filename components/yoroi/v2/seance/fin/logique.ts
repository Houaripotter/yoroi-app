/**
 * Fin de seance (24 octobre 2026) : la logique pure de l'ecran, sans React ni base.
 * Quelles tuiles mettre en grand, la valeur d'un compteur qui monte, la jauge de la semaine,
 * la ligne de comparaison avec la seance precedente.
 */

export type CleTuile = 'duree' | 'distance' | 'rounds' | 'series' | 'tonnage';
export type Tuile = { cle: CleTuile; cible: number };

export type ChiffresSeance = {
  durationMin?: number | null;
  sets?: number | null;
  tonnage?: number | null;
  rounds?: number | null;
  distance?: number | null;
};

const ORDRE: CleTuile[] = ['duree', 'distance', 'rounds', 'series', 'tonnage'];

/** Les tuiles en grand : la duree d'abord, puis ce qui compte pour ce sport, au plus `max` */
export function choisirTuiles(s: ChiffresSeance, max = 3): Tuile[] {
  const v: Record<CleTuile, number> = {
    duree: Math.max(0, s.durationMin ?? 0),
    distance: Math.max(0, s.distance ?? 0),
    rounds: Math.max(0, s.rounds ?? 0),
    series: Math.max(0, s.sets ?? 0),
    tonnage: (s.tonnage ?? 0) >= 1 ? (s.tonnage as number) : 0,
  };
  return ORDRE.filter((k) => v[k] > 0)
    .slice(0, Math.max(0, max))
    .map((cle) => ({ cle, cible: v[cle] }));
}

/** Courbe de sortie douce : rapide au debut, se pose a la fin */
export function sortieDouce(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

/** Valeur affichee d'un compteur qui monte, a l'avancement t (0 a 1), arrondie a `decimales` */
export function valeurMontee(cible: number, t: number, decimales = 0): number {
  if (!Number.isFinite(cible) || cible <= 0) return 0;
  if (t >= 1) return cible;
  const f = 10 ** Math.max(0, decimales);
  return Math.round(cible * sortieDouce(t) * f) / f;
}

export type JaugeSemaine = {
  /** remplissage de la barre, 0 a 1 */
  ratio: number;
  atteint: boolean;
  depasse: boolean;
  /** seances qui manquent pour l'objectif */
  reste: number;
};

/** La jauge de la semaine ; objectif 0 : pas d'objectif choisi */
export function jaugeSemaine(fait: number, objectif: number): JaugeSemaine {
  const f = Math.max(0, Math.round(fait || 0));
  const o = Math.max(0, Math.round(objectif || 0));
  if (o === 0) return { ratio: f > 0 ? 1 : 0, atteint: false, depasse: false, reste: 0 };
  return { ratio: Math.min(1, f / o), atteint: f >= o, depasse: f > o, reste: Math.max(0, o - f) };
}

/** Les ecarts avec la seance precedente en une seule phrase : « 10 min de plus, le même ressenti » */
export function ligneComparaison(lignes: string[] | null | undefined): string | null {
  const l = (lignes ?? []).map((x) => x.trim()).filter(Boolean);
  if (!l.length) return null;
  return l.map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1))).join(', ');
}
