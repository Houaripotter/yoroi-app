// ============================================
// YOROI - ECRAN THEMES
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  Palette,
  Sun,
  Moon,
  Smartphone,
  Crown,
  Lock,
  ArrowLeft,
  Check,
  AlertCircle,
  Flame,
  Sparkles,
  Heart,
  Droplet,
  Circle,
  Diamond,
  Star,
  CloudSun,
  Cherry,
  Leaf,
  Gem,
  Mountain,
  Flower,
  Trees,
  Compass,
  Zap,
  Wind,
  Cloud,
  Wand,
  Citrus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { ThemeMode, themeColors } from '@/constants/themes';
import { appearanceService, WARRIOR_THEMES } from '@/lib/appearanceService';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { getWeights, getTrainings, getPhotos } from '@/lib/database';
import { POINTS_ACTIONS, getUnifiedPoints } from '@/lib/gamification';
import { useCustomPopup } from '@/components/CustomPopup';
import { useDevMode } from '@/lib/DevModeContext';
import logger from '@/lib/security/logger';

// Helper pour obtenir la couleur d'un theme
const getThemeColor = (themeColorId: string): string => {
  const theme = themeColors.find(t => t.id === themeColorId);
  return theme?.color || '#FFFFFF';
};

// Helper pour obtenir la couleur companion d'un theme
const getThemeCompanion = (themeColorId: string): string => {
  const theme = themeColors.find(t => t.id === themeColorId);
  return theme?.companion || '#FFFFFF';
};

// Helper pour obtenir le kanji d'un theme
const getThemeKanji = (themeColorId: string): string => {
  const theme = themeColors.find(t => t.id === themeColorId);
  return theme?.kanji || '';
};

// Helper pour determiner si une couleur est claire ou foncee
const getTextColorForBackground = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
};

// Helper pour obtenir l'icone correspondant a chaque theme
const getThemeIcon = (themeColorId: string, color: string, size: number = 28) => {
  const iconProps = { size, color, strokeWidth: 2 };

  switch (themeColorId) {
    case 'charcoal':
      return <Flame {...iconProps} fill={color} />;
    case 'mint':
      return <Leaf {...iconProps} fill={color} />;
    case 'royal':
      return <Star {...iconProps} fill={color} />;
    case 'ocean':
      return <Droplet {...iconProps} fill={color} />;
    case 'pumpkin':
      return <Sun {...iconProps} fill={color} />;
    case 'vista':
      return <CloudSun {...iconProps} />;
    case 'lavender':
      return <Heart {...iconProps} fill={color} />;
    case 'peach':
      return <Cherry {...iconProps} fill={color} />;
    case 'fizz':
      return <Sparkles {...iconProps} />;
    case 'cadet':
      return <Diamond {...iconProps} />;
    case 'tiffany':
      return <Gem {...iconProps} fill={color} />;
    case 'obsidian':
      return <Mountain {...iconProps} />;
    case 'sakura':
      return <Flower {...iconProps} fill={color} />;
    case 'emerald':
      return <Trees {...iconProps} />;
    case 'amber':
      return <Compass {...iconProps} fill={color} />;
    case 'slate':
      return <Zap {...iconProps} />;
    case 'ambersmoke':
      return <Wind {...iconProps} />;
    case 'dreamy':
      return <Cloud {...iconProps} fill={color} />;
    case 'lavendar':
      return <Wand {...iconProps} />;
    case 'chartreuse':
      return <Citrus {...iconProps} />;
    default:
      return <Circle {...iconProps} fill={color} />;
  }
};

