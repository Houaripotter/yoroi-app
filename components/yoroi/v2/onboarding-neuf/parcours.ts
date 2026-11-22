/**
 * onboarding-neuf/parcours.ts
 *
 * La logique du nouvel onboarding, sans aucun ecran : le deroule selon les reponses, la barre de progression,
 * la reprise d'un brouillon et la regle d'affichage de l'offre de rattrapage. Fonctions pures, testees
 * (__tests__/unit/onboardingNeuf.test.ts). Meme deroule qu'INRO (components/onboarding-nuit/index.tsx), adapte
 * a YOROI (plan du 21 novembre 2026, sections B et E).
 *
 * 21 novembre 2026 (Houari) : pas de question « Ce qui te freine » ; la taille reste (elle sert a l'IMC et a
 * l'estimation d'arrivee, lib/v2/pesee/estimation.ts).
 */

import type { EtapeMesureNeuf, TempsEcran } from '@/lib/v2/onboarding/interrupteur';

export type Etape =
  | 'entree'
  // 22 novembre 2026 : « Tu utilises déjà une app pour tes séances ? » (AncienneApp.tsx), juste apres l'entree
  | 'ancienneApp'
  // bloc « Toi »
  | 'prenom' | 'genre' | 'age' | 'source'
  | 'interlude'
  // bloc « Ton plan »
  | 'objectif' | 'sport' | 'poids' | 'taille' | 'cap' | 'jours' | 'univers' | 'rappels' | 'rappelsRefus' | 'sante'
  // la fin
  | 'filtre' | 'demo' | 'preuve' | 'chargement'
  | 'paywall1' | 'paywall2' | 'paywall' | 'rattrapage';

/** Tous les ecrans, dans l'ordre, pour la barre d'apercu du Studio */
export const ORDRE: Etape[] = [
  'entree', 'ancienneApp', 'prenom', 'genre', 'age', 'source', 'interlude',
  'objectif', 'sport', 'poids', 'taille', 'cap', 'jours', 'univers', 'rappels', 'rappelsRefus', 'sante',
  'filtre', 'demo', 'preuve', 'chargement', 'paywall1', 'paywall2', 'paywall', 'rattrapage',
];

/** Le nom de chaque ecran, pour le Studio (jamais affiche a un utilisateur) */
export const NOMS_ETAPES: Record<Etape, string> = {
  entree: 'Entrée', ancienneApp: 'Ancienne app', prenom: 'Prénom', genre: 'Genre', age: 'Âge', source: 'Source', interlude: 'Interlude',
  objectif: 'Objectif', sport: 'Sports', poids: 'Poids', taille: 'Taille', cap: 'Cap', jours: 'Jours', univers: 'Univers',
  rappels: 'Rappels', rappelsRefus: 'Rappels refusés', sante: 'Santé', filtre: 'Filtre', demo: 'Démo', preuve: 'Avis',
  chargement: 'Chargement', paywall1: 'Paywall 1 · promesse', paywall2: 'Paywall 2 · rappel', paywall: 'Paywall 3 · offre',
  rattrapage: 'Offre de rattrapage',
};

export function isEtape(v: unknown): v is Etape {
  return typeof v === 'string' && (ORDRE as string[]).includes(v);
}

/** Le sens du poids, tel que le donne lib/v2/onboarding/objectifs.ts (sensDe) */
export type SensPoids = 'baisse' | 'recompo' | 'stable' | 'hausse' | 'categorie' | 'aucun';

/** Les reponses qui decident du parcours */
export type EtatParcours = {
  /** les rappels ont ete refuses : l'ecran « Ce que tu rates » suit */
  rappelsRefus: boolean;
  /** sens du poids d'apres les objectifs : l'ecran du cap n'existe que pour perdre ou prendre */
  sens: SensPoids;
  /** Apple Sante ou Health Connect existe et n'est pas encore relie */
  santeOff: boolean;
  /** le store annonce un essai : l'ecran 2 du paywall (le rappel) existe */
  essai: boolean;
  /** arrive avec ses donnees d'une autre app (reprise) : prenom, poids, chargement, paywall */
  viaReprise: boolean;
};

