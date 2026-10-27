/**
 * Chronos YOROI (refonte v2) : modes, prereglages, couleurs de phase,
 * et sport propose a l'enregistrement de la seance.
 */

export type TimerMode = 'musculation' | 'combat' | 'tabata' | 'emom' | 'amrap' | 'fortime';
export type TimerState = 'idle' | 'running' | 'paused' | 'finished';
export type CombatPreset = 'jjb' | 'mma' | 'boxe' | 'sac' | 'muaythai' | 'kickboxing' | 'lutte' | 'grappling' | 'custom';
export type Phase = 'effort' | 'repos' | 'prepa' | 'fini' | 'pret' | 'final';

/**
 * Une couleur par phase, dans la charte : effort indigo, repos mousse, preparation or,
 * 10 dernieres secondes d'un effort en rouge soie (le seul moment ou le rouge apparait).
 * soft : fond plein ecran de la phase, deep : chiffres et titres.
 */
export const PHASE_COLORS: Record<Phase, { main: string; soft: string; deep: string; label: string }> = {
  // 27 octobre 2026 (maquette Pastel-Chrono) : l'effort sur le fond de la page, en bleu vif, titre bleu nuit
  effort: { main: '#4C6EF5', soft: '#F5F6FB', deep: '#23358F', label: traduire('Effort') },
  repos: { main: '#6E8C3A', soft: '#E8EEDC', deep: '#4F6B28', label: traduire('Repos') },
  prepa: { main: '#C59D45', soft: '#F5ECD6', deep: '#8A6A22', label: traduire('Préparation') },
  final: { main: '#B0282E', soft: '#F6E3E1', deep: '#8C1E23', label: traduire('10 dernières secondes') },
  fini: { main: '#454A58', soft: '#ECEAE4', deep: '#1D2029', label: traduire('Terminé') },
  pret: { main: '#454A58', soft: '#ECEAE4', deep: '#1D2029', label: traduire('Prêt') },
};

/**
 * Les chronos en francais clair. label : le nom, tag : le sigle pour ceux qui le connaissent,
 * sub : une phrase qui dit comment ca marche, short : le nom court (Live Activity, notes).
 */
export const MODES: { id: TimerMode; label: string; short: string; tag?: string; sub: string }[] = [
  { id: 'musculation', label: traduire('Repos entre les séries'), short: traduire('Repos muscu'), tag: traduire('Muscu'), sub: traduire('Tu finis ta série, tu touches : le repos se lance et tes séries sont comptées.') },
  { id: 'combat', label: traduire('Rounds de combat'), short: traduire('Rounds'), tag: traduire('Boxe, MMA, JJB'), sub: traduire('Des rounds et des repos, avec le gong et les claquettes à 10 s de la fin.') },
  { id: 'tabata', label: 'Tabata', short: 'Tabata', tag: '20 s, 10 s', sub: traduire('20 s à fond, 10 s de repos, 8 fois de suite. Court et très intense.') },
  { id: 'emom', label: traduire('Chaque minute'), short: traduire('Chaque minute'), sub: traduire('Au début de chaque minute, tu fais ton exercice. Le reste de la minute, tu souffles.') },
  { id: 'amrap', label: traduire('Un maximum de tours'), short: traduire('Maximum de tours'), sub: traduire('Autant de tours de ton circuit que possible dans le temps donné.') },
  { id: 'fortime', label: traduire('Contre la montre'), short: traduire('Contre la montre'), sub: traduire('Tu finis ton programme le plus vite possible. Le chrono monte.') },
];

export const MUSCU_PRESETS = [
  { seconds: 30, label: '30 s', sub: 'Endurance' },
  { seconds: 60, label: traduire('1 min'), sub: traduire('Volume') },
  { seconds: 90, label: traduire('1 min 30'), sub: traduire('Volume') },
  { seconds: 120, label: traduire('2 min'), sub: 'Force' },
  { seconds: 180, label: traduire('3 min'), sub: 'Lourd' },
  { seconds: 300, label: traduire('5 min'), sub: traduire('Très lourd') },
];

