/**
 * Ligne directrice du poids (vague 32) : la bande verte qui part du debut de ton plan et va jusqu'au torii,
 * pose a ta date d'arrivee prevue sur la ligne de ton cap.
 * Fonctions pures, testees (__tests__/unit/ligneDirectrice.test.ts). Aucune date ni aucun chiffre invente :
 *  - debut du plan : la date et le poids de depart du profil (start_date, start_weight, poses a la creation
 *    de l'objectif) ; sans poids de depart, la premiere pesee a partir de cette date ; sans date, pas de bande ;
 *  - perte : rythme sain de 0,5 a 1 % du poids de depart par semaine (Helms et al. 2014) ;
 *  - prise : 0,25 a 0,5 % par semaine (Iraki et al. 2019) ;
 *  - la bande ne depasse jamais le cap : elle s'aplatit dessus ;
 *  - maintien ou recomposition : une bande a plus ou moins 1 % du poids de depart, sans torii.
 * Le torii : une date unique, le milieu de la fourchette de lib/v2/pesee/estimation.ts (rythme median),
 * calculee depuis le poids et la date de depart, puis memorisee. Elle ne bouge que si ta vraie tendance
 * (meme calcul que « A ce rythme », lib/v2/accueil/projection.ts) l'eloigne ou la rapproche d'au moins 7 jours.
 * Vague 33 (retours de Houari) :
 *  - le torii n'est JAMAIS dans le passe tant que le cap n'est pas atteint : date depassee, il se pose a la date
 *    de ta vraie tendance (et la fenetre le dit) ; tendance pas fiable, pas de torii, seulement la ligne du cap ;
 *  - cap atteint : le torii reste a ta vraie date d'arrivee (la premiere pesee au cap), en or ;
 *  - la bande va du debut du plan jusqu'au torii ACTUEL : une lentille qui part de toi et se referme sur lui.
 */
import { IMC_BAS, PERTE_MAX, PERTE_MIN, PRISE_MAX, PRISE_MIN, estimerArrivee, imcDe } from './estimation';
import { projection } from '@/lib/v2/accueil/projection';
import type { DayWeight } from '@/lib/v2/weightStats';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

/**
 * Tolerance autour de la bande, en kg : l'eau, le sel et le dernier repas font bouger la balance
 * de quelques centaines de grammes d'un jour a l'autre. En dessous de 0,3 kg d'ecart, tu restes « sur ta ligne ».
 */
export const TOLERANCE_KG = 0.3;
/** maintien et recomposition : plus ou moins 1 % du poids de depart */
export const MARGE_STABLE = 0.01;

export type ModeLigne = 'perte' | 'prise' | 'maintien' | 'recompo';
export type DepartPlan = { date: string; poids: number };
export type Ligne = { mode: ModeLigne; depart: DepartPlan; cap: number | null };

