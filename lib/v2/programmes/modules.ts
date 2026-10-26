/**
 * Modules (26 octobre 2026) : des blocs a ajouter par dessus un programme de base. Tu choisis un PPL, et tu ajoutes
 * le grip, la force, le cou, les abdos, le cardio ou les etirements. Chaque module reprend un contenu qui existe deja
 * dans le catalogue (lib/v2/programmes/catalogue.ts), avec ses sources : rien d'invente.
 *
 *  - force    : le premier gros mouvement du jour passe en lourd, avec le dosage lourd que le catalogue donne deja a cet
 *               exercice (ex. Developpe couche 4 x 4 a 6, 180 s dans le PPL 6 jours). Source : force-3j, combat-force-2j.
 *  - grip     : deux exercices de prise (AVANT-BRAS) de « Grip de fer, judo et JJB » (grip-2j), en alternant ses deux seances.
 *  - cou      : l'exercice de cou de « Cou et gainage, sports de combat » (cou-combat-2j), en alternant ses deux seances.
 *  - abdos    : la fin de seance abdos (finSeance.ts).
 *  - cardio   : la fin de seance marche inclinee en zone 2 (finSeance.ts), 15, 20 ou 30 min.
 *  - mobilite : la seance d'etirements de « Souplesse et mobilité » (mobilite-3j) qui va avec le jour (haut, jambes, hanches),
 *               en bloc apres la seance.
 *
 * Regles d'application, comme la fin de seance :
 *  - seulement les jours de musculation (pas les rounds, pas le cardio) ;
 *  - jamais un exercice deja present dans le jour ; les cases du programme gardent leur index (les remplacements de
 *    perso.ts restent justes), les exercices ajoutes viennent a la fin, l'abdo en dernier ;
 *  - ils passent ensuite par ton materiel, ta salle et tes douleurs (perso.ts, jourPourToi), comme les autres.
 *
 * Stockage : abdos et cardio restent dans `fin` du programme en cours (anciennes versions et FinDeSeance.tsx inchanges) ;
 * force, grip, cou et mobilite vont dans `modules` (suivi.ts). modulesActifs() rend la liste complete.
 * Donnees pures, testees dans __tests__/unit/modules.test.ts.
 */
import { PROGRAMMES, programmeParId } from './catalogue';
import { FIN_PAR_DEFAUT, aDesJoursMuscu, avecFinSeance, estJourMuscu, lireFinSeance, minutesValides } from './finSeance';
import type { AvecFin, ChoixFin, ContexteFin, ExoFin, FinSeance } from './finSeance';
import type { CardioProgramme, ExoProgramme, JourProgramme, Programme } from './types';

export type ModuleId = 'force' | 'grip' | 'cou' | 'abdos' | 'cardio' | 'mobilite';

/** Modules gardes dans ProgrammeActif.modules ; abdos et cardio vivent dans `fin` */
export const MODULES_EXTRA: readonly ModuleId[] = ['force', 'grip', 'cou', 'mobilite'];
export const TOUS_LES_MODULES: readonly ModuleId[] = ['force', 'grip', 'cou', 'abdos', 'cardio', 'mobilite'];

export type ModuleInfo = {
  id: ModuleId;
  /** un mot ou deux, sur la carte */
  label: string;
  /** une ligne courte : ce qui est ajoute */
  sous: string;
  /** pourquoi, une phrase reprise du catalogue */
  pourquoi: string;
  /** programme du catalogue d'ou vient le contenu ('fin' : fin de seance) */
  depuis: string;
  /** ids de lib/v2/programmes/sources.ts */
  sources: string[];
  /** nom d'icone de components/yoroi/v2/seances/Icon.tsx */
  icone: 'bolt' | 'glove' | 'body' | 'flame' | 'steps' | 'wind';
};

