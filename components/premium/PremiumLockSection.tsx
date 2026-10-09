/**
 * PremiumLockSection — Yoroi Freemium
 *
 * Bloc "cadenas" visible DANS les écrans sur les sections premium.
 * Design percutant avec gradient, avantages et CTA fort.
 * Invisible pour les utilisateurs Premium.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Star, ArrowRight, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePremium } from '@/context/PremiumContext';

interface PremiumLockSectionProps {
  title: string;
  description?: string;
  forceShow?: boolean;
}

export function PremiumLockSection({
  title,
  description,
  forceShow = false,
}: PremiumLockSectionProps) {
  const router = useRouter();
  const { isPremium } = usePremium();

  if (isPremium && !forceShow) return null;

  return (
    <View style={styles.container}>
      {/* ── Header dégradé */}
      <LinearGradient
        colors={['#1C1917', '#44403C', '#78716C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Badge */}
        <View style={styles.badge}>
          <Star size={9} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
          <Text style={styles.badgeText}>PREMIUM</Text>
        </View>

        {/* Icône cadenas */}
        <View style={styles.lockCircle}>
          <Lock size={26} color="#FFFFFF" strokeWidth={2} />
        </View>

        <Text style={styles.headerTitle}>{title}</Text>
        {description && (
          <Text style={styles.headerDesc}>{description}</Text>
        )}
      </LinearGradient>

      {/* ── Ce que tu débloque */}
      <View style={styles.body}>
        <Text style={styles.bodyLabel}>Ce que tu débloque :</Text>
        <View style={styles.featuresBlock}>
          {[
            'Données illimitées sans restriction',
            'Tendances et analyses sur la durée',
            'Comparaisons et insights avancés',
          ].map((feat, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Check size={11} color="#F59E0B" strokeWidth={3} />
              </View>
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
        </View>
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
          <Star size={15} color="#FFF" fill="#FFF" strokeWidth={0} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.ctaText}>Débloquer avec Premium</Text>
            <Text style={styles.ctaSubtext}>Essai gratuit disponible</Text>
          </View>
          <ArrowRight size={15} color="#FFF" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
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
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  lockCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
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
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  bodyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  featuresBlock: {
    gap: 8,
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
    backgroundColor: 'rgba(245,158,11,0.12)',
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
    paddingVertical: 14,
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
