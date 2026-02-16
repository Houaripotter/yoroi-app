// ============================================
// SLEEP CARD - Pleine Largeur Premium
// ============================================

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Moon, Plus, TrendingUp, AlertTriangle, CheckCircle, Settings } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AnimatedCounter from '@/components/AnimatedCounter';
import { router } from 'expo-router';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

interface SleepCardFullWidthProps {
  hours?: number;
  debt?: number;
  goal?: number;
  onPress?: () => void;
}

export const SleepCardFullWidth = React.memo<SleepCardFullWidthProps>(({
  hours = 0,
  debt = 0,
  goal = 8,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  // Protection contre division par zéro
  const safeGoal = goal > 0 ? goal : 8;
  const percentage = Math.min((hours / safeGoal) * 100, 100);
  const quality = hours >= safeGoal ? 'Excellent' : hours >= safeGoal - 1 ? 'Bon' : hours >= safeGoal - 2 ? 'Moyen' : 'Insuffisant';
  const qualityColor = hours >= safeGoal ? '#10B981' : hours >= safeGoal - 1 ? '#F59E0B' : hours >= safeGoal - 2 ? '#F97316' : '#EF4444';

  // Animations
  const badgeScale = useRef(new Animated.Value(1)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;

  // ZzZ animations
  const zzz1Opacity = useRef(new Animated.Value(0)).current;
  const zzz1TranslateY = useRef(new Animated.Value(0)).current;
  const zzz2Opacity = useRef(new Animated.Value(0)).current;
  const zzz2TranslateY = useRef(new Animated.Value(0)).current;
  const zzz3Opacity = useRef(new Animated.Value(0)).current;
  const zzz3TranslateY = useRef(new Animated.Value(0)).current;

  // Badge pulsation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Respiration de la personne
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheScale, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Animation ZzZ
  useEffect(() => {
    const animateZzz = (opacity: Animated.Value, translateY: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -20,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const z1 = animateZzz(zzz1Opacity, zzz1TranslateY, 0);
    const z2 = animateZzz(zzz2Opacity, zzz2TranslateY, 600);
    const z3 = animateZzz(zzz3Opacity, zzz3TranslateY, 1200);

    z1.start();
    z2.start();
    z3.start();

    return () => {
      z1.stop();
      z2.stop();
      z3.stop();
    };
  }, []);

  const handleAdd = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push('/sleep-input');

    // Bounce animation
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1.3,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.icon}
          >
            <Moon size={22} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('home.sleepCard.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('home.sleepCard.objective')} {safeGoal}h
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/sleep');
          }}
          activeOpacity={0.7}
        >
          <Settings size={20} color="#8B5CF6" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Valeur principale */}
      <View style={styles.mainSection}>
        <View style={styles.valueRow}>
          <AnimatedCounter
            value={hours}
            style={[styles.valueLarge, { color: colors.textPrimary }]}
            duration={600}
          />
          <Text style={[styles.unit, { color: colors.textSecondary }]}>h</Text>
        </View>
      </View>

      {/* Scène de sommeil avec personne et ZzZ */}
      <TouchableOpacity
        style={styles.sleepContainer}
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Light);
          router.push('/sleep');
        }}
        activeOpacity={0.7}
      >
        <Animated.View style={[{ transform: [{ scale: breatheScale }] }]}>
          <Svg width={160} height={80} viewBox="0 0 120 60">
            {/* Pieds du lit */}
            <Path d="M 10 55 L 10 48" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 110 55 L 110 48" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />

            {/* Base du lit */}
            <Path d="M 8 48 L 112 48" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" />

            {/* Matelas */}
            <Ellipse cx="60" cy="43" rx="50" ry="7" fill="#8B5CF6" opacity={0.8} />

            {/* Oreiller */}
            <Ellipse cx="25" cy="38" rx="12" ry="6" fill="#C4B5FD" />
            <Ellipse cx="25" cy="37" rx="10" ry="5" fill="#DDD6FE" />

            {/* Corps sous la couverture */}
            <Path
              d="M 15 40 Q 35 32 65 38 Q 85 42 100 40 L 100 45 Q 70 48 40 46 Q 20 44 15 45 Z"
              fill="#A78BFA"
              opacity={0.9}
            />

            {/* Tête de la personne */}
            <Circle cx="28" cy="32" r="8" fill="#FCD34D" />
            {/* Cheveux */}
            <Path
              d="M 22 29 Q 28 24 34 29"
              stroke="#92400E"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Œil fermé */}
            <Path
              d="M 25 32 Q 27 33 29 32"
              stroke="#78350F"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Petit sourire paisible */}
            <Path
              d="M 26 35 Q 28 36 30 35"
              stroke="#78350F"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            />

            {/* Bras visible sur la couverture */}
            <Ellipse cx="38" cy="36" rx="5" ry="3" fill="#FCD34D" />
          </Svg>
        </Animated.View>

        {/* ZzZ qui flottent au-dessus de la tête */}
        <View style={styles.zzzContainer}>
          <Animated.Text style={[
            styles.zzz,
            styles.zzz1,
            {
              opacity: zzz1Opacity,
              transform: [{ translateY: zzz1TranslateY }],
              color: '#A78BFA',
            }
          ]}>
            z
          </Animated.Text>
          <Animated.Text style={[
            styles.zzz,
            styles.zzz2,
            {
              opacity: zzz2Opacity,
              transform: [{ translateY: zzz2TranslateY }],
              color: '#8B5CF6',
            }
          ]}>
            Z
          </Animated.Text>
          <Animated.Text style={[
            styles.zzz,
            styles.zzz3,
            {
              opacity: zzz3Opacity,
              transform: [{ translateY: zzz3TranslateY }],
              color: '#7C3AED',
            }
          ]}>
            Z
          </Animated.Text>
        </View>
      </TouchableOpacity>

      {/* Métriques sous le lit */}
      <View style={styles.metricsRowBottom}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('home.sleepCard.debt')}
          </Text>
          <Text style={[styles.metricValueBottom, { color: debt > 0 ? '#EF4444' : '#10B981' }]}>
            {debt > 0 ? `${debt.toFixed(1)}h` : '0h'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('home.sleepCard.quality')}
          </Text>
          <Text style={[styles.metricValueBottom, { color: qualityColor }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${percentage}%` }]}
        />
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}
          onPress={handleAdd}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#8B5CF6" strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: '#8B5CF6' }]}>{t('home.sleepCard.addSleep')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonSmall, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/sleep');
          }}
          activeOpacity={0.7}
        >
          <TrendingUp size={18} color="#8B5CF6" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSection: {
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  valueLarge: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 12,
  },
  sleepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
    position: 'relative',
    height: 100,
  },
  metricsRowBottom: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
  },
  metricValueBottom: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  zzzContainer: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -20,
  },
  zzz: {
    position: 'absolute',
    fontWeight: '900',
    fontStyle: 'italic',
  },
  zzz1: {
    fontSize: 16,
    left: 0,
    top: 10,
  },
  zzz2: {
    fontSize: 20,
    left: 12,
    top: 5,
  },
  zzz3: {
    fontSize: 24,
    left: 28,
    top: 0,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonSmall: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
