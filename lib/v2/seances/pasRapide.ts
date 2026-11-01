/**
 * Pas des boutons de charge pendant une seance (+ et -).
 * 1er novembre 2026, decision de Houari : un appui simple donne TOUJOURS le pas normal, quelle que soit la vitesse
 * des appuis. Plus aucune acceleration par tapes repetees (l'ancienne logique, seuil de 350 ms entre deux tapes,
 * est archivee dans _archive_ancien_design_2026-10-09/pas_rapide_2026-10-31/ : un rythme de tape normal, 3 par
 * seconde, restait sous le seuil et la charge montait de 10 en 10 jusqu'a 230 kg).
 * L'acceleration ne vient que d'un appui maintenu : repetition au pas normal, puis apres 1 s un pas moyen (la moitie
 * du saut), puis apres 2 s le saut (10 kg, 20 lb). On relache, tout redevient normal.
 * Au saut, la valeur se cale sur le multiple du pas dans le sens de l'appui (63 + 10 donne 70, 63 - 10 donne 60).
 */

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

