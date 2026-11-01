/**
 * Fin de séance : abdos et cardio (26 octobre 2026). Pour le programme en cours, tu choisis ce que YOROI ajoute
 * a la fin de chaque jour de musculation : rien (par defaut), un exercice d'abdos, un bloc de marche inclinee
 * en zone 2, ou les deux, et la duree du cardio. Les seances de marche deja prevues par le programme
 * (seche, perte de poids...) peuvent aussi etre retirees.
 *
 * 30 octobre 2026 : la feuille a trois cases (Rien, Abdos, Cardio), Abdos et Cardio cochables ensemble ;
 * les deux cochés gardent la valeur « les_deux » (basculerCaseFin).
 *
 * Regles :
 *  - seulement les jours de musculation (pas les rounds, pas le cardio, pas les jours d'etirements tenus) ;
 *  - pas d'abdos ajoutes si le jour a deja un exercice ABDOS ; pas de cardio si le jour en a deja un ;
 *  - l'exercice d'abdos est un nom exact de constants/exerciseLibrary.ts, adapte ensuite a ton materiel
 *    comme les autres (perso.ts, jourPourToi) ;
 *  - le cardio reprend la structure CardioProgramme des jours de marche inclinee du catalogue.
 *
 * Bases (lib/v2/programmes/sources.ts) : vispute2011 (les abdos ne font pas fondre le ventre),
 * persinger2004 (zone 2 : tu peux parler), hofmann2014 (lacher les barres du tapis).
 *
 * Le choix est garde dans le programme en cours (suivi.ts, `fin`). Pour que la seance lancee le contienne
 * partout ou le jour sert (page, seance en direct, accueil), suivi.ts retient ici le choix du programme actif
 * a chaque lecture ou ecriture : un jour du catalogue qui appartient au programme actif recoit sa fin de seance.
 * Donnees pures, testees dans __tests__/unit/finSeance.test.ts.
 */
import { programmeParId } from './catalogue';
import type { CardioProgramme, ExoProgramme, JourProgramme, Materiel, Programme } from './types';
import type { ModuleId } from './modules';
import { cardioPrevu, estType, retenirTypeProgramme } from '@/lib/v2/seances/cardioJour';
import type { ChoixCardio } from '@/lib/v2/seances/cardioJour';
import type { TypeCardio } from '@/lib/v2/seances/cardioFin';

export type ChoixFin = 'rien' | 'abdos' | 'cardio' | 'les_deux';

export type FinSeance = {
  choix: ChoixFin;
  /** minutes du bloc cardio, une valeur de MINUTES_FIN */
  minutes: number;
  /** true : les seances de marche du programme sont retirees de la rotation */
  sansMarche?: boolean;
  /**
   * 30 octobre 2026 : le choix d'une seance precise (id du jour, aussi « @programme/séance » en semaine mixte et
   * les seances de la semaine B), a la place du choix pour toutes les seances.
   */
  parJour?: Record<string, ChoixFin>;
  /**
   * 1er novembre 2026 (Houari : « vérifie que l'app me demande ce que j'aime faire ») : combien de fois par semaine.
   * Absent : à chaque séance de musculation (les programmes d'avant se lisent à l'identique).
   */
  abdosParSemaine?: number;
  cardioParSemaine?: number;
  /** le cardio prévu par ton programme (marche inclinée, vélo...) ; absent : ton choix en séance, sinon ton habitude */
  cardioType?: TypeCardio;
  /**
   * Calculé à chaque lecture par suivi.ts (avecFrequences) : les séances de ta semaine qui reçoivent les abdos ou le
   * cardio quand tu ne les veux pas à chaque séance. Ton choix séance par séance (parJour) passe toujours avant.
   */
  parFrequence?: Record<string, ChoixFin>;
};

/** Une case de la feuille : Rien, Abdos, Cardio */
export type CaseFin = 'rien' | 'abdos' | 'cardio';

/**
 * 30 octobre 2026 (Houari : « supprime Les deux, je veux cocher Abdos et Cardio ensemble ») :
 * trois cases. Abdos et Cardio se cochent ensemble ; Rien décoche tout. La donnée gardée ne change pas :
 * Abdos et Cardio cochés s'enregistrent toujours « les_deux », et un ancien « les_deux » se lit Abdos + Cardio.
 */
