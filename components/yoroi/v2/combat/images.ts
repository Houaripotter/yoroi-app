/**
 * Illustrations de l'espace Combat (require statiques pour Metro).
 */
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { getProfile } from '@/lib/database';

const IMG = {
  jjb: {
    h: [require('@/assets/avatars/app/sports/jjb/jjb_h_1.webp'), require('@/assets/avatars/app/sports/jjb/jjb_h_2.webp'), require('@/assets/avatars/app/sports/jjb/jjb_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/jjb/jjb_f_1.webp'), require('@/assets/avatars/app/sports/jjb/jjb_f_2.webp'), require('@/assets/avatars/app/sports/jjb/jjb_f_3.webp')],
  },
  mma: {
    h: [require('@/assets/avatars/app/sports/mma/mma_h_1.webp'), require('@/assets/avatars/app/sports/mma/mma_h_2.webp'), require('@/assets/avatars/app/sports/mma/mma_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/mma/mma_f_1.webp'), require('@/assets/avatars/app/sports/mma/mma_f_2.webp'), require('@/assets/avatars/app/sports/mma/mma_f_3.webp')],
  },
  boxe: {
    h: [require('@/assets/avatars/app/sports/boxe/boxe_h_1.webp'), require('@/assets/avatars/app/sports/boxe/boxe_h_2.webp'), require('@/assets/avatars/app/sports/boxe/boxe_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/boxe/boxe_f_1.webp'), require('@/assets/avatars/app/sports/boxe/boxe_f_2.webp'), require('@/assets/avatars/app/sports/boxe/boxe_f_3.webp')],
  },
} as const;

export type CombatArt = keyof typeof IMG;

export const SCENE_DOJO: ImageSourcePropType = require('@/assets/avatars/app/themes/theme_dojo.webp');

/** Illustration de combattant adaptee au profil (homme ou femme) */
export function useCombatArt(kind: CombatArt, level: 1 | 2 | 3 = 2): ImageSourcePropType {
  const [g, setG] = useState<'h' | 'f'>('h');
  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => {
        if (alive && p?.avatar_gender === 'femme') setG('f');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return IMG[kind][g][level - 1];
}
