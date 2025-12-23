import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Scale, Ruler, Dumbbell, Flame, Award, TrendingDown, TrendingUp } from 'lucide-react-native';
import { getSportName } from '@/lib/sports';

// ============================================
// WEEKLY SHARE CARD - FICHE INSTAGRAM
// ============================================
// Format Stories 1080x1920 (9:16)

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = CARD_WIDTH * (16 / 9);

export interface WeeklyStats {
  // Periode
  weekStart: string;
  weekEnd: string;
  // Poids
  currentWeight?: number;
  weightChange?: number;
  // Mensurations
  waist?: number;
  waistChange?: number;
  hips?: number;
  hipsChange?: number;
  // Entrainements
  totalWorkouts: number;
  workoutsByType: { [key: string]: number };
  // Streak & Rang
  streak: number;
  currentRank: string;
  previousRank?: string;
  rankUp?: boolean;
  // Composition
  bodyFat?: number;
  bodyFatChange?: number;
}

// Couleurs de fond disponibles
export const BACKGROUND_COLORS = [
  { id: 'dark', name: 'Noir', colors: ['#0F0F0F', '#1A1A1A', '#0F0F0F'] as const },
  { id: 'gold', name: 'Or', colors: ['#1A1510', '#2D2215', '#1A1510'] as const },
  { id: 'blue', name: 'Bleu', colors: ['#0A1628', '#152238', '#0A1628'] as const },
  { id: 'purple', name: 'Violet', colors: ['#1A0F28', '#2D1548', '#1A0F28'] as const },
  { id: 'green', name: 'Vert', colors: ['#0A1A14', '#15382D', '#0A1A14'] as const },
  { id: 'red', name: 'Rouge', colors: ['#1A0F0F', '#2D1515', '#1A0F0F'] as const },
  { id: 'ocean', name: 'Ocean', colors: ['#0F1A1A', '#153838', '#0F1A1A'] as const },
  { id: 'sunset', name: 'Coucher', colors: ['#1A120F', '#382515', '#1A120F'] as const },
];

interface WeeklyShareCardProps {
  stats: WeeklyStats;
  username?: string;
  backgroundId?: string;
}

