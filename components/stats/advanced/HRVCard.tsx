// ============================================
// HRV CARD - Style Yoroi
// Carte HRV avec comparaison à la baseline et indicateur de statut
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { CheckCircle, AlertCircle, Activity } from 'lucide-react-native';

interface HRVCardProps {
  currentHRV: number;
  baselineHRV: number;
  showIcon?: boolean;
}

export const HRVCard: React.FC<HRVCardProps> = ({
  currentHRV,
  baselineHRV,
  showIcon = true,
}) => {
  const { colors, isDark } = useTheme();

  // Calculer la différence par rapport à la baseline
  const difference = currentHRV - baselineHRV;
  const percentDiff = ((difference / baselineHRV) * 100).toFixed(1);

  // Déterminer le statut (normal si dans ±15% de la baseline)
  const getStatus = () => {
    const threshold = baselineHRV * 0.15;
    if (Math.abs(difference) <= threshold) {
      return {
        type: 'normal' as const,
        label: 'Dans la plage normale',
        color: '#00F19F',
        Icon: CheckCircle,
      };
    } else {
      return {
        type: 'warning' as const,
        label: 'En dehors de la plage typique',
        color: '#FFDE00',
        Icon: AlertCircle,
      };
    }
  };

  const status = getStatus();

  return (
    <View style={[styles.container, {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Activity size={20} color={status.color} strokeWidth={2.5} />
          <Text style={[styles.title, { color: colors.text }]}>HRV</Text>
        </View>
        {showIcon && (
          <status.Icon size={24} color={status.color} strokeWidth={2} />
        )}
      </View>

      {/* Valeur principale */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: status.color }]}>
          {currentHRV}
        </Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>ms</Text>
      </View>

      {/* Comparaison baseline */}
      <View style={styles.comparisonContainer}>
        <View style={styles.baselineRow}>
          <Text style={[styles.baselineLabel, { color: colors.textMuted }]}>
            Baseline
          </Text>
          <Text style={[styles.baselineValue, { color: colors.textSecondary }]}>
            {baselineHRV} ms
          </Text>
        </View>

        <View style={styles.diffRow}>
          <Text style={[styles.diffValue, {
            color: difference >= 0 ? '#00F19F' : '#FF0026'
          }]}>
            {difference >= 0 ? '+' : ''}{difference.toFixed(0)} ms
          </Text>
          <Text style={[styles.diffPercent, { color: colors.textMuted }]}>
            ({percentDiff}%)
          </Text>
        </View>
      </View>

      {/* Statut */}
      <View style={[styles.statusBadge, {
        backgroundColor: status.color + '20',
        borderColor: status.color + '40',
      }]}>
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 18,
    fontWeight: '600',
  },
  comparisonContainer: {
    gap: 8,
  },
  baselineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  baselineLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  baselineValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  diffValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  diffPercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
