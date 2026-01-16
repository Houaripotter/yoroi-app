/**
 * TrainingJournalOnboarding.tsx
 * Onboarding pour expliquer les fonctionnalités du carnet d'entraînement
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  BookOpen,
  Target,
  TrendingUp,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingJournalOnboardingProps {
  visible: boolean;
  onClose: () => void;
}

interface OnboardingSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
  tips?: string[];
}

// ============================================================================
// COMPOSANT
// ============================================================================

export default function TrainingJournalOnboarding({
  visible,
  onClose,
}: TrainingJournalOnboardingProps) {
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: OnboardingSlide[] = [
    {
      icon: <BookOpen size={64} color={colors.gold} strokeWidth={2} />,
      title: 'Bienvenue dans ton Carnet',
      description:
        'Ton carnet d\'entraînement te permet de suivre tes performances et maîtriser tes techniques. Tout reste sur ton appareil, 100% offline.',
      tips: [
        'Suivi tes records personnels',
        'Note tes techniques apprises',
        'Visualise ta progression',
      ],
    },
    {
      icon: <Target size={64} color={colors.gold} strokeWidth={2} />,
      title: 'Tes Records',
      description:
        'Crée des suivis personnalisés pour tes exercices (développé couché, squats, course, etc.) et enregistre chaque performance.',
      tips: [
        'Appuie sur + pour ajouter un record',
        'Choisis la catégorie adaptée',
        'Entre tes performances régulièrement',
      ],
    },
    {
      icon: <TrendingUp size={64} color={colors.gold} strokeWidth={2} />,
      title: 'Tes Techniques',
      description:
        'Gère toutes tes techniques de combat : garde, projections, soumissions, frappes et plus encore.',
      tips: [
        'Marque les techniques à apprendre',
        'Note ta progression (en cours, maîtrisé)',
        'Ajoute des notes et vidéos de référence',
      ],
    },
    {
      icon: <Plus size={64} color={colors.gold} strokeWidth={2} />,
      title: 'Commencer',
      description:
        'Utilise le bouton + en bas à droite pour ajouter tes premiers records et techniques. Bonne progression guerrier !',
      tips: [
        'Commence par tes exercices principaux',
        'Note tes techniques préférées',
        'Reviens régulièrement pour suivre ta progression',
      ],
    },
  ];

  const currentSlideData = slides[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onClose();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor:
                        index === currentSlide
                          ? colors.gold
                          : colors.textMuted + '30',
                    },
                    index === currentSlide && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>{currentSlideData.icon}</View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {currentSlideData.title}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {currentSlideData.description}
            </Text>

            {/* Tips */}
            {currentSlideData.tips && (
              <View style={styles.tipsContainer}>
                {currentSlideData.tips.map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <View
                      style={[
                        styles.tipBullet,
                        { backgroundColor: colors.gold + '30' },
                      ]}
                    >
                      <View
                        style={[
                          styles.tipBulletInner,
                          { backgroundColor: colors.gold },
                        ]}
                      />
                    </View>
                    <Text style={[styles.tipText, { color: colors.textMuted }]}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Previous Button */}
            {!isFirstSlide && (
              <TouchableOpacity
                onPress={handlePrevious}
                style={[
                  styles.navButton,
                  { backgroundColor: colors.cardHover },
                ]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color={colors.textSecondary} />
                <Text
                  style={[styles.navButtonText, { color: colors.textSecondary }]}
                >
                  Précédent
                </Text>
              </TouchableOpacity>
            )}

            {/* Spacer */}
            {isFirstSlide && <View style={{ flex: 1 }} />}

            {/* Next/Finish Button */}
            <TouchableOpacity
              onPress={handleNext}
              style={[
                styles.navButton,
                styles.primaryButton,
                { backgroundColor: colors.gold },
                isFirstSlide && { flex: 1 },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.navButtonText,
                  styles.primaryButtonText,
                  { color: colors.background },
                ]}
              >
                {isLastSlide ? 'Commencer' : 'Suivant'}
              </Text>
              {!isLastSlide && (
                <ChevronRight size={20} color={colors.background} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: SCREEN_WIDTH - 32,
    maxWidth: 500,
    minHeight: 560,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    width: 24,
  },
  skipButton: {
    padding: 4,
    marginLeft: 12,
  },
  content: {
    flex: 1,
    minHeight: 320,
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    flexGrow: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  tipsContainer: {
    gap: 14,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipBulletInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  primaryButtonText: {
    textTransform: 'uppercase',
  },
});
