// ============================================
// PAGE 5 - REPORTS (Rapports & Calendrier)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StreakCalendar } from '@/components/StreakCalendar';
import { FileText, Share2, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;

interface WeeklyReport {
  weightChange?: number;
  trainingsCount?: number;
  avgSleepHours?: number;
  hydrationRate?: number;
  totalSteps?: number;
}

interface Page5ReportsProps {
  weeklyReport?: WeeklyReport;
  onShareReport?: () => void;
}

export const Page5Reports: React.FC<Page5ReportsProps> = ({
  weeklyReport,
  onShareReport,
}) => {
  const { colors, isDark } = useTheme();

  const getTrendIcon = (value: number) => {
    if (value > 0) return TrendingUp;
    if (value < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return '#94A3B8';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Rapports
      </Text>

      {/* CALENDRIER DE STREAK */}
      <View style={[styles.calendarCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Calendrier d'Entraînement
        </Text>
        <StreakCalendar />
      </View>

      {/* RAPPORT HEBDOMADAIRE */}
      {weeklyReport && (
        <View style={[styles.reportCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.reportHeader}>
            <View style={styles.reportTitleRow}>
              <FileText size={24} color={colors.accentText} strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Rapport Hebdomadaire
              </Text>
            </View>
            {onShareReport && (
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: `${colors.accent}15` }]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onShareReport();
                }}
                activeOpacity={0.7}
              >
                <Share2 size={18} color={isDark ? colors.accentText : '#000000'} strokeWidth={2} />
                <Text style={[styles.shareButtonText, { color: isDark ? colors.accent : '#000000', fontWeight: '700' }]}>
                  Partager
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.reportStats}>
            {/* Poids */}
            {weeklyReport.weightChange !== undefined && (
              <View style={styles.reportStat}>
                <View style={styles.reportStatHeader}>
                  <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                    Évolution Poids
                  </Text>
                  {(() => {
                    const TrendIcon = getTrendIcon(weeklyReport.weightChange);
                    const trendColor = getTrendColor(weeklyReport.weightChange);
                    return <TrendIcon size={16} color={trendColor} strokeWidth={2.5} />;
                  })()}
                </View>
                <Text
                  style={[
                    styles.reportStatValue,
                    { color: getTrendColor(weeklyReport.weightChange) }
                  ]}
                >
                  {weeklyReport.weightChange > 0 ? '+' : ''}
                  {weeklyReport.weightChange.toFixed(1)} kg
                </Text>
              </View>
            )}

            {/* Entraînements */}
            {weeklyReport.trainingsCount !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  Entraînements
                </Text>
                <Text style={[styles.reportStatValue, { color: isDark ? colors.accent : '#000000', fontWeight: '700' }]}>
                  {weeklyReport.trainingsCount}
                </Text>
              </View>
            )}

            {/* Sommeil moyen */}
            {weeklyReport.avgSleepHours !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  Sommeil Moyen
                </Text>
                <Text style={[styles.reportStatValue, { color: '#8B5CF6' }]}>
                  {weeklyReport.avgSleepHours.toFixed(1)}h
                </Text>
              </View>
            )}

            {/* Hydratation */}
            {weeklyReport.hydrationRate !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  Hydratation
                </Text>
                <Text style={[styles.reportStatValue, { color: '#3B82F6' }]}>
                  {weeklyReport.hydrationRate}%
                </Text>
              </View>
            )}

            {/* Pas */}
            {weeklyReport.totalSteps !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  Pas Totaux
                </Text>
                <Text style={[styles.reportStatValue, { color: '#10B981' }]}>
                  {weeklyReport.totalSteps.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
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

  // Calendar Card
  calendarCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },

  // Report Card
  reportCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reportStats: {
    gap: 16,
  },
  reportStat: {
    gap: 6,
  },
  reportStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportStatValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
