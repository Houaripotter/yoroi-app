/**
 * Haut du paywall. 26 octobre 2026, Houari : « Le fond noir en haut, ça ne donne pas envie. Peut-être une sorte de
 * carrousel, mais sur la première page garde le truc d'Apple en bas. »
 * 27 octobre 2026, Houari : « Mets surtout en avant ce que YOROI lui apporte, à LUI, jette les choses inutiles. »
 * Les cartes ne sont plus un catalogue (analyses, combat, scenes) : elles sont choisies et rangees selon TES reponses
 * (lib/v2/premium/pourToi.ts) : ton chemin jusqu'a ton poids vise (toujours la premiere, elle prolonge la carte
 * « Ce que YOROI va faire pour toi » de l'onboarding), puis ton rythme, tes progres, ta nutrition, ton combat, seulement
 * quand ils te concernent. Chacune est un vrai contenu Premium du code.
 * Langage des pages Programmes et Coach (components/yoroi/v2/programmes/Habillage.tsx) : la carte indigo a cercles
 * translucides pour ton chemin, des cartes bleu doux pour la suite (27 octobre : plus de fonds vert ni orange). Texte a
 * gauche, a droite un petit apercu du vrai ecran Premium (Apercus.tsx), rayon 24. Defilement seul toutes les 4,2 s (jamais avec « réduire les animations »), le doigt pose le met en
 * pause, les points en dessous disent ou tu en es et menent a une carte.
 * Aucun achat ici : le prix, l'essai, le bouton et les mentions restent dans le paywall, a leur place.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { famillePastel, usePaletteProgramme, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import type { CartePremiumTexte } from '@/lib/v2/premium/pourToi';
import type { ApercuNutrition as DonneesNutrition } from '@/lib/v2/premium/apercus';
import { ApercuCombat, ApercuNutrition, ApercuProgres, ApercuRythme } from '@/components/yoroi/v2/premium/Apercus';
import { traduire } from '@/lib/i18n/tr';

const ESPACE = 12;
const AUTO_MS = 4200;

export function CarrouselPremium({ hauteur, marge, cartes, courbe, seances, nutrition }: {
  hauteur: number;
  /** marge laterale de la page */
  marge: number;
  /** tes cartes, deja choisies et rangees (cartesPremium puis texteCarte) */
  cartes: CartePremiumTexte[];
  /** ta courbe (vraie ou exemple marque), dessinee a la taille donnee */
  courbe: (w: number, h: number) => React.ReactNode;
  /** tes seances par semaine, pour l'illustration de la carte rythme */
  seances: number | null;
  /** ton objectif par jour et tes macros (lib/v2/premium/apercus.ts), pour l'apercu de la carte nutrition */
  nutrition: DonneesNutrition;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const pa = usePastel();
  const { width } = useWindowDimensions();
  const reduire = useReducedMotion();
  const cw = width - marge * 2;
  const pas = cw + ESPACE;
  const ref = useRef<ScrollView>(null);
  const [rang, setRang] = useState(0);
  const rangRef = useRef(0);
  const [doigt, setDoigt] = useState(false);
  const n = cartes.length;

  // 27 octobre 2026 (Houari : « les fonds verts et orange, ça ne donne pas envie ») : ton chemin en carte indigo,
  // toutes les autres en bleu doux ; les couleurs vives restent dans les petits apercus
  // 27 octobre 2026 (refonte Pastel, comme le Coach) : plus de carte bleu nuit pleine ; chaque carte prend une famille
  // pastel (bleu, creme, menthe, lilas), texte encre, petites capitales dans la couleur de la famille
  const style = (_id: CartePremiumTexte['id'], k: number): { fond: string; encre: string; encre2: string; titre: string; sombre: boolean } => {
    const f = famillePastel(pa, k);
    return { fond: f.fond, encre: pa.texte, encre2: pa.texte2, titre: f.titre, sombre: false };
  };

  // 27 octobre 2026 (Houari : « au lieu des icones, mets des choses de l'app qui lui donnent envie, comme une demo ») :
  // un morceau du vrai ecran Premium, en petit (components/yoroi/v2/premium/Apercus.tsx)
  const visuel = (id: CartePremiumTexte['id'], w: number, h: number, actif: boolean): React.ReactNode => {
    switch (id) {
      case 'chemin':
        return (
          <View style={{ width: w, height: h, borderRadius: 18, backgroundColor: pal.carte, paddingHorizontal: 6, paddingTop: 8, overflow: 'hidden', justifyContent: 'flex-end' }} pointerEvents="none">
            {courbe(w - 12, h - 12)}
          </View>
        );
      case 'rythme':
        return <ApercuRythme w={w} h={h} seances={seances} />;
      case 'progres':
        return <ApercuProgres w={w} h={h} actif={actif} />;
      case 'nutrition':
        return <ApercuNutrition w={w} h={h} d={nutrition} actif={actif} />;
      case 'combat':
      default:
        return <ApercuCombat w={w} h={h} actif={actif} />;
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
        {cartes.map((k, i) => {
          const s = style(k.id, i);
          const visW = Math.round(cw * (k.id === 'chemin' ? 0.38 : 0.37));
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
                  <Icon name="crown" size={11} color={s.sombre ? c.onDark : s.titre} />
                  <Ink size={10.5} weight="black" color={s.sombre ? c.onDark : s.titre} style={{ letterSpacing: 0.6 }} numberOfLines={1}>
                    {k.pastille ?? traduire('PREMIUM')}
                  </Ink>
                </View>
                <Ink size={petit ? 16 : 17.5} weight="black" tight color={s.encre} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.85} style={{ lineHeight: petit ? 19.5 : 21.5 }}>{k.titre}</Ink>
                <Ink size={12.5} weight="bold" color={s.encre2} numberOfLines={3} style={{ lineHeight: petit ? 16.5 : 17 }}>{k.texte}</Ink>
              </View>
              {visuel(k.id, visW, visH, i === rang)}
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
              <View style={{ width: i === rang ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === rang ? c.detail : pal.anneau }} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
