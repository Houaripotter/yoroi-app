/**
 * 7 novembre 2026 : propositions de l'audit de l'onboarding validees par Houari.
 * Ou as-tu connu YOROI apres Ton plan, Cap sans courbe, Moment sans « combien de fois », Ton plan avec sa ligne et
 * ses paliers (meme logique que l'accueil), Rythme et Moment avec le meme choix des jours.
 */
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ORDRE_ONBOARDING, compteurEcran, ecranPrecedent, ecranSuivant, positionEcran } from '@/lib/v2/onboarding/ordreEcrans';
import { etatsLignePaliers } from '@/lib/v2/accueil/lignePaliers';
import { SOURCE_CONNU_KEY } from '@/lib/v2/onboarding/sourceConnu';

jest.mock('@/utils/telemetry', () => ({
  track: jest.fn(),
  setProprietes: jest.fn(),
  familleDeSport: () => 'muscu',
  trancheNombre: () => '1',
}));

const lire = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
const RESULTAT = 18;
const SOURCE = 22;
const SANTE = 9;
const PREMIUM = 19;

describe('Ou as-tu connu YOROI apres Ton plan', () => {
  it('ordre du Studio : Ton plan, Source, Sante, Premium a la fin', () => {
    expect(ORDRE_ONBOARDING.slice(-4)).toEqual([RESULTAT, SOURCE, SANTE, PREMIUM]);
    expect(positionEcran(SOURCE)).toBe(positionEcran(RESULTAT) + 1);
    expect(ecranSuivant(3)).toBe(4);
    expect(ecranPrecedent(4)).toBe(3);
    expect(ecranSuivant(RESULTAT)).toBe(SOURCE);
    expect(ecranSuivant(SOURCE)).toBe(SANTE);
    expect(compteurEcran(SOURCE)).toEqual({ position: 20, total: 22 });
  });

  it('app/onboarding.tsx suit le meme ordre, sans mode retour, et pose la reponse en quittant l ecran', () => {
    const src = lire('app/onboarding.tsx');
    expect(src).toContain('p === SOURCE ? RESULTAT + 0.25');
    expect(src).toContain('if (p === SOURCE) return RESULTAT;');
    expect(src).toContain('if (p === SANTE) return retour ? RESULTAT : SOURCE;');
    expect(src).toContain('if (p === UNIVERS) return AGE;');
    expect(src).toContain('onNext={() => goTo(UNIVERS)} />');
    expect(src).toContain('onNext={() => (retour ? (santeOff && santeJamais ? goTo(SANTE) : versPremium()) : goTo(SOURCE))}');
    // jamais d'ecriture en apercu ni en mode createur sans ecriture
    expect(src).toContain('if (!sansEcriture) void enregistrerSourceConnu(draftRef.current.source);');
    expect(src).toContain('if (!sansEcriture) void enregistrerSourceConnu(null);');
    // un ancien brouillon garde sur Source reprend a Ton univers
    expect(src).toContain('saved.page === SOURCE ? UNIVERS');
  });

  it('enregistrerSourceConnu pose la reponse, et la retire si l ecran est passe', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { enregistrerSourceConnu } = require('@/lib/v2/onboarding/save') as typeof import('@/lib/v2/onboarding/save');
    const ecrire = AsyncStorage.setItem as jest.Mock;
    const retirer = AsyncStorage.removeItem as jest.Mock;
    ecrire.mockClear();
    retirer.mockClear();
    await enregistrerSourceConnu('tiktok');
    expect(ecrire).toHaveBeenCalledWith(SOURCE_CONNU_KEY, 'tiktok');
    await enregistrerSourceConnu(null);
    expect(retirer).toHaveBeenCalledWith(SOURCE_CONNU_KEY);
  });
});

describe('Cap sans courbe', () => {
  it('plus de PlanCurve, le bloc est centre ; la date et les kilos restent', () => {
    const src = lire('components/yoroi/v2/onboarding/Cap.tsx');
    expect(src).not.toContain('<PlanCurve');
    expect(src).toContain('centrer');
    expect(src).toContain('Arrivée estimée');
    expect(src).toContain('gapText(start, target)');
  });
});

describe('Moment sans « combien de fois »', () => {
  it('le nombre suit les jours touches, seuls les jours sont gardes', () => {
    const src = lire('components/yoroi/v2/onboarding/Moment.tsx');
    expect(src).not.toContain('titre={traduire("Combien de fois');
    expect(src).not.toContain('choisirFrequence');
    expect(src).toContain('<JoursRonds');
    // l'enregistrement final lit toujours les jours de pesee
    expect(lire('lib/v2/onboarding/save.ts')).toContain('jours: d.peseeJours.map(lundiVersJs)');
    // Ton plan compte les pesees a partir des jours
    expect(lire('app/onboarding.tsx')).toContain('pesees={d.peseeJours.length}');
  });

  it('Rythme et Moment partagent le meme choix des jours, en ronds bleu nuit pleins', () => {
    expect(lire('components/yoroi/v2/onboarding/Rythme.tsx')).toContain('<JoursRonds');
    expect(lire('components/yoroi/v2/onboarding/Rythme.tsx')).not.toContain('<JoursPicker');
    expect(lire('components/yoroi/v2/onboarding/JoursRonds.tsx')).toContain("'#23358F'");
  });
});

describe('Ton plan : ta ligne et tes paliers', () => {
  it('82 a 77 kg : les paliers de l accueil, 80,8 / 79,5 / 78,3 puis ton cap', () => {
    const l = etatsLignePaliers(82, 77, 82, 0, false);
    expect(l.paliers.map((p) => p.kg)).toEqual([80.8, 79.5, 78.3, 77]);
    expect(l.paliers.map((p) => p.etat)).toEqual(['prochain', 'a_venir', 'a_venir', 'a_venir']);
  });

  it('le chemin utilise etatsLignePaliers et les couleurs des anneaux de Sante', () => {
    const src = lire('components/yoroi/v2/onboarding/CheminPaliers.tsx');
    expect(src).toContain('etatsLignePaliers(start, target, start, 0, false)');
    expect(src).toContain('couleurActivite');
    const res = lire('components/yoroi/v2/onboarding/Resultat.tsx');
    expect(res).toContain('<CheminPaliers');
    expect(res).toContain('paliersDuPlan(start, versChemin as number)');
  });
});
