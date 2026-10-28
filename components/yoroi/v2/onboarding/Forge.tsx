/**
 * Ecran de preparation de l'onboarding (« On forge ton armure », « On prépare ton plan »).
 * L'enregistrement final se fait vraiment pendant l'ecran (run), une seule fois : au retour depuis ton plan, il est saute.
 * 28 octobre 2026, refait (Houari : « on pourrait mieux faire, je compte sur toi » ; le titre blanc et jaune sur le ciel
 * etait illisible) :
 *  1. en haut, ta scene en carte (celle choisie a l'ecran Ta scene, sinon celle de ton univers) avec ton personnage,
 *     un zoom lent du decor et le personnage qui monte doucement ;
 *  2. le titre en encre sur le fond clair de l'app, lisible ;
 *  3. un anneau de progression pastel qui se remplit, le pourcentage au centre, et a cote les chiffres de ton plan qui
 *     apparaissent un par un (ton cap, tes seances par semaine, ton arrivee prevue : seulement tes reponses et l'estimation
 *     de lib/v2/pesee/estimation.ts) ;
 *  4. les etapes, chacune avec son sticker, qui se cochent une par une ; la derniere attend la fin de l'enregistrement.
 * Environ 4,2 secondes. Gong et vibration a la fin. Reduire les animations : pas de zoom ni de montee.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, StatusBar, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { guerrierImage, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { CLASSIQUE_IMAGES } from '@/lib/v2/dojo/personnages';
import { CLASSIQUE_SCENE_IMAGES, SCENES_CLASSIQUE } from '@/lib/v2/espace/classique';
import { SCENES_VOYAGES } from '@/lib/v2/espace/voyages';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { GUTTER, MainButton, ProgressBar, RoundIcon, decouper, useColors } from './ui';
import type { Nav } from './types';
import { ApercuDansBarre, useApercuVisible } from '@/components/yoroi/v2/studio/PreviewBar';
import { traduire } from '@/lib/i18n/tr';

export type LignePreparation = { texte: string; sticker: NomSticker };
export type ChiffrePreparation = { label: string; valeur: string; famille: 'bleu' | 'lilas' | 'creme' };

const FAMILLES: Record<ChiffrePreparation['famille'], { fond: string; titre: string }> = {
  bleu: { fond: '#E6ECF8', titre: '#3557D9' },
  lilas: { fond: '#EFE6F3', titre: '#8A3F78' },
  creme: { fond: '#F6EEDD', titre: '#A57A1C' },
};

/** liste par defaut, si l'appelant n'en donne pas */
const LIGNES_DEFAUT: LignePreparation[] = [
  { texte: traduire('Ton suivi de poids'), sticker: 'torii' },
  { texte: traduire('Ta semaine d’entraînement'), sticker: 'calendrier' },
  { texte: traduire('Ton écran d’accueil'), sticker: 'lanterne' },
];
/** duree totale ; la derniere etape attend que l'enregistrement soit vraiment fini */
const DUREE_MS = 4200;

/** Titre selon l'univers, le mot cle en couleur */
const TITRES: Record<ChoixUnivers, string> = {
  japon: traduire('On forge **ton armure**'),
  classique: traduire('On prépare **ton plan**'),
  aucun: traduire('On prépare **ton plan**'),
};

function imageScene(id: string | null, univers: ChoixUnivers): ImageSourcePropType {
  const sid = id ?? (univers === 'japon' ? 'samourai_armurerie' : 'classique_salle_jour');
  return SCENES_VOYAGES.find((s) => s.id === sid)?.image ?? SCENES_CLASSIQUE.find((s) => s.id === sid)?.image ?? (univers === 'japon' ? sceneMeta(sid).image : CLASSIQUE_SCENE_IMAGES.classique_salle_jour);
}

