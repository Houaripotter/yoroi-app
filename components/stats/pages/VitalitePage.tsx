// ============================================
// SANTÉ PAGE - Sommeil, Séances, Signes Vitaux, Pas
// Lit les données depuis StatsHealthContext (chargement unique partagé)
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader } from '../StatsHeader';
import { StatsDetailModal } from '../StatsDetailModal';
import { HealthKitConnectCard } from '../HealthKitConnectCard';
import { SkeletonGrid } from '../SkeletonCard';
import { Moon, Flame, Heart, Footprints } from 'lucide-react-native';
import { SLEEP_DURATION_RANGES, HRV_RANGES, RESTING_HEART_RATE_RANGES } from '@/lib/healthRanges';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStatsHealth, SanteTab } from '@/lib/StatsHealthContext';

import { SommeilTab } from './sante/SommeilTab';
import { SeancesTab } from './sante/SeancesTab';
import { SignesVitauxTab } from './sante/SignesVitauxTab';
import { PasTab } from './sante/PasTab';

interface VitalitePageProps {
  forcedTab?: SanteTab;
  onNavigateToTab?: (tab: string) => void;
}

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

  // Tab actif — fixe si forcedTab est défini (chaque page PagerView est dédiée à un seul onglet)
  const [activeTab] = useState<SanteTab>(forcedTab || 'sommeil');

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
    switch (selectedMetric.key) {
      case 'sleep':
      case 'sleep_quality':
        return vitalHistory.sleep.map((s) => ({
          value: s.value,
          label: format(new Date(s.date), 'd MMM', { locale: dateLocale }),
          date: s.date,
        }));
      case 'heart_rate':
      case 'resting_hr':
        return vitalHistory.heartRate.map((h) => ({
          value: h.value,
          label: format(new Date(h.date), 'd MMM', { locale: dateLocale }),
          date: h.date,
        }));
      case 'hrv':
        return vitalHistory.hrv.map((h) => ({
          value: h.value,
          label: format(new Date(h.date), 'd MMM', { locale: dateLocale }),
          date: h.date,
        }));
      case 'spo2':
        return vitalHistory.spo2.map((s) => ({
          value: s.value,
          label: format(new Date(s.date), 'd MMM', { locale: dateLocale }),
          date: s.date,
        }));
      case 'respiratory_rate':
        return vitalHistory.respiratoryRate.map((r) => ({
          value: r.value,
          label: format(new Date(r.date), 'd MMM', { locale: dateLocale }),
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

      {/* Barre de sous-onglets — masquée si forcedTab (chaque page PagerView = 1 onglet) */}
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
        {tabLoading && (
          <SkeletonGrid count={4} cardHeight={160} />
        )}

        {activeTab === 'sommeil' && !isHealthKitConnected && !loading && (
          <HealthKitConnectCard onConnect={handleConnectHealthKit} isConnecting={connecting} />
        )}
        {activeTab === 'sommeil' && isHealthKitConnected && (
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
        {activeTab === 'signes' && isHealthKitConnected && (
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
        {activeTab === 'pas' && isHealthKitConnected && (
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
