// ============================================
// YOROI - SÉLECTION MULTI-SPORTS DE COMPÉTITION
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
import { ChevronRight, Check, Swords, Users, Zap, Trophy } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// Types de sports disponibles
const SPORTS_LIST = [
  // Combat
  { id: 'jjb', label: 'JJB / Grappling', category: 'combat', icon: '', color: '#1E88E5' },
  { id: 'mma', label: 'MMA', category: 'combat', icon: '', color: '#E53935' },
  { id: 'boxe', label: 'Boxe', category: 'combat', icon: '', color: '#EF4444' },
  { id: 'muay_thai', label: 'Muay Thai', category: 'combat', icon: '', color: '#FF6F00' },
  { id: 'judo', label: 'Judo', category: 'combat', icon: '', color: '#FF5722' },
  { id: 'karate', label: 'Karaté', category: 'combat', icon: '', color: '#9C27B0' },

  // Sports collectifs
  { id: 'football', label: 'Football', category: 'match', icon: '', color: '#4CAF50' },
  { id: 'futsal', label: 'Futsal / Foot en salle', category: 'match', icon: '', color: '#66BB6A' },
  { id: 'basket', label: 'Basketball', category: 'match', icon: '', color: '#FF5722' },
  { id: 'rugby', label: 'Rugby', category: 'match', icon: '', color: '#795548' },
  { id: 'handball', label: 'Handball', category: 'match', icon: '', color: '#2196F3' },
  { id: 'volley', label: 'Volleyball', category: 'match', icon: '', color: '#FFEB3B' },

  // Course
  { id: 'running', label: 'Running', category: 'course', icon: '', color: '#00BCD4' },
  { id: 'trail', label: 'Trail', category: 'course', icon: '', color: '#4CAF50' },
  { id: 'marathon', label: 'Marathon', category: 'course', icon: '', color: '#FF9800' },
  { id: 'cyclisme', label: 'Cyclisme', category: 'course', icon: '', color: '#00BCD4' },
  { id: 'natation', label: 'Natation', category: 'course', icon: '', color: '#0288D1' },

  // Autres compétitions
  { id: 'tennis', label: 'Tennis', category: 'competition', icon: '', color: '#8BC34A' },
  { id: 'padel', label: 'Padel', category: 'competition', icon: '', color: '#00BCD4' },
  { id: 'escalade', label: 'Escalade', category: 'competition', icon: '', color: '#795548' },
  { id: 'crossfit', label: 'CrossFit', category: 'competition', icon: '', color: '#43A047' },
];

export default function CompetitionSportsSelectionScreen() {
  const { colors, isDark } = useTheme();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSport = (sportId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter(s => s !== sportId));
    } else {
      setSelectedSports([...selectedSports, sportId]);
    }
  };

  const handleContinue = async () => {
    if (selectedSports.length === 0) return;

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Sauvegarder les sports sélectionnés
      await AsyncStorage.setItem('yoroi_competition_sports', JSON.stringify(selectedSports));

      // Marquer l'onboarding comme terminé
      await AsyncStorage.setItem('yoroi_onboarding_done', 'true');

      // Rediriger vers l'app
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Error saving sports:', error);
      setIsLoading(false);
    }
  };

  // Grouper par catégorie
  const sportsByCategory = {
    combat: SPORTS_LIST.filter(s => s.category === 'combat'),
    match: SPORTS_LIST.filter(s => s.category === 'match'),
    course: SPORTS_LIST.filter(s => s.category === 'course'),
    competition: SPORTS_LIST.filter(s => s.category === 'competition'),
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'combat': return <Swords size={20} color="#EF4444" strokeWidth={2} />;
      case 'match': return <Users size={20} color="#22C55E" strokeWidth={2} />;
      case 'course': return <Zap size={20} color="#06B6D4" strokeWidth={2} />;
      case 'competition': return <Trophy size={20} color="#6B7280" strokeWidth={2} />;
      default: return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch(category) {
      case 'combat': return 'Sports de Combat';
      case 'match': return 'Sports Collectifs';
      case 'course': return 'Course & Endurance';
      case 'competition': return 'Autres Compétitions';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Trophy size={48} color="#F59E0B" strokeWidth={2} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Quels sports pratiques-tu en compétition ?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Sélectionne tous les sports qui t'intéressent.{'\n'}
            Tu verras leurs calendriers officiels dans l'onglet Planning
          </Text>

          {selectedSports.length > 0 && (
            <View style={[styles.selectedCount, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[styles.selectedCountText, { color: '#F59E0B' }]}>
                {selectedSports.length} sport{selectedSports.length > 1 ? 's' : ''} sélectionné{selectedSports.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Sports par catégorie */}
        {Object.entries(sportsByCategory).map(([category, sports]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              {getCategoryIcon(category)}
              <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>
                {getCategoryLabel(category)}
              </Text>
            </View>

            <View style={styles.sportsGrid}>
              {sports.map((sport) => {
                const isSelected = selectedSports.includes(sport.id);
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.sportCard,
                      { backgroundColor: colors.backgroundElevated },
                      isSelected && {
                        backgroundColor: sport.color + '20',
                        borderColor: sport.color,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => toggleSport(sport.id)}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: sport.color }]}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                    <Text style={[
                      styles.sportLabel,
                      { color: isSelected ? sport.color : colors.textPrimary },
                      isSelected && { fontWeight: '700' },
                    ]}>
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bouton continuer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: selectedSports.length > 0
                ? '#F59E0B'
                : colors.backgroundElevated,
            },
          ]}
          onPress={handleContinue}
          disabled={selectedSports.length === 0 || isLoading}
        >
          <Text style={[
            styles.continueText,
            { color: selectedSports.length > 0 ? '#FFF' : colors.textMuted },
          ]}>
            Commencer
          </Text>
          <ChevronRight
            size={22}
            color={selectedSports.length > 0 ? '#FFF' : colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.skipText, { color: colors.textMuted }]}>
            Passer cette étape
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.xl * 3,
    paddingBottom: 120,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  selectedCount: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Catégories
  categorySection: {
    marginBottom: SPACING.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sportCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  sportLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xl,
    paddingBottom: 40,
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    gap: SPACING.sm,
    width: '100%',
  },
  continueText: {
    fontSize: 17,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  skipText: {
    fontSize: 14,
  },
});
