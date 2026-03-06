// ============================================
// YOROI - PLANNING SEANCES CONTENT
// ============================================
// Liste des seances avec filtre sport, navigation mois, resume
// Affiche UNIQUEMENT les donnees reelles Apple Health / sources externes

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

interface ParsedDetails {
  avgPaceSecondsPerKm?: number;
  elevationAscended?: number;
  elevationDescended?: number;
  avgHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  activeCalories?: number;
  totalCalories?: number;
  distanceKm?: number;
  weatherTemp?: number;
  weatherHumidity?: number;
  weatherCondition?: string;
  airQualityIndex?: number;
  airQualityCategory?: string;
  hasRoute?: boolean;
  splitsCount?: number;
  recoveryHR?: { atEnd?: number; after1Min?: number; after2Min?: number };
  heartRateZones?: { zone: number; name: string; durationSeconds: number; color: string }[];
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

const formatCalories = (cal: number): string => {
  if (cal >= 1000) return `${(cal / 1000).toFixed(1).replace('.', ',')}k`;
  return cal.toLocaleString('fr-FR');
};

const formatPace = (secondsPerKm: number): string => {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}'${secs.toString().padStart(2, '0')}"/km`;
};

const parseWorkoutDetails = (json?: string): ParsedDetails => {
  if (!json) return {};
  try {
    const d = JSON.parse(json);
    return {
      avgPaceSecondsPerKm: d.avgPaceSecondsPerKm || undefined,
      elevationAscended: d.elevationAscended || undefined,
      elevationDescended: d.elevationDescended || undefined,
      avgHeartRate: d.avgHeartRate || undefined,
      minHeartRate: d.minHeartRate || undefined,
      maxHeartRate: d.maxHeartRate || undefined,
      activeCalories: d.activeCalories || undefined,
      totalCalories: d.totalCalories || undefined,
      distanceKm: d.distanceKm || undefined,
      weatherTemp: d.weatherTemp != null ? d.weatherTemp : undefined,
      weatherHumidity: d.weatherHumidity != null ? d.weatherHumidity : undefined,
      weatherCondition: d.weatherCondition || undefined,
      airQualityIndex: d.airQualityIndex || undefined,
      airQualityCategory: d.airQualityCategory || undefined,
      hasRoute: d.routePoints && d.routePoints.length > 0,
      splitsCount: d.splits ? d.splits.length : undefined,
      recoveryHR: d.recoveryHR || undefined,
      heartRateZones: d.heartRateZones || undefined,
    };
  } catch {
    return {};
  }
};

