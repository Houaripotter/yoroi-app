import {
  activiteDe,
  avecDebut,
  bornesDebut,
  entrainementsPourCardio,
  issueRecherche,
  kcalDesCardiosMontre,
  lireEntrainement,
  remplirCardio,
  suggestionsDebut,
  type EntrainementMontre,
  type SeanceSanteBrute,
} from '@/lib/v2/seance/montreCardio';
import { kcalMesureesIntactes } from '@/lib/v2/seance/sourceKcal';
import { completerExercice, type ExoEnregistre } from '@/lib/v2/seances/exerciceEnregistre';
import { nouveauChrono } from '@/lib/v2/seances/cardioFin';
import type { LiveExercise } from '@/lib/v2/seance/model';

const H = (h: number, m = 0) => new Date(2026, 10, 7, h, m, 0, 0).getTime();
const iso = (ms: number) => new Date(ms).toISOString();

/** une seance d'Apple Sante telle que lib/healthConnect.ios.ts la rend */
const brute = (x: Partial<SeanceSanteBrute> & { debut: number; fin: number }): SeanceSanteBrute => ({
  id: x.id ?? `w${x.debut}`,
  activityType: x.activityType ?? 52,
  startDate: iso(x.debut),
  endDate: iso(x.fin),
  dureeSec: x.dureeSec,
  distance: x.distance,
  averageHeartRate: x.averageHeartRate,
  calories_source: x.calories_source,
  calories_appareil: x.calories_appareil,
  calories_mesurees: x.calories_mesurees,
});
const lu = (x: Parameters<typeof brute>[0]): EntrainementMontre => lireEntrainement(brute(x)) as EntrainementMontre;

const cardio = (): LiveExercise => ({ id: 'c', name: 'Marche inclinée sur tapis', muscle: 'CARDIO', sets: [{ id: 's', weight: 0, reps: 600, done: false }], cardio: { ...nouveauChrono(10), type: 'marche_inclinee' } });

describe('cardio repris de la montre : activite', () => {
  it('reconnait les activites d Apple, en nombre ou en nom', () => {
    expect(activiteDe(52)).toBe('marche');
    expect(activiteDe('52')).toBe('marche');
    expect(activiteDe('HKWorkoutActivityTypeWalking')).toBe('marche');
    expect(activiteDe('hiking')).toBe('randonnee');
    expect(activiteDe(37)).toBe('course');
    expect(activiteDe(13)).toBe('velo');
    expect(activiteDe(50)).toBeNull();
    expect(activiteDe(undefined)).toBeNull();
  });
});

describe('cardio repris de la montre : correspondance par heure et par activite', () => {
  const debutSeance = H(16, 30);
  const maintenant = H(17, 20);
  const marche = lu({ id: 'marche', debut: H(16, 52), fin: H(17, 14), activityType: 52 });
  const rando = lu({ id: 'rando', debut: H(16, 40), fin: H(16, 50), activityType: 24 });
  const velo = lu({ id: 'velo', debut: H(16, 50), fin: H(17, 10), activityType: 13 });
  const hier = lu({ id: 'hier', debut: H(16, 52) - 86400000, fin: H(17, 14) - 86400000, activityType: 52 });
  const avant = lu({ id: 'avant', debut: H(15, 0), fin: H(15, 50), activityType: 52 });
  const juste = lu({ id: 'juste', debut: H(15, 40), fin: H(16, 5), activityType: 52 });
  const tous = [marche, rando, velo, hier, avant, juste];

  it('marche inclinee : marche et randonnee seulement, jamais le velo', () => {
    const l = entrainementsPourCardio(tous, 'marche_inclinee', debutSeance, maintenant);
    expect(l.map((w) => w.id)).toEqual(['marche', 'rando', 'juste']);
  });
  it('fenetre : de 30 minutes avant le debut de la seance a maintenant', () => {
    const l = entrainementsPourCardio(tous, 'marche_inclinee', debutSeance, maintenant).map((w) => w.id);
    expect(l).toContain('juste');
    expect(l).not.toContain('avant');
    expect(l).not.toContain('hier');
  });
  it('le velo va avec le velo, la course avec la course', () => {
    expect(entrainementsPourCardio(tous, 'velo', debutSeance, maintenant).map((w) => w.id)).toEqual(['velo']);
    expect(entrainementsPourCardio(tous, 'tapis_course', debutSeance, maintenant)).toEqual([]);
  });
  it('un entrainement deja repris par un autre exercice est ecarte', () => {
    expect(entrainementsPourCardio(tous, 'marche_inclinee', debutSeance, maintenant, ['marche']).map((w) => w.id)).toEqual(['rando', 'juste']);
  });
  it('un entrainement de moins d une minute n est pas lu', () => {
    expect(lireEntrainement(brute({ debut: H(17), fin: H(17) + 40_000 }))).toBeNull();
  });
});

