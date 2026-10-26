/**
 * « Quand vais-je y arriver ? » (26 octobre 2026). Donnees pures, testees dans __tests__/unit/estimationObjectif.test.ts.
 *
 * D'apres tes propres seances sur un exercice, YOROI ajuste la courbe que suit la force dans le temps et lit
 * quand elle croise ton objectif. Toujours une estimation, jamais une promesse.
 *
 * Le modele : v = a + b x ln(semaines depuis ta premiere seance notee + 1), ajuste par moindres carres.
 * C'est la forme que Steele et al. 2022 (Research Quarterly for Exercise and Sport 94(4):913-930,
 * 14 690 personnes) ont trouvee sur l'evolution de la force : rapide au debut, puis de plus en plus lente,
 * avec un plateau vers un an d'entrainement. Latella et al. 2020 (J Strength Cond Res 34(9):2412-2418,
 * 1 897 powerlifters sur 15 ans) : les plus forts progressent plus lentement.
 *
 * Charges : ta meilleure serie de la seance passe par la formule d'Epley (charge x (1 + reps / 30)),
 * seulement jusqu'a 10 repetitions (Reynolds, Gordon, Robergs 2006 : au dela de 10 repetitions,
 * les equations lineaires perdent en precision). L'objectif « 50 kg pour 8 repetitions » est converti de la meme
 * facon, puis la reponse est rendue dans ton unite.
 * Poids du corps (tractions, pompes, dips) : ton maximum de repetitions dans une serie, seance apres seance.
 *
 * La fourchette : la pente ajustee plus ou moins une erreur type, la courbe passant toujours par le centre de tes
 * points (propriete des moindres carres). Au dela de 3 ans, pas de date : des paliers a 3, 6 et 12 mois.
 */

export type Mesure = 'charge' | 'reps';

type SerieBrute = { weight?: number; reps?: number; type?: string } | null | undefined;
type ExoBrut = { name?: string; sets?: number; reps?: number; weight?: number; setsData?: SerieBrute[] | null } | null | undefined;
export type TrainingObjectif = { date: string; exercises?: ExoBrut[] | string | null };

/** Un point par jour d'entrainement : valeur interne (maximum estime en kg, ou repetitions) */
export type PointObjectif = { date: string; valeur: number; poids: number; reps: number };

export type SerieObjectif = { cle: string; nom: string; mesure: Mesure; points: PointObjectif[]; repsHabituelles: number };

export type ExoPossible = { cle: string; nom: string; mesure: Mesure; seances: number; derniere: string };

export const SEANCES_MIN = 4;
export const JOURS_MIN = 21;
export const REPS_MAX_EPLEY = 10;
export const SEMAINES_MAX = 156; // 3 ans
const SEMAINE_MS = 7 * 86400000;

export const plier = (x: string) =>
  x
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function exosDe(t: TrainingObjectif): ExoBrut[] {
  let l: unknown = t?.exercises;
  if (typeof l === 'string') {
    try {
      l = JSON.parse(l);
    } catch {
      l = [];
    }
  }
  return Array.isArray(l) ? (l as ExoBrut[]).filter((e) => !!e && typeof e === 'object' && !!e.name) : [];
}

/** Series de travail, echauffements exclus (meme regle que lib/v2/trainingWeek workSetsOf) */
function seriesDe(e: NonNullable<ExoBrut>): { weight: number; reps: number }[] {
  if (Array.isArray(e.setsData) && e.setsData.length > 0) {
    return e.setsData
      .filter((s): s is NonNullable<SerieBrute> => !!s && s.type !== 'warmup')
      .map((s) => ({ weight: Math.max(0, Number(s.weight) || 0), reps: Math.max(0, Number(s.reps) || 0) }));
  }
  const n = Math.max(1, Math.min(20, Math.floor(Number(e.sets) || 1)));
  return Array.from({ length: n }, () => ({ weight: Math.max(0, Number(e.weight) || 0), reps: Math.max(0, Number(e.reps) || 0) }));
}

