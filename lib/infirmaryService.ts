// ============================================
// YOROI MEDIC - SERVICE SUIVI BLESSURES
// ============================================
// Business logic pour la gestion des blessures

import {
  Injury,
  InjuryTreatment,
  getInjuries,
  getActiveInjuries,
  addInjury,
  updateInjury,
  addEvaHistory,
  addTreatment,
  getTreatments,
  addReminder,
  getReminders,
  updateReminder,
} from './database';
import {
  getZoneById,
  FitForDutyStatus,
  FIT_FOR_DUTY_STATUS,
  PAIN_TYPES,
  INJURY_CAUSES,
  TREATMENT_TYPES,
} from '@/constants/bodyZones';
import { INITIAL_DATA } from '@/components/BodyMap';

// ============================================
// CALCUL DU STATUT FIT FOR DUTY
// ============================================

/**
 * Calcule le statut opérationnel global en fonction des blessures actives
 *
 * Règles :
 * - UNFIT : Au moins une blessure avec EVA >= 7
 * - RESTRICTED : Au moins une blessure avec EVA 4-6
 * - OPERATIONAL : Toutes les blessures avec EVA < 4 ou aucune blessure
 */
export const calculateFitForDuty = async (): Promise<FitForDutyStatus> => {
  const activeInjuries = await getActiveInjuries();

  if (activeInjuries.length === 0) {
    return 'operational';
  }

  // Vérifier s'il y a des blessures sévères (EVA >= 7)
  const hasSevereInjury = activeInjuries.some(injury => injury.eva_score >= 7);
  if (hasSevereInjury) {
    return 'unfit';
  }

  // Vérifier s'il y a des blessures modérées (EVA 4-6)
  const hasModerateInjury = activeInjuries.some(
    injury => injury.eva_score >= 4 && injury.eva_score < 7
  );
  if (hasModerateInjury) {
    return 'restricted';
  }

  // Toutes les blessures sont mineures (EVA < 4)
  return 'operational';
};

/**
 * Retourne les informations du statut FIT FOR DUTY
 */
export const getFitForDutyInfo = async () => {
  const status = await calculateFitForDuty();
  return FIT_FOR_DUTY_STATUS[status];
};

// ============================================
// GESTION DES BLESSURES
// ============================================

/**
 * Crée une nouvelle blessure
 */
export const createInjury = async (data: {
  zone_id: string;
  zone_view: 'front' | 'back';
  pain_type: string;
  cause: string;
  eva_score: number;
  notes?: string;
  estimated_recovery_days?: number;
}): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];

  // Calculer le statut FIT FOR DUTY en fonction de l'EVA
  let fitForDuty: FitForDutyStatus = 'operational';
  if (data.eva_score >= 7) {
    fitForDuty = 'unfit';
  } else if (data.eva_score >= 4) {
    fitForDuty = 'restricted';
  }

  const injury: Injury = {
    ...data,
    date: today,
    status: 'active',
    fit_for_duty: fitForDuty,
  };

  const injuryId = await addInjury(injury);

  // Ajouter l'entrée initiale dans l'historique EVA
  await addEvaHistory({
    injury_id: injuryId,
    eva_score: data.eva_score,
    date: today,
    notes: 'Évaluation initiale',
  });

  return injuryId;
};

/**
 * Met à jour le score EVA d'une blessure
 */
export const updateInjuryEva = async (
  injuryId: number,
  evaScore: number,
  notes?: string
): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];

  // Ajouter dans l'historique
  await addEvaHistory({
    injury_id: injuryId,
    eva_score: evaScore,
    date: today,
    notes,
  });

  // Mettre à jour le statut de la blessure
  let status: 'active' | 'healing' | 'healed' = 'active';
  let fitForDuty: FitForDutyStatus = 'operational';

  if (evaScore === 0) {
    status = 'healed';
    fitForDuty = 'operational';
  } else if (evaScore <= 3) {
    status = 'healing';
    fitForDuty = 'operational';
  } else if (evaScore >= 7) {
    status = 'active';
    fitForDuty = 'unfit';
  } else {
    status = 'active';
    fitForDuty = 'restricted';
  }

  await updateInjury(injuryId, {
    eva_score: evaScore,
    status,
    fit_for_duty: fitForDuty,
    healed_at: status === 'healed' ? today : undefined,
  });
};

/**
 * Marque une blessure comme guérie
 */
export const markInjuryAsHealed = async (injuryId: number): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];

  await updateInjury(injuryId, {
    status: 'healed',
    fit_for_duty: 'operational',
    eva_score: 0,
    healed_at: today,
  });

  // Ajouter une entrée EVA à 0
  await addEvaHistory({
    injury_id: injuryId,
    eva_score: 0,
    date: today,
    notes: 'Blessure guérie',
  });
};

/**
 * Récupère les blessures avec les noms de zone
 */
