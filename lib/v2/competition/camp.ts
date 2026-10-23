/**
 * Camp de competition : periodisation classique en trois phases (generale, specifique, affutage),
 * reprise de l'ancien ecran, et camp enregistre pour suivre les jours ecoules en plaques.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, isoLocal, parseLocalDate, shortDate, startOfToday } from './dates';
import { traduire } from '@/lib/i18n/tr';

export type PhaseKey = 'generale' | 'specifique' | 'affutage';
export type LoadLevel = 'faible' | 'modere' | 'eleve' | 'max' | 'affutage';

export type CampPhase = {
  key: PhaseKey;
  name: string;
  short: string;
  kanji: string;
  weeks: number;
  focus: string;
  color: string;
  tips: string[];
};

export type CampWeek = {
  weekNumber: number;
  phase: PhaseKey;
  phaseName: string;
  color: string;
  start: Date;
  startLabel: string;
  sessions: number;
  loadPct: number;
  loadLevel: LoadLevel;
};

export const PHASE_COLORS: Record<PhaseKey, string> = {
  generale: '#3D5D9E',
  specifique: '#6E8C3A',
  affutage: '#A8832F',
};

export const LOAD_LABELS: Record<LoadLevel, string> = {
  faible: 'Charge faible',
  modere: traduire('Charge modérée'),
  eleve: traduire('Charge élevée'),
  max: 'Charge max',
  affutage: traduire('Affûtage'),
};

export function generateCamp(totalWeeks: number, currentSessionsPerWeek: number, startDate: Date = startOfToday()): { phases: CampPhase[]; weeks: CampWeek[] } {
  let prepWeeks: number;
  let specWeeks: number;
  let taperingWeeks: number;
  if (totalWeeks <= 4) {
    prepWeeks = 1;
    specWeeks = Math.max(1, totalWeeks - 2);
    taperingWeeks = 1;
  } else if (totalWeeks <= 8) {
    prepWeeks = Math.round(totalWeeks * 0.4);
    taperingWeeks = Math.max(1, Math.round(totalWeeks * 0.15));
    specWeeks = totalWeeks - prepWeeks - taperingWeeks;
  } else {
    prepWeeks = Math.round(totalWeeks * 0.45);
    taperingWeeks = Math.max(2, Math.round(totalWeeks * 0.15));
    specWeeks = totalWeeks - prepWeeks - taperingWeeks;
  }

  const phases: CampPhase[] = [
    {
      key: 'generale',
      name: 'Préparation générale',
      short: traduire('Générale'),
      kanji: '基',
      weeks: prepWeeks,
      focus: traduire('Volume élevé, intensité modérée. Renforcement général, cardio, technique de base.'),
      color: PHASE_COLORS.generale,
      tips: [
        traduire('Augmente le volume progressivement (+10 % par semaine au maximum).'),
        traduire('Travaille les fondamentaux techniques.'),
        traduire('Garde au moins un jour de récupération active.'),
        traduire('Renforcement musculaire général deux fois par semaine.'),
      ],
    },
    {
      key: 'specifique',
      name: 'Préparation spécifique',
      short: traduire('Spécifique'),
      kanji: '戦',
      weeks: specWeeks,
      focus: traduire('Charge maximale, haute intensité. Sparring intense, tactique, situations de compétition.'),
      color: PHASE_COLORS.specifique,
      tips: [
        traduire('Sparring de compétition deux à trois fois par semaine.'),
        traduire('Travaille les points faibles que tu as repérés.'),
        traduire('Simule des combats à la durée réglementaire.'),
        traduire('Nutrition et récupération en priorité.'),
      ],
    },
    {
      key: 'affutage',
      name: traduire('Affûtage'),
      short: traduire('Affûtage'),
      kanji: '刃',
      weeks: taperingWeeks,
      focus: traduire("Réduction du volume, maintien de l'intensité. Fraîcheur physique et mentale."),
      color: PHASE_COLORS.affutage,
      tips: [
        traduire('Réduis le volume de 40 à 60 %.'),
        traduire("Garde l'intensité sur des séances courtes."),
        traduire('Priorité au sommeil, huit heures et plus.'),
        traduire('Dernier sparring intense au plus tard dix jours avant.'),
      ],
    },
  ];

  const weeks: CampWeek[] = [];
  const base = currentSessionsPerWeek || 4;
  let weekIndex = 0;
  for (const phase of phases) {
    for (let w = 0; w < phase.weeks; w++) {
      weekIndex++;
      const start = addDays(startDate, (weekIndex - 1) * 7);
      const prog = w / Math.max(1, phase.weeks - 1);
      let loadPct: number;
      if (phase.key === 'generale') loadPct = 55 + prog * 20;
      else if (phase.key === 'specifique') {
        loadPct = 80 + prog * 15;
        if (w > 0 && (w + 1) % 3 === 0) loadPct = 65; // semaine de decharge
      } else loadPct = 45 - prog * 10;
      const sessions = phase.key === 'affutage' ? Math.max(2, Math.round(base * 0.6)) : phase.key === 'specifique' ? Math.min(7, base + 1) : base;
      let loadLevel: LoadLevel;
      if (loadPct >= 85) loadLevel = 'max';
      else if (loadPct >= 70) loadLevel = 'eleve';
      else if (loadPct >= 50) loadLevel = 'modere';
      else if (phase.key === 'affutage') loadLevel = 'affutage';
      else loadLevel = 'faible';
      weeks.push({ weekNumber: weekIndex, phase: phase.key, phaseName: phase.name, color: phase.color, start, startLabel: shortDate(start), sessions, loadPct, loadLevel });
    }
  }
  return { phases, weeks };
}

/** Jours d'entrainement places dans la semaine : repartis pour laisser du repos */
export function trainingDaysOf(sessions: number): boolean[] {
  const patterns: Record<number, number[]> = {
    1: [2],
    2: [1, 4],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  const on = patterns[Math.max(1, Math.min(7, sessions))];
  return Array.from({ length: 7 }, (_, i) => on.includes(i));
}

const CAMP_KEY = '@yoroi_v2_competition_camp';

export type SavedCamp = { start: string; weeks: number; sessions: number; competitionId?: number | null };

export async function loadCamp(): Promise<SavedCamp | null> {
  try {
    const raw = await AsyncStorage.getItem(CAMP_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.start !== 'string') return null;
    return p as SavedCamp;
  } catch {
    return null;
  }
}

export async function saveCamp(camp: SavedCamp | null): Promise<void> {
  try {
    if (camp) await AsyncStorage.setItem(CAMP_KEY, JSON.stringify(camp));
    else await AsyncStorage.removeItem(CAMP_KEY);
  } catch {
    // stockage indisponible : le camp reste affiche pour cette visite
  }
}

export function campStart(c: SavedCamp): Date {
  return parseLocalDate(c.start);
}

export function todayIso(): string {
  return isoLocal(startOfToday());
}
