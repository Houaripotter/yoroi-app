import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  Dumbbell,
  Check,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { addTraining, getClubs, Club } from '@/lib/database';
import { SPORTS, MUSCLES, getSportIcon, getSportName } from '@/lib/sports';

// Constants for non-theme values
const RADIUS = { sm: 8, md: 12 };
const SPACING = { sm: 8, md: 12, lg: 16, xl: 20 };
const FONT_SIZE = { xs: 12, sm: 13, md: 14, lg: 16, xl: 18, xxl: 20, display: 28 };
import { successHaptic, errorHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import { incrementReviewTrigger, askForReview } from '@/lib/reviewService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// NOUVEL ENTRAINEMENT
// ============================================

export default function AddTrainingScreen() {
  const { colors, gradients } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedSport, setSelectedSport] = useState('jjb');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  // Calculer heure de fin
  const calculateEndTime = (): string => {
    const end = new Date(startTime.getTime() + duration * 60 * 1000);
    return end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Parse date from params if provided
  useEffect(() => {
    if (params.date) {
      const parsedDate = new Date(params.date + 'T12:00:00');
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
      }
    }
  }, [params.date]);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const data = await getClubs();
      setClubs(data);
    } catch (error) {
      console.error('Erreur chargement clubs:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const toggleMuscle = (muscleId: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscleId)
        ? prev.filter(m => m !== muscleId)
        : [...prev, muscleId]
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      await addTraining({
        club_id: selectedClub?.id,
        sport: selectedSport,
        date: format(date, 'yyyy-MM-dd'),
        duration_minutes: duration || undefined,
        start_time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        notes: notes || undefined,
        muscles: selectedMuscles.length > 0 ? selectedMuscles.join(',') : undefined,
      });

      successHaptic();
      playSuccessSound();

      // Trigger review après une action positive
      await incrementReviewTrigger();
      await askForReview();

      Alert.alert(
        'Entrainement ajoute',
        `${getSportName(selectedSport)} enregistre !`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      errorHaptic();
      Alert.alert('Erreur', "Impossible d'enregistrer l'entrainement");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clubs filtrés par sport sélectionné
  const filteredClubs = clubs.filter(c => c.sport === selectedSport);

  // Afficher les muscles si musculation
  const showMuscles = selectedSport === 'musculation';

  return (
    <ScreenWrapper noPadding>
      <Header title="Nouvel Entrainement" showClose />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* MES CLUBS - EN PREMIER */}
        {clubs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mes Clubs</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.clubsScroll}
              contentContainerStyle={styles.clubsScrollContent}
            >
              <TouchableOpacity
                style={[
                  styles.clubCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  !selectedClub && { borderColor: colors.gold, backgroundColor: colors.goldMuted },
                ]}
                onPress={() => setSelectedClub(null)}
              >
                <View style={[styles.clubCardIcon, { backgroundColor: colors.cardHover }]}>
                  <Text style={styles.clubCardEmoji}>🏠</Text>
                </View>
                <Text style={[styles.clubCardName, { color: !selectedClub ? colors.gold : colors.textSecondary }]}>
                  Libre
                </Text>
              </TouchableOpacity>
              {clubs.map((club) => (
                <TouchableOpacity
                  key={club.id}
                  style={[
                    styles.clubCard,
                    {
                      backgroundColor: selectedClub?.id === club.id ? colors.goldMuted : colors.card,
                      borderColor: selectedClub?.id === club.id ? colors.gold : (club.color || colors.border)
                    },
                  ]}
                  onPress={() => {
                    setSelectedClub(club);
                    // Auto-sélectionner le sport du club si différent
                    if (club.sport && club.sport !== selectedSport) {
                      setSelectedSport(club.sport);
                    }
                  }}
                >
                  {club.logo_uri ? (
                    <Image
                      source={{ uri: club.logo_uri }}
                      style={styles.clubCardLogo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.clubCardIcon, { backgroundColor: club.color || colors.cardHover }]}>
                      <Text style={styles.clubCardEmoji}>{getSportIcon(club.sport || 'autre')}</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.clubCardName,
                      { color: selectedClub?.id === club.id ? colors.gold : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {club.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* SPORT */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Sport</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sportsScroll}
          contentContainerStyle={styles.sportsContainer}
        >
          {SPORTS.filter(s => s.id !== 'autre').map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[
                styles.sportItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedSport === sport.id && { borderColor: colors.gold, backgroundColor: colors.goldMuted },
              ]}
              onPress={() => {
                setSelectedSport(sport.id);
                // Déselectionner le club si le sport ne correspond pas
                if (selectedClub && selectedClub.sport !== sport.id) {
                  setSelectedClub(null);
                }
              }}
            >
              <Text style={styles.sportIcon}>{sport.icon}</Text>
              <Text
                style={[
                  styles.sportName,
                  { color: colors.textSecondary },
                  selectedSport === sport.id && { color: colors.gold },
                ]}
              >
                {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* DATE */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Date</Text>
        <TouchableOpacity
          style={[styles.dateSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <CalendarIcon size={20} color={colors.gold} />
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            locale="fr"
          />
        )}

        {/* HEURE DE DÉBUT */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Heure de debut</Text>
        <TouchableOpacity
          style={[styles.timeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Clock size={20} color={colors.gold} />
          <Text style={[styles.timeText, { color: colors.textPrimary }]}>
            {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedTime) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selectedTime) setStartTime(selectedTime);
            }}
          />
        )}

        {/* DURÉE ESTIMÉE */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Duree estimee</Text>
        <View style={styles.durationContainer}>
          {[30, 45, 60, 90, 120].map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.durationItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                duration === d && { borderColor: colors.gold, backgroundColor: colors.goldMuted },
              ]}
              onPress={() => setDuration(d)}
            >
              <Text
                style={[
                  styles.durationText,
                  { color: colors.textSecondary },
                  duration === d && { color: colors.gold },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.endTimeText, { color: colors.textMuted }]}>
          Fin estimee : {calculateEndTime()}
        </Text>

        {/* MUSCLES (si musculation) */}
        {showMuscles && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Muscles travailles</Text>
            <View style={styles.musclesContainer}>
              {MUSCLES.map((muscle) => (
                <TouchableOpacity
                  key={muscle.id}
                  style={[
                    styles.muscleItem,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedMuscles.includes(muscle.id) && { borderColor: colors.gold, backgroundColor: colors.goldMuted },
                  ]}
                  onPress={() => toggleMuscle(muscle.id)}
                >
                  {selectedMuscles.includes(muscle.id) && (
                    <Check size={14} color={colors.gold} />
                  )}
                  <Text
                    style={[
                      styles.muscleName,
                      { color: colors.textSecondary },
                      selectedMuscles.includes(muscle.id) && { color: colors.gold },
                    ]}
                  >
                    {muscle.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* NOTES */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notes (optionnel)</Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Comment s'est passe l'entrainement ?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        {/* BOUTON SAVE */}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={gradients.gold}
            style={styles.saveButtonGradient}
          >
            <Dumbbell size={22} color={colors.background} />
            <Text style={[styles.saveButtonText, { color: colors.background }]}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },

  // SECTION
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  // SPORTS
  sportsScroll: {
    marginHorizontal: -20,
    marginBottom: SPACING.lg,
  },
  sportsContainer: {
    paddingHorizontal: SPACING.xl,
    gap: 10,
  },
  sportItem: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    minWidth: 80,
  },
  sportItemActive: {
    // Colors applied inline
  },
  sportIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sportName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  sportNameActive: {
    // Colors applied inline
  },

  // CLUBS - Nouveau design horizontal
  clubsScroll: {
    marginHorizontal: -20,
    marginBottom: SPACING.lg,
  },
  clubsScrollContent: {
    paddingHorizontal: SPACING.xl,
    gap: 12,
  },
  clubCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 2,
    minWidth: 90,
    maxWidth: 100,
  },
  clubCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  clubCardEmoji: {
    fontSize: 24,
  },
  clubCardLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  clubCardName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Legacy clubs (pour compatibilité)
  clubsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  clubDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clubLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  clubItemText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },

  // DATE
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // TIME
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  timeText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
  },
  endTimeText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.lg,
  },

  // DURATION
  durationContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  durationItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  durationItemActive: {
    // Colors applied inline
  },
  durationText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  durationTextActive: {
    // Colors applied inline
  },
  durationChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
  },

  // MUSCLES
  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  muscleItemActive: {
    // Colors applied inline
  },
  muscleName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  muscleNameActive: {
    // Colors applied inline
  },

  // NOTES
  notesInput: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // SAVE
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
});
