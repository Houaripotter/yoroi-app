// ============================================
// YOROI - ÉCRAN THÈMES
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  Flower2,
  CloudSun,
  Cherry,
  Leaf,
  Gem,
  Mountain,
  Flower,
  Trees,
  Compass,
  Zap,
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

// Helper pour obtenir la couleur d'un thème
const getThemeColor = (themeColorId: string): string => {
  const theme = themeColors.find(t => t.id === themeColorId);
  return theme?.color || '#FFFFFF';
};

// Helper pour obtenir la couleur companion d'un thème
const getThemeCompanion = (themeColorId: string): string => {
  const theme = themeColors.find(t => t.id === themeColorId);
  return theme?.companion || '#FFFFFF';
};

// Helper pour déterminer si une couleur est claire (nécessite texte noir) ou foncée (nécessite texte blanc)
const getTextColorForBackground = (hexColor: string): string => {
  // Supprimer le # si présent
  const hex = hexColor.replace('#', '');

  // Convertir en RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculer la luminance relative (formule W3C)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Si luminance > 0.6, couleur claire → texte noir, sinon texte blanc
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
};

// Helper pour obtenir l'icône correspondant à chaque thème
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
      // Calculer l'XP basé sur l'activité de l'utilisateur
      const [weights, trainings, photos] = await Promise.all([
        getWeights(),
        getTrainings(),
        getPhotos(),
      ]);

      // XP unifie (inclut activite + quetes + challenges + sante)
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

    // Verifier si debloque
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

  // Trouver le thème guerrier actuel
  const currentWarriorTheme = WARRIOR_THEMES.find(
    (theme) => theme.themeColor === themeColor
  );

  const unlockedThemes = appearanceService.getUnlockedWarriorThemes(userXP);
  const nextTheme = appearanceService.getNextThemeToUnlock(userXP);

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
              impactAsync(ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.backgroundElevated }]}>
              <Palette size={24} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('screens.themes.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t('screens.themes.subtitle')}
              </Text>
            </View>
          </View>
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

        {/* Section: Thèmes Guerriers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('screens.themes.warriorThemes')}
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            {creatorModeActive
              ? `⚙️ ${t('screens.themes.creatorModeActive')}`
              : t('screens.themes.unlockedCount', { unlocked: unlockedThemes.length, total: WARRIOR_THEMES.length, xp: userXP })}
          </Text>

          <View style={styles.themesGrid}>
            {WARRIOR_THEMES.map((theme) => {
              const isUnlocked = appearanceService.isWarriorThemeUnlocked(theme.id, userXP);
              const isActive = currentWarriorTheme?.id === theme.id;
              const themeAccentColor = getThemeColor(theme.themeColor);
              const themeCompanionColor = getThemeCompanion(theme.themeColor);

              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: colors.backgroundCard },
                    isActive && {
                      borderColor: themeAccentColor,
                      borderWidth: 2.5,
                    },
                    !isUnlocked && { opacity: 0.5 },
                  ]}
                  onPress={() => handleThemeChange(theme.id)}
                  disabled={!isUnlocked}
                  activeOpacity={0.7}
                >
                  {/* Bannière bicolore en haut */}
                  <View style={styles.colorBanner}>
                    <View style={[styles.colorHalf, { backgroundColor: themeAccentColor, borderTopLeftRadius: isActive ? 11 : 13 }]} />
                    <View style={[styles.colorHalf, { backgroundColor: themeCompanionColor, borderTopRightRadius: isActive ? 11 : 13 }]} />
                  </View>

                  {/* Contenu */}
                  <View style={styles.themeContent}>
                    <Text style={[styles.themeName, { color: colors.textPrimary }]}>
                      {theme.name}
                    </Text>
                    {/* Noms des deux couleurs */}
                    {isUnlocked && theme.description ? (
                      <View style={styles.colorNamesRow}>
                        <View style={[styles.colorDot, { backgroundColor: themeAccentColor }]} />
                        <Text style={[styles.colorNameText, { color: colors.textMuted }]}>
                          {theme.description.split(' + ')[0]}
                        </Text>
                        <Text style={[styles.colorNamePlus, { color: colors.textMuted }]}> + </Text>
                        <View style={[styles.colorDot, { backgroundColor: themeCompanionColor }]} />
                        <Text style={[styles.colorNameText, { color: colors.textMuted }]}>
                          {theme.description.split(' + ')[1]}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.themeDescription, { color: colors.textMuted }]}>
                        {`${theme.unlockXP} XP`}
                      </Text>
                    )}
                  </View>

                  {!isUnlocked && (
                    <View style={styles.lockBadge}>
                      <Lock size={14} color={colors.textMuted} />
                    </View>
                  )}
                  {isActive && (
                    <View style={[styles.activeIndicator, { backgroundColor: themeAccentColor }]}>
                      <Check size={14} color={getTextColorForBackground(themeAccentColor)} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prochain déblocage */}
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

      {/* Custom Popup */}
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
  topSection: {
    marginBottom: SPACING.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
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
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  themeCard: {
    width: '48%',
    borderRadius: RADIUS.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  colorBanner: {
    flexDirection: 'row',
    height: 48,
  },
  colorHalf: {
    flex: 1,
  },
  themeContent: {
    padding: SPACING.sm,
    paddingTop: 10,
    paddingBottom: 12,
  },
  colorNamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 3,
  },
  colorNameText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  colorNamePlus: {
    fontSize: 10,
    fontWeight: '500',
  },
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
  themeName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
