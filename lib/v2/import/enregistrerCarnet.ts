/**
 * Enregistrer un carnet importe (notes du telephone ou Hevy, lib/v2/import/carnet.ts).
 * - une seance de musculation par seance lue, avec ses series detaillees ;
 * - jamais deux fois la meme : les cles deja importees sont retenues, et une seance importee le meme jour
 *   avec les memes exercices est reconnue ;
 * - pas de gain d'armure ni de record « en direct » : ce sont des seances passees (addTraining direct).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { addTraining, getTrainings } from '@/lib/database';
import type { Exercise, Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import type { SeanceLue } from './carnet';

const CLE_IMPORTS = 'yoroi_import_carnet_cles_v1';

async function lireCles(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(CLE_IMPORTS);
    const l = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

const signature = (date: string, noms: string[]): string => `${date}|${noms.map((n) => n.trim().toLowerCase()).sort().join(',')}`;

/** Exercice YOROI : meilleure serie en resume, toutes les series en detail */
export function versExercice(e: SeanceLue['exos'][number]): Exercise {
  const travail = e.series.filter((s) => s.type !== 'warmup');
  const base = travail.length ? travail : e.series;
  const meilleure = [...base].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
  return {
    name: e.nom,
    sets: e.series.length,
    reps: meilleure?.reps ?? 0,
    weight: meilleure?.weight ?? 0,
    setsData: e.series.map((s) => (s.type ? { weight: s.weight, reps: s.reps, type: s.type } : { weight: s.weight, reps: s.reps })),
    ...(e.notes ? { notes: e.notes } : {}),
  };
}

/** Duree estimee quand le carnet ne la donne pas : 3 minutes par serie, entre 20 et 120 minutes */
export const dureeEstimee = (s: SeanceLue): number =>
  s.duree ?? Math.max(20, Math.min(120, Math.round(s.exos.reduce((n, e) => n + e.series.length, 0) * 3)));

export type BilanImport = { ajoutees: number; dejaLa: number; echecs: number };

export async function enregistrerCarnet(seances: SeanceLue[], surProgres?: (fait: number, total: number) => void): Promise<BilanImport> {
  const cles = await lireCles();
  const existantes = (await getTrainings().catch(() => [] as Training[])) ?? [];
  const deja = new Set(
    existantes
      .filter((t) => t.exercises && t.exercises.length)
      .map((t) => signature(t.date.slice(0, 10), (t.exercises ?? []).map((e) => e.name))),
  );
  const bilan: BilanImport = { ajoutees: 0, dejaLa: 0, echecs: 0 };
  let n = 0;
  for (const s of seances) {
    n++;
    const sig = signature(s.date, s.exos.map((e) => e.nom));
    if (cles.has(s.cle) || deja.has(sig)) {
      bilan.dejaLa++;
      surProgres?.(n, seances.length);
      continue;
    }
    try {
      await addTraining({
        sport: 'musculation',
        date: s.date,
        start_time: s.heure,
        duration_minutes: dureeEstimee(s),
        exercises: s.exos.map(versExercice),
        notes: s.titre,
        source: 'import',
      } as Training);
      cles.add(s.cle);
      deja.add(sig);
      bilan.ajoutees++;
    } catch (e) {
      logger.warn('[ImportCarnet] seance non enregistree', e);
      bilan.echecs++;
    }
    surProgres?.(n, seances.length);
  }
  try {
    await AsyncStorage.setItem(CLE_IMPORTS, JSON.stringify([...cles]));
  } catch {
    // les signatures du carnet evitent quand meme les doublons
  }
  if (bilan.ajoutees > 0) DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
  return bilan;
}
