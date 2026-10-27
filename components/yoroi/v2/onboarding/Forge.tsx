/**
 * Ecran 15 : « On forge ton armure », en plein ecran (vague 29, refait).
 * Quatre scenes d'epoque se succedent en fondu, chacune avec un personnage different (le Guerrier au rang
 * Ashigaru dans la forge, le Ronin errant sous les cerisiers, le Ninja ou la Kunoichi dans la neige,
 * le Guerrier au rang Shogun devant le chateau), toujours au dessin classique. Zoom lent sur chaque decor,
 * une ligne se coche par scene pendant que l'enregistrement final se fait vraiment, avec l'indicateur ensō
 * de l'ecran de chargement. Gong et vibration a la fin. Environ 3,8 secondes, une seule fois :
 * au retour depuis ton plan, l'onboarding saute cet ecran. Plus de halo rond derriere le personnage.
 * Vague 45 : l'univers choisi a l'ecran 4 decide des scenes. Classique : la salle, le parc, la ville et la piste,
 * avec le Sportif ou la Sportive qui gagne sa tenue, titre « On prépare ta tenue ». Sans personnage : les memes
 * scenes seules, titre « On prépare ton plan ».
 * 26 octobre 2026 (Houari : « je n'ai pas compris pourquoi tu dis on prépare ta tenue ») : en Classique le titre devient
 * « On prépare ton plan », comme sans personnage (le Japon garde « On forge ton armure », le nom de son Dojo).
 * La liste dit ce qui est vraiment prêt a la fin (lignes, calculees par app/onboarding.tsx : ton chemin de poids,
 * ta semaine, ton personnage, tes rappels si tu en as choisi, ton accueil). Environ 2,6 s au lieu de 3,8.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { guerrierImage } from '@/components/yoroi/v2/espace/assets';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { FONDS } from '@/components/yoroi/v2/fonds/FondEpoque';
import { CLASSIQUE_IMAGES, MONDE_PERSONNAGES, packImage } from '@/lib/v2/dojo/personnages';
import { CLASSIQUE_SCENE_IMAGES } from '@/lib/v2/espace/classique';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { FORGE_SCENE } from './illus';
import { GUTTER, MainButton, ProgressBar, RoundIcon, useColors } from './ui';
import type { Nav } from './types';
import { ApercuDansBarre, useApercuVisible } from '@/components/yoroi/v2/studio/PreviewBar';
import { traduire } from '@/lib/i18n/tr';

/** liste par defaut, si l'appelant n'en donne pas */
const LIGNES_DEFAUT = [traduire('Ton suivi de poids'), traduire('Ta semaine d’entraînement'), traduire('Ton écran d’accueil')];
/** duree d'une scene ; la derniere reste a l'ecran jusqu'a la fin */
const SCENE_MS = 600;
const MIN_MS = 2600;

type Scene = { fond: ImageSourcePropType; perso: ImageSourcePropType | null };

function monde(id: string, genre: 'h' | 'f'): ImageSourcePropType {
  const pack = MONDE_PERSONNAGES.find((p) => p.id === id);
  return pack ? packImage(pack, genre, 1) : guerrierImage(genre, 0);
}

/** Un decor et son personnage : fondu d'entree et de sortie, zoom lent du decor, le personnage monte un peu */
function Couche({ index, last, t, scene, heroW, heroH, bottom }: { index: number; last: boolean; t: SharedValue<number>; scene: Scene; heroW: number; heroH: number; bottom: number }) {
  const fondStyle = useAnimatedStyle(() => {
    const p = t.value;
    const opacity = index === 0 ? (last ? 1 : interpolate(p, [0.75, 1], [1, 0], 'clamp')) : last ? interpolate(p, [index - 0.3, index], [0, 1], 'clamp') : interpolate(p, [index - 0.3, index, index + 0.75, index + 1], [0, 1, 1, 0], 'clamp');
    const scale = interpolate(p, [index - 0.3, index + (last ? 1.6 : 1)], [1.02, 1.12], 'clamp');
    return { opacity, transform: [{ scale }] };
  });
  const persoStyle = useAnimatedStyle(() => {
    const p = t.value;
    const opacity = index === 0 ? (last ? 1 : interpolate(p, [0.7, 0.95], [1, 0], 'clamp')) : last ? interpolate(p, [index - 0.25, index], [0, 1], 'clamp') : interpolate(p, [index - 0.15, index + 0.1, index + 0.7, index + 0.95], [0, 1, 1, 0], 'clamp');
    const rise = interpolate(p, [index - 0.25, last ? index : index + 0.3], [16, 0], 'clamp');
    return { opacity, transform: [{ translateY: rise }] };
  });
  return (
    <>
      <Animated.Image source={scene.fond} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }, fondStyle]} accessibilityIgnoresInvertColors />
      {scene.perso ? (
        <Animated.Image source={scene.perso} resizeMode="contain" style={[{ position: 'absolute', bottom, alignSelf: 'center', width: heroW, height: heroH }, persoStyle]} accessibilityIgnoresInvertColors />
      ) : null}
    </>
  );
}

/** Titre de l'ecran selon l'univers : le debut, puis le mot en or */
const TITRES: Record<ChoixUnivers, [string, string]> = {
  japon: ['On forge ', traduire('ton armure')],
  classique: [traduire('On prépare '), traduire('ton plan')],
  aucun: [traduire('On prépare '), traduire('ton plan')],
};

