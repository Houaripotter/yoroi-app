// ============================================
// YOROI - SÉLECTEUR DE LANGUE
// ============================================
// Composant pour changer la langue de l'app (9 langues)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { Globe, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n, SUPPORTED_LANGUAGES } from '@/lib/I18nContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

export function LanguageSelector() {
  const { colors } = useTheme();
  const { language, setLanguage, t } = useI18n();

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === language) return;

    try {
      impactAsync(ImpactFeedbackStyle.Light);
      await setLanguage(newLanguage);
      notificationAsync(NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('[LanguageSelector] Erreur changement langue:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.backgroundElevated }]}>
          <Globe size={20} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('menu.language') || 'Langue'}
        </Text>
      </View>

      {/* Grille de langues - 3 colonnes */}
      <View style={styles.languageGrid}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                { backgroundColor: colors.backgroundElevated },
                isSelected && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => handleLanguageChange(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageLabel,
                  { color: colors.textPrimary },
                  isSelected && { color: colors.textOnAccent, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {lang.nativeName}
              </Text>
              {isSelected && (
                <View style={[styles.checkMark, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]}>
        {t('menu.languageDescription') || "La langue s'applique à toute l'interface"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  languageButton: {
    width: '31.5%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    position: 'relative',
    minHeight: 70,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
