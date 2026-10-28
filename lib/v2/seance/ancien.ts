/**
 * Séances en direct non terminées depuis plus de 2 jours (28 octobre 2026, audit « ne jamais perdre de
 * données »). Avant, loadDraft les effaçait sans un mot. Maintenant elles sont gardées (model.ts, ANCIENS_KEY)
 * et la barre « Séance en cours » propose « Enregistrer ce qui est fait » ou « Effacer ».
 *
 * Durée enregistrée : jamais « maintenant moins le début » (la séance aurait duré 3 jours). On prend la dernière
 * trace de vie de la séance (majMs, écrite à chaque changement), sinon une estimation : 3 minutes par série,
 * la durée des rounds, la durée réglée à la main. Toujours entre 1 minute et 6 heures.
 * Reprendre n'est pas proposé : 2 jours plus tard, le chrono et les repos n'ont plus de sens ; une fois
 * enregistrée, la séance se modifie comme les autres.
 */
import type { CombatRound, Exercise, Training } from '@/lib/database';
import { bestSet } from './history';
import { hhmm, isoDay, parseNum } from './format';
import { typeAEnregistrer } from './combat';
import type { SeanceDraft } from './model';

const MAX_MIN = 6 * 60;
const borne = (m: number) => Math.max(1, Math.min(MAX_MIN, Math.round(m)));

/** Minutes à enregistrer, jamais calculées sur l'heure actuelle */
export function dureeAncienne(d: SeanceDraft): number {
  if (d.kind === 'cardio' && d.manualMinutes) return borne(d.manualMinutes);
  if (d.majMs && d.majMs > d.startedAt) return borne((d.majMs - d.startedAt) / 60000);
  if (d.kind === 'muscu') return borne(d.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0) * 3);
  if (d.kind === 'combat') {
    const faits = Math.max(d.rounds.length, d.timer.phase === 'done' ? d.totalRounds : Math.max(0, d.timer.index - 1));
    return borne((faits * (d.roundSec + d.restSec)) / 60);
  }
  return 30;
}

/** Ce qui est fait, en une ligne : « 12 séries », « 4 rounds » */
export function travailFait(d: SeanceDraft): { series?: number; rounds?: number } {
  if (d.kind === 'muscu') return { series: d.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0) };
  if (d.kind === 'combat') return { rounds: d.rounds.length };
  return {};
}

/** La séance telle qu'elle sera enregistrée (séries validées seulement) */
export function trainingDepuisAncien(d: SeanceDraft): Training {
  const debut = new Date(d.startedAt);
  const base = { sport: d.sport, date: isoDay(debut), start_time: hhmm(debut), duration_minutes: dureeAncienne(d), source: 'manual' } as Training;
  if (d.kind === 'muscu') {
    const exercises: Exercise[] = d.exercises
      .map((e) => {
        const done = e.sets.filter((s) => s.done);
        if (!done.length) return null;
        const setsData = done.map((s) => (s.type ? { weight: s.weight, reps: s.reps, type: s.type } : { weight: s.weight, reps: s.reps }));
        const best = bestSet(setsData)!;
        const out: Exercise = { ...(e.orig ?? {}), name: e.name, muscle_group: e.muscle, weight: best.weight, reps: best.reps, sets: setsData.length, setsData };
        if (e.notes?.trim()) out.notes = e.notes.trim();
        return out;
      })
      .filter((e): e is Exercise => e !== null);
    return {
      ...base,
      exercises: exercises.length ? exercises : undefined,
      muscles: d.muscles && d.muscles.length ? d.muscles.join(',') : undefined,
      notes: d.notes.trim() || undefined,
      intensity: d.intensity ?? undefined,
    };
  }
  if (d.kind === 'combat') {
    const rounds: CombatRound[] = d.rounds.map((r) => {
      const out: CombatRound = { ...(r.orig ?? {}), number: r.number };
      if (r.partner?.trim()) out.partner = r.partner.trim();
      if (r.result) out.result = r.result;
      if (r.method?.trim()) out.method = r.method.trim();
      if (r.intensity) out.roundIntensity = r.intensity;
      if (r.notes?.trim()) out.notes = r.notes.trim();
      return out;
    });
    return {
      ...base,
      session_type: typeAEnregistrer(d),
      intensity: d.rpe ?? undefined,
      rounds: rounds.length || undefined,
      round_duration: rounds.length ? Math.round((d.roundSec / 60) * 10) / 10 : undefined,
      combat_rounds: rounds.length ? rounds : undefined,
      technical_theme: d.theme.trim() || undefined,
      notes: d.notes.trim() || undefined,
    };
  }
  const num = (s: string) => parseNum(s) ?? 0;
  return {
    ...base,
    distance: num(d.distance) > 0 ? Math.round(num(d.distance) * 100) / 100 : undefined,
    calories: num(d.calories) > 0 ? Math.round(num(d.calories)) : undefined,
    heart_rate: num(d.heartRate) > 0 ? Math.round(num(d.heartRate)) : undefined,
    intensity: d.intensity ?? undefined,
    notes: d.notes.trim() || undefined,
    ...(d.sport === 'autre' && d.customName?.trim() ? { session_type: d.customName.trim() } : {}),
  };
}

let enCours = false;
/**
 * Enregistre ce qui est fait, puis retire la séance des non terminées. Un seul enregistrement à la fois
 * (deux appuis ne font jamais deux séances). Renvoie l'id de la séance enregistrée, null si déjà en cours.
 */
export async function enregistrerAncien(d: SeanceDraft): Promise<number | null> {
  if (enCours) return null;
  enCours = true;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { saveSeance } = require('./save') as typeof import('./save');
    const { retirerAncien } = require('./model') as typeof import('./model');
    const { draftTitle } = require('./resume') as typeof import('./resume');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const r = await saveSeance(trainingDepuisAncien(d), { title: draftTitle(d), slotId: d.slotId, methode: 'live' });
    // enregistrée : on la retire ; si le retrait échoue, elle reste visible (mieux qu'une perte), sans doublon possible ici
    await retirerAncien(d).catch(() => undefined);
    if (d.programme) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { marquerJourFait } = require('@/lib/v2/programmes/suivi') as typeof import('@/lib/v2/programmes/suivi');
        await marquerJourFait(d.programme.id, d.programme.jourId, r.id, isoDay(new Date(d.startedAt)));
      } catch {
        // le programme n'avance pas, la séance est bien enregistrée
      }
    }
    return r.id;
  } finally {
    enCours = false;
  }
}