/** Facteur d'Epley : 1 repetition = la charge elle meme */
export function facteurEpley(reps: number): number {
  return reps <= 1 ? 1 : 1 + reps / 30;
}

/** Maximum estime sur une repetition, 0 si la serie n'est pas exploitable (plus de 10 repetitions) */
export function maxEstime(poids: number, reps: number): number {
  if (!(poids > 0) || !(reps >= 1) || reps > REPS_MAX_EPLEY) return 0;
  return poids * facteurEpley(Math.round(reps));
}

/** Les exercices que tu as notes, du plus frequent au moins frequent */
export function exercicesPossibles(trainings: TrainingObjectif[]): ExoPossible[] {
  const m = new Map<string, { nom: string; jours: Set<string>; derniere: string; charge: number; reps: number }>();
  for (const t of trainings) {
    const d = (t?.date || '').slice(0, 10);
    if (!d) continue;
    for (const e of exosDe(t)) {
      const cle = plier(e!.name as string);
      const s = seriesDe(e!);
      const charge = s.some((x) => x.weight > 0 && x.reps > 0);
      const reps = s.some((x) => x.weight === 0 && x.reps > 0);
      if (!charge && !reps) continue;
      const v = m.get(cle) ?? { nom: (e!.name as string).replace(/\s+/g, ' ').trim(), jours: new Set<string>(), derniere: '', charge: 0, reps: 0 };
      v.jours.add(d);
      if (d >= v.derniere) {
        v.derniere = d;
        v.nom = (e!.name as string).replace(/\s+/g, ' ').trim();
      }
      if (charge) v.charge++;
      else v.reps++;
      m.set(cle, v);
    }
  }
  const out: ExoPossible[] = [];
  m.forEach((v, cle) => out.push({ cle, nom: v.nom, mesure: v.charge >= v.reps ? 'charge' : 'reps', seances: v.jours.size, derniere: v.derniere }));
  return out.sort((a, b) => b.seances - a.seances || (a.derniere < b.derniere ? 1 : -1));
}

/** Ta serie de points pour un exercice : un point par jour, le meilleur du jour */
export function serieDeLExo(trainings: TrainingObjectif[], cle: string, mesure: Mesure): SerieObjectif {
  const k = plier(cle);
  const parJour = new Map<string, PointObjectif>();
  let nom = cle;
  const repsVues: number[] = [];
  for (const t of trainings) {
    const d = (t?.date || '').slice(0, 10);
    if (!d) continue;
    for (const e of exosDe(t)) {
      if (plier(e!.name as string) !== k) continue;
      nom = (e!.name as string).replace(/\s+/g, ' ').trim();
      let best: PointObjectif | null = null;
      for (const s of seriesDe(e!)) {
        if (mesure === 'charge') {
          const v = maxEstime(s.weight, s.reps);
          if (v > 0 && (!best || v > best.valeur)) best = { date: d, valeur: v, poids: s.weight, reps: s.reps };
        } else if (s.weight === 0 && s.reps > 0 && (!best || s.reps > best.valeur)) {
          best = { date: d, valeur: s.reps, poids: 0, reps: s.reps };
        }
      }
      if (!best) continue;
      if (mesure === 'charge') repsVues.push(best.reps);
      const prev = parJour.get(d);
      if (!prev || best.valeur > prev.valeur) parJour.set(d, best);
    }
  }
  const points = Array.from(parJour.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  // tes repetitions habituelles : la mediane de tes meilleures series recentes
  const recentes = repsVues.slice(-8).sort((a, b) => a - b);
  const repsHabituelles = recentes.length ? recentes[Math.floor(recentes.length / 2)] : 1;
  return { cle: k, nom, mesure, points, repsHabituelles };
}

const jourMs = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00').getTime();
export const semainesEntre = (a: string, b: string) => (jourMs(b) - jourMs(a)) / SEMAINE_MS;

export function ajouterSemaines(iso: string, s: number): string {
  const d = new Date(jourMs(iso) + Math.round(s * 7) * 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type Ajustement = { a: number; b: number; se: number; xMoy: number; yMoy: number; n: number };

/** Moindres carres de y sur x = ln(t + 1), t en semaines. null si moins de 3 points ou x tous egaux */
export function ajusterLinLog(pts: { t: number; y: number }[]): Ajustement | null {
  const n = pts.length;
  if (n < 3) return null;
  const xs = pts.map((p) => Math.log(Math.max(0, p.t) + 1));
  const ys = pts.map((p) => p.y);
  const xMoy = xs.reduce((s, x) => s + x, 0) / n;
  const yMoy = ys.reduce((s, y) => s + y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - xMoy) ** 2;
    sxy += (xs[i] - xMoy) * (ys[i] - yMoy);
  }
  if (!(sxx > 1e-9)) return null;
  const b = sxy / sxx;
  const a = yMoy - b * xMoy;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i] - (a + b * xs[i])) ** 2;
  const se = Math.sqrt(sse / (n - 2) / sxx);
  return { a, b, se, xMoy, yMoy, n };
}

