/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : la mise en page des 10 familles, en story et en 4:5
 * (lib/v2/cartes/moteur/miseEnPage.ts), et le choix des familles et des compositions (familles.ts).
 * Tout reste dans les marges, au-dessus de la bande, et le dessin ne passe jamais sous le bloc.
 */
import { compositionEffective, compositionsPour, contenuDe, famillesPour } from '@/lib/v2/cartes/moteur/familles';
import type { FamilleMoteur } from '@/lib/v2/cartes/moteur/familles';
import { GRILLE, hauteurPhoto, largeurTexte, tailleQuiTient, formatMoteur } from '@/lib/v2/cartes/moteur/grille';
import { mettreEnPage, rectsDuPlan } from '@/lib/v2/cartes/moteur/miseEnPage';
import type { CompositionId } from '@/lib/v2/cartes/types';
import { DIX_FAMILLES, FAM_COURSE, FAM_MUSCU, FAM_RECORD, FAM_SEMAINE, FAM_TRANSFO } from '../fixtures/cartesMoteurDonnees';

const PHOTO = { w: 1080, h: 1935, visages: [[467, 521, 191, 232]] as [number, number, number, number][], corps: [168, 470, 946, 1935] as [number, number, number, number], frontal: true };

describe('les 10 familles, story et 4:5, sans et avec photo', () => {
  for (const x of DIX_FAMILLES) {
    for (const format of ['story', 'post'] as const) {
      const c = contenuDe(x.d, x.famille as FamilleMoteur)!;
      const compos = compositionsPour(x.d, x.famille as FamilleMoteur).filter((k) => k !== 'Aplus');
      for (const compo of compos as CompositionId[]) {
        test(`${x.nom}, ${format}, composition ${compo}`, () => {
          expect(c).not.toBeNull();
          const G = GRILLE[format];
          const RH = hauteurPhoto(format);
          const plan = mettreEnPage({ contenu: c, compo, format, photo: compo === 'A' && x.famille !== 'transfo' ? PHOTO : null });
          expect(plan.W).toBe(1080);
          expect(plan.H).toBe(format === 'story' ? 1920 : 1350);
          expect(plan.pastille.x).toBe(G.M);
          expect(plan.pastille.y).toBe(G.HAUT);
          expect(plan.bande.y).toBe(RH);
          for (const r of rectsDuPlan(plan)) {
            // dans les marges
            expect(r.x).toBeGreaterThanOrEqual(G.M - 16 - 0.5);
            expect(r.x + r.w).toBeLessThanOrEqual(G.W - G.M + 0.5);
            // au-dessus de la bande, avec son air
            expect(r.y + r.h).toBeLessThanOrEqual(RH - G.AIR_BANDE + 0.5);
            expect(r.y).toBeGreaterThanOrEqual(G.HAUT - 0.5);
          }
          // le dessin ne passe jamais sous le bloc
          if (plan.visuel && plan.bloc && plan.type !== 'dessin45') expect(plan.visuel.y + plan.visuel.h).toBeLessThanOrEqual(plan.bloc.y + 0.5);
          if (plan.type === 'photo') {
            expect(plan.photo).not.toBeNull();
            expect(plan.photo!.force).toBeGreaterThan(0.5);
          }
          // la composition attendue des maquettes
          if (format === 'post' && compo === 'B' && ['record', 'serie', 'transfo', 'muscles', 'semaine', 'annee'].includes(x.famille)) expect(plan.type).toBe('special45');
          if (format === 'post' && compo === 'B' && ['course', 'jjb', 'marche'].includes(x.famille)) expect(plan.type).toBe('dessin45');
          if (x.famille === 'muscu' && compo === 'B') expect(plan.type).toBe('typo');
          if (x.famille === 'muscu' && compo === 'C') expect(plan.type).toBe('donnees');
          if (x.famille === 'transfo' && compo === 'A') expect(plan.type).toBe('duo');
        });
      }
    }
  }
});

