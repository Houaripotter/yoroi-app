/**
 * Pas des boutons de charge pendant une seance (+ et -).
 * 1er novembre 2026, precision de Houari : les appuis rapides doivent bien monter de 10 en 10, c'etait la sensibilite
 * qui posait probleme. L'ancien seuil (350 ms entre deux tapes, archive dans
 * _archive_ancien_design_2026-10-09/pas_rapide_2026-10-31/) etait au-dessus d'un rythme normal (3 tapes par seconde,
 * environ 330 ms) : la rafale ne s'arretait jamais et la charge est montee a 230 kg.
 * Regle : le saut ne s'active qu'avec de vrais appuis tres rapides, au moins TAPES_RAPIDES_POUR_SAUT appuis d'affilee
 * avec moins de DELAI_TAPE_RAPIDE_MS entre chaque. Des qu'un ecart depasse le seuil, retour immediat au pas normal,
 * a partir de cet appui. Les ecarts se mesurent a l'heure du doigt pose (horodatage natif de l'evenement).
 * Appui maintenu, en plus : repetition au pas normal, puis apres 1 s un pas moyen (la moitie
 * du saut), puis apres 2 s le saut (10 kg, 20 lb). On relache, tout redevient normal.
 * Au saut, la valeur se cale sur le multiple du pas dans le sens de l'appui (63 + 10 donne 70, 63 - 10 donne 60).
 */

/** ecart maximal entre deux appuis pour qu'ils comptent comme tres rapides */
export const DELAI_TAPE_RAPIDE_MS = 220;
/** nombre d'appuis tres rapides d'affilee a partir duquel l'appui fait le saut (le 3e fait +10) */
export const TAPES_RAPIDES_POUR_SAUT = 3;

export type Rafale = { bouton: string | null; derniere: number; compte: number };

export const RAFALE_VIDE: Rafale = { bouton: null, derniere: 0, compte: 0 };

/** Compte un appui. `saut` vaut vrai pour le TAPES_RAPIDES_POUR_SAUT-ieme appui tres rapide d'affilee et les suivants. */
export function compterTape(r: Rafale, bouton: string, maintenant: number): { rafale: Rafale; saut: boolean } {
  const ecart = maintenant - r.derniere;
  // ecart negatif ou illisible : on repart du pas normal
  const suite = r.bouton === bouton && r.compte > 0 && Number.isFinite(ecart) && ecart >= 0 && ecart < DELAI_TAPE_RAPIDE_MS;
  const compte = suite ? r.compte + 1 : 1;
  return { rafale: { bouton, derniere: maintenant, compte }, saut: compte >= TAPES_RAPIDES_POUR_SAUT };
}

/** Heure du doigt pose : horodatage natif de l'evenement s'il existe, sinon l'heure du JS */
export function heureAppui(e?: { nativeEvent?: { timestamp?: number } } | null): number {
  const t = e?.nativeEvent?.timestamp;
  return typeof t === 'number' && Number.isFinite(t) && t > 0 ? t : Date.now();
}

export const REPETITION_MS = 150;
/** cadence des gros pas, plus lente pour pouvoir lacher a temps */
export const REPETITION_GROS_MS = 250;
export const APPUI_LONG_MOYEN_MS = 1000;
export const APPUI_LONG_SAUT_MS = 2000;

/**
 * Pas a appliquer pendant un appui maintenu, selon sa duree.
 * `null` : pas normal. Sinon le gros pas (moitie du saut, puis le saut).
 */
export function pasAppuiMaintenu(dureeMs: number, saut: number | undefined | null): number | null {
  if (!saut || saut <= 0 || !Number.isFinite(dureeMs)) return null;
  if (dureeMs >= APPUI_LONG_SAUT_MS) return saut;
  if (dureeMs >= APPUI_LONG_MOYEN_MS) return saut / 2;
  return null;
}

const net = (v: number) => Math.round(v * 100) / 100;

/**
 * Valeur suivante. Sans saut : valeur + dir x pas. Avec saut : prochain multiple du saut dans le sens de l'appui.
 * Toujours bornee entre min (0 par defaut) et max.
 */
export function valeurSuivante(valeur: number, dir: 1 | -1, pas: number, saut: number | null, min = 0, max = Infinity): number {
  let next: number;
  if (saut && saut > 0) {
    const q = net(valeur / saut);
    const cale = Number.isInteger(q);
    next = dir > 0 ? (cale ? valeur + saut : Math.ceil(q) * saut) : cale ? valeur - saut : Math.floor(q) * saut;
  } else {
    next = valeur + dir * pas;
  }
  return Math.min(max, Math.max(min, net(next)));
}

