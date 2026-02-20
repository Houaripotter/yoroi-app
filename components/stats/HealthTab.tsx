import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Heart,
  Activity,
  Droplet,
  Zap,
  Moon,
  TrendingUp,
  Dumbbell,
  Smartphone,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/design';
import { healthConnect, type HealthData } from '@/lib/healthConnect';
import { getProfile } from '@/lib/database';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import logger from '@/lib/security/logger';

// ============================================
// HEALTH TAB - Embedded in Stats
// ============================================

export function HealthTab() {
  const { colors, isDark } = useTheme();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const loadHealthData = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = healthConnect.getSyncStatus();
      setIsConnected(status.isConnected);

      // Charger le profil pour le nom
      const profile = await getProfile().catch(() => null);
      if (profile?.name) {
        setUserName(profile.name.split(' ')[0]); // Juste le prénom
      }

      if (status.isConnected) {
        const data = await healthConnect.getAllHealthData();
        setHealthData(data);
      }
    } catch (error) {
      logger.error('Erreur chargement métriques santé:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const handleConnect = async () => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);
      const success = await healthConnect.connect();
      if (success) {
        setIsConnected(true);
        await loadHealthData();
      }
    } catch (error) {
      logger.error('Erreur connexion Apple Health:', error);
    }
  };

  // Header avec source de santé - On affiche UNIQUEMENT ce à quoi on se connecte réellement
  // iOS = Apple Santé (HealthKit), Android = Health Connect
  // On ne prétend PAS savoir si les données viennent d'une Apple Watch, Garmin, etc.
  const getHealthSourceInfo = () => {
    if (Platform.OS === 'ios') {
      return {
        icon: Heart,
        label: userName ? `Apple Sante` : 'Apple Sante',
        color: '#FF2D55', // Couleur officielle Apple Health
      };
    } else {
      return {
        icon: Smartphone,
        label: userName ? `Health Connect` : 'Health Connect',
        color: '#4285F4', // Couleur Google
      };
    }
  };

  const sourceInfo = getHealthSourceInfo();
  const SourceIcon = sourceInfo.icon;

  // ============================================
  // NOT CONNECTED STATE
  // ============================================
  if (!isConnected) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadHealthData}
            tintColor={colors.gold}
          />
        }
      >
        <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={[styles.iconCircle, { backgroundColor: sourceInfo.color + '20' }]}>
            <Heart size={48} color={sourceInfo.color} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {Platform.OS === 'ios' ? 'Apple Sante' : 'Health Connect'} Non Connecte
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Connecte YOROI pour acceder a tes metriques avancees : frequence cardiaque, HRV, VO2 Max, sommeil detaille et plus encore.
          </Text>
          <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
            <LinearGradient
              colors={[colors.gold, colors.goldDark || colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectButtonGradient}
            >
              <Text style={styles.connectButtonText}>Se Connecter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ============================================
  // CONNECTED - SHOW METRICS
  // ============================================
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={loadHealthData}
          tintColor={colors.gold}
        />
      }
    >
      {/* Header avec source */}
      <View style={[styles.sourceHeader, { backgroundColor: sourceInfo.color + '15' }]}>
        <SourceIcon size={20} color={sourceInfo.color} />
        <Text style={[styles.sourceLabel, { color: sourceInfo.color }]}>
          {sourceInfo.label}
        </Text>
        <View style={[styles.connectedBadge, { backgroundColor: '#10B981' }]}>
          <Text style={styles.connectedBadgeText}>Connecte</Text>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.quickStatsGrid}>
        {/* Frequence Cardiaque */}
        {healthData?.heartRate && (
          <QuickStatCard
            icon={Heart}
            iconColor="#EF4444"
            label="FC"
            value={`${healthData.heartRate.current || healthData.heartRate.average}`}
            unit="BPM"
            subtitle={`Repos: ${healthData.heartRate.resting}`}
            colors={colors}
          />
        )}

        {/* HRV */}
        {healthData?.heartRateVariability && (
          <QuickStatCard
            icon={Activity}
            iconColor="#8B5CF6"
            label="HRV"
            value={`${healthData.heartRateVariability.value}`}
            unit="ms"
            subtitle={getHRVLevel(healthData.heartRateVariability.value)}
            colors={colors}
          />
        )}

        {/* SpO2 */}
        {healthData?.oxygenSaturation && (
          <QuickStatCard
            icon={Droplet}
            iconColor="#3B82F6"
            label="SpO2"
            value={`${healthData.oxygenSaturation.value}`}
            unit="%"
            subtitle="Saturation O2"
            colors={colors}
          />
        )}

        {/* VO2 Max */}
        {healthData?.vo2Max && (
          <QuickStatCard
            icon={Zap}
            iconColor="#F59E0B"
            label="VO2 Max"
            value={`${healthData.vo2Max.value}`}
            unit=""
            subtitle="ml/kg/min"
            colors={colors}
          />
        )}
      </View>

      {/* Sommeil - Fond violet élégant */}
      {healthData?.sleep && (
        <View style={[styles.sleepCard, { backgroundColor: colors.backgroundCard, overflow: 'hidden' }]}>
          {/* Fond gradient violet */}
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.12)', 'rgba(109, 40, 217, 0.08)', 'rgba(91, 33, 182, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sleepHeader}>
            <View style={[styles.sleepIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Moon size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.sleepTitle, { color: colors.textPrimary }]}>Sommeil</Text>
          </View>
          <View style={styles.sleepContent}>
            <Text style={[styles.sleepDuration, { color: colors.textPrimary }]}>
              {Math.floor(healthData.sleep.duration / 60)}h{healthData.sleep.duration % 60 > 0 ? ` ${healthData.sleep.duration % 60}m` : ''}
            </Text>
            {healthData.sleep.phases && (
              <View style={styles.sleepPhases}>
                <SleepPhase label="Profond" value={healthData.sleep.phases.deep} color="#8B5CF6" total={healthData.sleep.duration} />
                <SleepPhase label="REM" value={healthData.sleep.phases.rem} color="#EC4899" total={healthData.sleep.duration} />
                <SleepPhase label="Leger" value={healthData.sleep.phases.core} color="#06B6D4" total={healthData.sleep.duration} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Calories & Activite */}
      {(healthData?.calories || healthData?.steps) && (
        <View style={[styles.activityCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.activityHeader}>
            <Dumbbell size={20} color="#F97316" />
            <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>Activite</Text>
          </View>
          <View style={styles.activityGrid}>
            {healthData?.steps && (
              <View style={styles.activityItem}>
                <Text style={[styles.activityValue, { color: colors.textPrimary }]}>
                  {healthData.steps.count.toLocaleString()}
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Pas</Text>
              </View>
            )}
            {healthData?.calories && (
              <View style={styles.activityItem}>
                <Text style={[styles.activityValue, { color: colors.textPrimary }]}>
                  {healthData.calories.active}
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>kcal actives</Text>
              </View>
            )}
            {healthData?.distance && (
              <View style={styles.activityItem}>
                <Text style={[styles.activityValue, { color: colors.textPrimary }]}>
                  {healthData.distance.total}
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>km</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Bouton voir plus de details */}
      <TouchableOpacity
        style={[styles.moreDetailsButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Light);
          router.push('/health-metrics');
        }}
        activeOpacity={0.8}
      >
        <View style={styles.moreDetailsContent}>
          <TrendingUp size={20} color={colors.accentText} />
          <View style={styles.moreDetailsText}>
            <Text style={[styles.moreDetailsTitle, { color: colors.textPrimary }]}>
              Voir toutes les metriques
            </Text>
            <Text style={[styles.moreDetailsSubtitle, { color: colors.textSecondary }]}>
              Graphiques, historiques et insights
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ============================================
// QUICK STAT CARD
// ============================================
interface QuickStatCardProps {
  icon: any;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
  subtitle: string;
  colors: any;
}

// Couleurs de fond pour chaque métrique
const getMetricBackground = (label: string): { gradient: string[]; opacity: number } => {
  switch (label) {
    case 'FC':
      // Magma rouge pour fréquence cardiaque
      return { gradient: ['#FF6B6B', '#EE5A24', '#EA2027'], opacity: 0.12 };
    case 'SpO2':
      // Bleu océan pour saturation O2
      return { gradient: ['#74b9ff', '#0984e3', '#0652DD'], opacity: 0.12 };
    case 'HRV':
      // Violet pour HRV
      return { gradient: ['#a29bfe', '#6c5ce7', '#5758BB'], opacity: 0.12 };
    case 'VO2 Max':
      // Orange/Ambre pour VO2 Max
      return { gradient: ['#ffeaa7', '#fdcb6e', '#f39c12'], opacity: 0.12 };
    default:
      return { gradient: ['#95a5a6', '#636e72'], opacity: 0.08 };
  }
};

function QuickStatCard({ icon: Icon, iconColor, label, value, unit, subtitle, colors }: QuickStatCardProps) {
  const bgConfig = getMetricBackground(label);
  // Créer les couleurs avec opacité
  const gradientColors = bgConfig.gradient.map(c => {
    const hex = Math.round(bgConfig.opacity * 255).toString(16).padStart(2, '0');
    return c + hex;
  }) as [string, string, ...string[]];

  return (
    <View style={[styles.quickStatCard, { backgroundColor: colors.backgroundCard, overflow: 'hidden' }]}>
      {/* Fond gradient subtil */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.quickStatIcon, { backgroundColor: iconColor + '25' }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.quickStatValueRow}>
        <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>{value}</Text>
        {unit && <Text style={[styles.quickStatUnit, { color: colors.textSecondary }]}>{unit}</Text>}
      </View>
      <Text style={[styles.quickStatSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

// ============================================
// SLEEP PHASE
// ============================================
function SleepPhase({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  const percentage = Math.round((value / total) * 100);

  return (
    <View style={styles.sleepPhaseItem}>
      <View style={[styles.sleepPhaseDot, { backgroundColor: color }]} />
      <Text style={styles.sleepPhaseLabel}>{label}</Text>
      <Text style={styles.sleepPhaseValue}>
        {hours > 0 ? `${hours}h` : ''}{mins > 0 ? `${mins}m` : ''} ({percentage}%)
      </Text>
    </View>
  );
}

// ============================================
// HELPERS
// ============================================
function getHRVLevel(hrv: number): string {
  if (hrv >= 60) return 'Excellent';
  if (hrv >= 40) return 'Bon';
  if (hrv >= 20) return 'Moyen';
  return 'Faible';
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: 120,
  },
  // Source Header
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sourceLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  connectedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  connectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Empty State
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  connectButton: {
    width: '100%',
  },
  connectButtonGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Quick Stats Grid
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickStatCard: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: 4,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickStatValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  quickStatUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickStatSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Sleep Card
  sleepCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  sleepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sleepIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sleepContent: {
    gap: SPACING.sm,
  },
  sleepDuration: {
    fontSize: 32,
    fontWeight: '700',
  },
  sleepPhases: {
    gap: 6,
  },
  sleepPhaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sleepPhaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sleepPhaseLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    width: 60,
  },
  sleepPhaseValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Activity Card
  activityCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityItem: {
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // More Details Button
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  moreDetailsContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  moreDetailsText: {
    flex: 1,
  },
  moreDetailsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  moreDetailsSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
});
