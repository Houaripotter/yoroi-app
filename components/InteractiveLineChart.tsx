import { useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface DataPoint {
  value: number;
  date: string;
}

interface InteractiveLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  unit?: string;
  locale?: string;
}

export function InteractiveLineChart({
  data,
  width = 300,
  height = 220,
  color = '#007AFF',
  unit = 'kg',
  locale = 'fr-FR',
}: InteractiveLineChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    value: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);

  const chartWidth = width;
  const chartHeight = height;
  const padding = 20;

  // Calculer les positions
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    const xStep = (chartWidth - padding * 2) / Math.max(data.length - 1, 1);

    return data.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - ((item.value - minValue) / valueRange) * (chartHeight - padding * 2),
      value: item.value,
      date: item.date,
    }));
  }, [data, chartWidth, chartHeight, padding]);

  // Créer le path avec courbes de Bézier
  const createPath = () => {
    if (chartData.length === 0) return '';

    let path = `M ${chartData[0].x} ${chartData[0].y}`;

    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Path pour le gradient
  const createAreaPath = () => {
    if (chartData.length === 0) return '';

    const linePath = createPath();
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];

    return `${linePath} L ${lastPoint.x} ${chartHeight - padding} L ${firstPoint.x} ${chartHeight - padding} Z`;
  };

  // Formater les labels de date
  const getDateLabels = () => {
    if (chartData.length === 0) return [];

    return chartData.map((point, i) => {
      // Afficher seulement certains labels selon la longueur
      if (data.length <= 5) {
        const date = new Date(point.date);
        return {
          x: point.x,
          label: `${date.getDate()}/${date.getMonth() + 1}`,
        };
      }

      if (i % 5 === 0 || i === data.length - 1) {
        const date = new Date(point.date);
        return {
          x: point.x,
          label: `${date.getDate()}/${date.getMonth() + 1}`,
        };
      }

      return null;
    }).filter(Boolean);
  };

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="interactiveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={color} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Gradient area */}
        <Path d={createAreaPath()} fill="url(#interactiveGradient)" />

        {/* Line */}
        <Path
          d={createPath()}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Points */}
        {chartData.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="6"
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="3"
            onPress={() => {
              setSelectedPoint({
                index,
                value: point.value,
                date: point.date,
                x: point.x,
                y: point.y,
              });

              setTimeout(() => {
                setSelectedPoint(null);
              }, 3000);
            }}
          />
        ))}
      </Svg>

      {/* Labels des dates */}
      <View style={styles.labelsContainer}>
        {getDateLabels().map((item: any, index) => (
          <Text
            key={index}
            style={[styles.dateLabel, { left: item.x - 20, color: 'rgba(45, 52, 54, 0.6)' }]}
          >
            {item.label}
          </Text>
        ))}
      </View>

      {/* Tooltip */}
      {selectedPoint && (
        <View
          style={[
            styles.tooltip,
            {
              left: selectedPoint.x - 60,
              top: selectedPoint.y - 80,
            },
          ]}
        >
          <View style={[styles.tooltipContent, { backgroundColor: color, shadowColor: color }]}>
            <Text style={styles.tooltipValue}>
              {selectedPoint.value.toFixed(1)} {unit}
            </Text>
            <Text style={styles.tooltipDate}>
              {new Date(selectedPoint.date).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
          <View style={[styles.tooltipArrow, { borderTopColor: color }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  labelsContainer: {
    width: 300,
    height: 20,
    position: 'relative',
    marginTop: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    position: 'absolute',
    width: 40,
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 1000,
  },
  tooltipContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
});
