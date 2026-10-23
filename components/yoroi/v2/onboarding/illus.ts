/**
 * Illustrations de l'onboarding (vague 27) : les sceaux dessines de l'app (assets/avatars/app/sceaux),
 * clairs et sans aucune ecriture. Require statiques pour le bundler.
 */
import type { ImageSourcePropType } from 'react-native';

export const SCEAUX = {
  balance: require('@/assets/avatars/app/sceaux/decouverte/balance.webp'),
  haltere: require('@/assets/avatars/app/sceaux/force/haltere.webp'),
  gants: require('@/assets/avatars/app/sceaux/combat/gants.webp'),
  lune_soleil: require('@/assets/avatars/app/sceaux/regularite/lune_soleil.webp'),
  sablier: require('@/assets/avatars/app/sceaux/regularite/sablier.webp'),
  sentier: require('@/assets/avatars/app/sceaux/regularite/sentier.webp'),
  flamme: require('@/assets/avatars/app/sceaux/regularite/flamme.webp'),
  bandes: require('@/assets/avatars/app/sceaux/combat/bandes.webp'),
  boussole: require('@/assets/avatars/app/sceaux/decouverte/boussole.webp'),
  poing: require('@/assets/avatars/app/sceaux/force/poing.webp'),
  enclume: require('@/assets/avatars/app/sceaux/force/enclume.webp'),
  lanterne: require('@/assets/avatars/app/sceaux/regularite/lanterne.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type SceauKey = keyof typeof SCEAUX;

/** Scene de la forge, plein ecran pendant la preparation */
export const FORGE_SCENE: ImageSourcePropType = require('@/assets/avatars/app/monde/scenes/forge.webp');
