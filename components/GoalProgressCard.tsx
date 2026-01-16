// ============================================
// YOROI - CARTE DE PROGRESSION DES OBJECTIFS
// ============================================
// Composant reutilisable pour afficher la progression des objectifs
// Peut etre utilise dans les cartes de partage social

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Target, TrendingUp, Flame, Check } from 'lucide-react-native';
import { GoalProgress, GlobalGoalStats } from '@/lib/trainingGoalsService';

interface GoalProgressCardProps {
  progress: GoalProgress[];
  globalStats: GlobalGoalStats;
  variant?: 'full' | 'compact' | 'mini';
  showYearlyStats?: boolean;
  colors: {
    background: string;
    backgroundLight: string;
    textPrimary: string;
    textMuted: string;
    accent: string;
    success: string;
    error: string;
    border: string;
  };
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  progress,
  globalStats,
  variant = 'full',
  showYearlyStats = true,
  colors,
}) => {
  const getStatusColor = (p: GoalProgress) => {
    if (p.weekPercent >= 100) return colors.success;
    if (p.isOnTrack) return colors.accent;
    return colors.error;
  };

  const getStatusEmoji = (p: GoalProgress) => {
    if (p.weekPercent >= 100) return '';
    if (p.isOnTrack) return '';
    return '';
  };

  // Variante Mini (pour les petites cartes)
  if (variant === 'mini') {
    return (
      <View style={[styles.miniContainer, { backgroundColor: colors.backgroundLight }]}>
        <View style={styles.miniHeader}>
          <Target size={14} color={colors.accent} />
          <Text style={[styles.miniTitle, { color: colors.textPrimary }]}>
            Objectifs
          </Text>
        </View>
        <View style={styles.miniStats}>
          <Text style={[styles.miniValue, { color: colors.textPrimary }]}>
            {globalStats.totalWeeklyCompleted}/{globalStats.totalWeeklyTarget}
          </Text>
          <Text style={[styles.miniLabel, { color: colors.textMuted }]}>
            cette semaine
          </Text>
        </View>
        <View style={[styles.miniProgress, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.miniProgressFill,
              {
                width: `${Math.min(100, globalStats.overallWeekPercent)}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  // Variante Compact
  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.backgroundLight }]}>
        <View style={styles.compactHeader}>
          <Target size={18} color={colors.accent} />
          <Text style={[styles.compactTitle, { color: colors.textPrimary }]}>
            Objectifs cette semaine
          </Text>
        </View>

        <View style={styles.compactProgressRow}>
          <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
            {globalStats.totalWeeklyCompleted}
          </Text>
          <Text style={[styles.compactSeparator, { color: colors.textMuted }]}>/</Text>
          <Text style={[styles.compactTotal, { color: colors.textMuted }]}>
            {globalStats.totalWeeklyTarget}
          </Text>
          <Text style={[styles.compactPercent, { color: colors.accent }]}>
            ({Math.round(globalStats.overallWeekPercent)}%)
          </Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, globalStats.overallWeekPercent)}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>

        {/* Mini badges sport */}
        <View style={styles.compactSports}>
          {progress.slice(0, 4).map((p) => (
            <View
              key={p.goal.sport_id}
              style={[styles.sportBadge, { backgroundColor: p.sport.color + '20' }]}
            >
              <MaterialCommunityIcons
                name={p.sport.icon as any}
                size={14}
                color={p.sport.color}
              />
              <Text style={[styles.sportBadgeText, { color: p.sport.color }]}>
                {p.weekCount}/{p.weekTarget}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Variante Full (par defaut)
  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
      <View style={styles.header}>
        <Target size={20} color={colors.accent} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Mes Objectifs
        </Text>
      </View>

      {/* Stats globales */}
      <View style={styles.globalSection}>
        <View style={styles.globalRow}>
          <View style={styles.globalStat}>
            <Text style={[styles.globalValue, { color: colors.textPrimary }]}>
              {globalStats.totalWeeklyCompleted}/{globalStats.totalWeeklyTarget}
            </Text>
            <Text style={[styles.globalLabel, { color: colors.textMuted }]}>
              cette semaine
            </Text>
          </View>
          <View style={[styles.globalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.globalStat}>
            <Text style={[styles.globalValue, { color: colors.success }]}>
              {globalStats.goalsOnTrack}
            </Text>
            <Text style={[styles.globalLabel, { color: colors.textMuted }]}>
              on track
            </Text>
          </View>
          {globalStats.goalsBehind > 0 && (
            <>
              <View style={[styles.globalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.globalStat}>
                <Text style={[styles.globalValue, { color: colors.error }]}>
                  {globalStats.goalsBehind}
                </Text>
                <Text style={[styles.globalLabel, { color: colors.textMuted }]}>
                  en retard
                </Text>
              </View>
            </>
          )}
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, globalStats.overallWeekPercent)}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>
      </View>

      {/* Liste des objectifs par sport */}
      <View style={styles.sportsList}>
        {progress.map((p) => (
          <View key={p.goal.sport_id} style={styles.sportRow}>
            <View style={styles.sportInfo}>
              <View
                style={[styles.sportIcon, { backgroundColor: p.sport.color + '20' }]}
              >
                <MaterialCommunityIcons
                  name={p.sport.icon as any}
                  size={20}
                  color={p.sport.color}
                />
              </View>
              <View style={styles.sportTexts}>
                <Text style={[styles.sportName, { color: colors.textPrimary }]}>
                  {p.sport.name}
                </Text>
                <Text style={[styles.sportTarget, { color: colors.textMuted }]}>
                  {p.weekTarget}x/sem
                </Text>
              </View>
            </View>

            <View style={styles.sportProgress}>
              <View style={styles.sportProgressRow}>
                <Text style={[styles.sportCount, { color: getStatusColor(p) }]}>
                  {p.weekCount}/{p.weekTarget}
                </Text>
                {p.weekPercent >= 100 && (
                  <Check size={16} color={colors.success} />
                )}
              </View>
              <View style={[styles.sportProgressBar, { backgroundColor: colors.background }]}>
                <View
                  style={[
                    styles.sportProgressFill,
                    {
                      width: `${Math.min(100, p.weekPercent)}%`,
                      backgroundColor: getStatusColor(p),
                    },
                  ]}
                />
              </View>
            </View>

            {showYearlyStats && (
              <View style={styles.yearlyStats}>
                <Text style={[styles.yearlyValue, { color: colors.textMuted }]}>
                  {p.yearCount}/{p.yearTarget}
                </Text>
                <Text style={[styles.yearlyLabel, { color: colors.textMuted }]}>
                  an
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

// Composant pour le texte de partage (sans UI)
export const formatGoalsForText = (
  progress: GoalProgress[],
  globalStats: GlobalGoalStats
): string => {
  if (progress.length === 0) return '';

  let text = `Mes objectifs cette semaine: ${globalStats.totalWeeklyCompleted}/${globalStats.totalWeeklyTarget}\n\n`;

  progress.forEach((p) => {
    const emoji = p.weekPercent >= 100 ? '' : p.isOnTrack ? '' : '';
    text += `${emoji} ${p.sport.name}: ${p.weekCount}/${p.weekTarget} (${Math.round(p.weekPercent)}%)\n`;
  });

  text += `\n${globalStats.goalsOnTrack}/${globalStats.activeGoals} objectifs on track`;

  return text;
};

const styles = StyleSheet.create({
  // Full variant
  container: {
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  globalSection: {
    marginBottom: 16,
  },
  globalRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  globalStat: {
    flex: 1,
    alignItems: 'center',
  },
  globalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  globalLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  globalDivider: {
    width: 1,
    marginVertical: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sportsList: {
    gap: 12,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportTexts: {
    flex: 1,
  },
  sportName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sportTarget: {
    fontSize: 11,
    marginTop: 1,
  },
  sportProgress: {
    width: 80,
    alignItems: 'flex-end',
  },
  sportProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sportCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  sportProgressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sportProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  yearlyStats: {
    width: 50,
    alignItems: 'flex-end',
  },
  yearlyValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  yearlyLabel: {
    fontSize: 9,
  },

  // Compact variant
  compactContainer: {
    borderRadius: 12,
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactProgressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  compactValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  compactSeparator: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  compactTotal: {
    fontSize: 20,
    fontWeight: '500',
  },
  compactPercent: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  compactSports: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Mini variant
  miniContainer: {
    borderRadius: 10,
    padding: 10,
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  miniTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniStats: {
    marginBottom: 6,
  },
  miniValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  miniLabel: {
    fontSize: 10,
  },
  miniProgress: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default GoalProgressCard;