export const MODULES: ModuleInfo[] = [
  {
    id: 'force',
    label: 'Force',
    sous: 'Le premier exercice en lourd',
    pourquoi: 'Pour la force, les charges lourdes font mieux que les légères : 3 à 5 répétitions sur les gros mouvements.',
    depuis: 'force-3j',
    sources: ['lopez2021', 'schoenfeld2017charges', 'acsm2026'],
    icone: 'bolt',
  },
  {
    id: 'grip',
    label: 'Grip',
    sous: 'Deux exercices de prise',
    pourquoi: 'Deux séances courtes à côté du club pour tenir le kimono plus fort et plus longtemps.',
    depuis: 'grip-2j',
    sources: ['franchini2011judo', 'branco2017'],
    icone: 'glove',
  },
  {
    id: 'cou',
    label: 'Cou',
    sous: 'Un exercice de cou',
    pourquoi: 'Deux séances courtes pour renforcer ton cou et ton gainage à côté du club.',
    depuis: 'cou-combat-2j',
    sources: ['ivanic2024', 'collins2014'],
    icone: 'body',
  },
  {
    id: 'abdos',
    label: 'Abdos',
    sous: 'Un exercice à la fin',
    pourquoi: 'Les abdos renforcent ton tronc mais ne font pas fondre le ventre : c’est l’alimentation et la dépense totale qui comptent.',
    depuis: 'fin',
    sources: ['vispute2011'],
    icone: 'flame',
  },
  {
    id: 'cardio',
    label: 'Cardio zone 2',
    sous: 'Marche inclinée en zone 2',
    pourquoi: 'La marche inclinée en zone 2 ajoute de la dépense avec peu de fatigue : tu dois pouvoir parler en phrases complètes.',
    depuis: 'fin',
    sources: ['persinger2004', 'hofmann2014'],
    icone: 'steps',
  },
  {
    id: 'mobilite',
    label: 'Mobilité',
    sous: 'Étirements après la séance',
    pourquoi: 'Trois fois 20 minutes par semaine : s’étirer régulièrement fait gagner de l’amplitude en quelques semaines.',
    depuis: 'mobilite-3j',
    sources: ['konrad2024'],
    icone: 'wind',
  },
];

export const moduleParId = (id: ModuleId): ModuleInfo | undefined => MODULES.find((m) => m.id === id);

const estModule = (x: unknown): x is ModuleId => typeof x === 'string' && (TOUS_LES_MODULES as readonly string[]).includes(x);

/** Liste propre, sans doublon, dans l'ordre de TOUS_LES_MODULES */
export function normaliserModules(liste: readonly unknown[] | null | undefined): ModuleId[] {
  const set = new Set((liste ?? []).filter(estModule));
  return TOUS_LES_MODULES.filter((m) => set.has(m));
}

/** Lecture tolerante de ProgrammeActif.modules : seulement force, grip, cou, mobilite ; undefined si rien */
export function lireModules(x: unknown): ModuleId[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const l = normaliserModules(x).filter((m) => MODULES_EXTRA.includes(m));
  return l.length ? l : undefined;
}

export const extrasDe = (liste: readonly ModuleId[] | null | undefined): ModuleId[] => normaliserModules(liste).filter((m) => MODULES_EXTRA.includes(m));

/** Abdos et cardio d'une fin de seance, en modules */
export function modulesDeFin(f: FinSeance | null | undefined): ModuleId[] {
  if (!f) return [];
  if (f.choix === 'les_deux') return ['abdos', 'cardio'];
  if (f.choix === 'abdos') return ['abdos'];
  if (f.choix === 'cardio') return ['cardio'];
  return [];
}

/** La fin de seance qui correspond a une liste de modules ; `base` garde la duree et les seances de marche */
export function finDesModules(liste: readonly ModuleId[] | null | undefined, base?: Partial<FinSeance> | null): FinSeance {
  const l = normaliserModules(liste);
  const a = l.includes('abdos');
  const c = l.includes('cardio');
  const choix: ChoixFin = a && c ? 'les_deux' : a ? 'abdos' : c ? 'cardio' : 'rien';
  const fin: FinSeance = { choix, minutes: minutesValides(base?.minutes ?? FIN_PAR_DEFAUT.minutes) };
  if (base?.sansMarche) fin.sansMarche = true;
  return fin;
}

/** Tous les modules du programme en cours : ceux de `modules` et ceux de la fin de seance */
export function modulesActifs(a: { fin?: FinSeance; modules?: readonly ModuleId[] } | null | undefined): ModuleId[] {
  if (!a) return [];
  return normaliserModules([...(lireModules(a.modules) ?? []), ...modulesDeFin(lireFinSeance(a.fin))]);
}

/* ------------------------------------------------------------------------------------------------
 * Application a un jour
 * ---------------------------------------------------------------------------------------------- */

