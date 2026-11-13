import { lireCarnet, lireDateHevyTexte, lireHevyTexte, nommerExos } from '@/lib/v2/import/carnet';
import { ressembleCarnet } from '@/lib/v2/import/texteEnAttente';

// Texte partage depuis Hevy par un utilisateur (12 novembre 2026), garde tel quel
const PARTAGE_FR = `PUSH A FORCE
Le lundi, nov. 02, 2026 à 9:02am

Développé Couché (Machine Smith)
Série 1: 20 kg x 20
Série 2: 30 kg x 12
Série 3: 40 kg x 12

Développé Couché Incliné (Haltère)
Série 1: 14 kg x 12
Série 2: 14 kg x 12
Série 3: 16 kg x 12

Élévation Latérale (Haltère)
Série 1: 8 kg x 12
Série 2: 8 kg x 12
Série 3: 10 kg x 8
Série 4: 10 kg x 8

Extension Triceps Corde
Série 1: 15 kg x 12
Série 2: 18 kg x 12
Série 3: 20.3 kg x 10

Chest Press (Machine)
Série 1: 45 kg x 12
Série 2: 52 kg x 12
Série 3: 59 kg x 12

Dips Triceps
Série 1: 12 répétitions
Série 2: 10 répétitions
Série 3: 12 répétitions
Série 4: 12 répétitions

@hevyapp
https://hevy.com/workout/XxSTz6m3Gzi
`;

const PARTAGE_EN = `Push A
Monday, Nov 02, 2026 at 9:02pm

Bench Press (Smith Machine)
Set 1: 20 kg x 20
Set 2: 100 lbs x 12

Triceps Dip
Set 1: 12 reps
Set 2: 10 reps

@hevyapp
https://hevy.com/workout/abc
`;

describe('seance partagee depuis Hevy en texte', () => {
  const r = lireCarnet(PARTAGE_FR, new Date(2026, 10, 12));
  const s = r.seances[0];
  it('une seance, titre, date et heure', () => {
    expect(r.seances).toHaveLength(1);
    expect(s.titre).toBe('PUSH A FORCE');
    expect(s.date).toBe('2026-11-02');
    expect(s.heure).toBe('09:02');
    expect(r.incomprises).toEqual([]);
  });
  it('6 exercices, 3 a 4 series chacun', () => {
    expect(s.exos.map((e) => e.nom)).toEqual([
      'Développé Couché (Machine Smith)',
      'Développé Couché Incliné (Haltère)',
      'Élévation Latérale (Haltère)',
      'Extension Triceps Corde',
      'Chest Press (Machine)',
      'Dips Triceps',
    ]);
    expect(s.exos.map((e) => e.series.length)).toEqual([3, 3, 4, 3, 3, 4]);
  });
  it('charges, point decimal, poids du corps', () => {
    expect(s.exos[0].series[0]).toEqual({ weight: 20, reps: 20 });
    expect(s.exos[3].series[2]).toEqual({ weight: 20.3, reps: 10 });
    expect(s.exos[5].series.map((x) => x.weight)).toEqual([0, 0, 0, 0]);
    expect(s.exos[5].series.map((x) => x.reps)).toEqual([12, 10, 12, 12]);
  });
  it('le meme partage deux fois : meme cle', () => {
    expect(lireHevyTexte(PARTAGE_FR)?.seances[0].cle).toBe(s.cle);
  });
  it('propose l import depuis Dicte ta seance', () => {
    expect(ressembleCarnet(PARTAGE_FR)).toBe(true);
  });
  it('les exercices non reconnus restent, marques comme les tiens', () => {
    const n = nommerExos(r, (nom) => (nom === 'Dips Triceps' ? { nom: 'Dips', sur: true } : { nom, sur: false }));
    expect(n.seances[0].exos[5]).toMatchObject({ nom: 'Dips', saisi: 'Dips Triceps' });
    expect(n.seances[0].exos[0].inconnu).toBe(true);
  });
  it('version anglaise, lbs et reps', () => {
    const e = lireCarnet(PARTAGE_EN).seances[0];
    expect(e.titre).toBe('Push A');
    expect(e.date).toBe('2026-11-02');
    expect(e.heure).toBe('21:02');
    expect(e.exos[0].series[1]).toEqual({ weight: 45.36, reps: 12 });
    expect(e.exos[1].series).toEqual([{ weight: 0, reps: 12 }, { weight: 0, reps: 10 }]);
  });
  it('dates du partage', () => {
    expect(lireDateHevyTexte('Le lundi, nov. 02, 2026 à 9:02am')).toEqual({ date: '2026-11-02', heure: '09:02' });
    expect(lireDateHevyTexte('Monday, Nov 2, 2026 at 12:15am')).toEqual({ date: '2026-11-02', heure: '00:15' });
    expect(lireDateHevyTexte('lundi 2 nov. 2026 à 21:02')).toEqual({ date: '2026-11-02', heure: '21:02' });
    expect(lireDateHevyTexte('Développé Couché')).toBeNull();
  });
  it('les notes du telephone ne sont pas prises pour un partage', () => {
    expect(lireHevyTexte('14/10\nSquat 100kg 3x5')).toBeNull();
  });
});
