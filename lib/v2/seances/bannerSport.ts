/**
 * Sport a illustrer dans un bandeau : le sport le plus pratique dans les seances.
 */
import { firstSport } from './sessionData';

export function mainSportOf(trainings: { sport?: string | null }[]): string | undefined {
  const counts: Record<string, number> = {};
  for (const t of trainings) {
    const id = firstSport(t.sport ?? undefined);
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}
