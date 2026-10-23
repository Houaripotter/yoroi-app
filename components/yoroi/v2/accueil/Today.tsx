/**
 * Accueil : donnees partagees par l'accueil (app/(tabs)/index.tsx et Sections.tsx).
 * Le rendu vit dans Sections.tsx. Les anciens blocs non rendus (en-tete avec rond de profil,
 * carte « Ton dojo », bloc Aujourd'hui, actions) sont archives dans
 * _archive_ancien_design_2026-10-09/vague14/finitions/Today.tsx.
 */
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { durationOf, formatDuration } from '@/lib/v2/trainingWeek';
import type { NextSession } from '@/lib/v2/accueil/home';
import { relativeDay } from '@/lib/v2/accueil/home';
import { formatMinutes } from '@/lib/v2/accueil/forme';

export type ActivityToday = { connected: boolean; steps: number | null; move: number | null; exercise: number | null; moveGoal: number; exerciseGoal: number };

/* ============ Prochain entrainement ============ */

export type NextTarget = { over: string; title: string; sub?: string; sportId: string; params: Record<string, string>; /** libelle du bouton de lancement */ cta?: string };

export function nextTarget(next: NextSession | null, trainings: Training[], favori: string | undefined): NextTarget {
  if (next && next.sportId) {
    const params: Record<string, string> = next.slotId ? { slotId: String(next.slotId) } : { sport: next.sportId };
    return {
      over: `${next.when}${next.time ? ` à ${next.time}` : ''}${next.duration ? `, ${formatMinutes(next.duration)}` : ''}`,
      title: next.title,
      sub: next.club ? `${next.sport}, ${next.club}` : next.title !== next.sport ? next.sport : undefined,
      sportId: next.sportId,
      params,
    };
  }
  const sorted = [...trainings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));
  const last = sorted[0];
  if (last && last.id) {
    const main = last.sport.split(',')[0].trim();
    const n = (last.exercises ?? []).length;
    const dur = durationOf(last);
    return {
      over: `Dernière séance ${relativeDay(last.date)}`,
      title: getSportName(main),
      sub: [n > 0 ? `${n} exercice${n > 1 ? 's' : ''}` : null, dur > 0 ? `environ ${formatDuration(dur)}` : null].filter(Boolean).join(', ') || undefined,
      sportId: main,
      params: n > 0 ? { sport: main, repeatId: String(last.id) } : { sport: main },
    };
  }
  const sport = favori || 'musculation';
  return { over: 'Ta première séance', title: getSportName(sport), sportId: sport, params: { sport } };
}
