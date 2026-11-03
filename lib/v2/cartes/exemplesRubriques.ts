/**
 * 3 novembre 2026 (refonte de Mes cartes), Houari : « que chaque vignette donne envie de partager ».
 * Une rubrique encore vide de Mes cartes montre des cartes d'EXEMPLE (chiffres et parcours inventes, ceux de la
 * demonstration lib/v2/cartes/demo.ts), toujours marquees « Exemple » sur la vignette.
 *
 * Les regles (fonctions pures, testees dans __tests__/unit/mesCartesRefonte.test.ts) :
 * 1. un exemple n'apparait QUE dans une rubrique sans aucune de tes cartes : des que tu en as une, plus d'exemple ;
 * 2. chaque carte d'exemple porte exemple: true et une cle « exemple:... » : jamais confondue avec tes donnees ;
 * 3. le parcours de course est un dessin invente (une boucle), jamais un vrai trace GPS ;
 * 4. un exemple ne part dans aucun export : la vignette n'est jamais capturee, et le toucher n'ouvre pas le studio
 *    sur l'exemple (lienExemple : la carte du moment sans donnees, qui dit quoi faire).
 */
import type { CarteData } from './types';
import { DEMO_ANNEE, DEMO_COMPTEURS, DEMO_EXPLOITS, DEMO_MOIS, DEMO_OBJECTIFS, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU, DEMO_SEMAINE } from './demo';
import { rangerExploits } from './periode';

/** Les rubriques de Mes cartes qui peuvent montrer des exemples (l'avant apres a deja le sien, lib/v2/cartes/exemples.ts) */
export type RubriqueExemple = 'records' | 'compteurs' | 'course' | 'seances' | 'objectifs' | 'annee' | 'semaine' | 'mois';

/** Une carte de demonstration devenue carte d'exemple : marquee, avec sa propre cle */
export function enExemple(d: CarteData): CarteData {
  return { ...d, exemple: true, cle: `exemple:${d.cle}` };
}

function cartesDemo(id: RubriqueExemple): CarteData[] {
  switch (id) {
    case 'records':
      return rangerExploits(DEMO_EXPLOITS).records.slice(0, 2);
    case 'compteurs':
      return DEMO_COMPTEURS.slice(0, 2);
    case 'course':
      // la course d'exemple : 10,24 km et son parcours dessine (une boucle inventee, jamais un GPS)
      return [DEMO_SEANCE_COURSE];
    case 'seances':
      return [DEMO_SEANCE_MUSCU, DEMO_SEANCE_COMBAT];
    case 'objectifs':
      return DEMO_OBJECTIFS.slice(0, 2);
    case 'annee':
      return [DEMO_ANNEE];
    case 'semaine':
      return [DEMO_SEMAINE];
    case 'mois':
      return [DEMO_MOIS];
    default:
      return [];
  }
}

/** Les cartes d'exemple d'une rubrique, toutes marquees */
export function exemplesRubrique(id: RubriqueExemple): CarteData[] {
  return cartesDemo(id).map(enExemple);
}

/** Tes cartes si tu en as, sinon les exemples de la rubrique (jamais les deux melanges) */
export function cartesOuExemples(id: RubriqueExemple, tiennes: CarteData[]): { cartes: CarteData[]; exemples: boolean } {
  return tiennes.length ? { cartes: tiennes, exemples: false } : { cartes: exemplesRubrique(id), exemples: true };
}

/** Une seance de course (course a pied, trail, marche, velo...) : elle va dans la rubrique Course */
export function estCarteCourse(d: CarteData): boolean {
  return d.moment === 'seance' && d.famille === 'course';
}

/**
 * Ou mene le toucher d'une carte d'exemple : jamais le studio sur l'exemple (rien d'exemple ne s'exporte).
 * L'avant apres ouvre sa carte, qui dit d'ajouter tes deux photos ; les autres, la carte du moment sans donnees,
 * qui renvoie vers tes vraies cartes.
 */
export function lienExemple(d: CarteData): string {
  return d.moment === 'avant_apres' ? '/carte?moment=avant_apres' : `/carte?moment=${d.moment}`;
}
