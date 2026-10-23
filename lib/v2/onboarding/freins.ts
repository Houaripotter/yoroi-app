/**
 * Ecran « Qu'est-ce qui t'a freine jusqu'ici ? » (vague 27) et l'affirmation qui suit.
 * La reponse est gardee dans l'espace (espace.freins) et choisit ensuite les conseils du jour de l'accueil
 * (lib/v2/accueil/conseil.ts). Aucun chiffre, aucune etude citee : seulement ce que fait vraiment l'app.
 */
import type { Frein } from './draft';
import { traduire } from '@/lib/i18n/tr';

export type FreinDef = { id: Frein; label: string; seau: 'sablier' | 'sentier' | 'flamme' | 'bandes' | 'boussole' | 'poing' };

export const FREINS: FreinDef[] = [
  { id: 'regularite', label: traduire('Je manque de régularité'), seau: 'sablier' },
  { id: 'progres', label: traduire('Je ne vois pas mes progrès'), seau: 'sentier' },
  { id: 'motivation', label: traduire('Je perds la motivation'), seau: 'flamme' },
  { id: 'blessures', label: 'Je me blesse souvent', seau: 'bandes' },
  { id: 'programme', label: traduire('Je ne sais pas quoi faire'), seau: 'boussole' },
  { id: 'rien', label: traduire('Rien de tout ça'), seau: 'poing' },
];

/** texte : les mots ou phrases cles sont entre ** (gras et en couleur a l'ecran, vague 29) */
export type Affirmation = { titre: string; texte: string; points: string[] };

const AFFIRMATIONS: Record<Frein, Affirmation> = {
  regularite: {
    titre: traduire('Tu n’es pas un cas à part'),
    texte: traduire('C’est le cas de **beaucoup de sportifs**. La régularité **se construit semaine après semaine**, et **la voir aide à tenir**. C’est ce que fait YOROI.'),
    points: [traduire('Ta semaine de séances sous les yeux'), traduire('L’objectif que tu choisis, pas un autre'), traduire('Un rappel doux, seulement si tu le veux')],
  },
  progres: {
    titre: traduire('Tes progrès sont là'),
    texte: traduire('Ils se cachent **dans les détails**. Une pesée, une mensuration, une charge notée : mises bout à bout, elles **dessinent ta courbe**. YOROI **les garde pour toi**.'),
    points: [traduire('Ta tendance de poids, lissée jour après jour'), traduire('Tes mensurations et ta composition'), traduire('Tes records, tamponnés quand tu les bats')],
  },
  motivation: {
    titre: traduire('La motivation va et vient'),
    texte: traduire('Ce qui reste, c’est **ce que tu as déjà fait**. YOROI te le montre, pour que **les jours sans envie comptent quand même**.'),
    points: [traduire('Chaque séance notée reste dans ton historique'), traduire('Ta semaine et tes records à l’accueil'), traduire('Ton armure qui se forme dans le Dojo')],
  },
  blessures: {
    titre: traduire('Le repos fait partie du travail'),
    texte: traduire('Se blesser souvent, c’est souvent **en faire trop d’un coup**. YOROI t’aide à **garder un œil sur ta charge** et sur ton corps.'),
    points: [traduire('L’infirmerie pour noter tes blessures'), traduire('Ta récupération du jour avant de t’entraîner'), traduire('Tes séances et leur charge, semaine après semaine')],
  },
  programme: {
    titre: traduire('Pas besoin d’un plan parfait'),
    texte: traduire('Pour commencer, il suffit de **noter ce que tu fais**. YOROI garde **tes exercices et tes charges**, et **tu repars de là** la fois suivante.'),
    points: [traduire('Ta séance notée en quelques touches'), traduire('Le chrono pour tes rounds et tes repos'), traduire('Ton carnet pour tes techniques')],
  },
  rien: {
    titre: traduire('Rien ne t’arrête'),
    texte: traduire('**Tu sais où tu vas**. YOROI sera **ton carnet de bord**, tout au même endroit et sur ton téléphone.'),
    points: [traduire('Ton poids et tes mensurations'), traduire('Tes séances, tes chronos et tes records'), traduire('Tes compétitions et ta catégorie')],
  },
};

/** Le frein mis en avant : le premier choisi dans l'ordre de la liste, sinon « rien » */
export function freinPrincipal(freins: Frein[]): Frein {
  const order = FREINS.map((f) => f.id);
  const sorted = [...freins].filter((f) => f !== 'rien').sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return sorted[0] ?? 'rien';
}

export function affirmationOf(freins: Frein[]): Affirmation {
  return AFFIRMATIONS[freinPrincipal(freins)];
}

/**
 * Vague 48 (Houari : avec deux freins, l'affirmation ne parlait que du premier) : quand plusieurs freins sont choisis,
 * le texte les melange. Le titre suit le frein principal (le premier touche), une phrase relie les autres
 * (« Et tu n'es pas seul à ne pas voir tes progrès »), et la liste prend le point le plus parlant de chaque frein.
 */
