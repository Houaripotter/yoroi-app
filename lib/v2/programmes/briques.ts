/**
 * Les briques de « Ta semaine » (30 octobre 2026, maquette validée par Houari :
 * _propositions/ta_semaine_2026-10-30). Houari : « je n'arrive pas à mettre le Push et le Pull deux fois par
 * semaine, ni à mélanger PPL et Upper Lower ».
 *
 * Une brique, c'est une séance que tu poses sur un ou plusieurs jours (Push, Pull, Jambes, Pectoraux, Abdos,
 * Cardio...). Toucher une brique change ses exercices une seule fois, pour tous les jours où elle est posée.
 *
 * Le modèle, sans rien casser de monProgramme.ts :
 *  - chaque jour garde sa propre séance (SeancePerso) et son propre sid : tes séances faites et tes progrès
 *    restent attachés au jour où tu les as faites, comme avant ;
 *  - SeancePerso.brique dit de quelle brique vient la séance du jour. Changer une brique recopie ses exercices
 *    sur chaque jour qui la porte (semaine A et semaine B), sans toucher aux sid ;
 *  - ProgrammePerso.briques garde les briques posées nulle part (une brique changée puis retirée de ta semaine
 *    n'est jamais perdue) ;
 *  - un programme d'avant, sans brique : chaque jour devient sa propre brique (nettoyerPerso, monProgramme.ts).
 *
 * Les exercices par défaut viennent des programmes du catalogue (catalogue.ts) : Push, Pull et Jambes du PPL,
 * Haut et Bas de l'Upper Lower, un muscle par jour du split 5 jours, Fessiers du programme fessiers et jambes.
 * Les briques qui n'existent dans aucun programme (Pecs et dos, Épaules et bras, Abdos, Mobilité) prennent des
 * exercices de base de constants/exerciseLibrary.ts, 3 ou 4 séries chacun. Le Cardio est l'exercice cardio de
 * fin de séance avec son chrono (lib/v2/seances/cardioFin.ts), sa durée dans `minutes`.
 * Tes exercices écartés (« Pas dans ma salle », « Ça me fait mal ») sont remplacés comme dans les programmes
 * (perso.ts, eviterEcartes). Données pures, testées dans __tests__/unit/briques.test.ts.
 */
import { programmeParId } from './catalogue';
import { exosAbdosFin } from './finSeance';
import { eviterEcartes } from './perso';
import { nomCardioFin } from '@/lib/v2/seances/cardioFin';
import type { ProgrammePerso, SeancePerso } from './monProgramme';
import type { ExoProgramme } from './types';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

export type GroupeBrique = 'classiques' | 'muscle' | 'cardio_abdos';

/** Les groupes de la feuille du jour, dans l'ordre (textes traduits à l'affichage) */
export const GROUPES_BRIQUES: { id: GroupeBrique; titre: string }[] = [
  { id: 'classiques', titre: 'Classiques' },
  { id: 'muscle', titre: 'Par muscle' },
  { id: 'cardio_abdos', titre: 'Cardio et abdos' },
];

/** La couleur franche d'une brique : une famille des pastels (Habillage.tsx, usePastel) */
export type TeinteBrique = 'bleu' | 'peche' | 'menthe' | 'lilas' | 'creme' | 'nuit';

export type DefBrique = {
  id: string;
  titre: string;
  groupe: GroupeBrique;
  sticker: NomSticker;
  teinte: TeinteBrique;
  /** ses exercices par défaut, avant tes exercices écartés */
  exos: (ecartes: ReadonlySet<string>) => ExoProgramme[];
};

/** Les durées proposées pour la brique Cardio, en minutes */
export const MINUTES_CARDIO = [15, 20, 30, 45, 60] as const;
export const MINUTES_CARDIO_DEFAUT = 30;

const copie = (e: ExoProgramme): ExoProgramme => ({ ...e });

/** Les exercices d'une séance du catalogue (copie), sans ceux du groupe `sans` */
function depuis(programme: string, jour: string, sans?: string): ExoProgramme[] {
  const j = programmeParId(programme)?.jours.find((x) => x.id === jour);
  return (j?.exos ?? []).filter((e) => !sans || e.muscle !== sans).map(copie);
}

const ex = (nom: string, muscle: string, series: number, repsMin: number, repsMax: number, reposSec: number, extra: Partial<ExoProgramme> = {}): ExoProgramme => ({ nom, muscle, series, repsMin, repsMax, reposSec, ...extra });

