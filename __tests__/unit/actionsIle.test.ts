import { appliquerActionsIle, estActionIle, lireActionIle, planIle, type TextesIle } from '@/lib/v2/seance/actionsIle';
import type { MuscuDraft } from '@/lib/v2/seance/model';

const T: TextesIle = { serie: '{0}, série {1} sur {2}', ensuite: 'Ensuite : {0}, série {1}', ensuiteExo: 'Ensuite : {0}', fini: 'Séance bouclée', bouton: 'Série faite', plus15: '+15 s', reposFini: 'Repos terminé' };

const brouillon = (): MuscuDraft => ({
  kind: 'muscu',
  sport: 'musculation',
  startedAt: 1000,
  currentId: 'a',
  notes: '',
  restSec: 90,
  restEndsAt: null,
  restTotal: 0,
  exercises: [
    { id: 'a', name: 'Squat', sets: [{ id: 'a1', weight: 80, reps: 8, done: false }, { id: 'a2', weight: 0, reps: 0, done: false }], cible: { repsMin: 6, repsMax: 10, reposSec: 180 } },
    { id: 'b', name: 'Curl', sets: [{ id: 'b1', weight: 12, reps: 0, done: false, prevReps: 11 }] },
  ],
});

describe('boutons de la séance dans la Dynamic Island', () => {
  it('le plan donne les séries faites, le total, le repos et l exercice en cours', () => {
    const p = planIle(brouillon(), T, (e) => e.name);
    expect(p.cur).toBe(0);
    expect(p.exos).toEqual([
      { id: 'a', nom: 'Squat', faites: 0, total: 2, repos: 180 },
      { id: 'b', nom: 'Curl', faites: 0, total: 1, repos: 90 },
    ]);
    expect(p.debutMs).toBe(1000);
  });

  it('série faite : validée, valeurs reprises pour la suivante, repos du programme lancé', () => {
    const d = appliquerActionsIle(brouillon(), [{ id: 'x', type: 'serie', exo: 'a', at: 5000 }]);
    expect(d.exercises[0].sets[0].done).toBe(true);
    expect(d.exercises[0].sets[1]).toMatchObject({ weight: 80, reps: 8, done: false });
    expect(d.restEndsAt).toBe(5000 + 180000);
    expect(d.restTotal).toBe(180);
    expect(d.currentId).toBe('a');
  });

  it('dernière série d un exercice : passage au suivant ; sans répétitions, celles de la dernière fois', () => {
    let d = appliquerActionsIle(brouillon(), [
      { id: '2', type: 'serie', exo: 'a', at: 9000 },
      { id: '1', type: 'serie', exo: 'a', at: 5000 },
    ]);
    expect(d.exercises[0].sets.every((s) => s.done)).toBe(true);
    expect(d.currentId).toBe('b');
    d = appliquerActionsIle(d, [{ id: '3', type: 'serie', exo: 'b', at: 12000 }]);
    expect(d.exercises[1].sets[0]).toMatchObject({ reps: 11, done: true });
    // séance bouclée : plus de repos, comme l'île
    expect(d.restEndsAt).toBeNull();
    expect(d.ile).toEqual({ maj: 12000, ids: ['1', '2', '3'] });
  });

  it('un appui déjà appliqué ne compte pas deux fois ; le plan porte la date du dernier appui', () => {
    const une = appliquerActionsIle(brouillon(), [{ id: 'x', type: 'serie', exo: 'a', at: 5000 }]);
    const deux = appliquerActionsIle(une, [{ id: 'x', type: 'serie', exo: 'a', at: 5000 }]);
    expect(deux).toEqual(une);
    expect(planIle(une, T, (e) => e.name).maj).toBe(5000);
    expect(planIle(brouillon(), T, (e) => e.name).maj).toBe(0);
  });

  it('+15 s allonge seulement un repos en cours ; actions illisibles ignorées', () => {
    const d = appliquerActionsIle(brouillon(), [
      { id: '1', type: 'serie', exo: 'a', at: 5000 },
      { id: '2', type: 'repos15', at: 6000 },
    ]);
    expect(d.restEndsAt).toBe(5000 + 180000 + 15000);
    expect(appliquerActionsIle(brouillon(), [{ id: '3', type: 'repos15', at: 6000 }]).restEndsAt).toBeNull();
    expect(appliquerActionsIle(brouillon(), [{ id: '4', type: 'serie', exo: 'zz', at: 6000 }]).exercises).toEqual(brouillon().exercises);
    expect(lireActionIle({ type: 'serie', at: 1 })).toBeNull();
    expect(lireActionIle({ id: 'q', type: 'serie', at: 1 })).toBeNull();
    expect(lireActionIle({ id: 'q', type: 'eau', at: 1 })).toBeNull();
    expect(lireActionIle({ id: 'q', type: 'repos15', at: 1 })).toEqual({ id: 'q', type: 'repos15', exo: undefined, at: 1 });
    expect(estActionIle({ type: 'eau' })).toBe(false);
  });
});

