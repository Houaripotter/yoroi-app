// ============================================
// YOROI - PLANNING SÉANCES CONTENT
// ============================================
// Liste des séances avec filtre sport, navigation mois, résumé complet

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  DeviceEventEmitter,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { ImportProgressBanner } from '@/components/ImportProgressBanner';
import SamuraiLoader from '@/components/SamuraiLoader';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Training, Club } from '@/lib/database';
import { getSportIcon, getSportName, getSportColor } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronLeft, ChevronRight, Dumbbell, ChevronDown, ChevronUp, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react-native';
import { useDevMode } from '@/lib/DevModeContext';
import { format, parseISO, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { WorkoutMapRoute } from '@/components/WorkoutMapRoute';
import { healthConnect } from '@/lib/healthConnect';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlanningSeancesContentProps {
  workouts: Training[];
  clubs?: Club[];
}

interface RoutePoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
}

interface BoundingBox {
  minLat: number; maxLat: number;
  minLon: number; maxLon: number;
}

interface Split {
  index: number;
  distanceKm: number;
  durationSeconds?: number;
  paceSecondsPerKm: number;
  elevationGain?: number;
  avgHeartRate?: number;
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
  routePoints?: RoutePoint[];
  routeBoundingBox?: BoundingBox;
  splits?: Split[];
  recoveryHR?: { atEnd?: number; after1Min?: number; after2Min?: number };
  heartRateZones?: { zone: number; name: string; durationSeconds: number; color: string }[];
}

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}` : ''}`;
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
  return `${mins}'${secs.toString().padStart(2, '0')}"`;
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
      routePoints: d.routePoints && d.routePoints.length > 0 ? d.routePoints : undefined,
      routeBoundingBox: d.routeBoundingBox || undefined,
      splits: d.splits && d.splits.length > 0 ? d.splits : undefined,
      recoveryHR: d.recoveryHR || undefined,
      heartRateZones: d.heartRateZones || undefined,
    };
  } catch {
    return {};
  }
};

// Badge de source (Apple Watch, Garmin, etc.)
const SourceBadge = ({ source, colors, isDark }: { source?: string; colors: any; isDark: boolean }) => {
  if (!source || source === 'manual') return null;
  const srcMap: Record<string, { icon: string; label: string; color: string }> = {
    apple_health: { icon: 'apple', label: 'Apple Health', color: '#FF2D55' },
    apple_watch: { icon: 'watch', label: 'Apple Watch', color: '#FF2D55' },
    garmin: { icon: 'watch-variant', label: 'Garmin', color: '#007ACC' },
    samsung: { icon: 'samsung', label: 'Samsung', color: '#1428A0' },
    strava: { icon: 'run-fast', label: 'Strava', color: '#FC4C02' },
    wahoo: { icon: 'bike', label: 'Wahoo', color: '#009BDF' },
    polar: { icon: 'heart-pulse', label: 'Polar', color: '#CC0000' },
    suunto: { icon: 'compass', label: 'Suunto', color: '#E85D04' },
  };
  const info = srcMap[source] || { icon: 'sync', label: source, color: colors.textMuted };
  return (
    <View style={[badgeStyles.sourceBadge, { backgroundColor: info.color + '18' }]}>
      <MaterialCommunityIcons name={info.icon as any} size={11} color={info.color} />
      <Text style={[badgeStyles.sourceBadgeText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

// Intensité RPE sous forme de barres
const IntensityBar = ({ value, color }: { value: number; color: string }) => {
  const bars = 10;
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: i < value ? 10 + (i * 0.8) : 8,
            borderRadius: 2,
            backgroundColor: i < value ? color : 'rgba(128,128,128,0.18)',
          }}
        />
      ))}
    </View>
  );
};

// Étoiles technique
const TechniqueStars = ({ value, color }: { value: number; color: string }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <MaterialCommunityIcons
        key={i}
        name={i <= value ? 'star' : 'star-outline'}
        size={13}
        color={i <= value ? color : 'rgba(128,128,128,0.35)'}
      />
    ))}
  </View>
);

