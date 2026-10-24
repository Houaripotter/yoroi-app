/**
 * Fonds des cartes a partager : ta photo, ta scene d'accueil, des decors neutres sans style japonais
 * (scenes du pack Classique) et des fonds unis sobres. Require statiques pour Metro.
 * 14 octobre 2026 : la Foret et le Desert sont de vrais fonds portrait 9:16 (1080 x 1920, dessines pour la carte),
 * a la place du Parc et du degrade Sable. Les ids 'parc' et 'sable' restent, pour garder les choix deja faits.
 */
import type { ImageSourcePropType } from 'react-native';
import type { FondId } from '@/lib/v2/cartes/types';
import { traduire } from '@/lib/i18n/tr';

export type FondMeta = {
  id: FondId;
  nom: string;
  image?: ImageSourcePropType;
  /** degrade du haut vers le bas, pour les fonds unis */
  degrade?: [string, string];
  /** fond clair par nature : le style sombre y pose un voile plus fort */
  clair?: boolean;
};

export const FONDS: FondMeta[] = [
  { id: 'uni', nom: 'Uni' },
  { id: 'scene', nom: traduire('Ma scène') },
  { id: 'photo', nom: traduire('Ma photo') },
  { id: 'plage', nom: 'Plage', image: require('@/assets/avatars/app/classique/scenes/mer_jour.webp'), clair: true },
  { id: 'ville', nom: 'Ville', image: require('@/assets/avatars/app/classique/scenes/ville_jour.webp'), clair: true },
  { id: 'buildings', nom: traduire('Buildings de nuit'), image: require('@/assets/avatars/app/classique/scenes/ville_nuit.webp') },
  { id: 'parc', nom: traduire('Forêt'), image: require('@/assets/avatars/app/cartes/fond_foret.webp'), clair: true },
  { id: 'stade', nom: 'Stade', image: require('@/assets/avatars/app/classique/scenes/piste_nuit.webp') },
  { id: 'salle', nom: traduire('Salle de sport'), image: require('@/assets/avatars/app/classique/scenes/salle_nuit.webp') },
  { id: 'sable', nom: traduire('Désert'), image: require('@/assets/avatars/app/cartes/fond_desert.webp'), clair: true },
  { id: 'ocean', nom: traduire('Océan'), degrade: ['#2B4F7E', '#0E1A2E'] },
  { id: 'ardoise', nom: 'Ardoise', degrade: ['#434957', '#1A1D25'] },
  { id: 'brume', nom: 'Brume', degrade: ['#F6F5F0', '#DAD6CB'], clair: true },
  { id: 'noir', nom: 'Noir mat', degrade: ['#18191D', '#0B0B0D'] },
];

export function fondMeta(id: FondId): FondMeta {
  // une de tes scenes ('scene:<id>') se comporte comme Ma scène
  if (typeof id === 'string' && id.startsWith('scene:')) return FONDS.find((f) => f.id === 'scene') ?? FONDS[0];
  return FONDS.find((f) => f.id === id) ?? FONDS[0];
}

/**
 * Texte de signature en bas de chaque carte, toujours le meme (16 octobre 2026 : le choix et la variante
 * "Chaque seance compte" sont retires). Un reglage enregistre avec slogan 1 retombe sur SLOGANS[0].
 */
export const SIGNATURE = 'YOROI : Musculation, MMA, Boxe';
export const SLOGANS = [SIGNATURE];

/** Mention des stores en texte (gardee pour l'accessibilite et l'ancienne signature) */
export const MENTION_STORES = traduire('Sur iPhone et Android');

/**
 * Badges des stores en bas de chaque carte, ceux du dossier assets/images (blancs, bord noir).
 * Pour passer aux badges officiels noirs : depose les fichiers a cote (par exemple appstore_noir.png
 * et googleplay_noir.png) et change les deux require ci-dessous, avec leur rapport largeur sur hauteur.
 */
export const BADGES = {
  apple: { image: require('@/assets/images/appstore.png') as ImageSourcePropType, ratio: 705 / 222 },
  google: { image: require('@/assets/images/android.png') as ImageSourcePropType, ratio: 705 / 209 },
};