export const CHOIX_FIN: { key: CaseFin; label: string; sous: string }[] = [
  { key: 'rien', label: 'Rien', sous: 'Le programme tel quel' },
  { key: 'abdos', label: 'Abdos', sous: 'Un exercice à la fin' },
  // 31 octobre 2026 : le type et la duree se choisissent en seance (lib/v2/seances/cardioJour.ts)
  { key: 'cardio', label: 'Cardio', sous: 'Au choix, en zone 2' },
];

/** Le choix enregistré, à partir des deux cases */
export function choixDepuisCases(abdos: boolean, cardio: boolean): ChoixFin {
  if (abdos && cardio) return 'les_deux';
  if (abdos) return 'abdos';
  if (cardio) return 'cardio';
  return 'rien';
}

/** Cette case est cochée pour ce choix (« les_deux » coche Abdos et Cardio) */
export function caseCochee(choix: ChoixFin, k: CaseFin): boolean {
  if (k === 'rien') return choix === 'rien';
  if (k === 'abdos') return choix === 'abdos' || choix === 'les_deux';
  return choix === 'cardio' || choix === 'les_deux';
}

/** Toucher une case : Rien décoche tout, Abdos et Cardio s'ajoutent ou se retirent */
export function basculerCaseFin(choix: ChoixFin, k: CaseFin): ChoixFin {
  if (k === 'rien') return 'rien';
  const abdos = caseCochee(choix, 'abdos');
  const cardio = caseCochee(choix, 'cardio');
  return k === 'abdos' ? choixDepuisCases(!abdos, cardio) : choixDepuisCases(abdos, !cardio);
}

/** 1er novembre 2026 : 10 et 45 min en plus, comme la feuille Ton cardio (les durées d'avant restent) */
export const MINUTES_FIN = [10, 15, 20, 30, 45] as const;

/** Combien de fois par semaine : 0 = à chaque séance */
export const FREQUENCES_ABDOS = [0, 2, 3] as const;
export const FREQUENCES_CARDIO = [0, 1, 2, 3] as const;

export const FIN_PAR_DEFAUT: FinSeance = { choix: 'rien', minutes: 30 };

/** Une consigne par duree : meme deroule que les jours de marche inclinee du catalogue */
const CONSIGNE_FIN: Record<number, string> = {
  10: '10 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
  15: '15 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
  20: '20 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
  30: '30 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
  45: '45 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
};

/** La note des etudes, une ligne */
export const NOTE_FIN = 'Les abdos renforcent ton tronc mais ne font pas fondre le ventre. La marche inclinée en zone 2 ajoute de la dépense avec peu de fatigue : tu dois pouvoir parler en phrases complètes.';
export const SOURCES_FIN = ['vispute2011', 'persinger2004', 'hofmann2014'];

const CHOIX_VALIDES: ChoixFin[] = ['rien', 'abdos', 'cardio', 'les_deux'];

/** La duree permise la plus proche */
export function minutesValides(m: unknown): number {
  const n = Number(m);
  if (!Number.isFinite(n) || n <= 0) return FIN_PAR_DEFAUT.minutes;
  // 1er novembre 2026 : ta durée habituelle (25, 40 min...) reste telle quelle, par pas de 5 jusqu'à 2 h
  if (Number.isInteger(n) && n % 5 === 0 && n >= 5 && n <= 120) return n;
  return MINUTES_FIN.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), MINUTES_FIN[0] as number);
}