export const PlanningSeancesContent: React.FC<PlanningSeancesContentProps> = ({ workouts, clubs = [] }) => {
  const { colors, isDark } = useTheme();
  const { t, locale } = useI18n();
  const { isDevMode } = useDevMode();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [showAllMonths, setShowAllMonths] = useState(true);
  const [expandedGPS, setExpandedGPS] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState('');
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [diagStatus, setDiagStatus] = useState<'idle' | 'checking' | 'ok' | 'no_permission' | 'no_workouts'>('idle');
  const [isReRequestingPerms, setIsReRequestingPerms] = useState(false);
  const [isForceImporting, setIsForceImporting] = useState(false);
  // Guard pour éviter de relancer le diagnostic en boucle
  const diagRanRef = useRef(false);

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('YOROI_IMPORT_START', () => { setIsImporting(true); setImportStep(''); setDiagStatus('idle'); }),
      DeviceEventEmitter.addListener('YOROI_IMPORT_PROGRESS', (d: { step: string }) => setImportStep(d.step)),
      DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', () => { setIsImporting(false); setImportStep(''); }),
      DeviceEventEmitter.addListener('YOROI_WORKOUTS_PERMISSION_NEEDED', () => {
        setIsImporting(false);
        setDiagStatus('no_permission');
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  // Diagnostic permissions : s'active UNE SEULE FOIS si liste vide après 2s
  useEffect(() => {
    if (workouts.length > 0 || isImporting) {
      setDiagStatus('idle');
      return;
    }
    // Guard : ne lancer le diagnostic auto qu'une seule fois par session
    if (diagRanRef.current) return;
    if (Platform.OS !== 'ios') return;
    const timer = setTimeout(async () => {
      diagRanRef.current = true;
      setDiagStatus('checking');
      try {
        const { accessible, count } = await healthConnect.canReadWorkouts();
        if (!accessible || count === 0) {
          setDiagStatus('idle');
        } else {
          setDiagStatus('ok');
          healthConnect.importFullHistory().catch(() => setDiagStatus('idle'));
          // Timeout de sécurité : retour idle après 60s même si l'import ne répond pas
          setTimeout(() => setDiagStatus(prev => prev === 'ok' ? 'idle' : prev), 60000);
        }
      } catch {
        setDiagStatus('idle');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [workouts.length, isImporting]);

  // Animation shimmer pour les skeletons
  useEffect(() => {
    if (!isImporting) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isImporting, shimmerAnim]);

  const toggleGPS = (id: number) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setExpandedGPS(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const dateLocale = locale === 'fr' ? fr : enUS;

  const allWorkoutsSorted = useMemo(
    () => [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [workouts]
  );

  const monthWorkouts = useMemo(
    () => showAllMonths
      ? allWorkoutsSorted
      : allWorkoutsSorted.filter(w => {
          try { return isSameMonth(parseISO(w.date), currentMonth); } catch { return false; }
        }),
    [allWorkoutsSorted, currentMonth, showAllMonths]
  );

  const uniqueSports = useMemo(
    () => [...new Set(monthWorkouts.map(w => w.sport).filter(Boolean))],
    [monthWorkouts]
  );

  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monthWorkouts.forEach(w => { if (w.sport) counts[w.sport] = (counts[w.sport] || 0) + 1; });
    return counts;
  }, [monthWorkouts]);

  const filteredWorkouts = useMemo(
    () => selectedSport === 'all' ? monthWorkouts : monthWorkouts.filter(w => w.sport === selectedSport),
    [monthWorkouts, selectedSport]
  );

  const totalSessions = filteredWorkouts.length;
  const totalMinutes = filteredWorkouts.reduce((sum, w) => sum + (w.duration_minutes || w.duration || 0), 0);
  const totalCalories = filteredWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
  const totalDistance = filteredWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);

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

  const cardBg = isDark ? colors.backgroundCard : '#FFFFFF';
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={styles.container}>

      {/* ── BARRE DE PROGRESSION IMPORT ── */}
      <ImportProgressBanner />

      {/* ── HEADER MOIS ── */}
      <View style={styles.monthHeader}>
        {!showAllMonths && (
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.arrowBtn} activeOpacity={0.6}>
            <ChevronLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={toggleMonthFilter} activeOpacity={0.75} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {showAllMonths
              ? 'Toutes les séances'
              : format(currentMonth, 'MMMM yyyy', { locale: dateLocale }).replace(/^\w/, c => c.toUpperCase())}
          </Text>
        </TouchableOpacity>
        {!showAllMonths && (
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.arrowBtn} activeOpacity={0.6}>
            <ChevronRight size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={toggleMonthFilter}
          style={[styles.toggleBtn, {
            backgroundColor: showAllMonths
              ? (isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)')
              : colors.accent + 'E0',
          }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.toggleBtnText, {
            color: showAllMonths ? colors.textSecondary : colors.textOnAccent,
          }]}>
            {showAllMonths ? 'Par mois' : 'Tout'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── FILTRES SPORT ── */}
      {uniqueSports.length > 1 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterPill, {
              backgroundColor: selectedSport === 'all' ? colors.accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
            }]}
            onPress={() => setSelectedSport('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, {
              color: selectedSport === 'all' ? colors.textOnAccent : colors.textSecondary,
            }]}>
              Tous ({monthWorkouts.length})
            </Text>
          </TouchableOpacity>

          {uniqueSports.map(sport => {
            const isActive = selectedSport === sport;
            const sportColor = getSportColor(sport);
            const sportIcon = getSportIcon(sport);
            return (
              <TouchableOpacity
                key={sport}
                style={[styles.filterPill, {
                  backgroundColor: isActive ? sportColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                }]}
                onPress={() => setSelectedSport(sport)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name={sportIcon as any} size={13} color={isActive ? '#FFF' : sportColor} />
                <Text style={[styles.filterPillText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                  {getSportName(sport)} ({sportCounts[sport] || 0})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── RÉSUMÉ STATS ── */}
      <View style={[styles.summaryStrip, { backgroundColor: cardBg }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.accent }]}>{totalSessions}</Text>
          <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>{t('planning.sessions')}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: dividerColor }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: '#F97316' }]}>{formatDurationCompact(totalMinutes)}</Text>
          <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>total</Text>
        </View>
        {totalCalories > 0 && (
          <>
            <View style={[styles.summaryDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: '#EF4444' }]}>{formatCalories(totalCalories)}</Text>
              <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>kcal</Text>
            </View>
          </>
        )}
        {totalDistance > 0.1 && (
          <>
            <View style={[styles.summaryDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: '#22C55E' }]}>{totalDistance.toFixed(1)} km</Text>
              <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>distance</Text>
            </View>
          </>
        )}
      </View>

      {/* ── SKELETON IMPORT ── */}
      {filteredWorkouts.length === 0 && isImporting && (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map(i => {
            const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35 + i * 0.08, 0.75 + i * 0.05] });
            return (
              <Animated.View key={i} style={[skeletonStyles.card, { backgroundColor: cardBg, opacity }]}>
                <View style={skeletonStyles.row}>
                  <View style={[skeletonStyles.dot, { backgroundColor: colors.textMuted }]} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={[skeletonStyles.line, { width: '55%', backgroundColor: colors.textMuted }]} />
                    <View style={[skeletonStyles.line, { width: '35%', backgroundColor: colors.textMuted, opacity: 0.5 }]} />
                  </View>
                  <View style={[skeletonStyles.badge, { backgroundColor: colors.textMuted }]} />
                </View>
                <View style={[skeletonStyles.divider, { backgroundColor: colors.textMuted }]} />
                <View style={skeletonStyles.stats}>
                  {[0, 1, 2].map(j => (
                    <View key={j} style={[skeletonStyles.stat, { backgroundColor: colors.textMuted }]} />
                  ))}
                </View>
              </Animated.View>
            );
          })}
          <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
            {importStep ? `Import en cours : ${importStep}...` : 'Importation de ton historique en cours...'}
          </Text>
        </View>
      )}

      {/* ── ÉTAT VIDE ── */}
      {filteredWorkouts.length === 0 && !isImporting && (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>

          {/* Diagnostic en cours */}
          {diagStatus === 'checking' && (
            <SamuraiLoader message="Vérification Apple Santé..." size={120} />
          )}

          {/* Permissions refusées ou inaccessibles */}
          {diagStatus === 'no_permission' && (
            <>
              <ShieldAlert size={38} color="#F59E0B" strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: colors.textPrimary, fontWeight: '700', marginTop: 12 }]}>
                Accès aux séances bloqué
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 8 }}>
                Va dans :{'\n'}
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                  Réglages {'>'} Santé {'>'} Accès aux données{'\n'}{'>'} Yoroi {'>'} active "Entraînements"
                </Text>
                {'\n\n'}Puis reviens ici et appuie sur "Importer".
              </Text>
              <View style={{ marginTop: 16, gap: 10, width: '100%', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={async () => {
                    setIsReRequestingPerms(true);
                    await healthConnect.requestWorkoutPermissions();
                    setIsReRequestingPerms(false);
                    setDiagStatus('checking');
                    // Re-vérifier après la demande
                    setTimeout(async () => {
                      const { accessible, count } = await healthConnect.canReadWorkouts();
                      if (accessible && count > 0) {
                        setDiagStatus('ok');
                        healthConnect.importFullHistory().catch(() => {});
                      } else if (accessible) {
                        setDiagStatus('no_workouts');
                      } else {
                        setDiagStatus('no_permission');
                      }
                    }, 1000);
                  }}
                  disabled={isReRequestingPerms}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 11,
                    borderRadius: 20,
                    backgroundColor: colors.accent + '18',
                    borderWidth: 1,
                    borderColor: colors.accent + '50',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  activeOpacity={0.7}
                >
                  {isReRequestingPerms
                    ? <ActivityIndicator size="small" color={colors.accent} />
                    : <RefreshCw size={14} color={colors.accent} />
                  }
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                    Demander les permissions
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL('x-apple-health://').catch(() => Linking.openSettings())}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 11,
                    borderRadius: 20,
                    backgroundColor: 'rgba(212,175,55,0.10)',
                    borderWidth: 1,
                    borderColor: 'rgba(212,175,55,0.30)',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#D4AF37' }}>
                    Ouvrir Reglages Sante
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 16, lineHeight: 16 }}>
                  Dans Reglages {'>'} Sante {'>'} Acces aux donnees {'>'} YOROI{'\n'}
                  Active "Entraînements" puis reviens ici
                </Text>
              </View>
            </>
          )}

          {/* Permissions ok, import en cours ou déclenché */}
          {diagStatus === 'ok' && (
            <SamuraiLoader message="Import des séances en cours..." size={120} />
          )}

          {/* Permissions ok mais aucun workout dans HealthKit */}
          {diagStatus === 'no_workouts' && (
            <>
              <Dumbbell size={38} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t('planning.noSessions')}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                Apple Santé est connecte mais aucune seance n'a ete enregistree.
              </Text>
            </>
          )}

          {/* État initial (avant diagnostic) */}
          {diagStatus === 'idle' && (
            <>
              <Dumbbell size={38} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune séance
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 19, paddingHorizontal: 16 }}>
                Tes séances Apple Santé n'ont pas encore été importées.
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  setIsForceImporting(true);
                  setDiagStatus('idle');
                  try {
                    // Effacer les flags d'import pour forcer la réimportation propre
                    await AsyncStorage.multiRemove([
                      '@yoroi_full_history_imported',
                      '@yoroi_import_version',
                      '@yoroi_imported_workouts',
                    ]);
                    // L'import émet YOROI_IMPORT_START → isImporting = true automatiquement
                    healthConnect.importFullHistory().catch(() => {});
                  } catch {
                    // ignore
                  } finally {
                    setIsForceImporting(false);
                  }
                }}
                disabled={isForceImporting}
                style={{
                  marginTop: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 24,
                  paddingVertical: 13,
                  borderRadius: 24,
                  backgroundColor: colors.accent,
                }}
                activeOpacity={0.75}
              >
                {isForceImporting
                  ? <ActivityIndicator size="small" color={colors.textOnAccent} />
                  : <RefreshCw size={16} color={colors.textOnAccent} />
                }
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textOnAccent }}>
                  {isForceImporting ? 'Importation...' : 'Importer mes séances Apple Santé'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    // Force la re-demande de permission entraînements puis teste immédiatement
                    await healthConnect.requestWorkoutPermissions();
                    await new Promise(r => setTimeout(r, 500));
                    const diag = await healthConnect.diagnoseWorkouts();
                    const count = diag.rawApiTest >= 0 ? diag.rawApiTest : (diag.healthkit30d || diag.healthkitAll || 0);
                    if (count > 0) {
                      alert(`Permissions OK ! ${count} séance(s) trouvée(s). Appuie sur "Importer" maintenant.`);
                    } else {
                      alert('Toujours 0 séance. Va dans Réglages > Santé > Accès aux données et app > Yoroi et vérifie que "Entraînements" est bien activé en LECTURE (pas seulement en écriture).');
                    }
                  } catch (e: any) {
                    alert(`Erreur : ${e?.message || e}`);
                  }
                }}
                style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: '#10B981' }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
                  Redemander l'accès aux entraînements
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL('app-settings:').catch(() => Linking.openSettings())}
                style={{ marginTop: 8, paddingVertical: 8 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' }}>
                  Ouvrir les réglages Yoroi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const diag = await healthConnect.diagnoseWorkouts();
                    const lines: string[] = [];
                    if (diag.rawApiTest === -2) {
                      lines.push(`ERREUR HealthKit : ${diag.rawApiError}`);
                    } else {
                      lines.push(`HealthKit retourne : ${diag.rawApiTest} seance(s) (test direct)`);
                      lines.push(`HealthKit 365j : ${diag.healthkit30d} seance(s)`);
                      lines.push(`HealthKit tout : ${diag.healthkitAll >= 0 ? diag.healthkitAll : 'timeout'} seance(s)`);
                    }
                    lines.push(`Base YOROI : ${diag.dbCount} seances`);
                    if (diag.error) lines.push(`Erreur : ${diag.error}`);
                    if (!diag.moduleLoaded) lines.push('HealthKit non disponible (simulateur ?)');
                    alert(lines.join('\n'));
                  } catch (e: any) {
                    alert(`Erreur diagnostic : ${e?.message || e}`);
                  }
                }}
                style={{ marginTop: 8, paddingVertical: 8 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: '#6366F1', textDecorationLine: 'underline' }}>
                  Diagnostiquer (voir les erreurs HealthKit)
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isDevMode && (
            <TouchableOpacity
              onPress={() => router.push('/workout-detail?demo=1' as any)}
              style={{
                marginTop: 12,
                paddingHorizontal: 18,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: 'rgba(99,102,241,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(99,102,241,0.25)',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366F1' }}>
                Voir une seance exemple
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── LISTE DES SÉANCES ── */}
      {filteredWorkouts.map((training, index) => {
        const sportColor = getSportColor(training.sport);
        const sportIcon = getSportIcon(training.sport);
        const sportName = getSportName(training.sport);
        const duration = training.duration_minutes || training.duration || 0;
        const det = parseWorkoutDetails(training.workout_details_json);

        // Métriques
        const distance = det.distanceKm || training.distance || 0;
        const pace = det.avgPaceSecondsPerKm;
        const elevUp = det.elevationAscended;
        const elevDown = det.elevationDescended;
        const avgHR = det.avgHeartRate || training.heart_rate || 0;
        const maxHR = det.maxHeartRate || training.max_heart_rate || 0;
        const minHR = det.minHeartRate || 0;
        const cal = det.activeCalories || training.calories || 0;
        const hrZones = det.heartRateZones;
        const weather = det.weatherTemp != null ? det.weatherTemp : undefined;
        const humidity = det.weatherHumidity;
        const weatherCond = det.weatherCondition;
        const aqi = det.airQualityIndex;
        const aqiCat = det.airQualityCategory;
        const hasGPS = det.hasRoute;
        const recovery = det.recoveryHR;

        // Club associé
        const club = training.club_id ? clubs.find(c => c.id === training.club_id) : null;

        // Date et heure
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
            timeStr = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')} – ${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
          }
        } catch { dateStr = training.date; }

        // Types de session
        let sessionTypes: string[] = [];
        if (training.session_types) {
          try { sessionTypes = JSON.parse(training.session_types); } catch {}
        } else if (training.session_type) {
          sessionTypes = [training.session_type];
        }

        // Muscles
        let muscleGroups: string[] = [];
        if (training.muscles) {
          try { muscleGroups = JSON.parse(training.muscles); } catch {}
        }

        const hasMetrics = duration > 0 || cal > 0 || distance > 0 || avgHR > 0 || training.watts || training.speed || training.cadence || training.rounds;
        const intensityVal = training.intensity || 0;
        const techniqueVal = training.technique_rating || 0;

        return (
          <React.Fragment key={training.id ?? index}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBg, borderLeftColor: sportColor }]}
            activeOpacity={0.75}
            onPress={() => {
              if (training.id != null) {
                impactAsync(ImpactFeedbackStyle.Light);
                router.push(`/workout-detail?id=${training.id}` as any);
              }
            }}
          >
            {/* ── LIGNE 1 : Sport + Source ── */}
            <View style={styles.cardHeader}>
              <View style={[styles.sportIconWrap, { backgroundColor: sportColor + '20' }]}>
                <MaterialCommunityIcons name={sportIcon as any} size={22} color={sportColor} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.sportTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {sportName}
                  {club ? <Text style={[styles.clubLabel, { color: sportColor }]}> · {club.name}</Text> : null}
                </Text>
                <View style={styles.dateRow}>
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
                  {timeStr ? <Text style={[styles.timeText, { color: colors.textMuted }]}> · {timeStr}</Text> : null}
                </View>
              </View>
              <SourceBadge source={training.source} colors={colors} isDark={isDark} />
              <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </View>

            {/* ── BADGES : types session, outdoor, GPS ── */}
            {(sessionTypes.length > 0 || training.is_outdoor || hasGPS || training.location_name || training.technical_theme) && (
              <View style={styles.tagsRow}>
                {sessionTypes.map((st, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: sportColor + '18' }]}>
                    <Text style={[styles.tagText, { color: sportColor }]}>{st}</Text>
                  </View>
                ))}
                {training.is_outdoor && (
                  <View style={[styles.tag, { backgroundColor: '#22C55E18' }]}>
                    <MaterialCommunityIcons name="nature" size={11} color="#22C55E" />
                    <Text style={[styles.tagText, { color: '#22C55E' }]}>Extérieur</Text>
                  </View>
                )}
                {hasGPS && (
                  <View style={[styles.tag, { backgroundColor: '#3B82F618' }]}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={11} color="#3B82F6" />
                    <Text style={[styles.tagText, { color: '#3B82F6' }]}>GPS</Text>
                  </View>
                )}
                {training.location_name && (
                  <View style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                    <MaterialCommunityIcons name="map-marker-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.tagText, { color: colors.textMuted }]} numberOfLines={1}>{training.location_name}</Text>
                  </View>
                )}
                {training.technical_theme && (
                  <View style={[styles.tag, { backgroundColor: '#8B5CF618' }]}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={11} color="#8B5CF6" />
                    <Text style={[styles.tagText, { color: '#8B5CF6' }]} numberOfLines={1}>{training.technical_theme}</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── GRILLE MÉTRIQUES ── */}
            {hasMetrics && (
              <View style={[styles.metricsGrid, { borderTopColor: dividerColor }]}>
                {duration > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="clock-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatDuration(duration)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>durée</Text>
                  </View>
                )}
                {cal > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="fire" size={15} color="#F97316" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCalories(cal)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>kcal</Text>
                  </View>
                )}
                {distance > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="map-marker-distance" size={15} color="#22C55E" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{distance.toFixed(2)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>km</Text>
                  </View>
                )}
                {avgHR > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="heart-pulse" size={15} color="#EF4444" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{avgHR}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>bpm moy</Text>
                  </View>
                )}
                {maxHR > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="heart-flash" size={15} color="#EF4444" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{maxHR}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>bpm max</Text>
                  </View>
                )}
                {pace && pace > 0 && pace < 1800 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="speedometer" size={15} color="#06B6D4" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatPace(pace)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>allure</Text>
                  </View>
                )}
                {elevUp != null && elevUp > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="elevation-rise" size={15} color="#A78BFA" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>+{Math.round(elevUp)}m</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>dénivelé</Text>
                  </View>
                )}
                {training.speed != null && training.speed > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="speedometer-medium" size={15} color="#06B6D4" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{training.speed.toFixed(1)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>km/h</Text>
                  </View>
                )}
                {training.watts != null && training.watts > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="lightning-bolt" size={15} color="#EAB308" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{training.watts}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>watts</Text>
                  </View>
                )}
                {training.cadence != null && training.cadence > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="rotate-3d-variant" size={15} color="#8B5CF6" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{training.cadence}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>rpm</Text>
                  </View>
                )}
                {training.rounds != null && training.rounds > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="boxing-glove" size={15} color={sportColor} />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                      {training.rounds}×{training.round_duration ? `${training.round_duration}min` : ''}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>rounds</Text>
                  </View>
                )}
                {training.pente != null && training.pente > 0 && (
                  <View style={styles.metricItem}>
                    <MaterialCommunityIcons name="slope-uphill" size={15} color="#F59E0B" />
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{training.pente}%</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>pente</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── ZONES FC ── */}
            {hrZones && hrZones.some(z => z.durationSeconds > 0) && (() => {
              const totalZ = hrZones.reduce((s, z) => s + z.durationSeconds, 0);
              if (totalZ === 0) return null;
              return (
                <View style={[styles.zonesSection, { borderTopColor: dividerColor }]}>
                  <Text style={[styles.zonesSectionTitle, { color: colors.textMuted }]}>Zones FC</Text>
                  <View style={styles.zonesBarWrap}>
                    {hrZones.map((z, i) => {
                      const pct = (z.durationSeconds / totalZ) * 100;
                      if (pct < 1) return null;
                      return (
                        <View key={i} style={[styles.zoneSegment, { flex: pct, backgroundColor: z.color }]} />
                      );
                    })}
                  </View>
                  <View style={styles.zonesLegend}>
                    {hrZones.filter(z => (z.durationSeconds / totalZ) * 100 >= 1).map((z, i) => {
                      const pct = Math.round((z.durationSeconds / totalZ) * 100);
                      const mins = Math.floor(z.durationSeconds / 60);
                      return (
                        <View key={i} style={styles.zoneLegendItem}>
                          <View style={[styles.zoneDot, { backgroundColor: z.color }]} />
                          <Text style={[styles.zoneLegendText, { color: colors.textMuted }]}>
                            Z{z.zone} {pct}% ({mins}min)
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {/* ── INTENSITÉ + TECHNIQUE ── */}
            {(intensityVal > 0 || techniqueVal > 0) && (
              <View style={[styles.ratingRow, { borderTopColor: dividerColor }]}>
                {intensityVal > 0 && (
                  <View style={styles.ratingItem}>
                    <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>Intensité RPE</Text>
                    <View style={styles.ratingContent}>
                      <IntensityBar value={intensityVal} color={sportColor} />
                      <Text style={[styles.ratingNum, { color: sportColor }]}>{intensityVal}/10</Text>
                    </View>
                  </View>
                )}
                {techniqueVal > 0 && (
                  <View style={styles.ratingItem}>
                    <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>Technique</Text>
                    <View style={styles.ratingContent}>
                      <TechniqueStars value={techniqueVal} color="#F59E0B" />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ── MUSCLES ── */}
            {muscleGroups.length > 0 && (
              <View style={[styles.musclesRow, { borderTopColor: dividerColor }]}>
                <MaterialCommunityIcons name="dumbbell" size={12} color={colors.textMuted} />
                <Text style={[styles.musclesText, { color: colors.textMuted }]}>{muscleGroups.join(' · ')}</Text>
              </View>
            )}

            {/* ── RÉCUP HR ── */}
            {recovery && recovery.atEnd && (
              <View style={[styles.recoveryRow, { borderTopColor: dividerColor }]}>
                <MaterialCommunityIcons name="heart-minus" size={13} color="#8B5CF6" />
                <Text style={[styles.recoveryText, { color: colors.textMuted }]}>
                  Récup FC : {recovery.atEnd} bpm
                  {recovery.after1Min ? ` → ${recovery.after1Min}` : ''}
                  {recovery.after2Min ? ` → ${recovery.after2Min}` : ''}
                </Text>
              </View>
            )}

            {/* ── MÉTÉO & AQI ── */}
            {(weather != null || aqi != null) && (
              <View style={[styles.weatherRow, { borderTopColor: dividerColor }]}>
                {weather != null && (
                  <View style={styles.weatherItem}>
                    <MaterialCommunityIcons name="thermometer" size={13} color={colors.textMuted} />
                    <Text style={[styles.weatherText, { color: colors.textMuted }]}>
                      {Math.round(weather)}°C{humidity != null ? ` · ${Math.round(humidity)}%` : ''}
                      {weatherCond ? ` · ${weatherCond}` : ''}
                    </Text>
                  </View>
                )}
                {aqi != null && (
                  <View style={styles.weatherItem}>
                    <MaterialCommunityIcons
                      name="weather-windy"
                      size={13}
                      color={aqi <= 50 ? '#22C55E' : aqi <= 100 ? '#EAB308' : '#EF4444'}
                    />
                    <Text style={[styles.weatherText, {
                      color: aqi <= 50 ? '#22C55E' : aqi <= 100 ? '#EAB308' : '#EF4444',
                    }]}>
                      AQI {aqi}{aqiCat ? ` (${aqiCat})` : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── GPS + SPLITS ── */}
            {det.routePoints && det.routePoints.length > 2 && training.id != null && (
              <View style={[styles.gpsSection, { borderTopColor: dividerColor }]}>
                {/* Bouton toggle */}
                <TouchableOpacity
                  style={[styles.gpsToggleBtn, { backgroundColor: expandedGPS.has(training.id!) ? sportColor + '22' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') }]}
                  onPress={() => toggleGPS(training.id!)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={15} color={expandedGPS.has(training.id!) ? sportColor : colors.textSecondary} />
                  <Text style={[styles.gpsToggleText, { color: expandedGPS.has(training.id!) ? sportColor : colors.textSecondary }]}>
                    Parcours GPS · {det.routePoints.length} points
                    {det.splits ? ` · ${det.splits.length} km` : ''}
                  </Text>
                  {expandedGPS.has(training.id!) ? (
                    <ChevronUp size={15} color={expandedGPS.has(training.id!) ? sportColor : colors.textSecondary} />
                  ) : (
                    <ChevronDown size={15} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>

                {/* Carte + splits dépliés */}
                {expandedGPS.has(training.id!) && (
                  <View style={styles.gpsContent}>
                    {/* Mini carte */}
                    <View style={styles.mapWrap}>
                      <WorkoutMapRoute
                        routePoints={det.routePoints}
                        boundingBox={det.routeBoundingBox}
                        height={200}
                        strokeColor={sportColor}
                        strokeWidth={4}
                      />
                    </View>

                    {/* Stats de route */}
                    <View style={styles.routeStatsRow}>
                      {det.distanceKm != null && (
                        <View style={[styles.routeStatChip, { backgroundColor: sportColor + '18' }]}>
                          <MaterialCommunityIcons name="map-marker-distance" size={13} color={sportColor} />
                          <Text style={[styles.routeStatText, { color: sportColor }]}>{det.distanceKm.toFixed(2)} km</Text>
                        </View>
                      )}
                      {det.elevationAscended != null && det.elevationAscended > 0 && (
                        <View style={[styles.routeStatChip, { backgroundColor: '#22C55E18' }]}>
                          <MaterialCommunityIcons name="elevation-rise" size={13} color="#22C55E" />
                          <Text style={[styles.routeStatText, { color: '#22C55E' }]}>+{Math.round(det.elevationAscended)}m</Text>
                        </View>
                      )}
                      {det.elevationDescended != null && det.elevationDescended > 0 && (
                        <View style={[styles.routeStatChip, { backgroundColor: '#EF444418' }]}>
                          <MaterialCommunityIcons name="elevation-decline" size={13} color="#EF4444" />
                          <Text style={[styles.routeStatText, { color: '#EF4444' }]}>-{Math.round(det.elevationDescended)}m</Text>
                        </View>
                      )}
                      {det.avgPaceSecondsPerKm != null && det.avgPaceSecondsPerKm > 0 && det.avgPaceSecondsPerKm < 1800 && (
                        <View style={[styles.routeStatChip, { backgroundColor: '#06B6D418' }]}>
                          <MaterialCommunityIcons name="speedometer" size={13} color="#06B6D4" />
                          <Text style={[styles.routeStatText, { color: '#06B6D4' }]}>{formatPace(det.avgPaceSecondsPerKm)}/km</Text>
                        </View>
                      )}
                    </View>

                    {/* Table des splits */}
                    {det.splits && det.splits.length > 0 && (
                      <View style={[styles.splitsTable, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12 }]}>
                        {/* Header */}
                        <View style={[styles.splitRow, { borderBottomColor: dividerColor }]}>
                          <Text style={[styles.splitHeader, styles.splitKmCol, { color: colors.textMuted }]}>km</Text>
                          <Text style={[styles.splitHeader, styles.splitTimeCol, { color: colors.textMuted }]}>Durée</Text>
                          <Text style={[styles.splitHeader, styles.splitPaceCol, { color: colors.textMuted }]}>Allure</Text>
                          <Text style={[styles.splitHeader, styles.splitElevCol, { color: colors.textMuted }]}>D+</Text>
                          <Text style={[styles.splitHeader, styles.splitHRCol, { color: colors.textMuted }]}>FC</Text>
                        </View>
                        {det.splits.map((split, si) => {
                          const isFastest = det.splits!.reduce((minIdx, s, i) => s.paceSecondsPerKm < det.splits![minIdx].paceSecondsPerKm ? i : minIdx, 0) === si;
                          const dSec = split.durationSeconds;
                          const dStr = dSec != null
                            ? `${Math.floor(dSec / 60)}'${(dSec % 60).toString().padStart(2, '0')}"`
                            : '--';
                          return (
                            <View
                              key={split.index}
                              style={[styles.splitRow, { borderBottomColor: dividerColor, backgroundColor: isFastest ? sportColor + '12' : 'transparent' }]}
                            >
                              <Text style={[styles.splitCell, styles.splitKmCol, { color: colors.textMuted }]}>{split.index}</Text>
                              <Text style={[styles.splitCell, styles.splitTimeCol, { color: '#F59E0B', fontWeight: '700' }]}>{dStr}</Text>
                              <Text style={[styles.splitCell, styles.splitPaceCol, { color: '#22C55E', fontWeight: isFastest ? '800' : '600' }]}>
                                {formatPace(split.paceSecondsPerKm)}
                              </Text>
                              <Text style={[styles.splitCell, styles.splitElevCol, { color: '#3B82F6' }]}>
                                {split.elevationGain != null && split.elevationGain > 0 ? `+${split.elevationGain}m` : '-'}
                              </Text>
                              <Text style={[styles.splitCell, styles.splitHRCol, { color: '#EF4444' }]}>
                                {split.avgHeartRate ? `${split.avgHeartRate}` : '-'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ── NOTES ── */}
            {training.notes && training.notes.trim().length > 0 && (
              <View style={[styles.notesRow, { borderTopColor: dividerColor, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)' }]}>
                <MaterialCommunityIcons name="note-text-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={3}>
                  {training.notes}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {index < filteredWorkouts.length - 1 && (
            <View style={[styles.sessionSeparator, { backgroundColor: colors.accent }]} />
          )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dot: {
    width: 36, height: 36, borderRadius: 18, opacity: 0.2,
  },
  line: {
    height: 10, borderRadius: 5, opacity: 0.2,
  },
  badge: {
    width: 48, height: 22, borderRadius: 11, opacity: 0.15,
  },
  divider: {
    height: 1, opacity: 0.1, marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1, height: 32, borderRadius: 8, opacity: 0.12,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ── Header mois
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 10,
    gap: 8,
  },
  arrowBtn: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // ── Filtres sport
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
  // ── Résumé
  summaryStrip: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLbl: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  // ── Vide
  emptyCard: {
    borderRadius: 16,
    padding: 44,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // ── Carte séance
  card: {
    borderRadius: 18,
    borderLeftWidth: 4,
    marginBottom: 0,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // ── Séparateur thème entre séances
  sessionSeparator: {
    height: 4,
    borderRadius: 2,
    marginVertical: 10,
    opacity: 0.35,
  },
  // Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 10,
  },
  sportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  sportTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  clubLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 150,
  },
  // Métriques
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 0,
    rowGap: 12,
  },
  metricItem: {
    width: '25%',
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Zones FC
  zonesSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
  },
  zonesSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  zonesBarWrap: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 1,
  },
  zoneSegment: {
    height: 8,
    borderRadius: 2,
  },
  zonesLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  zoneLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoneDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  zoneLegendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Intensité & technique
  ratingRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  ratingItem: {
    gap: 4,
  },
  ratingLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Muscles
  musclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 6,
  },
  musclesText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  // Récup HR
  recoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 6,
  },
  recoveryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Météo
  weatherRow: {
    flexDirection: 'row',
    gap: 14,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 6,
    flexWrap: 'wrap',
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  weatherText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Notes
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderTopWidth: 1,
    paddingTop: 9,
    paddingBottom: 10,
    marginTop: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    fontWeight: '400',
    flex: 1,
    lineHeight: 18,
  },
  // ── GPS section
  gpsSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 4,
  },
  gpsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 4,
  },
  gpsToggleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  gpsContent: {
    marginTop: 6,
    gap: 10,
  },
  mapWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  routeStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  routeStatText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Splits table
  splitsTable: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  splitRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  splitHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  splitCell: {
    fontSize: 13,
    fontWeight: '600',
  },
  splitKmCol: { width: 24, textAlign: 'center' },
  splitTimeCol: { flex: 1 },
  splitPaceCol: { width: 64 },
  splitElevCol: { width: 44 },
  splitHRCol: { width: 40, textAlign: 'right' },
});
