import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, RefreshControl, DeviceEventEmitter } from 'react-native';
import { SamuraiCircleLoader } from '@/components/SamuraiLoader';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, Training } from '@/lib/database';
import { getSportIcon, getSportName, getSportColor } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Dumbbell, ArrowDown, ArrowUp } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';

// Accepte toujours les trainings depuis le parent (rétrocompatibilité)
// mais charge aussi les siennes si le parent ne donne rien
interface SeancesTabProps {
  trainings?: Training[];
  period?: string; // '7j' | '30j' | '90j' | '6m' | '1a' | '2a' | 'tout'
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

const PERIOD_DAYS: Record<string, number | undefined> = {
  '7j': 7, '30j': 30, '90j': 90, '6m': 180, '1a': 365, '2a': 730, 'tout': undefined,
};

type SortOrder = 'recent' | 'oldest';

export const SeancesTab: React.FC<SeancesTabProps> = React.memo(({ trainings: propTrainings, period = '1a' }) => {
  const { colors, isDark, screenBackground } = useTheme();

  const sectionBg = isDark ? colors.accent + '10' : colors.accent + '08';
  const cardBg = isDark ? '#242430' : '#FFFFFF';
  const cardBorder = isDark ? colors.accent + '30' : colors.border;

  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');

  // Loader 7 secondes
  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 7000);
    return () => clearTimeout(t);
  }, []);

  // Données locales (chargées directement depuis la DB)
  const [localTrainings, setLocalTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const days = PERIOD_DAYS[period];
      const data = await getTrainings(days);
      setLocalTrainings(Array.isArray(data) ? data : []);
    } catch (err) {
      setLocalTrainings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [period]);

  // Recharger quand un import HealthKit est terminé
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', () => {
      loadData();
    });
    return () => sub.remove();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // Si le parent passe des données non vides, on les utilise — sinon on utilise les données locales
  const trainings = useMemo(() => {
    if (Array.isArray(propTrainings) && propTrainings.length > 0) return propTrainings;
    return localTrainings;
  }, [propTrainings, localTrainings]);

  const uniqueSports = useMemo(
    () => [...new Set(trainings.map(t => t.sport).filter(Boolean))],
    [trainings]
  );

  const filteredTrainings = useMemo(() => {
    const filtered = selectedSport === 'all' ? trainings : trainings.filter(t => t.sport === selectedSport);
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }, [trainings, selectedSport, sortOrder]);

  const totalSessions = filteredTrainings.length;
  const totalMinutes = filteredTrainings.reduce((sum, t) => sum + (t.duration_minutes || t.duration || 0), 0);
  const totalCalories = filteredTrainings.reduce((sum, t) => {
    const cal = t.calories || 0;
    if (cal > 0) return sum + cal;
    const dur = t.duration_minutes || t.duration || 0;
    return sum + (dur > 0 ? estimateCalories(t.sport, dur) : 0);
  }, 0);

  const formatCalories = (cal: number): string => {
    if (cal >= 1000) return `${(cal / 1000).toFixed(1).replace('.', ',')}k`;
    return cal.toLocaleString('fr-FR');
  };

  const summaryItems = [
    { value: totalSessions.toString(), label: 'séances', color: colors.accent },
    { value: formatDurationCompact(totalMinutes), label: 'total', color: '#F97316' },
    { value: totalCalories > 0 ? formatCalories(totalCalories) : '--', label: 'kcal', color: '#EF4444' },
  ];

  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    trainings.forEach(t => {
      if (t.sport) counts[t.sport] = (counts[t.sport] || 0) + 1;
    });
    return counts;
  }, [trainings]);

  const renderSession = useCallback(({ item: training }: { item: Training }) => {
    const sportIcon = getSportIcon(training.sport);
    const sportName = getSportName(training.sport);
    const sportColor = getSportColor(training.sport);
    const duration = training.duration_minutes || training.duration || 0;

    let dateStr = '';
    let timeStr = '';
    try {
      const d = parseISO(training.date);
      dateStr = format(d, 'EEE d MMM yyyy', { locale: fr });
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

    const dist = training.distance || 0;
    const hasSecondary = dist > 0 || (training.heart_rate || 0) > 0;
    const pace = dist > 0 && duration > 0 ? Math.round((duration * 60) / dist) : 0;
    const paceMin = pace > 0 ? Math.floor(pace / 60) : 0;
    const paceSec = pace > 0 ? Math.round(pace % 60) : 0;

    return (
      <TouchableOpacity
        style={[styles.sessionCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}
        activeOpacity={0.7}
        onPress={() => {
          if (training.id != null) {
            router.push(`/workout-detail?id=${training.id}` as any);
          }
        }}
      >
        <View style={styles.sessionRow}>
          <View style={[styles.sportIconContainer, { backgroundColor: sportColor + '18' }]}>
            <MaterialCommunityIcons name={sportIcon as any} size={22} color={sportColor} />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionSport, { color: colors.textPrimary }]} numberOfLines={1}>
              {sportName}
            </Text>
            <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
              {dateStr}{timeStr ? ` \u00B7 ${timeStr}` : ''}
            </Text>
          </View>
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

        {hasSecondary && (
          <View style={[styles.sessionSecondary, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            {dist > 0 && (
              <Text style={[styles.sessionSecondaryText, { color: '#3B82F6' }]}>
                {dist.toFixed(1)} km
              </Text>
            )}
            {pace > 0 && (
              <Text style={[styles.sessionSecondaryText, { color: '#22C55E' }]}>
                {paceMin}'{paceSec.toString().padStart(2, '0')}"/km
              </Text>
            )}
            {(training.heart_rate || 0) > 0 && (
              <Text style={[styles.sessionSecondaryText, { color: '#EF4444' }]}>
                {training.heart_rate} bpm
              </Text>
            )}
            {training.source && training.source !== 'manual' && (
              <Text style={[styles.sessionSourceBadge, { color: colors.textMuted, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                {training.source}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [isDark, colors]);

  if (showLoader) {
    return <SamuraiCircleLoader duration={7000} bgColor={screenBackground} />;
  }

  if (trainings.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: '#EF4444' }]}>
        <Dumbbell size={40} color="#EF4444" strokeWidth={1.5} />
        <Text style={[styles.emptyText, { color: '#EF4444', fontWeight: '700' }]}>
          0 séance dans la base de données
        </Text>
        <Text style={[styles.emptySubText, { color: colors.textMuted, textAlign: 'center', lineHeight: 20 }]}>
          L'import depuis Apple Santé n'a pas encore fonctionné.{'\n'}
          Va dans Planning {'>'} Séances {'>'} appuie sur{'\n'}
          "Importer mes séances Apple Santé"
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 12, textAlign: 'center', lineHeight: 16 }}>
          Assure-toi que dans Réglages {'>'} Santé {'>'} Accès aux données {'>'} Yoroi{'\n'}
          "Entraînements" est bien activé
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredTrainings}
      renderItem={renderSession}
      keyExtractor={(item, index) => item.id?.toString() || `session-${index}`}
      scrollEnabled={false}
      style={{ backgroundColor: sectionBg, borderRadius: 16 }}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      ListHeaderComponent={
        <View>
          {/* Pills de filtre par sport */}
          {uniqueSports.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedSport === 'all'
                      ? colors.accent
                      : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.88)'),
                  },
                ]}
                onPress={() => setSelectedSport('all')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterPillText,
                  { color: selectedSport === 'all' ? colors.textOnAccent : (isDark ? colors.textSecondary : '#1C1C1E') },
                ]}>
                  Tous ({trainings.length})
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
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isActive
                          ? sportColor
                          : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.88)'),
                      },
                    ]}
                    onPress={() => setSelectedSport(sport)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={sportIcon as any}
                      size={14}
                      color={isActive ? '#FFFFFF' : sportColor}
                    />
                    <Text style={[
                      styles.filterPillText,
                      { color: isActive ? '#FFFFFF' : (isDark ? colors.textSecondary : '#1C1C1E') },
                    ]}>
                      {sportName} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Tri + Résumé */}
          <View style={styles.sortAndSummary}>
            <TouchableOpacity
              style={[styles.sortButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.accent + '30', borderWidth: 1 }]}
              onPress={() => setSortOrder(prev => prev === 'recent' ? 'oldest' : 'recent')}
              activeOpacity={0.7}
            >
              {sortOrder === 'recent' ? (
                <ArrowDown size={14} color={colors.accent} strokeWidth={2.5} />
              ) : (
                <ArrowUp size={14} color={colors.accent} strokeWidth={2.5} />
              )}
              <Text style={[styles.sortText, { color: colors.accent }]}>
                {sortOrder === 'recent' ? 'Récent' : 'Ancien'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Résumé en haut */}
          <View style={styles.summaryRow}>
            {summaryItems.map((item, i) => (
              <View
                key={i}
                style={[styles.summaryCard, {
                  backgroundColor: cardBg,
                  borderTopWidth: 3,
                  borderTopColor: item.color,
                }]}
              >
                <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterContent: {
    gap: 8,
    paddingRight: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sortAndSummary: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  sessionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sportIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionSport: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  sessionMetrics: {
    alignItems: 'flex-end',
  },
  sessionMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sessionMetricSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sessionSecondary: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  sessionSecondaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sessionSourceBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.7,
  },
});
