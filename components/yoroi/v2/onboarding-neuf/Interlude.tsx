/**
 * onboarding-neuf/Interlude.tsx : l'interlude et le mur de photos, copie d'INRO (components/onboarding-nuit/Claque.tsx).
 *
 * 1. Le fond bleu nuit arrive en glissant depuis la droite (480 ms), coins de 30 qui deviennent carres une fois pose.
 * 2. Cinq phrases au centre : chacune monte en fondu (520 ms, la premiere apres 600 ms, les suivantes apres 220 ms)
 *    et reste 1 450 ms. La precedente monte de 60 points en palissant a 42 % (280 ms), attend 250 ms, puis part.
 * 3. La derniere, « T'es au bon endroit, Prenom » (le prenom en or clair), reste ; 600 ms apres, le mur arrive autour
 *    d'elle : quatre rangees de photos facon polaroid qui defilent en sens opposes, a 26 points par seconde.
 * 4. Le bouton creme arrive 2 000 ms apres le mur.
 *
 * Photos 1 a 17 (theme.ts, MUR), en petit (MINIS) : le mur arrive d'un coup. Chaque photo est recadree en 3 sur 4,
 * jamais etiree.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { traduire } from '@/lib/i18n/tr';
import { Bouton, ND, Txt } from './kit';
import { FONT, MINIS, MUR, PHOTOS, useNuit } from './theme';

/** Les phrases, dans l'ordre (plan B3). La derniere recoit le prenom. */
export function phrasesInterlude(prenom: string): string[] {
  const p = prenom.trim();
  return [
    traduire('YOROI, ton carnet d’entraînement'),
    traduire('Fait par un pratiquant, pour toi'),
    traduire('Marre de perdre le fil de tes séances ?'),
    traduire('Ton poids bouge tous les jours sans que tu comprennes ?'),
    p ? traduire('T’es au bon endroit, {0}', '\u0000') : traduire('T’es au bon endroit'),
  ];
}

const ENTREE = 520;
const TENUE = 1450;
const SORTIE = 900;
const GLISSE = 480;
const DELAI_BOUTON = 2000;
/** Vitesse du defilement : environ une photo toutes les cinq secondes */
const VITESSE = 26;

function photosUniques(): ImageSourcePropType[] {
  const vues = new Set<unknown>();
  const out: ImageSourcePropType[] = [];
  MUR.forEach((cle) => {
    const src = MINIS[cle] ?? PHOTOS[cle];
    if (vues.has(src)) return;
    vues.add(src);
    out.push(src);
  });
  return out;
}

const ANGLES = [-2.2, 1.4, -0.8, 2.4, -1.6, 0.9, -2.6, 1.9, -1.1, 2.1, -0.5, 1.2];
const DECALAGES = [0, 4, -3, 2, -4, 3, -1, 5, -2, 1, -5, 2];

