/**
 * Cartes, phase native (proposition du 2 novembre 2026) : le critere A+ de ta photo, le meme sur iPhone, iPad, Mac et Android.
 *
 * Traduction ligne a ligne de cartes_v10_2026-11-02/vision/critere.py et tete.py (OpenCV), sans aucune librairie :
 * composantes connexes (8 voisins), contour exterieur (suivi de bord de Suzuki, comme cv2.findContours), enveloppe convexe,
 * creux du contour (comme cv2.convexityDefects), fermeture morphologique par une ellipse (comme cv2.morphologyEx).
 * Les seuils en pixels ont ete regles sur des photos de 1080 px de large : le masque est donc toujours ramene a
 * LARGEUR_REFERENCE avant le calcul (bilineaire puis seuil a 127, comme lire_vision.py).
 *
 * Trois niveaux :
 *  - A+      : un visage fiable et un masque sans aucun defaut (aucune coupe dans les cheveux, contour du corps continu) ;
 *  - A       : un visage fiable, mais pas de masque ou un masque refuse ;
 *  - Secours : aucun visage fiable. La carte prend la zone sure et te propose le recadrage au doigt.
 *
 * Fonction pure, sans React Native : testee dans Jest, et rejouee a l'identique par le banc (comparer.py, critere.py).
 */

export type NiveauCarte = 'A+' | 'A' | 'Secours';

/** Un masque en niveaux de gris, 1 octet par pixel, ligne par ligne, 0 = fond, 255 = personne */
export type MasqueGris = { largeur: number; hauteur: number; donnees: Uint8Array };

/** Un visage en pixels du masque : x, y, largeur, hauteur, confiance (null : le moteur n'en donne pas, ML Kit) */
export type VisagePx = [number, number, number, number, (number | null)?];

export type MesuresAplus = Record<string, number | number[][]>;

export type ResultatAplus = { niveau: NiveauCarte; raisons: string[]; mesures: MesuresAplus };

/** Les seuils ont ete regles sur des photos de 1080 px de large (v6 a v10) */
export const LARGEUR_REFERENCE = 1080;
/** Un visage moins sur que ca est ignore (lire_vision.py) */
export const CONFIANCE_MIN_VISAGE = 0.5;
/** Un visage plus etroit que 4 % de la photo est ignore (regle de fusion v10, et minFaceSize de ML Kit) */
export const LARGEUR_MIN_VISAGE = 0.04;

/* ------------------------------------------------------------------ outils Python et OpenCV */

