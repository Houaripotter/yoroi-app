import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Scale, Target } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface WeightCompositionCardProps {
  currentWeight: number | null;
  targetWeight: number | null;
  startWeight?: number | null;  // Poids de départ
  bodyFat: number | null;
  muscle: number | null;
  water: number | null;
  boneMass?: number | null;  // 4ème élément optionnel
}

export const WeightCompositionCard: React.FC<WeightCompositionCardProps> = ({
  currentWeight,
  targetWeight,
  startWeight,
  bodyFat,
  muscle,
  water,
  boneMass,
}) => {
  const { colors } = useTheme();

  const remaining = currentWeight && targetWeight
    ? Math.max(0, currentWeight - targetWeight)
    : null;

  const weightLost = currentWeight && startWeight
    ? Math.max(0, startWeight - currentWeight)
    : null;

  const progress = currentWeight && targetWeight
    ? Math.min(100, Math.max(0, ((currentWeight - targetWeight) / currentWeight) * 100))
    : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
      {/* Poids actuel */}
      <View style={styles.weightSection}>
        <View style={styles.weightHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
            <Scale size={20} color={colors.accent} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            POIDS ACTUEL
          </Text>
        </View>

        <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
          {currentWeight ? `${currentWeight} kg` : '-- kg'}
        </Text>

        {/* 3 indicateurs : Départ, Perdu, Restant */}
        <View style={styles.indicatorsRow}>
          <View style={styles.indicatorBox}>
            <Text style={[styles.indicatorValue, { color: colors.textSecondary }]}>
              {startWeight ? `${startWeight} kg` : '-- kg'}
            </Text>
            <Text style={[styles.indicatorLabel, { color: colors.textMuted }]}>
              Départ
            </Text>
          </View>
          <View style={[styles.indicatorBox, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.indicatorValue, { color: colors.success }]}>
              {weightLost !== null ? `-${weightLost.toFixed(1)} kg` : '-- kg'}
            </Text>
            <Text style={[styles.indicatorLabel, { color: colors.success }]}>
              Perdu
            </Text>
          </View>
          <View style={[styles.indicatorBox, { backgroundColor: colors.accentMuted }]}>
            <Text style={[styles.indicatorValue, { color: colors.accent }]}>
              {remaining !== null ? `${remaining.toFixed(1)} kg` : '-- kg'}
            </Text>
            <Text style={[styles.indicatorLabel, { color: colors.accent }]}>
              Restant
            </Text>
          </View>
        </View>

        {/* Objectif */}
        {targetWeight && (
          <View style={styles.goalRow}>
            <View style={styles.goalInfo}>
              <Target size={14} color={colors.textMuted} />
              <Text style={[styles.goalText, { color: colors.textMuted }]}>
                Objectif : {targetWeight} kg
              </Text>
            </View>
          </View>
        )}

        {/* Progress bar */}
        {targetWeight && (
          <View style={[styles.progressTrack, { backgroundColor: colors.backgroundLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${100 - progress}%`,
                  backgroundColor: colors.accent,
                }
              ]}
            />
          </View>
        )}
      </View>

      {/* Séparateur */}
      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      {/* Composition corporelle - 4 éléments avec espacement */}
      <View style={styles.compositionSection}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          COMPOSITION CORPORELLE
        </Text>

        <View style={styles.compositionGrid}>
          {/* Graisse */}
          <View style={styles.compositionItem}>
            <View style={[styles.compoDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={[styles.compoValue, { color: colors.textPrimary }]}>
              {bodyFat !== null ? `${bodyFat}%` : '--%'}
            </Text>
            <Text style={[styles.compoLabel, { color: colors.textMuted }]}>
              Graisse
            </Text>
          </View>

          {/* Muscle */}
          <View style={styles.compositionItem}>
            <View style={[styles.compoDot, { backgroundColor: '#4ECDC4' }]} />
            <Text style={[styles.compoValue, { color: colors.textPrimary }]}>
              {muscle !== null ? `${muscle}%` : '--%'}
            </Text>
            <Text style={[styles.compoLabel, { color: colors.textMuted }]}>
              Muscle
            </Text>
          </View>

          {/* Eau */}
          <View style={styles.compositionItem}>
            <View style={[styles.compoDot, { backgroundColor: '#45B7D1' }]} />
            <Text style={[styles.compoValue, { color: colors.textPrimary }]}>
              {water !== null ? `${water}%` : '--%'}
            </Text>
            <Text style={[styles.compoLabel, { color: colors.textMuted }]}>
              Eau
            </Text>
          </View>

          {/* 4ème élément : Masse osseuse */}
          <View style={styles.compositionItem}>
            <View style={[styles.compoDot, { backgroundColor: '#A78BFA' }]} />
            <Text style={[styles.compoValue, { color: colors.textPrimary }]}>
              {boneMass !== null ? `${boneMass} kg` : '-- kg'}
            </Text>
            <Text style={[styles.compoLabel, { color: colors.textMuted }]}>
              Os
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  weightSection: {
    marginBottom: 16,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  weightValue: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 12,
  },
  indicatorsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  indicatorBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  indicatorValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  indicatorLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalText: {
    fontSize: 13,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  compositionSection: {},
  compositionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',  // ← Espacement automatique
    marginTop: 12,
  },
  compositionItem: {
    alignItems: 'center',
    flex: 1,  // ← Chaque item prend la même largeur
  },
  compoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  compoValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  compoLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
