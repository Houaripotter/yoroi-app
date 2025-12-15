import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Clock, MapPin, Trash2, Calendar, List, Dumbbell, ChevronRight } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { TrainingCalendar } from '@/components/TrainingCalendar';
import { getTrainings, getClubs, Club, Training as DBTraining } from '@/lib/database';
import { MUSCLES } from '@/lib/sports';

// ============================================
// ⚔️ PLANNING - MA SEMAINE TYPE
// ============================================

interface Training {
  id: string;
  sport: string;
  sportIcon: string;
  location: string;
  startTime: string;
  endTime: string;
  sportKey: 'jjb' | 'musculation' | 'running' | 'boxe' | 'yoga' | 'natation';
  muscles?: string[];
}

interface DayPlan {
  day: string;
  dayShort: string;
  trainings: Training[];
  isRest: boolean;
}

// Exemple de semaine type avec PLUSIEURS entraînements par jour
const DAYS: DayPlan[] = [
  {
    day: 'Lundi',
    dayShort: 'LUN',
    trainings: [
      { id: '1', sport: 'JJB', sportIcon: '🥋', location: 'Gracie Barra', startTime: '19:00', endTime: '20:30', sportKey: 'jjb' },
    ],
    isRest: false,
  },
  {
    day: 'Mardi',
    dayShort: 'MAR',
    trainings: [
      { id: '2a', sport: 'Musculation', sportIcon: '💪', location: 'Basic Fit', startTime: '07:00', endTime: '08:00', sportKey: 'musculation', muscles: ['pectoraux', 'triceps'] },
      { id: '2b', sport: 'JJB', sportIcon: '🥋', location: 'Gracie Barra', startTime: '19:00', endTime: '20:30', sportKey: 'jjb' },
    ],
    isRest: false,
  },
  {
    day: 'Mercredi',
    dayShort: 'MER',
    trainings: [],
    isRest: true,
  },
  {
    day: 'Jeudi',
    dayShort: 'JEU',
    trainings: [
      { id: '3a', sport: 'Musculation', sportIcon: '💪', location: 'Basic Fit', startTime: '07:00', endTime: '08:00', sportKey: 'musculation', muscles: ['dos', 'biceps'] },
      { id: '3b', sport: 'JJB', sportIcon: '🥋', location: 'Gracie Barra', startTime: '19:00', endTime: '20:30', sportKey: 'jjb' },
    ],
    isRest: false,
  },
  {
    day: 'Vendredi',
    dayShort: 'VEN',
    trainings: [
      { id: '4', sport: 'Musculation', sportIcon: '💪', location: 'Basic Fit', startTime: '12:00', endTime: '13:00', sportKey: 'musculation', muscles: ['epaules', 'abdos'] },
    ],
    isRest: false,
  },
  {
    day: 'Samedi',
    dayShort: 'SAM',
    trainings: [
      { id: '5a', sport: 'Musculation', sportIcon: '💪', location: 'Basic Fit', startTime: '09:00', endTime: '10:30', sportKey: 'musculation', muscles: ['jambes', 'fessiers'] },
      { id: '5b', sport: 'Running', sportIcon: '🏃', location: 'Parc', startTime: '17:00', endTime: '18:00', sportKey: 'running' },
    ],
    isRest: false,
  },
  {
    day: 'Dimanche',
    dayShort: 'DIM',
    trainings: [],
    isRest: true,
  },
];

type ViewMode = 'week' | 'calendar';