/** Marques des exercices ajoutes ou modifies par un module */
export type ExoModule = ExoFin & { module?: ModuleId; lourd?: true };

/** Le jour avec ses modules : `finEtirements` (bloc apres la seance), `modulesFaits` (deja calcule) */
export type AvecModules = AvecFin & { finEtirements?: CardioProgramme; modulesFaits?: true };

/** Contexte : la fin de seance, les modules, et le programme (pour alterner les seances de grip et de cou) */
export type ContexteModules = ContexteFin & { modules?: readonly ModuleId[]; programme?: Programme };

/**
 * Exercices que le catalogue fait deja en lourd (6 repetitions ou moins, a charge), avec ce dosage :
 * la premiere occurrence lourde de chaque nom.
 */
const LOURDS: Map<string, Pick<ExoProgramme, 'repsMin' | 'repsMax' | 'reposSec' | 'conseil'>> = (() => {
  const m = new Map<string, Pick<ExoProgramme, 'repsMin' | 'repsMax' | 'reposSec' | 'conseil'>>();
  for (const p of PROGRAMMES)
    for (const j of p.jours)
      for (const e of j.exos)
        if (!m.has(e.nom) && e.repsMax <= 6 && !e.poidsDuCorps && !e.secondes) m.set(e.nom, { repsMin: e.repsMin, repsMax: e.repsMax, reposSec: e.reposSec, conseil: e.conseil });
  return m;
})();

/** Conseil du catalogue pour une charge lourde (combat-force-2j) */
export const CONSEIL_LOURD = 'Lourd mais propre : garde une ou deux répétitions en réserve.';

/** Index de la case passee en lourd par le module force, ou -1 */
export function caseLourde(jour: Pick<JourProgramme, 'exos'>): number {
  const i = jour.exos.findIndex((e) => LOURDS.has(e.nom) && !e.poidsDuCorps && !e.secondes);
  if (i < 0) return -1;
  return jour.exos[i].repsMax > LOURDS.get(jour.exos[i].nom)!.repsMax ? i : -1;
}

/** Rang du jour parmi les jours de musculation du programme (0 le premier), pour alterner les seances A et B */
function rangMuscu(jour: JourProgramme, p: Programme | undefined): number {
  if (!p) return 0;
  const muscu = p.jours.filter(estJourMuscu);
  const i = muscu.findIndex((j) => j === jour || j.id === jour.id);
  return Math.max(0, i);
}

function exosDuModule(source: string, filtre: (e: ExoProgramme) => boolean, rang: number, deja: Set<string>, n: number, module: ModuleId): (ExoProgramme & ExoModule)[] {
  const p = programmeParId(source);
  if (!p) return [];
  const jours = p.jours.filter((j) => j.exos.some(filtre));
  if (!jours.length) return [];
  // la seance du programme source qui tombe ce jour, puis l'autre si tout est deja dans le jour
  const out: (ExoProgramme & ExoModule)[] = [];
  for (let k = 0; k < jours.length && out.length < n; k++) {
    for (const e of jours[(rang + k) % jours.length].exos) {
      if (out.length >= n) break;
      if (!filtre(e) || deja.has(e.nom)) continue;
      deja.add(e.nom);
      out.push({ ...e, module, fin: true });
    }
  }
  return out;
}

/** La seance d'etirements de mobilite-3j qui va avec les muscles du jour */
export function etirementsPour(jour: Pick<JourProgramme, 'muscles'>): CardioProgramme | undefined {
  const p = programmeParId('mobilite-3j');
  if (!p) return undefined;
  const haut = jour.muscles.some((m) => ['pectoraux', 'dos', 'epaules', 'biceps', 'triceps'].includes(m));
  const bas = jour.muscles.some((m) => ['jambes', 'fessiers', 'mollets', 'quadriceps', 'ischios'].includes(m));
  const id = haut && !bas ? 'haut' : bas && !haut ? 'jambes' : 'hanches';
  const c = p.jours.find((j) => j.id === id)?.cardio;
  return c ? { sport: c.sport, minutes: c.minutes, consigne: c.consigne } : undefined;
}

/**
 * Ajoute les modules a un jour de musculation. Sans force, grip, cou ni mobilite, c'est exactement la fin de
 * seance (avecFinSeance) : meme objet, memes tests.
 */
