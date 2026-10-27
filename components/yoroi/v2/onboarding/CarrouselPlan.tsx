/**
 * Le carrousel de « Ton plan » (26 octobre 2026). Houari : « Ton plan est long, la plupart ne descendront pas
 * jusqu'en bas alors que c'est très intéressant ». Les cartes passent de gauche à droite : on voit le bord de la
 * suivante, des points en dessous (touchables), « Glisse pour voir la suite » sur la première, et une seule petite
 * relance qui montre le geste si rien n'a bougé. Chaque carte défile en hauteur si elle ne tient pas.
 * Une carte n'est montée qu'à son arrivée à l'écran : ses animations partent quand on la voit.
 * Réduire les animations : pas de relance.
 * 27 octobre 2026 (Houari : « fais le tourner, ça donne envie ») : les cartes avancent seules toutes les 4 s, en boucle.
 * Un doigt posé met en pause, le défilement reprend 5 s après. Pas de défilement seul avec Réduire les animations
 * ni avec un lecteur d'écran. Une carte courte est centrée en hauteur (plus de grand vide sous la carte).
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { GUTTER, useColors } from './ui';
import { traduire } from '@/lib/i18n/tr';

export type PageCarrousel = { cle: string; contenu: (largeur: number) => React.ReactNode };

const ECART = 10;
const BORD_SUIVANTE = 18;
/** une carte toutes les 4 s ; apres un geste, reprise 5 s plus tard */
const AVANCE_MS = 4000;
const REPRISE_MS = 5000;

/** Numero de la carte a l'ecran pour un decalage donne */
export function pageDuDecalage(x: number, pas: number, n: number): number {
  if (pas <= 0 || n <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.round(x / pas)));
}

export function CarrouselPlan({ pages }: { pages: PageCarrousel[] }) {
  const c = useColors();
  const pal = usePaletteProgramme();
  const calme = !!useReducedMotion();
  const ref = useRef<ScrollView>(null);
  const [W, setW] = useState(0);
  const [index, setIndex] = useState(0);
  const [montees, setMontees] = useState(1);
  const touche = useRef(false);
  const enPause = useRef(false);
  const reprise = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tic, setTic] = useState(0);
  const [lecteur, setLecteur] = useState(false);
  const n = pages.length;
  const largeur = Math.max(0, W - 2 * GUTTER - (n > 1 ? BORD_SUIVANTE : 0));
  const pas = largeur + ECART;

  // une seule relance du geste, si rien n'a bouge
  useEffect(() => {
    if (calme || n < 2 || !W) return;
    const t1 = setTimeout(() => {
      if (touche.current) return;
      ref.current?.scrollTo({ x: 56, animated: true });
    }, 1800);
    const t2 = setTimeout(() => {
      if (touche.current) return;
      ref.current?.scrollTo({ x: 0, animated: true });
    }, 2350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [calme, n, W]);

  // lecteur d'ecran : jamais de carte qui part toute seule
  useEffect(() => {
    let vivant = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => {
        if (vivant) setLecteur(!!v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (v: boolean) => setLecteur(!!v));
    return () => {
      vivant = false;
      sub?.remove?.();
    };
  }, []);

  // les cartes avancent seules, en boucle (pause tant qu'un doigt est pose)
  useEffect(() => {
    if (calme || lecteur || n < 2 || !W || pas <= 0) return;
    const t = setTimeout(() => {
      if (enPause.current) return;
      const suivante = (index + 1) % n;
      touche.current = true;
      setMontees((m) => Math.max(m, suivante + 1));
      ref.current?.scrollTo({ x: suivante * pas, animated: true });
      setIndex(suivante);
      setTic((k) => k + 1);
    }, AVANCE_MS);
    return () => clearTimeout(t);
  }, [calme, lecteur, n, W, pas, index, tic]);

  useEffect(() => () => {
    if (reprise.current) clearTimeout(reprise.current);
  }, []);

  const pause = () => {
    enPause.current = true;
    if (reprise.current) clearTimeout(reprise.current);
  };
  const reprendre = () => {
    if (reprise.current) clearTimeout(reprise.current);
    reprise.current = setTimeout(() => {
      enPause.current = false;
      setTic((k) => k + 1);
    }, REPRISE_MS);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = pageDuDecalage(x, pas, n);
    if (i !== index) setIndex(i);
    const besoin = Math.min(n, Math.ceil(x / Math.max(1, pas)) + 1);
    if (besoin > montees) setMontees(besoin);
  };

  const aller = (i: number) => {
    touche.current = true;
    setMontees((m) => Math.max(m, i + 1));
    ref.current?.scrollTo({ x: i * pas, animated: !calme });
  };

  return (
    <View
      style={{ flex: 1, marginHorizontal: -GUTTER, gap: 10 }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onTouchStart={pause}
      onTouchEnd={reprendre}
      onTouchCancel={reprendre}
    >
      {W > 0 ? (
        <ScrollView
          ref={ref}
          horizontal
          style={{ flex: 1 }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={pas}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: GUTTER, gap: ECART }}
          scrollEventThrottle={32}
          onScroll={onScroll}
          onScrollBeginDrag={() => {
            touche.current = true;
            pause();
          }}
          onScrollEndDrag={reprendre}
        >
          {pages.map((p, i) => (
            <View key={p.cle} style={{ width: largeur }} accessibilityLabel={traduire('Carte {0} sur {1}', i + 1, n)}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 8, gap: 12 }}>
                {i < montees ? p.contenu(largeur) : null}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {n > 1 ? (
        <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: GUTTER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {pages.map((p, i) => (
              <Pressable
                key={p.cle}
                onPress={() => aller(i)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected: i === index }}
                accessibilityLabel={traduire('Carte {0} sur {1}', i + 1, n)}
              >
                <View style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? c.detail : pal.anneau }} />
              </Pressable>
            ))}
          </View>
          {index === 0 ? (
            <Pressable onPress={() => aller(1)} hitSlop={6} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire('Glisse pour voir la suite')}</Ink>
              <Icon name="chevron" size={14} color={c.textMuted} />
            </Pressable>
          ) : (
            <Ink size={12} weight="bold" color={c.textMuted}>{traduire('{0} sur {1}', index + 1, n)}</Ink>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default CarrouselPlan;
