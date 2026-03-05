import { getActiveInjuries, getWeeklyPlan, cancelSlot, Injury, WeeklyPlan } from '@/lib/database';

// Mapping zones corporelles -> sports impactes
const ZONE_SPORT_IMPACT: Record<string, string[]> = {
  // Genoux
  'knee_l': ['running', 'jjb', 'football', 'basketball', 'rugby', 'handball', 'volleyball', 'ski', 'padel', 'tennis', 'squash', 'randonnee', 'trail', 'crossfit'],
  'knee_r': ['running', 'jjb', 'football', 'basketball', 'rugby', 'handball', 'volleyball', 'ski', 'padel', 'tennis', 'squash', 'randonnee', 'trail', 'crossfit'],
  // Epaules
  'shoulder_l': ['musculation', 'natation', 'boxing', 'mma', 'judo', 'lutte', 'crossfit', 'tennis', 'handball', 'volleyball', 'escalade'],
  'shoulder_r': ['musculation', 'natation', 'boxing', 'mma', 'judo', 'lutte', 'crossfit', 'tennis', 'handball', 'volleyball', 'escalade'],
  // Dos
  'back_upper': ['musculation', 'jjb', 'judo', 'lutte', 'aviron', 'crossfit', 'escalade'],
  'back_lower': ['musculation', 'jjb', 'running', 'judo', 'lutte', 'crossfit', 'aviron', 'randonnee', 'trail'],
  // Poignets
  'wrist_l': ['musculation', 'jjb', 'boxing', 'mma', 'crossfit', 'tennis', 'padel', 'escalade', 'gymnastique'],
  'wrist_r': ['musculation', 'jjb', 'boxing', 'mma', 'crossfit', 'tennis', 'padel', 'escalade', 'gymnastique'],
  // Chevilles
  'ankle_l': ['running', 'football', 'basketball', 'trail', 'randonnee', 'tennis', 'padel', 'volleyball', 'danse'],
  'ankle_r': ['running', 'football', 'basketball', 'trail', 'randonnee', 'tennis', 'padel', 'volleyball', 'danse'],
  // Hanches
  'hip_l': ['running', 'jjb', 'football', 'danse', 'trail', 'musculation', 'karate', 'taekwondo'],
  'hip_r': ['running', 'jjb', 'football', 'danse', 'trail', 'musculation', 'karate', 'taekwondo'],
  // Coudes
  'elbow_l': ['tennis', 'padel', 'musculation', 'boxing', 'mma', 'jjb', 'escalade'],
  'elbow_r': ['tennis', 'padel', 'musculation', 'boxing', 'mma', 'jjb', 'escalade'],
  // Cou
  'neck': ['jjb', 'judo', 'lutte', 'boxing', 'mma', 'musculation', 'natation'],
  // Tibias
  'shin_l': ['running', 'muay_thai', 'kickboxing', 'football', 'trail'],
  'shin_r': ['running', 'muay_thai', 'kickboxing', 'football', 'trail'],
  // Cuisses
  'thigh_l': ['running', 'football', 'cyclisme', 'musculation', 'sprint', 'jjb'],
  'thigh_r': ['running', 'football', 'cyclisme', 'musculation', 'sprint', 'jjb'],
  // Mollets
  'calf_l': ['running', 'trail', 'football', 'danse', 'basketball'],
  'calf_r': ['running', 'trail', 'football', 'danse', 'basketball'],
  // Pieds
  'foot_l': ['running', 'trail', 'danse', 'football', 'karate', 'taekwondo'],
  'foot_r': ['running', 'trail', 'danse', 'football', 'karate', 'taekwondo'],
  // Mains
  'hand_l': ['boxing', 'mma', 'jjb', 'escalade', 'musculation'],
  'hand_r': ['boxing', 'mma', 'jjb', 'escalade', 'musculation'],
  // Abdominaux
  'abs': ['musculation', 'crossfit', 'jjb', 'boxing', 'mma'],
  // Pectoraux
  'chest': ['musculation', 'natation', 'crossfit', 'boxing'],
};

export interface InjurySlotImpact {
  injury: Injury;
  affectedSlots: WeeklyPlan[];
  recommendation: 'rest' | 'adapted';
}

/**
 * Verifie quels creneaux sont impactes par les blessures actives
 */
export const checkInjuryImpactOnSlots = async (): Promise<InjurySlotImpact[]> => {
  const [injuries, slots] = await Promise.all([
    getActiveInjuries(),
    getWeeklyPlan(),
  ]);

  const impacts: InjurySlotImpact[] = [];

  for (const injury of injuries) {
    if (injury.fit_for_duty === 'operational') continue;

    const impactedSports = ZONE_SPORT_IMPACT[injury.zone_id] || [];
    const affectedSlots = slots.filter(slot =>
      !slot.is_rest_day && impactedSports.includes(slot.sport)
    );

    if (affectedSlots.length > 0) {
      impacts.push({
        injury,
        affectedSlots,
        recommendation: injury.fit_for_duty === 'unfit' ? 'rest' : 'adapted',
      });
    }
  }

  return impacts;
};

/**
 * Annule tous les creneaux impactes par une blessure pour la semaine courante
 */
export const cancelSlotsForInjury = async (injury: Injury): Promise<number> => {
  const slots = await getWeeklyPlan();
  const impactedSports = ZONE_SPORT_IMPACT[injury.zone_id] || [];
  const affectedSlots = slots.filter(s =>
    !s.is_rest_day && impactedSports.includes(s.sport)
  );

  // Calculer le lundi de la semaine courante
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const weekStart = monday.toISOString().split('T')[0];

  let count = 0;
  for (const slot of affectedSlots) {
    if (slot.id) {
      await cancelSlot(
        slot.id,
        weekStart,
        `Blessure: ${injury.zone_id} (EVA ${injury.eva_score}/10)`,
        injury.id
      );
      count++;
    }
  }

  return count;
};

/**
 * Verifie si un sport specifique est impacte par une blessure
 */
export const isSportImpactedByInjury = (sport: string, injury: Injury): boolean => {
  const impactedSports = ZONE_SPORT_IMPACT[injury.zone_id] || [];
  return impactedSports.includes(sport);
};

/**
 * Recupere toutes les zones qui impactent un sport donne
 */
export const getImpactedZonesForSport = (sport: string): string[] => {
  return Object.entries(ZONE_SPORT_IMPACT)
    .filter(([_, sports]) => sports.includes(sport))
    .map(([zone]) => zone);
};

export { ZONE_SPORT_IMPACT };
