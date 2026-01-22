/**
 * BenchmarkDetailModal Component
 *
 * Modal showing full details of a benchmark with:
 * - Personal Record (PR) card
 * - Progression mini chart
 * - Complete entry history
 * - Quick add entry button
 * - Delete benchmark action
 *
 * Extracted from training-journal.tsx (143 lines)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { ChevronLeft, X, Plus, Trash2 } from 'lucide-react-native';
import {
  Benchmark,
  BenchmarkEntry,
  BENCHMARK_CATEGORIES,
  getBenchmarkPR,
  formatValue,
  formatForceEntry,
} from '@/lib/carnetService';
import { getRelativeDate } from '../utils/dateHelpers';
import { renderIcon } from '../utils/iconMap';

interface BenchmarkDetailModalProps {
  visible: boolean;
  onClose: () => void;
  benchmark: Benchmark | null;
  colors: any;
  locale: string;
  onAddEntry: () => void;
  onDelete: (id: string) => void;
}

export default function BenchmarkDetailModal({
  visible,
  onClose,
  benchmark,
  colors,
  locale,
  onAddEntry,
  onDelete,
}: BenchmarkDetailModalProps) {
  if (!benchmark) return null;

  const pr = getBenchmarkPR(benchmark);
  const entries = [...benchmark.entries].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.detailModalOverlay, { backgroundColor: colors.background }]}>
        <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.detailHeaderBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {benchmark.name}
          </Text>
          <TouchableOpacity
            onPress={() => onDelete(benchmark.id)}
            style={styles.detailHeaderBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={styles.detailHeaderBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* PR Card */}
          <View style={[styles.prCard, { backgroundColor: benchmark.color + '20', borderColor: benchmark.color }]}>
            <View style={styles.prCardIconContainer}>
              {renderIcon(benchmark.iconName || BENCHMARK_CATEGORIES[benchmark.category].iconName, 40, benchmark.color)}
            </View>
            <View style={styles.prCardInfo}>
              <Text style={[styles.prCardLabel, { color: colors.textMuted }]}>Record Personnel</Text>
              <Text style={[styles.prCardValue, { color: benchmark.color }]}>
                {pr ? formatValue(pr.value, benchmark.unit) : '--'}
              </Text>
              {pr && (
                <Text style={[styles.prCardDate, { color: colors.textMuted }]}>
                  {new Date(pr.date).toLocaleDateString(locale)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.prAddBtn, { backgroundColor: benchmark.color }]}
              onPress={onAddEntry}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Mini Chart Placeholder */}
          {entries.length > 1 && (
            <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Progression</Text>
              <View style={styles.chartPlaceholder}>
                {entries.slice(0, 10).reverse().map((entry, index) => {
                  const maxVal = Math.max(...entries.map(e => e.value));
                  const minVal = Math.min(...entries.map(e => e.value));
                  const range = maxVal - minVal || 1;
                  const heightPercent = ((entry.value - minVal) / range) * 100;

                  return (
                    <View key={entry.id} style={styles.chartBarContainer}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            backgroundColor: benchmark.color,
                            height: `${Math.max(20, heightPercent)}%`
                          }
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Entry History */}
          <View style={[styles.historyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Historique</Text>
            {entries.map((entry: BenchmarkEntry, index: number) => {
              const isForce = benchmark.category === 'force' && (benchmark.unit === 'kg' || benchmark.unit === 'lbs');
              const isPR = pr && entry.id === pr.id;
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.historyEntry,
                    {
                      backgroundColor: isPR ? benchmark.color + '15' : 'transparent',
                      borderLeftWidth: isPR ? 3 : 0,
                      borderLeftColor: isPR ? benchmark.color : 'transparent',
                    },
                    index < entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.historyEntryLeft}>
                    <Text style={[styles.historyEntryValue, { color: colors.textPrimary }]}>
                      {isForce
                        ? formatForceEntry(entry.value, benchmark.unit, entry.reps)
                        : formatValue(entry.value, benchmark.unit)}
                    </Text>
                    {isPR && (
                      <View style={[styles.prBadge, { backgroundColor: benchmark.color }]}>
                        <Text style={styles.prBadgeText}>PR</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.historyEntryDate, { color: colors.textMuted }]}>
                    {getRelativeDate(entry.date)}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailModalOverlay: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailHeaderBtn: {
    padding: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 16,
  },
  prCardIconContainer: {
    marginRight: 16,
  },
  prCardInfo: {
    flex: 1,
  },
  prCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  prCardValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  prCardDate: {
    fontSize: 13,
  },
  prAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartPlaceholder: {
    flexDirection: 'row',
    height: 120,
    gap: 8,
  },
  chartBarContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    padding: 16,
    paddingBottom: 12,
  },
  historyEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  historyEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyEntryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  prBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  historyEntryDate: {
    fontSize: 13,
  },
});
