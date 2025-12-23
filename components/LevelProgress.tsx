// ============================================
// YOROI - COMPOSANT LEVEL PROGRESS
// ============================================
// Affiche le niveau et la progression de maniere claire

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getLevel, getLevelProgress, LEVELS } from '@/lib/gamification';
import { SPACING, RADIUS } from '@/constants/appTheme';

interface LevelProgressProps {
  points: number;
  compact?: boolean;
}

export const LevelProgress: React.FC<LevelProgressProps> = ({
  points,
  compact = false,
}) => {
  const { colors } = useTheme();
  const level = getLevel(points);
  const { progress, pointsToNext } = getLevelProgress(points);
  const nextLevel = LEVELS.find(l => l.level === level.level + 1);

  if (compact) {
    // Version compacte pour l'accueil
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <View style={styles.compactLeft}>
          <Text style={styles.levelIcon}>{level.icon}</Text>
          <View>
            <Text style={[styles.levelName, { color: colors.textPrimary }]}>
              {level.name}
            </Text>
            <Text style={[styles.levelPoints, { color: colors.textMuted }]}>
              {points} pts
            </Text>
          </View>
        </View>

        <View style={styles.compactRight}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: level.color,
                },
              ]}
            />
          </View>
          {pointsToNext > 0 && nextLevel && (
            <Text style={[styles.pointsToNext, { color: colors.textMuted }]}>
              {pointsToNext} pts pour {nextLevel.name}
            </Text>
          )}
          {pointsToNext === 0 && (
            <Text style={[styles.pointsToNext, { color: colors.accent }]}>
              Niveau max atteint !
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Version complete
  return (
    <View style={[styles.fullContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      {/* Avatar du niveau */}
      <View style={styles.avatarSection}>
        <View style={[styles.levelCircle, { borderColor: level.color, backgroundColor: `${level.color}20` }]}>
          <Text style={styles.levelEmoji}>{level.icon}</Text>
        </View>
        <Text style={[styles.levelNameFull, { color: colors.textPrimary }]}>
          {level.name}
        </Text>
        <Text style={[styles.levelNumber, { color: level.color }]}>
          Niveau {level.level}
        </Text>
      </View>

      {/* Progression */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.pointsText, { color: colors.textPrimary }]}>
            {points} points
          </Text>
          {pointsToNext > 0 && nextLevel && (
            <Text style={[styles.nextText, { color: colors.textMuted }]}>
              {pointsToNext} pts pour {nextLevel.name}
            </Text>
          )}
        </View>

        <View style={[styles.progressTrackFull, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFillFull,
              {
                width: `${progress}%`,
                backgroundColor: level.color,
              },
            ]}
          />
        </View>

        {/* Indicateurs de niveaux */}
        <View style={styles.levelsIndicator}>
          {LEVELS.map((l, index) => (
            <View
              key={l.level}
              style={[
                styles.levelDot,
                {
                  backgroundColor: points >= l.pointsRequired ? l.color : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Version compacte
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  levelIcon: {
    fontSize: 24,
  },
  compactRight: {
    flex: 1,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelPoints: {
    fontSize: 11,
    marginTop: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pointsToNext: {
    fontSize: 10,
    marginTop: 4,
  },

  // Version complete
  fullContainer: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  levelCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  levelEmoji: {
    fontSize: 36,
  },
  levelNameFull: {
    fontSize: 20,
    fontWeight: '800',
  },
  levelNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  progressSection: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nextText: {
    fontSize: 12,
  },
  progressTrackFull: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFillFull: {
    height: '100%',
    borderRadius: 5,
  },
  levelsIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default LevelProgress;