export function Forge({ nav, genre, univers = 'japon', lignes, run, onDone, onSound }: { nav: Nav; genre: 'h' | 'f'; univers?: ChoixUnivers; lignes?: string[]; run: () => Promise<void>; onDone: () => void; onSound: () => void }) {
  const LINES = lignes && lignes.length ? lignes : LIGNES_DEFAUT;
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const apercu = useApercuVisible();
  const [checked, setChecked] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const doneRef = useRef(false);
  const t = useSharedValue(0);
  const scenes: Scene[] = useMemo(() => {
    if (univers === 'japon') {
      return [
        { fond: FORGE_SCENE, perso: guerrierImage(genre, 0) },
        { fond: FONDS.sakura, perso: monde('ronin_errant', genre) },
        { fond: FONDS.neige, perso: monde('ninja', genre) },
        { fond: FONDS.chateau, perso: guerrierImage(genre, 4) },
      ];
    }
    // Vague 45 : Classique (le Sportif ou la Sportive, du premier au dernier rang) ou les scenes seules
    const avec = univers === 'classique';
    const g = genre === 'f' ? 'f' : 'h';
    return [
      { fond: CLASSIQUE_SCENE_IMAGES.classique_salle_jour, perso: avec ? CLASSIQUE_IMAGES[g][0] : null },
      { fond: CLASSIQUE_SCENE_IMAGES.classique_parc_jour, perso: avec ? CLASSIQUE_IMAGES[g][1] : null },
      { fond: CLASSIQUE_SCENE_IMAGES.classique_ville_jour, perso: avec ? CLASSIQUE_IMAGES[g][2] : null },
      { fond: CLASSIQUE_SCENE_IMAGES.classique_piste_jour, perso: avec ? CLASSIQUE_IMAGES[g][4] : null },
    ];
  }, [genre, univers]);
  const [titreDebut, titreOr] = TITRES[univers] ?? TITRES.japon;
  const petit = height < 720;
  const listH = LINES.length * 42 + 30;
  const bottom = insets.bottom + listH + (petit ? 0 : 12);
  const heroH = Math.round(Math.min(height - bottom - insets.top - (petit ? 150 : 190), 400));
  const heroW = Math.round(Math.min(width * 0.8, heroH * 0.75));

  useEffect(() => {
    t.value = 0;
    t.value = withTiming(scenes.length - 1, { duration: SCENE_MS * (scenes.length - 1), easing: Easing.linear });
  }, [attempt, t, scenes.length]);

  useEffect(() => {
    let alive = true;
    doneRef.current = false;
    setChecked(0);
    setError(null);
    const t0 = Date.now();
    // une ligne cochee par scene ; la derniere attend que l'enregistrement soit vraiment fini
    const timers = LINES.slice(0, -1).map((_, i) =>
      setTimeout(() => {
        if (!alive) return;
        setChecked((n) => Math.max(n, i + 1));
        tap('light');
      }, 450 + i * Math.round((MIN_MS - 900) / Math.max(1, LINES.length - 1))),
    );
    run()
      .then(async () => {
        const wait = Math.max(0, MIN_MS - 400 - (Date.now() - t0));
        await new Promise((r) => setTimeout(r, wait));
        if (!alive) return;
        setChecked(LINES.length);
        onSound();
        tap('success');
        setTimeout(() => {
          if (alive && !doneRef.current) {
            doneRef.current = true;
            onDone();
          }
        }, 400);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const fini = checked >= LINES.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#17110D', overflow: 'hidden' }}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill} accessible accessibilityLabel={univers === 'japon' ? traduire('Des scènes d’époque défilent, un personnage différent dans chacune') : univers === 'classique' ? traduire('Des scènes de salle, de parc et de ville défilent avec ton personnage') : traduire('Des scènes de salle, de parc et de ville défilent')}>
        {scenes.map((s, i) => (
          <Couche key={i} index={i} last={i === scenes.length - 1} t={t} scene={s} heroW={heroW} heroH={heroH} bottom={bottom} />
        ))}
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(14,10,8,0.72)', 'rgba(14,10,8,0.05)', 'rgba(14,10,8,0)', 'rgba(14,10,8,0.82)', 'rgba(14,10,8,0.94)']}
        locations={[0, 0.24, 0.5, 0.74, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: insets.top + 56 }}>
        <View style={{ width: 44 }} />
        {/* vague 30 : la pastille d'apercu du Studio ici, jamais sur le titre */}
        <ApercuDansBarre />
        {apercu ? null : nav.progress != null ? <ProgressBar value={nav.progress} /> : <View style={{ flex: 1 }} />}
        <View style={{ width: 44 }} />
        {nav.onClose ? <RoundIcon name="close" label={traduire("Fermer l’aperçu")} onPress={nav.onClose} /> : null}
      </View>

      <View style={{ paddingHorizontal: GUTTER, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Ink size={width < 380 ? 27 : 30} weight="black" tight color="#FFFFFF" numberOfLines={1} style={{ flex: 1, lineHeight: 35, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8 }} accessibilityRole="header">
          {titreDebut}
          <Ink size={width < 380 ? 27 : 30} weight="black" tight color="#E3C47B">{titreOr}</Ink>
        </Ink>
        {fini ? (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={16} color={c.onPrimary} stroke={3} />
          </View>
        ) : (
          <ChargementPetit size={30} color={c.onPrimary} />
        )}
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: insets.bottom + 18, gap: 10 }}>
        {LINES.map((l, i) => {
          const on = i < checked;
          return (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: on ? 0 : 2, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: on ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={15} color={c.onPrimary} stroke={3} /> : null}
              </View>
              <Ink size={16} weight={on ? 'extraBold' : 'medium'} color={on ? c.onPrimary : 'rgba(255,255,255,0.72)'}>{l}</Ink>
            </View>
          );
        })}
        {error ? (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Ink size={14} weight="bold" color="#FFB4A8">{traduire("L’enregistrement n’a pas abouti. {0}", error)}</Ink>
            <MainButton label={traduire("Réessayer")} onPress={() => setAttempt((a) => a + 1)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default Forge;
