/**
 * Personnages de YOROI : le Guerrier gratuit, 6 personnages du monde samourai (gagnes avec
 * le rang, tous ouverts avec Premium), 8 packs sport et 5 legendes, et les packs Vie reelle (lib/v2/dojo/packsVie.ts).
 * 16 octobre 2026 : packs sport, legendes et Vie reelle ouverts avec Premium.
 * Cle du personnage actif (lib/v2/espace.ts, champ personnage) :
 *  'guerrier_h' | 'guerrier_f'  : le Guerrier, image selon le rang
 *  '<sport>_h' | '<sport>_f'    : pack sport (ex. 'boxe_f'), image selon le niveau de pratique dans ce sport
 *  '<legende>'                  : pack legende (ex. 'kunoichi'), image selon le rang
 *  '<monde>_h' | '<monde>_f'    : personnage du monde (ex. 'ninja_f'), une seule image
 *
 * Achats : produits non consommables RevenueCat, pas encore crees dans les stores.
 * Tant que PACKS_STORE_READY vaut false, aucun pack n'est vendu et l'ecran l'indique honnetement.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';
import type { SceneId } from '@/lib/v2/espace';
import { silhouetteCourante, type SilhouetteId } from '@/lib/v2/silhouette';
import { GUERRIER_SILHOUETTES } from './silhouettesImages';
import { LANTERNES_IDS, LANTERNES_IMAGES, SCENES_LANTERNES } from '@/lib/v2/espace/lanternes';
import { SAMOURAI_IDS, SAMOURAI_IMAGES, SCENES_SAMOURAI } from '@/lib/v2/espace/samourai';
import { SANS_PERSONNAGE } from './univers';
import { CLASSIQUE_SCENE_IDS, CLASSIQUE_SCENE_IMAGES, SCENES_CLASSIQUE } from '@/lib/v2/espace/classique';
import { NATURE_SCENE_IDS, NATURE_SCENE_IMAGES, SCENES_NATURE } from '@/lib/v2/espace/nature';
import { VOYAGE_SCENE_IDS, VOYAGE_SCENE_IMAGES, SCENES_VOYAGES } from '@/lib/v2/espace/voyages';
import { palierDeScene, sceneOuverteParRecompense } from '@/lib/v2/dojo/recompensesScenes';
import { SCENES_VIE, VIE_SCENE_IDS, VIE_SCENE_IMAGES } from '@/lib/v2/espace/packsScenes';
import { PACKS_VIE_PRETS } from './packsVie';
import { VARIANTES_TEINTE, imageTeinte, variantesDisponibles, type VarianteTeinte } from './packsTeintes';
import { imageTeinteLegende, variantesLegende } from './legendesTeintes';
import { traduire } from '@/lib/i18n/tr';

/** Passera a true quand les produits yoroi_pack_* et yoroi_collection existeront dans RevenueCat. */
export const PACKS_STORE_READY = false;

/** Packs possedes, ecrits par la future integration RevenueCat (liste d'ids). */
export const OWNED_PACKS_KEY = 'yoroi_packs_owned_v1';

export type Gender = 'h' | 'f';
/** 16 octobre 2026 : 'vie', les packs Vie reelle (lib/v2/dojo/packsVie.ts), un personnage homme et femme, ouverts avec Premium */
export type PackKind = 'sport' | 'legende' | 'monde' | 'vie';
export type Level = 1 | 2 | 3;

export type PackDef = {
  id: string;
  kind: PackKind;
  name: string;
  kanji: string;
  tagline: string;
  /** fond pastel de la carte */
  fond: string;
  /** ids de lib/sports.ts qui comptent pour ce pack (packs sport) */
  sports: string[];
  /** identifiant produit RevenueCat prevu */
  productId: string;
  images: { h: ImageSourcePropType[]; f: ImageSourcePropType[] };
  /** personnages du monde : nom et kanji selon le genre */
  names?: { h: string; f: string };
  kanjis?: { h: string; f: string };
  /** personnages du monde : rang (0 a 4) qui le debloque, Premium les ouvre tous */
  unlockRank?: number;
};

const G = {
  h: [
    require('@/assets/avatars/app/guerrier/guerrier_h_1_ashigaru.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_h_2_bushi.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_h_3_samourai.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_h_4_ronin.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_h_5_shogun.webp'),
  ],
  f: [
    require('@/assets/avatars/app/guerrier/guerrier_f_1_ashigaru.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_f_2_bushi.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_f_3_samourai.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_f_4_ronin.webp'),
    require('@/assets/avatars/app/guerrier/guerrier_f_5_shogun.webp'),
  ],
} as const;

export const GUERRIER_IMAGES: { h: ImageSourcePropType[]; f: ImageSourcePropType[] } = { h: [...G.h], f: [...G.f] };

/** Vague 45 : l'univers Classique, des sportifs d'aujourd'hui (homme et femme), une tenue par rang. */
export const CLASSIQUE_IMAGES: { h: ImageSourcePropType[]; f: ImageSourcePropType[] } = {
  h: [
    require('@/assets/avatars/app/classique/classique_h_1_debutant.webp'),
    require('@/assets/avatars/app/classique/classique_h_2_regulier.webp'),
    require('@/assets/avatars/app/classique/classique_h_3_confirme.webp'),
    require('@/assets/avatars/app/classique/classique_h_4_expert.webp'),
    require('@/assets/avatars/app/classique/classique_h_5_champion.webp'),
  ],
  f: [
    require('@/assets/avatars/app/classique/classique_f_1_debutant.webp'),
    require('@/assets/avatars/app/classique/classique_f_2_regulier.webp'),
    require('@/assets/avatars/app/classique/classique_f_3_confirme.webp'),
    require('@/assets/avatars/app/classique/classique_f_4_expert.webp'),
    require('@/assets/avatars/app/classique/classique_f_5_champion.webp'),
  ],
};