/** Lecture tolerante (anciennes versions : rien d'enregistre) ; undefined si rien d'utile */
export function lireFinSeance(x: unknown): FinSeance | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Record<string, unknown>;
  const choix = CHOIX_VALIDES.includes(o.choix as ChoixFin) ? (o.choix as ChoixFin) : 'rien';
  const fin: FinSeance = { choix, minutes: minutesValides(o.minutes) };
  if (o.sansMarche === true) fin.sansMarche = true;
  if (o.parJour && typeof o.parJour === 'object') {
    const pj: Record<string, ChoixFin> = {};
    for (const [k, v] of Object.entries(o.parJour as Record<string, unknown>).slice(0, 60)) {
      if (k && k.length <= 200 && CHOIX_VALIDES.includes(v as ChoixFin)) pj[k] = v as ChoixFin;
    }
    if (Object.keys(pj).length) fin.parJour = pj;
  }
  // 1er novembre 2026 : fréquences et type du cardio, champs facultatifs lus strictement
  const fa = frequenceValide(o.abdosParSemaine);
  if (fa) fin.abdosParSemaine = fa;
  const fc = frequenceValide(o.cardioParSemaine);
  if (fc) fin.cardioParSemaine = fc;
  if (estType(o.cardioType)) fin.cardioType = o.cardioType;
  if (o.parFrequence && typeof o.parFrequence === 'object') {
    const pf: Record<string, ChoixFin> = {};
    for (const [k, v] of Object.entries(o.parFrequence as Record<string, unknown>).slice(0, 60)) {
      if (k && k.length <= 200 && CHOIX_VALIDES.includes(v as ChoixFin)) pf[k] = v as ChoixFin;
    }
    if (Object.keys(pf).length) fin.parFrequence = pf;
  }
  return fin;
}

/** Une fréquence par semaine entre 1 et 6 ; 0 ou illisible : à chaque séance (undefined) */
export function frequenceValide(x: unknown): number | undefined {
  const n = Number(x);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : undefined;
}

/** Le choix qui vaut pour cette seance : le sien s'il y en a un, sinon celui de toutes les seances */
export function choixDuJour(f: FinSeance | null | undefined, jourId: string): ChoixFin {
  if (!f) return 'rien';
  return f.parJour?.[jourId] ?? f.parFrequence?.[jourId] ?? f.choix;
}

/* ------------------------------------------------------------------------------------------------
 * 1er novembre 2026 : abdos et cardio 2 ou 3 fois par semaine, répartis dans ta semaine
 * ---------------------------------------------------------------------------------------------- */

/**
 * Les séances (ids) de ta semaine qui reçoivent un ajout `n` fois par semaine. `semaine` : les séances de
 * musculation de la semaine dans l'ordre des jours (un id peut revenir : un programme en rotation).
 * Réparties d'un bout à l'autre de la semaine (1re, 3e...), jamais plus de `n` fois quand c'est possible ;
 * si chaque séance revient plus de `n` fois, la première seule.
 */
export function seancesRepartees(semaine: readonly string[], n: number): Set<string> {
  const L = semaine.length;
  if (!L || n >= L) return new Set(semaine);
  const compte = new Map<string, number>();
  for (const id of semaine) compte.set(id, (compte.get(id) ?? 0) + 1);
  const pris = new Set<string>();
  let total = 0;
  const essayer = (pos: number) => {
    const id = semaine[pos];
    if (pris.has(id)) return;
    const c = compte.get(id) ?? 0;
    if (total + c <= n) {
      pris.add(id);
      total += c;
    }
  };
  for (let k = 0; k < n; k++) essayer(Math.floor((k * L) / n));
  for (let pos = 0; pos < L && total < n; pos++) essayer(pos);
  if (!pris.size) pris.add(semaine[0]);
  return pris;
}

/**
 * La fin de séance avec ses séances choisies par fréquence (parFrequence), recalculée à partir de ta semaine.
 * `soeurs` : séance B (semaine B, version B) vers sa séance A ; elle suit le même choix.
 * Sans fréquence, la fin revient telle quelle (sans parFrequence).
 */
export function avecFrequences(f: FinSeance, semaine: readonly string[], soeurs: Readonly<Record<string, string>> = {}): FinSeance {
  const { parFrequence: _pf, ...base } = f;
  const a = avecAbdos(base);
  const c = avecCardio(base);
  const nA = a ? base.abdosParSemaine : undefined;
  const nC = c ? base.cardioParSemaine : undefined;
  if ((!nA && !nC) || !semaine.length) return base;
  const avecA = nA ? seancesRepartees(semaine, nA) : null;
  const avecC = nC ? seancesRepartees(semaine, nC) : null;
  const pf: Record<string, ChoixFin> = {};
  for (const id of new Set(semaine)) {
    const ch = choixDepuisCases(a && (!avecA || avecA.has(id)), c && (!avecC || avecC.has(id)));
    if (ch !== base.choix) pf[id] = ch;
  }
  for (const [b, aId] of Object.entries(soeurs)) {
    if (pf[aId] && !semaine.includes(b)) pf[b] = pf[aId];
  }
  return Object.keys(pf).length ? { ...base, parFrequence: pf } : base;
}

