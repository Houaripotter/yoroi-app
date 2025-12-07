import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Workout, WORKOUT_TYPES } from '@/types/workout';
import { theme } from '@/lib/theme';

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
    <View style={styles.container}>
      {/* Header avec navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onPreviousMonth} style={styles.navButton}>
          <ChevronLeft size={24} color={theme.colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.monthYear}>
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>

        <TouchableOpacity onPress={onNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color={theme.colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Jours de la semaine */}
      <View style={styles.weekDays}>
        {DAYS.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Grille du calendrier */}
      <View style={styles.calendar}>
        {days.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
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
                today && styles.todayCell,
                selected && styles.selectedCell,
                dayWorkouts.length > 0 && styles.workoutCell,
              ]}
              onPress={() => onDayPress(dateString)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  today && styles.todayText,
                  selected && styles.selectedText,
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
    color: theme.colors.textPrimary,
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xs,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  weekDayText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  dayCell: {
    width: `${(100 - (6 * 0.8)) / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    position: 'relative',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  selectedCell: {
    backgroundColor: theme.colors.mintPastel,
  },
  workoutCell: {
    backgroundColor: theme.colors.beigeLight,
  },
  dayText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  todayText: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.extrabold,
  },
  selectedText: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.extrabold,
  },
  workoutLogos: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 2,
  },
  smallLogo: {
    width: 18,
    height: 18,
  },
});
