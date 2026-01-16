// ============================================
// YOROI - SÉLECTION CATÉGORIE DE POIDS
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router, useLocalSearchParams } from 'expo-router';
import { Scale, ChevronRight, Trophy, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import logger from '@/lib/security/logger';
import {
  getWeightCategoriesBySportAndGender,
  findWeightCategoryByWeight,
  WeightCategory,
  sportHasWeightCategories,
} from '@/lib/weightCategories';

export default function WeightCategorySelectionScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const params = useLocalSearchParams<{ sport?: string; gender?: 'male' | 'female'; currentWeight?: string }>();

  const sport = params.sport || 'jjb';
  const gender = (params.gender as 'male' | 'female') || 'male';
  const currentWeight = params.currentWeight ? parseFloat(params.currentWeight) : null;

  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<WeightCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, [sport, gender]);

  const loadCategories = () => {
    // Vérifier si le sport a des catégories
    if (!sportHasWeightCategories(sport)) {
      showPopup(
        'Sport sans catégories',
        'Ce sport n\'a pas de catégories de poids officielles. Vous serez redirigé vers la configuration.',
        [{ text: 'OK', style: 'primary', onPress: () => router.replace('/setup') }]
      );
      return;
    }

    // Charger les catégories
    const cats = getWeightCategoriesBySportAndGender(sport, gender);
    setCategories(cats);

    // Si on a un poids actuel, suggérer une catégorie
    if (currentWeight) {
      const suggested = findWeightCategoryByWeight(sport, currentWeight, gender);
      if (suggested) {
        setSuggestedCategory(suggested);
        setSelectedCategory(suggested.id);
      }
    }
  };

  const handleSelectCategory = async (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(categoryId);
  };

  const handleContinue = async () => {
    if (!selectedCategory) {
      showPopup('Sélection requise', 'Choisis une catégorie de poids.', [{ text: 'OK', style: 'primary' }]);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Sauvegarder la catégorie sélectionnée
      await AsyncStorage.setItem('@yoroi_weight_category', selectedCategory);

      // Continuer vers le setup
      router.replace('/setup');
    } catch (error) {
      logger.error('Erreur sauvegarde catégorie:', error);
      showPopup('Erreur', 'Impossible de sauvegarder la catégorie.', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/setup');
  };

  const selectedCat = categories.find(c => c.id === selectedCategory);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
          <Scale size={32} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Ta catégorie de poids
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Choisis ta catégorie de compétition officielle
        </Text>
      </View>

      {/* Suggestion si poids connu */}
      {suggestedCategory && (
        <View style={[styles.suggestionCard, { backgroundColor: colors.accent + '10', borderColor: colors.accent }]}>
          <Trophy size={20} color={colors.accent} />
          <View style={styles.suggestionText}>
            <Text style={[styles.suggestionTitle, { color: colors.accent }]}>
              Suggestion pour toi
            </Text>
            <Text style={[styles.suggestionDesc, { color: colors.textPrimary }]}>
              Avec {currentWeight}kg → <Text style={{ fontWeight: '700' }}>{suggestedCategory.name}</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Liste des catégories */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category, index) => {
          const isSelected = selectedCategory === category.id;
          const isSuggested = suggestedCategory?.id === category.id;

          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                { backgroundColor: colors.backgroundCard },
                isSelected && {
                  backgroundColor: colors.accent + '15',
                  borderColor: colors.accent,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleSelectCategory(category.id)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryMain}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: isSelected ? colors.accent : colors.textPrimary }]}>
                    {category.name}
                  </Text>
                  <Text style={[styles.categoryNameEn, { color: colors.textMuted }]}>
                    {category.nameEn}
                  </Text>
                  <Text style={[styles.categoryWeight, { color: colors.textSecondary }]}>
                    {category.minWeight > 0 ? `${category.minWeight}kg - ` : ''}
                    {category.maxWeight < 999 ? `${category.maxWeight}kg` : `+${category.minWeight}kg`}
                  </Text>
                </View>

                {isSelected && (
                  <View style={[styles.checkIcon, { backgroundColor: colors.accent }]}>
                    <Check size={18} color={colors.textOnAccent} />
                  </View>
                )}

                {!isSelected && isSuggested && (
                  <View style={[styles.suggestedBadge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.suggestedText, { color: colors.textOnAccent }]}>Suggéré</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        {selectedCat && (
          <View style={[styles.selectedInfo, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.selectedLabel, { color: colors.textMuted }]}>
              Catégorie sélectionnée :
            </Text>
            <Text style={[styles.selectedValue, { color: colors.accent }]}>
              {selectedCat.name} ({selectedCat.nameEn})
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.continueBtn,
            {
              backgroundColor: selectedCategory ? colors.accent : colors.backgroundCard,
              opacity: selectedCategory ? 1 : 0.5,
            },
          ]}
          onPress={handleContinue}
          disabled={!selectedCategory}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueBtnText, { color: selectedCategory ? colors.textOnAccent : colors.textMuted }]}>
            Continuer
          </Text>
          <ChevronRight size={20} color={selectedCategory ? colors.textOnAccent : colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
            Passer cette étape
          </Text>
        </TouchableOpacity>
      </View>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  categoryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryNameEn: {
    fontSize: 13,
    marginBottom: 6,
  },
  categoryWeight: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  suggestedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedInfo: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
