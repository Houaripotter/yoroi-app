/**
 * Enregistrement d'une seance : meme format que l'ancienne saisie (exercices avec setsData,
 * rounds de combat en vrai tableau), modification d'une seance existante, validation du creneau
 * du planning sur la bonne semaine, puis les services de l'app (Sante, widget, surmenage, avis).
 */
import { familleDeSport, track, trancheUsage, type MethodeSeance } from '@/utils/telemetry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { addTraining, getTrainingById, openDatabase, updateTraining, validateSlot } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getSportName } from '@/lib/sports';
import { ARMURE_CHANGED_EVENT, getArmureState } from '@/lib/v2/armure';
import type { ArmureState } from '@/lib/v2/armure';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { isoDay } from './format';
import { normalizeRounds, weekStartOf } from './params';
import { setsCount, tonnage } from '@/lib/v2/trainingWeek';

export type SeanceRecord = { name: string; weight: number; reps: number; kind: 'charge' | 'max' };

export type SeanceResult = {
  id: number;
  sport: string;
  title: string;
  durationMin: number;
  sets: number;
  tonnage: number;
  rounds: number;
  distance: number;
  records: SeanceRecord[];
  before: ArmureState | null;
  after: ArmureState | null;
  /** la seance venait d'un creneau du planning */
  fromSlot?: boolean;
};

const RESULT_KEY = 'yoroi_seance_fin_v1';
let lastResult: SeanceResult | null = null;

/** Lundi de la semaine en cours, en date locale (jamais UTC) */
export function slotWeekStart(): string {
  return weekStartOf(isoDay(new Date()));
}

export type SaveOptions = {
  slotId?: number;
  title: string;
  records?: SeanceRecord[];
  /** colonnes que addTraining et updateTraining n'ecrivent pas : ecrites juste apres */
  technicalTheme?: string;
  sessionTypes?: string[];
  /** modification d'une seance existante : on garde son id */
  editId?: number;
  /** seance deja ecrite dans Apple Sante (par l'Apple Watch) : pas de recopie */
  skipHealth?: boolean;
  /** mesure : comment la seance a ete saisie (jamais sa duree ni sa charge) */
  methode?: MethodeSeance;
};

const JOINED = ['club_name', 'club_logo', 'club_color', 'duration'] as const;

