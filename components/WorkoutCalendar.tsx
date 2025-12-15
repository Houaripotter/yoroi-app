import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Workout, WORKOUT_TYPES } from '@/types/workout';
import { theme } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface WorkoutCalendarProps {
  currentMonth: Date;
  workouts: Workout[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDayPress: (date: string) => void;
  selectedDate?: string;
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function WorkoutCalendar({
  currentMonth,
  workouts,
  onPreviousMonth,
  onNextMonth,
  onDayPress,
  selectedDate,
}: WorkoutCalendarProps) {
  const { colors } = useTheme();

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    // Ajouter les jours vides au début (lundi = 1, dimanche = 0 -> 7)
    let firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7; // Dimanche devient 7

    for (let i = 1; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Ajouter tous les jours du mois
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getWorkoutsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return workouts.filter(w => w.date === dateString);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    const dateString = date.toISOString().split('T')[0];
    return dateString === selectedDate;
  };

  const days = getDaysInMonth();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header avec navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onPreviousMonth} style={[styles.navButton, { backgroundColor: colors.cardHover }]}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={[styles.monthYear, { color: colors.textPrimary }]}>
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>

        <TouchableOpacity onPress={onNextMonth} style={[styles.navButton, { backgroundColor: colors.cardHover }]}>
          <ChevronRight size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Jours de la semaine */}
      <View style={styles.weekDays}>
        {DAYS.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Grille du calendrier */}
      <View style={styles.calendar}>
        {days.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={[styles.dayCell, { backgroundColor: colors.cardHover }]} />;
          }

          const dayWorkouts = getWorkoutsForDate(day);
          const today = isToday(day);
          const selected = isSelected(day);
          const dateString = day.toISOString().split('T')[0];

          return (
            <TouchableOpacity
              key={dateString}
              style={[
                styles.dayCell,
                { backgroundColor: colors.cardHover },
                today && [styles.todayCell, { borderColor: colors.success }],
                selected && { backgroundColor: colors.goldMuted },
                dayWorkouts.length > 0 && { backgroundColor: colors.card },
              ]}
              onPress={() => onDayPress(dateString)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: colors.textPrimary },
                  today && { color: colors.success, fontWeight: theme.fontWeight.bold },
                  selected && { color: colors.gold, fontWeight: theme.fontWeight.bold },
                ]}
              >
                {day.getDate()}
              </Text>

              {/* Logos des entraînements */}
              {dayWorkouts.length > 0 && (
                <View style={styles.workoutLogos}>
                  {dayWorkouts.slice(0, 2).map((workout, i) => (
                    <Image
                      key={workout.id}
                      source={WORKOUT_TYPES[workout.type].logo}
                      style={styles.smallLogo}
                      resizeMode="contain"
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  navButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  monthYear: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
  },
  weekDays: {
    flexDirection: 'row',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  weekDayText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    position: 'relative',
    margin: 2,
  },
  todayCell: {
    borderWidth: 2,
  },
  dayText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  workoutLogos: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    width: '100%',
  },
  smallLogo: {
    width: 15,
    height: 15,
  },
});
