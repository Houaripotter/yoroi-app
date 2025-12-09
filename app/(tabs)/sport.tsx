import { useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ActivityModal } from '@/components/ActivityModal';
import { Workout, WorkoutType } from '@/types/workout';
import { theme } from '@/lib/theme';
import { useFocusEffect } from 'expo-router';
import { checkWorkoutBadges } from '@/lib/badgeService';
import { getWorkoutsByMonth, addWorkout, deleteWorkout, getAllWorkouts } from '@/lib/storage';

export default function SportScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    console.log('📅 Récupération workouts du mois', month + 1, '/', year);

    try {
      const data = await getWorkoutsByMonth(year, month);
      console.log('✅ Workouts récupérés depuis le stockage local:', data.length, 'workout(s)');
      setWorkouts(data);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des workouts:', error);
      setWorkouts([]);
    }
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDayPress = (date: string) => {
    setSelectedDate(date);
    // La modal va récupérer les activités actuelles via currentActivities
    setModalVisible(true);
  };

  const handleActivitySelect = async (types: WorkoutType[]): Promise<void> => {
    if (!selectedDate) {
      console.error('❌ Pas de date sélectionnée');
      return;
    }

    console.log('🔵 [DÉBUT] Sauvegarde workout pour le', selectedDate, '- Types:', types);

    try {
      // Supprimer les anciens entraînements pour cette date
      console.log('🗑️  Suppression des anciens workouts pour', selectedDate);
      const allWorkouts = await getAllWorkouts();
      const workoutsToDelete = allWorkouts.filter(w => w.date === selectedDate);

      for (const workout of workoutsToDelete) {
        await deleteWorkout(workout.id);
      }
      console.log('✅ Anciens workouts supprimés');

      // Ajouter les nouveaux entraînements seulement s'il y en a
      if (types.length > 0) {
        console.log('💾 Insertion de', types.length, 'workout(s):', types);

        for (const type of types) {
          await addWorkout({
            date: selectedDate,
            type,
          });
        }

        console.log('✅ Workouts sauvegardés localement');
      } else {
        console.log('ℹ️  Aucun workout à ajouter (suppression uniquement)');
      }

      // Rafraîchir les données
      console.log('🔄 Rafraîchissement du calendrier...');
      await fetchWorkouts();
      console.log('✅ [FIN] Calendrier rafraîchi');

      // Vérifier et débloquer les badges
      checkWorkoutBadges();
    } catch (error) {
      console.error('❌ [ERREUR GLOBALE]:', error);
    }
  };

  const getCurrentActivitiesForDate = (date: string): WorkoutType[] => {
    return workouts
      .filter(w => w.date === date)
      .map(w => w.type);
  };

  // Compter le nombre d'entraînements ce mois
  const workoutCount = workouts.length;

  // Calculer le nombre d'entraînements par type
  const workoutStats = useMemo(() => {
    const stats = {
      gracie_barra: 0,
      basic_fit: 0,
      running: 0,
    };

    workouts.forEach(workout => {
      if (workout.type === 'gracie_barra') stats.gracie_barra++;
      else if (workout.type === 'basic_fit') stats.basic_fit++;
      else if (workout.type === 'running') stats.running++;
    });

    return stats;
  }, [workouts]);

  // Générer les données du calendrier mensuel
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    // Jour de la semaine du premier jour (0 = dimanche, 1 = lundi, etc.)
    let firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7; // Dimanche devient 7

    const days: (Date | null)[] = [];

    // Ajouter les jours vides au début (pour aligner avec lundi)
    for (let i = 1; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Ajouter tous les jours du mois
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const getWorkoutsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const dayWorkouts = workouts.filter(w => w.date === dateString);

    // Log seulement si des workouts sont trouvés pour éviter le spam
    if (dayWorkouts.length > 0) {
      console.log('🏋️ Workouts trouvés pour', dateString, ':', dayWorkouts.length, dayWorkouts.map(w => w.type));
    }

    return dayWorkouts;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    const dateString = date.toISOString().split('T')[0];
    return dateString === selectedDate;
  };

  const renderCalendarDay = ({ item }: { item: Date | null }) => {
    if (!item) {
      // Jour vide au début du mois
      return <View style={styles.emptyDay} />;
    }

    const dayWorkouts = getWorkoutsForDate(item);
    const today = isToday(item);
    const selected = isSelected(item);
    const dateString = item.toISOString().split('T')[0];
    const hasWorkouts = dayWorkouts.length > 0;

    return (
      <View style={styles.dayCell}>
        <TouchableOpacity
          style={[
            styles.dayCellInner,
            hasWorkouts && styles.dayCellWithWorkout,
            today && styles.todayCell,
            selected && styles.selectedCell,
          ]}
          onPress={() => handleDayPress(dateString)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayNumber,
              today && styles.todayText,
              selected && styles.selectedText,
            ]}
          >
            {item.getDate()}
          </Text>

          {/* Images des entraînements */}
          {hasWorkouts && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              position: 'absolute',
              bottom: 6,
              left: 0,
              right: 0,
              gap: 2,
            }}>
              {dayWorkouts.slice(0, 3).map((workout) => (
                workout.type === 'running' ? (
                  <MaterialCommunityIcons
                    key={workout.id}
                    name="run"
                    size={16}
                    color="#10B981"
                    style={{ margin: 1 }}
                  />
                ) : (
                  <Image
                    key={workout.id}
                    source={
                      workout.type === 'basic_fit'
                        ? require('../../assets/images/basic-fit.png')
                        : require('../../assets/images/gracie-barra.png')
                    }
                    style={{ width: 16, height: 16, resizeMode: 'contain', margin: 1 }}
                  />
                )
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <View style={styles.container}>
      {/* Card calendrier */}
      <View style={styles.calendarCard}>
        {/* Header Stats - Résumé du mois */}
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Résumé du mois</Text>

          {/* Total entraînements */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Entraînements</Text>
            <Text style={styles.totalNumber}>{workoutCount}</Text>
          </View>

          {/* Détail par type avec logos */}
          <View style={styles.statsDetailContainer}>
            {/* Gracie Barra */}
            <View style={styles.statItem}>
              <Image
                source={require('../../assets/images/gracie-barra.png')}
                style={styles.statLogo}
                resizeMode="contain"
              />
              <Text style={styles.statCount}>x{workoutStats.gracie_barra}</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Basic Fit */}
            <View style={styles.statItem}>
              <Image
                source={require('../../assets/images/basic-fit.png')}
                style={styles.statLogo}
                resizeMode="contain"
              />
              <Text style={styles.statCount}>x{workoutStats.basic_fit}</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Running */}
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="run"
                size={24}
                color="#10B981"
              />
              <Text style={styles.statCount}>x{workoutStats.running}</Text>
            </View>
          </View>
        </View>

        {/* Header avec navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <ChevronLeft size={24} color="#1A1A1A" strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.monthYear}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>

          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <ChevronRight size={24} color="#1A1A1A" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Jours de la semaine */}
        <View style={styles.weekDays}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
            <View key={`${day}-${index}`} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Grille du calendrier */}
        <View style={styles.calendarContainer}>
          <FlatList
            data={calendarData}
            renderItem={renderCalendarDay}
            keyExtractor={(item, index) => item ? item.toISOString() : `empty-${index}`}
            numColumns={7}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            extraData={workouts}
          />
        </View>

        {/* Légende */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <Image
              source={require('../../assets/images/basic-fit.png')}
              style={styles.legendLogo}
              resizeMode="contain"
            />
            <Text style={styles.legendText}>Musculation</Text>
          </View>

          <View style={styles.legendItem}>
            <Image
              source={require('../../assets/images/gracie-barra.png')}
              style={styles.legendLogo}
              resizeMode="contain"
            />
            <Text style={styles.legendText}>JJB</Text>
          </View>

          <View style={styles.legendItem}>
            <MaterialCommunityIcons name="run" size={24} color="#10B981" />
            <Text style={styles.legendText}>Running</Text>
          </View>
        </View>
      </View>

      <ActivityModal
        visible={modalVisible}
        selectedDate={selectedDate || ''}
        onClose={() => setModalVisible(false)}
        onSelectActivity={handleActivitySelect}
        currentActivities={selectedDate ? getCurrentActivitiesForDate(selectedDate) : []}
      />
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const cellSize = screenWidth / 7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.md,
  },
  calendarCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  navButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: '#F3F4F6',
  },
  monthYear: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: '#1A1A1A',
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  weekDayCell: {
    width: cellSize,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  weekDayText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  calendarContainer: {
    flex: 1,
  },
  emptyDay: {
    width: cellSize,
    height: cellSize,
    padding: 2,
  },
  dayCell: {
    width: cellSize,
    height: cellSize,
    padding: 2,
  },
  dayCellInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  dayCellWithWorkout: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryBackground,
  },
  selectedCell: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dayNumber: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: '#1A1A1A',
    position: 'absolute',
    top: 4,
    left: 6,
  },
  todayText: {
    color: '#10B981',
    fontWeight: theme.fontWeight.bold,
  },
  selectedText: {
    color: '#3B82F6',
    fontWeight: theme.fontWeight.bold,
  },
  statsHeader: {
    backgroundColor: '#F0FDF4',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  totalContainer: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  totalLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalNumber: {
    fontSize: 48,
    fontWeight: theme.fontWeight.black,
    color: '#10B981',
    letterSpacing: -1,
  },
  statsDetailContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statLogo: {
    width: 24,
    height: 24,
  },
  statCount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: '#1F2937',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D1FAE5',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendLogo: {
    width: 24,
    height: 24,
  },
  legendText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: '#6B7280',
  },
});