/** round() de Python : arrondi au pair pour les demis */
export function arrondiPair(v: number): number {
  const f = Math.floor(v);
  const d = v - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/** round(v, n) de Python, pour l'affichage des mesures */
function arrondi(v: number, n: number): number {
  const p = 10 ** n;
  return arrondiPair(v * p) / p;
}

/** int() de Python : vers zero */
const ent = (v: number): number => Math.trunc(v);

/** Bornes d'une tranche Python a[debut:fin] sur une dimension de taille n (indices negatifs compris) */
function tranche(debut: number, fin: number, n: number): [number, number] {
  let a = debut < 0 ? debut + n : debut;
  let b = fin < 0 ? fin + n : fin;
  a = Math.min(Math.max(a, 0), n);
  b = Math.min(Math.max(b, 0), n);
  return [a, Math.max(a, b)];
}

/** Une image binaire 0 / 1 */
type Bin = { w: number; h: number; d: Uint8Array };

function sousImage(m: Bin, y0: number, y1: number, x0: number, x1: number): Bin {
  const [a, b] = tranche(y0, y1, m.h);
  const [c, e] = tranche(x0, x1, m.w);
  const w = e - c;
  const h = b - a;
  const d = new Uint8Array(Math.max(0, w * h));
  for (let y = 0; y < h; y++) d.set(m.d.subarray((a + y) * m.w + c, (a + y) * m.w + c + w), y * w);
  return { w, h, d };
}

function somme(m: Bin): number {
  let s = 0;
  for (let i = 0; i < m.d.length; i++) s += m.d[i];
  return s;
}

/** principal[y0:y1, x0:x1].mean() if size else 0 */
function moyenne(m: Bin, y0: number, y1: number, x0: number, x1: number): number {
  const [a, b] = tranche(y0, y1, m.h);
  const [c, e] = tranche(x0, x1, m.w);
  const n = (b - a) * (e - c);
  if (n <= 0) return 0;
  let s = 0;
  for (let y = a; y < b; y++) for (let x = c; x < e; x++) s += m.d[y * m.w + x];
  return s / n;
}

/** Statistiques d'une composante, comme cv2.connectedComponentsWithStats : gauche, haut, largeur, hauteur, aire */
type Stat = { x: number; y: number; w: number; h: number; aire: number; premier: number };

/** Les composantes connexes d'une image binaire, calculees par plages (suites de pixels a 1 sur une ligne) */
type Composantes = {
  /** nombre d'etiquettes, fond compris (comme le n de cv2.connectedComponentsWithStats) */
  n: number;
  stats: Stat[];
  /** les plages : ligne, debut, fin (incluse), etiquette definitive (1 a n - 1) */
  plages: Int32Array;
  nbPlages: number;
};

/** Composantes connexes a 8 voisins. Etiquettes dans l'ordre de lecture (haut, puis gauche), le fond n'en a pas */
function composantes(m: Bin): Composantes {
  const { w, h, d } = m;
  let plages = new Int32Array(4 * 1024);
  let np = 0;
  let parent = new Int32Array(1024);
  const racine = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  let debutPrec = 0;
  let finPrec = 0;
  for (let y = 0; y < h; y++) {
    const o = y * w;
    const debutLigne = np;
    let x = 0;
    while (x < w) {
      if (!d[o + x]) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < w && d[o + x]) x++;
      const x1 = x - 1;
      if ((np + 1) * 4 > plages.length) {
        const p2 = new Int32Array(plages.length * 2);
        p2.set(plages);
        plages = p2;
      }
      if (np >= parent.length) {
        const p2 = new Int32Array(parent.length * 2);
        p2.set(parent);
        parent = p2;
      }
      parent[np] = np;
      // 8 voisins : une plage de la ligne du dessus qui touche [x0 - 1, x1 + 1]
      for (let k = debutPrec; k < finPrec; k++) {
        const a = plages[4 * k + 1];
        const b = plages[4 * k + 2];
        if (b < x0 - 1) continue;
        if (a > x1 + 1) break;
        const ra = racine(np);
        const rb = racine(k);
        if (ra !== rb) {
          if (ra < rb) parent[rb] = ra;
          else parent[ra] = rb;
        }
      }
      plages[4 * np] = y;
      plages[4 * np + 1] = x0;
      plages[4 * np + 2] = x1;
      np++;
    }
    debutPrec = debutLigne;
    finPrec = np;
  }
  // etiquettes definitives, dans l'ordre ou chaque composante apparait ; stats comme OpenCV
  const finale = new Int32Array(np);
  const stats: Stat[] = [];
  const xmax: number[] = [];
  const ymax: number[] = [];
  let n = 1;
  for (let k = 0; k < np; k++) {
    const r = racine(k);
    const y = plages[4 * k];
    const x0 = plages[4 * k + 1];
    const x1 = plages[4 * k + 2];
    let e = finale[r];
    if (!e) {
      e = finale[r] = n++;
      stats.push({ x: x0, y, w: 0, h: 0, aire: 0, premier: y * w + x0 });
      xmax.push(x1);
      ymax.push(y);
    }
    plages[4 * k + 3] = e;
    const s = stats[e - 1];
    s.aire += x1 - x0 + 1;
    if (x0 < s.x) s.x = x0;
    if (x1 > xmax[e - 1]) xmax[e - 1] = x1;
    ymax[e - 1] = y;
  }
  stats.forEach((s, k) => {
    s.w = xmax[k] - s.x + 1;
    s.h = ymax[k] - s.y + 1;
  });
  return { n, stats, plages, nbPlages: np };
}

/** L'image de la seule composante `e` (1 a n - 1) */
function imageComposante(m: Bin, c: Composantes, e: number): Bin {
  const out = new Uint8Array(m.w * m.h);
  for (let k = 0; k < c.nbPlages; k++) {
    if (c.plages[4 * k + 3] !== e) continue;
    const o = c.plages[4 * k] * m.w;
    out.fill(1, o + c.plages[4 * k + 1], o + c.plages[4 * k + 2] + 1);
  }
  return { w: m.w, h: m.h, d: out };
}

