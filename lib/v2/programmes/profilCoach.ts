/**
 * Ce que l'onboarding sait déjà, repris par le départ avec ton coach (26 octobre 2026).
 * Houari : « Prends en compte ce qu'on demande pour les programmes, ne pose pas deux fois la même question. »
 * L'onboarding enregistre tes objectifs, tes sports et tes jours dans ton espace (lib/v2/onboarding/save.ts :
 * objectifs, sportsFavoris, joursSemaine). Le départ du coach (app/coach-depart.tsx) les lit ici :
 *  - tes objectifs de l'onboarding préremplissent « Ton objectif ? » (perdre du poids, prendre du muscle, combat) ;
 *  - tes jours d'entraînement deviennent tes jours disponibles ;
 *  - tes sports répondent à « Tu pratiques aussi un sport ? » (combat, football, course, un autre, ou non).
 * Juste après l'onboarding, les questions déjà répondues (jours, sport) sont sautées ; ailleurs elles restent,
 * préremplies. Fonctions pures, testées dans __tests__/unit/profilCoach.test.ts.
 */
import { getSportCategory } from '@/lib/sports';
import type { ObjectifChoix } from './choix';
import type { AutreSport } from './depart';

/** Objectifs de l'onboarding (lib/v2/onboarding/objectifs.ts) */
export type ObjectifOnboarding = 'lose' | 'gain' | 'combat' | 'maintain';

export type ProfilCoach = {
  objectifs: ObjectifChoix[];
  /** 0 = lundi ; vide : pas encore choisis */
  jours: number[];
  /** null : aucun sport connu, la question reste */
  sport: AutreSport | null;
};

export const PROFIL_VIDE: ProfilCoach = { objectifs: [], jours: [], sport: null };

const VERS_COACH: Record<ObjectifOnboarding, ObjectifChoix | null> = {
  lose: 'perte',
  gain: 'muscle',
  combat: 'combat',
  // se maintenir : aucun objectif de programme précis, le coach garde « forme » par défaut
  maintain: null,
};

/** Objectifs de l'onboarding vers ceux du coach, sans doublon */
export function objectifsDuProfil(goals: readonly string[] | null | undefined): ObjectifChoix[] {
  const out: ObjectifChoix[] = [];
  for (const g of goals ?? []) {
    const o = VERS_COACH[g as ObjectifOnboarding];
    if (o && !out.includes(o)) out.push(o);
  }
  return out;
}

const FOOT = ['football', 'futsal'];
const COURSE = ['running', 'marathon', 'trail', 'triathlon', 'obstacle'];
/** Sports qui ne comptent pas comme « un autre sport » : c'est déjà ce que le programme fait travailler */
const DEJA_PROGRAMME = ['musculation', 'powerlifting', 'halterophilie', 'street_workout', 'calisthenics', 'fitness'];

/**
 * Tes sports de l'onboarding vers la question « Tu pratiques aussi un sport ? ».
 * Le combat passe d'abord (il change le programme), puis le football, la course, un autre sport.
 * Seulement de la muscu : « Non ». Aucun sport : null (la question reste posée).
 */
export function sportDuProfil(sports: readonly string[] | null | undefined): AutreSport | null {
  const l = (sports ?? []).filter((s) => typeof s === 'string' && s.length > 0);
  if (!l.length) return null;
  if (l.some((s) => {
    const cat = getSportCategory(s);
    return cat === 'combat_striking' || cat === 'combat_grappling';
  })) return 'combat';
  if (l.some((s) => FOOT.includes(s))) return 'foot';
  if (l.some((s) => COURSE.includes(s))) return 'course';
  if (l.some((s) => !DEJA_PROGRAMME.includes(s))) return 'autre';
  return 'non';
}

/** Jours valides (0 à 6), triés, sans doublon */
export function joursDuProfil(jours: readonly unknown[] | null | undefined): number[] {
  const out = new Set<number>();
  for (const j of jours ?? []) if (typeof j === 'number' && Number.isInteger(j) && j >= 0 && j <= 6) out.add(j);
  return [...out].sort((a, b) => a - b);
}

export function profilCoachDe(e: { objectifs?: readonly string[] | null; sportsFavoris?: readonly string[] | null; joursSemaine?: readonly unknown[] | null } | null | undefined): ProfilCoach {
  if (!e) return PROFIL_VIDE;
  return { objectifs: objectifsDuProfil(e.objectifs), jours: joursDuProfil(e.joursSemaine), sport: sportDuProfil(e.sportsFavoris) };
}

/** Les étapes du coach déjà répondues par l'onboarding, à sauter juste après lui */
export function etapesConnues(p: ProfilCoach): { jours: boolean; sport: boolean } {
  return { jours: p.jours.length > 0, sport: p.sport != null };
}

/** Lit ton espace (jamais d'erreur : profil vide) */
export async function lireProfilCoach(): Promise<ProfilCoach> {
  try {
    const { getEspace } = await import('@/lib/v2/espace');
    return profilCoachDe(await getEspace());
  } catch {
    return PROFIL_VIDE;
  }
}
