/**
 * Sens de lecture (lib/v2/rtl.ts) : droite a gauche pour l'arabe seulement.
 * Toutes les autres langues de YOROI sont forcees de gauche a droite, sans relance : rien ne change pour elles.
 */
import { LANGUES_ACTIVES } from '@/lib/i18n/tr';
import { appliquerSens, EST_RTL, langueEstRTL, ltrSiRTL, miroirSiRTL } from '@/lib/v2/rtl';

function faux(isRTL: boolean) {
  const appels: { allow: boolean[]; force: boolean[]; relances: number; cles: Record<string, string> } = { allow: [], force: [], relances: 0, cles: {} };
  const outils = {
    i18n: { isRTL, allowRTL: (v: boolean) => appels.allow.push(v), forceRTL: (v: boolean) => appels.force.push(v) },
    relancer: () => {
      appels.relances += 1;
      return true;
    },
    lire: (k: string) => appels.cles[k] ?? null,
    ecrire: (k: string, v: string) => {
      appels.cles[k] = v;
    },
  };
  return { appels, outils };
}

describe('sens de lecture', () => {
  it('toutes les langues actives sauf l arabe : gauche a droite force, sans relance', () => {
    const nonArabes = LANGUES_ACTIVES.filter((l) => (l as string) !== 'ar');
    expect(nonArabes.length).toBeGreaterThan(0);
    for (const l of nonArabes) {
      const { appels, outils } = faux(false);
      expect(appliquerSens(l, outils)).toBe('ok');
      expect(appels.allow).toEqual([false]);
      expect(appels.force).toEqual([false]);
      expect(appels.relances).toBe(0);
      expect(langueEstRTL(l)).toBe(false);
    }
  });

  it('une app restee en droite a gauche revient a gauche a droite hors arabe (une relance)', () => {
    const { appels, outils } = faux(true);
    expect(appliquerSens('fr', outils)).toBe('relance');
    expect(appels.force).toEqual([false]);
    expect(appels.relances).toBe(1);
  });

  it('arabe : droite a gauche, une seule relance, puis plus rien', () => {
    const { appels, outils } = faux(false);
    expect(appliquerSens('ar', outils)).toBe('relance');
    expect(appels.force).toEqual([true]);
    expect(appels.relances).toBe(1);
    // si le sens n'a toujours pas pris apres la relance : pas de boucle, on demande de rouvrir l'app
    expect(appliquerSens('ar', outils)).toBe('relancer_a_la_main');
    expect(appels.relances).toBe(1);
    // le sens a pris : tout va bien, la garde est effacee
    const ok = faux(true);
    ok.appels.cles = appels.cles;
    expect(appliquerSens('ar', ok.outils)).toBe('ok');
    expect(ok.appels.relances).toBe(0);
  });

  it('en francais (tests), aucun style en plus', () => {
    expect(EST_RTL).toBe(false);
    expect(ltrSiRTL).toBeUndefined();
    expect(miroirSiRTL).toBeUndefined();
    expect(langueEstRTL('ar')).toBe(true);
    expect(langueEstRTL('ar-MA')).toBe(true);
  });
});
