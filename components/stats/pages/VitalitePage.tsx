// ============================================
// SANTÉ PAGE - Sommeil, Séances, Signes Vitaux, Pas
// Lit les données depuis StatsHealthContext (chargement unique partagé)
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, RefreshControl, Modal, DeviceEventEmitter } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader } from '../StatsHeader';
import { StatsDetailModal } from '../StatsDetailModal';
import { HealthKitConnectCard } from '../HealthKitConnectCard';
import { SkeletonGrid } from '../SkeletonCard';
import { Moon, Flame, Heart, Footprints, X, Star, Lock, ArrowRight, Check, Sparkles, TrendingUp, BarChart2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SLEEP_DURATION_RANGES, HRV_RANGES, RESTING_HEART_RATE_RANGES } from '@/lib/healthRanges';
import { formatHoursHM } from '@/lib/formatDuration';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStatsHealth, SanteTab } from '@/lib/StatsHealthContext';
import { usePremium } from '@/context/PremiumContext';

import { SommeilTab } from './sante/SommeilTab';
import { SeancesTab } from './sante/SeancesTab';
import { SignesVitauxTab } from './sante/SignesVitauxTab';
import { PasTab } from './sante/PasTab';

interface VitalitePageProps {
  forcedTab?: SanteTab;
  onNavigateToTab?: (tab: string) => void;
}

const premiumStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  moonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  moonBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  pmTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 8,
  },
  pmSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8F7FF',
    borderRadius: 14,
    padding: 12,
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 16,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 10,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  ctaSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

// Parse date sûr : 'yyyy-MM-dd' en local (évite le jour précédent à l'ouest d'UTC)
const toLocalDate = (v: any): Date =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseISO(v) : new Date(v);