export default function ThemesScreen() {
  const { colors, themeColor, themeMode, setThemeColor, setThemeMode } = useTheme();
  const { t } = useI18n();
  const { isDevMode: creatorModeActive } = useDevMode();
  const [userXP, setUserXP] = useState(0);
  const [loading, setLoading] = useState(true);

  const { showPopup, PopupComponent } = useCustomPopup();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [weights, trainings, photos] = await Promise.all([
        getWeights(),
        getTrainings(),
        getPhotos(),
      ]);

      if (creatorModeActive) {
        setUserXP(999999);
      } else {
        const unifiedXP = await getUnifiedPoints();
        setUserXP(unifiedXP);
      }
    } catch (error) {
      logger.error('[Themes] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (warriorThemeId: string) => {
    const warriorTheme = WARRIOR_THEMES.find((t) => t.id === warriorThemeId);
    if (!warriorTheme) return;

    if (!appearanceService.isWarriorThemeUnlocked(warriorThemeId, userXP)) {
      showPopup(
        t('screens.themes.themeLocked'),
        t('screens.themes.unlockThemeMessage', { xp: warriorTheme.unlockXP, currentXp: userXP }),
        [{ text: t('common.ok'), style: 'primary' }],
        <AlertCircle size={32} color="#F59E0B" />
      );
      return;
    }

    try {
      impactAsync(ImpactFeedbackStyle.Medium);
      await setThemeColor(warriorTheme.themeColor);
      notificationAsync(NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('[Themes] Erreur changement theme:', error);
      showPopup(t('common.error'), t('screens.themes.errorChangingTheme'), [{ text: t('common.ok'), style: 'primary' }]);
    }
  };

  const handleModeChange = async (mode: ThemeMode) => {
    try {
      impactAsync(ImpactFeedbackStyle.Light);
      await setThemeMode(mode);
    } catch (error) {
      logger.error('[Themes] Erreur changement mode:', error);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t('common.loading')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const currentWarriorTheme = WARRIOR_THEMES.find(
    (theme) => theme.themeColor === themeColor
  );

  const unlockedThemes = appearanceService.getUnlockedWarriorThemes(userXP);
  const nextTheme = appearanceService.getNextThemeToUnlock(userXP);

  // Couleurs du theme actif pour le header preview
  const activeAccent = getThemeColor(themeColor);
  const activeCompanion = getThemeCompanion(themeColor);
  const activeKanji = getThemeKanji(themeColor);

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Bouton retour */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Header : apercu du theme actif */}
        <View style={[styles.headerPreview, { overflow: 'hidden' }]}>
          <LinearGradient
            colors={[activeAccent, activeCompanion]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Kanji watermark */}
            <Text style={[styles.headerKanji, { color: 'rgba(255,255,255,0.15)' }]}>
              {activeKanji}
            </Text>

            {/* Contenu du header */}
            <View style={styles.headerContentRow}>
              <View style={styles.headerIconBubble}>
                {getThemeIcon(themeColor, getTextColorForBackground(activeAccent), 28)}
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: getTextColorForBackground(activeAccent) }]}>
                  {currentWarriorTheme?.name || themeColor}
                </Text>
                <Text style={[styles.headerSubtitle, { color: getTextColorForBackground(activeAccent) + 'BB' }]}>
                  {currentWarriorTheme?.description || ''}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Mode d'affichage */}
        <View style={[styles.modeSection, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.modeSectionTitle, { color: colors.textPrimary }]}>
            {t('screens.themes.displayMode')}
          </Text>
          <View style={styles.modesContainer}>
            {[
              { mode: 'dark' as ThemeMode, label: t('screens.themes.dark'), icon: Moon },
              { mode: 'light' as ThemeMode, label: t('screens.themes.light'), icon: Sun },
              { mode: 'auto' as ThemeMode, label: t('screens.themes.auto'), icon: Smartphone },
            ].map(({ mode, label, icon: Icon }) => {
              const isActive = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    { backgroundColor: colors.backgroundElevated },
                    isActive && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => handleModeChange(mode)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={20}
                    color={isActive ? colors.textOnAccent : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      { color: isActive ? colors.textOnAccent : colors.textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Themes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('screens.themes.warriorThemes')}
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            {creatorModeActive
              ? t('screens.themes.creatorModeActive')
              : t('screens.themes.unlockedCount', { unlocked: unlockedThemes.length, total: WARRIOR_THEMES.length, xp: userXP })}
          </Text>

          <View style={styles.themesGrid}>
            {WARRIOR_THEMES.map((theme) => {
              const isUnlocked = appearanceService.isWarriorThemeUnlocked(theme.id, userXP);
              const isActive = currentWarriorTheme?.id === theme.id;
              const themeAccentColor = getThemeColor(theme.themeColor);
              const themeCompanionColor = getThemeCompanion(theme.themeColor);
              const themeKanjiChar = getThemeKanji(theme.themeColor);
              const iconColor = getTextColorForBackground(themeAccentColor);

              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: colors.backgroundCard },
                    isActive && {
                      borderColor: themeAccentColor,
                      borderWidth: 2.5,
                      ...Platform.select({
                        ios: {
                          shadowColor: themeAccentColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 10,
                        },
                        android: {
                          elevation: 8,
                        },
                      }),
                    },
                    !isUnlocked && { opacity: 0.5 },
                  ]}
                  onPress={() => handleThemeChange(theme.id)}
                  disabled={!isUnlocked}
                  activeOpacity={0.7}
                >
                  {/* Banniere gradient accent -> companion */}
                  <View style={styles.bannerContainer}>
                    <LinearGradient
                      colors={[themeAccentColor, themeCompanionColor]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.colorBanner,
                        isActive && { borderTopLeftRadius: 11, borderTopRightRadius: 11 },
                      ]}
                    />
                  </View>

                  {/* Contenu sous la banniere */}
                  <View style={styles.themeContent}>
                    <Text style={[styles.themeName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {theme.name}
                    </Text>
                    {isUnlocked ? (
                      /* Deux cercles : couleur principale + couleur companion */
                      <View style={styles.colorCirclesRow}>
                        <View style={[styles.colorCircle, { backgroundColor: themeAccentColor }]} />
                        <View style={[styles.colorCircle, styles.colorCircleOverlap, { backgroundColor: themeCompanionColor }]} />
                      </View>
                    ) : (
                      <Text style={[styles.themeDescription, { color: colors.textMuted }]}>
                        {`${theme.unlockXP} XP`}
                      </Text>
                    )}
                  </View>

                  {/* Lock badge */}
                  {!isUnlocked && (
                    <View style={styles.lockBadge}>
                      <Lock size={14} color={colors.textMuted} />
                    </View>
                  )}

                  {/* Badge Actif */}
                  {isActive && (
                    <View style={[styles.activeBadge, { backgroundColor: '#30D158' }]}>
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.activeBadgeText}>Actif</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prochain deblocage */}
          {nextTheme && (
            <View style={[styles.nextUnlock, { backgroundColor: colors.backgroundElevated }]}>
              <Crown size={16} color={colors.accent} />
              <Text style={[styles.nextUnlockText, { color: colors.textSecondary }]}>
                {t('screens.themes.nextUnlock', { name: nextTheme.name, xp: nextTheme.unlockXP - userXP })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },

  // Header preview
  headerPreview: {
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
  },
  headerGradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingVertical: SPACING.xxl,
    position: 'relative',
    overflow: 'hidden',
  },
  headerKanji: {
    position: 'absolute',
    right: -10,
    top: -20,
    fontSize: 120,
    fontWeight: '900',
    lineHeight: 140,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Mode section
  modeSection: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
  },
  modeSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  modesContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: SPACING.md,
  },

  // Grid
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  themeCard: {
    width: '47.5%',
    borderRadius: RADIUS.lg,
    position: 'relative',
    overflow: 'hidden',
  },

  // Banner
  bannerContainer: {
    overflow: 'hidden',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  colorBanner: {
    height: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  bannerKanji: {
    position: 'absolute',
    right: -5,
    top: -10,
    fontSize: 80,
    fontWeight: '900',
    lineHeight: 95,
  },
  bannerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    zIndex: 2,
  },

  // Content
  themeContent: {
    padding: SPACING.sm,
    paddingTop: 8,
    paddingBottom: 10,
  },
  themeName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  colorCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  colorCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  colorCircleOverlap: {},
  themeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Lock badge
  lockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Active badge
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Next unlock
  nextUnlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  nextUnlockText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
