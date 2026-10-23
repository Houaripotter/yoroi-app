/**
 * NUIT 14 : le cadrage de chaque photo dans la comparaison avant et apres.
 * Houari : « sur certaines photos on voit tout mon corps, sur d'autres que mon tronc ».
 * Chaque cote se regle seul : zoom et position, enregistres par photo et par paire.
 *
 * Le cadrage est independant de la taille de l'ecran :
 * - z : le zoom, 1 = la photo entiere dans le cadre (contain), jusqu'a 5 fois le cadre rempli (cover) ;
 * - x, y : le decalage du centre de la photo par rapport au centre du cadre, en fraction de la photo affichee.
 * Un meme cadrage donne donc la meme image dans un cadre de meme proportion, petit ou grand.
 *
 * Fichier pur (aucun import React Native) : teste par jest (__tests__/unit/photosCadrage.test.ts).
 * Les fonctions marquees worklet tournent aussi sur le fil d'animation pendant le geste.
 */

export type Cadre = { z: number; x: number; y: number };
/** w, h : le cadre a l'ecran ; iw, ih : la photo en pixels */
export type Dims = { w: number; h: number; iw: number; ih: number };

/** zoom maximal, compte a partir du cadre rempli */
export const ZOOM_MAX = 5;

/** taille de la photo affichee entiere dans le cadre (zoom 1) */
export function containSize(d: Dims): { cw: number; ch: number } {
  'worklet';
  const iw = d.iw > 0 ? d.iw : d.w;
  const ih = d.ih > 0 ? d.ih : d.h;
  const k = Math.min(d.w / iw, d.h / ih);
  return { cw: iw * k, ch: ih * k };
}

/** le zoom qui remplit tout le cadre (cover), au moins 1 */
export function coverZoom(d: Dims): number {
  'worklet';
  const { cw, ch } = containSize(d);
  if (!cw || !ch) return 1;
  return Math.max(1, d.w / cw, d.h / ch);
}

export function zoomLimits(d: Dims): { min: number; max: number; cover: number } {
  'worklet';
  const cover = coverZoom(d);
  return { min: 1, max: cover * ZOOM_MAX, cover };
}

/** le cadrage de depart : la photo remplit le cadre, centree (comme avant la nuit 14) */
export function defaultCadre(d: Dims): Cadre {
  'worklet';
  return { z: coverZoom(d), x: 0, y: 0 };
}

/**
 * Garde la photo a sa place : quand elle deborde du cadre, ses bords ne rentrent jamais dans le cadre ;
 * quand elle est plus petite (dezoom), elle ne sort pas du cadre. Le zoom reste entre 1 et 5 fois le cadre rempli.
 */
export function clampCadre(c: Cadre, d: Dims): Cadre {
  'worklet';
  const { min, max } = zoomLimits(d);
  const zRaw = Number.isFinite(c.z) ? c.z : 1;
  const z = Math.min(max, Math.max(min, zRaw));
  const { cw, ch } = containSize(d);
  const dw = cw * z;
  const dh = ch * z;
  const lim = (v: number, disp: number, frame: number) => {
    if (!disp) return 0;
    const maxPx = Math.abs(disp - frame) / 2;
    const px = (Number.isFinite(v) ? v : 0) * disp;
    return Math.min(maxPx, Math.max(-maxPx, px)) / disp;
  };
  return { z, x: lim(c.x, dw, d.w), y: lim(c.y, dh, d.h) };
}

/** Le style de l'image : place a la taille contain, centree, puis decalee et zoomee */
export function cadreStyle(c: Cadre, d: Dims): { left: number; top: number; width: number; height: number; tx: number; ty: number; scale: number } {
  'worklet';
  const { cw, ch } = containSize(d);
  return { left: (d.w - cw) / 2, top: (d.h - ch) / 2, width: cw, height: ch, tx: c.x * cw * c.z, ty: c.y * ch * c.z, scale: c.z };
}

/**
 * Le pincement : le point de la photo sous les doigts reste sous les doigts.
 * start : le cadrage au debut du geste ; f0, f : le point pince au debut et maintenant, depuis le centre du cadre (px).
 */
export function pinchCadre(start: Cadre, d: Dims, scale: number, f0x: number, f0y: number, fx: number, fy: number): Cadre {
  'worklet';
  const { cw, ch } = containSize(d);
  const { min, max } = zoomLimits(d);
  const z = Math.min(max, Math.max(min, start.z * (Number.isFinite(scale) && scale > 0 ? scale : 1)));
  const r = z / start.z;
  const tx0 = start.x * cw * start.z;
  const ty0 = start.y * ch * start.z;
  const tx = fx - (f0x - tx0) * r;
  const ty = fy - (f0y - ty0) * r;
  return clampCadre({ z, x: cw ? tx / (cw * z) : 0, y: ch ? ty / (ch * z) : 0 }, d);
}

