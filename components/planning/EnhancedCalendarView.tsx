import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Plus, Moon } from 'lucide-react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Training, Club } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface EnhancedCalendarViewProps {
  currentMonth: Date;
  workouts: Training[];
  clubs: Club[];
  onMonthChange: (date: Date) => void;
  onDayPress: (day: Date) => void;
  selectedDate: Date | null;
}

// Couleur de fond selon l'intensité (nombre de séances)
const getIntensityColor = (sessionCount: number): string => {
  if (sessionCount >= 3) return '#22C55E30'; // Vert fort
  if (sessionCount >= 2) return '#22C55E20'; // Vert moyen
  if (sessionCount >= 1) return '#22C55E10'; // Vert léger
  return 'transparent';
};

export const EnhancedCalendarView: React.FC<EnhancedCalendarViewProps> = ({
  currentMonth,
  workouts,
  clubs,
  onMonthChange,
  onDayPress,
  selectedDate,
}) => {
  const { colors } = useTheme();

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Grouper par semaines
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let week: Date[] = [];

    calendarDays.forEach((day, index) => {
      week.push(day);
      if ((index + 1) % 7 === 0) {
        result.push(week);
        week = [];
      }
    });

    if (week.length > 0) {
      result.push(week);
    }

    return result;
  }, [calendarDays]);

  const getWorkoutsForDate = (date: Date): Training[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return workouts.filter((w) => w.date === dateStr);
  };

  const getClubDisplay = (club: Club) => {
    if (club.logo_uri) {
      const logoSource = getClubLogoSource(club.logo_uri);
      if (logoSource) {
        return { type: 'image' as const, source: logoSource };
      }
    }
    return { type: 'color' as const, color: club.color || colors.accent };
  };

  return (
    <View style={styles.container}>
      {/* Header navigation */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => onMonthChange(subMonths(currentMonth, 1))}
          style={[
            styles.calendarNavButton,
            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.calendarTitle, { color: colors.textPrimary }]}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </Text>
        <TouchableOpacity
          onPress={() => onMonthChange(addMonths(currentMonth, 1))}
          style={[
            styles.calendarNavButton,
            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
          ]}
        >
          <ChevronRight size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <ScrollView
        style={styles.calendarScrollContainer}
        contentContainerStyle={styles.calendarContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
          ]}
        >
          {/* Header jours */}
          <View style={styles.weekHeader}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <Text
                key={day}
                style={[styles.weekHeaderText, { color: colors.textMuted }]}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Grille des jours */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                const dayWorkouts = getWorkoutsForDate(day);
                const hasTraining = dayWorkouts.length > 0;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDayToday = isToday(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                // Couleur de fond selon l'intensité
                const bgColor = hasTraining
                  ? getIntensityColor(dayWorkouts.length)
                  : 'transparent';

                // Get unique clubs for this day (max 3)
                const uniqueClubIds = [
                  ...new Set(dayWorkouts.filter((w) => w.club_id).map((w) => w.club_id)),
                ].slice(0, 3);
                const uniqueClubs = uniqueClubIds
                  .map((id) => clubs.find((c) => c.id === id))
                  .filter(Boolean) as Club[];

                // TODO: Récupérer l'état repos depuis la base de données
                const isRest = false;

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      { backgroundColor: bgColor },
                      isDayToday && {
                        borderWidth: 2,
                        borderColor: colors.accent,
                      },
                      isSelected && {
                        backgroundColor: colors.accent + '40',
                        borderWidth: 2,
                        borderColor: colors.accent,
                      },
                      !isCurrentMonth && styles.otherMonthCell,
                    ]}
                    onPress={() => onDayPress(day)}
                    activeOpacity={0.7}
                  >
                    {/* Juste le chiffre du jour */}
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: colors.textPrimary },
                        isDayToday && {
                          color: colors.accent,
                          fontWeight: '700',
                        },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                        !isCurrentMonth && styles.otherMonthNumber,
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>

                    {/* Logos des clubs (max 2-3) */}
                    {hasTraining && (
                      <View style={styles.clubLogosContainer}>
                        {uniqueClubs.map((club, i) => {
                          const display = getClubDisplay(club);
                          return display.type === 'image' ? (
                            <Image
                              key={i}
                              source={display.source}
                              style={[
                                styles.calendarClubLogo,
                                { marginLeft: i > 0 ? -8 : 0 },
                              ]}
                            />
                          ) : (
                            <View
                              key={i}
                              style={[
                                styles.calendarClubDot,
                                {
                                  backgroundColor: display.color,
                                  marginLeft: i > 0 ? -4 : 0,
                                },
                              ]}
                            />
                          );
                        })}

                        {/* Badge +N si plus de 3 séances */}
                        {dayWorkouts.length > 3 && (
                          <View
                            style={[
                              styles.moreSessionsBadge,
                              { backgroundColor: colors.accent },
                            ]}
                          >
                            <Text style={styles.moreSessionsText}>
                              +{dayWorkouts.length - 3}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Indicateur repos */}
                    {isRest && (
                      <Moon size={12} color="#8B5CF6" style={styles.restIcon} />
                    )}

                    {/* Bouton + pour ajouter (si vide et mois actuel) */}
                    {!hasTraining && !isRest && isCurrentMonth && (
                      <View style={styles.addDayButtonContainer}>
                        <Plus
                          size={14}
                          color={colors.textMuted}
                          style={{ opacity: 0.3 }}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },

  // Calendar Header
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: SPACING.xs,
    marginTop: 0,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  calendarTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    textTransform: 'capitalize',
  },

  // Calendar Grid
  calendarScrollContainer: {
    // Pas de flex, juste le contenu naturel
  },
  calendarContent: {
    paddingHorizontal: 0,
  },
  calendarCard: {
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    borderWidth: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 0.9, // Réduit la hauteur des cellules
    margin: 0,
    borderRadius: 10,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  otherMonthCell: {
    opacity: 0.4,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  otherMonthNumber: {
    opacity: 0.5,
  },

  // Club Logos
  clubLogosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  calendarClubLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  calendarClubDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  moreSessionsBadge: {
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 4,
  },
  moreSessionsText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Rest Icon
  restIcon: {
    marginTop: 2,
  },

  // Add Button
  addDayButtonContainer: {
    marginTop: 2,
  },
});
