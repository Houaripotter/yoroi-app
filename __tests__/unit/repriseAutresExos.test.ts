/**
 * 18 novembre 2026 : toutes les machines (500), et « Ajoute d'autres machines d'un coup »
 * (lib/v2/seances/machinesPerso.ts, listeMachines.ts).
 */
import { avecMachines, machineDe, MAX_MACHINES_PERSO, nettoyerMachines } from '@/lib/v2/seances/machinesPerso';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { lireListeNoms, preparerListe } from '@/lib/v2/seances/listeMachines';
import { musclesExercice } from '@/lib/v2/seances/musclesExercices';

const grande = (n: number): MachinePerso[] => Array.from({ length: n }, (_, i) => ({ nom: `Machine ${i + 1}`, muscle: 'DOS', le: '2026-11-18' }));

describe('grande liste de machines', () => {
  it('500 machines gardees, rien ne part', () => {
    expect(MAX_MACHINES_PERSO).toBe(500);
    expect(nettoyerMachines(grande(500))).toHaveLength(500);
  });
  it('au dela de la place, rien n est ajoute et tes machines d avant restent', () => {
    const r = avecMachines(grande(499), [{ nom: 'Presse du fond', muscle: 'JAMBES' }, { nom: 'Poulie de Momo', muscle: 'TRICEPS' }], '2026-11-18');
    expect(r.ajoutees).toEqual(['Presse du fond']);
    expect(r.sansPlace).toEqual(['Poulie de Momo']);
    expect(r.liste).toHaveLength(500);
    expect(r.liste[0].nom).toBe('Machine 1');
  });
  it('rapide : 500 recherches dans 500 machines', () => {
    const l = grande(500);
    const t0 = Date.now();
    for (let i = 0; i < 500; i++) expect(machineDe(l, `machine ${i + 1}`)?.nom).toBe(`Machine ${i + 1}`);
    for (let i = 0; i < 200; i++) musclesExercice({ name: `Machine ${i + 1}` }, l);
    expect(Date.now() - t0).toBeLessThan(1500);
  });
  it('le nom garde tel quel, sans majuscule ajoutee, 80 caracteres', () => {
    const r = avecMachines([], [{ nom: '  poulie   de Momo ', muscle: 'TRICEPS' }, { nom: 'x'.repeat(90), muscle: 'DOS' }], '2026-11-18');
    expect(r.ajoutees[0]).toBe('poulie de Momo');
    expect(r.ajoutees[1]).toHaveLength(80);
    expect(nettoyerMachines(r.liste)[0].nom).toBe('poulie de Momo');
  });
});

describe('collage de liste', () => {
  const COLLE = `1. Presse convergente du fond
- Poulie vis à vis de ma salle
• Tirage de Kevin 3x10 60kg
Presse convergente du fond
PRESSE CONVERGENTE DU FOND

2) Curl pupitre maison
Le truc bleu
Développé Couché (Barre)
Vélo assis
`;
  it('puces, numeros, series et charges retires, doublons ignores', () => {
    expect(lireListeNoms(COLLE)).toEqual(['Presse convergente du fond', 'Poulie vis à vis de ma salle', 'Tirage de Kevin', 'Curl pupitre maison', 'Le truc bleu', 'Développé Couché (Barre)', 'Vélo assis']);
  });
  it('muscle devine ou demande, deja dans tes machines, deja dans YOROI', () => {
    const deja: MachinePerso[] = [{ nom: 'Tirage de Kevin', muscle: 'DOS', le: '2026-11-01' }];
    const r = preparerListe(COLLE, deja, (n) => (n === 'Développé Couché (Barre)' ? n : null));
    expect(r.deja).toEqual(['Tirage de Kevin']);
    expect(r.dansYoroi).toEqual(['Développé Couché (Barre)']);
    expect(r.nouveaux).toEqual([
      // « presse convergente » : pectoraux ou jambes selon la salle, YOROI demande
      { nom: 'Presse convergente du fond', muscle: null },
      { nom: 'Poulie vis à vis de ma salle', muscle: null },
      { nom: 'Curl pupitre maison', muscle: 'BICEPS' },
      { nom: 'Le truc bleu', muscle: null },
      { nom: 'Vélo assis', muscle: 'CARDIO' },
    ]);
  });
  it('doublons avec tes machines ignores a l ajout, une machine sans muscle n est pas ajoutee', () => {
    const r = avecMachines([{ nom: 'Le truc bleu', muscle: 'DOS', le: '' }], [{ nom: 'le truc BLEU', muscle: 'JAMBES' }, { nom: 'Truc vert', muscle: null }], '2026-11-18');
    expect(r.deja).toEqual(['le truc BLEU']);
    expect(r.sansMuscle).toEqual(['Truc vert']);
    expect(r.liste[0].muscle).toBe('DOS');
  });
});
