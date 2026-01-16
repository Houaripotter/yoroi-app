/**
 * avatar-selection-v3.tsx
 * Nouvelle galerie d'avatars YOROI V3
 *
 * Interface pour sélectionner son avatar parmi les 16 packs disponibles
 * - 13 packs de personnages avec états dynamiques
 * - 3 packs de collection avec choix de personnages
 * - Déblocage progressif basé sur les rangs du Dojo
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
import * as Haptics from 'expo-haptics';

import {
  getAvatarConfig,
  setFullAvatarConfig,
  getAllPacksWithUnlockStatus,
  getAvatarImage,
  getPackType,
  getCollectionCharacters,
  getPackName,
  type AvatarPack,
  type AvatarGender,
  type CollectionCharacter,
  type AvatarPackType,
} from '@/lib/avatarSystem';
import { useTheme } from '@/lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const { width } = Dimensions.get('window');
const PACK_SIZE = (width - 60) / 3; // 3 packs par ligne

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function AvatarSelectionV3Screen() {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [selectedGender, setSelectedGender] = useState<AvatarGender>('male');
  const [currentPack, setCurrentPack] = useState<AvatarPack>('samurai');
  const [currentCharacter, setCurrentCharacter] = useState<CollectionCharacter | undefined>();
  const [packs, setPacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedCollectionPack, setSelectedCollectionPack] = useState<AvatarPack | null>(null);
  const [creatorModeActive, setCreatorModeActive] = useState(false);

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
      setCurrentCharacter(config.collectionCharacter);
      setSelectedGender(config.gender);

      // Packs disponibles avec statut de déblocage
      const allPacks = await getAllPacksWithUnlockStatus();
      setPacks(allPacks);

      setIsLoading(false);
    } catch (error) {
      logger.error('[AvatarSelectionV3] Erreur chargement:', error);
      setIsLoading(false);
    }
  };

  // Toggle genre
  const handleGenderToggle = (gender: AvatarGender) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGender(gender);
  };

  // Sélection d'un pack
  const handleSelectPack = async (pack: AvatarPack, isUnlocked: boolean, packType: AvatarPackType) => {
    if (!isUnlocked) {
      const packData = packs.find((p) => p.id === pack);
      showPopup(
        'Pack verrouillé',
        `Ce pack sera débloqué au rang ${packData?.requiredRankLevel}. Continue ton entraînement pour le débloquer !`
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (packType === 'collection') {
      // Ouvrir le modal pour choisir un personnage
      setSelectedCollectionPack(pack);
      setShowCollectionModal(true);
    } else {
      // Sauvegarder directement pour un pack character
      await saveAvatarSelection(pack, selectedGender, undefined);
    }
  };

  // Sélection d'un personnage de collection
  const handleSelectCollectionCharacter = async (character: CollectionCharacter) => {
    if (!selectedCollectionPack) return;

    await saveAvatarSelection(selectedCollectionPack, selectedGender, character);
    setShowCollectionModal(false);
    setSelectedCollectionPack(null);
  };

  // Sauvegarder la sélection
  const saveAvatarSelection = async (
    pack: AvatarPack,
    gender: AvatarGender,
    collectionCharacter?: CollectionCharacter
  ) => {
    try {
      const success = await setFullAvatarConfig(pack, gender, collectionCharacter);

      if (!success) {
        showPopup('Erreur', "Impossible de sauvegarder l'avatar.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const packName = getPackName(pack);
      const characterName = collectionCharacter ? ` (${collectionCharacter})` : '';
      showPopup('Avatar équipé !', `Tu es maintenant ${packName}${characterName}.`);

      // Recharger les données
      await loadData();

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      logger.error('[AvatarSelectionV3] Erreur sélection:', error);
      showPopup('Erreur', "Impossible de sauvegarder l'avatar.");
    }
  };

  // Rendu d'un pack
  const renderPack = (pack: any) => {
    const isUnlocked = pack.isUnlocked || creatorModeActive;
    const isCurrent = pack.id === currentPack;
    const packType = getPackType(pack.id);

    // Obtenir l'image de preview (neutral pour character, premier personnage pour collection)
    let previewImage;
    if (packType === 'character') {
      previewImage = getAvatarImage(pack.id, 'neutral');
    } else {
      const characters = getCollectionCharacters(pack.id);
      if (characters.length > 0) {
        previewImage = getAvatarImage(pack.id, undefined, characters[0]);
      }
    }

    return (
      <TouchableOpacity
        key={pack.id}
        onPress={() => handleSelectPack(pack.id, isUnlocked, packType)}
        disabled={!isUnlocked}
        style={[
          styles.packContainer,
          {
            width: PACK_SIZE,
            opacity: isUnlocked ? 1 : 0.4,
          },
        ]}
      >
        <View
          style={[
            styles.packImageContainer,
            {
              width: PACK_SIZE - 16,
              height: (PACK_SIZE - 16) * 1.2,
              borderColor: isCurrent ? '#FFD700' : isDark ? '#374151' : '#D1D5DB',
              borderWidth: isCurrent ? 3 : 2,
              backgroundColor: colors.card,
            },
          ]}
        >
          {previewImage && (
            <Image
              source={previewImage}
              style={{
                width: (PACK_SIZE - 16) * 0.8,
                height: (PACK_SIZE - 16) * 1.0,
              }}
              resizeMode="contain"
            />
          )}

          {/* Cadenas si verrouillé */}
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
            </View>
          )}

          {/* Badge actuel */}
          {isCurrent && (
            <View style={styles.currentBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          )}

          {/* Badge collection */}
          {packType === 'collection' && (
            <View style={styles.collectionBadge}>
              <Ionicons name="albums" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Nom du pack */}
        <Text
          style={[
            styles.packName,
            {
              color: isUnlocked ? colors.text : colors.textSecondary,
            },
          ]}
          numberOfLines={1}
        >
          {pack.name}
        </Text>

        {/* Rang requis si verrouillé */}
        {!isUnlocked && (
          <Text
            style={[
              styles.requiredRank,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Rang {pack.requiredRankLevel}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Modal de sélection de personnage de collection
  const renderCollectionModal = () => {
    if (!selectedCollectionPack) return null;

    const characters = getCollectionCharacters(selectedCollectionPack);
    const packName = getPackName(selectedCollectionPack);

    return (
      <Modal
        visible={showCollectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCollectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Choisis ton {packName}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCollectionModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.characterGrid}>
              {characters.map((character) => {
                const image = getAvatarImage(selectedCollectionPack, undefined, character);
                const isCurrent = character === currentCharacter && selectedCollectionPack === currentPack;

                return (
                  <TouchableOpacity
                    key={character}
                    onPress={() => handleSelectCollectionCharacter(character)}
                    style={[
                      styles.characterContainer,
                      {
                        borderColor: isCurrent ? '#FFD700' : isDark ? '#374151' : '#D1D5DB',
                        borderWidth: isCurrent ? 3 : 2,
                      },
                    ]}
                  >
                    {image && (
                      <Image
                        source={image}
                        style={styles.characterImage}
                        resizeMode="contain"
                      />
                    )}

                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      </View>
                    )}

                    <Text
                      style={[styles.characterName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {character}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

        {/* Grille des packs */}
        <View style={styles.packGrid}>
          {packs.map((pack) => renderPack(pack))}
        </View>

        {/* Info déblocage */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {creatorModeActive
              ? '⚙️ Mode Créateur actif - Tous les avatars sont débloqués !'
              : 'Les packs se débloquent automatiquement en montant de rang dans le Dojo. Continue ton entraînement quotidien pour débloquer de nouveaux avatars !'}
          </Text>
        </View>

        {/* Info états dynamiques */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, marginTop: 16 }]}>
          <Ionicons name="flash" size={24} color="#FFD700" />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Ton avatar change d'état selon ta forme physique : Strong quand tu es en forme, Tired 😴 quand tu es fatigué, Legendary pour les hauts niveaux !
          </Text>
        </View>
      </ScrollView>

      {/* Modal de sélection de personnage */}
      {renderCollectionModal()}

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
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  packContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  packImageContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 2,
  },
  collectionBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 999,
    padding: 4,
  },
  packName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  requiredRank: {
    fontSize: 10,
    marginTop: 2,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  characterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  characterContainer: {
    width: 100,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    position: 'relative',
  },
  characterImage: {
    width: 80,
    height: 80,
  },
  characterName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
