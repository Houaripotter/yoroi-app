/**
 * Repos conseille par exercice (lib/v2/seances/reposConseille.ts), 17 novembre 2026, retour de Houari :
 * « qu'il me donne lui-meme les temps de repos qu'il me faut en fonction des exercices et de ce que je souhaite ».
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(m.has(k) ? m.get(k) : null)),
      setItem: jest.fn((k: string, v: string) => { m.set(k, v); return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { m.delete(k); return Promise.resolve(); }),
    },
  };
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { avecRetenu, chargerReposRetenus, CLE_REPOS_EXO, libelleDureeRepos, lireRetenus, objectifRepos, raisonRepos, REPOS_CONSEILLE, reposConseille, reposRetenuDe, retenirReposExo, titreRepos, typeMouvement } from '../../lib/v2/seances/reposConseille';
import { reposDe } from '../../lib/v2/seance/actionsIle';
import type { LiveExercise, MuscuDraft } from '../../lib/v2/seance/model';

describe('type de mouvement', () => {
  it('gros mouvements lourds', () => {
    for (const n of ['Squat Barre Haute', 'Développé Couché (Barre)', 'Deadlift (Soulevé de terre)', 'Rowing Barre (Bent Over)', 'Développé Militaire (Barre)', 'Presse à Cuisses', 'Front Squat']) {
      expect([n, typeMouvement(n)]).toEqual([n, 'lourd']);
    }
  });
  it('isolation : poulie, elevations laterales, curls, extensions', () => {
    for (const n of ['Écartés à la Poulie Haute', 'Élévations Latérales', 'Curl Barre EZ', 'Extension Triceps Poulie (Corde)', 'Leg Extension', 'Leg Curl Assis', 'Mollets à la Presse', 'Pec Deck (Butterfly)']) {
      expect([n, typeMouvement(n)]).toEqual([n, 'isolation']);
    }
  });
  it('polyarticulaires plus legers', () => {
    for (const n of ['Développé Couché (Haltères)', 'Tractions (Pronation)', 'Dips (Focus Pectoraux)', 'Fentes Bulgares', 'Chest Press (Machine)']) {
      expect([n, typeMouvement(n)]).toEqual([n, 'poly']);
    }
  });
  it('les abdos comptent comme isolation', () => {
    expect(typeMouvement('Relevé de jambes suspendu', 'ABDOS')).toBe('isolation');
  });
});

describe('objectif', () => {
  it('le programme passe avant l onboarding', () => {
    expect(objectifRepos({ programme: 'force', onboarding: ['lose'] })).toBe('force');
    expect(objectifRepos({ programme: 'muscle' })).toBe('muscle');
    expect(objectifRepos({ programme: 'course' })).toBe('endurance');
  });
  it('onboarding : muscle avant perte de poids, rien de connu : muscle', () => {
    expect(objectifRepos({ programme: 'forme', onboarding: ['lose', 'gain'] })).toBe('muscle');
    expect(objectifRepos({ onboarding: ['lose'] })).toBe('endurance');
    expect(objectifRepos({ onboarding: ['combat'] })).toBe('muscle');
    expect(objectifRepos({})).toBe('muscle');
  });
});

describe('repos conseille', () => {
  it('les reperes demandes', () => {
    expect(reposConseille({ nom: 'Squat Barre Haute', objectif: 'force' })).toEqual({ sec: 180, raison: 'force_lourd' });
    expect(reposConseille({ nom: 'Développé Couché (Haltères)', objectif: 'muscle' })).toEqual({ sec: 90, raison: 'muscle_poly' });
    expect(reposConseille({ nom: 'Squat Barre Haute', objectif: 'muscle' })).toEqual({ sec: 120, raison: 'muscle_lourd' });
    expect(reposConseille({ nom: 'Élévations Latérales', objectif: 'muscle' })).toEqual({ sec: 75, raison: 'muscle_isolation' });
    expect(reposConseille({ nom: 'Curl Barre EZ', objectif: 'endurance' })).toEqual({ sec: 45, raison: 'endurance_isolation' });
    expect(reposConseille({ nom: 'Tractions (Pronation)', objectif: 'endurance' })).toEqual({ sec: 60, raison: 'endurance_poly' });
  });
  it('toutes les valeurs restent dans les fourchettes des sources, en pas de 15 s', () => {
    expect(REPOS_CONSEILLE.force.lourd).toBeGreaterThanOrEqual(150);
    expect(REPOS_CONSEILLE.force.lourd).toBeLessThanOrEqual(180);
    for (const t of ['lourd', 'poly'] as const) {
      expect(REPOS_CONSEILLE.muscle[t]).toBeGreaterThanOrEqual(90);
      expect(REPOS_CONSEILLE.muscle[t]).toBeLessThanOrEqual(120);
    }
    expect(REPOS_CONSEILLE.muscle.isolation).toBeGreaterThanOrEqual(60);
    expect(REPOS_CONSEILLE.muscle.isolation).toBeLessThanOrEqual(90);
    for (const v of Object.values(REPOS_CONSEILLE.endurance)) {
      expect(v).toBeGreaterThanOrEqual(45);
      expect(v).toBeLessThanOrEqual(60);
    }
    for (const o of Object.values(REPOS_CONSEILLE)) for (const v of Object.values(o)) expect(v % 15).toBe(0);
  });
  it('le programme passe avant le conseil, ton choix passe avant tout', () => {
    expect(reposConseille({ nom: 'Curl Barre EZ', objectif: 'muscle', reposProgramme: 60 })).toEqual({ sec: 60, raison: 'programme' });
    expect(reposConseille({ nom: 'Curl Barre EZ', objectif: 'muscle', reposProgramme: 60, reposRetenu: 105 })).toEqual({ sec: 105, raison: 'toi' });
    // valeur absurde : ignoree
    expect(reposConseille({ nom: 'Curl Barre EZ', objectif: 'muscle', reposProgramme: 0, reposRetenu: 5000 }).raison).toBe('muscle_isolation');
  });
});

describe('affichage', () => {
  it('durees', () => {
    expect(libelleDureeRepos(45)).toBe('45 s');
    expect(libelleDureeRepos(90)).toBe('1 min 30');
    expect(libelleDureeRepos(75)).toBe('1 min 15');
    expect(libelleDureeRepos(120)).toBe('2 min');
  });
  it('titre et pourquoi, sans tiret long', () => {
    expect(titreRepos({ sec: 90, raison: 'muscle_poly' })).toBe('Repos conseillé 1 min 30');
    expect(titreRepos({ sec: 120, raison: 'toi' })).toBe('Ton repos 2 min');
    expect(raisonRepos('muscle_isolation')).toBe('Isolation, prise de muscle');
    for (const r of ['toi', 'programme', 'force_lourd', 'force_poly', 'force_isolation', 'muscle_lourd', 'muscle_poly', 'muscle_isolation', 'endurance_lourd', 'endurance_poly', 'endurance_isolation'] as const) {
      expect(raisonRepos(r).length).toBeGreaterThan(0);
      expect(raisonRepos(r)).not.toMatch(/[–—]/);
    }
  });
});

describe('tes choix gardes', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(CLE_REPOS_EXO);
  });
  it('lecture tolerante', () => {
    expect(lireRetenus(null)).toEqual({});
    expect(lireRetenus('pas du json')).toEqual({});
    expect(lireRetenus(JSON.stringify({ a: 90, b: 'x', c: 9999 }))).toEqual({ a: 90 });
  });
  it('meme exercice, meme cle (casse et accents)', () => {
    const r = avecRetenu({}, 'Élévations Latérales', 105);
    expect(reposRetenuDe(r, 'elevations laterales')).toBe(105);
    expect(reposRetenuDe(r, 'Curl Barre EZ')).toBeNull();
  });
  it('change le repos, et la fois suivante il revient', async () => {
    await retenirReposExo('Curl Barre EZ', 105);
    const r = await chargerReposRetenus();
    expect(reposConseille({ nom: 'Curl Barre EZ', objectif: 'muscle', reposRetenu: reposRetenuDe(r, 'Curl Barre EZ') })).toEqual({ sec: 105, raison: 'toi' });
  });
});

describe('le minuteur, l ile et la montre prennent la meme duree', () => {
  const draft = (ex: Partial<LiveExercise>, d: Partial<MuscuDraft> = {}) => ({ restSec: 90, ...d }) as MuscuDraft;
  it('reposDe suit le repos de l exercice', () => {
    const ex = { id: 'e', name: 'Curl Barre EZ', sets: [], repos: { sec: 75, raison: 'muscle_isolation' } } as LiveExercise;
    expect(reposDe(draft(ex), ex)).toBe(75);
  });
  it('ancienne seance sans repos par exercice : comme avant', () => {
    const ex = { id: 'e', name: 'Curl', sets: [], cible: { repsMin: 8, repsMax: 12, reposSec: 60 } } as LiveExercise;
    expect(reposDe(draft(ex), ex)).toBe(60);
    expect(reposDe(draft(ex, { reposManuel: true, restSec: 120 }), ex)).toBe(120);
  });
});
