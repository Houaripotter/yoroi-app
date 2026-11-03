/**
 * Ton programme a ta facon (26 octobre 2026) : sur la page du programme en cours, « Changer » remplace un
 * exercice par celui que tu choisis. Le choix est garde dans le programme en cours (suivi.ts, `remplacements`)
 * et applique partout ou le jour du programme sert : la page, la seance en direct, la seance express.
 * Series, repetitions et repos restent ceux de la case du programme. Ton choix passe en dernier :
 * il gagne sur les remplacements automatiques du materiel et des douleurs.
 * Donnees pures, testees dans __tests__/unit/perso.test.ts.
 */
import type { ExoProgramme, JourProgramme } from './types';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { protegerJour } from './blessures';
import type { ExoProtege, Region } from './blessures';
import type { Equipement, MachinesSalle } from './materiel';
import { faisable, remplacantsDe, remplacerPar } from './materiel';
import { ecartesEnMemoire } from '@/lib/v2/seances/exercicesEcartes';
import { completerContexte, contexteFinPour, sansFinEnDouble } from './finSeance';
import type { ContexteFin } from './finSeance';
import { avecModules } from './modules';
import type { AvecModules, ExoModule } from './modules';

/** Cle d'une case du programme : « jourId|index » (index de l'exercice dans le jour du catalogue) */
export const cleCase = (jourId: string, index: number): string => `${jourId}|${index}`;

export type Remplacements = Record<string, string>;

export type ExoPerso = {
  /** nom de l'exercice qui etait dans cette case avant ton choix */
  perso?: string;
};

/** Ajoute, change ou retire (nom vide ou identique a l'original) un remplacement, sans toucher aux autres */
export function avecRemplacement(r: Remplacements | undefined, cle: string, nom: string | null, original?: string): Remplacements {
  const suite: Remplacements = { ...(r ?? {}) };
  const n = (nom ?? '').trim();
  if (!n || (original && n === original)) delete suite[cle];
  else suite[cle] = n;
  return suite;
}

/**
 * Le jour avec tes remplacements. `jour` peut deja etre adapte (materiel, douleurs) : ses exercices gardent
 * l'ordre du catalogue, la case garde donc son index. L'exercice choisi prend la place, avec les memes series,
 * repetitions et repos ; les marques de remplacement automatique tombent (c'est toi qui as choisi).
 */
export function appliquerRemplacements<E extends ExoProgramme, J extends Omit<JourProgramme, 'exos'> & { exos: E[] }>(
  jour: J,
  remplacements: Remplacements | undefined | null,
  muscleDe?: (nom: string) => string | undefined,
): Omit<J, 'exos'> & { exos: (E & ExoPerso)[] } {
  if (!remplacements || !Object.keys(remplacements).length) return jour;
  let change = false;
  const exos = jour.exos.map((e, i) => {
    const nom = remplacements[cleCase(jour.id, i)];
    if (!nom || nom === e.nom) return e;
    change = true;
    const { remplace: _r, impossible: _i, zone: _z, conseil: _c, ...reste } = e as E & { remplace?: string; impossible?: boolean; zone?: string };
    const original = (e as { remplace?: string }).remplace ?? e.nom;
    return { ...(reste as E), nom, muscle: muscleDe?.(nom) ?? e.muscle, poidsDuCorps: undefined, perso: original } as E & ExoPerso;
  });
  return change ? { ...jour, exos } : jour;
}

/* ------------------------------------------------------------------------------------------------
 * 1er novembre 2026 (Tes prochaines séances, Houari : « changer un exercice à l'avance, pour aujourd'hui ou pour
 * toujours ») : un exercice changé pour UNE séance à venir, à sa date seulement. Gardé à part des remplacements de
 * toujours (ProgrammeActif.changementsDates, clé « date|jourId|index ») : les anciennes versions l'ignorent, et il
 * tombe tout seul une fois sa date passée. Le jour J, il passe par dessus tes remplacements de toujours.
 * ---------------------------------------------------------------------------------------------- */
export type ChangementsDates = Record<string, string>;
export const MAX_CHANGEMENTS_DATES = 60;
const CLE_DATEE = /^(\d{4}-\d{2}-\d{2})\|(.{1,200})\|(\d{1,2})$/;

export const cleDatee = (date: string, jourId: string, index: number): string => `${date}|${jourId}|${index}`;

/** La date locale du jour, « 2026-11-01 » */
export function dateDuJour(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Lecture stricte : clés valides, noms non vides, dates d'aujourd'hui ou à venir seulement */
export function lireChangementsDates(v: unknown, aujourdhui: string): ChangementsDates | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out: ChangementsDates = {};
  for (const [k, nom] of Object.entries(v as Record<string, unknown>)) {
    const m = CLE_DATEE.exec(k);
    if (!m || m[1] < aujourdhui || typeof nom !== 'string' || !nom.trim() || nom.length > 120) continue;
    out[k] = nom.trim();
  }
  const cles = Object.keys(out).sort().slice(0, MAX_CHANGEMENTS_DATES);
  return cles.length ? Object.fromEntries(cles.map((k) => [k, out[k]])) : undefined;
}

