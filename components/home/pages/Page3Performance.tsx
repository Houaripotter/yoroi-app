// ============================================
// PAGE 3 - PERFORMANCE (Analyse)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { HealthspanChart } from '@/components/HealthspanChart';
import { CheckCircle2, Circle } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;

interface Page3PerformanceProps {
  dailyChallenges?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
}

export const Page3Performance: React.FC<Page3PerformanceProps> = ({
  dailyChallenges = [
    { id: '1', title: 'Nuit Réparatrice', completed: true },
    { id: '2', title: 'Hydratation Complète', completed: false },
    { id: '3', title: 'Entraînement du Jour', completed: false },
  ],
}) => {
  const { colors, isDark } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Performance
      </Text>

      {/* CARD 1 - RADAR CHART */}
      <View style={[styles.radarCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Profil Athlète
        </Text>
        <View style={styles.radarContainer}>
          <PerformanceRadar size={240} />
        </View>
      </View>

      {/* CARD 2 - HEALTHSPAN */}
      <View style={[styles.healthspanCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Santé & Longévité
        </Text>
        <HealthspanChart />
      </View>

      {/* CARD 3 - DÉFIS DU JOUR */}
      <View style={[styles.challengesCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Défis du Jour
        </Text>

        <View style={styles.challengesList}>
          {dailyChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeRow}>
              {challenge.completed ? (
                <CheckCircle2 size={24} color="#10B981" strokeWidth={2.5} />
              ) : (
                <Circle size={24} color={colors.textMuted} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.challengeText,
                  {
                    color: challenge.completed ? colors.textSecondary : colors.textPrimary,
                    textDecorationLine: challenge.completed ? 'line-through' : 'none',
                  }
                ]}
              >
                {challenge.title}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            Progression
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(dailyChallenges.filter(c => c.completed).length / dailyChallenges.length) * 100}%`,
                  backgroundColor: '#10B981',
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textPrimary }]}>
            {dailyChallenges.filter(c => c.completed).length} / {dailyChallenges.length}
          </Text>
        </View>
      </View>
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
    paddingBottom: 120,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 20,
  },

  // Radar Card
  radarCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  radarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Healthspan Card
  healthspanCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },

  // Challenges Card
  challengesCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  challengesList: {
    gap: 16,
    marginBottom: 20,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  progressSection: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
});