export const ETAT_DEPART: EtatParcours = { rappelsRefus: false, sens: 'aucun', santeOff: false, essai: false, viaReprise: false };

/** Le cap (« Tu veux arriver a combien ? ») : seulement pour perdre ou prendre (plan B4, ecran 10) */
export function avecCap(sens: SensPoids): boolean {
  return sens === 'baisse' || sens === 'recompo' || sens === 'hausse';
}

/** Les questions qui portent la barre, dans l'ordre : bloc « Toi » puis bloc « Ton plan » */
export function questions(s: EtatParcours): Etape[] {
  if (s.viaReprise) return ['ancienneApp', 'prenom', 'poids'];
  return [
    'ancienneApp', 'prenom', 'genre', 'age', 'source',
    'objectif', 'sport', 'poids', 'taille', ...(avecCap(s.sens) ? (['cap'] as Etape[]) : []), 'jours', 'univers', 'rappels',
    ...(s.santeOff ? (['sante'] as Etape[]) : []),
  ];
}

/** Le parcours reel, selon les reponses */
export function parcours(s: EtatParcours): Etape[] {
  if (s.viaReprise) {
    return ['entree', 'ancienneApp', 'prenom', 'poids', 'chargement', 'paywall1', ...(s.essai ? (['paywall2'] as Etape[]) : []), 'paywall'];
  }
  const p: Etape[] = ['entree', 'ancienneApp', 'prenom', 'genre', 'age', 'source', 'interlude', 'objectif', 'sport', 'poids', 'taille'];
  if (avecCap(s.sens)) p.push('cap');
  p.push('jours', 'univers', 'rappels');
  if (s.rappelsRefus) p.push('rappelsRefus');
  if (s.santeOff) p.push('sante');
  p.push('filtre', 'demo', 'preuve', 'chargement', 'paywall1');
  if (s.essai) p.push('paywall2');
  p.push('paywall');
  return p;
}

/** L'ecran suivant (le meme s'il n'y en a plus). Un ecran hors du parcours reprend au premier qui en fait partie apres lui. */
export function suivante(cur: Etape, s: EtatParcours): Etape {
  const p = parcours(s);
  const n = p.indexOf(cur);
  if (n < 0) return ORDRE.slice(ORDRE.indexOf(cur) + 1).find((x) => p.includes(x)) ?? cur;
  return p[n + 1] ?? cur;
}

/** Les ecrans en plus partagent le segment de l'ecran qu'ils prolongent */
const SEGMENT: Partial<Record<Etape, Etape>> = { rappelsRefus: 'rappels' };

/**
 * La barre de progression (INRO, 20 novembre 2026) : une seule barre continue. Premiere question : 12 %.
 * Des la deuxieme : 50 %. Puis 0,5 + 0,5 x (1 - (1 - t)²), t = (n - 1) / (total - 2) : grands pas d'abord,
 * puis de plus en plus petits. Hors des questions : pas de barre (total 0).
 */
export const DEPART_BARRE = 0.12;
export function position(etape: Etape, s: EtatParcours): { etape: number; total: number; progres?: number } {
  const e = SEGMENT[etape] ?? etape;
  const suite = questions(s);
  const total = suite.length;
  const n = suite.indexOf(e);
  if (n < 0) return { etape: 0, total: 0 };
  const t = (n - 1) / Math.max(1, total - 2);
  const progres = n === 0 ? DEPART_BARRE : 0.5 + 0.5 * (1 - (1 - t) * (1 - t));
  return { etape: n + 1, total, progres: Math.min(1, progres) };
}

/** Les ecrans poses sur une photo ou sur le fond de l'interlude : barre d'etat claire */
export const SUR_PHOTO: Etape[] = ['entree', 'interlude', 'paywall', 'rattrapage'];

