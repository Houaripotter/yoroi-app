/**
 * Ta scene recadree sur son motif (28 octobre 2026) : carte d'athlete du profil et mini carte des Reglages.
 */
import React from 'react';
import { Image } from 'react-native';
import { SCENE_FOCUS, SCENE_RATIO, sceneForNow } from '@/components/yoroi/v2/accueil/images';
import type { SceneId } from '@/lib/v2/espace';

/** L'image de la scene recadree sur son motif, pour une largeur et une hauteur donnees */
export function SceneImage({ scene, w, h }: { scene: SceneId; w: number; h: number }) {
  const now = new Date();
  const imgH = Math.max(h, w / SCENE_RATIO);
  const imgW = imgH * SCENE_RATIO;
  const focus = SCENE_FOCUS[scene] ?? 0.5;
  const shift = Math.max(0, Math.min(imgW - w, focus * imgW - w * 0.5));
  // le motif un peu plus bas que le centre, comme la maquette (object-position 62 %)
  const dy = Math.max(0, Math.min(imgH - h, imgH * 0.62 - h * 0.62));
  return <Image source={sceneForNow(scene, now)} style={{ position: 'absolute', top: -dy, left: -shift, width: imgW, height: imgH }} resizeMode="cover" accessibilityIgnoresInvertColors />;
}

