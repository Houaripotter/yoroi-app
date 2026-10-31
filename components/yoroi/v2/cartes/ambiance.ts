/**
 * 31 octobre 2026 (cartes de partage v2) : les photos d'ambiance generees avec Gemini (sans logo ni texte),
 * optimisees en webp (1080 de large). Elles servent seulement au mode demo et aux apercus du carrousel
 * quand tu n'as pas choisi de photo : jamais sur une carte enregistree ou partagee.
 */
import type { ImageSourcePropType } from 'react-native';
import type { DirectionId, Famille } from '@/lib/v2/cartes/types';

export const AMBIANCE = {
  rue: require('@/assets/cartes/ambiance/course_rue_aube.webp') as ImageSourcePropType,
  piste: require('@/assets/cartes/ambiance/course_piste.webp') as ImageSourcePropType,
  salle: require('@/assets/cartes/ambiance/muscu_salle_barre.webp') as ImageSourcePropType,
  selfie: require('@/assets/cartes/ambiance/muscu_selfie_miroir.webp') as ImageSourcePropType,
  tatami: require('@/assets/cartes/ambiance/jjb_tatami.webp') as ImageSourcePropType,
  mains: require('@/assets/cartes/ambiance/mains_bandees.webp') as ImageSourcePropType,
};
export type AmbianceId = keyof typeof AMBIANCE;

/** La photo de chaque direction, par sport, comme sur les planches */
const PAR_DIRECTION: Partial<Record<DirectionId, { course: AmbianceId; muscu: AmbianceId; combat: AmbianceId }>> = {
  net: { course: 'rue', muscu: 'selfie', combat: 'tatami' },
  chrome: { course: 'piste', muscu: 'salle', combat: 'tatami' },
  stickers: { course: 'rue', muscu: 'selfie', combat: 'tatami' },
  holo: { course: 'piste', muscu: 'salle', combat: 'tatami' },
  flash: { course: 'rue', muscu: 'selfie', combat: 'tatami' },
  gala: { course: 'rue', muscu: 'mains', combat: 'mains' },
  serie: { course: 'piste', muscu: 'salle', combat: 'tatami' },
  tv: { course: 'rue', muscu: 'salle', combat: 'tatami' },
};

/** La photo d'ambiance d'une direction pour un sport ; null pour les directions sans photo (retro, maillot) */
export function ambiancePour(id: DirectionId, famille: Famille | null | undefined): ImageSourcePropType | null {
  const m = PAR_DIRECTION[id];
  if (!m) return null;
  const f = famille === 'course' ? 'course' : famille === 'combat' ? 'combat' : 'muscu';
  return AMBIANCE[m[f]];
}
