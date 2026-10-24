/**
 * Animations d'exercices (24 octobre 2026) : cle d'un exercice et recherche de ses deux images.
 */
import type { ImageSourcePropType } from 'react-native';
import { DEMOS } from './demosArt';

/** « Développé Couché (Barre) » -> « developpe_couche_barre » */
export function demoSlug(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function demoDe(nom: string | undefined | null): [ImageSourcePropType, ImageSourcePropType] | null {
  if (!nom) return null;
  return DEMOS[demoSlug(nom)] ?? null;
}
