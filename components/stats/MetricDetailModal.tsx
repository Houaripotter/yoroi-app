// ============================================
// METRIC DETAIL MODAL - Graphique détaillé cliquable
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { X } from 'lucide-react-native';
import { ModernLineChart } from './charts/ModernLineChart';
import { PeriodSelector } from './PeriodSelector';
import { Period } from './StatsHeader';

interface MetricDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  metric: string;
  unit: string;
  color: string;
  loadData: (period: Period) => Promise<any>;
}

export const MetricDetailModal: React.FC<MetricDetailModalProps> = ({
  visible,
  onClose,
  title,
  metric,
  unit,
  color,
  loadData,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, selectedPeriod]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadData(selectedPeriod);
      setData(result);
    } catch (error) {
      console.error('Error loading metric data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, {
          borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {metric}
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Period Selector */}
          <View style={styles.periodContainer}>
            <PeriodSelector
              selected={selectedPeriod}
              onChange={setSelectedPeriod}
            />
          </View>

          {/* Graph */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <ModernLineChart
                data={data?.values || []}
                color={color}
                label={`${metric} (${unit})`}
                height={400}
              />
            </View>
          )}

          {/* Stats */}
          {!loading && data && (
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moyenne</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {data.average?.toFixed(1) || 0} {unit}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Min</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {data.min?.toFixed(1) || 0} {unit}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Max</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {data.max?.toFixed(1) || 0} {unit}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Évolution</Text>
                <Text style={[styles.statValue, { color: data.trend === 'up' ? '#10B981' : '#EF4444' }]}>
                  {data.changePercent >= 0 ? '+' : ''}{data.changePercent?.toFixed(1) || 0}%
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  periodContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loadingContainer: {
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