/** Ajoute, change ou retire (nom vide ou identique a l'original) le changement d'une seance datee */
export function avecChangementDate(c: ChangementsDates | undefined, date: string, jourId: string, index: number, nom: string | null, original?: string): ChangementsDates {
  const suite: ChangementsDates = { ...(c ?? {}) };
  const k = cleDatee(date, jourId, index);
  const n = (nom ?? '').trim();
  if (!n || (original && n === original)) delete suite[k];
  else suite[k] = n;
  return suite;
}

/** Tes remplacements de toujours, plus les changements de cette date (ils gagnent) : a passer a jourPourToi */
export function remplacementsLe(r: Remplacements | undefined | null, c: ChangementsDates | undefined | null, date: string): Remplacements | undefined {
  const du = c ? Object.entries(c).filter(([k]) => k.startsWith(`${date}|`)) : [];
  if (!du.length) return r ?? undefined;
  const suite: Remplacements = { ...(r ?? {}) };
  for (const [k, nom] of du) suite[k.slice(date.length + 1)] = nom;
  return suite;
}

/** Combien de cases tu as changees dans ce programme */
export function nombreRemplacements(remplacements: Remplacements | undefined | null, jourIds: string[]): number {
  if (!remplacements) return 0;
  return Object.keys(remplacements).filter((k) => jourIds.includes(k.split('|')[0])).length;
}

/* ------------------------------------------------------------------------------------------------
 * Le jour tel que tu le fais : ta fin de seance (abdos, cardio), ton materiel et ta salle, tes douleurs
 * declarees, puis tes choix. Un seul calcul pour la page du programme, la seance en direct et la seance express.
 * `fin` : undefined, la fin de seance et les modules du programme actif si le jour en fait partie (finSeance.ts) ;
 * null, aucune ; sinon celle donnee (sans `modules`, ceux du programme actif s'y ajoutent, lib/v2/programmes/modules.ts).
 * ---------------------------------------------------------------------------------------------- */

const muscleBiblio = (nom: string): string | undefined => EXERCISE_LIBRARY.find((e) => e.name === nom)?.muscle;

export function jourPourToi<J extends JourProgramme>(
  jour: J,
  dispo: readonly Equipement[] | null,
  regions: readonly Region[],
  machines?: MachinesSalle,
  remplacements?: Remplacements | null,
  fin?: ContexteFin | null,
): Omit<J, 'exos'> & AvecModules & { exos: (ExoProtege & ExoPerso & ExoModule)[] } {
  // les exercices ajoutes (abdo, grip, cou) passent ensuite par le materiel et les douleurs, comme les autres
  const complet = avecModules(jour, fin === undefined ? contexteFinPour(jour) : completerContexte(jour, fin));
  const protege = protegerJour(complet, dispo, regions, machines) as Omit<J, 'exos'> & AvecModules & { id: string; exos: ExoProtege[] };
  const perso = appliquerRemplacements(protege, remplacements, muscleBiblio) as Omit<J, 'exos'> & AvecModules & { exos: (ExoProtege & ExoPerso & ExoModule)[] };
  // 30 octobre 2026 : tes exercices ecartes (« Pas dans ma salle », « Ça me fait mal ») ne reviennent plus
  const final = eviterEcartes(perso, ecartesEnMemoire(), dispo, machines);
  // 3 novembre 2026 : apres le materiel, les douleurs et tes changements, un exercice de fin de seance qui est devenu
  // le meme mouvement qu'un autre exercice du jour tombe (jamais « Cable Crunch » puis « Crunch Poulie Haute »)
  const exos = sansFinEnDouble(final.exos);
  return exos === final.exos ? final : { ...final, exos };
}

/**
 * Exercices ecartes (lib/v2/seances/exercicesEcartes.ts) : chacun prend la place du premier de ses remplacants
 * qui n'est pas ecarte et que ton materiel permet, avec les memes series et repos. Sans remplacant possible,
 * il reste (mieux vaut un exercice a changer en seance qu'un trou dans le programme).
 */
export function eviterEcartes<E extends ExoProgramme, J extends { exos: E[] }>(jour: J, ecartes: ReadonlySet<string>, dispo?: readonly Equipement[] | null, machines?: MachinesSalle): J {
  if (!ecartes.size || !jour.exos.some((e) => ecartes.has(e.nom))) return jour;
  const exos = jour.exos.map((e) => {
    if (!ecartes.has(e.nom)) return e;
    const nom = remplacantsDe(e.nom).find((n) => !ecartes.has(n) && (!dispo || faisable(n, dispo, machines)));
    return nom ? ({ ...e, ...remplacerPar(e, nom) } as E) : e;
  });
  return { ...jour, exos };
}