/** L'exercice cardio d'une brique Cardio : une série, la durée en minutes, le chrono pendant la séance */
export function exoCardioPerso(nom: string, minutes: number = MINUTES_CARDIO_DEFAUT): ExoProgramme {
  const m = Math.min(120, Math.max(5, Math.round(minutes)));
  return { nom, muscle: 'CARDIO', series: 1, repsMin: 1, repsMax: 1, reposSec: 60, secondes: true, poidsDuCorps: true, minutes: m };
}

/** Un exercice cardio avec son chrono (la brique Cardio) */
export const estExoCardio = (e: Pick<ExoProgramme, 'minutes'>): boolean => typeof e.minutes === 'number' && e.minutes > 0;

export const BRIQUES: DefBrique[] = [
  // Classiques
  { id: 'push', titre: 'Push', groupe: 'classiques', sticker: 'musculation', teinte: 'bleu', exos: () => depuis('ppl-3j', 'push') },
  { id: 'pull', titre: 'Pull', groupe: 'classiques', sticker: 'grip', teinte: 'peche', exos: () => depuis('ppl-3j', 'pull') },
  { id: 'jambes', titre: 'Jambes', groupe: 'classiques', sticker: 'force', teinte: 'menthe', exos: () => depuis('ppl-3j', 'legs') },
  { id: 'haut', titre: 'Haut du corps', groupe: 'classiques', sticker: 'muscle', teinte: 'lilas', exos: () => depuis('haut-bas-4j', 'haut-a') },
  { id: 'bas', titre: 'Bas du corps', groupe: 'classiques', sticker: 'kettlebell', teinte: 'creme', exos: () => depuis('haut-bas-4j', 'bas-a') },
  { id: 'corps', titre: 'Corps entier', groupe: 'classiques', sticker: 'corps', teinte: 'nuit', exos: () => depuis('fullbody-2j', 'A') },
  // Par muscle
  { id: 'pecs', titre: 'Pectoraux', groupe: 'muscle', sticker: 'barre', teinte: 'bleu', exos: () => depuis('split-5j', 'pecs') },
  { id: 'dos', titre: 'Dos', groupe: 'muscle', sticker: 'chaine', teinte: 'peche', exos: () => depuis('split-5j', 'dos') },
  { id: 'epaules', titre: 'Épaules', groupe: 'muscle', sticker: 'force_eclair', teinte: 'lilas', exos: () => depuis('split-5j', 'epaules', 'ABDOS') },
  { id: 'bras', titre: 'Bras', groupe: 'muscle', sticker: 'bras', teinte: 'creme', exos: () => depuis('split-5j', 'bras', 'ABDOS') },
  {
    id: 'pecs_dos', titre: 'Pecs et dos', groupe: 'muscle', sticker: 'enclume', teinte: 'bleu',
    exos: () => [
      ex('Développé Couché (Barre)', 'PECTORAUX', 4, 6, 10, 150),
      ex('Tractions (Pronation)', 'DOS', 4, 6, 10, 150),
      ex('Développé Incliné (Haltères)', 'PECTORAUX', 3, 8, 12, 120),
      ex('Rowing Barre (Bent Over)', 'DOS', 3, 6, 10, 150),
      ex('Écartés à la Poulie Haute', 'PECTORAUX', 3, 12, 15, 90),
      ex('Tirage Horizontal (Seated Row)', 'DOS', 3, 10, 12, 90),
    ],
  },
  {
    id: 'epaules_bras', titre: 'Épaules et bras', groupe: 'muscle', sticker: 'poing', teinte: 'lilas',
    exos: () => [
      ex('Développé Militaire Assis', 'ÉPAULES', 4, 6, 10, 150),
      ex('Élévations Latérales (Haltères)', 'ÉPAULES', 4, 12, 15, 60),
      ex('Oiseau Machine (Reverse Pec Deck)', 'ÉPAULES', 3, 12, 15, 60),
      ex('Curl Barre EZ', 'BICEPS', 3, 8, 12, 90),
      ex('Barre au front (Skullcrusher)', 'TRICEPS', 3, 8, 12, 90),
      ex('Curl Marteau (Hammer)', 'BICEPS', 3, 10, 12, 90),
    ],
  },
  { id: 'fessiers', titre: 'Fessiers', groupe: 'muscle', sticker: 'fessiers', teinte: 'menthe', exos: () => depuis('bas-du-corps-4j', 'bas-a') },
  // Cardio et abdos
  {
    id: 'abdos', titre: 'Abdos', groupe: 'cardio_abdos', sticker: 'abdos', teinte: 'creme',
    // les abdos de fin de séance (finSeance.ts, exosAbdosFin), avec quatre exercices de plus
    exos: () => {
      const fin = exosAbdosFin('salle').map(({ fin: _f, ...e }) => e as ExoProgramme);
      return [
        ex('Relevé de jambes Suspendu', 'ABDOS', 3, 10, 15, 90, { poidsDuCorps: true }),
        ...fin.filter((e) => !e.secondes),
        ex('Roulette Abdos (Abs Wheel)', 'ABDOS', 3, 8, 12, 90, { poidsDuCorps: true }),
        ex('Pallof Press', 'ABDOS', 3, 10, 12, 60),
        ...fin.filter((e) => e.secondes),
        ex('Gainage Latéral', 'ABDOS', 3, 20, 30, 45, { secondes: true, poidsDuCorps: true, conseil: 'Coude sous l’épaule, le bassin reste haut. Chaque côté.' }),
      ];
    },
  },
  { id: 'cardio', titre: 'Cardio', groupe: 'cardio_abdos', sticker: 'cardio_zone2', teinte: 'peche', exos: (ecartes) => [exoCardioPerso(nomCardioFin(ecartes))] },
  {
    id: 'mobilite', titre: 'Mobilité et étirements', groupe: 'cardio_abdos', sticker: 'mobilite', teinte: 'menthe',
    exos: () => [
      ex('Mobilité Hanches', 'MOBILITÉ', 2, 45, 60, 15, { secondes: true, poidsDuCorps: true }),
      ex('Mobilité Thoracique', 'MOBILITÉ', 2, 45, 60, 15, { secondes: true, poidsDuCorps: true }),
      ex('Mobilité Épaules', 'MOBILITÉ', 2, 45, 60, 15, { secondes: true, poidsDuCorps: true }),
      ex('Mobilité Chevilles', 'MOBILITÉ', 2, 45, 60, 15, { secondes: true, poidsDuCorps: true }),
      ex('Stretching Bas du Corps', 'FLEXIBILITÉ', 2, 45, 60, 15, { secondes: true, poidsDuCorps: true }),
      ex('Stretching Dos', 'FLEXIBILITÉ', 2, 45, 60, 15, { secondes: true, poidsDuCorps: true }),
    ],
  },
];

