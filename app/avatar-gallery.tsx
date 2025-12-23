// ============================================
// ⚔️ YOROI - GALERIE D'AVATARS
// ============================================

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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Lock, Check, Crown, Sparkles, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useDevMode } from '@/lib/DevModeContext';
import {
  avatarGalleryService,
  AVATAR_PACKS,
  AvatarPack,
} from '@/lib/avatarGalleryService';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { getWeights, getTrainings, getPhotos } from '@/lib/database';
import { checkAchievement } from '@/lib/achievements';
import { POINTS_ACTIONS } from '@/lib/gamification';
import { calculateStreak } from '@/lib/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

export default function AvatarGalleryScreen() {
  const { colors } = useTheme();
  const { isPro } = useDevMode();
  const [selectedPack, setSelectedPackState] = useState('samurai');
  const [userXP, setUserXP] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'martial' | 'legend' | 'special'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Charger le pack sélectionné
      const pack = await avatarGalleryService.getSelectedPack();
      setSelectedPackState(pack);

      // Calculer l'XP et charger les données
      const [weights, trainings, photos, streak] = await Promise.all([
        getWeights(),
        getTrainings(),
        getPhotos(),
        calculateStreak(),
      ]);

      // Calcul simplifié de l'XP
      const calculatedXP =
        weights.length * POINTS_ACTIONS.peser +
        trainings.length * POINTS_ACTIONS.entrainement +
        photos.length * POINTS_ACTIONS.photo;

      setUserXP(calculatedXP);

      // Calculer les achievements débloqués (simplifié)
      const weightLost = weights.length > 0
        ? (weights[0].weight || 0) - (weights[weights.length - 1]?.weight || 0)
        : 0;

      const unlocked: string[] = [];
      if (checkAchievement('hundred_trainings', { trainings: trainings.length })) {
        unlocked.push('hundred_trainings');
      }
      if (checkAchievement('year_streak', { streak })) {
        unlocked.push('year_streak');
      }

      setUnlockedAchievements(unlocked);
    } catch (error) {
      console.error('[AvatarGallery] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePackSelect = async (pack: AvatarPack) => {
    // Vérifier si débloqué
    if (!avatarGalleryService.isPackUnlocked(pack.id, userXP, unlockedAchievements, isPro)) {
      let message = `Débloquez cet avatar en atteignant ${pack.unlockXP} XP.`;
      if (pack.unlockAchievement) {
        message += `\nAchievement requis: ${pack.unlockAchievement}`;
      }
      message += `\n\nVous avez actuellement ${userXP} XP.`;
      message += '\n\nMode Créateur : Tapez 5 fois sur "Version 1.0.0" dans les Réglages et entrez le code 2412.';

      Alert.alert('🔒 Avatar verrouillé', message, [{ text: 'OK' }]);
      return;
    }

    // Rediriger vers la page de détail du pack
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/avatar-pack-detail?packId=${pack.id}`);
    } catch (error) {
      console.error('[AvatarGallery] Erreur navigation:', error);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Chargement...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const filteredPacks = filter === 'all'
    ? AVATAR_PACKS
    : avatarGalleryService.getPacksByCategory(filter as any);

  const unlockedPacks = avatarGalleryService.getUnlockedPacks(userXP, unlockedAchievements, isPro);
  const nextPack = avatarGalleryService.getNextPackToUnlock(userXP, unlockedAchievements, isPro);

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Bouton retour + En-tête */}
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
                Galerie d'Avatars
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {unlockedPacks.length}/{AVATAR_PACKS.length} débloqués • {userXP} XP
              </Text>
            </View>
          </View>
        </View>

        {/* Filtres */}
        <View style={styles.filters}>
          {[
            { id: 'all', label: 'Tous' },
            { id: 'martial', label: 'Arts Martiaux' },
            { id: 'legend', label: 'Légendes' },
            { id: 'special', label: 'Spéciaux' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterButton,
                { backgroundColor: colors.backgroundCard },
                filter === f.id && { backgroundColor: colors.accent },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f.id as any);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: filter === f.id ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grille d'avatars */}
        <View style={styles.grid}>
          {filteredPacks.map((pack) => {
            const isUnlocked = avatarGalleryService.isPackUnlocked(
              pack.id,
              userXP,
              unlockedAchievements,
              isPro
            );
            const isSelected = selectedPack === pack.id;
            const images = avatarGalleryService.getPackImages(pack.id);

            return (
              <TouchableOpacity
                key={pack.id}
                style={[
                  styles.packCard,
                  { backgroundColor: colors.backgroundCard },
                  isSelected && {
                    borderColor: colors.accent,
                    borderWidth: 2,
                  },
                  !isUnlocked && { opacity: 0.6 },
                ]}
                onPress={() => handlePackSelect(pack)}
                activeOpacity={0.7}
              >
                {/* Miniatures des 5 avatars */}
                <View style={styles.avatarsRow}>
                  {['legendary', 'strong', 'neutral', 'tired', 'down'].map((state) => (
                    <View
                      key={state}
                      style={[
                        styles.miniAvatar,
                        { backgroundColor: '#FFFFFF' }
                      ]}
                    >
                      {images?.[state as keyof typeof images] ? (
                        <Image
                          source={images[state as keyof typeof images]}
                          style={styles.miniAvatarImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.miniAvatarIcon}>{pack.icon}</Text>
                      )}
                    </View>
                  ))}
                </View>

                {/* Infos */}
                <View style={styles.packInfo}>
                  <Text style={[styles.packName, { color: colors.textPrimary }]}>
                    {pack.name}
                  </Text>
                  <Text style={[styles.packDescription, { color: colors.textMuted }]}>
                    {pack.description}
                  </Text>
                </View>

                {/* XP requis */}
                {!isUnlocked && (
                  <View style={styles.lockContainer}>
                    <Lock size={16} color={colors.textMuted} />
                    <Text style={[styles.lockText, { color: colors.textMuted }]}>
                      {pack.unlockXP} XP
                    </Text>
                  </View>
                )}

                {/* Badge sélectionné */}
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
                    <Check size={16} color="#FFFFFF" />
                  </View>
                )}

                {/* Badge catégorie */}
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor:
                        pack.category === 'legend'
                          ? colors.accent
                          : pack.category === 'special'
                          ? '#8B5CF6'
                          : colors.backgroundElevated,
                    },
                  ]}
                >
                  <Text style={styles.categoryText}>
                    {pack.category === 'martial' && '🥋'}
                    {pack.category === 'legend' && '👑'}
                    {pack.category === 'special' && '⭐'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Prochain déblocage */}
        {nextPack && (
          <View style={[styles.nextUnlock, { backgroundColor: colors.backgroundCard }]}>
            <Crown size={20} color={colors.accent} />
            <View style={styles.nextUnlockInfo}>
              <Text style={[styles.nextUnlockTitle, { color: colors.textPrimary }]}>
                Prochain déblocage
              </Text>
              <Text style={[styles.nextUnlockText, { color: colors.textMuted }]}>
                {nextPack.name} {nextPack.icon} dans {nextPack.unlockXP - userXP} XP
              </Text>
            </View>
          </View>
        )}
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
    marginBottom: SPACING.md,
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
  filters: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  packCard: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    position: 'relative',
  },
  avatarsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  miniAvatar: {
    flex: 1,
    aspectRatio: 3/4,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarImage: {
    width: '100%',
    height: '100%',
  },
  miniAvatarIcon: {
    fontSize: 20,
  },
  packInfo: {
    marginTop: SPACING.xs,
  },
  packName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  packDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
  lockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  lockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 12,
  },
  nextUnlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  nextUnlockInfo: {
    flex: 1,
  },
  nextUnlockTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  nextUnlockText: {
    fontSize: 13,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
