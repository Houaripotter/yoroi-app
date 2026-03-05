import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface SparklineDataPoint {
  value: number;
}

interface SparklineChartProps {
  data: SparklineDataPoint[];
  width: number;
  height: number;
  color?: string;
  showGradient?: boolean;
  thickness?: number;
  showLastValues?: number;
  valueUnit?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width,
  height,
  color = '#6366f1',
  showGradient = false,
  thickness = 2,
  showLastValues,
}) => {
  const points = showLastValues ? data.slice(-showLastValues) : data;

  if (points.length < 2) return <View style={{ width, height }} />;

  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - ((p.value - min) / range) * (height - 4) - 2,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const gradientId = `sparkGrad_${color.replace('#', '')}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {showGradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
        )}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

export default SparklineChart;
