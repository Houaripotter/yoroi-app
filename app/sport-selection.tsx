// ============================================
// YOROI - SÉLECTION DU SPORT (Compétiteur)
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Lightbulb,
  Swords,
  Award,
  Footprints,
  Mountain,
  Bike,
  Waves,
  Volleyball,
  Trophy,
  Dumbbell,
  Zap,
  Heart,
  Flame,
  Activity,
  Wind,
  Snowflake,
  Music,
  Flag,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Sport, SPORT_LABELS } from '@/lib/fighterMode';
import { setUserSport } from '@/lib/fighterModeService';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { sportHasWeightCategories } from '@/lib/weightCategories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

type IconType = 'swords' | 'trophy' | 'award' | 'mountain' | 'footprints' | 'bike' | 'waves' | 'volleyball' | 'dumbbell' | 'zap' | 'heart' | 'flame' | 'activity' | 'wind' | 'snowflake' | 'music' | 'flag' | 'sparkles';

type SportCategory = {
  title: string;
  sports: { id: Sport; label: string; iconType: IconType; description: string }[];
};

const SPORT_CATEGORIES: SportCategory[] = [
  {
    title: 'Sports de Combat',
    sports: [
      { id: 'jjb', label: SPORT_LABELS.jjb, iconType: 'swords', description: 'Grappling, soumissions' },
      { id: 'mma', label: SPORT_LABELS.mma, iconType: 'trophy', description: 'Arts martiaux mixtes' },
      { id: 'boxe', label: SPORT_LABELS.boxe, iconType: 'award', description: 'Noble art' },
      { id: 'muay_thai', label: SPORT_LABELS.muay_thai, iconType: 'swords', description: 'Boxe thaïlandaise' },
      { id: 'judo', label: SPORT_LABELS.judo, iconType: 'swords', description: 'Projections, contrôles' },
      { id: 'karate', label: SPORT_LABELS.karate, iconType: 'swords', description: 'Karaté traditionnel' },
      { id: 'taekwondo', label: SPORT_LABELS.taekwondo, iconType: 'swords', description: 'Art martial coréen' },
      { id: 'krav_maga', label: SPORT_LABELS.krav_maga, iconType: 'award', description: 'Self-défense' },
    ],
  },
  {
    title: 'Sports d\'Endurance',
    sports: [
      { id: 'trail', label: SPORT_LABELS.trail, iconType: 'mountain', description: 'Course nature' },
      { id: 'running', label: SPORT_LABELS.running, iconType: 'footprints', description: 'Course à pied' },
      { id: 'cyclisme', label: SPORT_LABELS.cyclisme, iconType: 'bike', description: 'Vélo route/VTT' },
      { id: 'natation', label: SPORT_LABELS.natation, iconType: 'waves', description: 'Natation' },
      { id: 'triathlon', label: SPORT_LABELS.triathlon, iconType: 'activity', description: 'Natation/Vélo/Course' },
      { id: 'marche_nordique', label: SPORT_LABELS.marche_nordique, iconType: 'footprints', description: 'Marche avec bâtons' },
      { id: 'randonnee', label: SPORT_LABELS.randonnee, iconType: 'mountain', description: 'Randonnée pédestre' },
    ],
  },
  {
    title: 'Sports Collectifs',
    sports: [
      { id: 'football', label: SPORT_LABELS.football, iconType: 'trophy', description: 'Football' },
      { id: 'basket', label: SPORT_LABELS.basket, iconType: 'trophy', description: 'Basketball' },
      { id: 'handball', label: SPORT_LABELS.handball, iconType: 'trophy', description: 'Handball' },
      { id: 'rugby', label: SPORT_LABELS.rugby, iconType: 'trophy', description: 'Rugby' },
      { id: 'volleyball', label: SPORT_LABELS.volleyball, iconType: 'volleyball', description: 'Volleyball' },
    ],
  },
  {
    title: 'Fitness & Force',
    sports: [
      { id: 'musculation', label: SPORT_LABELS.musculation, iconType: 'dumbbell', description: 'Musculation' },
      { id: 'crossfit', label: SPORT_LABELS.crossfit, iconType: 'zap', description: 'CrossFit' },
      { id: 'hyrox', label: SPORT_LABELS.hyrox, iconType: 'flame', description: 'Fitness racing' },
      { id: 'hiit', label: SPORT_LABELS.hiit, iconType: 'flame', description: 'Haute intensité' },
      { id: 'calisthenics', label: SPORT_LABELS.calisthenics, iconType: 'activity', description: 'Poids du corps' },
      { id: 'escalade', label: SPORT_LABELS.escalade, iconType: 'mountain', description: 'Escalade' },
    ],
  },
  {
    title: 'Bien-être & Santé',
    sports: [
      { id: 'yoga', label: SPORT_LABELS.yoga, iconType: 'heart', description: 'Yoga' },
      { id: 'pilates', label: SPORT_LABELS.pilates, iconType: 'heart', description: 'Pilates' },
      { id: 'danse', label: SPORT_LABELS.danse, iconType: 'music', description: 'Danse' },
    ],
  },
  {
    title: 'Sports de Raquette',
    sports: [
      { id: 'tennis', label: SPORT_LABELS.tennis, iconType: 'trophy', description: 'Tennis' },
      { id: 'padel', label: SPORT_LABELS.padel, iconType: 'trophy', description: 'Padel' },
      { id: 'badminton', label: SPORT_LABELS.badminton, iconType: 'trophy', description: 'Badminton' },
      { id: 'squash', label: SPORT_LABELS.squash, iconType: 'trophy', description: 'Squash' },
      { id: 'ping_pong', label: SPORT_LABELS.ping_pong, iconType: 'trophy', description: 'Ping-Pong' },
    ],
  },
  {
    title: 'Sports de Glisse',
    sports: [
      { id: 'surf', label: SPORT_LABELS.surf, iconType: 'wind', description: 'Surf' },
      { id: 'ski', label: SPORT_LABELS.ski, iconType: 'snowflake', description: 'Ski' },
      { id: 'snowboard', label: SPORT_LABELS.snowboard, iconType: 'snowflake', description: 'Snowboard' },
      { id: 'skate', label: SPORT_LABELS.skate, iconType: 'sparkles', description: 'Skateboard' },
    ],
  },
  {
    title: 'Autres Sports',
    sports: [
      { id: 'golf', label: SPORT_LABELS.golf, iconType: 'flag', description: 'Golf' },
      { id: 'equitation', label: SPORT_LABELS.equitation, iconType: 'trophy', description: 'Équitation' },
      { id: 'autre', label: SPORT_LABELS.autre, iconType: 'swords', description: 'Autre sport' },
    ],
  },
];