async function writeExtraColumns(id: number, opts: SaveOptions, isEdit: boolean): Promise<void> {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (opts.technicalTheme !== undefined && (isEdit || opts.technicalTheme)) {
    sets.push('technical_theme = ?');
    values.push(opts.technicalTheme.trim() || null);
  }
  if (opts.sessionTypes && (isEdit || opts.sessionTypes.length > 0)) {
    sets.push('session_types = ?');
    values.push(opts.sessionTypes.length > 0 ? JSON.stringify(opts.sessionTypes) : null);
  }
  if (sets.length === 0) return;
  try {
    const db = await openDatabase();
    await db.runAsync(`UPDATE trainings SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
  } catch (err) {
    logger.warn('Colonnes complementaires non enregistrees', err);
  }
}

export async function saveSeance(training: Training, opts: SaveOptions): Promise<SeanceResult> {
  let before: ArmureState | null = null;
  try {
    before = await getArmureState();
  } catch (err) {
    logger.warn('Armure avant la seance indisponible', err);
  }

  let id: number;
  const isEdit = !!opts.editId;
  if (opts.editId) {
    // updateTraining reecrit toutes les colonnes : on part de la seance existante
    const existing = await getTrainingById(opts.editId);
    if (!existing) throw new Error('Seance introuvable');
    const merged: Training & Record<string, unknown> = {
      ...existing,
      combat_rounds: normalizeRounds(existing.combat_rounds),
      ...training,
      source: existing.source ?? training.source,
    };
    for (const k of JOINED) delete merged[k];
    await updateTraining(opts.editId, merged);
    id = opts.editId;
  } else {
    id = Number(await addTraining({ ...training, weekly_plan_id: opts.slotId ?? training.weekly_plan_id }));
  }

  await writeExtraColumns(id, opts, isEdit);

  if (opts.slotId && !isEdit) {
    try {
      // la semaine du jour de la seance, pas forcement la semaine en cours
      await validateSlot(opts.slotId, weekStartOf(training.date.slice(0, 10)), id);
    } catch (err) {
      logger.warn('Validation du creneau impossible', err);
    }
  }

  let after: ArmureState | null = null;
  try {
    after = await getArmureState();
  } catch (err) {
    logger.warn('Armure apres la seance indisponible', err);
  }

  const result: SeanceResult = {
    id,
    sport: training.sport,
    title: opts.title,
    durationMin: training.duration_minutes ?? 0,
    // regle unique des series et du tonnage (lib/v2/trainingWeek)
    sets: setsCount(training),
    tonnage: tonnage(training),
    rounds: training.rounds ?? training.combat_rounds?.length ?? 0,
    distance: training.distance ?? 0,
    records: opts.records ?? [],
    before,
    after,
    fromSlot: !!opts.slotId,
  };

  lastResult = result;
  try {
    await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    // le resultat reste en memoire
  }

  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  DeviceEventEmitter.emit(ARMURE_CHANGED_EVENT, after);
  if (!isEdit) {
    runAfterSave(training, opts.skipHealth === true);
    void mesurerSeance(training.sport, opts.methode ?? 'saisie');
  }
  return result;
}

/** Mesure : le fait d'une seance, sa famille de sport, comment elle a ete saisie, une tranche du nombre total */
async function mesurerSeance(sport: string, methode: MethodeSeance): Promise<void> {
  let total = 1;
  try {
    const db = await openDatabase();
    const row = (await db.getFirstAsync('SELECT COUNT(*) AS n FROM trainings')) as { n?: number } | null;
    total = Number(row?.n ?? 1) || 1;
  } catch {
    // tranche minimale
  }
  track('seance_enregistree', { famille: familleDeSport(sport), methode, tranche_seances: trancheUsage(total) });
}

/** Services de l'app apres une nouvelle seance : rien ne bloque l'enregistrement */
function runAfterSave(t: Training, skipHealth = false): void {
  import('@/lib/trainingLoadService').then(({ checkOvertrainingAlert }) => checkOvertrainingAlert()).catch(() => {});
  // Compteur de séances pour la demande d'avis (service unique : lib/reviewPromptService.ts)
  import('@/lib/reviewPromptService').then(({ compterSeanceAvis }) => compterSeanceAvis()).catch(() => {});
  import('@/lib/widgetData')
    .then(async ({ updateWidgetStreak }) => {
      const { calculateStreak } = await import('@/lib/database');
      const streak = await calculateStreak();
      const rank = await AsyncStorage.getItem('@yoroi_rank');
      await updateWidgetStreak(streak, rank ?? 'Recrue');
    })
    .catch(() => {});
  // Export vers Sante (Apple Sante ou Health Connect), si l'app y a acces
  if (skipHealth) return;
  import('@/lib/healthConnect')
    .then(async ({ default: health }) => {
      const [h, m] = (t.start_time ?? '12:00').split(':').map(Number);
      const start = new Date(t.date.slice(0, 10) + 'T12:00:00');
      start.setHours(h || 0, m || 0, 0, 0);
      const end = new Date(start.getTime() + (t.duration_minutes || 60) * 60000);
      await health.writeWorkout({ activityType: getSportName(t.sport), startDate: start, endDate: end, distance: t.distance, calories: t.calories });
    })
    .catch((err) => logger.warn('Export Sante non fait (non bloquant)', err));
}

export async function getSeanceResult(id: number): Promise<SeanceResult | null> {
  if (lastResult && lastResult.id === id) return lastResult;
  try {
    const raw = await AsyncStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as SeanceResult;
    return r.id === id ? r : null;
  } catch {
    return null;
  }
}
