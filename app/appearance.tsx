// ============================================
// ⚔️ YOROI - ÉCRAN APPARENCE & THÈMES
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Palette,
  Sun,
  Moon,
  Smartphone,
  CircleDot,
  Square,
  Crown,
  Lock,
  ArrowLeft,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { themeColors, ThemeMode } from '@/constants/themes';
import { appearanceService, WARRIOR_THEMES, AvatarFormat } from '@/lib/appearanceService';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { getProfile, getWeights, getTrainings, getPhotos } from '@/lib/database';
import { POINTS_ACTIONS } from '@/lib/gamification';

export default function AppearanceScreen() {
  const { colors, themeColor, themeMode, setThemeColor, setThemeMode, isDark } = useTheme();
  const [avatarFormat, setAvatarFormatState] = useState<AvatarFormat>('circle');
  const [userXP, setUserXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Charger les paramètres d'apparence
      const settings = await appearanceService.loadSettings();
      setAvatarFormatState(settings.avatarFormat);

      // Calculer l'XP basé sur l'activité de l'utilisateur
      const [weights, trainings, photos] = await Promise.all([
        getWeights(),
        getTrainings(),
        getPhotos(),
      ]);

      // Calcul simplifié de l'XP
      const calculatedXP =
        weights.length * POINTS_ACTIONS.peser +
        trainings.length * POINTS_ACTIONS.entrainement +
        photos.length * POINTS_ACTIONS.photo;

      setUserXP(calculatedXP);
    } catch (error) {
      console.error('[Appearance] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (warriorThemeId: string) => {
    const warriorTheme = WARRIOR_THEMES.find((t) => t.id === warriorThemeId);
    if (!warriorTheme) return;

    // Vérifier si débloqué
    if (!appearanceService.isWarriorThemeUnlocked(warriorThemeId, userXP)) {
      Alert.alert(
        'Thème verrouillé',
        `Débloquez ce thème en atteignant ${warriorTheme.unlockXP} XP.\nVous avez actuellement ${userXP} XP.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setThemeColor(warriorTheme.themeColor);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Appearance] Erreur changement thème:', error);
      Alert.alert('Erreur', 'Impossible de changer le thème');
    }
  };

  const handleModeChange = async (mode: ThemeMode) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setThemeMode(mode);
    } catch (error) {
      console.error('[Appearance] Erreur changement mode:', error);
    }
  };

  const handleAvatarFormatChange = async (format: AvatarFormat) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAvatarFormatState(format);
      await appearanceService.setAvatarFormat(format);
    } catch (error) {
      console.error('[Appearance] Erreur changement format:', error);
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
                Apparence & Thèmes
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Personnalisez votre expérience
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Thèmes Guerriers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Thèmes Guerriers
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            {unlockedThemes.length}/{WARRIOR_THEMES.length} débloqués • {userXP} XP
          </Text>

          <View style={styles.themesGrid}>
            {WARRIOR_THEMES.map((theme) => {
              const isUnlocked = appearanceService.isWarriorThemeUnlocked(theme.id, userXP);
              const isActive = currentWarriorTheme?.id === theme.id;

              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: colors.backgroundCard },
                    isActive && {
                      borderColor: colors.accent,
                      borderWidth: 2,
                    },
                    !isUnlocked && { opacity: 0.5 },
                  ]}
                  onPress={() => handleThemeChange(theme.id)}
                  disabled={!isUnlocked}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeHeader}>
                    <Text style={styles.themeIcon}>{theme.icon}</Text>
                    {!isUnlocked && (
                      <Lock size={14} color={colors.textMuted} style={styles.lockIcon} />
                    )}
                  </View>
                  <Text style={[styles.themeName, { color: colors.textPrimary }]}>
                    {theme.name}
                  </Text>
                  <Text style={[styles.themeDescription, { color: colors.textMuted }]}>
                    {isUnlocked ? theme.description : `${theme.unlockXP} XP`}
                  </Text>
                  {isActive && (
                    <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]}>
                      <Text style={styles.activeText}>✓</Text>
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
                Prochain: {nextTheme.name} {nextTheme.icon} dans{' '}
                {nextTheme.unlockXP - userXP} XP
              </Text>
            </View>
          )}
        </View>

        {/* Section: Mode Clair/Sombre */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
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
                    { backgroundColor: colors.backgroundCard },
                    isActive && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => handleModeChange(mode)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={20}
                    color={isActive ? '#FFFFFF' : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      { color: isActive ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Format Avatar */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Format d'avatar
          </Text>

          <View style={styles.formatContainer}>
            {[
              { format: 'circle' as AvatarFormat, label: 'Cercle', icon: CircleDot },
              { format: 'rounded' as AvatarFormat, label: 'Arrondi', icon: Square },
            ].map(({ format, label, icon: Icon }) => {
              const isActive = avatarFormat === format;
              return (
                <TouchableOpacity
                  key={format}
                  style={[
                    styles.formatButton,
                    { backgroundColor: colors.backgroundCard },
                    isActive && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => handleAvatarFormatChange(format)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={24}
                    color={isActive ? '#FFFFFF' : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.formatLabel,
                      { color: isActive ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Info iOS */}
        {Platform.OS === 'ios' && (
          <View style={[styles.iosInfo, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.iosInfoText, { color: colors.textMuted }]}>
              💡 Les icônes alternatives d'app seront disponibles dans une prochaine version
            </Text>
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
    marginBottom: SPACING.xl,
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
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  themeIcon: {
    fontSize: 28,
  },
  lockIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  modesContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  formatContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  formatButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  iosInfo: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
  },
  iosInfoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