/** Combien de séances de ta semaine reçoivent les abdos et le cardio (après fréquences et choix séance par séance) */
export function nombreDansLaSemaine(f: FinSeance | null | undefined, semaine: readonly string[]): { abdos: number; cardio: number } {
  let abdos = 0;
  let cardio = 0;
  for (const id of semaine) {
    const ch = choixDuJour(f, id);
    if (caseCochee(ch, 'abdos')) abdos++;
    if (caseCochee(ch, 'cardio')) cardio++;
  }
  return { abdos, cardio };
}

/** Une fin de seance qui ajoute quelque chose a au moins une seance */
export function finActive(f: FinSeance | null | undefined): boolean {
  return !!f && (f.choix !== 'rien' || Object.values(f.parJour ?? {}).some((c) => c !== 'rien'));
}

/** Le choix d'une seance change (null : elle reprend le choix de toutes les seances) */
export function avecChoixDuJour(f: FinSeance, jourId: string, choix: ChoixFin | null): FinSeance {
  const pj = { ...(f.parJour ?? {}) };
  if (choix === null || choix === f.choix) delete pj[jourId];
  else pj[jourId] = choix;
  const { parJour: _p, ...reste } = f;
  return Object.keys(pj).length ? { ...reste, parJour: pj } : reste;
}

export const avecAbdos = (f: FinSeance | null | undefined): boolean => !!f && (f.choix === 'abdos' || f.choix === 'les_deux');
export const avecCardio = (f: FinSeance | null | undefined): boolean => !!f && (f.choix === 'cardio' || f.choix === 'les_deux');

/** Un jour de musculation : des exercices a charge ou au poids du corps, ni rounds ni cardio */
export function estJourMuscu(j: Pick<JourProgramme, 'exos' | 'rounds' | 'cardio'>): boolean {
  return !j.rounds && !j.cardio && j.exos.some((e) => !e.secondes);
}

/** Les seances de marche du programme (jours de cardio « marche ») */
export function estJourMarche(j: Pick<JourProgramme, 'exos' | 'cardio'>): boolean {
  return !!j.cardio && j.cardio.sport === 'marche' && j.exos.length === 0;
}

export function aDesJoursMarche(p: Programme): boolean {
  return p.jours.some(estJourMarche) && p.jours.some((j) => !estJourMarche(j));
}

export function aDesJoursMuscu(p: Programme): boolean {
  return p.jours.some(estJourMuscu);
}

/** Ids des jours retires de la rotation (jamais tous les jours) */
export function joursRetires(p: Programme, f: FinSeance | null | undefined): string[] {
  if (!f?.sansMarche || !aDesJoursMarche(p)) return [];
  return p.jours.filter(estJourMarche).map((j) => j.id);
}

/** L'exercice d'abdos ajoute : poulie haute en salle, relevé de jambes au sol sinon */
export function exoAbdosFin(materiel: Materiel): ExoProgramme & ExoFin {
  if (materiel === 'salle') return { nom: 'Crunch Poulie Haute', muscle: 'ABDOS', series: 3, repsMin: 10, repsMax: 15, reposSec: 90, conseil: 'Enroule le buste vers le bassin, les hanches ne bougent pas.', fin: true };
  return { nom: 'Relevé de jambes (Sol)', muscle: 'ABDOS', series: 3, repsMin: 10, repsMax: 15, reposSec: 90, conseil: 'Bas du dos collé au sol, descends lentement.', poidsDuCorps: true, fin: true };
}

/**
 * 30 octobre 2026 : 2 exercices d'abdos a la fin (Houari : « 2 a 3 exercices ») : la planche, puis l'exercice
 * d'avant (poulie haute en salle, releve de jambes sinon). Noms exacts de constants/exerciseLibrary.ts.
 */
export function exosAbdosFin(materiel: Materiel): (ExoProgramme & ExoFin)[] {
  const planche: ExoProgramme & ExoFin = { nom: 'Gainage Planche', muscle: 'ABDOS', series: 3, repsMin: 30, repsMax: 45, reposSec: 60, secondes: true, poidsDuCorps: true, conseil: 'Corps gainé de la tête aux talons, le bassin ne tombe pas.', fin: true };
  return [planche, exoAbdosFin(materiel)];
}

