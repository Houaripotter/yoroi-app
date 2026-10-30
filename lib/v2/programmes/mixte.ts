/**
 * Ton programme mixte (30 octobre 2026). Houari : « Je veux faire du PPL et du Upper Lower ou du Full body, à ma
 * façon, et choisir si c'est habituel ou ponctuel. »
 *
 * Le parcours (app/programme-mixte.tsx) : tes jours par semaine, puis ta semaine composée jour par jour avec les
 * séances de la bibliothèque (Push, Pull, Legs, Upper, Lower, Full body, tes séances), puis :
 *  - « Habituel » : la semaine devient un programme à toi dans « Mes programmes » (monProgramme.ts) et ton
 *    programme en cours (suivi.ts, creerMixteHabituel), durée 8, 12 semaines ou sans fin.
 *  - « Ponctuel » : une semaine mixte posée PAR DESSUS ton programme en cours, du jour où tu la lances jusqu'à
 *    `jusquau` inclus (ProgrammeActif.ponctuel). Ton programme n'est pas remplacé : pendant ces jours, la séance du
 *    jour, la suite, les rappels et ta semaine suivent la semaine mixte ; après, ta semaine normale revient toute
 *    seule (rien n'est réécrit, la semaine mixte est simplement ignorée). « Annuler » la retire plus tôt.
 *    Sans programme en cours : la semaine mixte devient un programme temporaire (archivé, hors de « Mes
 *    programmes ») qui s'arrête tout seul après `jusquau` (ProgrammeActif.jusquau).
 * L'historique, les séances faites et la progression des charges (par nom d'exercice, progression.ts) ne bougent
 * jamais. Données pures ici, testées dans __tests__/unit/mixte.test.ts.
 */
import { PROGRAMMES } from './catalogue';
import { indexJour } from './coach';
import { couverture, lireSemaine, seancesDeLaLigne, seancesProposees, semaineUtile } from './semaineLibre';
import type { CaseSemaine, FamilleSeance, LigneSemaine, SemaineLibre } from './semaineLibre';
import type { Programme } from './types';

/** Le nom proposé (traduit à l'affichage) */
export const NOM_MIXTE = 'Mon mixte';
/** Les nombres de jours proposés */
export const JOURS_MIXTE = [2, 3, 4, 5, 6] as const;
/** Une semaine mixte ponctuelle dure au plus 8 semaines : au delà, c'est un programme habituel */
export const MAX_JOURS_PONCTUEL = 56;

/**
 * Un programme vide qui sert de base à la composition : toutes les séances viennent de « Autres séances »
 * (TesJours.tsx). Il n'est jamais enregistré.
 */
export const BASE_MIXTE: Programme = {
  id: 'mixte',
  titre: NOM_MIXTE,
  accroche: '',
  niveau: 'intermediaire',
  objectif: 'muscle',
  materiel: 'salle',
  joursParSemaine: 0,
  dureeMin: 0,
  semaines: 8,
  jours: [],
  principes: [],
  sources: [],
};

/**
 * La semaine proposée au départ, d'après tes jours (tu changes tout ensuite). Que des découpages déjà au catalogue :
 * 2 et 3 jours Full body ; 4 jours Push, Pull, Upper, Lower (« Push Pull + Upper Lower, 4 jours ») ; 5 jours Upper,
 * Lower, Push, Pull, Legs ; 6 jours la même chose avec un Upper de plus. Chaque groupe y revient au moins 2 fois,
 * sauf les jambes à 4 jours (dit honnêtement par la ligne « Ce que ta semaine travaille »).
 */
export const FAMILLES_PROPOSEES: Record<number, FamilleSeance[]> = {
  1: ['fullbody'],
  2: ['fullbody', 'fullbody'],
  3: ['fullbody', 'fullbody', 'fullbody'],
  4: ['push', 'pull', 'upper', 'lower'],
  5: ['upper', 'lower', 'push', 'pull', 'legs'],
  6: ['upper', 'lower', 'push', 'pull', 'legs', 'upper'],
};

const vide = (): CaseSemaine[] => [null, null, null, null, null, null, null];

