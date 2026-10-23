/**
 * Jours d'entrainement prevus de la semaine (vague 28), 0 = lundi a 6 = dimanche.
 * Le planning (creneaux reguliers) passe toujours en premier : s'il existe, il n'est jamais remplace.
 * Sinon, les jours choisis a l'onboarding ou dans les Reglages (espace.joursSemaine).
 */
import { useCallback, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getWeeklyPlan } from '@/lib/database';
import type { WeeklyPlan } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import type { Espace } from '@/lib/v2/espace';

/** Jours qui ont au moins un creneau d'entrainement (hors repos) */
export function joursDuPlanning(plan: WeeklyPlan[]): number[] {
  return Array.from(new Set(plan.filter((p) => !p.is_rest_day).map((p) => p.day_of_week)))
    .filter((j) => Number.isInteger(j) && j >= 0 && j <= 6)
    .sort((a, b) => a - b);
}

export function joursPrevus(plan: WeeklyPlan[], espace: Pick<Espace, 'joursSemaine'> | null | undefined): number[] {
  const p = joursDuPlanning(plan);
  if (p.length) return p;
  return (espace?.joursSemaine ?? []).filter((j) => Number.isInteger(j) && j >= 0 && j <= 6);
}

/** Pour l'accueil : relu a chaque retour sur l'ecran et apres chaque enregistrement */
export function useJoursPrevus(espace: Pick<Espace, 'joursSemaine'> | null | undefined): number[] {
  const [plan, setPlan] = useState<WeeklyPlan[]>([]);
  const load = useCallback(() => {
    getWeeklyPlan()
      .then((p) => setPlan(p ?? []))
      .catch(() => setPlan([]));
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
      const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
      return () => sub.remove();
    }, [load]),
  );
  return joursPrevus(plan, espace);
}