export function briqueParId(id: string | null | undefined): DefBrique | undefined {
  return id ? BRIQUES.find((b) => b.id === id) : undefined;
}

/** La séance par défaut d'une brique du catalogue, tes exercices écartés remplacés ; undefined si inconnue */
export function seanceDeBrique(id: string, ecartes: ReadonlySet<string> = new Set()): SeancePerso | undefined {
  const b = briqueParId(id);
  if (!b) return undefined;
  const exos = eviterEcartes({ exos: b.exos(ecartes) }, ecartes).exos;
  return { titre: b.titre, exos, brique: b.id };
}

/* ---------------------------------- les briques de ton programme ---------------------------------- */

export type PlaceBrique = { d: number; b: boolean };
export type BriqueDuPerso = { cle: string; seance: SeancePerso; jours: PlaceBrique[] };

const pleine = (s: SeancePerso | null | undefined): s is SeancePerso => !!s;

/**
 * Tes briques : celles posées dans ta semaine (A puis B, dans l'ordre des jours), puis celles posées nulle part.
 * La séance montrée est celle du premier jour qui la porte.
 */
export function briquesDuPerso(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'briques'>): BriqueDuPerso[] {
  const out = new Map<string, BriqueDuPerso>();
  const lignes: [boolean, (SeancePerso | null)[]][] = [[false, pp.semaine], [true, pp.semaineB ?? []]];
  for (const [b, l] of lignes) {
    l.forEach((s, d) => {
      if (!pleine(s) || !s.brique) return;
      const x = out.get(s.brique);
      if (x) x.jours.push({ d, b });
      else out.set(s.brique, { cle: s.brique, seance: s, jours: [{ d, b }] });
    });
  }
  for (const s of pp.briques ?? []) {
    if (s.brique && !out.has(s.brique)) out.set(s.brique, { cle: s.brique, seance: s, jours: [] });
  }
  return Array.from(out.values());
}

/** La séance de cette brique dans ton programme (posée ou gardée), sinon celle du catalogue */
export function seanceDeCle(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'briques'>, cle: string, ecartes: ReadonlySet<string> = new Set()): SeancePerso | undefined {
  return briquesDuPerso(pp).find((x) => x.cle === cle)?.seance ?? seanceDeBrique(cle, ecartes);
}

const sansPlace = (s: SeancePerso): SeancePerso => {
  const { sid: _sid, ...reste } = s;
  return { ...reste, exos: s.exos.map(copie) };
};

const porte = (pp: Pick<ProgrammePerso, 'semaine' | 'semaineB'>, cle: string) => [...pp.semaine, ...(pp.semaineB ?? [])].some((s) => !!s && s.brique === cle);