export function avecModules<J extends JourProgramme>(jour: J, ctx: ContexteModules | null | undefined): J & AvecModules {
  const j = jour as J & AvecModules;
  if (j.modulesFaits || j.finFaite) return j;
  const extras = extrasDe(ctx?.modules);
  if (!extras.length || !estJourMuscu(jour)) return avecFinSeance(jour, ctx) as J & AvecModules;

  let exos = [...jour.exos] as (ExoProgramme & ExoModule)[];
  const deja = new Set(exos.map((e) => e.nom));
  const rang = rangMuscu(jour, ctx?.programme);

  if (extras.includes('force')) {
    const i = caseLourde(jour);
    if (i >= 0) {
      const d = LOURDS.get(exos[i].nom)!;
      exos[i] = { ...exos[i], repsMin: d.repsMin, repsMax: d.repsMax, reposSec: Math.max(exos[i].reposSec, d.reposSec), conseil: d.conseil ?? CONSEIL_LOURD, module: 'force', lourd: true };
    }
  }
  if (extras.includes('grip')) exos = [...exos, ...exosDuModule('grip-2j', (e) => e.muscle === 'AVANT-BRAS', rang, deja, 2, 'grip')];
  if (extras.includes('cou')) exos = [...exos, ...exosDuModule('cou-combat-2j', (e) => e.muscle === 'COU', rang, deja, 1, 'cou')];

  const etirements = extras.includes('mobilite') ? etirementsPour(jour) : undefined;
  const base = { ...jour, exos } as J;
  // abdos (en dernier) et cardio de la fin de seance
  const avecFin = (ctx?.fin && ctx.fin.choix !== 'rien' ? avecFinSeance(base, ctx) : base) as J & AvecModules;
  return { ...avecFin, ...(etirements ? { finEtirements: etirements } : {}), finFaite: true, modulesFaits: true };
}

/** Le module change quelque chose a au moins un jour de musculation de ce programme */
export function moduleUtile(p: Programme, m: ModuleId): boolean {
  if (!aDesJoursMuscu(p) || p.id === moduleParId(m)?.depuis) return false;
  const fin = m === 'abdos' || m === 'cardio' ? finDesModules([m]) : undefined;
  const ctx: ContexteModules = { fin, materiel: p.materiel, modules: [m], programme: p };
  return p.jours.some((j) => {
    if (!estJourMuscu(j)) return false;
    const x = avecModules(j, ctx);
    return x.exos.length !== j.exos.length || x.exos.some((e, i) => e !== j.exos[i]) || !!x.finCardio || !!x.finEtirements;
  });
}

/** Les modules proposables pour ce programme, dans l'ordre d'affichage */
export function modulesPossibles(p: Programme): ModuleInfo[] {
  return MODULES.filter((m) => moduleUtile(p, m.id));
}

/* ------------------------------------------------------------------------------------------------
 * « Je sais déjà ce que je veux » : les programmes de base, par type
 * ---------------------------------------------------------------------------------------------- */
export type GroupeProgrammes = { id: string; label: string; ids: string[] };

export const GROUPES_PROGRAMMES: GroupeProgrammes[] = [
  { id: 'ppl', label: 'PPL', ids: ['ppl-3j', 'ppl-6j', 'ppl-ul-5j'] },
  { id: 'upper-lower', label: 'Upper Lower', ids: ['haut-bas-4j', 'pp-ul-4j'] },
  { id: 'push-pull', label: 'Push Pull', ids: ['pp-pp-4j'] },
  { id: 'full-body', label: 'Full body', ids: ['debutant-fullbody-3j', 'fullbody-2j', 'halteres-maison-3j', 'maison-3j'] },
  { id: 'split', label: 'Split', ids: ['split-5j'] },
  { id: 'objectif', label: 'Par objectif', ids: ['prise-de-masse-4j', 'pecs-priorite-4j', 'bas-du-corps-4j', 'fessiers-ventre-4j', 'seche-4j', 'perte-poids-4j', 'force-3j'] },
  { id: 'combat', label: 'Combat', ids: ['combat-force-2j', 'grip-2j', 'cou-combat-2j', 'sac-debutant-3j', 'sac-cardio-3j', 'sac-mma-3j', 'sac-hiit-4sem'] },
  { id: 'sports', label: 'Course et sports', ids: ['course-5km-8sem', 'course-10km-8sem', 'foot-prevention-2j', 'padel-raquette-2j', 'mobilite-3j'] },
];
