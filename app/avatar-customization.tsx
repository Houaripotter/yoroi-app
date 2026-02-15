import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';

import { Lock, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useDevMode } from '@/lib/DevModeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { CustomizableAvatar } from '@/components/CustomizableAvatar';
import { useI18n } from '@/lib/I18nContext';
import logger from '@/lib/security/logger';
import {
  AvatarCustomization,
  FrameType,
  BackgroundType,
  EffectType,
  AVATAR_FRAMES,
  AVATAR_BACKGROUNDS,
  AVATAR_EFFECTS,
  getAvatarCustomization,
  saveAvatarCustomization,
  checkAllUnlocks,
  UnlockedElements,
  ElementUnlockStatus,
} from '@/lib/avatarCustomization';

// ============================================
// AVATAR CUSTOMIZATION SCREEN
// ============================================

export default function AvatarCustomizationScreen() {
  const { colors } = useTheme();
  const { isPro } = useDevMode();
  const { t } = useI18n();

  const [customization, setCustomization] = useState<AvatarCustomization>({
    frame: 'none',
    background: 'black',
    effect: 'none',
  });

  const [unlocked, setUnlocked] = useState<UnlockedElements>({
    frames: ['none'],
    backgrounds: ['black'],
    effects: ['none'],
  });

  const [statuses, setStatuses] = useState<{
    frames: Record<FrameType, ElementUnlockStatus>;
    backgrounds: Record<BackgroundType, ElementUnlockStatus>;
    effects: Record<EffectType, ElementUnlockStatus>;
  }>({
    frames: {} as Record<FrameType, ElementUnlockStatus>,
    backgrounds: {} as Record<BackgroundType, ElementUnlockStatus>,
    effects: {} as Record<EffectType, ElementUnlockStatus>,
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Charger les donnees
  const loadData = useCallback(async () => {
    try {
      const savedCustomization = await getAvatarCustomization();
      setCustomization(savedCustomization);

      const unlockResult = await checkAllUnlocks(isPro);
      setUnlocked(unlockResult.unlocked);
      setStatuses(unlockResult.statuses);
    } catch (error) {
      logger.error('Erreur chargement:', error);
    }
  }, [isPro]);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  // Sauvegarder et mettre a jour l'apercu
  const updateCustomization = async (newCustomization: AvatarCustomization) => {
    setCustomization(newCustomization);
    setRefreshTrigger(prev => prev + 1);
    await saveAvatarCustomization(newCustomization);
  };

  // Selectionner un cadre
  const selectFrame = async (frame: FrameType) => {
    if (!unlocked.frames.includes(frame)) return;
    await updateCustomization({ ...customization, frame });
  };

  // Selectionner un fond
  const selectBackground = async (background: BackgroundType) => {
    if (!unlocked.backgrounds.includes(background)) return;
    await updateCustomization({ ...customization, background });
  };

  // Selectionner un effet
  const selectEffect = async (effect: EffectType) => {
    if (!unlocked.effects.includes(effect)) return;
    await updateCustomization({ ...customization, effect });
  };

  // Rendu d'un element
  const renderElement = (
    element: { id: string; name: string; emoji: string; unlockCondition: any },
    isSelected: boolean,
    isUnlocked: boolean,
    status: ElementUnlockStatus | undefined,
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity
        key={element.id}
        style={[
          styles.elementButton,
          {
            backgroundColor: isSelected ? colors.gold + '30' : colors.card,
            borderColor: isSelected ? colors.gold : colors.border,
            opacity: isUnlocked ? 1 : 0.5,
          },
        ]}
        onPress={onPress}
        disabled={!isUnlocked}
        activeOpacity={0.7}
      >
        <Text style={styles.elementEmoji}>{element.emoji}</Text>
        <Text
          style={[
            styles.elementName,
            { color: isSelected ? colors.gold : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {element.name}
        </Text>

        {/* Indicateur de selection ou verrou */}
        {isUnlocked ? (
          isSelected && (
            <View style={[styles.checkBadge, { backgroundColor: colors.gold }]}>
              <Check size={12} color={colors.background} strokeWidth={3} />
            </View>
          )
        ) : (
          <View style={styles.lockBadge}>
            <Lock size={12} color={colors.textMuted} strokeWidth={2} />
          </View>
        )}

        {/* Barre de progression pour les verrouilles */}
        {!isUnlocked && status && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.gold,
                    width: `${status.progress}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {Math.round(status.progress)}%
            </Text>
          </View>
        )}

        {/* Description du deblocage */}
        {!isUnlocked && element.unlockCondition && (
          <Text style={[styles.unlockDesc, { color: colors.textMuted }]} numberOfLines={1}>
            {element.unlockCondition.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper noPadding>
      <Header title={t('screens.avatarCustomization.title')} showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* PREVIEW AVATAR */}
        <View style={[styles.previewSection, { backgroundColor: colors.card }]}>
          <CustomizableAvatar
            size={140}
            customization={customization}
            showEffects={true}
            refreshTrigger={refreshTrigger}
          />
          <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
            {t('screens.avatarCustomization.realtimePreview')}
          </Text>
        </View>

        {/* SECTION CADRES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('screens.avatarCustomization.frameSection')}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {unlocked.frames.length}/{Object.keys(AVATAR_FRAMES).length}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.elementsRow}
          >
            {Object.entries(AVATAR_FRAMES).map(([key, frame]) => {
              const frameKey = key as FrameType;
              const isSelected = customization.frame === frameKey;
              const isUnlocked = unlocked.frames.includes(frameKey);
              const status = statuses.frames[frameKey];

              return renderElement(frame, isSelected, isUnlocked, status, () =>
                selectFrame(frameKey)
              );
            })}
          </ScrollView>
        </View>

        {/* SECTION FONDS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('screens.avatarCustomization.backgroundSection')}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {unlocked.backgrounds.length}/{Object.keys(AVATAR_BACKGROUNDS).length}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.elementsRow}
          >
            {Object.entries(AVATAR_BACKGROUNDS).map(([key, bg]) => {
              const bgKey = key as BackgroundType;
              const isSelected = customization.background === bgKey;
              const isUnlocked = unlocked.backgrounds.includes(bgKey);
              const status = statuses.backgrounds[bgKey];

              return renderElement(bg, isSelected, isUnlocked, status, () =>
                selectBackground(bgKey)
              );
            })}
          </ScrollView>
        </View>

        {/* SECTION EFFETS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('screens.avatarCustomization.effectSection')}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {unlocked.effects.length}/{Object.keys(AVATAR_EFFECTS).length}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.elementsRow}
          >
            {Object.entries(AVATAR_EFFECTS).map(([key, effect]) => {
              const effectKey = key as EffectType;
              const isSelected = customization.effect === effectKey;
              const isUnlocked = unlocked.effects.includes(effectKey);
              const status = statuses.effects[effectKey];

              return renderElement(effect, isSelected, isUnlocked, status, () =>
                selectEffect(effectKey)
              );
            })}
          </ScrollView>
        </View>

        {/* LEGENDE */}
        <View style={[styles.legendSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.legendTitle, { color: colors.textPrimary }]}>
            {t('screens.avatarCustomization.howToUnlock')}
          </Text>

          <View style={styles.legendItem}>
            <Text style={styles.legendEmoji}>🥉🥈🥇</Text>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {t('screens.avatarCustomization.framesUnlock')}
            </Text>
          </View>

          <View style={styles.legendItem}>
            <Text style={styles.legendEmoji}></Text>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {t('screens.avatarCustomization.diamondUnlock')}
            </Text>
          </View>

          <View style={styles.legendItem}>
            <Text style={styles.legendEmoji}>🌌🐉</Text>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {t('screens.avatarCustomization.backgroundsUnlock')}
            </Text>
          </View>

          <View style={styles.legendItem}>
            <Text style={styles.legendEmoji}>💙💛</Text>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {t('screens.avatarCustomization.effectsUnlock')}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {t('screens.avatarCustomization.infoText')}
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    opacity: 0.7,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  elementsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  elementButton: {
    width: 100,
    minHeight: 100,
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elementEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  elementName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 8,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'right',
  },
  unlockDesc: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  legendSection: {
    marginHorizontal: 16,
    marginTop: 32,
    padding: 16,
    borderRadius: 16,
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  legendEmoji: {
    fontSize: 14,
    width: 50,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
});
