/**
 * 24 octobre 2026 : tes scenes en fond de carte, et les voiles des fonds image.
 * Un fond de carte peut etre une de tes scenes : FondId 'scene:<id>' (les anciens choix, 'scene', 'plage'..., restent valables).
 * Les scenes proposees sont exactement celles que le choix de scene de l'accueil te laisse prendre
 * (meme regle que isSceneLocked : offertes, Premium, abonnement annuel, rang, scenes gagnees dans le Dojo).
 */
import type { SceneId } from '@/lib/v2/espace';
import { THEMES, isThemeUnlocked } from '@/lib/v2/dojo/personnages';
import { sectionsGalerie } from '@/lib/v2/espace/presentation';
import type { FondId } from './types';

const PREFIXE = 'scene:';

/** La scene d'un fond 'scene:<id>', sinon null (le fond 'scene' seul est ta scene d'accueil) */
export function sceneDuFond(fond: FondId | string | null | undefined): SceneId | null {
  if (typeof fond !== 'string' || !fond.startsWith(PREFIXE)) return null;
  const id = fond.slice(PREFIXE.length);
  return id ? (id as SceneId) : null;
}

/** Le fond de carte d'une de tes scenes */
export function fondDeScene(id: SceneId): FondId {
  return `${PREFIXE}${id}` as FondId;
}

/** Meme regle que le choix de scene de l'accueil (Pickers.isSceneLocked) : vrai si tu peux prendre cette scene */
export function scenePossedee(id: SceneId, rankIndex: number, isPremium: boolean, isAnnual = false): boolean {
  const t = THEMES.find((x) => x.id === id);
  return t ? isThemeUnlocked(t, rankIndex, isPremium, isAnnual) : true;
}

export type GroupeScenesCarte = { key: string; titre: string; scenes: SceneId[] };

/** Tes scenes, rangees par univers comme la galerie Ta scene ; les univers vides sont retires */
export function scenesPourCarte(rankIndex: number, isPremium: boolean, isAnnual = false): GroupeScenesCarte[] {
  const vues = new Set<SceneId>();
  return sectionsGalerie('toutes')
    .map((s) => ({
      key: s.key as string,
      titre: s.titre,
      scenes: s.scenes.filter((id) => {
        if (vues.has(id) || !scenePossedee(id, rankIndex, isPremium, isAnnual)) return false;
        vues.add(id);
        return true;
      }),
    }))
    .filter((g) => g.scenes.length > 0);
}

/**
 * Cadrage d'une scene paysage (1200 x 670) dans un cadre plus etroit : l'image garde la hauteur du cadre
 * et glisse pour mettre son centre d'interet (fraction de la largeur, SCENE_FOCUS) au milieu, sans laisser de vide.
 * null si l'image n'est pas plus large que le cadre (le cover habituel suffit).
 */
export function cadrageScene(focus: number, w: number, h: number, ratio = 1200 / 670): { width: number; left: number } | null {
  if (!(w > 0) || !(h > 0)) return null;
  const width = h * ratio;
  if (width <= w) return null;
  const f = Math.min(1, Math.max(0, Number.isFinite(focus) ? focus : 0.5));
  const left = Math.min(0, Math.max(w - width, w / 2 - f * width));
  return { width: Math.round(width), left: Math.round(left) };
}

/**
 * Voiles poses sur un fond image (scene, decor, ta photo), allégés le 24 octobre 2026 : l'image reste claire,
 * juste ce qu'il faut de degrade sous le texte du haut et sous les chiffres du bas.
 * Avant : general sombre 0.04 (photo 0.14), clair 0.12 (photo 0.26), +0.1 (photo +0.2) sur un exploit ;
 * haut 0.66 / 0.84 sur 27 % ; bas 0.72 / 0.82 a 34 % puis 0.95 / 0.97, sur 66 % (72 % exploit).
 */
export function voilesFond(sombre: boolean, photo: boolean, fort = false) {
  const general = (sombre ? (photo ? 0.04 : 0) : photo ? 0.1 : 0.05) + (fort ? (photo ? 0.1 : 0.06) : 0);
  return {
    general,
    haut: sombre ? 0.48 : 0.66,
    hautHauteur: 0.22,
    basMilieu: sombre ? 0.5 : 0.62,
    basMilieuPos: 0.4,
    basFin: sombre ? 0.82 : 0.9,
    basHauteur: fort ? 0.64 : 0.58,
  };
}
