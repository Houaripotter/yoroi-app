// ============================================
// PLANNING PAGE 1 - CALENDRIER
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { EnhancedCalendarView } from '@/components/planning/EnhancedCalendarView';
import { getTrainings, getClubs, type Training, type Club } from '@/lib/database';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const CARD_PADDING = 16;

interface PlanningPage1CalendarProps {
  trainingHistory?: any[];
  streak?: number;
}

export const PlanningPage1Calendar: React.FC<PlanningPage1CalendarProps> = ({
  trainingHistory = [],
  streak = 0,
}) => {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const trainingsData = await getTrainings();
    const clubsData = await getClubs();
    setWorkouts(trainingsData);
    setClubs(clubsData);
  };

  const handleDayPress = (day: Date) => {
    setSelectedDate(day);
  };

  // Calculer les stats par club pour le mois en cours
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date);
    return isWithinInterval(workoutDate, { start: monthStart, end: monthEnd });
  });

  // Grouper les entraînements par club
  const clubStats = clubs.map(club => {
    const clubWorkouts = monthWorkouts.filter(w => w.club_id === club.id);
    return {
      ...club,
      count: clubWorkouts.length,
    };
  }).filter(stat => stat.count > 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* Badges de clubs avec compteurs */}
      {clubStats.length > 0 && (
        <View style={styles.clubBadgesContainer}>
          {clubStats.map((stat) => (
            <View key={stat.id} style={styles.clubBadge}>
              <View style={[styles.clubBadgeIcon, { backgroundColor: colors.backgroundCard }]}>
                {stat.logo_uri ? (
                  <Image source={{ uri: stat.logo_uri }} style={styles.clubLogo} resizeMode="cover" />
                ) : (
                  <Text style={styles.clubLogoFallback}>{stat.name.charAt(0)}</Text>
                )}
              </View>
              <View style={styles.clubBadgeCount}>
                <Text style={[styles.clubBadgeNumber, { color: colors.textPrimary }]}>
                  x{stat.count}
                </Text>
              </View>
              <Text style={[styles.clubBadgeName, { color: colors.textSecondary }]} numberOfLines={2}>
                {stat.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Calendrier avec logos */}
      <EnhancedCalendarView
        currentMonth={currentMonth}
        workouts={workouts}
        clubs={clubs}
        onMonthChange={setCurrentMonth}
        onDayPress={handleDayPress}
        selectedDate={selectedDate}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 250,
  },
  clubBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  clubBadge: {
    alignItems: 'center',
    width: 70,
  },
  clubBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  clubLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  clubLogoFallback: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3B82F6',
  },
  clubBadgeCount: {
    position: 'absolute',
    top: -4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
  },
  clubBadgeNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  clubBadgeName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
});
