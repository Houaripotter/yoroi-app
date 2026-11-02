/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : la zone protegee de ta photo (lib/v2/cartes/moteur/protection.ts).
 * Les 15 photos de test des maquettes (_propositions/cartes_v10_2026-11-02/html/tests/photos.js : boites YuNet et MediaPipe)
 * doivent donner exactement les placements valides en v10 (cartes/controle.json) : visages, corps entier, regle des 60 %,
 * zone de secours, photo reduite, et jamais de texte a moins de 48 px de la zone protegee.
 */
import { AIR_VISAGE, GRILLE, hauteurBloc, hauteurPhoto } from '@/lib/v2/cartes/moteur/grille';
import { blocRespecteZone, corpsProtege, placer, zoneDesVisages, zoneProtegeePhoto, zoneSure } from '@/lib/v2/cartes/moteur/protection';
import type { PhotoMesuree } from '@/lib/v2/cartes/moteur/protection';
import { ANALYSE_VIDE, analyserPhoto, APLUS_ACTIF, photoMesuree } from '@/lib/v2/cartes/moteur/analysePhoto';
import { ZONE_VISAGE } from '@/lib/v2/cartes/zoneVisage';

type Meta = { w: number; h: number; det: number[][]; corps: number[] | null; frontal: boolean };
const PHOTOS: Record<string, Meta> = {
  selfie_miroir: { w: 1080, h: 1935, det: [[467, 521, 191, 232]], corps: [168, 470, 946, 1935], frontal: true },
  portrait_profil: { w: 1080, h: 1472, det: [[371, 590, 143, 157], [795, 1032, 116, 159]], corps: [0, 543, 1034, 1472], frontal: true },
  salle: { w: 1080, h: 1935, det: [], corps: null, frontal: false },
  sombre: { w: 1080, h: 1935, det: [[440, 538, 226, 226]], corps: [167, 439, 946, 1935], frontal: false },
  lumineuse: { w: 1080, h: 1935, det: [[441, 538, 226, 226]], corps: [168, 456, 945, 1935], frontal: true },
  visage_haut: { w: 1080, h: 1505, det: [[484, 89, 170, 193]], corps: [168, 35, 945, 1505], frontal: true },
  visage_bas: { w: 1080, h: 1000, det: [[460, 530, 202, 240]], corps: [216, 443, 873, 1000], frontal: true },
  plan_large: { w: 1080, h: 1935, det: [], corps: [452, 375, 603, 679], frontal: false },
  gros_plan: { w: 1080, h: 1774, det: [[375, 264, 364, 552]], corps: [0, 111, 1080, 1774], frontal: true },
  horizontale: { w: 1080, h: 608, det: [[563, 140, 48, 62], [706, 312, 75, 75]], corps: [263, 115, 844, 503], frontal: true },
  sans_visage: { w: 1080, h: 1935, det: [], corps: [0, 480, 983, 1935], frontal: false },
  jjb_full: { w: 1080, h: 1935, det: [[564, 833, 52, 64], [703, 999, 86, 86]], corps: [373, 790, 844, 1181], frontal: true },
  course_rue: { w: 1080, h: 1935, det: [[465, 684, 88, 88], [496, 726, 78, 78]], corps: [452, 667, 665, 1463], frontal: false },
  record_salle: { w: 1080, h: 1935, det: [], corps: null, frontal: false },
  annee_piste: { w: 1080, h: 1935, det: [], corps: [452, 375, 603, 678], frontal: false },
};
const photo = (k: string): PhotoMesuree => {
  const m = PHOTOS[k];
  return { w: m.w, h: m.h, visages: m.det.map((d) => [d[0], d[1], d[2], d[3]] as [number, number, number, number]), corps: m.corps ? [m.corps[0], m.corps[1], m.corps[2], m.corps[3]] : null, frontal: m.frontal };
};

