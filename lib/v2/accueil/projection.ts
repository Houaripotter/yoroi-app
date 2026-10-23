/**
 * Ligne de prevision gratuite de la carte Poids de l'accueil (vague 26).
 * Meme calcul que l'ecran Previsions (app/weight-predictions.tsx) : la tendance lissee
 * des 4 dernieres semaines. Vague 28 : vers un objectif, la date suit le meme modele que l'onboarding
 * (lib/v2/pesee/estimation.ts) : ton rythme reel, jamais plus vite que 1 % du poids par semaine en perte
 * (0,5 % en prise), et qui ralentit pres du but. Sans objectif, la tendance sur 30 jours reste en ligne droite.
 * La page complete reste Premium.
 * Rien n'est renvoye si la tendance n'est pas fiable : trop peu de pesees, derniere pesee
 * trop ancienne, rythme quasi nul ou irrealiste, ou objectif trop lointain.
 */
import type { DayWeight } from '@/lib/v2/weightStats';
import { daysBetween, filterPeriod, weeklyRate } from '@/lib/v2/weightStats';
import { semainesAuRythme } from '@/lib/v2/pesee/estimation';

export type Projection =
  /** date estimee de l'objectif */
  | { kind: 'goal'; value: number; date: string; days: number }
  /** sans objectif : le poids de tendance attendu dans 30 jours */
  | { kind: 'month'; value: number; date: string; days: number };

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function shift(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** « 3 novembre », avec l'annee si elle change */
export function dayMonth(iso: string, todayIso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const base = `${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;
  return iso.slice(0, 4) === todayIso.slice(0, 4) ? base : `${base} ${d.getFullYear()}`;
}

export function projection(series: DayWeight[], goal: number | null, todayIso: string): Projection | null {
  const last = series[series.length - 1];
  if (!last) return null;
  const sinceLast = Math.max(0, daysBetween(last.date, todayIso));
  // pesee de plus de 10 jours : la tendance ne dit plus rien d'aujourd'hui
  if (sinceLast > 10) return null;
  const recent = filterPeriod(series, 28);
  // au moins 4 pesees etalees sur 2 semaines
  if (recent.length < 4 || daysBetween(recent[0].date, last.date) < 14) return null;
  const rate = weeklyRate(series);
  // moins de 100 g par semaine : stable, pas de date a annoncer ; plus de 1,5 kg : rythme irrealiste a prolonger
  if (rate === null || Math.abs(rate) < 0.1 || Math.abs(rate) > 1.5) return null;

  if (goal !== null && goal > 0) {
    const gap = goal - last.trend;
    // objectif deja tenu ou rythme dans le mauvais sens : pas de date
    if (Math.abs(gap) <= 0.2 || Math.sign(gap) !== Math.sign(rate)) return null;
    const weeks = semainesAuRythme(last.trend, goal, rate);
    if (weeks === null) return null;
    const days = Math.round(weeks * 7) - sinceLast;
    if (days < 1 || days > 180) return null;
    return { kind: 'goal', value: goal, date: shift(todayIso, days), days };
  }
  const days = 30;
  const value = last.trend + (rate * (sinceLast + days)) / 7;
  return { kind: 'month', value, date: shift(todayIso, days), days };
}

export type GoalProgress = {
  /** objectif de perte (sinon de prise) */
  losing: boolean;
  /** part du chemin entre le depart et l'objectif, de 0 a 1 */
  pct: number;
  /** poids actuel moins depart : positif si tu as pris */
  moved: number;
  /** ce qu'il reste jusqu'a l'objectif, en valeur positive (0 si atteint) */
  left: number;
  reached: boolean;
};

/**
 * Chemin vers l'objectif de poids, la meme regle a l'accueil (carte Poids) et a la fin d'une pesee :
 * calcule sur ta PESEE DU JOUR (le poids affiche en grand aux deux endroits), pas sur la tendance lissee.
 * Depart : le poids de depart du profil, sinon ta premiere pesee.
 */
export function goalProgress(start: number, target: number, current: number): GoalProgress {
  const losing = target < start || (Math.abs(target - start) < 0.05 && target <= current);
  const reached = losing ? current <= target + 0.05 : current >= target - 0.05;
  const span = Math.abs(start - target);
  const done = losing ? start - current : current - start;
  const pct = reached ? 1 : span < 0.05 ? 0 : Math.max(0, Math.min(1, done / span));
  const left = reached ? 0 : Math.abs(target - current);
  return { losing, pct, moved: current - start, left, reached };
}

/**
 * Poids de depart du chemin : SOURCE UNIQUE (vague 32) pour l'accueil, le profil et la page Poids.
 * Le poids de depart du profil s'il est renseigne, sinon ta premiere pesee a partir du debut du plan
 * (meme regle que la ligne directrice, lib/v2/pesee/ligneDirectrice.ts departDuPlan),
 * sinon ta toute premiere pesee.
 */
export function departDuChemin(
  profil: { start_date?: string | null; start_weight?: number | null } | null | undefined,
  pesees: { date: string; value: number }[],
): number | null {
  const sw = profil?.start_weight;
  if (sw && sw > 20 && sw < 400) return sw;
  const sorted = pesees.filter((p) => p && p.value > 0 && p.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const d = profil?.start_date && /^\d{4}-\d{2}-\d{2}/.test(profil.start_date) ? profil.start_date.slice(0, 10) : null;
  const fromPlan = d ? sorted.find((p) => p.date.slice(0, 10) >= d) : undefined;
  return (fromPlan ?? sorted[0])?.value ?? null;
}