export const VitalitePage: React.FC<VitalitePageProps> = React.memo(({ forcedTab }) => {
  const { colors, isDark, screenBackground } = useTheme();
  const { t } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = fr;

  const {
    isHealthKitConnected,
    loading,
    refreshing,
    tabLoading,
    connecting,
    selectedPeriod,
    setSelectedPeriod,
    healthData,
    todaySteps,
    todayCalories,
    todayDistance,
    todayExerciseMinutes,
    todayStandHours,
    todayFloors,
    todayMindfulMinutes,
    todayHydration,
    vitalHistory,
    sleepPhasesData,
    sleepComparisonData,
    rawSleepHistory,
    loadedTabs,
    requestTabData,
    handleRefresh,
    handleConnectHealthKit,
  } = useStatsHealth();

  // Tab actif, fixe si forcedTab est défini (chaque page PagerView est dédiée à un seul onglet)
  const [activeTab] = useState<SanteTab>(forcedTab || 'sommeil');
  const { isPremium } = usePremium();

  // Modal premium, s'affiche une seule fois par session, jamais si premium
  const hasShownModal = useRef(false);
  const [showPremiumModal, setShowPremiumModal] = useState(() => {
    if (isPremium || forcedTab !== 'sommeil') return false;
    hasShownModal.current = true;
    return true;
  });

  useEffect(() => {
    if (forcedTab !== 'sommeil' || isPremium) return;
    const sub = DeviceEventEmitter.addListener('YOROI_STATS_PAGE_FOCUS', ({ pageId }) => {
      if (pageId === 'sommeil' && !hasShownModal.current) {
        hasShownModal.current = true;
        setShowPremiumModal(true);
      }
    });
    return () => sub.remove();
  }, [forcedTab, isPremium]);

  // Modal de détail
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  // Booléen stable : vrai uniquement quand CET onglet est chargé
  // Évite de se redéclencher quand un AUTRE onglet finit de charger
  const isTabLoaded = loadedTabs.has(activeTab);

  // Skeleton forcé dès le mount si le tab n'est pas encore chargé
  // Évite le flash blanc entre le mount du composant et le premier rendu du skeleton
  const [mountLoading, setMountLoading] = React.useState(!isTabLoaded && activeTab !== 'seances');
  useEffect(() => {
    if (isTabLoaded) setMountLoading(false);
  }, [isTabLoaded]);

  useEffect(() => {
    // Ne pas charger si le refresh est déjà en cours (handleRefresh s'en charge)
    if (!isTabLoaded && !refreshing) {
      // Passe isHealthKitConnected directement pour éviter les stale refs dans le contexte
      requestTabData(activeTab, isHealthKitConnected);
    }
  }, [activeTab, isTabLoaded, isHealthKitConnected, refreshing, requestTabData]);

  // Titres / descriptions
  const TAB_CONFIG = useMemo(() => [
    { key: 'sommeil' as SanteTab, label: t('vitality.sommeil'), Icon: Moon, iconColor: '#6366F1', activeColor: '#6366F1' },
    { key: 'seances' as SanteTab, label: t('vitality.seances'), Icon: Flame, iconColor: '#F97316', activeColor: '#F97316' },
    { key: 'signes' as SanteTab, label: t('vitality.signesVitaux'), Icon: Heart, iconColor: '#EC4899', activeColor: '#EC4899' },
    { key: 'pas' as SanteTab, label: t('vitality.pas'), Icon: Footprints, iconColor: '#10B981', activeColor: '#10B981' },
  ], [t]);

  const pageTitle = forcedTab === 'sommeil' ? t('vitality.sommeil')
    : forcedTab === 'pas' ? t('vitality.pas')
    : forcedTab === 'signes' ? t('vitality.signesVitaux')
    : forcedTab === 'seances' ? t('vitality.seances')
    : t('vitality.sante');

  const pageDesc = forcedTab === 'sommeil' ? t('vitality.analyzeNights')
    : forcedTab === 'pas' ? t('vitality.dailyActivity')
    : forcedTab === 'signes' ? t('vitality.vitalSigns')
    : forcedTab === 'seances' ? t('vitality.trainingHistory')
    : t('vitality.syncHealthApp');

  const getModalData = useCallback(() => {
    if (!selectedMetric) return [];
    // Règle 4 : deux lignes (jour+mois / année)
    const fmtLabel = (d: Date) => `${format(d, 'd MMM', { locale: dateLocale })}\n${format(d, 'yyyy')}`;
    // Règle 3 : plus récent à GAUCHE → tri DESC
    const toDesc = <T extends { date: string }>(arr: T[]) => [...arr].sort((a, b) => b.date.localeCompare(a.date));
    switch (selectedMetric.key) {
      case 'sleep':
      case 'sleep_quality':
        return toDesc(vitalHistory.sleep).map((s) => ({
          value: s.value,
          label: fmtLabel(toLocalDate(s.date)),
          date: s.date,
        }));
      case 'heart_rate':
      case 'resting_hr':
        return toDesc(vitalHistory.heartRate).map((h) => ({
          value: h.value,
          label: fmtLabel(toLocalDate(h.date)),
          date: h.date,
        }));
      case 'hrv':
        return toDesc(vitalHistory.hrv).map((h) => ({
          value: h.value,
          label: fmtLabel(toLocalDate(h.date)),
          date: h.date,
        }));
      case 'spo2':
        return toDesc(vitalHistory.spo2).map((s) => ({
          value: s.value,
          label: fmtLabel(toLocalDate(s.date)),
          date: s.date,
        }));
      case 'respiratory_rate':
        return toDesc(vitalHistory.respiratoryRate).map((r) => ({
          value: r.value,
          label: fmtLabel(toLocalDate(r.date)),
          date: r.date,
        }));
      default:
        return [];
    }
  }, [selectedMetric, vitalHistory, dateLocale]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBackground }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={100}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => handleRefresh(activeTab)}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <StatsHeader
        title={pageTitle}
        description={pageDesc}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Barre de sous-onglets, masquée si forcedTab (chaque page PagerView = 1 onglet) */}
      {!forcedTab && (
        <View style={styles.tabBarContainer}>
          <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            {TAB_CONFIG.map(({ key, label, Icon, iconColor, activeColor }) => {
              const isActive = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.tabPill,
                    isActive
                      ? { backgroundColor: activeColor, shadowColor: activeColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
                      : {},
                  ]}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={15}
                    color={isActive ? '#FFFFFF' : (isDark ? colors.textMuted : iconColor)}
                    strokeWidth={2.5}
                  />
                  <Text style={[
                    styles.tabPillText,
                    { color: isActive ? '#FFFFFF' : (isDark ? colors.textMuted : iconColor) },
                    isActive && { fontWeight: '700' },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Contenu de l'onglet actif */}
      <View style={styles.tabContent}>
        {(mountLoading || tabLoading || (!isTabLoaded && activeTab !== 'seances')) && (
          <SkeletonGrid />
        )}

        {activeTab === 'sommeil' && !isHealthKitConnected && !loading && !mountLoading && (
          <HealthKitConnectCard onConnect={handleConnectHealthKit} isConnecting={connecting} />
        )}
        {activeTab === 'sommeil' && isHealthKitConnected && isTabLoaded && !tabLoading && !mountLoading && (
          <SommeilTab
            sleep={healthData?.sleep}
            sleepPhasesData={sleepPhasesData}
            sleepComparisonData={sleepComparisonData}
            sleepHistory={vitalHistory.sleep}
            rawSleepHistory={rawSleepHistory}
            mindfulMinutes={todayMindfulMinutes}
            onMetricPress={setSelectedMetric}
          />
        )}

        {activeTab === 'seances' && (
          <SeancesTab period={selectedPeriod} />
        )}

        {activeTab === 'signes' && !isHealthKitConnected && !loading && (
          <HealthKitConnectCard onConnect={handleConnectHealthKit} isConnecting={connecting} />
        )}
        {activeTab === 'signes' && isHealthKitConnected && isTabLoaded && !tabLoading && (
          <SignesVitauxTab
            heartRate={healthData?.heartRate}
            hrv={healthData?.hrv}
            oxygenSaturation={healthData?.oxygenSaturation}
            respiratoryRate={healthData?.respiratoryRate}
            vo2max={healthData?.vo2max}
            bloodPressure={healthData?.bloodPressure}
            bodyTemperature={healthData?.bodyTemperature}
            bloodGlucose={healthData?.bloodGlucose}
            heartRateHistory={vitalHistory.heartRate}
            hrvHistory={vitalHistory.hrv}
            spo2History={vitalHistory.spo2}
            respiratoryRateHistory={vitalHistory.respiratoryRate}
            vo2maxHistory={vitalHistory.vo2max}
            bodyTemperatureHistory={vitalHistory.bodyTemperature}
            bloodGlucoseHistory={vitalHistory.bloodGlucose}
            onMetricPress={setSelectedMetric}
          />
        )}

        {activeTab === 'pas' && !isHealthKitConnected && !loading && (
          <HealthKitConnectCard onConnect={handleConnectHealthKit} isConnecting={connecting} />
        )}
        {activeTab === 'pas' && isHealthKitConnected && isTabLoaded && !tabLoading && (
          <PasTab
            steps={todaySteps}
            calories={Math.round(todayCalories)}
            distance={todayDistance}
            exerciseMinutes={todayExerciseMinutes}
            standHours={todayStandHours}
            floors={todayFloors}
            todayHydration={todayHydration}
            weeklyExerciseMinutes={vitalHistory.exerciseMinutes
              .slice(0, 7)
              .reduce((sum, d) => sum + (d.value || 0), 0)}
            stepsHistory={vitalHistory.steps}
            caloriesHistory={vitalHistory.calories}
            distanceHistory={vitalHistory.distance}
            exerciseMinutesHistory={vitalHistory.exerciseMinutes}
            standHoursHistory={vitalHistory.standHours}
          />
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* ── Modal Premium Sommeil */}
      <Modal
        visible={showPremiumModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={premiumStyles.overlay}>
          <View style={premiumStyles.sheet}>

            {/* ── En-tête dégradé nuit */}
            <LinearGradient
              colors={['#1E1B4B', '#312E81', '#4338CA', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={premiumStyles.header}
            >
              {/* Bouton fermer */}
              <TouchableOpacity
                style={premiumStyles.closeBtn}
                onPress={() => setShowPremiumModal(false)}
                activeOpacity={0.7}
              >
                <X size={16} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Badge PREMIUM */}
              <View style={premiumStyles.moonRow}>
                <View style={premiumStyles.moonBadge}>
                  <Star size={10} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
                  <Text style={premiumStyles.moonBadgeText}>PREMIUM</Text>
                </View>
              </View>

              {/* Titre principal */}
              <Text style={premiumStyles.pmTitle}>
                {'Dors mieux,\nperforms plus fort'}
              </Text>
              <Text style={premiumStyles.pmSubtitle}>
                Tu accèdes à 7 jours d'historique. Passe Premium{'\n'}pour débloquer l'analyse complète de tes nuits.
              </Text>
            </LinearGradient>

            {/* ── Liste des avantages */}
            <View style={premiumStyles.body}>
              {/* Feature 1 */}
              <View style={premiumStyles.featureRow}>
                <View style={[premiumStyles.featureIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Moon size={18} color="#6366F1" strokeWidth={2} />
                </View>
                <View style={premiumStyles.featureText}>
                  <Text style={premiumStyles.featureTitle}>30 jours d'historique de sommeil</Text>
                  <Text style={premiumStyles.featureDesc}>Vois si tu dors mieux semaine après semaine</Text>
                </View>
                <View style={premiumStyles.checkCircle}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>

              {/* Feature 2 */}
              <View style={premiumStyles.featureRow}>
                <View style={[premiumStyles.featureIconBox, { backgroundColor: '#FFF7ED' }]}>
                  <BarChart2 size={18} color="#F97316" strokeWidth={2} />
                </View>
                <View style={premiumStyles.featureText}>
                  <Text style={premiumStyles.featureTitle}>Phases de sommeil détaillées</Text>
                  <Text style={premiumStyles.featureDesc}>Profond, léger, REM, analyse nuit par nuit</Text>
                </View>
                <View style={premiumStyles.checkCircle}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>

              {/* Feature 3 */}
              <View style={premiumStyles.featureRow}>
                <View style={[premiumStyles.featureIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <TrendingUp size={18} color="#10B981" strokeWidth={2} />
                </View>
                <View style={premiumStyles.featureText}>
                  <Text style={premiumStyles.featureTitle}>Score & tendances avancées</Text>
                  <Text style={premiumStyles.featureDesc}>Comprends l'impact du sommeil sur tes perfs</Text>
                </View>
                <View style={premiumStyles.checkCircle}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>

              {/* Feature 4 */}
              <View style={premiumStyles.featureRow}>
                <View style={[premiumStyles.featureIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Sparkles size={18} color="#F59E0B" strokeWidth={2} />
                </View>
                <View style={premiumStyles.featureText}>
                  <Text style={premiumStyles.featureTitle}>Recommandations personnalisées</Text>
                  <Text style={premiumStyles.featureDesc}>Des conseils concrets pour améliorer tes nuits</Text>
                </View>
                <View style={premiumStyles.checkCircle}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>
            </View>

            {/* ── CTA */}
            <View style={premiumStyles.ctaWrapper}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowPremiumModal(false);
                  router.push('/paywall' as never);
                }}
              >
                <LinearGradient
                  colors={['#F59E0B', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={premiumStyles.cta}
                >
                  <Star size={16} color="#FFF" fill="#FFF" strokeWidth={0} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={premiumStyles.ctaText}>Passer Premium</Text>
                    <Text style={premiumStyles.ctaSubtext}>Essai gratuit disponible</Text>
                  </View>
                  <ArrowRight size={16} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowPremiumModal(false)}
                activeOpacity={0.7}
              >
                <Text style={premiumStyles.skipText}>Non merci, rester en version gratuite</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {selectedMetric && (
        <StatsDetailModal
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.label}
          subtitle={t('statsPages.fullEvolution')}
          data={getModalData()}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.key}
          healthRange={
            selectedMetric.key === 'sleep' || selectedMetric.key === 'sleep_quality' ? SLEEP_DURATION_RANGES :
            selectedMetric.key === 'resting_hr' || selectedMetric.key === 'heart_rate' ? RESTING_HEART_RATE_RANGES :
            selectedMetric.key === 'hrv' ? HRV_RANGES :
            undefined
          }
          formatValue={
            (selectedMetric.key === 'sleep' || selectedMetric.key === 'sleep_quality')
              ? (h: number) => formatHoursHM(h)
              : undefined
          }
        />
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  tabBarContainer: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
  },
  tabPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabContent: {
    flex: 1,
  },
});
