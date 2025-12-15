import { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Calendar, Dna } from 'lucide-react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllMeasurements, Measurement, getAllWorkouts, getWorkoutsByMonth, getUserSettings, addWorkout, deleteWorkout, getUserClubs } from '@/lib/storage';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { Workout, WorkoutType } from '@/types/workout';
import { ActivityModal } from '@/components/ActivityModal';
import { checkWorkoutBadges } from '@/lib/badgeService';
import { UserClub } from '@/lib/storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';

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

// Générer des données mock si pas assez de données (6 mois / 180 jours)
const generateMockData = (baseDate: Date, days: number = 180): Measurement[] => {
  const mockData: Measurement[] = [];
  
  // Valeurs de départ (Day -180)
  const startWeight = 100.0;
  const startBodyFat = 32.0;
  const startWaist = 112.0;
  const startMuscleMass = 60.0;
  const startWater = 50.0;
  const startHips = 115.0;
  const startShoulder = 120.0;
  const startNavel = 110.0;
  const startLeftArm = 35.0;
  const startRightArm = 35.5;
  const startLeftThigh = 62.0;
  const startRightThigh = 62.5;

  // Valeurs finales (Today)
  const endWeight = 86.0;
  const endBodyFat = 18.0;
  const endWaist = 92.0;
  const endMuscleMass = 65.0;
  const endWater = 58.0;
  const endHips = 100.0;
  const endShoulder = 115.0;
  const endNavel = 90.0;
  const endLeftArm = 32.0;
  const endRightArm = 32.5;
  const endLeftThigh = 56.0;
  const endRightThigh = 56.5;

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - (days - i - 1));
    
    const progress = i / days; // 0 à 1
    
    // Déterminer la phase
    let phaseProgress: number;
    let weightTarget: number;
    let bodyFatTarget: number;
    let waistTarget: number;

    if (progress < 1/3) {
      // Phase 1 (Mois 1-2): Rapide baisse (Water weight)
      phaseProgress = progress * 3;
      weightTarget = startWeight - (phaseProgress * 8); // 100 → 92kg
      bodyFatTarget = startBodyFat - (phaseProgress * 6); // 32 → 26%
      waistTarget = startWaist - (phaseProgress * 8); // 112 → 104cm
    } else if (progress < 2/3) {
      // Phase 2 (Mois 3-4): Plateau (Stagnation autour de 92kg)
      phaseProgress = (progress - 1/3) * 3;
      const plateauWeight = 92.0;
      const plateauBodyFat = 24.0;
      const plateauWaist = 100.0;
      
      // Oscillation autour du plateau
      const oscillation = Math.sin(phaseProgress * Math.PI * 4) * 1.5; // ±1.5kg
      weightTarget = plateauWeight + oscillation;
      bodyFatTarget = plateauBodyFat + (oscillation * 0.3);
      waistTarget = plateauWaist + (oscillation * 0.5);
    } else {
      // Phase 3 (Mois 5-6): Discipline, baisse régulière
      phaseProgress = (progress - 2/3) * 3;
      weightTarget = 92.0 - (phaseProgress * 6); // 92 → 86kg
      bodyFatTarget = 24.0 - (phaseProgress * 6); // 24 → 18%
      waistTarget = 100.0 - (phaseProgress * 8); // 100 → 92cm
    }

    // Fluctuation aléatoire quotidienne (±0.5kg)
    const dailyNoise = (Math.random() - 0.5) * 0.5;
    const weight = Math.max(85.0, Math.min(101.0, weightTarget + dailyNoise));
    const bodyFat = Math.max(17.0, Math.min(33.0, bodyFatTarget + (dailyNoise * 0.3)));
    const waist = Math.max(90.0, Math.min(113.0, waistTarget + (dailyNoise * 0.5)));

    // Interpolation linéaire pour les autres métriques
    const muscleMass = startMuscleMass + (progress * (endMuscleMass - startMuscleMass));
    const water = startWater + (progress * (endWater - startWater));
    const hips = startHips - (progress * (startHips - endHips));
    const shoulder = startShoulder - (progress * (startShoulder - endShoulder));
    const navel = startNavel - (progress * (startNavel - endNavel));
    const leftArm = startLeftArm - (progress * (startLeftArm - endLeftArm));
    const rightArm = startRightArm - (progress * (startRightArm - endRightArm));
    const leftThigh = startLeftThigh - (progress * (startLeftThigh - endLeftThigh));
    const rightThigh = startRightThigh - (progress * (startRightThigh - endRightThigh));
    
    mockData.push({
      id: `mock-${i}`,
      date: date.toISOString().split('T')[0],
      weight: Math.round(weight * 10) / 10,
      body_fat: Math.round(bodyFat * 10) / 10,
      muscle_mass: Math.round(muscleMass * 10) / 10,
      water: Math.round(water * 10) / 10,
      measurements: {
        waist: Math.round(waist * 10) / 10,
        hips: Math.round(hips * 10) / 10,
        navel: Math.round(navel * 10) / 10,
        chest: Math.round((shoulder - 5) * 10) / 10,
        left_arm: Math.round(leftArm * 10) / 10,
        right_arm: Math.round(rightArm * 10) / 10,
        left_thigh: Math.round(leftThigh * 10) / 10,
        right_thigh: Math.round(rightThigh * 10) / 10,
        shoulder: Math.round(shoulder * 10) / 10,
      },
      created_at: date.toISOString(),
    });
  }
  
  return mockData;
};

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function HistoryScreen() {
  const { colors: themeColors } = useTheme();
  const [viewMode, setViewMode] = useState<'calendar' | 'stats'>('calendar');
  const [selectedComposition, setSelectedComposition] = useState<CompositionMetric>('weight');
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementMetric>('waist');
  const [records, setRecords] = useState<Measurement[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [customLogos, setCustomLogos] = useState<{ [key: string]: string }>({});
  const [userClubs, setUserClubs] = useState<UserClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90' | 'all'>('all');

  const fetchHistoryRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [measurements, allWorkouts, settings, clubs] = await Promise.all([
        getAllMeasurements(),
        getAllWorkouts(),
        getUserSettings(),
        getUserClubs(),
      ]);
      
      setWorkouts(allWorkouts as Workout[]);
      setUserClubs(clubs);
      
      if ((settings as any).custom_club_logos) {
        setCustomLogos((settings as any).custom_club_logos);
      }
      
      if (measurements.length < 3) {
        const today = new Date();
        const mockData = generateMockData(today, 180);
        setRecords(mockData);
        setUseMockData(true);
      } else {
        setRecords(measurements);
        setUseMockData(false);
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistoryRecords();
    }, [fetchHistoryRecords])
  );

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

  const getWorkoutsForDate = (date: Date | null): Workout[] => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return [];
    const dateString = date.toISOString().split('T')[0];
    return workouts.filter(w => w.date === dateString);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDayPress = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setModalVisible(true);
  };

  const getCurrentActivitiesForDate = (date: string): WorkoutType[] => {
    return workouts
      .filter(w => w.date === date)
      .map(w => w.type);
  };

  const handleActivitySelect = async (types: WorkoutType[]): Promise<void> => {
    if (!selectedDate) {
      console.error('❌ Pas de date sélectionnée');
      return;
    }

    try {
      // Supprimer les anciens entraînements pour cette date
      const allWorkouts = await getAllWorkouts();
      const workoutsToDelete = allWorkouts.filter(w => w.date === selectedDate);

      for (const workout of workoutsToDelete) {
        await deleteWorkout(workout.id);
      }

      // Ajouter les nouveaux entraînements seulement s'il y en a
      if (types.length > 0) {
        for (const type of types) {
          await addWorkout({
            date: selectedDate,
            type,
          });
        }
      }

      // Rafraîchir les données
      await fetchHistoryRecords();

      // Vérifier et débloquer les badges
      checkWorkoutBadges();
    } catch (error) {
      console.error('❌ [ERREUR GLOBALE]:', error);
    }
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
          label: new Date(record.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
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
          label: new Date(record.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
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
          label: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          date,
        };
      }).filter(item => item.value > 0);
      
      return data.length > 0 ? { metric, data } : null;
    }).filter(item => item !== null) as Array<{ metric: MeasurementMetricOption; data: Array<{ value: number; label: string; date: string }> }>;
  }, [filteredRecords]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.gold} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Chargement de l'historique...</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper noPadding>
      <Header title="Historique" showBack />
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
                {workouts.filter(w => {
                  const workoutDate = new Date(w.date);
                  return workoutDate.getFullYear() === currentMonth.getFullYear() &&
                         workoutDate.getMonth() === currentMonth.getMonth();
                }).length}
              </Text>
            </View>
            <View style={styles.summaryDetails}>
              {(() => {
                const monthWorkouts = workouts.filter(w => {
                  const workoutDate = new Date(w.date);
                  return workoutDate.getFullYear() === currentMonth.getFullYear() &&
                         workoutDate.getMonth() === currentMonth.getMonth();
                });

                // Grouper par type et afficher avec logos
                const workoutTypes = ['gracie_barra', 'basic_fit', 'running'] as WorkoutType[];
                const displayedTypes: WorkoutType[] = [];
                
                workoutTypes.forEach(type => {
                  const count = monthWorkouts.filter(w => w.type === type).length;
                  if (count > 0) {
                    displayedTypes.push(type);
                  }
                });

                return displayedTypes.map((type, index) => {
                  const count = monthWorkouts.filter(w => w.type === type).length;
                  const club = userClubs.find(c => c.type === type);
                  
                  return (
                    <View key={type} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {index > 0 && <View style={[styles.summaryDivider, { backgroundColor: themeColors.border }]} />}
                      <View style={styles.summaryItem}>
                        {type === 'running' ? (
                          <MaterialCommunityIcons name="run" size={24} color="#10B981" />
                        ) : club && club.logoUri ? (
                          <Image
                            source={{ uri: club.logoUri }}
                            style={styles.summaryLogo}
                            resizeMode="contain"
                          />
                        ) : type === 'gracie_barra' ? (
                          customLogos.gracie_barra ? (
                            <Image
                              source={{ uri: customLogos.gracie_barra }}
                              style={styles.summaryLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={[styles.summaryLogo, styles.summaryLogoPlaceholder]}>
                              <Text style={styles.summaryLogoIcon}>🥋</Text>
                            </View>
                          )
                        ) : (
                          customLogos.basic_fit ? (
                            <Image
                              source={{ uri: customLogos.basic_fit }}
                              style={styles.summaryLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={[styles.summaryLogo, styles.summaryLogoPlaceholder]}>
                              <Text style={styles.summaryLogoIcon}>🏋️</Text>
                            </View>
                          )
                        )}
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
            style={[
              styles.segmentButton,
              viewMode === 'calendar' && { backgroundColor: themeColors.gold },
            ]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={viewMode === 'calendar' ? themeColors.background : themeColors.textPrimary} strokeWidth={2.5} />
            <Text style={[
              styles.segmentButtonText,
              { color: viewMode === 'calendar' ? themeColors.background : themeColors.textPrimary }
            ]}>
              Discipline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              viewMode === 'stats' && { backgroundColor: themeColors.gold },
            ]}
            onPress={() => setViewMode('stats')}
            activeOpacity={0.7}
          >
            <Dna size={18} color={viewMode === 'stats' ? themeColors.background : themeColors.textPrimary} strokeWidth={2.5} />
            <Text style={[
              styles.segmentButtonText,
              { color: viewMode === 'stats' ? themeColors.background : themeColors.textPrimary }
            ]}>
              Évolution
            </Text>
          </TouchableOpacity>
        </View>

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

                const dayWorkouts = getWorkoutsForDate(item);
                const hasWorkouts = dayWorkouts.length > 0;
                const isToday = item.toDateString() === new Date().toDateString();

                return (
                  <TouchableOpacity
                    key={item.toISOString()}
                    style={[
                      styles.dayCell,
                      { backgroundColor: themeColors.cardHover },
                      hasWorkouts && { backgroundColor: themeColors.goldMuted },
                      isToday && { borderWidth: 2, borderColor: themeColors.gold },
                    ]}
                    onPress={() => handleDayPress(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayNumber, { color: themeColors.textPrimary }, isToday && { color: themeColors.gold, fontWeight: '800' }]}>
                      {item.getDate()}
                    </Text>
                    {hasWorkouts && (
                      <View style={styles.dayWorkoutsContainer}>
                        {dayWorkouts.slice(0, 3).map((workout) => {
                          // Chercher le club correspondant
                          const club = userClubs.find(c => c.type === workout.type);
                          
                          if (workout.type === 'running') {
                            return (
                              <MaterialCommunityIcons
                                key={workout.id}
                                name="run"
                                size={14}
                                color="#10B981"
                              />
                            );
                          } else if (club && club.logoUri) {
                            return (
                              <Image
                                key={workout.id}
                                source={{ uri: club.logoUri }}
                                style={styles.dayWorkoutLogo}
                                resizeMode="contain"
                              />
                            );
                          } else if (workout.type === 'basic_fit') {
                            return customLogos.basic_fit ? (
                              <Image
                                key={workout.id}
                                source={{ uri: customLogos.basic_fit }}
                                style={styles.dayWorkoutLogo}
                                resizeMode="contain"
                              />
                            ) : (
                              <View key={workout.id} style={[styles.dayWorkoutLogo, styles.dayWorkoutLogoPlaceholder]}>
                                <Text style={styles.dayWorkoutLogoIcon}>🏋️</Text>
                              </View>
                            );
                          } else if (workout.type === 'gracie_barra') {
                            return customLogos.gracie_barra ? (
                              <Image
                                key={workout.id}
                                source={{ uri: customLogos.gracie_barra }}
                                style={styles.dayWorkoutLogo}
                                resizeMode="contain"
                              />
                            ) : (
                              <View key={workout.id} style={[styles.dayWorkoutLogo, styles.dayWorkoutLogoPlaceholder]}>
                                <Text style={styles.dayWorkoutLogoIcon}>🥋</Text>
                              </View>
                            );
                          }
                          return null;
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <ActivityModal
          visible={modalVisible}
          selectedDate={selectedDate || ''}
          onClose={() => setModalVisible(false)}
          onSelectActivity={handleActivitySelect}
          currentActivities={selectedDate ? getCurrentActivitiesForDate(selectedDate) : []}
        />

        {/* View B: Évolution (Graphs) */}
        {viewMode === 'stats' && (
          <>
            {useMockData && (
              <View style={[styles.mockDataNotice, { backgroundColor: themeColors.goldMuted, borderColor: themeColors.gold }]}>
                <Text style={[styles.mockDataText, { color: themeColors.gold }]}>
                  Données de démonstration (moins de 3 mesures réelles)
                </Text>
              </View>
            )}

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

            {/* SECTION 1: Composition (Tanita) */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Composition (Tanita)</Text>

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
                      barWidth={Math.max(20, (screenWidth - 150) / compositionChartData.length)}
                      spacing={Math.max(10, (screenWidth - 150) / compositionChartData.length / 3)}
                      initialSpacing={15}
                      endSpacing={15}
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
                    <Text style={[styles.emptyChartText, { color: themeColors.textSecondary }]}>
                      Ajoutez au moins 2 mesures pour voir l'évolution
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* SECTION 2: Mensurations (Body Measurements) */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Mensurations</Text>

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
                        { color: selectedMeasurement === metric.key ? '#FFFFFF' : themeColors.textPrimary }
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
                      spacing={Math.max(35, (screenWidth - 120) / Math.max(measurementChartData.length, 2))}
                      initialSpacing={15}
                      endSpacing={15}
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
                      <Text style={[styles.emptyChartText, { color: themeColors.textSecondary }]}>
                        Ajoutez au moins 2 mesures pour voir l'évolution
                      </Text>
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
                        const maxDataLength = Math.max(...allMeasurementsChartData.map(d => d.data.length));
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
                              spacing={Math.max(35, (screenWidth - 120) / Math.max(maxDataLength, 2))}
                              initialSpacing={15}
                              endSpacing={15}
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
