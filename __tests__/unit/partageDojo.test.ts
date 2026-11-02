/**
 * Le Dojo partage entre tes appareils (2 novembre 2026, lib/v2/dojo/partageDojo.ts).
 */
import { construirePartage, fusionnerPartage, unirPartage, ID_META } from '@/lib/v2/dojo/partageDojo';
import type { LigneXp, MetaDojo } from '@/lib/v2/dojo/partageDojo';

const L = (k: string, d: string, s: string, a: number, t = `${d} 10:00:00`, l = s): LigneXp => ({ k, d, s, a, t, l });
const total = (j: LigneXp[]) => j.reduce((x, r) => x + r.a, 0);

describe('partage du Dojo entre appareils', () => {
  const iphone = [
    L('seance:17', '2026-10-01', 'seance', 20),
    L('seance:18', '2026-10-01', 'seance', 20, '2026-10-01 18:00:00'),
    L('pesee:2026-10-01', '2026-10-01', 'pesee', 5),
    L('coffre:2026-10-01', '2026-10-01', 'coffre', 15),
    L('semaine:2026-09-28', '2026-09-28', 'semaine', 50),
    L('migration:rang', '2026-09-01', 'migration', 2000),
    L('record:17:developpe couche', '2026-10-01', 'record', 15, '2026-10-01 10:00:00', 'Développé couché, 80 kg'),
  ];
  const metaIphone = { departDay: '2026-09-01', ancien: true, migratedAt: '2026-09-01 08:00:00', rankSeen: 2, danSeen: 0, serieRecord: 12, seals: { flamme: '2026-09-05' }, pauses: {} };

  it('un iPad neuf recoit tout, a l’identique', () => {
    const recu = construirePartage(iphone, metaIphone);
    const vide: MetaDojo = { departDay: '2026-11-02', migratedAt: null, rankSeen: 0 };
    const f = fusionnerPartage([], vide, recu);
    expect(total(f.ajout)).toBe(total(iphone));
    expect(f.meta.departDay).toBe('2026-09-01');
    expect(f.meta.ancien).toBe(true);
    // jamais calcule ici : son premier calcul complet reste a faire
    expect(f.meta.migratedAt).toBeNull();
    expect(f.meta.rankSeen).toBe(2);
    expect(f.meta.seals).toEqual({ flamme: '2026-09-05' });
  });

  it('un jour deja credite ici ne l’est pas deux fois (numeros de seance differents)', () => {
    const ipad = [L('seance:3', '2026-10-01', 'seance', 20), L('record:3:developpe couche', '2026-10-01', 'record', 15, '2026-10-01 10:00:00', 'Développé couché, 80 kg')];
    const f = fusionnerPartage(ipad, {}, construirePartage(iphone, metaIphone));
    const seances = f.ajout.filter((r) => r.s === 'seance');
    expect(seances).toHaveLength(1); // la deuxieme seance du jour seulement
    expect(f.ajout.filter((r) => r.s === 'record')).toHaveLength(0);
    expect(seances[0].k).not.toBe('seance:18');
  });

  it('une reprise d’ancien rang ne s’ajoute pas a une autre', () => {
    const ipad = [L('migration:restaure1', '2026-10-20', 'migration', 1500)];
    const f = fusionnerPartage(ipad, {}, construirePartage(iphone, metaIphone));
    expect(f.ajout.some((r) => r.s === 'migration')).toBe(false);
  });

  it('les allers retours ne gonflent jamais l’XP', () => {
    let a = [...iphone];
    let ma: Record<string, unknown> = { ...metaIphone };
    let b: LigneXp[] = [L('seance:3', '2026-10-02', 'seance', 20), L('coffre:2026-10-02', '2026-10-02', 'coffre', 6)];
    let mb: Record<string, unknown> = { departDay: '2026-10-02', migratedAt: '2026-10-02 09:00:00' };
    for (let i = 0; i < 4; i += 1) {
      const fb = fusionnerPartage(b, mb, construirePartage(a, ma));
      b = [...b, ...fb.ajout];
      mb = fb.meta;
      const fa = fusionnerPartage(a, ma, construirePartage(b, mb));
      a = [...a, ...fa.ajout];
      ma = fa.meta;
    }
    expect(total(a)).toBe(total(b));
    expect(total(a)).toBe(total(iphone) + 26);
  });

  it('la cle partagee ne perd jamais un element', () => {
    const mienne = construirePartage([L('pesee:2026-10-03', '2026-10-03', 'pesee', 5)], {});
    const u = unirPartage([{ k: 'coffre:2026-10-01', d: '2026-10-01', s: 'coffre', a: 15, t: '', l: '' }], mienne);
    expect(u.map((e) => e.k).sort()).toEqual(['coffre:2026-10-01', ID_META, 'pesee:2026-10-03'].sort());
  });

  it('une valeur illisible ne change rien', () => {
    expect(fusionnerPartage(iphone, metaIphone, 'abc').change).toBe(false);
    expect(fusionnerPartage(iphone, metaIphone, [{ k: 'x' }, null, 3]).ajout).toEqual([]);
  });
});
