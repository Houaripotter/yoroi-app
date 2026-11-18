/**
 * 18 novembre 2026 : reprise plus precise (lib/v2/import/repriseHevy.ts) et de bout en bout jusqu'a la seance du jour.
 * Jeu realiste au format de l'export CSV de Hevy : 6 mois, titres renommes a mi-parcours, une seance au titre
 * generique, des echauffements, une semaine de vacances, une seance baclee la derniere fois.
 */
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null),
    setItem: async (k: string, v: string) => { mockStore.set(k, String(v)); },
    removeItem: async (k: string) => { mockStore.delete(k); },
    getAllKeys: async () => [...mockStore.keys()],
    multiGet: async (ks: string[]) => ks.map((k) => [k, mockStore.get(k) ?? null]),
    multiSet: async (l: [string, string][]) => { for (const [k, v] of l) mockStore.set(k, v); },
  };
  return { __esModule: true, default: api, ...api };
});
import { lireCarnet, lireHevy } from '@/lib/v2/import/carnet';
import type { SeanceLue } from '@/lib/v2/import/carnet';
import { versExercice } from '@/lib/v2/import/enregistrerCarnet';
import {
  appliquerChoix,
  avecSemainesAB,
  correspondances,
  echelleRepos,
  placementPropose,
  placerJour,
  prochaineSeanceRoutine,
  reconnaitreHevy,
  reconstruireRoutine,
  refusParDefaut,
  titreGenerique,
  versProgrammeHevy,
} from '@/lib/v2/import/repriseHevy';
import { reconnaitreExo } from '@/lib/v2/import/vocabulaire';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { enregistrerProgrammePerso, idDuJourPerso } from '@/lib/v2/programmes/monProgramme';
import { chargerProgrammeActif, seanceAFaire, suivreProgrammePerso } from '@/lib/v2/programmes/suivi';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { jourDuProgramme } from '@/lib/v2/programmes/semaineLibre';
import { proposer, seancesDeLExo } from '@/lib/v2/programmes/progression';
import { REPOS_CONSEILLE } from '@/lib/v2/seances/reposConseille';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import type { Training } from '@/lib/database';

const BIB = EXERCISE_LIBRARY.filter((e) => e.category === 'musculation' || e.unit === 'reps' || e.unit === 'time' || e.category === 'cardio' || e.category === 'street_workout').map((e, rang) => ({ name: e.name, autre: nomFr(e.name) !== e.name ? nomFr(e.name) : undefined, muscle: e.muscle, rang }));
const reconnaitre = (n: string) => reconnaitreHevy(n, (x) => reconnaitreExo(x, BIB), BIB);
const muscleBiblio = (n: string) => EXERCISE_LIBRARY.find((e) => e.name === n)?.muscle ?? null;

