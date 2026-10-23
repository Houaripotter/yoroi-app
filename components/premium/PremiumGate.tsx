/**
 * PREMIUM GATE - YOROI (mur Premium, 13 octobre 2026)
 *
 * Enveloppe un ecran de contenu premium. Si l'utilisateur n'a pas l'acces, le mur MONTRE ce qui est bloque :
 * les premieres lignes du vrai ecran, nettes, effacees vers le bas par un degrade vers la couleur de fond
 * (le mode sombre suit), puis une carte d'appel qui parle de CE contenu : libelle, phrase, couleur et compteur
 * viennent de la source (lib/v2/premium/sources.ts). Plus de flou de tout l'ecran.
 * L'ecran du dessous reste non interactif (pointerEvents none) et cache aux lecteurs d'ecran.
 * apercu="aucun" : pour un ecran dont les premieres lignes ne veulent rien dire, une illustration propre a la place.
 * Le bouton OUVRE le paywall avec la source (pas d'achat direct, decision de Houari : on garde l'etape paywall_view).
 * Mesure : premium_gate_hit a l'affichage, premium_gate_cta au bouton (noterMurPremium).
 */

import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import Svg, { Path } from 'react-native-svg';
import { usePremium } from '@/context/PremiumContext';
import type { ReactNode } from 'react';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { PREMIUM_ROWS } from '@/lib/v2/premium/offer';
import { SOURCES, couleurA, couleursSource, noterMurPremium, ouvrirPaywall, type SourcePremium } from '@/lib/v2/premium/sources';
import { P, blancA, paperA } from '@/components/yoroi/livePalette';
import { CheckMark, GoldVein, PerkIcon, PerkRow, PremiumBadge, PremiumButton, PremiumSeal, premiumTap } from './premiumKit';
import { traduire } from '@/lib/i18n/tr';

const SCENE = require('@/assets/avatars/app/themes/theme_dojo.webp');
const WARRIOR = require('@/assets/avatars/app/guerrier/guerrier_h_5_shogun.webp');

// Une seule liste d'avantages, partagee avec le paywall (lib/v2/premium/offer.ts)
const PERKS = PREMIUM_ROWS.map((r) => ({ icon: r.perkIcon, label: r.label, desc: r.desc }));

const DEFAULT_PERKS = PREMIUM_ROWS.slice(0, 3).map((r) => r.desc);

interface PremiumGateProps {
  children: ReactNode;
  /** D'ou vient le blocage (liste fermee) : libelle, phrase, couleur du mur et source du paywall */
  source: SourcePremium;
  /** Vrai nombre de l'appelant (seances, rounds, photos...), jamais invente ; rend la phrase concrete */
  compteur?: number | null;
  /** 'ecran' (defaut) : les premieres lignes du vrai ecran ; 'aucun' : une illustration propre a la place */
  apercu?: 'ecran' | 'aucun';
  /** Ancien titre de la fonctionnalite : le libelle de la source le remplace, garde pour compatibilite */
  featureTitle?: string;
  /** 2 ou 3 avantages concrets de cet ecran (optionnel) */
  perks?: string[];
  /** Phrase en plus sous celle de la source (optionnel) */
  description?: string;
}

export function PremiumGate({ children, ...props }: PremiumGateProps) {
  const { isPremium, isLoading } = usePremium();

  // Premium d'abord : un abonne (cache local) accede tout de suite au contenu
  if (isPremium) return <>{children}</>;

  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  return <PremiumPreview {...props}>{children}</PremiumPreview>;
}

/**
 * Mur Premium : le haut du vrai ecran, net puis efface par un degrade, et la carte d'appel de la source dessous.
 */
