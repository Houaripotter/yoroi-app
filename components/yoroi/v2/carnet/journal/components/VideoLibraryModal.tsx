/**
 * Bibliotheque de videos de mouvements (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/VideoLibrarySheet.tsx.
 */
import React from 'react';
import { VideoLibrarySheet } from '@/components/yoroi/v2/carnet/VideoLibrarySheet';
import type { VideoContext } from '@/components/yoroi/v2/carnet/VideoLibrarySheet';

export { VideoLibrarySheet };

export default function VideoLibraryModal(props: VideoContext & { visible?: boolean; onClose?: () => void }) {
  return <VideoLibrarySheet {...props} visible={props.visible ?? false} onClose={props.onClose ?? (() => {})} />;
}
