import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getWeights } from '@/lib/database';
import { Target } from 'lucide-react-native';
import Svg, { Path, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { format } from 'date-fns';
import { scale, isIPad } from '@/constants/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = isIPad() ? scale(8) : 16; // iPhone garde 16, iPad s'adapte

export default function PoidsTab() {
  const { colors } = useTheme();
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);

  useEffect(() => {
    loadWeightData();
  }, []);

  const loadWeightData = async () => {
    const weights = await getWeights();
    const last14 = weights.slice(0, 14).reverse().map(w => ({
      date: w.date,
      weight: w.weight,
    }));
    setWeightData(last14);
  };

  const chartWidth = SCREEN_WIDTH - CONTAINER_PADDING * 2; // Utilise toute la largeur disponible
  const chartHeight = 140;
  const padding = { left: 35, right: 15, top: 15, bottom: 30 };

  // Générer path pour courbe
  const generatePath = (data: { value: number }[], minVal: number, maxVal: number) => {
    if (data.length < 2) return '';

    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * (chartWidth - padding.left - padding.right);
    const yScale = (v: number) => padding.top + (1 - (v - minVal) / (maxVal - minVal || 1)) * (chartHeight - padding.top - padding.bottom);

    let path = `M ${xScale(0)} ${yScale(data[0].value)}`;
    for (let i = 1; i < data.length; i++) {
      const prevX = xScale(i - 1);
      const prevY = yScale(data[i - 1].value);
      const currX = xScale(i);
      const currY = yScale(data[i].value);
      path += ` C ${(prevX + currX) / 2} ${prevY}, ${(prevX + currX) / 2} ${currY}, ${currX} ${currY}`;
    }
    return path;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      <View style={styles.cardHeader}>
        <Target size={18} color="#10B981" />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Évolution Poids</Text>
      </View>

      {weightData.length > 1 && (
        <View style={styles.chartContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            {(() => {
              const weights = weightData.map(w => w.weight);
              const minW = Math.min(...weights) - 1;
              const maxW = Math.max(...weights) + 1;

              return (
                <>
                  {/* Grille */}
                  {[minW, (minW + maxW) / 2, maxW].map((v, idx) => (
                    <G key={idx}>
                      <Line
                        x1={padding.left}
                        y1={padding.top + (1 - (v - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom)}
                        x2={chartWidth - padding.right}
                        y2={padding.top + (1 - (v - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom)}
                        stroke={colors.border}
                        strokeDasharray="4,4"
                      />
                      <SvgText
                        x={padding.left - 5}
                        y={padding.top + (1 - (v - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom) + 4}
                        fontSize={9}
                        fill={colors.textMuted}
                        textAnchor="end"
                      >
                        {v.toFixed(0)}
                      </SvgText>
                    </G>
                  ))}

                  {/* Courbe */}
                  <Path
                    d={generatePath(weights.map(w => ({ value: w })), minW, maxW)}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={2.5}
                  />

                  {/* Points */}
                  {weights.map((w, i) => {
                    const x = padding.left + (i / (weights.length - 1)) * (chartWidth - padding.left - padding.right);
                    const y = padding.top + (1 - (w - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom);
                    return <Circle key={i} cx={x} cy={y} r={4} fill="#10B981" />;
                  })}
                </>
              );
            })()}
          </Svg>
        </View>
      )}

      {weightData.length <= 1 && (
        <Text style={[styles.noData, { color: colors.textMuted }]}>
          Pas assez de données pour afficher le graphique
        </Text>
      )}
    </View>
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
  chartContainer: {
    marginBottom: 12,
  },
  noData: {
    textAlign: 'center',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
