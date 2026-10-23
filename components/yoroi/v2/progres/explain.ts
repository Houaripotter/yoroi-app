/**
 * Explications courtes de chaque donnee de Progres, affichees dans les ecrans de detail.
 * Des definitions, jamais de chiffre de population invente.
 */
import type { CompoKey } from '@/lib/v2/progres/composition';
import type { ViewKey } from '@/lib/v2/progres/measures';

export type Explain = { text: string; tip?: string };

export const WEIGHT_EXPLAIN: Explain = {
  text: 'Ton poids du jour bouge avec l’eau, les repas, le sel et le sommeil. La tendance lisse ces écarts sur plusieurs jours : c’est elle qui montre où tu vas.',
  tip: 'Pèse-toi le matin, à jeun, après être passé aux toilettes, quelques fois par semaine.',
};

export const COMPO_EXPLAIN: Record<CompoKey, Explain> = {
  fat: {
    text: 'La part de ton poids qui vient de la graisse. Ta balance l’estime en envoyant un très faible courant dans ton corps.',
    tip: 'La valeur change avec ton hydratation : compare-toi toujours dans les mêmes conditions, le matin à jeun.',
  },
  muscle: {
    text: 'La part de ton poids faite de muscle, estimée par ta balance. Elle monte quand tu prends du muscle, et aussi quand tu perds de la graisse.',
    tip: 'Regarde la tendance sur plusieurs semaines plutôt qu’une mesure isolée.',
  },
  water: {
    text: 'La part d’eau dans ton corps. Elle bouge vite selon ce que tu bois, ta sueur, tes repas et ton entraînement de la veille.',
    tip: 'Une variation d’un jour n’a pas de sens, la tendance oui.',
  },
  weight: WEIGHT_EXPLAIN,
  muscleKg: {
    text: 'Le poids de tes muscles en kilos, estimé par ta balance. C’est la donnée qui montre le mieux ce que tes séances construisent.',
    tip: 'Elle progresse lentement : juge-la sur un ou deux mois.',
  },
  bone: {
    text: 'Le poids estimé de ton squelette. Il change très peu au fil du temps : un écart vient surtout de la mesure elle-même.',
  },
  visceral: {
    text: 'La graisse logée autour des organes, dans le ventre. Ta balance la note sur une échelle de 1 à 59.',
    tip: 'Selon les fabricants de balances, un niveau jusqu’à 12 est considéré comme sain.',
  },
  metabolicAge: {
    text: 'Ta balance compare ton métabolisme de base à des repères par âge. C’est une estimation : plus elle est basse, mieux c’est.',
    tip: 'Utile surtout pour suivre ta tendance, pas comme une vérité au chiffre près.',
  },
  bmr: {
    text: 'L’énergie que ton corps dépense sur une journée au repos, juste pour fonctionner : respirer, garder sa température, réparer tes muscles.',
    tip: 'Elle grimpe avec la masse musculaire.',
  },
};

export const MEASURE_EXPLAIN: Record<ViewKey, Explain> = {
  shoulders: { text: 'Le tour d’épaules, mètre ruban passé sur la partie la plus large, bras le long du corps. Il grandit avec le dos et les épaules.' },
  chest: { text: 'Le tour de poitrine, à hauteur des pectoraux, en fin d’expiration normale. Il suit le travail du haut du corps.' },
  arm: { text: 'Le tour de bras, au plus large du biceps, bras détendu. Si tu mesures les deux bras, YOROI affiche leur moyenne.' },
  waist: {
    text: 'Le tour de taille, au niveau le plus fin du ventre. C’est un bon repère de la graisse du ventre.',
    tip: 'S’il baisse alors que ton poids reste stable, tu perds sans doute de la graisse au profit du muscle.',
  },
  navel: { text: 'Le tour de ventre au niveau du nombril, ventre détendu. Il réagit vite quand tu perds de la graisse.' },
  hips: { text: 'Le tour de hanches, au plus large des fessiers, pieds joints.' },
  thigh: { text: 'Le tour de cuisse, au plus large, jambe détendue. Si tu mesures les deux cuisses, YOROI affiche leur moyenne.' },
  calf: { text: 'Le tour de mollet, au plus large, debout. Si tu mesures les deux mollets, YOROI affiche leur moyenne.' },
  neck: { text: 'Le tour de cou, juste sous la pomme d’Adam. Il bouge peu, mais il aide à suivre la graisse du haut du corps.' },
};

export const MEASURE_TIP = 'Mesure le matin, toujours au même endroit, le ruban à plat sans serrer.';

export const FORCE_EXPLAIN: Explain = {
  text: 'Le maximum estimé est la charge que tu pourrais soulever une seule fois. YOROI le calcule par la formule d’Epley à partir de ta meilleure série du jour, sans que tu aies à tenter un vrai maximum.',
  tip: 'L’estimation est fiable jusqu’à une quinzaine de répétitions. Chaque nouveau maximum reçoit un tampon rouge.',
};
