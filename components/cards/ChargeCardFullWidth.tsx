// ============================================
// CHARGE CARD - Pleine Largeur Premium
// ============================================

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Zap, Activity, TrendingUp, AlertCircle, Settings } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

interface ChargeCardFullWidthProps {
  level?: 'none' | 'light' | 'moderate' | 'intense';
  onPress?: () => void;
}

export const ChargeCardFullWidth: React.FC<ChargeCardFullWidthProps> = ({
  level = 'none',
  onPress,
}) => {
  const { colors, isDark } = useTheme();

  // Animations
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const getChargeInfo = () => {
    switch (level) {
      case 'none':
        return {
          label: 'Aucune Donnée',
          subtitle: 'Commencez ton premier entraînement',
          percentage: 0,
          color: '#94A3B8',
          gradient: ['#94A3B8', '#64748B'] as const,
          icon: Activity,
          recommendation: 'Ajoutez ton première séance d\'entraînement',
        };
      case 'light':
        return {
          label: 'Repos Actif',
          subtitle: 'Charge légère - Récupération optimale',
          percentage: 33,
          color: '#10B981',
          gradient: ['#10B981', '#059669'] as const,
          icon: Activity,
          recommendation: 'Journée idéale pour un entraînement intense',
        };
      case 'intense':
        return {
          label: 'Charge Élevée',
          subtitle: 'Besoin de récupération',
          percentage: 90,
          color: '#EF4444',
          gradient: ['#EF4444', '#DC2626'] as const,
          icon: AlertCircle,
          recommendation: 'Priorisez la récupération aujourd\'hui',
        };
      default:
        return {
          label: 'Charge Modérée',
          subtitle: 'Équilibre optimal',
          percentage: 65,
          color: '#F59E0B',
          gradient: ['#F59E0B', '#D97706'] as const,
          icon: Zap,
          recommendation: 'Continuez ton routine d\'entraînement',
        };
    }
  };

  const chargeInfo = getChargeInfo();
  const Icon = chargeInfo.icon;

  // Pulse animation - speed varies by level
  useEffect(() => {
    const speed = level === 'light' ? 2000 : level === 'intense' ? 800 : 1200;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: speed,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: speed,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [level]);

  // Fill animation
  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: chargeInfo.percentage,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [chargeInfo.percentage]);

  // Icon scale animation - more intense for higher charge
  useEffect(() => {
    const intensity = level === 'light' ? 1.08 : level === 'intense' ? 1.2 : 1.12;
    const speed = level === 'light' ? 1500 : level === 'intense' ? 600 : 1000;

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: intensity,
          duration: speed,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: speed,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [level]);

  // Glow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const handleViewDetails = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/charge');
  };

  const handleAddTraining = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-training');

    // Bounce animation
    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1.4,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
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
          <Animated.View
            style={{
              transform: [{ scale: iconScale }],
            }}
          >
            <LinearGradient
              colors={chargeInfo.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.icon}
            >
              <Animated.View style={{ opacity: glowOpacity }}>
                <Icon size={22} color="#FFFFFF" strokeWidth={2.5} />
              </Animated.View>
            </LinearGradient>
          </Animated.View>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Charge d'Entraînement
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {chargeInfo.subtitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: `${chargeInfo.color}15` }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/charge');
          }}
          activeOpacity={0.7}
        >
          <Settings size={20} color={chargeInfo.color} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Niveau principal */}
      <TouchableOpacity
        style={styles.mainSection}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/charge');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.levelSection}>
          <Text style={[styles.levelText, { color: chargeInfo.color }]}>
            {chargeInfo.label}
          </Text>
          <Animated.View
            style={[
              styles.percentageContainer,
              { transform: [{ scale: pulseScale }] },
            ]}
          >
            <Text style={[styles.percentageValue, { color: colors.textPrimary }]}>
              {chargeInfo.percentage}
            </Text>
            <Text style={[styles.percentageUnit, { color: colors.textSecondary }]}>%</Text>
          </Animated.View>
        </View>

        {/* Recommandation */}
        <View style={[styles.recommendationBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <TrendingUp size={16} color={chargeInfo.color} strokeWidth={2.5} />
          <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
            {chargeInfo.recommendation}
          </Text>
        </View>
        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <LinearGradient
            colors={chargeInfo.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${chargeInfo.percentage}%` }]}
          />
        </View>

        {/* Métriques */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              INTENSITÉ
            </Text>
            <Text style={[styles.metricValue, { color: chargeInfo.color }]}>
              {level === 'none' ? '-' : level === 'light' ? 'Faible' : level === 'intense' ? 'Élevée' : 'Moyenne'}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              REPOS NÉCESSAIRE
            </Text>
            <Text style={[styles.metricValue, { color: chargeInfo.color }]}>
              {level === 'none' ? '-' : level === 'light' ? '12h' : level === 'intense' ? '48h' : '24h'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Boutons d'action */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: level === 'none' ? 'rgba(59, 130, 246, 0.15)' : `${chargeInfo.color}15` }]}
          onPress={handleAddTraining}
          activeOpacity={0.7}
        >
          <Activity size={18} color={level === 'none' ? '#3B82F6' : chargeInfo.color} strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: level === 'none' ? '#3B82F6' : chargeInfo.color }]}>Nouvel Entraînement</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonSmall, { backgroundColor: `${chargeInfo.color}15` }]}
          onPress={handleViewDetails}
          activeOpacity={0.7}
        >
          <TrendingUp size={18} color={chargeInfo.color} strokeWidth={2.5} />
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSection: {
    marginBottom: 12,
  },
  levelSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  percentageValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  percentageUnit: {
    fontSize: 16,
    fontWeight: '700',
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
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
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.5,
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
