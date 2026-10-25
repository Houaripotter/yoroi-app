/**
 * Bilan de la semaine et du mois (25 octobre 2026, feuille de route : « bilan du dimanche » et « rendez-vous
 * du mois »). Tout ce qui compte sur une période, réuni en un seul endroit : tes séances (et ton objectif),
 * tes records, ton poids réel (la tendance, sans l'eau du jour), tes mensurations, ta régularité.
 * Rien n'est estimé : uniquement ce que tu as noté. Une période sans donnée dit simplement « rien de noté ».
 * Fonction pure, testée dans __tests__/unit/bilanPeriode.test.ts. Lecture des données : ./chargerPeriode.ts.
 */
import type { Training } from '@/lib/database';
import { cleTri, lundiIso, recordsDe, serieSemaines, trier } from '@/lib/v2/cartes/exploits';
import { filtrerTendance } from '@/lib/v2/pesee/tendance';
import { viewValue } from '@/lib/v2/progres/measures';
import type { MeasurePoint, ViewKey } from '@/lib/v2/progres/measures';
import { durationOf, tonnage } from '@/lib/v2/trainingWeek';

export type TypePeriode = 'semaine' | 'mois';

export type Periode = { type: TypePeriode; debut: string; fin: string };

export type BilanPeriode = {
  periode: Periode;
  /** la période d'avant, pour comparer */
  avant: Periode;
  /** la période n'est pas finie (aujourd'hui est dedans) */
  enCours: boolean;
  seances: {
    nombre: number;
    nombreAvant: number;
    minutes: number;
    minutesAvant: number;
    /** kilos soulevés (séries de travail) */
    tonnage: number;
    /** jours avec au moins une séance */
    jours: number;
    /** sports, du plus pratiqué au moins pratiqué */
    sports: { sport: string; nombre: number }[];
  };
  /** objectif de séances par semaine choisi par toi (0 : pas d'objectif) */
  objectif: { parSemaine: number; tenu: boolean | null; semainesTenues: number; semaines: number } | null;
  /** semaines d'affilée à ton objectif, jusqu'à la fin de la période */
  serie: number;
  records: { date: string; texte: string }[];
  poids: { debut: number; fin: number; ecart: number; pesees: number } | null;
  mensurations: { cle: ViewKey; debut: number; fin: number; ecart: number }[];
};

