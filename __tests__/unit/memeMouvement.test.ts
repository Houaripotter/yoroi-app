/**
 * Le même mouvement sous deux noms (3 novembre 2026). Houari, séance en direct de « Push Pull + Upper Lower »,
 * Pull B : « 6 Cable Crunch » puis « 7 Crunch Poulie Haute », le même exercice en anglais et en français.
 * La bibliothèque garde les deux noms (des séances sont enregistrées sous chacun) et les relie
 * (constants/exerciseLibrary.ts, SAME_MOVEMENT_GROUPS) ; une séance construite par l'app ne les met jamais ensemble.
 */
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null),
    setItem: async (k: string, v: string) => { mockStore.set(k, String(v)); },
    removeItem: async (k: string) => { mockStore.delete(k); },
  };
  return { __esModule: true, default: api, ...api };
});
import { EXERCISE_LIBRARY, SAME_MOVEMENT_GROUPS, canonicalExerciseName, isSameMovement, movementKey, sameMovementName } from '@/constants/exerciseLibrary';
import { PROGRAMMES, programmeParId } from '@/lib/v2/programmes/catalogue';
import { avecFinSeance, estJourMuscu, retenirAbdosHabituels, sansFinEnDouble } from '@/lib/v2/programmes/finSeance';
import type { FinSeance } from '@/lib/v2/programmes/finSeance';
import { jourPourToi } from '@/lib/v2/programmes/perso';
import { equivalentB, genererVarianteB } from '@/lib/v2/programmes/varianteB';
import { abdosHabituels } from '@/lib/v2/seances/habitudesFin';
import type { ExoProgramme, JourProgramme } from '@/lib/v2/programmes/types';

const ABDOS: FinSeance = { choix: 'abdos', minutes: 30 };
const pp = programmeParId('pp-ul-4j')!;
const pull = pp.jours.find((j) => j.id === 'pull')!;
const ctx = { fin: ABDOS, materiel: pp.materiel, programme: pp };

/** Les paires de noms d'une liste qui sont le même mouvement */
function doublons(noms: readonly string[]): string[] {
  const vus = new Map<string, string>();
  const out: string[] = [];
  for (const n of noms) {
    const k = movementKey(n);
    if (vus.has(k)) out.push(`${vus.get(k)} + ${n}`);
    else vus.set(k, n);
  }
  return out;
}

afterEach(() => retenirAbdosHabituels(null));

describe('la bibliothèque relie les deux noms, sans rien retirer', () => {
  it('Cable Crunch et Crunch Poulie Haute sont le même mouvement, les deux restent dans la bibliothèque', () => {
    expect(isSameMovement('Cable Crunch', 'Crunch Poulie Haute')).toBe(true);
    expect(isSameMovement('cable crunch', 'Crunch poulie haute')).toBe(true);
    expect(sameMovementName('Cable Crunch')).toBe('Crunch Poulie Haute');
    const noms = new Set(EXERCISE_LIBRARY.map((e) => e.name));
    expect(noms.has('Cable Crunch')).toBe(true);
    expect(noms.has('Crunch Poulie Haute')).toBe(true);
  });
  it('chaque nom relié est un exercice de musculation de la bibliothèque, dans un seul groupe', () => {
    const tous = SAME_MOVEMENT_GROUPS.flat();
    expect(new Set(tous).size).toBe(tous.length);
    for (const g of SAME_MOVEMENT_GROUPS) {
      for (const n of g) expect(EXERCISE_LIBRARY.some((e) => e.name === n && e.category === 'musculation')).toBe(true);
    }
  });
  it('des exercices proches mais différents ne sont pas reliés', () => {
    expect(isSameMovement('Développé Incliné (Haltères)', 'Développé Incliné (Barre)')).toBe(false);
    expect(isSameMovement('Curl Barre EZ', 'Curl Barre Droite')).toBe(false);
    expect(isSameMovement('Crunch Poulie Haute', 'Crunch Abdominal')).toBe(false);
  });
  it('les anciens noms retirés suivent toujours (canonicalExerciseName ne change pas)', () => {
    expect(canonicalExerciseName('Cable Crunch')).toBe('Cable Crunch');
    expect(isSameMovement('Uchi Mata', 'Uchi-mata')).toBe(true);
  });
});