/** Silhouettes du personnage Classique, memes regles que celles du Guerrier (lib/v2/silhouette.ts) */
export const CLASSIQUE_SILHOUETTES: Record<'h' | 'f', Partial<Record<SilhouetteId, (ImageSourcePropType | null)[]>>> = {
  h: {
    elancee: [
      require('@/assets/avatars/app/classique/silhouettes/classique_h_1_debutant_elancee.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_2_regulier_elancee.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_3_confirme_elancee.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_4_expert_elancee.webp'),
      null /* a venir : classique_h_5_champion_elancee */,
    ],
    athletique: [
      require('@/assets/avatars/app/classique/silhouettes/classique_h_1_debutant_athletique.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_2_regulier_athletique.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_3_confirme_athletique.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_4_expert_athletique.webp'),
      null /* a venir : classique_h_5_champion_athletique */,
    ],
    robuste: [
      require('@/assets/avatars/app/classique/silhouettes/classique_h_1_debutant_robuste.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_2_regulier_robuste.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_3_confirme_robuste.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_h_4_expert_robuste.webp'),
      null /* a venir : classique_h_5_champion_robuste */,
    ],
  },
  f: {
    elancee: [
      require('@/assets/avatars/app/classique/silhouettes/classique_f_1_debutant_elancee.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_2_regulier_elancee.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_3_confirme_elancee.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_4_expert_elancee.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_5_champion_elancee.webp'),
    ],
    athletique: [
      require('@/assets/avatars/app/classique/silhouettes/classique_f_1_debutant_athletique.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_2_regulier_athletique.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_3_confirme_athletique.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_4_expert_athletique.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_5_champion_athletique.webp'),
    ],
    robuste: [
      require('@/assets/avatars/app/classique/silhouettes/classique_f_1_debutant_robuste.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_2_regulier_robuste.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_3_confirme_robuste.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_4_expert_robuste.webp'),
      require('@/assets/avatars/app/classique/silhouettes/classique_f_5_champion_robuste.webp'),
    ],
  },
};

/** Image vide (transparente) du choix « Sans personnage » : la scene reste seule partout */
export const IMAGE_SANS_PERSONNAGE: ImageSourcePropType = require('@/assets/avatars/app/classique/vide.webp');

export const THEME_IMAGES: Record<SceneId, ImageSourcePropType> = {
  dojo: require('@/assets/avatars/app/themes/theme_dojo.webp'),
  nuit: require('@/assets/avatars/app/themes/theme_nuit.webp'),
  sakura: require('@/assets/avatars/app/themes/theme_sakura.webp'),
  matcha: require('@/assets/avatars/app/themes/theme_matcha.webp'),
  chateau: require('@/assets/avatars/app/monde/scenes/chateau.webp'),
  bambous: require('@/assets/avatars/app/monde/scenes/bambous.webp'),
  temple: require('@/assets/avatars/app/monde/scenes/temple.webp'),
  bataille: require('@/assets/avatars/app/monde/scenes/bataille.webp'),
  port: require('@/assets/avatars/app/monde/scenes/port.webp'),
  village: require('@/assets/avatars/app/monde/scenes/village.webp'),
  pagode: require('@/assets/avatars/app/monde/scenes/pagode.webp'),
  pont: require('@/assets/avatars/app/monde/scenes/pont.webp'),
  jardin: require('@/assets/avatars/app/monde/scenes/jardin.webp'),
  forge: require('@/assets/avatars/app/monde/scenes/forge.webp'),
  salle: require('@/assets/avatars/app/monde/scenes/salle.webp'),
  remparts: require('@/assets/avatars/app/monde/scenes/remparts.webp'),
  montagne: require('@/assets/avatars/app/monde/scenes/montagne.webp'),
  plage: require('@/assets/avatars/app/monde/scenes/plage.webp'),
  camp: require('@/assets/avatars/app/monde/scenes/camp.webp'),
  machiya_aube: require('@/assets/avatars/app/monde/scenes/machiya_aube.webp'),
  machiya_couchant: require('@/assets/avatars/app/monde/scenes/machiya_couchant.webp'),
  machiya_nuit: require('@/assets/avatars/app/monde/scenes/machiya_nuit.webp'),
  kyudojo: require('@/assets/avatars/app/monde/scenes/kyudojo.webp'),
  onsen: require('@/assets/avatars/app/monde/scenes/onsen.webp'),
  rizieres: require('@/assets/avatars/app/monde/scenes/rizieres.webp'),
  cascade: require('@/assets/avatars/app/monde/scenes/cascade.webp'),
  festival: require('@/assets/avatars/app/monde/scenes/festival.webp'),
  pavillon: require('@/assets/avatars/app/monde/scenes/pavillon.webp'),
  sommet: require('@/assets/avatars/app/monde/scenes/sommet.webp'),
  // vague 40 : le pack Lanternes de nuit
  ...LANTERNES_IMAGES,
  ...SAMOURAI_IMAGES,
  // vague 45 : le pack Classique
  ...CLASSIQUE_SCENE_IMAGES,
  // 14 octobre 2026 : le pack Nature et ville
  ...NATURE_SCENE_IMAGES,
  // 16 octobre 2026 : les scenes des packs Vie reelle
  ...VIE_SCENE_IMAGES,
  // 18 octobre 2026 : le pack Voyages (scenes animees)
  ...VOYAGE_SCENE_IMAGES,
};

/** Scenes les plus recentes (badge Nouveau) : les neuf scenes de la vague 25 */
export const NEW_SCENES: SceneId[] = [...VOYAGE_SCENE_IDS, ...VIE_SCENE_IDS, ...NATURE_SCENE_IDS, ...CLASSIQUE_SCENE_IDS, ...SAMOURAI_IDS, ...LANTERNES_IDS, 'sommet', 'machiya_aube', 'machiya_couchant', 'machiya_nuit', 'kyudojo', 'onsen', 'rizieres', 'cascade', 'festival', 'pavillon'];

