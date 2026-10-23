/**
 * Carte « Ta récupération » de l'onglet Santé (vague 32).
 * Le score n'est plus calculé ici : c'est le MÊME que celui de l'accueil et de l'écran détail,
 * calculé par computeForme (lib/v2/accueil/forme.ts, règles dans lib/v2/recuperation.ts).
 * Ce fichier ne fait que le mettre en forme pour Santé, et garde les signaux hors score
 * (respiration et température au poignet au-dessus de ta moyenne).
 */
import { daysDiff, todayIso } from '@/lib/v2/progres/format';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import type { MetricKey } from './metrics';
import type { DayPoint } from './stats';
import { messageScoreIncomplet, scoreRecupFiable } from '@/lib/v2/recuperation';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export type ScorePart = {
  key: MetricKey;
  label: string;
  /** valeur du jour, déjà formatée */
  today: string;
  /** moyenne personnelle formatée, si elle existe */
  baseline?: string;
  /** écart en clair */
  delta?: string;
  score: number;
  weight: number;
  /** element du score unique (sommeil, charge, vfc...) */
  factor?: string;
};

export type Readiness = {
  score: number | null;
  title: string;
  advice: string;
  tone: 'good' | 'mid' | 'low' | 'none';
  parts: ScorePart[];
  /** ce qui manque pour calculer */
  missing: string[];
  /** signaux à surveiller, hors score */
  flags: string[];
};

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const fr = (v: number, d = 0) => v.toFixed(d).replace('.', DECIMAL);

/** Dernière valeur des 2 derniers jours et moyenne des 28 jours d'avant */
function todayAndBaseline(points: DayPoint[] | undefined): { today: DayPoint | null; base: number | null; n: number } {
  const pts = (points ?? []).filter((p) => p.value > 0);
  const t = todayIso();
  let today: DayPoint | null = null;
  for (let i = pts.length - 1; i >= 0; i--) {
    const d = daysDiff(pts[i].date, t);
    if (d >= 0 && d <= 1) {
      today = pts[i];
      break;
    }
  }
  if (!today) return { today: null, base: null, n: 0 };
  const prev = pts.filter((p) => p.date < today!.date && daysDiff(p.date, today!.date) <= 28).map((p) => p.value);
  return { today, base: prev.length >= 5 ? mean(prev) : null, n: prev.length };
}

const RECUP_METRIC: Partial<Record<string, MetricKey>> = { sommeil: 'sommeil', vfc: 'vfc', coeur: 'fc-repos' };

/** Signaux hors score : respiration et temperature au poignet nettement au-dessus de ta moyenne */
export function santeFlags(series: Partial<Record<MetricKey, DayPoint[]>> | null): string[] {
  const flags: string[] = [];
  if (!series) return flags;
  const rr = todayAndBaseline(series.respiration);
  if (rr.today && rr.base && rr.today.value - rr.base >= 1.5) flags.push(traduire("Ta respiration de la nuit est plus rapide que d'habitude ({0} contre {1} par minute).", fr(rr.today.value, 1), fr(rr.base, 1)));
  const wt = todayAndBaseline(series['temperature-poignet']);
  if (wt.today && wt.base && wt.today.value - wt.base >= 0.5) flags.push(traduire("Ton poignet est plus chaud que d'habitude cette nuit (+{0} °C).", fr(wt.today.value - wt.base, 1)));
  return flags;
}

/** Le score unique de recuperation, mis en forme pour la carte Sante */
export function readinessFromForme(forme: FormeResult | null, series: Partial<Record<MetricKey, DayPoint[]>> | null): Readiness {
  const flags = santeFlags(series);
  if (!forme) return { score: null, title: traduire('Pas encore de score'), advice: '', tone: 'none', parts: [], missing: [traduire('tes mesures')], flags };
  const parts: ScorePart[] = forme.factors.map((f) => ({
    key: (RECUP_METRIC[f.key] ?? f.key) as MetricKey,
    label: f.label,
    today: f.value ?? String(f.score),
    baseline: f.baseline,
    // la valeur est deja affichee : « 7 h 50 cette nuit, selon ta montre » devient « cette nuit, selon ta montre »
    delta: f.value && f.detail.startsWith(`${f.value} `) ? f.detail.slice(f.value.length + 1) : f.detail,
    score: f.score,
    weight: 0,
    factor: f.key,
  }));
  const LABEL: Record<string, string> = { sommeil: traduire('ta nuit de sommeil'), charge: traduire('une séance récente'), hydratation: traduire('ton eau du jour'), corps: traduire('ton état du corps') };
  const missing = forme.missing.map((k) => LABEL[k] ?? k);
  if (forme.score === null || !forme.level) return { score: null, title: traduire('Pas encore de score'), advice: '', tone: 'none', parts, missing, flags };
  // audit 18 octobre : meme regle que l'accueil et l'ecran detail, pas de score sur 100 avec un seul element mesure
  if (!scoreRecupFiable(forme.score, forme.factors.length)) {
    return { score: null, title: messageScoreIncomplet(forme.missing.includes('sommeil')), advice: '', tone: 'none', parts, missing, flags };
  }
  const tone: Readiness['tone'] = forme.level.id === 'top' || forme.level.id === 'bien' ? 'good' : forme.level.id === 'moyen' ? 'mid' : 'low';
  return { score: forme.score, title: forme.level.label, advice: forme.level.advice, tone, parts, missing, flags };
}
