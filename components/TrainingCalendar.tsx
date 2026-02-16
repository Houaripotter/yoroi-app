import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { Club } from '@/lib/database';
import { Workout } from '@/types/workout';
import { getSportIcon, getSportColor, getClubLogoSource } from '@/lib/sports';

const { width: screenWidth } = Dimensions.get('window');
const CALENDAR_PADDING = 8; // Réduit pour plus d'espace
const DAY_GAP = 3;
const DAY_SIZE = (screenWidth - CALENDAR_PADDING * 2 - DAY_GAP * 6 - 8) / 7; // -8 pour les marges container

interface TrainingCalendarProps {
  workouts: Workout[];
  clubs: Club[];
  onDayPress?: (date: Date) => void;
  onAddTraining?: (date: string) => void;
}

export const TrainingCalendar = memo(function TrainingCalendar({
  workouts,
  clubs,
  onDayPress,
  onAddTraining,
}: TrainingCalendarProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Pad start with empty days (Monday = 0)
    const startDay = getDay(start);
    const paddingStart = startDay === 0 ? 6 : startDay - 1;
    const padding = Array(paddingStart).fill(null);

    return [...padding, ...days];
  }, [currentMonth]);

  // Get workouts for a specific day
  const getWorkoutsForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return workouts.filter(w => w.date === dateStr);
  }, [workouts]);

  // Get club by ID
  const getClub = useCallback((clubId?: number) => {
    if (!clubId) return null;
    return clubs.find(c => c.id === clubId);
  }, [clubs]);

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Handle day press
  const handleDayPress = (date: Date) => {
    if (onDayPress) {
      onDayPress(date);
    } else if (onAddTraining) {
      onAddTraining(format(date, 'yyyy-MM-dd'));
    } else {
      // Navigate to add-training with date
      router.push({
        pathname: '/add-training',
        params: { date: format(date, 'yyyy-MM-dd') },
      } as any);
    }
  };

  // Render club logo or emoji
  const renderClubIndicator = (workout: Workout, size: number = 18) => {
    const club = getClub(workout.club_id);
    
    // Vérifier si le club a un logo
    const logoSource = club?.logo_uri ? getClubLogoSource(club.logo_uri) : null;

    if (logoSource) {
      return (
        <Image
          source={logoSource}
          style={[styles.workoutLogo, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card }]}
          resizeMode="cover"
        />
      );
    }

    // Fallback to color dot or icon
    const color = club?.color || getSportColor(workout.type);

    return (
      <View
        style={[
          styles.workoutDot,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={getSportIcon(workout.type) as any}
          size={size * 0.6}
          color="#FFFFFF"
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Month Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </Text>

        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <ChevronRight size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dayWorkouts = getWorkoutsForDay(day);
          const hasWorkouts = dayWorkouts.length > 0;
          const isCurrentDay = isToday(day);

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                isCurrentDay && [styles.todayCell, { backgroundColor: colors.goldMuted }],
                { borderColor: isCurrentDay ? colors.gold : 'transparent' },
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  { color: isCurrentDay ? colors.gold : colors.textPrimary },
                  isCurrentDay && styles.todayNumber,
                ]}
              >
                {format(day, 'd')}
              </Text>

              {/* Workout Indicators */}
              {hasWorkouts ? (
                <View style={styles.workoutsContainer}>
                  {dayWorkouts.slice(0, 3).map((workout, idx) => (
                    <View key={workout.id || idx} style={styles.workoutIndicator}>
                      {renderClubIndicator(workout, 16)}
                    </View>
                  ))}
                  {dayWorkouts.length > 3 && (
                    <Text style={[styles.moreWorkouts, { color: colors.textSecondary }]}>
                      +{dayWorkouts.length - 3}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.emptyDay}>
                  <Plus size={12} color={colors.textMuted} strokeWidth={1.5} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Aujourd'hui</Text>
        </View>
        <TouchableOpacity
          style={[styles.addTrainingButton, { backgroundColor: colors.goldMuted }]}
          onPress={() => handleDayPress(new Date())}
          activeOpacity={0.7}
        >
          <Plus size={16} color={colors.gold} />
          <Text style={[styles.addTrainingText, { color: colors.gold }]}>
            Ajouter un entrainement
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4, // Moins de marge pour plus d'espace
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    width: DAY_SIZE + DAY_GAP - 0.5, // Aligné avec les cellules du calendrier
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DAY_GAP,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE + 28, // Plus haut pour afficher plus d'entraînements
    alignItems: 'center',
    paddingTop: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  todayCell: {
    // backgroundColor set dynamically via colors.goldMuted
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayNumber: {
    fontWeight: '800',
  },
  workoutsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    maxWidth: DAY_SIZE - 4,
    flex: 1,
  },
  workoutIndicator: {
    // Container for each workout logo/dot
  },
  workoutLogo: {
    // backgroundColor set dynamically
  },
  workoutDot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutEmoji: {
    textAlign: 'center',
  },
  moreWorkouts: {
    fontSize: 9,
    fontWeight: '600',
  },
  emptyDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    // borderTopColor set dynamically
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    // backgroundColor set dynamically
  },
  addTrainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TrainingCalendar;
