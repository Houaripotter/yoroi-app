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
  Modal,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, Sparkles, X, ZoomIn } from 'lucide-react-native';
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
  const [zoomedImage, setZoomedImage] = useState<any>(null);
  const [zoomedState, setZoomedState] = useState<string>('');

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
    } catch (error) {
      console.error('[AvatarPackDetail] Erreur sélection:', error);
    }
  };

  const handleZoomAvatar = (image: any, stateLabel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomedImage(image);
    setZoomedState(stateLabel);
  };

  const handleCloseZoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomedImage(null);
    setZoomedState('');
  };

  const handleUsePack = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Sauvegarder le pack sélectionné
      await avatarGalleryService.setSelectedPack(packId);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Avatar mis à jour',
        `Le pack ${pack?.name || packId} est maintenant votre avatar !`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('[AvatarPackDetail] Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le pack');
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
                <TouchableOpacity
                  style={[
                    styles.avatarImageContainer,
                    { backgroundColor: '#FFFFFF' }
                  ]}
                  onPress={() => handleZoomAvatar(avatarImage, `${icon} ${label}`)}
                  activeOpacity={0.7}
                >
                  {avatarImage ? (
                    <Image
                      source={avatarImage}
                      style={styles.avatarImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.avatarPlaceholder}>{icon}</Text>
                  )}
                  <View style={[styles.zoomIcon, { backgroundColor: colors.accent }]}>
                    <ZoomIn size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

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

        {/* Bouton Utiliser ce pack */}
        <TouchableOpacity
          style={[styles.useButton, { backgroundColor: colors.accent }]}
          onPress={handleUsePack}
          activeOpacity={0.8}
        >
          <Check size={24} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.useButtonText}>
            Utiliser ce pack d'avatars
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de zoom */}
      <Modal
        visible={zoomedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseZoom}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCloseZoom}
        >
          <View style={styles.modalContent}>
            {/* Bouton fermer */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
              onPress={handleCloseZoom}
              activeOpacity={0.7}
            >
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Label */}
            <View style={[styles.zoomLabel, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.zoomLabelText, { color: colors.textPrimary }]}>
                {zoomedState}
              </Text>
            </View>

            {/* Image agrandie */}
            <View style={styles.zoomedImageContainer}>
              {zoomedImage && (
                <Image
                  source={zoomedImage}
                  style={styles.zoomedImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
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

  // Button
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  useButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Icône de zoom
  zoomIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal de zoom
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  zoomLabel: {
    position: 'absolute',
    top: 60,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 10,
  },
  zoomLabelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  zoomedImageContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    width: '100%',
    height: '100%',
  },
});
