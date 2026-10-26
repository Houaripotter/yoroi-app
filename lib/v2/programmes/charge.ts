/**
 * Quelle charge prendre (26 octobre 2026) : pour chaque exercice d'un programme, le nombre de series,
 * si c'est lourd, moyen ou leger, et combien de repetitions garder en reserve. Calcul pur, sans stockage.
 *
 * Bases (lib/v2/programmes/sources.ts) :
 *  - schoenfeld2017charges : charges legeres ou lourdes, autant de muscle si la serie finit pres de l'echec ;
 *    pour la force, le lourd gagne ;
 *  - acsm2026 : l'echec n'est pas necessaire, 2 a 3 series lourdes pour la force ;
 *  - acsm2009 : charge augmentee de 2 a 10 % quand tu depasses la cible deux seances de suite.
 * Toujours 1 a 3 repetitions en reserve, comme le principe RESERVE des programmes (catalogue.ts).
 */
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type NiveauCharge = 'tres_lourd' | 'lourd' | 'moyen' | 'leger' | 'corps' | 'tenu';

export type ExoPourCharge = { series: number; repsMin: number; repsMax: number; secondes?: boolean; poidsDuCorps?: boolean };

export type GuideCharge = {
  niveau: NiveauCharge;
  /** « lourd », « moyen »... ; vide pour le poids du corps et les exercices tenus */
  libelle: string;
  /** « 2 », « 1 à 2 », « 1 à 3 » : repetitions a garder en reserve */
  reserve: string;
  /** « 4 séries, lourd : 6 à 10 reps, 2 en réserve » */
  texte: string;
  /** pourquoi, en une phrase */
  pourquoi: string;
  /** ids de lib/v2/programmes/sources.ts */
  sources: string[];
};

/** Le niveau de charge d'apres le haut de la fourchette de repetitions */
export function niveauCharge(e: Pick<ExoPourCharge, 'repsMax' | 'secondes' | 'poidsDuCorps'>): NiveauCharge {
  if (e.secondes) return 'tenu';
  if (e.poidsDuCorps) return 'corps';
  const max = Number(e.repsMax) || 0;
  if (max <= 6) return 'tres_lourd';
  if (max <= 10) return 'lourd';
  if (max <= 15) return 'moyen';
  return 'leger';
}

const LIBELLE: Record<NiveauCharge, string> = {
  tres_lourd: 'très lourd',
  lourd: 'lourd',
  moyen: 'moyen',
  leger: 'léger',
  corps: '',
  tenu: '',
};

/** Toujours entre 1 et 3 : plus la charge est lourde, plus tu gardes de marge pour la technique */
const RESERVE: Record<NiveauCharge, string> = {
  tres_lourd: '2 à 3',
  lourd: '2',
  moyen: '1 à 3',
  leger: '1 à 2',
  corps: '1 à 3',
  tenu: '1 à 3',
};

const POURQUOI: Record<NiveauCharge, string> = {
  tres_lourd: 'Peu de répétitions avec une charge lourde : c’est ce qui fait le plus progresser en force. Garde de la marge pour que la technique reste propre.',
  lourd: 'Une charge lourde que tu contrôles : bon pour la force comme pour le muscle.',
  moyen: 'La zone classique pour le muscle : assez lourd pour progresser, assez de répétitions pour bien sentir le muscle.',
  leger: 'Plus léger avec plus de répétitions : autant de muscle qu’avec du lourd, à condition de finir la série près de l’échec.',
  corps: 'Au poids du corps : quand tu dépasses le haut de la fourchette, passe à une version plus difficile.',
  tenu: 'Exercice tenu : choisis une charge que tu tiens tout le temps indiqué, sans lâcher avant la fin.',
};

const SOURCES: Record<NiveauCharge, string[]> = {
  tres_lourd: ['acsm2026', 'schoenfeld2017charges'],
  lourd: ['schoenfeld2017charges', 'acsm2026'],
  moyen: ['acsm2009', 'schoenfeld2017charges'],
  leger: ['schoenfeld2017charges'],
  corps: ['acsm2009'],
  tenu: ['acsm2026'],
};

