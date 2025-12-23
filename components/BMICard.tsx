import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

interface BMICardProps {
  weight: number;
  height: number;
}

export function BMICard({ weight, height }: BMICardProps) {
  const { colors, isDark, themeName } = useTheme();
  const isWellness = false;

  const bmi = weight / ((height / 100) ** 2);

  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: 'Insuffisance pondérale', color: colors.textMuted };
    if (bmiValue < 25) return { label: 'Poids normal', color: colors.success };
    if (bmiValue < 30) return { label: 'Surpoids', color: colors.warning };
    return { label: 'Obésité', color: colors.error };
  };

  const category = getBMICategory(bmi);

  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;

  const startAngle = -180;
  const endAngle = 0;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: size / 2 + radius * Math.cos(rad),
      y: size / 2 + radius * Math.sin(rad),
    };
  };

  const createArc = (start: number, end: number) => {
    const startPoint = polarToCartesian(start);
    const endPoint = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;

    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;
  };

  const backgroundPath = createArc(startAngle, endAngle);

  const getBMIAngle = (bmiValue: number) => {
    const minBMI = 15;
    const maxBMI = 35;
    const clampedBMI = Math.max(minBMI, Math.min(maxBMI, bmiValue));
    const normalizedBMI = (clampedBMI - minBMI) / (maxBMI - minBMI);
    return startAngle + normalizedBMI * (endAngle - startAngle);
  };

  const targetAngle = getBMIAngle(bmi);
  const progressPath = createArc(startAngle, targetAngle);

  const getCategoryPastel = (color: string): string => {
    if (color === colors.textMuted) return isWellness ? '#E0E7EC' : `${colors.textMuted}20`;
    if (color === colors.success) return isWellness ? '#E8F9EF' : `${colors.success}20`;
    if (color === colors.warning) return isWellness ? '#FFF7ED' : `${colors.warning}20`;
    if (color === colors.error) return isWellness ? '#FEE2E2' : `${colors.error}20`;
    return colors.cardHover;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>INDICE DE MASSE CORPORELLE</Text>

      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size / 2 + 40}>
          <G>
            <Path
              d={backgroundPath}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />

            <Path
              d={progressPath}
              stroke={category.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />

            <Circle
              cx={size / 2}
              cy={size / 2}
              r={4}
              fill={category.color}
            />
          </G>
        </Svg>

        <View style={styles.valueContainer}>
          <Text style={[styles.bmiValue, { color: category.color }]}>
            {bmi.toFixed(1)}
          </Text>
          <Text style={[styles.bmiLabel, { color: colors.textSecondary }]}>IMC</Text>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryPastel(category.color) }]}>
          <Text style={[styles.categoryText, { color: colors.textPrimary }]}>
            {category.label}
          </Text>
        </View>
      </View>

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{'<'}18.5</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>18.5-25</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>25-30</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{'>'}30</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  valueContainer: {
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
    gap: 4,
  },
  bmiValue: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  bmiLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  categoryContainer: {
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
