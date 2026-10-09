/**
 * PremiumTeaser — Yoroi Freemium
 *
 * Bannière affichée en bas des écrans pour les utilisateurs gratuits.
 * Design percutant avec gradient, avantages concrets et CTA fort.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, ArrowRight, Check, Clock, BarChart2, Search, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePremium } from '@/context/PremiumContext';
import { FREE_DAYS_LIMIT } from '@/hooks/useHistoryLimit';

interface PremiumTeaserProps {
  title?: string;
  description?: string;
  variant?: 'history' | 'analytics' | 'detail' | 'default';
  forceShow?: boolean;
}

const VARIANT_CONFIG: Record<string, {
  gradientColors: [string, string, string];
  accentColor: string;
  Icon: LucideIcon;
  defaultTitle: string;
  defaultDesc: string;
  features: string[];
}> = {
  history: {
    gradientColors: ['#1E1B4B', '#4338CA', '#6366F1'],
    accentColor: '#818CF8',
    Icon: Clock,
    defaultTitle: 'Historique complet débloqué',
    defaultDesc: `Tu vois tes ${FREE_DAYS_LIMIT} derniers jours. Passe Premium pour accéder à des mois de données.`,
    features: [
      '30 jours vers 1 an d\'historique',
      'Tendances et progressions réelles',
      'Comparaisons semaine par semaine',
    ],
  },
  analytics: {
    gradientColors: ['#0C1A2E', '#1E3A5F', '#2872A1'],
    accentColor: '#60A5FA',
    Icon: BarChart2,
    defaultTitle: 'Analyses avancées disponibles',
    defaultDesc: 'Tendances, comparaisons et insights détaillés disponibles avec Premium.',
    features: [
      'Graphiques avancés et tendances',
      'Comparaisons période par période',
      'Insights personnalisés',
    ],
  },
  detail: {
    gradientColors: ['#042F2E', '#065F46', '#059669'],
    accentColor: '#34D399',
    Icon: Search,
    defaultTitle: 'Détail complet de tes données',
    defaultDesc: 'Métriques avancées et analyses approfondies disponibles avec Premium.',
    features: [
      'Métriques détaillées par session',
      'Phases et cycles analysés',
      'Corrélations et patterns',
    ],
  },
  default: {
    gradientColors: ['#1C0A00', '#78350F', '#D97706'],
    accentColor: '#FCD34D',
    Icon: Zap,
    defaultTitle: 'Fonctionnalité Premium',
    defaultDesc: 'Débloque tout le potentiel de ton suivi avec Yoroi Premium.',
    features: [
      'Accès illimité à toutes les données',
      'Analytics et stats avancées',
      'Export et sauvegarde inclus',
    ],
  },
};

export function PremiumTeaser({
  title,
  description,
  variant = 'default',
  forceShow = false,
}: PremiumTeaserProps) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const cfg = VARIANT_CONFIG[variant];

  if (isPremium && !forceShow) return null;

  const displayTitle = title ?? cfg.defaultTitle;
  const displayDesc = description ?? cfg.defaultDesc;

  return (
    <View style={styles.container}>
      {/* ── Header gradient */}
      <LinearGradient
        colors={cfg.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Badge */}
        <View style={styles.badge}>
          <Star size={9} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
          <Text style={styles.badgeText}>PREMIUM</Text>
        </View>

        <View style={styles.iconBox}>
          <cfg.Icon size={24} color="#FFFFFF" strokeWidth={1.8} />
        </View>
        <Text style={styles.headerTitle}>{displayTitle}</Text>
        <Text style={styles.headerDesc}>{displayDesc}</Text>
      </LinearGradient>

      {/* ── Avantages */}
      <View style={styles.featuresBlock}>
        {cfg.features.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.checkCircle, { backgroundColor: cfg.accentColor + '22' }]}>
              <Check size={11} color={cfg.accentColor} strokeWidth={3} />
            </View>
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      {/* ── CTA */}
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
          <Star size={14} color="#FFF" fill="#FFF" strokeWidth={0} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.ctaText}>Passer Premium</Text>
            <Text style={styles.ctaSubtext}>Essai gratuit disponible</Text>
          </View>
          <ArrowRight size={14} color="#FFF" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  featuresBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  ctaTouchable: {
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  ctaSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
});
