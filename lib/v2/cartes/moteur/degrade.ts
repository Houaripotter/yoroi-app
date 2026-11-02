/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : le degrade pose sur ta photo, qui suit sa lumiere
 * (_propositions/cartes_v10_2026-11-02/html/a.js, forceDegrade et le degrade du rendu). Fonctions pures.
 *
 * La lumiere est la moyenne de la luminance de la photo derriere le bloc, de 0 (noir) a 1 (blanc).
 * Elle vient du module photo (analysePhoto.ts). Tant qu'il n'existe pas, elle est inconnue :
 * on prend LUMIERE_INCONNUE, un degrade plus fort que pour une photo sombre, pour que le texte reste lisible.
 */
import type { StyleCarte } from '../types';
import type { Placement } from './protection';

export type StyleMoteur = StyleCarte;

/** Lumiere supposee quand le module photo ne l'a pas mesuree : le texte reste lisible sur une photo claire */
export const LUMIERE_INCONNUE = 0.55;

/** La force du degrade derriere le bloc, de 0 a 1 */
export function forceDegrade(lumiere: number | null | undefined, style: StyleMoteur = 'color'): number {
  const L = typeof lumiere === 'number' && Number.isFinite(lumiere) ? lumiere : LUMIERE_INCONNUE;
  if (style === 'light') return L > 0.7 ? 0.62 : L > 0.5 ? 0.78 : L > 0.3 ? 0.88 : 0.95;
  return L < 0.3 ? 0.55 : L < 0.5 ? 0.72 : L < 0.7 ? 0.86 : 0.94;
}

/** Un arret du degrade : position en pixels depuis le haut de la zone photo, opacite de la couleur foncee */
export type Arret = { y: number; a: number };

/**
 * Les arrets du degrade vertical, sur la hauteur de la zone photo (RH).
 * Bloc en bas : un voile leger en haut (pastille), rien au milieu, fonce sous le bloc.
 * Bloc en haut : fonce en haut, rien au milieu, un voile leger en bas.
 */
export function arretsDegrade(p: Pick<Placement, 'mode' | 'top'>, hauteurBlocPx: number, RH: number, haut: number, pastille: number, force: number, lumiereHaut?: number | null): Arret[] {
  const voileHaut = typeof lumiereHaut === 'number' && lumiereHaut > 0.62 ? 0.38 : 0.22;
  if (p.mode === 'bas') {
    return [
      { y: 0, a: voileHaut },
      { y: haut + pastille + 80, a: 0 },
      { y: Math.max(0, p.top - 300), a: 0 },
      { y: p.top + 60, a: force * 0.82 },
      { y: RH, a: force },
    ];
  }
  return [
    { y: 0, a: force },
    { y: p.top + hauteurBlocPx - 60, a: force * 0.82 },
    { y: p.top + hauteurBlocPx + 300, a: 0 },
    { y: RH - 200, a: 0 },
    { y: RH, a: 0.35 },
  ];
}

/** Les arrets tries et bornes dans la zone photo, en part de RH (pour un degrade SVG) */
export function arretsEnPart(arrets: Arret[], RH: number): { offset: number; a: number }[] {
  const out: { offset: number; a: number }[] = [];
  let dernier = -1;
  for (const x of arrets) {
    const o = Math.max(0, Math.min(1, x.y / RH));
    const off = Math.max(o, dernier);
    out.push({ offset: off, a: Math.max(0, Math.min(1, x.a)) });
    dernier = off;
  }
  return out;
}
