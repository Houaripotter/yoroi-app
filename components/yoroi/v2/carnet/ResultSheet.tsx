/**
 * Apres une perf notee (vague 16) : la celebration.
 * Nouveau record : l'illustration, le tampon rouge qui se pose (avec un leger choc), la perf en grand,
 * l'ecart avec l'ancien record. Sinon : la perf notee et le record a battre.
 * Deux boutons : Partager et Fermer.
 */
import React, { useEffect } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { RecordSeal } from '@/components/yoroi/v2/ornements/RecordSeal';
import { niceName, splitPerf } from '@/lib/v2/carnet/records';
import type { CarnetIllus } from './images';
import { Illus } from './nav';
import { P, BigButton, tap } from './ui';
import { blancA } from '@/components/yoroi/livePalette';

export type ResultInfo = { name: string; performance: string; isPR: boolean; recordText?: string; gain?: string | null; illus?: CarnetIllus; first?: boolean };

function LandingSeal() {
  const s = useSharedValue(2.6);
  const r = useSharedValue(-34);
  const o = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(320, withTiming(1, { duration: 120 }));
    s.value = withDelay(320, withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }));
    r.value = withDelay(320, withTiming(-10, { duration: 200, easing: Easing.out(Easing.cubic) }));
    ring.value = withDelay(470, withSequence(withTiming(1, { duration: 520 }), withTiming(1, { duration: 1 })));
    const t = setTimeout(() => tap('success'), 470);
    return () => clearTimeout(t);
  }, [o, s, r, ring]);
  const seal = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value === 0 ? 0 : 0.45 * (1 - ring.value), transform: [{ scale: 0.8 + ring.value * 0.9 }] }));
  return (
    <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 112, height: 112, borderRadius: 30, borderWidth: 4, borderColor: P.record }, ringStyle]} />
      <Animated.View style={seal}>
        <View style={{ backgroundColor: blancA(0.92), borderRadius: 26, padding: 6 }}>
          <RecordSeal size={88} color={P.record} border={5} glyph="laurier" rotate={0} accessibilityLabel="Tampon de record" />
        </View>
      </Animated.View>
    </View>
  );
}

export function ResultSheet({ result, onShare, onClose }: { result: ResultInfo | null; onShare: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const perf = result ? splitPerf(result.performance) : null;
  return (
    <Modal visible={!!result} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.5)', justifyContent: 'flex-end' }} accessibilityLabel="Fermer">
        {result && perf ? (
          <Animated.View entering={ENTREE}>
            <Pressable onPress={() => {}} style={{ backgroundColor: P.paper, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 18, gap: 14 }}>
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line, marginBottom: 2 }} />

              <View style={{ height: 196, borderRadius: 28, backgroundColor: result.isPR ? P.redSoft : '#ECEAE4', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View entering={ENTREE}>
                  <Illus name={result.illus ?? 'records'} size={168} />
                </Animated.View>
                {result.isPR ? (
                  <View style={{ position: 'absolute', right: 14, top: 12 }}>
                    <LandingSeal />
                  </View>
                ) : null}
              </View>

              <View style={{ alignItems: 'center', gap: 4 }}>
                <Ink size={15} weight="black" color={result.isPR ? P.record : P.ink2}>
                  {result.isPR ? (result.first ? 'Premier record posé' : 'Nouveau record') : 'Perf notée'}
                </Ink>
                <Ink size={42} weight="black" tight style={{ textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {perf.main}
                </Ink>
                {perf.sub ? <Ink size={15} weight="bold" color={P.ink2}>{perf.sub}</Ink> : null}
                <Ink size={16} weight="extraBold" style={{ textAlign: 'center', marginTop: 2 }} numberOfLines={2}>
                  {niceName(result.name)}
                </Ink>
                {result.isPR && result.gain ? (
                  <View style={{ marginTop: 6, paddingHorizontal: 12, minHeight: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: P.mossSoft }}>
                    <Ink size={13} weight="extraBold" color={P.mossText}>{`${result.gain} sur ton ancien record`}</Ink>
                  </View>
                ) : null}
                {result.isPR && result.recordText && !result.gain ? <Ink size={13} weight="medium" color={P.ink2}>{`Ancien record : ${result.recordText}`}</Ink> : null}
                {result.isPR && result.first ? <Ink size={13} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>C’est ta référence. Chaque fois que tu la bats, un tampon rouge se pose.</Ink> : null}
                {!result.isPR && result.recordText ? (
                  <Ink size={13} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>{`Ton record reste ${result.recordText}. La prochaine fois peut-être.`}</Ink>
                ) : null}
              </View>

              <BigButton label="Partager" icon="share" onPress={onShare} />
              <BigButton label="Fermer" tone="light" onPress={onClose} />
            </Pressable>
          </Animated.View>
        ) : null}
      </Pressable>
    </Modal>
  );
}
