import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LucideIcon, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// WELLNESS CARDS - NOUVEAU DESIGN SYSTEM
// ============================================

// ============================================
// COULEURS DU DESIGN (Static + Dynamic Helpers)
// ============================================
export const WELLNESS_COLORS = {
  // Fond global
  background: '#E5EBF0',

  // Container blanc
  container: '#FFFFFF',

  // Cartes colorées
  orange: '#FF6B4A',
  green: '#D4E157',
  blue: '#E8F4F8',
  yellow: '#F59E0B',
  cyan: '#A3D2E2',

  // Textes
  dark: '#1A1A2E',
  gray: '#6B7280',
  lightGray: '#9CA3AF',

  // Cercles icônes
  iconCircleBlue: '#E0F2F7',
  iconCircleOrange: '#FFE5DC',
  iconCircleGreen: '#E8F5E8',
  iconCircleGray: '#F3F4F6',

  // Success
  success: '#4ADE80',

  // Tab bar
  tabBar: '#1A1A2E',
};

const getDynamicColors = (isDark: boolean, colors: any) => ({
  background: isDark ? colors.background : '#E5EBF0',
  container: isDark ? colors.backgroundCard : '#FFFFFF',
  textPrimary: isDark ? colors.textPrimary : '#1A1A2E',
  textSecondary: isDark ? colors.textSecondary : '#6B7280',
  iconCircleGray: isDark ? colors.backgroundElevated : '#F3F4F6',
  iconCircleBlue: isDark ? `${colors.accent}20` : '#E0F2F7',
});

// ============================================
// ICON CIRCLE
// ============================================
interface IconCircleProps {
  Icon: LucideIcon;
  variant?: 'blue' | 'orange' | 'green' | 'gray' | 'white';
  size?: number;
  iconColor?: string;
}

export const IconCircle: React.FC<IconCircleProps> = memo(({
  Icon,
  variant = 'gray',
  size = 45,
  iconColor,
}) => {
  const { isDark, colors } = useTheme();
  const dynamicColors = getDynamicColors(isDark, colors);

  const bgColors = {
    blue: dynamicColors.iconCircleBlue,
    orange: WELLNESS_COLORS.iconCircleOrange,
    green: WELLNESS_COLORS.iconCircleGreen,
    gray: dynamicColors.iconCircleGray,
    white: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)',
  };

  const defaultIconColors = {
    blue: isDark ? colors.accent : WELLNESS_COLORS.dark,
    orange: WELLNESS_COLORS.dark,
    green: WELLNESS_COLORS.dark,
    gray: dynamicColors.textPrimary,
    white: '#FFFFFF',
  };

  return (
    <View
      style={[
        styles.iconCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColors[variant],
        },
      ]}
    >
      <Icon size={size * 0.44} color={iconColor || defaultIconColors[variant]} />
    </View>
  );
});