type Melange = {
  /** texte court du frein principal, quand d'autres freins suivent */
  court: string;
  /** apres « tu n'es pas seul à » */
  lien: string;
  /** le point le plus parlant de ce frein */
  point: string;
};

const MELANGE: Record<Exclude<Frein, 'rien'>, Melange> = {
  regularite: {
    court: traduire('C’est le cas de **beaucoup de sportifs**. La régularité **se construit semaine après semaine**, et **la voir aide à tenir**.'),
    lien: traduire('manquer de régularité'),
    point: traduire('Ta semaine de séances sous les yeux'),
  },
  progres: {
    court: traduire('Ils se cachent **dans les détails** : une pesée, une mensuration, une charge notée. YOROI **les garde pour toi**.'),
    lien: traduire('ne pas voir tes progrès'),
    point: traduire('Ta tendance de poids, lissée jour après jour'),
  },
  motivation: {
    court: traduire('Ce qui reste, c’est **ce que tu as déjà fait**. YOROI te le montre, pour que **les jours sans envie comptent quand même**.'),
    lien: traduire('perdre la motivation'),
    point: traduire('Chaque séance notée reste dans ton historique'),
  },
  blessures: {
    court: traduire('Se blesser souvent, c’est souvent **en faire trop d’un coup**. YOROI t’aide à **garder un œil sur ta charge**.'),
    lien: traduire('te blesser souvent'),
    point: traduire('L’infirmerie pour noter tes blessures'),
  },
  programme: {
    court: traduire('Pour commencer, il suffit de **noter ce que tu fais**. YOROI garde **tes exercices et tes charges**.'),
    lien: traduire('ne pas savoir quoi faire'),
    point: traduire('Ta séance notée en quelques touches'),
  },
};

/** Un point de la liste, avec le frein dont il vient (sa couleur a l'ecran) */
export type PointFrein = { texte: string; frein: Frein };

export type AffirmationMelee = {
  /** freins choisis, dans l'ordre ou ils ont ete touches (« rien » seul s'il est choisi) */
  freins: Frein[];
  principal: Frein;
  titre: string;
  texte: string;
  /** « Et tu n'es pas seul à **ne pas voir tes progrès**. », null avec un seul frein */
  lien: string | null;
  /** les autres freins, dans l'ordre de la phrase de lien (pour colorer chaque morceau) */
  autres: Frein[];
  points: PointFrein[];
};

/** « a », « a et b », « a, b et c » : chaque morceau entre ** pour le gras en couleur */
function liste(mots: string[]): string {
  const m = mots.map((x) => `**${x}**`);
  if (m.length <= 1) return m.join('');
  return traduire("{0} ni à {1}", m.slice(0, -1).join(', à '), m[m.length - 1]);
}

/**
 * L'affirmation de l'ecran qui suit les freins.
 *  - aucun frein ou « Rien de tout ça » : le texte positif neutre ;
 *  - un frein : son affirmation entiere, comme avant ;
 *  - plusieurs : titre du principal, son texte court, la phrase qui relie les autres, et un point par frein
 *    (complete par les points du principal pour en avoir au moins trois).
 */
export function affirmationMelee(freins: Frein[], genre: 'h' | 'f' | null = null): AffirmationMelee {
  const vus = freins.filter((f, i) => f !== 'rien' && isFrein(f) && freins.indexOf(f) === i) as Exclude<Frein, 'rien'>[];
  if (vus.length === 0) {
    const a = AFFIRMATIONS.rien;
    return { freins: ['rien'], principal: 'rien', titre: a.titre, texte: a.texte, lien: null, autres: [], points: a.points.map((texte) => ({ texte, frein: 'rien' as Frein })) };
  }
  const principal = vus[0];
  const a = AFFIRMATIONS[principal];
  if (vus.length === 1) {
    return { freins: vus, principal, titre: a.titre, texte: a.texte, lien: null, autres: [], points: a.points.map((texte) => ({ texte, frein: principal as Frein })) };
  }
  const autres = vus.slice(1);
  const seul = genre === 'f' ? 'seule' : 'seul';
  const lien = traduire("Et tu n’es pas {0} à {1}.", seul, liste(autres.map((f) => MELANGE[f].lien)));
  const points: PointFrein[] = vus.map((f) => ({ texte: MELANGE[f].point, frein: f }));
  for (const p of a.points) {
    if (points.length >= 3) break;
    if (!points.some((x) => x.texte === p)) points.push({ texte: p, frein: principal });
  }
  return { freins: vus, principal, titre: a.titre, texte: MELANGE[principal].court, lien, autres, points };
}

/** Choix multiple : « Rien de tout ça » est exclusif */
export function toggleFrein(list: Frein[], id: Frein): Frein[] {
  if (id === 'rien') return list.includes('rien') ? [] : ['rien'];
  const base = list.filter((f) => f !== 'rien');
  return base.includes(id) ? base.filter((f) => f !== id) : [...base, id];
}

export function isFrein(v: unknown): v is Frein {
  return typeof v === 'string' && FREINS.some((f) => f.id === v);
}
