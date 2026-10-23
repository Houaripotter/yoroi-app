/**
 * Collection des tampons YOROI (vague 28) : sceaux anciens a l'encre pressee, generes avec Gemini,
 * detoures et teintes (rouge vermillon pour les records et les victoires, or, argent et bronze
 * pour les medailles, indigo ailleurs). Aucune ecriture dans les motifs.
 * Require statiques pour le bundler. Sources PNG : assets/avatars/collection/tampons/.
 */
import type { ImageSourcePropType } from 'react-native';

export type TamponFamille = 'record' | 'victoire' | 'medaille' | 'objectif' | 'frein' | 'reserve';

export type TamponDef = { src: ImageSourcePropType; nom: string; motif: string; famille: TamponFamille; forme: 'rond' | 'carre' };

export const TAMPONS = {
  record: { src: require('@/assets/avatars/app/tampons/record.webp'), nom: 'Record', motif: 'Carpe koï qui remonte la cascade', famille: 'record', forme: 'rond' },
  record_force: { src: require('@/assets/avatars/app/tampons/record_force.webp'), nom: 'Record de force', motif: 'Tigre rugissant', famille: 'record', forme: 'carre' },
  record_endurance: { src: require('@/assets/avatars/app/tampons/record_endurance.webp'), nom: 'Record d’endurance', motif: 'Grue en plein vol', famille: 'record', forme: 'carre' },
  record_combat: { src: require('@/assets/avatars/app/tampons/record_combat.webp'), nom: 'Record de combat', motif: 'Katanas croisés', famille: 'record', forme: 'carre' },
  record_technique: { src: require('@/assets/avatars/app/tampons/record_technique.webp'), nom: 'Record de technique', motif: 'Éventail ouvert', famille: 'record', forme: 'carre' },
  record_poids: { src: require('@/assets/avatars/app/tampons/record_poids.webp'), nom: 'Record de poids', motif: 'Balance ancienne', famille: 'record', forme: 'carre' },
  victoire: { src: require('@/assets/avatars/app/tampons/victoire.webp'), nom: 'Victoire', motif: 'Kabuto de samouraï', famille: 'victoire', forme: 'rond' },
  medaille_or: { src: require('@/assets/avatars/app/tampons/medaille_or.webp'), nom: 'Médaille d’or', motif: 'Dragon enroulé', famille: 'medaille', forme: 'carre' },
  medaille_argent: { src: require('@/assets/avatars/app/tampons/medaille_argent.webp'), nom: 'Médaille d’argent', motif: 'Pleine lune et branche de pin', famille: 'medaille', forme: 'rond' },
  medaille_bronze: { src: require('@/assets/avatars/app/tampons/medaille_bronze.webp'), nom: 'Médaille de bronze', motif: 'Pin sur son rocher', famille: 'medaille', forme: 'rond' },
  objectif_perdre: { src: require('@/assets/avatars/app/tampons/objectif_perdre.webp'), nom: 'Perdre du poids', motif: 'Balance de marchand', famille: 'objectif', forme: 'carre' },
  objectif_muscle: { src: require('@/assets/avatars/app/tampons/objectif_muscle.webp'), nom: 'Prendre du muscle', motif: 'Haltère gravé', famille: 'objectif', forme: 'rond' },
  objectif_combat: { src: require('@/assets/avatars/app/tampons/objectif_combat.webp'), nom: 'Performer en combat', motif: 'Gants de combat', famille: 'objectif', forme: 'carre' },
  objectif_maintien: { src: require('@/assets/avatars/app/tampons/objectif_maintien.webp'), nom: 'Me maintenir', motif: 'Soleil et lune en équilibre', famille: 'objectif', forme: 'rond' },
  frein_regularite: { src: require('@/assets/avatars/app/tampons/frein_regularite.webp'), nom: 'Pas régulier', motif: 'Bambous qui poussent droit', famille: 'frein', forme: 'carre' },
  frein_progres: { src: require('@/assets/avatars/app/tampons/frein_progres.webp'), nom: 'Progrès invisibles', motif: 'Mont Fuji et son sentier', famille: 'frein', forme: 'rond' },
  frein_motivation: { src: require('@/assets/avatars/app/tampons/frein_motivation.webp'), nom: 'Motivation', motif: 'Lanterne et sa flamme', famille: 'frein', forme: 'rond' },
  frein_blessures: { src: require('@/assets/avatars/app/tampons/frein_blessures.webp'), nom: 'Blessures', motif: 'Saule qui plie sans rompre', famille: 'frein', forme: 'rond' },
  frein_programme: { src: require('@/assets/avatars/app/tampons/frein_programme.webp'), nom: 'Quoi faire', motif: 'Torii et son chemin', famille: 'frein', forme: 'carre' },
  frein_rien: { src: require('@/assets/avatars/app/tampons/frein_rien.webp'), nom: 'Rien de tout ça', motif: 'Fleur de cerisier', famille: 'frein', forme: 'carre' },
  vague: { src: require('@/assets/avatars/app/tampons/vague.webp'), nom: 'Vague', motif: 'Grande vague', famille: 'reserve', forme: 'rond' },
  gunbai: { src: require('@/assets/avatars/app/tampons/gunbai.webp'), nom: 'Éventail de commandant', motif: 'Gunbai de chef de guerre', famille: 'reserve', forme: 'carre' },
  toro: { src: require('@/assets/avatars/app/tampons/toro.webp'), nom: 'Lanterne de pierre', motif: 'Lanterne de jardin en pierre', famille: 'reserve', forme: 'rond' },
  lapin_lune: { src: require('@/assets/avatars/app/tampons/lapin_lune.webp'), nom: 'Lapin de lune', motif: 'Lapin qui bondit sous la pleine lune', famille: 'reserve', forme: 'rond' },
  erable: { src: require('@/assets/avatars/app/tampons/erable.webp'), nom: 'Érable', motif: 'Deux feuilles d’érable', famille: 'reserve', forme: 'carre' },
} satisfies Record<string, TamponDef>;

export type TamponId = keyof typeof TAMPONS;

export const TAMPON_IDS = Object.keys(TAMPONS) as TamponId[];

/** Famille de record (carnet, progres) vers son tampon. Inconnu : le tampon de record general. */
export function tamponRecord(famille?: string | null): TamponId {
  const f = (famille ?? '').toLowerCase();
  if (/force|muscu|charge|1rm|poids_souleve/.test(f)) return 'record_force';
  if (/endurance|cardio|course|run|allure|distance|velo|natation|rameur/.test(f)) return 'record_endurance';
  if (/combat|soumission|round|sparring|match|competition/.test(f)) return 'record_combat';
  if (/technique|skill|drill|station|mobilite|souplesse/.test(f)) return 'record_technique';
  if (/pesee|poids_corps|corps|weight/.test(f)) return 'record_poids';
  return 'record';
}

/** Medaille de competition vers son tampon */
export function tamponMedaille(m?: string | null): TamponId | null {
  return m === 'or' ? 'medaille_or' : m === 'argent' ? 'medaille_argent' : m === 'bronze' ? 'medaille_bronze' : null;
}