/**
 * Reprise d'un brouillon (plan E9). Le brouillon est le meme que celui de l'ancien onboarding (Draft).
 *  - etapeNeuf connue : on reprend a cet ecran ; apres la fin du bloc « Ton plan » (filtre, demo, preuve),
 *    on reprend au filtre ; le chargement se refait (l'enregistrement final est sans doublon).
 *  - seulement une page de l'ancien onboarding (0 a 22) : a l'ecran Prenom, avec les reponses deja donnees.
 *  - rien : l'entree.
 */
export function etapeDeReprise(b: { page?: number | null; etapeNeuf?: string | null } | null | undefined): Etape {
  if (!b) return 'entree';
  const e = b.etapeNeuf;
  if (isEtape(e)) {
    if (e === 'entree') return 'entree';
    if (e === 'rattrapage' || e === 'paywall' || e === 'paywall1' || e === 'paywall2') return 'chargement';
    if (e === 'demo' || e === 'preuve') return 'filtre';
    return e;
  }
  const page = typeof b.page === 'number' ? b.page : 0;
  return page > 0 ? 'prenom' : 'entree';
}

// ===== Offre de rattrapage =====

export type EtatRattrapage = {
  /** l'offre a deja ete montree sur cet appareil (une seule fois par appareil) */
  dejaVue: boolean | null;
  /** la boutique est prete (isStoreReady) */
  storePret: boolean;
  plateforme: string;
  /** Android : l'option « rattrapage30 » existe dans le paquet annuel */
  optionAndroid: boolean;
  /** iPhone : le code d'offre YOROI30 a ete cree dans App Store Connect (lib/v2/premium/rattrapage.ts) */
  codeIos: boolean;
  /** apercu du Studio : l'offre se montre toujours, aucun achat */
  apercu: boolean;
};

/**
 * L'offre ne se montre que si le store peut vraiment la vendre (sinon fermer le paywall ferme pour de bon) :
 * jamais vue sur cet appareil, boutique prete, et l'offre existe (Android : l'option du forfait annuel ;
 * iPhone : le code d'offre cree). En apercu du Studio, elle se montre pour etre vue.
 */
export function rattrapageVisible(e: EtatRattrapage): boolean {
  if (e.apercu) return true;
  if (e.dejaVue !== false) return false;
  if (!e.storePret) return false;
  if (e.plateforme === 'android') return e.optionAndroid;
  if (e.plateforme === 'ios') return e.codeIos;
  return false;
}

// ===== Mesure =====

export type { TempsEcran } from '@/lib/v2/onboarding/interrupteur';

/** Le temps passe sur un ecran, en tranche (jamais la duree exacte) */
export function trancheTemps(ms: number): TempsEcran {
  const s = ms / 1000;
  if (s < 3) return '0_3';
  if (s < 10) return '3_10';
  if (s < 30) return '10_30';
  return '30_plus';
}

/** Le nom de chaque ecran dans la mesure (liste fermee de utils/telemetry.ts, EtapeOnboarding) */
export const ETAPE_MESURE = {
  entree: 'entree', ancienneApp: 'ancienne_app', prenom: 'prenom', genre: 'toi', age: 'age', source: 'source', interlude: 'interlude',
  objectif: 'objectif', sport: 'sport', poids: 'poids', taille: 'taille', cap: 'cap', jours: 'rythme', univers: 'univers',
  rappels: 'rappels', rappelsRefus: 'rappels_refus', sante: 'sante', filtre: 'filtre', demo: 'demo', preuve: 'preuve',
  chargement: 'chargement', paywall1: 'paywall_1', paywall2: 'paywall_2', paywall: 'paywall_3', rattrapage: 'rattrapage',
} as const satisfies Record<Etape, EtapeMesureNeuf>;

export { ORDRE_MESURE_NEUF } from '@/lib/v2/onboarding/interrupteur';