/** « 4 séries, lourd : 6 à 10 reps, 2 en réserve » */
export function guideCharge(e: ExoPourCharge): GuideCharge {
  const niveau = niveauCharge(e);
  const series = Math.max(1, Math.round(Number(e.series) || 1));
  const min = Math.round(Number(e.repsMin) || 0);
  const max = Math.max(min, Math.round(Number(e.repsMax) || 0));
  const fourchette = min === max ? `${max}` : traduire('{0} à {1}', min, max);
  const nbSeries = traduirePluriel(series, series > 1, '{0} série', '{0} séries', series);
  const reserve = RESERVE[niveau];
  const libelle = LIBELLE[niveau] ? traduire(LIBELLE[niveau]) : '';
  let texte: string;
  if (niveau === 'tenu') texte = traduire('{0}, tiens {1} secondes, garde de la marge', nbSeries, fourchette);
  else if (niveau === 'corps') texte = traduire('{0}, au poids du corps : {1} reps, {2} en réserve', nbSeries, fourchette, traduire(reserve));
  else texte = traduire('{0}, {1} : {2} reps, {3} en réserve', nbSeries, libelle, fourchette, traduire(reserve));
  return { niveau, libelle, reserve, texte, pourquoi: traduire(POURQUOI[niveau]), sources: SOURCES[niveau] };
}

/** « Comment choisir ta charge » : l'explication complete, une idee par ligne */
export const COMMENT_CHOISIR: { titre: string; texte: string }[] = [
  { titre: 'Lourd', texte: 'Tu fais les répétitions indiquées, mais pas plus de 1 ou 2 en plus. Si tu pourrais en faire bien plus, la charge est trop légère.' },
  { titre: 'Moyen', texte: 'Les dernières répétitions sont dures, il t’en reste 1 à 3 en réserve. La technique reste propre jusqu’au bout.' },
  { titre: 'Léger', texte: 'Beaucoup de répétitions : finis près de l’échec, sinon la série compte peu. Léger ou lourd, le muscle grossit autant si tu vas près de l’échec.' },
  { titre: 'Tu dépasses la fourchette ?', texte: 'Tu fais plus que le haut de la fourchette, deux séances de suite : ajoute un peu de poids la prochaine fois, environ 2 à 10 %.' },
  { titre: 'Tu n’atteins pas le bas ?', texte: 'Tu n’arrives pas au bas de la fourchette : enlève un peu de poids. Une charge bien faite vaut mieux qu’une charge trop lourde.' },
  { titre: 'Pas besoin d’aller à l’échec', texte: 'Garder 1 à 3 répétitions en réserve fait progresser autant, avec moins de fatigue et moins de risque.' },
];

export const SOURCES_COMMENT_CHOISIR = ['schoenfeld2017charges', 'acsm2026', 'acsm2009'];

/**
 * « Trouver ton poids de départ » (26 octobre 2026) : pour qui n'y connait rien, en quatre etapes courtes.
 * Meme regle que les programmes : 2 a 3 repetitions en reserve au debut (debutant-fullbody-3j), puis la
 * charge monte quand le haut de la fourchette est atteint sur toutes les series (PROGRESSION, catalogue.ts).
 * Honnete : au debut on juge mal la reserve (steele2017rir, halperin2022).
 */
export const POIDS_DE_DEPART: { titre: string; texte: string }[] = [
  { titre: 'Regarde la fourchette', texte: 'Le programme dit « 8 à 12 répétitions » ? Vise le haut : 12. À ta toute première séance, commence léger pour apprendre le geste.' },
  { titre: 'Garde 2 à 3 répétitions en réserve', texte: 'Ta bonne charge : tu fais les 12 proprement, et tu sens que tu en ferais encore 2 ou 3. Trop facile ? Ajoute un peu à la série suivante. La technique casse ? Enlève.' },
  { titre: 'Note et garde cette charge', texte: 'YOROI retient ta charge pour la prochaine séance. Ne monte pas tant que toutes les séries ne sont pas au haut de la fourchette.' },
  { titre: 'Monte quand tout est fait', texte: 'Haut de la fourchette sur toutes les séries, deux séances de suite : YOROI monte la charge d’environ 5 %. Au poids du corps, comme les tractions, passe à une version plus facile tant que tu n’atteins pas le bas : tirage à la poulie, pompes sur les genoux.' },
];

/** Bon a savoir, sous les etapes */
export const RESERVE_DEBUTANT = 'Au début, tu vas mal juger ce qu’il te reste : presque tout le monde pense être plus près de l’échec qu’en réalité. Ça s’améliore souvent avec la pratique, sans jamais être parfait. Pas grave : la progression corrige la charge séance après séance.';

export const SOURCES_POIDS_DE_DEPART = ['steele2017rir', 'halperin2022', 'acsm2009', 'refalo2023'];
