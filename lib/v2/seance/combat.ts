/**
 * Seance de combat : types de seance, chrono de rounds (logique pure), suggestions.
 */
import type { Training } from '@/lib/database';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { getCombatThemesForSport } from '@/lib/combatThemeLibrary';
import { getSportCategory } from '@/lib/sports';
import type { CombatDraft, CombatSessionType, CombatTimer, LiveRound, RoundIntensity } from './model';

/** Libelles affiches, ids identiques a add-combat-session.tsx */
export const SESSION_TYPES: { value: CombatSessionType; label: string }[] = [
  { value: 'entrainement', label: 'Cours' },
  { value: 'technique', label: 'Drilling' },
  { value: 'guerre', label: 'Sparring' },
  { value: 'openmat', label: 'Open mat' },
  { value: 'competition', label: 'Compétition' },
];

export function sessionTypeLabel(t: CombatSessionType): string {
  return SESSION_TYPES.find((s) => s.value === t)?.label ?? 'Cours';
}

/**
 * Type d'une seance relue pour modification (18 octobre 2026) : un type de la liste est repris,
 * un ancien nom connu (sparring, drilling...) est montre avec son equivalent, et un type hors liste est garde
 * tel quel (orig) au lieu de retomber sur « Cours ».
 */
export function typeSeanceRelu(raw: string | null | undefined, alias: (t: string) => string = (t) => t): { sessionType: CombatSessionType; orig?: string } {
  const v = (raw ?? '').trim();
  const ids = SESSION_TYPES.map((s) => s.value as string);
  if (!v) return { sessionType: 'entrainement' };
  if (ids.includes(v)) return { sessionType: v as CombatSessionType };
  const a = alias(v);
  return { sessionType: ids.includes(a) ? (a as CombatSessionType) : 'entrainement', orig: v };
}

/** Type hors liste sans equivalent : affiche tel quel, aucun choix de la liste n'est allume */
export function typeLibre(d: { sessionTypeOrig?: string }, alias: (t: string) => string = (t) => t): string | null {
  const o = d.sessionTypeOrig?.trim();
  if (!o) return null;
  return SESSION_TYPES.some((s) => s.value === alias(o)) ? null : o;
}

/** Type a enregistrer : l'origine hors liste si tu n'as rien change, sinon ton choix */
export function typeAEnregistrer(d: { sessionType: CombatSessionType; sessionTypeOrig?: string }): string {
  return d.sessionTypeOrig?.trim() || d.sessionType;
}

/** Libelle du type : celui de la liste, ou le type hors liste tel quel (premiere lettre en capitale) */
export function libelleTypeSeance(d: { sessionType: CombatSessionType; sessionTypeOrig?: string }, alias: (t: string) => string = (t) => t): string {
  const libre = typeLibre(d, alias);
  if (libre) return libre.charAt(0).toLocaleUpperCase('fr-FR') + libre.slice(1).replace(/_/g, ' ');
  return sessionTypeLabel(d.sessionType);
}

export const ROUND_INTENSITIES: { value: RoundIntensity; label: string }[] = [
  { value: 'detendu', label: 'Tranquille' },
  { value: 'technique', label: 'Appliqué' },
  { value: 'guerre', label: 'La guerre' },
];

export const RESULTS: { value: 'win' | 'loss' | 'draw'; label: string }[] = [
  { value: 'win', label: 'Gagné' },
  { value: 'loss', label: 'Perdu' },
  { value: 'draw', label: 'Égalité' },
];

export function isGrappling(sport: string): boolean {
  return getSportCategory(sport) === 'combat_grappling' || sport === 'mma';
}

/**
 * Fait avancer le chrono jusqu'a l'instant present (gere aussi un retour apres une longue absence).
 * Renvoie le nouvel etat et la liste des evenements a signaler (bips, vibrations).
 */
export type TimerEvent = 'round_start' | 'round_end' | 'all_done';

/** Un changement de phase rate de plus de 1,5 s (ecran verrouille, app en arriere-plan) ne fait plus sonner */
export const SON_EN_RETARD_MS = 1500;

export function sonEnRetard(lastAt: number | null, now: number): boolean {
  return lastAt !== null && now - lastAt > SON_EN_RETARD_MS;
}

