/**
 * Ecran 3 (facultatif) : homme ou femme, pour le personnage et les reperes de masse grasse. Le personnage choisi salue.
 * 14 octobre 2026 : chaque carte fait defiler ses tenues (kimono, sport, samourai, boxe, ninja, salle, JJB, ronin, shogun),
 * en fondu doux, l'homme et la femme a tour de role (chacun toutes les 2,6 s). Images en contain : rien n'est coupe.
 * « Reduire les animations » : aucune rotation, le kimono reste. Pause quand l'app n'est pas au premier plan.
 */
import React, { useEffect, useState } from 'react';
import { AppState, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChoiceCard, MainButton, Shell, useColors } from './ui';
import { DEFILE, DEFILE_PAS_MS } from './defile';
import type { Nav } from './types';

function Card({ genre, label, selected, onPress, height, index }: { genre: 'h' | 'f'; label: string; selected: boolean; onPress: () => void; height: number; index: number }) {
  const c = useColors();
  const wave = useSharedValue(0);
  const hop = useSharedValue(0);
  useEffect(() => {
    if (!selected) return;
    wave.value = withSequence(withTiming(-7, { duration: 140 }), withTiming(7, { duration: 160 }), withTiming(-5, { duration: 150 }), withTiming(4, { duration: 140 }), withSpring(0, { damping: 10 }));
    hop.value = withSequence(withTiming(-12, { duration: 180 }), withSpring(0, { damping: 8, stiffness: 180 }));
  }, [selected, wave, hop]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }, { rotate: `${wave.value}deg` }] }));
  const liste = DEFILE[genre];
  const tenue = liste[index % liste.length];
  const imgH = height - 64;
  return (
    <ChoiceCard selected={selected} onPress={onPress} label={label} height={height} style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14 }}>
        <Animated.View style={[{ position: 'absolute', top: 8, left: 0, right: 0, height: imgH }, anim]}>
          <Animated.Image
            key={`${genre}-${index % liste.length}`}
            entering={FadeIn.duration(650)}
            exiting={FadeOut.duration(650)}
            source={tenue.image}
            resizeMode="contain"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: imgH }}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
        <Animated.View key={`n-${genre}-${index % liste.length}`} entering={FadeIn.duration(650)} exiting={FadeOut.duration(220)} style={{ position: 'absolute', top: 10, left: 10 }}>
          <View style={{ backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: c.border }}>
            <Ink size={11} weight="bold" color={c.textSecondary}>{tenue.nom}</Ink>
          </View>
        </Animated.View>
        <View style={{ backgroundColor: selected ? c.accent : c.surface, borderWidth: selected ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 18, minHeight: 36, justifyContent: 'center' }}>
          <Ink size={15} weight="extraBold" color={selected ? c.onAccent : c.ink}>{label}</Ink>
        </View>
      </View>
    </ChoiceCard>
  );
}

/** Les deux index du defile ; immobile si « Reduire les animations » ou app en arriere-plan */
function useDefile(): { h: number; f: number } {
  const reduce = useReducedMotion();
  const [pas, setPas] = useState(0);
  const [actif, setActif] = useState(AppState.currentState === 'active' || AppState.currentState == null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActif(s === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduce || !actif) return;
    const t = setInterval(() => setPas((p) => p + 1), DEFILE_PAS_MS);
    return () => clearInterval(t);
  }, [reduce, actif]);
  if (reduce) return { h: 0, f: 0 };
  // a tour de role : l'homme change aux pas impairs, la femme aux pas pairs
  return { h: Math.ceil(pas / 2), f: Math.floor(pas / 2) };
}

export function Toi({ nav, name = '', gender, onPick, onNext }: { nav: Nav; name?: string; gender: 'homme' | 'femme' | null; onPick: (g: 'homme' | 'femme') => void; onNext: () => void }) {
  const { height } = useWindowDimensions();
  const cardH = Math.max(230, Math.min(330, Math.round(height * 0.4)));
  const idx = useDefile();
  return (
    <Shell {...nav} title={name.trim() ? `Ravi de te connaître, **${name.trim()}**` : 'Ravi de te **connaître**'} sub="Homme ou femme ? Ton personnage et tes repères de masse grasse en dépendent." footer={<MainButton label="Continuer" onPress={onNext} disabled={!gender} />}>
      <View style={{ flexDirection: 'row', gap: 12, paddingTop: 6 }}>
        <Card genre="h" label="Homme" selected={gender === 'homme'} onPress={() => onPick('homme')} height={cardH} index={idx.h} />
        <Card genre="f" label="Femme" selected={gender === 'femme'} onPress={() => onPick('femme')} height={cardH} index={idx.f} />
      </View>
    </Shell>
  );
}

export default Toi;