// ============================================
// COLORED STAT CARD
// ============================================
interface ColoredStatCardProps {
  title: string;
  subtitle?: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  variant: 'orange' | 'green' | 'blue' | 'yellow';
  badge?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ColoredStatCard: React.FC<ColoredStatCardProps> = memo(({
  title,
  subtitle,
  value,
  unit,
  icon: Icon,
  variant,
  badge = '1d',
  onPress,
  style,
}) => {
  const { isDark, colors } = useTheme();

  const bgColors = {
    orange: WELLNESS_COLORS.orange,
    green: WELLNESS_COLORS.green,
    blue: isDark ? colors.accent : WELLNESS_COLORS.cyan,
    yellow: WELLNESS_COLORS.yellow,
  };

  const textColors = {
    orange: '#FFFFFF',
    green: '#1A1A2E',
    blue: '#1A1A2E',
    yellow: '#FFFFFF',
  };

  const iconBgColors = {
    orange: 'rgba(255, 255, 255, 0.25)',
    green: 'rgba(255, 255, 255, 0.5)',
    blue: 'rgba(255, 255, 255, 0.5)',
    yellow: 'rgba(255, 255, 255, 0.25)',
  };

  const textColor = textColors[variant];

  const content = (
    <View style={[styles.coloredCard, { backgroundColor: bgColors[variant] }, style]}>
      {/* Header */}
      <View style={styles.coloredCardHeader}>
        <View style={[styles.coloredIconCircle, { backgroundColor: iconBgColors[variant] }]}>
          <Icon size={20} color={textColor} />
        </View>
        {badge && (
          <Text style={[styles.coloredBadge, { color: textColor }]}>{badge}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.coloredCardContent}>
        <Text style={[styles.coloredTitle, { color: textColor }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.coloredSubtitle, { color: textColor, opacity: 0.8 }]}>
            {subtitle}
          </Text>
        )}
        <View style={styles.coloredValueRow}>
          <Text style={[styles.coloredValue, { color: textColor }]}>{value}</Text>
          {unit && (
            <Text style={[styles.coloredUnit, { color: textColor }]}>{unit}</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

// ============================================
// CHART CARD (Bleu clair)
// ============================================
interface ChartCardProps {
  children: React.ReactNode;
  title?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const ChartCard: React.FC<ChartCardProps> = memo(({
  children,
  title,
  headerLeft,
  headerRight,
  style,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  // En mode dark, on utilise backgroundCard, sinon on garde le style par défaut (souvent écrasé par le parent ou transparent)
  const chartBackground = isDark ? colors.backgroundCard : (colors.backgroundCard || '#FFFFFF');
  const titleColor = isDark ? colors.textPrimary : WELLNESS_COLORS.dark;

  const content = (
    <View style={[styles.chartCard, { backgroundColor: chartBackground }, style]}>
      {(title || headerLeft || headerRight) && (
        <View style={styles.chartCardHeader}>
          {headerLeft || (title && <Text style={[styles.chartCardTitle, { color: titleColor }]}>{title}</Text>)}
          {headerRight}
        </View>
      )}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

// ============================================
// WHITE CARD
// ============================================
interface WhiteCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
}

export const WhiteCard: React.FC<WhiteCardProps> = memo(({
  children,
  style,
  onPress,
  noPadding = false,
}) => {
  const { isDark, colors } = useTheme();
  const bg = isDark ? colors.backgroundCard : '#FFFFFF';

  const content = (
    <View style={[styles.whiteCard, { backgroundColor: bg }, noPadding && { padding: 0 }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

// ============================================
// EXERCISE CARD
// ============================================
interface ExerciseCardProps {
  title: string;
  subtitle?: string;
  duration?: string;
  emoji?: string;
  completed?: boolean;
  variant?: 'main' | 'small';
  onPress?: () => void;
  onToggle?: () => void;
  style?: ViewStyle;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = memo(({
  title,
  subtitle,
  duration,
  emoji,
  completed = false,
  variant = 'main',
  onPress,
  onToggle,
  style,
}) => {
  const { isDark, colors } = useTheme();
  const isMain = variant === 'main';
  const dynamicColors = getDynamicColors(isDark, colors);

  // Styles dynamiques
  const mainBg = isDark ? colors.backgroundElevated : WELLNESS_COLORS.iconCircleGray;
  const smallBg = isDark ? `${colors.accent}20` : WELLNESS_COLORS.cyan;
  const titleColor = dynamicColors.textPrimary;
  const subtitleColor = dynamicColors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        isMain ? [styles.exerciseCardMain, { backgroundColor: mainBg }] : [styles.exerciseCardSmall, { backgroundColor: smallBg }],
        style,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.exerciseContent}>
        <Text style={[styles.exerciseTitle, !isMain && styles.exerciseTitleSmall, { color: titleColor }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.exerciseSubtitle, !isMain && styles.exerciseSubtitleSmall, { color: subtitleColor }]}>
            {subtitle}
          </Text>
        )}
        {duration && isMain && (
          <Text style={[styles.exerciseDuration, { color: titleColor }]}>{duration}</Text>
        )}
      </View>

      {/* Check button */}
      <TouchableOpacity
        style={[
          styles.checkButton,
          completed && styles.checkButtonCompleted,
          !isMain && styles.checkButtonSmall,
          { backgroundColor: completed ? WELLNESS_COLORS.green : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)') }
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {completed && <Check size={14} color="#1A1A2E" strokeWidth={3} />}
      </TouchableOpacity>

      {/* Emoji */}
      {emoji && isMain && (
        <Text style={styles.exerciseEmoji}>{emoji}</Text>
      )}
    </TouchableOpacity>
  );
});

// ============================================
// WATER PROGRESS CARD
// ============================================
interface WaterProgressCardProps {
  currentLiters: number;
  targetLiters: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const WaterProgressCard: React.FC<WaterProgressCardProps> = memo(({
  currentLiters,
  targetLiters,
  onPress,
  style,
}) => {
  const { isDark, colors } = useTheme();
  const filledBars = Math.round((currentLiters / targetLiters) * 8);
  const cardBg = isDark ? colors.accent : WELLNESS_COLORS.cyan;
  const textColor = '#1A1A2E'; // Toujours sombre sur cyan/accent clair

  return (
    <TouchableOpacity
      style={[styles.waterCard, { backgroundColor: cardBg }, style]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.waterHeader}>
        <View style={styles.waterIconCircle}>
          <Text style={styles.waterIcon}>💧</Text>
        </View>
        <Text style={[styles.waterValue, { color: textColor }]}>{currentLiters.toFixed(1)}l</Text>
      </View>

      {/* Content */}
      <View style={styles.waterContent}>
        <Text style={[styles.waterTitle, { color: textColor }]}>Water</Text>
        <Text style={[styles.waterSubtitle, { color: textColor }]}>Need to drink {targetLiters}l p/d</Text>

        {/* Progress bars */}
        <View style={styles.waterProgressContainer}>
          {[...Array(8)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.waterBar,
                {
                  backgroundColor: i < filledBars ? WELLNESS_COLORS.green : 'rgba(255, 255, 255, 0.3)',
                  height: i < filledBars ? 32 : 16,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================
// SECTION HEADER
// ============================================
interface SectionHeaderProps {
  title: string;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = memo(({
  title,
  rightElement,
  style,
}) => {
  const { isDark, colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[styles.sectionTitle, { color: isDark ? colors.textPrimary : WELLNESS_COLORS.dark }]}>{title}</Text>
      {rightElement}
    </View>
  );
});

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  // Icon Circle
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Colored Stat Card
  coloredCard: {
    borderRadius: 25,
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  coloredCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coloredIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coloredBadge: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  coloredCardContent: {},
  coloredTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  coloredSubtitle: {
    fontSize: 10,
    marginBottom: 8,
  },
  coloredValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  coloredValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  coloredUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    opacity: 0.8,
  },

  // Chart Card
  chartCard: {
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: WELLNESS_COLORS.dark,
  },

  // White Card
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  // Exercise Card
  exerciseCardMain: {
    backgroundColor: WELLNESS_COLORS.iconCircleGray,
    borderRadius: 24,
    padding: 20,
    minHeight: 140,
    position: 'relative',
  },
  exerciseCardSmall: {
    backgroundColor: WELLNESS_COLORS.cyan,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseContent: {
    maxWidth: '65%',
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: WELLNESS_COLORS.dark,
    marginBottom: 4,
  },
  exerciseTitleSmall: {
    fontSize: 14,
  },
  exerciseSubtitle: {
    fontSize: 12,
    color: WELLNESS_COLORS.gray,
    marginBottom: 16,
    lineHeight: 18,
  },
  exerciseSubtitleSmall: {
    fontSize: 10,
    marginBottom: 0,
    opacity: 0.8,
  },
  exerciseDuration: {
    fontSize: 20,
    fontWeight: 'bold',
    color: WELLNESS_COLORS.dark,
  },
  exerciseEmoji: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    fontSize: 60,
  },
  checkButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: WELLNESS_COLORS.green,
  },
  checkButtonSmall: {
    position: 'relative',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: WELLNESS_COLORS.dark,
  },

  // Water Card
  waterCard: {
    backgroundColor: WELLNESS_COLORS.cyan,
    borderRadius: 25,
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  waterIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterIcon: {
    fontSize: 20,
  },
  waterValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: WELLNESS_COLORS.dark,
  },
  waterContent: {},
  waterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WELLNESS_COLORS.dark,
    marginBottom: 2,
  },
  waterSubtitle: {
    fontSize: 10,
    color: WELLNESS_COLORS.dark,
    opacity: 0.7,
    marginBottom: 10,
  },
  waterProgressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    gap: 4,
  },
  waterBar: {
    width: 8,
    borderRadius: 4,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: WELLNESS_COLORS.dark,
  },
});

export default {
  IconCircle,
  ColoredStatCard,
  ChartCard,
  WhiteCard,
  ExerciseCard,
  WaterProgressCard,
  SectionHeader,
  WELLNESS_COLORS,
};
