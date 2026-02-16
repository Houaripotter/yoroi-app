import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { AnimatedNumber } from './AnimatedNumber';
import { useTheme } from '@/lib/ThemeContext';

interface ProgressRingProps {
  current: number;
  goal: number;
  size?: number;
}

export function ProgressRing({ current, goal, size = 200 }: ProgressRingProps) {
  const { colors } = useTheme();
  const progress = Math.min(Math.max((goal - current) / (goal - 90) * 100, 0), 100);

  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size / 2 + 40 }]}>
      <Svg width={size} height={size / 2 + 20} style={styles.svg}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.accentLight} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <G rotation="-180" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.textContainer}>
        <AnimatedNumber
          value={current}
          decimals={1}
          style={{ ...styles.currentWeight, color: colors.textPrimary }}
          duration={1500}
          delay={200}
        />
        <Text style={[styles.unit, { color: colors.textSecondary }]}>kg</Text>
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Poids actuel</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 40,
    gap: 4,
  },
  currentWeight: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.3,
  },
});