type Point = [number, number];

/** Les 8 directions du code de Freeman d'OpenCV : 0 droite, 1 haut droite, 2 haut, ... 7 bas droite */
const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, -1, -1, -1, 0, 1, 1, 1];

/**
 * Contour exterieur de la composante qui commence au pixel `premier` (le premier dans l'ordre de lecture),
 * avec tous ses points (CHAIN_APPROX_NONE), dans le meme ordre que cv2.findContours (icvFetchContour, bord exterieur).
 */
function contourExterieur(m: Bin, premier: number): Point[] {
  const { w, h, d } = m;
  const val = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? d[y * w + x] : 0);
  const x0 = premier % w;
  const y0 = (premier - x0) / w;
  const pts: Point[] = [];
  // recherche du point precedent, dans le sens horaire a partir de la gauche (s_end = 4 pour un bord exterieur)
  let s = 4;
  const sFin = 4;
  let x1 = -1;
  let y1 = -1;
  do {
    s = (s - 1) & 7;
    if (val(x0 + DX[s], y0 + DY[s])) {
      x1 = x0 + DX[s];
      y1 = y0 + DY[s];
      break;
    }
  } while (s !== sFin);
  if (x1 < 0) return [[x0, y0]]; // pixel isole
  let x3 = x0;
  let y3 = y0;
  for (let garde = 0; garde < 8 * w * h + 16; garde++) {
    let x4 = 0;
    let y4 = 0;
    for (let k = 0; k < 8; k++) {
      s = (s + 1) & 7;
      x4 = x3 + DX[s];
      y4 = y3 + DY[s];
      if (val(x4, y4)) break;
    }
    pts.push([x3, y3]);
    if (x4 === x0 && y4 === y0 && x3 === x1 && y3 === y1) break;
    x3 = x4;
    y3 = y4;
    s = (s + 4) & 7;
  }
  return pts;
}

