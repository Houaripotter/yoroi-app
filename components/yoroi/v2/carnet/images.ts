/**
 * Illustrations du carnet : un seul endroit pour tous les require().
 * FICHIER GENERE par genCarnetImages.py (meme dossier) : ne le modifie pas a la main.
 * Quand une nouvelle image arrive dans assets/avatars/app/carnet/<id>.webp, relance :
 *   python3 components/yoroi/v2/carnet/genCarnetImages.py
 *
 * Ids avec leur illustration dediee : force, endurance, combat, records, techniques, videos, sparring, musculation, course, jjb, boxe, carnet_vide, partage_nuit, partage_aube, partage_dojo, partage_sakura
 * Ids encore en repli (0) : aucun
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

export type CarnetImageId =
  | 'force'
  | 'endurance'
  | 'combat'
  | 'records'
  | 'techniques'
  | 'videos'
  | 'sparring'
  | 'musculation'
  | 'course'
  | 'jjb'
  | 'boxe'
  | 'carnet_vide'
  | 'partage_nuit'
  | 'partage_aube'
  | 'partage_dojo'
  | 'partage_sakura';

const TABLE: Record<CarnetImageId, ImageSourcePropType> = {
  force: require('@/assets/avatars/app/carnet/force.webp'),
  endurance: require('@/assets/avatars/app/carnet/endurance.webp'),
  combat: require('@/assets/avatars/app/carnet/combat.webp'),
  records: require('@/assets/avatars/app/carnet/records.webp'),
  techniques: require('@/assets/avatars/app/carnet/techniques.webp'),
  videos: require('@/assets/avatars/app/carnet/videos.webp'),
  sparring: require('@/assets/avatars/app/carnet/sparring.webp'),
  musculation: require('@/assets/avatars/app/carnet/musculation.webp'),
  course: require('@/assets/avatars/app/carnet/course.webp'),
  jjb: require('@/assets/avatars/app/carnet/jjb.webp'),
  boxe: require('@/assets/avatars/app/carnet/boxe.webp'),
  carnet_vide: require('@/assets/avatars/app/carnet/carnet_vide.webp'),
  partage_nuit: require('@/assets/avatars/app/carnet/partage_nuit.webp'),
  partage_aube: require('@/assets/avatars/app/carnet/partage_aube.webp'),
  partage_dojo: require('@/assets/avatars/app/carnet/partage_dojo.webp'),
  partage_sakura: require('@/assets/avatars/app/carnet/partage_sakura.webp'),
};

/** vrai quand l illustration dediee est presente, faux quand c est un repli */
export const CARNET_IMAGE_DEDIEE: Record<CarnetImageId, boolean> = {
  force: true,
  endurance: true,
  combat: true,
  records: true,
  techniques: true,
  videos: true,
  sparring: true,
  musculation: true,
  course: true,
  jjb: true,
  boxe: true,
  carnet_vide: true,
  partage_nuit: true,
  partage_aube: true,
  partage_dojo: true,
  partage_sakura: true,
};

/** L illustration du carnet pour cet id (dediee si elle existe, sinon le repli) */
export function carnetImage(id: CarnetImageId): ImageSourcePropType {
  return TABLE[id];
}

/** Les illustrations de contenu (hors fonds de partage) */
export type CarnetIllus = Exclude<CarnetImageId, `partage_${string}`>;

/** Fonds illustres de la carte de partage d un record */
export type PartageFond = 'nuit' | 'aube' | 'dojo' | 'sakura';

export const PARTAGE_FONDS: Record<PartageFond, ImageSourcePropType> = {
  nuit: TABLE.partage_nuit,
  aube: TABLE.partage_aube,
  dojo: TABLE.partage_dojo,
  sakura: TABLE.partage_sakura,
};

export const PARTAGE_FONDS_LISTE: { key: PartageFond; label: string; dark: boolean }[] = [
  { key: 'nuit', label: traduire('Nuit'), dark: true },
  { key: 'aube', label: traduire('Aube'), dark: true },
  { key: 'dojo', label: traduire('Dojo'), dark: true },
  { key: 'sakura', label: 'Sakura', dark: false },
];
