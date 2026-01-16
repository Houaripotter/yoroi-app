// ============================================
// YOROI - MODIFIER UNE COMPÉTITION
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Calendar, MapPin, Trophy, Save, Target } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import {
  Sport,
  getWeightCategories,
  WeightCategory,
  SPORT_LABELS,
  SPORT_ICONS,
} from '@/lib/fighterMode';
import { updateCompetition, getCompetitionById } from '@/lib/fighterModeService';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

export default function EditCompetitionScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const params = useLocalSearchParams();
  const competitionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [lieu, setLieu] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sport, setSport] = useState<Sport>('jjb');
  const [typeEvenement, setTypeEvenement] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [categoriePoidsId, setCategoriePoidsId] = useState('');
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Suggestions pour le type d'événement
  const typeSuggestions = ['Combat', 'Match', 'Course', 'Compétition', 'Tournoi', 'Championnat'];

  useEffect(() => {
    loadCompetition();
  }, []);

  useEffect(() => {
    // Mettre à jour les catégories quand le sport change
    setWeightCategories(getWeightCategories(sport));
  }, [sport]);

  const loadCompetition = async () => {
    try {
      const comp = await getCompetitionById(parseInt(competitionId));
      if (!comp) {
        showPopup('Erreur', 'Compétition introuvable', [
          { text: 'OK', style: 'primary', onPress: () => router.back() }
        ]);
        return;
      }

      setNom(comp.nom);
      setLieu(comp.lieu || '');
      setDate(new Date(comp.date));
      setSport(comp.sport);
      setTypeEvenement(comp.type_evenement || '');

      // Trouver la catégorie de poids
      if (comp.categorie_poids) {
        const categories = getWeightCategories(comp.sport);
        const category = categories.find(c => c.name === comp.categorie_poids);
        if (category) {
          setCategoriePoidsId(category.id);
        }
      }
    } catch (error) {
      logger.error('Error loading competition:', error);
      showPopup('Erreur', 'Impossible de charger la compétition', [
        { text: 'OK', style: 'primary', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setDate(selectedDate);
    }

    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      showPopup('Erreur', 'Saisis un nom de compétition', [
        { text: 'OK', style: 'primary' }
      ]);
      return;
    }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const selectedCategory = weightCategories.find(c => c.id === categoriePoidsId);

      await updateCompetition(parseInt(competitionId), {
        nom: nom.trim(),
        lieu: lieu.trim() || undefined,
        date: date.toISOString().split('T')[0],
        sport,
        type_evenement: typeEvenement.trim() || undefined,
        categorie_poids: selectedCategory?.name,
        poids_max: selectedCategory?.maxWeight,
      });

      router.back();
    } catch (error) {
      logger.error('Error updating competition:', error);
      showPopup('Erreur', 'Impossible de mettre à jour la compétition', [
        { text: 'OK', style: 'primary' }
      ]);
      setIsSaving(false);
    }
  };

  // Liste de tous les sports
  const allSports: Sport[] = [
    'jjb',
    'mma',
    'boxe',
    'muay_thai',
    'judo',
    'karate',
    'tennis',
    'football',
    'basket',
    'handball',
    'trail',
    'running',
    'cyclisme',
    'natation',
    'rugby',
    'volleyball',
    'escalade',
    'crossfit',
    'musculation',
    'autre',
  ];

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Modifier la compétition" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="Modifier la compétition" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nom */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Nom de la compétition *
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
            <Trophy size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ex: Open de Paris 2025"
              placeholderTextColor={colors.textMuted}
              value={nom}
              onChangeText={setNom}
            />
          </View>
        </View>

        {/* Lieu */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Lieu
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
            <MapPin size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ex: Paris, France"
              placeholderTextColor={colors.textMuted}
              value={lieu}
              onChangeText={setLieu}
            />
          </View>
        </View>

        {/* Type d'événement */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Type d'événement
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
            <Trophy size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ex: Combat, Match, Course..."
              placeholderTextColor={colors.textMuted}
              value={typeEvenement}
              onChangeText={setTypeEvenement}
            />
          </View>
          {/* Suggestions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsRow}
          >
            {typeSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: typeEvenement === suggestion
                      ? `${colors.accent}20`
                      : colors.backgroundCard,
                    borderColor: typeEvenement === suggestion ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  setTypeEvenement(suggestion);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.suggestionText,
                    { color: typeEvenement === suggestion ? colors.accent : colors.textMuted },
                  ]}
                >
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Date *
          </Text>
          <TouchableOpacity
            style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Calendar size={20} color={colors.textMuted} />
            <Text style={[styles.inputText, { color: colors.textPrimary }]}>
              {date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && Platform.OS === 'ios' && (
          <View style={[styles.datePickerContainer, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerButton}
              >
                <Text style={[styles.datePickerButtonText, { color: colors.textMuted }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>
                Sélectionner la date
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerButton}
              >
                <Text style={[styles.datePickerButtonText, { color: colors.accent }]}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              textColor={colors.textPrimary}
              style={styles.datePicker}
            />
          </View>
        )}

        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* Sport - Modifiable */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Sport *
          </Text>
          <TouchableOpacity
            style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            onPress={() => setShowSportPicker(!showSportPicker)}
            activeOpacity={0.7}
          >
            <Text style={styles.sportEmoji}>
              {SPORT_ICONS[sport]}
            </Text>
            <Text style={[styles.inputText, { color: colors.textPrimary }]}>
              {SPORT_LABELS[sport]}
            </Text>
          </TouchableOpacity>

          {/* Sport Picker */}
          {showSportPicker && (
            <View style={[styles.sportPicker, { backgroundColor: colors.backgroundCard }]}>
              <ScrollView style={styles.sportList} showsVerticalScrollIndicator={false}>
                {allSports.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.sportItem,
                      { borderBottomColor: colors.border },
                      sport === s && { backgroundColor: `${colors.accent}20` },
                    ]}
                    onPress={() => {
                      setSport(s);
                      setShowSportPicker(false);
                      setCategoriePoidsId(''); // Reset catégorie
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={styles.sportItemEmoji}>{SPORT_ICONS[s]}</Text>
                    <Text
                      style={[
                        styles.sportItemText,
                        { color: sport === s ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {SPORT_LABELS[s]}
                    </Text>
                    {sport === s && (
                      <Target size={18} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Catégorie de poids */}
        {weightCategories.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Catégorie de poids
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {weightCategories.map((category) => {
                const isSelected = categoriePoidsId === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : colors.backgroundCard,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCategoriePoidsId(category.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryName,
                        { color: isSelected ? colors.textOnAccent : colors.textPrimary },
                      ]}
                    >
                      {category.name}
                    </Text>
                    <Text
                      style={[
                        styles.categoryWeight,
                        {
                          color: isSelected
                            ? colors.textOnAccent + 'B3'
                            : colors.textMuted,
                        },
                      ]}
                    >
                      -{category.maxWeight}kg
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.accent, opacity: isSaving ? 0.5 : 1 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Mise à jour...' : 'Mettre à jour'}
          </Text>
        </TouchableOpacity>
      </View>
      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sportEmoji: {
    fontSize: 24,
  },
  sportPicker: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    maxHeight: 300,
  },
  sportList: {
    maxHeight: 300,
  },
  sportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  sportItemEmoji: {
    fontSize: 24,
  },
  sportItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsRow: {
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  suggestionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    minWidth: 100,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryWeight: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  datePickerContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  datePickerButton: {
    padding: SPACING.sm,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePicker: {
    height: 200,
  },
});
