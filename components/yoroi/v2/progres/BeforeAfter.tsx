/**
 * Comparateur avant et apres (vague 39) : trois facons de comparer.
 * Glisser : un rideau qui suit le doigt partout sur la photo, aimante au milieu.
 * Cote a cote : les deux photos l'une a cote de l'autre.
 * Fondu : la photo d'apres apparait par-dessus celle d'avant, au doigt.
 * Tout tourne sur le fil d'animation (gesture-handler et reanimated) : aucun re-rendu pendant le geste.
 * Zoom a deux doigts synchronise sur les deux photos, double toucher pour revenir.
 */
import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { P } from '@/components/yoroi/livePalette';
import { dateCourte, kg } from '@/lib/v2/photos/outils';

export type Shot = { uri: string; date: string; weight?: number };
export type CompareMode = 'glisser' | 'cote' | 'fondu';

type Props = { before: Shot; after: Shot; height: number; mode?: CompareMode };

const SNAP = 0.04;
const MIN = 0.0;
const MAX = 1.0;

function hapticSelect() {
  selectionAsync().catch(() => {});
}
function hapticLight() {
  impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
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

export const BeforeAfter = forwardRef<View, Props>(function BeforeAfter({ before, after, height, mode = 'glisser' }, ref) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [width, setWidth] = useState(0);

  const w = useSharedValue(0);
  const pos = useSharedValue(0.5);
  const start = useSharedValue(0.5);
  const snapped = useSharedValue(1);
  const modeSv = useSharedValue<CompareMode>(mode);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const s0 = useSharedValue(1);
  const tx0 = useSharedValue(0);
  const ty0 = useSharedValue(0);
  const f0x = useSharedValue(0);
  const f0y = useSharedValue(0);
  const hSv = useSharedValue(height);

  useEffect(() => {
    modeSv.value = mode;
    pos.value = withTiming(0.5, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => {
    hSv.value = height;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);
  // nouvelles photos : on revient au milieu et sans zoom
  useEffect(() => {
    pos.value = withTiming(0.5, { duration: 180 });
    scale.value = withTiming(1, { duration: 180 });
    tx.value = withTiming(0, { duration: 180 });
    ty.value = withTiming(0, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [before.uri, after.uri]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const v = Math.round(e.nativeEvent.layout.width);
    w.value = v;
    setWidth(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFromRaw = (raw: number) => {
    'worklet';
    let p = Math.min(MAX, Math.max(MIN, raw));
    if (Math.abs(p - 0.5) < SNAP) {
      p = 0.5;
      if (!snapped.value) {
        snapped.value = 1;
        runOnJS(hapticSelect)();
      }
    } else snapped.value = 0;
    pos.value = p;
  };

  const clampPan = () => {
    'worklet';
    const halfW = modeSv.value === 'cote' ? w.value / 4 : w.value / 2;
    const maxX = Math.max(0, (scale.value - 1) * halfW);
    const maxY = Math.max(0, (scale.value - 1) * (hSv.value / 2));
    tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
    ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
  };

  // Un doigt : le rideau (glisser) suit le doigt la ou il est ; le fondu suit le deplacement.
  // En cote a cote zoome, un doigt deplace les deux photos ensemble.
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart((e) => {
      start.value = pos.value;
      tx0.value = tx.value;
      ty0.value = ty.value;
      if (modeSv.value === 'glisser' && w.value) setFromRaw(e.x / w.value);
      runOnJS(hapticLight)();
    })
    .onUpdate((e) => {
      if (!w.value) return;
      if (modeSv.value === 'glisser') setFromRaw(e.x / w.value);
      else if (modeSv.value === 'fondu') setFromRaw(start.value + e.translationX / (w.value * 0.8));
      else if (scale.value > 1.01) {
        tx.value = tx0.value + e.translationX;
        ty.value = ty0.value + e.translationY;
        clampPan();
      }
    });

  // Un toucher : le rideau saute a cet endroit
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e, ok) => {
      if (!ok || !w.value || modeSv.value !== 'glisser') return;
      const p = Math.min(MAX, Math.max(MIN, e.x / w.value));
      pos.value = withTiming(Math.abs(p - 0.5) < SNAP ? 0.5 : p, { duration: 160 });
      runOnJS(hapticSelect)();
    });

  // Double toucher : zoom x2 ou retour
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((_e, ok) => {
      if (!ok) return;
      if (scale.value > 1.01) {
        scale.value = withTiming(1, { duration: 200 });
        tx.value = withTiming(0, { duration: 200 });
        ty.value = withTiming(0, { duration: 200 });
      } else {
        scale.value = withTiming(2, { duration: 200 });
      }
      runOnJS(hapticLight)();
    });

  // Deux doigts : zoom synchronise sur les deux photos, autour du point pince
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      s0.value = scale.value;
      tx0.value = tx.value;
      ty0.value = ty.value;
      f0x.value = e.focalX;
      f0y.value = e.focalY;
    })
    .onUpdate((e) => {
      scale.value = Math.min(4, Math.max(1, s0.value * e.scale));
      tx.value = tx0.value + (e.focalX - f0x.value);
      ty.value = ty0.value + (e.focalY - f0y.value);
      clampPan();
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withSpring(1, { damping: 18 });
        tx.value = withSpring(0, { damping: 18 });
        ty.value = withSpring(0, { damping: 18 });
      }
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Race(pan, Gesture.Exclusive(doubleTap, tap)));

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  const clipStyle = useAnimatedStyle(() => {
    const x = pos.value * w.value;
    return { left: x, width: Math.max(0, w.value - x) };
  });
  const innerStyle = useAnimatedStyle(() => ({ left: -pos.value * w.value }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * w.value - 1.5 }] }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * w.value - 24 }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: pos.value }));
  const beforeLabel = useAnimatedStyle(() => ({
    opacity: modeSv.value === 'fondu' ? interpolate(pos.value, [0, 0.6, 1], [1, 1, 0.25]) : interpolate(pos.value, [0.3, 0.4], [0, 1], 'clamp'),
  }));
  const afterLabel = useAnimatedStyle(() => ({
    opacity: modeSv.value === 'fondu' ? interpolate(pos.value, [0, 0.4, 1], [0.25, 1, 1]) : interpolate(pos.value, [0.6, 0.7], [1, 0], 'clamp'),
  }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${pos.value * 100}%` }));

  const accessibilityLabel =
    mode === 'glisser' ? 'Avant et après. Glisse ton doigt sur la photo pour déplacer le rideau.' : mode === 'fondu' ? 'Avant et après en fondu. Glisse vers la droite pour faire apparaître la photo d’après.' : 'Avant et après, côte à côte.';

  return (
    <View ref={ref} collapsable={false}>
      <GestureDetector gesture={gesture}>
        <View onLayout={onLayout} accessibilityLabel={accessibilityLabel} style={{ height, borderRadius: 26, overflow: 'hidden', backgroundColor: '#0E0F13' }}>
          {width ? (
            mode === 'cote' ? (
              <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
                {[before, after].map((s, i) => (
                  <View key={i} style={{ flex: 1, overflow: 'hidden' }}>
                    <Animated.Image source={{ uri: s.uri }} style={[{ width: '100%', height: '100%' }, zoomStyle]} resizeMode="cover" />
                    <View pointerEvents="none" style={{ position: 'absolute', left: 8, right: 8, bottom: 10 }}>
                      <Etiquette word={i === 0 ? 'Avant' : 'Après'} s={s} align={i === 0 ? 'left' : 'right'} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <>
                <Animated.Image source={{ uri: before.uri }} style={[{ position: 'absolute', left: 0, top: 0, width, height }, zoomStyle]} resizeMode="cover" />
                {mode === 'glisser' ? (
                  <>
                    <Animated.View style={[{ position: 'absolute', top: 0, height, overflow: 'hidden' }, clipStyle]}>
                      <Animated.View style={[{ position: 'absolute', top: 0, width, height }, innerStyle]}>
                        <Animated.Image source={{ uri: after.uri }} style={[{ width, height }, zoomStyle]} resizeMode="cover" />
                      </Animated.View>
                    </Animated.View>
                    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 3, height, backgroundColor: P.pureWhite }, lineStyle]} />
                    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: height / 2 - 24, width: 48, height: 48, borderRadius: 24, backgroundColor: P.pureWhite, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }, handleStyle]}>
                      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path d="M9 7l-5 5 5 5M15 7l5 5-5 5" stroke="#1D2029" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </Animated.View>
                  </>
                ) : (
                  <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }, fadeStyle]}>
                    <Animated.Image source={{ uri: after.uri }} style={[{ width, height }, zoomStyle]} resizeMode="cover" />
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
            )
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
});
