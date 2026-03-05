import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

interface EssentielActivityCardProps {
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  distance?: number;
  heartRate?: { resting: number; average: number; min: number; max: number } | null;
  spo2?: number;
  respiratoryRate?: number;
  vo2Max?: number;
}

type MetricDef = {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
  value: string;
  unit: string;
  route?: string;
};

export const EssentielActivityCard: React.FC<EssentielActivityCardProps> = ({
  steps,
  stepsGoal,
  calories,
  distance,
  heartRate,
  spo2,
  respiratoryRate,
  vo2Max,
}) => {
  const { colors } = useTheme();

  const metrics: MetricDef[] = [];

  if (steps != null && steps > 0) {
    metrics.push({
      key: 'steps',
      icon: 'walk',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      value: steps.toLocaleString(),
      unit: 'pas',
      route: '/activity-history?tab=steps',
    });
  }

  if (calories != null && calories > 0) {
    metrics.push({
      key: 'calories',
      icon: 'fire',
      color: '#F97316',
      bgColor: '#FEF3C7',
      value: String(calories),
      unit: 'kcal',
      route: '/activity-history?tab=calories',
    });
  }

  if (distance != null && distance > 0) {
    metrics.push({
      key: 'distance',
      icon: 'map-marker-distance',
      color: '#10B981',
      bgColor: '#D1FAE5',
      value: distance.toFixed(1),
      unit: 'km',
    });
  }

  if (heartRate?.resting && heartRate.resting > 0) {
    metrics.push({
      key: 'heartRate',
      icon: 'heart-pulse',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      value: String(Math.round(heartRate.resting)),
      unit: 'bpm repos',
    });
  }

  if (spo2 != null && spo2 > 0) {
    metrics.push({
      key: 'spo2',
      icon: 'water',
      color: '#0EA5E9',
      bgColor: '#E0F2FE',
      value: String(Math.round(spo2)),
      unit: '% SpO2',
    });
  }

  if (vo2Max != null && vo2Max > 0) {
    metrics.push({
      key: 'vo2max',
      icon: 'lightning-bolt',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      value: vo2Max.toFixed(1),
      unit: 'ml/kg/min',
    });
  }

  if (respiratoryRate != null && respiratoryRate > 0) {
    metrics.push({
      key: 'resp',
      icon: 'lungs',
      color: '#14B8A6',
      bgColor: '#CCFBF1',
      value: String(Math.round(respiratoryRate)),
      unit: 'resp/min',
    });
  }

  if (metrics.length === 0) return null;

  const stepsPercentage = stepsGoal && steps != null ? Math.min((steps / stepsGoal) * 100, 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="heart-pulse" size={16} color="#F97316" />
        <Text style={styles.title}>SANTE & ACTIVITE</Text>
      </View>

      {/* Grille de métriques */}
      <View style={styles.metricsGrid}>
        {metrics.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={styles.metricItem}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              if (m.route) router.push(m.route as any);
            }}
            activeOpacity={m.route ? 0.7 : 1}
            disabled={!m.route}
          >
            <View style={[styles.metricIcon, { backgroundColor: m.bgColor }]}>
              <MaterialCommunityIcons name={m.icon as any} size={18} color={m.color} />
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{m.value}</Text>
            <Text style={[styles.metricUnit, { color: colors.textMuted }]}>{m.unit}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Barre de progression des pas */}
      {stepsPercentage > 0 && (
        <View style={[styles.progressSection, { borderTopColor: colors.border }]}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${stepsPercentage}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {Math.round(stepsPercentage)}% objectif pas
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F97316',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  metricItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '500',
  },
  progressSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
});