export default function PlanningScreen() {
  const { colors } = useTheme();
  const [weekPlan] = useState<DayPlan[]>(DAYS);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [workouts, setWorkouts] = useState<DBTraining[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Fonction pour obtenir la couleur du sport dynamiquement
  const getSportColor = (sportKey: Training['sportKey']) => {
    return colors.sports[sportKey] || colors.gold;
  };

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      const [trainingsData, clubsData] = await Promise.all([
        getTrainings(),
        getClubs(),
      ]);
      setWorkouts(trainingsData);
      setClubs(clubsData);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Calculer le résumé
  const totalSessions = weekPlan.reduce((sum, day) => sum + day.trainings.length, 0);
  const totalMinutes = weekPlan.reduce((sum, day) => {
    return sum + day.trainings.reduce((tSum, t) => {
      const [startH, startM] = t.startTime.split(':').map(Number);
      const [endH, endM] = t.endTime.split(':').map(Number);
      return tSum + ((endH * 60 + endM) - (startH * 60 + startM));
    }, 0);
  }, 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
  };

  const handleAddTraining = (date: string) => {
    router.push({
      pathname: '/add-training',
      params: { date },
    } as any);
  };

  return (
    <ScreenWrapper noPadding>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Planning</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Planifie tes batailles</Text>
        </View>

        {/* VIEW MODE TOGGLE */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('calendar')}
          >
            <Calendar size={18} color={viewMode === 'calendar' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: colors.textSecondary }, viewMode === 'calendar' && { color: colors.background }]}>
              Calendrier
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('week')}
          >
            <List size={18} color={viewMode === 'week' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: colors.textSecondary }, viewMode === 'week' && { color: colors.background }]}>
              Semaine Type
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'calendar' ? (
          /* CALENDRIER ENTRAINEMENTS */
          <TrainingCalendar
            workouts={workouts as any}
            clubs={clubs}
            onAddTraining={handleAddTraining}
          />
        ) : (
          <>
            {/* RÉSUMÉ */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.gold }]}>{totalSessions}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>sessions</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.gold }]}>{formatDuration(totalMinutes)}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>prévues</Text>
                </View>
              </View>
            </Card>

            {/* JOURS */}
            {weekPlan.map((day) => (
          <Card key={day.day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, { color: colors.textSecondary }]}>{day.day.toUpperCase()}</Text>
              {day.isRest && (
                <View style={[styles.restBadge, { backgroundColor: colors.purpleMuted }]}>
                  <Text style={[styles.restBadgeText, { color: colors.purple }]}>REPOS</Text>
                </View>
              )}
            </View>

            {day.isRest ? (
              <View style={styles.restContent}>
                <Text style={styles.restIcon}>🌙</Text>
                <Text style={[styles.restText, { color: colors.textPrimary }]}>Jour de repos</Text>
                <Text style={[styles.restSubtext, { color: colors.textSecondary }]}>"Même les guerriers récupèrent"</Text>
              </View>
            ) : (
              <>
                {/* TOUS les entraînements du jour */}
                {day.trainings.map((training, index) => (
                  <TouchableOpacity
                    key={training.id}
                    style={[styles.trainingItem, { borderLeftColor: getSportColor(training.sportKey), backgroundColor: colors.cardHover }]}
                    onPress={() => router.push('/add-training')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.trainingMain}>
                      <Text style={styles.trainingIcon}>{training.sportIcon}</Text>
                      <View style={styles.trainingInfo}>
                        <Text style={[styles.trainingName, { color: colors.textPrimary }]}>{training.sport}</Text>
                        <View style={styles.trainingMeta}>
                          <Clock size={12} color={colors.textSecondary} />
                          <Text style={[styles.trainingMetaText, { color: colors.textSecondary }]}>
                            {training.startTime} - {training.endTime}
                          </Text>
                        </View>
                        <View style={styles.trainingMeta}>
                          <MapPin size={12} color={colors.textSecondary} />
                          <Text style={[styles.trainingMetaText, { color: colors.textSecondary }]}>{training.location}</Text>
                        </View>
                        {/* Afficher les muscles si présents */}
                        {training.muscles && training.muscles.length > 0 && (
                          <View style={styles.musclesRow}>
                            <Dumbbell size={12} color={colors.info} />
                            <Text style={[styles.musclesText, { color: colors.info }]}>
                              {training.muscles.map(m =>
                                MUSCLES.find(muscle => muscle.id === m)?.name || m
                              ).join(', ')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.addTrainingButton, { borderColor: colors.borderGold }]}
                  onPress={() => router.push('/add-training')}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={colors.gold} />
                  <Text style={[styles.addTrainingText, { color: colors.gold }]}>Ajouter</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        ))}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// Constantes non-thématiques
const RADIUS = { sm: 8, md: 12 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },

  // TOGGLE
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // SUMMARY
  summaryCard: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 14,
    marginTop: 4,
  },

  // DAY CARD
  dayCard: {
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  restBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  restBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // REST
  restContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  restText: {
    fontSize: 16,
    fontWeight: '600',
  },
  restSubtext: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // TRAINING ITEM
  trainingItem: {
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  trainingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingIcon: {
    fontSize: 28,
  },
  trainingInfo: {
    flex: 1,
  },
  trainingName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trainingMetaText: {
    fontSize: 12,
  },
  musclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  musclesText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },

  // ADD BUTTON
  addTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    borderStyle: 'dashed',
  },
  addTrainingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
