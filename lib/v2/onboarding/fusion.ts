/**
 * Onboarding sur des donnees deja la (18 octobre 2026, INSTALLATION) : reinstallation avec un profil
 * reste dans le trousseau, ou Studio « Simuler une premiere installation » sur tes vraies donnees.
 * Logique pure, testee (__tests__/unit/onboardingInstallation.test.ts).
 *
 *  - brouillonPrerempli : prenom, genre, taille, cap et objectif repris de ce qui existe (jamais d'un autre brouillon) ;
 *  - profilFusionne : ce que tu as repondu remplace, ce que tu as laisse vide garde l'ancienne valeur ;
 *    la date et le poids de depart, la photo, la date de naissance et l'age ne sont jamais remplaces ;
 *  - peseeAConserver : une pesee existe deja aujourd'hui (et ce n'est pas celle de l'onboarding) : rien n'est ecrit.
 */
import type { Draft, Goal, WeighInDone } from './draft';
import { isTrancheAge, trancheDuProfil } from './trancheAge';

type ReglagesExistants = {
  username?: string;
  gender?: string;
  height?: number;
  targetWeight?: number;
  goal?: string;
  /** 26 octobre 2026 : « autre » declare a l'onboarding (gender garde le repere des calculs) */
  genreDeclare?: string | null;
  trancheAge?: string;
} | null | undefined;

export type ProfilExistant = {
  id?: number;
  name: string;
  height_cm?: number;
  target_weight?: number;
  start_weight?: number;
  start_date?: string;
  avatar_gender?: 'homme' | 'femme';
  profile_photo?: string | null;
  birth_date?: string;
  weight_goal?: 'lose' | 'maintain' | 'gain';
  age?: number;
};

const positif = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

function goalDe(v: unknown): Goal | null {
  if (v === 'lose' || v === 'lose_weight') return 'lose';
  if (v === 'gain' || v === 'gain_muscle') return 'gain';
  if (v === 'maintain') return 'maintain';
  return null;
}

/** Ne remplit que les champs vides du brouillon */
export function brouillonPrerempli(d: Draft, src: { settings?: ReglagesExistants; profile?: ProfilExistant | null }): Draft {
  const s = src.settings ?? null;
  const p = src.profile ?? null;
  const nom = (p?.name ?? '').trim() || (s?.username ?? '').trim();
  // le repere des calculs (profil ou trousseau), homme ou femme
  const repere: 'homme' | 'femme' | null = p?.avatar_gender === 'femme' || p?.avatar_gender === 'homme'
    ? p.avatar_gender
    : s?.gender === 'female' ? 'femme' : s?.gender === 'male' ? 'homme' : null;
  // 26 octobre 2026 : « autre » declare reste « autre », son repere est repris
  const autre = s?.genreDeclare === 'autre';
  const genre: Draft['gender'] = autre ? 'autre' : repere;
  // la tranche d'age : deduite de la date de naissance ou de l'age du profil, sinon celle deja declaree
  const trancheDeclaree = s?.trancheAge;
  const tranche = trancheDuProfil(p) ?? (isTrancheAge(trancheDeclaree) ? trancheDeclaree : null);
  const goal = goalDe(p?.weight_goal) ?? goalDe(s?.goal);
  return {
    ...d,
    name: d.name.trim() ? d.name : nom,
    gender: d.gender ?? genre,
    genreRepere: d.genreRepere ?? (d.gender == null && autre ? repere : null),
    trancheAge: d.trancheAge ?? tranche,
    height: d.height ?? positif(p?.height_cm) ?? positif(s?.height),
    target: d.target ?? positif(p?.target_weight) ?? positif(s?.targetWeight),
    ...(d.goals.length || d.goal || !goal ? {} : { goals: [goal], goal }),
  };
}

/** Le profil a enregistrer : tes reponses d'abord, l'existant pour tout le reste */
export function profilFusionne(
  existing: ProfilExistant | null | undefined,
  r: { name: string; gender: 'homme' | 'femme' | null; height: number | null; target: number | null; startWeight?: number; weightGoal?: 'lose' | 'gain' | 'maintain'; today: string },
): ProfilExistant {
  const e = existing ?? null;
  return {
    name: r.name.trim() || e?.name || '',
    height_cm: positif(r.height) ?? e?.height_cm ?? undefined,
    target_weight: positif(r.target) ?? e?.target_weight ?? undefined,
    start_weight: positif(e?.start_weight) ?? positif(r.startWeight) ?? undefined,
    start_date: e?.start_date ?? r.today,
    avatar_gender: r.gender ?? e?.avatar_gender ?? 'homme',
    profile_photo: e?.profile_photo ?? null,
    birth_date: e?.birth_date,
    weight_goal: r.weightGoal ?? e?.weight_goal,
    age: e?.age,
  };
}

/**
 * Vrai : une pesee existe deja ce jour-la et elle n'a pas ete ecrite par cet onboarding : on la garde telle quelle.
 * La pesee de l'onboarding (previous, non conservee) peut etre corrigee : c'est la meme ligne du jour.
 */
export function peseeAConserver(history: { date: string | Date }[], jour: string, previous: WeighInDone | null): boolean {
  const existe = history.some((w) => String(w.date).slice(0, 10) === jour);
  if (!existe) return false;
  return !previous || previous.conservee === true || previous.date !== jour;
}
