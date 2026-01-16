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
import * as Haptics from 'expo-haptics';
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
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ThemeMode, themeColors } from '@/constants/themes';
import { appearanceService, WARRIOR_THEMES } from '@/lib/appearanceService';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { getWeights, getTrainings, getPhotos } from '@/lib/database';
import { POINTS_ACTIONS } from '@/lib/gamification';
import { useCustomPopup } from '@/components/CustomPopup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// Helper pour obtenir la couleur d'un thème
const getThemeColor = (themeColorId: string): string => {
  const theme = themeColors.find(t => t.id === themeColorId);
  return theme?.color || '#FFFFFF';
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

export default function ThemesScreen() {
  const { colors, themeColor, themeMode, setThemeColor, setThemeMode } = useTheme();
  const [userXP, setUserXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creatorModeActive, setCreatorModeActive] = useState(false);

  const { showPopup, PopupComponent } = useCustomPopup();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Vérifier si Mode Créateur actif
      const creatorMode = await AsyncStorage.getItem('@yoroi_creator_mode');
      const isCreator = creatorMode === 'true';
      setCreatorModeActive(isCreator);

      // Calculer l'XP basé sur l'activité de l'utilisateur
      const [weights, trainings, photos] = await Promise.all([
        getWeights(),
        getTrainings(),
        getPhotos(),
      ]);

      // Calcul simplifié de l'XP - Mode Créateur = XP infini (999999)
      if (isCreator) {
        setUserXP(999999);
      } else {
        const calculatedXP =
          weights.length * POINTS_ACTIONS.peser +
          trainings.length * POINTS_ACTIONS.entrainement +
          photos.length * POINTS_ACTIONS.photo;

        setUserXP(calculatedXP);
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
        'Theme verrouille',
        `Debloquez ce theme en atteignant ${warriorTheme.unlockXP} XP.\nVous avez actuellement ${userXP} XP.`,
        [{ text: 'OK', style: 'primary' }],
        <AlertCircle size={32} color="#F59E0B" />
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setThemeColor(warriorTheme.themeColor);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('[Themes] Erreur changement theme:', error);
      showPopup('Erreur', 'Impossible de changer le theme', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleModeChange = async (mode: ThemeMode) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            Chargement...
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                Thèmes
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Choisis ton style guerrier
              </Text>
            </View>
          </View>
        </View>

        {/* Mode d'affichage */}
        <View style={[styles.modeSection, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.modeSectionTitle, { color: colors.textPrimary }]}>
            Mode d'affichage
          </Text>
          <View style={styles.modesContainer}>
            {[
              { mode: 'dark' as ThemeMode, label: 'Sombre', icon: Moon },
              { mode: 'light' as ThemeMode, label: 'Clair', icon: Sun },
              { mode: 'auto' as ThemeMode, label: 'Auto', icon: Smartphone },
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
            Thèmes Guerriers
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            {creatorModeActive
              ? `⚙️ Mode Créateur - Tous les thèmes débloqués !`
              : `${unlockedThemes.length}/${WARRIOR_THEMES.length} débloqués • ${userXP} XP`}
          </Text>

          <View style={styles.themesGrid}>
            {WARRIOR_THEMES.map((theme) => {
              const isUnlocked = appearanceService.isWarriorThemeUnlocked(theme.id, userXP);
              const isActive = currentWarriorTheme?.id === theme.id;
              const themeAccentColor = getThemeColor(theme.themeColor);

              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: colors.backgroundCard },
                    isActive && {
                      borderColor: themeAccentColor,
                      borderWidth: 2,
                    },
                    !isUnlocked && { opacity: 0.5 },
                  ]}
                  onPress={() => handleThemeChange(theme.id)}
                  disabled={!isUnlocked}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeHeader}>
                    <View style={styles.themeIconContainer}>
                      <Palette size={24} color={themeAccentColor} />
                    </View>
                    <View style={[styles.colorCircle, { backgroundColor: themeAccentColor }]} />
                  </View>
                  <Text style={[styles.themeName, { color: colors.textPrimary }]}>
                    {theme.name}
                  </Text>
                  <Text style={[styles.themeDescription, { color: colors.textMuted }]}>
                    {isUnlocked ? theme.description : `${theme.unlockXP} XP`}
                  </Text>
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
                Prochain: {nextTheme.name} dans {nextTheme.unlockXP - userXP} XP
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
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    position: 'relative',
    minHeight: 110,
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  themeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
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
