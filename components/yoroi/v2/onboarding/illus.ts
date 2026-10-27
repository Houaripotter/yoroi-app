/**
 * Illustrations de l'onboarding (vague 27) : les sceaux dessines de l'app (assets/avatars/app/sceaux),
 * clairs et sans aucune ecriture. Require statiques pour le bundler.
 */
import type { ImageSourcePropType } from 'react-native';
import { illustration } from '@/components/yoroi/v2/stickers';

const SCEAUX_ENCRE = {
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

/** 27 octobre 2026 : les stickers (ou les sceaux d'avant, reglage Illustrations) */
export const SCEAUX = {
  get balance(): ImageSourcePropType {
    return illustration('balance', SCEAUX_ENCRE.balance);
  },
  get haltere(): ImageSourcePropType {
    return illustration('musculation', SCEAUX_ENCRE.haltere);
  },
  get gants(): ImageSourcePropType {
    return illustration('gants', SCEAUX_ENCRE.gants);
  },
  get lune_soleil(): ImageSourcePropType {
    return illustration('lune_soleil', SCEAUX_ENCRE.lune_soleil);
  },
  get sablier(): ImageSourcePropType {
    return illustration('sablier', SCEAUX_ENCRE.sablier);
  },
  get sentier(): ImageSourcePropType {
    return illustration('sentier', SCEAUX_ENCRE.sentier);
  },
  get flamme(): ImageSourcePropType {
    return illustration('flamme', SCEAUX_ENCRE.flamme);
  },
  get bandes(): ImageSourcePropType {
    return illustration('bandes', SCEAUX_ENCRE.bandes);
  },
  get boussole(): ImageSourcePropType {
    return illustration('boussole', SCEAUX_ENCRE.boussole);
  },
  get poing(): ImageSourcePropType {
    return illustration('poing', SCEAUX_ENCRE.poing);
  },
  get enclume(): ImageSourcePropType {
    return illustration('enclume', SCEAUX_ENCRE.enclume);
  },
  get lanterne(): ImageSourcePropType {
    return illustration('lanterne', SCEAUX_ENCRE.lanterne);
  },
};

export type SceauKey = keyof typeof SCEAUX;

/** Scene de la forge, plein ecran pendant la preparation */
export const FORGE_SCENE: ImageSourcePropType = require('@/assets/avatars/app/monde/scenes/forge.webp');
