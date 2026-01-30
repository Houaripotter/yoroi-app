/**
 * avatar-selection.tsx
 * Galerie d'avatars YOROI V3
 *
 * Interface pour sélectionner son avatar parmi les 16 packs d'avatars
 * Chaque pack de personnage a 5 états, chaque pack de collection a 5 personnages
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

import {
  getAvatarConfig,
  setFullAvatarConfig,
  getUnlockedLevel,
  getLevelProgress,
  getAvatarImage,
  getAllPacksWithUnlockStatus,
  getPackName,
  getPackType,
  getCollectionCharacters,
  type AvatarPack,
  type AvatarGender,
  type AvatarLevel,
  type AvatarState,
  type LevelProgress,
  type CollectionCharacter,
} from '@/lib/avatarSystem';
import { useTheme } from '@/lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// Test direct image import pour debug
const TEST_IMAGE = require('@/assets/avatars/samurai/samurai_neutral.png');

const { width } = Dimensions.get('window');
const AVATAR_SIZE = (width - 80) / 5; // 5 avatars par ligne

// Les 5 états pour les packs de personnages
const AVATAR_STATES: AvatarState[] = ['down', 'tired', 'neutral', 'strong', 'legendary'];

// Labels français pour les états (correspondant aux niveaux de rang)
const STATE_LABELS: Record<AvatarState, string> = {
  down: 'Niveau 1',      // Ashigaru
  tired: 'Niveau 2',     // Bushi
  neutral: 'Niveau 3',   // Samurai
  strong: 'Niveau 4',    // Ronin
  legendary: 'Niveau 5', // Shogun
};

// ============================================================================
// TYPES
// ============================================================================

interface PackWithStatus {
  id: AvatarPack;
  name: string;
  type: 'character' | 'collection';
  requiredRankLevel: number;
  category: 'male' | 'female' | 'collection';
  isUnlocked: boolean;
  collectionCharacters?: CollectionCharacter[];
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function AvatarSelectionScreen() {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [selectedGender, setSelectedGender] = useState<AvatarGender>('male');
  const [currentPack, setCurrentPack] = useState<AvatarPack>('samurai');
  const [currentGender, setCurrentGender] = useState<AvatarGender>('male');
  const [currentCollectionCharacter, setCurrentCollectionCharacter] = useState<CollectionCharacter | undefined>();
  const [unlockedLevel, setUnlockedLevel] = useState<AvatarLevel>(1);
  const [packs, setPacks] = useState<PackWithStatus[]>([]);
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creatorModeActive, setCreatorModeActive] = useState(false);

  // Modal de prévisualisation
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);
  const [previewPack, setPreviewPack] = useState<AvatarPack | null>(null);
  const [previewPackInfo, setPreviewPackInfo] = useState<PackWithStatus | null>(null);
  const [previewState, setPreviewState] = useState<AvatarState | null>(null);
  const [previewCharacter, setPreviewCharacter] = useState<CollectionCharacter | null>(null);

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Vérifier si Mode Créateur actif
      const creatorMode = await AsyncStorage.getItem('@yoroi_creator_mode');
      const isCreator = creatorMode === 'true';
      setCreatorModeActive(isCreator);

      // Config actuelle
      const config = await getAvatarConfig();
      setCurrentPack(config.pack);
      setCurrentGender(config.gender);
      setSelectedGender(config.gender);
      setCurrentCollectionCharacter(config.collectionCharacter);

      // Niveau débloqué - Mode Créateur = tous débloqués (niveau 5)
      if (isCreator) {
        setUnlockedLevel(5 as AvatarLevel);
      } else {
        const level = await getUnlockedLevel();
        setUnlockedLevel(level);
      }

      // Liste des packs avec statuts de déblocage
      const allPacks = await getAllPacksWithUnlockStatus();
      setPacks(allPacks);

      // Progression
      const prog = await getLevelProgress();
      setProgress(prog);

      setIsLoading(false);
    } catch (error) {
      logger.error('[AvatarSelection] Erreur chargement:', error);
      setIsLoading(false);
    }
  };

  // Toggle genre
  const handleGenderToggle = (gender: AvatarGender) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSelectedGender(gender);
  };

  // Helper: nom du rang pour un niveau
  const levelToRankName = (level: AvatarLevel): string => {
    const names = ['Ashigaru', 'Bushi', 'Samouraï', 'Rōnin', 'Shōgun'];
    return `${names[level - 1] || 'Ashigaru'}`;
  };

  // Ouvrir la prévisualisation d'un avatar (pack de personnage)
  const openPreviewCharacter = (pack: AvatarPack, packInfo: PackWithStatus, state: AvatarState) => {
    if (!packInfo.isUnlocked) {
      showPopup(
        'Pack verrouillé',
        `Ce pack sera débloqué au rang ${levelToRankName(packInfo.requiredRankLevel as AvatarLevel)}. Continue ton entraînement pour le débloquer !`
      );
      return;
    }

    const image = getAvatarImage(pack, state, undefined, selectedGender);
    setPreviewImage(image);
    setPreviewPack(pack);
    setPreviewPackInfo(packInfo);
    setPreviewState(state);
    setPreviewCharacter(null);
    setPreviewModalVisible(true);
    impactAsync(ImpactFeedbackStyle.Light);
  };

  // Ouvrir la prévisualisation d'un personnage de collection
  const openPreviewCollection = (pack: AvatarPack, packInfo: PackWithStatus, character: CollectionCharacter) => {
    if (!packInfo.isUnlocked) {
      showPopup(
        'Pack verrouillé',
        `Ce pack sera débloqué au rang ${levelToRankName(packInfo.requiredRankLevel as AvatarLevel)}. Continue ton entraînement pour le débloquer !`
      );
      return;
    }

    const image = getAvatarImage(pack, undefined, character, selectedGender);
    setPreviewImage(image);
    setPreviewPack(pack);
    setPreviewPackInfo(packInfo);
    setPreviewState(null);
    setPreviewCharacter(character);
    setPreviewModalVisible(true);
    impactAsync(ImpactFeedbackStyle.Light);
  };

  // Confirmer la sélection depuis la prévisualisation
  const confirmSelection = async () => {
    if (!previewPack || !previewPackInfo) return;

    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      const success = previewCharacter
        ? await setFullAvatarConfig(previewPack, selectedGender, previewCharacter)
        : await setFullAvatarConfig(previewPack, selectedGender);

      if (!success) {
        showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
        return;
      }

      notificationAsync(NotificationFeedbackType.Success);
      setPreviewModalVisible(false);

      const label = previewState ? STATE_LABELS[previewState] : previewCharacter;
      showPopup(
        'Avatar équipé !',
        `Tu as équipé ${previewPackInfo.name} ${label} !`
      );

      await loadData();
    } catch (error) {
      logger.error('[AvatarSelection] Erreur confirmation:', error);
      showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
    }
  };

  // Sélection d'un état d'avatar (pack de personnage)
  const handleSelectCharacterState = async (pack: AvatarPack, packInfo: PackWithStatus, state: AvatarState) => {
    if (!packInfo.isUnlocked) {
      showPopup(
        'Pack verrouillé',
        `Ce pack sera débloqué au rang ${levelToRankName(packInfo.requiredRankLevel as AvatarLevel)}. Continue ton entraînement pour le débloquer !`
      );
      return;
    }

    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      const success = await setFullAvatarConfig(pack, selectedGender);

      if (!success) {
        showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
        return;
      }

      notificationAsync(NotificationFeedbackType.Success);
      showPopup(
        'Avatar équipé !',
        `Tu es maintenant ${packInfo.name} ${STATE_LABELS[state]} !`
      );

      // Recharger les données
      await loadData();
    } catch (error) {
      logger.error('[AvatarSelection] Erreur sélection:', error);
      showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
    }
  };

  // Sélection d'un personnage de collection
  const handleSelectCollectionCharacter = async (pack: AvatarPack, packInfo: PackWithStatus, character: CollectionCharacter) => {
    if (!packInfo.isUnlocked) {
      showPopup(
        'Pack verrouillé',
        `Ce pack sera débloqué au rang ${levelToRankName(packInfo.requiredRankLevel as AvatarLevel)}. Continue ton entraînement pour le débloquer !`
      );
      return;
    }

    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      const success = await setFullAvatarConfig(pack, selectedGender, character);

      if (!success) {
        showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
        return;
      }

      notificationAsync(NotificationFeedbackType.Success);
      showPopup(
        'Avatar équipé !',
        `Tu as équipé ${character} !`
      );

      await loadData();
    } catch (error) {
      logger.error('[AvatarSelection] Erreur sélection:', error);
      showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
    }
  };

  // Rendu d'un état d'avatar (pour pack de personnage)
  const renderAvatarState = (pack: AvatarPack, packInfo: PackWithStatus, state: AvatarState) => {
    const isUnlocked = packInfo.isUnlocked;
    const isCurrent = pack === currentPack && selectedGender === currentGender;

    const image = getAvatarImage(pack, state, undefined, selectedGender);

    // DEBUG: Log image loading
    if (!image) {
      logger.warn(`[AvatarSelection] No image for ${pack}/${state}/${selectedGender}`);
    }

    return (
      <TouchableOpacity
        key={`${pack}-${state}`}
        onPress={() => openPreviewCharacter(pack, packInfo, state)}
        style={[
          styles.avatarContainer,
          {
            width: AVATAR_SIZE,
            height: AVATAR_SIZE + 30,
          },
        ]}
      >
        <View
          style={[
            styles.avatarCircle,
            {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              opacity: isUnlocked ? 1 : 0.4,
              borderColor: isCurrent ? '#FFD700' : 'transparent',
              borderWidth: isCurrent ? 3 : 0,
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
            },
          ]}
        >
          <Image
            source={image || TEST_IMAGE}
            style={{
              width: AVATAR_SIZE - 4,
              height: AVATAR_SIZE - 4,
            }}
            resizeMode="contain"
            onError={(e) => logger.warn(`[AvatarSelection] Image error for ${pack}/${state}: ${e.nativeEvent.error}`)}
          />

          {/* Cadenas si verrouillé */}
          {!isUnlocked && (
            <View style={styles.lockOverlayCircle}>
              <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
            </View>
          )}

          {/* Badge actuel */}
          {isCurrent && (
            <View style={styles.currentBadgeCircle}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            </View>
          )}
        </View>

        {/* Nom de l'état */}
        <Text
          style={[
            styles.stateText,
            {
              color: isUnlocked ? colors.text : colors.textSecondary,
            },
          ]}
          numberOfLines={1}
        >
          {STATE_LABELS[state]}
        </Text>
      </TouchableOpacity>
    );
  };

  // Rendu d'un personnage de collection
  const renderCollectionCharacter = (pack: AvatarPack, packInfo: PackWithStatus, character: CollectionCharacter) => {
    const isUnlocked = packInfo.isUnlocked;
    const isCurrent = pack === currentPack && character === currentCollectionCharacter && selectedGender === currentGender;

    const image = getAvatarImage(pack, undefined, character, selectedGender);

    return (
      <TouchableOpacity
        key={`${pack}-${character}`}
        onPress={() => openPreviewCollection(pack, packInfo, character)}
        style={[
          styles.avatarContainer,
          {
            width: AVATAR_SIZE,
            height: AVATAR_SIZE + 30,
          },
        ]}
      >
        <View
          style={[
            styles.avatarCircle,
            {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              opacity: isUnlocked ? 1 : 0.4,
              borderColor: isCurrent ? '#FFD700' : 'transparent',
              borderWidth: isCurrent ? 3 : 0,
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
            },
          ]}
        >
          <Image
            source={image || TEST_IMAGE}
            style={{
              width: AVATAR_SIZE - 4,
              height: AVATAR_SIZE - 4,
            }}
            resizeMode="contain"
            onError={(e) => logger.warn(`[AvatarSelection] Collection image error for ${pack}/${character}: ${e.nativeEvent.error}`)}
          />

          {/* Cadenas si verrouillé */}
          {!isUnlocked && (
            <View style={styles.lockOverlayCircle}>
              <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
            </View>
          )}

          {/* Badge actuel */}
          {isCurrent && (
            <View style={styles.currentBadgeCircle}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            </View>
          )}
        </View>

        {/* Nom du personnage */}
        <Text
          style={[
            styles.stateText,
            {
              color: isUnlocked ? colors.text : colors.textSecondary,
            },
          ]}
          numberOfLines={1}
        >
          {character}
        </Text>
      </TouchableOpacity>
    );
  };

  // Rendu d'une section de pack
  const renderPackSection = (packInfo: PackWithStatus) => {
    const packType = getPackType(packInfo.id);

    return (
      <View key={packInfo.id} style={styles.packSection}>
        {/* Header du pack */}
        <View style={styles.packHeader}>
          <Text style={[styles.packTitle, { color: colors.text }]}>{packInfo.name}</Text>

          {!packInfo.isUnlocked && (
            <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
          )}
        </View>

        {/* Grille d'avatars */}
        <View style={styles.avatarGrid}>
          {packType === 'character' ? (
            // Afficher les 5 états
            AVATAR_STATES.map((state) => renderAvatarState(packInfo.id, packInfo, state))
          ) : (
            // Afficher les 5 personnages de collection
            getCollectionCharacters(packInfo.id).map((character) =>
              renderCollectionCharacter(packInfo.id, packInfo, character)
            )
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Sélection Avatar' }} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Sélection Avatar',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Toggle Homme/Femme */}
        <View style={styles.genderToggleContainer}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              selectedGender === 'male' && styles.genderButtonActive,
              { backgroundColor: selectedGender === 'male' ? '#3B82F6' : colors.border },
            ]}
            onPress={() => handleGenderToggle('male')}
          >
            <Ionicons
              name="male"
              size={24}
              color={selectedGender === 'male' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.genderButtonText,
                { color: selectedGender === 'male' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Homme
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderButton,
              selectedGender === 'female' && styles.genderButtonActive,
              { backgroundColor: selectedGender === 'female' ? '#EC4899' : colors.border },
            ]}
            onPress={() => handleGenderToggle('female')}
          >
            <Ionicons
              name="female"
              size={24}
              color={selectedGender === 'female' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.genderButtonText,
                { color: selectedGender === 'female' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Femme
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progression actuelle */}
        {progress && (
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>
                Niveau actuel
              </Text>
              <Text style={[styles.progressLevel, { color: '#FFD700' }]}>
                {levelToRankName(progress.currentLevel)} ({progress.currentLevel}/5)
              </Text>
            </View>

            {progress.nextLevel && (
              <>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progress.percentage}%`,
                        backgroundColor: '#3B82F6',
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.progressInfo, { color: colors.textSecondary }]}>
                  {progress.daysToNext} jours restants pour atteindre{' '}
                  {levelToRankName(progress.nextLevel)}
                </Text>
              </>
            )}

            {!progress.nextLevel && (
              <Text style={[styles.progressInfo, { color: '#10B981' }]}>
                Rang maximum atteint !
              </Text>
            )}
          </View>
        )}

        {/* Tous les packs - filtrés par genre */}
        {packs
          .filter((packInfo) => {
            // Si Femme est sélectionné, montrer UNIQUEMENT les packs féminins
            if (selectedGender === 'female') {
              return packInfo.category === 'female';
            }
            // Si Homme est sélectionné, montrer les packs masculins et de collection mixte
            return packInfo.category === 'male' || packInfo.category === 'collection';
          })
          .map((packInfo) => renderPackSection(packInfo))}

        {/* Info déblocage */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {creatorModeActive
              ? '⚙️ Mode Créateur actif - Tous les avatars sont débloqués !'
              : 'Les avatars se débloquent en montant de rang dans le Dojo. Utilise le toggle Homme/Femme en haut pour voir les avatars correspondants. Chaque pack contient 5 variations de niveau !'}
          </Text>
        </View>
      </ScrollView>

      {/* Modal de prévisualisation */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={[styles.previewContent, { backgroundColor: colors.card }]}>
            {/* Fermer */}
            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setPreviewModalVisible(false)}
            >
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Cercle blanc avec avatar agrandi */}
            <View style={styles.previewCircle}>
              <Image
                source={previewImage || TEST_IMAGE}
                style={styles.previewImage}
                resizeMode="cover"
                onError={(e) => logger.warn(`[AvatarSelection] Preview image error: ${e.nativeEvent.error}`)}
              />
            </View>

            {/* Nom du pack et niveau */}
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {previewPackInfo?.name}
            </Text>
            <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
              {previewState ? STATE_LABELS[previewState] : previewCharacter}
            </Text>

            {/* Bouton de validation */}
            <TouchableOpacity
              style={styles.previewValidateButton}
              onPress={confirmSelection}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.previewValidateText}>Équiper cet avatar</Text>
            </TouchableOpacity>

            {/* Bouton annuler */}
            <TouchableOpacity
              style={[styles.previewCancelButton, { borderColor: colors.border }]}
              onPress={() => setPreviewModalVisible(false)}
            >
              <Text style={[styles.previewCancelText, { color: colors.textSecondary }]}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PopupComponent />
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  genderToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  genderButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressLevel: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressInfo: {
    fontSize: 14,
    textAlign: 'center',
  },
  packSection: {
    marginBottom: 32,
  },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  packTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarCircle: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockOverlayCircle: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBadgeCircle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 2,
  },
  stateText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal de prévisualisation
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
  previewCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  previewImage: {
    width: 180,
    height: 180,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  previewValidateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  previewValidateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  previewCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
