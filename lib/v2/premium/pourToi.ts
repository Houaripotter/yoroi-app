/**
 * Ce que YOROI fait pour TOI (27 octobre 2026). Houari : « Le paywall, c'est le bordel. Mets surtout en avant ce que
 * YOROI lui apporte, à LUI, jette les choses inutiles, sois vraiment intelligent. » et « Il faut montrer ce que YOROI
 * va lui apporter pour qu'il paye ; si on ne lui apporte rien, ça ne sert à rien. »
 * Donnees pures, testees dans __tests__/unit/pourToiPaywall.test.ts :
 *  - cartesPremium : les cartes du carrousel du paywall, choisies et rangees selon TES reponses (objectif, poids de
 *    depart et vise, seances par semaine, sports). Chaque carte est un vrai contenu Premium du code :
 *      chemin    : courbes longues (PeriodSwitch, periode_longue) et previsions de poids (app/weight-predictions.tsx) ;
 *      rythme    : un rythme par sport et les objectifs dates (app/training-goals.tsx, objectifs_dates) ;
 *      progres   : progression des mouvements (progression_mouvements), mesures sur toute la duree (courbes),
 *                  photos sans limite (photos_limite, FREE_LIMITS.progressPhotos) ;
 *      nutrition : plan nutritionnel (app/nutrition-plan.tsx, plan_nutrition) ;
 *      combat    : analyse de combat, camp, coupe, competitions sans limite (combat-analytics, competition-camp, weight-cut).
 *    Une carte qui ne te concerne pas n'est pas montree (combat seulement si tu fais un sport de combat ou vises le combat,
 *    nutrition seulement avec un objectif de poids, rythme seulement avec un rythme choisi).
 *  - ceQueYoroiFait : la carte « Ce que YOROI va faire pour toi » de l'onboarding : 3 ou 4 choses concretes, les
 *    gratuites (le coach, la pesee, la semaine, les chronos) et UNE Premium, marquee comme telle.
 *  - regleePersonnage : quel personnage montrer (Houari : « arrête les costumes au hasard ») : celui que tu as choisi,
 *    Japon en tenue japonaise, Classique en tenue normale, rien sans personnage, et pour « autre », homme et femme
 *    en alternance.
 * Aucun chiffre invente : les seuls nombres sont les tiens (poids, seances) et les vraies regles du code
 * (+5 % du coach, lib/v2/programmes/progression.ts ; 1 semaine, 1 mois, 3 mois des previsions).
 */
import { traduire } from '@/lib/i18n/tr';
import { SPORTS } from '@/lib/sports';

const CATEGORIES_COMBAT = ['combat_grappling', 'combat_striking'];

/** Premier sport de combat parmi tes sports (meme regle que lib/v2/onboarding/save.ts, sans ses dependances) */
function combatSportOf(sports: string[]): string | null {
  return sports.find((id) => CATEGORIES_COMBAT.includes(SPORTS.find((s) => s.id === id)?.category ?? '')) ?? null;
}

export type ObjectifPour = 'lose' | 'gain' | 'combat' | 'maintain';

export type ProfilPourToi = {
  /** tous tes objectifs (un seul ou plusieurs) */
  objectifs: ObjectifPour[];
  /** ton poids de depart, deja formate (« 82 »), null s'il est inconnu */
  depuis: string | null;
  /** ton poids vise, deja formate (« 77 »), null sans poids vise ou en maintien */
  cible: string | null;
  /** seances par semaine choisies */
  seances: number | null;
  /** tes sports (identifiants de lib/sports.ts) */
  sports: string[];
};

export type IdCartePremium = 'chemin' | 'rythme' | 'progres' | 'nutrition' | 'combat';

export type CartePremiumTexte = { id: IdCartePremium; titre: string; texte: string; pastille: string | null };

/** Vrai si tu fais un sport de combat ou vises le combat */
export function faitDuCombat(p: Pick<ProfilPourToi, 'objectifs' | 'sports'>): boolean {
  return p.objectifs.includes('combat') || !!combatSportOf(p.sports ?? []);
}