export const getInjuriesWithZoneNames = async (
  status?: 'active' | 'healing' | 'healed'
): Promise<Injury[]> => {
  const injuries = await getInjuries(status);

  return injuries.map(injury => ({
    ...injury,
    zone_name: getZoneDisplayName(injury.zone_id, injury.zone_view),
  }));
};

// ============================================
// DÉTECTION PROTOCOLE RICE
// ============================================

/**
 * Vérifie si le protocole RICE doit être recommandé
 * Critère : EVA >= 7 (douleur sévère)
 */
export const shouldRecommendRICE = (evaScore: number): boolean => {
  return evaScore >= 7;
};

/**
 * Retourne les étapes du protocole RICE
 */
export const getRICEProtocol = () => {
  return [
    {
      letter: 'R',
      title: 'Repos',
      description: 'Arrêter l\'activité immédiatement',
      duration: '48-72h minimum',
      icon: '🛌',
    },
    {
      letter: 'I',
      title: 'Ice (Glace)',
      description: 'Appliquer de la glace',
      duration: '15-20 min toutes les 2-3h',
      icon: '🧊',
    },
    {
      letter: 'C',
      title: 'Compression',
      description: 'Bander la zone affectée',
      duration: 'Pendant 48-72h',
      icon: '🩹',
    },
    {
      letter: 'E',
      title: 'Élévation',
      description: 'Surélever la zone blessée',
      duration: 'Le plus souvent possible',
      icon: '⬆️',
    },
  ];
};

// ============================================
// DÉTECTION DE RÉCURRENCE
// ============================================

/**
 * Vérifie si une zone a été blessée plusieurs fois récemment
 * Critère : 2+ blessures sur la même zone dans les 30 derniers jours
 */
export const checkZoneRecurrence = async (
  zoneId: string,
  zoneView: 'front' | 'back'
): Promise<{
  isRecurring: boolean;
  count: number;
  lastDate: string | null;
}> => {
  const allInjuries = await getInjuries();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentInjuries = allInjuries.filter(injury => {
    if (injury.zone_id !== zoneId || injury.zone_view !== zoneView) {
      return false;
    }
    const injuryDate = new Date(injury.date);
    return injuryDate >= thirtyDaysAgo;
  });

  return {
    isRecurring: recentInjuries.length >= 2,
    count: recentInjuries.length,
    lastDate: recentInjuries.length > 0 ? recentInjuries[0].date : null,
  };
};

// ============================================
// GESTION DES TRAITEMENTS
// ============================================

/**
 * Enregistre un traitement effectué
 */
export const recordTreatment = async (data: {
  injury_id: number;
  treatment_type: string;
  custom_description?: string;
  notes?: string;
}): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];

  return await addTreatment({
    ...data,
    date: today,
    completed: true,
  });
};

/**
 * Récupère les traitements avec labels
 */
export const getTreatmentsWithLabels = async (
  injuryId: number
): Promise<(InjuryTreatment & { label: string; icon: string })[]> => {
  const treatments = await getTreatments(injuryId);

  return treatments.map(treatment => {
    const treatmentType = TREATMENT_TYPES.find(t => t.id === treatment.treatment_type);
    return {
      ...treatment,
      label: treatmentType?.label || treatment.treatment_type,
      icon: treatmentType?.icon || '💊',
    };
  });
};

// ============================================
// GESTION DES RAPPELS
// ============================================

/**
 * Calcule la prochaine date de rappel en fonction de la fréquence
 */
export const calculateNextReminderDate = (
  currentDate: Date,
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'as_needed'
): Date => {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'twice_daily':
      nextDate.setHours(nextDate.getHours() + 12);
      break;
    case 'three_times_daily':
      nextDate.setHours(nextDate.getHours() + 8);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'as_needed':
      // Pas de rappel automatique
      break;
  }

  return nextDate;
};

/**
 * Crée un rappel de traitement
 */
export const createTreatmentReminder = async (data: {
  injury_id: number;
  treatment_type: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'as_needed';
  time?: string;
}): Promise<number> => {
  const now = new Date();
  const nextDate = calculateNextReminderDate(now, data.frequency);

  return await addReminder({
    ...data,
    next_reminder_date: nextDate.toISOString().split('T')[0],
    enabled: true,
  });
};

/**
 * Traite un rappel complété et calcule le prochain
 */
export const completeReminder = async (reminderId: number): Promise<void> => {
  const reminders = await getReminders();
  const reminder = reminders.find(r => r.id === reminderId);

  if (!reminder) return;

  // Enregistrer le traitement
  await recordTreatment({
    injury_id: reminder.injury_id,
    treatment_type: reminder.treatment_type,
  });

  // Calculer la prochaine date
  const currentDate = new Date(reminder.next_reminder_date);
  const nextDate = calculateNextReminderDate(currentDate, reminder.frequency);

  // Mettre à jour le rappel
  await updateReminder(reminderId, {
    next_reminder_date: nextDate.toISOString().split('T')[0],
  });
};

// ============================================
// HELPERS
// ============================================

