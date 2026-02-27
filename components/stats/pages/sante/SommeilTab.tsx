import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SleepPhasesBar } from '../../advanced/SleepPhasesBar';
import { ScrollableLineChart } from '../../charts/ScrollableLineChart';
import { Moon, Plus } from 'lucide-react-native';
import { router } from 'expo-router';

interface SommeilTabProps {
  sleep: any;
  sleepPhasesData: {
    avgAwake: number;
    avgRem: number;
    avgCore: number;
    avgDeep: number;
    totalSleepMin: number;
    nightsCount: number;
  };
  sleepComparisonData: {
    heartRate?: { min: number; max: number; avg: number };
    respiratoryRate?: { min: number; max: number; avg: number };
    wristTemperature?: { value: number };
  };
  sleepHistory: { date: string; value: number }[];
  onMetricPress?: (metric: { key: string; label: string; color: string; unit: string; icon: React.ReactNode }) => void;
}

const formatSleepDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const min = Math.round((hours - h) * 60);
  return `${h}h ${min.toString().padStart(2, '0')}min`;
};

type SleepSubTab = 'phases' | 'valeurs' | 'comparaisons';

export const SommeilTab: React.FC<SommeilTabProps> = ({
  sleep,
  sleepPhasesData,
  sleepComparisonData,
  sleepHistory,
  onMetricPress,
}) => {
  const { colors, isDark } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<SleepSubTab>('phases');

  const avgHours = sleepPhasesData.totalSleepMin > 0 ? sleepPhasesData.totalSleepMin / 60 : 0;

  const { avgAwake, avgRem, avgCore, avgDeep } = sleepPhasesData;
  const totalPhases = avgAwake + avgRem + avgCore + avgDeep;
  const pctAwake = totalPhases > 0 ? Math.round((avgAwake / totalPhases) * 100) : 0;
  const pctRem = totalPhases > 0 ? Math.round((avgRem / totalPhases) * 100) : 0;
  const pctCore = totalPhases > 0 ? Math.round((avgCore / totalPhases) * 100) : 0;
  const pctDeep = totalPhases > 0 ? Math.round((avgDeep / totalPhases) * 100) : 0;

  const phases = [
    { name: 'Eveil', color: '#FF6B6B', min: avgAwake, pct: pctAwake },
    { name: 'Paradoxal', color: '#67E8F9', min: avgRem, pct: pctRem },
    { name: 'Leger', color: '#93C5FD', min: avgCore, pct: pctCore },
    { name: 'Profond', color: '#1D4ED8', min: avgDeep, pct: pctDeep },
  ];

  const subTabs: { key: SleepSubTab; label: string }[] = [
    { key: 'phases', label: 'Phases' },
    { key: 'valeurs', label: 'Valeurs' },
    { key: 'comparaisons', label: 'Comparaisons' },
  ];

  return (
    <View>
      {/* Hero - Grande duree */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
        <View style={styles.heroRow}>
          <View>
            <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
              {avgHours > 0 ? formatSleepDuration(avgHours) : '--'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
              Duree moyenne par nuit
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/sleep-input' as any)}
            activeOpacity={0.7}
          >
            <Plus size={18} color={colors.textOnAccent} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SleepPhasesBar */}
      {sleep?.phases && (sleep.phases.deep > 0 || sleep.phases.rem > 0 || sleep.phases.core > 0 || sleep.phases.awake > 0) && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <SleepPhasesBar
            phases={[
              ...(sleep.phases.awake > 0 ? [{ type: 'awake' as const, duration: sleep.phases.awake }] : []),
              ...(sleep.phases.rem > 0 ? [{ type: 'rem' as const, duration: sleep.phases.rem }] : []),
              ...(sleep.phases.core > 0 ? [{ type: 'light' as const, duration: sleep.phases.core }] : []),
              ...(sleep.phases.deep > 0 ? [{ type: 'deep' as const, duration: sleep.phases.deep }] : []),
            ]}
            height={60}
          />
        </View>
      )}

      {/* Sous-onglets */}
      <View style={[styles.subTabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        {subTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.subTab,
              activeSubTab === tab.key && { backgroundColor: colors.accent },
            ]}
            onPress={() => setActiveSubTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.subTabText,
              { color: activeSubTab === tab.key ? colors.textOnAccent : colors.textMuted },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu sous-onglet Phases */}
      {activeSubTab === 'phases' && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          {phases.map((phase) => (
            <View
              key={phase.name}
              style={[styles.metricLine, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
            >
              <View style={styles.metricLineLeft}>
                <View style={[styles.phaseDot, { backgroundColor: phase.color }]} />
                <Text style={[styles.metricLineLabel, { color: colors.textPrimary }]}>{phase.name}</Text>
              </View>
              <View style={styles.metricLineRight}>
                <Text style={[styles.metricLineValue, { color: colors.textPrimary }]}>
                  {formatSleepDuration(phase.min / 60)}
                </Text>
                <Text style={[styles.metricLineSub, { color: colors.textMuted }]}>
                  {phase.pct}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Contenu sous-onglet Valeurs */}
      {activeSubTab === 'valeurs' && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <View style={[styles.metricLine, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.metricLineLabel, { color: colors.textPrimary }]}>Objectif</Text>
            <Text style={[styles.metricLineValue, { color: colors.textPrimary }]}>8h 00min</Text>
          </View>
          <View style={[styles.metricLine, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.metricLineLabel, { color: colors.textPrimary }]}>Duree moyenne</Text>
            <Text style={[styles.metricLineValue, { color: colors.textPrimary }]}>
              {sleepPhasesData.totalSleepMin > 0 ? formatSleepDuration(sleepPhasesData.totalSleepMin / 60) : '--'}
            </Text>
          </View>
          <View style={[styles.metricLine, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.metricLineLabel, { color: colors.textPrimary }]}>Nuits mesurees</Text>
            <Text style={[styles.metricLineValue, { color: colors.textPrimary }]}>
              {sleepPhasesData.nightsCount}
            </Text>
          </View>
        </View>
      )}

      {/* Contenu sous-onglet Comparaisons */}
      {activeSubTab === 'comparaisons' && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <View style={[styles.metricLine, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.metricLineLabel, { color: colors.textPrimary }]}>FC pendant le sommeil</Text>
            <Text style={[styles.metricLineValue, { color: colors.textPrimary }]}>
              {sleepComparisonData.heartRate
                ? `${sleepComparisonData.heartRate.min}-${sleepComparisonData.heartRate.max} bpm`
                : '-- bpm'}
            </Text>
          </View>
          <View style={[styles.metricLine, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.metricLineLabel, { color: colors.textPrimary }]}>Freq. respiratoire</Text>
            <Text style={[styles.metricLineValue, { color: colors.textPrimary }]}>
              {sleepComparisonData.respiratoryRate
                ? `${sleepComparisonData.respiratoryRate.min}-${sleepComparisonData.respiratoryRate.max} resp/min`
                : '-- resp/min'}
            </Text>
          </View>
          <View style={[styles.metricLine, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.metricLineLabel, { color: colors.textPrimary }]}>Temp. poignet</Text>
            <Text style={[styles.metricLineValue, { color: colors.textPrimary }]}>
              {sleepComparisonData.wristTemperature
                ? `${sleepComparisonData.wristTemperature.value > 0 ? '+' : ''}${sleepComparisonData.wristTemperature.value} °C`
                : '-- °C'}
            </Text>
          </View>
        </View>
      )}

      {/* Graphique historique */}
      {sleepHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique</Text>
          <ScrollableLineChart
            data={sleepHistory}
            color="#6366F1"
            unit="h"
            height={160}
            onPress={() => onMetricPress?.({
              key: 'sleep',
              label: 'Sommeil',
              color: '#6366F1',
              unit: 'h',
              icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} />,
            })}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  subTabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metricLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricLineRight: {
    alignItems: 'flex-end',
  },
  metricLineLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  metricLineValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metricLineSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
