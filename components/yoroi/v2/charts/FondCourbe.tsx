/**
 * Fond de la courbe de poids (vague 34, carte « rouleau » validee par Houari, version D du labo compact) :
 * une scene illustree derriere la courbe, coins arrondis, sous un voile de papier washi pour que le trait reste lisible.
 *  - par defaut (« auto ») : la scene de ton accueil ; si elle a deja un torii dans le decor (cascade, montagne, plage,
 *    port, sommet, nuit, sakura : verifie image par image), les rizieres a l'aube, pour ne jamais avoir deux torii ;
 *  - « aucun » : sans fond ; sinon la scene choisie dans Reglages, Apparence.
 * Images en require statique (SCENES de l'accueil), cadrage en couverture avec la hauteur a 62 % ; le composant est
 * memoise : le doigt qui glisse sur la courbe ne le redessine jamais.
 * Vague 37 : en sombre, un voile plus sombre (les etiquettes claires s'y lisent sans contour blanc).
 */
import React, { memo, useState } from 'react';
import { P, paletteSombre } from '@/components/yoroi/livePalette';
import { Image, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SceneId } from '@/lib/v2/espace';
import type { FondCourbe } from '@/lib/v2/courbes/prefs';
import { SCENES } from '../accueil/images';
import { SAMOURAI_AVEC_TORII } from '@/lib/v2/espace/samourai';

/** Papier washi de la carte rouleau (valeurs claires ; au rendu, lire P.washi et P.washiBord qui suivent le mode sombre, vague 35) */
export const WASHI = '#FBF8F1';
export const WASHI_BORD = '#E8E0CC';

/** Scenes dont le decor montre deja un torii : le fond automatique prend alors les rizieres */
export const SCENES_AVEC_TORII: SceneId[] = ['cascade', 'montagne', 'plage', 'port', 'sommet', 'nuit', 'sakura', ...SAMOURAI_AVEC_TORII];
export const FOND_REPLI: SceneId = 'rizieres';
/**
 * Scenes proposees dans Reglages, Apparence (vague 35) : TOUTES les scenes de l'accueil sans torii dans le decor,
 * les rizieres en premier ; une scene ajoutee a SCENES y apparait toute seule (ajoute-la a SCENES_AVEC_TORII si
 * son decor montre un torii).
 */
export const FONDS_PROPOSES: SceneId[] = [FOND_REPLI, ...(Object.keys(SCENES) as SceneId[]).filter((id) => id !== FOND_REPLI && !SCENES_AVEC_TORII.includes(id))];

const RATIO = 1200 / 670;

/** La scene affichee derriere la courbe, ou null sans fond */
export function sceneDuFond(fond: FondCourbe, sceneAccueil: SceneId | null | undefined): SceneId | null {
  if (fond === 'aucun') return null;
  if (fond !== 'auto' && SCENES[fond as SceneId]) return fond as SceneId;
  const s = sceneAccueil && SCENES[sceneAccueil] ? sceneAccueil : FOND_REPLI;
  return SCENES_AVEC_TORII.includes(s) ? FOND_REPLI : s;
}

type Props = {
  scene: SceneId | null;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** L'image seule, en couverture (position verticale 62 %), et son voile : memoisee, jamais redessinee au doigt */
const Decor = memo(function Decor({ scene, w, h, sombre, apercu }: { scene: SceneId; w: number; h: number; sombre: boolean; apercu?: boolean }) {
  const s = Math.max(w / 1200, h / 670);
  const iw = Math.ceil(1200 * s) + 1;
  const ih = Math.ceil(iw / RATIO);
  return (
    <>
      <Image
        source={SCENES[scene]}
        style={{ position: 'absolute', width: iw, height: ih, left: -(iw - w) / 2, top: -(ih - h) * 0.62 }}
        resizeMode="cover"
        fadeDuration={0}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          apercu
            ? // vague 45 (Houari : « on ne voit rien » en sombre) : dans l'apercu, la scene presque sans voile
              sombre ? ['rgba(20,22,30,0.12)', 'rgba(20,22,30,0)', 'rgba(20,22,30,0.18)'] : ['rgba(251,248,241,0.18)', 'rgba(251,248,241,0)', 'rgba(251,248,241,0.22)']
            : sombre ? ['rgba(20,22,30,0.8)', 'rgba(20,22,30,0.7)', 'rgba(20,22,30,0.86)'] : ['rgba(251,248,241,0.82)', 'rgba(251,248,241,0.68)', 'rgba(251,248,241,0.86)']
        }
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
    </>
  );
});

/** La courbe posee sur sa scene (ou sur rien, si « Sans fond ») */
export function SceneCourbe({ scene, children, style }: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      style={[{ borderRadius: 16, overflow: 'hidden', paddingTop: 6, paddingHorizontal: 4, paddingBottom: 2 }, style]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        const h = Math.round(e.nativeEvent.layout.height);
        if (!size || size.w !== w || size.h !== h) setSize({ w, h });
      }}
    >
      {scene && size ? <Decor scene={scene} w={size.w} h={size.h} sombre={paletteSombre()} /> : null}
      {children}
    </View>
  );
}

/**
 * Apercu d'un fond pour les Reglages, ou le papier seul.
 * Vague 45 : plus grand (112 sur 70), la scene sans voile sombre, et une vraie petite courbe lisible
 * (lisere clair, trait epais, point final) pour juger l'effet.
 */
export function ApercuFond({ scene, width = 112, height = 70 }: { scene: SceneId | null; width?: number; height?: number }) {
  const sombre = paletteSombre();
  const d = `M8 ${height * 0.36} C${width * 0.3} ${height * 0.3}, ${width * 0.42} ${height * 0.62}, ${width * 0.62} ${height * 0.56} S${width * 0.82} ${height * 0.66}, ${width - 12} ${height * 0.7}`;
  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', backgroundColor: P.washi, borderWidth: 1, borderColor: P.washiBord }}>
      {scene ? <Decor scene={scene} w={width} h={height} sombre={sombre} apercu /> : null}
      <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Path d={d} fill="none" stroke={sombre ? '#12141B' : '#FFFFFF'} strokeOpacity={0.85} strokeWidth={8} strokeLinecap="round" />
        <Path d={d} fill="none" stroke={sombre ? '#A58BFF' : '#6A45F5'} strokeWidth={4} strokeLinecap="round" />
        <Path d={`M${width - 12} ${height * 0.7} h0.1`} stroke={sombre ? '#A58BFF' : '#6A45F5'} strokeWidth={11} strokeLinecap="round" />
        <Path d={`M${width - 12} ${height * 0.7} h0.1`} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
