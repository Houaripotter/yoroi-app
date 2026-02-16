// ============================================
// PLANNING PAGE 1 - VUE SEMAINE
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { TimetableView } from '@/components/planning/TimetableView';
import { Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const CARD_PADDING = 16;

interface PlanningPage1WeekProps {
  weeklyTrainings?: any[];
}

export const PlanningPage1Week: React.FC<PlanningPage1WeekProps> = ({
  weeklyTrainings = [],
}) => {
  const { colors } = useTheme();

  const handleAddSession = (dayId: string, timeSlot?: string) => {
    router.push('/add-training');
  };

  const handleSessionPress = (dayId: string, sessionIndex: number) => {
    // Navigation vers le détail de la séance
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Ma Semaine
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Planning d'entraînement hebdomadaire
      </Text>

      {/* Indicateur de semaine */}
      <View style={[styles.weekCard, { backgroundColor: colors.backgroundCard }]}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weekIcon}
        >
          <Calendar size={20} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
        <View style={styles.weekInfo}>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
            Semaine actuelle
          </Text>
          <Text style={[styles.weekValue, { color: colors.textPrimary }]}>
            {weeklyTrainings.length} entraînements prévus
          </Text>
        </View>
      </View>

      {/* Emploi du temps */}
      <TimetableView
        onAddSession={handleAddSession}
        onSessionPress={handleSessionPress}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 250,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  weekIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekInfo: {
    flex: 1,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  weekValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
