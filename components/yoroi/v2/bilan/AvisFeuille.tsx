/**
 * Feuille « Tu aimes YOROI ? » (16 octobre 2026) : la demande de note sur le store, au style v2.
 * Ouverte par l'hote (BilanAuto) 5 secondes apres « Terminer » d'un bilan, selon lib/v2/bilan/avis.ts.
 * iOS : « Noter sur l'App Store » ; Android : « Noter sur Google Play ». Fenetre native d'expo-store-review
 * quand elle est disponible, sinon la fiche du store (lib/appConfig.ts).
 * 16 octobre soir (Houari : « tu aurais pu faire quelque chose de joli, avec mon petit logo ») : l'icone de l'app
 * posee a cheval sur le bord de la feuille, cinq etoiles dorees dessinees qui s'allument une a une, un message
 * court avec les mots cles en couleur, un gros bouton et « Plus tard » discret. Mouvement reduit : tout est
 * affiche d'un coup.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Linking, Modal, Platform, Pressable, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ouvrirFicheStore } from '@/lib/appConfig';
import { logger } from '@/lib/security/logger';

const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');
const TAILLE_LOGO = 108;
const NB_ETOILES = 5;

export const nomDuStore = () => (Platform.OS === 'android' ? 'Google Play' : 'l’App Store');

/** La fenetre de note du systeme, sinon la fiche du store */
export async function ouvrirNoteStore(): Promise<void> {
  try {
    if (Platform.OS !== 'web' && (await StoreReview.isAvailableAsync()) && (await StoreReview.hasAction())) {
      await StoreReview.requestReview();
      return;
    }
  } catch (e) {
    logger.info('[Avis maison] fenetre native indisponible', e);
  }
  // 17 octobre : Android, l'app Play Store (market://) puis la fiche https ; iOS, la page d'avis de l'App Store
  const ouvert = await ouvrirFicheStore((url) => Linking.openURL(url));
  if (!ouvert) logger.warn('[Avis maison] fiche du store impossible a ouvrir');
}

const ETOILE = 'M12 2.6l2.85 5.9 6.45.86-4.72 4.45 1.2 6.38L12 17.1l-5.78 3.09 1.2-6.38L2.7 9.36l6.45-.86z';

function Etoile({ fill, stroke, size }: { fill: string; stroke: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={ETOILE} fill={fill} stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />
    </Svg>
  );
}

/** Une etoile : son contour gris, puis l'or qui s'allume par-dessus */
function EtoileQuiSAllume({ v, size, eteinte, or, bord }: { v: Animated.Value; size: number; eteinte: string; or: string; bord: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute' }}>
        <Etoile fill="transparent" stroke={eteinte} size={size} />
      </View>
      <Animated.View style={{ position: 'absolute', opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 1.18, 1] }) }] }}>
        <Etoile fill={or} stroke={bord} size={size} />
      </Animated.View>
    </View>
  );
}

export function AvisFeuille({ visible, onNoter, onPlusTard }: { visible: boolean; onNoter: () => void; onPlusTard: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const etoiles = useRef(Array.from({ length: NB_ETOILES }, () => new Animated.Value(0))).current;
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => alive && setReduit(!!r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (reduit) {
      anim.setValue(1);
      etoiles.forEach((e) => e.setValue(1));
      return;
    }
    anim.setValue(0);
    etoiles.forEach((e) => e.setValue(0));
    const entree = Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    const allumage = Animated.stagger(
      110,
      etoiles.map((e) => Animated.timing(e, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
    );
    const seq = Animated.sequence([entree, Animated.delay(80), allumage]);
    seq.start();
    return () => seq.stop();
  }, [visible, reduit, anim, etoiles]);

  if (!visible) return null;
  const store = nomDuStore();
  const bouton = Platform.OS === 'android' ? 'Noter sur Google Play' : 'Noter sur l’App Store';
  const or = theme.isDark ? c.goldLight : c.gold;
  const bordOr = theme.isDark ? c.gold : c.goldDeep;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onPlusTard}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(15,17,24,0.5)', opacity: anim }}>
        <Pressable style={{ flex: 1 }} onPress={onPlusTard} accessibilityRole="button" accessibilityLabel="Fermer" />
        <Animated.View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.background,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 16,
            alignItems: 'center',
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
          }}
        >
          {/* l'icone de l'app, a cheval sur le bord de la feuille */}
          <View
            style={{
              marginTop: -TAILLE_LOGO / 2,
              width: TAILLE_LOGO + 8,
              height: TAILLE_LOGO + 8,
              borderRadius: (TAILLE_LOGO + 8) * 0.25,
              backgroundColor: c.background,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: theme.isDark ? 0.4 : 0.16,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image source={LOGO} style={{ width: TAILLE_LOGO, height: TAILLE_LOGO, borderRadius: TAILLE_LOGO * 0.23 }} resizeMode="cover" />
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {etoiles.map((v, i) => (
              <EtoileQuiSAllume key={i} v={v} size={34} eteinte={c.textMuted} or={or} bord={bordOr} />
            ))}
          </View>

          <Ink size={28} weight="black" tight style={{ textAlign: 'center', marginTop: 16 }} accessibilityRole="header">
            Tu aimes YOROI ?
          </Ink>
          <Ink size={16} color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 24, marginTop: 8, maxWidth: 330 }}>
            <Ink size={16} weight="extraBold" color={c.accent} style={{ lineHeight: 24 }}>{`Ta note sur ${store}`}</Ink>
            {' aide d’autres sportifs à trouver l’app. '}
            <Ink size={16} weight="extraBold" color={c.successText} style={{ lineHeight: 24 }}>Dix secondes</Ink>
            {' suffisent. Merci à toi.'}
          </Ink>

          <Pressable
            onPress={onNoter}
            accessibilityRole="button"
            accessibilityLabel={bouton}
            style={({ pressed }) => ({ alignSelf: 'stretch', marginTop: 22, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, backgroundColor: pressed ? c.accentPressed : c.accent })}
          >
            <Etoile fill={c.onAccent} stroke={c.onAccent} size={19} />
            <Ink size={17} weight="extraBold" color={c.onAccent}>
              {bouton}
            </Ink>
          </Pressable>
          <Pressable
            onPress={onPlusTard}
            accessibilityRole="button"
            accessibilityLabel="Plus tard"
            hitSlop={{ top: 6, bottom: 6, left: 20, right: 20 }}
            style={({ pressed }) => ({ marginTop: 6, minHeight: 46, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <Ink size={15} weight="bold" color={c.textSecondary}>
              Plus tard
            </Ink>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