// Couleurs forcées en mode CLAIR pour la sélection de sport (thème Classic)
const SPORT_SELECTION_COLORS = {
  background: '#F7F7F7',
  backgroundCard: '#FFFFFF',
  backgroundElevated: '#F0F0F0',
  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textMuted: '#666666',
  accent: '#1A1A1A',
  accentText: '#FFFFFF',
  border: '#E0E0E0',
};

export default function SportSelectionScreen() {
  const { isDark: themeIsDark } = useTheme();
  
  // Utiliser les couleurs forcées claires
  const colors = SPORT_SELECTION_COLORS;
  const isDark = false; // Toujours en mode clair pour cette page
  
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([0]); // Ouvre la première catégorie par défaut

  // Helper function to render sport icon based on iconType
  const renderSportIcon = (iconType: IconType, color: string, size: number = 32) => {
    const iconProps = { size, color, strokeWidth: 2 };

    switch (iconType) {
      case 'swords':
        return <Swords {...iconProps} />;
      case 'trophy':
        return <Trophy {...iconProps} />;
      case 'award':
        return <Award {...iconProps} />;
      case 'mountain':
        return <Mountain {...iconProps} />;
      case 'footprints':
        return <Footprints {...iconProps} />;
      case 'bike':
        return <Bike {...iconProps} />;
      case 'waves':
        return <Waves {...iconProps} />;
      case 'volleyball':
        return <Volleyball {...iconProps} />;
      case 'dumbbell':
        return <Dumbbell {...iconProps} />;
      case 'zap':
        return <Zap {...iconProps} />;
      case 'heart':
        return <Heart {...iconProps} />;
      case 'flame':
        return <Flame {...iconProps} />;
      case 'activity':
        return <Activity {...iconProps} />;
      case 'wind':
        return <Wind {...iconProps} />;
      case 'snowflake':
        return <Snowflake {...iconProps} />;
      case 'music':
        return <Music {...iconProps} />;
      case 'flag':
        return <Flag {...iconProps} />;
      case 'sparkles':
        return <Sparkles {...iconProps} />;
      default:
        return <Swords {...iconProps} />;
    }
  };

  const toggleCategory = (categoryIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategories((prev) =>
      prev.includes(categoryIndex)
        ? prev.filter((i) => i !== categoryIndex)
        : [...prev, categoryIndex]
    );
  };

  const handleSelectSport = (sport: Sport) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSport(sport);
  };

  const handleContinue = async () => {
    if (!selectedSport) return;

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await setUserSport(selectedSport);

      // Si le sport a des catégories de poids officielles, demander la catégorie
      if (sportHasWeightCategories(selectedSport)) {
        // Charger le genre et poids actuel pour suggérer une catégorie
        const gender = (await AsyncStorage.getItem('@yoroi_gender')) as 'male' | 'female' || 'male';
        const currentWeight = await AsyncStorage.getItem('@yoroi_current_weight');

        router.replace({
          pathname: '/weight-category-selection',
          params: {
            sport: selectedSport,
            gender,
            currentWeight: currentWeight || '',
          },
        });
      } else {
        // Sports sans catégories → setup direct
        router.replace('/setup');
      }
    } catch (error) {
      logger.error('Error saving sport:', error);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border }]}
          onPress={handleBack}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Quel est ton sport ?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Cela nous aidera à personnaliser ton expérience
          </Text>
        </View>

        {/* Sports by Category - Accordéon */}
        {SPORT_CATEGORIES.map((category, categoryIndex) => {
          const isExpanded = expandedCategories.includes(categoryIndex);

          return (
            <View key={categoryIndex} style={styles.categorySection}>
              {/* Header cliquable */}
              <TouchableOpacity
                style={[
                  styles.categoryHeader,
                  { backgroundColor: colors.backgroundCard, borderWeight: 1, borderColor: colors.border }
                ]}
                onPress={() => toggleCategory(categoryIndex)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>
                  {category.title}
                </Text>
                <View
                  style={[
                    styles.chevronIcon,
                    isExpanded && styles.chevronIconExpanded
                  ]}
                >
                  <ChevronDown size={20} color={colors.textMuted} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              {/* Contenu de la catégorie */}
              {isExpanded && (
                <View style={styles.sportsGrid}>
                  {category.sports.map((sport) => {
                    const isSelected = selectedSport === sport.id;

                    return (
                      <TouchableOpacity
                        key={sport.id}
                        style={[
                          styles.sportCard,
                          {
                            backgroundColor: isSelected
                              ? colors.accent
                              : colors.backgroundCard,
                            borderColor: isSelected ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => handleSelectSport(sport.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sportIconContainer}>
                          {renderSportIcon(
                            sport.iconType,
                            isSelected ? '#FFFFFF' : colors.textPrimary,
                            28
                          )}
                        </View>
                        <Text
                          style={[
                            styles.sportLabel,
                            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {sport.label}
                        </Text>
                        <Text
                          style={[
                            styles.sportDescription,
                            {
                              color: isSelected
                                ? 'rgba(255, 255, 255, 0.8)'
                                : colors.textMuted,
                            },
                          ]}
                        >
                          {sport.description}
                        </Text>

                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Text style={styles.checkIcon}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border }]}>
          <View style={styles.infoContent}>
            <Lightbulb size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Cette information permet de configurer les catégories de poids et
              les statistiques adaptées à ton sport
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      {selectedSport && (
        <View
          style={[
            styles.bottomContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.accent }]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.continueButtonText, { color: '#FFFFFF' }]}>
              {isLoading ? 'Chargement...' : 'Continuer'}
            </Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  categorySection: {
    marginBottom: SPACING.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevronIcon: {
    transform: [{ rotate: '0deg' }],
  },
  chevronIconExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
  },
  sportCard: {
    width: '47.5%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 140,
    position: 'relative',
  },
  sportIconContainer: {
    marginBottom: SPACING.sm,
  },
  sportLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  sportDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  infoBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    textAlign: 'center',
  },
  bottomContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  continueButton: {
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
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
