/**
 * 31 octobre 2026 (cartes en 6 modeles) : les visuels du sport lus dans une vraie seance enregistree.
 * Trace GPS, temps au kilometre, denivele, courbe cardiaque, meilleures series, barres des series, techniques, intensite.
 * Rien n'est estime : une donnee absente reste absente et la carte n'affiche pas la ligne.
 * Logique pure, testee dans __tests__/unit/cartesSixModeles.test.ts.
 */
import type { DonneesSeance } from './types';
import { exercisesOf, workSetsOf } from '@/lib/v2/trainingWeek';
import type { ExerciseLike } from '@/lib/v2/trainingWeek';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { parseRounds } from '@/lib/v2/combat/rounds';

/** Ce qu'il faut d'une seance enregistree (sous-ensemble de Training) */
export type SeanceSource = {
  workout_details_json?: string | null;
  exercises?: unknown;
  technical_theme?: string | null;
  intensity?: number | null;
  /** rounds de combat saisis (tableau ou texte JSON) : soumissions placees */
  combat_rounds?: unknown;
};

type Details = {
  routePoints?: { latitude?: number; longitude?: number }[];
  splits?: { distanceKm?: number; durationSeconds?: number; paceSecondsPerKm?: number }[];
  elevationAscended?: number;
  heartRateSamples?: { bpm?: number }[];
};

export type VisuelsSeance = Pick<DonneesSeance, 'trace' | 'splits' | 'deniveleM' | 'repetitions' | 'meilleures' | 'barres' | 'courbeFc' | 'techniques' | 'intensite' | 'soumissions'>;

/** Au moins 10 vrais points GPS sur plus de 30 metres : sinon pas de trace */
export const MIN_POINTS_TRACE = 10;

function lireDetails(json: string | null | undefined): Details | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json) as Details;
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}

/** Garde au plus n valeurs, regulierement espacees (le premier et le dernier point restent) */
export function echantillonner<T>(liste: T[], n: number): T[] {
  if (liste.length <= n) return liste;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(liste[Math.round((i * (liste.length - 1)) / (n - 1))]);
  return out;
}

/**
 * Le parcours ramene entre 0 et 1, a la bonne forme : la longitude est corrigee par le cosinus de la latitude,
 * le nord en haut. null si le GPS n'a pas assez de vrais points.
 */
export function traceDepuisPoints(pts: { latitude?: number; longitude?: number }[] | undefined | null): DonneesSeance['trace'] {
  if (!Array.isArray(pts)) return null;
  const ok = pts.filter((p) => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude!) <= 90 && Math.abs(p.longitude!) <= 180 && !(p.latitude === 0 && p.longitude === 0));
  if (ok.length < MIN_POINTS_TRACE) return null;
  const lat0 = (ok.reduce((a, p) => a + p.latitude!, 0) / ok.length) * (Math.PI / 180);
  const xy = ok.map((p) => [p.longitude! * Math.cos(lat0), -p.latitude!] as [number, number]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  // moins de 30 metres d'etendue (1 degre de latitude = 111 km) : un point fixe, pas un parcours
  if (Math.max(w, h) * 111000 < 30) return null;
  const k = Math.max(w, h);
  const points = echantillonner(xy, 160).map(([x, y]) => [Math.round(((x - minX) / k) * 1000) / 1000, Math.round(((y - minY) / k) * 1000) / 1000] as [number, number]);
  return { points, ratio: h > 0 ? Math.round((w / h) * 1000) / 1000 : 10 };
}

/** Les temps au kilometre : seulement les kilometres complets, avec un temps plausible */
export function splitsDepuisDetails(s: Details['splits']): DonneesSeance['splits'] {
  if (!Array.isArray(s)) return null;
  const out: { km: number; secondes: number }[] = [];
  for (const x of s) {
    const sec = Number(x?.paceSecondsPerKm) || (Number(x?.distanceKm) >= 0.95 ? Number(x?.durationSeconds) : 0);
    if (!(Number(x?.distanceKm) >= 0.95) || !(sec >= 120 && sec <= 20 * 60)) continue;
    out.push({ km: out.length + 1, secondes: Math.round(sec) });
  }
  return out.length >= 2 ? out : null;
}

function nomExercice(e: ExerciseLike): string {
  return sansTiret(String(e.name ?? '').trim());
}

/** La meilleure serie (la plus lourde) de chaque exercice avec charge, les plus lourdes d'abord */
export function meilleuresSeries(exos: ExerciseLike[]): DonneesSeance['meilleures'] {
  const out: { nom: string; poids: number; reps: number }[] = [];
  for (const e of exos) {
    const nom = nomExercice(e);
    if (!nom) continue;
    let best: { poids: number; reps: number } | null = null;
    for (const s of workSetsOf(e)) {
      if (!(s.weight > 0) || !(s.reps > 0)) continue;
      if (!best || s.weight > best.poids || (s.weight === best.poids && s.reps > best.reps)) best = { poids: s.weight, reps: s.reps };
    }
    if (best) out.push({ nom, ...best });
  }
  out.sort((a, b) => b.poids - a.poids);
  return out.length ? out : null;
}

/** Les themes techniques, separes par virgule, point-virgule ou retour a la ligne */
export function techniquesDe(theme: string | null | undefined): string[] | null {
  const l = String(theme ?? '')
    .split(/[,;\n]/)
    .map((x) => sansTiret(x.trim()))
    .filter((x) => x.length > 1);
  return l.length ? Array.from(new Set(l)) : null;
}

export function visuelsDeSeance(t: SeanceSource): VisuelsSeance {
  const det = lireDetails(t.workout_details_json);
  const exos = exercisesOf(t as never);
  const sets = exos.flatMap((e) => workSetsOf(e));
  const reps = sets.reduce((a, s) => a + (s.reps > 0 ? s.reps : 0), 0);
  const barres = sets.map((s) => (s.weight > 0 && s.reps > 0 ? s.weight * s.reps : 0)).filter((x) => x > 0);
  const fc = Array.isArray(det?.heartRateSamples) ? det!.heartRateSamples!.map((x) => Number(x?.bpm) || 0).filter((x) => x >= 30 && x <= 240) : [];
  const den = Number(det?.elevationAscended);
  const int = Number(t.intensity);
  return {
    trace: traceDepuisPoints(det?.routePoints),
    splits: splitsDepuisDetails(det?.splits),
    deniveleM: Number.isFinite(den) && den >= 1 ? Math.round(den) : 0,
    repetitions: reps,
    meilleures: meilleuresSeries(exos),
    barres: barres.length >= 2 ? echantillonner(barres, 24) : null,
    courbeFc: fc.length >= 10 ? echantillonner(fc, 60) : null,
    techniques: techniquesDe(t.technical_theme),
    intensite: Number.isFinite(int) && int >= 1 && int <= 10 ? Math.round(int) : 0,
    soumissions: soumissionsDe(t.combat_rounds),
  };
}

/**
 * 31 octobre 2026 : les soumissions placees dans les rounds saisis (liste des finitions donnees, sinon le nombre saisi).
 * Une victoire aux points ne compte pas : seulement ce qui est saisi comme soumission. 0 sans saisie.
 */
export function soumissionsDe(raw: unknown): number {
  return parseRounds(raw).reduce((n, r) => {
    const liste = Array.isArray(r.methodsGiven) ? r.methodsGiven.filter((x) => typeof x === 'string' && x.trim()) : [];
    if (liste.length) return n + liste.length;
    const k = Number(r.submissionsGiven);
    return n + (Number.isFinite(k) && k > 0 ? Math.round(k) : 0);
  }, 0);
}
