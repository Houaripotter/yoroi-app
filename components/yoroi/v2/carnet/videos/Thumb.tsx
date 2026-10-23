/**
 * Vignette d'une video du carnet (vague 16) : l'image tiree de la video (expo-video), sinon
 * l'illustration de son rangement. Titre en entier sur deux lignes, duree, bouton lecture.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { createVideoPlayer } from 'expo-video';
import type { VideoThumbnail } from 'expo-video';
import { Ink } from '@/components/yoroi/v2/Ink';
import { durationLabel, kindOf, placeOf } from '@/lib/v2/carnet/videos';
import type { CarnetVideo } from '@/lib/v2/carnet/videos';
import type { CarnetIllus } from '../images';
import { Illus } from '../nav';
import { P, Press, CIcon } from '../ui';
import { blancA } from '@/components/yoroi/livePalette';

const cache = new Map<string, VideoThumbnail | null>();
let queue: Promise<void> = Promise.resolve();

/** Une image par video, generee une seule fois, l'une apres l'autre */
export function useThumb(v: CarnetVideo): VideoThumbnail | null {
  const [t, setT] = useState<VideoThumbnail | null>(cache.get(v.uri) ?? null);
  useEffect(() => {
    if (v.isUrl || cache.has(v.uri)) {
      setT(cache.get(v.uri) ?? null);
      return;
    }
    let alive = true;
    queue = queue.then(async () => {
      if (cache.has(v.uri)) return;
      let player: ReturnType<typeof createVideoPlayer> | null = null;
      try {
        player = createVideoPlayer({ uri: v.uri });
        player.muted = true;
        const res = await player.generateThumbnailsAsync([0.6], { maxWidth: 420 });
        cache.set(v.uri, res?.[0] ?? null);
      } catch {
        cache.set(v.uri, null);
      } finally {
        try {
          player?.release();
        } catch {
          // deja libere
        }
      }
      if (alive) setT(cache.get(v.uri) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [v.uri, v.isUrl]);
  return t;
}

export function illusForVideo(v: CarnetVideo): CarnetIllus {
  const k = kindOf(v);
  const s = (v.sport || '').toLowerCase();
  if (k === 'muscle') return 'musculation';
  if (['jjb', 'grappling', 'lutte', 'judo'].includes(s)) return 'jjb';
  if (['boxe', 'boxing', 'mma', 'muay_thai', 'kickboxing', 'karate', 'taekwondo'].includes(s)) return 'boxe';
  if (['running', 'trail', 'course'].includes(s)) return 'course';
  if (['musculation', 'fitness', 'crossfit', 'hyrox'].includes(s)) return 'musculation';
  return 'videos';
}

const TINTS: Record<string, string> = { musculation: '#E4E9F3', jjb: '#EEE1DF', boxe: '#EEE1DF', course: '#E3E6EE', videos: '#EFE7D6' };

/** Grande vignette verticale (accueil et videotheque) */
export function VideoTile({ v, width, onPress, onLongPress }: { v: CarnetVideo; width: number; onPress: () => void; onLongPress?: () => void }) {
  const thumb = useThumb(v);
  const height = Math.round(width * 1.3);
  const il = illusForVideo(v);
  const dur = durationLabel(v.durationSec);
  return (
    <Press onPress={onPress} onLongPress={onLongPress} delayLongPress={450} accessibilityRole="button" accessibilityLabel={`Lire ${v.title}, ${placeOf(v)}`} accessibilityHint={onLongPress ? 'Garde appuyé pour modifier ou supprimer' : undefined}>
      <View style={{ width, gap: 6 }}>
        <View style={{ width, height, borderRadius: 20, overflow: 'hidden', backgroundColor: TINTS[il] ?? '#EFE7D6', alignItems: 'center', justifyContent: 'center' }}>
          {thumb ? (
            <ExpoImage source={thumb} style={{ position: 'absolute', left: 0, top: 0, width, height }} contentFit="cover" />
          ) : (
            <Illus name={il} size={Math.round(width * 0.62)} style={{ marginBottom: 18 }} />
          )}
          <LinearGradient pointerEvents="none" colors={['rgba(29,32,41,0)', 'rgba(29,32,41,0.55)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.45 }} />
          <View style={{ position: 'absolute', left: 10, bottom: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: blancA(0.94), alignItems: 'center', justifyContent: 'center' }}>
            <CIcon name={v.isUrl ? 'link' : 'play'} size={v.isUrl ? 17 : 16} color={P.ink} />
          </View>
          {dur ? (
            <View style={{ position: 'absolute', right: 10, bottom: 14, paddingHorizontal: 7, minHeight: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(29,32,41,0.6)' }}>
              <Ink size={11} weight="extraBold" color={P.white}>{dur}</Ink>
            </View>
          ) : null}
        </View>
        <Ink size={14} weight="extraBold" numberOfLines={2}>{v.title}</Ink>
        <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>{placeOf(v)}</Ink>
      </View>
    </Press>
  );
}
