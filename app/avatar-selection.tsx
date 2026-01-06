/**
 * avatar-selection.tsx
 * Nouvelle galerie d'avatars YOROI V2
 *
 * Interface pour sélectionner son avatar parmi les 2 packs (Samurai, Ninja)
 * avec 9 niveaux de progression basés sur les rangs du Dojo
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
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  getAvatarConfig,
  setFullAvatarConfig,
  getAllAvatarUnlockInfo,
  getUnlockedLevel,
  getLevelProgress,
  getAvatarImage,
  type AvatarPack,
  type AvatarGender,
  type AvatarLevel,
  type AvatarUnlockInfo,
  type LevelProgress,
} from '@/lib/avatarSystem';
import { useTheme } from '@/lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = (width - 80) / 5; // 5 avatars par ligne sur mobile

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function AvatarSelectionScreen() {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [selectedGender, setSelectedGender] = useState<AvatarGender>('male');
  const [currentPack, setCurrentPack] = useState<AvatarPack>('samurai');
  const [currentGender, setCurrentGender] = useState<AvatarGender>('male');
  const [currentLevel, setCurrentLevel] = useState<AvatarLevel>(1); // Niveau actuellement équipé
  const [unlockedLevel, setUnlockedLevel] = useState<AvatarLevel>(1); // Niveau max débloqué
  const [unlockInfo, setUnlockInfo] = useState<AvatarUnlockInfo[]>([]);
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

      // Config actuelle (inclut le niveau choisi par l'utilisateur)
      const config = await getAvatarConfig();
      setCurrentPack(config.pack);
      setCurrentGender(config.gender);
      setCurrentLevel(config.level); // Niveau actuellement équipé
      setSelectedGender(config.gender);

      // Niveau débloqué - Mode Créateur = tous débloqués (niveau 9)
      if (isCreator) {
        setUnlockedLevel(9 as AvatarLevel);
      } else {
        const level = await getUnlockedLevel();
        setUnlockedLevel(level);
      }

      // Infos de déblocage
      const info = await getAllAvatarUnlockInfo();
      setUnlockInfo(info);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGender(gender);
  };

  // Sélection d'avatar
  const handleSelectAvatar = async (pack: AvatarPack, gender: AvatarGender, level: AvatarLevel) => {
    // Vérifier si débloqué
    if (level > unlockedLevel) {
      showPopup(
        'Avatar verrouille',
        `Cet avatar sera debloque au rang ${levelToRankName(level)}. Continue ton entrainement pour le debloquer !`
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Sauvegarder le pack, genre ET le niveau choisi
      const success = await setFullAvatarConfig(pack, gender, level);

      if (!success) {
        showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showPopup(
        'Avatar equipe !',
        `Tu es maintenant un ${pack === 'samurai' ? 'Samourai' : 'Ninja'} ${gender === 'male' ? '' : 'femme '}${levelToRankName(level)}.`
      );
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      logger.error('[AvatarSelection] Erreur sélection:', error);
      showPopup('Erreur', 'Impossible de sauvegarder l\'avatar.');
    }
  };

  // Helper: nom du rang pour un niveau
  const levelToRankName = (level: AvatarLevel): string => {
    const names = [
      'Recrue',
      'Ashigaru',
      'Bushi',
      'Chevalier',
      'Samouraï',
      'Rōnin',
      'Sensei',
      'Shōgun',
      'Daimyō',
    ];
    return names[level - 1] || 'Recrue';
  };

  // Rendu d'un avatar
  const renderAvatar = (pack: AvatarPack, level: AvatarLevel) => {
    const isUnlocked = level <= unlockedLevel;
    // Un avatar est "current" s'il correspond au pack, genre ET niveau actuellement équipés
    const isCurrent = pack === currentPack && selectedGender === currentGender && level === currentLevel;

    const image = getAvatarImage(pack, selectedGender, level);

    return (
      <TouchableOpacity
        key={`${pack}-${selectedGender}-${level}`}
        onPress={() => handleSelectAvatar(pack, selectedGender, level)}
        disabled={!isUnlocked}
        style={[
          styles.avatarContainer,
          {
            width: AVATAR_SIZE,
            height: (AVATAR_SIZE * 1.5) + 30, // Ajusté pour le format rectangulaire
          },
        ]}
      >
        <View
          style={[
            styles.avatarImageContainer,
            {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE * 1.5, // Format rectangulaire pour voir l'avatar en entier
              opacity: isUnlocked ? 1 : 0.3,
              borderColor: isCurrent ? '#FFD700' : isDark ? '#374151' : '#D1D5DB',
              borderWidth: isCurrent ? 3 : 2,
            },
          ]}
        >
          {image && (
            <Image
              source={image}
              style={{
                width: AVATAR_SIZE - 8,
                height: (AVATAR_SIZE * 1.5) - 8,
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
        </View>

        {/* Nom du niveau */}
        <Text
          style={[
            styles.levelText,
            {
              color: isUnlocked ? colors.text : colors.textSecondary,
            },
          ]}
          numberOfLines={1}
        >
          {levelToRankName(level)}
        </Text>
      </TouchableOpacity>
    );
  };

  // Rendu d'une section de pack
  const renderPackSection = (pack: AvatarPack) => {
    const packName = pack === 'samurai' ? 'Samouraï' : 'Ninja';

    return (
      <View key={pack} style={styles.packSection}>
        {/* Header du pack */}
        <View style={styles.packHeader}>
          <Text style={[styles.packTitle, { color: colors.text }]}>{packName}</Text>
        </View>

        {/* Grille d'avatars */}
        <View style={styles.avatarGrid}>
          {([1, 2, 3, 4, 5, 6, 7, 8, 9] as AvatarLevel[]).map((level) =>
            renderAvatar(pack, level)
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
                {levelToRankName(progress.currentLevel)} ({progress.currentLevel}/9)
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

        {/* Sections des packs */}
        {renderPackSection('samurai')}
        {renderPackSection('ninja')}

        {/* Info déblocage */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {creatorModeActive
              ? '⚙️ Mode Créateur actif - Tous les avatars sont débloqués !'
              : 'Les avatars se débloquent automatiquement en montant de rang dans le Dojo. Continue ton entraînement quotidien pour débloquer de nouveaux avatars !'}
          </Text>
        </View>
      </ScrollView>
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
  packIcon: {
    fontSize: 32,
  },
  packTitle: {
    fontSize: 24,
    fontWeight: '700',
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
  avatarImageContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
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
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 2,
  },
  levelText: {
    fontSize: 12,
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
});