/** Valeur de la courbe a t semaines, pour une pente donnee (la courbe passe par le centre des points) */
export function valeurA(f: Ajustement, t: number, pente = f.b): number {
  return f.yMoy + pente * (Math.log(Math.max(0, t) + 1) - f.xMoy);
}

/** Semaine (depuis la premiere seance) ou la courbe atteint y, null si la pente est nulle ou negative */
export function semaineOu(f: Ajustement, y: number, pente = f.b): number | null {
  if (!(pente > 0)) return null;
  const x = f.xMoy + (y - f.yMoy) / pente;
  if (x > 50) return Infinity;
  return Math.exp(x) - 1;
}

export type Palier = { mois: 3 | 6 | 12; valeur: number };
export type PointCourbe = { date: string; valeur: number };

export type Estimation =
  | { etat: 'manque'; seances: number; jours: number; seancesMin: number; joursMin: number }
  | { etat: 'atteint'; actuel: number }
  | { etat: 'plateau'; actuel: number; projection: PointCourbe[] }
  | {
      etat: 'date';
      actuel: number;
      /** delais depuis aujourd'hui, en semaines (au plus tot, le plus probable, au plus tard ; null = plus de 3 ans) */
      semainesTot: number;
      semaines: number;
      semainesTard: number | null;
      dateTot: string;
      date: string;
      dateTard: string | null;
      projection: PointCourbe[];
    }
  | { etat: 'loin'; actuel: number; paliers: Palier[]; projection: PointCourbe[] };

export type Objectif = {
  /** charge visee dans l'unite interne (kg) pour `repsCible` repetitions, ou repetitions au poids du corps */
  cible: number;
  /** charges seulement : repetitions visees avec cette charge (1 a 10) */
  repsCible?: number;
};

/** Passe de la valeur interne (maximum estime) a l'unite de l'objectif : kg pour N repetitions, ou repetitions */
export function versUniteObjectif(mesure: Mesure, v: number, repsCible = 1): number {
  return mesure === 'charge' ? v / facteurEpley(repsCible) : v;
}
function depuisUniteObjectif(mesure: Mesure, v: number, repsCible = 1): number {
  return mesure === 'charge' ? v * facteurEpley(repsCible) : v;
}

/** Arrondi d'affichage : 0,5 kg vers le bas pour une charge, repetition entiere vers le bas */
export function arrondiObjectif(mesure: Mesure, v: number): number {
  return mesure === 'charge' ? Math.floor(v * 2 + 1e-6) / 2 : Math.floor(v + 1e-6);
}

