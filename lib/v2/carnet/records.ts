/**
 * Records du carnet (vague 16) : familles de sport pour le filtre, nom lisible,
 * meilleur en grand, evolution depuis la premiere perf, tampon des records battus.
 */
import { formatTime, getBenchmarkPR } from '@/lib/carnetService';
import type { Benchmark, BenchmarkEntry } from '@/lib/carnetService';
import { entryText, sortedEntries } from './journal';
import type { CarnetIllus } from '@/components/yoroi/v2/carnet/images';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export type RecordFamily = 'muscu' | 'course' | 'cross' | 'cardio' | 'autre';

export const FAMILY_LABEL: Record<RecordFamily, string> = {
  muscu: traduire('Musculation'),
  course: traduire('Course'),
  cross: traduire('Cross-training'),
  cardio: traduire('Cardio'),
  autre: traduire('Autre'),
};

export const FAMILY_ILLUS: Record<RecordFamily, CarnetIllus> = {
  muscu: 'musculation',
  course: 'course',
  cross: 'force',
  cardio: 'endurance',
  autre: 'records',
};

export function familyOf(b: Pick<Benchmark, 'category'>): RecordFamily {
  const c = b.category;
  if (c === 'force' || c === 'musculation' || c === 'bodyweight' || c === 'street_workout') return 'muscu';
  if (c === 'running' || c === 'trail') return 'course';
  if (c === 'hyrox') return 'cross';
  if (c === 'cardio') return 'cardio';
  return 'autre';
}

/** « Développé Couché (Barre) » devient « Développé couché (barre) » ; SkiErg, RDL, 10 km restent tels quels */
/** vague 45 : les noms d'une ancienne demo sans accents (« Souleve de terre », « Developpe couche ») */
const ACCENTS: Record<string, string> = { souleve: 'soulevé', developpe: 'développé', couche: 'couché', incline: 'incliné', decline: 'décliné', epaule: 'épaule', epaules: 'épaules', fentes: 'fentes', ecarte: 'écarté', eleve: 'élevé', elevations: 'élévations', elevation: 'élévation' };
function accentuer(w: string): string {
  const m = w.match(/^([A-Za-z]+)(.*)$/);
  if (!m) return w;
  const a = ACCENTS[m[1].toLowerCase()];
  if (!a) return w;
  const up = m[1][0] === m[1][0].toUpperCase();
  return (up ? a.charAt(0).toUpperCase() + a.slice(1) : a) + m[2];
}

export function niceName(name: string): string {
  const words = name.trim().split(/\s+/).map(accentuer);
  return words
    .map((w, i) => {
      if (i === 0) return w;
      const core = w.replace(/^[(«"']+/, '');
      // mot en Capitale puis minuscules uniquement : on le passe en minuscules
      if (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+[)»"',.]*$/.test(core)) return w.toLowerCase();
      return w;
    })
    .join(' ');
}

/** Coupe une perf en valeur principale et complement : « 100 kg x 5 reps » donne 100 kg et 5 répétitions */
export function splitPerf(text: string): { main: string; sub: string | null } {
  const m = text.match(/^(.+?) x (\d+) reps$/);
  if (m) return { main: m[1], sub: traduirePluriel(Number(m[2]), m[2] !== '1', "{0} répétition", "{0} répétitions", m[2]) };
  const r = text.match(/^(\d+(?:[.,]\d+)?) reps$/);
  if (r) return { main: r[1], sub: traduire('répétitions') };
  const k = text.match(/^(.+? km), (.+ \/km)$/);
  if (k) return { main: k[1], sub: traduire("{0} d’allure", k[2]) };
  return { main: text.replace('.', DECIMAL), sub: null };
}

function fmtNum(n: number): string {
  const r = Math.round(n * 10) / 10;
  return String(r).replace('.', DECIMAL);
}

/** Ecart lisible entre deux valeurs d'un meme suivi, null si pas de progres */
export function gainBetween(b: Pick<Benchmark, 'unit'>, from: number, to: number): string | null {
  if (b.unit === 'time') {
    const d = from - to;
    if (d <= 0) return null;
    return traduire("{0} de mieux", d < 60 ? `${Math.round(d)} s` : formatTime(Math.round(d)));
  }
  const d = to - from;
  if (d <= 0) return null;
  const unit = b.unit === 'kg' ? ' kg' : b.unit === 'lbs' ? ' lbs' : b.unit === 'km' ? ' km' : b.unit === 'meters' ? ' m' : b.unit === 'reps' ? ' reps' : '';
  return `+${fmtNum(d)}${unit}`;
}

export type RecordSummary = {
  pr: BenchmarkEntry | null;
  last: BenchmarkEntry | null;
  first: BenchmarkEntry | null;
  count: number;
  /** le meilleur a ete pose en battant une perf precedente */
  beaten: boolean;
  /** la derniere perf est le record */
  lastIsBest: boolean;
  /** progres depuis la premiere perf */
  gain: string | null;
  /** valeurs dans l'ordre du temps, pour la petite courbe (temps inverses : plus haut = plus vite) */
  curve: number[];
};

export function summarize(b: Benchmark): RecordSummary {
  const s = sortedEntries(b);
  const chrono = [...s].reverse();
  const pr = getBenchmarkPR(b);
  const first = chrono[0] ?? null;
  const last = s[0] ?? null;
  const beaten = !!pr && !!first && chrono.length > 1 && pr.id !== first.id && (b.unit === 'time' ? pr.value < first.value : pr.value > first.value);
  return {
    pr,
    last,
    first,
    count: s.length,
    beaten,
    lastIsBest: !!pr && !!last && last.value === pr.value && s.length > 1,
    gain: pr && first && beaten ? gainBetween(b, first.value, pr.value) : null,
    curve: chrono.slice(-10).map((e) => (b.unit === 'time' ? -e.value : e.value)),
  };
}

export function perfText(b: Benchmark, e: BenchmarkEntry | null): string {
  return entryText(b, e);
}
