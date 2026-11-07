import { appliquerActionsIle, prendreActionsHorsEcran, retenirActionsHorsEcran, type ActionIle } from '@/lib/v2/seance/actionsIle';
import { memeSeanceDebut, noterDebutAjuste, type MuscuDraft } from '@/lib/v2/seance/model';

const brouillon = (): MuscuDraft => ({
  kind: 'muscu',
  sport: 'musculation',
  startedAt: 1000,
  currentId: 'a',
  notes: '',
  restSec: 90,
  restEndsAt: null,
  restTotal: 0,
  exercises: [{ id: 'a', name: 'Squat', sets: [{ id: 'a1', weight: 80, reps: 8, done: false }, { id: 'a2', weight: 80, reps: 8, done: false }, { id: 'a3', weight: 80, reps: 8, done: false }] }],
});
const serie = (id: string, at: number): ActionIle => ({ id, type: 'serie', exo: 'a', at });

describe('séries faites sur la montre pendant que la séance se charge', () => {
  it('l écran qui a lu l ancien brouillon rejoue les appuis gardés : aucune série perdue', () => {
    const lu = brouillon();
    retenirActionsHorsEcran([serie('m1', 5000), serie('m2', 9000)]);
    const l = prendreActionsHorsEcran(lu.startedAt);
    const d = appliquerActionsIle(lu, l);
    expect(d.exercises[0].sets.filter((s) => s.done)).toHaveLength(2);
    // la liste est vidée une fois prise
    expect(prendreActionsHorsEcran(lu.startedAt)).toEqual([]);
  });
  it('rejouer sur un brouillon qui les a déjà : aucune série en double', () => {
    const deja = appliquerActionsIle(brouillon(), [serie('m1', 5000)]);
    retenirActionsHorsEcran([serie('m1', 5000)]);
    const d = appliquerActionsIle(deja, prendreActionsHorsEcran(deja.startedAt));
    expect(d.exercises[0].sets.filter((s) => s.done)).toHaveLength(1);
  });
  it('les appuis d avant la séance ne sont pas rejoués, ni gardés deux fois', () => {
    retenirActionsHorsEcran([serie('vieux', 500), serie('m3', 6000), serie('m3', 6000)]);
    expect(prendreActionsHorsEcran(1000).map((a) => a.id)).toEqual(['m3']);
  });
  it('30 appuis gardés au plus', () => {
    retenirActionsHorsEcran(Array.from({ length: 40 }, (_, i) => serie(`n${i}`, 2000 + i)));
    const l = prendreActionsHorsEcran(1000);
    expect(l).toHaveLength(30);
    expect(l[0].id).toBe('n10');
  });
});

describe('heure de début corrigée', () => {
  it('reste la même séance pour la sauvegarde', () => {
    noterDebutAjuste(50_000, 20_000);
    expect(memeSeanceDebut(50_000, 20_000)).toBe(true);
    noterDebutAjuste(20_000, 10_000);
    expect(memeSeanceDebut(50_000, 10_000)).toBe(true);
    expect(memeSeanceDebut(50_000, 99_000)).toBe(false);
  });
});
