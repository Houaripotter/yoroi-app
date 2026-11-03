/**
 * 3 novembre 2026 : corrections de l'onboarding demandees par Houari.
 * Compteur du Studio (23/20), mode createur sans mesure ni ecriture, langue du telephone sans choix sur la page 1.
 */
import fs from 'fs';
import path from 'path';

jest.mock('@/utils/telemetry', () => ({
  track: jest.fn(),
  setProprietes: jest.fn(),
  familleDeSport: () => 'muscu',
  trancheNombre: () => '1',
}));

import { ORDRE_ONBOARDING, TOTAL_ECRANS, ECRAN_HORS_APERCU, compteurEcran, ecranAPosition, ecranApercuDemande, ecranPrecedent, ecranSuivant, positionEcran } from '@/lib/v2/onboarding/ordreEcrans';
import { regleOnboarding, vueNouvelUtilisateurActive } from '@/lib/v2/creator/onboardingCreateur';
import { choixOnboarding, mesureOnboardingCoupee, onboardingEvent, setApercuOnboarding } from '@/lib/v2/onboarding/events';
import { EMPTY_DRAFT } from '@/lib/v2/onboarding/draft';
import * as telemetry from '@/utils/telemetry';

const lire = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

describe('ordre des ecrans du Studio', () => {
  it('chaque ecran du parcours une seule fois, sauf l accueil du mode retour', () => {
    expect(TOTAL_ECRANS).toBe(22);
    expect(new Set(ORDRE_ONBOARDING).size).toBe(TOTAL_ECRANS);
    for (let n = 0; n <= 22; n += 1) {
      if (n === ECRAN_HORS_APERCU) expect(positionEcran(n)).toBe(-1);
      else expect(positionEcran(n)).toBeGreaterThanOrEqual(0);
    }
  });

  it('le compteur ne depasse jamais le total (avant : 23/20 sur Ou as-tu connu YOROI)', () => {
    for (let n = -3; n <= 40; n += 1) {
      const { position, total } = compteurEcran(n);
      expect(position).toBeGreaterThanOrEqual(1);
      expect(position).toBeLessThanOrEqual(total);
    }
    expect(compteurEcran(22)).toEqual({ position: 5, total: 22 });
    expect(compteurEcran(20)).toEqual({ position: 7, total: 22 });
    expect(compteurEcran(19)).toEqual({ position: 22, total: 22 });
  });

  it('les fleches suivent le parcours reel', () => {
    expect(ecranSuivant(3)).toBe(22);
    expect(ecranSuivant(22)).toBe(4);
    expect(ecranSuivant(4)).toBe(20);
    expect(ecranSuivant(20)).toBe(5);
    expect(ecranSuivant(18)).toBe(9);
    expect(ecranSuivant(19)).toBe(19);
    expect(ecranPrecedent(0)).toBe(0);
    expect(ecranPrecedent(5)).toBe(20);
  });

  it('les puces et la page demandee ouvrent le bon ecran', () => {
    expect(ecranAPosition(4)).toBe(22);
    expect(ecranAPosition(TOTAL_ECRANS - 1)).toBe(19);
    expect(ecranAPosition(99)).toBe(19);
    expect(ecranApercuDemande(22)).toBe(22);
    expect(ecranApercuDemande(21)).toBe(0);
    expect(ecranApercuDemande(57)).toBe(0);
  });
});

describe('mode createur', () => {
  it('apercu, bac a sable, sans ecriture, normal', () => {
    expect(regleOnboarding({ apercu: true, createur: true, vueNouvelUtilisateur: false })).toEqual({ mode: 'apercu', mesure: false, ecritures: false });
    expect(regleOnboarding({ apercu: false, createur: false, vueNouvelUtilisateur: false })).toEqual({ mode: 'normal', mesure: true, ecritures: true });
    expect(regleOnboarding({ apercu: false, createur: true, vueNouvelUtilisateur: true })).toEqual({ mode: 'createur_bac_a_sable', mesure: false, ecritures: true });
    expect(regleOnboarding({ apercu: false, createur: true, vueNouvelUtilisateur: false })).toEqual({ mode: 'createur_sans_ecriture', mesure: false, ecritures: false });
    expect(vueNouvelUtilisateurActive('true')).toBe(true);
    expect(vueNouvelUtilisateurActive(null)).toBe(false);
    expect(vueNouvelUtilisateurActive('1')).toBe(false);
  });

  it('mesure coupee : aucun evenement ni propriete, « ou as-tu connu » compris', () => {
    const track = telemetry.track as jest.Mock;
    const props = telemetry.setProprietes as jest.Mock;
    track.mockClear();
    props.mockClear();
    setApercuOnboarding(true);
    expect(mesureOnboardingCoupee()).toBe(true);
    onboardingEvent('ecran', { ecran: 'source' });
    onboardingEvent('fin', { par: 'free' });
    choixOnboarding('source', { ...EMPTY_DRAFT, source: 'tiktok' });
    choixOnboarding('toi', { ...EMPTY_DRAFT, gender: 'homme' });
    expect(track).not.toHaveBeenCalled();
    expect(props).not.toHaveBeenCalled();
    setApercuOnboarding(false);
    choixOnboarding('source', { ...EMPTY_DRAFT, source: 'tiktok' });
    expect(track).toHaveBeenCalledWith('onboarding_choix', { etape: 'source', choix: 'tiktok' });
  });

  it('app/onboarding.tsx branche la regle sur les ecritures et la mesure', () => {
    const src = lire('app/onboarding.tsx');
    expect(src).toContain('regleOnboarding({ apercu: isPreview, createur: isCreator');
    expect(src).toContain('setApercuOnboarding(!regleConnue || !regle.mesure)');
    expect(src).toContain('if (sansEcriture || retour || finished.current) return;');
  });
});

describe('langue', () => {
  it('plus de choix de la langue sur la page 1, il reste dans Reglages et Profil', () => {
    expect(lire('components/yoroi/v2/onboarding/Accroche.tsx')).not.toContain('BoutonLangue');
    expect(lire('app/settings/index.tsx')).toContain('FeuilleLangue');
    expect(lire('app/profile.tsx')).toContain('FeuilleLangue');
  });
});
