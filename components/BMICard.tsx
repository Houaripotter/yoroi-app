import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { theme } from '@/lib/theme';

interface BMICardProps {
  weight: number;
  height: number;
}

export function BMICard({ weight, height }: BMICardProps) {
  const bmi = weight / ((height / 100) ** 2);

  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: 'Insuffisance pondérale', color: theme.colors.tertiary };
    if (bmiValue < 25) return { label: 'Poids normal', color: theme.colors.primary };
    if (bmiValue < 30) return { label: 'Surpoids', color: theme.colors.secondary };
    return { label: 'Obésité', color: theme.colors.error };
  };

  const category = getBMICategory(bmi);

  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>INDICE DE MASSE CORPORELLE</Text>

      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size / 2 + 40}>
          <G>
            <Path
              d={backgroundPath}
              stroke={theme.colors.borderLight}
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
          <Text style={styles.bmiLabel}>IMC</Text>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryPastel(category.color) }]}>
          <Text style={[styles.categoryText, { color: theme.colors.textPrimary }]}>
            {category.label}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.tertiary }]} />
          <Text style={styles.legendText}>{'<'}18.5</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.legendText}>18.5-25</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
          <Text style={styles.legendText}>25-30</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
          <Text style={styles.legendText}>{'>'}30</Text>
        </View>
      </View>
    </View>
  );
}

function getCategoryPastel(color: string): string {
  const colorMap: { [key: string]: string } = {
    [theme.colors.tertiary]: theme.colors.turquoisePastel,
    [theme.colors.primary]: theme.colors.mintPastel,
    [theme.colors.secondary]: theme.colors.orangePastel,
    [theme.colors.error]: '#FEE2E2',
  };
  return colorMap[color] || theme.colors.beigeLight;
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textSecondary,
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
    fontWeight: theme.fontWeight.black,
    letterSpacing: -1,
  },
  bmiLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  categoryContainer: {
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.full,
  },
  categoryText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
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
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
});
