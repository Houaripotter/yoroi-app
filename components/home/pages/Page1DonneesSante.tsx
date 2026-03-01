// ============================================
// YOROI - PAGE DONNEES SANTE (Apple Health Style)
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { healthConnect } from '@/lib/healthConnect';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  Heart,
  Footprints,
  Moon,
  Wind,
  Droplets,
  Activity,
  Flame,
  ChevronRight,
  Smartphone,
} from 'lucide-react-native';
import { logger } from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_PADDING = 16;
const HALF_CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

interface HealthCardData {
  key: string;
  label: string;
  value: string | null;
  subValue?: string;
  color: string;
  icon: React.ReactNode;
  onPress: () => void;
  fullWidth?: boolean;
}

// Activity rings mini component
const ActivityRings: React.FC<{
  move: { current: number | null; goal: number };
  exercise: { current: number | null; goal: number };
  stand: { current: number | null; goal: number };
  colors: any;
  t: (key: string, params?: any) => string;
}> = ({ move, exercise, stand, colors, t }) => {
  const rings = [
    { label: t('home.moveRing'), current: move.current, goal: move.goal, color: '#FF3B30', unit: 'kcal' },
    { label: t('home.exerciseRing'), current: exercise.current, goal: exercise.goal, color: '#30D158', unit: 'min' },
    { label: t('home.standRing'), current: stand.current, goal: stand.goal, color: '#0A84FF', unit: 'h' },
  ];

  return (
    <View style={ringStyles.container}>
      {rings.map((ring, i) => {
        const progress = ring.current != null ? Math.min(ring.current / ring.goal, 1) : 0;
        const barWidth = `${Math.round(progress * 100)}%`;
        return (
          <View key={i} style={ringStyles.ringRow}>
            <View style={ringStyles.labelRow}>
              <View style={[ringStyles.dot, { backgroundColor: ring.color }]} />
              <Text style={[ringStyles.label, { color: colors.textSecondary }]}>{ring.label}</Text>
            </View>
            <View style={[ringStyles.barBg, { backgroundColor: ring.color + '25' }]}>
              <View style={[ringStyles.barFill, { width: barWidth as any, backgroundColor: ring.color }]} />
            </View>
            <Text style={[ringStyles.value, { color: ring.color }]}>
              {ring.current != null ? `${ring.current}` : '--'}/{ring.goal} {ring.unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const ringStyles = StyleSheet.create({
  container: { gap: 8 },
  ringRow: { gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  value: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
});

export const Page1DonneesSante: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [activityData, setActivityData] = useState<{
    activeCalories: number | null;
    exerciseMinutes: number | null;
    standHours: number | null;
    goals: { move: number; exercise: number; stand: number };
  } | null>(null);
  const [steps, setSteps] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<{ current: number | null; min: number; max: number; resting: number | null } | null>(null);
  const [oxygen, setOxygen] = useState<number | null>(null);
  const [respiratory, setRespiratory] = useState<number | null>(null);
  const [restingCalories, setRestingCalories] = useState<number | null>(null);
  const [sleep, setSleep] = useState<{ hours: number; minutes: number } | null>(null);

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      const status = healthConnect.getSyncStatus();
      const connected = status.isConnected;
      setIsConnected(connected);

      if (!connected) return;

      // Load all data in parallel
      const [
        activityResult,
        stepsResult,
        distanceResult,
        heartRateResult,
        oxygenResult,
        respiratoryResult,
        caloriesResult,
        sleepResult,
      ] = await Promise.allSettled([
        healthConnect.getTodayActivitySummary(),
        healthConnect.getTodaySteps(),
        healthConnect.getTodayDistance(),
        healthConnect.getTodayHeartRate(),
        healthConnect.getOxygenSaturation(),
        healthConnect.getRespiratoryRate(),
        healthConnect.getTodayCalories(),
        healthConnect.getLastSleep(),
      ]);

      if (activityResult.status === 'fulfilled' && activityResult.value) {
        setActivityData(activityResult.value);
      }

      if (stepsResult.status === 'fulfilled' && stepsResult.value) {
        setSteps(stepsResult.value.count);
      }

      if (distanceResult.status === 'fulfilled' && distanceResult.value) {
        setDistance(distanceResult.value.total);
      }

      if (heartRateResult.status === 'fulfilled' && heartRateResult.value) {
        const hr = heartRateResult.value;
        setHeartRate({
          current: hr.current ?? null,
          min: hr.min,
          max: hr.max,
          resting: hr.resting ?? null,
        });
      }

      if (oxygenResult.status === 'fulfilled' && oxygenResult.value) {
        setOxygen(oxygenResult.value.value);
      }

      if (respiratoryResult.status === 'fulfilled' && respiratoryResult.value) {
        setRespiratory(respiratoryResult.value.value);
      }

      if (caloriesResult.status === 'fulfilled' && caloriesResult.value) {
        setRestingCalories(caloriesResult.value.basal);
      }

      if (sleepResult.status === 'fulfilled' && sleepResult.value) {
        const totalMin = sleepResult.value.duration || 0;
        setSleep({
          hours: Math.floor(totalMin / 60),
          minutes: Math.round(totalMin % 60),
        });
      }
    } catch (error) {
      logger.error('[DonneesSante] Error loading health data:', error);
    }
  };

  const navigateToSante = (section: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(tabs)/stats', params: { tab: 'sante', section } } as any);
  };

  const handleConnect = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    try {
      await healthConnect.initialize();
      loadHealthData();
    } catch (error) {
      logger.error('[DonneesSante] Error connecting:', error);
    }
  };

  // Not connected card - use View (not ScrollView) to not steal horizontal swipe gestures
  if (isConnected === false) {
    return (
      <View style={[styles.scrollView, styles.content]}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('home.healthData')}</Text>

        <TouchableOpacity
          style={[styles.connectCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          onPress={handleConnect}
          activeOpacity={0.7}
        >
          <View style={[styles.connectIconBg, { backgroundColor: '#FF375F15' }]}>
            <Smartphone size={28} color="#FF375F" />
          </View>
          <Text style={[styles.connectTitle, { color: colors.textPrimary }]}>
            {t('home.connectHealth')}
          </Text>
          <Text style={[styles.connectSubtitle, { color: colors.textMuted }]}>
            {t('home.connectHealthDesc')}
          </Text>
          <View style={[styles.connectButton, { backgroundColor: '#FF375F' }]}>
            <Text style={styles.connectButtonText}>{t('home.connectHealth')}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (isConnected === null) {
    return (
      <View style={[styles.scrollView, styles.content]}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('home.healthData')}</Text>
      </View>
    );
  }

  // Build cards data
  const cards: HealthCardData[] = [];

  // 1. Activity rings (full width)
  // Handled separately as a special card

  // 2. Steps
  cards.push({
    key: 'steps',
    label: t('home.stepsCard'),
    value: steps != null ? steps.toLocaleString('fr-FR') : null,
    color: '#F97316',
    icon: <Footprints size={18} color="#F97316" />,
    onPress: () => navigateToSante('pas'),
  });

  // 3. Distance
  cards.push({
    key: 'distance',
    label: t('home.distanceCard'),
    value: distance != null ? `${distance.toFixed(1)} km` : null,
    color: '#3B82F6',
    icon: <Activity size={18} color="#3B82F6" />,
    onPress: () => navigateToSante('pas'),
  });

  // 4. Heart rate
  cards.push({
    key: 'heartRate',
    label: t('home.heartRateCard'),
    value: heartRate ? `${heartRate.min}-${heartRate.max}` : null,
    subValue: heartRate ? 'BPM' : undefined,
    color: '#EC4899',
    icon: <Heart size={18} color="#EC4899" />,
    onPress: () => navigateToSante('signesVitaux'),
  });

  // 5. Resting HR
  cards.push({
    key: 'restingHR',
    label: t('home.restingHR'),
    value: heartRate?.resting ? `${heartRate.resting}` : null,
    subValue: heartRate?.resting ? 'BPM' : undefined,
    color: '#EF4444',
    icon: <Heart size={18} color="#EF4444" />,
    onPress: () => navigateToSante('signesVitaux'),
  });

  // 6. Blood oxygen
  cards.push({
    key: 'oxygen',
    label: t('home.oxygenCard'),
    value: oxygen != null ? `${oxygen}%` : null,
    color: '#0EA5E9',
    icon: <Droplets size={18} color="#0EA5E9" />,
    onPress: () => navigateToSante('signesVitaux'),
  });

  // 7. Respiratory rate
  cards.push({
    key: 'respiratory',
    label: t('home.respiratoryCard'),
    value: respiratory != null ? `${respiratory}` : null,
    subValue: respiratory != null ? 'resp/min' : undefined,
    color: '#8B5CF6',
    icon: <Wind size={18} color="#8B5CF6" />,
    onPress: () => navigateToSante('signesVitaux'),
  });

  // 8. Resting energy
  cards.push({
    key: 'restingEnergy',
    label: t('home.restingEnergy'),
    value: restingCalories != null ? restingCalories.toLocaleString('fr-FR') : null,
    subValue: restingCalories != null ? 'kcal' : undefined,
    color: '#F97316',
    icon: <Flame size={18} color="#F97316" />,
    onPress: () => navigateToSante('calories'),
  });

  // 9. Sleep
  cards.push({
    key: 'sleep',
    label: t('home.sleepCard2'),
    value: sleep ? `${sleep.hours}h ${sleep.minutes.toString().padStart(2, '0')}min` : null,
    color: '#6366F1',
    icon: <Moon size={18} color="#6366F1" />,
    onPress: () => navigateToSante('sommeil'),
  });

  const renderCard = (card: HealthCardData, isHalf: boolean = true) => (
    <TouchableOpacity
      key={card.key}
      style={[
        isHalf ? styles.halfCard : styles.fullCard,
        { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' },
      ]}
      onPress={card.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLabelRow}>
          {card.icon}
          <Text style={[styles.cardLabel, { color: card.color }]} numberOfLines={1}>
            {card.label}
          </Text>
        </View>
        <ChevronRight size={14} color={colors.textMuted} />
      </View>
      <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
        {card.value ?? '--'}
      </Text>
      {card.subValue && (
        <Text style={[styles.cardSubValue, { color: colors.textMuted }]}>
          {card.subValue}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('home.healthData')}</Text>

      {/* Activity Rings Card (full width) */}
      {activityData && (
        <TouchableOpacity
          style={[styles.fullCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
          onPress={() => navigateToSante('pas')}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardLabelRow}>
              <Activity size={18} color="#FF3B30" />
              <Text style={[styles.cardLabel, { color: '#FF3B30' }]}>{t('home.activity')}</Text>
            </View>
            <ChevronRight size={14} color={colors.textMuted} />
          </View>
          <ActivityRings
            move={{ current: activityData.activeCalories, goal: activityData.goals.move }}
            exercise={{ current: activityData.exerciseMinutes, goal: activityData.goals.exercise }}
            stand={{ current: activityData.standHours, goal: activityData.goals.stand }}
            colors={colors}
            t={t}
          />
        </TouchableOpacity>
      )}

      {/* Cards grid (2 per row) */}
      <View style={styles.grid}>
        {cards.map((card) => renderCard(card, true))}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: 8,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  halfCard: {
    width: HALF_CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  fullCard: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginBottom: CARD_GAP,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardSubValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  // Connect card
  connectCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  connectIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  connectSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  connectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