describe('cardio repris de la montre : sans resultat ou plusieurs', () => {
  it('aucun : le message demande', () => {
    const r = issueRecherche([]);
    expect(r).toEqual({ type: 'aucun', message: 'Aucun entraînement trouvé. Termine-le sur ta montre puis réessaie.' });
  });
  it('un seul : rempli tout de suite ; plusieurs : un choix', () => {
    const a = lu({ id: 'a', debut: H(16, 50), fin: H(17, 10) });
    const b = lu({ id: 'b', debut: H(16, 10), fin: H(16, 20) });
    expect(issueRecherche([a]).type).toBe('un');
    const c = issueRecherche([a, b]);
    expect(c.type).toBe('choix');
    expect(c.type === 'choix' && c.liste.length).toBe(2);
  });
});

describe('cardio repris de la montre : valeurs et source des kcal', () => {
  const w = lu({ id: 'w', debut: H(16, 52), fin: H(17, 14), dureeSec: 1290, distance: 1.83, averageHeartRate: 118.4, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 182 });

  it('duree d Apple (pauses retirees), distance, FC moyenne et kcal mesurees', () => {
    expect(w).toMatchObject({ dureeSec: 1290, distanceKm: 1.83, fcMoy: 118, kcal: 182, kcalSource: 'appareil', appareil: 'Apple Watch' });
  });
  it('kcal tapees a la main dans Sante : jamais reprises', () => {
    const m = lu({ debut: H(16), fin: H(16, 20), calories_source: 'saisie', calories_mesurees: null });
    expect(m.kcal).toBeUndefined();
    expect(m.kcalSource).toBeUndefined();
  });
  it('rien d estime : sans kcal, distance ni FC chez Apple, rien n apparait', () => {
    const m = lu({ debut: H(16), fin: H(16, 20) });
    expect(m.kcal).toBeUndefined();
    expect(m.distanceKm).toBeUndefined();
    expect(m.fcMoy).toBeUndefined();
    expect(m.dureeSec).toBe(1200);
  });
  it('l exercice est rempli et fait, la source gardee', () => {
    const e = remplirCardio(cardio(), w);
    expect(e.sets[0]).toMatchObject({ reps: 1290, done: true });
    expect(e.cardio).toMatchObject({ debutMs: null, cumulMs: 1290000, premierDebutMs: w.debutMs, finMs: w.finMs, distanceKm: 1.83, fcMoy: 118, montre: { id: 'w', activite: 'marche', appareil: 'Apple Watch', kcal: 182, kcalSource: 'appareil' } });
  });
  it('les kcal de la seance : source appareil, Apple Watch, intactes pour les cartes', () => {
    const e = remplirCardio(cardio(), w);
    const k = kcalDesCardiosMontre([e]);
    expect(k).toEqual({ calories: 182, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 182 });
    expect(kcalMesureesIntactes(k)).toBe(182);
  });
  it('sources melangees : sante, sans appareil ; cardio pas fait : pas de kcal', () => {
    const autre = lu({ id: 'x', debut: H(17), fin: H(17, 10), calories_source: 'sante', calories_mesurees: 40 });
    const k = kcalDesCardiosMontre([remplirCardio(cardio(), w), remplirCardio({ ...cardio(), id: 'd' }, autre)]);
    expect(k).toMatchObject({ calories: 222, calories_source: 'sante', calories_appareil: null, calories_mesurees: 222 });
    expect(kcalDesCardiosMontre([cardio()])).toBeNull();
  });
  it('enregistre avec l exercice (JSON des exercices, sans colonne)', () => {
    const e = remplirCardio(cardio(), w);
    const out = completerExercice({ name: 'Marche inclinée sur tapis' } as ExoEnregistre & { name: string }, { cardio: e.cardio }, 1290);
    expect((out as { cardio?: unknown }).cardio).toMatchObject({ type: 'marche_inclinee', fcMoy: 118, montre: { appareil: 'Apple Watch', kcal: 182, kcalSource: 'appareil' } });
  });
});

describe('J ai commence plus tot', () => {
  const maintenant = H(16, 31, ) + 20_000;
  const d = { startedAt: H(16, 30), autre: 1 };

  it('la seance prend la nouvelle heure de debut, a la minute', () => {
    const n = avecDebut(d, H(16, 10) + 12_000, maintenant);
    expect(n.startedAt).toBe(H(16, 10));
    expect(n.autre).toBe(1);
  });
  it('jamais plus de 3 heures en arriere, jamais dans le futur', () => {
    expect(avecDebut(d, H(11, 0), maintenant).startedAt).toBe(bornesDebut(maintenant).min);
    expect(bornesDebut(maintenant).min).toBe(H(13, 32));
    expect(avecDebut(d, H(17, 0), maintenant).startedAt).toBe(H(16, 31));
  });
  it('meme heure : la seance ne change pas', () => {
    expect(avecDebut(d, H(16, 30), maintenant)).toBe(d);
  });
  it('la montre propose l heure d un entrainement commence plus tot aujourd hui', () => {
    const muscu = lu({ id: 'muscu', debut: H(16, 8), fin: H(16, 29), activityType: 50 });
    const matin = lu({ id: 'matin', debut: H(7, 0), fin: H(7, 30) });
    const apres = lu({ id: 'apres', debut: H(16, 35), fin: H(16, 45) });
    expect(suggestionsDebut([muscu, matin, apres], H(16, 30), maintenant).map((w) => w.id)).toEqual(['muscu']);
  });
});
