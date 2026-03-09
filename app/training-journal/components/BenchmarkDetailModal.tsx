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
import { ChevronLeft, X, Plus, Trash2, Timer, MapPin, Zap, Flame, TrendingUp, Wind } from 'lucide-react-native';
import {
  Benchmark,
  BenchmarkEntry,
  BENCHMARK_CATEGORIES,
  getBenchmarkPR,
  formatValue,
  formatForceEntry,
  formatTime,
  calculatePace,
} from '@/lib/carnetService';
import { getRelativeDate } from '../utils/dateHelpers';
import { renderIcon } from '../utils/iconMap';
import { useI18n } from '@/lib/I18nContext';

interface BenchmarkDetailModalProps {
  visible: boolean;
  onClose: () => void;
  benchmark: Benchmark | null;
  colors: any;
  locale: string;
  onAddEntry: () => void;
  onDelete: (id: string) => void;
}

export default React.memo(function BenchmarkDetailModal({
  visible,
  onClose,
  benchmark,
  colors,
  locale,
  onAddEntry,
  onDelete,
}: BenchmarkDetailModalProps) {
  const { t } = useI18n();

  if (!benchmark) return null;

  const pr = getBenchmarkPR(benchmark);
  const entries = [...benchmark.entries].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const isRunningCategory = ['running', 'trail', 'hyrox', 'cardio'].includes(benchmark.category);
  const isForceCategory = ['force', 'musculation', 'bodyweight', 'street_workout'].includes(benchmark.category);

  const formatEntryMain = (entry: BenchmarkEntry): string => {
    if (isForceCategory) return formatForceEntry(entry.value, benchmark.unit, entry.reps);
    return formatValue(entry.value, benchmark.unit);
  };

  const getEntryPace = (entry: BenchmarkEntry): string | null => {
    if (!isRunningCategory) return null;
    if (entry.pace) return entry.pace;
    const dist = entry.distance ?? (benchmark.unit === 'km' ? entry.value : null);
    if (dist && dist > 0) {
      const timeS = benchmark.unit === 'time' ? entry.value : (entry.duration ? entry.duration * 60 : null);
      if (timeS) return calculatePace(timeS, dist);
    }
    return null;
  };

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
                {pr ? formatEntryMain(pr) : '--'}
              </Text>
              {pr && isRunningCategory && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {pr.distance && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <MapPin size={11} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{pr.distance} km</Text>
                    </View>
                  )}
                  {getEntryPace(pr) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <TrendingUp size={11} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{getEntryPace(pr)} /km</Text>
                    </View>
                  )}
                  {pr.calories && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Flame size={11} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{pr.calories} kcal</Text>
                    </View>
                  )}
                </View>
              )}
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

          {/* Mini Chart */}
          {entries.length > 1 && (
            <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              {/* Header: title + % progression */}
              {(() => {
                const chronological = [...entries].reverse();
                const first = chronological[0];
                const latest = chronological[chronological.length - 1];
                const pct = first.value > 0
                  ? ((latest.value - first.value) / first.value * 100)
                  : 0;
                const isPositive = pct >= 0;
                return (
                  <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Progression</Text>
                    <View style={[styles.chartPctBadge, { backgroundColor: isPositive ? '#10B98120' : '#EF444420' }]}>
                      <Text style={[styles.chartPctText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                        {isPositive ? '+' : ''}{pct.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })()}
              <View style={styles.chartPlaceholder}>
                {entries.slice(0, 10).reverse().map((entry, index, arr) => {
                  const maxVal = Math.max(...arr.map(e => e.value));
                  const minVal = Math.min(...arr.map(e => e.value));
                  const range = maxVal - minVal || 1;
                  const heightPercent = ((entry.value - minVal) / range) * 100;
                  const isLatest = index === arr.length - 1;
                  const isPRBar = pr && entry.id === pr.id;

                  return (
                    <View key={entry.id} style={styles.chartBarContainer}>
                      {isLatest && (
                        <Text style={[styles.chartBarLabel, { color: benchmark.color }]}>
                          {entry.value % 1 === 0 ? entry.value : entry.value.toFixed(1)}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.chartBar,
                          {
                            backgroundColor: isPRBar ? benchmark.color : benchmark.color + '60',
                            height: `${Math.max(15, heightPercent)}%`,
                          }
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                {entries.length} entrée{entries.length > 1 ? 's' : ''} · barre brillante = PR
              </Text>
            </View>
          )}

          {/* Entry History */}
          <View style={[styles.historyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Historique</Text>
            {entries.map((entry: BenchmarkEntry, index: number) => {
              const isPR = pr && entry.id === pr.id;
              const pace = getEntryPace(entry);
              const distKm = entry.distance ?? (benchmark.unit === 'km' ? entry.value : null);
              const timeS = isRunningCategory && benchmark.unit === 'time' ? entry.value : null;
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
                  <View style={{ flex: 1 }}>
                    <View style={styles.historyEntryLeft}>
                      <Text style={[styles.historyEntryValue, { color: colors.textPrimary }]}>
                        {formatEntryMain(entry)}
                      </Text>
                      {isPR && (
                        <View style={[styles.prBadge, { backgroundColor: benchmark.color }]}>
                          <Text style={styles.prBadgeText}>PR</Text>
                        </View>
                      )}
                    </View>

                    {/* Running details — Strava style */}
                    {isRunningCategory && (
                      <View style={styles.runningDetails}>
                        {distKm && (
                          <View style={styles.runningMetric}>
                            <MapPin size={11} color={benchmark.color} />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{distKm} km</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>Distance</Text>
                          </View>
                        )}
                        {timeS && (
                          <View style={styles.runningMetric}>
                            <Timer size={11} color={benchmark.color} />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{formatTime(timeS)}</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>Chrono</Text>
                          </View>
                        )}
                        {pace && (
                          <View style={styles.runningMetric}>
                            <TrendingUp size={11} color={benchmark.color} />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{pace}</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>Allure/km</Text>
                          </View>
                        )}
                        {entry.speed && (
                          <View style={styles.runningMetric}>
                            <Wind size={11} color={benchmark.color} />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{entry.speed} km/h</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>Vitesse</Text>
                          </View>
                        )}
                        {entry.calories && (
                          <View style={styles.runningMetric}>
                            <Flame size={11} color={benchmark.color} />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{entry.calories}</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>kcal</Text>
                          </View>
                        )}
                        {entry.incline && (
                          <View style={styles.runningMetric}>
                            <Zap size={11} color={benchmark.color} />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{entry.incline}%</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>Pente</Text>
                          </View>
                        )}
                        {entry.watts && (
                          <View style={styles.runningMetric}>
                            <Zap size={11} color={benchmark.color} />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{entry.watts} W</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>Watts</Text>
                          </View>
                        )}
                        {entry.rpe && (
                          <View style={styles.runningMetric}>
                            <Flame size={11} color="#F59E0B" />
                            <Text style={[styles.runningMetricValue, { color: colors.textPrimary }]}>{entry.rpe}/10</Text>
                            <Text style={[styles.runningMetricLabel, { color: colors.textMuted }]}>RPE</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {entry.notes && (
                      <Text style={[styles.historyEntryNotes, { color: colors.textMuted }]} numberOfLines={2}>
                        {entry.notes}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.historyEntryDate, { color: colors.textMuted }]}>
                    {getRelativeDate(entry.date, t)}
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
});

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
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartPctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chartPctText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartPlaceholder: {
    flexDirection: 'row',
    height: 120,
    gap: 6,
    alignItems: 'flex-end',
  },
  chartBarContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartSubtitle: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  historyEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  historyEntryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyEntryNotes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  runningDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  runningMetric: {
    alignItems: 'center',
    gap: 2,
    minWidth: 56,
  },
  runningMetricValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  runningMetricLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    fontSize: 12,
    marginLeft: 8,
    marginTop: 2,
    flexShrink: 0,
  },
});
