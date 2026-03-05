import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getWeeklyPlan,
  getSlotOccurrences,
  ensureCurrentWeekOccurrences,
  getSlotAttendanceRate,
  WeeklyPlan,
  SlotOccurrence,
} from '@/lib/database';

export interface WeeklySlotWithStatus extends WeeklyPlan {
  occurrence?: SlotOccurrence;
  isValidated: boolean;
  isCancelled: boolean;
  isPending: boolean;
  attendanceRate?: number;
  attendanceValidated?: number;
  attendanceTotal?: number;
}

const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay(); // 0=dimanche
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

export const useWeeklySlots = () => {
  const [slots, setSlots] = useState<WeeklyPlan[]>([]);
  const [occurrences, setOccurrences] = useState<SlotOccurrence[]>([]);
  const [attendanceRates, setAttendanceRates] = useState<Record<number, { rate: number; validated: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => getWeekStart(), []);

  const loadData = useCallback(async () => {
    try {
      // S'assurer que les occurrences de la semaine courante existent
      await ensureCurrentWeekOccurrences();

      const [slotsData, occurrencesData] = await Promise.all([
        getWeeklyPlan(),
        getSlotOccurrences(weekStart),
      ]);

      setSlots(slotsData);
      setOccurrences(occurrencesData);

      // Charger les taux d'assiduite pour chaque creneau non-repos
      const rates: Record<number, { rate: number; validated: number; total: number }> = {};
      for (const slot of slotsData) {
        if (slot.id && !slot.is_rest_day) {
          rates[slot.id] = await getSlotAttendanceRate(slot.id);
        }
      }
      setAttendanceRates(rates);
    } catch (error) {
      console.error('Erreur chargement slots:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const slotsWithStatus: WeeklySlotWithStatus[] = useMemo(() => {
    return slots
      .filter(s => !s.is_rest_day)
      .map(slot => {
        const occ = occurrences.find(o => o.weekly_plan_id === slot.id);
        const rate = slot.id ? attendanceRates[slot.id] : undefined;
        return {
          ...slot,
          occurrence: occ,
          isValidated: occ?.status === 'validated',
          isCancelled: occ?.status === 'cancelled',
          isPending: !occ || occ.status === 'pending',
          attendanceRate: rate?.rate,
          attendanceValidated: rate?.validated,
          attendanceTotal: rate?.total,
        };
      });
  }, [slots, occurrences, attendanceRates]);

  const todaySlots = useMemo(() => {
    const now = new Date();
    const jsDay = now.getDay(); // 0=dimanche
    const planDay = jsDay === 0 ? 6 : jsDay - 1; // 0=lundi
    return slotsWithStatus.filter(s => s.day_of_week === planDay);
  }, [slotsWithStatus]);

  return {
    slotsWithStatus,
    todaySlots,
    loading,
    refresh: loadData,
    weekStart,
  };
};