export const COMBAT_PRESETS: Record<CombatPreset, { name: string; roundTime: number; restTime: number; rounds: number; sub: string; sport: string }> = {
  // 15 octobre 2026 (Houari) : par defaut un open mat, 4 rounds de 5 min, 1 min de repos (la montre suit, defaut.jjb)
  jjb: { name: 'JJB', roundTime: 300, restTime: 60, rounds: 4, sub: traduire('Open mat'), sport: 'jjb' },
  mma: { name: 'MMA', roundTime: 300, restTime: 60, rounds: 3, sub: traduire('Format pro'), sport: 'mma' },
  boxe: { name: 'Boxe', roundTime: 180, restTime: 60, rounds: 10, sub: traduire('Format pro'), sport: 'boxe' },
  sac: { name: traduire('Sac de frappe'), roundTime: 180, restTime: 60, rounds: 6, sub: traduire('Rounds au sac'), sport: 'boxe' },
  muaythai: { name: traduire('Muay thaï'), roundTime: 180, restTime: 120, rounds: 5, sub: traduire('Format thaï'), sport: 'muay_thai' },
  kickboxing: { name: 'Kickboxing', roundTime: 180, restTime: 60, rounds: 3, sub: traduire('Format pro'), sport: 'kickboxing' },
  lutte: { name: 'Lutte', roundTime: 180, restTime: 30, rounds: 3, sub: traduire('Wrestling'), sport: 'lutte' },
  grappling: { name: 'Grappling', roundTime: 360, restTime: 60, rounds: 3, sub: traduire('Sans kimono'), sport: 'grappling' },
  custom: { name: 'Perso', roundTime: 180, restTime: 60, rounds: 5, sub: traduire('À ta main'), sport: 'jjb' },
};

export const COMBAT_PRESET_ORDER: CombatPreset[] = ['jjb', 'mma', 'boxe', 'sac', 'muaythai', 'kickboxing', 'lutte', 'grappling', 'custom'];

export const TABATA_PRESETS = [
  { label: traduire('4 min'), rounds: 8, work: 20, rest: 10 },
  { label: traduire('8 min'), rounds: 16, work: 20, rest: 10 },
  { label: traduire('12 min'), rounds: 24, work: 20, rest: 10 },
];

export const EMOM_PRESETS = [10, 15, 20, 30];

/** Durees proposees en minutes : maximum de tours et temps limite contre la montre */
export const AMRAP_PRESETS = [8, 12, 15, 20];
export const FORTIME_PRESETS = [10, 15, 20, 30];

export const COMBAT_SETTINGS_KEY = '@yoroi_timer_combat_settings';

/** Sport propose a l'ecran "seance deja faite" selon le chrono utilise */
export function sportForMode(mode: TimerMode, preset: CombatPreset): string {
  if (mode === 'combat') return COMBAT_PRESETS[preset]?.sport ?? 'jjb';
  if (mode === 'musculation') return 'musculation';
  return 'crossfit';
}

export const SAVE_SPORTS_COMBAT = [
  { id: 'jjb', label: 'JJB' },
  { id: 'grappling', label: 'Grappling' },
  { id: 'mma', label: 'MMA' },
  { id: 'boxe', label: 'Boxe' },
  { id: 'muay_thai', label: traduire('Muay thaï') },
  { id: 'judo', label: 'Judo' },
  { id: 'lutte', label: 'Lutte' },
];

export const RPE_CHOICES = [
  { value: 3, label: traduire('Facile') },
  { value: 5, label: traduire('Correct') },
  { value: 7, label: traduire('Dur') },
  { value: 9, label: traduire('À bloc') },
];

// ─── Sequences de phases pour le moteur de temps ─────────────────────────

import type { ChronoPhase } from './useChronoEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { humanSeconds } from './format';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export const PREPA_SECONDS = 10;
export const CLAP_KEY = '@yoroi_timer_clap10';

/** Claquettes des 10 s : activees par defaut */
export async function loadClapEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CLAP_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export async function saveClapEnabled(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAP_KEY, on ? '1' : '0');
  } catch {
    // reglage non garde, sans gravite
  }
}

const prepa = (seconds: number, cue: ChronoPhase['cue'] = 'beep'): ChronoPhase[] =>
  seconds > 0 ? [{ kind: 'prepa', duration: seconds, title: traduire('Préparation'), short: traduire('Préparation'), cue }] : [];

export function musculationPhases(rest: number, series: number): ChronoPhase[] {
  return [{ kind: 'repos', duration: rest, title: traduire("Repos après la série {0}", series), short: traduire("Série {0}", series + 1), cue: 'beep' }];
}

