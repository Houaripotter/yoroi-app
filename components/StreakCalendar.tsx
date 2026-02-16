// ============================================
// YOROI - CALENDRIER STREAK (Style GitHub)
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Flame, Calendar } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { format, subDays, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTrainings } from '@/lib/database';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StreakCalendarProps {
  weeks?: number;
  onDayPress?: (date: Date, hasTraining: boolean) => void;
}

interface DayData {
  date: Date;
  count: number;
  hasTraining: boolean;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  weeks = 12,
  onDayPress,
}) => {
  const { colors } = useTheme();
  const [trainingDays, setTrainingDays] = useState<Record<string, number>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      const trainings = await getTrainings();
      const daysCounts: Record<string, number> = {};

      trainings.forEach((t) => {
        const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
        daysCounts[dateKey] = (daysCounts[dateKey] || 0) + 1;
      });

      setTrainingDays(daysCounts);
    } catch (error) {
      logger.error('Erreur chargement trainings:', error);
    }
  };

  // Générer les semaines
  const generateWeeks = (): DayData[][] => {
    const result: DayData[][] = [];
    const today = new Date();
    const startDate = startOfWeek(subDays(today, (weeks - 1) * 7), { weekStartsOn: 1 });

    for (let w = 0; w < weeks; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        const dateKey = format(date, 'yyyy-MM-dd');
        const count = trainingDays[dateKey] || 0;
        week.push({
          date,
          count,
          hasTraining: count > 0,
        });
      }
      result.push(week);
    }

    return result;
  };

  // Couleur selon l'intensité
  const getColor = (count: number): string => {
    if (count === 0) return colors.border;
    if (count === 1) return '#10B98150';
    if (count === 2) return '#10B98180';
    return '#10B981';
  };

  const weeksData = generateWeeks();
  const cellSize = Math.floor((SCREEN_WIDTH - 80) / weeks) - 2;

  // Statistiques
  const totalDays = Object.keys(trainingDays).length;
  const totalTrainings = Object.values(trainingDays).reduce((a, b) => a + b, 0);
  
  // Streak actuel
  const calculateStreak = (): number => {
    let streak = 0;
    let currentDate = new Date();
    
    // Vérifier si aujourd'hui a un entraînement, sinon commencer par hier
    const todayKey = format(currentDate, 'yyyy-MM-dd');
    if (!trainingDays[todayKey]) {
      currentDate = subDays(currentDate, 1);
    }
    
    while (true) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      if (trainingDays[dateKey]) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const currentStreak = calculateStreak();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Calendar size={18} color={colors.accentText} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Calendrier d'entraînement
          </Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: `${colors.accent}15` }]}>
          <Flame size={14} color="#F97316" />
          <Text style={[styles.streakText, { color: '#F97316' }]}>
            {currentStreak} jours
          </Text>
        </View>
      </View>

      {/* Légende jours */}
      <View style={styles.daysHeader}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
          <Text 
            key={i} 
            style={[
              styles.dayLabel, 
              { color: colors.textMuted, width: cellSize }
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* Grille calendrier */}
      <View style={styles.calendarGrid}>
        {weeksData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekColumn}>
            {week.map((day, dayIndex) => {
              const isFuture = day.date > new Date();
              const isCurrentDay = isToday(day.date);
              
              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: isFuture ? 'transparent' : getColor(day.count),
                      borderWidth: isCurrentDay ? 2 : 0,
                      borderColor: colors.accent,
                    },
                  ]}
                  onPress={() => !isFuture && onDayPress?.(day.date, day.hasTraining)}
                  disabled={isFuture}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Moins</Text>
        <View style={[styles.legendCell, { backgroundColor: colors.border }]} />
        <View style={[styles.legendCell, { backgroundColor: '#10B98150' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#10B98180' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#10B981' }]} />
        <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Plus</Text>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalDays}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>jours actifs</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalTrainings}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>entraînements</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F97316' }]}>{currentStreak}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>streak actuel</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
    paddingLeft: 2,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  weekColumn: {
    marginRight: 2,
  },
  dayCell: {
    borderRadius: 3,
    marginBottom: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
});

export default StreakCalendar;