export function cardioFin(minutes: number): CardioProgramme {
  const m = minutesValides(minutes);
  return { sport: 'marche', minutes: m, consigne: CONSIGNE_FIN[m] ?? CONSIGNE_MARCHE };
}

/**
 * 1er novembre 2026 (Houari : « les abdos reprennent les exercices habituels, y compris les supersets ») : tes abdos
 * habituels, retenus par lib/v2/seances/habitudesFin.ts (au moins 3 fois sur les 4 dernières semaines), avec leurs
 * liens (crunch puis roue). Rien de retenu : la planche et le crunch de toujours.
 */
let abdosHabituels: (ExoProgramme & ExoFin)[] | null = null;
export function retenirAbdosHabituels(exos: readonly ExoProgramme[] | null | undefined): void {
  abdosHabituels = exos && exos.length ? exos.map((e, i) => {
    const { enchaine, ...reste } = e;
    return { ...reste, ...(enchaine && i < exos.length - 1 ? { enchaine: true } : {}), fin: true as const };
  }) : null;
}
export const abdosRetenus = (): readonly (ExoProgramme & ExoFin)[] | null => abdosHabituels;
export function abdosDeFin(materiel: Materiel): (ExoProgramme & ExoFin)[] {
  return abdosHabituels ? abdosHabituels.map((e) => ({ ...e })) : exosAbdosFin(materiel);
}

/** Consigne d'un cardio choisi qui n'est pas une marche inclinee de 15, 20 ou 30 min */
const CONSIGNE_MARCHE = 'Marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.';
const CONSIGNE_AUTRE = 'Juste après la musculation, en zone 2 : tu peux encore parler en phrases complètes.';

/**
 * 31 octobre 2026 (Houari : « si j'ai fait du vélo, je veux qu'elle annonce le vélo ») : le cardio de ce jour tel que
 * tu l'as choisi (type et duree), sinon la marche inclinee du programme.
 */
export function cardioFinChoisi(c: ChoixCardio): CardioProgramme {
  if (c.type === 'marche_inclinee') return CONSIGNE_FIN[c.minutes] ? cardioFin(c.minutes) : { sport: 'marche', minutes: c.minutes, consigne: CONSIGNE_MARCHE };
  return { sport: 'cardio', minutes: c.minutes, consigne: CONSIGNE_AUTRE };
}

/** Marque d'un exercice ajoute par la fin de seance */
export type ExoFin = { fin?: true };

/** Le jour avec sa fin de seance : `finCardio` (bloc apres la musculation), `finFaite` (deja calcule) */
export type AvecFin = { finCardio?: CardioProgramme; finCardioType?: TypeCardio; finFaite?: true };

/**
 * `modules` et `programme` : 26 octobre 2026, lib/v2/programmes/modules.ts (force, grip, cou, mobilite).
 * Absents, seule la fin de seance s'applique.
 */
export type ContexteFin = { fin: FinSeance | null | undefined; materiel: Materiel; modules?: readonly ModuleId[]; programme?: Programme };

/**
 * Ajoute l'abdo et le cardio choisis a un jour de musculation. Le jour garde ses exercices dans l'ordre
 * (les remplacements par case restent justes) ; l'abdo vient en dernier.
 */
export function avecFinSeance<J extends JourProgramme>(jour: J, ctx: ContexteFin | null | undefined): J & AvecFin {
  const j = jour as J & AvecFin;
  if (j.finFaite) return j;
  const fin = ctx?.fin;
  // 30 octobre 2026 : le choix de cette seance, sinon celui de toutes les seances
  const f = fin ? { ...fin, choix: choixDuJour(fin, jour.id) } : fin;
  if (!f || f.choix === 'rien' || !estJourMuscu(jour)) return j;
  let exos = jour.exos as (ExoProgramme & ExoFin)[];
  // pas d'abdos si la seance en a deja, jamais deux fois le meme exercice
  if (avecAbdos(f) && !jour.exos.some((e) => e.muscle === 'ABDOS')) {
    const deja = new Set(jour.exos.map((e) => e.nom));
    exos = [...exos, ...abdosDeFin(ctx!.materiel).filter((e) => !deja.has(e.nom))];
  }
  const ajout: AvecFin = { finFaite: true };
  if (avecCardio(f) && !jour.cardio) {
    // le cardio choisi pour ce jour du programme (cle « programme|jour », comme la seance en direct)
    // 1er novembre 2026 : le type prévu par ton programme, sinon ton habitude (cardioJour.ts)
    const choix = cardioPrevu(ctx?.programme?.id, jour.id, minutesValides(f.minutes), f.cardioType);
    ajout.finCardio = cardioFinChoisi(choix);
    ajout.finCardioType = choix.type;
  }
  return { ...jour, exos, ...ajout } as J & AvecFin;
}

