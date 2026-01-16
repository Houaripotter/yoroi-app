// ============================================
// PLANNING PAGE 4 - CLUBS
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, getClubs, type Training, type Club } from '@/lib/database';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { router } from 'expo-router';

const CARD_PADDING = 16;

export const PlanningPage4Clubs: React.FC = () => {
  const { colors } = useTheme();
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

  // Calculer les stats pour ce mois
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date);
    return isWithinInterval(workoutDate, { start: monthStart, end: monthEnd });
  });

  // Stats par club
  const clubsWithStats = clubs.map(club => {
    const clubWorkouts = monthWorkouts.filter(w => w.club_id === club.id);
    return {
      ...club,
      monthCount: clubWorkouts.length,
    };
  }).filter(c => c.monthCount > 0);

  const totalSessions = workouts.length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        MES CLUBS
      </Text>

      {/* Cartes de clubs */}
      <View style={styles.clubsGrid}>
        {clubsWithStats.map((club) => (
          <TouchableOpacity
            key={club.id}
            style={[styles.clubCard, { backgroundColor: colors.backgroundCard }]}
            activeOpacity={0.7}
          >
            {/* Logo du club */}
            <View style={styles.clubLogoContainer}>
              {club.logo_uri ? (
                <Image
                  source={{ uri: club.logo_uri }}
                  style={styles.clubLogo}
                />
              ) : (
                <View style={[styles.clubLogoFallback, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.clubLogoFallbackText}>
                    {club.name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>

            {/* Nom et discipline */}
            <View style={styles.clubInfo}>
              <Text style={[styles.clubName, { color: colors.textPrimary }]} numberOfLines={2}>
                {club.name}
              </Text>
              <Text style={[styles.clubDiscipline, { color: colors.textMuted }]}>
                {club.sport || 'Musculation'}
              </Text>
            </View>

            {/* Compteur */}
            <View style={styles.clubCountBadge}>
              <Text style={[styles.clubCountNumber, { color: colors.accent }]}>
                {club.monthCount}
              </Text>
              <Text style={[styles.clubCountLabel, { color: colors.textMuted }]}>
                ce mois
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats globales */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {totalSessions}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            total séances
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {clubs.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            clubs
          </Text>
        </View>
      </View>

      {/* Bouton ajouter un club */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.accent }]}
        activeOpacity={0.8}
        onPress={() => {
          // TODO: Navigation vers l'ajout de club
        }}
      >
        <Text style={styles.addButtonText}>+ Ajouter un club</Text>
      </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  clubsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  clubCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  clubLogoContainer: {
    width: 64,
    height: 64,
  },
  clubLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  clubLogoFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubLogoFallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  clubDiscipline: {
    fontSize: 13,
    fontWeight: '600',
  },
  clubCountBadge: {
    alignItems: 'center',
  },
  clubCountNumber: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  clubCountLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
