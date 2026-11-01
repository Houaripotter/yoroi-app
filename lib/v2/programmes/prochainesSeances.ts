/**
 * « Tes prochaines séances » (1er novembre 2026). Houari : « Je veux voir mes entraînements futurs, ce que l'app m'a
 * préparé comme exercices. L'objectif est de travailler chaque muscle 2 fois par semaine. Et je veux pouvoir
 * prévisualiser tout ça. »
 *
 * Tout vient des vraies données, rien n'est inventé :
 *  - la séance de chaque date : ta semaine (semaine libre, ton programme construit, A et B, semaine mixte ponctuelle)
 *    par seanceDuPlanLe (suivi.ts) ; un programme en boucle place ses prochaines séances (seancesAVenir) sur tes
 *    jours d'entraînement ; une date déjà faite montre la séance faite (ProgrammeActif.faits) ;
 *  - la charge proposée : la règle de progression (progression.ts, proposer) sur tes deux dernières séances de
 *    l'exercice ; semaine légère : proposerLegere. Pour une séance plus loin, c'est la charge proposée aujourd'hui :
 *    elle bougera avec ta prochaine séance ;
 *  - les muscles : la règle unique de lib/v2/seances/musclesExercices.ts (muscles principaux), et la règle des
 *    « 2 fois » de lib/v2/frequence/deuxFois.ts (un jour compte avec au moins 2 séries directes du muscle) ;
 *  - les suggestions proposent 3 exercices réels de la base (constants/exerciseLibrary.ts) ou de tes machines,
 *    jamais un exercice écarté. Rien n'est ajouté sans ton appui.
 * Données pures, testées dans __tests__/unit/alternance.test.ts.
 */
import type { MuscleName } from '@/lib/v2/progres/strength';
import { MUSCLE_ORDER } from '@/lib/v2/progres/strength';
import { musclesExercice } from '@/lib/v2/seances/musclesExercices';
import { bibliothequeMuscu, cleDoublon } from '@/lib/v2/seances/changerExo';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { OBJECTIF_JOURS, SERIES_MIN_JOUR } from '@/lib/v2/frequence/deuxFois';
import { MUSCLES_EXOS } from './musclesExos';
import { lettreDe } from './alternance';
import { estJourMuscu } from './finSeance';
import { estExoCardio } from './briques';
import { proposer, proposerLegere, seancesDeLExo } from './progression';
import { indexJour } from './coach';
import { joursDuProgramme, seanceDuPlanLe, seancesAVenir, semaineEffective } from './suivi';
import type { ProgrammeActif } from './suivi';
import { jourDuProgramme } from './semaineLibre';
import type { ExoProgramme, JourProgramme, Programme } from './types';

export type StatutJour = 'faite' | 'ratee' | 'aujourdhui' | 'avenir' | 'repos';

export type JourPrevu = {
  /** date locale « 2026-11-02 » */
  date: string;
  /** 0 = lundi */
  d: number;
  /** 0 : cette semaine, 1 : la suivante... */
  semaine: number;
  /** la séance prévue (ou faite) ce jour-là ; null : repos */
  jour: JourProgramme | null;
  statut: StatutJour;
};

const p2 = (n: number) => String(n).padStart(2, '0');
export const isoDe = (d: Date): string => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const plus = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
export const lundiDe = (d: Date): Date => plus(d, -indexJour(d));

/**
 * Les jours de cette semaine (depuis lundi) et des `nbSemaines - 1` suivantes, avec leur séance. Au moins deux
 * semaines entières à venir : nbSemaines vaut 3 par défaut (cette semaine, puis deux).
 */
