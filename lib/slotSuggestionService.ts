import { getTrainings, getWeeklyPlan, Training, WeeklyPlan } from '@/lib/database';
import { getDay } from 'date-fns';

interface SlotSuggestion {
  sport: string;
  dayOfWeek: number; // 0-6 (lundi-dimanche)
  count: number; // nombre de fois sur les 4 dernieres semaines
  avgTime?: string;
  avgDuration?: number;
  clubId?: number;
}

/**
 * Detecte les patterns d'entrainement et suggere des creneaux reguliers.
 * Retourne une suggestion si un meme sport est fait le meme jour >= 3 fois
 * sur les 4 dernieres semaines et qu'aucun creneau n'existe deja pour cette combinaison.
 */
export const detectSlotPatterns = async (): Promise<SlotSuggestion[]> => {
  const [trainings, existingSlots] = await Promise.all([
    getTrainings(28), // 4 semaines
    getWeeklyPlan(),
  ]);

  // Compter par sport + jour de semaine
  const patternCounts: Record<string, {
    sport: string;
    dayOfWeek: number;
    count: number;
    times: string[];
    durations: number[];
    clubIds: (number | undefined)[];
  }> = {};

  for (const training of trainings) {
    const date = new Date(training.date);
    const jsDay = getDay(date); // 0=dimanche
    const planDay = jsDay === 0 ? 6 : jsDay - 1; // 0=lundi

    // Gerer les sports multiples (separes par virgule)
    const sports = training.sport.split(',').map(s => s.trim());
    for (const sport of sports) {
      const key = `${sport}_${planDay}`;
      if (!patternCounts[key]) {
        patternCounts[key] = {
          sport,
          dayOfWeek: planDay,
          count: 0,
          times: [],
          durations: [],
          clubIds: [],
        };
      }
      patternCounts[key].count++;
      if (training.start_time) patternCounts[key].times.push(training.start_time);
      if (training.duration_minutes) patternCounts[key].durations.push(training.duration_minutes);
      patternCounts[key].clubIds.push(training.club_id);
    }
  }

  // Filtrer les patterns >= 3 occurrences et sans creneau existant
  const suggestions: SlotSuggestion[] = [];

  for (const pattern of Object.values(patternCounts)) {
    if (pattern.count < 3) continue;

    // Verifier qu'il n'y a pas deja un creneau pour ce sport + jour
    const alreadyExists = existingSlots.some(
      s => s.sport === pattern.sport && s.day_of_week === pattern.dayOfWeek
    );
    if (alreadyExists) continue;

    // Calculer l'heure moyenne
    let avgTime: string | undefined;
    if (pattern.times.length > 0) {
      const totalMinutes = pattern.times.reduce((acc, t) => {
        const [h, m] = t.split(':').map(Number);
        return acc + h * 60 + m;
      }, 0);
      const avgMin = Math.round(totalMinutes / pattern.times.length);
      const h = Math.floor(avgMin / 60);
      const m = avgMin % 60;
      avgTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // Calculer la duree moyenne
    let avgDuration: number | undefined;
    if (pattern.durations.length > 0) {
      avgDuration = Math.round(
        pattern.durations.reduce((a, b) => a + b, 0) / pattern.durations.length
      );
    }

    // Club le plus frequent
    const clubCounts: Record<number, number> = {};
    for (const cid of pattern.clubIds) {
      if (cid) clubCounts[cid] = (clubCounts[cid] || 0) + 1;
    }
    const topClubId = Object.entries(clubCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    suggestions.push({
      sport: pattern.sport,
      dayOfWeek: pattern.dayOfWeek,
      count: pattern.count,
      avgTime,
      avgDuration,
      clubId: topClubId ? parseInt(topClubId) : undefined,
    });
  }

  return suggestions.sort((a, b) => b.count - a.count);
};
