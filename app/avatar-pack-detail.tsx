// ============================================
// ⚔️ YOROI - DÉTAIL D'UN PACK D'AVATARS
// ============================================
// Affiche les 5 avatars d'un pack (legendary, strong, neutral, tired, down)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { avatarGalleryService, AvatarPack } from '@/lib/avatarGalleryService';
import { AvatarState } from '@/lib/avatarState';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AVATAR_STATES: { state: AvatarState; label: string; description: string; icon: string }[] = [
  { state: 'legendary', label: 'Légendaire', description: 'Forme exceptionnelle', icon: '🏆' },
  { state: 'strong', label: 'Fort', description: 'Excellente forme', icon: '💪' },
  { state: 'neutral', label: 'Neutre', description: 'Forme normale', icon: '😐' },
  { state: 'tired', label: 'Fatigué', description: 'Besoin de repos', icon: '😓' },
  { state: 'down', label: 'Épuisé', description: 'Récupération nécessaire', icon: '😵' },
];

export default function AvatarPackDetailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const packId = params.packId as string;

  const [pack, setPack] = useState<AvatarPack | null>(null);
  const [selectedState, setSelectedState] = useState<AvatarState>('neutral');

  useEffect(() => {
    // Trouver le pack
    const foundPack = avatarGalleryService.getPackImages(packId);
    if (foundPack) {
      setPack({
        id: packId,
        name: packId.charAt(0).toUpperCase() + packId.slice(1),
        description: '',
        folder: packId,
        unlockXP: 0,
        icon: '',
        category: 'martial',
      });
    }
  }, [packId]);

  const images = avatarGalleryService.getPackImages(packId);

  const handleSelectState = async (state: AvatarState) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedState(state);

      // TODO: Sauvegarder la sélection de l'état préféré
      // await avatarGalleryService.setPreferredState(packId, state);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[AvatarPackDetail] Erreur sélection:', error);
    }
  };

  if (!pack || !images) {
    return (
      <ScreenWrapper>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Pack introuvable
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec bouton retour */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.backgroundElevated }]}>
              <Sparkles size={24} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {pack.name}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Choisissez votre avatar
              </Text>
            </View>
          </View>
        </View>

        {/* Grille des 5 avatars */}
        <View style={styles.grid}>
          {AVATAR_STATES.map(({ state, label, description, icon }) => {
            const isSelected = selectedState === state;
            const avatarImage = images[state];

            return (
              <TouchableOpacity
                key={state}
                style={[
                  styles.avatarCard,
                  { backgroundColor: colors.backgroundCard },
                  isSelected && {
                    borderColor: colors.accent,
                    borderWidth: 3,
                  },
                ]}
                onPress={() => handleSelectState(state)}
                activeOpacity={0.7}
              >
                {/* Image de l'avatar */}
                <View style={[
                  styles.avatarImageContainer,
                  { backgroundColor: '#FFFFFF' }
                ]}>
                  {avatarImage ? (
                    <Image
                      source={avatarImage}
                      style={styles.avatarImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.avatarPlaceholder}>{icon}</Text>
                  )}
                </View>

                {/* Infos */}
                <View style={styles.avatarInfo}>
                  <Text style={[styles.avatarLabel, { color: colors.textPrimary }]}>
                    {icon} {label}
                  </Text>
                  <Text style={[styles.avatarDescription, { color: colors.textMuted }]}>
                    {description}
                  </Text>
                </View>

                {/* Badge sélectionné */}
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
                    <Check size={20} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            💡 L'avatar s'adapte automatiquement à votre forme en fonction de votre progression et activité.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  topSection: {
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  grid: {
    gap: SPACING.md,
  },
  avatarCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImageContainer: {
    width: 80,
    height: 110,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    fontSize: 48,
  },
  avatarInfo: {
    flex: 1,
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  avatarDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