/** Le sens de ton objectif de poids : perdre, prendre, garder, ou aucun */
export function sensPoids(objectifs: ObjectifPour[]): 'perdre' | 'prendre' | 'garder' | null {
  if (objectifs.includes('lose')) return 'perdre';
  if (objectifs.includes('gain')) return 'prendre';
  if (objectifs.includes('maintain')) return 'garder';
  return null;
}

/** Les cartes du carrousel, dans l'ordre qui te parle le plus. « chemin » est toujours la premiere. */
export function cartesPremium(p: ProfilPourToi): IdCartePremium[] {
  const sens = sensPoids(p.objectifs);
  const combat = faitDuCombat(p);
  const rythme = !!p.seances && p.seances > 0;
  let ordre: IdCartePremium[];
  if (p.objectifs[0] === 'combat' || (combat && !sens)) ordre = ['combat', 'progres', 'rythme', 'nutrition'];
  else if (sens === 'perdre') ordre = ['nutrition', 'progres', 'rythme', 'combat'];
  else if (sens === 'prendre') ordre = ['progres', 'nutrition', 'rythme', 'combat'];
  else if (sens === 'garder') ordre = ['rythme', 'progres', 'nutrition', 'combat'];
  else ordre = ['progres', 'rythme', 'combat', 'nutrition'];
  const garde = ordre.filter((id) => (id === 'combat' ? combat : id === 'nutrition' ? !!sens : id === 'rythme' ? rythme : true));
  return ['chemin', ...garde];
}

/** Les textes d'une carte, avec tes chiffres */
export function texteCarte(id: IdCartePremium, p: ProfilPourToi): CartePremiumTexte {
  const sens = sensPoids(p.objectifs);
  switch (id) {
    case 'chemin': {
      if (p.cible && sens !== 'garder') {
        return {
          id,
          titre: traduire('Ton chemin jusqu’à {0} kg, semaine après semaine', p.cible),
          texte: traduire('Ta courbe en entier et ton poids dans 1 semaine, 1 mois, 3 mois.'),
          pastille: p.depuis && p.depuis !== p.cible ? `${p.depuis} → ${p.cible} kg` : null,
        };
      }
      if (sens === 'garder') return { id, titre: traduire('Ton poids, mois après mois'), texte: traduire('6 mois, 1 an, tout ton historique : tu vois si ton poids tient.'), pastille: p.depuis ? traduire('{0} kg à garder', p.depuis) : null };
      return { id, titre: traduire('Ta courbe en entier'), texte: traduire('6 mois, 1 an, tout ton historique, et ton poids projeté.'), pastille: null };
    }
    case 'rythme': {
      const n = p.seances ?? 0;
      return {
        id,
        titre: n > 1 ? traduire('Tes {0} séances par semaine, sport par sport', n) : traduire('Ta séance de la semaine, sport par sport'),
        texte: traduire('Un rythme par sport, suivi chaque semaine, et un compte à rebours vers tes buts.'),
        pastille: null,
      };
    }
    case 'progres':
      return {
        id,
        titre: traduire('Tes progrès, visibles'),
        texte: traduire('Tes charges, tes mensurations sur toute la durée, des photos sans limite.'),
        pastille: null,
      };
    case 'nutrition':
      return {
        id,
        titre: traduire('Tes calories et tes macros, calculées pour toi'),
        texte: sens === 'perdre'
          ? traduire('Protéines, glucides et lipides chaque jour, pour perdre du poids.')
          : sens === 'prendre'
            ? traduire('Protéines, glucides et lipides chaque jour, pour prendre du muscle.')
            : traduire('Protéines, glucides et lipides chaque jour, pour garder ton poids.'),
        pastille: null,
      };
    case 'combat':
    default:
      return {
        id: 'combat',
        titre: traduire('Ton combat, jusqu’à la pesée'),
        texte: traduire('Tes rounds analysés, ton camp, ta coupe et toutes tes compétitions.'),
        pastille: null,
      };
  }
}

