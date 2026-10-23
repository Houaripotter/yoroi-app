/**
 * Scene animee de l'accueil (13 octobre 2026) : la video muette en boucle par dessus l'image fixe,
 * la musique et l'ambiance de la scene, le petit bouton son.
 * - La video (expo-video) a exactement le cadrage de l'image fixe (meme rapport 1200 x 670, memes imgW, imgH, shift) ;
 *   l'image reste dessous : elle se voit pendant le chargement et si la video echoue.
 * - Pause quand l'ecran n'est pas visible ou que l'app passe en arriere plan ; rien du tout si « Reduire les animations ».
 * - Le son est coupe par defaut (Reglages, Ta scene). Il se melange aux autres apps (jamais d'interruption de ta musique
 *   ou de ton podcast), respecte le bouton silencieux de l'iPhone, s'arrete en arriere plan, hors de l'accueil
 *   (donc pendant un chrono ou une seance) et pendant la visite guidee. Fondu d'une seconde a l'entree et a la sortie.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { SceneId } from '@/lib/v2/espace';
import { sceneAnimee } from '@/lib/v2/espace/scenesAnimees';
import { sonsDeLaScene, useReglagesSon } from '@/lib/v2/espace/sonScene';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { Press } from './kit';

/** « Reduire les animations » du telephone (suit le reglage en direct) */
export function useReduireAnimations(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    let vivant = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (vivant) setV(!!r);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (r) => setV(!!r));
    return () => {
      vivant = false;
      sub?.remove?.();
    };
  }, []);
  return v;
}

/** L'ecran est au premier plan : focalise et app active */
export function useEcranVisible(): { visible: boolean; appActive: boolean } {
  const [focus, setFocus] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active' || AppState.currentState == null);
  useFocusEffect(
    useCallback(() => {
      setFocus(true);
      return () => setFocus(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return { visible: focus && appActive, appActive };
}

/** La video de la scene, si elle existe et que l'animation est permise (sinon null : l'image fixe suffit) */
export function useVideoDeScene(scene: SceneId): number | null {
  const [reglages] = useReglagesSon();
  const reduire = useReduireAnimations();
  const a = sceneAnimee(scene);
  if (!a || !reglages.anime || reduire) return null;
  return a.video;
}

/** Calque video, aux memes style et position que l'image fixe */
export function VideoScene({ source, joue, style }: { source: number; joue: boolean; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.audioMixingMode = 'mixWithOthers';
    } catch {
      // ancienne version : sans effet, la video est muette
    }
  });
  const [echec, setEchec] = useState(false);
  const opacite = useSharedValue(0);

  useEffect(() => {
    setEchec(false);
    opacite.value = 0;
    const montrer = () => {
      opacite.value = withTiming(1, { duration: 280 });
    };
    if (player.status === 'readyToPlay') montrer();
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') montrer();
      if (status === 'error') setEchec(true);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  useEffect(() => {
    try {
      if (joue) player.play();
      else player.pause();
    } catch {
      // lecteur deja libere
    }
  }, [player, joue]);

  const anim = useAnimatedStyle(() => ({ opacity: opacite.value }));
  if (echec) return null;
  return (
    <Animated.View pointerEvents="none" style={[style, anim]}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
    </Animated.View>
  );
}

// ── Le son ────────────────────────────────────────────────────────────────

let lecteursActifs = 0;
let modeMixage = false;
function modeSon(actif: boolean) {
  lecteursActifs = Math.max(0, lecteursActifs + (actif ? 1 : -1));
  if (actif && !modeMixage) {
    modeMixage = true;
    // melange avec les autres apps, respecte le bouton silencieux, rien en arriere plan
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false }).catch(() => {});
  } else if (!actif && lecteursActifs === 0 && modeMixage) {
    modeMixage = false;
    // on rend le reglage habituel de l'app (celui des bips du chrono, lib/sounds.ts)
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: true }).catch(() => {});
  }
}

