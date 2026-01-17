// ============================================
// 📸 CARTE PARTAGEABLE DE PROGRESSION
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ProgressChart } from './ProgressChart';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Trophy, Target, TrendingUp, TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const CARD_WIDTH = Dimensions.get('window').width - 32;

interface ShareableProgressCardProps {
  itemName: string;
  sport: string;
  chartData: { date: string; value: number }[];
  targetValue?: number;
  unit: string;
  type: 'weight' | 'time' | 'quality';
  practiceCount: number;
  currentValue: number;
  progressPercent: number;
}

export const ShareableProgressCard = React.forwardRef<View, ShareableProgressCardProps>(
  ({ itemName, sport, chartData, targetValue, unit, type, practiceCount, currentValue, progressPercent }, ref) => {
    const { colors } = useTheme();
    const { locale } = useI18n();

    // Calculer l'évolution
    const firstValue = chartData.length > 0 ? chartData[0].value : currentValue;
    const change = currentValue - firstValue;
    const changePercent = firstValue !== 0 ? ((change / firstValue) * 100).toFixed(1) : '0';
    const isImprovement = type === 'time' ? change < 0 : change > 0;

    return (
      <View ref={ref} style={[styles.card, { backgroundColor: colors.background }]}>
        {/* Header avec gradient */}
        <LinearGradient
          colors={[colors.accent, colors.accent + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.itemName}>{itemName}</Text>
              <Text style={styles.sport}>{sport}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Trophy size={20} color="#FFF" />
              <Text style={styles.badgeText}>{practiceCount}x</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={[styles.statsGrid, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Target size={20} color={colors.accentText} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Actuel</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {currentValue.toFixed(type === 'quality' ? 0 : 1)}{unit}
            </Text>
          </View>

          <View style={styles.statDivider} />

          {targetValue && (
            <>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                  <Trophy size={20} color={colors.accentText} />
                </View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Objectif</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {targetValue.toFixed(1)}{unit}
                </Text>
              </View>
              <View style={styles.statDivider} />
            </>
          )}

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: isImprovement ? '#10B98115' : '#EF444415' }]}>
              {isImprovement ? (
                <TrendingUp size={20} color="#10B981" />
              ) : (
                <TrendingDown size={20} color="#EF4444" />
              )}
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Évolution</Text>
            <Text
              style={[
                styles.statValue,
                { color: isImprovement ? '#10B981' : '#EF4444' },
              ]}
            >
              {change > 0 ? '+' : ''}{change.toFixed(1)}{unit}
            </Text>
          </View>
        </View>

        {/* Barre de progression */}
        {targetValue && (
          <View style={[styles.progressSection, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Progression
              </Text>
              <Text style={[styles.progressPercent, { color: colors.accentText }]}>
                {Math.min(100, progressPercent)}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: `${colors.accent}20` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${Math.min(100, progressPercent)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Graphique */}
        <View style={[styles.chartSection, { backgroundColor: colors.backgroundCard }]}>
          <ProgressChart
            data={chartData}
            targetValue={targetValue}
            unit={unit}
            type={type}
            color={colors.accent}
          />
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            📖 Yoroi - Carnet d'Entraînement
          </Text>
          <Text style={[styles.footerDate, { color: colors.textMuted }]}>
            {new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  sport: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 8,
  },
  progressSection: {
    padding: 16,
    paddingTop: 12,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  chartSection: {
    padding: 16,
    paddingTop: 8,
  },
  footer: {
    padding: 16,
    paddingTop: 12,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerDate: {
    fontSize: 10,
    fontWeight: '500',
  },
});
