// ============================================
// YOROI - AJOUTER UNE COMPÉTITION
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
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Calendar, MapPin, Trophy, Save } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import {
  Sport,
  getWeightCategories,
  WeightCategory,
  SPORT_LABELS,
} from '@/lib/fighterMode';
import { addCompetition, getUserSport } from '@/lib/fighterModeService';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

export default function AddCompetitionScreen() {
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [nom, setNom] = useState('');
  const [lieu, setLieu] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sport, setSport] = useState<Sport>('jjb');
  const [typeEvenement, setTypeEvenement] = useState('');
  const [categoriePoidsId, setCategoriePoidsId] = useState('');
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Suggestions pour le type d'événement
  const typeSuggestions = ['Combat', 'Match', 'Course', 'Compétition', 'Tournoi', 'Championnat'];

  useEffect(() => {
    loadUserSport();
  }, []);

  const loadUserSport = async () => {
    const userSport = await getUserSport();
    if (userSport) {
      setSport(userSport);
      setWeightCategories(getWeightCategories(userSport));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Sur Android, fermer le picker après sélection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    // Mettre à jour la date si une date a été sélectionnée
    if (selectedDate) {
      setDate(selectedDate);
    }

    // Sur Android, si l'utilisateur annule, fermer le picker
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      showPopup('Erreur', 'Saisis un nom de competition', [{ text: 'OK', style: 'primary' }]);
      return;
    }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const selectedCategory = weightCategories.find(c => c.id === categoriePoidsId);

      await addCompetition({
        nom: nom.trim(),
        lieu: lieu.trim() || undefined,
        date: date.toISOString().split('T')[0],
        sport,
        type_evenement: typeEvenement.trim() || undefined,
        categorie_poids: selectedCategory?.name,
        poids_max: selectedCategory?.maxWeight,
        statut: 'a_venir',
      });

      router.back();
    } catch (error) {
      logger.error('Error saving competition:', error);

      // Messages d'erreur contextuels selon le type d'erreur
      let userMessage = 'Impossible de sauvegarder la compétition.';

      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint')) {
          userMessage = 'Cette compétition existe déjà. Choisis un autre nom ou modifie la date.';
        } else if (error.message.includes('NOT NULL constraint')) {
          userMessage = 'Tous les champs obligatoires doivent être remplis (nom, date, sport).';
        } else if (error.message.includes('storage') || error.message.includes('quota')) {
          userMessage = 'Stockage plein. Libère de l\'espace sur ton téléphone et réessaye.';
        } else {
          userMessage = 'Impossible de sauvegarder. Vérifie que tous les champs sont bien remplis et réessaye.';
        }
      }

      showPopup('Erreur de sauvegarde', userMessage, [{ text: 'OK', style: 'primary' }]);
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Nouvelle Compétition" showBack />

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
              autoFocus
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
              {date.toLocaleDateString(locale, {
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
                <Text style={[styles.datePickerButtonText, { color: isDark ? colors.accent : '#000000', fontWeight: '700' }]}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={new Date()}
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
            minimumDate={new Date()}
          />
        )}

        {/* Sport */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Sport
          </Text>
          <View style={[styles.readOnlyContainer, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.readOnlyText, { color: colors.textPrimary }]}>
              {SPORT_LABELS[sport]}
            </Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Le sport est défini dans ton profil
          </Text>
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
                        { color: isSelected ? colors.textOnGold : colors.textPrimary },
                      ]}
                    >
                      {category.name}
                    </Text>
                    <Text
                      style={[
                        styles.categoryWeight,
                        {
                          color: isSelected
                            ? colors.textOnGold
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
          <Save size={20} color={colors.textOnGold} />
          <Text style={[styles.saveButtonText, { color: colors.textOnGold }]}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </View>
      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  readOnlyContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: SPACING.xs,
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
