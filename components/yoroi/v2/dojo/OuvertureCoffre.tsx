/**
 * Vague 47 : l'ouverture du coffre du jour, en plein ecran.
 * Le coffre attend (il flotte, la lumiere tourne derriere), on le touche : il tremble de plus en plus,
 * eclat blanc, il s'ouvre, les pieces (et les gemmes du grand coffre) jaillissent, le gain monte en comptant.
 * Vibrations a chaque etape. Images du coffre faites avec Gemini (assets/avatars/app/coffre).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';

export const COFFRE_IMAGES: Record<'ferme' | 'ouvert' | 'grandFerme' | 'grandOuvert', ImageSourcePropType> = {
  ferme: require('@/assets/avatars/app/coffre/coffre_ferme.webp'),
  ouvert: require('@/assets/avatars/app/coffre/coffre_ouvert.webp'),
  grandFerme: require('@/assets/avatars/app/coffre/grand_coffre_ferme.webp'),
  grandOuvert: require('@/assets/avatars/app/coffre/grand_coffre_ouvert.webp'),
};

export function imageCoffre(grand: boolean, ouvert: boolean): ImageSourcePropType {
  return grand ? (ouvert ? COFFRE_IMAGES.grandOuvert : COFFRE_IMAGES.grandFerme) : ouvert ? COFFRE_IMAGES.ouvert : COFFRE_IMAGES.ferme;
}

const OR = '#F2C14E';
const NB = ' ';

function vibre(kind: 'leger' | 'fort' | 'succes') {
  const p =
    kind === 'succes'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(kind === 'fort' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  void p.catch(() => undefined);
}

/** Rayons de lumiere derriere le coffre */
function Rayons({ size, couleur }: { size: number; couleur: string }) {
  const n = 14;
  const r = size / 2;
  const paths = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / n / 2.2;
    return `M${r} ${r} L${r + Math.cos(a0) * r} ${r + Math.sin(a0) * r} L${r + Math.cos(a1) * r} ${r + Math.sin(a1) * r} Z`;
  });
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="ry" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={couleur} stopOpacity="0.9" />
          <Stop offset="1" stopColor={couleur} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {paths.map((d, i) => (
        <Path key={i} d={d} fill="url(#ry)" />
      ))}
      <Circle cx={r} cy={r} r={r * 0.32} fill="url(#ry)" />
    </Svg>
  );
}

