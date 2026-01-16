// ============================================
// PLANNING PAGE 2 - EMPLOI DU TEMPS SPRINT
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, getClubs, type Training, type Club } from '@/lib/database';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const CARD_PADDING = 16;

interface PlanningPage2TimeTableProps {
  weeklyTrainings?: any[];
}

export const PlanningPage2TimeTable: React.FC<PlanningPage2TimeTableProps> = ({
  weeklyTrainings = [],
}) => {
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const trainingsData = await getTrainings();
    const clubsData = await getClubs();
    setWorkouts(trainingsData);
    setClubs(clubsData);
  };

  // Obtenir les jours de la semaine
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Lundi
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filtrer les entraînements de la semaine
  const weekWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date);
    return workoutDate >= weekStart && workoutDate <= weekEnd;
  });

  // Fonction pour obtenir les entraînements d'un jour et d'un créneau
  const getWorkoutsForSlot = (day: Date, timeSlot: 'morning' | 'afternoon' | 'evening') => {
    return weekWorkouts.filter(w => {
      const workoutDate = new Date(w.date);
      if (!isSameDay(workoutDate, day)) return false;

      const hour = workoutDate.getHours();
      if (timeSlot === 'morning' && hour >= 6 && hour < 12) return true;
      if (timeSlot === 'afternoon' && hour >= 12 && hour < 18) return true;
      if (timeSlot === 'evening' && hour >= 18 && hour < 24) return true;
      return false;
    });
  };

  // Obtenir le club d'un entraînement
  const getClubForWorkout = (workout: Training) => {
    return clubs.find(c => c.id === workout.club_id);
  };

  const timeSlots = [
    { id: 'morning', label: 'Matin', time: '07:00 - 12:00' },
    { id: 'afternoon', label: 'Après-midi', time: '12:00 - 18:00' },
    { id: 'evening', label: 'Soir', time: '18:00 - 23:00' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* Header de la semaine */}
      <View style={[styles.weekHeader, { backgroundColor: colors.accent }]}>
        <Text style={styles.weekHeaderText}>
          {format(weekStart, 'd', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })} ({weekWorkouts.length})
        </Text>
      </View>

      {/* Jours de la semaine */}
      <View style={styles.daysRow}>
        {weekDays.map((day) => (
          <View key={day.toISOString()} style={styles.dayColumn}>
            <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>
              {format(day, 'EEE', { locale: fr }).toUpperCase()}
            </Text>
            <View style={styles.dayIcon}>
              <Text style={styles.dayIconText}>⏱</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Grille horaire */}
      {timeSlots.map((slot) => (
        <View key={slot.id} style={styles.timeSlotRow}>
          {/* Label du créneau */}
          <View style={styles.timeSlotLabel}>
            <Text style={[styles.timeSlotLabelText, { color: colors.textPrimary }]}>
              {slot.label}
            </Text>
            <Text style={[styles.timeSlotTime, { color: colors.textMuted }]}>
              {slot.time}
            </Text>
          </View>

          {/* Cellules de la grille */}
          <View style={styles.timeSlotCells}>
            {weekDays.map((day) => {
              const dayWorkouts = getWorkoutsForSlot(day, slot.id as any);

              return (
                <View
                  key={day.toISOString()}
                  style={[styles.cell, { backgroundColor: colors.backgroundCard }]}
                >
                  {dayWorkouts.length > 0 ? (
                    dayWorkouts.map((workout, idx) => {
                      const club = getClubForWorkout(workout);
                      return (
                        <View key={idx} style={styles.workoutItem}>
                          {club?.logo_uri ? (
                            <Image
                              source={{ uri: club.logo_uri }}
                              style={styles.clubLogoSmall}
                            />
                          ) : (
                            <View style={[styles.clubLogoSmall, { backgroundColor: '#3B82F6' }]}>
                              <Text style={styles.clubLogoFallback}>
                                {club?.name?.charAt(0) || 'E'}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.restLabel, { color: colors.textMuted }]}>
                      Repos
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 250,
  },
  weekHeader: {
    marginHorizontal: CARD_PADDING,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  weekHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    marginHorizontal: CARD_PADDING,
    marginBottom: 16,
    gap: 8,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  dayIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayIconText: {
    fontSize: 16,
  },
  timeSlotRow: {
    marginBottom: 12,
    paddingHorizontal: CARD_PADDING,
  },
  timeSlotLabel: {
    marginBottom: 8,
  },
  timeSlotLabelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeSlotTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeSlotCells: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    minHeight: 80,
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workoutItem: {
    marginVertical: 2,
  },
  clubLogoSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubLogoFallback: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  restLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
