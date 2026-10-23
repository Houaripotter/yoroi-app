/**
 * Scene animee (18 octobre 2026, mouvement reel le 19 octobre) : l'image fixe de la scene, puis
 * 1. la video en boucle de la scene s'il y en a une (lib/v2/scenes/medias.ts) : muette, sans controles,
 *    en « cover » au meme cadrage que l'image ; l'image reste dessous tant que la video n'est pas prete
 *    et si elle echoue ;
 * 2. les calques mobiles (objet detoure qui traverse, se balance, penche, clignote) ;
 * 3. les calques d'effets en code (pluie, lueurs...), en plus.
 *
 * - Une seule horloge par scene, sur le fil d'affichage (useFrameCallback), cadencee a 30 images par
 *   seconde : assez fluide pour de la pluie ou de la neige, deux fois moins de travail pour un vieil iPhone.
 * - L'horloge et la video s'arretent quand l'ecran n'est pas visible (autre onglet, autre ecran), quand l'app
 *   passe en arriere plan, pendant la visite guidee, ou quand le parent passe actif={false} (scene hors de
 *   l'ecran dans une liste).
 * - « Reduire les animations » du telephone : l'image reste fixe, ni video, ni calque.
 * - Sans image (source absente) : le degrade de remplacement de la scene, avec ses effets.
 * - L'image est affichee en « cover » (centree, rognee pour remplir le cadre). Les calques sont poses sur
 *   l'image entiere, rognee de la meme facon : les zones en pourcentage de l'image restent justes dans un
 *   cadre de n'importe quelle forme (bandeau de l'accueil, scene haute du Dojo).
 *
 * Apercu : Studio, Tests de l'appareil, Apercu des scenes animees.
 */
import React, { useEffect, useMemo } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { RATIO_SCENES, configScene, effetsVisibles } from '@/lib/v2/scenes/animations';
import type { ConfigScene } from '@/lib/v2/scenes/animations';
import { imageCalque, videoDeScene } from '@/lib/v2/scenes/medias';
import { VideoScene, useEcranVisible, useReduireAnimations } from '@/components/yoroi/v2/accueil/SceneAnimee';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { CalqueEffet } from './effets';
import { CalqueMobileVue } from './CalquesMobiles';

const PAS = 1 / 30;

export type SceneAnimeeProps = {
  /** l'image fixe de la scene (require d'un fichier de assets/), ou null tant qu'elle n'existe pas */
  source?: ImageSourcePropType | null;
  /** identifiant de la scene dans lib/v2/scenes/animations.ts (yatai, lampadaire_neige...) */
  scene: string;
  width: number;
  height: number;
  /** rapport largeur sur hauteur de l'image (1200 x 670 par defaut) */
  ratio?: number;
  /** false : l'animation se fige (scene hors de l'ecran dans une liste, carrousel...) */
  actif?: boolean;
  /** false : l'image seule, sans calques (comparaison dans le Studio) */
  effets?: boolean;
  /** la video en boucle (require d'un .mp4) ; absent : celle de la scene (lib/v2/scenes/medias.ts) ; false : aucune */
  video?: number | null | false;
  /** false : sans les calques mobiles (comparaison dans le Studio) */
  mobiles?: boolean;
  /** config a la place de celle du fichier (reglages en direct) */
  config?: ConfigScene | null;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
};

/** L'horloge commune des effets, en secondes ; avance seulement quand joue est vrai */
function useHorlogeScene(joue: boolean) {
  const temps = useSharedValue(0);
  const reste = useSharedValue(0);
  const horloge = useFrameCallback((f) => {
    // au retour d'une pause, pas de saut : au plus 50 ms d'un coup
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    reste.value += dt;
    if (reste.value >= PAS) {
      temps.value += reste.value;
      reste.value = 0;
    }
  }, false);
  useEffect(() => {
    horloge.setActive(joue);
    return () => horloge.setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joue]);
  return temps;
}

/** Rectangle de l'image en « cover » dans le cadre (centree, debordante) */
export function rectCover(width: number, height: number, ratio: number) {
  const r = ratio > 0 ? ratio : RATIO_SCENES;
  if (width / Math.max(1, height) > r) {
    const h = width / r;
    return { x: 0, y: (height - h) / 2, w: width, h };
  }
  const w = height * r;
  return { x: (width - w) / 2, y: 0, w, h: height };
}

export function SceneAnimee({ source, scene, width, height, ratio = RATIO_SCENES, actif = true, effets = true, video, mobiles = true, config: configForcee, borderRadius = 0, style, accessibilityLabel, children }: SceneAnimeeProps) {
  const config = configForcee !== undefined ? configForcee : configScene(scene);
  const reduire = useReduireAnimations();
  const { visible } = useEcranVisible();
  const visite = useVisiteEnCours();
  const anime = !reduire && width > 0 && height > 0;
  const joue = anime && actif && visible && !visite;
  const sourceVideo = video === false ? null : video !== undefined ? video : videoDeScene(scene);
  const avecVideo = anime && sourceVideo != null;
  const calques = mobiles && anime && config?.calques?.length ? config.calques : null;
  const avecEffets = !!config && effets && anime;
  const temps = useHorlogeScene((avecEffets || !!calques) && joue);
  const img = useMemo(() => rectCover(width, height, ratio), [width, height, ratio]);
  const cadre = useMemo(() => ({ w: img.w, h: img.h }), [img]);
  const liste = config && avecEffets ? effetsVisibles(config, avecVideo) : [];
  const calqueImage = { position: 'absolute' as const, left: img.x, top: img.y, width: img.w, height: img.h };

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: config?.fond[1] ?? '#1D2029' }, style]} accessibilityLabel={accessibilityLabel ?? config?.nom}>
      {source ? (
        <Image source={source} style={calqueImage} resizeMode="cover" />
      ) : config ? (
        <LinearGradient colors={config.fond} style={{ position: 'absolute', left: 0, top: 0, width, height }} />
      ) : null}
      {avecVideo && sourceVideo != null ? <VideoScene key={String(sourceVideo)} source={sourceVideo} joue={joue} style={calqueImage} /> : null}
      {calques || liste.length ? (
        <View pointerEvents="none" style={[calqueImage, { overflow: 'hidden' }]}>
          {calques?.map((c, i) => {
            const src = imageCalque(c.image);
            return src != null ? <CalqueMobileVue key={`${c.image}-${i}`} calque={c} source={src} temps={temps} cadre={cadre} /> : null;
          })}
          {config
            ? liste.map((e, i) => <CalqueEffet key={`${config.id}-${i}-${e.type}`} effet={e} temps={temps} cadre={cadre} graine={`${config.id}-${i}`} />)
            : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export default SceneAnimee;
