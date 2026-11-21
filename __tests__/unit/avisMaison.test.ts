/**
 * Feuille « Tu aimes YOROI ? » (lib/v2/bilan/avis.ts) : la regle et le stockage.
 * Jamais pendant l'onboarding ni la demo, pas avant 3 seances, au plus une fois tous les 60 jours,
 * plus jamais apres « Noter » ou apres 3 « Plus tard ».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  avisMontre,
  avisNote,
  avisPlusTard,
  decisionAvisMaison,
  ETAT_AVIS_VIDE,
  JOURS_ENTRE_AVIS,
  lireEtatAvis,
  lireEtatBrut,
  peutMontrerAvis,
  REFUS_MAX,
  SEANCES_AVANT_AVIS_MAISON,
} from '@/lib/v2/bilan/avis';

const JOUR = 86400000;
const T0 = Date.UTC(2026, 9, 16, 12);
const base = { etat: { ...ETAT_AVIS_VIDE }, seances: 3, maintenant: T0, onboardingFini: true, demo: false, autreFenetre: false };

describe('decisionAvisMaison', () => {
  it('21 novembre 2026 : pas dans les 120 jours qui suivent la fenetre native apres une seance', () => {
    expect(decisionAvisMaison({ ...base, derniereNative: T0 - 30 * JOUR })).toBe(false);
    expect(decisionAvisMaison({ ...base, derniereNative: T0 - 120 * JOUR })).toBe(true);
    expect(decisionAvisMaison({ ...base, derniereNative: null })).toBe(true);
  });

  it('montre la feuille a partir de la 3e seance', () => {
    expect(SEANCES_AVANT_AVIS_MAISON).toBe(3);
    expect(decisionAvisMaison(base)).toBe(true);
    expect(decisionAvisMaison({ ...base, seances: 2 })).toBe(false);
    expect(decisionAvisMaison({ ...base, seances: 0 })).toBe(false);
  });

  it('jamais pendant l onboarding, la demo ou par-dessus une autre fenetre', () => {
    expect(decisionAvisMaison({ ...base, onboardingFini: false })).toBe(false);
    expect(decisionAvisMaison({ ...base, demo: true })).toBe(false);
    expect(decisionAvisMaison({ ...base, autreFenetre: true })).toBe(false);
  });

  it('au plus une fois tous les 60 jours', () => {
    expect(JOURS_ENTRE_AVIS).toBe(60);
    const etat = { ...ETAT_AVIS_VIDE, derniere: T0 };
    expect(decisionAvisMaison({ ...base, etat, maintenant: T0 + 59 * JOUR })).toBe(false);
    expect(decisionAvisMaison({ ...base, etat, maintenant: T0 + 60 * JOUR })).toBe(true);
  });

  it('plus jamais apres Noter ni apres 3 refus', () => {
    const loin = T0 + 400 * JOUR;
    expect(decisionAvisMaison({ ...base, maintenant: loin, etat: { derniere: T0, refus: 0, note: true } })).toBe(false);
    expect(REFUS_MAX).toBe(3);
    expect(decisionAvisMaison({ ...base, maintenant: loin, etat: { derniere: T0, refus: 2, note: false } })).toBe(true);
    expect(decisionAvisMaison({ ...base, maintenant: loin, etat: { derniere: T0, refus: 3, note: false } })).toBe(false);
  });

  it('un stockage abime redevient un etat vide', () => {
    expect(lireEtatBrut(null)).toEqual(ETAT_AVIS_VIDE);
    expect(lireEtatBrut('{pas du json')).toEqual(ETAT_AVIS_VIDE);
    expect(lireEtatBrut('{"derniere":"hier","refus":-2,"note":"oui"}')).toEqual(ETAT_AVIS_VIDE);
  });
});

describe('stockage AsyncStorage', () => {
  // AsyncStorage en memoire pour ces tests (le mock global ne garde rien)
  let memoire: Record<string, string> = {};
  beforeEach(async () => {
    memoire = {};
    (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) => Promise.resolve(memoire[k] ?? null));
    (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
      memoire[k] = v;
      return Promise.resolve();
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
      delete memoire[k];
      return Promise.resolve();
    });
    await AsyncStorage.setItem('yoroi_onboarding_done', 'true');
    await AsyncStorage.setItem('yoroi_review_count', '3');
  });

  it('lit le compteur de seances, l onboarding et la demo', async () => {
    expect(await peutMontrerAvis(false, T0)).toBe(true);
    await AsyncStorage.setItem('yoroi_review_count', '2');
    expect(await peutMontrerAvis(false, T0)).toBe(false);
    await AsyncStorage.setItem('yoroi_review_count', '5');
    await AsyncStorage.setItem('@yoroi_demo_data_active', 'true');
    expect(await peutMontrerAvis(false, T0)).toBe(false);
    await AsyncStorage.removeItem('@yoroi_demo_data_active');
    await AsyncStorage.removeItem('yoroi_onboarding_done');
    expect(await peutMontrerAvis(false, T0)).toBe(false);
  });

  it('montree puis Plus tard trois fois : plus jamais', async () => {
    let t = T0;
    for (let i = 0; i < 3; i++) {
      expect(await peutMontrerAvis(false, t)).toBe(true);
      await avisMontre(t);
      expect(await peutMontrerAvis(false, t + JOUR)).toBe(false);
      await avisPlusTard();
      t += 61 * JOUR;
    }
    expect((await lireEtatAvis()).refus).toBe(3);
    expect(await peutMontrerAvis(false, t + 400 * JOUR)).toBe(false);
  });

  it('Noter : plus jamais', async () => {
    await avisMontre(T0);
    await avisNote();
    expect(await peutMontrerAvis(false, T0 + 400 * JOUR)).toBe(false);
  });
});
