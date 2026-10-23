/**
 * Quel parcours a l'ouverture de l'app (14 octobre 2026) : logique pure, testee (__tests__/unit/parcoursOnboarding.test.ts).
 *
 * Regle :
 *  - nouvel utilisateur (toutes les lectures reussies, aucune trace de donnees) : l'onboarding complet ;
 *  - utilisateur existant (marqueur, reglages, profil, seances ou pesees) qui n'a jamais vu l'accueil de la 3.0 :
 *    le mini onboarding « Nouveautes de la 3.0 » (/nouveautes), seulement les etapes nouvelles ;
 *  - sinon les onglets.
 * Prudence : au moindre doute (lecture impossible), jamais l'onboarding complet ; la demo (Heny) ne declenche
 * pas les nouveautes (elles attendent la sortie de la demo, rien n'est marque).
 * 18 octobre 2026 (INSTALLATION) : « existant » est decide par lib/v2/onboarding/etatOuverture.ts ; un profil qui n'est
 * que dans le trousseau (il survit a la suppression de l'app) ne compte plus : reinstallation, onboarding complet.
 */

/** Pose a la fin de l'onboarding complet ou du mini onboarding de la 3.0 */
export const NOUVEAUTES_30_KEY = '@yoroi_nouveautes_3_0_vues';

export type Parcours = 'onboarding' | 'nouveautes' | 'tabs';

export type EtatOuverture = {
  /** une trace d'utilisateur existant a ete trouvee */
  existant: boolean;
  /** au moins une lecture a echoue (etat inconnu) */
  lectureRatee: boolean;
  /** valeur lue de NOUVEAUTES_30_KEY ; undefined si la lecture a echoue */
  nouveautesVues: boolean | undefined;
  /** la demo (Heny) est chargee */
  demo?: boolean;
};

export function choisirParcours(e: EtatOuverture): Parcours {
  if (!e.existant) return e.lectureRatee ? 'tabs' : 'onboarding';
  if (e.demo) return 'tabs';
  if (e.nouveautesVues === false) return 'nouveautes';
  return 'tabs';
}

// ── Les etapes du mini onboarding ──────────────────────────────────────────

/** la visite guidee suit la derniere etape (elle se joue sur les vrais ecrans) */
export type EtapeNouveautes = 'bienvenue' | 'univers' | 'sante' | 'scene';

export type EtatNouveautes = {
  /** l'univers (Japon, Classique, Sans personnage) a deja ete choisi (espace.univers present) */
  universChoisi: boolean;
  /** Apple Sante ou Health Connect existe sur ce telephone (pas le web, pas Expo Go) */
  santeDisponible: boolean;
  /** deja connecte */
  santeConnectee: boolean;
  /** « Revoir la presentation » depuis les Reglages : on remontre tout ce qui a un sens */
  revoir?: boolean;
};

/** Seulement ce que l'utilisateur n'a jamais vu ; on ne redemande jamais ce qu'on sait deja */
export function etapesNouveautes(e: EtatNouveautes): EtapeNouveautes[] {
  const out: EtapeNouveautes[] = ['bienvenue'];
  if (!e.universChoisi || e.revoir) out.push('univers');
  if (e.santeDisponible && !e.santeConnectee) out.push('sante');
  out.push('scene');
  return out;
}