const TETE = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';
const MOIS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dh = (ms: number) => { const d = new Date(ms); return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
type Exo = { n: string; s: [number, number][]; w?: [number, number]; type?: string };
function seance(rows: string[], titre: string, jour: number, minutes: number, exos: Exo[]) {
  const a = jour + 18 * 3600000;
  const b = a + minutes * 60000;
  for (const e of exos) {
    let i = 0;
    if (e.w) rows.push(`"${titre}","${dh(a)}","${dh(b)}","","${e.n}","","",${i++},"warmup",${e.w[0]},${e.w[1]},,,`);
    for (const [kg, r] of e.s) rows.push(`"${titre}","${dh(a)}","${dh(b)}","","${e.n}","","",${i++},"${e.type ?? 'normal'}",${kg},${r},,,8`);
  }
}
const J = 86400000;
const L0 = Date.UTC(2026, 4, 18); // lundi 18 mai 2026

/** 26 semaines ; « Push day » et « Pull day » deviennent « Push » et « Pull » en semaine 20 ; vacances en semaine 18 */
function sixMois(): string {
  const rows = [TETE];
  for (let k = 0; k < 26; k++) {
    if (k === 18) continue;
    const l = L0 + k * 7 * J;
    const p = 60 + k;
    const push = k < 20 ? 'Push day' : 'Push';
    const pull = k < 20 ? 'Pull day' : 'Pull';
    const bench: Exo = { n: 'Bench Press (Barbell)', w: [40, 10], s: [[p, 8], [p, 8], [p, 7]] };
    const lat: Exo = { n: 'Lateral Raise (Dumbbell)', s: [[10, 12], [10, 12], [10, 11]] };
    const tri: Exo = { n: 'Triceps Pushdown', s: [[30, 12], [30, 12], [30, 10]] };
    if (k === 25) seance(rows, push, l, 30, [{ n: 'Bench Press (Barbell)', s: [[p, 5]] }, { n: 'Lateral Raise (Dumbbell)', s: [[10, 12]] }]);
    else if (k === 24) seance(rows, push, l, 30, [bench, lat]);
    else if (k === 23) seance(rows, push, l, 30, [bench, lat, tri, { n: 'Cable Fly Crossovers', s: [[15, 12], [15, 12], [15, 12]] }]);
    else if (k === 22) seance(rows, push, l, 30, [bench, tri, lat]);
    else seance(rows, push, l, 30, [bench, lat, tri]);
    seance(rows, pull, l + 3 * J, 70, [
      { n: 'Lat Pulldown (Cable)', s: [[55, 10], [55, 10], [55, 9]] },
      { n: 'Dumbbell Row', s: [[30, 10], [30, 10]] },
      { n: 'Assisted Pull Up', s: [[20, 8], [20, 8]] },
      { n: 'Pull Up (Weighted)', s: [[10, 6], [10, 6]], type: k % 2 ? 'failure' : 'normal' },
    ]);
    seance(rows, 'Morning Workout', l + 2 * J, 50, [
      { n: 'Squat (Barbell)', w: [60, 5], s: [[100, 5], [100, 5], [100, 5]] },
      { n: 'Leg Press (Machine)', s: [[160, 10], [160, 10]] },
      { n: 'Lying Leg Curl (Machine)', s: [[40, 12], [40, 12]] },
    ]);
  }
  return rows.join('\n') + '\n';
}

const brut = lireHevy(sixMois())!.seances;
const liste = correspondances(brut, reconnaitre, muscleBiblio);
const refus = refusParDefaut(liste);
const finales = appliquerChoix(brut, liste, refus);
const muscleDe = (n: string) => muscleBiblio(n) ?? liste.find((c) => c.saisi === n)?.muscle ?? null;
const r = reconstruireRoutine(finales, { muscleDe });
const push = r.seances.find((s) => s.cle === 'push')!;
const pull = r.seances.find((s) => s.cle === 'pull')!;
const jambes = r.seances.find((s) => s.nomDeduit)!;

describe('titres generiques ou changes', () => {
  it('les titres par defaut sont reconnus', () => {
    for (const t of ['Morning Workout', 'Séance du soir', 'Entraînement', 'Workout 12', '', '14/10/2026', 'Lundi']) expect(titreGenerique(t)).toBe(true);
    for (const t of ['Push', 'Jambes', 'PUSH A FORCE', 'Upper B']) expect(titreGenerique(t)).toBe(false);
  });
  it('Push day et Push reunies, Pull day et Pull aussi', () => {
    expect(r.seances).toHaveLength(3);
    expect(push).toMatchObject({ titre: 'Push', reunies: ['Push day'] });
    expect(pull).toMatchObject({ titre: 'Pull', reunies: ['Pull day'] });
  });
  it('la seance generique a un nom deduit des muscles, a renommer', () => {
    expect(jambes.titre).toBe('Jambes et ischios');
    expect(jambes.cle.startsWith('g ')).toBe(true);
  });
  it('Push A et Push B ne sont jamais reunies, meme avec les memes exercices', () => {
    const rows = [TETE];
    for (let k = 0; k < 6; k++) {
      seance(rows, 'Push A', L0 + k * 7 * J, 30, [{ n: 'Bench Press (Barbell)', s: [[80, 5]] }, { n: 'Lateral Raise (Dumbbell)', s: [[10, 12]] }]);
      seance(rows, 'Push B', L0 + k * 7 * J + 3 * J, 30, [{ n: 'Bench Press (Barbell)', s: [[70, 8]] }, { n: 'Lateral Raise (Dumbbell)', s: [[10, 12]] }]);
    }
    expect(reconstruireRoutine(lireHevy(rows.join('\n'))!.seances).seances.map((s) => s.titre).sort()).toEqual(['Push A', 'Push B']);
  });
});

describe('la seance type sur les 4 dernieres fois', () => {
  it('exercice fait une seule fois ignore, exercice saute une fois garde, ordre median', () => {
    expect(push.exos.map((e) => e.nom)).toEqual(['Développé Couché (Barre)', 'Élévations Latérales (Haltères)', 'Extension Triceps Poulie (Barre)']);
  });
  it('seance baclee la derniere fois : les charges et repetitions de la fois d avant', () => {
    expect(push.versionPrecedente).toBe(true);
    // semaine 24 : 84 kg, 8, 8, 7 ; series les plus frequentes : 3 (l'echauffement ne compte pas)
    expect(push.exos[0]).toMatchObject({ charge: 84, series: 3, repsMin: 7, repsMax: 8 });
    // le triceps, absent la semaine 24 : sa derniere fois (semaine 23)
    expect(push.exos[2]).toMatchObject({ charge: 30, series: 3 });
  });
  it('une derniere seance tres baclee (1 exercice sur 4) ne fait pas disparaitre la seance', () => {
    const rows = [TETE];
    for (let k = 0; k < 5; k++) {
      const exos: Exo[] = k === 4
        ? [{ n: 'Squat (Barbell)', s: [[100, 3]] }]
        : [{ n: 'Squat (Barbell)', s: [[100, 5], [100, 5]] }, { n: 'Leg Press (Machine)', s: [[160, 10]] }, { n: 'Leg Extension (Machine)', s: [[50, 12]] }, { n: 'Seated Calf Raise', s: [[40, 15]] }];
      seance(rows, 'Jambes', L0 + k * 7 * J, 40, exos);
    }
    const x = reconstruireRoutine(lireHevy(rows.join('\n'))!.seances);
    expect(x.seances).toHaveLength(1);
    expect(x.seances[0]).toMatchObject({ versionPrecedente: true });
    expect(x.seances[0].exos).toHaveLength(4);
  });
  it('echauffements gardes dans l historique avec leur type, hors series de travail', () => {
    const b = brut.find((s) => s.titre === 'Push day')!.exos[0];
    expect(b.series[0]).toMatchObject({ type: 'warmup', weight: 40 });
    expect(versExercice(brut.find((s) => s.titre === 'Push day')!.exos[0]).setsData![0]).toMatchObject({ type: 'warmup', weight: 40 });
  });
});

describe('machines : confiance et cas particuliers', () => {
  it('correspondance sure reliee, ressemblance a verifier', () => {
    expect(liste.find((c) => c.saisi === 'Bench Press (Barbell)')).toMatchObject({ confiance: 1, exact: true });
    expect(liste.find((c) => c.saisi === 'Pull Up (Weighted)')).toMatchObject({ propose: 'Tractions Lestées', confiance: 1 });
  });
  it('machine assistee jamais reliee aux tractions, charge gardee telle quelle', () => {
    expect(liste.find((c) => c.saisi === 'Assisted Pull Up')).toMatchObject({ propose: null, confiance: 0 });
    expect(pull.exos.find((e) => e.nom === 'Assisted Pull Up')?.charge).toBe(20);
  });
  it('unilateral : la charge d un bras gardee telle quelle', () => {
    expect(pull.exos.find((e) => e.nom === 'Rowing Haltère (One Arm)')?.charge).toBe(30);
  });
  it('serie a l echec lue comme une serie de travail', () => {
    expect(pull.exos.find((e) => e.nom === 'Tractions Lestées')).toMatchObject({ series: 2, charge: 10 });
  });
});

describe('rythme recent et repos reel', () => {
  it('jours habituels, 3 seances par semaine, vacances ignorees', () => {
    expect(r.rythme).toBe('semaine');
    expect(r.parSemaine).toBe(3);
    expect([push.jour, jambes.jour, pull.jour]).toEqual([0, 2, 3]);
  });
  it('repos reel plausible : la seance Push de 30 min, ajuste le repos conseille', () => {
    expect(push.reposReelSec).toBe(165);
    // Pull : 70 min pour 9 series, plus de 5 min entre deux series : pas plausible, repos conseille
    expect(pull.reposReelSec).toBeUndefined();
    const e = echelleRepos(push, muscleDe);
    expect(e).toBeGreaterThan(1);
    const pp = versProgrammeHevy(r, { muscleDe })!;
    const s = pp.semaine[0]!;
    expect(s.exos[0].reposSec).toBeGreaterThan(s.exos[1].reposSec);
    expect(pp.semaine[3]!.exos[0].reposSec).toBe(REPOS_CONSEILLE.muscle.poly);
  });
  it('semaine A et semaine B malgre une semaine de vacances, avec confiance', () => {
    const rows = [TETE];
    let n = 0;
    for (let k = 0; k < 11; k++) {
      if (k === 5) continue;
      const ab = n++ % 2 ? 'B' : 'A';
      seance(rows, `Upper ${ab}`, L0 + k * 7 * J, 40, [{ n: 'Bench Press (Barbell)', s: [[80, 5], [80, 5]] }]);
      seance(rows, `Lower ${ab}`, L0 + k * 7 * J + 3 * J, 40, [{ n: 'Squat (Barbell)', s: [[100, 5], [100, 5]] }]);
    }
    const x = reconstruireRoutine(lireHevy(rows.join('\n'))!.seances);
    expect(x.rythme).toBe('ab');
    expect(x.confianceAB).toBe('sur');
    expect(x.seances.map((s) => `${s.titre}:${s.semaine}`)).toEqual(['Upper A:A', 'Lower A:A', 'Upper B:B', 'Lower B:B']);
    // derniere semaine (10) : une B ; la suite est une A, la semaine 11
    expect(x.depuis).toBe('2026-08-03');
  });
});

describe('unites', () => {
  it('les livres converties en kilos au centieme : affichees en livres, on retrouve le chiffre', () => {
    const t = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"
"Push","1 Oct 2026, 18:00","1 Oct 2026, 19:00","","Bench Press (Barbell)","","",0,"normal",225,5,,,
`;
    const s = lireCarnet(t).seances[0];
    expect(s.exos[0].series[0].weight).toBe(102.06);
    expect(versUnitePoids(102.06, 'lb')).toBeCloseTo(225, 0);
  });
});

/* ---------------------------------- de bout en bout ---------------------------------- */

function semainesAB(): SeanceLue[] {
  const rows = [TETE];
  for (let k = 0; k < 8; k++) {
    const l = Date.UTC(2026, 8, 7) + k * 7 * J;
    const p = 60 + k * 2.5;
    if (k % 2 === 0) {
      seance(rows, 'PUSH A FORCE', l, 40, [{ n: 'Bench Press (Barbell)', w: [40, 10], s: [[p, 6], [p, 6], [p, 6]] }, { n: 'Lateral Raise (Dumbbell)', s: [[10, 12], [10, 12]] }]);
      seance(rows, 'Pull A', l + 3 * J, 40, [{ n: 'Lat Pulldown (Cable)', s: [[55, 10], [55, 10]] }]);
    } else {
      seance(rows, 'Push B', l, 40, [{ n: 'Incline Bench Press (Dumbbell)', s: [[24, 10], [24, 10]] }]);
      seance(rows, 'Pull B', l + 3 * J, 40, [{ n: 'Bent Over Row (Barbell)', s: [[70, 8], [70, 8]] }]);
    }
  }
  return lireHevy(rows.join('\n'))!.seances;
}

describe('de bout en bout : de l export a la seance en direct', () => {
  beforeEach(() => mockStore.clear());

  it('Ta semaine : proposee, ajustee en un geste, semaine A et B a corriger', () => {
    const x = reconstruireRoutine(semainesAB());
    const p = placementPropose(x);
    expect(p.ab).toBe(true);
    expect(p.jours['push a force']).toEqual({ a: [0], b: [] });
    const deplace = placerJour(p, 'pull a', 'a', 4);
    expect(deplace.jours['pull a'].a).toEqual([3, 4]);
    const seul = placerJour(placerJour(p, 'pull a', 'a', 3), 'pull a', 'a', 4);
    expect(seul.jours['pull a'].a).toEqual([4]);
    // le jour d'une autre seance : elle le libere
    expect(placerJour(p, 'pull a', 'a', 0).jours['push a force'].a).toEqual([]);
    const une = avecSemainesAB(p, false);
    expect(une.ab).toBe(false);
    expect(versProgrammeHevy(x, { placement: une })!.ab).toBeUndefined();
  });

  it('sans rythme prouve, la semaine sort quand meme construite', () => {
    const rows = [TETE];
    [0, 2, 4, 1, 3, 5].forEach((d, k) => seance(rows, 'Full body', L0 + k * 7 * J + d * J, 40, [{ n: 'Squat (Barbell)', s: [[100, 5]] }]));
    const x = reconstruireRoutine(lireHevy(rows.join('\n'))!.seances);
    expect(x.rythme).toBe('aucun');
    const pp = versProgrammeHevy(x)!;
    expect(pp.semaine[0]?.titre).toBe('Full body');
  });

  it('la seance du jour, l alternance A et B, et les charges de la derniere fois', async () => {
    const seances = semainesAB();
    const l = correspondances(seances, reconnaitre, muscleBiblio);
    const fin = appliquerChoix(seances, l, refusParDefaut(l));
    const x = reconstruireRoutine(fin);
    const pp = versProgrammeHevy(x, { muscleDe: muscleBiblio })!;
    const sauve = await enregistrerProgrammePerso(pp);
    await suivreProgrammePerso(sauve);
    const a = (await chargerProgrammeActif())!;
    expect(a.id).toBe(sauve.id);
    const p = programmeParId(a.id)!;
    // les deux prochains lundis : une semaine A puis une semaine B, ou l'inverse, jamais deux fois la meme
    const auj = new Date();
    const lundi = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + ((8 - auj.getDay()) % 7 || 7), 12);
    const lundi2 = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 7, 12);
    const t1 = seanceAFaire(a, p, lundi)?.titre;
    const t2 = seanceAFaire(a, p, lundi2)?.titre;
    expect([t1, t2].sort()).toEqual(['PUSH A FORCE', 'Push B']);
    // la meme seance que celle annoncee par Bienvenue
    expect(prochaineSeanceRoutine(sauve, lundi)?.seance.titre).toBe(t1);
    const prochaine = prochaineSeanceRoutine(sauve, lundi)!;
    const id = idDuJourPerso(sauve, prochaine.jour, prochaine.b)!;
    expect(jourDuProgramme(p, id)?.titre).toBe(t1);
    // la seance en direct : exercices dans l'ordre, series, et charges de la derniere fois
    const jourA = p.jours.find((j) => j.titre === 'PUSH A FORCE')!;
    expect(jourA.exos.map((e) => [e.nom, e.series])).toEqual([['Développé Couché (Barre)', 3], ['Élévations Latérales (Haltères)', 2]]);
    const trainings = fin.map((s, i) => ({ id: i + 1, sport: 'musculation', date: s.date, start_time: s.heure, exercises: s.exos.map(versExercice) })) as unknown as Training[];
    const prop = proposer(jourA.exos[0], seancesDeLExo(trainings, jourA.exos[0].nom));
    expect(prop.raison).not.toBe('premiere');
    // derniere fois en semaine A (semaine 6) : 75 kg, l'echauffement a 40 kg ne compte pas
    expect(prop.series[0].weight).toBeGreaterThanOrEqual(75);
    expect(prop.series[0].weight).toBeLessThanOrEqual(80);
    expect(prop.series).toHaveLength(3);
  });
});
