import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getMeasurements, getLatestMeasurement } from '@/lib/database';
import { Ruler } from 'lucide-react-native';
import logger from '@/lib/security/logger';

export default function MesuresTab() {
  const { colors } = useTheme();
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    try {
      const latest = await getLatestMeasurement();
      setLatestMeasurement(latest);
    } catch (error) {
      logger.error('Erreur chargement mesures:', error);
    }
  };

  const renderMeasurement = (label: string, value: number | null | undefined, icon: string) => {
    if (value === null || value === undefined) return null;

    return (
      <View style={[styles.measurementRow, { borderBottomColor: colors.border }]}>
        <View style={styles.measurementLeft}>
          <Text style={styles.measurementIcon}>{icon}</Text>
          <Text style={[styles.measurementLabel, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <Text style={[styles.measurementValue, { color: colors.accent }]}>
          {value.toFixed(1)} cm
        </Text>
      </View>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Ruler size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Mesures Corporelles</Text>
        </View>

        {latestMeasurement ? (
          <>
            <View style={styles.measurementsContainer}>
              {renderMeasurement('Tour de Poitrine', latestMeasurement.chest, '💪')}
              {renderMeasurement('Tour de Taille', latestMeasurement.waist, '⚖️')}
              {renderMeasurement('Tour de Hanches', latestMeasurement.hips, '🍑')}
              {renderMeasurement('Épaules', latestMeasurement.shoulders, '💪')}
              {renderMeasurement('Cou', latestMeasurement.neck, '👔')}
              {renderMeasurement('Bras Gauche', latestMeasurement.left_arm, '💪')}
              {renderMeasurement('Bras Droit', latestMeasurement.right_arm, '💪')}
              {renderMeasurement('Cuisse Gauche', latestMeasurement.left_thigh, '🦵')}
              {renderMeasurement('Cuisse Droite', latestMeasurement.right_thigh, '🦵')}
              {renderMeasurement('Mollet Gauche', latestMeasurement.left_calf, '🦵')}
              {renderMeasurement('Mollet Droit', latestMeasurement.right_calf, '🦵')}
            </View>

            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              Dernière mesure le {new Date(latestMeasurement.date).toLocaleDateString('fr-FR')}
            </Text>

            {/* Info box */}
            <View style={[styles.infoBox, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.infoIcon}>📏</Text>
              <Text style={styles.infoText}>
                Mesure-toi toujours au même moment de la journée (idéalement le matin)
                pour un suivi cohérent de ton évolution.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>📏</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Aucune mesure enregistrée
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Ajoute tes premières mesures corporelles pour suivre ton évolution
              (tour de taille, bras, cuisses, etc.)
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
  measurementsContainer: {
    marginBottom: 16,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  measurementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  measurementIcon: {
    fontSize: 20,
  },
  measurementLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
