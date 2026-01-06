// ============================================
// YOROI - ECRAN SELECTION LOGO PREMIUM
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Crown, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useDevMode } from '@/lib/DevModeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { 
  getSelectedLogo, 
  saveSelectedLogo, 
  LOGO_OPTIONS, 
  LogoVariant 
} from '@/lib/storage';
import { YoroiLogo } from '@/components/YoroiLogo';
import logger from '@/lib/security/logger';

export default function LogoSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isPro } = useDevMode();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [currentLogo, setCurrentLogo] = useState<LogoVariant>('default');
  const [selectedLogo, setSelectedLogo] = useState<LogoVariant>('default');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCurrentLogo();
  }, []);

  const loadCurrentLogo = async () => {
    const logo = await getSelectedLogo();
    setCurrentLogo(logo);
    setSelectedLogo(logo);
  };

  const handleSelectLogo = (logoId: LogoVariant) => {
    const logoOption = LOGO_OPTIONS.find(opt => opt.id === logoId);
    const isUnlocked = isPro || !logoOption?.isPremium;

    if (!isUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showPopup(
        'Logo Premium',
        'Ce logo nécessite la version Premium.\n\nMode Créateur : Tapez 5 fois sur "Version 1.0.0" dans les Réglages et entrez le code 2412.',
        [{ text: 'OK', style: 'primary' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLogo(logoId);
  };

  const handleSave = async () => {
    if (selectedLogo === currentLogo) {
      router.back();
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveSelectedLogo(selectedLogo);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showPopup(
        'Logo mis a jour !',
        'Ton nouveau logo est maintenant actif.',
        [{ text: 'Super !', style: 'primary', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Erreur sauvegarde logo:', error);
      showPopup('Erreur', 'Impossible de sauvegarder le logo', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = selectedLogo !== currentLogo;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Personnalisation
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Choisis ton logo
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview du logo selectionne */}
        <View style={[styles.previewCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.previewLabel, { color: colors.textMuted }]}>APERCU</Text>
          <View style={styles.previewContent}>
            <YoroiLogo size="large" forceLogoId={selectedLogo} />
          </View>
          {selectedLogo !== 'default' && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.accent }]}>
              <Crown size={12} color="#FFFFFF" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
        </View>

        {/* Section Premium */}
        <View style={[styles.premiumBanner, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}>
          <Sparkles size={20} color={colors.accent} />
          <View style={styles.premiumBannerText}>
            <Text style={[styles.premiumBannerTitle, { color: colors.textPrimary }]}>
              Logos Premium
            </Text>
            <Text style={[styles.premiumBannerDesc, { color: colors.textSecondary }]}>
              Debloque tous les logos apres 6 mois d'utilisation
            </Text>
          </View>
        </View>

        {/* Grille des logos */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LOGOS DISPONIBLES</Text>
        
        <View style={styles.logosGrid}>
          {LOGO_OPTIONS.map((option) => {
            const isSelected = selectedLogo === option.id;
            const isCurrent = currentLogo === option.id;
            const isUnlocked = isPro || !option.isPremium;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.logoCard,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: isSelected ? colors.accent : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                    opacity: isUnlocked ? 1 : 0.6,
                  },
                ]}
                onPress={() => handleSelectLogo(option.id)}
                activeOpacity={0.7}
              >
                {/* Logo preview */}
                <View style={[styles.logoPreview, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                  {option.id === 'default' ? (
                    <View style={[styles.kanjiPreview, { backgroundColor: colors.accent }]}>
                      <Text style={styles.kanjiText}>鎧</Text>
                    </View>
                  ) : option.image ? (
                    <Image
                      source={option.image}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>

                {/* Info */}
                <Text style={[styles.logoName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {option.name}
                </Text>
                <Text style={[styles.logoDesc, { color: colors.textMuted }]} numberOfLines={1}>
                  {option.description}
                </Text>

                {/* Badges */}
                {option.isPremium && (
                  <View style={[styles.premiumTag, { backgroundColor: `${colors.accent}20` }]}>
                    <Crown size={10} color={colors.accent} />
                    <Text style={[styles.premiumTagText, { color: colors.accent }]}>Premium</Text>
                  </View>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <View style={[styles.selectedIndicator, { backgroundColor: colors.accent }]}>
                    <Check size={14} color="#FFFFFF" />
                  </View>
                )}

                {/* Current indicator */}
                {isCurrent && !isSelected && (
                  <View style={[styles.currentIndicator, { backgroundColor: colors.success }]}>
                    <Text style={styles.currentText}>Actuel</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
            Comment debloquer les logos Premium ?
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Les logos Premium sont automatiquement debloques apres 6 mois d'utilisation de l'application.
            Continue a t'entrainer et a suivre ta progression !
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bouton Sauvegarder */}
      {hasChanges && (
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + SPACING.md, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.accent, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Sauvegarde...' : 'Appliquer ce logo'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
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
    fontSize: FONT.size.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: FONT.size.sm,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },

  // Preview
  previewCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  previewContent: {
    paddingVertical: SPACING.lg,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Premium Banner
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: FONT.size.md,
    fontWeight: '700',
  },
  premiumBannerDesc: {
    fontSize: FONT.size.sm,
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },

  // Logos Grid
  logosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  logoCard: {
    width: '47%',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  logoPreview: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  kanjiPreview: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanjiText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  logoName: {
    fontSize: FONT.size.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  logoDesc: {
    fontSize: FONT.size.xs,
    textAlign: 'center',
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  premiumTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  currentText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // Info Card
  infoCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.xl,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: FONT.size.md,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT.size.sm,
    lineHeight: 20,
  },

  // Save Button
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: FONT.size.md,
    fontWeight: '700',
  },
});
