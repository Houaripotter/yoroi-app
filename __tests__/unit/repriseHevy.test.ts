/**
 * Reprise complete depuis Hevy (18 novembre 2026) : lib/v2/import/repriseHevy.ts, nomsHevy.ts.
 * Jeux de donnees au format exact de l'export CSV des seances de Hevy (une ligne par serie).
 */
import { lireCarnet, lireHevy } from '@/lib/v2/import/carnet';
import type { SeanceLue } from '@/lib/v2/import/carnet';
import { NOMS_HEVY, nomHevyConnu } from '@/lib/v2/import/nomsHevy';
import {
  appliquerChoix,
  bilanReprise,
  cleTitre,
  correspondances,
  estAToi,
  muscleDevine,
  nomFinal,
  reconnaitreHevy,
  refusParDefaut,
  reconstruireRoutine,
  semaineDe,
  versMesSeances,
  versProgrammeHevy,
} from '@/lib/v2/import/repriseHevy';
import { reconnaitreExo } from '@/lib/v2/import/vocabulaire';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { nettoyerPerso, versProgramme } from '@/lib/v2/programmes/monProgramme';
import { caseLe } from '@/lib/v2/programmes/semaineLibre';
import { empreinteDe, memeSeance, versExercice } from '@/lib/v2/import/enregistrerCarnet';
import { computeLifts } from '@/lib/v2/progres/strength';
import { buildExerciseHistory, cleExercice } from '@/lib/v2/seance/history';
import type { Training } from '@/lib/database';

const BIB = EXERCISE_LIBRARY.filter((e) => e.category === 'musculation' || e.unit === 'reps').map((e, rang) => ({ name: e.name, autre: nomFr(e.name) !== e.name ? nomFr(e.name) : undefined, muscle: e.muscle, rang }));
const reconnaitre = (n: string) => reconnaitreHevy(n, (x) => reconnaitreExo(x, BIB), BIB);
const muscleBiblio = (n: string) => EXERCISE_LIBRARY.find((e) => e.name === n)?.muscle ?? null;

const TETE = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';
const MOIS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** « 7 Sep 2026, 18:30 », comme Hevy */
const dateHevy = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
type Exo = { nom: string; series: [number, number][]; sup?: string; echauffement?: [number, number] };
/** une seance : titre, jour (ms a minuit UTC), heure, exercices */
function lignes(titre: string, jourMs: number, heure: number, exos: Exo[]): string[] {
  const debut = jourMs + heure * 3600000;
  const fin = debut + 65 * 60000;
  const out: string[] = [];
  for (const e of exos) {
    let i = 0;
    if (e.echauffement) out.push(`"${titre}","${dateHevy(debut)}","${dateHevy(fin)}","","${e.nom}","${e.sup ?? ''}","",${i++},"warmup",${e.echauffement[0]},${e.echauffement[1]},,,`);
    for (const [kg, reps] of e.series) out.push(`"${titre}","${dateHevy(debut)}","${dateHevy(fin)}","","${e.nom}","${e.sup ?? ''}","",${i++},"normal",${kg},${reps},,,8`);
  }
  return out;
}
const csv = (rows: string[]) => [TETE, ...rows].join('\n') + '\n';

// lundi 7 septembre 2026
const LUNDI = Date.UTC(2026, 8, 7);
const J = 86400000;

/** 8 semaines : semaine A (Push A lundi, Pull A jeudi), semaine B (Push B lundi, Pull B jeudi), les charges montent */
function huitSemainesAB(): string {
  const rows: string[] = [];
  for (let k = 0; k < 8; k++) {
    const lundi = LUNDI + k * 7 * J;
    const p = 60 + k * 2.5;
    if (k % 2 === 0) {
      rows.push(...lignes('PUSH A FORCE', lundi, 18, [
        { nom: 'Bench Press (Barbell)', echauffement: [40, 10], series: [[p, 6], [p, 6], [p, 5]] },
        { nom: 'Lateral Raise (Dumbbell)', series: [[10, 12], [10, 12], [10, 10]], sup: '1' },
        { nom: 'Poulie triceps de Momo', series: [[25, 12], [25, 12]], sup: '1' },
      ]));
      rows.push(...lignes('Pull A', lundi + 3 * J, 18, [
        { nom: 'Lat Pulldown (Cable)', series: [[55, 10], [55, 10], [55, 9]] },
        { nom: 'Machine bizarre 3000', series: [[40, 12], [40, 12]] },
      ]));
    } else {
      rows.push(...lignes('Push B', lundi, 18, [
        { nom: 'Incline Bench Press (Dumbbell)', series: [[24, 10], [24, 10], [24, 8]] },
        { nom: 'Triceps Dip', series: [[0, 12], [0, 10]] },
      ]));
      rows.push(...lignes('Pull B', lundi + 3 * J, 19, [
        { nom: 'Bent Over Row (Barbell)', series: [[70, 8], [70, 8], [70, 8]] },
        { nom: 'Hammer Curl (Dumbbell)', series: [[14, 10], [14, 10]] },
      ]));
    }
  }
  return csv(rows);
}