/** Le glisser : la photo suit le doigt (dx, dy en px) */
export function panCadre(start: Cadre, d: Dims, dx: number, dy: number): Cadre {
  'worklet';
  const { cw, ch } = containSize(d);
  const dw = cw * start.z;
  const dh = ch * start.z;
  return clampCadre({ z: start.z, x: dw ? start.x + dx / dw : 0, y: dh ? start.y + dy / dh : 0 }, d);
}

/**
 * « Aligner pareil » : le meme cadrage relatif pour l'autre photo. Le zoom est compte par rapport au cadre
 * rempli de chaque photo (une photo carree et une photo en hauteur gardent le meme remplissage).
 */
export function alignerPareil(src: Cadre, from: Dims, to: Dims): Cadre {
  const rel = src.z / coverZoom(from);
  return clampCadre({ z: rel * coverZoom(to), x: src.x, y: src.y }, to);
}

export function sameCadre(a: Cadre, b: Cadre, eps = 0.001): boolean {
  return Math.abs(a.z - b.z) < eps && Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

/* ---------- Enregistrement (AsyncStorage, une seule cle, additive) ---------- */

export const CADRAGE_KEY = '@yoroi_photos_cadrage_v1';
/** au-dela, les paires les plus anciennes sont oubliees */
export const CADRAGE_MAX_PAIRES = 120;

export type CadrageStore = {
  v: 1;
  /** par paire « idA|idB » (ids tries), le cadrage de chaque photo et la date de mise a jour */
  paires: Record<string, { t: number; c: Record<string, Cadre> }>;
  /** le dernier cadrage de chaque photo, toutes paires confondues */
  photos: Record<string, Cadre>;
};

export function emptyStore(): CadrageStore {
  return { v: 1, paires: {}, photos: {} };
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const okNum = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** un cadrage lu sur le disque : rejete s'il est abime (jamais d'exception) */
export function readCadre(raw: unknown): Cadre | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!okNum(o.z, 0.5, 100) || !okNum(o.x, -10, 10) || !okNum(o.y, -10, 10)) return null;
  return { z: o.z as number, x: o.x as number, y: o.y as number };
}

export function parseStore(raw: string | null | undefined): CadrageStore {
  const out = emptyStore();
  if (!raw) return out;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return out;
    if (o.paires && typeof o.paires === 'object') {
      for (const [k, v] of Object.entries(o.paires as Record<string, any>)) {
        if (!v || typeof v !== 'object' || !v.c || typeof v.c !== 'object') continue;
        const c: Record<string, Cadre> = {};
        for (const [id, cv] of Object.entries(v.c as Record<string, unknown>)) {
          const r = readCadre(cv);
          if (r) c[id] = r;
        }
        if (Object.keys(c).length) out.paires[k] = { t: typeof v.t === 'number' ? v.t : 0, c };
      }
    }
    if (o.photos && typeof o.photos === 'object') {
      for (const [id, cv] of Object.entries(o.photos as Record<string, unknown>)) {
        const r = readCadre(cv);
        if (r) out.photos[id] = r;
      }
    }
  } catch {
    return emptyStore();
  }
  return out;
}

const round = (n: number) => Math.round(n * 10000) / 10000;

export function serializeStore(s: CadrageStore): string {
  const r = (c: Cadre): Cadre => ({ z: round(c.z), x: round(c.x), y: round(c.y) });
  const paires: CadrageStore['paires'] = {};
  Object.entries(s.paires)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, CADRAGE_MAX_PAIRES)
    .forEach(([k, v]) => {
      const c: Record<string, Cadre> = {};
      Object.entries(v.c).forEach(([id, cv]) => (c[id] = r(cv)));
      paires[k] = { t: v.t, c };
    });
  const photos: Record<string, Cadre> = {};
  Object.entries(s.photos).forEach(([id, cv]) => (photos[id] = r(cv)));
  return JSON.stringify({ v: 1, paires, photos });
}

/** Le cadrage d'une photo dans une paire : celui de la paire, sinon le dernier de la photo, sinon rien */
export function cadreFor(s: CadrageStore, idA: string, idB: string, id: string): Cadre | null {
  return s.paires[pairKey(idA, idB)]?.c[id] ?? s.photos[id] ?? null;
}

/** Nouveau magasin avec ce cadrage (l'ancien n'est pas modifie) */
export function withCadre(s: CadrageStore, idA: string, idB: string, id: string, c: Cadre, now: number = Date.now()): CadrageStore {
  const k = pairKey(idA, idB);
  const prev = s.paires[k]?.c ?? {};
  return { v: 1, paires: { ...s.paires, [k]: { t: now, c: { ...prev, [id]: c } } }, photos: { ...s.photos, [id]: c } };
}

/** Oublie le cadrage d'une photo dans une paire (double toucher) : elle revient au cadre rempli */
export function withoutCadre(s: CadrageStore, idA: string, idB: string, id: string): CadrageStore {
  const k = pairKey(idA, idB);
  const paires = { ...s.paires };
  if (paires[k]) {
    const c = { ...paires[k].c };
    delete c[id];
    if (Object.keys(c).length) paires[k] = { ...paires[k], c };
    else delete paires[k];
  }
  const photos = { ...s.photos };
  delete photos[id];
  return { v: 1, paires, photos };
}
