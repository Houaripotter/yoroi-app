/**
 * Haut du paywall. 26 octobre 2026, Houari : « Le fond noir en haut, ça ne donne pas envie. Peut-être une sorte de
 * carrousel, mais sur la première page garde le truc d'Apple en bas. »
 * 27 octobre 2026, Houari : « Mets surtout en avant ce que YOROI lui apporte, à LUI, jette les choses inutiles. »
 * Les cartes ne sont plus un catalogue (analyses, combat, scenes) : elles sont choisies et rangees selon TES reponses
 * (lib/v2/premium/pourToi.ts) : ton chemin jusqu'a ton poids vise (toujours la premiere, elle prolonge la carte
 * « Ce que YOROI va faire pour toi » de l'onboarding), puis ton rythme, tes progres, ta nutrition, ton combat, seulement
 * quand ils te concernent. Chacune est un vrai contenu Premium du code.
 * Langage des pages Programmes et Coach (components/yoroi/v2/programmes/Habillage.tsx) : la carte indigo a cercles
 * translucides pour ton chemin, des cartes teintees (bleu, orange, vert) pour la suite. Texte a gauche, illustration a
 * droite, rayon 24. Defilement seul toutes les 4,2 s (jamais avec « réduire les animations »), le doigt pose le met en
 * pause, les points en dessous disent ou tu en es et menent a une carte.
 * Aucun achat ici : le prix, l'essai, le bouton et les mentions restent dans le paywall, a leur place.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, type IconName } from '@/components/yoroi/v2/espace/ui';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import type { CartePremiumTexte } from '@/lib/v2/premium/pourToi';
import { traduire } from '@/lib/i18n/tr';

const ESPACE = 12;
const AUTO_MS = 4200;

export function CarrouselPremium({ hauteur, marge, cartes, courbe, seances }: {
  hauteur: number;
  /** marge laterale de la page */
  marge: number;
  /** tes cartes, deja choisies et rangees (cartesPremium puis texteCarte) */
  cartes: CartePremiumTexte[];
  /** ta courbe (vraie ou exemple marque), dessinee a la taille donnee */
  courbe: (w: number, h: number) => React.ReactNode;
  /** tes seances par semaine, pour l'illustration de la carte rythme */
  seances: number | null;
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
  const n = cartes.length;

  const tuile = (enfant: React.ReactNode, w: number, h: number) => (
    <View style={{ width: w, height: h, borderRadius: 20, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} pointerEvents="none">{enfant}</View>
  );
  const grandeIcone = (icon: IconName, encre: string, fond: string, petite: IconName | null, w: number, h: number) => tuile(
    <>
      <View style={{ position: 'absolute', right: -18, bottom: -22, width: h * 0.7, height: h * 0.7, borderRadius: h, backgroundColor: fond }} />
      <Icon name={icon} size={Math.round(Math.min(w, h) * 0.46)} color={encre} stroke={2} />
      {petite ? (
        <View style={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={petite} size={16} color={encre} />
        </View>
      ) : null}
    </>,
    w,
    h,
  );

  const style = (id: CartePremiumTexte['id']): { fond: string; encre: string; encre2: string; sombre: boolean } => {
    if (id === 'chemin') return { fond: pal.indigo, encre: c.onDark, encre2: c.onDarkSecondary, sombre: true };
    if (id === 'rythme') return { fond: pal.vertTint, encre: pal.texte, encre2: pal.texte2, sombre: false };
    if (id === 'nutrition' || id === 'combat') return { fond: pal.orangeTint, encre: pal.texte, encre2: pal.texte2, sombre: false };
    return { fond: pal.teinte, encre: pal.texte, encre2: pal.texte2, sombre: false };
  };

  const visuel = (id: CartePremiumTexte['id'], w: number, h: number): React.ReactNode => {
    switch (id) {
      case 'chemin':
        return (
          <View style={{ width: w, height: h, borderRadius: 18, backgroundColor: pal.carte, paddingHorizontal: 6, paddingTop: 8, overflow: 'hidden', justifyContent: 'flex-end' }} pointerEvents="none">
            {courbe(w - 12, h - 12)}
          </View>
        );
      case 'rythme': {
        // ta semaine : autant de jours pleins que de seances choisies (illustration, aucune autre valeur)
        const pleins = Math.max(0, Math.min(7, seances ?? 0));
        const d = Math.round(Math.min(w / 5.2, h / 4.6));
        const rond = (i: number) => <View key={i} style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: i < pleins ? pal.vert : pal.vertTint, borderWidth: i < pleins ? 0 : 1.5, borderColor: pal.anneau }} />;
        return tuile(
          <View style={{ alignItems: 'center', gap: Math.round(d * 0.35) }}>
            <Icon name="calendar" size={Math.round(d * 1.1)} color={pal.vert} />
            <View style={{ flexDirection: 'row', gap: Math.round(d * 0.3) }}>{[0, 1, 2, 3].map(rond)}</View>
            <View style={{ flexDirection: 'row', gap: Math.round(d * 0.3) }}>{[4, 5, 6].map(rond)}</View>
          </View>,
          w,
          h,
        );
      }
      case 'progres':
        return tuile(
          <>
            {/* des barres qui montent : illustration, aucune valeur */}
            <Svg width={Math.round(w * 0.6)} height={Math.round(h * 0.48)} viewBox="0 0 60 48" style={{ marginTop: Math.round(h * 0.12) }}>
              <Path d="M6 44V30" stroke={pal.anneau} strokeWidth={8} strokeLinecap="round" />
              <Path d="M22 44V24" stroke={pal.anneau} strokeWidth={8} strokeLinecap="round" />
              <Path d="M38 44V16" stroke={pal.accent} strokeWidth={8} strokeLinecap="round" opacity={0.55} />
              <Path d="M54 44V8" stroke={pal.accent} strokeWidth={8} strokeLinecap="round" />
            </Svg>
            <View style={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: pal.teinte, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="dumbbell" size={16} color={pal.accent} />
            </View>
          </>,
          w,
          h,
        );
      case 'nutrition':
        return grandeIcone('flame', pal.orange, pal.orangeTint, 'target', w, h);
      case 'combat':
      default:
        return grandeIcone('swords', pal.orange, pal.orangeTint, 'trophy', w, h);
    }
  };

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
  const petit = hauteur < 180;
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
        {cartes.map((k) => {
          const s = style(k.id);
          const visW = Math.round(cw * (k.id === 'chemin' ? 0.38 : 0.32));
          return (
            <View
              key={k.id}
              accessible
              accessibilityLabel={traduire('{0}, avec Premium. {1}', k.titre, k.texte)}
              style={{ width: cw, height: hauteur, borderRadius: 24, backgroundColor: s.fond, overflow: 'hidden', padding: pad, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              {/* les cercles translucides de la carte indigo, un echo plus discret sur les cartes claires */}
              <View pointerEvents="none" style={{ position: 'absolute', left: -60, top: -70, width: 180, height: 180, borderRadius: 90, backgroundColor: s.sombre ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)' }} />
              <View pointerEvents="none" style={{ position: 'absolute', right: -50, bottom: -90, width: 230, height: 230, borderRadius: 115, backgroundColor: s.sombre ? pal.cercle : 'rgba(255,255,255,0.35)' }} />
              <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, minHeight: 22, borderRadius: 11, backgroundColor: s.sombre ? 'rgba(255,255,255,0.16)' : pal.carte }}>
                  <Icon name="crown" size={11} color={s.sombre ? c.onDark : pal.accent} />
                  <Ink size={10.5} weight="black" color={s.sombre ? c.onDark : pal.accent} style={{ letterSpacing: 0.6 }} numberOfLines={1}>
                    {k.pastille ?? traduire('PREMIUM')}
                  </Ink>
                </View>
                <Ink size={petit ? 16 : 17.5} weight="black" tight color={s.encre} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.85} style={{ lineHeight: petit ? 19.5 : 21.5 }}>{k.titre}</Ink>
                <Ink size={12.5} weight="bold" color={s.encre2} numberOfLines={3} style={{ lineHeight: petit ? 16.5 : 17 }}>{k.texte}</Ink>
              </View>
              {visuel(k.id, visW, visH)}
            </View>
          );
        })}
      </ScrollView>
      {n > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {cartes.map((k, i) => (
            <Pressable
              key={k.id}
              onPress={() => aller(i)}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityState={{ selected: i === rang }}
              accessibilityLabel={traduire('Carte {0} sur {1}, {2}', i + 1, n, k.titre)}
            >
              <View style={{ width: i === rang ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === rang ? pal.accent : pal.anneau }} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
