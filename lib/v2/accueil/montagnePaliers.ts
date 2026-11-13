/**
 * La montagne des paliers de la carte « Ton poids » de l'accueil (13 novembre 2026, bloc C « La montagne » choisi par
 * Houari, maquette paliers_version2.png) : la geometrie seule, sans dessin.
 * Une montagne pastel, un chemin qui monte du pied vers le sommet, un rond par palier pose SUR le chemin, a intervalles
 * reguliers, ton objectif au sommet, et ta position actuelle (la bulle « Toi ») a ta vraie progression.
 * Fichier pur : les paliers, ceux qui sont franchis et ta progression viennent de lib/v2/accueil/lignePaliers.ts,
 * rien n'est recalcule ici. Perte ou prise de masse : la montagne marche pareil, on monte toujours vers l'objectif.
 */
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { formatKg } from '@/lib/v2/weightStats';
import type { LignePaliers } from '@/lib/v2/accueil/lignePaliers';

/** Mesures de la montagne, en points */
export const MONTAGNE = {
  /** hauteur de la zone dessinee */
  hauteur: 160,
  /** le sommet, depuis le haut : la place au-dessus garde le fanion et la bulle */
  sommetY: 48,
  /** diametre d'un rond de palier */
  rond: 22,
  /** ecart entre le rond et son etiquette */
  ecartEtiquette: 6,
  /** largeur estimee d'une etiquette longue (« Palier 1 · 84,8 ») et courte (« P1 · 84,8 ») */
  etiquetteLongue: 96,
  etiquetteCourte: 66,
  /** hauteur d'une etiquette */
  etiquetteH: 20,
  /** la bulle « Toi » : hauteur, pointe, ecart au chemin, largeur par defaut tant qu'elle n'est pas mesuree */
  bulleH: 22,
  bulleFleche: 5,
  bulleEcart: 7,
  bulleL: 96,
  /** la bulle ne monte jamais plus haut : le fanion garde sa place au-dessus */
  bulleHautMin: 30,
  /** le fanion, au-dessus du sommet */
  fanion: 28,
  /** largeur estimee de « Objectif 80,0 » */
  objectifL: 92,
  /** epaisseur du chemin */
  trait: 5,
} as const;

export type Pt = { x: number; y: number };

export type GeometrieMontagne = {
  largeur: number;
  hauteur: number;
  /** le corps de la montagne et son sommet enneige */
  montagne: string;
  neige: string;
  /** les deux pentes seules (sans le bas), pour un liseré qui detache la neige blanche du fond blanc */
  crete: string;
  /** le sommet de la montagne (le fanion flotte au-dessus) */
  pic: Pt;
  /** le chemin entier, du pied a l'objectif, et sa longueur */
  chemin: string;
  longueur: number;
  /** la partie deja parcourue (null sous 1 %), et sa longueur */
  parcouru: string | null;
  longueurParcourue: number;
  /** ta progression utilisee, entre 0 et 1 */
  progression: number;
  depart: Pt;
  objectif: Pt;
  /** ta position actuelle sur le chemin */
  toi: Pt;
  /** les paliers avant l'objectif, poses sur le chemin a intervalles reguliers (i / n) */
  paliers: (Pt & { part: number })[];
  /** etiquettes courtes (« P1 · 84,8 ») si la place a gauche du premier rond ne suffit pas */
  court: boolean;
  /** la place prevue pour l'etiquette de chaque palier, a gauche de son rond (coin haut gauche, largeur, hauteur) */
  etiquettes: { x: number; y: number; largeur: number; hauteur: number }[];
  /**
   * la bulle « Toi » : de quel cote de toi elle se pose (a droite, pointe a gauche ; ou au-dessus, pointe en bas),
   * son coin haut gauche, sa largeur, et la position de sa pointe le long de son bord (en y a droite, en x au-dessus)
   */
  bulle: { cote: 'droite' | 'haut'; x: number; y: number; largeur: number; pointe: number };
  /** « Objectif 80,0 » a droite du fanion, ou a sa gauche quand la place manque a droite (petit ecran) */
  objectifAGauche: boolean;
};

const N_ECHANTILLONS = 64;
const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Un point de la courbe de Bezier cubique a t */
function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Une progression propre : entre 0 et 1, 0 si elle n'est pas un nombre */
export function progressionPropre(p: number): number {
  return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
}

