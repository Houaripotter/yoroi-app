import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Weight } from '@/lib/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompositionStatsProps {
  data: Weight[];
}

export const CompositionStats: React.FC<CompositionStatsProps> = ({ data }) => {
  const { colors } = useTheme();

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const previous = data.length > 1 ? data[data.length - 2] : null;

  const getChange = (current: number | undefined, prev: number | undefined): string => {
    if (!current || !prev) return '';
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  };

  const categories = [
    {
      key: 'fat_percent',
      label: 'Graisse',
      color: '#FF6B6B',
      value: latest?.fat_percent,
      change: getChange(latest?.fat_percent, previous?.fat_percent),
      isGoodWhenLow: true,
    },
    {
      key: 'muscle_percent',
      label: 'Muscle',
      color: '#4ECDC4',
      value: latest?.muscle_percent,
      change: getChange(latest?.muscle_percent, previous?.muscle_percent),
      isGoodWhenLow: false,
    },
    {
      key: 'water_percent',
      label: 'Eau',
      color: '#45B7D1',
      value: latest?.water_percent,
      change: getChange(latest?.water_percent, previous?.water_percent),
      isGoodWhenLow: false,
    },
    {
      key: 'bone_mass',
      label: 'Os',
      color: '#A78BFA',
      value: latest?.bone_mass,
      change: '',
      unit: 'kg',
      isGoodWhenLow: false,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Graphique circulaire simplifié */}
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundElevated }]}>
        <View style={styles.circleChart}>
          {categories.slice(0, 3).map((cat) => (
            <View key={cat.key} style={styles.circleItem}>
              <View style={[styles.circleOuter, { borderColor: colors.border }]}>
                <View
                  style={[
                    styles.circleInner,
                    {
                      backgroundColor: cat.color,
                      transform: [{ scale: (cat.value || 0) / 100 + 0.3 }],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.circleValue, { color: colors.textPrimary }]}>
                {cat.value ? `${cat.value.toFixed(1)}%` : '--%'}
              </Text>
              <Text style={[styles.circleLabel, { color: colors.textMuted }]}>
                {cat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Détails */}
      <View style={[styles.detailsCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>
          Détails
        </Text>

        {categories.map((cat) => (
          <View key={cat.key} style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <View style={[styles.detailDot, { backgroundColor: cat.color }]} />
              <Text style={[styles.detailLabel, { color: colors.textPrimary }]}>
                {cat.label}
              </Text>
            </View>
            <View style={styles.detailRight}>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {cat.value ? `${cat.value.toFixed(1)}${cat.unit || '%'}` : '--'}
              </Text>
              {cat.change && (
                <Text style={[
                  styles.detailChange,
                  {
                    color: cat.change.startsWith('+')
                      ? (cat.isGoodWhenLow ? '#E53935' : '#4CAF50')
                      : (cat.isGoodWhenLow ? '#4CAF50' : '#E53935'),
                  },
                ]}>
                  {cat.change}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Historique */}
      <View style={[styles.historyCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
          Historique
        </Text>

        {data.slice(-5).reverse().map((entry, index) => (
          <View
            key={index}
            style={[
              styles.historyItem,
              index < Math.min(data.length, 5) - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
              {format(new Date(entry.date), 'd MMM', { locale: fr })}
            </Text>
            <View style={styles.historyValues}>
              <Text style={[styles.historyValue, { color: '#FF6B6B' }]}>
                G:{entry.fat_percent?.toFixed(1) || '--'}%
              </Text>
              <Text style={[styles.historyValue, { color: '#4ECDC4' }]}>
                M:{entry.muscle_percent?.toFixed(1) || '--'}%
              </Text>
              <Text style={[styles.historyValue, { color: '#45B7D1' }]}>
                E:{entry.water_percent?.toFixed(1) || '--'}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Circle chart
  chartCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  circleChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  circleItem: {
    alignItems: 'center',
  },
  circleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  circleValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  circleLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Details
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  detailLabel: {
    fontSize: 15,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailChange: {
    fontSize: 13,
    fontWeight: '600',
  },

  // History
  historyCard: {
    borderRadius: 16,
    padding: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyDate: {
    fontSize: 14,
  },
  historyValues: {
    flexDirection: 'row',
    gap: 12,
  },
  historyValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
