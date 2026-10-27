/**
 * Medias des scenes animees du pack Voyages (19 octobre 2026) : les videos en boucle (muettes, meme
 * cadrage 1200 x 670 que l'image fixe) et les images detourees des calques mobiles.
 * Les reglages (ce qui bouge, comment) sont dans lib/v2/scenes/animations.ts (MOUVEMENT_SCENE).
 * Sources, scripts de detourage et planche de controle : _propositions/scenes_2026-10-18/animees_v2/.
 */
import type { SceneAnimeeId } from './animations';

/**
 * La video en boucle de chaque scene qui en a une (Veo, 19 octobre 2026, 8 s, 1200 x 670, sans son).
 * sc07 refaite le 19 octobre (l'aile penche puis revient) ; l'ancienne est dans
 * _archive_ancien_design_2026-10-09/scenes_animees_v3/. Brut et controle : _propositions/scenes_2026-10-18/videos_v3/.
 * sc05 (train) et sc08 (balancoire) ajoutees le 19 octobre : boucles de 6 s. sc04 (tramway) : Gemini a refuse
 * la video, la scene garde ses calques.
 */
export const VIDEOS_SCENES: Partial<Record<SceneAnimeeId, number>> = {
  moto_tour_eiffel: require('@/assets/avatars/app/scenes_voyages/video/sc02.mp4'),
  aile_avion: require('@/assets/avatars/app/scenes_voyages/video/sc07.mp4'),
  balancoire_plage: require('@/assets/avatars/app/scenes_voyages/video/sc08.mp4'),
  toit_train: require('@/assets/avatars/app/scenes_voyages/video/sc05.mp4'),
  passage_niveau_mer: require('@/assets/avatars/app/scenes_voyages/video/sc04.mp4'),
  // 27 octobre 2026 : scenes de Marseille (Veo dans Gemini, boucle de 8 s avec fondu de 1 s, 1200 x 670, sans son).
  // L'image fixe (sc13...) est la premiere image de la video. Brut et controle : _propositions/scenes_marseille_2026-10-27/.
  calanque_couchant: require('@/assets/avatars/app/scenes_voyages/video/sc13.mp4'),
  // sc16 : la video de Veo enchaine sur une autre scene apres 7 s, la boucle (5 s) est prise avant
  corniche_moto: require('@/assets/avatars/app/scenes_voyages/video/sc16.mp4'),
};


/** Les images detourees des calques mobiles (fond transparent) */
export const IMAGES_CALQUES: Record<string, number> = {
  sc01_fond_g: require('@/assets/avatars/app/scenes_voyages/calques/sc01_fond_g.webp'),
  sc01_fond_d: require('@/assets/avatars/app/scenes_voyages/calques/sc01_fond_d.webp'),
  sc01_lanterne_g: require('@/assets/avatars/app/scenes_voyages/calques/sc01_lanterne_g.webp'),
  sc01_lanterne_d: require('@/assets/avatars/app/scenes_voyages/calques/sc01_lanterne_d.webp'),
  sc02_bateau: require('@/assets/avatars/app/scenes_voyages/calques/sc02_bateau.webp'),
  sc03_fond: require('@/assets/avatars/app/scenes_voyages/calques/sc03_fond.webp'),
  sc03_passant: require('@/assets/avatars/app/scenes_voyages/calques/sc03_passant.webp'),
  sc03_enseigne_eteinte: require('@/assets/avatars/app/scenes_voyages/calques/sc03_enseigne_eteinte.webp'),
  sc04_feux_g: require('@/assets/avatars/app/scenes_voyages/calques/sc04_feux_g.webp'),
  sc04_feux_d: require('@/assets/avatars/app/scenes_voyages/calques/sc04_feux_d.webp'),
  sc04_reflet: require('@/assets/avatars/app/scenes_voyages/calques/sc04_reflet.webp'),
  sc05_fond: require('@/assets/avatars/app/scenes_voyages/calques/sc05_fond.webp'),
  sc05_poteau: require('@/assets/avatars/app/scenes_voyages/calques/sc05_poteau.webp'),
  sc06_nuages: require('@/assets/avatars/app/scenes_voyages/calques/sc06_nuages.webp'),
  sc06_premier_plan: require('@/assets/avatars/app/scenes_voyages/calques/sc06_premier_plan.webp'),
  sc08_fond: require('@/assets/avatars/app/scenes_voyages/calques/sc08_fond.webp'),
  sc08_balancoire: require('@/assets/avatars/app/scenes_voyages/calques/sc08_balancoire.webp'),
  sc09_fond: require('@/assets/avatars/app/scenes_voyages/calques/sc09_fond.webp'),
  sc09_flamme: require('@/assets/avatars/app/scenes_voyages/calques/sc09_flamme.webp'),
  sc10_nuages: require('@/assets/avatars/app/scenes_voyages/calques/sc10_nuages.webp'),
  sc10_bord: require('@/assets/avatars/app/scenes_voyages/calques/sc10_bord.webp'),
  sc11_lampe_eteinte: require('@/assets/avatars/app/scenes_voyages/calques/sc11_lampe_eteinte.webp'),
  sc12_mer: require('@/assets/avatars/app/scenes_voyages/calques/sc12_mer.webp'),
  sc12_bord: require('@/assets/avatars/app/scenes_voyages/calques/sc12_bord.webp'),
  etoile_filante: require('@/assets/avatars/app/scenes_voyages/calques/etoile_filante.webp'),
};

export function videoDeScene(id: string | null | undefined): number | null {
  if (!id) return null;
  return VIDEOS_SCENES[id as SceneAnimeeId] ?? null;
}

export function imageCalque(cle: string): number | null {
  return IMAGES_CALQUES[cle] ?? null;
}