const p2 = (n: number) => String(n).padStart(2, '0');
function dateDe(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function plusJours(jour: string, n: number): string {
  const d = dateDe(jour);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** La période qui contient `jour`, décalée de `decalage` périodes (−1 : la précédente) */
export function periodeDe(type: TypePeriode, jour: string, decalage = 0): Periode {
  if (type === 'semaine') {
    const debut = plusJours(lundiIso(jour), 7 * decalage);
    return { type, debut, fin: plusJours(debut, 6) };
  }
  const d = dateDe(jour);
  const m = new Date(d.getFullYear(), d.getMonth() + decalage, 1, 12);
  const fin = new Date(m.getFullYear(), m.getMonth() + 1, 0, 12);
  return { type, debut: iso(m), fin: iso(fin) };
}

/**
 * La période à montrer par défaut : la semaine en cours, sauf le lundi où la semaine qui vient de finir
 * a plus à dire ; le mois en cours, sauf les 3 premiers jours où on regarde le mois fini.
 */
export function periodeParDefaut(type: TypePeriode, aujourdhui: string): Periode {
  const d = dateDe(aujourdhui);
  if (type === 'semaine') return periodeDe(type, aujourdhui, d.getDay() === 1 ? -1 : 0);
  return periodeDe(type, aujourdhui, d.getDate() <= 3 ? -1 : 0);
}

const jourDe = (t: Training) => String(t.date ?? '').slice(0, 10);
const dans = (j: string, p: Periode) => j >= p.debut && j <= p.fin;

export function bilanPeriode(o: {
  periode: Periode;
  aujourdhui: string;
  trainings: Training[];
  pesees: { date: string; value: number }[];
  mesures: MeasurePoint[];
  parSemaine: number;
}): BilanPeriode {
  const p = o.periode;
  const avant = periodeDe(p.type, p.debut, -1);
  const tries = trier(o.trainings);
  const de = (q: Periode) => tries.filter((t) => dans(jourDe(t), q));
  const ici = de(p);
  const la = de(avant);

  const parSport = new Map<string, number>();
  for (const t of ici) {
    const s = String(t.sport ?? '').split(',')[0].trim() || 'autre';
    parSport.set(s, (parSport.get(s) ?? 0) + 1);
  }

  // objectif : la semaine tenue ou non ; sur un mois, les semaines (commencées dans le mois et finies) tenues
  let objectif: BilanPeriode['objectif'] = null;
  if (o.parSemaine > 0) {
    if (p.type === 'semaine') {
      const fini = p.fin < o.aujourdhui;
      objectif = { parSemaine: o.parSemaine, tenu: ici.length >= o.parSemaine ? true : fini ? false : null, semainesTenues: ici.length >= o.parSemaine ? 1 : 0, semaines: 1 };
    } else {
      let tenues = 0;
      let semaines = 0;
      for (let l = lundiIso(p.debut) < p.debut ? plusJours(lundiIso(p.debut), 7) : lundiIso(p.debut); l <= p.fin; l = plusJours(l, 7)) {
        const s = { type: 'semaine' as const, debut: l, fin: plusJours(l, 6) };
        if (s.fin > o.aujourdhui && !(de(s).length >= o.parSemaine)) continue; // semaine en cours pas encore jouée
        semaines += 1;
        if (de(s).length >= o.parSemaine) tenues += 1;
      }
      objectif = { parSemaine: o.parSemaine, tenu: null, semainesTenues: tenues, semaines };
    }
  }

  const derniere = ici.length ? ici[ici.length - 1] : null;
  const serie = o.parSemaine > 0 && derniere ? serieSemaines(tries, lundiIso(p.fin > o.aujourdhui ? o.aujourdhui : p.fin), o.parSemaine, cleTri(derniere)) : 0;

  // records : chaque séance de la période comparée à tout ce qui précède
  const records: BilanPeriode['records'] = [];
  for (const t of ici) {
    const i = tries.indexOf(t);
    for (const e of recordsDe(t, tries.slice(0, i))) {
      const v = `${e.hero.value}${e.hero.unit ? ` ${e.hero.unit}` : ''}`;
      records.push({ date: jourDe(t), texte: e.type === 'record_charge' ? `${e.accroche}, ${v}` : `${e.surtitre}, ${v}` });
    }
  }

  // poids réel : ta tendance au début et à la fin de la période (pas une pesée isolée, qui varie avec l'eau)
  let poids: BilanPeriode['poids'] = null;
  const serieP = o.pesees.filter((x) => x.date <= o.aujourdhui).sort((a, b) => (a.date < b.date ? -1 : 1));
  const tf = filtrerTendance(serieP, o.aujourdhui);
  const dansP = tf.filter((x) => dans(x.date, p));
  if (dansP.length) {
    const avantDebut = tf.filter((x) => x.date < p.debut);
    const d0 = avantDebut.length ? avantDebut[avantDebut.length - 1] : dansP[0];
    const d1 = dansP[dansP.length - 1];
    if (dansP.length >= 2 || avantDebut.length) {
      const r = (n: number) => Math.round(n * 10) / 10;
      poids = { debut: r(d0.tendance), fin: r(d1.tendance), ecart: r(d1.tendance - d0.tendance), pesees: dansP.length };
    }
  }

  // mensurations : la dernière prise de la période comparée à la dernière d'avant (ou à la première de la période)
  const mensurations: BilanPeriode['mensurations'] = [];
  const cles: ViewKey[] = ['waist', 'navel', 'hips', 'chest', 'shoulders', 'arm', 'thigh', 'calf', 'neck'];
  for (const cle of cles) {
    const pts = o.mesures.map((m) => ({ date: m.date, v: viewValue(m, cle) })).filter((x): x is { date: string; v: number } => !!x.v);
    const ds = pts.filter((x) => dans(x.date, p));
    if (!ds.length) continue;
    const av = pts.filter((x) => x.date < p.debut);
    const a = av.length ? av[av.length - 1] : ds.length >= 2 ? ds[0] : null;
    if (!a) continue;
    const b = ds[ds.length - 1];
    const r = (n: number) => Math.round(n * 10) / 10;
    mensurations.push({ cle, debut: r(a.v), fin: r(b.v), ecart: r(b.v - a.v) });
  }

  return {
    periode: p,
    avant,
    enCours: o.aujourdhui >= p.debut && o.aujourdhui <= p.fin,
    seances: {
      nombre: ici.length,
      nombreAvant: la.length,
      minutes: ici.reduce((n, t) => n + durationOf(t), 0),
      minutesAvant: la.reduce((n, t) => n + durationOf(t), 0),
      tonnage: Math.round(ici.reduce((n, t) => n + tonnage(t), 0)),
      jours: new Set(ici.map(jourDe)).size,
      sports: [...parSport.entries()].sort((a, b) => b[1] - a[1]).map(([sport, nombre]) => ({ sport, nombre })),
    },
    objectif,
    serie,
    records: records.slice(-8).reverse(),
    poids,
    mensurations,
  };
}
