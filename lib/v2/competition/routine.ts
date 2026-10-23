/**
 * Ancienne semaine type (reglages weekly_routine) : lecture, et conversion en creneaux du planning
 * (table weekly_plan) pour que tout vive au meme endroit.
 */
import { addWeeklyPlanItem, getClubs, getWeeklyPlan } from '@/lib/database';
import type { Club, WeeklyPlan } from '@/lib/database';
import type { UserClub } from '@/lib/storage';

export type RoutineBlock = { time: string; activity: string; workoutType?: string };
export type Routine = Record<string, RoutineBlock[]>;

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAY_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const isRestDay = (blocks: RoutineBlock[] | undefined) => !!blocks && blocks.length === 1 && blocks[0]?.activity === 'REPOS';

export function sportOfType(type: string | undefined): string {
  switch (type) {
    case 'gracie_barra':
      return 'jjb';
    case 'basic_fit':
      return 'musculation';
    case 'running':
      return 'running';
    case 'mma':
      return 'mma';
    case 'foot':
      return 'football';
    default:
      return 'autre';
  }
}

/** Devine le sport depuis le nom de l'activite (meme regles que l'ancien ecran) */
export function guessSport(activity: string): string {
  const a = activity.toLowerCase();
  if (a.includes('jujitsu') || a.includes('jiu') || a.includes('jjb') || a.includes('gracie')) return 'jjb';
  if (a.includes('muscu') || a.includes('basic')) return 'musculation';
  if (a.includes('course') || a.includes('running') || a.includes('run')) return 'running';
  if (a.includes('mma')) return 'mma';
  if (a.includes('boxe')) return 'boxe';
  return 'autre';
}

/** "18h30" ou "18:30" vers "18:30" */
export function toPlanTime(t: string | undefined): string | undefined {
  if (!t) return undefined;
  const m = /^(\d{1,2})\s*[h:]\s*(\d{0,2})$/.exec(t.trim());
  if (!m) return undefined;
  return `${m[1].padStart(2, '0')}:${(m[2] || '00').padStart(2, '0')}`;
}

export function countBlocks(routine: Routine): { sessions: number; restDays: number } {
  let sessions = 0;
  let restDays = 0;
  Object.values(routine).forEach((blocks) => {
    if (isRestDay(blocks)) restDays++;
    else sessions += (blocks || []).filter((b) => b.activity !== 'REPOS').length;
  });
  return { sessions, restDays };
}

/**
 * Cree les creneaux du planning a partir de la semaine type.
 * Ne cree pas de doublon : un creneau du meme jour, a la meme heure et du meme sport est ignore.
 */
export async function convertRoutineToPlan(routine: Routine, userClubs: UserClub[]): Promise<{ created: number; skipped: number }> {
  const [existing, clubs] = await Promise.all([getWeeklyPlan().catch(() => [] as WeeklyPlan[]), getClubs().catch(() => [] as Club[])]);
  let created = 0;
  let skipped = 0;
  for (let day = 0; day < 7; day++) {
    const blocks = routine[DAY_KEYS[day]] || [];
    if (blocks.length === 0) continue;
    if (isRestDay(blocks)) {
      if (existing.some((p) => p.day_of_week === day && p.is_rest_day)) {
        skipped++;
        continue;
      }
      await addWeeklyPlanItem({ day_of_week: day, sport: 'repos', is_rest_day: true });
      created++;
      continue;
    }
    for (const b of blocks) {
      if (b.activity === 'REPOS') continue;
      const dbClub = clubs.find((c) => c.name.trim().toLowerCase() === b.activity.trim().toLowerCase());
      const userClub = userClubs.find((c) => c.name === b.activity);
      const sport = dbClub?.sport || (userClub ? sportOfType(userClub.type) : guessSport(b.activity));
      const time = toPlanTime(b.time);
      if (existing.some((p) => p.day_of_week === day && (p.time || undefined) === time && p.sport === sport && !p.is_rest_day)) {
        skipped++;
        continue;
      }
      await addWeeklyPlanItem({
        day_of_week: day,
        club_id: dbClub?.id,
        sport,
        time,
        duration_minutes: 60,
        label: b.workoutType || (dbClub ? undefined : b.activity),
      });
      created++;
    }
  }
  return { created, skipped };
}