/** Tes jours (0 = lundi) s'ils sont `n`, sinon `conseilles` */
export function joursPourMixte(n: number, connus: readonly number[] | null | undefined, conseilles: readonly number[]): number[] {
  const propres = Array.from(new Set((connus ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort((x, y) => x - y);
  return propres.length === n ? propres : [...conseilles].slice(0, n);
}

/** La semaine proposée : la k-ième séance d'une famille quand elle revient (Full body A, B, C) */
export function suggestionMixte(jours: readonly number[], catalogue: readonly Programme[] = PROGRAMMES, persos: readonly Programme[] = []): SemaineLibre {
  const tri = Array.from(new Set(jours.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort((x, y) => x - y).slice(0, 6);
  const familles = FAMILLES_PROPOSEES[tri.length] ?? [];
  const { autres } = seancesProposees(BASE_MIXTE, catalogue, persos);
  const vus = new Map<FamilleSeance, number>();
  const a = vide();
  tri.forEach((d, k) => {
    const f = familles[k];
    const liste = autres.find((x) => x.famille === f)?.seances ?? [];
    if (!liste.length) return;
    const n = vus.get(f) ?? 0;
    vus.set(f, n + 1);
    a[d] = { ...liste[n % liste.length].ref };
  });
  return { a };
}

/** Combien de groupes reviennent au moins `objectif` fois (lib/v2/frequence/deuxFois.ts, OBJECTIF_JOURS) */
export function groupesAtteints(semaine: SemaineLibre, base: Programme, ligne: LigneSemaine, objectif: number): { atteints: number; total: number } {
  const c = couverture(seancesDeLaLigne(semaine, base, ligne));
  return { atteints: c.filter((x) => x.fois >= objectif).length, total: c.length };
}

/* ------------------------------------------------------------------------------------------------
 * Ponctuel : les dates
 * ---------------------------------------------------------------------------------------------- */
export type MixtePonctuel = {
  semaine: SemaineLibre;
  /** premier jour, date locale « 2026-10-30 » */
  du: string;
  /** dernier jour inclus */
  jusquau: string;
  /** ton nom, 40 caractères au plus */
  nom?: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const estIso = (v: unknown): v is string => typeof v === 'string' && ISO.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime());

export function isoDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function plusJours(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  return isoDe(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12));
}

const ecartJours = (du: string, au: string): number => Math.round((new Date(`${au}T12:00:00`).getTime() - new Date(`${du}T12:00:00`).getTime()) / 86400000);

/** Le dimanche de la semaine de cette date */
export function dimancheDe(d: Date): string {
  return isoDe(new Date(d.getFullYear(), d.getMonth(), d.getDate() - indexJour(d) + 6, 12));
}

export type DureePonctuel = 'semaine' | 'deux';
/** « Cette semaine » : jusqu'à dimanche ; « Les 2 prochaines semaines » : jusqu'au dimanche d'après */
export function finDuPonctuel(choix: DureePonctuel, aujourdhui = new Date()): string {
  const dim = dimancheDe(aujourdhui);
  return choix === 'deux' ? plusJours(dim, 7) : dim;
}

/** Une date de fin choisie, ramenée entre aujourd'hui et 8 semaines */
export function borneFin(iso: string, aujourdhui = new Date()): string {
  const auj = isoDe(aujourdhui);
  if (!estIso(iso) || iso < auj) return auj;
  const max = plusJours(auj, MAX_JOURS_PONCTUEL - 1);
  return iso > max ? max : iso;
}

/** Lecture stricte : rien de ce qui vient du stockage n'est cru sur parole */
export function lirePonctuel(v: unknown): MixtePonctuel | null {
  if (!v || typeof v !== 'object') return null;
  const x = v as Record<string, unknown>;
  const semaine = lireSemaine(x.semaine);
  if (!semaineUtile(semaine) || !estIso(x.du) || !estIso(x.jusquau)) return null;
  if (x.jusquau < x.du || ecartJours(x.du, x.jusquau) >= MAX_JOURS_PONCTUEL) return null;
  const nom = typeof x.nom === 'string' && x.nom.trim() ? x.nom.trim().slice(0, 40) : undefined;
  return { semaine, du: x.du, jusquau: x.jusquau, ...(nom ? { nom } : {}) };
}

/** Ce jour (date locale) tombe dans la semaine mixte */
export const ponctuelCouvre = (pc: MixtePonctuel | null | undefined, iso: string): boolean => !!pc && pc.du <= iso && iso <= pc.jusquau;

/** Le bandeau : « Semaine mixte jusqu'à dimanche », « jusqu'à ce soir » ou la date (gabarit et valeurs, traduits à l'affichage) */
export function libelleFin(jusquau: string, aujourdhui = new Date()): { gabarit: string; valeurs: (string | number)[] } {
  if (jusquau === dimancheDe(aujourdhui)) return { gabarit: 'Semaine mixte jusqu’à dimanche', valeurs: [] };
  if (jusquau === isoDe(aujourdhui)) return { gabarit: 'Semaine mixte jusqu’à ce soir', valeurs: [] };
  const d = new Date(`${jusquau}T12:00:00`);
  return { gabarit: 'Semaine mixte jusqu’au {0}/{1}', valeurs: [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0')] };
}
