/**
 * Calculs d'une seance importee d'Apple Sante, au plus pres de l'app Forme (14 octobre 2026).
 * Fonctions pures, testees dans __tests__/unit/workoutMath.test.ts :
 *  - arrondis comme Apple (Forme tronque : 15:39, 2,26 km, 179 kcal, 12 m, 6'55"/km) ;
 *  - zones cardiaques par bornes basses inclusives (151 a 169 en zone 4, 170 et plus en zone 5) ;
 *  - temps par zone : chaque mesure compte jusqu'a la suivante, plafonnee selon l'espacement reel,
 *    limitee au debut et a la fin de la seance, pauses exclues ;
 *  - moyenne cardiaque ponderee par le temps (comme HKStatistics pour la frequence cardiaque) ;
 *  - trace GPS simplifiee (Douglas Peucker) pour la stocker avec la seance.
 */

export interface BpmSample { timestamp: string; bpm: number }
export interface Interval { start: string; end: string }

// ---------- Arrondis comme Apple ----------

/** Duree en secondes vers « 0:15:39 » ou « 1:02:15 », comme Forme (secondes tronquees). */
export function appleDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${h}:${p(m)}:${p(r)}`;
}

/** Distance en metres vers des km a 2 decimales tronquees (2 261 m donne 2,26). */
export function appleKm(meters: number): number {
  return Math.floor(Math.round(meters) / 10) / 100;
}

/** Valeur tronquee a l'unite (calories, denivele, cadence, puissance). */
export function appleInt(v: number): number {
  return Math.floor(v + 1e-9);
}

/** Allure en secondes par km, tronquee a la seconde. */
export function applePaceSec(durationSec: number, meters: number): number {
  if (!(durationSec > 0) || !(meters > 0)) return 0;
  return Math.floor(durationSec / (meters / 1000));
}

/** Allure affichee comme Forme : 6'55". */
export function applePace(secPerKm: number): string {
  if (!(secPerKm > 0) || !isFinite(secPerKm)) return '';
  const s = Math.floor(secPerKm);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}"`;
}

// ---------- Zones ----------

/**
 * Bornes basses des zones 2 a 5. Apple ecrit « 120 a 135, 136 a 150, 151 a 169, >170 » :
 * chaque zone commence a sa borne basse, incluse, et va jusqu'a la borne basse suivante exclue.
 * Une valeur entiere de 169 est donc en zone 4 et 170 en zone 5.
 */
export type LowerBounds = [number, number, number, number];

export interface ZoneSettingsLike {
  z1max: number; z2max: number; z3max: number; z4max: number;
  z2min?: number; z3min?: number; z4min?: number; z5min?: number;
}

/**
 * Bornes basses depuis les reglages. Si l'utilisateur a saisi des bornes min, elles font foi ;
 * sinon, les anciennes zones contigues (z1max = debut de la zone 2) sont reprises telles quelles.
 */
export function lowerBounds(t: ZoneSettingsLike): LowerBounds {
  return [t.z2min || t.z1max, t.z3min || t.z2max, t.z4min || t.z3max, t.z5min || t.z4max];
}

/** Zone 1 a 5 d'une frequence (arrondie au battement, comme les valeurs affichees par Apple). */
export function zoneOf(bpm: number, lb: LowerBounds): number {
  const b = Math.round(bpm);
  if (b >= lb[3]) return 5;
  if (b >= lb[2]) return 4;
  if (b >= lb[1]) return 3;
  if (b >= lb[0]) return 2;
  return 1;
}

const ms = (iso: string) => new Date(iso).getTime();

/** Duree (ms) de [a, b] hors pauses. */
function activeMs(a: number, b: number, pauses: { s: number; e: number }[]): number {
  if (b <= a) return 0;
  let d = b - a;
  for (const p of pauses) {
    const o = Math.min(b, p.e) - Math.max(a, p.s);
    if (o > 0) d -= o;
  }
  return Math.max(0, d);
}

