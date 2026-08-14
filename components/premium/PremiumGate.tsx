/**
 * PREMIUM GATE - YOROI
 *
 * Enveloppe un ecran de contenu premium. Si l'utilisateur n'a pas l'acces,
 * affiche un ecran de deverrouillage menant au paywall.
 */

import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { usePremium } from '@/context/PremiumContext';
import type { ReactNode } from 'react';

const PRIMARY = '#2872A1';
const GOLD = '#F59E0B';

const PERKS: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }[] = [
  { icon: 'barbell', label: 'Seances et historique illimites', color: PRIMARY, bg: 'rgba(40,114,161,0.10)' },
  { icon: 'analytics', label: 'Stats avancees et analyses', color: '#7C5CE0', bg: 'rgba(124,92,224,0.10)' },
  { icon: 'trophy', label: 'Competitions, palmares, records', color: '#E6953A', bg: 'rgba(230,149,58,0.10)' },
  { icon: 'cloud-upload', label: 'Export et sauvegarde des donnees', color: '#0E9AA7', bg: 'rgba(14,154,167,0.10)' },
];

const SPECTRUM = [PRIMARY, '#7C5CE0', '#E6953A', '#0E9AA7', '#D9486B'];

interface PremiumGateProps {
  children: ReactNode;
  /** Titre de la fonctionnalite verrouillee, affiche sur l'ecran de blocage */
  featureTitle?: string;
}

export function PremiumGate({ children, featureTitle }: PremiumGateProps) {
  const { isPremium, isLoading } = usePremium();

  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  if (isPremium) return <>{children}</>;
  return <PremiumLockScreen featureTitle={featureTitle} />;
}

export function PremiumLockScreen({ featureTitle }: { featureTitle?: string }) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Cadenas dore */}
      <View style={[styles.lockOuter, { backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.10)' }]}>
        <View style={styles.lockInner}>
          <Ionicons name="lock-closed" size={34} color="#FFFFFF" />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Fonctionnalite Premium</Text>

      {/* Barre spectre */}
      <View style={styles.spectrumRow}>
        {SPECTRUM.map((col, i) => (
          <View key={i} style={[styles.spectrumSeg, { backgroundColor: col }]} />
        ))}
      </View>

      {featureTitle ? (
        <View style={[styles.chip, { backgroundColor: isDark ? colors.surface : 'rgba(40,114,161,0.08)' }]}>
          <Ionicons name="star-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>
            {featureTitle}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Cette fonctionnalite est reservee aux abonnes Yoroi Premium.
        Debloquez tout le potentiel de votre suivi sport et combat.
      </Text>

      {/* Avantages */}
      <View style={[styles.perksCard, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#DAE8F2' }]}>
        {PERKS.map((perk, i) => (
          <View key={perk.label}>
            <View style={styles.perkRow}>
              <View style={[styles.perkIcon, { backgroundColor: perk.bg }]}>
                <Ionicons name={perk.icon} size={16} color={perk.color} />
              </View>
              <Text style={[styles.perkText, { color: colors.text }]}>{perk.label}</Text>
              <Ionicons name="checkmark-circle" size={16} color={perk.color} />
            </View>
            {i < PERKS.length - 1 && (
              <View style={[styles.perkDivider, { backgroundColor: isDark ? colors.border : '#EDF3F8' }]} />
            )}
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.85}
        onPress={() => router.push('/paywall' as never)}
      >
        <Ionicons name="star" size={18} color="#FFFFFF" />
        <Text style={styles.ctaText}>Decouvrir Yoroi Premium</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
        <Text style={[styles.backText, { color: colors.textSecondary }]}>Retour</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockOuter: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  lockInner: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  spectrumRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  spectrumSeg: {
    width: 22,
    height: 4,
    borderRadius: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
    maxWidth: 300,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  perksCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 24,
    borderWidth: 1,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
  },
  perkDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 40,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 0,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  backLink: {
    marginTop: 16,
    padding: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
