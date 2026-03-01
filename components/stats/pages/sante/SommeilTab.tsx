import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScrollableLineChart } from '../../charts/ScrollableLineChart';
import { Moon, Plus, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  rawSleepHistory?: any[];
  onMetricPress?: (metric: { key: string; label: string; color: string; unit: string; icon: React.ReactNode }) => void;
}

const formatSleepDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const min = Math.round((hours - h) * 60);
  return `${h}h ${min.toString().padStart(2, '0')}min`;
};

const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, '0')}`;
};

export const SommeilTab: React.FC<SommeilTabProps> = ({
  sleep,
  sleepPhasesData,
  sleepComparisonData,
  sleepHistory,
  rawSleepHistory = [],
  onMetricPress,
}) => {
  const { colors, isDark } = useTheme();

  const avgHours = sleepPhasesData.totalSleepMin > 0 ? sleepPhasesData.totalSleepMin / 60 : 0;

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

      {/* Liste des nuits (triees du plus recent au plus ancien) */}
      {rawSleepHistory.length > 0 && (() => {
        const sortedNights = [...rawSleepHistory].sort((a, b) => {
          const da = a.date || '';
          const db = b.date || '';
          return db.localeCompare(da);
        });
        return (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Nuits ({sortedNights.length})
          </Text>
          {sortedNights.map((night: any, index: number) => {
            const total = night.total || night.duration || 0;
            const hours = total / 60;
            const dateStr = night.date || '';

            let formattedDate = dateStr;
            try {
              const d = parseISO(dateStr);
              formattedDate = format(d, 'EEE d MMM', { locale: fr });
            } catch {}

            // Heure coucher / reveil
            let timeRange = '';
            if (night.startTime && night.endTime) {
              try {
                const bedDate = new Date(night.startTime);
                const wakeDate = new Date(night.endTime);
                const bedStr = `${bedDate.getHours().toString().padStart(2, '0')}:${bedDate.getMinutes().toString().padStart(2, '0')}`;
                const wakeStr = `${wakeDate.getHours().toString().padStart(2, '0')}:${wakeDate.getMinutes().toString().padStart(2, '0')}`;
                timeRange = `${bedStr} - ${wakeStr}`;
              } catch {}
            }

            // Phases summary
            const phaseParts: string[] = [];
            if (night.deep > 0) phaseParts.push(`Prof. ${formatMinutes(night.deep)}`);
            if (night.rem > 0) phaseParts.push(`REM ${formatMinutes(night.rem)}`);
            if (night.core > 0) phaseParts.push(`Leg. ${formatMinutes(night.core)}`);
            const phaseSummary = phaseParts.join(' / ');

            const isLast = index === sortedNights.length - 1;

            return (
              <TouchableOpacity
                key={dateStr + index}
                style={[
                  styles.nightRow,
                  {
                    backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                    borderBottomColor: isLast ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  },
                  index === 0 && styles.nightRowFirst,
                  isLast && styles.nightRowLast,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (dateStr) {
                    router.push(`/sleep-detail?date=${dateStr.split('T')[0]}` as any);
                  }
                }}
              >
                <View style={styles.nightInfo}>
                  <Text style={[styles.nightDate, { color: colors.textPrimary }]}>
                    {formattedDate}
                  </Text>
                  {timeRange ? (
                    <Text style={[styles.nightPhases, { color: colors.textMuted }]}>
                      {timeRange}
                    </Text>
                  ) : null}
                  {phaseSummary ? (
                    <Text style={[styles.nightPhases, { color: colors.textMuted }]} numberOfLines={1}>
                      {phaseSummary}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.nightRight}>
                  <Text style={[styles.nightDuration, { color: '#6366F1' }]}>
                    {hours > 0 ? formatSleepDuration(hours) : '--'}
                  </Text>
                  <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        );
      })()}
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
    marginTop: 4,
  },
  nightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nightRowFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  nightRowLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 12,
  },
  nightInfo: {
    flex: 1,
    marginRight: 12,
  },
  nightDate: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  nightPhases: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
  },
  nightRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nightDuration: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
