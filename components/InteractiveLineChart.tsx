import { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

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
}

export function InteractiveLineChart({
  data,
  width,
  height = 220,
  color = '#007AFF',
  unit = 'kg',
}: InteractiveLineChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    value: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);

  const screenWidth = width || Dimensions.get('window').width - 88;

  const chartData = {
    labels: data.map((entry, index) => {
      if (data.length <= 5) {
        const date = new Date(entry.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }
      if (index % 5 !== 0 && index !== data.length - 1) return '';
      const date = new Date(entry.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: data.map((entry) => entry.value),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={screenWidth}
        height={height}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: 'rgba(255, 255, 255, 0)',
          backgroundGradientTo: 'rgba(255, 255, 255, 0)',
          decimalPlaces: 1,
          color: (opacity = 1) => {
            const rgb = hexToRgb(color);
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
          },
          labelColor: (opacity = 1) => `rgba(45, 52, 54, ${opacity * 0.6})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '6',
            strokeWidth: '3',
            stroke: color,
            fill: '#FFFFFF',
          },
          propsForBackgroundLines: {
            strokeWidth: 0,
          },
          fillShadowGradient: color,
          fillShadowGradientOpacity: 0.25,
          fillShadowGradientFrom: color,
          fillShadowGradientFromOpacity: 0.4,
          fillShadowGradientTo: '#FFF9F0',
          fillShadowGradientToOpacity: 0.05,
          propsForLabels: {
            fontSize: 11,
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={false}
        withShadow
        withVerticalLabels={true}
        withHorizontalLabels={true}
        horizontalLabelRotation={0}
        verticalLabelRotation={0}
        formatXLabel={(label) => label}
        onDataPointClick={(clickData) => {
          const index = clickData.index;
          setSelectedPoint({
            index,
            value: data[index].value,
            date: data[index].date,
            x: clickData.x,
            y: clickData.y,
          });

          setTimeout(() => {
            setSelectedPoint(null);
          }, 3000);
        }}
      />

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
              {new Date(selectedPoint.date).toLocaleDateString('fr-FR', {
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
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingRight: 20,
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 122, b: 255 };
}
