/**
 * Ce que l'ancienne saisie faisait apres l'enregistrement, montre sur l'ecran de fin en v2 :
 * succes de combat, creneau regulier a proposer, rappel de sauvegarde.
 * Les anciens badges ne sont plus verifies ni annonces (ils ne sont visibles nulle part en v2) :
 * ceux deja gagnes restent enregistres tels quels, rien n'est efface. Les Defis n'existent plus.
 */
import { addWeeklyPlanItem, getTrainings } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getSportCategory, getSportName } from '@/lib/sports';
import type { detectSlotPatterns } from '@/lib/slotSuggestionService';
import { traduire, LOCALE } from '@/lib/i18n/tr';

export type SlotIdea = Awaited<ReturnType<typeof detectSlotPatterns>>[number];

export type SessionExtras = {
  achievements: string[];
  slotIdea: SlotIdea | null;
  backup: boolean;
};

const DAYS = [traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi'), traduire('dimanche')];

export function slotIdeaText(s: SlotIdea): string {
  return traduire("Tu fais du {0} le {1} depuis {2} semaines. On en fait un créneau de ton planning ?", getSportName(s.sport).toLocaleLowerCase(LOCALE), DAYS[s.dayOfWeek] ?? '', s.count);
}

export async function createSlotFromIdea(s: SlotIdea): Promise<void> {
  await addWeeklyPlanItem({ day_of_week: s.dayOfWeek, sport: s.sport, time: s.avgTime, duration_minutes: s.avgDuration, club_id: s.clubId });
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn('Complement de fin de seance indisponible', err);
    return fallback;
  }
}

export async function loadSessionExtras(sport: string, fromSlot: boolean): Promise<SessionExtras> {
  const isCombat = ['combat_grappling', 'combat_striking'].includes(getSportCategory(sport));
  const [achievements, slotIdea, backup] = await Promise.all([
    safe(async () => {
      if (!isCombat) return [] as string[];
      const { computeStats, checkNewAchievements } = await import('@/lib/combatAchievements');
      const all = await getTrainings(3650);
      return (await checkNewAchievements(computeStats(all))).map((a) => a.title);
    }, [] as string[]),
    safe(async () => {
      if (fromSlot) return null;
      const { detectSlotPatterns } = await import('@/lib/slotSuggestionService');
      const list = await detectSlotPatterns();
      return list[0] ?? null;
    }, null as SlotIdea | null),
    safe(async () => {
      const { backupReminderService } = await import('@/lib/backupReminderService');
      const due = await backupReminderService.onDataAdded();
      if (due) await backupReminderService.markReminderShown();
      return due;
    }, false),
  ]);
  return { achievements, slotIdea, backup };
}