/** cv2.contourArea (sans signe) */
function aireContour(c: Point[]): number {
  let a = 0;
  for (let i = 0; i < c.length; i++) {
    const p = c[i];
    const q = c[(i + 1) % c.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

/** cv2.arcLength(c, True) */
function perimetre(c: Point[]): number {
  let l = 0;
  for (let i = 0; i < c.length; i++) {
    const p = c[i];
    const q = c[(i + 1) % c.length];
    l += Math.hypot(q[0] - p[0], q[1] - p[1]);
  }
  return l;
}

/** Indices des sommets de l'enveloppe convexe (sans points alignes), dans l'ordre du contour */
function enveloppe(c: Point[]): number[] {
  const n = c.length;
  if (n < 3) return c.map((_, i) => i);
  // un seul indice par point (le premier rencontre), trie par x puis y
  const vu = new Map<number, number>();
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const cle = c[i][0] * 1e6 + c[i][1];
    if (!vu.has(cle)) {
      vu.set(cle, i);
      idx.push(i);
    }
  }
  idx.sort((a, b) => c[a][0] - c[b][0] || c[a][1] - c[b][1]);
  if (idx.length < 3) return idx.sort((a, b) => a - b);
  const croix = (o: number, a: number, b: number) => (c[a][0] - c[o][0]) * (c[b][1] - c[o][1]) - (c[a][1] - c[o][1]) * (c[b][0] - c[o][0]);
  const bas: number[] = [];
  for (const i of idx) {
    while (bas.length >= 2 && croix(bas[bas.length - 2], bas[bas.length - 1], i) <= 0) bas.pop();
    bas.push(i);
  }
  const haut: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (haut.length >= 2 && croix(haut[haut.length - 2], haut[haut.length - 1], i) <= 0) haut.pop();
    haut.push(i);
  }
  bas.pop();
  haut.pop();
  return [...bas, ...haut].sort((a, b) => a - b);
}

function perimetreEnveloppe(c: Point[], env: number[]): number {
  // l'enveloppe parcourue dans l'ordre angulaire : on la reconstruit par la chaine monotone
  if (env.length < 2) return 0;
  const pts = env.map((i) => c[i]);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  pts.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  return perimetre(pts);
}

/** cv2.convexityDefects : pour chaque cote de l'enveloppe, le point du contour le plus loin, profondeur x 256 arrondie */
function creux(c: Point[], env: number[]): [number, number, number, number][] {
  const n = c.length;
  const out: [number, number, number, number][] = [];
  if (env.length < 3) return out;
  for (let k = 0; k < env.length; k++) {
    const a = env[k];
    const b = env[(k + 1) % env.length];
    const [ax, ay] = c[a];
    const dx0 = c[b][0] - ax;
    const dy0 = c[b][1] - ay;
    const echelle = dx0 === 0 && dy0 === 0 ? 0 : 1 / Math.sqrt(dx0 * dx0 + dy0 * dy0);
    let pire = -1;
    let profondeur = 0;
    for (let j = (a + 1) % n; j !== b; j = (j + 1) % n) {
      const dist = Math.abs(-dy0 * (c[j][0] - ax) + dx0 * (c[j][1] - ay)) * echelle;
      if (dist > profondeur) {
        profondeur = dist;
        pire = j;
      }
    }
    if (pire >= 0) out.push([a, b, pire, arrondiPair(profondeur * 256)]);
  }
  return out;
}

/** Le contour exterieur de plus grande aire parmi toutes les composantes (max(cs, key=cv2.contourArea)) */
function plusGrandContour(m: Bin): Point[] | null {
  const { stats } = composantes(m);
  let meilleur: Point[] | null = null;
  let aire = -1;
  for (const s of stats) {
    const c = contourExterieur(m, s.premier);
    const a = aireContour(c);
    if (a > aire) {
      aire = a;
      meilleur = c;
    }
  }
  return meilleur;
}

/**
 * Les pixels enfermes par la forme (ses trous) : ce que cv2.drawContours(rempli, [c], -1, 1, -1) ajoute a la forme.
 * Un trou ne sort jamais de la boite de la forme : on ne cherche que dedans. Rend le nombre de pixels ajoutes.
 */
function compterTrous(m: Bin, s: Stat): number {
  const { w, d } = m;
  const bx = s.x;
  const by = s.y;
  const bw = s.w;
  const bh = s.h;
  const dehors = new Uint8Array(bw * bh);
  const pile = new Int32Array(bw * bh + 1);
  let haut = 0;
  const pousser = (x: number, y: number) => {
    const j = y * bw + x;
    if (!dehors[j] && !d[(by + y) * w + bx + x]) {
      dehors[j] = 1;
      pile[haut++] = j;
    }
  };
  for (let x = 0; x < bw; x++) {
    pousser(x, 0);
    pousser(x, bh - 1);
  }
  for (let y = 0; y < bh; y++) {
    pousser(0, y);
    pousser(bw - 1, y);
  }
  while (haut > 0) {
    const j = pile[--haut];
    const x = j % bw;
    const y = (j - x) / bw;
    if (x > 0) pousser(x - 1, y);
    if (x < bw - 1) pousser(x + 1, y);
    if (y > 0) pousser(x, y - 1);
    if (y < bh - 1) pousser(x, y + 1);
  }
  let trous = 0;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) if (!dehors[y * bw + x] && !d[(by + y) * w + bx + x]) trous++;
  }
  return trous;
}

/** cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)) : demi largeur de chaque ligne */
function ellipse(k: number): number[] {
  const r = Math.floor(k / 2);
  const c = Math.floor(k / 2);
  const inv = r ? 1 / (r * r) : 0;
  const demi: number[] = [];
  for (let i = 0; i < k; i++) {
    const dy = i - r;
    demi.push(Math.abs(dy) <= r ? arrondiPair(c * Math.sqrt((r * r - dy * dy) * inv)) : -1);
  }
  return demi;
}

/**
 * Distance horizontale, dans chaque ligne, au plus proche pixel qui vaut `cible` (une grande valeur s'il n'y en a pas).
 * Hors de l'image il n'y a rien : c'est le bord neutre d'OpenCV (0 pour la dilatation, 1 pour l'erosion).
 */
