/**
 * Lecture d'une video du carnet (vague 16), plein ecran, avec son titre et son rangement.
 * Les videos du telephone sont lues dans YOROI (expo-video) ; un lien s'ouvre dans son application.
 */
import React from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ink } from '@/components/yoroi/v2/Ink';
import { placeOf } from '@/lib/v2/carnet/videos';
import type { CarnetVideo } from '@/lib/v2/carnet/videos';
import { P, IconBtn } from '../ui';

function Player({ v, onClose }: { v: CarnetVideo; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer({ uri: v.uri }, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={{ flex: 1, backgroundColor: '#0E1016' }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls allowsPictureInPicture fullscreenOptions={{ enable: true }} />
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBtn name="close" label="Fermer la vidéo" onPress={onClose} />
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(14,16,22,0.55)' }}>
          <Ink size={15} weight="extraBold" color={P.white} numberOfLines={2}>{v.title}</Ink>
          <Ink size={12} weight="bold" color="rgba(255,255,255,0.7)" numberOfLines={1}>{placeOf(v)}</Ink>
        </View>
      </View>
    </View>
  );
}

export function PlayerModal({ video, onClose }: { video: CarnetVideo | null; onClose: () => void }) {
  return (
    <Modal visible={!!video && !video.isUrl} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      {video && !video.isUrl ? <Player v={video} onClose={onClose} /> : null}
    </Modal>
  );
}

export default PlayerModal;
