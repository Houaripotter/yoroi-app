// ============================================
// PREMIUM UPGRADE SCREEN
// Liste les features Premium + CTA achat (IAP à brancher plus tard).
// ============================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, Crown, Check, Smartphone, Zap, TrendingUp, Share2, FileText, Bell, Wifi, Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { unlockPremium, isPremium, lockPremium } from '@/lib/premiumService';

const FEATURES = [
  { icon: Smartphone, color: '#3B82F6', title: 'Widget iOS', desc: 'Tes 3 KPI clés sur l\'écran d\'accueil iPhone' },
  { icon: Zap, color: '#F59E0B', title: 'Live Activity', desc: 'Timer sparring dans la Dynamic Island' },
  { icon: TrendingUp, color: '#A855F7', title: 'Insights auto', desc: 'Analyses intelligentes de ta progression' },
  { icon: Sparkles, color: '#10B981', title: 'Heatmap techniques', desc: 'Visualise tes forces et faiblesses combat' },
  { icon: Share2, color: '#EC4899', title: 'Cartes partage HD', desc: 'Partage tes stats en qualité Instagram 1080×1080' },
  { icon: FileText, color: '#06B6D4', title: 'Export PDF', desc: 'Rapport mensuel imprimable pour ton coach' },
  { icon: Bell, color: '#EF4444', title: 'Récap hebdo', desc: 'Notification intelligente chaque dimanche' },
  { icon: Wifi, color: '#22C55E', title: 'Sync multi-appareils', desc: 'iPhone ↔ iPad en temps réel, 100% local' },
];

export default function PremiumScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentlyPremium, setCurrentlyPremium] = useState(isPremium());

  const handleUpgrade = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    if (loading) return;
    setLoading(true);
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});

    // TODO: brancher `react-native-iap` ou RevenueCat ici.
    // Pour l'instant, on débloque Premium direct (mode dev/beta).
    Alert.alert(
      'Premium',
      'Achat in-app non encore configuré. Activer Premium gratuitement pour tester ?',
      [
        { text: 'Annuler', style: 'cancel', onPress: () => setLoading(false) },
        {
          text: 'Activer',
          onPress: async () => {
            const days = plan === 'monthly' ? 30 : plan === 'yearly' ? 365 : null;
            await unlockPremium(days);
            if (Platform.OS !== 'web') {
              notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            }
            setCurrentlyPremium(true);
            setLoading(false);
            Alert.alert('🎉 Bienvenue dans Premium', 'Toutes les features sont débloquées !');
          },
        },
      ],
    );
  };

  const handleLock = async () => {
    Alert.alert('Désactiver Premium', 'Tu pourras toujours le réactiver plus tard.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          await lockPremium();
          setCurrentlyPremium(false);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIcon}>
            <Crown size={40} color="#FFFFFF" strokeWidth={2.2} fill="#FFFFFF" fillOpacity={0.2} />
          </View>
          <Text style={styles.heroTitle}>Yoroi Premium</Text>
          <Text style={styles.heroSubtitle}>
            Déverrouille l'expérience complète pour progresser plus vite
          </Text>
        </LinearGradient>

        {/* Status actuel */}
        {currentlyPremium && (
          <View style={[styles.statusCard, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
            <Check size={20} color="#10B981" strokeWidth={2.5} />
            <Text style={[styles.statusText, { color: '#10B981' }]}>
              Premium actif — merci de ton soutien 🙏
            </Text>
          </View>
        )}

        {/* Features */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Inclus dans Premium</Text>
        <View style={[styles.featuresCard, { backgroundColor: colors.backgroundCard }]}>
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <View key={i} style={[
                styles.featureRow,
                i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
              ]}>
                <View style={[styles.featureIcon, { backgroundColor: feat.color + '20' }]}>
                  <Icon size={20} color={feat.color} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{feat.title}</Text>
                  <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{feat.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Plans — masqués si Premium actif */}
        {!currentlyPremium && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Choisis ton plan</Text>

            <TouchableOpacity
              style={[styles.planCard, { backgroundColor: colors.backgroundCard, borderColor: '#A855F7' }]}
              onPress={() => handleUpgrade('yearly')}
              activeOpacity={0.85}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>POPULAIRE</Text>
              </View>
              <Text style={[styles.planTitle, { color: colors.textPrimary }]}>Annuel</Text>
              <Text style={[styles.planPrice, { color: '#A855F7' }]}>39,99 €<Text style={styles.planPeriod}>/an</Text></Text>
              <Text style={[styles.planHint, { color: colors.textMuted }]}>Soit 3,33 €/mois · économise 33%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={() => handleUpgrade('monthly')}
              activeOpacity={0.85}
            >
              <Text style={[styles.planTitle, { color: colors.textPrimary }]}>Mensuel</Text>
              <Text style={[styles.planPrice, { color: colors.textPrimary }]}>4,99 €<Text style={styles.planPeriod}>/mois</Text></Text>
              <Text style={[styles.planHint, { color: colors.textMuted }]}>Sans engagement, résiliable</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={() => handleUpgrade('lifetime')}
              activeOpacity={0.85}
            >
              <Text style={[styles.planTitle, { color: colors.textPrimary }]}>À vie</Text>
              <Text style={[styles.planPrice, { color: colors.textPrimary }]}>99,99 €</Text>
              <Text style={[styles.planHint, { color: colors.textMuted }]}>Paiement unique, pour toujours</Text>
            </TouchableOpacity>

            <Text style={[styles.smallPrint, { color: colors.textMuted }]}>
              Essai gratuit 7 jours sur les plans récurrents. Résiliable à tout moment dans les Réglages iOS.
            </Text>
          </>
        )}

        {/* Debug toggle (uniquement en dev) */}
        {__DEV__ && currentlyPremium && (
          <TouchableOpacity
            style={[styles.devBtn, { borderColor: colors.border }]}
            onPress={handleLock}
          >
            <Text style={[styles.devBtnText, { color: colors.textMuted }]}>
              [DEV] Désactiver Premium
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },

  heroCard: {
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30, fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14, fontWeight: '600',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14,
    borderWidth: 1, marginBottom: 20,
  },
  statusText: { fontSize: 13, fontWeight: '800' },

  sectionTitle: {
    fontSize: 12, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, marginTop: 8,
    opacity: 0.7,
  },

  featuresCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  featureIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  featureTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },
  featureDesc: { fontSize: 12, fontWeight: '500', lineHeight: 16 },

  planCard: {
    padding: 20, borderRadius: 18,
    borderWidth: 2, marginBottom: 12,
  },
  popularBadge: {
    position: 'absolute', top: -10, right: 20,
    backgroundColor: '#A855F7',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 9, fontWeight: '900', letterSpacing: 0.5,
  },
  planTitle: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, marginBottom: 6 },
  planPrice: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  planPeriod: { fontSize: 14, fontWeight: '700' },
  planHint: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  smallPrint: {
    fontSize: 11, fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 15,
    paddingHorizontal: 20,
  },

  devBtn: {
    borderWidth: 1, borderRadius: 12,
    padding: 14, marginTop: 20,
    alignItems: 'center',
  },
  devBtnText: { fontSize: 12, fontWeight: '700' },
});
