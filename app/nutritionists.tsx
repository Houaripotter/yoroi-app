// ============================================
// YOROI - ÉCRAN NUTRITIONNISTES
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { NUTRITIONISTS } from '@/data/partners';

export default function NutritionistsScreen() {
  const { colors } = useTheme();

  const openEmail = () => {
    const email = 'partenaires@yoroi-app.com';
    const subject = 'Partenariat Nutritionniste - YOROI';
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Nutritionnistes
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Experts en nutrition
          </Text>
        </View>
      </View>

      {/* Coming Soon Content */}
      <View style={styles.content}>
        <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={styles.emptyIcon}>🍎</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Bientôt disponible
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nous travaillons à établir des partenariats avec des nutritionnistes qualifiés pour t'accompagner dans ton parcours.
          </Text>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.accent }]}
            onPress={openEmail}
            activeOpacity={0.8}
          >
            <Mail size={18} color={colors.textOnAccent} />
            <Text style={[styles.ctaText, { color: colors.textOnAccent }]}>
              Devenir partenaire
            </Text>
          </TouchableOpacity>

          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Tu es nutritionniste ? Rejoins le réseau YOROI !
          </Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyCard: {
    width: '100%',
    padding: SPACING.xxl,
    borderRadius: RADIUS.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT.size.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  ctaText: {
    fontSize: FONT.size.md,
    fontWeight: '700',
  },
  infoText: {
    fontSize: FONT.size.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
