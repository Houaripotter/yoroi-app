/**
 * Illustrations des machines (16 octobre) : une image par machine, generee dans Gemini avec la consigne
 * de _propositions/exercices/prompts.txt, recadree et passee en webp 512 px par _propositions/exercices/decoupe.py.
 * Une machine absente de cette table s'affiche avec une case « illustration a venir ».
 * Pour en ajouter une : deposer <id>.webp dans assets/exercices/machines/ puis ajouter sa ligne ici.
 */
import type { ImageSourcePropType } from 'react-native';

export const MACHINE_ART: Record<string, ImageSourcePropType> = {
  ab_crunch: require('../../../assets/exercices/machines/ab_crunch.webp'),
  abducteurs: require('../../../assets/exercices/machines/abducteurs.webp'),
  adducteurs: require('../../../assets/exercices/machines/adducteurs.webp'),
  banc_abdos: require('../../../assets/exercices/machines/banc_abdos.webp'),
  banc_developpe: require('../../../assets/exercices/machines/banc_developpe.webp'),
  banc_incline: require('../../../assets/exercices/machines/banc_incline.webp'),
  banc_lombaires: require('../../../assets/exercices/machines/banc_lombaires.webp'),
  banc_reglable: require('../../../assets/exercices/machines/banc_reglable.webp'),
  barres_paralleles: require('../../../assets/exercices/machines/barres_paralleles.webp'),
  belt_squat: require('../../../assets/exercices/machines/belt_squat.webp'),
  cage: require('../../../assets/exercices/machines/cage.webp'),
  chaise_romaine: require('../../../assets/exercices/machines/chaise_romaine.webp'),
  chest_press: require('../../../assets/exercices/machines/chest_press.webp'),
  chest_press_incline: require('../../../assets/exercices/machines/chest_press_incline.webp'),
  curl_machine: require('../../../assets/exercices/machines/curl_machine.webp'),
  dips_assistes: require('../../../assets/exercices/machines/dips_assistes.webp'),
  elevations_laterales_machine: require('../../../assets/exercices/machines/elevations_laterales_machine.webp'),
  ghd: require('../../../assets/exercices/machines/ghd.webp'),
  hack_squat: require('../../../assets/exercices/machines/hack_squat.webp'),
  hip_thrust_machine: require('../../../assets/exercices/machines/hip_thrust_machine.webp'),
  kickback_machine: require('../../../assets/exercices/machines/kickback_machine.webp'),
  landmine: require('../../../assets/exercices/machines/landmine.webp'),
  leg_curl_allonge: require('../../../assets/exercices/machines/leg_curl_allonge.webp'),
  leg_curl_assis: require('../../../assets/exercices/machines/leg_curl_assis.webp'),
  leg_curl_debout: require('../../../assets/exercices/machines/leg_curl_debout.webp'),
  leg_extension: require('../../../assets/exercices/machines/leg_extension.webp'),
  lombaires_machine: require('../../../assets/exercices/machines/lombaires_machine.webp'),
  mollets_assis: require('../../../assets/exercices/machines/mollets_assis.webp'),
  mollets_debout: require('../../../assets/exercices/machines/mollets_debout.webp'),
  oiseau_machine: require('../../../assets/exercices/machines/oiseau_machine.webp'),
  pec_deck: require('../../../assets/exercices/machines/pec_deck.webp'),
  pendulum_squat: require('../../../assets/exercices/machines/pendulum_squat.webp'),
  poulie_haute_triceps: require('../../../assets/exercices/machines/poulie_haute_triceps.webp'),
  poulie_reglable: require('../../../assets/exercices/machines/poulie_reglable.webp'),
  poulie_vis_a_vis: require('../../../assets/exercices/machines/poulie_vis_a_vis.webp'),
  presse_cuisses: require('../../../assets/exercices/machines/presse_cuisses.webp'),
  presse_horizontale: require('../../../assets/exercices/machines/presse_horizontale.webp'),
  pull_over_machine: require('../../../assets/exercices/machines/pull_over_machine.webp'),
  pupitre: require('../../../assets/exercices/machines/pupitre.webp'),
  rotation_buste: require('../../../assets/exercices/machines/rotation_buste.webp'),
  rowing_machine: require('../../../assets/exercices/machines/rowing_machine.webp'),
  rowing_tbar: require('../../../assets/exercices/machines/rowing_tbar.webp'),
  shoulder_press: require('../../../assets/exercices/machines/shoulder_press.webp'),
  shrug_machine: require('../../../assets/exercices/machines/shrug_machine.webp'),
  smith_machine: require('../../../assets/exercices/machines/smith_machine.webp'),
  tirage_convergent: require('../../../assets/exercices/machines/tirage_convergent.webp'),
  tirage_horizontal: require('../../../assets/exercices/machines/tirage_horizontal.webp'),
  tirage_vertical: require('../../../assets/exercices/machines/tirage_vertical.webp'),
  tractions_assistees: require('../../../assets/exercices/machines/tractions_assistees.webp'),
  triceps_machine: require('../../../assets/exercices/machines/triceps_machine.webp'),
};

export function machineArt(id: string): ImageSourcePropType | undefined {
  return MACHINE_ART[id];
}