/**
 * Retourne le nom d'affichage d'une zone corporelle à partir de son ID.
 * Cherche d'abord dans bodyZones constants, puis dans le BodyMap INITIAL_DATA.
 * Si l'ID est inconnue (typo, ancienne version, etc.), tente plusieurs variantes,
 * puis formate l'ID en label lisible (ex: "finger_l_2" → "Finger Gauche").
 */
export const getZoneDisplayName = (zoneId: string, zoneView: 'front' | 'back'): string => {
  if (!zoneId) return 'Zone inconnue';

  // 1) Match exact dans bodyZones constants
  const zone = getZoneById(zoneId, zoneView);
  if (zone) return zone.name;

  // 2) Match dans BodyMap INITIAL_DATA (utilise 'label' au lieu de 'name')
  const bodyMapZones = zoneView === 'front' ? INITIAL_DATA.front : INITIAL_DATA.back;
  const bodyMapZone = bodyMapZones.find(z => z.id === zoneId);
  if (bodyMapZone?.label) return bodyMapZone.label;

  // 3) Variantes : strip suffixes numériques (finger_l_2 → finger_l), pluriel (finger_l → fingers_l)
  const stripped = zoneId.replace(/_\d+$/, '');                    // finger_l_2 → finger_l
  if (stripped !== zoneId) {
    const z = getZoneById(stripped, zoneView);
    if (z) return z.name;
  }
  const parts = stripped.split('_');                                // [finger, l]
  if (parts.length >= 2) {
    const pluralized = parts[0] + 's_' + parts.slice(1).join('_');  // fingers_l
    const z = getZoneById(pluralized, zoneView);
    if (z) return z.name;
  }

  // 4) Dernier recours : formater l'ID brut en label humain (Title Case + côté en français)
  const cleaned = stripped
    .replace(/_l$|_left$/i, ' Gauche')
    .replace(/_r$|_right$/i, ' Droite')
    .replace(/_back/i, ' (Arrière)')
    .replace(/_/g, ' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

/**
 * Retourne le label d'un type de douleur
 */
export const getPainTypeLabel = (painType: string): string => {
  const type = PAIN_TYPES.find(t => t.id === painType);
  return type ? `${type.icon} ${type.label}` : painType;
};

/**
 * Retourne le label d'une cause de blessure
 */
export const getInjuryCauseLabel = (cause: string): string => {
  const causeType = INJURY_CAUSES.find(c => c.id === cause);
  return causeType ? `${causeType.icon} ${causeType.label}` : cause;
};

/**
 * Retourne la couleur en fonction du score EVA
 */
export const getEVAColor = (evaScore: number): string => {
  if (evaScore === 0) return '#4CAF50'; // Vert
  if (evaScore <= 3) return '#8BC34A'; // Vert clair
  if (evaScore <= 6) return '#FF9800'; // Orange
  return '#F44336'; // Rouge
};

/**
 * Retourne l'emoji en fonction du score EVA
 */
export const getEVAEmoji = (evaScore: number): string => {
  if (evaScore === 0) return '😊';
  if (evaScore <= 2) return '🙂';
  if (evaScore <= 4) return '😐';
  if (evaScore <= 6) return '😣';
  if (evaScore <= 8) return '😖';
  return '😵';
};

/**
 * Calcule le nombre de jours depuis la blessure
 */
export const getDaysSinceInjury = (injuryDate: string): number => {
  const injury = new Date(injuryDate);
  const today = new Date();
  const diff = today.getTime() - injury.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Retourne un statut basé sur l'EVA et la durée (sans conseils médicaux)
 */
export const getInjuryRecommendation = (
  evaScore: number,
  daysSinceInjury: number
): string => {
  // Douleur sévère
  if (evaScore >= 7) {
    if (daysSinceInjury >= 2) {
      return `Douleur intense (${daysSinceInjury} jours) - Consultez un professionnel de santé`;
    }
    return 'Douleur intense enregistrée';
  }

  // Douleur modérée
  if (evaScore >= 4) {
    if (daysSinceInjury >= 7) {
      return `Douleur persistante (${daysSinceInjury} jours)`;
    }
    return 'Douleur modérée en cours';
  }

  // Douleur légère
  if (evaScore > 0) {
    return 'Douleur légère en amélioration';
  }

  // Pas de douleur
  return 'Aucune douleur - Blessure guérie';
};

export default {
  calculateFitForDuty,
  getFitForDutyInfo,
  createInjury,
  updateInjuryEva,
  markInjuryAsHealed,
  getInjuriesWithZoneNames,
  shouldRecommendRICE,
  getRICEProtocol,
  checkZoneRecurrence,
  recordTreatment,
  getTreatmentsWithLabels,
  createTreatmentReminder,
  completeReminder,
  getZoneDisplayName,
  getPainTypeLabel,
  getInjuryCauseLabel,
  getEVAColor,
  getEVAEmoji,
  getDaysSinceInjury,
  getInjuryRecommendation,
};
