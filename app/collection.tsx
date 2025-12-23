// ============================================
// YOROI - COLLECTION SCREEN
// ============================================
// Ecran "Collection" style Pokedex
// Affiche tous les avatars organises par rarete
// Design Liquid Glass

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Lock,
  Star,
  Check,
  ShoppingBag,
  Crown,
  X,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/lib/ThemeContext';
import { useAvatar } from '@/hooks/useAvatar';
import {
  AVATARS,
  PACKS,
  RARITY_COLORS,
  AvatarData,
  AvatarRarity,
  getAvatarPreviewImage,
  formatConditionText,
  getConditionProgress,
} from '@/services/AvatarService';

// ============================================
// TYPES
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = (SCREEN_WIDTH - 80) / 3;

type SelectedAvatar = (AvatarData & { isUnlocked: boolean }) | null;

// ============================================
// COMPOSANT AVATAR CARD
// ============================================

interface AvatarCardProps {
  avatar: AvatarData & { isUnlocked: boolean };
  onPress: () => void;
  isEquipped: boolean;
}

const AvatarCard: React.FC<AvatarCardProps> = ({ avatar, onPress, isEquipped }) => {
  const { colors, isDark } = useTheme();
  const rarityColors = RARITY_COLORS[avatar.rarity];

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.avatarCard,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderColor: isEquipped ? colors.gold : avatar.isUnlocked ? rarityColors.border : colors.border,
          borderWidth: isEquipped ? 2 : 1,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Image de l'avatar */}
      <View
        style={[
          styles.avatarImageContainer,
          {
            borderColor: avatar.isUnlocked ? rarityColors.border : 'transparent',
          },
        ]}
      >
        {avatar.isUnlocked ? (
          <Image
            source={getAvatarPreviewImage(avatar.id)}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.lockedOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
            <Image
              source={getAvatarPreviewImage(avatar.id)}
              style={[styles.avatarImage, { opacity: 0.3 }]}
              resizeMode="cover"
            />
            <View style={styles.lockIconContainer}>
              <Lock size={24} color={colors.textMuted} />
            </View>
          </View>
        )}
      </View>

      {/* Badge equipe */}
      {isEquipped && (
        <View style={[styles.equippedBadge, { backgroundColor: colors.gold }]}>
          <Check size={12} color={colors.background} strokeWidth={3} />
        </View>
      )}

      {/* Badge premium */}
      {!avatar.isUnlocked && avatar.premium && (
        <View style={[styles.premiumBadge, { backgroundColor: colors.gold }]}>
          <Crown size={10} color={colors.background} />
        </View>
      )}

      {/* Nom */}
      <Text
        style={[
          styles.avatarName,
          {
            color: avatar.isUnlocked ? colors.textPrimary : colors.textMuted,
          },
        ]}
        numberOfLines={1}
      >
        {avatar.isUnlocked ? avatar.name : '???'}
      </Text>
    </TouchableOpacity>
  );
};

// ============================================
// COMPOSANT PACK CARD
// ============================================

interface PackCardProps {
  packId: string;
  isPurchased: boolean;
  onPress: () => void;
}

