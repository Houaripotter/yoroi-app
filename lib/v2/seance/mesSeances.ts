/**
 * Mes séances (25 octobre 2026). Houari : « la bibliothèque des séances que je pourrai enregistrer ».
 * Une séance à toi, avec un nom (« Push lundi », « Jambes »), ses exercices, le nombre de séries et les
 * répétitions visées. Tu la relances en un appui : les charges viennent de ta dernière fois sur chaque
 * exercice, pour progresser. Elle se crée à la fin d'une séance, depuis l'historique, ou à la main.
 * Stockée sur le téléphone (AsyncStorage), reprise par la sauvegarde complète (lib/v2/sauvegarde/fusion.ts).
 * Chaque changement prévient les écrans qui l'affichent (MES_SEANCES_EVENT).
 * Fonctions pures testées dans __tests__/unit/mesSeances.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { Exercise } from '@/lib/database';
import { niceGroup } from './format';
import { normName } from './history';
import { LANG, traduire } from '@/lib/i18n/tr';

const CLE = 'yoroi_mes_seances_v1';
export const MES_SEANCES_EVENT = 'YOROI_MES_SEANCES_CHANGED';
/** au delà, la liste devient illisible : on garde les plus récentes */
export const MAX_SEANCES = 60;
export const MAX_EXOS = 25;
export const MAX_SERIES = 10;

export type ExoSeance = {
  nom: string;
  muscle?: string;
  /** séries de travail visées (sans l'échauffement) */
  series: number;
  /** répétitions visées par série */
  reps: number;
  /** la charge de la séance d'origine, en kilos : seulement si tu n'as jamais fait l'exercice depuis */
  poids: number;
};

export type MaSeance = {
  id: string;
  nom: string;
  sport: string;
  exos: ExoSeance[];
  /** date locale de création, "2026-10-25" */
  creeLe: string;
  /** dernière fois faite, date locale */
  faiteLe?: string;
  fois: number;
};

const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));

function jourLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Les exercices d'une séance enregistrée, ramenés à ce qu'il faut pour la refaire */
export function exosDepuisSeance(exercises: Exercise[] | null | undefined): ExoSeance[] {
  const out: ExoSeance[] = [];
  for (const e of exercises ?? []) {
    if (!e || !e.name || !String(e.name).trim()) continue;
    const series = (e.setsData ?? []).filter((s) => s && (s as { type?: string }).type !== 'warmup');
    let nb: number;
    let reps: number;
    let poids: number;
    if (series.length > 0) {
      nb = series.length;
      // les répétitions les plus fréquentes, la plus haute en cas d'égalité
      const compte = new Map<number, number>();
      for (const s of series) {
        const r = Math.round(Number(s.reps) || 0);
        if (r > 0) compte.set(r, (compte.get(r) ?? 0) + 1);
      }
      reps = [...compte.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? (Number(e.reps) || 10);
      poids = Math.max(0, ...series.map((s) => Number(s.weight) || 0));
    } else {
      nb = Number(e.sets) || 3;
      reps = Number(e.reps) || 10;
      poids = Number(e.weight) || 0;
    }
    out.push({ nom: String(e.name).trim(), ...(e.muscle_group ? { muscle: e.muscle_group } : {}), series: borne(nb, 1, MAX_SERIES), reps: borne(reps, 1, 100), poids: Math.max(0, poids) });
    if (out.length >= MAX_EXOS) break;
  }
  return out;
}

/** Un nom proposé : les deux muscles les plus travaillés (« Pectoraux et triceps »), sinon « Ma séance » */
export function nomParDefaut(exos: ExoSeance[], dejaPris: string[] = []): string {
  const compte = new Map<string, number>();
  for (const e of exos) {
    const m = niceGroup(e.muscle ?? '').trim();
    if (m) compte.set(m, (compte.get(m) ?? 0) + 1);
  }
  const top = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => traduire(m));
  // le second en minuscule (« Pectoraux et triceps »), sauf en allemand où les noms gardent leur majuscule
  const second = top[1] && LANG !== 'de' ? top[1].toLocaleLowerCase() : top[1];
  const base = top.length === 2 ? traduire('{0} et {1}', top[0], second) : top.length === 1 ? top[0] : traduire('Ma séance');
  return nomLibre(base, dejaPris);
}

/** Le nom tel quel s'il est libre, sinon « Nom 2 », « Nom 3 »... */
export function nomLibre(nom: string, dejaPris: string[]): string {
  const pris = new Set(dejaPris.map((n) => n.trim().toLocaleLowerCase()));
  const base = nom.trim() || traduire('Ma séance');
  if (!pris.has(base.toLocaleLowerCase())) return base;
  for (let i = 2; i < 100; i++) {
    const n = `${base} ${i}`;
    if (!pris.has(n.toLocaleLowerCase())) return n;
  }
  return base;
}

/**
 * Mêmes exercices, dans le même ordre. Le nombre de séries ne compte pas : une série sautée un jour de
 * fatigue ne doit pas proposer de changer ta séance (relecture du 25 octobre 2026).
 */
export function memesExos(a: ExoSeance[], b: ExoSeance[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => normName(x.nom) === normName(b[i].nom));
}

/** Ce qui a changé entre ta séance enregistrée et celle que tu viens de faire, pour le dire clairement */
export function differencesExos(avant: ExoSeance[], apres: ExoSeance[]): { ajoutes: string[]; retires: string[] } {
  const a = new Set(avant.map((e) => normName(e.nom)));
  const b = new Set(apres.map((e) => normName(e.nom)));
  return { ajoutes: apres.filter((e) => !a.has(normName(e.nom))).map((e) => e.nom), retires: avant.filter((e) => !b.has(normName(e.nom))).map((e) => e.nom) };
}

