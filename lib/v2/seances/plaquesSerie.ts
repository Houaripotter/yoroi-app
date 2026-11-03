/**
 * 3 novembre 2026 (demande de Houari) : la charge notee en plaques de la pile, sans aucun stockage ici.
 * Une serie en plaques garde son nombre dans `plaques` (setsData, colonne exercises en JSON) ; son `weight` reste
 * en kilos : 0 sans poids de plaque donne, sinon plaques x kilos. Les choix par exercice : ./plaques.ts.
 */
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export const PLAQUES_MAX = 40;
export const KG_PAR_PLAQUE_MAX = 50;

/** Mode plaques d'un exercice en seance : le poids d'une plaque, s'il est connu */
export type ModePlaques = { kgParPlaque: number | null };

/** Un nombre entier de plaques entre 0 et 40, ou null (champ vide, valeur folle) */
export function bornePlaques(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 0 && r <= PLAQUES_MAX ? r : null;
}

/** Le poids d'une plaque (au quart de kilo), ou null */
export function borneKgParPlaque(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > KG_PAR_PLAQUE_MAX) return null;
  return Math.round(n * 4) / 4;
}

/** Les kilos d'une serie en plaques : seulement si tu as donne le poids d'une plaque, sinon 0 (jamais invente) */
export function kgDePlaques(plaques: number, kgParPlaque: number | null | undefined): number {
  const k = borneKgParPlaque(kgParPlaque);
  const n = bornePlaques(plaques) ?? 0;
  return k !== null && n > 0 ? Math.round(n * k * 100) / 100 : 0;
}

/** Le nombre de plaques d'une serie, ou null pour une serie en kilos */
export function plaquesDe(s: unknown): number | null {
  if (!s || typeof s !== 'object') return null;
  const p = (s as { plaques?: unknown }).plaques;
  return typeof p === 'number' && Number.isFinite(p) && p >= 0 ? Math.round(p) : null;
}

/** L'exercice enregistre a ete note en plaques (son marqueur, ou une de ses series) */
export function exerciceEnPlaques(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const x = e as { unite_charge?: unknown; setsData?: unknown };
  if (x.unite_charge === 'plaques') return true;
  return Array.isArray(x.setsData) && x.setsData.some((s) => plaquesDe(s) !== null);
}

/** « 7 plaques », « 1 plaque » */
export function libellePlaques(n: number): string {
  return traduirePluriel(n, n > 1, '{0} plaque', '{0} plaques', n);
}

/** « plaque » ou « plaques », sans le nombre (a cote d'un gros chiffre) */
export function motPlaques(n: number): string {
  return traduirePluriel(n, n > 1, 'plaque', 'plaques');
}

/** « 1 plaque = 5 kg » */
export function libelleKgParPlaque(kg: number): string {
  return traduire('1 plaque = {0} kg', String(kg).replace('.', DECIMAL));
}

/** « 7 plaques × 10 » ; sans repetitions, « 7 plaques » */
export function libelleSeriePlaques(plaques: number, reps: number): string {
  return reps > 0 ? `${libellePlaques(plaques)} × ${reps}` : libellePlaques(plaques);
}

/** La serie la plus lourde en plaques (puis le plus de repetitions), series d'echauffement exclues par l'appelant */
export function maxPlaques(sets: unknown[]): { plaques: number; reps: number } | null {
  let best: { plaques: number; reps: number } | null = null;
  for (const s of sets) {
    const p = plaquesDe(s);
    const r = Number((s as { reps?: unknown })?.reps) || 0;
    if (p === null || !(p > 0) || !(r > 0)) continue;
    if (!best || p > best.plaques || (p === best.plaques && r > best.reps)) best = { plaques: p, reps: r };
  }
  return best;
}

/**
 * Record en plaques battu par cette serie : plus de plaques que le record (et que les series deja faites),
 * ou autant de plaques avec plus de repetitions. Sans record avant (premiere fois en plaques), rien.
 */
export function recordPlaquesBattu(record: { plaques: number; reps: number } | null, faites: unknown[], serie: unknown): boolean {
  const p = plaquesDe(serie);
  const r = Number((serie as { reps?: unknown })?.reps) || 0;
  if (!record || p === null || !(p > 0) || !(r > 0)) return false;
  const avant = maxPlaques([{ plaques: record.plaques, reps: record.reps }, ...faites]);
  if (!avant) return false;
  return p > avant.plaques || (p === avant.plaques && r > avant.reps);
}

/** Une serie passe en plaques (nombre repris de la derniere fois, sinon 0) ou revient aux kilos */
export function serieEnMode<S extends { weight: number; plaques?: number; prevWeight?: number; prevPlaques?: number }>(s: S, mode: ModePlaques | null): S {
  if (mode) {
    const n = bornePlaques(s.plaques ?? s.prevPlaques ?? 0) ?? 0;
    return { ...s, plaques: n, weight: kgDePlaques(n, mode.kgParPlaque) };
  }
  const { plaques: _p, ...reste } = s;
  return { ...(reste as S), weight: s.prevPlaques === undefined && s.prevWeight !== undefined ? s.prevWeight : 0 };
}
