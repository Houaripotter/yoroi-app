import { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Plus, Trash2, Calendar } from 'lucide-react-native';
import { WorkoutCalendar } from '@/components/WorkoutCalendar';
import { WorkoutModal } from '@/components/WorkoutModal';
import { SoftCard } from '@/components/SoftCard';
import { Workout, WorkoutType, WORKOUT_TYPES } from '@/types/workout';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { useFocusEffect } from 'expo-router';

export default function SportScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      setWorkouts(data || []);
    }
    setLoading(false);
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWorkouts();
    setRefreshing(false);
  }, [fetchWorkouts]);

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDayPress = (date: string) => {
    setSelectedDate(date);
    setModalVisible(true);
  };

  const handleAddWorkout = async (type: WorkoutType) => {
    if (!selectedDate) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour ajouter un entraînement');
      return;
    }

    const { error } = await supabase.from('workouts').insert({
      user_id: user.id,
      date: selectedDate,
      type,
    });

    if (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'entraînement');
      console.error('Error adding workout:', error);
    } else {
      fetchWorkouts();
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    Alert.alert(
      'Supprimer l\'entraînement',
      'Êtes-vous sûr de vouloir supprimer cet entraînement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('workouts').delete().eq('id', workoutId);

            if (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'entraînement');
              console.error('Error deleting workout:', error);
            } else {
              fetchWorkouts();
            }
          },
        },
      ]
    );
  };

  const selectedDayWorkouts = selectedDate
    ? workouts.filter((w) => w.date === selectedDate)
    : [];

  // Stats for the current month
  const totalWorkouts = workouts.length;
  const jjbCount = workouts.filter((w) => w.type === 'gracie_barra').length;
  const muscuCount = workouts.filter((w) => w.type === 'basic_fit').length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Entraînements</Text>
            <Text style={styles.subtitle}>Suivez vos séances</Text>
          </View>
          <View style={styles.calendarIcon}>
            <Calendar size={28} color={theme.colors.primary} strokeWidth={2.5} />
          </View>
        </View>

        {/* Monthly Stats */}
        <View style={styles.statsGrid}>
          <SoftCard style={styles.statCard}>
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </SoftCard>

          <SoftCard style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <View style={styles.statIconContainer}>
              <Image
                source={WORKOUT_TYPES.gracie_barra.logo}
                style={styles.statIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.statValue}>{jjbCount}</Text>
            <Text style={styles.statLabel}>JJB</Text>
          </SoftCard>

          <SoftCard style={[styles.statCard, { backgroundColor: theme.colors.orangePastel }]}>
            <View style={styles.statIconContainer}>
              <Image
                source={WORKOUT_TYPES.basic_fit.logo}
                style={styles.statIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.statValue}>{muscuCount}</Text>
            <Text style={styles.statLabel}>Muscu</Text>
          </SoftCard>
        </View>

        {/* Calendar */}
        <SoftCard style={styles.calendarCard}>
          <WorkoutCalendar
            currentMonth={currentMonth}
            workouts={workouts}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onDayPress={handleDayPress}
            selectedDate={selectedDate || undefined}
          />
        </SoftCard>

        {/* Selected Day Workouts */}
        {selectedDate && (
          <SoftCard style={styles.selectedDayCard}>
            <View style={styles.selectedDayHeader}>
              <Text style={styles.selectedDayTitle}>
                {new Date(selectedDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <Plus size={20} color={theme.colors.surface} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {selectedDayWorkouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucun entraînement ce jour</Text>
                <Text style={styles.emptyStateSubtext}>
                  Appuyez sur + pour en ajouter un
                </Text>
              </View>
            ) : (
              <View style={styles.workoutsList}>
                {selectedDayWorkouts.map((workout) => (
                  <View key={workout.id} style={styles.workoutItem}>
                    <View style={styles.workoutInfo}>
                      <Image
                        source={WORKOUT_TYPES[workout.type].logo}
                        style={styles.workoutLogo}
                        resizeMode="contain"
                      />
                      <View style={styles.workoutDetails}>
                        <Text style={styles.workoutLabel}>
                          {WORKOUT_TYPES[workout.type].label}
                        </Text>
                        <Text style={styles.workoutShortLabel}>
                          {WORKOUT_TYPES[workout.type].shortLabel}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteWorkout(workout.id)}
                      style={styles.deleteButton}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color={theme.colors.textSecondary} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </SoftCard>
        )}

        {/* Clubs Section */}
        <View style={styles.clubsSection}>
          <Text style={styles.sectionTitle}>MES CLUBS</Text>
          <View style={styles.clubsGrid}>
            <SoftCard style={[styles.clubCard, { backgroundColor: '#FEE2E2' }]}>
              <Image
                source={WORKOUT_TYPES.gracie_barra.logo}
                style={styles.clubLogo}
                resizeMode="contain"
              />
              <Text style={styles.clubName}>Gracie Barra</Text>
              <Text style={styles.clubLocation}>Les Olives</Text>
            </SoftCard>

            <SoftCard style={[styles.clubCard, { backgroundColor: theme.colors.orangePastel }]}>
              <Image
                source={WORKOUT_TYPES.basic_fit.logo}
                style={styles.clubLogo}
                resizeMode="contain"
              />
              <Text style={styles.clubName}>Basic Fit</Text>
              <Text style={styles.clubLocation}>Marseille</Text>
            </SoftCard>
          </View>
        </View>
      </ScrollView>

      {/* Workout Selection Modal */}
      <WorkoutModal
        visible={modalVisible}
        selectedDate={selectedDate || ''}
        onClose={() => setModalVisible(false)}
        onSelectWorkout={handleAddWorkout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: 60,
    gap: theme.spacing.xl,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  calendarIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.mintPastel,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    marginBottom: theme.spacing.xs,
  },
  statIcon: {
    width: 32,
    height: 32,
  },
  statValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  calendarCard: {
    padding: theme.spacing.xl,
  },
  selectedDayCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDayTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textTertiary,
  },
  workoutsList: {
    gap: theme.spacing.md,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.beigeLight,
    borderRadius: theme.radius.lg,
  },
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  workoutLogo: {
    width: 40,
    height: 40,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  workoutShortLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  clubsSection: {
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  clubsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  clubCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  clubLogo: {
    width: 60,
    height: 60,
  },
  clubName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  clubLocation: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
});