function distancesLigne(src: Uint8Array, w: number, h: number, cible: number): Int32Array {
  const LOIN = 1 << 29;
  const d = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let der = -LOIN;
    for (let x = 0; x < w; x++) {
      if (src[o + x] === cible) der = x;
      d[o + x] = x - der;
    }
    der = LOIN;
    for (let x = w - 1; x >= 0; x--) {
      if (src[o + x] === cible) der = x;
      if (der - x < d[o + x]) d[o + x] = der - x;
    }
  }
  return d;
}

/** cv2.morphologyEx(m, MORPH_CLOSE, ellipse k x k) : dilatation (bord a 0) puis erosion (bord a 1) */
function fermeture(m: Bin, k: number): Bin {
  const { w, h } = m;
  const demi = ellipse(k);
  const r = Math.floor(k / 2);
  // dilatation : 1 si un pixel a 1 tombe dans le noyau. Erosion : 0 si un pixel a 0 tombe dans le noyau
  const passe = (src: Uint8Array, dilater: boolean) => {
    const cible = dilater ? 1 : 0;
    const dist = distancesLigne(src, w, h, cible);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let touche = src[i] === cible; // le centre du noyau
        for (let j = 0; j < k && !touche; j++) {
          const dx = demi[j];
          const yy = y + j - r;
          if (dx < 0 || yy < 0 || yy >= h) continue;
          if (dist[yy * w + x] <= dx) touche = true;
        }
        out[i] = dilater ? (touche ? 1 : 0) : touche ? 0 : 1;
      }
    }
    return out;
  };
  return { w, h, d: passe(passe(m.d, true), false) };
}

/* ------------------------------------------------------------------ tete.py */

/** Controle strict du contour de la tete : (entailles, coupes (profondeur, x, y), region) */
export function tete(m: Bin, face: number[]): { entailles: number; coupes: [number, number, number][] } {
  const [x, y, fw, fh] = face;
  const { w, h } = m;
  const y0 = Math.max(0, y - ent(0.6 * fh));
  const y1 = Math.min(h, y + ent(0.5 * fh));
  const x0 = Math.max(0, x - ent(0.3 * fw));
  const x1 = Math.min(w, x + ent(1.3 * fw));
  const t = sousImage(m, y0, y1, x0, x1);
  if (!t.w || !t.h) return { entailles: 0, coupes: [] };
  const cl = fermeture(t, 7);
  const st = somme(t);
  const entailles = (somme(cl) - st) / Math.max(st, 1);
  const coupes: [number, number, number][] = [];
  const c = plusGrandContour(t);
  if (c && c.length >= 3) {
    for (const [, , f, dp] of creux(c, enveloppe(c))) {
      const [px, py] = c[f];
      if (dp / 256 > 4 && py + y0 < y + 0.35 * fh && px > 2 && px < t.w - 3 && py > 2 && py < t.h - 3) {
        coupes.push([arrondi(dp / 256, 1), px + x0, py + y0]);
      }
    }
  }
  return { entailles, coupes };
}

/* ------------------------------------------------------------------ critere.py */