/**
 * Scenes. premium : reservee a Premium, sauf si unlockRank est atteint (le Pont au rang Bushi,
 * le Chateau au rang Samourai, le Temple au rang Ronin, les Remparts au rang Shogun ; vague 25 : la ruelle aux
 * lanternes a l'aube, au couchant et la nuit aux rangs Bushi, Samourai et Ronin, le tir a l'arc au rang Shogun) :
 * le rang reste une recompense pour les gratuits. Quatre scenes sont offertes a tous.
 * Les autres sont Premium, avec apercu libre dans la Boutique et les reglages.
 */
export const THEMES: { id: SceneId; name: string; premium: boolean; description: string; kanji: string; dark?: boolean; unlockRank?: number; annual?: boolean }[] = [
  { id: 'dojo', name: 'Dojo', premium: false, description: traduire('Le parquet et les sabres, offert'), kanji: '' },
  { id: 'bambous', name: 'Bambouseraie', premium: false, description: traduire('Le sentier sous les bambous, offert'), kanji: '' },
  { id: 'village', name: traduire('Village aux lanternes'), premium: false, description: traduire('La rue du soir sous les lanternes, offert'), kanji: '', dark: true },
  { id: 'jardin', name: 'Jardin zen', premium: false, description: traduire('Le sable ratissé devant le pavillon, offert'), kanji: '' },
  // vague 27 : scene exclusive, offerte avec l'abonnement annuel seulement (jamais par le rang)
  { id: 'sommet', name: traduire('Sommet des nuages'), premium: true, annual: true, description: traduire('Le torii au dessus de la mer de nuages, à l’aube'), kanji: '' },
  { id: 'machiya_aube', name: traduire('Ruelle à l’aube'), premium: true, description: traduire('La brume du matin sur les pavés'), kanji: '', unlockRank: 1 },
  { id: 'machiya_couchant', name: traduire('Ruelle au couchant'), premium: true, description: traduire('Le soleil couchant derrière la pagode'), kanji: '', dark: true, unlockRank: 2 },
  { id: 'machiya_nuit', name: traduire('Ruelle de nuit'), premium: false, description: traduire('Les maisons de bois sous la lune, offerte'), kanji: '', dark: true },
  // vague 40 : le pack Lanternes de nuit (Premium)
  ...SCENES_LANTERNES.map((s) => ({ id: s.id as SceneId, name: s.nom, premium: true, description: s.description, kanji: '', dark: true })),
  // vague 44 : le pack Samourai (Premium, la Salle d'armes offerte)
  ...SCENES_SAMOURAI.map((s) => ({ id: s.id as SceneId, name: s.nom, premium: !s.offerte, description: s.description, kanji: '', dark: s.sombre })),
  // vague 45 : le pack Classique (la salle de sport et le parc de jour offerts)
  ...SCENES_CLASSIQUE.map((s) => ({ id: s.id as SceneId, name: s.nom, premium: !s.offerte, description: s.description, kanji: '', dark: s.sombre })),
  // 14 octobre 2026 : le pack Nature et ville (Premium, meme regle que le pack Classique)
  ...SCENES_NATURE.map((s) => ({ id: s.id as SceneId, name: s.nom, premium: !s.offerte, description: s.description, kanji: '', dark: s.sombre })),
  // 16 octobre 2026 : les scenes des packs Vie reelle (Premium, meme regle que le pack Nature et ville)
  ...SCENES_VIE.map((s) => ({ id: s.id as SceneId, name: s.nom, premium: true, description: s.description, kanji: '', dark: s.sombre })),
  // 18 octobre 2026 : le pack Voyages (Premium ; trois scenes se gagnent avec la serie, lib/v2/dojo/recompensesScenes.ts)
  ...SCENES_VOYAGES.map((s) => ({ id: s.id as SceneId, name: s.nom, premium: true, description: s.description, kanji: '', dark: s.sombre })),
  { id: 'kyudojo', name: traduire('Tir à l’arc'), premium: true, description: traduire('Les arcs et les érables d’automne'), kanji: '', dark: true, unlockRank: 4 },
  { id: 'onsen', name: 'Source chaude', premium: true, description: traduire('La vapeur entre les sapins blancs'), kanji: '' },
  { id: 'rizieres', name: traduire('Rizières à l’aube'), premium: true, description: traduire('Les terrasses d’eau au lever du jour'), kanji: '' },
  { id: 'cascade', name: traduire('Cascade sacrée'), premium: true, description: traduire('Le torii au pied de la chute d’eau'), kanji: '', dark: true },
  { id: 'festival', name: traduire('Fête des lanternes'), premium: true, description: traduire('Les lanternes sur la rivière et le feu d’artifice'), kanji: '', dark: true },
  { id: 'pavillon', name: 'Pavillon d’or', premium: true, description: traduire('Le pavillon d’or et son reflet sous la lune'), kanji: '', dark: true },
  { id: 'pont', name: traduire('Pont des cerisiers'), premium: true, description: traduire('Le pont laqué rouge sur l’étang'), kanji: '', unlockRank: 1 },
  { id: 'chateau', name: traduire('Château'), premium: true, description: traduire('Les douves et les cerisiers'), kanji: '', unlockRank: 2 },
  { id: 'temple', name: 'Temple', premium: true, description: traduire('Le sanctuaire au dessus des nuages'), kanji: '', unlockRank: 3 },
  { id: 'remparts', name: traduire('Remparts sous la neige'), premium: true, description: traduire('Le château blanc dans la nuit d’hiver'), kanji: '', dark: true, unlockRank: 4 },
  { id: 'pagode', name: 'Pagode d’automne', premium: true, description: traduire('Les érables rouges autour de la pagode'), kanji: '' },
  { id: 'montagne', name: traduire('Sanctuaire de montagne'), premium: true, description: traduire('Le torii au lever du soleil'), kanji: '' },
  { id: 'plage', name: traduire('Torii de la mer'), premium: true, description: traduire('Le grand torii dans les vagues au couchant'), kanji: '', dark: true },
  { id: 'salle', name: 'Salle d’honneur', premium: true, description: traduire('Les paravents d’or et le tatami'), kanji: '', dark: true },
  { id: 'forge', name: traduire('Forge du sabre'), premium: true, description: traduire('Le feu où naissent les lames'), kanji: '', dark: true },
  { id: 'camp', name: traduire('Camp de guerre'), premium: true, description: traduire('Les tentes et le feu de veille'), kanji: '', dark: true },
  { id: 'port', name: 'Port d’hiver', premium: true, description: traduire('Les barques sous la neige'), kanji: '' },
  { id: 'bataille', name: traduire('Champ de bataille'), premium: true, description: traduire('Les bannières au soleil couchant'), kanji: '', dark: true },
  { id: 'nuit', name: traduire('Nuit'), premium: true, description: traduire('La lune sur le château'), kanji: '', dark: true },
  { id: 'sakura', name: 'Sakura', premium: true, description: traduire('Les cerisiers en fleur'), kanji: '' },
  { id: 'matcha', name: 'Matcha', premium: true, description: traduire('Le jardin de thé'), kanji: '' },
];

