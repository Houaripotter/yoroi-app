/**
 * PremiumModal — Yoroi Freemium
 *
 * Popup bottom-sheet réutilisable pour présenter une fonctionnalité premium.
 * S'affiche à chaque visite de la section concernée, dismissable via X.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Star, ArrowRight, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  /** Icône lucide affichée dans le header */
  Icon: LucideIcon;
  /** Couleurs du dégradé header [haut, milieu, bas] */
  gradientColors: [string, string, string];
  title: string;
  description: string;
  /** Liste de 3-4 avantages concrets */
  features: string[];
}

export function PremiumModal({
  visible,
  onClose,
  Icon,
  gradientColors,
  title,
  description,
  features,
}: PremiumModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Header gradient */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Bouton fermer */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={16} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Badge */}
            <View style={styles.badge}>
              <Star size={10} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
              <Text style={styles.badgeText}>PREMIUM</Text>
            </View>

            {/* Icône centrale */}
            <View style={styles.iconCircle}>
              <Icon size={28} color="#FFFFFF" strokeWidth={1.8} />
            </View>

            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerDesc}>{description}</Text>
          </LinearGradient>

          {/* ── Avantages */}
          <View style={styles.body}>
            <Text style={styles.bodyLabel}>Ce que tu débloque</Text>
            {features.map((feat, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.checkCircle}>
                  <Check size={11} color="#F59E0B" strokeWidth={3} />
                </View>
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>

          {/* ── CTA */}
          <View style={styles.ctaWrapper}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                router.push('/paywall' as never);
              }}
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
                  <Text style={styles.ctaText}>Passer Premium</Text>
                  <Text style={styles.ctaSubtext}>Essai gratuit disponible</Text>
                </View>
                <ArrowRight size={15} color="#FFF" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.skipText}>Non merci, continuer gratuitement</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 28,
    paddingBottom: 26,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  headerDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 10,
  },
  bodyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  ctaWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 4,
    gap: 10,
    alignItems: 'center',
  },
  ctaTouchable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 7,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
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
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
