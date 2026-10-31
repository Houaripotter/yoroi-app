/**
 * 31 octobre 2026 (cartes ou l'on voit ta tete) : la zone du visage protegee sur les cartes avec ta photo.
 * Plainte de depart : sur un selfie miroir, le sticker titre et le grand bloc de chiffres cachaient la tete et le corps.
 * La regle : du haut de la carte jusqu'a 55 % de la hauteur, au centre (15 % a 85 % de la largeur), rien ne se pose
 * sauf un petit titre ou un sticker dans un coin du haut. Les chiffres et les stickers vont dans le bloc du bas,
 * au-dessus du pied (logo et badges). Les cartes sans photo (couleur unie) gardent leur mise en page.
 * Le bloc se deplace au doigt et se redimensionne en pincant dans l'atelier : placement de la session d'edition
 * seulement, borne pour rester dans la carte. Logique pure, testee dans __tests__/unit/cartesZoneVisage.test.ts.
 */
import type { DirectionId, FormatId } from './types';

export type Rect = { x: number; y: number; w: number; h: number };

/** La zone protegee, en part de la largeur et de la hauteur de la carte */
export const ZONE_VISAGE = { gauche: 0.15, droite: 0.85, bas: 0.55 } as const;

/** Les directions qui posent ta photo derriere les chiffres : la zone du visage s'y applique */
export const DIRECTIONS_ZONE_VISAGE: DirectionId[] = ['net', 'chrome', 'stickers', 'flash', 'gala', 'serie', 'tv'];

/**
 * Les directions dont le bloc de chiffres se deplace et se redimensionne au doigt.
 * La carte holographique (le bloc fait partie de la carte en 3D) et la Retrospective (composition d'un seul tenant)
 * gardent leur place.
 */
export const DIRECTIONS_BLOC_MOBILE: DirectionId[] = ['net', 'chrome', 'stickers', 'flash', 'maillot', 'gala', 'serie', 'tv'];

/** Zone utile de chaque format, en pixels de l'export 1080 (memes cotes que Directions.tsx) */
const ZONE: Record<FormatId, { haut: number; bas: number; h: number }> = {
  story: { haut: 230, bas: 270, h: 1920 },
  post: { haut: 66, bas: 48, h: 1350 },
  carre: { haut: 54, bas: 42, h: 1080 },
};

/** Hauteur de reference du bloc (story) : les tailles du bloc sont prevues pour elle, reduites au-dessous */
export const HAUT_BLOC_REF = 164;

/** Vrai si la carte pose ta photo en plein cadre derriere ses chiffres (et pas un autocollant transparent) */
export function zoneVisageActive(id: DirectionId, aPhoto: boolean, transparent = false): boolean {
  return aPhoto && !transparent && DIRECTIONS_ZONE_VISAGE.includes(id);
}

export function blocMobile(id: DirectionId): boolean {
  return DIRECTIONS_BLOC_MOBILE.includes(id);
}

/** La zone du visage, en points de la carte */
export function zoneProtegee(W: number, H: number): Rect {
  return { x: W * ZONE_VISAGE.gauche, y: 0, w: W * (ZONE_VISAGE.droite - ZONE_VISAGE.gauche), h: H * ZONE_VISAGE.bas };
}

/** Le coin du haut (a gauche) ou se pose le petit titre ou sticker : sous la barre d'Instagram en story */
export function coinDeCarte(format: FormatId, W: number, H: number): Rect {
  const k = W / 1080;
  return { x: Math.round(W * 0.035), y: Math.round(ZONE[format].haut * k), w: Math.round(W * 0.38), h: Math.round(H * 0.08) };
}

/** Le bloc des chiffres et des stickers : de 56 % de la hauteur jusqu'au-dessus du pied */
export function blocDeCarte(format: FormatId, W: number, H: number): Rect {
  const z = ZONE[format];
  const k = W / 1080;
  const r = (z.h - z.haut - z.bas) / (1920 - 230 - 270);
  const pied = (z.bas + 64 * r + 26 * r) * k;
  const y = Math.ceil(H * (ZONE_VISAGE.bas + 0.01));
  return { x: Math.round(W * 0.05), y, w: Math.round(W * 0.9), h: Math.max(40, Math.floor(H - pied - y)) };
}

/** Le facteur des tailles du bloc : 1 en story, moins dans un bloc plus bas (publication, carre) */
export function echelleBloc(b: Rect): number {
  return Math.min(1, b.h / HAUT_BLOC_REF);
}

export function chevauche(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Un petit element permis dans la zone : colle a un bord, en haut, pas plus grand que le coin */
export function coinPermis(r: Rect, format: FormatId, W: number, H: number): boolean {
  const co = coinDeCarte(format, W, H);
  const colle = r.x <= W * 0.05 || r.x + r.w >= W * 0.95;
  return colle && r.w <= co.w + 0.5 && r.h <= co.h + 0.5 && r.y + r.h <= co.y + co.h + 0.5;
}

/** Vrai si aucun element ne cache le visage (le coin du haut excepte) */
export function respecteZoneVisage(elements: Rect[], format: FormatId, W: number, H: number): boolean {
  const z = zoneProtegee(W, H);
  return elements.every((e) => !chevauche(e, z) || coinPermis(e, format, W, H));
}

// ============================================
// LE BLOC DEPLACE AU DOIGT (atelier, session d'edition)
// ============================================

/** Decalage en points de la carte et echelle du bloc ; null ou { 0, 0, 1 } : a sa place */
export type Placement = { x: number; y: number; s: number };

export const PLACEMENT_DEFAUT: Placement = { x: 0, y: 0, s: 1 };
export const ECHELLE_MIN = 0.6;
export const ECHELLE_MAX = 1.8;

export function estDeplace(p: Placement | null | undefined): boolean {
  return !!p && (Math.abs(p.x) > 0.5 || Math.abs(p.y) > 0.5 || Math.abs(p.s - 1) > 0.01);
}

/** Le centre d'un rectangle, pivot du pincement */
export function centre(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Borne le placement : echelle entre 0,6 et 1,8, le centre du bloc reste dans la carte */
export function bornerPlacement(p: Placement, pivot: { x: number; y: number }, W: number, H: number): Placement {
  const s = Math.max(ECHELLE_MIN, Math.min(ECHELLE_MAX, Number.isFinite(p.s) ? p.s : 1));
  const x = Math.max(-pivot.x, Math.min(W - pivot.x, Number.isFinite(p.x) ? p.x : 0));
  const y = Math.max(-pivot.y, Math.min(H - pivot.y, Number.isFinite(p.y) ? p.y : 0));
  return { x, y, s };
}

/**
 * La transformation d'une vue plein cadre pour deplacer le bloc et le grossir autour de son centre.
 * Une vue se transforme autour de son propre centre (la carte) : on ajoute le decalage du pivot.
 * null quand le bloc est a sa place.
 */
export function transformBloc(p: Placement | null | undefined, pivot: { x: number; y: number }, W: number, H: number): { tx: number; ty: number; s: number } | null {
  if (!estDeplace(p)) return null;
  const b = bornerPlacement(p!, pivot, W, H);
  return { tx: b.x + (pivot.x - W / 2) * (1 - b.s), ty: b.y + (pivot.y - H / 2) * (1 - b.s), s: b.s };
}

/** Le pivot du bloc d'une direction sans photo (sa mise en page d'origine) : le bas de la carte */
export function pivotParDefaut(W: number, H: number): { x: number; y: number } {
  return { x: W / 2, y: H * 0.74 };
}