/* ------------------------------------------------------------------------------------------------
 * Le choix du programme actif, retenu par suivi.ts a chaque lecture et ecriture.
 * ---------------------------------------------------------------------------------------------- */
let actif: { id: string; fin?: FinSeance; modules?: readonly ModuleId[] } | null = null;

/**
 * 28 octobre 2026 : les séances d'autres programmes posées dans ta semaine (semaineLibre.ts, id « @programme/séance »).
 * Elles font partie de ton programme : ta fin de séance et tes modules s'y appliquent aussi.
 */
const joursAutres = new WeakSet<JourProgramme>();
export function retenirJourAutre(j: JourProgramme): void {
  joursAutres.add(j);
}
const estAutre = (j: JourProgramme): boolean => typeof j.id === 'string' && j.id.startsWith('@') && joursAutres.has(j);

/** 26 octobre 2026 : les modules (force, grip, cou, mobilite) du programme actif sont retenus avec la fin de seance */
export function retenirFinActive(id: string | null, fin?: FinSeance, modules?: readonly ModuleId[]): void {
  actif = id ? { id, fin, ...(modules?.length ? { modules: [...modules] } : {}) } : null;
  // 1er novembre 2026 : le cardio prévu par ton programme, pour les écrans qui annoncent la séance
  retenirTypeProgramme(id, fin?.cardioType);
}

/**
 * La fin de seance et les modules qui s'appliquent a ce jour : ceux du programme actif, si le jour en fait partie.
 * Le contexte porte aussi le programme (lib/v2/programmes/modules.ts alterne les seances de grip et de cou).
 */
export function contexteFinPour(jour: JourProgramme): ContexteFin | null {
  const finUtile = finActive(actif?.fin);
  if (!actif || (!finUtile && !actif.modules?.length)) return null;
  const p = programmeParId(actif.id);
  if (!p || !(p.jours.includes(jour) || estAutre(jour))) return null;
  return { fin: finUtile ? actif.fin : undefined, materiel: p.materiel, ...(actif.modules?.length ? { modules: actif.modules } : {}), programme: p };
}

/**
 * Un contexte donne sans modules (page du programme : { fin, materiel }) recoit les modules du programme actif,
 * si le jour en fait partie. null reste null : aucune fin, aucun module.
 */
export function completerContexte(jour: JourProgramme, ctx: ContexteFin | null): ContexteFin | null {
  if (!ctx || ctx.modules !== undefined || !actif?.modules?.length) return ctx;
  const p = programmeParId(actif.id);
  if (!p || !(p.jours.some((j) => j === jour || j.id === jour.id) || estAutre(jour)) || (ctx.programme && ctx.programme.id !== p.id)) return ctx;
  return { ...ctx, modules: actif.modules, programme: ctx.programme ?? p };
}

/** « Abdos, puis 30 min de cardio » : ce que tu as choisi, en clair (texte francais a traduire) */
export function resumeFin(f: FinSeance | null | undefined): { cle: string; minutes?: number } {
  if (!f || f.choix === 'rien') return { cle: 'Rien d’ajouté' };
  if (f.choix === 'abdos') return { cle: 'Un exercice d’abdos à la fin' };
  // 31 octobre 2026 : le type se choisit en seance, ce resume ne dit donc pas « marche »
  if (f.choix === 'cardio') return { cle: '{0} min de cardio à la fin', minutes: f.minutes };
  return { cle: 'Abdos, puis {0} min de cardio', minutes: f.minutes };
}