const lu = (texte: string) => lireHevy(texte)!.seances;

describe('noms de Hevy', () => {
  it('chaque nom vise existe dans la bibliotheque', () => {
    const noms = new Set(EXERCISE_LIBRARY.map((e) => e.name));
    expect(Object.values(NOMS_HEVY).filter((n) => !noms.has(n))).toEqual([]);
  });
  it('le materiel compte : barre et halteres ne se confondent plus', () => {
    expect(nomHevyConnu('Bench Press (Barbell)')).toBe('Développé Couché (Barre)');
    expect(nomHevyConnu('Bench Press (Dumbbell)')).toBe('Développé Couché (Haltères)');
    expect(nomHevyConnu('Élévation Latérale (Haltère)')).toBe('Élévations Latérales (Haltères)');
    expect(nomHevyConnu('Seated Cable Row - V Grip (Cable)')).toBe('Tirage Serré (V-Bar)');
    expect(nomHevyConnu('Poulie triceps de Momo')).toBeNull();
  });
});

describe('muscle devine', () => {
  it('nom clair : le muscle', () => {
    expect(muscleDevine('Poulie triceps de Momo')).toBe('TRICEPS');
    expect(muscleDevine('Curl pupitre maison')).toBe('BICEPS');
    expect(muscleDevine('Leg curl de ma salle')).toBe('ISCHIOS');
    expect(muscleDevine('Wrist curl')).toBe('AVANT-BRAS');
    expect(muscleDevine('Mollets à la presse')).toBe('MOLLETS');
    expect(muscleDevine('Presse pectoraux convergente')).toBe('PECTORAUX');
    expect(muscleDevine('Élévations latérales penché')).toBe('ÉPAULES');
  });
  it('nom flou : on demandera', () => {
    expect(muscleDevine('Machine bizarre 3000')).toBeNull();
    expect(muscleDevine('Le truc de Kevin')).toBeNull();
  });
});

