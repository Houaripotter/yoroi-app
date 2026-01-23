// ============================================
// YOROI - ÉCRAN LOGOS
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  ArrowLeft,
  Image as ImageIcon,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { LOGO_OPTIONS, getSelectedLogo, setSelectedLogo } from '@/lib/storage';
import logger from '@/lib/security/logger';

export default function LogosScreen() {
  const { colors } = useTheme();
  const [selectedLogoId, setSelectedLogoId] = useState<string>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const logoId = await getSelectedLogo();
      setSelectedLogoId(logoId);
    } catch (error) {
      logger.error('[Logos] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = async (logoId: string) => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);
      await setSelectedLogo(logoId as any);
      setSelectedLogoId(logoId);
      notificationAsync(NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('[Logos] Erreur changement logo:', error);
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
              <ImageIcon size={24} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Logo de l'app
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Personnalise ton icône
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Logos d'App */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Logos d'App
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Choisissez ton logo préféré
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
                      <Text style={styles.premiumText}></Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  logoName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  logoDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    fontSize: 14,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
