/**
 * Le coach du programme (25 octobre 2026, demandé par Houari) : chaque jour, YOROI te dit quoi faire et te
 * pousse à tenir. Tu choisis tes jours d'entraînement, le coach suit :
 *  - jour d'entraînement : la séance du jour, et un mot pour y aller ;
 *  - séance faite : bravo, et la prochaine ;
 *  - jour de repos : le repos fait aussi le muscle, et la prochaine ;
 *  - séance prévue ratée : on ne lâche pas, on rattrape ;
 *  - tout début : la première séance, la plus dure.
 * « Champion » ou « championne » selon ton profil. Données pures (texte déjà traduit), testées dans
 * __tests__/unit/coach.test.ts. Rien ne sort du téléphone.
 */
import { traduire } from '@/lib/i18n/tr';
import type { ProgrammeActif } from './suivi';
import type { Programme } from './types';

export type EtatCoach = 'debut' | 'aujourdhui' | 'fait' | 'repos' | 'rattrape';

export type MessageCoach = {
  etat: EtatCoach;
  /** « Aujourd’hui : Pousser A » */
  titre: string;
  /** le mot du coach */
  texte: string;
  /** « Prochaine séance : jeudi, Jambes A » (vide si rien) */
  ensuite: string;
  /** vrai si le bouton doit lancer la séance tout de suite */
  seanceDuJour: boolean;
};

const NOMS_JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** 0 = lundi */
export const indexJour = (d: Date): number => (d.getDay() + 6) % 7;

function jourLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const ajouter = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

/** Un message de la liste, qui change chaque jour (même jour, même message) */
function choisir<T>(liste: T[], graine: number): T {
  return liste[((graine % liste.length) + liste.length) % liste.length];
}

const graineDu = (d: Date): number => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

export function champion(femme: boolean): string {
  return femme ? traduire('championne') : traduire('champion');
}

const MOTS_JOUR = [
  'C’est jour d’entraînement. Tu as choisi ce jour : tiens parole. Allez, {0}, on y va.',
  'Ta séance t’attend. Les résultats viennent à ceux qui se présentent. Présente-toi, {0}.',
  'Pas besoin d’avoir envie. Il faut juste commencer, le reste suit. Go, {0}.',
  'Une séance de plus, c’est un pas de plus vers le corps que tu veux. À toi de jouer, {0}.',
  'La discipline, c’est faire ce que tu as prévu, même quand c’est dur. Aujourd’hui, tu le fais, {0}.',
];

const MOTS_FAIT = [
  'Séance faite. Tu as tenu parole aujourd’hui. Respect, {0}.',
  'C’est dans la boîte. Chaque séance faite te rapproche du résultat. Bravo, {0}.',
  'Bien joué, {0}. Repose-toi bien : demain, ton corps sera plus solide.',
  'Une de plus. C’est comme ça qu’on change un corps : une séance après l’autre.',
];

const MOTS_REPOS = [
  'Jour de repos. Le muscle grandit pendant le repos : dors bien, mange bien.',
  'Pas de séance aujourd’hui. Récupère, {0} : la prochaine sera encore meilleure.',
  'Repos mérité. Bois de l’eau, mange tes protéines, et reviens en forme à la prochaine.',
];

const MOTS_RATTRAPE = [
  'Ça arrive à tout le monde. Ce qui compte, c’est de revenir. Ceux qui lâchent ne voient jamais le résultat. Toi, tu ne lâches pas, {0}.',
  'Une séance ratée ne casse rien. Deux de suite, si. Reviens aujourd’hui, ne laisse pas l’excuse gagner.',
  'N’abandonne pas. Tu as commencé pour une raison : souviens-toi d’elle, et reviens aujourd’hui, {0}.',
  'Les faibles lâchent au premier raté. Pas toi. Une séance aujourd’hui, et c’est reparti, {0}.',
];

const MOTS_DEBUT = [
  'La première séance est la plus dure. Fais-la, et le reste suivra. Allez, {0}.',
  'Aujourd’hui, tu commences. Dans quelques semaines, tu verras la différence. Go, {0}.',
];

