/**
 * Ecran 3 (facultatif) : homme ou femme, pour le personnage et les reperes de masse grasse. Le personnage choisi salue.
 * 14 octobre 2026 : chaque carte fait defiler ses tenues (kimono, sport, samourai, boxe, ninja, salle, JJB, ronin, shogun),
 * en fondu doux, l'homme et la femme a tour de role (chacun toutes les 2,6 s). Images en contain : rien n'est coupe.
 * « Reduire les animations » : aucune rotation, le kimono reste. Pause quand l'app n'est pas au premier plan.
 * 26 octobre 2026 (demande de Houari) : troisieme choix « Autre », une carte pleine largeur sous les deux personnages.
 * Choisi, deux puces demandent le repere des calculs lies au sexe (masse grasse, metabolisme) ; le personnage le suit
 * (l'app n'a pas de personnage neutre). Cartes un peu plus basses : l'ecran tient sans defiler, iPhone SE compris.
 */
import React, { useEffect, useState } from 'react';
import { AppState, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChoiceCard, Chip, MainButton, Shell, useColors } from './ui';
import { DEFILE, DEFILE_PAS_MS } from './defile';
import type { Nav } from './types';
import type { GenreDeclare } from '@/lib/v2/onboarding/draft';
import { traduire } from '@/lib/i18n/tr';

function Card({ genre, label, selected, onPress, height, index }: { genre: 'h' | 'f'; label: string; selected: boolean; onPress: () => void; height: number; index: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const hop = useSharedValue(0);
  // 27 octobre 2026 : plus de balancement a gauche et a droite, un seul petit saut doux quand on choisit
  useEffect(() => {
    if (!selected || reduce) return;
    hop.value = withSequence(withTiming(-6, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }));
  }, [selected, reduce, hop]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));
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
            <Ink size={11} weight="bold" color={c.textSecondary}>{traduire(tenue.nom)}</Ink>
          </View>
        </Animated.View>
        <View style={{ backgroundColor: selected ? c.primary : c.surface, borderWidth: selected ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 18, minHeight: 36, justifyContent: 'center' }}>
          <Ink size={15} weight="extraBold" color={selected ? c.onPrimary : c.ink}>{label}</Ink>
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

/** Carte « Autre » : pleine largeur, basse, la meme pastille que les deux autres */
function CarteAutre({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const c = useColors();
  const label = traduire('Autre');
  return (
    <ChoiceCard selected={selected} onPress={onPress} label={label} height={58}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: selected ? c.primary : c.surface, borderWidth: selected ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 18, minHeight: 36, justifyContent: 'center' }}>
          <Ink size={15} weight="extraBold" color={selected ? c.onPrimary : c.ink}>{label}</Ink>
        </View>
      </View>
    </ChoiceCard>
  );
}

export function Toi({ nav, name = '', gender, repere = null, onPick, onRepere, onNext }: {
  nav: Nav;
  name?: string;
  gender: GenreDeclare | null;
  /** 26 octobre 2026 : repere des calculs quand gender vaut 'autre' */
  repere?: 'homme' | 'femme' | null;
  onPick: (g: GenreDeclare) => void;
  onRepere?: (r: 'homme' | 'femme') => void;
  onNext: () => void;
}) {
  const c = useColors();
  const { height } = useWindowDimensions();
  // 26 octobre 2026 : un peu plus basses pour laisser la place a « Autre » sans defiler
  const cardH = Math.max(190, Math.min(300, Math.round(height * 0.33)));
  const idx = useDefile();
  const autre = gender === 'autre';
  const pret = !!gender && (!autre || !!repere);
  return (
    <Shell {...nav} gap={14} title={name.trim() ? traduire("Ravi de te connaître, **{0}**", name.trim()) : traduire('Ravi de te **connaître**')} sub={traduire("Homme, femme ou autre ? Ton personnage et tes repères de masse grasse en dépendent.")} footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={!pret} />}>
      <View style={{ flexDirection: 'row', gap: 12, paddingTop: 4 }}>
        <Card genre="h" label={traduire("Homme")} selected={gender === 'homme'} onPress={() => onPick('homme')} height={cardH} index={idx.h} />
        <Card genre="f" label={traduire("Femme")} selected={gender === 'femme'} onPress={() => onPick('femme')} height={cardH} index={idx.f} />
      </View>
      <CarteAutre selected={autre} onPress={() => onPick('autre')} />
      {autre ? (
        <Animated.View entering={FadeIn.duration(220)} style={{ gap: 8 }}>
          <Ink size={14} weight="bold" color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire('Pour tes repères de masse grasse, utiliser :')}</Ink>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Chip label={traduire('Homme')} on={repere === 'homme'} onPress={() => onRepere?.('homme')} />
            <Chip label={traduire('Femme')} on={repere === 'femme'} onPress={() => onRepere?.('femme')} />
          </View>
        </Animated.View>
      ) : null}
    </Shell>
  );
}

export default Toi;
