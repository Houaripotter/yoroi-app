/**
 * 2 novembre 2026 (bloc deplacable), Houari : « je veux pouvoir glisser moi-meme les chiffres, pour qu'ils ne cachent
 * ni mes abdos, ni mes pecs, ni mon visage ».
 * La place du bloc des chiffres choisie au doigt, sur les compositions avec ta photo (Ta photo, et l'apercu de
 * l'Autocollant pose sur ta photo). Fonctions pures, sans dessin, en pixels de la carte (1080 de large) ; testees dans
 * __tests__/unit/cartesBlocDeplacable.test.ts.
 *
 * Les regles :
 * 1. Le bloc reste dans la zone sure : jamais hors cadre, jamais sur la bande du bas, jamais sur la pastille du sport.
 * 2. La position est gardee en coordonnees relatives (0 a 1) DANS la zone ou le bloc peut aller : 0 en haut (ou a
 *    gauche), 1 en bas (ou a droite). Elle reste donc juste en story comme en 4:5, et l'export la reprend telle quelle.
 * 3. Un leger aimantage sur les guides : a gauche, au centre et a droite (marges de la grille), en haut, au milieu et
 *    en bas de la zone. Le guide accroche est renvoye, pour la fine ligne affichee pendant le geste.
 * 4. Sans position choisie, la zone protegee automatique (visage, corps) decide, comme avant.
 * Les fonctions appelees pendant le geste sont des worklets (fil d'animation de Reanimated).
 */
import type { CompositionId, FamilleMoteur } from '../types';
import { GRILLE, hauteurPhoto } from './grille';
import type { FormatMoteur } from './grille';

/** La place choisie, en part de la zone ou le bloc peut aller (0 a 1) */
export type PositionBloc = { x: number; y: number };

/** La zone ou le haut gauche du bloc peut aller, en pixels de la carte */
export type BornesBloc = { xMin: number; xMax: number; yMin: number; yMax: number };

/** Les places proposees aux personnes qui ne peuvent pas glisser (bouton « Deplacer les chiffres ») */
export const POSITIONS_BLOC: Record<'haut' | 'milieu' | 'bas', PositionBloc> = {
  haut: { x: 0.5, y: 0 },
  milieu: { x: 0.5, y: 0.5 },
  bas: { x: 0.5, y: 1 },
};
export type NomPosition = keyof typeof POSITIONS_BLOC;

/** L'aimantage : a moins de 28 px d'un guide, le bloc s'y accroche */
export const SEUIL_AIMANT = 28;
/** Air sous la pastille du sport */
export const AIR_PASTILLE = 32;
/** Le bloc saisi grossit legerement */
export const ECHELLE_SAISI = 1.04;

/** La cle de la position : par carte (famille et composition) et par format */
export function cleBloc(famille: FamilleMoteur, compo: CompositionId, format: FormatMoteur): string {
  return `${famille}:${compo}:${format}`;
}

/** La zone ou le bloc (largeur w, hauteur h) peut aller : entre les marges, sous la pastille, au-dessus de la bande */
export function bornesBloc(format: FormatMoteur, w: number, h: number): BornesBloc {
  const G = GRILLE[format];
  let xMin = G.M;
  let xMax = G.W - G.M - w;
  let yMin = G.HAUT + G.PASTILLE + AIR_PASTILLE;
  let yMax = hauteurPhoto(format) - G.AIR_BANDE - h;
  // un bloc plus large ou plus haut que la zone reste au milieu
  if (xMax < xMin) xMin = xMax = (xMin + xMax) / 2;
  if (yMax < yMin) yMin = yMax = (yMin + yMax) / 2;
  return { xMin, xMax, yMin, yMax };
}

function borne(v: number, a: number, b: number): number {
  'worklet';
  return Math.min(b, Math.max(a, v));
}

/** Une position lue (memoire, ancien reglage) : deux nombres de 0 a 1, sinon null */
export function positionValide(v: unknown): PositionBloc | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as { x?: unknown; y?: unknown };
  if (typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  return { x: borne(p.x, 0, 1), y: borne(p.y, 0, 1) };
}