/** Les jours choisis (0 = lundi), triés et sans doublon, ou null s'il n'y en a pas */
export function joursValides(jours: readonly number[] | null | undefined): number[] | null {
  const ok = Array.from(new Set((jours ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b);
  return ok.length ? ok : null;
}

/** Le prochain jour d'entraînement à partir de demain (ou d'aujourd'hui si `inclus`) */
export function prochainJourPrevu(jours: number[], depuis: Date, inclus: boolean): Date {
  for (let k = inclus ? 0 : 1; k <= 7; k++) {
    const d = ajouter(depuis, k);
    if (jours.includes(indexJour(d))) return d;
  }
  return ajouter(depuis, 7);
}

/**
 * Le dernier jour prévu avant aujourd'hui (dans les 7 derniers jours, après le début du programme) resté
 * sans séance jusqu'à aujourd'hui : la séance a sauté
 */
export function seanceRatee(a: ProgrammeActif, jours: number[], aujourdhui: Date): boolean {
  const auj = jourLocal(aujourdhui);
  for (let k = 1; k <= 7; k++) {
    const d = ajouter(aujourdhui, -k);
    const iso = jourLocal(d);
    if (iso < a.debut) return false;
    if (!jours.includes(indexJour(d))) continue;
    // une séance faite ce jour-là ou depuis : rien n'a sauté
    return !a.faits.some((f) => f.date >= iso && f.date <= auj);
  }
  return false;
}

export function messageCoach(opts: {
  programme: Programme;
  actif: ProgrammeActif;
  /** tes jours d'entraînement (0 = lundi) */
  jours: number[];
  /** titre de la prochaine séance du programme (« Pousser A, force ») */
  prochaineSeance: string;
  femme: boolean;
  aujourdhui?: Date;
}): MessageCoach {
  const auj = opts.aujourdhui ?? new Date();
  const iso = jourLocal(auj);
  const g = graineDu(auj);
  const ch = champion(opts.femme);
  const jours = joursValides(opts.jours) ?? [0, 2, 4];
  const prevuAujourdhui = jours.includes(indexJour(auj));
  const faitAujourdhui = opts.actif.faits.some((f) => f.date === iso);
  const jamais = opts.actif.faits.filter((f) => f.date >= opts.actif.debut).length === 0;
  const seance = opts.prochaineSeance;

  const ensuiteLe = (d: Date) =>
    traduire('Prochaine séance : {0}, {1}.', jourLocal(d) === jourLocal(ajouter(auj, 1)) ? traduire('demain') : traduire(NOMS_JOURS[indexJour(d)]), seance);

  if (faitAujourdhui) {
    return { etat: 'fait', titre: traduire('Séance faite'), texte: traduire(choisir(MOTS_FAIT, g), ch), ensuite: ensuiteLe(prochainJourPrevu(jours, auj, false)), seanceDuJour: false };
  }
  if (jamais) {
    return { etat: 'debut', titre: traduire('Aujourd’hui : {0}', seance), texte: traduire(choisir(MOTS_DEBUT, g), ch), ensuite: '', seanceDuJour: true };
  }
  if (seanceRatee(opts.actif, jours, auj)) {
    return { etat: 'rattrape', titre: traduire('On rattrape aujourd’hui : {0}', seance), texte: traduire(choisir(MOTS_RATTRAPE, g), ch), ensuite: '', seanceDuJour: true };
  }
  if (prevuAujourdhui) {
    return { etat: 'aujourdhui', titre: traduire('Aujourd’hui : {0}', seance), texte: traduire(choisir(MOTS_JOUR, g), ch), ensuite: '', seanceDuJour: true };
  }
  return { etat: 'repos', titre: traduire('Jour de repos'), texte: traduire(choisir(MOTS_REPOS, g), ch), ensuite: ensuiteLe(prochainJourPrevu(jours, auj, false)), seanceDuJour: false };
}

const MOTS_APRES = [
  'Séance {0} de ton programme. Ceux qui lâchent ne voient jamais le résultat. Toi, tu le verras, {1}.',
  'Séance {0} de ton programme. Tu tiens parole, {1} : c’est ça, la discipline.',
  'Séance {0} de ton programme. Ne lâche rien, {1} : le corps suit toujours la régularité.',
];

/** Le mot du coach en fin de séance, avec le nombre de séances faites sur le programme */
export function motApresSeance(faites: number, femme: boolean, aujourdhui = new Date()): string {
  return traduire(choisir(MOTS_APRES, graineDu(aujourdhui) + faites), Math.max(1, faites), champion(femme));
}

/** Ce que le choix des jours donne, en une phrase */
export function conseilJours(prevus: number, choisis: number): string {
  if (choisis === 0) return traduire('Choisis au moins un jour.');
  if (choisis < prevus) return traduire('Prévu pour {0} jours. Avec {1}, les séances s’enchaînent dans l’ordre : le programme avance moins vite, mais il marche.', prevus, choisis);
  if (choisis > prevus) return traduire('Prévu pour {0} jours. {1}, c’est bien si tu récupères : le repos fait aussi le muscle.', prevus, choisis);
  return traduire('Parfait : {0} jours, comme prévu par le programme.', prevus);
}
