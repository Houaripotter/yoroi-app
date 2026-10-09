/**
 * PAYWALL - YOROI Premium
 *
 * Ecran d'abonnement : mensuel 3,99 EUR ou annuel 29,99 EUR (essai 7 jours).
 * Les prix reels sont ceux renvoyes par les stores via RevenueCat.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { usePremium, type PremiumPackage } from '@/context/PremiumContext';
import { safeOpenURL } from '@/lib/security/validators';
import { FALLBACK_PRICE_MONTHLY, FALLBACK_PRICE_ANNUAL } from '@/constants/premium';

const PRIVACY_URL = 'https://easy-woodwind-a70.notion.site/Yoroi-App-2d950188283880dbbd44d7e5abefecbb';
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PRIMARY = '#2872A1';
const GREEN_CHECK = '#16A34A';
const GOLD = '#FFD700';

const BENEFIT_CARDS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; color: string; bg: string }[] = [
  {
    icon: 'infinite',
    title: 'Tout illimité',
    text: 'Records, combats, objectifs & mesures sans plafond',
    color: '#10B981',
    bg: '#10B98118',
  },
  {
    icon: 'time',
    title: 'Tout l\'historique',
    text: 'Gratuit : 7 jours. Premium : toutes tes données depuis le début',
    color: '#2872A1',
    bg: '#2872A118',
  },
  {
    icon: 'sparkles',
    title: 'Fonctions exclusives',
    text: 'Vidéos, export CSV, progression, thèmes premium',
    color: '#F59E0B',
    bg: '#F59E0B18',
  },
];

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }[] = [
  { icon: 'infinite',      color: '#10B981', label: 'Trackings & techniques illimités (gratuit : 3 / 5 max)' },
  { icon: 'medal',         color: '#EF4444', label: 'Palmarès illimité (gratuit : 3 combats max)' },
  { icon: 'body',          color: '#8B5CF6', label: 'Mesures corporelles illimitées (gratuit : 3 max)' },
  { icon: 'flag',          color: '#10B981', label: 'Objectifs illimités (gratuit : 3 actifs max)' },
  { icon: 'time',          color: '#2872A1', label: 'Historique complet · gratuit : 7 jours seulement' },
  { icon: 'film',          color: '#EC4899', label: 'Bibliothèque vidéos dans le carnet' },
  { icon: 'download',      color: '#2872A1', label: 'Export de tes données (CSV, JSON, TXT)' },
  { icon: 'color-palette', color: '#F59E0B', label: 'Thèmes premium débloqués' },
];

export default function PaywallScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isStoreReady, packages, purchase, restore, refresh } = usePremium();

  // Recharge les offres si elles n'ont pas pu être chargées au démarrage
  useEffect(() => { void refresh(); }, [refresh]);

  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false);

  const monthlyPkg = useMemo(
    () => packages.find((p) => p.periodLabel === 'par mois') ?? null,
    [packages]
  );
  const annualPkg = useMemo(
    () => packages.find((p) => p.periodLabel === 'par an') ?? null,
    [packages]
  );

  const monthlyPrice = monthlyPkg?.priceString ?? FALLBACK_PRICE_MONTHLY;
  const annualPrice = annualPkg?.priceString ?? FALLBACK_PRICE_ANNUAL;
  // Essai gratuit affiché uniquement si le produit du store propose vraiment une offre d'introduction
  const annualHasTrial = Boolean((annualPkg?.raw as any)?.product?.introPrice);

  const handleSubscribe = async () => {
    const pkg: PremiumPackage | null = selectedPlan === 'annual' ? annualPkg : monthlyPkg;
    if (!isStoreReady || !pkg) {
      Alert.alert(
        'Boutique indisponible',
        "L'abonnement n'est pas disponible pour le moment. Verifiez votre connexion puis reessayez."
      );
      return;
    }
    setBusy(true);
    const result = await purchase(pkg);
    setBusy(false);
    if (result.success) {
      Alert.alert('Bienvenue dans Yoroi Premium', 'Tout le contenu est maintenant deverrouille.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else if (result.error) {
      Alert.alert('Achat impossible', result.error);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    const result = await restore();
    setBusy(false);
    if (result.success && result.restored) {
      Alert.alert('Achats restaures', 'Votre abonnement Premium est de nouveau actif.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else if (result.success) {
      Alert.alert('Aucun achat trouve', 'Aucun abonnement actif associe a ce compte.');
    } else if (result.error) {
      Alert.alert('Restauration impossible', result.error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── SCROLL ── */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO : gradient sombre + titre blanc ── */}
        <LinearGradient
          colors={['#1a4a7a', '#2872A1', '#3d8fc4']}
          style={[styles.heroGradient, { paddingTop: insets.top + 4 }]}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Fermer"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="star" size={42} color={GOLD} />
            </View>
            <Text style={styles.heroTitle}>Yoroi Premium</Text>
            <Text style={styles.heroSubtitle}>
              Passe au niveau supérieur
            </Text>
            <Text style={styles.heroSubtitle2}>
              Sans limites · Tout ton historique · Fonctions exclusives
            </Text>
          </View>
        </LinearGradient>

        {/* ── CARTE BLANCHE arrondie qui remonte sur le gradient ── */}
        <View style={[styles.belowGradient, { backgroundColor: colors.background }]}>

          {/* Card "déjà abonné" */}
          {isPremium ? (
            <View style={[styles.activeCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="checkmark-circle" size={22} color={GREEN_CHECK} />
              <Text style={[styles.activeText, { color: colors.text }]}>Votre accès Premium est actif</Text>
            </View>
          ) : null}

          {/* ── 3 CARTES BÉNÉFICES ── */}
          <View style={styles.benefitRow}>
            {BENEFIT_CARDS.map((card) => (
              <View
                key={card.title}
                style={[styles.benefitCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }]}
              >
                <View style={[styles.benefitIconWrap, { backgroundColor: card.bg }]}>
                  <Ionicons name={card.icon} size={22} color={card.color} />
                </View>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{card.title}</Text>
                <Text style={[styles.benefitText, { color: colors.textSecondary }]}>{card.text}</Text>
              </View>
            ))}
          </View>

          {/* ── LISTE 8 FEATURES ── */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CE QUI EST INCLUS</Text>
          <View style={[styles.featuresCard, { backgroundColor: colors.surface }]}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name={f.icon} size={18} color={f.color} />
                <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>

      {/* ── BARRE STICKY EN BAS — toujours visible ── */}
      {!isPremium && (
        <View
          style={[
            styles.stickyFooter,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.surface,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          {/* Sélecteur plans */}
          <View style={styles.planRow}>
            {/* Plan Annuel */}
            <TouchableOpacity
              style={[
                styles.planPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedPlan === 'annual' ? PRIMARY : 'transparent',
                },
              ]}
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.85}
              accessibilityLabel="Plan annuel"
              accessibilityRole="button"
            >
              {/* Badge économie */}
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>ÉCONOMISE 37 %</Text>
              </View>
              <Text style={[styles.planPillName, { color: colors.text }]}>Annuel</Text>
              <Text style={[styles.planPillPrice, { color: colors.text }]}>{annualPrice}</Text>
              <Text style={[styles.planPillDetail, { color: colors.textSecondary }]}>{annualHasTrial ? '7j gratuit inclus' : 'Facturé annuellement'}</Text>
            </TouchableOpacity>

            {/* Plan Mensuel */}
            <TouchableOpacity
              style={[
                styles.planPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedPlan === 'monthly' ? PRIMARY : 'transparent',
                },
              ]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.85}
              accessibilityLabel="Plan mensuel"
              accessibilityRole="button"
            >
              <Text style={[styles.planPillName, { color: colors.text }]}>Mensuel</Text>
              <Text style={[styles.planPillPrice, { color: colors.text }]}>{monthlyPrice}</Text>
              <Text style={[styles.planPillDetail, { color: colors.textSecondary }]}>Sans engagement</Text>
            </TouchableOpacity>
          </View>

          {/* CTA — or brillant pour attirer l'œil */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubscribe}
            disabled={busy}
            accessibilityLabel={selectedPlan === 'annual' && annualHasTrial ? "Commencer l'essai gratuit" : "S'abonner"}
            accessibilityRole="button"
            style={busy ? { opacity: 0.6 } : undefined}
          >
            <LinearGradient
              colors={['#FFE000', '#FFD700', '#FFC800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {busy ? (
                <ActivityIndicator color="#0D1B2A" />
              ) : (
                <Text style={styles.ctaTextDark}>
                  {selectedPlan === 'annual' && annualHasTrial ? "Commencer l'essai gratuit" : "S'abonner maintenant"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Mention rassurante sous le CTA */}
          <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>
            {`Abonnement renouvelé automatiquement (${selectedPlan === 'annual' ? `${annualPrice} par an` : `${monthlyPrice} par mois`}) sauf résiliation au moins 24 h avant la fin de la période, depuis les réglages de ton compte ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}.`}
          </Text>

          {/* Restaurer + mentions légales */}
          <View style={styles.footerBottom}>
            <TouchableOpacity
              onPress={handleRestore}
              disabled={busy}
              accessibilityLabel="Restaurer mes achats"
              accessibilityRole="button"
            >
              <Text style={[styles.restoreText, { color: PRIMARY }]}>Restaurer mes achats</Text>
            </TouchableOpacity>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => safeOpenURL(PRIVACY_URL)}>
                <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Confidentialité</Text>
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => safeOpenURL(APPLE_EULA_URL)}>
                  <Text style={[styles.legalLink, { color: colors.textSecondary }]}>EULA</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Si déjà premium : juste le lien restaurer */}
      {isPremium && (
        <View
          style={[
            styles.stickyFooterSimple,
            {
              paddingBottom: insets.bottom + 8,
              borderTopColor: colors.surface,
              backgroundColor: colors.background,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleRestore}
            disabled={busy}
            accessibilityLabel="Restaurer mes achats"
            accessibilityRole="button"
          >
            <Text style={[styles.restoreText, { color: PRIMARY }]}>Restaurer mes achats</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── HERO ── */
  heroGradient: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  hero: {
    alignItems: 'center',
    marginTop: 2,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  heroSubtitle2: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    color: 'rgba(255,255,255,0.55)',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  socialProofRow: {},
  socialProofText: {},

  /* ── LAYOUT ── */
  belowGradient: {
    paddingHorizontal: 16,
    paddingTop: 24,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  /* ── CARD PREMIUM ACTIF ── */
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  activeText: {
    fontSize: 15,
    fontWeight: '700',
  },

  /* ── 3 CARTES BÉNÉFICES ── */
  benefitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  benefitCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  benefitText: {
    fontSize: 11,
    lineHeight: 15,
  },

  /* ── LISTE FEATURES ── */
  featuresCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },

  /* ── FOOTER STICKY ── */
  stickyFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  stickyFooterSimple: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  /* ── PLANS ── */
  planRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  planPill: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 2,
  },
  saveBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  planPillName: {
    fontSize: 15,
    fontWeight: '800',
  },
  planPillPrice: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  planPillDetail: {
    fontSize: 11,
    marginTop: 1,
  },

  /* ── CTA ── */
  cta: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 2,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  ctaTextDark: {
    color: '#1B3A5C',
    fontSize: 17,
    fontWeight: '800',
  },
  ctaSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 2,
  },

  /* ── FOOTER BOTTOM ── */
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  legalLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
