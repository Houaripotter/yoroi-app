/**
 * NUIT 14 : le comparateur avant et apres, avec le cadrage de chaque photo.
 * Houari : « sur certaines photos on voit tout mon corps, sur d'autres que mon tronc, je peux pas bien voir ».
 * Chaque photo a son propre cadrage (zoom de la photo entiere jusqu'a 5 fois, position), regle en mode Ajuster :
 * un cote a la fois, pincer, glisser, double toucher pour revenir, grille horizontale pour aligner
 * epaules, nombril et hanches. Hors reglage : curseur (rideau), cote a cote ou fondu, chaque photo avec son cadrage.
 * Tout tourne sur le fil d'animation (gesture-handler et reanimated). Logique pure : lib/v2/photos/cadrage.ts.
 */
import React, { forwardRef, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { P } from '@/components/yoroi/livePalette';
import { dateCourte, kg } from '@/lib/v2/photos/outils';
import { containSize, defaultCadre, panCadre, pinchCadre } from '@/lib/v2/photos/cadrage';
import type { Cadre, Dims } from '@/lib/v2/photos/cadrage';
import type { Shot } from '../progres/BeforeAfter';

export type Cote = 'avant' | 'apres';
export type ModeComparaison = 'glisser' | 'cote' | 'fondu';
export type Taille = { iw: number; ih: number };

/** La taille en pixels d'une photo (0 tant qu'elle n'est pas connue) */
export function useImageSize(uri: string | undefined): Taille {
  const [s, setS] = useState<Taille>({ iw: 0, ih: 0 });
  useEffect(() => {
    let alive = true;
    setS({ iw: 0, ih: 0 });
    if (!uri) return;
    try {
      Image.getSize(
        uri,
        (iw, ih) => alive && setS({ iw, ih }),
        () => {},
      );
    } catch {
      // taille inconnue : le cadre sert de taille
    }
    return () => {
      alive = false;
    };
  }, [uri]);
  return s;
}

const SNAP = 0.04;
const GRID = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => i / 10);

function hapticSelect() {
  selectionAsync().catch(() => {});
}
function hapticLight() {
  impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
}

type SV = { z: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> };

/** Une photo cadree dans un cadre w x h (le cadrage est le meme quelle que soit la taille du cadre) */
function PhotoCadree({ uri, w, h, size, sv, opacity = 1 }: { uri: string; w: number; h: number; size: Taille; sv: SV; opacity?: number }) {
  const { cw, ch } = containSize({ w, h, iw: size.iw, ih: size.ih });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.x.value * cw * sv.z.value }, { translateY: sv.y.value * ch * sv.z.value }, { scale: sv.z.value }],
  }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden', opacity }}>
      <Animated.Image source={{ uri }} style={[{ position: 'absolute', left: (w - cw) / 2, top: (h - ch) / 2, width: cw, height: ch }, style]} resizeMode={size.iw ? 'stretch' : 'cover'} />
    </View>
  );
}