/** verifie(mask, face) : le masque est-il assez propre pour A+ ? */
export function verifie(masque: MasqueGris, face: number[] | null): { ok: boolean; raisons: string[]; mesures: MesuresAplus } {
  const { largeur: w, hauteur: h, donnees } = masque;
  const m: Bin = { w, h, d: new Uint8Array(w * h) };
  for (let i = 0; i < m.d.length; i++) m.d[i] = donnees[i] > 127 ? 1 : 0;
  const raisons: string[] = [];
  const comp = composantes(m);
  const { n, stats } = comp;
  if (n < 2) return { ok: false, raisons: ['aucune personne détourée'], mesures: {} };
  const aires = stats.map((s) => s.aire);
  const total = aires.reduce((a, b) => a + b, 0);
  let iMax = 0;
  for (let i = 1; i < aires.length; i++) if (aires[i] > aires[iMax]) iMax = i;
  const part = aires[iMax] / total;
  const cov = aires[iMax] / (h * w);
  const principal = imageComposante(m, comp, iMax + 1);
  const c = contourExterieur(principal, stats[iMax].premier);
  const env = enveloppe(c);
  const dentele = perimetre(c) / Math.max(perimetreEnveloppe(c, env), 1);
  const sp = stats[iMax].aire;
  const sr = sp + compterTrous(principal, stats[iMax]);
  const trous = (sr - sp) / Math.max(sr, 1);
  const mesures: MesuresAplus = { part_plus_grande_forme: arrondi(part, 3), couverture: arrondi(cov, 3), dentelure: arrondi(dentele, 2), trous: arrondi(trous, 3) };
  if (part < 0.97) raisons.push('plusieurs morceaux : deux personnes ou du décor détouré');
  if (!(cov >= 0.08 && cov <= 0.6)) raisons.push('le masque couvre trop ou trop peu de la photo');
  if (trous > 0.02) raisons.push('trous dans le corps');
  if (dentele > 2.0) raisons.push('bord dentelé, corps coupé de travers');
  if (!face) {
    raisons.push('aucun visage détecté : impossible de vérifier la tête');
  } else {
    const [x, y, fw, fh] = face;
    const dans = moyenne(principal, Math.max(0, y), y + fh, Math.max(0, x), x + fw);
    const mains = moyenne(principal, y + fh, Math.min(h, y + ent(1.6 * fh)), Math.max(0, x), x + fw);
    const ch = moyenne(principal, Math.max(0, y - ent(0.3 * fh)), y, x + ent(0.2 * fw), x + ent(0.8 * fw));
    mesures.visage_dans_masque = arrondi(dans, 3);
    mesures.main_telephone = arrondi(mains, 3);
    mesures.cheveux = arrondi(ch, 3);
    if (dans < 0.9) raisons.push("le visage n'est pas entier dans le masque");
    if (mains < 0.85) raisons.push('la main ou le téléphone sont coupés');
    if (ch < 0.35) raisons.push('les cheveux sont coupés');
    const y0 = Math.max(0, y - ent(0.5 * fh));
    const y1 = Math.min(h, y + ent(1.7 * fh));
    const x0 = Math.max(0, x - ent(0.5 * fw));
    const x1 = Math.min(w, x + ent(1.5 * fw));
    const t = sousImage(principal, y0, y1, x0, x1);
    let entailles = 0;
    let tr = 0;
    if (t.w && t.h) {
      const cl = fermeture(t, 15);
      const st = somme(t);
      entailles = (somme(cl) - st) / Math.max(st, 1);
      const inverse: Bin = { w: t.w, h: t.h, d: t.d.map((v) => 1 - v) };
      for (const s of composantes(inverse).stats) {
        if (s.x > 0 && s.y > 0 && s.x + s.w < t.w && s.y + s.h < t.h && s.aire > 20) tr++;
      }
    }
    const tt = tete(principal, face);
    const e7 = tt.entailles;
    const coupes = tt.coupes;
    mesures.entailles_tete = arrondi(entailles, 4);
    mesures.trous_tete = tr;
    mesures.entailles_tete_7px = arrondi(e7, 5);
    mesures.coupes_cheveux = coupes.map((k) => [...k]);
    if (entailles > 0.005) raisons.push('bord entaillé autour de la tête, des cheveux ou du téléphone');
    if (tr) raisons.push('trou dans la tête ou le téléphone');
    if (coupes.length) {
      const pire = Math.max(...coupes.map((k) => k[0]));
      raisons.push(`${coupes.length} coupe${coupes.length > 1 ? 's' : ''} dans les cheveux (creux de ${arrondiPair(pire)} px au plus)`);
    }
    if (e7 > 0.0002 && !coupes.length) raisons.push('contour de la tête pas continu');
  }
  return { ok: raisons.length === 0, raisons, mesures };
}

/** niveau(mask, visages) de critere.py : les visages en pixels du masque */
export function niveauMasque(masque: MasqueGris | null, visages: VisagePx[]): ResultatAplus {
  if (!visages.length) return { niveau: 'Secours', raisons: ['aucun visage fiable : zone sûre et proposition de recadrage'], mesures: {} };
  let v = visages[0];
  for (const b of visages) if (b[2] * b[3] > v[2] * v[3]) v = b;
  if (!masque) return { niveau: 'A', raisons: ['aucune personne détourée'], mesures: {} };
  const { ok, raisons, mesures } = verifie(masque, v.slice(0, 4).map((x) => arrondiPair(x as number)));
  return { niveau: ok ? 'A+' : 'A', raisons, mesures };
}

