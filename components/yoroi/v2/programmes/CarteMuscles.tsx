/**
 * La carte musculaire (27 octobre 2026), à la place des silhouettes en petits blocs (« ça fait bas de gamme »).
 * Face et dos côte à côte, le corps gris bleuté très clair (#E6ECF8, liseré #C9D3EA), les muscles au repos en pastel
 * très doux, la zone choisie dans une seule couleur franche avec un léger halo : jamais d'arc en ciel.
 * Le toucher passe par une table d'ellipses en pourcentages (lib/v2/programmes/carteMuscles.ts, TOUCHER).
 *
 * Illustration dessinée (28 octobre 2026) : face.webp et dos.webp (assets/avatars/app/muscles/) remplacent le dessin,
 * avec leurs reperes de toucher (TOUCHER_IMAGE) par dessus :
 * la zone choisie prend son calque en surbrillance s'il est fourni (CALQUES_MUSCLES), sinon un halo doux.
 *
 * 28 octobre 2026 (soir), Houari sur les halos ronds : « c'est moche, pas pro, ça ne donne pas envie ». Plus aucun cercle :
 * chaque zone a son calque rouge découpé pixel par pixel dans l'illustration elle même (assets/avatars/app/muscles/calques,
 * script _propositions/muscles_rouge_2026-10-28), posé pile sur les muscles avec un fondu doux. Les autres zones restent
 * en lavande. Le toucher lit le masque de chaque muscle (zoneDansGrille) : c'est le muscle sous le doigt qui est choisi.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { GestureResponderEvent, ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useYoroiTheme } from '@/components/yoroi';
import { usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { CONTOUR, DETAILS, HAUTEUR_CORPS, LARGEUR_CORPS, MUSCLES, TETE, TOUCHER, zoneAuPoint, zoneDansGrille } from '@/lib/v2/programmes/carteMuscles';
import type { VueCorps } from '@/lib/v2/programmes/carteMuscles';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { traduire } from '@/lib/i18n/tr';

/** L'illustration dessinée, face et dos (fond transparent, 1000 x 2200), quand elle existe */
export const IMAGES_MUSCLES: Record<VueCorps, ImageSourcePropType | null> = {
  face: require('@/assets/avatars/app/muscles/face.webp'),
  dos: require('@/assets/avatars/app/muscles/dos.webp'),
};
/**
 * Le calque rouge de chaque zone (1000 x 2200, même cadrage que l'illustration) : seulement les pixels de ses muscles,
 * dégradé rouge, léger reflet en haut, fine lueur autour. Une zone absente d'une vue n'y a pas de calque (les abdos au dos).
 */
export const CALQUES_MUSCLES: Record<VueCorps, Partial<Record<ZoneId, ImageSourcePropType>>> = {
  face: {
    trapezes: require('@/assets/avatars/app/muscles/calques/face_trapezes.webp'),
    epaules: require('@/assets/avatars/app/muscles/calques/face_epaules.webp'),
    pectoraux: require('@/assets/avatars/app/muscles/calques/face_pectoraux.webp'),
    bras: require('@/assets/avatars/app/muscles/calques/face_bras.webp'),
    avantbras: require('@/assets/avatars/app/muscles/calques/face_avantbras.webp'),
    abdos: require('@/assets/avatars/app/muscles/calques/face_abdos.webp'),
    quadriceps: require('@/assets/avatars/app/muscles/calques/face_quadriceps.webp'),
    mollets: require('@/assets/avatars/app/muscles/calques/face_mollets.webp'),
  },
  dos: {
    trapezes: require('@/assets/avatars/app/muscles/calques/dos_trapezes.webp'),
    dos: require('@/assets/avatars/app/muscles/calques/dos_dos.webp'),
    epaules: require('@/assets/avatars/app/muscles/calques/dos_epaules.webp'),
    bras: require('@/assets/avatars/app/muscles/calques/dos_bras.webp'),
    avantbras: require('@/assets/avatars/app/muscles/calques/dos_avantbras.webp'),
    fessiers: require('@/assets/avatars/app/muscles/calques/dos_fessiers.webp'),
    quadriceps: require('@/assets/avatars/app/muscles/calques/dos_quadriceps.webp'),
    ischios: require('@/assets/avatars/app/muscles/calques/dos_ischios.webp'),
    mollets: require('@/assets/avatars/app/muscles/calques/dos_mollets.webp'),
  },
};

const CORPS = '#E6ECF8';
const LISERE = '#C9D3EA';
const REPOS = '#D6DEF2';
export const ACCENT_MUSCLES = '#6684F2';
/**
 * 28 octobre 2026, mode sombre : l'illustration (tres claire) eblouissait sur le fond nuit. En sombre : un fond de carte
 * un cran plus clair derriere le corps et l'illustration un peu adoucie ; le calque rouge, lui, reste plein.
 */
const FOND_SOMBRE = '#222838';
const RATIO = HAUTEUR_CORPS / LARGEUR_CORPS;