type ThemeDef = (typeof THEMES)[number];

/** Vrai si la scene peut etre choisie : offerte, Premium, ou rang atteint. */
export function isThemeUnlocked(t: ThemeDef, rankIndex: number, isPremium: boolean, isAnnual = false): boolean {
  // scene annuelle : seulement avec un abonnement annuel actif
  if (t.annual) return isAnnual;
  if (!t.premium || isPremium) return true;
  // 18 octobre 2026 : scene gagnee avec la serie de jours, ou en essai 24 h grace au grand coffre
  if (sceneOuverteParRecompense(t.id)) return true;
  return t.unlockRank !== undefined && rankIndex >= t.unlockRank;
}

/** Condition d'une scene, en clair (null si elle est offerte) */
export function themeCondition(t: ThemeDef): string | null {
  if (!t.premium) return null;
  if (t.annual) return traduire('Offerte avec l’abonnement annuel');
  const palier = palierDeScene(t.id);
  if (palier !== null) return traduire("À {0} jours d’affilée dans le Dojo, ou avec Premium", palier);
  if (t.unlockRank !== undefined) return traduire("Au rang {0}, ou avec Premium", RANK_LABELS_SCENES[t.unlockRank]);
  return traduire('Avec Premium');
}

const RANK_LABELS_SCENES = ['Ashigaru', 'Bushi', traduire('Samouraï'), 'Rōnin', 'Shōgun'];

export function themeById(id: SceneId | string | undefined) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Personnages du monde samourai : une illustration homme et une femme, debloques par le rang. */
const MONDE: PackDef[] = [
  {
    id: 'ronin_errant', kind: 'monde', name: 'Rōnin errant', kanji: '浪人', unlockRank: 0,
    names: { h: 'Rōnin errant', f: 'Rōnin errante' }, kanjis: { h: '浪人', f: '浪人' },
    tagline: traduire('Sans maître, libre sur les routes, offert dès le premier jour'), fond: '#E3E9F3', sports: [], productId: '',
    images: { h: [require('@/assets/avatars/app/monde/personnages/ronin_errant_h.webp')], f: [require('@/assets/avatars/app/monde/personnages/ronin_errant_f.webp')] },
  },
  {
    id: 'kyudo', kind: 'monde', name: 'Archer kyūdō', kanji: '弓道', unlockRank: 1,
    names: { h: 'Archer kyūdō', f: traduire('Archère kyūdō') }, kanjis: { h: '弓道', f: '弓道' },
    tagline: traduire('La voie de l’arc : le calme avant chaque flèche'), fond: '#F3EBDA', sports: [], productId: '',
    images: { h: [require('@/assets/avatars/app/monde/personnages/kyudo_h.webp')], f: [require('@/assets/avatars/app/monde/personnages/kyudo_f.webp')] },
  },
  {
    id: 'ninja', kind: 'monde', name: 'Ninja et Kunoichi', kanji: '忍者', unlockRank: 1,
    names: { h: 'Ninja', f: 'Kunoichi' }, kanjis: { h: '忍者', f: 'くノ一' },
    tagline: traduire('L’ombre et la patience, la frappe au bon moment'), fond: '#ECEAEE', sports: [], productId: '',
    images: { h: [require('@/assets/avatars/app/monde/personnages/ninja_h.webp')], f: [require('@/assets/avatars/app/monde/personnages/ninja_f.webp')] },
  },
  {
    id: 'sohei', kind: 'monde', name: 'Sōhei', kanji: '僧兵', unlockRank: 2,
    names: { h: 'Sōhei', f: 'Sōhei' }, kanjis: { h: '僧兵', f: '僧兵' },
    tagline: traduire('Le moine guerrier et sa naginata, gardien du temple'), fond: '#F6EDDC', sports: [], productId: '',
    images: { h: [require('@/assets/avatars/app/monde/personnages/sohei_h.webp')], f: [require('@/assets/avatars/app/monde/personnages/sohei_f.webp')] },
  },
  {
    id: 'sensei', kind: 'monde', name: 'Sensei', kanji: '先生', unlockRank: 3,
    names: { h: 'Sensei', f: 'Sensei' }, kanjis: { h: '先生', f: '先生' },
    tagline: traduire('Le maître du dojo : des années de pratique dans chaque geste'), fond: '#E4EADB', sports: [], productId: '',
    images: { h: [require('@/assets/avatars/app/monde/personnages/sensei_h.webp')], f: [require('@/assets/avatars/app/monde/personnages/sensei_f.webp')] },
  },
  {
    id: 'daimyo', kind: 'monde', name: 'Daimyō et Onna bugeisha', kanji: '大名', unlockRank: 4,
    names: { h: 'Daimyō', f: 'Onna bugeisha' }, kanjis: { h: '大名', f: '女武芸者' },
    tagline: traduire('Le seigneur en armure d’apparat, réservé au rang Shōgun'), fond: '#F6E3DF', sports: [], productId: '',
    images: { h: [require('@/assets/avatars/app/monde/personnages/daimyo_h.webp')], f: [require('@/assets/avatars/app/monde/personnages/daimyo_f.webp')] },
  },
];

