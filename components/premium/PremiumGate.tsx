/**
 * PREMIUM GATE - YOROI
 *
 * Enveloppe un écran de contenu premium. Si l'utilisateur n'a pas l'accès,
 * affiche un écran de blocage menant au paywall.
 * Design percutant qui donne vraiment envie de s'abonner.
 */

import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, ArrowRight, Check, Dumbbell, BarChart2, Trophy, Upload, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePremium } from '@/context/PremiumContext';
import type { ReactNode } from 'react';

const PERKS: { Icon: any; label: string; desc: string; color: string; bg: string }[] = [
  {
    Icon: Dumbbell,
    label: 'Séances & historique illimités',
    desc: 'Toutes tes données sans limite de temps',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.10)',
  },
  {
    Icon: BarChart2,
    label: 'Stats avancées & analyses',
    desc: 'Tendances, patterns, comparaisons profondes',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.10)',
  },
  {
    Icon: Trophy,
    label: 'Compétitions, palmarès, records',
    desc: 'Suis ta progression sur le long terme',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
  },
  {
    Icon: Upload,
    label: 'Export & sauvegarde des données',
    desc: 'PDF, CSV, backup automatique inclus',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.10)',
  },
];

interface PremiumGateProps {
  children: ReactNode;
  /** Titre de la fonctionnalité verrouillée, affiché sur l'écran de blocage */
  featureTitle?: string;
}

export function PremiumGate({ children, featureTitle }: PremiumGateProps) {
  const { isPremium, isLoading } = usePremium();

  // Premium d'abord : un abonné (cache local) accède tout de suite au contenu
  if (isPremium) return <>{children}</>;

  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  return <PremiumLockScreen featureTitle={featureTitle} />;
}

export function PremiumLockScreen({ featureTitle }: { featureTitle?: string }) {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero gradient */}
      <LinearGradient
        colors={['#0F0C29', '#302B63', '#24243E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Badge */}
        <View style={styles.heroBadge}>
          <Star size={10} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
          <Text style={styles.heroBadgeText}>YOROI PREMIUM</Text>
        </View>

        {/* Icône centrale */}
        <View style={styles.lockOuter}>
          <View style={styles.lockInner}>
            <Lock size={32} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>

        <Text style={styles.heroTitle}>Fonctionnalité{'\n'}Premium</Text>

        {featureTitle && (
          <View style={styles.featureChip}>
            <Star size={11} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
            <Text style={styles.featureChipText} numberOfLines={1}>{featureTitle}</Text>
          </View>
        )}

        <Text style={styles.heroDesc}>
          Cette fonctionnalité est réservée aux abonnés Yoroi Premium.{'\n'}
          Rejoins des milliers d'athlètes qui progressent plus vite.
        </Text>
      </LinearGradient>

      {/* ── Avantages */}
      <View style={styles.perksSection}>
        <Text style={styles.perksLabel}>Tout ce que tu débloque :</Text>
        <View style={styles.perksCard}>
          {PERKS.map((perk, i) => (
            <View key={perk.label}>
              <View style={styles.perkRow}>
                <View style={[styles.perkIcon, { backgroundColor: perk.bg }]}>
                  <perk.Icon size={16} color={perk.color} strokeWidth={2} />
                </View>
                <View style={styles.perkTextBlock}>
                  <Text style={styles.perkTitle}>{perk.label}</Text>
                  <Text style={styles.perkDesc}>{perk.desc}</Text>
                </View>
                <View style={[styles.checkCircle, { backgroundColor: perk.color + '22' }]}>
                  <Check size={11} color={perk.color} strokeWidth={3} />
                </View>
              </View>
              {i < PERKS.length - 1 && <View style={styles.perkDivider} />}
            </View>
          ))}
        </View>
      </View>

      {/* ── CTA */}
      <View style={styles.ctaSection}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/paywall' as never)}
          style={styles.ctaTouchable}
        >
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Star size={17} color="#FFF" fill="#FFF" strokeWidth={0} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.ctaText}>Passer Premium maintenant</Text>
              <Text style={styles.ctaSubtext}>Sans engagement • Annulable à tout moment</Text>
            </View>
            <ArrowRight size={17} color="#FFF" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backLink}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>Retour à la version gratuite</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flexGrow: 1,
  },
  // ── Hero
  hero: {
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  lockOuter: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockInner: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginTop: 4,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 300,
  },
  featureChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  heroDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 310,
  },
  // ── Perks
  perksSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  perksLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  perksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  perkTextBlock: {
    flex: 1,
  },
  perkTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  perkDesc: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 16,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  perkDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F3F4F6',
    marginLeft: 48,
  },
  // ── CTA
  ctaSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
    alignItems: 'center',
  },
  ctaTouchable: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  ctaSubtext: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
