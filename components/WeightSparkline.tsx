import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WeightData {
  date: string;
  weight: number;
}

interface WeightSparklineProps {
  data: WeightData[];
  targetWeight?: number;
  currentWeight?: number;
  height?: number;
  width?: number;
}

export const WeightSparkline: React.FC<WeightSparklineProps> = ({
  data,
  targetWeight,
  currentWeight,
  height = 60,
  width = Dimensions.get('window').width - 64,
}) => {
  const { colors } = useTheme();
  const strokeAnim = useRef(new Animated.Value(0)).current;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; weight: number; date: string } | null>(null);
  const [pathLength, setPathLength] = useState(0);
  const [strokeDashoffset, setStrokeDashoffset] = useState(0);

  if (data.length < 2) return null;

  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const weights = data.map(d => d.weight);
  const maxW = Math.max(...weights);
  const minW = Math.min(...weights);
  const range = maxW - minW || 1;

  // Générer le path de la courbe
  const points = weights.map((w, i) => {
    const x = padding + (i / (weights.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((w - minW) / range) * chartHeight;
    return { x, y, weight: w, date: data[i].date };
  });

  useEffect(() => {
    // Calculer la longueur du path
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    setPathLength(length);
    setStrokeDashoffset(length);

    // Animation de dessin de la ligne
    Animated.timing(strokeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false, // REQUIS: utilisé pour calculer strokeDashoffset via listener (propriété SVG)
    }).start();

    // Listener pour mettre à jour strokeDashoffset
    const listener = strokeAnim.addListener(({ value }) => {
      setStrokeDashoffset(length * (1 - value));
    });

    return () => {
      strokeAnim.removeListener(listener);
    };
  }, [data, points]);

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = cp1x;
    const cp2y = curr.y;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }


  const handleTouch = (event: any) => {
    const { locationX } = event.nativeEvent;
    const index = Math.round(((locationX - padding) / chartWidth) * (points.length - 1));
    const clampedIndex = Math.max(0, Math.min(points.length - 1, index));
    const point = points[clampedIndex];
    
    setTooltip({
      x: point.x,
      y: point.y - 30,
      weight: point.weight,
      date: point.date,
    });
  };

  const handleTouchEnd = () => {
    setTimeout(() => setTooltip(null), 2000);
  };

  return (
    <TouchableWithoutFeedback onPressIn={handleTouch} onPressOut={handleTouchEnd}>
      <View style={[styles.container, { width, height }]}>
        <Svg width={width} height={height}>
          {/* Zone remplie sous la courbe */}
          <Path
            d={`${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
            fill={`${colors.accent}15`}
          />
          
          {/* Courbe animée */}
          <Path
            d={path}
            fill="none"
            stroke={colors.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={strokeDashoffset}
          />
          
          {/* Point au touch seulement */}
          {tooltip && (
            <Circle
              cx={tooltip.x}
              cy={tooltip.y + 30}
              r="5"
              fill={colors.accent}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          )}
        </Svg>
        
        {/* Tooltip React Native (plus lisible) */}
        {tooltip && (
          <View
            style={[
              styles.tooltip,
              {
                left: tooltip.x - 40,
                top: tooltip.y - 50,
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.tooltipWeight, { color: colors.textPrimary }]}>
              {tooltip.weight.toFixed(1)} kg
            </Text>
            <Text style={[styles.tooltipDate, { color: colors.textMuted }]}>
              {format(new Date(tooltip.date), 'd MMM', { locale: fr })}
            </Text>
            {targetWeight && (
              <Text style={[styles.tooltipDiff, { color: tooltip.weight > targetWeight ? colors.warning : colors.success }]}>
                {tooltip.weight > targetWeight ? '+' : ''}{(tooltip.weight - targetWeight).toFixed(1)} kg
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipWeight: {
    fontSize: 12,
    fontWeight: '800',
  },
  tooltipDate: {
    fontSize: 9,
    marginTop: 2,
  },
  tooltipDiff: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
});

