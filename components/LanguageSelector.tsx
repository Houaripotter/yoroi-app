// ============================================
// YOROI - SÉLECTEUR DE LANGUE
// ============================================
// Composant pour changer la langue de l'app (FR/EN)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Globe } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { SupportedLanguage } from '@/lib/i18n';
import { SPACING, RADIUS } from '@/constants/appTheme';

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function LanguageSelector() {
  const { colors } = useTheme();
  const { language, setLanguage } = useI18n();

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    if (newLanguage === language) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setLanguage(newLanguage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[LanguageSelector] Erreur changement langue:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.backgroundElevated }]}>
          <Globe size={20} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Langue</Text>
      </View>

      {/* Sélection de langue */}
      <View style={styles.languageOptions}>
        {LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                { backgroundColor: colors.backgroundElevated },
                isSelected && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleLanguageChange(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageLabel,
                  { color: colors.textPrimary },
                  isSelected && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {lang.label}
              </Text>
              {isSelected && (
                <View style={styles.checkMark}>
                  <Text style={styles.checkMarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]}>
        La langue s'applique à toute l'interface de l'app
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
  languageOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
    position: 'relative',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