/** Les positions memorisees, nettoyees (au plus 60 cartes) */
export function positionsValides(v: unknown): Record<string, PositionBloc> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, PositionBloc> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(-60)) {
    const p = positionValide(x);
    if (p && typeof k === 'string' && k.length <= 64) out[k] = p;
  }
  return Object.keys(out).length ? out : undefined;
}

/** La position relative en pixels de la carte (le haut gauche du bloc) */
export function versPixels(p: PositionBloc, b: BornesBloc): { x: number; y: number } {
  'worklet';
  return { x: b.xMin + borne(p.x, 0, 1) * (b.xMax - b.xMin), y: b.yMin + borne(p.y, 0, 1) * (b.yMax - b.yMin) };
}

/** Le haut gauche du bloc, en pixels, en position relative (bornee) */
export function versRelatif(x: number, y: number, b: BornesBloc): PositionBloc {
  'worklet';
  const dx = b.xMax - b.xMin;
  const dy = b.yMax - b.yMin;
  return { x: dx > 0.5 ? borne((x - b.xMin) / dx, 0, 1) : 0.5, y: dy > 0.5 ? borne((y - b.yMin) / dy, 0, 1) : 0.5 };
}

export type Aimante = {
  x: number;
  y: number;
  /** la ligne de guide accrochee, en pixels de la carte ; -1 sans guide */
  guideX: number;
  guideY: number;
};

/**
 * Pendant le geste : le haut gauche voulu (x, y) borne dans la zone sure, puis aimante sur les guides.
 * Guides verticaux : la marge gauche, le centre, la marge droite (seulement si le bloc peut aller de gauche a droite).
 * Guides horizontaux : le haut de la zone, son milieu, son bas.
 */
export function bornerEtAimanter(x: number, y: number, b: BornesBloc, w: number, h: number, W: number, seuil: number = SEUIL_AIMANT): Aimante {
  'worklet';
  let nx = borne(x, b.xMin, b.xMax);
  let ny = borne(y, b.yMin, b.yMax);
  let guideX = -1;
  let guideY = -1;
  if (b.xMax - b.xMin > 1) {
    const centre = W / 2 - w / 2;
    // [position du bloc, ligne de guide dessinee]
    const gx: [number, number][] = [[b.xMin, b.xMin], [centre, W / 2], [b.xMax, b.xMax + w]];
    let meilleur = seuil + 1;
    for (const [p, l] of gx) {
      const d = Math.abs(nx - p);
      if (d <= seuil && d < meilleur) {
        meilleur = d;
        nx = borne(p, b.xMin, b.xMax);
        guideX = l;
      }
    }
  }
  if (b.yMax - b.yMin > 1) {
    const milieu = (b.yMin + b.yMax) / 2;
    const gy: [number, number][] = [[b.yMin, b.yMin], [milieu, milieu + h / 2], [b.yMax, b.yMax + h]];
    let meilleur = seuil + 1;
    for (const [p, l] of gy) {
      const d = Math.abs(ny - p);
      if (d <= seuil && d < meilleur) {
        meilleur = d;
        ny = p;
        guideY = l;
      }
    }
  }
  return { x: nx, y: ny, guideX, guideY };
}

/** Vrai si le point (en pixels de la carte) touche le bloc, avec une marge pour le doigt */
export function toucheLeBloc(px: number, py: number, r: { x: number; y: number; w: number; h: number }, marge = 24): boolean {
  'worklet';
  return px >= r.x - marge && px <= r.x + r.w + marge && py >= r.y - marge && py <= r.y + r.h + marge;
}

/** Le nom de la position proche d'une des trois places proposees (pour cocher Haut, Milieu ou Bas), null sinon */
export function nomPosition(p: PositionBloc | null | undefined): NomPosition | null {
  if (!p) return null;
  for (const n of ['haut', 'milieu', 'bas'] as NomPosition[]) if (Math.abs(POSITIONS_BLOC[n].y - p.y) < 0.02 && Math.abs(POSITIONS_BLOC[n].x - p.x) < 0.02) return n;
  return null;
}

/** Les positions sans celle de cette carte et de ce format (« Replacer les chiffres ») */
export function sansPosition(positions: Record<string, PositionBloc> | undefined, cle: string): Record<string, PositionBloc> {
  const out = { ...(positions ?? {}) };
  delete out[cle];
  return out;
}