describe('familles et compositions', () => {
  test('chaque carte des maquettes trouve sa famille', () => {
    expect(famillesPour(FAM_MUSCU)).toEqual(['muscu', 'muscles']);
    expect(famillesPour(FAM_COURSE)).toEqual(['course']);
    expect(famillesPour(FAM_RECORD)).toEqual(['record']);
    expect(famillesPour(FAM_SEMAINE)).toEqual(['semaine', 'serie']);
    expect(famillesPour(FAM_TRANSFO)).toEqual(['transfo']);
    // pesee et mois : l'ancien moteur les garde
    expect(famillesPour({ moment: 'pesee', titre: '', sousTitre: '', cle: 'p' })).toEqual([]);
    expect(famillesPour(null)).toEqual([]);
  });
  test('A+ n est jamais propose ; C seulement pour la musculation avec ses series', () => {
    for (const x of DIX_FAMILLES) {
      const l = compositionsPour(x.d, x.famille as FamilleMoteur);
      expect(l).not.toContain('Aplus');
      if (x.famille !== 'muscu') expect(l).not.toContain('C');
    }
    expect(compositionsPour(FAM_MUSCU, 'muscu')).toEqual(['A', 'B', 'C']);
    expect(compositionEffective(FAM_MUSCU, 'muscu', 'Aplus', true)).toBe('B');
    expect(compositionEffective(FAM_MUSCU, 'muscu', 'A', false)).toBe('B');
    expect(compositionEffective(FAM_MUSCU, 'muscu', 'A', true)).toBe('A');
  });
  test('les chiffres des maquettes', () => {
    const m = contenuDe(FAM_MUSCU, 'muscu')!;
    expect(m.hero).toEqual({ v: '12,5', u: 't' });
    expect(m.stats.map((s) => s.l)).toEqual(['Séries', 'Durée']);
    expect(contenuDe(FAM_COURSE, 'course')!.hero).toEqual({ v: '10,4', u: 'km' });
    expect(contenuDe(FAM_COURSE, 'course')!.stats.map((s) => s.v)).toEqual(['52', "5'00"]);
    const r = contenuDe(FAM_RECORD, 'record')!;
    expect(r.duel!.map((d) => d.v)).toEqual(['95', '100', '+5']);
    const t = contenuDe(FAM_TRANSFO, 'transfo')!;
    expect(t.hero).toEqual({ v: '−13,1', u: 'kg' });
    expect(t.poids).toEqual({ avant: '88,1', apres: '75', unite: 'kg' });
  });
  test('masquage du poids : aucun poids absolu sur l avant apres', () => {
    expect(contenuDe(FAM_TRANSFO, 'transfo', 'kg', 'ecart')!.poids).toBeNull();
    expect(contenuDe(FAM_TRANSFO, 'transfo', 'kg', 'pourcentage')!.hero.u).toBe('%');
  });
  test('kcal : seulement celles de la seance (deja filtrees par kcalPourCarte), 0 les cache', () => {
    expect(contenuDe(FAM_COURSE, 'course')!.stats.some((s) => s.ic === 'kcal')).toBe(false);
    const avec = { ...FAM_COURSE, seance: { ...FAM_COURSE.seance!, calories: 640 } };
    const k = contenuDe(avec, 'course')!.stats.find((s) => s.ic === 'kcal');
    expect(k).toEqual({ ic: 'kcal', v: '640', u: 'kcal', l: 'Kcal mesurées' });
    for (const x of DIX_FAMILLES) if (x.famille !== 'course') expect(contenuDe(x.d, x.famille as FamilleMoteur)!.stats.some((s) => s.ic === 'kcal')).toBe(false);
  });
  test('le carre s ouvre en 4:5 ; la mesure du texte tient dans la largeur', () => {
    expect(formatMoteur('carre')).toBe('post');
    expect(formatMoteur('story')).toBe('story');
    const t = tailleQuiTient('12,5', 'anton', 952, 700);
    expect(largeurTexte('12,5', 'anton', t)).toBeLessThanOrEqual(952);
    expect(t).toBeLessThan(700);
  });
});
