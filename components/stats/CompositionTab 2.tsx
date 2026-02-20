import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getWeights, type Weight } from '@/lib/database';
import { CompositionStats } from './CompositionStats';
import logger from '@/lib/security/logger';

export default function CompositionTab() {
  const { colors } = useTheme();
  const [data, setData] = useState<Weight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const weights = await getWeights();
      // Filtrer seulement les entrées avec des données de composition
      const withComposition = weights.filter(w =>
        w.fat_percent || w.muscle_percent || w.water_percent
      );
      setData(withComposition);
    } catch (error) {
      logger.error('Erreur chargement composition:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Chargement...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyIcon, { color: colors.textMuted }]}></Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Aucune donnée de composition
        </Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Utilise une balance impédancemètre pour mesurer ta composition corporelle
        </Text>
      </View>
    );
  }

  return <CompositionStats data={data} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
