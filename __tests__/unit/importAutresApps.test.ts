/**
 * 18 novembre 2026 : les exports des autres apps de muscu (lib/v2/import/carnet.ts) et les noms d'apps (apps.ts).
 * Sources des formats (exports reels publies, rien d'invente) :
 *  - Strong, points-virgules : en-tete et lignes d'un vrai export, aebel-shajan.github.io/notes/projects/gym-data-analysis
 *    (« Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;Seconds;Notes;
 *    Workout Notes;Workout Duration », « 2023-07-30 16:49:28;"Arms";"Bench Press (Dumbbell)";1;14;kg;8;;;;0;"";"";44m »)
 *  - Strong, virgules : liste des colonnes d'un export publiee sur forum.intervals.icu (« Import Strong data ») ;
 *    les lignes de ce test reprennent le format de date de l'export ci-dessus
 *  - FitNotes : en-tete et lignes d'un vrai export, gist.github.com/npiv/7e53a1057a9fbcbeeb67
 *    (« Date, Exercise, Category, Weight (kgs), Reps, Distance, Distance Unit, Time », « 2014-08-03, Flat Barbell
 *    Bench Press, Chest, 45.0, 12 »)
 *  - Hevy : colonnes duration_seconds et distance_km de l'export (en-tete de __tests__/unit/importCarnet.test.ts)
 */
import { devinerColonnes, lireCarnet, lireCsv, lireCsvColonnes, lireFitNotes, lireStrong } from '@/lib/v2/import/carnet';
import { versExercice } from '@/lib/v2/import/enregistrerCarnet';
import { appliquerChoix, correspondances, nonRepris, reconnaitreHevy, reconstruireRoutine, refusParDefaut, versProgrammeHevy } from '@/lib/v2/import/repriseHevy';
import { reconnaitreExo } from '@/lib/v2/import/vocabulaire';
import { AFFICHER_NOMS_APPS, APPS, guideDe, nomDuFormat, nomsVisibles, origineDe } from '@/lib/v2/import/apps';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { nettoyerPerso } from '@/lib/v2/programmes/monProgramme';

const BIB = EXERCISE_LIBRARY.filter((e) => e.category === 'musculation' || e.unit === 'reps' || e.unit === 'time' || e.category === 'cardio').map((e, rang) => ({ name: e.name, autre: nomFr(e.name) !== e.name ? nomFr(e.name) : undefined, muscle: e.muscle, rang }));
const reconnaitre = (n: string) => reconnaitreHevy(n, (x) => reconnaitreExo(x, BIB), BIB);
const muscleBiblio = (n: string) => EXERCISE_LIBRARY.find((e) => e.name === n)?.muscle ?? null;

const STRONG_PV = `Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;Seconds;Notes;Workout Notes;Workout Duration
2023-07-30 16:49:28;"Arms";"Bench Press (Dumbbell)";1;14;kg;8;;;;0;"";"";44m
2023-07-30 16:49:28;"Arms";"Bench Press (Dumbbell)";2;12;kg;8;;;;0;;;44m
2023-07-30 16:49:28;"Arms";"Plank";1;0;kg;0;;;;60;;;44m
2023-07-30 16:49:28;"Arms";"Rowing Machine";1;0;kg;0;;2;km;480;;;44m
`;

