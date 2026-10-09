// ============================================
// TECHNIQUE HEATMAP
// Matrice visuelle des techniques : chaque ligne = une méthode (triangle,
// armbar, etc.), colonnes "Données" vs "Reçues" avec intensité de couleur.
// Permet de voir d'un coup d'œil tes forces/faiblesses techniques.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Swords, Shield } from 'lucide-react-native';
import { SPARRING_COLORS } from '@/constants/sparringDesignSystem';

interface MethodRow {
  method: string;
  given: number;
  taken: number;
}

interface TechniqueHeatmapProps {
  methods: MethodRow[];
  /** Max d'items affichés (défaut 10) */
  maxItems?: number;
  /** Couleur "donné" (défaut vert) */
  givenColor?: string;
  /** Couleur "reçu" (défaut rouge) */
  takenColor?: string;
}

const TechniqueHeatmapInner: React.FC<TechniqueHeatmapProps> = ({
  methods,
  maxItems = 10,
  givenColor = SPARRING_COLORS.win,
  takenColor = SPARRING_COLORS.loss,
}) => {
  const { colors, isDark, themeColor } = useTheme();

  const { rows, maxCount } = useMemo(() => {
    const sorted = [...methods].sort((a, b) => (b.given + b.taken) - (a.given + a.taken));
    const top = sorted.slice(0, maxItems);
    const max = Math.max(1, ...top.map(r => Math.max(r.given, r.taken)));
    return { rows: top, maxCount: max };
  }, [methods, maxItems]);

  if (rows.length === 0) return null;

  const opacityFor = (count: number) => {
    if (count === 0) return 0.08;
    const ratio = count / maxCount;
    return 0.25 + ratio * 0.75; // 0.25 → 1.0
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Techniques · données vs reçues
        </Text>
      </View>

      {/* En-têtes colonnes */}
      <View style={styles.columnsHeader}>
        <View style={styles.methodCol} />
        <View style={styles.countHeader}>
          <Swords size={12} color={givenColor} strokeWidth={2.5} />
          <Text style={[styles.colHeaderText, { color: givenColor }]}>Données</Text>
        </View>
        <View style={styles.countHeader}>
          <Shield size={12} color={takenColor} strokeWidth={2.5} />
          <Text style={[styles.colHeaderText, { color: takenColor }]}>Reçues</Text>
        </View>
      </View>

      <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
        {rows.map((row, i) => (
          <View key={row.method} style={[styles.row, i === 0 && { marginTop: 4 }]}>
            <Text style={[styles.methodName, { color: colors.textPrimary }]} numberOfLines={1}>
              {row.method}
            </Text>
            <View
              style={[
                styles.countBox,
                { backgroundColor: givenColor, opacity: opacityFor(row.given) },
              ]}
            >
              <Text style={[
                styles.countText,
                { color: (themeColor === 'blanc' && row.given === 0) ? colors.textMuted : '#FFFFFF' },
              ]}>{row.given}</Text>
            </View>
            <View
              style={[
                styles.countBox,
                { backgroundColor: takenColor, opacity: opacityFor(row.taken) },
              ]}
            >
              <Text style={[
                styles.countText,
                { color: (themeColor === 'blanc' && row.taken === 0) ? colors.textMuted : '#FFFFFF' },
              ]}>{row.taken}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Légende */}
      <View style={[styles.legend, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>
          Intensité de la couleur = fréquence
        </Text>
      </View>
    </View>
  );
};

export const TechniqueHeatmap = React.memo(TechniqueHeatmapInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  columnsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  methodCol: { flex: 1 },
  countHeader: {
    width: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  colHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  methodName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    paddingRight: 12,
  },
  countBox: {
    width: 62,
    height: 32,
    marginHorizontal: 4,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  legend: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
