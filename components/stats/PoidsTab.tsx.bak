import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getWeights, type Weight } from '@/lib/database';
import { PoidsStats } from './PoidsStats';
import logger from '@/lib/security/logger';

export default function PoidsTab() {
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
      setData(weights);
    } catch (error) {
      logger.error('Erreur chargement poids:', error);
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
        <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>⚖️</Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Aucune donnée de poids
        </Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Commence à enregistrer ton poids pour suivre ta progression
        </Text>
      </View>
    );
  }

  // Calculer le poids de départ (première entrée)
  const startWeight = data.length > 0 ? data[0].weight : undefined;
  // Pour l'objectif, on pourrait le récupérer des settings ou utiliser une valeur par défaut
  // Pour l'instant, on utilise une valeur approximative basée sur les données
  const targetWeight = startWeight ? startWeight - 5 : undefined;

  return <PoidsStats data={data} targetWeight={targetWeight} startWeight={startWeight} />;
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