export function CarteMuscles({ vue, largeur, choisies = [], onToggle, accent = ACCENT_MUSCLES, muscles = true, point, libelle }: {
  vue: VueCorps;
  largeur: number;
  choisies?: readonly ZoneId[];
  /** absent : la carte ne se touche pas */
  onToggle?: (z: ZoneId) => void;
  accent?: string;
  /** false : la silhouette seule (la petite carte des douleurs) */
  muscles?: boolean;
  /** un point rouge (repère 200 x 440), pour montrer une douleur */
  point?: [number, number];
  /** « FACE », « DOS » en petites capitales sous la silhouette */
  libelle?: boolean;
}) {
  const pa = usePastel();
  const { isDark } = useYoroiTheme();
  const hauteur = Math.round(largeur * RATIO);
  // la petite silhouette des douleurs (muscles false, un point dans le repere 200 x 440) garde le dessin
  const image = muscles ? IMAGES_MUSCLES[vue] : null;
  // l'illustration : le masque du muscle sous le doigt ; le dessin : ses ellipses
  const toucher = (e: GestureResponderEvent) => {
    if (!onToggle) return;
    const x = (e.nativeEvent.locationX / largeur) * 100;
    const y = (e.nativeEvent.locationY / hauteur) * 100;
    const z = image ? zoneDansGrille(vue, x, y) : zoneAuPoint(vue, x, y, TOUCHER[vue]);
    if (!z) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(z);
  };
  const plein = { position: 'absolute' as const, left: 0, top: 0, width: largeur, height: hauteur };
  const dessin = image ? (
    <>
      {isDark ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: largeur, height: hauteur, borderRadius: Math.min(24, largeur * 0.16), backgroundColor: FOND_SOMBRE }} /> : null}
      <Image source={image} style={[plein, isDark ? { opacity: 0.86 } : null]} resizeMode="contain" accessibilityIgnoresInvertColors />
      {/* la zone choisie : son calque rouge pile sur ses muscles, en fondu doux ; rien de rond par dessus */}
      {choisies.map((z) => {
        const calque = CALQUES_MUSCLES[vue][z];
        if (!calque) return null;
        return (
          <Animated.View key={z} entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} pointerEvents="none" style={plein}>
            <Image source={calque} style={{ width: largeur, height: hauteur }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Animated.View>
        );
      })}
    </>
  ) : (
    <Svg width={largeur} height={hauteur} viewBox={`0 0 ${LARGEUR_CORPS} ${HAUTEUR_CORPS}`}>
      {/* en petit (sans muscles), un trait plus épais pour que la silhouette reste lisible */}
      <Path d={CONTOUR} fill={muscles ? CORPS : '#DDE4F4'} stroke={LISERE} strokeWidth={muscles ? 2 : 7} strokeLinejoin="round" />
      <Path d={TETE} fill={muscles ? CORPS : '#DDE4F4'} stroke={LISERE} strokeWidth={muscles ? 2 : 7} />
      {muscles ? <Path d={DETAILS[vue]} fill="none" stroke={LISERE} strokeWidth={1.6} strokeLinecap="round" /> : null}
      {muscles
        ? (Object.keys(MUSCLES[vue]) as ZoneId[]).map((z) => {
            const on = choisies.includes(z);
            const d = MUSCLES[vue][z]!;
            return (
              <React.Fragment key={z}>
                {on ? <Path d={d} fill="none" stroke={accent} strokeOpacity={0.22} strokeWidth={9} strokeLinejoin="round" /> : null}
                <Path d={d} fill={on ? accent : REPOS} stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.4} strokeLinejoin="round" />
              </React.Fragment>
            );
          })
        : null}
      {point ? <Path d={`M${point[0] - 24} ${point[1]}a24 24 0 1 0 48 0a24 24 0 1 0 -48 0`} fill="#F08A8A" stroke="#FFFFFF" strokeWidth={8} /> : null}
    </Svg>
  );
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable
        onPress={onToggle ? toucher : undefined}
        disabled={!onToggle}
        accessible={!!onToggle}
        accessibilityRole={onToggle ? 'image' : undefined}
        accessibilityLabel={onToggle ? (vue === 'face' ? traduire('Le corps, vu de devant') : traduire('Le corps, vu de dos')) : undefined}
        accessibilityHint={onToggle ? traduire('Touche une zone pour la choisir. Les boutons sous le corps font la même chose.') : undefined}
        importantForAccessibility={onToggle ? 'auto' : 'no-hide-descendants'}
        style={{ width: largeur, height: hauteur }}
      >
        {dessin}
      </Pressable>
      {libelle ? <Ink size={10.5} weight="black" color={pa.texte3} style={{ letterSpacing: 1.3 }}>{(vue === 'face' ? traduire('Face') : traduire('Dos')).toLocaleUpperCase()}</Ink> : null}
    </View>
  );
}

/** Face et dos côte à côte, dans la largeur donnée */
export function DeuxVues({ largeur, choisies, onToggle, accent, ecart = 18 }: { largeur: number; choisies?: readonly ZoneId[]; onToggle?: (z: ZoneId) => void; accent?: string; ecart?: number }) {
  const l = Math.floor((largeur - ecart) / 2);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: ecart }}>
      <CarteMuscles vue="face" largeur={l} choisies={choisies} onToggle={onToggle} accent={accent} libelle />
      <CarteMuscles vue="dos" largeur={l} choisies={choisies} onToggle={onToggle} accent={accent} libelle />
    </View>
  );
}
