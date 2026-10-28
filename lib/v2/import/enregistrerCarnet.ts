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

/**
 * 28 octobre 2026 : deux vraies séances le même jour avec les mêmes exercices (matin et soir) sont toutes les deux
 * importées. Une séance est un doublon si, en plus du jour et des exercices, l'heure ET le détail des séries
 * concordent (une heure ou un détail absent d'un côté ne départage pas). Réimporter le même fichier ne double
 * rien : les clés déjà importées sont retenues, et l'heure et les séries sont les mêmes.
 */
export type Empreinte = { sig: string; heure: string | null; series: string | null };
const heureDe = (h?: string | null): string | null => {
  const m = h ? /^(\d{1,2}):(\d{2})/.exec(h.trim()) : null;
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
};
const seriesDe = (exos: { name: string; setsData?: { weight: number; reps: number }[] }[]): string | null => {
  const parts = exos
    .map((e) => `${e.name.trim().toLowerCase()}:${(e.setsData ?? []).map((x) => `${Number(x.weight) || 0}x${Number(x.reps) || 0}`).join(',')}`)
    .sort();
  return exos.some((e) => (e.setsData ?? []).length > 0) ? parts.join(';') : null;
};
export function empreinteDe(date: string, heure: string | null | undefined, exos: { name: string; setsData?: { weight: number; reps: number }[] }[]): Empreinte {
  return { sig: signature(date, exos.map((e) => e.name)), heure: heureDe(heure), series: seriesDe(exos) };
}
export function memeSeance(a: Empreinte, b: Empreinte): boolean {
  if (a.sig !== b.sig) return false;
  const h = a.heure === null || b.heure === null || a.heure === b.heure;
  const s = a.series === null || b.series === null || a.series === b.series;
  return h && s;
}

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

/**
 * 28 octobre 2026 : un seul import à la fois. Deux appuis rapprochés sur « Importer » lançaient deux imports qui
 * lisaient la base avant que l'autre n'écrive : chaque séance en double. Le second attend le premier, puis ne
 * trouve plus rien de nouveau.
 */
let importEnCours: Promise<BilanImport> | null = null;

export function enregistrerCarnet(seances: SeanceLue[], surProgres?: (fait: number, total: number) => void): Promise<BilanImport> {
  const avant = importEnCours;
  const p = (async () => {
    if (avant) await avant.catch(() => undefined);
    return enregistrerMaintenant(seances, surProgres);
  })();
  importEnCours = p;
  void p.finally(() => {
    if (importEnCours === p) importEnCours = null;
  }).catch(() => undefined);
  return p;
}

async function enregistrerMaintenant(seances: SeanceLue[], surProgres?: (fait: number, total: number) => void): Promise<BilanImport> {
  const cles = await lireCles();
  const existantes = (await getTrainings().catch(() => [] as Training[])) ?? [];
  const deja: Empreinte[] = existantes
    .filter((t) => t.exercises && t.exercises.length)
    .map((t) => empreinteDe(t.date.slice(0, 10), t.start_time, (t.exercises ?? []) as { name: string; setsData?: { weight: number; reps: number }[] }[]));
  const bilan: BilanImport = { ajoutees: 0, dejaLa: 0, echecs: 0 };
  let n = 0;
  for (const s of seances) {
    n++;
    const exercises = s.exos.map(versExercice);
    const emp = empreinteDe(s.date, s.heure, exercises as { name: string; setsData?: { weight: number; reps: number }[] }[]);
    if (cles.has(s.cle) || deja.some((d) => memeSeance(d, emp))) {
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
        exercises,
        notes: s.titre,
        source: 'import',
      } as Training);
      cles.add(s.cle);
      deja.push(emp);
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
