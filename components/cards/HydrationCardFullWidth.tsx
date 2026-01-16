// ============================================
// HYDRATION CARD - Pleine Largeur Premium avec Animations
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Droplets, Plus, Minus, Settings, Target } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AnimatedCounter from '@/components/AnimatedCounter';
import { router } from 'expo-router';

interface HydrationCardFullWidthProps {
  currentMl?: number;
  goalMl?: number;
  onAddMl?: (ml: number) => void;
}

export const HydrationCardFullWidth: React.FC<HydrationCardFullWidthProps> = ({
  currentMl = 0,
  goalMl = 2500,
  onAddMl,
}) => {
  const { colors, isDark } = useTheme();
  const percentage = Math.min((currentMl / goalMl) * 100, 100);
  const remaining = Math.max(goalMl - currentMl, 0);

  // Animations bouteille
  const BOTTLE_HEIGHT = 140;
  const waterHeight = (percentage / 100) * BOTTLE_HEIGHT;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const waterHeightAnim = useRef(new Animated.Value(waterHeight)).current;
  const pourAnim = useRef(new Animated.Value(0)).current;
  const capRotateAnim = useRef(new Animated.Value(0)).current;
  const [isPouringWater, setIsPouringWater] = useState(false);

  // Animation vague
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Animer la hauteur de l'eau
  useEffect(() => {
    Animated.spring(waterHeightAnim, {
      toValue: waterHeight,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [currentMl, goalMl]);

  // Animation de versement avec bouchon
  const triggerPourAnimation = () => {
    setIsPouringWater(true);
    pourAnim.setValue(0);
    capRotateAnim.setValue(0);

    Animated.parallel([
      Animated.timing(capRotateAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(pourAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      Animated.timing(capRotateAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setIsPouringWater(false);
      });
    });
  };

  const handleAdd = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (amount > 0) {
      triggerPourAnimation();
    }
    onAddMl?.(amount);
  };

  // Générer les graduations intelligemment en fonction de l'objectif
  const getGraduations = () => {
    const goalL = goalMl / 1000;

    if (goalL <= 2) {
      return [0.5, 1, 1.5, 2];
    } else if (goalL <= 2.5) {
      return [0.5, 1, 1.5, 2, 2.5];
    } else if (goalL <= 3) {
      return [0.5, 1, 1.5, 2, 2.5, 3];
    } else if (goalL <= 3.5) {
      return [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
    } else if (goalL <= 4) {
      return [1, 2, 3, 4];
    } else {
      return [1, 2, 3, 4, 5];
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.icon}
          >
            <Droplets size={22} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Hydratation
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Objectif: {(goalMl / 1000).toFixed(1)}L
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/hydration');
          }}
          activeOpacity={0.7}
        >
          <Settings size={20} color="#3B82F6" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Section horizontale : Métriques à gauche + Bouteille à droite */}
      <View style={styles.contentRow}>
        {/* Valeur principale et métriques à gauche */}
        <View style={styles.mainSection}>
          <View style={styles.valueRow}>
            <Text style={[styles.valueLarge, { color: colors.textPrimary }]}>
              {(currentMl / 1000).toFixed(2)}
            </Text>
            <Text style={[styles.unit, { color: colors.textSecondary }]}>L</Text>
          </View>

          <View style={styles.metricsColumn}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                RESTE
              </Text>
              <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                {(remaining / 1000).toFixed(1)}L
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                COMPLÉTÉ
              </Text>
              <Text style={[styles.metricValue, { color: colors.accent }]}>
                {percentage.toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Bouteille d'eau animée à droite */}
        <TouchableOpacity
          style={styles.bottleContainer}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/hydration');
          }}
          activeOpacity={0.7}
        >
        <View style={styles.bottleWithGraduations}>
          {/* Graduations à gauche */}
          <View style={styles.graduationsExternal}>
            {getGraduations().map((literValue) => {
              // Position exacte par rapport à la hauteur de la bouteille (140px)
              // Limiter à 90% de la hauteur (126px) pour garder les graduations dans le corps
              const pixelsFromBottom = (literValue / (goalMl / 1000)) * 126;
              return (
                <View
                  key={literValue}
                  style={[styles.graduationRowExternal, { bottom: pixelsFromBottom }]}
                >
                  <Text style={[styles.graduationTextExternal, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }]}>
                    {literValue}L
                  </Text>
                  <View
                    style={[
                      styles.graduationLineExternal,
                      {
                        backgroundColor: isDark ? '#FFFFFF' : '#000000',
                        opacity: isDark ? 0.5 : 0.4,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.bottleWrapper}>
            {/* Bouchon */}
            <Animated.View style={[
              styles.bottleCap,
              {
                transform: [
                  {
                    translateY: capRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -15]
                    })
                  }
                ]
              }
            ]} />

            {/* Goulot */}
            <View style={styles.bottleNeck} />

            {/* Corps de la bouteille */}
            <View style={styles.bottleBody}>

            {/* Eau qui monte */}
            <Animated.View
              style={[
                styles.waterLevel,
                {
                  height: waterHeightAnim,
                }
              ]}
            >
              {/* Vague au sommet */}
              {percentage > 0 && (
                <Animated.View style={[
                  styles.waterWave,
                  {
                    transform: [{
                      translateX: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 8]
                      })
                    }],
                  }
                ]} />
              )}

              {/* Bulles montantes */}
              {isPouringWater && (
                <>
                  <Animated.View style={[
                    styles.bubble,
                    { left: '25%', bottom: '20%' },
                    {
                      transform: [{
                        translateY: pourAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -50]
                        })
                      }],
                      opacity: pourAnim.interpolate({
                        inputRange: [0, 0.3, 0.8, 1],
                        outputRange: [0, 1, 0.5, 0]
                      })
                    }
                  ]}>
                    <View style={styles.bubbleCircle} />
                  </Animated.View>
                  <Animated.View style={[
                    styles.bubble,
                    { left: '60%', bottom: '30%' },
                    {
                      transform: [{
                        translateY: pourAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [5, -55]
                        })
                      }],
                      opacity: pourAnim.interpolate({
                        inputRange: [0, 0.2, 0.7, 1],
                        outputRange: [0, 1, 0.5, 0]
                      })
                    }
                  ]}>
                    <View style={[styles.bubbleCircle, { width: 8, height: 8 }]} />
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </View>
        </View>
        </View>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${percentage}%` }]}
        />
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButtonSmall, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}
          onPress={() => handleAdd(-250)}
          activeOpacity={0.7}
        >
          <Minus size={18} color="#EF4444" strokeWidth={2.5} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}
          onPress={() => handleAdd(250)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#3B82F6" strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: '#3B82F6' }]}>250ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}
          onPress={() => handleAdd(500)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#3B82F6" strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: '#3B82F6' }]}>500ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}
          onPress={() => handleAdd(1000)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#10B981" strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: '#10B981' }]}>1L</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  mainSection: {
    flex: 1,
    minWidth: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginBottom: 10,
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
  metricsColumn: {
    flexDirection: 'column',
    gap: 8,
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
  bottleContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: 140,
  },
  bottleWithGraduations: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  graduationsExternal: {
    height: 126,
    width: 45,
    justifyContent: 'flex-start',
    position: 'relative',
    marginRight: -2,
    marginBottom: 7,
  },
  graduationRowExternal: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  graduationTextExternal: {
    fontSize: 10,
    fontWeight: '700',
  },
  graduationLineExternal: {
    width: 8,
    height: 2,
  },
  bottleWrapper: {
    alignItems: 'center',
  },
  bottleCap: {
    width: 40,
    height: 12,
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    zIndex: 10,
  },
  bottleNeck: {
    width: 32,
    height: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#3B82F6',
  },
  bottleBody: {
    width: 80,
    height: 140,
    borderWidth: 3,
    borderColor: '#3B82F6',
    borderRadius: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  waterLevel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    opacity: 0.9,
    overflow: 'visible',
  },
  waterWave: {
    position: 'absolute',
    top: -5,
    left: -8,
    right: -8,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 50,
  },
  bubble: {
    position: 'absolute',
  },
  bubbleCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
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
    fontSize: 15,
    fontWeight: '800',
  },
});