const ISO = /^\d{4}-\d{2}-\d{2}/;
const DAY = 86400000;
export const jourDe = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
const semaines = (from: string, to: string) => (jourDe(to) - jourDe(from)) / (7 * DAY);
const pad = (n: number) => String(n).padStart(2, '0');
export function isoDuTemps(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function ecartJours(a: string, b: string): number {
  return Math.round((jourDe(b) - jourDe(a)) / DAY);
}

/**
 * Debut du plan : date et poids reels, sinon la premiere pesee a partir de la date de creation de l'objectif.
 * null si rien n'est fiable (pas de date, date future ou illisible, aucun poids).
 */
export function departDuPlan(profil: { start_date?: string | null; start_weight?: number | null } | null | undefined, pesees: { date: string; value: number }[], today: string): DepartPlan | null {
  const d = profil?.start_date;
  if (!d || !ISO.test(d)) return null;
  const date = d.slice(0, 10);
  if (isNaN(jourDe(date)) || date > today) return null;
  const sw = profil?.start_weight;
  if (sw && sw > 20 && sw < 400) return { date, poids: sw };
  const premiere = pesees.find((p) => p.date.slice(0, 10) >= date && p.value > 0);
  return premiere ? { date: premiere.date.slice(0, 10), poids: premiere.value } : null;
}

/**
 * Le sens du plan : le profil (weight_goal) et tes objectifs d'onboarding (perdre et prendre du muscle a la fois :
 * recomposition), sinon la position du cap par rapport au depart.
 */
export function modeDuPlan(args: { depart: number; cap: number | null; weightGoal?: string | null; objectifs?: string[] | null }): ModeLigne {
  const o = args.objectifs ?? [];
  if (o.includes('lose') && o.includes('gain')) return 'recompo';
  if (args.weightGoal === 'maintain' && (args.cap == null || Math.abs(args.cap - args.depart) < 0.5)) return 'maintien';
  if (args.cap == null || Math.abs(args.cap - args.depart) < 0.2) return 'maintien';
  return args.cap < args.depart ? 'perte' : 'prise';
}

/** Ligne du plan, ou null si elle ne veut rien dire (perte ou prise sans cap dans le bon sens) */
export function creerLigne(depart: DepartPlan | null, cap: number | null, mode: ModeLigne): Ligne | null {
  if (!depart) return null;
  if (mode === 'perte' && !(cap != null && cap < depart.poids - 0.2)) return null;
  if (mode === 'prise' && !(cap != null && cap > depart.poids + 0.2)) return null;
  return { mode, depart, cap: mode === 'perte' || mode === 'prise' ? cap : null };
}

/** Rythmes de la bande, en part du poids de depart par semaine */
export function rythmesLigne(mode: ModeLigne): { lent: number; rapide: number } | null {
  if (mode === 'perte') return { lent: PERTE_MIN, rapide: PERTE_MAX };
  if (mode === 'prise') return { lent: PRISE_MIN, rapide: PRISE_MAX };
  return null;
}

export type Bornes = { haut: number; bas: number; milieu: number };

/**
 * Ouverture de la lentille (vague 33) : au depart, les deux bords partent a 2/3 et 4/3 du rythme qui arrive pile
 * au torii, les memes proportions que la fourchette saine de Helms (0,5 et 1 % autour de 0,75 %), puis ils se
 * referment sur le torii. Elle ne passe jamais de l'autre cote du cap.
 */
export const LENTILLE = 1 / 3;

/**
 * Forme de la trajectoire (vague 35, Houari : « une ligne qui suit la logique de la perte ou de la prise de poids,
 * pas une ligne droite »). Part du chemin faite a la part u du temps : rapide au debut, puis de plus en plus douce
 * pres du cap, comme une vraie perte de poids (Hall 2011 : la perte ralentit a mesure que le poids baisse).
 * En prise de masse, la courbe est plus reguliere (gain musculaire lent et stable, Iraki 2019).
 */
const COURBURE = { perte: 1.6, prise: 0.7 } as const;
export function partDuChemin(u: number, mode: ModeLigne): number {
  const x = Math.min(1, Math.max(0, u));
  const k = mode === 'perte' ? COURBURE.perte : mode === 'prise' ? COURBURE.prise : 0;
  if (k <= 0) return x;
  return (1 - Math.exp(-k * x)) / (1 - Math.exp(-k));
}

/** Le torii a-t-il un sens pour cette ligne (perte ou prise, date apres le depart) */
const toriiValide = (l: Ligne, torii?: string | null): torii is string =>
  !!torii && ISO.test(torii) && l.cap != null && (l.mode === 'perte' || l.mode === 'prise') && jourDe(torii) > jourDe(l.depart.date);

/**
 * Bornes de la bande a une date (null avant le debut du plan).
 * Avec un torii : la lentille du debut du plan jusqu'au torii, recalculee quand il bouge ; apres lui (cap atteint),
 * ton cap avec la marge d'un maintien. Sans torii : le rythme sain de 0,5 a 1 % (0,25 a 0,5 % en prise) par semaine.
 */
export function bornesA(l: Ligne, iso: string, torii?: string | null): Bornes | null {
  const w = semaines(l.depart.date, iso);
  if (w < 0) return null;
  const P = l.depart.poids;
  if (toriiValide(l, torii)) {
    const C = l.cap as number;
    const u = (jourDe(iso) - jourDe(l.depart.date)) / (jourDe(torii) - jourDe(l.depart.date));
    // courbe-pred : le jour du torii, la lentille est refermee pile sur ton cap (avant : deja la marge du maintien,
    // une pointe sous le torii) ; la marge du maintien commence le lendemain
    if (u > 1) return l.mode === 'perte' ? { haut: C, bas: C - P * MARGE_STABLE, milieu: C } : { haut: C + P * MARGE_STABLE, bas: C, milieu: C };
    const ouvre = LENTILLE * u * (1 - u);
    const f = partDuChemin(u, l.mode);
    const lent = P + (C - P) * Math.max(0, f - ouvre);
    const vite = P + (C - P) * Math.min(1, f + ouvre);
    const milieu = P + (C - P) * f;
    return l.mode === 'perte' ? { haut: lent, bas: vite, milieu } : { haut: vite, bas: lent, milieu };
  }
  const r = rythmesLigne(l.mode);
  if (!r || l.cap == null) {
    const haut = P * (1 + MARGE_STABLE);
    const bas = P * (1 - MARGE_STABLE);
    return { haut, bas, milieu: P };
  }
  const cap = l.cap;
  if (l.mode === 'perte') {
    const haut = Math.max(cap, P * (1 - r.lent * w));
    const bas = Math.max(cap, P * (1 - r.rapide * w));
    return { haut, bas, milieu: (haut + bas) / 2 };
  }
  const bas = Math.min(cap, P * (1 + r.lent * w));
  const haut = Math.min(cap, P * (1 + r.rapide * w));
  return { haut, bas, milieu: (haut + bas) / 2 };
}

/**
 * Ligne mediane en tirets : du poids de depart au cap, posee pile sur le torii, en courbe (partDuChemin).
 * Sans torii, le milieu de la bande.
 */
export function medianeA(l: Ligne, torii: string | null, iso: string): number | null {
  const b = bornesA(l, iso, torii);
  if (!b) return null;
  if (!torii || l.cap == null || torii <= l.depart.date) return b.milieu;
  const total = jourDe(torii) - jourDe(l.depart.date);
  const u = Math.min(1, Math.max(0, (jourDe(iso) - jourDe(l.depart.date)) / total));
  return l.depart.poids + (l.cap - l.depart.poids) * partDuChemin(u, l.mode);
}

/**
 * Courbe-pred (Houari : « la ligne verte et le torii doivent se toucher ») : le point ou finit ta ligne directrice.
 * C'est LE point du torii : sa date et ton cap. La courbe pose le pied du torii dessus, la montre et les widgets
 * annoncent cette date. null sans torii (maintien, recomposition, pas de date).
 */
export function finDeLigne(l: Ligne | null, torii: string | null | undefined): { date: string; poids: number } | null {
  if (!l || !toriiValide(l, torii)) return null;
  const date = (torii as string).slice(0, 10);
  const poids = medianeA(l, date, date);
  return poids == null ? null : { date, poids };
}

export type StatutId = 'avant' | 'sur' | 'lent' | 'vite' | 'dessus' | 'dessous';
export type Statut = { id: StatutId; label: string; ton: 'vert' | 'bleu' | 'orange' | 'gris' };

/**
 * Ou tu es par rapport a ta ligne ce jour-la.
 * Perte : au-dessus de la bande = plus lent (bleu), en dessous = plus vite que prevu (orange).
 * Prise : logique inversee. Maintien et recomposition : au-dessus ou en dessous, sans jugement (bleu).
 */
export function statutLigne(l: Ligne, iso: string, poids: number, torii?: string | null): Statut {
  const b = bornesA(l, iso, torii);
  if (!b) return { id: 'avant', label: traduire('Avant ton plan'), ton: 'gris' };
  const t = TOLERANCE_KG;
  if (l.mode === 'perte') {
    if (poids > b.haut + t) return { id: 'lent', label: traduire('Au-dessus de ton rythme prévu'), ton: 'bleu' };
    if (poids < b.bas - t) return { id: 'vite', label: traduire('Plus vite que prévu'), ton: 'orange' };
  } else if (l.mode === 'prise') {
    if (poids < b.bas - t) return { id: 'lent', label: traduire('En dessous de ton rythme prévu'), ton: 'bleu' };
    if (poids > b.haut + t) return { id: 'vite', label: traduire('Plus vite que prévu'), ton: 'orange' };
  } else {
    if (poids > b.haut + t) return { id: 'dessus', label: traduire('Au-dessus de ta zone de forme'), ton: 'bleu' };
    if (poids < b.bas - t) return { id: 'dessous', label: traduire('En dessous de ta zone de forme'), ton: 'bleu' };
    return { id: 'sur', label: traduire('Dans ta zone de forme'), ton: 'vert' };
  }
  return { id: 'sur', label: traduire('Sur ton rythme prévu'), ton: 'vert' };
}

/** Une phrase en morceaux : le morceau « cle » prend la couleur du statut */
export type PhraseStatut = { ton: Statut['ton']; avant: string; cle: string; apres: string };

const kgPhrase = (v: number) => `${(Math.round(Math.abs(v) * 10) / 10).toFixed(1).replace('.', DECIMAL)} kg`;

/**
 * Vague 42 (Houari : « on ne comprend pas énormément les choses ») : la pastille « Au-dessus de ta ligne » devient
 * une phrase de tous les jours, sous le grand chiffre. L'ecart est mesure a ta ligne en tirets (ton rythme prevu).
 *  - perte : « Tu es 0,7 kg au-dessus de ton rythme prévu » (bleu), « Pile sur ton rythme prévu » (vert),
 *    « Tu descends plus vite que prévu, ralentis un peu » (orange) ;
 *  - prise : la logique inverse (« en dessous », « Tu montes plus vite que prévu ») ;
 *  - maintien et recomposition : ta zone de forme.
 * passe : la pesee touchee au doigt (« Ce jour-là, tu étais… »).
 */
export function phraseStatut(l: Ligne, iso: string, poids: number, torii?: string | null, passe = false): PhraseStatut {
  const st = statutLigne(l, iso, poids, torii);
  const m = medianeA(l, torii ?? null, iso);
  const ecart = m == null ? 0 : poids - m;
  const tu = passe ? traduire('Ce jour-là, tu étais ') : traduire('Tu es ');
  if (st.id === 'avant') return { ton: 'gris', avant: passe ? traduire('Ce jour-là, ') : '', cle: passe ? 'avant le début de ton plan' : 'Avant le début de ton plan', apres: '' };
  if (l.mode === 'maintien' || l.mode === 'recompo') {
    if (st.id === 'sur') return { ton: 'vert', avant: passe ? traduire('Ce jour-là, ') : '', cle: passe ? 'dans ta zone de forme' : 'Dans ta zone de forme', apres: '' };
    return { ton: 'bleu', avant: tu, cle: `${kgPhrase(ecart)} ${ecart > 0 ? 'au-dessus' : 'en dessous'}`, apres: traduire(' de ton poids de forme') };
  }
  if (st.id === 'lent') return { ton: 'bleu', avant: tu, cle: `${kgPhrase(ecart)} ${l.mode === 'perte' ? 'au-dessus' : 'en dessous'}`, apres: traduire(' de ton rythme prévu') };
  if (st.id === 'vite') {
    const verbe = l.mode === 'perte' ? (passe ? traduire('Ce jour-là, tu descendais ') : traduire('Tu descends ')) : passe ? traduire('Ce jour-là, tu montais ') : traduire('Tu montes ');
    return { ton: 'orange', avant: verbe, cle: 'plus vite que prévu', apres: passe ? '' : traduire(', ralentis un peu') };
  }
  if (Math.abs(ecart) <= TOLERANCE_KG) return { ton: 'vert', avant: passe ? traduire('Ce jour-là, ') : '', cle: passe ? 'pile sur ton rythme prévu' : 'Pile sur ton rythme prévu', apres: '' };
  return { ton: 'vert', avant: passe ? traduire('Ce jour-là, ') : '', cle: passe ? 'sur ton rythme prévu' : 'Sur ton rythme prévu', apres: traduire(", à {0} près", kgPhrase(ecart)) };
}

/**
 * Vague 42 : la trajectoire est-elle deja au cap sur toute la periode (une ligne plate) ? Alors la courbe ne dessine
 * qu'une seule ligne « Cap 80 kg » au lieu de deux lignes qui se confondent.
 */
export function trajectoirePlate(valeurs: (number | null)[], cap: number, seuil = 0.15): boolean {
  const v = valeurs.filter((x): x is number => typeof x === 'number');
  return v.length > 0 && v.every((x) => Math.abs(x - cap) <= seuil);
}

/** Milieu de deux dates AAAA-MM-JJ */
export function milieuDe(a: string, b: string): string {
  return isoDuTemps((jourDe(a) + jourDe(b)) / 2);
}

const imcTropBas = (cap: number, heightCm?: number | null) => !!heightCm && heightCm >= 120 && heightCm <= 230 && imcDe(cap, heightCm) < IMC_BAS;

/**
 * Date d'arrivee prevue au debut du plan : le milieu de la fourchette (rythme median), calculee depuis
 * le poids et la date de depart. null pour un maintien, une recomposition, un IMC vise sous 18,5,
 * ou quand l'estimation ne donne pas de date (plus d'un an, deja atteint).
 */
export function dateArriveePlan(l: Ligne | null, opts: { heightCm?: number | null; sessions?: number | null } = {}): string | null {
  if (!l || l.cap == null || (l.mode !== 'perte' && l.mode !== 'prise')) return null;
  if (imcTropBas(l.cap, opts.heightCm)) return null;
  const e = estimerArrivee({ start: l.depart.poids, target: l.cap, sessions: opts.sessions ?? null, heightCm: opts.heightCm ?? null, today: l.depart.date });
  if (e.kind !== 'ok') return null;
  return milieuDe(e.earliest, e.latest);
}

/**
 * Date d'arrivee recalculee avec ta vraie tendance : le meme calcul que la ligne « A ce rythme »
 * (projection, qui s'appuie sur semainesAuRythme de lib/v2/pesee/estimation.ts).
 * null si la tendance n'est pas fiable, si le cap donne un IMC sous 18,5 ou s'il est trop loin.
 */
export function dateArriveeTendance(series: DayWeight[], cap: number | null, today: string, heightCm?: number | null): string | null {
  if (cap == null || cap <= 0 || imcTropBas(cap, heightCm)) return null;
  const p = projection(series, cap, today);
  return p?.kind === 'goal' ? p.date : null;
}

/**
 * Vague 35 (Houari : « le cap, c'est la trajectoire ») : le torii quand ta tendance n'est pas encore fiable.
 * La date de ton plan si elle est a venir ; sinon le meme rythme sain (milieu de la fourchette) qui repart
 * de ta derniere pesee aujourd'hui. null pour un maintien, une recomposition, ou sans estimation possible.
 */
export function toriiDeRepli(l: Ligne | null, datePlan: string | null, derniere: number | null, today: string, heightCm?: number | null): string | null {
  if (!l || l.cap == null || (l.mode !== 'perte' && l.mode !== 'prise')) return null;
  if (datePlan && ISO.test(datePlan) && datePlan > today) return datePlan;
  if (derniere == null || !(derniere > 0)) return null;
  return dateArriveePlan(creerLigne({ date: today, poids: derniere }, l.cap, l.mode), { heightCm: heightCm ?? null });
}

// ===== Le torii bouge =====

/** Ce qui est garde dans le telephone : le plan (depart et cap), la date du torii, la derniere fenetre */
/**
 * choisie (18 octobre, Houari : « pouvoir changer la date du cap ») : la date a ete choisie par toi (carte « Ton
 * objectif »). Elle ne bouge plus toute seule avec ta tendance, meme si ton debut ou ton objectif change ; seul un
 * cap atteint (ta vraie date, en or) ou une date passee la remplace. Meme stockage qu'avant (yoroi_torii_v1).
 */
export type MemoTorii = { cle: string; date: string; fenetreLe?: string | null; choisie?: boolean };
export type DecisionTorii = {
  /** ou poser le torii aujourd'hui (AAAA-MM-JJ), ou null : seulement la ligne du cap */
  date: string | null;
  /** cap atteint : le torii reste a ta vraie date d'arrivee, en or */
  atteint: boolean;
  fenetre: 'recule' | 'rapproche' | null;
  jours: number;
  /** ce qu'il faut garder dans le telephone (null : rien a garder) */
  memo: MemoTorii | null;
};

/** Ecart minimal pour deplacer le torii, en jours, et delai minimal entre deux fenetres */
export const ECART_TORII_JOURS = 7;
export const DELAI_FENETRE_JOURS = 7;
/** Un plan de moins de deux semaines garde sa date : ta tendance d'avant le plan ne dit rien de lui */
export const JOURS_AVANT_SUIVI = 14;

/** Un plan = un depart et un cap : la date est refixee quand l'objectif est cree ou change */
export function cleDuPlan(l: Ligne): string {
  return `${l.depart.date}|${l.depart.poids}|${l.cap ?? ''}`;
}

/**
 * Ta vraie date d'arrivee : la premiere pesee au cap depuis le debut du plan, si ta derniere pesee y est encore
 * (meme regle que la fin de pesee, a 50 g pres). null sinon.
 */
export function arriveeReelle(l: Ligne | null, pesees: { date: string; value: number }[]): string | null {
  if (!l || l.cap == null || (l.mode !== 'perte' && l.mode !== 'prise')) return null;
  const cap = l.cap;
  const ok = (v: number) => (l.mode === 'perte' ? v <= cap + 0.05 : v >= cap - 0.05);
  const last = pesees[pesees.length - 1];
  if (!last || !ok(last.value)) return null;
  const p = pesees.find((q) => q.date.slice(0, 10) >= l.depart.date && ok(q.value));
  return p ? p.date.slice(0, 10) : null;
}

/**
 * Le torii du jour.
 *  - cap atteint : il reste a ta vraie date d'arrivee, en or, sans fenetre ;
 *  - nouveau plan (ou plan change) : la date d'arrivee prevue au depart est memorisee ;
 *  - ensuite, chaque jour (des que le plan a deux semaines) : si ta vraie tendance la recule ou l'avance d'au moins
 *    7 jours, le torii se deplace a la nouvelle date et une fenetre le dit, au plus une fois par semaine ;
 *  - date depassee sans cap atteint : jamais de torii dans le passe, il se pose a la date de ta tendance
 *    (fenetre « recule », sauf si une fenetre a deja ete montree cette semaine) ; tendance pas fiable : pas de torii.
 * null s'il n'y a pas de torii du tout (pas de date au depart du plan).
 */
export function decisionTorii(
  memo: MemoTorii | null,
  plan: { cle: string; date: string | null; debut?: string | null },
  tendance: string | null,
  today: string,
  atteint: string | null = null,
): DecisionTorii | null {
  // 18 octobre : ta date du cap choisie a la main, encore a venir, reste a sa place (cle mise a jour sans la perdre)
  const choisie = memo && memo.choisie && ISO.test(memo.date) && memo.date.slice(0, 10) > today ? { ...memo, cle: plan.cle, date: memo.date.slice(0, 10) } : null;
  const garde = memo && memo.cle === plan.cle && ISO.test(memo.date) ? memo : null;
  if (atteint && ISO.test(atteint)) {
    return { date: atteint.slice(0, 10), atteint: true, fenetre: null, jours: 0, memo: choisie ?? garde ?? (plan.date ? { cle: plan.cle, date: plan.date, fenetreLe: null } : null) };
  }
  if (choisie) return { date: choisie.date, atteint: false, fenetre: null, jours: 0, memo: choisie };
  if (!plan.date) return null;
  const base: MemoTorii = garde ?? { cle: plan.cle, date: plan.date, fenetreLe: null };
  const passe = base.date < today;
  const rien = (date: string | null, jours = 0): DecisionTorii => ({ date, atteint: false, fenetre: null, jours, memo: base });
  const neuf = !garde && !!plan.debut && ISO.test(plan.debut) && ecartJours(plan.debut, today) < JOURS_AVANT_SUIVI;
  if (neuf) return rien(passe ? null : base.date);
  const tend = tendance && ISO.test(tendance) && tendance.slice(0, 10) > today ? tendance.slice(0, 10) : null;
  if (!tend) return rien(passe ? null : base.date);
  const jours = ecartJours(base.date, tend);
  if (!passe && Math.abs(jours) < ECART_TORII_JOURS) return rien(base.date, jours);
  const recent = base.fenetreLe && ISO.test(base.fenetreLe) ? ecartJours(base.fenetreLe, today) < DELAI_FENETRE_JOURS : false;
  // fenetre deja montree cette semaine : le torii attend, sauf s'il est passe (jamais dans le passe)
  if (recent && !passe) return rien(base.date, jours);
  const fenetre = recent ? null : jours > 0 ? 'recule' : 'rapproche';
  return { date: tend, atteint: false, fenetre, jours, memo: { cle: base.cle, date: tend, fenetreLe: fenetre ? today : base.fenetreLe ?? null } };
}

const MOIS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];
const MOIS_COURT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const num = (d: Date) => (d.getDate() === 1 ? '1er' : String(d.getDate()));