export function estimer(serie: SerieObjectif, objectif: Objectif, aujourdhui: string): Estimation {
  const pts = serie.points;
  const jours = pts.length ? Math.round(semainesEntre(pts[0].date, pts[pts.length - 1].date) * 7) : 0;
  if (pts.length < SEANCES_MIN || jours < JOURS_MIN) {
    return { etat: 'manque', seances: pts.length, jours, seancesMin: SEANCES_MIN, joursMin: JOURS_MIN };
  }
  const reps = serie.mesure === 'charge' ? Math.min(REPS_MAX_EPLEY, Math.max(1, Math.round(objectif.repsCible ?? 1))) : 1;
  const enUnite = (v: number) => versUniteObjectif(serie.mesure, v, reps);
  // ton niveau actuel : le meilleur de tes 3 dernieres seances
  const actuelInterne = Math.max(...pts.slice(-3).map((p) => p.valeur));
  const actuel = enUnite(actuelInterne);
  const cibleInterne = depuisUniteObjectif(serie.mesure, objectif.cible, reps);
  if (actuelInterne >= cibleInterne) return { etat: 'atteint', actuel };

  const t0 = pts[0].date;
  const f = ajusterLinLog(pts.map((p) => ({ t: semainesEntre(t0, p.date), y: p.valeur })));
  const tAuj = Math.max(semainesEntre(t0, aujourdhui), semainesEntre(t0, pts[pts.length - 1].date));
  // la projection part de ton niveau actuel et suit la forme de ta courbe (meme pente)
  const projeter = (finSemaines: number): PointCourbe[] => {
    if (!f) return [];
    const fin = Math.max(1, Math.min(SEMAINES_MAX, finSemaines));
    const decal = actuelInterne - valeurA(f, tAuj);
    const out: PointCourbe[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const s = (fin * i) / n;
      out.push({ date: ajouterSemaines(aujourdhui, s), valeur: enUnite(Math.max(actuelInterne, valeurA(f, tAuj + s) + decal)) });
    }
    return out;
  };
  if (!f || !(f.b > 0)) return { etat: 'plateau', actuel, projection: projeter(26) };

  // delai depuis aujourd'hui : on cherche quand la courbe gagne encore l'ecart entre ton niveau et l'objectif
  const ecart = cibleInterne - actuelInterne;
  const delai = (pente: number): number | null => {
    if (!(pente > 0)) return null;
    const ici = valeurA(f, tAuj, pente);
    const t = semaineOu(f, ici + ecart, pente);
    if (t == null || !isFinite(t)) return null;
    return Math.max(1, t - tAuj);
  };
  const centre = delai(f.b);
  if (centre == null || centre > SEMAINES_MAX) {
    const decal = actuelInterne - valeurA(f, tAuj);
    const paliers: Palier[] = ([3, 6, 12] as const)
      .map((mois) => ({ mois, valeur: arrondiObjectif(serie.mesure, enUnite(valeurA(f, tAuj + mois * 4.345) + decal)) }))
      .filter((p) => p.valeur > arrondiObjectif(serie.mesure, actuel));
    return { etat: 'loin', actuel, paliers, projection: projeter(52) };
  }
  const tot = Math.min(centre, delai(f.b + f.se) ?? centre);
  const tardBrut = delai(f.b - f.se);
  const tard = tardBrut == null || tardBrut > SEMAINES_MAX ? null : Math.max(centre, tardBrut);
  return {
    etat: 'date',
    actuel,
    semainesTot: tot,
    semaines: centre,
    semainesTard: tard,
    dateTot: ajouterSemaines(aujourdhui, tot),
    date: ajouterSemaines(aujourdhui, centre),
    dateTard: tard == null ? null : ajouterSemaines(aujourdhui, tard),
    projection: projeter(Math.max(centre * 1.1, 4)),
  };
}

/** Delai lisible : en semaines jusqu'a 8 semaines, sinon en mois */
export function delaiArrondi(semaines: number): { n: number; unite: 'semaine' | 'mois' } {
  if (semaines < 8) return { n: Math.max(1, Math.round(semaines)), unite: 'semaine' };
  return { n: Math.max(2, Math.round(semaines / 4.345)), unite: 'mois' };
}
