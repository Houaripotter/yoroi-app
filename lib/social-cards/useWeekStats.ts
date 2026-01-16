// ============================================
// HOOK - STATISTIQUES HEBDOMADAIRES
// ============================================
// Calcule les stats d'une semaine pour la carte Weekly Recap

import { useState, useEffect } from 'react';
import { getTrainings, getWeights } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';
import type { Training, Weight } from '@/lib/database';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export interface WeekStats {
  year: number;
  weekNumber: number;
  weekStart: Date;                // Premier jour de la semaine (lundi)
  weekEnd: Date;                  // Dernier jour de la semaine (dimanche)
  weekLabel: string;              // "Semaine 12 • 18-24 Mars"

  // Activité
  activeDays: number;             // Nombre de jours avec training
  totalSessions: number;          // Nombre total de séances
  totalDays: number;              // Toujours 7
  percentage: number;             // activeDays / 7 * 100

  // Calendrier de la semaine
  calendar: Array<{
    date: Date;
    dayName: string;              // "Lun", "Mar", etc.
    dayNumber: number;            // 1-31
    isActive: boolean;
    isToday: boolean;
    sessions: number;             // Nombre de séances ce jour
  }>;

  // Clubs
  clubs: Array<{
    clubName: string;
    clubLogo?: any;
    count: number;                // Nombre de séances
  }>;

  // Évolution
  evolution: {
    weight?: {
      start: number;
      end: number;
      change: number;
    };
  };

  // Meilleur jour
  bestDay?: {
    dayName: string;
    date: Date;
    sessions: number;
  };
}

// ============================================
// HELPERS
// ============================================

// Obtenir le lundi de la semaine d'une date
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster si dimanche
  return new Date(d.setDate(diff));
}

// Obtenir le dimanche de la semaine d'une date
function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

// Obtenir le numéro de semaine ISO
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Formater la date pour comparaison
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Noms des jours en français
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// Noms des mois en français
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ============================================
// HOOK
// ============================================

export function useWeekStats(targetDate?: Date) {
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWeekStats();
  }, [targetDate]);

  const loadWeekStats = async () => {
    try {
      setIsLoading(true);

      const now = targetDate || new Date();
      const weekStart = getMonday(now);
      const weekEnd = getSunday(now);

      // Formater les dates pour la requête
      const startStr = formatDate(weekStart);
      const endStr = formatDate(weekEnd);

      // Récupérer les trainings de la semaine
      const allTrainings = await getTrainings();
      const weekTrainings = allTrainings.filter(t => {
        const tDate = formatDate(new Date(t.date));
        return tDate >= startStr && tDate <= endStr;
      });

      // Récupérer les poids de la semaine
      const allWeights = await getWeights();
      const weekWeights = allWeights.filter(w => {
        const wDate = formatDate(new Date(w.date));
        return wDate >= startStr && wDate <= endStr;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculer les jours actifs (jours uniques avec training)
      const activeDatesSet = new Set<string>();
      const trainingsByDate = new Map<string, Training[]>();

      weekTrainings.forEach(t => {
        const dateStr = formatDate(new Date(t.date));
        activeDatesSet.add(dateStr);

        if (!trainingsByDate.has(dateStr)) {
          trainingsByDate.set(dateStr, []);
        }
        trainingsByDate.get(dateStr)!.push(t);
      });

      const activeDays = activeDatesSet.size;
      const totalSessions = weekTrainings.length;
      const percentage = (activeDays / 7) * 100;

      // Générer le calendrier de la semaine (Lun -> Dim)
      const calendar = [];
      const today = formatDate(new Date());

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = formatDate(date);
        const dayTrainings = trainingsByDate.get(dateStr) || [];

        calendar.push({
          date,
          dayName: DAY_NAMES[(date.getDay())],
          dayNumber: date.getDate(),
          isActive: dayTrainings.length > 0,
          isToday: dateStr === today,
          sessions: dayTrainings.length,
        });
      }

      // Répartition par clubs
      const clubCounts = new Map<string, { count: number; logo?: string }>();
      weekTrainings.forEach(t => {
        const clubName = t.club_name || 'Sans club';
        const existing = clubCounts.get(clubName);
        clubCounts.set(clubName, {
          count: (existing?.count || 0) + 1,
          logo: t.club_logo || existing?.logo,
        });
      });

      const clubs = Array.from(clubCounts.entries())
        .map(([clubName, data]) => ({
          clubName,
          clubLogo: data.logo ? getClubLogoSource(data.logo) : null,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 clubs

      // Évolution du poids
      let evolution: WeekStats['evolution'] = {};

      if (weekWeights.length >= 2) {
        const startWeight = weekWeights[0].weight;
        const endWeight = weekWeights[weekWeights.length - 1].weight;
        evolution.weight = {
          start: startWeight,
          end: endWeight,
          change: endWeight - startWeight,
        };
      }

      // Meilleur jour (le plus de séances)
      let bestDay: WeekStats['bestDay'] | undefined;
      let maxSessions = 0;

      calendar.forEach(day => {
        if (day.sessions > maxSessions) {
          maxSessions = day.sessions;
          bestDay = {
            dayName: day.dayName,
            date: day.date,
            sessions: day.sessions,
          };
        }
      });

      // Label de la semaine
      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const startMonth = MONTH_NAMES[weekStart.getMonth()];
      const endMonth = MONTH_NAMES[weekEnd.getMonth()];

      const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
        ? `Semaine ${getWeekNumber(weekStart)} • ${startDay}-${endDay} ${startMonth}`
        : `Semaine ${getWeekNumber(weekStart)} • ${startDay} ${startMonth} - ${endDay} ${endMonth}`;

      setStats({
        year: weekStart.getFullYear(),
        weekNumber: getWeekNumber(weekStart),
        weekStart,
        weekEnd,
        weekLabel,
        activeDays,
        totalSessions,
        totalDays: 7,
        percentage,
        calendar,
        clubs,
        evolution,
        bestDay: maxSessions > 0 ? bestDay : undefined,
      });
    } catch (error) {
      logger.error('Erreur lors du chargement des stats hebdomadaires:', error);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refresh: loadWeekStats };
}

// ============================================
// HELPERS - EMOJIS
// ============================================

function getEmojiForSport(sport: string): string {
  const sportLower = sport.toLowerCase();

  // Mappage des sports vers emojis
  const emojiMap: Record<string, string> = {
    // Arts martiaux
    'jjb': '',
    'bjj': '',
    'jiu-jitsu': '',
    'judo': '',
    'karate': '',
    'taekwondo': '',
    'boxe': '',
    'muay thai': '',
    'mma': '',
    'kick boxing': '',

    // Musculation
    'musculation': '',
    'muscu': '',
    'fitness': '',
    'crossfit': '',
    'haltérophilie': '',

    // Cardio
    'course': '',
    'running': '',
    'trail': '',
    'vélo': '',
    'cyclisme': '',
    'natation': '',
    'rameur': '🚣',

    // Sports collectifs
    'football': '',
    'basket': '',
    'rugby': '',
    'tennis': '',
    'volleyball': '',

    // Autres
    'yoga': '',
    'escalade': '',
    'danse': '💃',
    'marche': '🚶',
  };

  // Chercher une correspondance
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (sportLower.includes(key)) {
      return emoji;
    }
  }

  // Par défaut
  return '';
}