/** « 18 novembre », avec l'annee si elle change */
export function jourLong(iso: string, today: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${num(d)} ${MOIS[d.getMonth()]}${iso.slice(0, 4) !== today.slice(0, 4) ? ` ${d.getFullYear()}` : ''}`;
}

/** « 18 oct. » : la date en or sous le torii */
export function jourCourt(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${num(d)} ${MOIS_COURT[d.getMonth()]}`;
}

/** « du 8 au 29 novembre », « du 28 octobre au 18 novembre », avec l'annee si elle change */
export function duAu(earliest: string, latest: string, today: string): string {
  const a = new Date(`${earliest}T12:00:00`);
  const b = new Date(`${latest}T12:00:00`);
  const an = String(today).slice(0, 4);
  const anB = String(b.getFullYear()) !== an ? ` ${b.getFullYear()}` : '';
  const anA = a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : '';
  if (earliest === latest) return traduire("le {0} {1}{2}", num(b), MOIS[b.getMonth()], anB);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return traduire("du {0} au {1} {2}{3}", num(a), num(b), MOIS[b.getMonth()], anB);
  return traduire("du {0} {1}{2} au {3} {4}{5}", num(a), MOIS[a.getMonth()], anA, num(b), MOIS[b.getMonth()], anB);
}

const kg = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL));

/** Textes des deux fenetres in-app du torii */
export function texteFenetreTorii(kind: 'recule' | 'rapproche', date: string, cap: number, today: string): { titre: string; texte: string } {
  if (kind === 'recule') {
    return {
      titre: traduire('Ton torii a reculé de quelques jours'),
      texte: traduire("Ces deux dernières semaines, tu as avancé un peu moins vite. Rien de grave : ton arrivée est maintenant prévue le {0}. Ton cap reste {1} kg.", jourLong(date, today), kg(cap)),
    };
  }
  return {
    titre: traduire('Ton torii s’est rapproché'),
    texte: traduire("Belle régularité : ton arrivée est maintenant prévue le {0}. Ton cap reste {1} kg.", jourLong(date, today), kg(cap)),
  };
}
