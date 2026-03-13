import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Calendar, Dna, ChevronLeft, ChevronRight, Plus, List, MapPin, Flame, Clock, Heart } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllMeasurements, Measurement } from '@/lib/storage';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { getTrainings, Training } from '@/lib/database';
import { getSportById } from '@/lib/sports';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import logger from '@/lib/security/logger';
import { usePreventDoubleClick } from '@/hooks/usePreventDoubleClick';
import { useDevMode } from '@/lib/DevModeContext';
import { SamuraiLoader } from '@/components/SamuraiLoader';

const { width: screenWidth } = Dimensions.get('window');

// Constants for layout (non-theme values)
const RADIUS = { sm: 12, md: 16, lg: 20, xl: 24, xxl: 28 };
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };
const FONT_SIZE = { xs: 10, sm: 12, md: 13, lg: 14, xl: 15, xxl: 16, display: 18, title: 20, hero: 28, giant: 32 };

// Types pour les sélecteurs
type CompositionMetric = 'weight' | 'bodyFat' | 'muscleMass' | 'water';
type MeasurementMetric = 'waist' | 'shoulders' | 'navel' | 'hips' | 'arms' | 'thighs';

interface CompositionOption {
  key: CompositionMetric;
  label: string;
  unit: string;
}

interface MeasurementMetricOption {
  key: MeasurementMetric;
  label: string;
  unit: string;
  color: string;
}

const COMPOSITION_OPTIONS: CompositionOption[] = [
  { key: 'weight', label: 'Poids', unit: 'kg' },
  { key: 'bodyFat', label: 'Graisse', unit: '%' },
  { key: 'muscleMass', label: 'Muscle', unit: 'kg' },
  { key: 'water', label: 'Eau', unit: '%' },
];

// Accent colors for measurements (consistent across themes)
const ACCENT_COLORS = {
  cyan: '#00D4FF',
  green: '#10B981',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  blue: '#2563EB',
};

const MEASUREMENT_METRICS: MeasurementMetricOption[] = [
  { key: 'waist', label: 'Taille', unit: 'cm', color: ACCENT_COLORS.cyan },
  { key: 'shoulders', label: 'Épaules', unit: 'cm', color: ACCENT_COLORS.green },
  { key: 'navel', label: 'Nombril', unit: 'cm', color: ACCENT_COLORS.orange },
  { key: 'hips', label: 'Hanches', unit: 'cm', color: ACCENT_COLORS.red },
  { key: 'arms', label: 'Bras', unit: 'cm', color: ACCENT_COLORS.purple },
  { key: 'thighs', label: 'Cuisse', unit: 'cm', color: ACCENT_COLORS.blue },
];

// SUPPRIMÉ POUR PRODUCTION - Données de test retirées (lignes 79-188)