export function joursPrevus(a: ProgrammeActif, p: Programme, nbSemaines = 3, aujourdhui = new Date()): JourPrevu[] {
  const lundi = lundiDe(aujourdhui);
  const auj = isoDe(aujourdhui);
  const total = Math.max(1, nbSemaines) * 7;
  const dates = Array.from({ length: total }, (_, k) => plus(lundi, k));
  const faitLe = new Map(a.faits.map((f) => [f.date, f]));
  const avecSemaine = !!semaineEffective(a, p);
  // un programme en boucle : ses prochaines séances, posées sur tes jours d'entraînement à partir d'aujourd'hui
  const boucle = new Map<string, JourProgramme>();
  if (!avecSemaine) {
    const jours = new Set(joursDuProgramme(a, p));
    const futures = dates.filter((d) => isoDe(d) >= auj && jours.has(indexJour(d)) && !(isoDe(d) === auj && faitLe.has(auj)));
    const suite = seancesAVenir(a, futures.length, aujourdhui);
    futures.forEach((d, k) => { if (suite[k]) boucle.set(isoDe(d), suite[k].jour); });
  }
  return dates.map((d, k) => {
    const iso = isoDe(d);
    const prevu = avecSemaine ? seanceDuPlanLe(a, p, d) : boucle.get(iso) ?? null;
    const f = faitLe.get(iso);
    if (f) return { date: iso, d: indexJour(d), semaine: Math.floor(k / 7), jour: jourDuProgramme(p, f.jourId) ?? prevu, statut: 'faite' };
    const statut: StatutJour = !prevu ? 'repos' : iso < auj ? 'ratee' : iso === auj ? 'aujourdhui' : 'avenir';
    return { date: iso, d: indexJour(d), semaine: Math.floor(k / 7), jour: prevu, statut };
  });
}

/** La lettre de la séance : sa version (alternance.ts), sinon celle de son titre (« Upper B »), sinon null */
export function lettreSeance(j: Pick<JourProgramme, 'titre' | 'variante'> | null | undefined): 'A' | 'B' | null {
  if (!j) return null;
  return j.variante ?? lettreDe(j.titre)?.lettre ?? null;
}

/** Le nom à montrer : le titre, suivi de sa version quand YOROI l'a préparée (« Haut du corps B ») */
export function nomSeance(j: Pick<JourProgramme, 'titre' | 'variante'>, tr: (s: string) => string = (s) => s): string {
  const t = tr(j.titre);
  return j.variante ? `${t} ${j.variante}` : t;
}

/* ---------------------------------- les charges ---------------------------------- */

export type SeanceLue = Parameters<typeof seancesDeLExo>[0][number];

export type ChargeProposee = {
  /** charge proposée en kg ; null : poids du corps, exercice tenu, ou première fois (à choisir) */
  kg: number | null;
  /** répétitions (ou secondes) visées */
  reps: number;
  series: number;
  raison: 'premiere' | 'monte' | 'garde' | 'poids_du_corps' | 'variante' | 'legere';
};

/** La charge que la règle de progression propose pour cet exercice, d'après tes vraies séances */
export function chargeProposee(e: ExoProgramme, trainings: readonly SeanceLue[], legere = false): ChargeProposee {
  const dernieres = seancesDeLExo(trainings as SeanceLue[], e.nom, 2);
  const r = legere ? proposerLegere(e, dernieres) : proposer(e, dernieres);
  const kg = r.series[0]?.weight ?? 0;
  return { kg: kg > 0 ? kg : null, reps: r.series[0]?.reps ?? e.repsMin, series: r.series.length, raison: r.raison };
}


/* ---------------------------------- chaque muscle 2 fois ---------------------------------- */

export type CouvertureMuscle = {
  muscle: MuscleName;
  /** jours de la semaine où le muscle est prévu avec au moins 2 séries directes */
  jours: number;
  /** ces dates */
  dates: string[];
  /** séries directes prévues sur la semaine */
  series: number;
};

/** Les groupes principaux d'un exercice prévu (règle unique de musclesExercices.ts) */
export function groupesPrincipaux(e: Pick<ExoProgramme, 'nom' | 'muscle' | 'minutes'>, perso?: readonly MachinePerso[]): MuscleName[] {
  if (estExoCardio(e)) return [];
  const m = musclesExercice({ name: e.nom, muscle_group: e.muscle }, perso);
  return m ? Array.from(new Set(m.principaux.map((x) => x.groupe))) : [];
}

/** Pour chacun des 6 groupes : combien de jours de la semaine prévue le travaillent (au moins 2 séries directes) */
export function couverturePrevue(seances: readonly { date: string; exos: readonly ExoProgramme[] }[], perso?: readonly MachinePerso[]): CouvertureMuscle[] {
  const parJour = new Map<string, Partial<Record<MuscleName, number>>>();
  for (const s of seances) {
    const cumul = parJour.get(s.date) ?? {};
    for (const e of s.exos) for (const g of groupesPrincipaux(e, perso)) cumul[g] = (cumul[g] ?? 0) + Math.max(0, e.series);
    parJour.set(s.date, cumul);
  }
  return MUSCLE_ORDER.map((muscle) => {
    const dates: string[] = [];
    let series = 0;
    for (const [d, s] of parJour) {
      series += s[muscle] ?? 0;
      if ((s[muscle] ?? 0) >= SERIES_MIN_JOUR) dates.push(d);
    }
    return { muscle, jours: dates.length, dates: dates.sort(), series };
  });
}

