// ============================================
// COACH OF THE DAY CARD : Affiche la suggestion du jour
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Sparkles, Flame, Moon, Wind, Target, Scale, Shuffle,
  Sword, Mountain, Zap, Shield, ChevronRight, type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic } from '@/lib/haptics';
import { getCoachSuggestionOfTheDay, type CoachSuggestion } from '@/lib/coachService';

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles, Flame, Moon, Wind, Target, Scale, Shuffle,
  Sword, Mountain, Zap, Shield,
};

const CoachOfTheDayCardInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<CoachSuggestion | null>(null);
  const shimmer = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getCoachSuggestionOfTheDay().then(setSuggestion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!suggestion) return;
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [suggestion]);

  if (!suggestion) return null;

  const Icon = ICON_MAP[suggestion.icon] || Sword;
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  const handlePress = () => {
    lightHaptic().catch(() => {});
    if (suggestion.actionRoute) {
      router.push(suggestion.actionRoute as any);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={suggestion.actionRoute ? 0.85 : 1}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Coach du jour : ${suggestion.title}. ${suggestion.message}`}
      accessibilityHint={suggestion.actionLabel}
      style={[styles.wrap, { backgroundColor: colors.card, borderColor: suggestion.color + '40' }]}
    >
      {/* Shimmer doré */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          { transform: [{ translateX: shimmerX }, { rotate: '15deg' }] },
        ]}
      >
        <LinearGradient
          colors={['transparent', suggestion.color + '30', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: suggestion.color + '22' }]}>
          <Icon size={22} color={suggestion.color} strokeWidth={2.2} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.label, { color: suggestion.color }]}>COACH DU JOUR</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {suggestion.title}
          </Text>
          <Text style={[styles.msg, { color: colors.textSecondary }]} numberOfLines={3}>
            {suggestion.message}
          </Text>
        </View>
        {suggestion.actionRoute && (
          <ChevronRight size={20} color={colors.textMuted} />
        )}
      </View>

      {suggestion.actionLabel && suggestion.actionRoute && (
        <View style={[styles.ctaRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.ctaText, { color: suggestion.color }]}>
            {suggestion.actionLabel}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 8,
  },
  shimmer: {
    position: 'absolute',
    top: -80,
    left: 0,
    width: 120,
    height: 300,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  msg: {
    fontSize: 13,
    lineHeight: 18,
  },
  ctaRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export const CoachOfTheDayCard = React.memo(CoachOfTheDayCardInner);
export default CoachOfTheDayCard;