export const MONDE_PERSONNAGES: PackDef[] = MONDE;

const both = (a: ImageSourcePropType[]) => ({ h: a, f: a });

/** 16 octobre 2026 : les packs Vie reelle complets (homme et femme dessines), une image par genre, ouverts avec Premium */
export const VIE_PERSONNAGES: PackDef[] = PACKS_VIE_PRETS.map((p) => ({
  id: p.id, kind: 'vie' as const, name: p.nom, kanji: '', tagline: p.phrase, fond: p.fond, sports: [], productId: '',
  names: p.noms, kanjis: { h: '', f: '' },
  images: { h: p.images ? [p.images.h] : [], f: p.images ? [p.images.f] : [] },
}));

export const PACKS: PackDef[] = [
  ...MONDE,
  {
    id: 'musculation', kind: 'sport', name: 'Musculation', kanji: '力', tagline: traduire('Évolue avec tes séances de musculation'), fond: '#F6EDDC',
    sports: ['musculation', 'powerlifting', 'halterophilie', 'strongman', 'street_workout', 'calisthenics', 'body_pump'],
    productId: 'yoroi_pack_musculation',
    images: {
      h: [require('@/assets/avatars/app/sports/musculation/musculation_h_1.webp'), require('@/assets/avatars/app/sports/musculation/musculation_h_2.webp'), require('@/assets/avatars/app/sports/musculation/musculation_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/musculation/musculation_f_1.webp'), require('@/assets/avatars/app/sports/musculation/musculation_f_2.webp'), require('@/assets/avatars/app/sports/musculation/musculation_f_3.webp')],
    },
  },
  {
    id: 'fitness', kind: 'sport', name: 'Fitness et cardio', kanji: '動', tagline: traduire('Évolue avec tes séances de fitness et de cardio'), fond: '#FBE7EA',
    sports: ['fitness', 'hiit', 'cardio_mixte', 'step_aerobic', 'zumba', 'bootcamp', 'circuit_training', 'tabata', 'elliptique', 'rameur', 'velo', 'cycling', 'spinning', 'assault_bike', 'ski_erg', 'stairmaster', 'corde_a_sauter', 'aquagym', 'aquabike'],
    productId: 'yoroi_pack_fitness',
    images: {
      h: [require('@/assets/avatars/app/sports/fitness/fitness_h_1.webp'), require('@/assets/avatars/app/sports/fitness/fitness_h_2.webp'), require('@/assets/avatars/app/sports/fitness/fitness_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/fitness/fitness_f_1.webp'), require('@/assets/avatars/app/sports/fitness/fitness_f_2.webp'), require('@/assets/avatars/app/sports/fitness/fitness_f_3.webp')],
    },
  },
  {
    id: 'course', kind: 'sport', name: 'Course', kanji: '走', tagline: traduire('Évolue avec tes sorties de course'), fond: '#E3EEF3',
    sports: ['running', 'trail', 'marathon', 'ultra_trail', 'sprint', 'course_haies', 'obstacle', 'athletisme'],
    productId: 'yoroi_pack_course',
    images: {
      h: [require('@/assets/avatars/app/sports/course/course_h_1.webp'), require('@/assets/avatars/app/sports/course/course_h_2.webp'), require('@/assets/avatars/app/sports/course/course_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/course/course_f_1.webp'), require('@/assets/avatars/app/sports/course/course_f_2.webp'), require('@/assets/avatars/app/sports/course/course_f_3.webp')],
    },
  },
  {
    id: 'boxe', kind: 'sport', name: 'Boxe', kanji: '拳', tagline: traduire('Évolue avec tes séances de boxe'), fond: '#F6E3DF',
    sports: ['boxe', 'boxe_olympique', 'kickboxing', 'muay_thai', 'boxe_thai', 'boxe_francaise', 'savate'],
    productId: 'yoroi_pack_boxe',
    images: {
      h: [require('@/assets/avatars/app/sports/boxe/boxe_h_1.webp'), require('@/assets/avatars/app/sports/boxe/boxe_h_2.webp'), require('@/assets/avatars/app/sports/boxe/boxe_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/boxe/boxe_f_1.webp'), require('@/assets/avatars/app/sports/boxe/boxe_f_2.webp'), require('@/assets/avatars/app/sports/boxe/boxe_f_3.webp')],
    },
  },
  {
    id: 'jjb', kind: 'sport', name: 'JJB et grappling', kanji: '柔', tagline: traduire('Évolue avec tes séances de JJB et de grappling'), fond: '#E3E9F3',
    sports: ['jjb', 'grappling', 'judo', 'lutte', 'lutte_olympique', 'sambo'],
    productId: 'yoroi_pack_jjb',
    images: {
      h: [require('@/assets/avatars/app/sports/jjb/jjb_h_1.webp'), require('@/assets/avatars/app/sports/jjb/jjb_h_2.webp'), require('@/assets/avatars/app/sports/jjb/jjb_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/jjb/jjb_f_1.webp'), require('@/assets/avatars/app/sports/jjb/jjb_f_2.webp'), require('@/assets/avatars/app/sports/jjb/jjb_f_3.webp')],
    },
  },
  {
    id: 'mma', kind: 'sport', name: 'MMA', kanji: '闘', tagline: traduire('Évolue avec tes séances de MMA'), fond: '#ECEAEE',
    sports: ['mma'],
    productId: 'yoroi_pack_mma',
    images: {
      h: [require('@/assets/avatars/app/sports/mma/mma_h_1.webp'), require('@/assets/avatars/app/sports/mma/mma_h_2.webp'), require('@/assets/avatars/app/sports/mma/mma_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/mma/mma_f_1.webp'), require('@/assets/avatars/app/sports/mma/mma_f_2.webp'), require('@/assets/avatars/app/sports/mma/mma_f_3.webp')],
    },
  },
  {
    id: 'yoga', kind: 'sport', name: 'Yoga et mobilité', kanji: '息', tagline: traduire('Évolue avec tes séances de yoga et de mobilité'), fond: '#E4EADB',
    sports: ['yoga', 'pilates', 'stretching', 'mobilite', 'tai_chi', 'qi_gong', 'foam_roller', 'meditation', 'respiration', 'récupération', 'barre_au_sol'],
    productId: 'yoroi_pack_yoga',
    images: {
      h: [require('@/assets/avatars/app/sports/yoga/yoga_h_1.webp'), require('@/assets/avatars/app/sports/yoga/yoga_h_2.webp'), require('@/assets/avatars/app/sports/yoga/yoga_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/yoga/yoga_f_1.webp'), require('@/assets/avatars/app/sports/yoga/yoga_f_2.webp'), require('@/assets/avatars/app/sports/yoga/yoga_f_3.webp')],
    },
  },
  {
    id: 'crosstraining', kind: 'sport', name: 'Cross training', kanji: '鍛', tagline: traduire('Évolue avec tes séances de cross training'), fond: '#F3EBDA',
    sports: ['crossfit', 'crossfit_games', 'hyrox', 'functional_training', 'kettlebell', 'trx', 'core_training'],
    productId: 'yoroi_pack_crosstraining',
    images: {
      h: [require('@/assets/avatars/app/sports/crosstraining/crosstraining_h_1.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_h_2.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_h_3.webp')],
      f: [require('@/assets/avatars/app/sports/crosstraining/crosstraining_f_1.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_f_2.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_f_3.webp')],
    },
  },
  {
    id: 'kunoichi', kind: 'legende', name: 'Kunoichi', kanji: 'くノ一', tagline: traduire('L’ombre qui frappe, évolue avec ton rang'), fond: '#ECEAEE',
    sports: [], productId: 'yoroi_pack_kunoichi',
    images: both([require('@/assets/avatars/app/packs/kunoichi/kunoichi_1.webp'), require('@/assets/avatars/app/packs/kunoichi/kunoichi_2.webp'), require('@/assets/avatars/app/packs/kunoichi/kunoichi_3.webp')]),
  },
  {
    id: 'oni', kind: 'legende', name: 'Oni', kanji: '鬼', tagline: traduire('Le démon de la force brute, évolue avec ton rang'), fond: '#F6E3DF',
    sports: [], productId: 'yoroi_pack_oni',
    images: both([require('@/assets/avatars/app/packs/oni/oni_1.webp'), require('@/assets/avatars/app/packs/oni/oni_2.webp'), require('@/assets/avatars/app/packs/oni/oni_3.webp')]),
  },
  {
    id: 'moine', kind: 'legende', name: traduire('Moine de la montagne'), kanji: '僧兵', tagline: traduire('La patience du sommet, évolue avec ton rang'), fond: '#F3EBDA',
    sports: [], productId: 'yoroi_pack_moine',
    images: both([require('@/assets/avatars/app/packs/moine/moine_1.webp'), require('@/assets/avatars/app/packs/moine/moine_2.webp'), require('@/assets/avatars/app/packs/moine/moine_3.webp')]),
  },
  {
    id: 'kitsune', kind: 'legende', name: 'Kitsune', kanji: '狐', tagline: traduire('La ruse du renard, évolue avec ton rang'), fond: '#FBEDE3',
    sports: [], productId: 'yoroi_pack_kitsune',
    images: both([require('@/assets/avatars/app/packs/kitsune/kitsune_1.webp'), require('@/assets/avatars/app/packs/kitsune/kitsune_2.webp'), require('@/assets/avatars/app/packs/kitsune/kitsune_3.webp')]),
  },
  {
    id: 'dragon', kind: 'legende', name: 'Dragon d’or', kanji: '龍', tagline: traduire('Le gardien d’or, évolue avec ton rang'), fond: '#F6EDDC',
    sports: [], productId: 'yoroi_pack_dragon',
    images: both([require('@/assets/avatars/app/packs/dragon/dragon_1.webp'), require('@/assets/avatars/app/packs/dragon/dragon_2.webp'), require('@/assets/avatars/app/packs/dragon/dragon_3.webp')]),
  },
  // 18 octobre 2026 : deux Legendes de plus (dessins de la conversation design), ouvertes avec Premium comme les autres
  {
    id: 'tengu', kind: 'legende', name: 'Tengu', kanji: '天狗', tagline: traduire('Le gardien ailé de la montagne, évolue avec ton rang'), fond: '#E6EAF2',
    sports: [], productId: 'yoroi_pack_tengu',
    images: both([require('@/assets/avatars/app/packs/tengu/tengu_1.webp'), require('@/assets/avatars/app/packs/tengu/tengu_2.webp'), require('@/assets/avatars/app/packs/tengu/tengu_3.webp')]),
  },
  {
    id: 'yuki_onna', kind: 'legende', name: 'Yuki onna', kanji: '雪女', tagline: traduire('La dame des neiges, évolue avec ton rang'), fond: '#E8F1F6',
    sports: [], productId: 'yoroi_pack_yuki_onna',
    images: both([require('@/assets/avatars/app/packs/yuki_onna/yuki_onna_1.webp'), require('@/assets/avatars/app/packs/yuki_onna/yuki_onna_2.webp'), require('@/assets/avatars/app/packs/yuki_onna/yuki_onna_3.webp')]),
  },
  ...VIE_PERSONNAGES,
];

