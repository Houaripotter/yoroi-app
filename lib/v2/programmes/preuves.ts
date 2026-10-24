/**
 * Ce que disent les études (24 octobre 2026). Houari : « ajoute les meilleurs exercices, avec les sources,
 * les études ». Pour un exercice, une phrase simple sur ce qu'une étude a mesuré, et la référence.
 * Uniquement des études retrouvées et vérifiées (auteurs, année, revue) : études de suivi sur plusieurs
 * semaines avec mesure du muscle (échographie ou IRM), pas de simples mesures d'activité électrique.
 * Pas de preuve = pas de phrase : on ne prétend rien pour les exercices sans étude solide.
 * Données pures, testées dans __tests__/unit/preuves.test.ts.
 */

export type Preuve = { texte: string; source: string };

const LATERALES: Preuve = {
  texte: 'En 8 semaines, le muscle du côté de l’épaule a épaissi de 3 à 5 %, avec des haltères comme avec une poulie.',
  source: 'Larsen, Wolf, Schoenfeld et coll., Frontiers in Physiology, 2025',
};
const INCLINE: Preuve = {
  texte: 'Le développé incliné a davantage développé le haut des pectoraux que le développé à plat, en 8 semaines.',
  source: 'Chaves et coll., International Journal of Exercise Science, 2020',
};
const COUCHE_POMPES: Preuve = {
  texte: 'Avec une charge légère, le développé couché et les pompes ont fait grossir les pectoraux autant l’un que l’autre en 8 semaines.',
  source: 'Kikuchi et Nakazato, Journal of Exercise Science & Fitness, 2017',
};
const TRICEPS_TETE: Preuve = {
  texte: 'Bras au-dessus de la tête, les triceps ont grossi de 20 % en 12 semaines, contre 14 % bras le long du corps.',
  source: 'Maeo et coll., European Journal of Sport Science, 2023',
};
const ISCHIOS_ASSIS: Preuve = {
  texte: 'Assis, l’arrière des cuisses a grossi de 14 % en 12 semaines, contre 9 % allongé sur le ventre.',
  source: 'Maeo et coll., Medicine & Science in Sports & Exercise, 2021',
};
const HIP_THRUST: Preuve = {
  texte: 'Le hip thrust a développé les fessiers autant que le squat en 9 semaines, mesuré à l’IRM.',
  source: 'Plotkin, Rodas, Vigotsky et coll., Frontiers in Physiology, 2023',
};
const SQUAT_COMPLET: Preuve = {
  texte: 'Descendre bas compte : le squat complet a fait grossir les fessiers de 6,7 %, contre 2,2 % pour le demi-squat, en 10 semaines.',
  source: 'Kubo, Ikebukuro et Yata, European Journal of Applied Physiology, 2019',
};
const MOLLETS_DEBOUT: Preuve = {
  texte: 'Jambes tendues, les mollets ont grossi de 9 à 12 % en 12 semaines. Assis, presque rien pour cette partie du mollet.',
  source: 'Kinoshita, Maeo et coll., Frontiers in Physiology, 2023',
};

export const PREUVES: Record<string, Preuve> = {
  'Élévations Latérales (Haltères)': LATERALES,
  'Élévations Latérales (Poulie)': LATERALES,
  'Développé Incliné (Haltères)': INCLINE,
  'Développé Incliné (Barre)': INCLINE,
  'Développé Couché (Barre)': COUCHE_POMPES,
  'Pompes (Poids du corps)': COUCHE_POMPES,
  'Curl Larry Scott (Pupitre)': {
    texte: 'Insister en bas du mouvement, bras presque tendus, a fait grossir les biceps de 9 % en 5 semaines, contre 3 % en ne travaillant que le haut.',
    source: 'Sato, Yoshida, Kiyono et coll., Frontiers in Physiology, 2021',
  },
  'Overhead Extension Poulie': TRICEPS_TETE,
  'Extension Haltère Nuque (2 mains)': TRICEPS_TETE,
  'Extension Haltère Nuque': TRICEPS_TETE,
  'Overhead Triceps Extension': TRICEPS_TETE,
  'Cable Overhead Extension': TRICEPS_TETE,
  'Extension Triceps Poulie (Corde)': {
    texte: 'Efficace (+14 % en 12 semaines), mais moins que la version bras au-dessus de la tête : idéal en deuxième exercice.',
    source: 'Maeo et coll., European Journal of Sport Science, 2023',
  },
  'Leg Curl Assis': ISCHIOS_ASSIS,
  'Seated Leg Curl': ISCHIOS_ASSIS,
  Hyperextensions: {
    texte: 'L’extension de hanche à 45° a fait grossir le muscle de l’arrière de la cuisse plus que le Nordic curl, en 10 semaines.',
    source: 'Bourne, Duhig, Timmins et coll., British Journal of Sports Medicine, 2017',
  },
  'Nordic Curl': {
    texte: 'Le Nordic curl a allongé les fibres de l’arrière de la cuisse en 10 semaines, ce qui aide à les protéger des déchirures.',
    source: 'Bourne, Duhig, Timmins et coll., British Journal of Sports Medicine, 2017',
  },
  'Hip Thrust Barre': HIP_THRUST,
  'Hip Thrust Machine': HIP_THRUST,
  'Squat Barre Libre': SQUAT_COMPLET,
  'Goblet Squat': SQUAT_COMPLET,
  'Leg Extension': {
    texte: 'Le leg extension a fait grossir le muscle du milieu de la cuisse (droit fémoral), que le squat ne développait pas, en 5 semaines.',
    source: 'Zabaleta-Korta et coll., Journal of Sports Sciences, 2021',
  },
  'Mollets Debout (Machine)': MOLLETS_DEBOUT,
  'Mollets Assis (Machine)': {
    texte: 'Assis, on travaille surtout le muscle profond du mollet : à faire en plus du mollet debout, jamais seul.',
    source: 'Kinoshita, Maeo et coll., Frontiers in Physiology, 2023',
  },
  'Tirage Poitrine (Lat Pulldown)': {
    texte: 'Chez des débutants, le tirage vertical seul a fait grossir les biceps autant que des curls, en 10 semaines.',
    source: 'Gentil, Soares et Bottaro, Asian Journal of Sports Medicine, 2015',
  },
};

export const preuveDe = (nom: string | null | undefined): Preuve | null => (nom ? PREUVES[nom] ?? null : null);