function Rangee({ images, sens, w, h, graine, cadre, ombre }: { images: ImageSourcePropType[]; sens: 1 | -1; w: number; h: number; graine: number; cadre: string; ombre: string }) {
  const x = useRef(new Animated.Value(0)).current;
  const BORD = Math.round(w * 0.05);
  const BAS = Math.round(w * 0.16);
  const ECART = Math.round(w * 0.1);
  const pas = w + BORD * 2 + ECART;
  const largeur = images.length * pas;

  useEffect(() => {
    x.setValue(0);
    const a = Animated.loop(Animated.timing(x, { toValue: 1, duration: (largeur / VITESSE) * 1000, easing: Easing.linear, useNativeDriver: ND }));
    a.start();
    return () => a.stop();
  }, [x, largeur]);

  const depart = -((graine * pas) / 2.5) % largeur;
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: sens === 1 ? [depart, depart - largeur] : [depart - largeur, depart] });
  const liste = [...images, ...images, ...images];

  return (
    <View style={{ height: h + BORD + BAS + 12, justifyContent: 'center' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
        {liste.map((src, n) => {
          const k = (n + graine * 5) % ANGLES.length;
          return (
            <View
              key={n}
              style={{
                marginRight: ECART,
                padding: BORD,
                paddingBottom: BAS,
                backgroundColor: cadre,
                borderRadius: 2,
                transform: [{ translateY: DECALAGES[k] }, { rotate: `${ANGLES[k]}deg` }],
                shadowColor: ombre,
                shadowOpacity: 0.28,
                shadowRadius: 9,
                shadowOffset: { width: 0, height: 5 },
                elevation: 5,
              }}
            >
              <View style={{ width: w, height: h, overflow: 'hidden', backgroundColor: ombre }}>
                <Image source={src} style={{ width: w, height: h }} resizeMode="cover" />
              </View>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

export function Interlude({ prenom, onNext, tout = false }: { prenom: string; onNext: () => void; /** captures : tout de suite la derniere phrase et le mur */ tout?: boolean }) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const textes = useMemo(() => phrasesInterlude(prenom), [prenom]);
  const derniereIndex = textes.length - 1;

  const glisse = useRef(new Animated.Value(tout ? 1 : 0)).current;
  const phrasesA = useRef(textes.map((_, i) => new Animated.Value(tout && i === derniereIndex ? 1 : 0))).current;
  const mur = useRef(new Animated.Value(tout ? 1 : 0)).current;
  const bouton = useRef(new Animated.Value(tout ? 1 : 0)).current;
  const [n, setN] = useState(tout ? derniereIndex : 0);
  const [murVisible, setMurVisible] = useState(tout);
  const [boutonVisible, setBoutonVisible] = useState(tout);
  const [pose, setPose] = useState(tout);

  useEffect(() => {
    if (tout) return;
    Animated.timing(glisse, { toValue: 1, duration: GLISSE, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(() => setPose(true));
  }, [glisse, tout]);

  useEffect(() => {
    if (tout) return;
    let vivant = true;
    const derniere = n === derniereIndex;
    const cur = phrasesA[n];
    cur.setValue(0);
    const delai = n === 0 ? GLISSE + 120 : 220;
    const entree = Animated.timing(cur, { toValue: 1, duration: ENTREE, delay: delai, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    if (n > 0) {
      Animated.sequence([
        Animated.timing(phrasesA[n - 1], { toValue: 1.35, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
        Animated.delay(250),
        Animated.timing(phrasesA[n - 1], { toValue: 2, duration: SORTIE - 530, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      ]).start();
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    entree.start(({ finished }) => {
      if (!finished || !vivant) return;
      if (derniere) {
        t = setTimeout(() => {
          if (!vivant) return;
          setMurVisible(true);
          Animated.timing(mur, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
        }, 600);
      } else {
        t = setTimeout(() => {
          if (vivant) setN((v) => v + 1);
        }, TENUE);
      }
    });
    return () => {
      vivant = false;
      if (t) clearTimeout(t);
      cur.stopAnimation();
    };
  }, [n, derniereIndex, phrasesA, mur, tout]);

  useEffect(() => {
    if (!murVisible || tout) return;
    const t = setTimeout(() => {
      setBoutonVisible(true);
      Animated.timing(bouton, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
    }, DELAI_BOUTON);
    return () => clearTimeout(t);
  }, [murVisible, bouton, tout]);

  // Taille des polaroids : quatre rangees et la phrase tiennent dans la hauteur
  const photos = useMemo(photosUniques, []);
  const zone = height - insets.top - 8;
  const phraseH = 76;
  const rangeeH = (zone - phraseH) / 4;
  const pw = Math.round(Math.max(84, Math.min(width * 0.36, (rangeeH - 12) / (4 / 3 + 0.21))));
  const ph = Math.round((pw * 4) / 3);
  const rh = ph + Math.round(pw * 0.05) + Math.round(pw * 0.16) + 12;
  const murHaut = insets.top + 4 + Math.max(0, (zone - (rh * 4 + phraseH)) / 2);
  const parRangee = Math.max(4, Math.ceil(photos.length / 2));
  const rangees = [0, 1, 2, 3].map((r) => {
    const debut = (r % 2) * parRangee + (r >= 2 ? 2 : 0);
    return Array.from({ length: parRangee }, (_, j) => photos[(debut + j) % photos.length]);
  });

  const translateX = glisse.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });
  const murY = mur.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const boutonY = bouton.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const p = prenom.trim();

  return (
    <View style={[st.fond, { backgroundColor: T.bg }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: T.inter, overflow: 'hidden', borderRadius: pose ? 0 : 30, transform: [{ translateX }] }]}>
        {pose ? (
          <Animated.View pointerEvents="none" style={[st.mur, { paddingTop: murHaut, opacity: mur, transform: [{ translateY: murY }] }]}>
            <Rangee images={rangees[0]} sens={1} w={pw} h={ph} graine={0} cadre={T.creme} ombre={T.ink} />
            <Rangee images={rangees[1]} sens={-1} w={pw} h={ph} graine={1} cadre={T.creme} ombre={T.ink} />
            <View style={{ height: phraseH }} />
            <Rangee images={rangees[2]} sens={1} w={pw} h={ph} graine={2} cadre={T.creme} ombre={T.ink} />
            <Rangee images={rangees[3]} sens={-1} w={pw} h={ph} graine={3} cadre={T.creme} ombre={T.ink} />
          </Animated.View>
        ) : null}

        <View pointerEvents="none" style={[st.centre, { top: murHaut + rh * 2, height: phraseH }]}>
          {[n - 1, n].filter((i) => i >= 0).map((i) => {
            const v = phrasesA[i];
            const morceaux = i === derniereIndex && p ? textes[i].split('\u0000') : null;
            return (
              <Animated.View
                key={i}
                style={[
                  st.couche,
                  {
                    opacity: v.interpolate({ inputRange: [0, 1, 1.35, 2], outputRange: [0, 1, 0.42, 0] }),
                    transform: [{ translateY: v.interpolate({ inputRange: [0, 1, 1.35, 2], outputRange: [26, 0, -60, -76] }) }],
                  },
                ]}
              >
                {morceaux ? (
                  <Txt style={[st.phrase, { color: T.interInk }]}>
                    {morceaux[0]}
                    <Txt style={{ color: T.or }}>{p}</Txt>
                    {morceaux[1] ?? ''}
                  </Txt>
                ) : (
                  <Txt style={[st.phrase, { color: T.interInk }]}>{textes[i]}</Txt>
                )}
              </Animated.View>
            );
          })}
        </View>

        {boutonVisible ? (
          <Animated.View style={[st.bas, { paddingBottom: Math.max(insets.bottom, 14) + 6, opacity: bouton, transform: [{ translateY: boutonY }] }]}>
            <Bouton label={traduire('Continuer')} onPress={onNext} fond={T.creme} encre={T.cremeInk} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  fond: { flex: 1, overflow: 'hidden' },
  mur: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start' },
  centre: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  couche: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  phrase: { fontFamily: FONT.titre, fontSize: 25, lineHeight: 31, letterSpacing: -0.3, textAlign: 'center' },
  bas: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24 },
});