// cartes/controle.json de la v10, carte A : [source, compact, reduite, reduite et remontee]
type Attendu = { source: 'visage' | 'corps' | 'tete_de_dos' | 'zone_sure'; compact: boolean; etape?: 'photo_reduite' | 'photo_reduite_remontee' };
const V10: Record<string, { story: Attendu; post: Attendu }> = {
  selfie_miroir: { story: { source: 'visage', compact: false }, post: { source: 'visage', compact: false } },
  portrait_profil: { story: { source: 'visage', compact: false, etape: 'photo_reduite' }, post: { source: 'visage', compact: true, etape: 'photo_reduite' } },
  salle: { story: { source: 'zone_sure', compact: false }, post: { source: 'zone_sure', compact: false } },
  sombre: { story: { source: 'visage', compact: false }, post: { source: 'visage', compact: false } },
  lumineuse: { story: { source: 'visage', compact: false }, post: { source: 'visage', compact: false } },
  visage_haut: { story: { source: 'visage', compact: false }, post: { source: 'visage', compact: false } },
  visage_bas: { story: { source: 'visage', compact: false, etape: 'photo_reduite' }, post: { source: 'visage', compact: false, etape: 'photo_reduite' } },
  plan_large: { story: { source: 'corps', compact: false }, post: { source: 'corps', compact: false } },
  gros_plan: { story: { source: 'visage', compact: false }, post: { source: 'visage', compact: false, etape: 'photo_reduite' } },
  // 2 novembre 2026 (studio unique) : la bande plus basse laisse 84 px de photo en plus en story ; la photo horizontale
  // reste alors en plein cadre, le bloc compact sous les visages (avant : photo reduite sur fond floute)
  // 2 novembre 2026 (bloc deplacable) : la bande collee en bas et plus fine (story 136 px, 4:5 104 px) laisse encore
  // 80 px de photo en story et 20 px en 4:5 ; le bloc garde alors sa taille normale la ou il etait compact avant
  // (salle, sans visage, record en 4:5 ; gros plan en story), toujours a 48 px au moins de la zone protegee
  horizontale: { story: { source: 'visage', compact: true }, post: { source: 'visage', compact: false, etape: 'photo_reduite' } },
  sans_visage: { story: { source: 'zone_sure', compact: false }, post: { source: 'zone_sure', compact: false } },
  jjb_full: { story: { source: 'visage', compact: false }, post: { source: 'visage', compact: false } },
  course_rue: { story: { source: 'tete_de_dos', compact: false, etape: 'photo_reduite' }, post: { source: 'tete_de_dos', compact: true, etape: 'photo_reduite_remontee' } },
  record_salle: { story: { source: 'zone_sure', compact: false }, post: { source: 'zone_sure', compact: false } },
  annee_piste: { story: { source: 'corps', compact: false }, post: { source: 'corps', compact: false } },
};

describe('carte A : les 15 photos de test donnent les placements valides en v10', () => {
  for (const k of Object.keys(V10)) {
    for (const f of ['story', 'post'] as const) {
      test(`${k}, ${f}`, () => {
        const p = placer(photo(k), f, { regle: 'A' });
        const a = V10[k][f];
        expect(p.source).toBe(a.source);
        expect(p.compact).toBe(a.compact);
        expect(p.mode).toBe('bas');
        if (a.etape) expect(p.etapes).toContain(a.etape);
        else expect(p.etapes.filter((e) => e.startsWith('photo_reduite'))).toEqual([]);
        // jamais de texte a moins de 48 px de la zone protegee (visage, corps ou zone de secours)
        expect(blocRespecteZone(p, f)).toBe(true);
        // le bloc reste au-dessus de la bande, avec son air
        expect(p.top + hauteurBloc(f, p.compact)).toBeLessThanOrEqual(hauteurPhoto(f) - GRILLE[f].AIR_BANDE + 0.5);
      });
    }
  }
});