export const COLLECTION_PRODUCT_ID = 'yoroi_collection';

export function packById(id: string): PackDef | undefined {
  return PACKS.find((p) => p.id === id);
}

export type ParsedPersonnage =
  | { kind: 'guerrier'; gender: Gender }
  | { kind: 'classique'; gender: Gender }
  | { kind: 'aucun'; gender: Gender }
  | { kind: 'pack'; pack: PackDef; gender: Gender; teinte?: VarianteTeinte | null };

/**
 * 16 octobre 2026 (page Personnages et scenes) : la teinte de peau choisie voyage avec le personnage equipe,
 * collee a sa cle apres un point (ex. 'pompier_h.peau_foncee'). Seuls les packs Vie reelle l'utilisent
 * (lib/v2/dojo/packsTeintes.ts). Une cle sans point reste le dessin d'origine, aussi pour les utilisateurs existants.
 */
const SEP_TEINTE = '.';

function estTeinte(v: string): v is VarianteTeinte {
  return (VARIANTES_TEINTE as string[]).includes(v);
}

/** Cle sans la teinte, et la teinte (null : dessin d'origine) */
export function separerTeinte(key: string | null | undefined): { base: string; teinte: VarianteTeinte | null } {
  const k = key ?? '';
  const i = k.lastIndexOf(SEP_TEINTE);
  if (i <= 0) return { base: k, teinte: null };
  const t = k.slice(i + 1);
  return estTeinte(t) ? { base: k.slice(0, i), teinte: t } : { base: k, teinte: null };
}