/**
 * La geometrie de la montagne pour une largeur, un nombre de paliers (objectif compris) et ta progression (0 a 1).
 * largeurBulle : la largeur mesuree de la bulle « Toi » (MONTAGNE.bulleL tant qu'elle ne l'est pas).
 */
export function geometrieMontagne(largeur: number, nbPaliers: number, progression: number, largeurBulle: number = MONTAGNE.bulleL): GeometrieMontagne {
  const M = MONTAGNE;
  const W = Math.max(120, Number.isFinite(largeur) ? largeur : 0);
  const H = M.hauteur;
  const n = Math.max(1, Math.floor(Number.isFinite(nbPaliers) ? nbPaliers : 1));
  const p = progressionPropre(progression);

  // la montagne : pied gauche, sommet, epaule droite
  const pic: Pt = { x: W * 0.62, y: M.sommetY };
  const pied: Pt = { x: W * 0.04, y: H };
  const epaule: Pt = { x: W, y: H * 0.78 };
  const montagne = `M${f1(pied.x)} ${f1(H)} L${f1(pic.x)} ${f1(pic.y)} L${f1(epaule.x)} ${f1(epaule.y)} L${f1(W)} ${f1(H)} Z`;
  const crete = `M${f1(pied.x)} ${f1(H)} L${f1(pic.x)} ${f1(pic.y)} L${f1(epaule.x)} ${f1(epaule.y)}`;
  // la neige : un bonnet blanc au sommet, pose sur les deux pentes, au bord dentele
  const dy = (H - pic.y) * 0.26;
  const g = lerp(pic, pied, dy / (pied.y - pic.y));
  const d = lerp(pic, epaule, dy / (epaule.y - pic.y));
  const neige = [
    `M${f1(g.x)} ${f1(g.y)}`,
    `L${f1(pic.x)} ${f1(pic.y)}`,
    `L${f1(d.x)} ${f1(d.y)}`,
    `L${f1(d.x - (d.x - pic.x) * 0.45)} ${f1(d.y - dy * 0.22)}`,
    `L${f1(pic.x)} ${f1(pic.y + dy * 1.1)}`,
    `L${f1(g.x + (pic.x - g.x) * 0.45)} ${f1(g.y - dy * 0.22)}`,
    'Z',
  ].join(' ');

  // le chemin : du pied jusque sous le sommet, plat au depart puis plus raide
  const S: Pt = { x: W * 0.24, y: H - 8 };
  const C1: Pt = { x: W * 0.4, y: H - 24 };
  const C2: Pt = { x: W * 0.5, y: pic.y + 36 };
  const E: Pt = { x: pic.x - W * 0.025, y: pic.y + 10 };
  const pts: Pt[] = [];
  for (let i = 0; i <= N_ECHANTILLONS; i++) pts.push(bezier(S, C1, C2, E, i / N_ECHANTILLONS));
  const cumul: number[] = [0];
  for (let i = 1; i < pts.length; i++) cumul.push(cumul[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const longueur = cumul[cumul.length - 1];

  /** le point a la part f de la longueur du chemin, et l'indice de l'echantillon d'avant */
  const a = (f: number): { pt: Pt; i: number } => {
    const cible = progressionPropre(f) * longueur;
    if (cible <= 0) return { pt: pts[0], i: 0 };
    if (cible >= longueur) return { pt: pts[pts.length - 1], i: pts.length - 2 };
    let i = 1;
    while (i < cumul.length - 1 && cumul[i] < cible) i++;
    const seg = cumul[i] - cumul[i - 1];
    const t = seg > 0 ? (cible - cumul[i - 1]) / seg : 0;
    return { pt: lerp(pts[i - 1], pts[i], t), i: i - 1 };
  };

  const chemin = pts.map((q, i) => `${i ? 'L' : 'M'}${f1(q.x)} ${f1(q.y)}`).join(' ');
  const ici = a(p);
  const parcouruPts = [...pts.slice(0, ici.i + 1), ici.pt];
  const parcouru = p >= 0.01 ? parcouruPts.map((q, i) => `${i ? 'L' : 'M'}${f1(q.x)} ${f1(q.y)}`).join(' ') : null;

  const paliers: (Pt & { part: number })[] = [];
  for (let k = 1; k < n; k++) {
    const part = k / n;
    paliers.push({ ...a(part).pt, part });
  }
  // la place a gauche du premier rond : etiquettes longues si elle suffit
  const placeGauche = paliers.length ? paliers[0].x - M.rond / 2 - M.ecartEtiquette : Infinity;
  const court = placeGauche < M.etiquetteLongue;
  const le = court ? M.etiquetteCourte : M.etiquetteLongue;
  const etiquettes = paliers.map((q) => {
    const droite = q.x - M.rond / 2 - M.ecartEtiquette;
    const largeurE = Math.max(0, Math.min(le, droite));
    return { x: droite - largeurE, y: q.y - M.etiquetteH / 2, largeur: largeurE, hauteur: M.etiquetteH };
  });

  // la bulle « Toi » : a droite de toi, sur la pente libre (les etiquettes sont a gauche) ; au-dessus de toi quand
  // la place manque a droite (petit ecran, pres du sommet), gardee dans la largeur et jamais sur le fanion
  const bl = Math.min(W, Math.max(40, Number.isFinite(largeurBulle) ? largeurBulle : M.bulleL));
  const droiteX = ici.pt.x + M.bulleEcart + M.bulleFleche;
  let bulle: GeometrieMontagne['bulle'];
  const byDroite = Math.max(M.bulleHautMin, Math.min(H - M.bulleH, ici.pt.y - 8));
  // tout pres du depart, elle se decale juste apres l'etiquette ou le rond d'un palier qui serait a sa hauteur
  const obstacles = [
    ...etiquettes.map((e) => ({ x: e.x, y: e.y, l: e.largeur, h: e.hauteur })),
    ...paliers.map((q) => ({ x: q.x - M.rond / 2, y: q.y - M.rond / 2, l: M.rond, h: M.rond })),
  ];
  let bxDroite = droiteX;
  for (let k = 0; k < 2; k++) {
    for (const o of obstacles) {
      const touche = o.y < byDroite + M.bulleH && byDroite < o.y + o.h && o.x < bxDroite + bl && bxDroite < o.x + o.l;
      if (touche) bxDroite = Math.max(bxDroite, o.x + o.l + 3);
    }
  }
  if (bxDroite + bl <= W) {
    bulle = { cote: 'droite', x: bxDroite, y: byDroite, largeur: bl, pointe: Math.max(6, Math.min(M.bulleH - 6, ici.pt.y - byDroite)) };
  } else {
    const bx = Math.max(0, Math.min(W - bl, ici.pt.x - bl / 2));
    const by = Math.max(M.bulleHautMin, ici.pt.y - M.bulleEcart - M.bulleFleche - M.bulleH);
    bulle = { cote: 'haut', x: bx, y: by, largeur: bl, pointe: Math.max(10, Math.min(bl - 10, ici.pt.x - bx)) };
  }

  return {
    largeur: W,
    hauteur: H,
    montagne,
    neige,
    crete,
    pic,
    chemin,
    longueur,
    parcouru,
    longueurParcourue: p * longueur,
    progression: p,
    depart: pts[0],
    objectif: pts[pts.length - 1],
    toi: ici.pt,
    paliers,
    court,
    etiquettes,
    bulle,
    objectifAGauche: W - (pic.x + M.fanion / 2 + 2) < M.objectifL,
  };
}

/**
 * Ce que lit VoiceOver pour la montagne : « 3 paliers sur 4 franchis, encore 0,6 kg avant ton objectif de 80 kg »,
 * ou, objectif atteint, le texte qui existait deja (« Torii atteint, les 4 paliers franchis »).
 */
export function texteMontagne(ligne: LignePaliers, reste: number, kgObjectif: string, atteint: boolean): string {
  const n = ligne.paliers.length;
  if (atteint) return `${traduire('Torii atteint')}${traduire(', les {0} paliers franchis', n)}`;
  return traduirePluriel(
    ligne.atteints,
    ligne.atteints >= 2,
    '{0} palier sur {1} franchi, encore {2} kg avant ton objectif de {3} kg',
    '{0} paliers sur {1} franchis, encore {2} kg avant ton objectif de {3} kg',
    ligne.atteints,
    n,
    formatKg(reste),
    kgObjectif,
  );
}