function Etiquette({ word, s, align }: { word: string; s: Shot; align: 'left' | 'right' }) {
  return (
    <View style={{ alignSelf: align === 'left' ? 'flex-start' : 'flex-end', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(14,15,19,0.62)', alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <Ink size={11} weight="bold" color="rgba(255,255,255,0.78)">{word}</Ink>
      <Ink size={13} weight="extraBold" color={P.pureWhite} numberOfLines={1}>
        {`${dateCourte(s.date.slice(0, 10))}${s.weight ? `, ${kg(s.weight)}` : ''}`}
      </Ink>
    </View>
  );
}

type Props = {
  before: Shot;
  after: Shot;
  /** taille du cadre a l'ecran */
  width: number;
  height: number;
  mode: ModeComparaison;
  sizes: { avant: Taille; apres: Taille };
  /** cadrage de chaque photo, deja borne */
  cadres: { avant: Cadre; apres: Cadre };
  /** cote en cours de reglage, null hors reglage */
  reglage: Cote | null;
  /** en reglage : l'autre photo en transparence par-dessus */
  transparence?: boolean;
  /** fin d'un geste de reglage : le cadrage a enregistrer */
  onCadre: (cote: Cote, c: Cadre) => void;
};

export const ComparateurCadre = forwardRef<View, Props>(function ComparateurCadre({ before, after, width: W, height: H, mode, sizes, cadres, reglage, transparence, onCadre }, ref) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  const pos = useSharedValue(0.5);
  const start = useSharedValue(0.5);
  const snapped = useSharedValue(1);

  const svA: SV = { z: useSharedValue(cadres.avant.z), x: useSharedValue(cadres.avant.x), y: useSharedValue(cadres.avant.y) };
  const svB: SV = { z: useSharedValue(cadres.apres.z), x: useSharedValue(cadres.apres.x), y: useSharedValue(cadres.apres.y) };
  // depart du geste de reglage
  const g0 = useSharedValue<Cadre>({ z: 1, x: 0, y: 0 });
  const f0 = useSharedValue({ x: 0, y: 0 });
  const t0 = useSharedValue({ x: 0, y: 0 });
  const pinching = useSharedValue(0);
  const rebase = useSharedValue(0);

  // le cadrage vient du parent (lecture du disque, Aligner pareil, autre photo) : on l'applique
  useEffect(() => {
    svA.z.value = withTiming(cadres.avant.z, { duration: 160 });
    svA.x.value = withTiming(cadres.avant.x, { duration: 160 });
    svA.y.value = withTiming(cadres.avant.y, { duration: 160 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadres.avant.z, cadres.avant.x, cadres.avant.y]);
  useEffect(() => {
    svB.z.value = withTiming(cadres.apres.z, { duration: 160 });
    svB.x.value = withTiming(cadres.apres.x, { duration: 160 });
    svB.y.value = withTiming(cadres.apres.y, { duration: 160 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadres.apres.z, cadres.apres.x, cadres.apres.y]);
  useEffect(() => {
    pos.value = withTiming(0.5, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, before.uri, after.uri]);

  const dimsA: Dims = { w: W, h: H, iw: sizes.avant.iw, ih: sizes.avant.ih };
  const dimsB: Dims = { w: W, h: H, iw: sizes.apres.iw, ih: sizes.apres.ih };
  const active = reglage === 'apres' ? svB : svA;
  const activeDims = reglage === 'apres' ? dimsB : dimsA;
  const side: Cote = reglage === 'apres' ? 'apres' : 'avant';

  const commit = (s: Cote, z: number, x: number, y: number) => onCadre(s, { z, x, y });

  const setFromRaw = (raw: number) => {
    'worklet';
    let p = Math.min(1, Math.max(0, raw));
    if (Math.abs(p - 0.5) < SNAP) {
      p = 0.5;
      if (!snapped.value) {
        snapped.value = 1;
        runOnJS(hapticSelect)();
      }
    } else snapped.value = 0;
    pos.value = p;
  };

  // ---------- hors reglage : le curseur ----------
  const curseurPan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart((e) => {
      start.value = pos.value;
      if (mode === 'glisser' && W) setFromRaw(e.x / W);
      runOnJS(hapticLight)();
    })
    .onUpdate((e) => {
      if (!W) return;
      if (mode === 'glisser') setFromRaw(e.x / W);
      else if (mode === 'fondu') setFromRaw(start.value + e.translationX / (W * 0.8));
    });
  const curseurTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e, ok) => {
      if (!ok || !W || mode !== 'glisser') return;
      const p = Math.min(1, Math.max(0, e.x / W));
      pos.value = withTiming(Math.abs(p - 0.5) < SNAP ? 0.5 : p, { duration: 160 });
      runOnJS(hapticSelect)();
    });

  // ---------- en reglage : la photo du cote choisi ----------
  const write = (n: Cadre) => {
    'worklet';
    active.z.value = n.z;
    active.x.value = n.x;
    active.y.value = n.y;
  };
  const end = () => {
    'worklet';
    runOnJS(commit)(side, active.z.value, active.x.value, active.y.value);
  };
  const reglePinch = Gesture.Pinch()
    .onStart((e) => {
      pinching.value = 1;
      g0.value = { z: active.z.value, x: active.x.value, y: active.y.value };
      f0.value = { x: e.focalX - W / 2, y: e.focalY - H / 2 };
    })
    .onUpdate((e) => {
      write(pinchCadre(g0.value, activeDims, e.scale, f0.value.x, f0.value.y, e.focalX - W / 2, e.focalY - H / 2));
    })
    .onEnd(() => {
      pinching.value = 0;
      rebase.value = 1;
      end();
    });
  const reglePan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(2)
    .onStart((e) => {
      g0.value = { z: active.z.value, x: active.x.value, y: active.y.value };
      t0.value = { x: e.translationX, y: e.translationY };
    })
    .onUpdate((e) => {
      if (pinching.value) return;
      if (rebase.value) {
        rebase.value = 0;
        g0.value = { z: active.z.value, x: active.x.value, y: active.y.value };
        t0.value = { x: e.translationX, y: e.translationY };
      }
      write(panCadre(g0.value, activeDims, e.translationX - t0.value.x, e.translationY - t0.value.y));
    })
    .onEnd(() => {
      if (!pinching.value) end();
    });
  const regleDouble = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd((_e, ok) => {
      if (!ok) return;
      const d = defaultCadre(activeDims);
      active.z.value = withTiming(d.z, { duration: 200 });
      active.x.value = withTiming(0, { duration: 200 });
      active.y.value = withTiming(0, { duration: 200 });
      runOnJS(commit)(side, d.z, 0, 0);
      runOnJS(hapticLight)();
    });

  const gesture = reglage
    ? Gesture.Simultaneous(reglePinch, Gesture.Exclusive(regleDouble, reglePan))
    : Gesture.Race(curseurPan, curseurTap);

  const clipStyle = useAnimatedStyle(() => {
    const x = pos.value * W;
    return { left: x, width: Math.max(0, W - x) };
  });
  const innerStyle = useAnimatedStyle(() => ({ left: -pos.value * W }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * W - 2.5 }] }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * W - 24 }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: pos.value }));
  const beforeLabel = useAnimatedStyle(() => ({
    opacity: mode === 'fondu' ? interpolate(pos.value, [0, 0.6, 1], [1, 1, 0.25]) : interpolate(pos.value, [0.3, 0.4], [0, 1], 'clamp'),
  }));
  const afterLabel = useAnimatedStyle(() => ({
    opacity: mode === 'fondu' ? interpolate(pos.value, [0, 0.4, 1], [0.25, 1, 1]) : interpolate(pos.value, [0.6, 0.7], [1, 0], 'clamp'),
  }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${pos.value * 100}%` }));

  // cote a cote : deux cadres de la meme proportion que le grand, pour garder le meme cadrage
  const pw = (W - 4) / 2;
  const ph = W ? (pw * H) / W : 0;
  const frameH = !reglage && mode === 'cote' ? ph : H;

  const accessibilityLabel = reglage
    ? `Réglage de la photo ${reglage === 'avant' ? 'avant' : 'après'}. Pince pour zoomer, glisse pour déplacer, touche deux fois pour revenir.`
    : mode === 'glisser'
      ? 'Avant et après. Glisse ton doigt sur la photo pour déplacer le curseur.'
      : mode === 'fondu'
        ? 'Avant et après en fondu. Glisse vers la droite pour faire apparaître la photo d’après.'
        : 'Avant et après, côte à côte.';

  const shotOf = (s: Cote) => (s === 'avant' ? before : after);
  const svOf = (s: Cote) => (s === 'avant' ? svA : svB);
  const other: Cote = side === 'avant' ? 'apres' : 'avant';

  return (
    <View ref={ref} collapsable={false}>
      <GestureDetector gesture={gesture}>
        <View accessibilityLabel={accessibilityLabel} style={{ width: W, height: frameH, borderRadius: 26, overflow: 'hidden', backgroundColor: '#0E0F13' }}>
          {!W ? null : reglage ? (
            <>
              <PhotoCadree uri={shotOf(side).uri} w={W} h={H} size={sizes[side]} sv={svOf(side)} />
              {transparence ? <PhotoCadree uri={shotOf(other).uri} w={W} h={H} size={sizes[other]} sv={svOf(other)} opacity={0.4} /> : null}
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
                {GRID.map((g) => (
                  <View key={g} style={{ position: 'absolute', left: 0, right: 0, top: Math.round(g * H), height: 1, backgroundColor: g === 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.42)' }} />
                ))}
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: Math.round(W / 2), width: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              </View>
              <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12 }}>
                <Etiquette word={side === 'avant' ? 'Réglage, avant' : 'Réglage, après'} s={shotOf(side)} align="left" />
              </View>
            </>
          ) : mode === 'cote' ? (
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
              {(['avant', 'apres'] as Cote[]).map((s) => (
                <View key={s} style={{ width: pw, height: ph, overflow: 'hidden' }}>
                  <PhotoCadree uri={shotOf(s).uri} w={pw} h={ph} size={sizes[s]} sv={svOf(s)} />
                  <View pointerEvents="none" style={{ position: 'absolute', left: 6, right: 6, bottom: 8 }}>
                    <Etiquette word={s === 'avant' ? 'Avant' : 'Après'} s={shotOf(s)} align={s === 'avant' ? 'left' : 'right'} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              <PhotoCadree uri={before.uri} w={W} h={H} size={sizes.avant} sv={svA} />
              {mode === 'glisser' ? (
                <>
                  <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, height: H, overflow: 'hidden' }, clipStyle]}>
                    <Animated.View style={[{ position: 'absolute', top: 0, width: W, height: H }, innerStyle]}>
                      <PhotoCadree uri={after.uri} w={W} h={H} size={sizes.apres} sv={svB} />
                    </Animated.View>
                  </Animated.View>
                  <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 5, height: H, backgroundColor: P.pureWhite, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(14,15,19,0.45)' }, lineStyle]} />
                  <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: H / 2 - 24, width: 48, height: 48, borderRadius: 24, backgroundColor: P.pureWhite, borderWidth: 1, borderColor: 'rgba(14,15,19,0.25)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5 }, handleStyle]}>
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      <Path d="M9 7l-5 5 5 5M15 7l5 5-5 5" stroke="#1D2029" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Animated.View>
                </>
              ) : (
                <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, fadeStyle]}>
                  <PhotoCadree uri={after.uri} w={W} h={H} size={sizes.apres} sv={svB} />
                </Animated.View>
              )}
              <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 12, top: 12 }, beforeLabel]}>
                <Etiquette word="Avant" s={before} align="left" />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: 12, top: 12 }, afterLabel]}>
                <Etiquette word="Après" s={after} align="right" />
              </Animated.View>
              {mode === 'fondu' ? (
                <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 16, gap: 8 }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' }}>
                    <Animated.View style={[{ position: 'absolute', top: -9, marginLeft: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: P.pureWhite, borderWidth: 3, borderColor: c.accent }, thumbStyle]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Ink size={12} weight="extraBold" color={P.pureWhite}>Avant</Ink>
                    <Ink size={12} weight="extraBold" color={P.pureWhite}>Après</Ink>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </GestureDetector>
    </View>
  );
});

/** Une photo cadree, sans animation (carte a partager) */
export function PhotoCadreeFixe({ uri, w, h, size, cadre, radius = 0, bg }: { uri: string; w: number; h: number; size: Taille; cadre: Cadre; radius?: number; bg?: string }) {
  const { cw, ch } = containSize({ w, h, iw: size.iw, ih: size.ih });
  return (
    <View style={{ width: w, height: h, borderRadius: radius, overflow: 'hidden', backgroundColor: bg }}>
      <Image
        source={{ uri }}
        resizeMode={size.iw ? 'stretch' : 'cover'}
        style={{ position: 'absolute', left: (w - cw) / 2, top: (h - ch) / 2, width: cw, height: ch, transform: [{ translateX: cadre.x * cw * cadre.z }, { translateY: cadre.y * ch * cadre.z }, { scale: cadre.z }] }}
      />
    </View>
  );
}