/** L'anneau pastel qui se remplit, le pourcentage au centre */
function Anneau({ part, taille }: { part: number; taille: number }) {
  const c = useColors();
  const trait = 10;
  const r = (taille - trait) / 2;
  const tour = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, part));
  return (
    <View style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="anneauPrep" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8FA6F8" />
            <Stop offset="0.55" stopColor="#B35A9E" />
            <Stop offset="1" stopColor="#D9B866" />
          </SvgGradient>
        </Defs>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke="#E6ECF8" strokeWidth={trait} fill="none" />
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke="url(#anneauPrep)" strokeWidth={trait} fill="none" strokeLinecap="round" strokeDasharray={`${tour * Math.max(0.02, p)} ${tour}`} transform={`rotate(-90 ${taille / 2} ${taille / 2})`} />
      </Svg>
      <Ink size={Math.round(taille * 0.26)} weight="black" tight color={c.ink} style={{ fontVariant: ['tabular-nums'] }}>{`${Math.round(p * 100)}`}</Ink>
      <Ink size={11} weight="black" color={c.textMuted} style={{ marginTop: -2 }}>%</Ink>
    </View>
  );
}

export function Forge({ nav, genre, univers = 'japon', lignes, chiffres = [], scene = null, run, onDone, onSound }: {
  nav: Nav;
  genre: 'h' | 'f';
  univers?: ChoixUnivers;
  lignes?: LignePreparation[];
  chiffres?: ChiffrePreparation[];
  /** la scene choisie a l'ecran Ta scene (null : celle de ton univers) */
  scene?: string | null;
  run: () => Promise<void>;
  onDone: () => void;
  onSound: () => void;
}) {
  const LINES = lignes && lignes.length ? lignes : LIGNES_DEFAUT;
  const c = useColors();
  const illus = useIllustrations();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const apercu = useApercuVisible();
  const calme = !!useReducedMotion();
  const petit = height < 720;
  const [checked, setChecked] = useState(0);
  const [part, setPart] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const doneRef = useRef(false);

  const fond = imageScene(scene, univers);
  const g: 'h' | 'f' = genre === 'f' ? 'f' : 'h';
  // Japon : le Rōnin ; Classique : le Sportif ou la Sportive ; sans personnage : la scene seule
  const perso = univers === 'japon' ? guerrierImage(genre, 3) : univers === 'classique' ? CLASSIQUE_IMAGES[g][3] : null;
  const carteW = width - GUTTER * 2;
  const carteH = Math.round(Math.min(petit ? 190 : 250, height * 0.3));

  // zoom lent du decor et montee du personnage
  const zoom = useSharedValue(1);
  const monte = useSharedValue(calme ? 0 : 18);
  useEffect(() => {
    if (calme) return;
    zoom.value = 1;
    zoom.value = withTiming(1.1, { duration: DUREE_MS + 600, easing: Easing.out(Easing.quad) });
    monte.value = 18;
    monte.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [attempt, calme, zoom, monte]);
  const styleFond = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const stylePerso = useAnimatedStyle(() => ({ transform: [{ translateY: monte.value }] }));

  useEffect(() => {
    let alive = true;
    doneRef.current = false;
    setChecked(0);
    setPart(0);
    setError(null);
    const t0 = Date.now();
    let fini = false;
    // l'anneau avance jusqu'a 92 % au rythme de l'ecran, puis 100 % quand l'enregistrement est fini
    const horloge = setInterval(() => {
      if (!alive) return;
      const p = Math.min(1, (Date.now() - t0) / DUREE_MS);
      setPart(fini ? 1 : Math.min(0.92, p * 0.92));
    }, 50);
    const pas = Math.round((DUREE_MS - 700) / Math.max(1, LINES.length));
    const timers = LINES.slice(0, -1).map((_, i) =>
      setTimeout(() => {
        if (!alive) return;
        setChecked((n) => Math.max(n, i + 1));
        tap('light');
      }, 500 + i * pas),
    );
    run()
      .then(async () => {
        const wait = Math.max(0, DUREE_MS - 500 - (Date.now() - t0));
        await new Promise((r) => setTimeout(r, wait));
        if (!alive) return;
        fini = true;
        setPart(1);
        setChecked(LINES.length);
        onSound();
        tap('success');
        setTimeout(() => {
          if (alive && !doneRef.current) {
            doneRef.current = true;
            onDone();
          }
        }, 500);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
      clearInterval(horloge);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // les chiffres de ton plan apparaissent a 20, 45 et 70 % de l'anneau
  const seuils = [0.2, 0.45, 0.7];
  const titre = TITRES[univers] ?? TITRES.japon;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: insets.top + 56 }}>
        <View style={{ width: 44 }} />
        <ApercuDansBarre />
        {apercu ? null : nav.progress != null ? <ProgressBar value={nav.progress} /> : <View style={{ flex: 1 }} />}
        <View style={{ width: 44 }} />
        {nav.onClose ? <RoundIcon name="close" label={traduire('Fermer l’aperçu')} onPress={nav.onClose} /> : null}
      </View>

      <View style={{ flex: 1, paddingHorizontal: GUTTER, gap: petit ? 10 : 14 }}>
        {/* 1. ta scene en carte, ton personnage dessus */}
        <View style={{ width: carteW, height: carteH, borderRadius: 28, overflow: 'hidden', backgroundColor: c.fillSoft }} accessible accessibilityLabel={traduire('Ta scène et ton personnage')}>
          <Animated.Image source={fond} resizeMode="cover" style={[{ width: carteW, height: carteH }, styleFond]} accessibilityIgnoresInvertColors />
          {perso ? (
            <Animated.Image source={perso} resizeMode="contain" style={[{ position: 'absolute', right: 8, bottom: 0, width: Math.round(carteH * 0.66), height: carteH - 6 }, stylePerso]} accessibilityIgnoresInvertColors />
          ) : null}
        </View>

        {/* 2. le titre, en encre sur le fond clair */}
        <Ink size={petit ? 25 : 28} weight="black" tight style={{ lineHeight: petit ? 30 : 33 }} accessibilityRole="header" accessibilityLabel={titre.replace(/\*\*/g, '')}>
          {decouper(titre).map((m, i) => (m.cle ? <Ink key={i} size={petit ? 25 : 28} weight="black" tight color={c.accent}>{m.txt}</Ink> : m.txt))}
        </Ink>

        {/* 3. l'anneau et les chiffres de ton plan */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Anneau part={part} taille={petit ? 86 : 100} />
          <View style={{ flex: 1, gap: 6 }}>
            {chiffres.slice(0, 3).map((ch, i) =>
              part >= seuils[i] ? (
                <Animated.View key={ch.label} entering={calme ? undefined : FadeInDown.duration(320)} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, borderRadius: 14, backgroundColor: FAMILLES[ch.famille].fond, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Ink size={10.5} weight="black" color={FAMILLES[ch.famille].titre} style={{ letterSpacing: 0.8 }} numberOfLines={1}>{ch.label.toUpperCase()}</Ink>
                  <Ink size={14.5} weight="black" color={c.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{ch.valeur}</Ink>
                </Animated.View>
              ) : (
                <View key={ch.label} style={{ height: 32, borderRadius: 14, backgroundColor: c.fillSoft, opacity: 0.6 }} />
              ),
            )}
          </View>
        </View>

        {/* 4. les etapes, chacune avec son sticker */}
        <View style={{ borderRadius: 22, backgroundColor: c.surface, paddingVertical: 6, paddingHorizontal: 12 }}>
          {LINES.map((l, i) => {
            const on = i < checked;
            return (
              <View key={l.texte} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: petit ? 38 : 42, borderTopWidth: i ? 1 : 0, borderTopColor: c.divider }}>
                <Image source={illus.img(l.sticker)} style={{ width: 30, height: 30, opacity: on ? 1 : 0.45 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <Ink size={15} weight={on ? 'extraBold' : 'medium'} color={on ? c.ink : c.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{l.texte}</Ink>
                {on ? (
                  <Animated.View entering={calme ? undefined : ZoomIn.duration(220)} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#23358F', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={13} color="#FFFFFF" stroke={3} />
                  </Animated.View>
                ) : (
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.border }} />
                )}
              </View>
            );
          })}
        </View>

        {error ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10 }}>
            <Ink size={14} weight="bold" color={c.danger}>{traduire('L’enregistrement n’a pas abouti. {0}', error)}</Ink>
            <MainButton label={traduire('Réessayer')} onPress={() => setAttempt((a) => a + 1)} />
          </Animated.View>
        ) : null}
      </View>
      <View style={{ height: insets.bottom + 10 }} />
    </View>
  );
}

export default Forge;