describe('Strong', () => {
  it('points-virgules, unite des charges, duree de la seance, gainage et rameur', () => {
    const r = lireStrong(STRONG_PV)!;
    expect(r.format).toBe('strong');
    expect(r.seances).toHaveLength(1);
    const s = r.seances[0];
    expect(s).toMatchObject({ date: '2023-07-30', heure: '16:49', titre: 'Arms', duree: 44 });
    expect(s.exos.map((e) => e.nom)).toEqual(['Bench Press (Dumbbell)', 'Plank', 'Rowing Machine']);
    expect(s.exos[0].series).toEqual([{ weight: 14, reps: 8 }, { weight: 12, reps: 8 }]);
    expect(s.exos[1].series).toEqual([{ weight: 0, reps: 60, secondes: 60 }]);
    expect(s.exos[2].series).toEqual([{ weight: 0, reps: 480, secondes: 480, distanceKm: 2 }]);
    expect(r.avertissements).toBeUndefined();
    expect(lireCarnet(STRONG_PV).format).toBe('strong');
  });
  it('virgules, sans unite : charges lues en kilos, et c est dit', () => {
    const t = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2023-07-31 18:02:11,Legs,1h 2m,Squat (Barbell),1,100,5,,0,,,
2023-07-31 18:02:11,Legs,1h 2m,Squat (Barbell),2,100,5,,0,,,8
`;
    const r = lireCarnet(t);
    expect(r.format).toBe('strong');
    expect(r.seances[0]).toMatchObject({ titre: 'Legs', duree: 62 });
    expect(r.seances[0].exos[0].series).toHaveLength(2);
    expect(r.avertissements?.[0]).toMatch(/kilos/);
  });
  it('livres converties', () => {
    const t = STRONG_PV.replace('1;14;kg;8', '1;100;lbs;8');
    expect(lireStrong(t)!.seances[0].exos[0].series[0].weight).toBeCloseTo(45.36, 1);
  });
  it('semaine A et semaine B depuis Strong, comme depuis Hevy', () => {
    const rows = ['Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;Seconds;Notes;Workout Notes;Workout Duration'];
    for (let k = 0; k < 8; k++) {
      const lundi = new Date(Date.UTC(2026, 8, 7 + k * 7));
      const jeudi = new Date(Date.UTC(2026, 8, 10 + k * 7));
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const ab = k % 2 === 0 ? 'A' : 'B';
      rows.push(`${iso(lundi)} 18:00:00;"Upper ${ab}";"Bench Press (Barbell)";1;80;kg;5;;;;0;;;1h`);
      rows.push(`${iso(jeudi)} 18:00:00;"Lower ${ab}";"Squat (Barbell)";1;100;kg;5;;;;0;;;1h`);
    }
    const lu = lireCarnet(rows.join('\n'));
    const r = reconstruireRoutine(lu.seances);
    expect(r.rythme).toBe('ab');
    expect(r.seances.map((s) => `${s.titre}:${s.semaine}:${s.jour}`)).toEqual(['Upper A:A:0', 'Lower A:A:3', 'Upper B:B:0', 'Lower B:B:3']);
    expect(origineDe(lu.format)).toBe('import_strong');
  });
});

describe('FitNotes', () => {
  const T = `Date,Exercise,Category,Weight (kgs),Reps,Distance,Distance Unit,Time
2014-08-03,Flat Barbell Bench Press,Chest,45.0,12,,,
2014-08-03,Flat Barbell Bench Press,Chest,45.0,10,,,
2014-08-03,Ma machine du fond,Back,30.0,12,,,
2014-08-03,Treadmill,Cardio,,,3.0,km,0:20:00
2014-08-05,Plank,Abs,,,,,0:01:00
`;
  it('une seance par jour, la categorie donne le muscle, duree et distance', () => {
    const r = lireFitNotes(T)!;
    expect(r.format).toBe('fitnotes');
    expect(r.seances.map((s) => s.date)).toEqual(['2014-08-03', '2014-08-05']);
    const s = r.seances[0];
    expect(s.titre).toBeUndefined();
    expect(s.exos[0].series).toEqual([{ weight: 45, reps: 12 }, { weight: 45, reps: 10 }]);
    expect(s.exos[1]).toMatchObject({ nom: 'Ma machine du fond', muscle: 'DOS' });
    expect(s.exos[2].series).toEqual([{ weight: 0, reps: 1200, secondes: 1200, distanceKm: 3 }]);
    expect(r.seances[1].exos[0].series).toEqual([{ weight: 0, reps: 60, secondes: 60 }]);
    expect(lireCarnet(T).format).toBe('fitnotes');
  });
  it('le muscle de FitNotes sert pour les exercices a toi', () => {
    const l = correspondances(lireFitNotes(T)!.seances, reconnaitre, muscleBiblio);
    expect(l.find((c) => c.saisi === 'Ma machine du fond')?.muscle).toBe('DOS');
  });
  it('le meme fichier deux fois : memes cles', () => {
    expect(lireFitNotes(T)!.seances.map((s) => s.cle)).toEqual(lireFitNotes(T)!.seances.map((s) => s.cle));
  });
});

describe('durees et distances depuis Hevy', () => {
  const T = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Cardio","1 Oct 2026, 07:00","1 Oct 2026, 07:40","","Plank","","",0,"normal",,,,45,
"Cardio","1 Oct 2026, 07:00","1 Oct 2026, 07:40","","Plank","","",1,"normal",,,,50,
"Cardio","1 Oct 2026, 07:00","1 Oct 2026, 07:40","","Cycling","","",0,"normal",,,8.5,1500,
"Cardio","1 Oct 2026, 07:00","1 Oct 2026, 07:40","","Jump Rope","","",0,"normal",,,,,
`;
  const r = lireCarnet(T);
  it('gainage et velo gardes, la serie vide est dite', () => {
    const s = r.seances[0];
    expect(s.exos.map((e) => e.nom)).toEqual(['Plank', 'Cycling']);
    expect(s.exos[0].series).toEqual([{ weight: 0, reps: 45, secondes: 45 }, { weight: 0, reps: 50, secondes: 50 }]);
    expect(s.exos[1].series).toEqual([{ weight: 0, reps: 1500, secondes: 1500, distanceKm: 8.5 }]);
    expect(r.ignorees).toEqual([{ quoi: 'Jump Rope (1)', raison: 'séries vides : ni répétitions, ni durée, ni distance' }]);
  });
  it('enregistre comme la seance en direct : secondes dans les repetitions, duree et distance sur l exercice', () => {
    expect(versExercice(r.seances[0].exos[1])).toMatchObject({ duration: 25, distance: 8.5, setsData: [{ weight: 0, reps: 1500 }] });
  });
});

describe('autre fichier : colonnes choisies', () => {
  const T = `Jour;Mouvement;Poids;Répétitions;Séance
14/10/2025;Presse convergente;80;12;Jambes
14/10/2025;Presse convergente;85;10;Jambes
16/10/2025;Tirage poitrine;60;10;Dos
`;
  it('les colonnes devinees, puis lues', () => {
    const tete = lireCsv(T, ';')[0];
    const c = devinerColonnes(tete);
    expect(c).toMatchObject({ date: 0, exercice: 1, charge: 2, reps: 3, titre: 4 });
    const r = lireCsvColonnes(T, c);
    expect(r.seances).toHaveLength(2);
    expect(r.seances[0]).toMatchObject({ date: '2025-10-14', titre: 'Jambes' });
    expect(r.seances[0].exos[0].series).toEqual([{ weight: 80, reps: 12 }, { weight: 85, reps: 10 }]);
    expect(lireCsvColonnes(T, c, true).seances[0].exos[0].series[0].weight).toBeCloseTo(36.29, 1);
  });
});

describe('routine avec gainage et cardio', () => {
  it('le gainage tenu en secondes, le cardio en minutes, et les limites dites', () => {
    const rows = ['"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"'];
    for (let k = 0; k < 4; k++) {
      const d = new Date(Date.UTC(2026, 8, 9 + k * 7));
      const h = `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]} 2026, 07:00`;
      rows.push(`"Core","${h}","${h}","","Plank","","",0,"normal",,,,90,`);
      rows.push(`"Core","${h}","${h}","","Plank","","",1,"normal",,,,120,`);
      rows.push(`"Core","${h}","${h}","","Rowing Machine","","",0,"normal",,,2,600,`);
      rows.push(`"Core","${h}","${h}","","Ski erg du fond","","",0,"normal",,,1.5,,`);
    }
    const brut = lireCarnet(rows.join('\n')).seances;
    const l = correspondances(brut, reconnaitre, muscleBiblio);
    const r = reconstruireRoutine(appliquerChoix(brut, l, refusParDefaut(l)));
    expect(r.rythme).toBe('semaine');
    const exos = r.seances[0].exos;
    expect(exos[0]).toMatchObject({ secondes: true, repsMin: 90, repsMax: 120, series: 2 });
    expect(exos[1]).toMatchObject({ minutes: 10 });
    expect(exos[2]).toMatchObject({ minutes: 20, minutesSupposees: true });
    const pp = nettoyerPerso(versProgrammeHevy(r)!)!;
    expect(pp.semaine[2]?.exos[0]).toMatchObject({ secondes: true });
    expect(pp.semaine[2]?.exos[1]).toMatchObject({ minutes: 10 });
    const manques = nonRepris(r);
    expect(manques.map((m) => m.raison)).toEqual([
      'tenue de plus de 100 secondes : la routine vise 100 secondes, l’historique garde ta vraie durée',
      'distance sans durée : 20 minutes proposées, à régler',
    ]);
  });
});

describe('les noms des apps', () => {
  it('un seul interrupteur, et jamais de nom dans l onboarding', () => {
    expect(typeof AFFICHER_NOMS_APPS).toBe('boolean');
    expect(nomsVisibles(true)).toBe(false);
    expect(nomDuFormat('hevy', true)).toBeNull();
    const general = guideDe('hevy', true).map((e) => e.texte).join(' ');
    for (const a of APPS.filter((x) => x.id !== 'autre')) expect(general).not.toContain(a.nom);
  });
  it('hors onboarding, un chemin par app', () => {
    if (!AFFICHER_NOMS_APPS) return;
    expect(nomDuFormat('strong', false)).toBe('Strong');
    expect(guideDe('strong', false).map((e) => e.texte).join(' ')).toContain('Export Strong Data');
    expect(guideDe('hevy', false).map((e) => e.texte).join(' ')).toContain('Exporter les séances');
    expect(guideDe('fitnotes', false)[0].texte).toContain('FitNotes');
  });
});
