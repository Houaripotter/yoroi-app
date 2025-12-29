import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTrainings, getClubs, Training, Club } from '@/lib/database';
import { getDay } from 'date-fns';

export interface SessionDetail {
  id?: number;
  clubId?: number;
  clubName: string;
  clubColor: string;
  clubLogo?: string;
  startTime: string; // "18:00"
  duration: number; // minutes
  sessionTypes: string[]; // ["cours", "sparring"]
  details?: string; // Muscles ou thème technique
  note?: string;
  sport: string;
}

export interface DaySchedule {
  id: string; // 'lun', 'mar', etc.
  label: string; // 'LUNDI'
  isRest: boolean;
  sessions: SessionDetail[];
}

export const useWeekSchedule = () => {
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      console.log('🔄 useWeekSchedule: Chargement des données...');
      const [trainingsData, clubsData] = await Promise.all([
        getTrainings(),
        getClubs(),
      ]);
      console.log('🔄 useWeekSchedule: Trainings chargés:', trainingsData.length);
      setWorkouts(trainingsData);
      setClubs(clubsData);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au montage initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  const weekSchedule: DaySchedule[] = useMemo(() => {
    const DAYS = [
      { id: 'lun', label: 'LUNDI' },
      { id: 'mar', label: 'MARDI' },
      { id: 'mer', label: 'MERCREDI' },
      { id: 'jeu', label: 'JEUDI' },
      { id: 'ven', label: 'VENDREDI' },
      { id: 'sam', label: 'SAMEDI' },
      { id: 'dim', label: 'DIMANCHE' },
    ];

    return DAYS.map((day, dayIndex) => {
      // Récupérer toutes les séances pour ce jour de la semaine
      const daySessions = workouts
        .filter(workout => {
          const date = new Date(workout.date);
          let dayOfWeek = getDay(date); // 0=Dimanche, 1=Lundi, etc.
          // Convertir: 0=Dimanche->6, 1=Lundi->0, etc.
          dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          return dayOfWeek === dayIndex;
        })
        .map(workout => {
          const club = clubs.find(c => c.id === workout.club_id);

          // Parser les session_types (JSON array)
          let sessionTypes: string[] = [];
          try {
            if (workout.session_types) {
              sessionTypes = JSON.parse(workout.session_types);
            } else if (workout.session_type) {
              sessionTypes = [workout.session_type];
            }
          } catch {
            sessionTypes = workout.session_type ? [workout.session_type] : ['Séance'];
          }

          // Parser les muscles (JSON array)
          let muscles: string[] = [];
          try {
            if (workout.muscles) {
              muscles = JSON.parse(workout.muscles);
            }
          } catch {
            muscles = workout.muscles ? [workout.muscles] : [];
          }

          // Détails: muscles pour muscu, thème technique pour combat
          let details = '';
          if (muscles.length > 0) {
            details = muscles.join(' • ');
          } else if (workout.technical_theme) {
            details = workout.technical_theme;
          }

          const session: SessionDetail = {
            id: workout.id,
            clubId: workout.club_id,
            clubName: club?.name || 'Club inconnu',
            clubColor: club?.color || '#6B7280',
            clubLogo: club?.logo_uri,
            startTime: workout.start_time || '12:00',
            duration: workout.duration_minutes || 60,
            sessionTypes,
            details,
            note: workout.notes,
            sport: workout.sport,
          };

          return session;
        })
        .sort((a, b) => {
          // Trier par heure de début
          const timeA = a.startTime.split(':').map(Number);
          const timeB = b.startTime.split(':').map(Number);
          return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });

      return {
        id: day.id,
        label: day.label,
        isRest: false, // TODO: implémenter la logique repos
        sessions: daySessions,
      };
    });
  }, [workouts, clubs]);

  return {
    weekSchedule,
    loading,
    refresh: loadData,
  };
};