/**
 * Pose une brique sur un jour de la semaine montrée (null : repos). Le jour qui avait déjà cette brique garde sa
 * séance (son sid). Une brique qui n'est plus posée nulle part est gardée dans `briques`, jamais perdue.
 */
export function poserBrique(pp: ProgrammePerso, jour: number, cle: string | null, ecartes: ReadonlySet<string> = new Set()): ProgrammePerso {
  if (jour < 0 || jour > 6) return pp;
  const avant = pp.semaine[jour] ?? null;
  if (cle && avant && avant.brique === cle) return pp;
  let briques = (pp.briques ?? []).slice();
  let nouvelle: SeancePerso | null = null;
  if (cle) {
    const src = seanceDeCle(pp, cle, ecartes);
    if (!src) return pp;
    nouvelle = { ...sansPlace(src), brique: cle };
    briques = briques.filter((s) => s.brique !== cle);
  }
  const semaine = pp.semaine.slice();
  semaine[jour] = nouvelle;
  const suite: ProgrammePerso = { ...pp, semaine };
  if (avant && avant.brique && avant.exos.length && !porte(suite, avant.brique) && !briques.some((s) => s.brique === avant.brique)) {
    briques = [...briques, sansPlace(avant)];
  }
  if (briques.length) suite.briques = briques;
  else delete suite.briques;
  return suite;
}

/**
 * Change une brique une seule fois : ses exercices (et son nom) sont recopiés sur chaque jour qui la porte,
 * semaines A et B. Chaque jour garde son sid. Une brique du catalogue posée nulle part est gardée dans `briques`.
 */
export function modifierBrique(pp: ProgrammePerso, cle: string, changer: (s: SeancePerso) => SeancePerso, ecartes: ReadonlySet<string> = new Set()): ProgrammePerso {
  const src = seanceDeCle(pp, cle, ecartes);
  if (!src) return pp;
  const neuve = changer(sansPlace(src));
  const contenu = (s: SeancePerso): SeancePerso => ({
    ...(neuve.titre ? { titre: neuve.titre } : {}),
    exos: neuve.exos.map(copie),
    ...(s.sid ? { sid: s.sid } : {}),
    brique: cle,
  });
  const l = (x: (SeancePerso | null)[]) => x.map((s) => (s && s.brique === cle ? contenu(s) : s));
  const suite: ProgrammePerso = { ...pp, semaine: l(pp.semaine), ...(pp.semaineB ? { semaineB: l(pp.semaineB) } : {}) };
  if (!porte(suite, cle)) {
    const autres = (pp.briques ?? []).filter((s) => s.brique !== cle);
    suite.briques = [...autres, contenu({ exos: [] })];
  }
  return suite;
}

/** Une clé de brique neuve, jamais celle d'une autre */
export function nouvelleCle(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'briques'>, maintenant = Date.now()): string {
  const prises = new Set([...briquesDuPerso(pp).map((x) => x.cle), ...BRIQUES.map((b) => b.id)]);
  let k = 0;
  let c = `m${maintenant.toString(36)}`;
  while (prises.has(c)) c = `m${maintenant.toString(36)}${(++k).toString(36)}`;
  return c;
}

/** Une brique à toi (« Créer une séance », une séance de Mes séances, d'un autre programme), gardée dans `briques` */
export function creerBrique(pp: ProgrammePerso, s: Omit<SeancePerso, 'brique' | 'sid'>, maintenant = Date.now()): { pp: ProgrammePerso; cle: string } {
  const cle = nouvelleCle(pp, maintenant);
  const seance: SeancePerso = { ...(s.titre ? { titre: s.titre.slice(0, 40) } : {}), exos: s.exos.map(copie), brique: cle };
  return { pp: { ...pp, briques: [...(pp.briques ?? []), seance] }, cle };
}

/** Les jours où une brique est posée dans la semaine montrée (0 = lundi) */
export function joursDeBrique(pp: Pick<ProgrammePerso, 'semaine'>, cle: string): number[] {
  return pp.semaine.map((s, d) => (s && s.brique === cle ? d : -1)).filter((d) => d >= 0);
}

/**
 * Revue du 30 octobre 2026 : les jours qui portent cette brique (semaines A et B) quand il y en a au moins deux,
 * sinon une liste vide. La feuille de reglage d'un exercice les annonce : le changement vaut partout.
 */
export function joursAPrevenir(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'briques'>, cle: string): PlaceBrique[] {
  const jours = briquesDuPerso(pp).find((x) => x.cle === cle)?.jours ?? [];
  return jours.length > 1 ? jours : [];
}