/** Une piece ou une gemme qui jaillit du coffre */
function Eclat({ progres, angle, dist, delai, gemme, couleur }: { progres: Animated.Value; angle: number; dist: number; delai: number; gemme?: boolean; couleur: string }) {
  const local = progres.interpolate({ inputRange: [delai, Math.min(1, delai + 0.75)], outputRange: [0, 1], extrapolate: 'clamp' });
  const dx = Math.cos(angle) * dist;
  const up = -Math.abs(Math.sin(angle)) * dist - 40;
  const translateX = local.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = local.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, up, up + 160] });
  const opacity = local.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const rotate = local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${dx > 0 ? 540 : -540}deg`] });
  const s = gemme ? 18 : 22;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity, transform: [{ translateX }, { translateY }, { rotate }] }}>
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {gemme ? (
          <>
            <Path d="M6 3h12l4 6-10 13L2 9z" fill={couleur} />
            <Path d="M2 9h20M8 3l4 6 4-6M12 9v13" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.2} fill="none" />
          </>
        ) : (
          <>
            <Circle cx={12} cy={12} r={11} fill={OR} stroke="#B8862A" strokeWidth={2} />
            <Circle cx={12} cy={12} r={6.5} fill="none" stroke="#FFE7A0" strokeWidth={1.6} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

/** 18 octobre 2026 : le grand coffre d'un compte gratuit offre aussi 24 h d'essai d'une scene Voyages */
export type CadeauCoffre = { id: string; nom: string; image: ImageSourcePropType };
export type ResultatCoffre = { xp: number; grand: boolean; chance: boolean; serie: number; cadeau?: CadeauCoffre | null };

type Props = {
  visible: boolean;
  grand: boolean;
  serie: number;
  /** appel qui ouvre vraiment le coffre (journal d'XP) */
  ouvrir: () => Promise<ResultatCoffre | null>;
  /** texte sous le gain, par exemple « encore 290 XP avant Expert » */
  suite?: string;
  /** mettre la scene offerte en essai */
  onCadeau?: (id: string) => void;
  onClose: () => void;
};

export function OuvertureCoffre({ visible, grand, serie, ouvrir, suite, onCadeau, onClose }: Props) {
  const [cadeauMis, setCadeauMis] = useState(false);
  const { width } = useWindowDimensions();
  const [phase, setPhase] = useState<'attente' | 'ouverture' | 'ouvert'>('attente');
  const [res, setRes] = useState<ResultatCoffre | null>(null);
  const [compte, setCompte] = useState(0);
  const flotte = useRef(new Animated.Value(0)).current;
  const tourne = useRef(new Animated.Value(0)).current;
  const secoue = useRef(new Animated.Value(0)).current;
  const echelle = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const rayons = useRef(new Animated.Value(0.35)).current;
  const jaillit = useRef(new Animated.Value(0)).current;
  const gain = useRef(new Animated.Value(0)).current;
  const nombre = useRef(new Animated.Value(0)).current;

  const taille = Math.min(260, width * 0.62);
  const g = res?.grand ?? grand;

  const eclats = useMemo(
    () =>
      Array.from({ length: g ? 26 : 18 }, (_, i) => ({
        angle: Math.PI + (i / (g ? 26 : 18)) * Math.PI + (Math.random() - 0.5) * 0.4,
        dist: 110 + Math.random() * 120,
        delai: Math.random() * 0.25,
        gemme: g && i % 3 === 0,
        couleur: ['#3E7BFA', '#E2435B', '#2FB57C'][i % 3],
      })),
    [g],
  );

  // remise a zero a chaque ouverture de la fenetre
  useEffect(() => {
    if (!visible) return;
    setPhase('attente');
    setCadeauMis(false);
    setRes(null);
    setCompte(0);
    [secoue, flash, jaillit, gain, nombre].forEach((v) => v.setValue(0));
    echelle.setValue(1);
    rayons.setValue(0.35);
  }, [visible, secoue, flash, jaillit, gain, nombre, echelle, rayons]);

  // le coffre flotte et la lumiere tourne
  useEffect(() => {
    if (!visible) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(flotte, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flotte, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const b = Animated.loop(Animated.timing(tourne, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [visible, flotte, tourne]);

  useEffect(() => {
    const id = nombre.addListener(({ value }) => setCompte(Math.round(value)));
    return () => nombre.removeListener(id);
  }, [nombre]);

  const toucher = async () => {
    if (phase !== 'attente') return;
    setPhase('ouverture');
    vibre('leger');
    // il tremble de plus en plus fort pendant que le coffre s'ouvre vraiment
    const coups = [6, -6, 8, -8, 10, -10, 12, -12, 0];
    const tremble = Animated.parallel([
      Animated.sequence(coups.map((v, i) => Animated.timing(secoue, { toValue: v, duration: 90 - i * 4, easing: Easing.linear, useNativeDriver: true }))),
      Animated.timing(echelle, { toValue: 1.12, duration: 720, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    setTimeout(() => vibre('leger'), 260);
    setTimeout(() => vibre('leger'), 520);
    const [r] = await Promise.all([ouvrir().catch(() => null), new Promise<void>((done) => tremble.start(() => done()))]);
    if (!r) {
      onClose();
      return;
    }
    setRes(r);
    setPhase('ouvert');
    vibre('fort');
    setTimeout(() => vibre('succes'), 380);
    flash.setValue(1);
    echelle.setValue(1.28);
    Animated.parallel([
      Animated.timing(flash, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(echelle, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
      Animated.timing(rayons, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(jaillit, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([Animated.delay(250), Animated.spring(gain, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(300), Animated.timing(nombre, { toValue: r.xp, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false })]),
    ]).start();
  };

  const ouvert = phase === 'ouvert';
  const yFlotte = flotte.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rot = tourne.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotSecoue = secoue.interpolate({ inputRange: [-12, 12], outputRange: ['-12deg', '12deg'] });
  const ray = Math.min(width * 1.1, 460);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,12,22,0.97)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ position: 'absolute', top: '12%', alignItems: 'center', gap: 6, paddingHorizontal: 24 }}>
          <Ink size={14} weight="extraBold" color={OR}>{g ? 'Grand coffre' : 'Coffre du jour'}</Ink>
          <Ink size={26} weight="black" color="#FFFFFF" style={{ textAlign: 'center' }}>
            {ouvert ? (res?.chance ? 'Coup de chance !' : 'Bien joué !') : `${serie} jour${serie > 1 ? 's' : ''} d’affilée`}
          </Ink>
          {!ouvert ? <Ink size={15} color="rgba(255,255,255,0.75)">{phase === 'attente' ? 'Touche le coffre pour l’ouvrir' : 'Ça s’ouvre…'}</Ink> : null}
        </View>

        <Pressable onPress={toucher} accessibilityRole="button" accessibilityLabel={ouvert ? 'Coffre ouvert' : 'Ouvrir le coffre'} style={{ width: ray, height: ray, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: rayons, transform: [{ rotate: rot }] }}>
            <Rayons size={ray} couleur={g ? '#C9A2FF' : '#FFD56B'} />
          </Animated.View>
          <Animated.View style={{ transform: [{ translateY: yFlotte }, { rotate: rotSecoue }, { scale: echelle }] }}>
            <Image source={imageCoffre(g, ouvert)} style={{ width: taille, height: taille }} resizeMode="contain" />
          </Animated.View>
          <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            {ouvert ? eclats.map((e, i) => <Eclat key={i} progres={jaillit} {...e} />) : null}
          </View>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', width: ray, height: ray, borderRadius: ray / 2, backgroundColor: '#FFFFFF', opacity: flash }} />
        </Pressable>

        {ouvert && res ? (
          <Animated.View style={{ position: 'absolute', bottom: res.cadeau ? '5%' : '12%', left: 24, right: 24, alignItems: 'center', gap: 8, opacity: gain, transform: [{ scale: gain.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
            <Ink size={54} weight="black" tight color={OR}>{`+${compte}${NB}XP`}</Ink>
            {res.chance ? <Ink size={15} weight="extraBold" color="#FFFFFF">XP doublée aujourd’hui</Ink> : null}
            {res.grand ? <Ink size={15} weight="extraBold" color="#FFFFFF">{`Grand coffre : ${res.serie} jours d’affilée`}</Ink> : null}
            {suite && !res.cadeau ? <Ink size={14} color="rgba(255,255,255,0.75)" style={{ textAlign: 'center' }}>{suite}</Ink> : null}
            {res.cadeau ? (
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
                <Image source={res.cadeau.image} style={{ width: 86, height: 48, borderRadius: 10 }} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Ink size={13} weight="extraBold" color={OR}>Cadeau : 24 h d’essai</Ink>
                  <Ink size={15} weight="black" color="#FFFFFF">{`Scène ${res.cadeau.nom}`}</Ink>
                </View>
                {onCadeau ? (
                  <Pressable
                    onPress={() => {
                      if (!res.cadeau || cadeauMis) return;
                      setCadeauMis(true);
                      onCadeau(res.cadeau.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={cadeauMis ? 'Scène mise' : `Essayer la scène ${res.cadeau.nom}`}
                    style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.18)' })}
                  >
                    <Ink size={13} weight="extraBold" color="#FFFFFF">{cadeauMis ? 'Mise' : 'Essayer'}</Ink>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => ({ marginTop: 10, minHeight: 54, alignSelf: 'stretch', borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#D9A93A' : OR })}
            >
              <Ink size={17} weight="black" color="#1D2029">Super</Ink>
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable onPress={onClose} accessibilityRole="button" style={{ position: 'absolute', bottom: '8%', minHeight: 44, paddingHorizontal: 18, justifyContent: 'center' }}>
            <Ink size={14} weight="bold" color="rgba(255,255,255,0.6)">Plus tard</Ink>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}