describe('7 novembre 2026 : repos, passer et arme envoyés par l Apple Watch', () => {
  const enRepos = () => appliquerActionsIle(brouillon(), [{ id: 's', type: 'serie', exo: 'a', at: 5000 }]);

  it('lecture : repos sans durée, arme sans fin ignorés ; passer et arme gardent la fin', () => {
    expect(estActionIle({ type: 'repos' })).toBe(true);
    expect(estActionIle({ type: 'passer' })).toBe(true);
    expect(estActionIle({ type: 'arme' })).toBe(true);
    expect(lireActionIle({ id: 'r', type: 'repos', at: 1 })).toBeNull();
    expect(lireActionIle({ id: 'r', type: 'repos', at: 1, secondes: 0 })).toBeNull();
    expect(lireActionIle({ id: 'r', type: 'repos', at: 1, secondes: 90.4, exo: 'a' })).toEqual({ id: 'r', type: 'repos', exo: 'a', at: 1, secondes: 90 });
    expect(lireActionIle({ id: 'm', type: 'arme', at: 1 })).toBeNull();
    expect(lireActionIle({ id: 'm', type: 'arme', at: 1, fin: 9000 })).toEqual({ id: 'm', type: 'arme', exo: undefined, at: 1, fin: 9000 });
    expect(lireActionIle({ id: 'p', type: 'passer', at: 1 })).toEqual({ id: 'p', type: 'passer', exo: undefined, at: 1 });
  });

  it('repos : un minuteur de la montre devient le repos ; un repos en cours est prolongé', () => {
    const d = appliquerActionsIle(brouillon(), [{ id: 'r', type: 'repos', secondes: 60, exo: 'a', at: 2000 }]);
    expect(d.restEndsAt).toBe(62000);
    expect(d.restTotal).toBe(60);
    // +30 s sur le minuteur de la montre : nouvelle fin, le total suit
    const e = appliquerActionsIle(enRepos(), [{ id: 'r2', type: 'repos', secondes: 200, fin: 215000, at: 15000 }]);
    expect(e.restEndsAt).toBe(215000);
    expect(e.restTotal).toBe(210);
  });

  it('passer : coupe seulement le repos visé', () => {
    const d = enRepos();
    expect(appliquerActionsIle(d, [{ id: 'p', type: 'passer', fin: 185000 + 800, at: 9000 }]).restEndsAt).toBeNull();
    expect(appliquerActionsIle(d, [{ id: 'p', type: 'passer', fin: 999999, at: 9000 }]).restEndsAt).toBe(185000);
    expect(appliquerActionsIle(d, [{ id: 'p', type: 'passer', at: 9000 }]).restEndsAt).toBeNull();
  });

  it('arme : accusé dans les 5 s du début du repos, même fin ; ensuite ignoré', () => {
    const d = enRepos();
    const ok = appliquerActionsIle(d, [{ id: 'm', type: 'arme', fin: 185000, at: 5200 }]);
    expect(ok.reposSurMontre).toEqual({ fin: 185000, debut: 5000 });
    expect(appliquerActionsIle(d, [{ id: 'm', type: 'arme', fin: 185000, at: 30000 }]).reposSurMontre).toBeUndefined();
    expect(appliquerActionsIle(d, [{ id: 'm', type: 'arme', fin: 190000, at: 5200 }]).reposSurMontre).toBeUndefined();
    // +15 s sur le téléphone puis la montre réarme : même repos, accusé repris
    const plus = appliquerActionsIle(ok, [{ id: 'q', type: 'repos15', at: 40000 }]);
    const re = appliquerActionsIle(plus, [{ id: 'm2', type: 'arme', fin: 200000, at: 41000 }]);
    expect(re.reposSurMontre).toEqual({ fin: 200000, debut: 5000 });
    // série et accusé de la montre arrivés ensemble
    const ens = appliquerActionsIle(brouillon(), [
      { id: 'm3', type: 'arme', fin: 185000, at: 5001 },
      { id: 's3', type: 'serie', exo: 'a', at: 5000 },
    ]);
    expect(ens.reposSurMontre).toEqual({ fin: 185000, debut: 5000 });
  });
});
