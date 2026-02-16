// ============================================
// SANTÉ PAGE - Sommeil + Hydratation + Cœur + HealthKit
// Version simple pour test initial avec intégration HealthKit
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { HealthKitConnectCard } from '../HealthKitConnectCard';
import { healthConnect } from '@/lib/healthConnect';
import { Moon, Droplet, Heart, Activity, Wind, Thermometer, Calendar } from 'lucide-react-native';
import { CircularProgress } from '@/components/charts/CircularProgress';
import { logger } from '@/lib/security/logger';

export const SantePage: React.FC = () => {
  const { colors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [isHealthKitConnected, setIsHealthKitConnected] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkHealthKitConnection();
  }, []);

  useEffect(() => {
    if (isHealthKitConnected) {
      loadHealthData();
    }
  }, [selectedPeriod, isHealthKitConnected]);

  const checkHealthKitConnection = async () => {
    try {
      const status = healthConnect.getSyncStatus();
      setIsHealthKitConnected(status.isConnected);

      if (status.isConnected) {
        await loadHealthData();
      }
    } catch (error) {
      logger.error('Error checking HealthKit:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthData = async () => {
    setLoading(true);
    try {
      // Charger toutes les données HealthKit
      const [sleep, heartRate, hrv, spo2, temperature, hydration, respiratoryRate] = await Promise.all([
        healthConnect.getLastSleep(),
        healthConnect.getTodayHeartRate(),
        healthConnect.getTodayHRV(),
        healthConnect.getOxygenSaturation(),
        healthConnect.getBodyTemperature(),
        healthConnect.getTodayHydration(),
        healthConnect.getRespiratoryRate(),
      ]);

      setHealthData({ sleep, heartRate, hrv, spo2, temperature, hydration, respiratoryRate });
    } catch (error) {
      logger.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectHealthKit = async () => {
    setConnecting(true);
    try {
      const success = await healthConnect.connect();
      if (success) {
        setIsHealthKitConnected(true);
        await loadHealthData();
      }
    } catch (error) {
      logger.error('Error connecting HealthKit:', error);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title="Santé"
          description="Données de ta Apple Watch"
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (!isHealthKitConnected) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <StatsHeader
          title="Santé"
          description="Données de ta Apple Watch"
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          showPeriodSelector={false}
        />

        <HealthKitConnectCard
          onConnect={handleConnectHealthKit}
          isConnecting={connecting}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <StatsHeader
        title="Santé"
        description="Données de ta Apple Watch"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Section Sommeil */}
      <StatsSection
        title="Sommeil"
        description="Durée et qualité de ton sommeil"
      >
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <MetricCard
              label="Durée"
              value={healthData?.sleep?.duration || 0}
              unit="h"
              icon={<Moon size={24} color="#6366F1" strokeWidth={2.5} />}
              color="#6366F1"
            />
          </View>

          <View style={styles.gridItem}>
            <MetricCard
              label="Qualité"
              value={healthData?.sleep?.quality || 0}
              unit="/100"
              icon={<Activity size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </View>
        </View>
      </StatsSection>

      {/* Section Cœur */}
      <StatsSection
        title="Cœur"
        description="Fréquence cardiaque et HRV"
      >
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <MetricCard
              label="FC actuelle"
              value={healthData?.heartRate?.current || 0}
              unit="bpm"
              icon={<Heart size={24} color="#EC4899" strokeWidth={2.5} />}
              color="#EC4899"
            />
          </View>

          <View style={styles.gridItem}>
            <MetricCard
              label="HRV"
              value={healthData?.hrv?.value || 0}
              unit="ms"
              icon={<Activity size={24} color="#6366F1" strokeWidth={2.5} />}
              color="#6366F1"
            />
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <MetricCard
              label="FC repos"
              value={healthData?.heartRate?.resting || 0}
              unit="bpm"
              icon={<Heart size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </View>

          <View style={styles.gridItem}>
            <MetricCard
              label="FC moyenne"
              value={healthData?.heartRate?.average || 0}
              unit="bpm"
              icon={<Heart size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </View>
        </View>
      </StatsSection>

      {/* Section Hydratation */}
      <StatsSection
        title="Hydratation"
        description="Consommation d'eau quotidienne"
      >
        <View style={styles.hydrationContainer}>
          <CircularProgress
            percentage={(healthData?.hydration?.current / healthData?.hydration?.goal) * 100 || 0}
            size={180}
            strokeWidth={16}
            color="#06B6D4"
            backgroundColor="#06B6D420"
          />
          <View style={styles.hydrationStats}>
            <MetricCard
              label="Consommé"
              value={healthData?.hydration?.current || 0}
              unit="L"
              icon={<Droplet size={24} color="#06B6D4" strokeWidth={2.5} />}
              color="#06B6D4"
            />
            <View style={{ width: 16 }} />
            <MetricCard
              label="Objectif"
              value={healthData?.hydration?.goal || 2.5}
              unit="L"
              icon={<Droplet size={24} color="#0EA5E9" strokeWidth={2.5} />}
              color="#0EA5E9"
            />
          </View>
        </View>
      </StatsSection>

      {/* Section Oxygène & Respiration */}
      <StatsSection
        title="Oxygène & Respiration"
        description="Saturation en oxygène et fréquence respiratoire"
      >
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <MetricCard
              label="SpO2"
              value={healthData?.spo2?.value || 0}
              unit="%"
              icon={<Activity size={24} color="#0EA5E9" strokeWidth={2.5} />}
              color="#0EA5E9"
            />
          </View>

          <View style={styles.gridItem}>
            <MetricCard
              label="Fréquence resp."
              value={healthData?.respiratoryRate?.value || 0}
              unit="/min"
              icon={<Wind size={24} color="#06B6D4" strokeWidth={2.5} />}
              color="#06B6D4"
            />
          </View>
        </View>
      </StatsSection>

      {/* Section Température */}
      {healthData?.temperature?.value && (
        <StatsSection
          title="Température"
          description="Température corporelle"
        >
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <MetricCard
                label="Température"
                value={healthData.temperature.value.toFixed(1)}
                unit="°C"
                icon={<Thermometer size={24} color="#F97316" strokeWidth={2.5} />}
                color="#F97316"
              />
            </View>

            <View style={styles.gridItem}>
              <MetricCard
                label="Variation"
                value={healthData.temperature.variation?.toFixed(1) || 0}
                unit="°C"
                icon={<Activity size={24} color="#EF4444" strokeWidth={2.5} />}
                color="#EF4444"
              />
            </View>
          </View>
        </StatsSection>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

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
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
  hydrationContainer: {
    alignItems: 'center',
    gap: 24,
  },
  hydrationStats: {
    flexDirection: 'row',
    width: '100%',
  },
});