export function roundPhases(o: { rounds: number; round: number; rest: number; prepa: number; clap: boolean; hold?: boolean }): ChronoPhase[] {
  const list: ChronoPhase[] = prepa(o.prepa, 'beep');
  for (let r = 1; r <= o.rounds; r++) {
    list.push({ kind: 'effort', duration: o.round, title: traduire("Round {0} sur {1}", r, o.rounds), short: traduire("Round {0}", r), cue: 'gong', clap: o.clap, hold: o.hold, step: r, steps: o.rounds });
    if (r < o.rounds && o.rest > 0) list.push({ kind: 'repos', duration: o.rest, title: traduire('Repos'), short: traduire("Repos {0}", humanSeconds(o.rest)), cue: 'gong', step: r, steps: o.rounds });
  }
  return list;
}

export function tabataPhases(o: { rounds: number; work: number; rest: number; sets: number; setRest: number; prepa: number }): ChronoPhase[] {
  const list: ChronoPhase[] = prepa(o.prepa);
  for (let s = 1; s <= o.sets; s++) {
    for (let r = 1; r <= o.rounds; r++) {
      const setTxt = o.sets > 1 ? `, set ${s}` : '';
      list.push({ kind: 'effort', duration: o.work, title: traduire("Effort {0} sur {1}{2}", r, o.rounds, setTxt), short: `Effort ${o.work} s`, cue: 'go', step: r, steps: o.rounds });
      const last = r === o.rounds;
      if (!last) list.push({ kind: 'repos', duration: o.rest, title: traduire("Repos {0} sur {1}{2}", r, o.rounds, setTxt), short: traduire("Repos {0} s", o.rest), cue: 'beep', step: r, steps: o.rounds });
    }
    if (s < o.sets && o.setRest > 0) list.push({ kind: 'repos', duration: o.setRest, title: traduire("Repos avant le set {0}", s + 1), short: traduire("Repos {0}", humanSeconds(o.setRest)), cue: 'beep', step: o.rounds, steps: o.rounds });
  }
  return list;
}

export function emomPhases(o: { minutes: number; exercises: string[]; prepa: number }): ChronoPhase[] {
  const list: ChronoPhase[] = prepa(o.prepa);
  for (let m = 1; m <= o.minutes; m++) {
    const ex = o.exercises.length > 0 ? o.exercises[(m - 1) % o.exercises.length] : undefined;
    list.push({ kind: 'effort', duration: 60, title: traduire("Minute {0} sur {1}", m, o.minutes), short: ex ? traduire("Minute {0}, {1}", m, ex) : traduire("Minute {0}", m), sub: ex, cue: 'go', step: m, steps: o.minutes });
  }
  return list;
}

export function amrapPhases(o: { duration: number; prepa: number }): ChronoPhase[] {
  return [...prepa(o.prepa), { kind: 'effort', duration: o.duration, title: traduire('Enchaîne les tours'), short: traduire('Maximum de tours'), cue: 'go' }];
}

export function forTimePhases(o: { cap: number; prepa: number }): ChronoPhase[] {
  return [...prepa(o.prepa), { kind: 'effort', duration: o.cap, title: traduire('Le plus vite possible'), short: traduire('Contre la montre'), cue: 'go', countUp: true }];
}

/**
 * Rounds reellement faits (18 octobre 2026) : un round compte s'il a tourne au moins la moitie de sa duree
 * (fini normalement, ou passe ou termine apres la moitie). ms : temps passe dans chaque phase, par index.
 */
export function roundsFaits(phases: ChronoPhase[], ms: Map<number, number>): number {
  let n = 0;
  phases.forEach((p, i) => {
    if (p.kind !== 'effort') return;
    const fait = ms.get(i) ?? 0;
    if (fait > 0 && fait >= (p.duration * 1000) / 2) n += 1;
  });
  return n;
}

/** "5 rounds de 5 min, 1 min de repos" */
export function roundsSummary(rounds: number, round: number, rest: number): string {
  const r = traduirePluriel(rounds, rounds > 1, "{0} round de {1}", "{0} rounds de {1}", rounds, humanSeconds(round));
  return rest > 0 && rounds > 1 ? traduire("{0}, {1} de repos", r, humanSeconds(rest)) : r;
}
