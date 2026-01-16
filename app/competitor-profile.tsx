import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { Trophy, User, Weight, Award, ChevronRight, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const COMPETITOR_PROFILE_KEY = '@yoroi_competitor_profile';

// Catégories IBJJF Hommes (poids en kg)
const IBJJF_CATEGORIES_MEN = [
  { id: 'rooster', name: 'Rooster', weight: '57.5 kg', maxWeight: 57.5 },
  { id: 'light-feather', name: 'Light Feather', weight: '64 kg', maxWeight: 64 },
  { id: 'feather', name: 'Feather', weight: '70 kg', maxWeight: 70 },
  { id: 'light', name: 'Light', weight: '76 kg', maxWeight: 76 },
  { id: 'middle', name: 'Middle', weight: '82.3 kg', maxWeight: 82.3 },
  { id: 'medium-heavy', name: 'Medium Heavy', weight: '88.3 kg', maxWeight: 88.3 },
  { id: 'heavy', name: 'Heavy', weight: '94.3 kg', maxWeight: 94.3 },
  { id: 'super-heavy', name: 'Super Heavy', weight: '100.5 kg', maxWeight: 100.5 },
  { id: 'ultra-heavy', name: 'Ultra Heavy', weight: '+100.5 kg', maxWeight: 999 },
];

// Catégories IBJJF Femmes (poids en kg)
const IBJJF_CATEGORIES_WOMEN = [
  { id: 'rooster', name: 'Rooster', weight: '48.5 kg', maxWeight: 48.5 },
  { id: 'light-feather', name: 'Light Feather', weight: '53.5 kg', maxWeight: 53.5 },
  { id: 'feather', name: 'Feather', weight: '58.5 kg', maxWeight: 58.5 },
  { id: 'light', name: 'Light', weight: '64 kg', maxWeight: 64 },
  { id: 'middle', name: 'Middle', weight: '69 kg', maxWeight: 69 },
  { id: 'medium-heavy', name: 'Medium Heavy', weight: '74 kg', maxWeight: 74 },
  { id: 'heavy', name: 'Heavy', weight: '79.3 kg', maxWeight: 79.3 },
  { id: 'super-heavy', name: 'Super Heavy', weight: '+79.3 kg', maxWeight: 999 },
];

// Ceintures BJJ
const BJJ_BELTS = [
  { id: 'white', name: 'Blanche', color: '#FFFFFF', borderColor: '#E5E7EB' },
  { id: 'blue', name: 'Bleue', color: '#3B82F6', borderColor: '#3B82F6' },
  { id: 'purple', name: 'Violette', color: '#8B5CF6', borderColor: '#8B5CF6' },
  { id: 'brown', name: 'Marron', color: '#78350F', borderColor: '#78350F' },
  { id: 'black', name: 'Noire', color: '#1F2937', borderColor: '#1F2937' },
];

interface CompetitorProfile {
  gender: 'male' | 'female' | null;
  category: string | null;
  belt: string | null;
  currentWeight: number | null;
}

export default function CompetitorProfileScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [profile, setProfile] = useState<CompetitorProfile>({
    gender: null,
    category: null,
    belt: null,
    currentWeight: null,
  });
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(COMPETITOR_PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile(parsed);
        if (parsed.currentWeight) {
          setWeightInput(parsed.currentWeight.toString());
        }
      }
    } catch (error) {
      logger.error('Erreur chargement profil compétiteur:', error);
    }
  };

  const saveProfile = async (updatedProfile: CompetitorProfile) => {
    try {
      await AsyncStorage.setItem(COMPETITOR_PROFILE_KEY, JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
    } catch (error) {
      logger.error('Erreur sauvegarde profil compétiteur:', error);
    }
  };

  const handleGenderSelect = (gender: 'male' | 'female') => {
    const updated = { ...profile, gender, category: null };
    saveProfile(updated);
  };

  const handleCategorySelect = (categoryId: string) => {
    const updated = { ...profile, category: categoryId };
    saveProfile(updated);
  };

  const handleBeltSelect = (beltId: string) => {
    const updated = { ...profile, belt: beltId };
    saveProfile(updated);
  };

  const handleWeightSave = () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      showPopup('Erreur', 'Entre un poids valide', [
        { text: 'OK', style: 'primary' }
      ]);
      return;
    }
    const updated = { ...profile, currentWeight: weight };
    saveProfile(updated);
    showPopup('Succès', 'Poids enregistré !', [
      { text: 'OK', style: 'primary' }
    ]);
  };

  const getCurrentCategories = () => {
    return profile.gender === 'female' ? IBJJF_CATEGORIES_WOMEN : IBJJF_CATEGORIES_MEN;
  };

  const getRecommendedCategory = () => {
    if (!profile.currentWeight || !profile.gender) return null;
    const categories = getCurrentCategories();
    return categories.find(cat => profile.currentWeight! <= cat.maxWeight);
  };

  const recommendedCategory = getRecommendedCategory();

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.backgroundCard }]}>
          <Trophy size={32} color="#F59E0B" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Profil Compétiteur
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Configure ton profil pour les compétitions
          </Text>
        </View>

        {/* Section 1: Genre */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              1. Genre
            </Text>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                {
                  backgroundColor: profile.gender === 'male' ? colors.accent + '20' : colors.backgroundCard,
                  borderColor: profile.gender === 'male' ? colors.accent : colors.border,
                },
              ]}
              onPress={() => handleGenderSelect('male')}
            >
              {profile.gender === 'male' && (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Check size={12} color={colors.textOnGold} />
                </View>
              )}
              <Text style={[styles.genderText, { color: profile.gender === 'male' ? colors.accent : colors.textPrimary }]}>
                Homme
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                {
                  backgroundColor: profile.gender === 'female' ? colors.accent + '20' : colors.backgroundCard,
                  borderColor: profile.gender === 'female' ? colors.accent : colors.border,
                },
              ]}
              onPress={() => handleGenderSelect('female')}
            >
              {profile.gender === 'female' && (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Check size={12} color={colors.textOnGold} />
                </View>
              )}
              <Text style={[styles.genderText, { color: profile.gender === 'female' ? colors.accent : colors.textPrimary }]}>
                Femme
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Poids actuel */}
        {profile.gender && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Weight size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                2. Poids actuel
              </Text>
            </View>

            <View style={styles.weightInputContainer}>
              <TextInput
                style={[styles.weightInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Ex: 75.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
              />
              <Text style={[styles.weightUnit, { color: colors.textMuted }]}>kg</Text>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent }]}
                onPress={handleWeightSave}
              >
                <Check size={20} color={colors.textOnGold} />
              </TouchableOpacity>
            </View>

            {recommendedCategory && (
              <View style={[styles.recommendationBadge, { backgroundColor: colors.success + '15' }]}>
                <Text style={[styles.recommendationText, { color: colors.success }]}>
                  Catégorie recommandée: {recommendedCategory.name} ({recommendedCategory.weight})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Section 3: Catégorie de poids IBJJF */}
        {profile.gender && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Trophy size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                3. Catégorie IBJJF
              </Text>
            </View>

            <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
              Sélectionne ta catégorie de poids officielle
            </Text>

            <View style={styles.categoriesGrid}>
              {getCurrentCategories().map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: profile.category === category.id ? colors.accent + '20' : colors.backgroundCard,
                      borderColor: profile.category === category.id ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  {profile.category === category.id && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                      <Check size={12} color={colors.textOnGold} />
                    </View>
                  )}
                  <Text style={[styles.categoryName, { color: profile.category === category.id ? colors.accent : colors.textPrimary }]}>
                    {category.name}
                  </Text>
                  <Text style={[styles.categoryWeight, { color: colors.textMuted }]}>
                    {category.weight}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Section 4: Ceinture */}
        {profile.gender && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                4. Ceinture BJJ
              </Text>
            </View>

            <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
              Ton niveau actuel en Jiu-Jitsu Brésilien
            </Text>

            <View style={styles.beltsGrid}>
              {BJJ_BELTS.map((belt) => (
                <TouchableOpacity
                  key={belt.id}
                  style={[
                    styles.beltCard,
                    {
                      backgroundColor: profile.belt === belt.id ? belt.color + (belt.id === 'white' ? '' : '20') : colors.backgroundCard,
                      borderColor: profile.belt === belt.id ? belt.borderColor : colors.border,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleBeltSelect(belt.id)}
                >
                  {profile.belt === belt.id && (
                    <View style={[styles.checkBadge, { backgroundColor: belt.id === 'white' ? colors.accent : belt.color }]}>
                      <Check size={12} color={belt.id === 'white' ? colors.textOnGold : '#FFFFFF'} />
                    </View>
                  )}
                  <View style={[styles.beltVisual, { backgroundColor: belt.color, borderColor: belt.borderColor }]} />
                  <Text style={[styles.beltName, { color: profile.belt === belt.id && belt.id !== 'white' ? belt.color : colors.textPrimary }]}>
                    {belt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Résumé du profil */}
        {profile.gender && profile.category && profile.belt && (
          <View style={[styles.summaryCard, { backgroundColor: colors.accent + '10', borderColor: colors.accent }]}>
            <View style={styles.summaryHeader}>
              <Trophy size={24} color={colors.accent} />
              <Text style={[styles.summaryTitle, { color: colors.accent }]}>
                Profil Compétiteur
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Genre:</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {profile.gender === 'male' ? 'Homme' : 'Femme'}
              </Text>
            </View>

            {profile.currentWeight && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Poids actuel:</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {profile.currentWeight} kg
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Catégorie:</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {getCurrentCategories().find(c => c.id === profile.category)?.name}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Ceinture:</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {BJJ_BELTS.find(b => b.id === profile.belt)?.name}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.goToCompetitionsButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/planning?tab=competitions')}
            >
              <Text style={[styles.goToCompetitionsText, { color: colors.textOnGold }]}>Voir mes compétitions</Text>
              <ChevronRight size={20} color={colors.textOnGold} />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
    margin: 16,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 28,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '700',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightInput: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationBadge: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  recommendationText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoriesGrid: {
    gap: 10,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryWeight: {
    fontSize: 13,
    fontWeight: '500',
  },
  beltsGrid: {
    gap: 10,
  },
  beltCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    position: 'relative',
  },
  beltVisual: {
    width: 40,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
  },
  beltName: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  goToCompetitionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  goToCompetitionsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