/* ------------------------------------------------------------------ depuis le module photo */

/** cv2.resize(..., INTER_LINEAR) : centres de pixels alignes, bords repetes */
export function redimensionner(m: MasqueGris, W: number, H: number): MasqueGris {
  const { largeur: w, hauteur: h, donnees: s } = m;
  if (w === W && h === H) return m;
  const out = new Uint8Array(W * H);
  const fx = w / W;
  const fy = h / H;
  for (let Y = 0; Y < H; Y++) {
    let sy = (Y + 0.5) * fy - 0.5;
    if (sy < 0) sy = 0;
    let y0 = Math.floor(sy);
    if (y0 > h - 1) y0 = h - 1;
    const y1 = Math.min(y0 + 1, h - 1);
    const ay = Math.min(sy - y0, 1);
    for (let X = 0; X < W; X++) {
      let sx = (X + 0.5) * fx - 0.5;
      if (sx < 0) sx = 0;
      let x0 = Math.floor(sx);
      if (x0 > w - 1) x0 = w - 1;
      const x1 = Math.min(x0 + 1, w - 1);
      const ax = Math.min(sx - x0, 1);
      const v = (s[y0 * w + x0] * (1 - ax) + s[y0 * w + x1] * ax) * (1 - ay) + (s[y1 * w + x0] * (1 - ax) + s[y1 * w + x1] * ax) * ay;
      out[Y * W + X] = Math.round(v);
    }
  }
  return { largeur: W, hauteur: H, donnees: out };
}

/** Un visage du module, en part de la photo (0 a 1, origine en haut a gauche) */
export type VisagePart = { x: number; y: number; w: number; h: number; confiance: number | null };

/** Les visages retenus : assez surs (ou sans score) et assez grands. Memes regles sur toutes les plateformes */
export function visagesFiables(visages: VisagePart[]): VisagePart[] {
  return visages.filter((v) => (v.confiance === null || v.confiance === undefined || v.confiance >= CONFIANCE_MIN_VISAGE) && v.w >= LARGEUR_MIN_VISAGE);
}

/**
 * Le critere complet, depuis la reponse du module : masque ramene a 1080 px de large (proportions de la photo),
 * visages en pixels de ce masque, puis critere.py. `rapport` = hauteur / largeur de la photo redressee.
 */
export function critereAplus(masque: MasqueGris | null, visages: VisagePart[], rapport?: number): ResultatAplus {
  const retenus = visagesFiables(visages);
  const W = LARGEUR_REFERENCE;
  const r = rapport && rapport > 0 ? rapport : masque ? masque.hauteur / masque.largeur : 1;
  const H = Math.max(1, Math.round(W * r));
  const px: VisagePx[] = retenus.map((v) => [v.x * W, v.y * H, v.w * W, v.h * H, v.confiance]);
  const m = masque && masque.largeur > 0 && masque.hauteur > 0 && masque.donnees.length === masque.largeur * masque.hauteur ? redimensionner(masque, W, H) : null;
  return niveauMasque(m, px);
}

/** La boite de la silhouette (plus grande forme, si plus de 0,5 % de la photo), en part de la photo : mp/analyse.py */
export function boiteCorps(masque: MasqueGris | null): { x: number; y: number; l: number; h: number } | null {
  if (!masque || masque.donnees.length !== masque.largeur * masque.hauteur) return null;
  const { largeur: w, hauteur: h } = masque;
  const m: Bin = { w, h, d: new Uint8Array(w * h) };
  for (let i = 0; i < m.d.length; i++) m.d[i] = masque.donnees[i] > 127 ? 1 : 0;
  const { stats } = composantes(m);
  if (!stats.length) return null;
  let s = stats[0];
  for (const t of stats) if (t.aire > s.aire) s = t;
  if (s.aire <= 0.005 * h * w) return null;
  return { x: s.x / w, y: s.y / h, l: s.w / w, h: s.h / h };
}
