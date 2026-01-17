// ============================================
// PERFORMANCE PAGE - Records et progression
// ============================================

import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useI18n } from '@/lib/I18nContext';
import { useTheme } from '@/lib/ThemeContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { Award, TrendingUp, Target, Zap } from 'lucide-react-native';

export const PerformancePage: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={16}
    >
      <StatsHeader
        title={t('statsPages.performance.title')}
        description={t('statsPages.performance.description')}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <StatsSection
        title={t('statsPages.performance.personalRecords')}
        description={t('statsPages.performance.personalRecordsDesc')}
      >
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard
              label={t('statsPages.performance.totalRecords')}
              value="0"
              unit={t('statsPages.performance.records')}
              icon={<Award size={24} color="#F59E0B" strokeWidth={2.5} />}
              color="#F59E0B"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard
              label={t('statsPages.performance.thisMonth')}
              value="0"
              unit={t('statsPages.performance.new')}
              icon={<TrendingUp size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      <StatsSection
        title={t('statsPages.performance.progression')}
        description={t('statsPages.performance.progressionDesc')}
      >
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard
              label={t('statsPages.performance.globalScore')}
              value="0"
              unit="/100"
              icon={<Target size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard
              label={t('statsPages.performance.improvement')}
              value="0"
              unit="%"
              icon={<Zap size={24} color="#EF4444" strokeWidth={2.5} />}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

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
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
});