describe('semaine A et semaine B sur 8 semaines', () => {
  const brut = lu(huitSemainesAB());
  const liste = correspondances(brut, reconnaitre, muscleBiblio);
  const refus = refusParDefaut(liste);
  const seances = appliquerChoix(brut, liste, refus);
  const r = reconstruireRoutine(seances);

  it('16 seances lues, superset garde', () => {
    expect(brut).toHaveLength(16);
    expect(brut[0].exos[1].superset).toBe('1');
  });
  it('4 seances types, en semaine A et semaine B', () => {
    expect(r.rythme).toBe('ab');
    expect(r.seances.map((s) => s.titre)).toEqual(['PUSH A FORCE', 'Pull A', 'Push B', 'Pull B']);
    expect(r.seances.map((s) => s.semaine)).toEqual(['A', 'A', 'B', 'B']);
    expect(r.seances.map((s) => s.jour)).toEqual([0, 3, 0, 3]);
    expect(r.seances[0].fois).toBe(4);
  });
  it('la version la plus recente : ordre, series, repetitions, charges', () => {
    const push = r.seances[0];
    expect(push.exos.map((e) => e.nom)).toEqual(['Développé Couché (Barre)', 'Élévations Latérales (Haltères)', 'Poulie triceps de Momo']);
    expect(push.exos[0]).toMatchObject({ series: 3, repsMin: 5, repsMax: 6, charge: 75 });
    expect(push.exos[1].enchaine).toBe(true);
    expect(push.exos[2].enchaine).toBeUndefined();
    expect(r.seances[2].exos[1]).toMatchObject({ nom: 'Dips (Focus Triceps)', poidsDuCorps: true });
  });
  it('la semaine A suit le calendrier : la semaine apres la derniere (une B) est une A', () => {
    // derniere semaine : k = 7 (B) ; la semaine A de reference est k = 6
    // 18 novembre 2026 : la suite de l'alternance, la semaine apres la derniere (une B) : une A
    expect(r.depuis).toBe('2026-11-02');
    const pp = versProgrammeHevy(r, { maintenant: new Date(2026, 10, 18, 10), muscleDe: (n) => muscleBiblio(n) ?? liste.find((c) => nomFinal(c, refus) === n)?.muscle ?? null })!;
    expect(pp.nom).toBe('Ma routine Hevy');
    expect(pp.ab).toBe(true);
    expect(pp.semaine[0]?.titre).toBe('PUSH A FORCE');
    expect(pp.semaineB?.[3]?.titre).toBe('Pull B');
    const propre = nettoyerPerso(pp)!;
    expect(propre.ab).toBe(true);
    const p = versProgramme(propre);
    expect(p.semaineLibre?.ab).toBe(true);
    const titreLe = (d: Date) => p.jours.find((j) => j.id === caseLe(p.semaineLibre!, d)?.s)?.titre;
    // lundi 2 novembre 2026 (k = 8) : semaine A ; lundi 9 novembre : semaine B ; jeudi 12 : Pull B
    expect(titreLe(new Date(2026, 10, 2, 12))).toBe('PUSH A FORCE');
    expect(titreLe(new Date(2026, 10, 5, 12))).toBe('Pull A');
    expect(titreLe(new Date(2026, 10, 9, 12))).toBe('Push B');
    expect(titreLe(new Date(2026, 10, 12, 12))).toBe('Pull B');
    expect(titreLe(new Date(2026, 10, 10, 12))).toBeUndefined();
    // les exercices a toi gardent leur muscle dans le programme
    expect(propre.semaine[0]?.exos[2]).toMatchObject({ nom: 'Poulie triceps de Momo', muscle: 'TRICEPS' });
    expect(propre.semaine[0]?.exos[1].enchaine).toBe(true);
  });
  it('une seance decochee ne part pas ; tout un cote decoche : une seule semaine', () => {
    const sansPullB = versProgrammeHevy(r, { garder: (k) => k !== cleTitre('Pull B') })!;
    expect(sansPullB.semaineB?.[3]).toBeNull();
    expect(sansPullB.semaineB?.[0]?.titre).toBe('Push B');
    const sansB = versProgrammeHevy(r, { garder: (k) => !['push b', 'pull b'].includes(k) })!;
    expect(sansB.ab).toBeUndefined();
    expect(sansB.semaineB).toBeUndefined();
    expect(versProgrammeHevy(r, { garder: () => false })).toBeNull();
  });
});

describe('exercices a toi', () => {
  const brut = lu(huitSemainesAB());
  const liste = correspondances(brut, reconnaitre, muscleBiblio);
  const refus = refusParDefaut(liste);
  it('un exercice inconnu garde exactement son nom Hevy, meme s il ressemble a un exercice de YOROI', () => {
    const momo = liste.find((c) => c.saisi === 'Poulie triceps de Momo')!;
    expect(momo.exact).toBe(false);
    expect(refus.has('Poulie triceps de Momo')).toBe(true);
    expect(momo.muscle).toBe('TRICEPS');
    const bizarre = liste.find((c) => c.saisi === 'Machine bizarre 3000')!;
    expect(bizarre.propose === null || refus.has(bizarre.saisi)).toBe(true);
    expect(nomFinal(bizarre, refus)).toBe('Machine bizarre 3000');
    expect(refus.has('Bench Press (Barbell)')).toBe(false);
    const s = appliquerChoix(brut, liste, refus);
    expect(s[0].exos[2]).toMatchObject({ nom: 'Poulie triceps de Momo', inconnu: true });
    expect(s[0].exos[2].saisi).toBeUndefined();
  });
  it('un exercice reconnu est relie, et on peut refuser pour garder son nom', () => {
    const bench = liste.find((c) => c.saisi === 'Bench Press (Barbell)')!;
    expect(bench.propose).toBe('Développé Couché (Barre)');
    expect(bench.muscle).toBe('PECTORAUX');
    const relie = appliquerChoix(brut, liste, refus);
    expect(relie[0].exos[0]).toMatchObject({ nom: 'Développé Couché (Barre)', saisi: 'Bench Press (Barbell)' });
    const refuse = new Set([...refus, 'Bench Press (Barbell)']);
    expect(estAToi(bench, refuse)).toBe(true);
    const garde = appliquerChoix(brut, liste, refuse);
    expect(garde[0].exos[0]).toMatchObject({ nom: 'Bench Press (Barbell)', inconnu: true });
    expect(reconstruireRoutine(garde).seances[0].exos[0].nom).toBe('Bench Press (Barbell)');
  });
  it('le plus fait en premier', () => {
    expect(liste[0].fois).toBe(4);
  });
});

