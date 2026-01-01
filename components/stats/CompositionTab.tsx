import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getCompositionHistory } from '@/lib/database';
import { Activity } from 'lucide-react-native';
import logger from '@/lib/security/logger';

export default function CompositionTab() {
  const { colors } = useTheme();
  const [compositionData, setCompositionData] = useState<any[]>([]);
  const [latestData, setLatestData] = useState<any>(null);

  useEffect(() => {
    loadCompositionData();
  }, []);

  const loadCompositionData = async () => {
    try {
      const data = await getCompositionHistory(30);
      setCompositionData(data);
      if (data.length > 0) {
        setLatestData(data[0]);
      }
    } catch (error) {
      logger.error('Erreur chargement composition:', error);
    }
  };

  const renderMetric = (label: string, value: number | null | undefined, unit: string, color: string) => {
    if (value === null || value === undefined) return null;

    return (
      <View style={[styles.metricCard, { backgroundColor: colors.background }]}>
        <View style={styles.metricHeader}>
          <View style={[styles.metricDot, { backgroundColor: color }]} />
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
        <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
          {value.toFixed(1)}
          <Text style={[styles.metricUnit, { color: colors.textMuted }]}> {unit}</Text>
        </Text>
      </View>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Activity size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Composition Corporelle</Text>
        </View>

        {latestData ? (
          <>
            <View style={styles.metricsGrid}>
              {renderMetric('Masse Grasse', latestData.fat_percent, '%', '#EF4444')}
              {renderMetric('Masse Musculaire', latestData.muscle_percent, '%', '#10B981')}
              {renderMetric('Eau', latestData.water_percent, '%', '#3B82F6')}
              {renderMetric('Masse Osseuse', latestData.bone_mass, 'kg', '#6B7280')}
            </View>

            {latestData.visceral_fat !== null && latestData.visceral_fat !== undefined && (
              <View style={[styles.additionalMetrics, { backgroundColor: colors.background }]}>
                <View style={styles.additionalMetricRow}>
                  <Text style={[styles.additionalLabel, { color: colors.textSecondary }]}>
                    Graisse Viscérale
                  </Text>
                  <Text style={[styles.additionalValue, { color: colors.textPrimary }]}>
                    {latestData.visceral_fat}
                  </Text>
                </View>
                {latestData.metabolic_age !== null && latestData.metabolic_age !== undefined && (
                  <View style={styles.additionalMetricRow}>
                    <Text style={[styles.additionalLabel, { color: colors.textSecondary }]}>
                      Âge Métabolique
                    </Text>
                    <Text style={[styles.additionalValue, { color: colors.textPrimary }]}>
                      {latestData.metabolic_age} ans
                    </Text>
                  </View>
                )}
                {latestData.bmr !== null && latestData.bmr !== undefined && (
                  <View style={styles.additionalMetricRow}>
                    <Text style={[styles.additionalLabel, { color: colors.textSecondary }]}>
                      Métabolisme de Base
                    </Text>
                    <Text style={[styles.additionalValue, { color: colors.textPrimary }]}>
                      {latestData.bmr} kcal
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              Dernière mesure le {new Date(latestData.date).toLocaleDateString('fr-FR')}
            </Text>

            {/* Info box */}
            <View style={[styles.infoBox, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Pour suivre l'évolution de ta composition corporelle, pèse-toi régulièrement
                avec une balance impédancemètre.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Aucune donnée de composition
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Utilise une balance impédancemètre pour mesurer ta composition corporelle
              (masse grasse, masse musculaire, etc.)
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  additionalMetrics: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  additionalMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  additionalLabel: {
    fontSize: 14,
  },
  additionalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