describe('visages, corps entier, regle des 60 %, secours', () => {
  test('les visages sont agrandis : cheveux, menton, main et telephone', () => {
    const z = zoneDesVisages(photo('selfie_miroir'))!;
    expect(z.x0).toBeCloseTo(467 - 0.45 * 191, 3);
    expect(z.y0).toBeCloseTo(521 - 0.55 * 232, 3);
    expect(z.x1).toBeCloseTo(467 + 1.45 * 191, 3);
    expect(z.y1).toBeCloseTo(521 + 1.6 * 232, 3);
  });
  test('plusieurs visages : une seule zone qui les contient tous', () => {
    const z = zoneDesVisages(photo('portrait_profil'))!;
    expect(z.x0).toBeLessThanOrEqual(371);
    expect(z.x1).toBeGreaterThanOrEqual(795 + 116);
    expect(z.y1).toBeGreaterThanOrEqual(1032 + 159);
  });
  test('de dos (visage non confirme de face) : tout le corps est protege', () => {
    const r = zoneProtegeePhoto(photo('course_rue'), 'A');
    expect(r.source).toBe('tete_de_dos');
    expect(r.zone!.y1).toBeGreaterThanOrEqual(1463);
  });
  test('sans visage, silhouette petite : corps entier protege', () => {
    expect(zoneProtegeePhoto(photo('plan_large'), 'A').source).toBe('corps');
  });
  test('regle des 60 % : une silhouette plus haute que 60 % de la photo ne peut pas etre epargnee', () => {
    // photo sombre : visage non confirme de face, silhouette 77 % de la hauteur : on garde le visage seul
    expect(corpsProtege(photo('sombre'), 'A')).toBe(false);
    expect(zoneProtegeePhoto(photo('sombre'), 'A').source).toBe('visage');
    // mains sans visage, silhouette trop haute : zone centrale elargie
    expect(zoneProtegeePhoto(photo('sans_visage'), 'A').source).toBe('zone_sure');
  });
  test('familles : la course protege toujours le corps, sans regle des 60 %', () => {
    expect(corpsProtege(photo('selfie_miroir'), 'famille', true)).toBe(true);
    expect(corpsProtege(photo('selfie_miroir'), 'famille', false)).toBe(false);
    expect(corpsProtege(photo('sans_visage'), 'famille', false)).toBe(true);
  });
  test('secours sans module photo : la reponse vide, puis la zone sure de zoneVisage.ts ou la zone centrale elargie', async () => {
    const a = await analyserPhoto('file:///photo.jpg');
    expect(a).toEqual(ANALYSE_VIDE);
    expect(a.visages).toEqual([]);
    expect(a.masque).toBeNull();
    const m = photoMesuree(a, 1080, 1935);
    expect(m.visages).toEqual([]);
    expect(m.corps).toBeNull();
    const pA = placer(m, 'story', { regle: 'A' });
    expect(pA.source).toBe('zone_sure');
    expect(pA.zone).toEqual(zoneSure('story', 'A'));
    expect(pA.zone.x0).toBeCloseTo(108);
    expect(pA.zone.x1).toBeCloseTo(972);
    const pF = placer(m, 'post', { regle: 'famille' });
    expect(pF.zone.x0).toBeCloseTo(1080 * ZONE_VISAGE.gauche);
    expect(pF.zone.y1).toBeCloseTo(hauteurPhoto('post') * ZONE_VISAGE.bas);
    expect(pF.zone.y1 + AIR_VISAGE).toBeLessThanOrEqual(pF.top);
  });
  test('A+ est desactive', () => {
    expect(APLUS_ACTIF).toBe(false);
  });
  test('le recadrage au doigt passe avant la regle : la photo ne bouge plus, seul le bloc cherche sa place', () => {
    const auto = placer(photo('course_rue'), 'story', { regle: 'A' });
    const p = placer(photo('course_rue'), 'story', { regle: 'A', recadrage: { zoom: 1.4, dx: 0, dy: -200 } });
    expect(p.etapes).toContain('recadree');
    expect(p.flou).toBe(false);
    expect(p.s).toBeGreaterThan(auto.s);
    // sans recadrage, la regle avait reduit la photo
    expect(auto.flou).toBe(true);
  });
});
