/**
 * Illustrations de "Ton espace" : scenes, guerrier par rang, personnages des packs, sports.
 * Les require sont statiques (obligatoire pour le bundler).
 */
import type { ImageSourcePropType } from 'react-native';
import type { SceneId } from '@/lib/v2/espace';
import { SCENES_LANTERNES } from '@/lib/v2/espace/lanternes';
import { SCENES_SAMOURAI } from '@/lib/v2/espace/samourai';
import { SCENES_CLASSIQUE } from '@/lib/v2/espace/classique';
import { guerrierImage as dojoGuerrierImage, parsePersonnage, personnageImage as dojoPersonnageImage, personnageName as dojoPersonnageName } from '@/lib/v2/dojo/personnages';
import { traduire } from '@/lib/i18n/tr';

export type SceneMeta = { id: SceneId; nom: string; phrase: string; premium: boolean; image: ImageSourcePropType; nouveau?: boolean; annuel?: boolean };

export const SCENES: SceneMeta[] = [
  { id: 'dojo', nom: 'Dojo', phrase: traduire('Le parquet et la lumière du matin'), premium: false, image: require('@/assets/avatars/app/themes/theme_dojo.webp') },
  { id: 'bambous', nom: 'Bambouseraie', phrase: traduire('Le sentier sous les bambous'), premium: false, image: require('@/assets/avatars/app/monde/scenes/bambous.webp') },
  { id: 'village', nom: traduire('Village aux lanternes'), phrase: traduire('La rue du soir sous les lanternes'), premium: false, image: require('@/assets/avatars/app/monde/scenes/village.webp') },
  { id: 'jardin', nom: 'Jardin zen', phrase: traduire('Le sable ratissé devant le pavillon'), premium: false, image: require('@/assets/avatars/app/monde/scenes/jardin.webp') },
  { id: 'sommet', nom: traduire('Sommet des nuages'), phrase: traduire('Le torii au-dessus des nuages'), premium: true, annuel: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/sommet.webp') },
  { id: 'machiya_aube', nom: traduire('Ruelle à l’aube'), phrase: traduire('La brume sur les pavés'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/machiya_aube.webp') },
  { id: 'machiya_couchant', nom: traduire('Ruelle au couchant'), phrase: traduire('Le soir sur la pagode'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/machiya_couchant.webp') },
  { id: 'machiya_nuit', nom: traduire('Ruelle de nuit'), phrase: traduire('Les lanternes allumées'), premium: false, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/machiya_nuit.webp') },
  // vague 40 : le pack Lanternes de nuit, juste apres la Ruelle de nuit
  ...SCENES_LANTERNES.map((s): SceneMeta => ({ id: s.id, nom: s.nom, phrase: s.phrase, premium: true, nouveau: true, image: s.image })),
  // vague 44 : le pack Samourai (la Salle d'armes est offerte)
  ...SCENES_SAMOURAI.map((s): SceneMeta => ({ id: s.id, nom: s.nom, phrase: s.phrase, premium: !s.offerte, nouveau: true, image: s.image })),
  // vague 45 : le pack Classique, scenes neutres (salle de sport et parc de jour offerts)
  ...SCENES_CLASSIQUE.map((s): SceneMeta => ({ id: s.id, nom: s.nom, phrase: s.phrase, premium: !s.offerte, nouveau: true, image: s.image })),
  { id: 'kyudojo', nom: traduire('Tir à l’arc'), phrase: traduire('Les arcs, l’automne'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/kyudojo.webp') },
  { id: 'onsen', nom: 'Source chaude', phrase: traduire('Vapeur et neige'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/onsen.webp') },
  { id: 'rizieres', nom: traduire('Rizières à l’aube'), phrase: traduire('L’eau au lever du jour'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/rizieres.webp') },
  { id: 'cascade', nom: traduire('Cascade sacrée'), phrase: traduire('Le torii et la chute'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/cascade.webp') },
  { id: 'festival', nom: traduire('Fête des lanternes'), phrase: traduire('Lanternes sur l’eau'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/festival.webp') },
  { id: 'pavillon', nom: 'Pavillon d’or', phrase: traduire('Le reflet sous la lune'), premium: true, nouveau: true, image: require('@/assets/avatars/app/monde/scenes/pavillon.webp') },
  { id: 'pont', nom: traduire('Pont des cerisiers'), phrase: traduire('Le pont laqué rouge sur l’étang'), premium: true, image: require('@/assets/avatars/app/monde/scenes/pont.webp') },
  { id: 'chateau', nom: traduire('Château'), phrase: traduire('Les douves et les cerisiers'), premium: true, image: require('@/assets/avatars/app/monde/scenes/chateau.webp') },
  { id: 'temple', nom: 'Temple', phrase: traduire('Le sanctuaire dans les nuages'), premium: true, image: require('@/assets/avatars/app/monde/scenes/temple.webp') },
  { id: 'remparts', nom: traduire('Remparts sous la neige'), phrase: traduire('Le château blanc dans la nuit d’hiver'), premium: true, image: require('@/assets/avatars/app/monde/scenes/remparts.webp') },
  { id: 'pagode', nom: 'Pagode d’automne', phrase: traduire('Les érables rouges autour de la pagode'), premium: true, image: require('@/assets/avatars/app/monde/scenes/pagode.webp') },
  { id: 'montagne', nom: traduire('Sanctuaire de montagne'), phrase: traduire('Le torii au lever du soleil'), premium: true, image: require('@/assets/avatars/app/monde/scenes/montagne.webp') },
  { id: 'plage', nom: traduire('Torii de la mer'), phrase: traduire('Le grand torii dans les vagues'), premium: true, image: require('@/assets/avatars/app/monde/scenes/plage.webp') },
  { id: 'salle', nom: 'Salle d’honneur', phrase: traduire('Les paravents d’or et le tatami'), premium: true, image: require('@/assets/avatars/app/monde/scenes/salle.webp') },
  { id: 'forge', nom: traduire('Forge du sabre'), phrase: traduire('Le feu où naissent les lames'), premium: true, image: require('@/assets/avatars/app/monde/scenes/forge.webp') },
  { id: 'camp', nom: traduire('Camp de guerre'), phrase: traduire('Les tentes et le feu de veille'), premium: true, image: require('@/assets/avatars/app/monde/scenes/camp.webp') },
  { id: 'port', nom: 'Port d’hiver', phrase: traduire('Les barques sous la neige'), premium: true, image: require('@/assets/avatars/app/monde/scenes/port.webp') },
  { id: 'bataille', nom: traduire('Champ de bataille'), phrase: traduire('Les bannières au couchant'), premium: true, image: require('@/assets/avatars/app/monde/scenes/bataille.webp') },
  { id: 'nuit', nom: traduire('Nuit'), phrase: traduire('Les lanternes sous la lune'), premium: true, image: require('@/assets/avatars/app/themes/theme_nuit.webp') },
  { id: 'sakura', nom: 'Sakura', phrase: traduire('Les cerisiers en fleurs'), premium: true, image: require('@/assets/avatars/app/themes/theme_sakura.webp') },
  { id: 'matcha', nom: 'Matcha', phrase: traduire('Le jardin de thé'), premium: true, image: require('@/assets/avatars/app/themes/theme_matcha.webp') },
];

export function sceneMeta(id: SceneId | string | undefined): SceneMeta {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}
export const RANK_NAMES = ['Ashigaru', 'Bushi', traduire('Samouraï'), 'Rōnin', 'Shōgun'];
export type PackMeta = { id: string; nom: string; kanji: string; images: ImageSourcePropType[] };

export const PACKS: PackMeta[] = [
  { id: 'kunoichi', nom: 'Kunoichi', kanji: 'くノ一', images: [require('@/assets/avatars/app/packs/kunoichi/kunoichi_1.webp'), require('@/assets/avatars/app/packs/kunoichi/kunoichi_2.webp'), require('@/assets/avatars/app/packs/kunoichi/kunoichi_3.webp')] },
  { id: 'oni', nom: 'Oni', kanji: '鬼', images: [require('@/assets/avatars/app/packs/oni/oni_1.webp'), require('@/assets/avatars/app/packs/oni/oni_2.webp'), require('@/assets/avatars/app/packs/oni/oni_3.webp')] },
  { id: 'moine', nom: traduire('Moine de la montagne'), kanji: '僧兵', images: [require('@/assets/avatars/app/packs/moine/moine_1.webp'), require('@/assets/avatars/app/packs/moine/moine_2.webp'), require('@/assets/avatars/app/packs/moine/moine_3.webp')] },
  { id: 'kitsune', nom: 'Kitsune', kanji: '狐', images: [require('@/assets/avatars/app/packs/kitsune/kitsune_1.webp'), require('@/assets/avatars/app/packs/kitsune/kitsune_2.webp'), require('@/assets/avatars/app/packs/kitsune/kitsune_3.webp')] },
  { id: 'dragon', nom: 'Dragon d’or', kanji: '龍', images: [require('@/assets/avatars/app/packs/dragon/dragon_1.webp'), require('@/assets/avatars/app/packs/dragon/dragon_2.webp'), require('@/assets/avatars/app/packs/dragon/dragon_3.webp')] },
];

export type SportIllu = { id: string; nom: string; h: ImageSourcePropType; f: ImageSourcePropType };

/** Sports illustres : id de lib/sports.ts vers l'illustration de niveau 1 */
export const SPORT_ILLUS: SportIllu[] = [
  { id: 'musculation', nom: 'Musculation', h: require('@/assets/avatars/app/sports/musculation/musculation_h_1.webp'), f: require('@/assets/avatars/app/sports/musculation/musculation_f_1.webp') },
  { id: 'fitness', nom: 'Fitness', h: require('@/assets/avatars/app/sports/fitness/fitness_h_1.webp'), f: require('@/assets/avatars/app/sports/fitness/fitness_f_1.webp') },
  { id: 'running', nom: 'Course', h: require('@/assets/avatars/app/sports/course/course_h_1.webp'), f: require('@/assets/avatars/app/sports/course/course_f_1.webp') },
  { id: 'boxe', nom: 'Boxe', h: require('@/assets/avatars/app/sports/boxe/boxe_h_1.webp'), f: require('@/assets/avatars/app/sports/boxe/boxe_f_1.webp') },
  { id: 'jjb', nom: 'JJB', h: require('@/assets/avatars/app/sports/jjb/jjb_h_1.webp'), f: require('@/assets/avatars/app/sports/jjb/jjb_f_1.webp') },
  { id: 'mma', nom: 'MMA', h: require('@/assets/avatars/app/sports/mma/mma_h_1.webp'), f: require('@/assets/avatars/app/sports/mma/mma_f_1.webp') },
  { id: 'yoga', nom: 'Yoga', h: require('@/assets/avatars/app/sports/yoga/yoga_h_1.webp'), f: require('@/assets/avatars/app/sports/yoga/yoga_f_1.webp') },
  { id: 'crossfit', nom: 'Cross training', h: require('@/assets/avatars/app/sports/crosstraining/crosstraining_h_1.webp'), f: require('@/assets/avatars/app/sports/crosstraining/crosstraining_f_1.webp') },
];

export function isPack(personnage: string): boolean {
  return PACKS.some((p) => p.id === personnage);
}

export function genreOf(personnage: string): 'h' | 'f' {
  return personnage === 'guerrier_f' ? 'f' : 'h';
}

/** Niveau du pack (1 a 3) selon le rang (0 a 4) */
export function packLevel(rankIndex: number): number {
  return Math.min(3, 1 + Math.floor((Math.max(0, rankIndex) * 3) / 5));
}

/** Guerrier par rang, avec la silhouette choisie dans Apparence (meme regle partout, vague 26) */
export function guerrierImage(genre: 'h' | 'f', rankIndex: number): ImageSourcePropType {
  return dojoGuerrierImage(genre === 'f' ? 'f' : 'h', rankIndex);
}

export function guerrierSerie(genre: 'h' | 'f'): ImageSourcePropType[] {
  return [0, 1, 2, 3, 4].map((i) => guerrierImage(genre, i));
}

/** Image du personnage choisi, a son niveau actuel */
export function personnageImage(personnage: string, rankIndex: number, fallbackGenre: 'h' | 'f' = 'h'): ImageSourcePropType {
  const pack = PACKS.find((p) => p.id === personnage);
  if (pack) return pack.images[packLevel(rankIndex) - 1];
  if (personnage === 'guerrier_f') return guerrierImage('f', rankIndex);
  if (personnage === 'guerrier_h') return guerrierImage('h', rankIndex);
  // packs sport, personnages du monde (ex. 'boxe_f', 'ninja_h'), Classique et « Sans personnage » (vague 45)
  if (parsePersonnage(personnage).kind !== 'guerrier') return dojoPersonnageImage(personnage, rankIndex);
  return guerrierImage(fallbackGenre, rankIndex);
}

export function personnageNom(personnage: string): string {
  const pack = PACKS.find((p) => p.id === personnage);
  if (pack) return pack.nom;
  if (parsePersonnage(personnage).kind !== 'guerrier') return dojoPersonnageName(personnage);
  return personnage === 'guerrier_f' ? traduire('Guerrière') : 'Guerrier';
}
