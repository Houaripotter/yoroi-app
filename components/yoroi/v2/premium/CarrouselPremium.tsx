/**
 * Haut du paywall, 26 octobre 2026. Houari : « Le fond noir en haut, ça ne donne pas envie, je te jure. Peut-être une
 * sorte de carrousel, mais sur la première page garde le truc d'Apple en bas. »
 * Un carrousel clair de quatre cartes illustrees, dans le langage des pages Programmes et Coach
 * (components/yoroi/v2/programmes/Habillage.tsx) : la carte indigo a cercles translucides pour ta courbe, puis trois
 * cartes teintees (bleu, orange, vert) pour les analyses, le combat et le monde samourai. Texte a gauche, illustration
 * a droite, rayon 24. Il defile seul toutes les 4,2 s (jamais avec « réduire les animations »), le doigt pose le met en
 * pause, les points en dessous disent ou tu en es et menent a une carte. Les promesses reprennent mot pour mot
 * PREMIUM_ROWS (lib/v2/premium/offer.ts) : rien qui ne soit vraiment dans Premium.
 * Aucun achat ici : le prix, l'essai, le bouton et les mentions restent dans le paywall, a leur place.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, type IconName } from '@/components/yoroi/v2/espace/ui';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { RadarDessin } from '@/components/yoroi/v2/premium/Benefices';
import { PREMIUM_ROWS } from '@/lib/v2/premium/offer';
import { traduire } from '@/lib/i18n/tr';

const desc = (id: string) => PREMIUM_ROWS.find((r) => r.id === id)?.desc ?? '';
const ESPACE = 12;
const AUTO_MS = 4200;

type Carte = { id: string; titre: string; texte: string; fond: string; encre: string; encre2: string; sombre?: boolean; pastille?: string | null; visuel: (w: number, h: number) => React.ReactNode };

export type MondeCarrousel = { scene: ImageSourcePropType; personnage: ImageSourcePropType | null; libelle: string | null };

export function CarrouselPremium({ hauteur, marge, titreCourbe, courbe, monde, goal }: {
  hauteur: number;
  /** marge laterale de la page */
  marge: number;
  titreCourbe: string;
  /** ta courbe (vraie ou exemple marque), dessinee a la taille donnee */
  courbe: (w: number, h: number) => React.ReactNode;
  monde: MondeCarrousel;
  goal: string | null;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const { width } = useWindowDimensions();
  const reduire = useReducedMotion();
  const cw = width - marge * 2;
  const pas = cw + ESPACE;
  const ref = useRef<ScrollView>(null);
  const [rang, setRang] = useState(0);
  const rangRef = useRef(0);
  const [doigt, setDoigt] = useState(false);

  const tuile = (enfant: React.ReactNode, w: number, h: number) => (
    <View style={{ width: w, height: h, borderRadius: 20, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{enfant}</View>
  );

  const carteCourbe: Carte = {
    id: 'courbe',
    titre: titreCourbe,
    texte: desc('courbes'),
    fond: pal.indigo,
    encre: c.onDark,
    encre2: c.onDarkSecondary,
    sombre: true,
    visuel: (w, h) => (
      <View style={{ width: w, height: h, borderRadius: 18, backgroundColor: pal.carte, paddingHorizontal: 6, paddingTop: 8, overflow: 'hidden', justifyContent: 'flex-end' }} pointerEvents="none">
        {courbe(w - 12, h - 12)}
      </View>
    ),
  };
  const carteAnalyses: Carte = {
    id: 'analyses',
    titre: traduire('Analyses et prédictions'),
    texte: desc('analyses'),
    fond: pal.teinte,
    encre: pal.texte,
    encre2: pal.texte2,
    visuel: (w, h) => tuile(
      <View style={{ transform: [{ scale: Math.min(w, h) / 64 }] }}>
        <RadarDessin couleur={pal.accent} trait={pal.anneau} />
      </View>,
      w,
      h,
    ),
  };
  const carteCombat: Carte = {
    id: 'combat',
    titre: traduire('Combat et compétition'),
    texte: desc('combat'),
    fond: pal.orangeTint,
    encre: pal.texte,
    encre2: pal.texte2,
    visuel: (w, h) => tuile(
      <>
        <View style={{ position: 'absolute', right: -18, bottom: -22, width: h * 0.7, height: h * 0.7, borderRadius: h, backgroundColor: pal.orangeTint }} />
        <Icon name={'swords' as IconName} size={Math.round(Math.min(w, h) * 0.46)} color={pal.orange} stroke={2} />
        <View style={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: pal.orangeTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trophy" size={16} color={pal.orange} />
        </View>
      </>,
      w,
      h,
    ),
  };
  const carteMonde: Carte = {
    id: 'monde',
    titre: traduire('Scènes et personnages'),
    texte: desc('monde'),
    fond: pal.vertTint,
    encre: pal.texte,
    encre2: pal.texte2,
    pastille: monde.libelle,
    visuel: (w, h) => (
      // la scene du pack en vignette encadree, sur la carte claire (jamais en fond sombre plein ecran)
      <View style={{ width: w, height: h, borderRadius: 18, overflow: 'hidden', backgroundColor: pal.anneau, borderWidth: 3, borderColor: pal.carte }} pointerEvents="none">
        <Image source={monde.scene} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: w, height: h }} accessibilityIgnoresInvertColors />
        {monde.personnage ? (
          <Image source={monde.personnage} resizeMode="contain" style={{ position: 'absolute', bottom: -Math.round(h * 0.04), left: Math.round((w - h * 0.78) / 2), width: Math.round(h * 0.78), height: Math.round(h * 1.04) }} />
        ) : null}
      </View>
    ),
  };
  const cartes = goal === 'combat' ? [carteCourbe, carteCombat, carteAnalyses, carteMonde] : [carteCourbe, carteAnalyses, carteCombat, carteMonde];
  const n = cartes.length;

  const aller = (i: number, anime = true) => {
    ref.current?.scrollTo({ x: i * pas, animated: anime && !reduire });
  };

  useEffect(() => {
    if (reduire || doigt || n < 2) return;
    const t = setTimeout(() => aller((rangRef.current + 1) % n), AUTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rang, doigt, reduire, n, pas]);

  const pad = 16;
  const visW = Math.round(cw * 0.38);
  const visH = hauteur - pad * 2;

  return (
    <View style={{ gap: 10 }}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pas}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: marge, gap: ESPACE }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const i = Math.max(0, Math.min(n - 1, Math.round(e.nativeEvent.contentOffset.x / pas)));
          if (i !== rangRef.current) {
            rangRef.current = i;
            setRang(i);
          }
        }}
        onScrollBeginDrag={() => setDoigt(true)}
        onScrollEndDrag={() => setDoigt(false)}
        onTouchStart={() => setDoigt(true)}
        onTouchEnd={() => setDoigt(false)}
        onTouchCancel={() => setDoigt(false)}
      >
        {cartes.map((k) => (
          <View
            key={k.id}
            accessible
            accessibilityLabel={traduire("{0}, avec Premium. {1}", k.titre, k.texte)}
            style={{ width: cw, height: hauteur, borderRadius: 24, backgroundColor: k.fond, overflow: 'hidden', padding: pad, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            {/* les cercles translucides de la carte indigo, un echo plus discret sur les cartes claires */}
            <View pointerEvents="none" style={{ position: 'absolute', left: -60, top: -70, width: 180, height: 180, borderRadius: 90, backgroundColor: k.sombre ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', right: -50, bottom: -90, width: 230, height: 230, borderRadius: 115, backgroundColor: k.sombre ? pal.cercle : 'rgba(255,255,255,0.35)' }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, minHeight: 22, borderRadius: 11, backgroundColor: k.sombre ? 'rgba(255,255,255,0.16)' : pal.carte }}>
                <Icon name="crown" size={11} color={k.sombre ? c.onDark : pal.accent} />
                <Ink size={10.5} weight="black" color={k.sombre ? c.onDark : pal.accent} style={{ letterSpacing: 0.6 }} numberOfLines={1}>
                  {k.pastille ?? traduire('PREMIUM')}
                </Ink>
              </View>
              <Ink size={hauteur < 160 ? 16.5 : 18} weight="black" tight color={k.encre} numberOfLines={2} style={{ lineHeight: hauteur < 160 ? 20 : 22 }}>{k.titre}</Ink>
              <Ink size={12.5} weight="bold" color={k.encre2} numberOfLines={hauteur < 160 ? 2 : hauteur < 180 ? 3 : 4} style={{ lineHeight: 17 }}>{k.texte}</Ink>
            </View>
            {k.visuel(visW, visH)}
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        {cartes.map((k, i) => (
          <Pressable
            key={k.id}
            onPress={() => aller(i)}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityState={{ selected: i === rang }}
            accessibilityLabel={traduire("Carte {0} sur {1}, {2}", i + 1, n, k.titre)}
          >
            <View style={{ width: i === rang ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === rang ? pal.accent : pal.anneau }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
