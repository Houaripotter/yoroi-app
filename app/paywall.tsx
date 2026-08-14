/**
 * PAYWALL - YOROI Premium
 *
 * Ecran d'abonnement : mensuel 3,99 EUR ou annuel 29,99 EUR (essai 7 jours).
 * Les prix reels sont ceux renvoyes par les stores via RevenueCat.
 */

import { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { usePremium, type PremiumPackage } from '@/context/PremiumContext';
import { safeOpenURL } from '@/lib/security/validators';
import { FALLBACK_PRICE_MONTHLY, FALLBACK_PRICE_ANNUAL } from '@/constants/premium';
import { Text } from 'react-native';

const PRIVACY_URL = 'https://easy-woodwind-a70.notion.site/Yoroi-App-2d950188283880dbbd44d7e5abefecbb';
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PRIMARY = '#2872A1';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { icon: 'barbell', title: 'Entrainements illimites', subtitle: 'Journalisez toutes vos seances sans limite' },
  { icon: 'scale', title: 'Suivi du poids complet', subtitle: 'Historique illimite, graphiques et tendances' },
  { icon: 'analytics', title: 'Rapports et analyses', subtitle: 'Rapports hebdomadaires et statistiques avancees' },
  { icon: 'trophy', title: 'Records et objectifs', subtitle: 'Suivez vos progres et battez vos records' },
  { icon: 'cloud-upload', title: 'Sauvegarde et export', subtitle: 'Exportez et sauvegardez vos donnees' },
];

export default function PaywallScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isStoreReady, packages, purchase, restore } = usePremium();

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

  const accentBg = isDark ? `${PRIMARY}25` : `${PRIMARY}12`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Fermer */}
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: accentBg }]}>
            <Ionicons name="star" size={36} color={PRIMARY} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Yoroi Premium</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Toutes vos stats, tous vos entrainements, sans aucune limite
          </Text>
        </View>

        {/* Deja abonne */}
        {isPremium ? (
          <View style={[styles.activeCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            <Text style={[styles.activeText, { color: colors.text }]}>Votre acces Premium est actif</Text>
          </View>
        ) : null}

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.surface }]}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: accentBg }]}>
                <Ionicons name={f.icon} size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[styles.featureSubtitle, { color: colors.textSecondary }]}>{f.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plans */}
        {!isPremium && (
          <>
            {/* Annuel */}
            <TouchableOpacity
              style={[
                styles.planCard,
                { backgroundColor: colors.surface },
                selectedPlan === 'annual' && { borderColor: PRIMARY },
              ]}
              activeOpacity={0.85}
              onPress={() => setSelectedPlan('annual')}
            >
              <View style={[styles.planBadge, { backgroundColor: PRIMARY }]}>
                <Text style={styles.planBadgeText}>7 jours d'essai gratuit</Text>
              </View>
              <View style={styles.planRow}>
                <View>
                  <Text style={[styles.planName, { color: colors.text }]}>Annuel</Text>
                  <Text style={[styles.planDetail, { color: colors.textSecondary }]}>
                    soit 2,50 € par mois environ
                  </Text>
                </View>
                <Text style={[styles.planPrice, { color: colors.text }]}>{annualPrice}</Text>
              </View>
            </TouchableOpacity>

            {/* Mensuel */}
            <TouchableOpacity
              style={[
                styles.planCard,
                { backgroundColor: colors.surface },
                selectedPlan === 'monthly' && { borderColor: PRIMARY },
              ]}
              activeOpacity={0.85}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View style={styles.planRow}>
                <View>
                  <Text style={[styles.planName, { color: colors.text }]}>Mensuel</Text>
                  <Text style={[styles.planDetail, { color: colors.textSecondary }]}>Sans engagement</Text>
                </View>
                <Text style={[styles.planPrice, { color: colors.text }]}>{monthlyPrice}</Text>
              </View>
            </TouchableOpacity>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: PRIMARY }, busy && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={handleSubscribe}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {selectedPlan === 'annual' ? "Commencer l'essai gratuit" : "S'abonner"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Restaurer */}
        <TouchableOpacity onPress={handleRestore} disabled={busy} style={styles.restoreLink}>
          <Text style={[styles.restoreText, { color: PRIMARY }]}>Restaurer mes achats</Text>
        </TouchableOpacity>

        {/* Mentions legales stores */}
        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          Abonnement a renouvellement automatique, facture via votre compte{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}. Annulable a tout moment dans les
          reglages de votre compte, au moins 24 h avant la fin de la periode en cours.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => safeOpenURL(PRIVACY_URL)}>
            <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Confidentialite</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => safeOpenURL(APPLE_EULA_URL)}>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Conditions (EULA)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
    lineHeight: 21,
  },
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
  featuresCard: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 17,
    fontWeight: '800',
  },
  planDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 17,
    fontWeight: '800',
  },
  cta: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  restoreLink: {
    alignSelf: 'center',
    padding: 12,
    marginTop: 4,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