/* ---------------------------------- Tes jours : ta semaine type ---------------------------------- */

/** Ta semaine type (Tes jours, du lundi au dimanche) vue comme des jours à venir, pour les mêmes calculs */
export function joursDeGrille(seances: readonly (JourProgramme | null)[], lundi: Date): JourPrevu[] {
  return seances.slice(0, 7).map((jour, d) => ({ date: isoDe(plus(lundi, d)), d, semaine: 0, jour, statut: jour ? 'avenir' : 'repos' }));
}

/**
 * « Ce que ta semaine travaille » (Tes jours, 1er novembre 2026, soir) : les mêmes règles que Tes prochaines séances,
 * muscles principaux de musclesExercices.ts et un jour compté avec au moins 2 séries directes. Les abdos à part.
 */
export function couvertureGrille(seances: readonly (JourProgramme | null)[], perso?: readonly MachinePerso[]): CouvertureMuscle[] {
  const avec = joursDeGrille(seances, new Date(2026, 0, 5, 12)).filter((j) => !!j.jour && estJourMuscu(j.jour));
  return couverturePrevue(avec.map((j) => ({ date: j.date, exos: j.jour!.exos })), perso).filter((c) => c.muscle !== 'Abdos');
}

/** « 2 fois sur 2 », « 1 fois sur 2 », « 3 fois » (gabarit français à traduire, et sa valeur) */
export function libellePrevu(x: Pick<CouvertureMuscle, 'jours'>): { gabarit: string; valeur: number } {
  if (x.jours > OBJECTIF_JOURS) return { gabarit: '{0} fois', valeur: x.jours };
  return { gabarit: '{0} fois sur 2', valeur: x.jours };
}

/* ---------------------------------- les suggestions ---------------------------------- */

/** Les groupes de la bibliothèque de chaque muscle de la carte */
export const GROUPES_BIBLIO: Record<MuscleName, string[]> = {
  Pectoraux: ['PECTORAUX'],
  Dos: ['DOS'],
  'Épaules': ['ÉPAULES'],
  Bras: ['BICEPS', 'TRICEPS'],
  Jambes: ['JAMBES', 'ISCHIOS', 'FESSIERS'],
  Abdos: ['ABDOS'],
};
/** « Ajoute un exercice d'épaules » : le complément de chaque muscle (texte français, traduit à l'affichage) */
export const DE_MUSCLE: Record<MuscleName, string> = {
  Pectoraux: 'de pectoraux',
  Dos: 'de dos',
  'Épaules': 'd’épaules',
  Bras: 'de bras',
  Jambes: 'de jambes',
  Abdos: 'd’abdos',
};

const HAUT: MuscleName[] = ['Pectoraux', 'Dos', 'Épaules', 'Bras'];

export type CibleSuggestion = { date: string; jourId: string; titre: string; variante?: 'A' | 'B' };
export type Suggestion = { muscle: MuscleName; cible: CibleSuggestion; exos: { nom: string; muscle: string }[] };

const ecart = (a: string, b: string): number => Math.abs(Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()) / 86400000));

/**
 * 3 exercices réels pour ce muscle : ceux dont c'est vraiment le muscle principal (musclesExercices.ts), d'abord les
 * exercices connus (musclesExos.ts), ceux que tu as déjà faits, puis l'ordre de la bibliothèque ; tes machines aussi.
 * Jamais un exercice écarté, jamais un exercice déjà dans la séance.
 */
