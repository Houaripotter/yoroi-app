// ============================================
// YOROI - PLANNING SEANCES CONTENT
// ============================================
// Liste des seances avec filtre sport, navigation mois, resume

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Training } from '@/lib/database';
import { getSportIcon, getSportName, getSportColor } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react-native';
import { format, parseISO, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

interface PlanningSeancesContentProps {
  workouts: Training[];
}

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h}h${m > 0 ? ` ${m.toString().padStart(2, '0')}` : ''}`;
};

const formatDurationCompact = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, '0')}`;
};

const estimateCalories = (sport: string, durationMin: number): number => {
  const rates: Record<string, number> = {
    running: 10, cycling: 8, swimming: 9, hiking: 7,
    jjb: 9, musculation: 6, yoga: 3, boxing: 10,
  };
  const rate = rates[sport?.toLowerCase()] || 7;
  return Math.round(durationMin * rate);
};

const formatCalories = (cal: number): string => {
  if (cal >= 1000) return `${(cal / 1000).toFixed(1).replace('.', ',')}k`;
  return cal.toLocaleString('fr-FR');
};

export const PlanningSeancesContent: React.FC<PlanningSeancesContentProps> = ({ workouts }) => {
  const { colors, isDark } = useTheme();
  const { t, locale } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSport, setSelectedSport] = useState<string>('all');

  const dateLocale = locale === 'fr' ? fr : enUS;

  // Filter workouts by current month
  const monthWorkouts = useMemo(
    () => workouts.filter(w => {
      try {
        return isSameMonth(parseISO(w.date), currentMonth);
      } catch {
        return false;
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [workouts, currentMonth]
  );

  // Unique sports in this month
  const uniqueSports = useMemo(
    () => [...new Set(monthWorkouts.map(w => w.sport).filter(Boolean))],
    [monthWorkouts]
  );

  // Sport counts
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monthWorkouts.forEach(w => {
      if (w.sport) counts[w.sport] = (counts[w.sport] || 0) + 1;
    });
    return counts;
  }, [monthWorkouts]);

  // Filtered by sport
  const filteredWorkouts = useMemo(
    () => selectedSport === 'all' ? monthWorkouts : monthWorkouts.filter(w => w.sport === selectedSport),
    [monthWorkouts, selectedSport]
  );

  // Summary stats
  const totalSessions = filteredWorkouts.length;
  const totalMinutes = filteredWorkouts.reduce((sum, w) => sum + (w.duration_minutes || w.duration || 0), 0);
  const totalCalories = filteredWorkouts.reduce((sum, w) => {
    const cal = w.calories || 0;
    if (cal > 0) return sum + cal;
    const dur = w.duration_minutes || w.duration || 0;
    return sum + (dur > 0 ? estimateCalories(w.sport, dur) : 0);
  }, 0);

  const navigateMonth = (direction: 'prev' | 'next') => {
    impactAsync(ImpactFeedbackStyle.Light);
    setCurrentMonth(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    setSelectedSport('all');
  };

  const summaryItems = [
    { value: totalSessions.toString(), label: t('planning.sessions'), color: colors.accent },
    { value: formatDurationCompact(totalMinutes), label: 'total', color: '#F97316' },
    { value: totalCalories > 0 ? formatCalories(totalCalories) : '--', label: 'kcal', color: '#EF4444' },
  ];

  return (
    <View style={styles.container}>
      {/* Month navigation header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthArrow} activeOpacity={0.6}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale }).replace(/^\w/, c => c.toUpperCase())}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthArrow} activeOpacity={0.6}>
          <ChevronRight size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Sport filter pills */}
      {uniqueSports.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterPill, {
              backgroundColor: selectedSport === 'all'
                ? colors.accent
                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
            }]}
            onPress={() => setSelectedSport('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, {
              color: selectedSport === 'all' ? colors.textOnAccent : colors.textSecondary,
            }]}>
              Tous ({monthWorkouts.length})
            </Text>
          </TouchableOpacity>

          {uniqueSports.map((sport) => {
            const isActive = selectedSport === sport;
            const sportColor = getSportColor(sport);
            const sportIcon = getSportIcon(sport);
            const sportName = getSportName(sport);
            const count = sportCounts[sport] || 0;

            return (
              <TouchableOpacity
                key={sport}
                style={[styles.filterPill, {
                  backgroundColor: isActive
                    ? sportColor
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                }]}
                onPress={() => setSelectedSport(sport)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={sportIcon as any}
                  size={14}
                  color={isActive ? '#FFFFFF' : sportColor}
                />
                <Text style={[styles.filterPillText, {
                  color: isActive ? '#FFFFFF' : colors.textSecondary,
                }]}>
                  {sportName} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Summary chips */}
      <View style={styles.summaryRow}>
        {summaryItems.map((item, i) => (
          <View
            key={i}
            style={[styles.summaryCard, {
              backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
              borderLeftWidth: 3,
              borderLeftColor: item.color,
            }]}
          >
            <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Empty state */}
      {filteredWorkouts.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Dumbbell size={40} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('planning.noSessions')}
          </Text>
        </View>
      )}

      {/* Sessions list */}
      {filteredWorkouts.map((training, index) => {
        const sportIcon = getSportIcon(training.sport);
        const sportName = getSportName(training.sport);
        const sportColor = getSportColor(training.sport);
        const duration = training.duration_minutes || training.duration || 0;

        let dateStr = '';
        let timeStr = '';
        try {
          const d = parseISO(training.date);
          dateStr = format(d, 'EEE d MMM', { locale: dateLocale });
          if (training.start_time) {
            const [sh, sm] = training.start_time.split(':').map(Number);
            const endMin = sh * 60 + sm + duration;
            const eh = Math.floor(endMin / 60) % 24;
            const em = endMin % 60;
            timeStr = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}-${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
          }
        } catch {
          dateStr = training.date;
        }

        return (
          <TouchableOpacity
            key={training.id || index}
            style={[styles.sessionCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
            activeOpacity={0.7}
            onPress={() => {
              if (training.id) {
                impactAsync(ImpactFeedbackStyle.Light);
                router.push(`/workout-detail?id=${training.id}` as any);
              }
            }}
          >
            <View style={styles.sessionRow}>
              {/* Sport icon */}
              <View style={[styles.sportIconContainer, { backgroundColor: sportColor + '18' }]}>
                <MaterialCommunityIcons name={sportIcon as any} size={22} color={sportColor} />
              </View>

              {/* Main info */}
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionSport, { color: colors.textPrimary }]} numberOfLines={1}>
                  {sportName}
                </Text>
                <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
                  {dateStr}{timeStr ? ` \u00B7 ${timeStr}` : ''}
                </Text>
              </View>

              {/* Metrics right */}
              <View style={styles.sessionMetrics}>
                {duration > 0 && (
                  <Text style={[styles.sessionMetricValue, { color: colors.textPrimary }]}>
                    {formatDuration(duration)}
                  </Text>
                )}
                {(() => {
                  const cal = training.calories || estimateCalories(training.sport, duration);
                  return cal > 0 ? (
                    <Text style={[styles.sessionMetricSub, { color: '#F97316' }]}>
                      {cal} kcal
                    </Text>
                  ) : null;
                })()}
              </View>
            </View>

            {/* Secondary line: distance, HR, source */}
            {((training.distance || 0) > 0 || (training.heart_rate || 0) > 0) && (
              <View style={[styles.sessionSecondary, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                {(training.distance || 0) > 0 && (
                  <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                    {(training.distance || 0).toFixed(1)} km
                  </Text>
                )}
                {(training.heart_rate || 0) > 0 && (
                  <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                    FC moy. {training.heart_rate} bpm
                  </Text>
                )}
                {training.source && training.source !== 'manual' && (
                  <Text style={[styles.sessionSourceBadge, {
                    color: colors.textMuted,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }]}>
                    {training.source}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Month header
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 16,
    marginBottom: 8,
  },
  monthArrow: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 160,
    textAlign: 'center',
  },
  // Filter pills
  filterScroll: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 0,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  // Empty
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Session cards
  sessionCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionSport: {
    fontSize: 15,
    fontWeight: '700',
  },
  sessionDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionMetrics: {
    alignItems: 'flex-end',
    gap: 2,
  },
  sessionMetricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionMetricSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  sessionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    flexWrap: 'wrap',
  },
  sessionSecondaryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionSourceBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