describe('titres avec et sans accents', () => {
  const rows: string[] = [];
  const titres = ['Séance Jambes', 'seance jambes', 'SÉANCE  JAMBES', 'Seance Jambes'];
  for (let k = 0; k < 4; k++) {
    rows.push(...lignes(titres[k], LUNDI + k * 7 * J + 2 * J, 7, [{ nom: 'Squat (Barbell)', series: [[100, 5], [100, 5]] }, { nom: 'Leg Extension (Machine)', series: [[50, 12]] }]));
    rows.push(...lignes('Haut du corps', LUNDI + k * 7 * J + 4 * J, 7, [{ nom: 'Pull Up', series: [[0, 8], [0, 8]] }]));
  }
  const r = reconstruireRoutine(lu(csv(rows)));
  it('un seul groupe, le dernier titre ecrit', () => {
    expect(r.seances).toHaveLength(2);
    const j = r.seances.find((s) => s.cle === 'seance jambes')!;
    expect(j.fois).toBe(4);
    expect(j.titre).toBe('Seance Jambes');
    expect(j.jour).toBe(2);
  });
  it('routine sans alternance : une seule semaine', () => {
    expect(r.rythme).toBe('semaine');
    const pp = versProgrammeHevy(r)!;
    expect(pp.ab).toBeUndefined();
    expect(pp.semaine[2]?.titre).toBe('Seance Jambes');
    expect(pp.semaine[4]?.titre).toBe('Haut du corps');
    expect(nettoyerPerso(pp)).not.toBeNull();
  });
});

describe('sans preuve, pas de planning', () => {
  it('des jours qui changent : la liste seulement, vers Mes seances', () => {
    const rows: string[] = [];
    const jours = [0, 3, 5, 1, 6, 2];
    jours.forEach((d, k) => rows.push(...lignes('Full body', LUNDI + k * 7 * J + d * J, 12, [{ nom: 'Deadlift (Barbell)', series: [[140, 3]] }])));
    const r = reconstruireRoutine(lu(csv(rows)));
    expect(r.rythme).toBe('aucun');
    expect(r.seances).toHaveLength(1);
    // 18 novembre 2026 : la semaine sort toujours construite, sur le jour le plus frequent (le premier en cas d'egalite)
    const pp = versProgrammeHevy(r)!;
    expect(pp.semaine.filter(Boolean)).toHaveLength(1);
    expect(versMesSeances(r, () => true, () => 'DOS')).toEqual([{ nom: 'Full body', exos: [{ nom: 'Deadlift (Barbell)', muscle: 'DOS', series: 1, reps: 3, poids: 140 }] }]);
  });
  it('des A et B dans le titre sans alternance prouvee par le calendrier : pas de semaine A et B devinee', () => {
    const rows: string[] = [];
    // trois seances par semaine qui tournent : A, B, A puis B, A, B
    let n = 0;
    for (let k = 0; k < 6; k++) for (const d of [0, 2, 4]) rows.push(...lignes(n++ % 2 ? 'Full B' : 'Full A', LUNDI + k * 7 * J + d * J, 12, [{ nom: 'Squat (Barbell)', series: [[100, 5]] }]));
    const r = reconstruireRoutine(lu(csv(rows)));
    expect(r.rythme).toBe('aucun');
    expect(r.seances.map((s) => s.titre).sort()).toEqual(['Full A', 'Full B']);
  });
  it('un titre par defaut qui couvre des seances differentes n est pas une seance type', () => {
    const rows: string[] = [];
    const exos = ['Squat (Barbell)', 'Pull Up', 'Plank', 'Bench Press (Barbell)'];
    exos.forEach((e, k) => rows.push(...lignes('Morning Workout', LUNDI + k * 7 * J, 8, [{ nom: e, series: [[10, 10]] }])));
    const r = reconstruireRoutine(lu(csv(rows)));
    expect(r.seances).toHaveLength(0);
    expect(r.libres).toBe(4);
  });
});

