/**
 * Fin de séance : abdos et cardio (26 octobre 2026). Pour le programme en cours, tu choisis ce que YOROI ajoute
 * a la fin de chaque jour de musculation : rien (par defaut), un exercice d'abdos, un bloc de marche inclinee
 * en zone 2, ou les deux, et la duree du cardio. Les seances de marche deja prevues par le programme
 * (seche, perte de poids...) peuvent aussi etre retirees.
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

export type ChoixFin = 'rien' | 'abdos' | 'cardio' | 'les_deux';

export type FinSeance = {
  choix: ChoixFin;
  /** minutes du bloc cardio, une valeur de MINUTES_FIN */
  minutes: number;
  /** true : les seances de marche du programme sont retirees de la rotation */
  sansMarche?: boolean;
};

export const CHOIX_FIN: { key: ChoixFin; label: string; sous: string }[] = [
  { key: 'rien', label: 'Rien', sous: 'Le programme tel quel' },
  { key: 'abdos', label: 'Abdos', sous: 'Un exercice à la fin' },
  { key: 'cardio', label: 'Cardio', sous: 'Marche inclinée en zone 2' },
  { key: 'les_deux', label: 'Les deux', sous: 'Abdos, puis cardio' },
];

export const MINUTES_FIN = [15, 20, 30] as const;

export const FIN_PAR_DEFAUT: FinSeance = { choix: 'rien', minutes: 30 };

/** Une consigne par duree : meme deroule que les jours de marche inclinee du catalogue */
const CONSIGNE_FIN: Record<number, string> = {
  15: '15 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
  20: '20 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
  30: '30 minutes de marche inclinée juste après la musculation. Sur tapis, pente de 8 à 12 %, entre 4,5 et 5,5 km/h. Zone 2 : tu peux encore parler en phrases complètes. Lâche les barres.',
};

/** La note des etudes, une ligne */
export const NOTE_FIN = 'Les abdos renforcent ton tronc mais ne font pas fondre le ventre. La marche inclinée en zone 2 ajoute de la dépense avec peu de fatigue : tu dois pouvoir parler en phrases complètes.';
export const SOURCES_FIN = ['vispute2011', 'persinger2004', 'hofmann2014'];

const CHOIX_VALIDES: ChoixFin[] = ['rien', 'abdos', 'cardio', 'les_deux'];

/** La duree permise la plus proche */
export function minutesValides(m: unknown): number {
  const n = Number(m);
  if (!Number.isFinite(n) || n <= 0) return FIN_PAR_DEFAUT.minutes;
  return MINUTES_FIN.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), MINUTES_FIN[0] as number);
}

/** Lecture tolerante (anciennes versions : rien d'enregistre) ; undefined si rien d'utile */
export function lireFinSeance(x: unknown): FinSeance | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Record<string, unknown>;
  const choix = CHOIX_VALIDES.includes(o.choix as ChoixFin) ? (o.choix as ChoixFin) : 'rien';
  const fin: FinSeance = { choix, minutes: minutesValides(o.minutes) };
  if (o.sansMarche === true) fin.sansMarche = true;
  return fin;
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

export function cardioFin(minutes: number): CardioProgramme {
  const m = minutesValides(minutes);
  return { sport: 'marche', minutes: m, consigne: CONSIGNE_FIN[m] };
}

/** Marque d'un exercice ajoute par la fin de seance */
export type ExoFin = { fin?: true };

/** Le jour avec sa fin de seance : `finCardio` (bloc apres la musculation), `finFaite` (deja calcule) */
export type AvecFin = { finCardio?: CardioProgramme; finFaite?: true };

export type ContexteFin = { fin: FinSeance | null | undefined; materiel: Materiel };

/**
 * Ajoute l'abdo et le cardio choisis a un jour de musculation. Le jour garde ses exercices dans l'ordre
 * (les remplacements par case restent justes) ; l'abdo vient en dernier.
 */
export function avecFinSeance<J extends JourProgramme>(jour: J, ctx: ContexteFin | null | undefined): J & AvecFin {
  const j = jour as J & AvecFin;
  if (j.finFaite) return j;
  const f = ctx?.fin;
  if (!f || f.choix === 'rien' || !estJourMuscu(jour)) return j;
  let exos = jour.exos as (ExoProgramme & ExoFin)[];
  if (avecAbdos(f) && !jour.exos.some((e) => e.muscle === 'ABDOS')) exos = [...exos, exoAbdosFin(ctx!.materiel)];
  const ajout: AvecFin = { finFaite: true };
  if (avecCardio(f) && !jour.cardio) ajout.finCardio = cardioFin(f.minutes);
  return { ...jour, exos, ...ajout } as J & AvecFin;
}

/* ------------------------------------------------------------------------------------------------
 * Le choix du programme actif, retenu par suivi.ts a chaque lecture et ecriture.
 * ---------------------------------------------------------------------------------------------- */
let actif: { id: string; fin?: FinSeance } | null = null;

export function retenirFinActive(id: string | null, fin?: FinSeance): void {
  actif = id ? { id, fin } : null;
}

/** La fin de seance qui s'applique a ce jour : celle du programme actif, si le jour en fait partie */
export function contexteFinPour(jour: JourProgramme): ContexteFin | null {
  if (!actif?.fin || actif.fin.choix === 'rien') return null;
  const p = programmeParId(actif.id);
  if (!p || !p.jours.includes(jour)) return null;
  return { fin: actif.fin, materiel: p.materiel };
}

/** « abdos, puis 30 min de marche inclinée » : ce que tu as choisi, en clair (texte francais a traduire) */
export function resumeFin(f: FinSeance | null | undefined): { cle: string; minutes?: number } {
  if (!f || f.choix === 'rien') return { cle: 'Rien d’ajouté' };
  if (f.choix === 'abdos') return { cle: 'Un exercice d’abdos à la fin' };
  if (f.choix === 'cardio') return { cle: '{0} min de marche inclinée à la fin', minutes: f.minutes };
  return { cle: 'Abdos, puis {0} min de marche inclinée', minutes: f.minutes };
}
