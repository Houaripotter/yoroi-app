/**
 * Collection des tampons YOROI (vague 28) : sceaux anciens a l'encre pressee, generes avec Gemini,
 * detoures et teintes (rouge vermillon pour les records et les victoires, or, argent et bronze
 * pour les medailles, indigo ailleurs). Aucune ecriture dans les motifs.
 * Require statiques pour le bundler. Sources PNG : assets/avatars/collection/tampons/.
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

export type TamponFamille = 'record' | 'victoire' | 'medaille' | 'objectif' | 'frein' | 'reserve';

export type TamponDef = { src: ImageSourcePropType; nom: string; motif: string; famille: TamponFamille; forme: 'rond' | 'carre' };

export const TAMPONS = {
  record: { src: require('@/assets/avatars/app/tampons/record.webp'), nom: traduire('Record'), motif: traduire('Carpe koï qui remonte la cascade'), famille: 'record', forme: 'rond' },
  record_force: { src: require('@/assets/avatars/app/tampons/record_force.webp'), nom: traduire('Record de force'), motif: 'Tigre rugissant', famille: 'record', forme: 'carre' },
  record_endurance: { src: require('@/assets/avatars/app/tampons/record_endurance.webp'), nom: 'Record d’endurance', motif: 'Grue en plein vol', famille: 'record', forme: 'carre' },
  record_combat: { src: require('@/assets/avatars/app/tampons/record_combat.webp'), nom: traduire('Record de combat'), motif: traduire('Katanas croisés'), famille: 'record', forme: 'carre' },
  record_technique: { src: require('@/assets/avatars/app/tampons/record_technique.webp'), nom: traduire('Record de technique'), motif: traduire('Éventail ouvert'), famille: 'record', forme: 'carre' },
  record_poids: { src: require('@/assets/avatars/app/tampons/record_poids.webp'), nom: traduire('Record de poids'), motif: 'Balance ancienne', famille: 'record', forme: 'carre' },
  victoire: { src: require('@/assets/avatars/app/tampons/victoire.webp'), nom: traduire('Victoire'), motif: traduire('Kabuto de samouraï'), famille: 'victoire', forme: 'rond' },
  medaille_or: { src: require('@/assets/avatars/app/tampons/medaille_or.webp'), nom: traduire('Médaille d’or'), motif: traduire('Dragon enroulé'), famille: 'medaille', forme: 'carre' },
  medaille_argent: { src: require('@/assets/avatars/app/tampons/medaille_argent.webp'), nom: traduire('Médaille d’argent'), motif: traduire('Pleine lune et branche de pin'), famille: 'medaille', forme: 'rond' },
  medaille_bronze: { src: require('@/assets/avatars/app/tampons/medaille_bronze.webp'), nom: traduire('Médaille de bronze'), motif: traduire('Pin sur son rocher'), famille: 'medaille', forme: 'rond' },
  objectif_perdre: { src: require('@/assets/avatars/app/tampons/objectif_perdre.webp'), nom: traduire('Perdre du poids'), motif: traduire('Balance de marchand'), famille: 'objectif', forme: 'carre' },
  objectif_muscle: { src: require('@/assets/avatars/app/tampons/objectif_muscle.webp'), nom: traduire('Prendre du muscle'), motif: traduire('Haltère gravé'), famille: 'objectif', forme: 'rond' },
  objectif_combat: { src: require('@/assets/avatars/app/tampons/objectif_combat.webp'), nom: traduire('Performer en combat'), motif: traduire('Gants de combat'), famille: 'objectif', forme: 'carre' },
  objectif_maintien: { src: require('@/assets/avatars/app/tampons/objectif_maintien.webp'), nom: 'Me maintenir', motif: traduire('Soleil et lune en équilibre'), famille: 'objectif', forme: 'rond' },
  frein_regularite: { src: require('@/assets/avatars/app/tampons/frein_regularite.webp'), nom: traduire('Pas régulier'), motif: traduire('Bambous qui poussent droit'), famille: 'frein', forme: 'carre' },
  frein_progres: { src: require('@/assets/avatars/app/tampons/frein_progres.webp'), nom: traduire('Progrès invisibles'), motif: traduire('Mont Fuji et son sentier'), famille: 'frein', forme: 'rond' },
  frein_motivation: { src: require('@/assets/avatars/app/tampons/frein_motivation.webp'), nom: 'Motivation', motif: traduire('Lanterne et sa flamme'), famille: 'frein', forme: 'rond' },
  frein_blessures: { src: require('@/assets/avatars/app/tampons/frein_blessures.webp'), nom: traduire('Blessures'), motif: traduire('Saule qui plie sans rompre'), famille: 'frein', forme: 'rond' },
  frein_programme: { src: require('@/assets/avatars/app/tampons/frein_programme.webp'), nom: traduire('Quoi faire'), motif: traduire('Torii et son chemin'), famille: 'frein', forme: 'carre' },
  frein_rien: { src: require('@/assets/avatars/app/tampons/frein_rien.webp'), nom: traduire('Rien de tout ça'), motif: traduire('Fleur de cerisier'), famille: 'frein', forme: 'carre' },
  vague: { src: require('@/assets/avatars/app/tampons/vague.webp'), nom: 'Vague', motif: 'Grande vague', famille: 'reserve', forme: 'rond' },
  gunbai: { src: require('@/assets/avatars/app/tampons/gunbai.webp'), nom: traduire('Éventail de commandant'), motif: traduire('Gunbai de chef de guerre'), famille: 'reserve', forme: 'carre' },
  toro: { src: require('@/assets/avatars/app/tampons/toro.webp'), nom: traduire('Lanterne de pierre'), motif: traduire('Lanterne de jardin en pierre'), famille: 'reserve', forme: 'rond' },
  lapin_lune: { src: require('@/assets/avatars/app/tampons/lapin_lune.webp'), nom: traduire('Lapin de lune'), motif: traduire('Lapin qui bondit sous la pleine lune'), famille: 'reserve', forme: 'rond' },
  erable: { src: require('@/assets/avatars/app/tampons/erable.webp'), nom: traduire('Érable'), motif: traduire('Deux feuilles d’érable'), famille: 'reserve', forme: 'carre' },
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
