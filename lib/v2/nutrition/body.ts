/**
 * Donnees corporelles de l'utilisateur pour pre-remplir les ecrans Nutrition et Soins :
 * dernier poids, taille, age et sexe, lus dans le profil et les pesees.
 */
import { getLatestWeight, getProfile } from '@/lib/database';
import type { Profile } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { ageFromBirth } from './formulas';
import type { Gender } from './formulas';

export type BodyData = {
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: Gender;
  targetWeight: number | null;
  profile: Profile | null;
};

export async function loadBodyData(): Promise<BodyData> {
  try {
    const [profile, latest] = await Promise.all([getProfile(), getLatestWeight()]);
    const w = latest?.weight && latest.weight > 0 ? latest.weight : profile?.start_weight && profile.start_weight > 0 ? profile.start_weight : null;
    return {
      weight: w,
      height: profile?.height_cm && profile.height_cm > 0 ? profile.height_cm : null,
      age: ageFromBirth(profile?.birth_date),
      gender: profile?.avatar_gender === 'femme' ? 'female' : 'male',
      targetWeight: profile?.target_weight && profile.target_weight > 0 ? profile.target_weight : null,
      profile: profile ?? null,
    };
  } catch (err) {
    logger.error('Lecture du profil impossible', err);
    return { weight: null, height: null, age: null, gender: 'male', targetWeight: null, profile: null };
  }
}