describe('import en double', () => {
  it('le meme fichier deux fois : memes cles, memes empreintes', () => {
    const a = lu(huitSemainesAB());
    const b = lu(huitSemainesAB());
    expect(b.map((s) => s.cle)).toEqual(a.map((s) => s.cle));
    expect(new Set(a.map((s) => s.cle)).size).toBe(a.length);
    const ea = empreinteDe(a[0].date, a[0].heure, a[0].exos.map(versExercice));
    const eb = empreinteDe(b[0].date, b[0].heure, b[0].exos.map(versExercice));
    expect(memeSeance(ea, eb)).toBe(true);
  });
  it('deux exports qui se chevauchent : la routine ne change pas', () => {
    const tout = lu(huitSemainesAB());
    const double = [...tout, ...tout.slice(8)];
    const unique = [...new Map(double.map((s) => [s.cle, s])).values()];
    expect(reconstruireRoutine(unique).seances.map((s) => s.fois)).toEqual(reconstruireRoutine(tout).seances.map((s) => s.fois));
  });
});

describe('records et Bienvenue', () => {
  const brut = lu(huitSemainesAB());
  const liste = correspondances(brut, reconnaitre, muscleBiblio);
  const seances = appliquerChoix(brut, liste, refusParDefaut(liste));
  it('le bilan', () => {
    const b = bilanReprise(seances);
    // 9 exercices, dont 2 a toi ; 8 avec une charge (les dips au poids du corps n'ont pas de record de charge)
    expect(b).toMatchObject({ seances: 16, exercices: 9, aToi: 2, records: 8, premiere: '2026-09-07', derniere: '2026-10-29' });
  });
  it('les records de YOROI viennent de l historique importe', () => {
    const trainings = seances.map((s, i) => ({ id: i + 1, sport: 'musculation', date: s.date, start_time: s.heure, exercises: s.exos.map(versExercice), source: 'import' })) as unknown as Training[];
    const lifts = computeLifts(trainings);
    const bench = lifts.find((l) => l.name === 'Développé Couché (Barre)');
    expect(bench?.sessions).toBe(4);
    expect(Math.max(...(bench?.points ?? []).map((p) => p.weight))).toBe(75);
    expect(lifts.find((l) => l.name === 'Poulie triceps de Momo')?.sessions).toBe(4);
  });
  it('la seance en direct reprend les charges de la derniere fois et le meilleur 1RM estime', () => {
    const trainings = seances.map((s, i) => ({ id: i + 1, sport: 'musculation', date: s.date, start_time: s.heure, exercises: s.exos.map(versExercice), source: 'import' })) as unknown as Training[];
    const { map } = buildExerciseHistory(trainings);
    const bench = map.get(cleExercice('Développé Couché (Barre)'))!;
    expect(bench.travail?.map((x) => x.weight)).toEqual([75, 75, 75]);
    expect(bench.bestWeight).toBe(75);
    expect(bench.bestE1rm).toBeCloseTo(75 * (1 + 6 / 30));
    expect(map.get(cleExercice('Poulie triceps de Momo'))?.count).toBe(4);
  });
});

describe('le texte partage depuis Hevy', () => {
  const PARTAGE = `PUSH A FORCE
Le lundi, nov. 02, 2026 à 9:02am

Développé Couché (Machine Smith)
Série 1: 20 kg x 20
Série 2: 30 kg x 12

Élévation Latérale (Haltère)
Série 1: 8 kg x 12

Extension Triceps Corde
Série 1: 15 kg x 12

@hevyapp
https://hevy.com/workout/XxSTz6m3Gzi
`;
  it('les noms francais de Hevy sont relies, le titre se regroupe avec l export', () => {
    const s = lireCarnet(PARTAGE, new Date(2026, 10, 12)).seances as SeanceLue[];
    const liste = correspondances(s, reconnaitre, muscleBiblio);
    expect(liste.find((c) => c.saisi === 'Élévation Latérale (Haltère)')?.propose).toBe('Élévations Latérales (Haltères)');
    expect(liste.find((c) => c.saisi === 'Extension Triceps Corde')?.propose).toBe('Extension Triceps Poulie (Corde)');
    expect(cleTitre(s[0].titre)).toBe(cleTitre('Push A force'));
    expect(semaineDe(s[0].date)).toBe(semaineDe('2026-11-08'));
  });
});
