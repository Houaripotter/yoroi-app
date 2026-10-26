/**
 * Tranche d'age (26 octobre 2026, demande de Houari) : ecran facultatif de l'onboarding, juste apres Toi.
 * Seule la tranche est gardee et mesuree (propriete utilisateur tranche_age, utils/telemetry.ts),
 * jamais l'age exact ni la date de naissance. Logique pure, sans dependance.
 */
export type TrancheAge = 'moins_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus';

export const TRANCHES_AGE: readonly TrancheAge[] = ['moins_18', '18_24', '25_34', '35_44', '45_54', '55_plus'];

export function isTrancheAge(v: unknown): v is TrancheAge {
  return typeof v === 'string' && (TRANCHES_AGE as readonly string[]).includes(v);
}

/** Age en annees vers sa tranche ; null si l'age n'est pas plausible */
export function trancheAge(age: number | null | undefined): TrancheAge | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 5 || age > 120) return null;
  if (age < 18) return 'moins_18';
  if (age < 25) return '18_24';
  if (age < 35) return '25_34';
  if (age < 45) return '35_44';
  if (age < 55) return '45_54';
  return '55_plus';
}

/** Age entier a une date (AAAA-MM-JJ), null si la date est illisible */
export function ageDepuisNaissance(naissance: string | null | undefined, aujourdhui: Date = new Date()): number | null {
  if (typeof naissance !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(naissance);
  if (!m) return null;
  const an = Number(m[1]);
  const mois = Number(m[2]);
  const jour = Number(m[3]);
  if (!an || mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  let age = aujourdhui.getFullYear() - an;
  const avant = aujourdhui.getMonth() + 1 < mois || (aujourdhui.getMonth() + 1 === mois && aujourdhui.getDate() < jour);
  if (avant) age -= 1;
  return age;
}

/** Tranche a partir du profil : la date de naissance d'abord, puis l'age saisi */
export function trancheDuProfil(p: { birth_date?: string | null; age?: number | null } | null | undefined, aujourdhui: Date = new Date()): TrancheAge | null {
  if (!p) return null;
  return trancheAge(ageDepuisNaissance(p.birth_date, aujourdhui)) ?? trancheAge(p.age ?? null);
}
