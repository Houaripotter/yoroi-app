/**
 * Le chemin de pierres vers le torii : la source unique de ses couleurs, de ses mesures et de son decoupage en paliers
 * (28 octobre 2026). La carte Ton poids de l'accueil (components/yoroi/v2/accueil/CartePoids.tsx) et l'onglet Progres
 * dessinent tous deux le chemin avec components/yoroi/v2/charts/CheminPierres.tsx, qui lit tout ici : les deux
 * changent ensemble.
 * Couleurs C « de l'aube au soleil » (maquette Carte2-C, choisie par Houari) : bleu nuit doux, lilas, peche clair, or
 * lumineux, et le torii dore avec un halo a l'arrivee. Aucune arrivee rouge.
 * Ancienne palette (menthe, bleu, lilas, peche, torii vermillon) : _archive_ancien_design_2026-10-09/carte_poids_v3_2026-10-28.
 *
 * Fichier pur.
 */

/** Les paliers du chemin : 25, 50, 75 et 100 % (le dernier, ton objectif, porte le torii) */
export const PALIERS_CHEMIN = [0.25, 0.5, 0.75, 1] as const;

/**
 * Decoupage en paliers, pour l'affichage seulement : le poids de chaque palier entre ton debut et ton objectif,
 * s'il est franchi (ta part du chemin l'a atteint) et le prochain a franchir, avec ce qu'il reste jusqu'a lui.
 */
export function paliersDuChemin(depart: number, objectif: number, actuel: number, part: number): { part: number; kg: number; franchi: boolean }[] & { prochain?: { kg: number; encore: number; dernier: boolean } | null } {
  const l = PALIERS_CHEMIN.map((f) => ({ part: f, kg: Math.round((depart + (objectif - depart) * f) * 10) / 10, franchi: part >= f - 1e-6 }));
  const suivant = l.find((x) => !x.franchi);
  return Object.assign(l, { prochain: suivant ? { kg: suivant.kg, encore: Math.max(0, Math.round(Math.abs(actuel - suivant.kg) * 10) / 10), dernier: suivant.part === 1 } : null });
}

/**
 * Les 4 pierres, une par quart. plein : la pierre remplie ; pale : la pierre a venir (clair, sombre) ; texte : le chiffre
 * du palier franchi, la pastille « Prochain palier » et ton poids pendant l'etape (clair, sombre).
 */
export const PIERRES_CHEMIN = [
  { plein: '#8C9BDE', pale: '#DEE2F7', paleSombre: '#262C4A', texte: '#34449A', texteSombre: '#A7B3EE' },
  { plein: '#C3A8F0', pale: '#ECE3FB', paleSombre: '#33294A', texte: '#6A3FB0', texteSombre: '#CDB6F4' },
  { plein: '#F8BE98', pale: '#FDE9DC', paleSombre: '#43301F', texte: '#A8541A', texteSombre: '#F9C7A6' },
  { plein: '#F6C83A', pale: '#FDF0C2', paleSombre: '#3D3212', texte: '#855800', texteSombre: '#F6CF5C' },
] as const;

/** Le torii dore de l'arrivee : son or, le trait sombre de son toit, son contour et son halo une fois atteint */
export const TORII_CHEMIN = { or: '#F0B323', trait: '#7A4E00', contour: '#FFFFFF', halo: '#F6C83A' } as const;

/** Mesures de la barre : pierres de 11, jour de 14 autour de chaque lanterne, lanterne de 19 sur 27, torii de 26 */
export const BARRE_PIERRES = { hauteur: 30, pierre: 11, jour: 14, lanterneL: 19, lanterneH: 27, torii: 26, halo: 56, chiffres: 15, ecartChiffres: 2 } as const;

/** L'etape en cours (0 a 3) pour une part du chemin : la pierre du prochain palier a franchir, la derniere une fois arrive */
export function pierreEnCours(part: number): number {
  return Math.max(0, Math.min(3, Math.floor(Math.max(0, part) / 0.25 + 1e-6)));
}

/** Melange de deux couleurs #RRGGBB */
export function melange(a: string, b: string, t: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + ca.map((x, k) => Math.round(x + (cb[k] - x) * t).toString(16).padStart(2, '0').toUpperCase()).join('');
}

/** La piste d'un arc de l'anneau : la pierre a venir, un peu plus soutenue pour rester visible sur le voile */
export function pisteAnneau(i: number, sombre: boolean): string {
  const p = PIERRES_CHEMIN[i];
  return sombre ? melange(p.paleSombre, p.plein, 0.25) : melange(p.pale, p.plein, 0.3);
}

/**
 * Ton poids dans la couleur de l'etape en cours (maquette C). L'or de la derniere etape (#855800) passe a #A87300,
 * l'or lumineux de la maquette. Sur le voile lilas de la carte (#E9E4FF) : 7,0 (bleu nuit), 5,8 (lilas), 4,3 (peche)
 * et 3,3 (or) a 1, au dessus du seuil AA de 3 a 1 du gros texte (le poids est en 30 gras). Un or plus sombre
 * (#946500, 4,1 a 1) tirait sur le kaki.
 */
export function couleurEtape(part: number, atteint: boolean, sombre: boolean): string {
  const p = PIERRES_CHEMIN[atteint ? 3 : pierreEnCours(part)];
  if (sombre) return p.texteSombre;
  return p.texte === '#855800' ? '#A87300' : p.texte;
}