export function exercicesPour(muscle: MuscleName, o: { deja?: Iterable<string>; ecartes?: Iterable<string>; perso?: readonly MachinePerso[]; compte?: (nom: string) => number; max?: number } = {}): { nom: string; muscle: string }[] {
  const exclus = new Set([...Array.from(o.deja ?? [], cleDoublon), ...Array.from(o.ecartes ?? [], cleDoublon)]);
  const groupes = GROUPES_BIBLIO[muscle];
  const compte = o.compte ?? (() => 0);
  const vrai = (nom: string, g: string) => groupesPrincipaux({ nom, muscle: g }, o.perso).includes(muscle);
  const candidats: { nom: string; muscle: string; rang: number; connu: boolean; perso: boolean }[] = [];
  for (const m of o.perso ?? []) {
    const g = groupes.find((x) => x === m.muscle.toUpperCase());
    if (g && !exclus.has(cleDoublon(m.nom)) && vrai(m.nom, g)) candidats.push({ nom: m.nom, muscle: g, rang: -1, connu: true, perso: true });
  }
  for (const f of bibliothequeMuscu()) {
    if (!groupes.includes(f.muscle) || exclus.has(cleDoublon(f.nom)) || !vrai(f.nom, f.muscle)) continue;
    candidats.push({ nom: f.nom, muscle: f.muscle, rang: f.rang, connu: !!MUSCLES_EXOS[f.nom], perso: false });
  }
  candidats.sort((a, b) => Number(b.perso) - Number(a.perso) || Number(b.connu) - Number(a.connu) || Math.min(compte(b.nom), 10) - Math.min(compte(a.nom), 10) || a.rang - b.rang);
  // Bras : un biceps et un triceps avant le troisième
  const out: { nom: string; muscle: string }[] = [];
  const max = Math.max(1, o.max ?? 3);
  const vus = new Set<string>();
  const prendre = (c: { nom: string; muscle: string }) => { if (out.length < max && !vus.has(c.nom)) { vus.add(c.nom); out.push({ nom: c.nom, muscle: c.muscle }); } };
  for (const g of groupes) { const c = candidats.find((x) => x.muscle === g); if (c && groupes.length > 1) prendre(c); }
  for (const c of candidats) prendre(c);
  return out;
}

/**
 * Les muscles prévus moins de 2 fois dans la semaine (sauf les abdos, comme le rappel du coach), avec la séance à
 * venir où un exercice aiderait le plus : une séance de musculation qui ne travaille pas déjà ce muscle, du même
 * côté du corps de préférence, la plus éloignée des jours où il est déjà prévu. Aucune séance possible : rien.
 */
export function suggestionsSemaine(
  jours: readonly JourPrevu[],
  exosDe: (j: JourPrevu) => readonly ExoProgramme[],
  o: { ecartes?: Iterable<string>; perso?: readonly MachinePerso[]; compte?: (nom: string) => number } = {},
): Suggestion[] {
  const avec = jours.filter((j) => !!j.jour && estJourMuscu(j.jour));
  if (avec.length < 2) return [];
  const couv = couverturePrevue(avec.map((j) => ({ date: j.date, exos: exosDe(j) })), o.perso);
  const out: Suggestion[] = [];
  for (const c of couv) {
    if (c.jours >= OBJECTIF_JOURS || c.muscle === 'Abdos') continue;
    const libres = avec.filter((j) => (j.statut === 'avenir' || j.statut === 'aujourdhui') && !c.dates.includes(j.date));
    if (!libres.length) continue;
    const memeCote = (j: JourPrevu) => {
      const g = new Set(exosDe(j).flatMap((e) => groupesPrincipaux(e, o.perso)));
      return HAUT.includes(c.muscle) ? HAUT.some((m) => g.has(m)) : g.has('Jambes');
    };
    const loin = (j: JourPrevu) => (c.dates.length ? Math.min(...c.dates.map((d) => ecart(d, j.date))) : 7);
    const tri = [...libres].sort((a, b) => Number(memeCote(b)) - Number(memeCote(a)) || loin(b) - loin(a) || a.date.localeCompare(b.date));
    const cible = tri[0];
    const exos = exercicesPour(c.muscle, { deja: exosDe(cible).map((e) => e.nom), ecartes: o.ecartes, perso: o.perso, compte: o.compte });
    if (!exos.length) continue;
    out.push({ muscle: c.muscle, cible: { date: cible.date, jourId: cible.jour!.id, titre: cible.jour!.titre, ...(cible.jour!.variante ? { variante: cible.jour!.variante } : {}) }, exos });
  }
  return out;
}

/** Durée estimée d'une séance prévue : ses exercices de musculation, plus son cardio */
export function minutesCardio(exos: readonly ExoProgramme[], finCardio?: { minutes: number } | null): number {
  return exos.filter(estExoCardio).reduce((n, e) => n + (e.minutes ?? 0), 0) + (finCardio?.minutes ?? 0);
}