export function advanceTimer(d: CombatDraft, now: number): { draft: CombatDraft; events: TimerEvent[]; lastAt: number | null } {
  let t: CombatTimer = d.timer;
  let rounds = d.rounds;
  const events: TimerEvent[] = [];
  // instant du dernier changement de phase : au retour d'arriere-plan, il dit si les sons sont encore d'actualite
  let lastAt: number | null = null;
  let guard = 0;
  while (t.endsAt !== null && t.endsAt <= now && guard < 100) {
    guard += 1;
    lastAt = t.endsAt;
    if (t.phase === 'round') {
      events.push('round_end');
      if (t.index >= d.totalRounds) {
        t = { phase: 'done', index: t.index, endsAt: null, paused: null };
        events.push('all_done');
      } else if (d.restSec <= 0) {
        const next = t.index + 1;
        t = { phase: 'round', index: next, endsAt: t.endsAt + d.roundSec * 1000, paused: null };
        rounds = ensureRound(rounds, next);
        events.push('round_start');
      } else {
        t = { phase: 'rest', index: t.index, endsAt: t.endsAt + d.restSec * 1000, paused: null };
      }
    } else if (t.phase === 'rest') {
      const next = t.index + 1;
      t = { phase: 'round', index: next, endsAt: t.endsAt + d.roundSec * 1000, paused: null };
      rounds = ensureRound(rounds, next);
      events.push('round_start');
    } else {
      break;
    }
  }
  if (t === d.timer && rounds === d.rounds) return { draft: d, events, lastAt };
  return { draft: { ...d, timer: t, rounds }, events, lastAt };
}

export function ensureRound(rounds: LiveRound[], n: number): LiveRound[] {
  if (rounds.some((r) => r.number === n)) return rounds;
  return [...rounds, { number: n }].sort((a, b) => a.number - b.number);
}

/** Secondes restantes de la phase en cours */
export function timerLeft(t: CombatTimer, now: number): number {
  if (t.paused !== null) return t.paused;
  if (t.endsAt === null) return 0;
  return Math.max(0, Math.ceil((t.endsAt - now) / 1000));
}

/** Intensite generale proposee a partir des rounds (echelle 1 a 10) */
export function suggestedRpe(rounds: LiveRound[]): number | null {
  const vals = rounds.map((r): number | null => (r.intensity === 'guerre' ? 8 : r.intensity === 'technique' ? 6 : r.intensity === 'detendu' ? 4 : null)).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg >= 7.5 ? 9 : avg >= 6.5 ? 7 : avg >= 5 ? 5 : 3;
}

/** Partenaires deja croises, du plus frequent au moins frequent */
export function knownPartners(trainings: Training[]): string[] {
  const counts = new Map<string, { name: string; n: number }>();
  for (const t of trainings) {
    const rounds = Array.isArray(t.combat_rounds) ? t.combat_rounds : [];
    for (const r of rounds) {
      const name = (r?.partner ?? '').trim();
      if (!name) continue;
      const k = name.toLowerCase();
      const cur = counts.get(k);
      if (cur) cur.n += 1;
      else counts.set(k, { name, n: 1 });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.n - a.n).map((x) => x.name).slice(0, 20);
}

/** Soumissions et finitions : deja utilisees d'abord, puis la bibliotheque */
export function methodSuggestions(sport: string, trainings: Training[]): string[] {
  const used = new Map<string, number>();
  for (const t of trainings) {
    for (const r of Array.isArray(t.combat_rounds) ? t.combat_rounds : []) {
      const list = [r?.method, ...(r?.methodsGiven ?? []), ...(r?.methodsTaken ?? [])];
      for (const m of list) if (m && m.trim()) used.set(m.trim(), (used.get(m.trim()) ?? 0) + 1);
    }
  }
  const base = isGrappling(sport)
    ? EXERCISE_LIBRARY.filter((e) => e.category === 'jjb' && (e.muscle === 'SOUMISSIONS' || e.muscle === 'CLÉS' || e.muscle === 'LEG LOCKS')).map((e) => e.name)
    : ['KO', 'Arrêt de l’arbitre', 'Aux points', 'Abandon'];
  const out = [...Array.from(used.entries()).sort((a, b) => b[1] - a[1]).map(([m]) => m)];
  for (const b of base) if (!out.includes(b)) out.push(b);
  return out.slice(0, 40);
}

/** Themes techniques : les tiens d'abord, puis la bibliotheque du sport par categorie */
export function themeCategories(sport: string, trainings: Training[]): { label: string; themes: string[] }[] {
  const mine: string[] = [];
  for (const t of trainings) {
    if (t.sport !== sport || !t.technical_theme) continue;
    for (const part of t.technical_theme.split(',')) {
      const s = part.trim();
      if (s && !mine.includes(s)) mine.push(s);
    }
  }
  const lib = getCombatThemesForSport(sport).map((c) => ({ label: c.label, themes: c.themes }));
  return mine.length > 0 ? [{ label: 'Les tiens', themes: mine.slice(0, 20) }, ...lib] : lib;
}