export function PremiumPreview({ children, source, compteur = null, apercu = 'ecran', perks, description }: PremiumGateProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const info = SOURCES[source];
  const { encre, fond } = couleursSource(c, info.accent);
  const list = (perks && perks.length > 0 ? perks : DEFAULT_PERKS).slice(0, 3);
  // les trois ou quatre premieres lignes de l'ecran : son en-tete et le debut de son contenu
  const hautApercu = insets.top + Math.round(Math.min(320, winH * 0.38));

  useEffect(() => {
    noterMurPremium(source, 'premium_gate_hit', compteur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // sans historique (le web apres un rechargement, un ecran d'onglet) : retour aux onglets, jamais a l'ecran de demarrage
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  return (
    <View style={[styles.scroll, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {apercu === 'ecran' ? (
          /* Le vrai ecran, a sa taille reelle mais coupe a son haut : net, non interactif, cache aux lecteurs d'ecran */
          <View style={{ height: hautApercu, overflow: 'hidden' }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: winH }} pointerEvents="none">
              {children}
            </View>
            <LinearGradient
              pointerEvents="none"
              colors={[couleurA(c.background, 0), couleurA(c.background, 0.75), c.background]}
              locations={[0.3, 0.72, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <View style={{ height: insets.top + 150, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 36 }} accessible={false}>
            <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={info.icone} size={40} color={encre} stroke={1.8} />
            </View>
          </View>
        )}

        <Animated.View entering={ENTREE} style={[styles.previewCard, { marginTop: apercu === 'ecran' ? -36 : 0, shadowColor: c.shadow, borderColor: couleurA(encre, 0.4), backgroundColor: c.surface }]}>
          <View style={styles.previewHead}>
            <View style={{ flex: 1, gap: 8 }}>
              <PremiumBadge />
              <Ink size={22} weight="black" tight accessibilityRole="header">
                {traduire(info.libelle)}
              </Ink>
            </View>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={info.icone} size={24} color={encre} />
            </View>
          </View>

          <Ink size={15} weight="bold" color={c.textSecondary} style={{ lineHeight: 21, marginTop: 10 }}>
            {info.phrase(compteur)}
          </Ink>
          {description ? (
            <Ink size={14} weight="medium" color={c.textSecondary} style={{ lineHeight: 20, marginTop: 6 }}>
              {description}
            </Ink>
          ) : null}

          <View style={{ marginTop: 14, gap: 10 }}>
            {list.map((label) => (
              <View key={label} style={styles.perkLine}>
                <View style={[styles.perkDot, { backgroundColor: fond }]}>
                  <CheckMark color={encre} size={14} />
                </View>
                <Ink size={14} weight="bold" style={{ flex: 1, lineHeight: 20 }}>
                  {label}
                </Ink>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => {
              premiumTap();
              noterMurPremium(source, 'premium_gate_cta', compteur);
              ouvrirPaywall(source, compteur);
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Débloquer avec Premium, {0}", info.libelle)}
            style={({ pressed }) => [styles.redBtn, { backgroundColor: pressed ? c.accentPressed : c.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Ink size={16} weight="extraBold" color={c.onAccent}>
              {traduire("Débloquer avec Premium")}</Ink>
          </Pressable>
          <Pressable onPress={goBack} accessibilityRole="button" style={styles.backLink} hitSlop={6}>
            <Ink size={14} weight="bold" color={c.textSecondary}>
              {traduire("Plus tard")}</Ink>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Retour, pose a la place de celui de l'ecran du dessous */}
      <View style={[styles.previewTop, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={traduire("Retour")}
          hitSlop={6}
          style={({ pressed }) => [styles.round, { backgroundColor: blancA(0.92), borderColor: P.tuileBord, shadowColor: c.ink, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5l-7 7 7 7" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

/** Ancien ecran de blocage plein ecran, garde pour compatibilite */
export function PremiumLockScreen({ featureTitle, source }: { featureTitle?: string; source?: SourcePremium }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const heroH = Math.round(Math.min(width * 0.95, 420)) + insets.top;

  // sans historique (le web apres un rechargement, un ecran d'onglet) : retour aux onglets, jamais a l'ecran de demarrage
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: c.background }]} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Scene illustree */}
      <View style={[styles.hero, { height: heroH }]}>
        <Image source={SCENE} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={[paperA(0), paperA(0.35), c.background]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
        <Animated.View entering={ENTREE} style={styles.warriorWrap} pointerEvents="none">
          <Image source={WARRIOR} style={{ width: heroH * 0.62, height: heroH * 0.83 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={traduire("Retour")}
            hitSlop={6}
            style={({ pressed }) => [styles.round, { backgroundColor: blancA(0.86), borderColor: P.tuileBord, shadowColor: c.ink, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M15 5l-7 7 7 7" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <PremiumBadge light />
        </View>
      </View>

      {/* Carte en verre */}
      <Animated.View entering={ENTREE} style={[styles.glass, { marginTop: -84, shadowColor: c.shadow, backgroundColor: blancA(0.9), borderColor: P.tuileBord }]}>
        <View style={styles.glassHead}>
          <View style={{ flex: 1, gap: 6 }}>
            <Ink size={14} weight="bold" color={c.goldDeep}>
              {traduire("Pièce d'armure réservée")}</Ink>
            <Ink size={30} weight="black" tight>
              {featureTitle ?? traduire('Fonctionnalité Premium')}
            </Ink>
          </View>
          <PremiumSeal size={62} />
        </View>
        <GoldVein style={{ marginVertical: 12 }} />
        <Ink size={15} weight="medium" color={c.textSecondary} style={{ lineHeight: 22 }}>
          {traduire("Cette partie est réservée aux membres Premium. Débloque-la pour forger ton armure complète.")}</Ink>
      </Animated.View>

      {/* Avantages */}
      <Animated.View entering={ENTREE} style={styles.section}>
        <Ink size={19} weight="black" tight style={{ paddingHorizontal: 4, marginBottom: 8 }}>
          {traduire("Tout ce que tu débloques")}</Ink>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
          {PERKS.map((perk, i) => (
            <View key={perk.label}>
              <PerkRow label={traduire(perk.label)} desc={perk.desc} icon={<PerkIcon name={perk.icon} color={c.goldDeep} />} />
              {i < PERKS.length - 1 ? <View style={[styles.divider, { backgroundColor: c.divider }]} /> : null}
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Action */}
      <View style={[styles.ctaSection, { paddingBottom: insets.bottom + 32 }]}>
        <PremiumButton label={traduire("Passer Premium")} sub={traduire("Sans engagement, annulable à tout moment")} onPress={() => ouvrirPaywall(source ?? 'app')} />
        <Pressable onPress={goBack} accessibilityRole="button" style={styles.backLink} hitSlop={8}>
          <Ink size={14} weight="bold" color={c.textSecondary}>
            {traduire("Retour à la version gratuite")}</Ink>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
  },
  warriorWrap: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  glass: {
    marginHorizontal: 22,
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  glassHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  section: {
    paddingHorizontal: 22,
    paddingTop: 26,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    marginLeft: 52,
  },
  previewTop: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    marginHorizontal: 20,
  },
  previewHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  perkLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBtn: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  ctaSection: {
    paddingHorizontal: 22,
    paddingTop: 24,
    gap: 10,
    alignItems: 'stretch',
  },
  backLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