export const WeeklyShareCard = forwardRef<View, WeeklyShareCardProps>(
  ({ stats, username, backgroundId = 'dark' }, ref) => {
    // Obtenir les couleurs du fond sélectionné
    const selectedBg = BACKGROUND_COLORS.find(bg => bg.id === backgroundId) || BACKGROUND_COLORS[0];
    const gradientColors = selectedBg.colors;

    const formatChange = (value?: number, suffix = '') => {
      if (value === undefined || value === 0) return null;
      const sign = value > 0 ? '+' : '';
      return `${sign}${value.toFixed(1)}${suffix}`;
    };

    const getWorkoutsSummary = () => {
      const entries = Object.entries(stats.workoutsByType);
      if (entries.length === 0) return null;
      return entries.map(([type, count]) => {
        const label = getSportName(type);
        return `${label}: ${count}`;
      }).join('  |  ');
    };

    return (
      <View ref={ref} style={styles.container} collapsable={false}>
        <LinearGradient
          colors={[...gradientColors]}
          style={styles.gradient}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.logo}>YOROI</Text>
            <Text style={styles.subtitle}>Ma semaine du {stats.weekStart} au {stats.weekEnd}</Text>
            {username && <Text style={styles.username}>@{username}</Text>}
          </View>

          {/* SEPARATOR GOLD */}
          <View style={styles.goldSeparator} />

          {/* CONTENT */}
          <View style={styles.content}>
            {/* POIDS */}
            {stats.currentWeight && (
              <View style={styles.statBlock}>
                <View style={styles.statHeader}>
                  <Scale size={24} color="#D4AF37" />
                  <Text style={styles.statTitle}>POIDS</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statValue}>{stats.currentWeight.toFixed(1)} kg</Text>
                  {stats.weightChange !== undefined && stats.weightChange !== 0 && (
                    <View style={[
                      styles.changeBadge,
                      { backgroundColor: stats.weightChange < 0 ? '#10B98120' : '#EF444420' }
                    ]}>
                      {stats.weightChange < 0 ? (
                        <TrendingDown size={14} color="#10B981" />
                      ) : (
                        <TrendingUp size={14} color="#EF4444" />
                      )}
                      <Text style={[
                        styles.changeText,
                        { color: stats.weightChange < 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {formatChange(stats.weightChange, ' kg')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* COMPOSITION */}
            {stats.bodyFat && (
              <View style={styles.statBlock}>
                <View style={styles.statHeader}>
                  <Flame size={24} color="#F59E0B" />
                  <Text style={styles.statTitle}>GRAISSE</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statValue}>{stats.bodyFat.toFixed(1)}%</Text>
                  {stats.bodyFatChange !== undefined && stats.bodyFatChange !== 0 && (
                    <View style={[
                      styles.changeBadge,
                      { backgroundColor: stats.bodyFatChange < 0 ? '#10B98120' : '#EF444420' }
                    ]}>
                      <Text style={[
                        styles.changeText,
                        { color: stats.bodyFatChange < 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {formatChange(stats.bodyFatChange, '%')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* MENSURATIONS */}
            {(stats.waist || stats.hips) && (
              <View style={styles.statBlock}>
                <View style={styles.statHeader}>
                  <Ruler size={24} color="#8B5CF6" />
                  <Text style={styles.statTitle}>MENSURATIONS</Text>
                </View>
                <View style={styles.measurementsRow}>
                  {stats.waist && (
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>Taille</Text>
                      <Text style={styles.measurementValue}>{stats.waist} cm</Text>
                      {stats.waistChange !== undefined && stats.waistChange !== 0 && (
                        <Text style={[
                          styles.measurementChange,
                          { color: stats.waistChange < 0 ? '#10B981' : '#EF4444' }
                        ]}>
                          {formatChange(stats.waistChange, ' cm')}
                        </Text>
                      )}
                    </View>
                  )}
                  {stats.hips && (
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>Hanches</Text>
                      <Text style={styles.measurementValue}>{stats.hips} cm</Text>
                      {stats.hipsChange !== undefined && stats.hipsChange !== 0 && (
                        <Text style={[
                          styles.measurementChange,
                          { color: stats.hipsChange < 0 ? '#10B981' : '#EF4444' }
                        ]}>
                          {formatChange(stats.hipsChange, ' cm')}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ENTRAINEMENTS */}
            <View style={styles.statBlock}>
              <View style={styles.statHeader}>
                <Dumbbell size={24} color="#3B82F6" />
                <Text style={styles.statTitle}>ENTRAINEMENTS</Text>
              </View>
              <Text style={styles.workoutsCount}>{stats.totalWorkouts} sessions</Text>
              {getWorkoutsSummary() && (
                <Text style={styles.workoutsSummary}>{getWorkoutsSummary()}</Text>
              )}
            </View>

            {/* STREAK */}
            {stats.streak > 0 && (
              <View style={styles.streakBlock}>
                <Flame size={28} color="#F59E0B" />
                <Text style={styles.streakValue}>{stats.streak}</Text>
                <Text style={styles.streakLabel}>jours consecutifs</Text>
              </View>
            )}

            {/* RANG */}
            <View style={styles.rankBlock}>
              <Award size={28} color="#D4AF37" />
              <View style={styles.rankInfo}>
                {stats.rankUp && stats.previousRank ? (
                  <>
                    <Text style={styles.rankUpText}>
                      {stats.previousRank} → {stats.currentRank}
                    </Text>
                    <Text style={styles.rankUpLabel}>PROMOTION !</Text>
                  </>
                ) : (
                  <Text style={styles.rankText}>{stats.currentRank}</Text>
                )}
              </View>
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.goldSeparator} />
            <Text style={styles.footerText}>Telecharge Yoroi sur l'App Store</Text>
            <Text style={styles.footerHandle}>@yoroi.app</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: 24,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  username: {
    fontSize: 13,
    color: '#D4AF37',
    marginTop: 4,
  },
  goldSeparator: {
    height: 2,
    backgroundColor: '#D4AF37',
    marginVertical: 16,
    opacity: 0.5,
  },
  // Content
  content: {
    flex: 1,
    gap: 16,
  },
  statBlock: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Measurements
  measurementsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  measurementItem: {
    flex: 1,
  },
  measurementLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  measurementValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  measurementChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // Workouts
  workoutsCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  workoutsSummary: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  // Streak
  streakBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F59E0B',
  },
  streakLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  // Rank
  rankBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  rankInfo: {
    alignItems: 'center',
  },
  rankText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D4AF37',
  },
  rankUpText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4AF37',
  },
  rankUpLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  footerHandle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
    marginTop: 4,
  },
});

export default WeeklyShareCard;
