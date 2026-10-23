/**
 * Variantes de teinte des personnages « Vie réelle » (16 octobre 2026, agent TEINTES) : FICHIER GENERE par
 * scratchpad teintes/gen_teintes.py, ne pas modifier a la main.
 * Houari : il n'y avait que des personnages a peau claire. Chaque pack peut avoir, en plus de son image d'origine,
 * une variante peau foncee, peau mate et asie, homme et femme, meme tenue, meme pose, meme style, meme cadrage
 * (600 x 800, figure de y = 49 a y = 766). Images Gemini (Nano Banana, mode Pro), contenu original, aucune marque.
 * Cle : identifiant du pack dans packsVie.ts. Valeur absente : variante pas encore dessinee, ne pas la proposer.
 * L'ecran affiche le choix par vignettes de visage, sans etiquette d'origine.
 * Images presentes : 228.
 */

export type VarianteTeinte = 'peau_foncee' | 'peau_mate' | 'asie';

export const VARIANTES_TEINTE: VarianteTeinte[] = ['peau_foncee', 'peau_mate', 'asie'];

export const TEINTES_PACKS: Record<string, Partial<Record<VarianteTeinte, { homme?: number; femme?: number }>>> = {
  pompier: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/pompier_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pompier_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/pompier_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pompier_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/pompier_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pompier_f_asie.webp') },
  },
  militaire: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/militaire_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/militaire_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/militaire_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/militaire_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/militaire_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/militaire_f_asie.webp') },
  },
  soignant: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/soignant_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/soignant_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/soignant_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/soignant_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/soignant_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/soignant_f_asie.webp') },
  },
  policier: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/policier_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/policier_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/policier_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/policier_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/policier_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/policier_f_asie.webp') },
  },
  cuisinier: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/cuisinier_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/cuisinier_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/cuisinier_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/cuisinier_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/cuisinier_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/cuisinier_f_asie.webp') },
  },
  batiment: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/batiment_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/batiment_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/batiment_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/batiment_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/batiment_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/batiment_f_asie.webp') },
  },
  motard: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/motard_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/motard_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/motard_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/motard_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/motard_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/motard_f_asie.webp') },
  },
  surf: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/surf_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/surf_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/surf_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/surf_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/surf_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/surf_f_asie.webp') },
  },
  skate: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/skate_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/skate_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/skate_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/skate_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/skate_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/skate_f_asie.webp') },
  },
  basket: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/basket_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/basket_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/basket_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/basket_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/basket_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/basket_f_asie.webp') },
  },
  foot: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/foot_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/foot_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/foot_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/foot_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/foot_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/foot_f_asie.webp') },
  },
  rugby: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/rugby_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/rugby_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/rugby_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/rugby_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/rugby_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/rugby_f_asie.webp') },
  },
  velo: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/velo_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/velo_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/velo_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/velo_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/velo_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/velo_f_asie.webp') },
  },
  montagne: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/montagne_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/montagne_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/montagne_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/montagne_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/montagne_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/montagne_f_asie.webp') },
  },
  natation: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/natation_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/natation_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/natation_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/natation_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/natation_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/natation_f_asie.webp') },
  },
  danse: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/danse_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/danse_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/danse_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/danse_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/danse_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/danse_f_asie.webp') },
  },
  escalade: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/escalade_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/escalade_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/escalade_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/escalade_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/escalade_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/escalade_f_asie.webp') },
  },
  tennis: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/tennis_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/tennis_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/tennis_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/tennis_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/tennis_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/tennis_f_asie.webp') },
  },
  halterophilie: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/halterophilie_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/halterophilie_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/halterophilie_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/halterophilie_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/halterophilie_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/halterophilie_f_asie.webp') },
  },
  street: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/street_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/street_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/street_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/street_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/street_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/street_f_asie.webp') },
  },
  chevalier: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/chevalier_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/chevalier_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/chevalier_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/chevalier_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/chevalier_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/chevalier_f_asie.webp') },
  },
  viking: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/viking_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/viking_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/viking_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/viking_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/viking_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/viking_f_asie.webp') },
  },
  gladiateur: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/gladiateur_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/gladiateur_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/gladiateur_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/gladiateur_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/gladiateur_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/gladiateur_f_asie.webp') },
  },
  spartiate: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/spartiate_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/spartiate_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/spartiate_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/spartiate_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/spartiate_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/spartiate_f_asie.webp') },
  },
  astronaute: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/astronaute_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/astronaute_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/astronaute_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/astronaute_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/astronaute_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/astronaute_f_asie.webp') },
  },
  futuriste: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/futuriste_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/futuriste_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/futuriste_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/futuriste_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/futuriste_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/futuriste_f_asie.webp') },
  },
  ninja_moderne: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/ninja_moderne_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/ninja_moderne_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/ninja_moderne_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/ninja_moderne_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/ninja_moderne_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/ninja_moderne_f_asie.webp') },
  },
  sauveteur: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/sauveteur_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/sauveteur_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/sauveteur_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/sauveteur_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/sauveteur_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/sauveteur_f_asie.webp') },
  },
  mecanicien: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/mecanicien_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/mecanicien_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/mecanicien_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/mecanicien_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/mecanicien_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/mecanicien_f_asie.webp') },
  },
  agriculteur: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/agriculteur_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/agriculteur_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/agriculteur_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/agriculteur_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/agriculteur_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/agriculteur_f_asie.webp') },
  },
  pilote: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/pilote_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pilote_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/pilote_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pilote_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/pilote_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pilote_f_asie.webp') },
  },
  ski: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/ski_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/ski_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/ski_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/ski_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/ski_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/ski_f_asie.webp') },
  },
  golf: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/golf_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/golf_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/golf_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/golf_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/golf_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/golf_f_asie.webp') },
  },
  equitation: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/equitation_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/equitation_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/equitation_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/equitation_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/equitation_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/equitation_f_asie.webp') },
  },
  kayak: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/kayak_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/kayak_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/kayak_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/kayak_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/kayak_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/kayak_f_asie.webp') },
  },
  pirate: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/pirate_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pirate_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/pirate_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pirate_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/pirate_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/pirate_f_asie.webp') },
  },
  cowboy: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/cowboy_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/cowboy_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/cowboy_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/cowboy_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/cowboy_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/cowboy_f_asie.webp') },
  },
  explorateur: {
    peau_foncee: { homme: require('@/assets/avatars/app/packs_vie/teintes/explorateur_h_peau_foncee.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/explorateur_f_peau_foncee.webp') },
    peau_mate: { homme: require('@/assets/avatars/app/packs_vie/teintes/explorateur_h_peau_mate.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/explorateur_f_peau_mate.webp') },
    asie: { homme: require('@/assets/avatars/app/packs_vie/teintes/explorateur_h_asie.webp'), femme: require('@/assets/avatars/app/packs_vie/teintes/explorateur_f_asie.webp') },
  },
};

/** Variantes disponibles d'un pack pour un genre ('h' ou 'f'), dans l'ordre de VARIANTES_TEINTE */
export function variantesDisponibles(packId: string, genre: 'h' | 'f'): VarianteTeinte[] {
  const t = TEINTES_PACKS[packId];
  if (!t) return [];
  const k = genre === 'h' ? 'homme' : 'femme';
  return VARIANTES_TEINTE.filter((v) => t[v]?.[k] !== undefined);
}

/** Image d'une variante, ou undefined si elle n'existe pas encore */
export function imageTeinte(packId: string, variante: VarianteTeinte, genre: 'h' | 'f'): number | undefined {
  return TEINTES_PACKS[packId]?.[variante]?.[genre === 'h' ? 'homme' : 'femme'];
}
