/**
 * Graphiques de progression (16 octobre 2026, Houari : « dans Carnet, regarde les graphiques, je veux qu'ils soient
 * toujours comme l'accueil, en fonction de comment il choisit ses graphiques dans les réglages »).
 * Calculs purs partages par la courbe au pinceau (components/yoroi/v2/progres/InkLineChart.tsx) quand elle suit
 * les reglages des courbes (lib/v2/courbes/prefs.ts) :
 *  - reperesCouvrants : les reperes de l'axe encadrent toute la courbe (avant : 80 et 90 seulement alors que la
 *    courbe montait a 95, le haut de la courbe n'avait aucun repere) ;
 *  - placeTampon : le tampon de record se pose la ou il ne touche ni la courbe ni le point final (avant : l'etoile
 *    du record, juste avant la derniere perf, tombait sur le point final) ;
 *  - parSemaineGraphe : style 3 (une barre par pesee) sur une longue periode, une barre par semaine (moyenne),
 *    comme la carte Poids de l'accueil. Les valeurs sont toujours les tiennes, jamais inventees.
 */

/** Pas ronds (1, 2, 2,5, 5 par puissance de dix) */
function pasRond(brut: number): number {
  const b = Math.abs(brut) || 1;
  const pow = Math.pow(10, Math.floor(Math.log10(b)));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= b - 1e-12) ?? b;
}

function reperesAuPas(a: number, b: number, pas: number): number[] {
  const out: number[] = [];
  for (let t = Math.ceil(a / pas - 1e-9) * pas; t <= b + 1e-9; t += pas) out.push(Math.round(t * 1000) / 1000);
  return out;
}

/**
 * Les reperes encadrent la courbe : ni le haut ni le bas de la courbe ne restent sans repere (au plus 20 % de
 * l'echelle au-dessus du repere le plus haut ou sous le plus bas). On garde les reperes proposes s'ils couvrent
 * deja bien ; sinon des reperes ronds plus serres, 4 au plus, jamais colles aux bords.
 * min, max : l'echelle affichee (marges comprises) ; lo, hi : la plus basse et la plus haute valeur de la courbe.
 */
export function reperesCouvrants(min: number, max: number, lo: number, hi: number, proposes: number[]): number[] {
  const range = max - min;
  if (!(range > 0)) return proposes;
  const couvre = (t: number[]) => t.length >= 2 && hi - t[t.length - 1] <= range * 0.2 && t[0] - lo <= range * 0.2;
  if (couvre(proposes)) return proposes;
  const m = range * 0.04;
  for (const cible of [3, 4, 5]) {
    const t = reperesAuPas(min + m, max - m, pasRond(range / cible));
    if (t.length >= 2 && t.length <= 4 && couvre(t)) return t;
  }
  return proposes;
}

export type Obstacle = { x: number; y: number; r: number };

/**
 * Ou poser le tampon de record (un carre de `taille` px) pres du point (px, py) : au-dessus, en dessous, puis en
 * diagonale a gauche ou a droite ; on garde la place la plus degagee de la courbe et du point final, dans le cadre.
 */
export function placeTampon(px: number, py: number, taille: number, cadre: { left: number; right: number; top: number; bottom: number }, obstacles: Obstacle[], courbe: { x: number; y: number }[]): { x: number; y: number } {
  const h = taille / 2;
  const d = taille + 6;
  const cands = [
    { x: px, y: py - d },
    { x: px - d * 0.8, y: py - d * 0.75 },
    { x: px + d * 0.8, y: py - d * 0.75 },
    { x: px, y: py + d },
    { x: px - d * 0.8, y: py + d * 0.75 },
    { x: px + d * 0.8, y: py + d * 0.75 },
    { x: px - d, y: py },
  ];
  const borne = (c: { x: number; y: number }) => ({ x: Math.min(Math.max(c.x, cadre.left + h), cadre.right - h), y: Math.min(Math.max(c.y, cadre.top + h), cadre.bottom - h) });
  let best = borne(cands[0]);
  let bestScore = -Infinity;
  cands.forEach((c0, i) => {
    const c = borne(c0);
    // distance libre au plus proche obstacle (bord du carre a bord du rond)
    let libre = Infinity;
    obstacles.forEach((o) => {
      libre = Math.min(libre, Math.hypot(c.x - o.x, c.y - o.y) - o.r - h * 1.2);
    });
    courbe.forEach((q) => {
      libre = Math.min(libre, Math.hypot(c.x - q.x, c.y - q.y) - h * 1.15);
    });
    // a place egale, l'ordre de preference (au-dessus d'abord) ; un tampon colle a un obstacle est ecarte
    const score = Math.min(libre, 14) - i * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  });
  return best;
}

export type PointGraphe = { date: string; value: number; record?: boolean; week?: boolean };

const JOUR = 86400000;
const jour = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();

/** Une valeur par semaine (moyenne de tes valeurs de la semaine), en comptant a rebours depuis la plus recente */
export function parSemaineGraphe(pts: PointGraphe[]): PointGraphe[] {
  if (!pts.length) return pts;
  const tl = jour(pts[pts.length - 1].date);
  const out: { k: number; sum: number; n: number; date: string; record: boolean }[] = [];
  pts.forEach((p) => {
    const k = Math.floor((tl - jour(p.date)) / (7 * JOUR));
    const cur = out[out.length - 1];
    if (!cur || cur.k !== k) out.push({ k, sum: p.value, n: 1, date: p.date, record: !!p.record });
    else {
      cur.sum += p.value;
      cur.n += 1;
      cur.date = p.date;
      cur.record = cur.record || !!p.record;
    }
  });
  return out.map((w) => ({ date: w.date, value: Math.round((w.sum / w.n) * 100) / 100, week: w.n > 1, record: w.record }));
}

/** Style 3 : une barre par valeur, une barre par semaine au-dela de 100 jours et de 40 valeurs */
export function pointsDesBarres(pts: PointGraphe[]): PointGraphe[] {
  if (pts.length < 2) return pts;
  const span = (jour(pts[pts.length - 1].date) - jour(pts[0].date)) / JOUR;
  return span > 100 && pts.length > 40 ? parSemaineGraphe(pts) : pts;
}