describe('la fin de séance ne répète jamais un exercice de la séance', () => {
  it('Pull : la planche et le crunch poulie, une fois chacun', () => {
    const j = avecFinSeance(pull, ctx);
    expect(j.exos.slice(pull.exos.length).map((e) => e.nom)).toEqual(['Gainage Planche', 'Crunch Poulie Haute']);
  });
  it('tes abdos habituels sous deux noms du même mouvement : un seul est ajouté', () => {
    retenirAbdosHabituels([
      { nom: 'Cable Crunch', muscle: 'ABDOS', series: 3, repsMin: 12, repsMax: 12, reposSec: 60 },
      { nom: 'Crunch Poulie Haute', muscle: 'ABDOS', series: 3, repsMin: 12, repsMax: 12, reposSec: 60 },
    ]);
    const noms = avecFinSeance(pull, ctx).exos.map((e) => e.nom);
    expect(doublons(noms)).toEqual([]);
    expect(noms.filter((n) => isSameMovement(n, 'Crunch Poulie Haute'))).toEqual(['Cable Crunch']);
  });
  it('« Changer » la planche pour Cable Crunch : le Crunch Poulie Haute de la fin tombe, ton choix reste (le cas de Houari)', () => {
    const j = jourPourToi(pull, null, [], undefined, { 'pull|5': 'Cable Crunch' }, ctx);
    const noms = j.exos.map((e) => e.nom);
    expect(noms.slice(0, pull.exos.length)).toEqual(pull.exos.map((e) => e.nom));
    expect(noms[5]).toBe('Cable Crunch');
    expect(doublons(noms)).toEqual([]);
    expect(noms).toHaveLength(pull.exos.length + 1);
  });
  it('un exercice du programme n est jamais retiré, seul l ajout de fin tombe', () => {
    const exos = [
      { nom: 'Cable Crunch', fin: undefined },
      { nom: 'Tractions (Pronation)' },
      { nom: 'Gainage Planche', fin: true as const },
      { nom: 'Crunch Poulie Haute', fin: true as const },
    ];
    expect(sansFinEnDouble(exos).map((e) => e.nom)).toEqual(['Cable Crunch', 'Tractions (Pronation)', 'Gainage Planche']);
    const propre = [{ nom: 'Tractions (Pronation)' }, { nom: 'Gainage Planche', fin: true as const }];
    expect(sansFinEnDouble(propre)).toBe(propre);
  });
});

describe('la version B ne prend pas le même mouvement sous un autre nom', () => {
  it('Crunch Poulie Haute n a pas Cable Crunch pour version B', () => {
    const e: ExoProgramme = { nom: 'Crunch Poulie Haute', muscle: 'ABDOS', series: 3, repsMin: 10, repsMax: 15, reposSec: 90 };
    const b = equivalentB(e, { deja: ['Crunch Poulie Haute'] });
    expect(b && isSameMovement(b.nom, 'Crunch Poulie Haute')).toBeFalsy();
  });
  it('une séance qui a déjà Cable Crunch ne reçoit pas Crunch Poulie Haute en B', () => {
    const s = { exos: [
      { nom: 'Cable Crunch', muscle: 'ABDOS', series: 3, repsMin: 10, repsMax: 15, reposSec: 90 },
      { nom: 'Crunch Abdominal', muscle: 'ABDOS', series: 3, repsMin: 10, repsMax: 15, reposSec: 90 },
    ] };
    expect(doublons(genererVarianteB(s).exos.map((e) => e.nom))).toEqual([]);
  });
});

describe('tes séances enregistrées : un mouvement, une habitude', () => {
  it('Cable Crunch et Crunch Poulie Haute dans ton historique : un seul abdo habituel, sous le nom le plus utilisé', () => {
    const maintenant = new Date(2026, 10, 3, 12);
    const seance = (jour: number, abdo: string) => ({
      date: `2026-11-0${jour}`,
      exercises: [
        { name: 'Tractions (Pronation)', muscle_group: 'DOS', sets: 3, reps: 8 },
        { name: abdo, muscle_group: 'ABDOS', sets: 3, reps: 12, weight: 20 },
      ],
    });
    const h = abdosHabituels([seance(1, 'Cable Crunch'), seance(2, 'Crunch Poulie Haute'), seance(3, 'Crunch Poulie Haute')], maintenant);
    expect(h?.map((e) => e.nom)).toEqual(['Crunch Poulie Haute']);
  });
});

describe('tous les programmes du catalogue : jamais deux fois le même mouvement', () => {
  it('séance A, A avec la fin de séance, version B, B avec la fin de séance', () => {
    const trouves: string[] = [];
    for (const p of PROGRAMMES) {
      for (const j of p.jours as JourProgramme[]) {
        if (!estJourMuscu(j)) continue;
        const c = { fin: ABDOS, materiel: p.materiel, programme: p };
        const b = genererVarianteB({ exos: j.exos, titre: j.titre });
        const cas: [string, string[]][] = [
          ['A', j.exos.map((e) => e.nom)],
          ['A+fin', avecFinSeance(j, c).exos.map((e) => e.nom)],
          ['B', b.exos.map((e) => e.nom)],
          ['B+fin', avecFinSeance({ ...j, exos: b.exos }, c).exos.map((e) => e.nom)],
        ];
        for (const [lab, noms] of cas) for (const d of doublons(noms)) trouves.push(`${p.id}/${j.id} ${lab}: ${d}`);
      }
    }
    expect(trouves).toEqual([]);
  });
});
