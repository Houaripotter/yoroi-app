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
  Image,
  Alert,
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
  Image as ImageIcon,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ThemeMode } from '@/constants/themes';
import { appearanceService, WARRIOR_THEMES } from '@/lib/appearanceService';
import { LOGO_OPTIONS, getSelectedLogo, setSelectedLogo } from '@/lib/storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { getWeights, getTrainings, getPhotos } from '@/lib/database';
import { POINTS_ACTIONS } from '@/lib/gamification';

type Tab = 'themes' | 'logos';

export default function AppearanceScreen() {
  const { colors, themeColor, themeMode, setThemeColor, setThemeMode } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('themes');
  const [userXP, setUserXP] = useState(0);
  const [selectedLogoId, setSelectedLogoId] = useState<string>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Charger le logo sélectionné
      const logoId = await getSelectedLogo();
      setSelectedLogoId(logoId);

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

  const handleLogoChange = async (logoId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setSelectedLogo(logoId as any);
      setSelectedLogoId(logoId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Appearance] Erreur changement logo:', error);
      Alert.alert('Erreur', 'Impossible de changer le logo');
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
                Apparence
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Personnalisez votre expérience
              </Text>
            </View>
          </View>
        </View>

        {/* Mode d'affichage - TOUT EN HAUT */}
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

        {/* Onglets Thèmes / Logos */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.backgroundCard },
              activeTab === 'themes' && {
                backgroundColor: colors.accent,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('themes');
            }}
            activeOpacity={0.7}
          >
            <Palette size={18} color={activeTab === 'themes' ? '#FFFFFF' : colors.textPrimary} />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'themes' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Thèmes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.backgroundCard },
              activeTab === 'logos' && {
                backgroundColor: colors.accent,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('logos');
            }}
            activeOpacity={0.7}
          >
            <ImageIcon size={18} color={activeTab === 'logos' ? '#FFFFFF' : colors.textPrimary} />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'logos' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Logos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu selon l'onglet actif */}
        {activeTab === 'themes' ? (
          <>
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
          </>
        ) : (
          <>
            {/* Section: Logos d'App */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Logos d'App
              </Text>
              <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
                Choisissez votre logo préféré
              </Text>

              <View style={styles.logosGrid}>
                {LOGO_OPTIONS.map((logo) => {
                  const isSelected = selectedLogoId === logo.id;

                  return (
                    <TouchableOpacity
                      key={logo.id}
                      style={[
                        styles.logoCard,
                        { backgroundColor: colors.backgroundCard },
                        isSelected && {
                          borderColor: colors.accent,
                          borderWidth: 3,
                        },
                      ]}
                      onPress={() => handleLogoChange(logo.id)}
                      activeOpacity={0.7}
                    >
                      {logo.image ? (
                        <Image
                          source={logo.image}
                          style={styles.logoImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: colors.backgroundElevated }]}>
                          <ImageIcon size={40} color={colors.textMuted} />
                        </View>
                      )}
                      <Text style={[styles.logoName, { color: colors.textPrimary }]}>
                        {logo.name}
                      </Text>
                      <Text style={[styles.logoDescription, { color: colors.textMuted }]}>
                        {logo.description}
                      </Text>
                      {logo.isPremium && (
                        <View style={[styles.premiumBadge, { backgroundColor: '#FFD700' }]}>
                          <Text style={styles.premiumText}>✨</Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
                          <Check size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
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
  modeSection: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  modeSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
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
  tabsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
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
  logosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  logoCard: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    position: 'relative',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  logoDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    fontSize: 12,
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
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