/** La mise à jour : les exercices et l'ordre de la séance faite, sans perdre une série sautée ce jour-là */
export function fusionnerExos(avant: ExoSeance[], apres: ExoSeance[]): ExoSeance[] {
  return apres.map((e) => {
    const v = avant.find((x) => normName(x.nom) === normName(e.nom));
    return v ? { ...e, series: Math.max(e.series, v.series), reps: v.reps } : e;
  });
}

/** Une séance déjà enregistrée avec exactement ces exercices */
export function seanceIdentique(liste: MaSeance[], exos: ExoSeance[]): MaSeance | null {
  if (exos.length === 0) return null;
  return liste.find((s) => memesExos(s.exos, exos)) ?? null;
}

/** La dernière faite d'abord, puis les plus récemment créées */
export function trierSeances(liste: MaSeance[]): MaSeance[] {
  return [...liste].sort((a, b) => (b.faiteLe ?? '').localeCompare(a.faiteLe ?? '') || b.creeLe.localeCompare(a.creeLe) || b.id.localeCompare(a.id));
}

export function totalSeries(s: Pick<MaSeance, 'exos'>): number {
  return s.exos.reduce((n, e) => n + e.series, 0);
}

/** Les séries prévues pour relancer un exercice : tes dernières valeurs, sinon celles de la séance */
export function seriesPrevues(e: ExoSeance, dernieres: { weight: number; reps: number }[] | undefined): { weight: number; reps: number }[] {
  return Array.from({ length: borne(e.series, 1, MAX_SERIES) }, (_, i) => {
    const d = dernieres && dernieres.length > 0 ? dernieres[Math.min(i, dernieres.length - 1)] : null;
    return d ? { weight: d.weight, reps: d.reps } : { weight: e.poids, reps: e.reps };
  });
}

function nettoyer(x: unknown): MaSeance | null {
  const s = x as MaSeance;
  if (!s || typeof s.id !== 'string' || typeof s.nom !== 'string' || !Array.isArray(s.exos)) return null;
  const exos = s.exos
    .filter((e) => e && typeof e.nom === 'string' && e.nom.trim())
    .slice(0, MAX_EXOS)
    .map((e) => ({ nom: e.nom, ...(e.muscle ? { muscle: e.muscle } : {}), series: borne(e.series, 1, MAX_SERIES), reps: borne(e.reps, 1, 100), poids: Math.max(0, Number(e.poids) || 0) }));
  return { id: s.id, nom: s.nom.trim() || traduire('Ma séance'), sport: s.sport || 'musculation', exos, creeLe: s.creeLe || jourLocal(), ...(s.faiteLe ? { faiteLe: s.faiteLe } : {}), fois: Math.max(0, Number(s.fois) || 0) };
}

/** Lecture tolérante : une entrée abîmée est écartée, jamais toute la liste */
export function lireListe(raw: string | null): MaSeance[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(nettoyer).filter((s): s is MaSeance => s !== null) : [];
  } catch {
    return [];
  }
}

export async function chargerMesSeances(): Promise<MaSeance[]> {
  try {
    return trierSeances(lireListe(await AsyncStorage.getItem(CLE)));
  } catch {
    return [];
  }
}

async function ecrire(liste: MaSeance[]): Promise<void> {
  await AsyncStorage.setItem(CLE, JSON.stringify(trierSeances(liste).slice(0, MAX_SEANCES)));
  try {
    DeviceEventEmitter.emit(MES_SEANCES_EVENT);
  } catch {
    // rien a faire
  }
}

export async function maSeanceParId(id: string | null | undefined): Promise<MaSeance | null> {
  if (!id) return null;
  return (await chargerMesSeances()).find((s) => s.id === id) ?? null;
}

/** Nouvelle séance ; le nom est rendu unique */
export async function creerMaSeance(nom: string, sport: string, exos: ExoSeance[]): Promise<MaSeance> {
  const liste = await chargerMesSeances();
  const s: MaSeance = {
    id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nom: nomLibre(nom, liste.map((x) => x.nom)),
    sport: sport || 'musculation',
    exos: exos.slice(0, MAX_EXOS),
    creeLe: jourLocal(),
    fois: 0,
  };
  await ecrire([s, ...liste]);
  return s;
}

export async function modifierMaSeance(id: string, patch: Partial<Pick<MaSeance, 'nom' | 'exos' | 'sport'>>): Promise<void> {
  const liste = await chargerMesSeances();
  const autres = liste.filter((s) => s.id !== id).map((s) => s.nom);
  await ecrire(liste.map((s) => (s.id === id ? { ...s, ...patch, ...(patch.nom !== undefined ? { nom: nomLibre(patch.nom, autres) } : {}), ...(patch.exos ? { exos: patch.exos.slice(0, MAX_EXOS) } : {}) } : s)));
}

export async function supprimerMaSeance(id: string): Promise<void> {
  await ecrire((await chargerMesSeances()).filter((s) => s.id !== id));
}

export async function dupliquerMaSeance(id: string): Promise<MaSeance | null> {
  const s = await maSeanceParId(id);
  return s ? creerMaSeance(traduire('{0}, copie', s.nom), s.sport, s.exos) : null;
}

/** Appelé à l'enregistrement d'une séance lancée depuis Mes séances */
export async function marquerFaite(id: string, date?: string): Promise<void> {
  const liste = await chargerMesSeances();
  await ecrire(liste.map((s) => (s.id === id ? { ...s, faiteLe: (date ?? jourLocal()).slice(0, 10), fois: s.fois + 1 } : s)));
}