/** Cle d'un personnage avec sa teinte (null : dessin d'origine) */
export function cleAvecTeinte(base: string, teinte: VarianteTeinte | null | undefined): string {
  const b = separerTeinte(base).base;
  return teinte ? `${b}${SEP_TEINTE}${teinte}` : b;
}

/** Vrai si deux cles designent le meme personnage, quelle que soit la teinte */
export function memePersonnage(a: string | null | undefined, b: string | null | undefined): boolean {
  return separerTeinte(a).base === separerTeinte(b).base;
}

export function parsePersonnage(key: string | null | undefined): ParsedPersonnage {
  const { base, teinte } = separerTeinte(key ?? 'guerrier_h');
  const k = base || 'guerrier_h';
  if (k === 'guerrier_f') return { kind: 'guerrier', gender: 'f' };
  if (k === 'guerrier_h') return { kind: 'guerrier', gender: 'h' };
  // vague 45 : le personnage Classique et le choix « Sans personnage » (lib/v2/dojo/univers.ts)
  if (k === 'classique_f') return { kind: 'classique', gender: 'f' };
  if (k === 'classique_h') return { kind: 'classique', gender: 'h' };
  if (k === SANS_PERSONNAGE || k === `${SANS_PERSONNAGE}_h` || k === `${SANS_PERSONNAGE}_f`) return { kind: 'aucun', gender: k.endsWith('_f') ? 'f' : 'h' };
  const m = /^(.*)_(h|f)$/.exec(k);
  const id = m ? m[1] : k;
  const gender: Gender = m ? (m[2] as Gender) : 'h';
  const pack = packById(id);
  // 18 octobre 2026 : les Legendes ont aussi leurs teintes (lib/v2/dojo/legendesTeintes.ts)
  if (pack) return { kind: 'pack', pack, gender, teinte: pack.kind === 'vie' || pack.kind === 'legende' ? teinte : null };
  return { kind: 'guerrier', gender: 'h' };
}

export function personnageKey(pack: PackDef, gender: Gender): string {
  return pack.kind === 'legende' ? pack.id : `${pack.id}_${gender}`;
}

/** Packs en vente (sport et legendes), sans les personnages du monde */
export function packsForSale(): PackDef[] {
  return PACKS.filter((p) => p.kind === 'sport' || p.kind === 'legende');
}

/** Seances cumulees dans les sports d'un pack. */
export function packSessions(pack: PackDef, sportCounts: Record<string, number>): number {
  return pack.sports.reduce((s, id) => s + (sportCounts[id] ?? 0), 0);
}

/** Niveau gagne pour un pack (1 a l'achat, puis 2 et 3 en s'entrainant). */
export function packLevel(pack: PackDef, rankIndex: number, sportCounts: Record<string, number>): Level {
  if (pack.kind === 'monde' || pack.kind === 'vie') return 1;
  if (pack.kind === 'legende') return rankIndex >= 3 ? 3 : rankIndex >= 2 ? 2 : 1;
  const n = packSessions(pack, sportCounts);
  return n >= 100 ? 3 : n >= 25 ? 2 : 1;
}

/** Texte de la condition de chaque niveau. */
export function levelCondition(pack: PackDef, level: Level): string {
  if (pack.kind === 'monde') return mondeCondition(pack);
  if (pack.kind === 'vie') return traduire('avec Premium');
  if (level === 1) return traduire('dès l’achat');
  if (pack.kind === 'legende') return level === 2 ? traduire('rang Samouraï') : traduire('rang Rōnin');
  const sport = pack.name.toLowerCase();
  return level === 2 ? traduire("niveau Motivé, 25 séances de {0}", sport) : traduire("niveau Aguerri, 100 séances de {0}", sport);
}

const RANK_LABELS = ['Ashigaru', 'Bushi', traduire('Samouraï'), 'Rōnin', 'Shōgun'];

/** Condition d'un personnage du monde, en clair */
export function mondeCondition(pack: PackDef): string {
  const r = pack.unlockRank ?? 0;
  return r <= 0 ? traduire('offert dès le départ') : traduire("au rang {0}, ou tout de suite avec Premium", RANK_LABELS[r]);
}

