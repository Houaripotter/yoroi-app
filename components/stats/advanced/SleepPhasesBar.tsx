// ============================================
// SLEEP PHASES BAR - Style Yoroi
// Barre horizontale avec phases de sommeil colorées
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface SleepPhase {
  type: 'awake' | 'rem' | 'light' | 'deep';
  duration: number; // en minutes
}

interface SleepPhasesBarProps {
  phases: SleepPhase[];
  height?: number;
}

// Couleurs Yoroi pour les phases de sommeil
const PHASE_COLORS = {
  awake: '#FF0026',   // Rouge vif
  rem: '#00F19F',     // Teal/vert
  light: '#7BA1BB',   // Bleu-gris clair
  deep: '#0093E7',    // Bleu profond
};

const PHASE_LABELS = {
  awake: 'Éveils',
  rem: 'REM',
  light: 'Léger',
  deep: 'Profond',
};

export const SleepPhasesBar: React.FC<SleepPhasesBarProps> = ({
  phases,
  height = 60,
}) => {
  const { colors, isDark } = useTheme();

  const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);

  // Calculer les pourcentages
  const phasesWithPercentage = phases.map(phase => ({
    ...phase,
    percentage: (phase.duration / totalDuration) * 100,
  }));

  // Grouper les phases identiques consécutives
  const groupedPhases: Array<{ type: string; percentage: number; duration: number }> = [];
  phasesWithPercentage.forEach(phase => {
    const last = groupedPhases[groupedPhases.length - 1];
    if (last && last.type === phase.type) {
      last.percentage += phase.percentage;
      last.duration += phase.duration;
    } else {
      groupedPhases.push({ ...phase });
    }
  });

  return (
    <View style={styles.container}>
      {/* Barre des phases */}
      <View style={[styles.bar, { height }]}>
        {groupedPhases.map((phase, index) => (
          <View
            key={index}
            style={[
              styles.phaseSegment,
              {
                width: `${phase.percentage}%`,
                backgroundColor: PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS],
              },
            ]}
          />
        ))}
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        {Object.entries(PHASE_COLORS).map(([type, color]) => {
          const totalMinutes = phases
            .filter(p => p.type === type)
            .reduce((sum, p) => sum + p.duration, 0);

          if (totalMinutes === 0) return null;

          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const timeStr = hours > 0
            ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
            : `${minutes}m`;

          return (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>
                {PHASE_LABELS[type as keyof typeof PHASE_LABELS]}
              </Text>
              <Text style={[styles.legendValue, { color: colors.text }]}>
                {timeStr}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  phaseSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
