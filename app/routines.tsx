import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronLeft, ListChecks, Play, Clock, Dumbbell, Flame, Snowflake } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

// ============================================
// ROUTINES - ÉCHAUFFEMENT & RÉCUPÉRATION
// ============================================

interface Routine {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  icon: any;
  color: string;
  exercises: string[];
}

const ROUTINES: Routine[] = [
  {
    id: 'warmup_general',
    name: 'Échauffement Général',
    description: 'Prépare ton corps avant ta séance',
    duration: 10,
    icon: Flame,
    color: '#F97316',
    exercises: [
      '2 min - Jumping jacks',
      '2 min - Montées de genoux',
      '2 min - Talons-fesses',
      '2 min - Rotations articulaires',
      '2 min - Squats légers',
    ],
  },
  {
    id: 'warmup_upper',
    name: 'Échauffement Haut du Corps',
    description: 'Spécial push/pull/épaules',
    duration: 8,
    icon: Dumbbell,
    color: '#3B82F6',
    exercises: [
      '1 min - Rotations épaules',
      '1 min - Cercles de bras',
      '2 min - Pompes sur genoux',
      '2 min - Band pull-aparts',
      '2 min - Face pulls légers',
    ],
  },
  {
    id: 'warmup_lower',
    name: 'Échauffement Bas du Corps',
    description: 'Spécial jambes/fessiers',
    duration: 8,
    icon: Dumbbell,
    color: '#10B981',
    exercises: [
      '2 min - Marche sur place',
      '2 min - Squats au poids de corps',
      '2 min - Fentes alternées',
      '1 min - Activations fessiers',
      '1 min - Mobilité chevilles',
    ],
  },
  {
    id: 'cooldown',
    name: 'Récupération / Cool-down',
    description: 'Retour au calme après l\'effort',
    duration: 10,
    icon: Snowflake,
    color: '#06B6D4',
    exercises: [
      '3 min - Marche lente',
      '2 min - Étirements quadriceps',
      '2 min - Étirements ischio-jambiers',
      '2 min - Étirements dos',
      '1 min - Respiration profonde',
    ],
  },
  {
    id: 'mobility',
    name: 'Routine Mobilité',
    description: 'Améliore ta souplesse',
    duration: 15,
    icon: ListChecks,
    color: '#8B5CF6',
    exercises: [
      '3 min - Cat-cow',
      '3 min - World\'s greatest stretch',
      '3 min - 90/90 hip stretch',
      '3 min - Thoracic rotations',
      '3 min - Shoulder dislocates',
    ],
  },
];

export default function RoutinesScreen() {
  const { colors, isDark } = useTheme();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  const handleStartRoutine = (routine: Routine) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    // TODO: Implémenter le timer de routine
    setSelectedRoutine(routine);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Routines</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.backgroundCard }]}>
          <ListChecks size={32} color="#14B8A6" />
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            Échauffement & Récupération
          </Text>
          <Text style={[styles.introText, { color: colors.textMuted }]}>
            Des routines guidées pour préparer ton corps avant l'effort et récupérer après.
          </Text>
        </View>

        {/* Liste des routines */}
        {ROUTINES.map((routine) => {
          const Icon = routine.icon;
          const isSelected = selectedRoutine?.id === routine.id;

          return (
            <View key={routine.id}>
              <TouchableOpacity
                style={[
                  styles.routineCard,
                  { backgroundColor: colors.backgroundCard },
                  isSelected && { borderColor: routine.color, borderWidth: 2 }
                ]}
                onPress={() => setSelectedRoutine(isSelected ? null : routine)}
                activeOpacity={0.8}
              >
                <View style={[styles.routineIcon, { backgroundColor: `${routine.color}20` }]}>
                  <Icon size={24} color={routine.color} />
                </View>
                <View style={styles.routineInfo}>
                  <Text style={[styles.routineName, { color: colors.textPrimary }]}>
                    {routine.name}
                  </Text>
                  <Text style={[styles.routineDescription, { color: colors.textMuted }]}>
                    {routine.description}
                  </Text>
                  <View style={styles.routineMeta}>
                    <Clock size={14} color={colors.textMuted} />
                    <Text style={[styles.routineDuration, { color: colors.textMuted }]}>
                      {routine.duration} min
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Exercices détaillés si sélectionné */}
              {isSelected && (
                <View style={[styles.exercisesList, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                  {routine.exercises.map((exercise, index) => (
                    <View key={index} style={styles.exerciseItem}>
                      <View style={[styles.exerciseNumber, { backgroundColor: routine.color }]}>
                        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.exerciseText, { color: colors.textPrimary }]}>
                        {exercise}
                      </Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: routine.color }]}
                    onPress={() => handleStartRoutine(routine)}
                  >
                    <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.startButtonText}>Commencer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  introCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  routineIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  routineDescription: {
    fontSize: 13,
    marginBottom: 6,
  },
  routineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  exercisesList: {
    marginTop: -8,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  exerciseText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
