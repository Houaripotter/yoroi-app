import { accuseValable, claquettesAuLieuDuCoach, estFinSurMontre, lireReglageFinRepos, montreSonne, noterFinSurMontre } from '@/lib/v2/seance/sonneurRepos';
import { rappelARetirer } from '@/lib/v2/seance/ileApp';
import type { MuscuDraft } from '@/lib/v2/seance/model';

const repos = (o: Partial<MuscuDraft> = {}): MuscuDraft => ({
  kind: 'muscu', sport: 'musculation', startedAt: 1, currentId: null, notes: '', restSec: 90, exercises: [],
  restEndsAt: 100000, restTotal: 90, ...o,
});

describe('une seule sonnerie de fin de repos', () => {
  it('accusé valable : même fin, dans les 5 s du début, armé avant les 3 dernières secondes', () => {
    expect(accuseValable(repos(), 100000, 10500)).toEqual({ fin: 100000, debut: 10000 });
    expect(accuseValable(repos(), 101400, 10500)).toEqual({ fin: 100000, debut: 10000 });
    expect(accuseValable(repos(), 102000, 10500)).toBeNull();
    expect(accuseValable(repos(), 100000, 20000)).toBeNull();
    expect(accuseValable(repos({ restEndsAt: null }), 100000, 10500)).toBeNull();
    expect(accuseValable(repos({ restEndsAt: 12000, restTotal: 2 }), 12000, 10000)).toBeNull();
  });

  it('montre qui sonne : accusé pour cette fin, réglage Montre ; iPhone : le téléphone sonne toujours', () => {
    const d = repos({ reposSurMontre: { fin: 100000, debut: 10000 } });
    expect(montreSonne(d, 'montre')).toBe(true);
    expect(montreSonne(d, 'iphone')).toBe(false);
    expect(montreSonne({ ...d, restEndsAt: 115000, restTotal: 105 }, 'montre')).toBe(false);
    expect(montreSonne(repos(), 'montre')).toBe(false);
    expect(montreSonne(null)).toBe(false);
    expect(lireReglageFinRepos('iphone')).toBe('iphone');
    expect(lireReglageFinRepos(null)).toBe('montre');
  });

  it('la fin notée sur la montre bloque notification et alarme pour cette fin seulement', () => {
    noterFinSurMontre(100000);
    expect(estFinSurMontre(100500)).toBe(true);
    expect(estFinSurMontre(130000)).toBe(false);
    noterFinSurMontre(null);
    expect(estFinSurMontre(100000)).toBe(false);
  });

  it('écran fermé : rappel retiré après passer ou arme, pas après une série', () => {
    const avant = repos();
    expect(rappelARetirer(avant, { ...avant, restEndsAt: null }, [{ id: 'p', type: 'passer', at: 1 }], 'montre')).toBe(true);
    const arme = { ...avant, reposSurMontre: { fin: 100000, debut: 10000 } };
    expect(rappelARetirer(avant, arme, [{ id: 'a', type: 'arme', fin: 100000, at: 1 }], 'montre')).toBe(true);
    expect(rappelARetirer(avant, arme, [{ id: 'a', type: 'arme', fin: 100000, at: 1 }], 'iphone')).toBe(false);
    expect(rappelARetirer(avant, arme, [{ id: 's', type: 'serie', exo: 'x', at: 1 }], 'montre')).toBe(false);
  });

  it('claquettes à la place de la phrase des 10 s du coach', () => {
    expect(claquettesAuLieuDuCoach({ clapOn: true, appActive: true, surMontre: false })).toBe(true);
    expect(claquettesAuLieuDuCoach({ clapOn: true, appActive: false, surMontre: true })).toBe(true);
    expect(claquettesAuLieuDuCoach({ clapOn: true, appActive: false, surMontre: false })).toBe(false);
    expect(claquettesAuLieuDuCoach({ clapOn: false, appActive: true, surMontre: true })).toBe(false);
  });
});
