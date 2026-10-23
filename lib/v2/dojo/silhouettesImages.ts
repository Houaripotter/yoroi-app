/**
 * Illustrations du Guerrier et de la Guerriere par silhouette (vague 26), meme armure et meme pose que le rang.
 * Genere par le script de la vague 26 : une case null retombe sur le dessin classique du rang.
 * Equilibree = le dessin classique (assets/avatars/app/guerrier/).
 */
import type { ImageSourcePropType } from 'react-native';
import type { SilhouetteId } from '@/lib/v2/silhouette';

type Serie = (ImageSourcePropType | null)[];

export const GUERRIER_SILHOUETTES: Record<'h' | 'f', Partial<Record<SilhouetteId, Serie>>> = {
  h: {
    elancee: [
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_1_ashigaru_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_2_bushi_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_3_samourai_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_4_ronin_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_5_shogun_elancee.webp'),
    ],
    athletique: [
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_1_ashigaru_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_2_bushi_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_3_samourai_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_4_ronin_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_5_shogun_athletique.webp'),
    ],
    robuste: [
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_1_ashigaru_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_2_bushi_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_3_samourai_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_4_ronin_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_h_5_shogun_robuste.webp'),
    ],
  },
  f: {
    elancee: [
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_1_ashigaru_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_2_bushi_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_3_samourai_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_4_ronin_elancee.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_5_shogun_elancee.webp'),
    ],
    athletique: [
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_1_ashigaru_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_2_bushi_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_3_samourai_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_4_ronin_athletique.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_5_shogun_athletique.webp'),
    ],
    robuste: [
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_1_ashigaru_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_2_bushi_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_3_samourai_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_4_ronin_robuste.webp'),
      require('@/assets/avatars/app/guerrier/silhouettes/guerrier_f_5_shogun_robuste.webp'),
    ],
  },
};