const PackCard: React.FC<PackCardProps> = ({ packId, isPurchased, onPress }) => {
  const { colors, isDark } = useTheme();
  const pack = PACKS[packId];
  if (!pack) return null;

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  // Previsualiser les avatars du pack
  const previewAvatars = pack.avatars.slice(0, 3);

  return (
    <TouchableOpacity
      style={[
        styles.packCard,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderColor: isPurchased ? colors.success : colors.gold,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isPurchased}
    >
      {/* Images de preview */}
      <View style={styles.packPreview}>
        {previewAvatars.map((avatarId, index) => (
          <Image
            key={avatarId}
            source={getAvatarPreviewImage(avatarId)}
            style={[
              styles.packPreviewImage,
              {
                marginLeft: index > 0 ? -20 : 0,
                zIndex: previewAvatars.length - index,
                opacity: isPurchased ? 1 : 0.7,
              },
            ]}
            resizeMode="cover"
          />
        ))}
      </View>

      {/* Infos */}
      <View style={styles.packInfo}>
        <Text style={[styles.packName, { color: colors.textPrimary }]}>
          {pack.name}
        </Text>
        <Text style={[styles.packCount, { color: colors.textSecondary }]}>
          {pack.avatars.length} guerriers
        </Text>
      </View>

      {/* Prix / Status */}
      {isPurchased ? (
        <View style={[styles.packPurchased, { backgroundColor: colors.successMuted }]}>
          <Check size={16} color={colors.success} />
          <Text style={[styles.packPurchasedText, { color: colors.success }]}>
            Debloque
          </Text>
        </View>
      ) : (
        <View style={[styles.packPrice, { backgroundColor: colors.goldMuted }]}>
          <Text style={[styles.packPriceText, { color: colors.gold }]}>
            {pack.price.toFixed(2)} EUR
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function CollectionScreen() {
  const { colors, isDark, gradients } = useTheme();
  const {
    currentAvatarId,
    avatarsByRarity,
    stats,
    userStats,
    refreshData,
    equipAvatar,
    isLoading,
    getProgress,
    purchasePack,
    purchaseAvatar,
  } = useAvatar();

  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasedPacks, setPurchasedPacks] = useState<string[]>([]);

  // Charger les packs achetes
  useEffect(() => {
    const loadPurchasedPacks = async () => {
      try {
        const { getPurchasedPacks } = await import('@/services/AvatarService');
        const packs = await getPurchasedPacks();
        setPurchasedPacks(packs);
      } catch (error) {
        console.error('Erreur chargement packs:', error);
      }
    };
    loadPurchasedPacks();
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // Ouvrir le modal d'un avatar
  const handleAvatarPress = (avatar: AvatarData & { isUnlocked: boolean }) => {
    setSelectedAvatar(avatar);
    setShowModal(true);
  };

  // Equiper un avatar
  const handleEquip = async () => {
    if (!selectedAvatar || !selectedAvatar.isUnlocked) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await equipAvatar(selectedAvatar.id);
    setShowModal(false);
  };

  // Acheter un pack (simulation)
  const handleBuyPack = async (packId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // TODO: Integrer avec un vrai systeme d'achat in-app
    console.log('Achat du pack:', packId);
    // Pour la demo, on debloque directement
    // await purchasePack(packId);
  };

  // Acheter un avatar premium (simulation)
  const handleBuyAvatar = async () => {
    if (!selectedAvatar || !selectedAvatar.premium) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // TODO: Integrer avec un vrai systeme d'achat in-app
    console.log('Achat de l\'avatar:', selectedAvatar.id);
    setShowModal(false);
  };

  // Ordre de rarete pour l'affichage
  const rarityOrder: AvatarRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SECRET'];

  // Labels des raretes
  const rarityLabels: Record<AvatarRarity, string> = {
    COMMON: 'Commun',
    UNCOMMON: 'Peu commun',
    RARE: 'Rare',
    EPIC: 'Epique',
    LEGENDARY: 'Legendaire',
    SECRET: 'Secret',
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            MA COLLECTION
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {stats?.unlocked || 0}/{stats?.total || 0} - {stats?.percentage || 0}%
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={stats?.percentage || 0}
          height={8}
          showLabel={false}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
      >
        {/* Sections par rarete */}
        {rarityOrder.map(rarity => {
          const avatars = avatarsByRarity[rarity];
          if (!avatars || avatars.length === 0) return null;

          const rarityColors = RARITY_COLORS[rarity];
          const unlockedCount = avatars.filter(a => a.isUnlocked).length;

          return (
            <View key={rarity} style={styles.section}>
              {/* Header de section */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionIcon, { color: rarityColors.border }]}>
                    {rarityColors.icon}
                  </Text>
                  <Text style={[styles.sectionTitle, { color: rarityColors.border }]}>
                    {rarityLabels[rarity]}
                  </Text>
                </View>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {unlockedCount}/{avatars.length}
                </Text>
              </View>

              {/* Grille d'avatars */}
              <View style={styles.grid}>
                {avatars.map(avatar => (
                  <AvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    onPress={() => handleAvatarPress(avatar)}
                    isEquipped={currentAvatarId === avatar.id}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {/* Section Packs Premium */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ShoppingBag size={20} color={colors.gold} />
              <Text style={[styles.sectionTitle, { color: colors.gold }]}>
                PACKS PREMIUM
              </Text>
            </View>
          </View>

          <View style={styles.packsContainer}>
            {Object.keys(PACKS).map(packId => (
              <PackCard
                key={packId}
                packId={packId}
                isPurchased={purchasedPacks.includes(packId)}
                onPress={() => handleBuyPack(packId)}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal detail avatar */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            {Platform.OS === 'ios' && (
              <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
          </TouchableOpacity>

          {/* Card */}
          {selectedAvatar && (
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? 'rgba(18, 18, 26, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                  borderColor: RARITY_COLORS[selectedAvatar.rarity].border,
                },
              ]}
            >
              {/* Bouton fermer */}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.card }]}
                onPress={() => setShowModal(false)}
              >
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              {/* Image */}
              <View
                style={[
                  styles.modalAvatarContainer,
                  {
                    borderColor: selectedAvatar.isUnlocked
                      ? RARITY_COLORS[selectedAvatar.rarity].border
                      : colors.border,
                    shadowColor: RARITY_COLORS[selectedAvatar.rarity].border,
                  },
                ]}
              >
                {selectedAvatar.isUnlocked ? (
                  <Image
                    source={getAvatarPreviewImage(selectedAvatar.id)}
                    style={styles.modalAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modalLockedOverlay}>
                    <Image
                      source={getAvatarPreviewImage(selectedAvatar.id)}
                      style={[styles.modalAvatarImage, { opacity: 0.3 }]}
                      resizeMode="cover"
                    />
                    <Lock size={48} color={colors.textMuted} style={styles.modalLockIcon} />
                  </View>
                )}
              </View>

              {/* Etoiles */}
              <View style={styles.modalStars}>
                {selectedAvatar.rarity === 'SECRET' ? (
                  <Text style={styles.modalSecretIcon}>{RARITY_COLORS.SECRET.icon}</Text>
                ) : (
                  Array.from({ length: RARITY_COLORS[selectedAvatar.rarity].stars }, (_, i) => (
                    <Star
                      key={i}
                      size={20}
                      color={RARITY_COLORS[selectedAvatar.rarity].border}
                      fill={selectedAvatar.isUnlocked ? RARITY_COLORS[selectedAvatar.rarity].border : 'transparent'}
                    />
                  ))
                )}
              </View>

              {/* Nom */}
              <Text style={[styles.modalName, { color: colors.textPrimary }]}>
                {selectedAvatar.isUnlocked ? selectedAvatar.name : '???'}
              </Text>

              {/* Rarete */}
              <Text
                style={[
                  styles.modalRarity,
                  { color: RARITY_COLORS[selectedAvatar.rarity].border },
                ]}
              >
                {rarityLabels[selectedAvatar.rarity]}
              </Text>

              {/* Condition / Prix */}
              {!selectedAvatar.isUnlocked && (
                <View style={styles.modalConditionContainer}>
                  {selectedAvatar.premium ? (
                    <View style={[styles.modalPremiumInfo, { backgroundColor: colors.goldMuted }]}>
                      <Crown size={16} color={colors.gold} />
                      <Text style={[styles.modalPremiumText, { color: colors.gold }]}>
                        {selectedAvatar.premium.toFixed(2)} EUR
                      </Text>
                    </View>
                  ) : selectedAvatar.pack ? (
                    <View style={[styles.modalPackInfo, { backgroundColor: colors.infoMuted }]}>
                      <ShoppingBag size={16} color={colors.info} />
                      <Text style={[styles.modalPackText, { color: colors.info }]}>
                        Inclus dans le {PACKS[selectedAvatar.pack]?.name || 'Pack'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modalProgressContainer}>
                      <Text style={[styles.modalConditionText, { color: colors.textSecondary }]}>
                        {formatConditionText(selectedAvatar.condition)}
                      </Text>
                      {selectedAvatar.condition && selectedAvatar.condition !== 'default' && userStats && (
                        <View style={styles.modalProgressBar}>
                          <ProgressBar
                            progress={getProgress(selectedAvatar.id).percentage}
                            height={6}
                            showLabel={false}
                          />
                          <Text style={[styles.modalProgressText, { color: colors.textMuted }]}>
                            {getProgress(selectedAvatar.id).current}/{getProgress(selectedAvatar.id).target}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Boutons */}
              {selectedAvatar.isUnlocked ? (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: currentAvatarId === selectedAvatar.id
                        ? colors.card
                        : colors.gold,
                    },
                  ]}
                  onPress={handleEquip}
                  disabled={currentAvatarId === selectedAvatar.id}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      {
                        color: currentAvatarId === selectedAvatar.id
                          ? colors.textSecondary
                          : colors.background,
                      },
                    ]}
                  >
                    {currentAvatarId === selectedAvatar.id ? 'EQUIPE' : 'EQUIPER'}
                  </Text>
                </TouchableOpacity>
              ) : selectedAvatar.premium ? (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.gold }]}
                  onPress={handleBuyAvatar}
                >
                  <LinearGradient
                    colors={gradients.gold}
                    style={styles.modalButtonGradient}
                  >
                    <ShoppingBag size={18} color={colors.background} />
                    <Text style={[styles.modalButtonText, { color: colors.background }]}>
                      ACHETER
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={[styles.modalLockedButton, { borderColor: colors.border }]}>
                  <Lock size={16} color={colors.textMuted} />
                  <Text style={[styles.modalLockedText, { color: colors.textMuted }]}>
                    VERROUILLE
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarCard: {
    width: AVATAR_SIZE,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
  },
  avatarImageContainer: {
    width: AVATAR_SIZE - 16,
    height: AVATAR_SIZE - 16,
    borderRadius: (AVATAR_SIZE - 16) / 2,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  lockedOverlay: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  lockIconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equippedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Packs
  packsContainer: {
    gap: 12,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  packPreview: {
    flexDirection: 'row',
    marginRight: 12,
  },
  packPreviewImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  packInfo: {
    flex: 1,
  },
  packName: {
    fontSize: 15,
    fontWeight: '700',
  },
  packCount: {
    fontSize: 12,
    marginTop: 2,
  },
  packPrice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  packPriceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  packPurchased: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  packPurchasedText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalAvatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
  },
  modalLockedOverlay: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  modalLockIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -24,
    marginLeft: -24,
  },
  modalStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  modalSecretIcon: {
    fontSize: 28,
  },
  modalName: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalRarity: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
  },
  modalConditionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  modalPremiumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalPremiumText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalPackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalPackText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalProgressContainer: {
    alignItems: 'center',
  },
  modalConditionText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalProgressBar: {
    width: '100%',
    gap: 4,
  },
  modalProgressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  modalButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    paddingVertical: 16,
    textAlign: 'center',
  },
  modalLockedButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalLockedText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