export const PlanningSeancesContent: React.FC<PlanningSeancesContentProps> = ({ workouts }) => {
  const { colors, isDark } = useTheme();
  const { t, locale } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [showAllMonths, setShowAllMonths] = useState(true);

  const dateLocale = locale === 'fr' ? fr : enUS;

  const allWorkoutsSorted = useMemo(
    () => [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [workouts]
  );

  const monthWorkouts = useMemo(
    () => showAllMonths
      ? allWorkoutsSorted
      : allWorkoutsSorted.filter(w => {
          try {
            return isSameMonth(parseISO(w.date), currentMonth);
          } catch {
            return false;
          }
        }),
    [allWorkoutsSorted, currentMonth, showAllMonths]
  );

  const uniqueSports = useMemo(
    () => [...new Set(monthWorkouts.map(w => w.sport).filter(Boolean))],
    [monthWorkouts]
  );

  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monthWorkouts.forEach(w => {
      if (w.sport) counts[w.sport] = (counts[w.sport] || 0) + 1;
    });
    return counts;
  }, [monthWorkouts]);

  const filteredWorkouts = useMemo(
    () => selectedSport === 'all' ? monthWorkouts : monthWorkouts.filter(w => w.sport === selectedSport),
    [monthWorkouts, selectedSport]
  );

  // Summary stats - only real data, no estimations
  const totalSessions = filteredWorkouts.length;
  const totalMinutes = filteredWorkouts.reduce((sum, w) => sum + (w.duration_minutes || w.duration || 0), 0);
  const totalCalories = filteredWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);

  const navigateMonth = (direction: 'prev' | 'next') => {
    impactAsync(ImpactFeedbackStyle.Light);
    setCurrentMonth(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    setSelectedSport('all');
  };

  const toggleMonthFilter = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setShowAllMonths(prev => !prev);
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
        {!showAllMonths && (
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthArrow} activeOpacity={0.6}>
            <ChevronLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={toggleMonthFilter} activeOpacity={0.7}>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {showAllMonths
              ? (locale === 'fr' ? 'Toutes les seances' : 'All sessions')
              : format(currentMonth, 'MMMM yyyy', { locale: dateLocale }).replace(/^\w/, c => c.toUpperCase())
            }
          </Text>
        </TouchableOpacity>
        {!showAllMonths && (
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthArrow} activeOpacity={0.6}>
            <ChevronRight size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={toggleMonthFilter}
          style={[styles.filterToggle, {
            backgroundColor: showAllMonths
              ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
              : colors.accent,
          }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterToggleText, {
            color: showAllMonths ? colors.textSecondary : colors.textOnAccent,
          }]}>
            {showAllMonths ? (locale === 'fr' ? 'Par mois' : 'By month') : (locale === 'fr' ? 'Tout' : 'All')}
          </Text>
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
        const det = parseWorkoutDetails(training.workout_details_json);

        // Distance: from details or training field
        const distance = det.distanceKm || training.distance || 0;
        // Pace: only from Apple Health
        const pace = det.avgPaceSecondsPerKm;
        // Elevation
        const elevUp = det.elevationAscended;
        const elevDown = det.elevationDescended;
        // HR: from details or training field
        const avgHR = det.avgHeartRate || training.heart_rate || 0;
        const maxHR = det.maxHeartRate || training.max_heart_rate || 0;
        const minHR = det.minHeartRate || 0;
        // Calories: only real (from Apple Health)
        const cal = det.activeCalories || training.calories || 0;
        // Weather
        const weather = det.weatherTemp != null ? det.weatherTemp : undefined;
        const humidity = det.weatherHumidity;
        const weatherCond = det.weatherCondition;
        // Air quality
        const aqi = det.airQualityIndex;
        const aqiCat = det.airQualityCategory;
        // GPS & splits
        const hasGPS = det.hasRoute;
        const splits = det.splitsCount;
        // Recovery HR
        const recovery = det.recoveryHR;
        // HR Zones
        const hrZones = det.heartRateZones;

        let dateStr = '';
        let timeStr = '';
        try {
          const d = parseISO(training.date);
          dateStr = format(d, 'EEE d MMM yyyy', { locale: dateLocale });
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

        const hasSecondaryData = distance > 0 || avgHR > 0 || pace || elevUp || weather != null || aqi;

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
                {cal > 0 && (
                  <Text style={[styles.sessionMetricSub, { color: '#F97316' }]}>
                    {cal} kcal
                  </Text>
                )}
              </View>
            </View>

            {/* Secondary line: all Apple Health data */}
            {hasSecondaryData && (
              <View style={[styles.sessionSecondary, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                {/* Distance */}
                {distance > 0 && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="map-marker-distance" size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                      {distance.toFixed(2)} km
                    </Text>
                  </View>
                )}
                {/* Pace */}
                {pace && pace > 0 && pace < 1800 && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="speedometer" size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                      {formatPace(pace)}
                    </Text>
                  </View>
                )}
                {/* Elevation */}
                {elevUp != null && elevUp > 0 && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="elevation-rise" size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                      +{Math.round(elevUp)}m
                      {elevDown != null && elevDown > 0 ? ` / -${Math.round(elevDown)}m` : ''}
                    </Text>
                  </View>
                )}
                {/* Heart rate */}
                {avgHR > 0 && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="heart-pulse" size={12} color="#EF4444" />
                    <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                      {minHR > 0 ? `${minHR}/` : ''}{avgHR}{maxHR > 0 ? `/${maxHR}` : ''} bpm
                    </Text>
                  </View>
                )}
                {/* GPS */}
                {hasGPS && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={12} color="#3B82F6" />
                    <Text style={[styles.sessionSecondaryText, { color: '#3B82F6' }]}>GPS</Text>
                  </View>
                )}
                {/* Splits */}
                {splits != null && splits > 0 && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="chart-timeline-variant" size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                      {splits} splits
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* HR Zones compact bar */}
            {hrZones && hrZones.some(z => z.durationSeconds > 0) && (
              <View style={styles.zonesRow}>
                <Text style={[styles.zonesLabel, { color: colors.textMuted }]}>Zones FC</Text>
                <View style={styles.zonesBar}>
                  {(() => {
                    const totalZ = hrZones.reduce((s, z) => s + z.durationSeconds, 0);
                    if (totalZ === 0) return null;
                    return hrZones.map((z, i) => {
                      const pct = (z.durationSeconds / totalZ) * 100;
                      if (pct < 1) return null;
                      return (
                        <View
                          key={i}
                          style={[styles.zoneSegment, {
                            backgroundColor: z.color,
                            flex: pct,
                          }]}
                        />
                      );
                    });
                  })()}
                </View>
              </View>
            )}

            {/* Weather & Air quality */}
            {(weather != null || aqi) && (
              <View style={[styles.weatherRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
                {weather != null && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="thermometer" size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                      {Math.round(weather)}{'\u00B0'}C
                      {humidity != null ? ` / ${Math.round(humidity)}%` : ''}
                      {weatherCond ? ` ${weatherCond}` : ''}
                    </Text>
                  </View>
                )}
                {aqi != null && (
                  <View style={styles.metricChip}>
                    <MaterialCommunityIcons name="weather-windy" size={12} color={aqi <= 50 ? '#22C55E' : aqi <= 100 ? '#EAB308' : '#EF4444'} />
                    <Text style={[styles.sessionSecondaryText, { color: aqi <= 50 ? '#22C55E' : aqi <= 100 ? '#EAB308' : '#EF4444' }]}>
                      AQI {aqi}{aqiCat ? ` (${aqiCat})` : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Recovery HR */}
            {recovery && recovery.atEnd && (
              <View style={[styles.weatherRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
                <View style={styles.metricChip}>
                  <MaterialCommunityIcons name="heart-minus" size={12} color="#8B5CF6" />
                  <Text style={[styles.sessionSecondaryText, { color: colors.textMuted }]}>
                    Recup: {recovery.atEnd} bpm
                    {recovery.after1Min ? ` \u2192 ${recovery.after1Min}` : ''}
                    {recovery.after2Min ? ` \u2192 ${recovery.after2Min}` : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Source badge */}
            {training.source && training.source !== 'manual' && (
              <View style={styles.sourceRow}>
                <Text style={[styles.sessionSourceBadge, {
                  color: colors.textMuted,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }]}>
                  {training.source}
                </Text>
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
    minWidth: 120,
    textAlign: 'center',
  },
  filterToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    flexWrap: 'wrap',
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sessionSecondaryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  zonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  zonesLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  zonesBar: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  zoneSegment: {
    height: 6,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    flexWrap: 'wrap',
  },
  sourceRow: {
    marginTop: 6,
  },
  sessionSourceBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