/** Espacement median des mesures, en secondes. */
export function medianSpacingSec(samples: BpmSample[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const g = (ms(samples[i].timestamp) - ms(samples[i - 1].timestamp)) / 1000;
    if (g > 0) gaps.push(g);
  }
  if (!gaps.length) return 5;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Plafond de la duree qu'une mesure peut representer : 3 fois l'espacement median,
 * borne entre 10 s et 60 s. Un trou plus long (montre decollee) ne compte pas en entier.
 */
export function gapCapSec(samples: BpmSample[]): number {
  return Math.min(60, Math.max(10, medianSpacingSec(samples) * 3));
}

export interface ZoneTimeOptions {
  start?: string;
  end?: string;
  pauses?: Interval[];
  capSec?: number;
  /**
   * 'mesures' (14 octobre 2026, ce que fait Forme) : le temps ne court que de la premiere a la derniere
   * mesure. Forme totalise 25:37 de zones pour une seance de 25:39, et 16:49 pour 17:00 : il ne prolonge
   * pas la premiere mesure jusqu'au debut ni la derniere jusqu'a la fin. 'seance' : de bout en bout.
   */
  edges?: 'seance' | 'mesures';
}

/**
 * Temps passe dans chaque zone, en secondes (tableau de 5 valeurs).
 * Chaque mesure vaut jusqu'a la mesure suivante (plafonnee), la premiere depuis le debut de la
 * seance, la derniere jusqu'a la fin. Les mesures hors seance sont ignorees, les pauses retirees.
 */
export function zoneTimes(samples: BpmSample[], lb: LowerBounds, opt: ZoneTimeOptions = {}): number[] {
  const out = [0, 0, 0, 0, 0];
  const pts = samples
    .map((s) => ({ t: ms(s.timestamp), bpm: s.bpm }))
    .filter((s) => isFinite(s.t) && s.bpm > 0)
    .sort((a, b) => a.t - b.t);
  if (!pts.length) return out;
  const start = opt.start ? ms(opt.start) : pts[0].t;
  const end = opt.end ? ms(opt.end) : pts[pts.length - 1].t;
  const inside = pts.filter((p) => p.t >= start && p.t <= end);
  if (!inside.length || end <= start) return out;
  const cap = (opt.capSec ?? gapCapSec(samples)) * 1000;
  const pauses = (opt.pauses ?? []).map((p) => ({ s: ms(p.start), e: ms(p.end) })).filter((p) => p.e > p.s);
  const toEnd = opt.edges !== 'mesures';
  // avant la premiere mesure : elle compte depuis le debut, dans la limite du plafond
  const first = inside[0];
  if (toEnd) out[zoneOf(first.bpm, lb) - 1] += activeMs(Math.max(start, first.t - cap), first.t, pauses) / 1000;
  for (let i = 0; i < inside.length; i++) {
    const a = inside[i].t;
    const next = i + 1 < inside.length ? inside[i + 1].t : toEnd ? end : a;
    const b = Math.min(next, a + cap, end);
    out[zoneOf(inside[i].bpm, lb) - 1] += activeMs(a, b, pauses) / 1000;
  }
  return out;
}

/** Moyenne, min et max de la frequence sur la seance, moyenne ponderee par le temps. */
export function hrStats(samples: BpmSample[], opt: ZoneTimeOptions = {}): { avg: number; min: number; max: number } | null {
  const pts = samples
    .map((s) => ({ t: ms(s.timestamp), bpm: s.bpm }))
    .filter((s) => isFinite(s.t) && s.bpm > 0)
    .sort((a, b) => a.t - b.t);
  const start = opt.start ? ms(opt.start) : -Infinity;
  const end = opt.end ? ms(opt.end) : Infinity;
  const inside = pts.filter((p) => p.t >= start && p.t <= end);
  if (!inside.length) return null;
  const cap = (opt.capSec ?? gapCapSec(samples)) * 1000;
  const pauses = (opt.pauses ?? []).map((p) => ({ s: ms(p.start), e: ms(p.end) }));
  let w = 0;
  let sum = 0;
  for (let i = 0; i < inside.length; i++) {
    const a = inside[i].t;
    const next = i + 1 < inside.length ? inside[i + 1].t : isFinite(end) ? end : a + 1000;
    const d = activeMs(a, Math.min(next, a + cap), pauses) || 1;
    w += d;
    sum += inside[i].bpm * d;
  }
  const bpms = inside.map((p) => p.bpm);
  return { avg: sum / w, min: Math.min(...bpms), max: Math.max(...bpms) };
}

/** Pauses d'une seance HealthKit : evenements pause (1) et reprise (2), et pauses auto (5 et 6). */
export function pausesFromEvents(events: { type: number; startDate: any; endDate?: any }[] | undefined, workoutEnd: string): Interval[] {
  const ev = (events ?? [])
    .map((e) => ({ type: Number(e.type), t: new Date(e.startDate).getTime() }))
    .filter((e) => isFinite(e.t))
    .sort((a, b) => a.t - b.t);
  const out: Interval[] = [];
  let open: number | null = null;
  for (const e of ev) {
    if ((e.type === 1 || e.type === 5) && open == null) open = e.t;
    else if ((e.type === 2 || e.type === 6) && open != null) {
      if (e.t > open) out.push({ start: new Date(open).toISOString(), end: new Date(e.t).toISOString() });
      open = null;
    }
  }
  if (open != null) {
    const end = new Date(workoutEnd).getTime();
    if (end > open) out.push({ start: new Date(open).toISOString(), end: new Date(end).toISOString() });
  }
  return out;
}

// ---------- Trace GPS ----------

export interface RoutePoint { latitude: number; longitude: number; altitude?: number; speed?: number; timestamp?: string }

/** Distance en metres entre deux points (haversine). */
export function haversineM(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Distance (m) d'un point a un segment, en projection locale plane (suffisant pour une course). */
function segDist(p: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const k = Math.cos((a.latitude * Math.PI) / 180) * 111320;
  const ax = a.longitude * k, ay = a.latitude * 110540;
  const bx = b.longitude * k, by = b.latitude * 110540;
  const px = p.longitude * k, py = p.latitude * 110540;
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Simplifie une trace (Douglas Peucker, tolerance en metres), en gardant le premier et le dernier
 * point. Si la trace reste trop longue, la tolerance est doublee jusqu'a passer sous maxPoints.
 */
export function simplifyRoute<T extends RoutePoint>(pts: T[], toleranceM = 3, maxPoints = 600): T[] {
  if (pts.length <= 2) return pts.slice();
  let tol = toleranceM;
  let res = pts;
  for (let pass = 0; pass < 8; pass++) {
    const keep = new Uint8Array(pts.length);
    keep[0] = 1;
    keep[pts.length - 1] = 1;
    const stack: [number, number][] = [[0, pts.length - 1]];
    while (stack.length) {
      const [i, j] = stack.pop()!;
      let best = -1;
      let dmax = 0;
      for (let k = i + 1; k < j; k++) {
        const d = segDist(pts[k], pts[i], pts[j]);
        if (d > dmax) { dmax = d; best = k; }
      }
      if (best > 0 && dmax > tol) {
        keep[best] = 1;
        stack.push([i, best], [best, j]);
      }
    }
    res = pts.filter((_, i) => keep[i] === 1);
    if (res.length <= maxPoints) break;
    tol *= 2;
  }
  return res;
}

// ---------- Couleur du trace selon l'allure ----------

/** Vitesse (m/s) d'un point : celle du GPS si fiable, sinon distance et temps depuis le point precedent. */
function speedAt<T extends RoutePoint>(pts: T[], i: number): number | null {
  const p = pts[i];
  if (p.speed != null && p.speed >= 0 && isFinite(p.speed)) return p.speed;
  if (i === 0 || !p.timestamp || !pts[i - 1].timestamp) return null;
  const dt = (ms(p.timestamp) - ms(pts[i - 1].timestamp!)) / 1000;
  return dt > 0 ? haversineM(pts[i - 1], p) / dt : null;
}

/**
 * Decoupe la trace en segments colores selon l'allure, comme la carte de Forme :
 * jaune pour le plus lent, vert pour le plus rapide (5 niveaux, bornes aux quantiles 10 et 90
 * pour qu'un arret au feu ne tasse pas toute l'echelle). Sans vitesse, un seul segment.
 */
export const PACE_COLORS = ['#E8C33A', '#D5CB3C', '#B8CF44', '#8FCB4E', '#5DC15A'] as const;

export function paceSegments<T extends RoutePoint>(pts: T[]): { coords: { latitude: number; longitude: number }[]; level: number }[] {
  if (pts.length < 2) return [];
  const sp = pts.map((_, i) => speedAt(pts, i));
  const known = sp.filter((v): v is number => v != null && v > 0.3).sort((a, b) => a - b);
  const coord = (p: T) => ({ latitude: p.latitude, longitude: p.longitude });
  if (known.length < 5) return [{ coords: pts.map(coord), level: 2 }];
  const lo = known[Math.floor(known.length * 0.1)];
  const hi = known[Math.floor(known.length * 0.9)];
  const levelOf = (v: number | null) => {
    if (v == null || hi <= lo) return 2;
    return Math.max(0, Math.min(4, Math.floor(((v - lo) / (hi - lo)) * 5)));
  };
  const out: { coords: { latitude: number; longitude: number }[]; level: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const lv = levelOf(sp[i]);
    const last = out[out.length - 1];
    if (last && last.level === lv) last.coords.push(coord(pts[i]));
    else out.push({ coords: [coord(pts[i - 1]), coord(pts[i])], level: lv });
  }
  return out;
}

/** Region de carte qui cadre la trace, avec une marge. */
export function routeRegion(pts: RoutePoint[], margin = 1.5): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null {
  if (!pts.length) return null;
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const p of pts) { a = Math.min(a, p.latitude); b = Math.max(b, p.latitude); c = Math.min(c, p.longitude); d = Math.max(d, p.longitude); }
  return { latitude: (a + b) / 2, longitude: (c + d) / 2, latitudeDelta: Math.max(0.003, (b - a) * margin), longitudeDelta: Math.max(0.003, (d - c) * margin) };
}

/**
 * Reglages complets des 5 zones depuis les bornes basses des zones 2 a 5, ecrits comme Apple :
 * chaque zone s'arrete un battement sous le debut de la suivante (120 a 135, 136 a 150...).
 * Plus de chevauchement « 120 a 135, 135 a 150 » qui laissait croire a un decalage.
 */
export function zonesFromLowers(lb: LowerBounds, z1min = 0) {
  return {
    z1min, z1max: lb[0] - 1,
    z2min: lb[0], z2max: lb[1] - 1,
    z3min: lb[1], z3max: lb[2] - 1,
    z4min: lb[2], z4max: lb[3] - 1,
    z5min: lb[3],
  };
}