const FONDU_MS = 1000;
const PAS = 20;

function useLecteurDoux(source: number | null, joue: boolean, volume: number, immediat: boolean) {
  const player: AudioPlayer = useAudioPlayer(source ?? null);
  const enCours = useRef(false);
  useEffect(() => {
    try {
      player.loop = true;
    } catch {
      // rien
    }
  }, [player]);

  useEffect(() => {
    if (source == null) return;
    let k = 0;
    let t: ReturnType<typeof setInterval> | null = null;
    const regler = (v: number) => {
      try {
        player.volume = Math.max(0, Math.min(1, v));
      } catch {
        // lecteur libere
      }
    };
    if (joue) {
      if (!enCours.current) {
        enCours.current = true;
        modeSon(true);
        regler(0);
      }
      try {
        player.play();
      } catch {
        // rien
      }
      const depart = player.volume ?? 0;
      t = setInterval(() => {
        k += 1;
        regler(depart + ((volume - depart) * k) / PAS);
        if (k >= PAS && t) clearInterval(t);
      }, FONDU_MS / PAS);
    } else if (enCours.current) {
      const arreter = () => {
        try {
          player.pause();
        } catch {
          // rien
        }
        enCours.current = false;
        modeSon(false);
      };
      if (immediat) arreter();
      else {
        const depart = player.volume ?? volume;
        t = setInterval(() => {
          k += 1;
          regler(depart * (1 - k / PAS));
          if (k >= PAS) {
            if (t) clearInterval(t);
            arreter();
          }
        }, FONDU_MS / PAS);
      }
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [player, source, joue, volume, immediat]);

  // le lecteur change (autre son) ou l'accueil disparait : le compteur du mode audio reste juste
  useEffect(
    () => () => {
      if (enCours.current) {
        enCours.current = false;
        modeSon(false);
      }
    },
    [player],
  );
}

/** Joue la musique et l'ambiance choisies pour cette scene, seulement quand l'accueil est visible */
export function SonDeScene({ scene }: { scene: SceneId }) {
  const [reglages] = useReglagesSon();
  const { visible, appActive } = useEcranVisible();
  const visite = useVisiteEnCours();
  const { musique, ambiance } = sonsDeLaScene(scene, reglages);
  const joue = visible && !visite && !reglages.coupe;
  useLecteurDoux(musique?.source ?? null, joue && !!musique, reglages.volume, !appActive);
  useLecteurDoux(ambiance?.source ?? null, joue && !!ambiance, Math.min(1, reglages.volume * 1.3), !appActive);
  return null;
}

/** Petit bouton son discret sur la scene (en haut a droite), seulement si un son est choisi */
export function BoutonSon({ scene, sceneSombre }: { scene: SceneId; sceneSombre: boolean }) {
  const [reglages, setReglages] = useReglagesSon();
  const { musique, ambiance } = sonsDeLaScene(scene, reglages);
  if (!musique && !ambiance) return null;
  const coupe = reglages.coupe;
  const S = 24;
  const col = sceneSombre ? 'rgba(255,255,255,0.85)' : 'rgba(29,32,41,0.7)';
  return (
    <Press
      onPress={() => setReglages({ coupe: !coupe })}
      accessibilityRole="button"
      accessibilityLabel={coupe ? 'Remettre le son de la scène' : 'Couper le son de la scène'}
      hitSlop={(44 - S) / 2}
    >
      <View style={{ width: S, height: S, borderRadius: S / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: sceneSombre ? 'rgba(14,17,26,0.22)' : 'rgba(255,255,255,0.32)' }}>
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
          <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke={col} strokeWidth={2.2} strokeLinejoin="round" />
          {coupe ? (
            <Path d="M16 9.5l5 5M21 9.5l-5 5" stroke={col} strokeWidth={2.2} strokeLinecap="round" />
          ) : (
            <Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke={col} strokeWidth={2.2} strokeLinecap="round" />
          )}
        </Svg>
      </View>
    </Press>
  );
}
