/**
 * « Tes vidéos » sur l'accueil (vague 16) : les dernieres videos du carnet en vignettes horizontales,
 * un appui pour lire, « Tout voir » vers les videos du carnet. Vide : une phrase et l'import.
 * Les videos sont Premium (comme l'onglet du carnet) : sans Premium, un apercu honnete et le lien vers l'offre.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Section } from '@/components/yoroi/v2/accueil/Sections';
import { useAccent } from '@/components/yoroi/v2/accueil/kit';
import { usePremium } from '@/context/PremiumContext';
import { VIDEOS_CHANGED_EVENT, listVideos } from '@/lib/v2/carnet/videos';
import type { CarnetVideo } from '@/lib/v2/carnet/videos';
import { P, Press, CIcon } from './ui';
import { Illus } from './nav';
import { VideoTile } from './videos/Thumb';
import { PlayerModal } from './videos/PlayerModal';
import { openVideo } from './VideosView';
import { blancA } from '@/components/yoroi/livePalette';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';

const ALL = '/training-journal?tab=videos';
const IMPORT = '/training-journal?tab=videos&add=1';

export function TesVideos() {
  const router = useRouter();
  const { accent } = useAccent();
  const [videos, setVideos] = useState<CarnetVideo[] | null>(null);
  const [playing, setPlaying] = useState<CarnetVideo | null>(null);
  const { isPremium } = usePremium();

  const load = useCallback(() => {
    listVideos()
      .then((v) => setVideos(v.slice(0, 8)))
      .catch(() => setVideos([]));
  }, []);

  useFocusEffect(load);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(VIDEOS_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  if (videos === null) return null;

  if (!isPremium) {
    return (
      <View style={{ gap: 10 }}>
        <Section title="Tes vidéos" />
        <Press onPress={() => ouvrirPaywall('videos')} accessibilityRole="button" accessibilityLabel="Tes vidéos, disponible avec Premium">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: '#EFE7D6', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }}>
            <Illus name="videos" size={76} />
            <View style={{ flex: 1, gap: 6 }}>
              <Ink size={14} weight="bold" color={P.ink}>Garde ici les vidéos qui t’inspirent : un exercice, une technique.</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CIcon name="lock" size={15} color={P.goldDark} />
                <Ink size={14} weight="extraBold" color={P.goldDark}>Disponible avec Premium</Ink>
              </View>
            </View>
          </View>
        </Press>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Section title="Tes vidéos" action={videos.length > 0 ? 'Tout voir' : undefined} onAction={() => router.push(ALL as any)} />
      {videos.length === 0 ? (
        <Press onPress={() => router.push(IMPORT as any)} accessibilityRole="button" accessibilityLabel="Importer une vidéo">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: '#EFE7D6', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }}>
            <Illus name="videos" size={76} />
            <View style={{ flex: 1, gap: 6 }}>
              <Ink size={14} weight="bold" color={P.ink}>Garde ici les vidéos qui t’inspirent : un exercice, une technique.</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CIcon name="plus" size={16} color={accent} width={2.8} />
                <Ink size={14} weight="extraBold" color={accent}>Importer une vidéo</Ink>
              </View>
            </View>
          </View>
        </Press>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}>
          {videos.map((v) => (
            <VideoTile key={v.id} v={v} width={132} onPress={() => openVideo(v, setPlaying)} />
          ))}
          <Press onPress={() => router.push(IMPORT as any)} accessibilityRole="button" accessibilityLabel="Importer une vidéo">
            <View style={{ width: 112, height: Math.round(132 * 1.3), borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: accent, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: blancA(0.6) }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <CIcon name="plus" size={22} color={accent} width={2.8} />
              </View>
              <Ink size={13} weight="extraBold" color={accent} style={{ textAlign: 'center' }}>Importer</Ink>
            </View>
          </Press>
        </ScrollView>
      )}
      <PlayerModal video={playing} onClose={() => setPlaying(null)} />
    </View>
  );
}

export default TesVideos;