/** Nom du rang qui debloque un personnage du monde */
export function unlockRankName(pack: PackDef): string {
  return RANK_LABELS[Math.max(0, Math.min(4, pack.unlockRank ?? 0))];
}

/**
 * Vrai si le personnage peut etre equipe : rang atteint ou Premium (monde) ; packs sport, legendes et Vie reelle :
 * Premium (16 octobre 2026, meme regle que les personnages et scenes Premium, aucun achat a l'unite en vente),
 * ou un achat futur garde dans OWNED_PACKS_KEY.
 */
export function isPackUnlocked(pack: PackDef, owned: string[], rankIndex: number, isPremium: boolean): boolean {
  if (pack.kind === 'monde') return isPremium || rankIndex >= (pack.unlockRank ?? 0);
  return isPremium || owned.includes(pack.id);
}

/** Nom du personnage selon le genre (monde : Ninja ou Kunoichi...) */
export function packDisplayName(pack: PackDef, gender: Gender): string {
  return pack.names ? pack.names[gender] : pack.name;
}

export function packDisplayKanji(pack: PackDef, gender: Gender): string {
  return pack.kanjis ? pack.kanjis[gender] : pack.kanji;
}

/** 18 octobre 2026 : variantes de teinte d'un pack, Vie reelle ou Legende (vide pour les autres) */
export function variantesDuPack(pack: PackDef, gender: Gender): VarianteTeinte[] {
  if (pack.kind === 'vie') return variantesDisponibles(pack.id, gender);
  if (pack.kind === 'legende') return variantesLegende(pack.id);
  return [];
}

/** Image d'un pack a un niveau, sans jamais sortir de la liste. 16 octobre 2026 : teinte de peau des packs Vie reelle,
 *  repli sur le dessin d'origine si la variante n'est pas encore dessinee. */
export function packImage(pack: PackDef, gender: Gender, level: Level = 1, teinte: VarianteTeinte | null = null): ImageSourcePropType {
  if (teinte && pack.kind === 'vie') {
    const img = imageTeinte(pack.id, teinte, gender);
    if (img !== undefined) return img;
  }
  if (teinte && pack.kind === 'legende') {
    const img = imageTeinteLegende(pack.id, teinte, level);
    if (img !== undefined) return img;
  }
  const list = pack.images[gender].length ? pack.images[gender] : pack.images.h;
  return list[Math.max(0, Math.min(list.length - 1, level - 1))];
}

/**
 * Image du Guerrier ou de la Guerriere a un rang. La silhouette (vague 26, lib/v2/silhouette.ts) suit
 * le reglage « Ton personnage te ressemble » : par defaut le dessin classique (null), une autre silhouette seulement
 * si l'utilisateur l'a activee dans Apparence, et jamais pendant l'onboarding (vague 29, ouvrirPresentation).
 * Repli sur le dessin classique du rang si l'illustration de cette silhouette manque.
 */
export function guerrierImage(gender: Gender, rankIndex: number, silhouette: SilhouetteId | null = silhouetteCourante()): ImageSourcePropType {
  const i = Math.max(0, Math.min(4, Math.round(Number(rankIndex) || 0)));
  const g: Gender = gender === 'f' ? 'f' : 'h';
  if (silhouette && silhouette !== 'equilibree') {
    const img = GUERRIER_SILHOUETTES[g]?.[silhouette]?.[i];
    if (img) return img;
  }
  return GUERRIER_IMAGES[g][i];
}

/** Image du personnage Classique a un rang, avec la meme regle de silhouette que le Guerrier */
export function classiqueImage(gender: Gender, rankIndex: number, silhouette: SilhouetteId | null = silhouetteCourante()): ImageSourcePropType {
  const i = Math.max(0, Math.min(4, Math.round(Number(rankIndex) || 0)));
  const g: Gender = gender === 'f' ? 'f' : 'h';
  if (silhouette && silhouette !== 'equilibree') {
    const img = CLASSIQUE_SILHOUETTES[g]?.[silhouette]?.[i];
    if (img) return img;
  }
  return CLASSIQUE_IMAGES[g][i];
}

/** Vrai si une figure est affichee (faux pour « Sans personnage ») */
export function aUnPersonnage(key: string | null | undefined): boolean {
  return parsePersonnage(key).kind !== 'aucun';
}

/** Image du personnage actif, pret a afficher (dojo, accueil, fin de seance). */
export function personnageImage(key: string | null | undefined, rankIndex: number, sportCounts: Record<string, number> = {}): ImageSourcePropType {
  const p = parsePersonnage(key);
  if (p.kind === 'guerrier') return guerrierImage(p.gender, rankIndex);
  if (p.kind === 'classique') return classiqueImage(p.gender, rankIndex);
  if (p.kind === 'aucun') return IMAGE_SANS_PERSONNAGE;
  const lvl = packLevel(p.pack, rankIndex, sportCounts);
  return packImage(p.pack, p.gender, lvl, p.teinte ?? null);
}

export function personnageName(key: string | null | undefined): string {
  const p = parsePersonnage(key);
  if (p.kind === 'guerrier') return p.gender === 'f' ? traduire('La Guerrière') : traduire('Le Guerrier');
  if (p.kind === 'classique') return p.gender === 'f' ? traduire('La Sportive') : traduire('Le Sportif');
  if (p.kind === 'aucun') return traduire('Sans personnage');
  return packDisplayName(p.pack, p.gender);
}

export async function getOwnedPacks(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(OWNED_PACKS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    const ids = list.filter((x): x is string => typeof x === 'string');
    if (ids.includes(COLLECTION_PRODUCT_ID)) return PACKS.map((p) => p.id);
    return ids;
  } catch {
    return [];
  }
}