// ===== Onboarding : « Ce que YOROI va faire pour toi » =====

export type IdPourToi = 'coach' | 'pesee' | 'semaine' | 'combat' | 'premium';
export type ChosePourToi = { id: IdPourToi; titre: string; texte: string; premium: boolean };

/** 3 ou 4 choses concretes, les gratuites d'abord, puis UNE Premium (marquee comme telle) */
export function ceQueYoroiFait(p: ProfilPourToi): ChosePourToi[] {
  const sens = sensPoids(p.objectifs);
  const n = p.seances && p.seances > 0 ? p.seances : null;
  const out: ChosePourToi[] = [
    {
      id: 'coach',
      titre: traduire('Ton coach te dit quoi faire à chaque séance'),
      texte: traduire('Un programme sur tes jours, avec la charge de chaque exercice. Elle monte d’environ 5 % quand tes deux dernières séances sont réussies.'),
      premium: false,
    },
  ];
  if (p.depuis) {
    out.push({
      id: 'pesee',
      titre: p.cible && sens !== 'garder' ? traduire('Ta pesée en quelques secondes, ta tendance vers {0} kg', p.cible) : traduire('Ta pesée en quelques secondes, ta tendance jour après jour'),
      texte: traduire('Une courbe lissée : une pesée isolée ne t’inquiète plus.'),
      premium: false,
    });
  }
  if (faitDuCombat(p)) {
    out.push({ id: 'combat', titre: traduire('Tes rounds au chrono, tes compétitions à venir'), texte: traduire('Les chronos de combat et le suivi de ta prochaine compétition.'), premium: false });
  } else {
    out.push({
      id: 'semaine',
      titre: n ? (n > 1 ? traduire('Tes {0} séances suivies chaque semaine', n) : traduire('Ta séance suivie chaque semaine')) : traduire('Tes séances suivies chaque semaine'),
      texte: traduire('Ta semaine en couleurs, et ton Dojo qui avance à chaque séance.'),
      premium: false,
    });
  }
  const chemin = texteCarte('chemin', p);
  out.push({ id: 'premium', titre: traduire('Avec Premium : {0}', chemin.titre.replace(/^./, (x) => x.toLowerCase())), texte: chemin.texte, premium: true });
  return out.slice(0, 4);
}

// ===== Le personnage montre (paywall et onboarding) =====

export type RegleePersonnage =
  | { mode: 'aucun' }
  | { mode: 'fixe'; cle: string }
  /** genre « autre » : homme et femme de ton univers, en alternance */
  | { mode: 'alterne'; cles: [string, string] };

/**
 * Le personnage a montrer. Houari : « Arrête les costumes au hasard. Reste sur l'homme ou la femme qu'il a choisi.
 * S'il a choisi l'univers Japon, une tenue japonaise ; normal, normal ; sans personnage, rien ; autre, homme et femme
 * en alternance, ou rien. »
 *  - univers : celui de l'onboarding (prioritaire) ; dans l'app, celui deduit de ton personnage ;
 *  - personnage : ta cle actuelle dans l'app (null a l'onboarding : on prend la tenue de base de l'univers).
 */
export function regleePersonnage(opts: { univers: 'japon' | 'classique' | 'aucun'; genre: 'h' | 'f'; autre: boolean; personnage?: string | null }): RegleePersonnage {
  const { univers, genre, autre, personnage } = opts;
  if (univers === 'aucun') return { mode: 'aucun' };
  const base = univers === 'classique' ? 'classique' : 'guerrier';
  const deBase = !personnage || personnage === `${base}_h` || personnage === `${base}_f`;
  // ton propre personnage (un pack que tu as choisi dans l'app) reste le tien
  if (!deBase) return { mode: 'fixe', cle: personnage as string };
  if (autre) return { mode: 'alterne', cles: [`${base}_${genre}`, `${base}_${genre === 'f' ? 'h' : 'f'}`] };
  return { mode: 'fixe', cle: `${base}_${genre}` };
}
