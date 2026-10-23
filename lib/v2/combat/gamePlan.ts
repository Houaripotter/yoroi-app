/**
 * Plan de jeu (refonte v2) : checklist, playbook, dangers, journal et fiabilite
 * des plans, extraits de tes analyses de rounds. Meme logique que l'ancien ecran.
 */
import type { CombatRound, Training } from '@/lib/database';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { roundsOf } from './rounds';
import { traduire } from '@/lib/i18n/tr';

export const CHECKED_KEY = '@yoroi_gameplan_checked';

const tokenize = (text: string): string[] =>
  text
    .split(/[,;.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

const countFreq = (items: string[]): [string, number][] => {
  const map: Record<string, number> = {};
  for (const i of items) {
    const k = i.trim();
    if (k) map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

export type Entry = { date: string; trainingId?: number; round: CombatRound; sport: string };

export function buildGamePlan(trainings: Training[], partnerName?: string) {
  const match = (r: CombatRound) => !partnerName || (r.partner ?? '').toLowerCase().includes(partnerName.toLowerCase().trim());
  const entries: Entry[] = [];
  for (const t of trainings) for (const r of roundsOf(t)) if (match(r)) entries.push({ date: t.date, trainingId: t.id, round: r, sport: t.sport });
  entries.sort((a, b) => b.date.localeCompare(a.date));

  const improvements = entries
    .filter((e) => e.round.improvement?.trim())
    .map((e) => ({ id: `imp_${e.trainingId ?? 0}_${e.round.number}`, text: e.round.improvement!.trim(), date: e.date, partner: e.round.partner ?? null, source: 'improvement' as const }));
  const defenses = entries
    .filter((e) => e.round.counteredBy?.trim())
    .slice(0, 15)
    .map((e) => ({ id: `def_${e.trainingId ?? 0}_${e.round.number}`, text: traduire("Défendre : {0}", e.round.counteredBy!.trim()), date: e.date, partner: e.round.partner ?? null, source: 'defense' as const }));
  const seen = new Set<string>();
  const checklist = [...improvements, ...defenses]
    .filter((it) => {
      const k = it.text.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 12);

  const playbook = countFreq([...entries.flatMap((e) => (e.round.whatWorked ? tokenize(e.round.whatWorked) : [])), ...entries.flatMap((e) => (e.round.methodsGiven ?? []).map((m) => getMethodDisplayName(m)))]).slice(0, 8);
  const dangers = countFreq([
    ...entries.flatMap((e) => (e.round.whatDidntWork ? tokenize(e.round.whatDidntWork) : [])),
    ...entries.flatMap((e) => (e.round.counteredBy ? tokenize(e.round.counteredBy) : [])),
    ...entries.flatMap((e) => (e.round.methodsTaken ?? []).map((m) => getMethodDisplayName(m))),
  ]).slice(0, 8);

  const journal = entries
    .filter((e) => e.round.gamePlan?.trim())
    .slice(0, 20)
    .map((e) => ({ id: `gp_${e.trainingId ?? 0}_${e.round.number}`, trainingId: e.trainingId, text: e.round.gamePlan!.trim(), date: e.date, partner: e.round.partner ?? null, roundNum: e.round.number, result: e.round.result, whatWorked: e.round.whatWorked }));

  const totalPlans = entries.filter((e) => e.round.gamePlan).length;
  const executed = entries.filter((e) => e.round.gamePlan && e.round.whatWorked).length;
  const executionRate = totalPlans > 0 ? Math.round((executed / totalPlans) * 100) : 0;

  const rel: Record<string, { total: number; success: number; lastDate: string; text: string }> = {};
  for (const e of entries) {
    const gp = e.round.gamePlan?.trim();
    if (!gp) continue;
    const k = gp.toLowerCase();
    if (!rel[k]) rel[k] = { total: 0, success: 0, lastDate: e.date, text: gp };
    rel[k].total++;
    if (e.round.whatWorked?.trim() && e.round.result === 'win') rel[k].success++;
    if (e.date > rel[k].lastDate) rel[k].lastDate = e.date;
  }
  const reliability = Object.values(rel)
    .map((v) => ({ text: v.text, total: v.total, success: v.success, rate: v.total > 0 ? Math.round((v.success / v.total) * 100) : 0, lastDate: v.lastDate }))
    .sort((a, b) => b.total - a.total || b.rate - a.rate)
    .slice(0, 10);

  return { entries, checklist, playbook, dangers, journal, totalPlans, executed, executionRate, reliability };
}
