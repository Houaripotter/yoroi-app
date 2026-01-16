// ============================================
// SCROLLABLE LINE CHART - Graphique scrollable horizontal
// Affiche TOUTES les données avec scroll
// Valeurs au-dessus des points, axes visibles
// ============================================

import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LineChart } from 'react-native-chart-kit';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScrollableLineChartProps {
  data: { date?: string; value: number }[];
  color: string;
  height?: number;
  compact?: boolean;
  unit?: string;
}

export const ScrollableLineChart: React.FC<ScrollableLineChartProps> = ({
  data,
  color,
  height = 220,
  compact = false,
  unit = '',
}) => {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Aucune donnée
        </Text>
      </View>
    );
  }

  // Calculer la largeur du graphique selon le nombre de points
  // Formule: 50px par point (minimum) pour avoir de l'espace
  const POINT_WIDTH = compact ? 40 : 60;
  const MIN_WIDTH = SCREEN_WIDTH - 60;
  const calculatedWidth = Math.max(MIN_WIDTH, data.length * POINT_WIDTH);

  // Préparer les labels de dates
  const labels = data.map((d, index) => {
    if (!d.date) return `J${index + 1}`;
    try {
      const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
      return format(date, 'd MMM', { locale: fr });
    } catch (e) {
      return `J${index + 1}`;
    }
  });

  // Valeurs
  const values = data.map(d => d.value);

  // Calculer min, max
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Données pour le graphique
  const chartData = {
    labels: labels,
    datasets: [{
      data: values,
      color: (opacity = 1) => color,
      strokeWidth: compact ? 2.5 : 3,
    }],
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        decelerationRate="fast"
        style={styles.scrollView}
      >
        {/* Conteneur avec padding en haut pour les valeurs */}
        <View style={{ paddingTop: compact ? 12 : 24 }}>
          <LineChart
            data={chartData}
            width={calculatedWidth}
            height={compact ? 100 : height}
            chartConfig={{
              backgroundColor: colors.backgroundCard,
              backgroundGradientFrom: colors.backgroundCard,
              backgroundGradientTo: colors.backgroundCard,
              decimalPlaces: 1,
              color: (opacity = 1) => color,
              labelColor: (opacity = 1) => colors.textMuted,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: compact ? "3" : "5",
                strokeWidth: "2",
                stroke: color,
                fill: colors.backgroundCard,
              },
              propsForBackgroundLines: {
                strokeDasharray: "",
                stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                strokeWidth: 1,
              },
              propsForLabels: {
                fontSize: compact ? 9 : 11,
              },
            }}
            bezier
            style={styles.chart}
            withInnerLines={!compact}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={!compact}
            withDots={true}
            withShadow={false}
            fromZero={false}
            segments={compact ? 2 : 4}
            // IMPORTANT: Afficher les valeurs au-dessus des points
            withVerticalLabels={true}
            withHorizontalLabels={!compact}
            renderDotContent={({ x, y, index }) => {
              // Afficher la valeur au-dessus de chaque point
              if (compact && data.length > 10) return null; // Trop de points en mode compact

              return (
                <View
                  key={`dot-${index}`}
                  style={{
                    position: 'absolute',
                    top: Math.max(y - 25, -20), // Empêcher de dépasser en haut
                    left: x - 22,
                    width: 44,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={[
                      styles.dotValue,
                      {
                        color: color,
                        fontSize: compact ? 8 : 10,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {values[index].toFixed(1)}{unit}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </ScrollView>

      {/* Indicateur de scroll si le contenu est plus large */}
      {!compact && calculatedWidth > MIN_WIDTH && (
        <View style={[styles.scrollHint, { backgroundColor: colors.infoMuted }]}>
          <Text style={[styles.scrollHintText, { color: colors.info }]}>
            ← Glisse pour voir toutes les données →
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingRight: 20,
  },
  chart: {
    borderRadius: 16,
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dotValue: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scrollHint: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  scrollHintText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
