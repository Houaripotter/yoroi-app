// ============================================
// HYDRATION CARD - Style Yoroi avec Animation
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Droplets, Plus, Minus, Settings, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { router } from 'expo-router';
import Svg, { Path, Defs, ClipPath, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';

interface HydrationCardFullWidthProps {
  currentMl?: number;
  goalMl?: number;
  onAddMl?: (ml: number) => void;
}

export const HydrationCardFullWidth = React.memo<HydrationCardFullWidthProps>(({
  currentMl = 0,
  goalMl = 2500,
  onAddMl,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const percentage = Math.min((currentMl / goalMl) * 100, 100);

  // Toast state (comme Yoroi)
  const [showToast, setShowToast] = useState(false);
  const [lastAmount, setLastAmount] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Animation vague
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [waveOffset, setWaveOffset] = useState(0);
  const [showBubbles, setShowBubbles] = useState(false);
  const [bubbles, setBubbles] = useState<Array<{id: number, x: number, y: number, size: number}>>([]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false, // REQUIS: anime des paths SVG dynamiques (vagues d'eau)
      })
    );
    animation.start();

    const listener = waveAnim.addListener(({ value }) => {
      setWaveOffset(value * Math.PI * 2);
    });

    return () => {
      animation.stop();
      waveAnim.removeListener(listener);
    };
  }, []);

  // Générer bulles
  useEffect(() => {
    if (showBubbles && percentage > 5) {
      const newBubbles = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: 20 + Math.random() * 40,
        y: 80 + Math.random() * 40,
        size: 3 + Math.random() * 4,
      }));
      setBubbles(newBubbles);
      setTimeout(() => setBubbles([]), 600);
    }
  }, [showBubbles]);

  const handleAdd = (amount: number) => {
    impactAsync(ImpactFeedbackStyle.Light);

    // Afficher le toast
    setLastAmount(amount);
    setShowToast(true);

    // Bulles si ajout
    if (amount > 0) {
      setShowBubbles(true);
      setTimeout(() => setShowBubbles(false), 100);
    }

    // Animation toast
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));

    onAddMl?.(amount);
  };

  // Bouteille dimensions
  const bottleWidth = 80;
  const bottleHeight = 130;
  const neckWidth = bottleWidth * 0.35;
  const neckHeight = bottleHeight * 0.1;
  const neckX = (bottleWidth - neckWidth) / 2;
  const cornerRadius = bottleWidth * 0.12;

  const bottlePath = `
    M ${neckX} ${neckHeight}
    L ${neckX} 2
    Q ${neckX} 0 ${neckX + 3} 0
    L ${neckX + neckWidth - 3} 0
    Q ${neckX + neckWidth} 0 ${neckX + neckWidth} 2
    L ${neckX + neckWidth} ${neckHeight}
    Q ${bottleWidth} ${neckHeight} ${bottleWidth - cornerRadius} ${neckHeight + cornerRadius}
    L ${bottleWidth - cornerRadius} ${bottleHeight - cornerRadius}
    Q ${bottleWidth - cornerRadius} ${bottleHeight} ${bottleWidth - cornerRadius * 2} ${bottleHeight}
    L ${cornerRadius * 2} ${bottleHeight}
    Q ${cornerRadius} ${bottleHeight} ${cornerRadius} ${bottleHeight - cornerRadius}
    L ${cornerRadius} ${neckHeight + cornerRadius}
    Q 0 ${neckHeight} ${neckX} ${neckHeight}
    Z
  `;

  // Water path
  const clampedFill = Math.min(Math.max(percentage / 100, 0), 1);
  const bodyHeight = bottleHeight - neckHeight;
  const waterFillHeight = bodyHeight * clampedFill;
  const waterTopY = bottleHeight - waterFillHeight;

  const generateWaterPath = () => {
    if (clampedFill <= 0) return '';
    let path = `M 0 ${bottleHeight} L 0 ${waterTopY}`;
    for (let x = 0; x <= bottleWidth; x += 2) {
      const y = waterTopY + Math.sin((x / bottleWidth) * Math.PI * 2 + waveOffset) * 3;
      path += ` L ${x} ${y}`;
    }
    path += ` L ${bottleWidth} ${bottleHeight} Z`;
    return path;
  };

  // Graduations
  const getGraduations = () => {
    const goalL = goalMl / 1000;
    if (goalL <= 2) return [0.5, 1, 1.5, 2];
    if (goalL <= 2.5) return [0.5, 1, 1.5, 2, 2.5];
    if (goalL <= 3) return [0.5, 1, 1.5, 2, 2.5, 3];
    if (goalL <= 3.5) return [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
    return [1, 2, 3, 4];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Toast notification (comme Yoroi) */}
      {showToast && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.98)',
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
            },
          ]}
        >
          <View style={[
            styles.toastIcon,
            { backgroundColor: lastAmount > 0 ? '#10B98120' : '#EF444420' }
          ]}>
            {lastAmount > 0 ? (
              <Check size={14} color="#10B981" strokeWidth={3} />
            ) : (
              <Minus size={14} color="#EF4444" strokeWidth={3} />
            )}
          </View>
          <Text style={[
            styles.toastText,
            { color: lastAmount > 0 ? '#10B981' : '#EF4444' }
          ]}>
            {lastAmount > 0 ? `+${lastAmount}ml` : `${lastAmount}ml`}
          </Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={['#06B6D4', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.icon}
          >
            <Droplets size={22} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('home.hydrationCard.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('home.hydrationCard.objective')} {(goalMl / 1000).toFixed(1)}L
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)' }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/hydration');
          }}
          activeOpacity={0.7}
        >
          <Settings size={20} color="#06B6D4" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Section principale */}
      <View style={styles.contentRow}>
        {/* Valeur à gauche */}
        <View style={styles.mainSection}>
          <View style={styles.valueRow}>
            <Text style={[styles.valueLarge, { color: colors.textPrimary }]}>
              {(currentMl / 1000).toFixed(2)}
            </Text>
            <Text style={[styles.unit, { color: colors.textSecondary }]}>L</Text>
          </View>
        </View>

        {/* Bouteille Design Circulaire */}
        <TouchableOpacity
          style={styles.bottleContainer}
          onPress={() => router.push('/hydration')}
          activeOpacity={0.7}
        >
          <View style={styles.bottleWithGraduations}>
            {/* Graduations */}
            <View style={styles.graduations}>
              {getGraduations().map((literValue) => {
                // Position alignée avec le niveau d'eau
                const ratio = literValue / (goalMl / 1000);
                const posY = bottleHeight - (ratio * bodyHeight);
                if (posY < neckHeight + 5 || posY > bottleHeight - 5) return null;
                return (
                  <View key={literValue} style={[styles.gradRow, { top: posY }]}>
                    <Text style={[styles.gradText, { color: colors.textMuted }]}>
                      {literValue}L
                    </Text>
                    <View style={[styles.gradLine, { backgroundColor: colors.textMuted }]} />
                  </View>
                );
              })}
            </View>

            {/* Bouteille SVG */}
            <View style={{ width: bottleWidth, height: bottleHeight }}>
              <Svg width={bottleWidth} height={bottleHeight} viewBox={`0 0 ${bottleWidth} ${bottleHeight}`}>
                <Defs>
                  <SvgGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#06B6D4" stopOpacity="1" />
                    <Stop offset="1" stopColor="#06B6D4" stopOpacity="0.5" />
                  </SvgGradient>
                  <ClipPath id="bottleClip">
                    <Path d={bottlePath} />
                  </ClipPath>
                </Defs>

                {/* Fond bouteille */}
                <Path d={bottlePath} fill={`${isDark ? '#06B6D4' : '#06B6D4'}10`} />

                {/* Eau */}
                {clampedFill > 0 && (
                  <Path
                    d={generateWaterPath()}
                    fill="url(#waterGrad)"
                    clipPath="url(#bottleClip)"
                  />
                )}

                {/* Bulles */}
                {bubbles.map(b => (
                  <Circle key={b.id} cx={b.x} cy={b.y} r={b.size} fill="white" opacity={0.6} />
                ))}

                {/* Contour */}
                <Path d={bottlePath} fill="none" stroke="#06B6D4" strokeWidth={2.5} opacity={0.5} />
              </Svg>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
        <LinearGradient
          colors={['#06B6D4', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${percentage}%` }]}
        />
      </View>

      {/* Boutons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButtonSmall, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}
          onPress={() => handleAdd(-250)}
          activeOpacity={0.7}
        >
          <Minus size={18} color="#EF4444" strokeWidth={2.5} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)' }]}
          onPress={() => handleAdd(250)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#06B6D4" strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: '#06B6D4' }]}>250ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)' }]}
          onPress={() => handleAdd(500)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#06B6D4" strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: '#06B6D4' }]}>500ml</Text>
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
    position: 'relative',
    overflow: 'hidden',
  },
  toast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '800',
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
  bottleContainer: {
    alignItems: 'flex-end',
  },
  bottleWithGraduations: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  graduations: {
    height: 130,
    width: 40,
    position: 'relative',
    marginRight: 4,
  },
  gradRow: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gradText: {
    fontSize: 9,
    fontWeight: '700',
  },
  gradLine: {
    width: 6,
    height: 1.5,
    opacity: 0.4,
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