export default function HistoryScreen() {
  const { colors: themeColors } = useTheme();
  const { t, formatDate, locale } = useI18n();
  const { isDevMode } = useDevMode();

  // Mois traduits dynamiquement
  const MONTHS = useMemo(() => [
    t('dates.january'), t('dates.february'), t('dates.march'), t('dates.april'),
    t('dates.may'), t('dates.june'), t('dates.july'), t('dates.august'),
    t('dates.september'), t('dates.october'), t('dates.november'), t('dates.december')
  ], [t]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'stats'>('list');
  const [selectedComposition, setSelectedComposition] = useState<CompositionMetric>('weight');
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementMetric>('waist');
  const [records, setRecords] = useState<Measurement[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90' | 'all'>('all');
  const [dayModalTrainings, setDayModalTrainings] = useState<Training[]>([]);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const { isProcessing, executeOnce } = usePreventDoubleClick({ delay: 500 });
  const cancelledRef = useRef(false);

  const fetchHistoryRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [measurements, allTrainings] = await Promise.all([
        getAllMeasurements(),
        getTrainings(), // SQLite: inclut Apple Health + séances manuelles
      ]);

      if (cancelledRef.current) return;
      setTrainings(allTrainings);
      setRecords(measurements);
    } catch (error) {
      logger.error('Erreur chargement historique:', error);
      if (!cancelledRef.current) setRecords([]);
    }
    if (!cancelledRef.current) setLoading(false);
  }, []);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => {
    cancelledRef.current = false;
    fetchHistoryRecords();
    return () => { cancelledRef.current = true; };
  }, []);

  // Calendrier mensuel
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7;

    const days: (Date | null)[] = [];
    for (let i = 1; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [currentMonth]);

  const getTrainingsForDate = (date: Date | null): Training[] => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return [];
    const dateString = date.toISOString().split('T')[0];
    return trainings.filter(t => t.date === dateString);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDayPress = (date: Date) => {
    if (isProcessing) return;

    executeOnce(async () => {
      const dateString = date.toISOString().split('T')[0];
      const dayTrainings = trainings.filter(t => t.date === dateString);
      if (dayTrainings.length === 0) {
        router.push({ pathname: '/add-training', params: { date: dateString } });
      } else if (dayTrainings.length === 1 && dayTrainings[0].id) {
        router.push({ pathname: '/workout-detail', params: { id: dayTrainings[0].id.toString() } });
      } else {
        // Plusieurs séances ce jour → afficher un modal de sélection
        setDayModalTrainings(dayTrainings);
        setDayModalVisible(true);
      }
    });
  };

  // Filtrer les données selon la période sélectionnée
  const filteredRecords = useMemo(() => {
    if (selectedPeriod === 'all') return records;
    
    const days = selectedPeriod === '7' ? 7 : selectedPeriod === '30' ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return records.filter(record => new Date(record.date) >= cutoffDate);
  }, [records, selectedPeriod]);

  // Données pour les graphiques
  const compositionChartData = useMemo(() => {
    return filteredRecords
      .map((record, index) => {
        let value: number = 0;
        switch (selectedComposition) {
          case 'weight': value = record.weight; break;
          case 'bodyFat': value = record.body_fat || 0; break;
          case 'muscleMass': value = record.muscle_mass || 0; break;
          case 'water': value = record.water || 0; break;
        }
        return {
          value,
          label: new Date(record.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          date: record.date,
          frontColor: index % 2 === 0 ? '#1A1A2E' : '#FFFFFF', // Barres alternées noir/blanc
        };
      })
      .filter(item => item.value > 0)
      .reverse();
  }, [filteredRecords, selectedComposition]);

  const currentCompositionOption = COMPOSITION_OPTIONS.find(opt => opt.key === selectedComposition);

  // Préparer les données pour les graphiques de mensurations
  const measurementChartData = useMemo(() => {
    const data = filteredRecords
      .map((record) => {
        const measurements = record.measurements || {};
        let value: number = 0;
        
        switch (selectedMeasurement) {
          case 'waist':
            value = measurements.waist || 0;
            break;
          case 'shoulders':
            value = (measurements as any).shoulder || 0;
            break;
          case 'navel':
            value = measurements.navel || 0;
            break;
          case 'hips':
            value = measurements.hips || 0;
            break;
          case 'arms':
            // Moyenne des deux bras ou une seule valeur
            const leftArm = measurements.left_arm || 0;
            const rightArm = measurements.right_arm || 0;
            value = leftArm && rightArm ? (leftArm + rightArm) / 2 : (leftArm || rightArm);
            break;
          case 'thighs':
            // Moyenne des deux cuisses ou une seule valeur
            const leftThigh = measurements.left_thigh || 0;
            const rightThigh = measurements.right_thigh || 0;
            value = leftThigh && rightThigh ? (leftThigh + rightThigh) / 2 : (leftThigh || rightThigh);
            break;
        }
        
        return {
          value,
          label: new Date(record.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          date: record.date,
        };
      })
      .filter(item => item.value > 0)
      .reverse();
    
    return data;
  }, [filteredRecords, selectedMeasurement]);

  // Préparer les données pour toutes les mensurations (multi-lignes)
  // Ordre de priorité strict : Taille, Épaules, Nombril, Hanches, Bras, Cuisse
  const allMeasurementsChartData = useMemo(() => {
    const dates = filteredRecords
      .map(r => r.date)
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort()
      .reverse();
    
    // Ordre de priorité strict
    const priorityOrder: MeasurementMetric[] = ['waist', 'shoulders', 'navel', 'hips', 'arms', 'thighs'];
    
    return priorityOrder.map(metricKey => {
      const metric = MEASUREMENT_METRICS.find(m => m.key === metricKey);
      if (!metric) return null;
      
      const data = dates.map(date => {
        const record = filteredRecords.find(r => r.date === date);
        if (!record || !record.measurements) return { value: 0, label: '', date };
        
        let value = 0;
        switch (metricKey) {
          case 'waist':
            value = record.measurements.waist || 0;
            break;
          case 'shoulders':
            value = (record.measurements as any).shoulder || 0;
            break;
          case 'navel':
            value = record.measurements.navel || 0;
            break;
          case 'hips':
            value = record.measurements.hips || 0;
            break;
          case 'arms':
            // Moyenne des deux bras ou une seule valeur
            const leftArm = record.measurements.left_arm || 0;
            const rightArm = record.measurements.right_arm || 0;
            value = leftArm && rightArm ? (leftArm + rightArm) / 2 : (leftArm || rightArm);
            break;
          case 'thighs':
            // Moyenne des deux cuisses ou une seule valeur
            const leftThigh = record.measurements.left_thigh || 0;
            const rightThigh = record.measurements.right_thigh || 0;
            value = leftThigh && rightThigh ? (leftThigh + rightThigh) / 2 : (leftThigh || rightThigh);
            break;
        }
        
        return {
          value,
          label: new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          date,
        };
      }).filter(item => item.value > 0);
      
      return data.length > 0 ? { metric, data } : null;
    }).filter(item => item !== null) as { metric: MeasurementMetricOption; data: { value: number; label: string; date: string }[] }[];
  }, [filteredRecords]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <SamuraiLoader message="Chargement de l'historique..." />
      </View>
    );
  }

  return (
    <>
    <ScreenWrapper noPadding>
      <Header
        title="Historique"
        showBack
        rightElement={isDevMode ? (
          <TouchableOpacity
            onPress={() => router.push('/workout-detail?demo=1' as any)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.15)' }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366F1' }}>Démo</Text>
          </TouchableOpacity>
        ) : undefined}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Summary Card - Always Visible */}
        <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.summaryTitle, { color: themeColors.textPrimary }]}>Résumé du mois</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryTotal}>
              <Text style={[styles.summaryTotalLabel, { color: themeColors.textSecondary }]}>Total Entraînements</Text>
              <Text style={[styles.summaryTotalNumber, { color: themeColors.textPrimary }]}>
                {trainings.filter(t => {
                  const d = new Date(t.date);
                  return d.getFullYear() === currentMonth.getFullYear() &&
                         d.getMonth() === currentMonth.getMonth();
                }).length}
              </Text>
            </View>
            <View style={styles.summaryDetails}>
              {(() => {
                const monthTrainings = trainings.filter(t => {
                  const d = new Date(t.date);
                  return d.getFullYear() === currentMonth.getFullYear() &&
                         d.getMonth() === currentMonth.getMonth();
                });

                // Grouper dynamiquement par sport
                const sportCounts: { [sport: string]: number } = {};
                monthTrainings.forEach(t => {
                  sportCounts[t.sport] = (sportCounts[t.sport] || 0) + 1;
                });

                const sortedSports = Object.entries(sportCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4); // Top 4 sports

                return sortedSports.map(([sport, count], index) => {
                  const sportInfo = getSportById(sport);
                  const iconName = sportInfo?.icon || 'trophy';
                  const sportColor = sportInfo?.color || themeColors.textPrimary;

                  return (
                    <View key={sport} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {index > 0 && <View style={[styles.summaryDivider, { backgroundColor: themeColors.border }]} />}
                      <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name={iconName as any} size={24} color={sportColor} />
                        <Text style={[styles.summaryCount, { color: themeColors.textPrimary }]}>x{count}</Text>
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={[styles.segmentedControl, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'list' && { backgroundColor: themeColors.gold }]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <List size={18} color={viewMode === 'list' ? themeColors.background : themeColors.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.segmentButtonText, { color: viewMode === 'list' ? themeColors.background : themeColors.textPrimary }]}>
              Séances
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'calendar' && { backgroundColor: themeColors.gold }]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={viewMode === 'calendar' ? themeColors.background : themeColors.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.segmentButtonText, { color: viewMode === 'calendar' ? themeColors.background : themeColors.textPrimary }]}>
              Calendrier
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'stats' && { backgroundColor: themeColors.gold }]}
            onPress={() => setViewMode('stats')}
            activeOpacity={0.7}
          >
            <Dna size={18} color={viewMode === 'stats' ? themeColors.background : themeColors.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.segmentButtonText, { color: viewMode === 'stats' ? themeColors.background : themeColors.textPrimary }]}>
              Évolution
            </Text>
          </TouchableOpacity>
        </View>

        {/* View 0 : Liste complète de toutes les séances */}
        {viewMode === 'list' && (
          <View style={{ gap: 10 }}>
            {trainings.length === 0 ? (
              <View style={[styles.calendarCard, { backgroundColor: themeColors.card, alignItems: 'center', paddingVertical: 40 }]}>
                <List size={40} color={themeColors.textSecondary} strokeWidth={1.5} />
                <Text style={{ color: themeColors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Aucune séance enregistrée</Text>
                <Text style={{ color: themeColors.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' }}>Ajoute ta première séance depuis le menu +</Text>
              </View>
            ) : (
              trainings.map((t, i) => {
                const sportInfo = getSportById(t.sport);
                const sportColor = sportInfo?.color || themeColors.gold;
                const sportIcon = sportInfo?.icon || 'trophy';
                const hasGPS = !!(t.location_lat || t.workout_details_json || t.healthkit_uuid);
                return (
                  <TouchableOpacity
                    key={t.id || i}
                    activeOpacity={0.75}
                    onPress={() => t.id && router.push({ pathname: '/workout-detail', params: { id: t.id.toString() } })}
                    style={{ backgroundColor: themeColors.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderLeftWidth: 3, borderLeftColor: sportColor }}
                  >
                    {/* Icône sport */}
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: `${sportColor}20`, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name={sportIcon as any} size={24} color={sportColor} />
                    </View>
                    {/* Infos */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: themeColors.textPrimary }} numberOfLines={1}>
                          {sportInfo?.label || t.sport}
                        </Text>
                        {hasGPS && <MapPin size={12} color={themeColors.textSecondary} strokeWidth={2} />}
                      </View>
                      <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginTop: 2 }}>
                        {new Date(t.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {t.start_time ? ` · ${t.start_time.slice(0, 5)}` : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                        {(t.duration || t.duration_minutes) ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} color={themeColors.textSecondary} strokeWidth={2} />
                            <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{t.duration || t.duration_minutes} min</Text>
                          </View>
                        ) : null}
                        {t.distance ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} color={themeColors.textSecondary} strokeWidth={2} />
                            <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{t.distance.toFixed(1)} km</Text>
                          </View>
                        ) : null}
                        {t.calories ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Flame size={12} color={themeColors.textSecondary} strokeWidth={2} />
                            <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{t.calories} kcal</Text>
                          </View>
                        ) : null}
                        {t.heart_rate ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Heart size={12} color="#EF4444" strokeWidth={2} />
                            <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{t.heart_rate} bpm</Text>
                          </View>
                        ) : null}
                      </View>
                      {/* Résumé exercices (muscu) */}
                      {(() => {
                        const exs = Array.isArray(t.exercises) ? t.exercises : (() => { try { return t.exercises ? JSON.parse(t.exercises as any) : []; } catch { return []; } })();
                        if (exs.length > 0) {
                          const summary = exs.slice(0, 3).map((e: any) => `${e.name}${e.sets ? ` ×${e.sets}` : ''}`).join(' · ');
                          return (
                            <Text style={{ fontSize: 11, color: sportColor, marginTop: 4, fontWeight: '600' }} numberOfLines={1}>
                              {summary}{exs.length > 3 ? ` +${exs.length - 3}` : ''}
                            </Text>
                          );
                        }
                        // Résumé combat (thème + rounds)
                        const parts: string[] = [];
                        if (t.technical_theme) parts.push(t.technical_theme);
                        if ((t.rounds ?? 0) > 0) parts.push(`${t.rounds} round${(t.rounds ?? 0) > 1 ? 's' : ''}`);
                        if (parts.length > 0) {
                          return (
                            <Text style={{ fontSize: 11, color: sportColor, marginTop: 4, fontWeight: '600' }} numberOfLines={1}>
                              {parts.join(' · ')}
                            </Text>
                          );
                        }
                        return null;
                      })()}
                    </View>
                    <ChevronRight size={18} color={themeColors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* View A: Discipline (Calendar) */}
        {viewMode === 'calendar' && (
          <View style={[styles.calendarCard, { backgroundColor: themeColors.card }]}>
            {/* Header avec navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
                <ChevronLeft size={24} color={themeColors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={[styles.monthYear, { color: themeColors.textPrimary }]}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                <ChevronRight size={24} color={themeColors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Jours de la semaine */}
            <View style={styles.weekDays}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                <View key={`${day}-${index}`} style={styles.weekDayCell}>
                  <Text style={[styles.weekDayText, { color: themeColors.textSecondary }]}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Grille du calendrier */}
            <View style={styles.calendarGrid}>
              {calendarData.map((item, index) => {
                if (!item) {
                  return <View key={`empty-${index}`} style={styles.emptyDay} />;
                }
                if (!(item instanceof Date) || isNaN(item.getTime())) {
                  return <View key={`invalid-${index}`} style={styles.emptyDay} />;
                }

                const dayTrainings = getTrainingsForDate(item);
                const hasTrainings = dayTrainings.length > 0;
                const isToday = item.toDateString() === new Date().toDateString();

                return (
                  <TouchableOpacity
                    key={item.toISOString()}
                    style={[
                      styles.dayCell,
                      { backgroundColor: themeColors.cardHover },
                      hasTrainings && { backgroundColor: themeColors.goldMuted },
                      isToday && { borderWidth: 2, borderColor: themeColors.gold },
                    ]}
                    onPress={() => handleDayPress(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayNumber, { color: themeColors.textPrimary }, isToday && { color: themeColors.gold, fontWeight: '800' }]}>
                      {item.getDate()}
                    </Text>
                    {hasTrainings && (
                      <View style={styles.dayWorkoutsContainer}>
                        {dayTrainings.slice(0, 3).map((training, tIdx) => {
                          const sportInfo = getSportById(training.sport);
                          const iconName = sportInfo?.icon || 'trophy';
                          const sportColor = sportInfo?.color || themeColors.textPrimary;

                          // Club logo if available
                          if (training.club_logo) {
                            return (
                              <Image
                                key={training.id || tIdx}
                                source={{ uri: training.club_logo }}
                                style={styles.dayWorkoutLogo}
                                resizeMode="contain"
                              />
                            );
                          }

                          return (
                            <MaterialCommunityIcons
                              key={training.id || tIdx}
                              name={iconName as any}
                              size={14}
                              color={sportColor}
                            />
                          );
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* View B: Évolution (Graphs) */}
        {viewMode === 'stats' && (
          <>
            {/* Sélecteur de période */}
            <View style={styles.periodSelector}>
              {(['7', '30', '90', 'all'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    {
                      backgroundColor: selectedPeriod === period ? themeColors.gold : themeColors.card,
                      borderColor: themeColors.border,
                    }
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.periodButtonText,
                    { color: selectedPeriod === period ? themeColors.background : themeColors.textPrimary }
                  ]}>
                    {period === 'all' ? 'Tout' : `${period}j`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SECTION 1: Composition Corporelle */}
            <View style={styles.sectionContainer}>
              <View style={{ backgroundColor: themeColors.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 12, alignSelf: 'flex-start' }}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginBottom: 0, marginHorizontal: 0 }]}>Composition Corporelle</Text>
              </View>

              <View style={[styles.chartCard, { backgroundColor: themeColors.card }]}>
                <View style={styles.selectorContainer}>
                  {COMPOSITION_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.selectorPill,
                        {
                          backgroundColor: selectedComposition === option.key ? themeColors.gold : themeColors.cardHover,
                        }
                      ]}
                      onPress={() => setSelectedComposition(option.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          { color: selectedComposition === option.key ? themeColors.background : themeColors.textPrimary }
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {compositionChartData.length >= 2 ? (
                  <View style={[styles.chartContainer, { backgroundColor: '#8ecfe4', borderRadius: 16, padding: 16 }]}>
                    <BarChart
                      data={compositionChartData}
                      width={screenWidth - 110}
                      height={200}
                      barWidth={32}
                      spacing={24}
                      initialSpacing={16}
                      endSpacing={16}
                      isAnimated
                      animationDuration={800}
                      rulesColor="rgba(255,255,255,0.2)"
                      rulesType="solid"
                      xAxisColor="transparent"
                      yAxisColor="transparent"
                      yAxisTextStyle={{ color: '#1A1A2E', fontSize: 11, fontWeight: '600' }}
                      xAxisLabelTextStyle={{ color: '#1A1A2E', fontSize: 10 }}
                      yAxisLabelSuffix={` ${currentCompositionOption?.unit || ''}`}
                      noOfSections={4}
                      showGradient={false}
                      roundedTop
                      roundedBottom
                    />
                  </View>
                ) : (
                  <View style={styles.emptyChartContainer}>
                    <Text style={[styles.emptyChartText, { color: themeColors.textSecondary, marginBottom: 16 }]}>
                      Ajoutez au moins 2 mesures pour voir l'évolution
                    </Text>
                    <TouchableOpacity
                      style={[styles.emptyCTA, { backgroundColor: themeColors.gold }]}
                      onPress={() => router.push('/add-measurement')}
                    >
                      <Plus size={18} color={themeColors.background} />
                      <Text style={[styles.emptyCTAText, { color: themeColors.background }]}>Saisir une mesure</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* SECTION 2: Mensurations (Body Measurements) */}
            <View style={styles.sectionContainer}>
              <View style={{ backgroundColor: themeColors.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 12, alignSelf: 'flex-start' }}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginBottom: 0, marginHorizontal: 0 }]}>Mensurations</Text>
              </View>

              {/* Card 1: Graphique individuel avec sélecteur */}
              <View style={[styles.chartCard, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.chartCardTitle, { color: themeColors.textPrimary }]}>Évolution individuelle</Text>

                {/* Sélecteur de mensuration */}
                <View style={styles.measurementSelector}>
                  {MEASUREMENT_METRICS.map((metric) => (
                    <TouchableOpacity
                      key={metric.key}
                      style={[
                        styles.measurementChip,
                        {
                          backgroundColor: selectedMeasurement === metric.key ? metric.color : themeColors.cardHover,
                        }
                      ]}
                      onPress={() => setSelectedMeasurement(metric.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.measurementChipText,
                        { color: selectedMeasurement === metric.key ? themeColors.background : themeColors.textPrimary }
                      ]}>
                        {metric.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.measurementsChartContainer}>
                  {measurementChartData.length >= 2 ? (
                    <LineChart
                      data={measurementChartData}
                      width={screenWidth - 80}
                      height={200}
                      color={MEASUREMENT_METRICS.find(m => m.key === selectedMeasurement)?.color || '#2563EB'}
                      hideDataPoints={false}
                      dataPointsColor={MEASUREMENT_METRICS.find(m => m.key === selectedMeasurement)?.color || '#2563EB'}
                      dataPointsRadius={4}
                      spacing={50}
                      initialSpacing={20}
                      endSpacing={20}
                      isAnimated
                      animationDuration={800}
                      rulesColor={themeColors.border}
                      rulesType="solid"
                      xAxisColor="transparent"
                      yAxisColor="transparent"
                      yAxisTextStyle={{ color: themeColors.textSecondary, fontSize: 11 }}
                      xAxisLabelTextStyle={{ color: themeColors.textSecondary, fontSize: 10 }}
                      yAxisLabelSuffix=" cm"
                      thickness={2.5}
                      areaChart
                      startFillColor={`${MEASUREMENT_METRICS.find(m => m.key === selectedMeasurement)?.color || '#2563EB'}30`}
                      endFillColor={`${MEASUREMENT_METRICS.find(m => m.key === selectedMeasurement)?.color || '#2563EB'}05`}
                      startOpacity={0.6}
                      endOpacity={0.1}
                      curved
                    />
                  ) : (
                    <View style={styles.emptyChartContainer}>
                      <Text style={[styles.emptyChartText, { color: themeColors.textSecondary, marginBottom: 16 }]}>
                        Ajoutez au moins 2 mesures pour voir l'évolution
                      </Text>
                      <TouchableOpacity
                        style={[styles.emptyCTA, { backgroundColor: themeColors.gold }]}
                        onPress={() => router.push('/add-measurement')}
                      >
                        <Plus size={18} color={themeColors.background} />
                        <Text style={[styles.emptyCTAText, { color: themeColors.background }]}>Saisir une mesure</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Card 2: Graphique multi-lignes (toutes les mensurations) */}
              <View style={[styles.chartCard, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.chartCardTitle, { color: themeColors.textPrimary }]}>Vue d'ensemble</Text>
                
                {allMeasurementsChartData.length > 0 ? (
                  <View style={styles.chartContainer}>
                    {/* Légende des couleurs */}
                    <View style={styles.legendContainer}>
                      {allMeasurementsChartData.map((item, index) => (
                        <View key={item.metric.key} style={styles.legendItem}>
                          <View style={[styles.legendColor, { backgroundColor: item.metric.color }]} />
                          <Text style={[styles.legendText, { color: themeColors.textPrimary }]}>{item.metric.label}</Text>
                        </View>
                      ))}
                    </View>
                    
                    {/* Graphique multi-lignes */}
                    <View style={styles.multiLineChartContainer}>
                      {allMeasurementsChartData.map((item, index) => {
                        if (item.data.length < 2) return null;
                        return (
                          <View
                            key={item.metric.key}
                            style={[
                              styles.chartOverlay,
                              index > 0 && styles.chartOverlayAbsolute,
                            ]}
                          >
                            <LineChart
                              data={item.data}
                              width={screenWidth - 80}
                              height={200}
                              color={item.metric.color}
                              hideDataPoints={index > 0}
                              dataPointsColor={item.metric.color}
                              dataPointsRadius={4}
                              spacing={50}
                              initialSpacing={20}
                              endSpacing={20}
                              isAnimated
                              animationDuration={800}
                              rulesColor={index === 0 ? themeColors.border : "transparent"}
                              rulesType="solid"
                              xAxisColor="transparent"
                              yAxisColor="transparent"
                              yAxisTextStyle={index === 0 ? { color: themeColors.textSecondary, fontSize: 11 } : { color: 'transparent', fontSize: 0 }}
                              xAxisLabelTextStyle={index === 0 ? { color: themeColors.textSecondary, fontSize: 10 } : { color: 'transparent', fontSize: 0 }}
                              yAxisLabelSuffix=" cm"
                              thickness={2.5}
                              areaChart={false}
                              curved
                              pointerConfig={{
                                pointer1Color: item.metric.color,
                                pointerStripUptoDataPoint: true,
                                pointerStripColor: item.metric.color,
                                pointerStripWidth: 1,
                              }}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyChartContainer}>
                    <Text style={[styles.emptyChartText, { color: themeColors.textSecondary }]}>
                      Ajoutez au moins 2 mesures de mensurations pour voir l'évolution
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
      {/* Modal sélection séance quand plusieurs dans la même journée */}
      <Modal
        visible={dayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDayModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: themeColors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: themeColors.textPrimary, marginBottom: 16, textAlign: 'center' }}>
              {dayModalTrainings.length} séances ce jour
            </Text>
            {dayModalTrainings.map((t, i) => {
              const sportInfo = getSportById(t.sport);
              const sportColor = sportInfo?.color || themeColors.gold;
              const sportIcon = sportInfo?.icon || 'trophy';
              return (
                <TouchableOpacity
                  key={t.id || i}
                  onPress={() => {
                    setDayModalVisible(false);
                    if (t.id) router.push({ pathname: '/workout-detail', params: { id: t.id.toString() } });
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: i < dayModalTrainings.length - 1 ? 1 : 0, borderBottomColor: themeColors.border }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${sportColor}20`, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name={sportIcon as any} size={22} color={sportColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: themeColors.textPrimary }}>{sportInfo?.label || t.sport}</Text>
                    <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginTop: 2 }}>
                      {t.duration || t.duration_minutes || 0} min
                      {t.start_time ? ` · ${t.start_time.slice(0, 5)}` : ''}
                      {t.calories ? ` · ${t.calories} kcal` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={themeColors.textSecondary} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => setDayModalVisible(false)}
              style={{ marginTop: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: themeColors.cardHover }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: themeColors.textSecondary }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? SPACING.xl : SPACING.md,
    paddingBottom: 90,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.hero,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: RADIUS.xxl,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  segmentButtonActive: {
    // Applied inline
  },
  segmentButtonText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  calendarCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  navButton: {
    padding: SPACING.sm,
  },
  monthYear: {
    fontSize: FONT_SIZE.display,
    fontWeight: '700',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  weekDayText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayCell: {
    width: `${100/7}%`,
    aspectRatio: 1,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xs,
  },
  dayCellWithWorkout: {
    // Applied inline
  },
  todayCell: {
    // Applied inline
  },
  dayNumber: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  todayText: {
    // Applied inline
  },
  dayWorkoutsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dayWorkoutLogo: {
    width: 14,
    height: 14,
  },
  dayWorkoutLogoPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayWorkoutLogoIcon: {
    fontSize: FONT_SIZE.xs,
  },
  emptyDay: {
    width: `${100/7}%`,
    aspectRatio: 1,
  },
  chartCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartCardTitle: {
    fontSize: FONT_SIZE.title,
    fontWeight: '800',
    marginBottom: SPACING.lg,
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  selectorPill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  selectorPillText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  emptyChartContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.lg,
  },
  emptyCTAText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  mockDataNotice: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  mockDataText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
  summaryCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: FONT_SIZE.display,
    fontWeight: '800',
    marginBottom: SPACING.lg,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTotal: {
    alignItems: 'flex-start',
  },
  summaryTotalLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  summaryTotalNumber: {
    fontSize: FONT_SIZE.giant,
    fontWeight: '900',
  },
  summaryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLogo: {
    width: 24,
    height: 24,
  },
  summaryLogoPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLogoIcon: {
    fontSize: FONT_SIZE.lg,
  },
  summaryCount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 24,
  },
  measurementsChartContainer: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  measurementChartLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  measurementSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  measurementChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  measurementChipText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.title,
    fontWeight: '800',
    marginBottom: SPACING.lg,
    marginHorizontal: SPACING.xl,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  multiLineChartContainer: {
    position: 'relative',
    height: 200,
    width: screenWidth - 80,
  },
  chartOverlay: {
    position: 'relative',
  },
  chartOverlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  periodButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
});
