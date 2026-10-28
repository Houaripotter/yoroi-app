/**
 * La carte musculaire (27 octobre 2026), à la place des silhouettes en petits blocs (« ça fait bas de gamme »).
 * Face et dos côte à côte, le corps gris bleuté très clair (#E6ECF8, liseré #C9D3EA), les muscles au repos en pastel
 * très doux, la zone choisie dans une seule couleur franche avec un léger halo : jamais d'arc en ciel.
 * Le toucher passe par une table d'ellipses en pourcentages (lib/v2/programmes/carteMuscles.ts, TOUCHER).
 *
 * Illustration dessinée (28 octobre 2026) : face.webp et dos.webp (assets/avatars/app/muscles/) remplacent le dessin,
 * avec leurs reperes de toucher (TOUCHER_IMAGE) par dessus :
 * la zone choisie prend son calque en surbrillance s'il est fourni (CALQUES_MUSCLES), sinon un halo doux.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { GestureResponderEvent, ImageSourcePropType } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { CONTOUR, DETAILS, HAUTEUR_CORPS, LARGEUR_CORPS, MUSCLES, TETE, TOUCHER, TOUCHER_IMAGE, zoneAuPoint } from '@/lib/v2/programmes/carteMuscles';
import type { VueCorps } from '@/lib/v2/programmes/carteMuscles';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { traduire } from '@/lib/i18n/tr';

/** L'illustration dessinée, face et dos (fond transparent, 1000 x 2200), quand elle existe */
export const IMAGES_MUSCLES: Record<VueCorps, ImageSourcePropType | null> = {
  face: require('@/assets/avatars/app/muscles/face.webp'),
  dos: require('@/assets/avatars/app/muscles/dos.webp'),
};
/** La même illustration avec une seule zone en surbrillance, si elle est fournie */
export const CALQUES_MUSCLES: Record<VueCorps, Partial<Record<ZoneId, ImageSourcePropType>>> = { face: {}, dos: {} };

const CORPS = '#E6ECF8';
const LISERE = '#C9D3EA';
const REPOS = '#D6DEF2';
export const ACCENT_MUSCLES = '#6684F2';
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
  const hauteur = Math.round(largeur * RATIO);
  // la petite silhouette des douleurs (muscles false, un point dans le repere 200 x 440) garde le dessin
  const image = muscles ? IMAGES_MUSCLES[vue] : null;
  // l'illustration a ses propres reperes de toucher (TOUCHER_IMAGE), le dessin les siens
  const table = image ? TOUCHER_IMAGE[vue] : TOUCHER[vue];
  const toucher = (e: GestureResponderEvent) => {
    if (!onToggle) return;
    const z = zoneAuPoint(vue, (e.nativeEvent.locationX / largeur) * 100, (e.nativeEvent.locationY / hauteur) * 100, table);
    if (!z) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(z);
  };
  const plein = { position: 'absolute' as const, left: 0, top: 0, width: largeur, height: hauteur };
  const dessin = image ? (
    <>
      <Image source={image} style={plein} resizeMode="contain" accessibilityIgnoresInvertColors />
      {choisies.map((z) => {
        const calque = CALQUES_MUSCLES[vue][z];
        if (calque) return <Image key={z} source={calque} style={plein} resizeMode="contain" />;
        return null;
      })}
      {/* sans calque : un halo doux sur les zones choisies */}
      <Svg width={largeur} height={hauteur} viewBox="0 0 100 100" preserveAspectRatio="none" style={plein} pointerEvents="none">
        {table.filter((t) => choisies.includes(t.zone) && !CALQUES_MUSCLES[vue][t.zone]).map((t, k) => (
          <Ellipse key={k} cx={t.x} cy={t.y} rx={t.rx} ry={t.ry} fill={accent} fillOpacity={0.28} stroke={accent} strokeOpacity={0.5} strokeWidth={0.6} />
        ))}
      </Svg>
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
