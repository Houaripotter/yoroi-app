/**
 * Refonte de Mes cartes (3 novembre 2026), Houari : « mets d'abord ce que les gens veulent partager ».
 * L'ordre des rubriques, les cartes d'exemple des rubriques vides (toujours marquees, jamais melangees aux tiennes,
 * jamais exportees), le parcours de course d'exemple (un dessin, jamais un GPS) et son libelle.
 */
import fs from 'fs';
import path from 'path';
import { rubriquesDe } from '@/components/yoroi/v2/cartes/Bibliotheque';
import { BIBLIOTHEQUE_VIDE } from '@/lib/v2/cartes/bibliotheque';
import { bibliothequeDemo, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU } from '@/lib/v2/cartes/demo';
import { carteAvantApresExemple } from '@/lib/v2/cartes/exemples';
import { cartesOuExemples, enExemple, estCarteCourse, exemplesRubrique, lienExemple } from '@/lib/v2/cartes/exemplesRubriques';
import type { RubriqueExemple } from '@/lib/v2/cartes/exemplesRubriques';
import { contenuDe } from '@/lib/v2/cartes/moteur/familles';

jest.mock('@/components/yoroi/v2/espace/reglages/prefs', () => ({ useUnitePoids: () => 'kg' }));
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

const lire = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const AA = carteAvantApresExemple({ avant: 'a', apres: 'b' });
const TOUTES: RubriqueExemple[] = ['records', 'compteurs', 'course', 'seances', 'objectifs', 'annee', 'semaine', 'mois'];

describe('l’ordre de Mes cartes', () => {
  test('avant apres en tete et en grand, puis records, compteurs, course ; semaine et mois en bas', () => {
    const rub = rubriquesDe(bibliothequeDemo(), AA);
    expect(rub.map((r) => r.id)).toEqual(['pesees', 'records', 'compteurs', 'course', 'seances', 'objectifs', 'annee', 'semaine', 'mois']);
    expect(rub[0].grand).toBe(true);
    expect(rub[0].cartes[0]).toBe(AA);
    expect(rub.filter((r) => r.grand)).toHaveLength(1);
  });
  test('tes courses vont dans Course, plus dans Dernieres seances', () => {
    const rub = rubriquesDe(bibliothequeDemo(), null);
    const course = rub.find((r) => r.id === 'course')!;
    const seances = rub.find((r) => r.id === 'seances')!;
    expect(course.cartes).toEqual([DEMO_SEANCE_COURSE]);
    expect(course.exemples).toBe(false);
    expect(seances.cartes.some(estCarteCourse)).toBe(false);
    expect(seances.cartes).toContain(DEMO_SEANCE_MUSCU);
  });
});

describe('les cartes d’exemple des rubriques vides', () => {
  test('sans aucune carte : chaque rubrique montre des exemples, tous marques, cle « exemple: »', () => {
    const rub = rubriquesDe(BIBLIOTHEQUE_VIDE, AA);
    for (const r of rub) {
      expect(r.cartes.length).toBeGreaterThan(0);
      expect(r.exemples).toBe(true);
      for (const d of r.cartes) {
        expect(d.exemple).toBe(true);
        if (r.id !== 'pesees') expect(d.cle.startsWith('exemple:')).toBe(true);
      }
    }
  });
  test('des que tu as une carte, plus aucun exemple dans la rubrique (jamais melanges)', () => {
    const avec = cartesOuExemples('seances', [DEMO_SEANCE_MUSCU]);
    expect(avec).toEqual({ cartes: [DEMO_SEANCE_MUSCU], exemples: false });
    const rub = rubriquesDe(bibliothequeDemo(), null);
    for (const r of rub) {
      expect(r.exemples).toBe(false);
      expect(r.cartes.some((d) => d.exemple)).toBe(false);
    }
  });
  test('un exemple ne change jamais la carte de demonstration d’origine', () => {
    const e = enExemple(DEMO_SEANCE_MUSCU);
    expect(e).not.toBe(DEMO_SEANCE_MUSCU);
    expect(DEMO_SEANCE_MUSCU.exemple).toBeUndefined();
    for (const id of TOUTES) for (const d of exemplesRubrique(id)) expect(d.exemple).toBe(true);
  });
  test('le toucher d’un exemple n’ouvre jamais le studio sur l’exemple (rien d’exemple ne s’exporte)', () => {
    for (const id of TOUTES) {
      for (const d of exemplesRubrique(id)) {
        const l = lienExemple(d);
        expect(l).not.toMatch(/demo=|id=|exemple=|ref=|cle=/);
      }
    }
    expect(lienExemple(AA)).toBe('/carte?moment=avant_apres');
    const ecran = lire('app/mes-cartes.tsx');
    expect(ecran).toContain('if (d.exemple) router.push(lienExemple(d) as never);');
  });
});

describe('le parcours de course d’exemple', () => {
  test('la course d’exemple a un parcours dessine, marque exemple, jamais un GPS', () => {
    const [course] = exemplesRubrique('course');
    expect(course.famille).toBe('course');
    expect(course.seance?.trace?.points.length).toBeGreaterThan(10);
    // un dessin ramene entre 0 et 1, pas des coordonnees
    for (const [x, y] of course.seance!.trace!.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
    expect(contenuDe(course, 'course')?.traceExemple).toBe(true);
    expect(contenuDe(DEMO_SEANCE_COURSE, 'course')?.traceExemple).toBe(false);
  });
  test('le libelle du parcours d’exemple ne dit pas « GPS de ta montre »', () => {
    const moteur = lire('components/yoroi/v2/cartes/moteur/CarteMoteur.tsx');
    expect(moteur).toContain("c.traceExemple ? traduire('Parcours d’exemple') : traduire('Tracé GPS de ta montre')");
  });
});
