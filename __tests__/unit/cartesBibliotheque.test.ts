/**
 * Bibliotheque des cartes (31 octobre 2026) : ton mois, ton annee, tes objectifs du moment, tes compteurs,
 * le rangement des exploits, les chiffres et les modeles proposes. Rien n'est invente : un total a 0 ne donne
 * aucun chiffre, une periode sans seance ne donne aucune carte.
 */
import fs from 'fs';
import path from 'path';
import type { Training } from '@/lib/database';
import { bornesPeriode, carteDuMoment, cartePeriode, compteursDuMoment, donneesPeriode, moisLong, objectifsDuMoment, periodePrecedente, rangerExploits, rubriqueDe } from '@/lib/v2/cartes/periode';
import { chiffresDisponibles } from '@/lib/v2/cartes/chiffres';
import { conversionPour, directionsPour, ecussonHolo } from '@/lib/v2/cartes/directions';
import { exploitVisible } from '@/lib/v2/cartes/exploits';
import { sourceDe } from '@/lib/v2/cartes/export';
import { bibliothequeDemo, DEMO_ANNEE, DEMO_EXPLOITS, DEMO_MOIS, DEMO_OBJECTIFS, demoExploit, demoPour } from '@/lib/v2/cartes/demo';
import { resumeCarte, rubriquesDe } from '@/components/yoroi/v2/cartes/Bibliotheque';

jest.mock('@/components/yoroi/v2/espace/reglages/prefs', () => ({ useUnitePoids: () => 'kg' }));
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

const lire = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');

let nextId = 1;
function s(date: string, extra: Partial<Training> = {}): Training {
  return { id: nextId++, sport: 'jjb', date, duration_minutes: 60, ...extra } as Training;
}
function jours(debut: string, n: number, pas = 1, extra: Partial<Training> = {}): Training[] {
  const [y, m, d] = debut.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(y, m - 1, d + i * pas, 12);
    return s(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`, extra);
  });
}
const cles = (l: { key: string }[]) => l.map((x) => x.key);

describe('bornes des periodes', () => {
  it('mois de 28 a 31 jours, annee entiere, periode d’avant', () => {
    expect(bornesPeriode('mois', '2026-02')).toEqual({ debut: '2026-02-01', fin: '2026-02-28' });
    expect(bornesPeriode('mois', '2024-02').fin).toBe('2024-02-29');
    expect(bornesPeriode('mois', '2026-10').fin).toBe('2026-10-31');
    expect(bornesPeriode('annee', '2026')).toEqual({ debut: '2026-01-01', fin: '2026-12-31' });
    expect(periodePrecedente('mois', '2026-01')).toBe('2025-12');
    expect(periodePrecedente('mois', '2026-10')).toBe('2026-09');
    expect(periodePrecedente('annee', '2026')).toBe('2025');
    expect(moisLong('2026-10')).toBe('Octobre 2026');
  });
});

describe('mon mois', () => {
  it('temps total, nombre de seances, jours actifs, repartition par sport', () => {
    const list = [
      s('2026-10-05', { sport: 'musculation', duration_minutes: 70 }),
      s('2026-10-05', { sport: 'jjb', duration_minutes: 90 }),
      s('2026-10-07', { sport: 'running', duration_minutes: 50, distance: 10 }),
      s('2026-10-09', { sport: 'jjb', duration_minutes: 90, rounds: 6 }),
      s('2026-09-30', { sport: 'jjb' }),
    ];
    const p = donneesPeriode(list, 'mois', '2026-10', { parSemaine: 0, aujourdhui: '2026-10-31' })!;
    expect(p.seances).toBe(4);
    expect(p.minutes).toBe(300);
    expect(p.joursActifs).toBe(3);
    expect(p.sports[0]).toEqual({ nom: expect.stringMatching(/jiu/i), n: 2 });
    expect(p.sports).toHaveLength(3);
    expect(p.distanceKm).toBe(10);
    expect(p.rounds).toBe(6);
    expect(p.precedent).toBe(1);
    expect(p.enCours).toBe(false);
    expect(p.semainesComptees).toBe(0);
  });

  it('les seances d’apres aujourd’hui et d’autres mois ne comptent pas ; mois sans seance : aucune carte', () => {
    const list = [s('2026-10-20'), s('2026-10-25'), s('2026-11-02')];
    expect(donneesPeriode(list, 'mois', '2026-10', { parSemaine: 0, aujourdhui: '2026-10-22' })!.seances).toBe(1);
    expect(donneesPeriode(list, 'mois', '2026-08', { parSemaine: 0, aujourdhui: '2026-10-22' })).toBeNull();
    expect(donneesPeriode(list, 'mois', '2026-12', { parSemaine: 0, aujourdhui: '2026-10-22' })).toBeNull();
  });

  it('semaines a l’objectif : la semaine en cours pas encore tenue ne compte pas', () => {
    // octobre 2026 : lundis 5, 12, 19, 26 ; 2 seances par semaine visees
    const list = [s('2026-10-05'), s('2026-10-06'), s('2026-10-12'), s('2026-10-19'), s('2026-10-20'), s('2026-10-26')];
    const p = donneesPeriode(list, 'mois', '2026-10', { parSemaine: 2, aujourdhui: '2026-10-27' })!;
    expect(p.semainesComptees).toBe(3);
    expect(p.semainesTenues).toBe(2);
    const fini = donneesPeriode([...list, s('2026-10-27')], 'mois', '2026-10', { parSemaine: 2, aujourdhui: '2026-10-27' })!;
    expect(fini.semainesComptees).toBe(4);
    expect(fini.semainesTenues).toBe(3);
  });

  it('la carte : titre, mois en clair, cle, chiffres dans l’ordre, aucun chiffre a 0', () => {
    const list = jours('2026-10-01', 10, 3, { sport: 'jjb', duration_minutes: 60 });
    const d = cartePeriode(list, 'mois', '2026-10', { parSemaine: 0, aujourdhui: '2026-10-31' })!;
    expect(d.moment).toBe('mois');
    expect(d.titre).toBe('Mon mois');
    expect(d.sousTitre).toBe('Octobre 2026');
    expect(d.cle).toBe('mois:2026-10');
    expect(d.famille).toBe('combat');
    const k = cles(chiffresDisponibles(d));
    expect(k.slice(0, 2)).toEqual(['seances', 'temps_total']);
    expect(k).not.toContain('distance');
    expect(k).not.toContain('charge');
    expect(k).not.toContain('objectif_periode');
    expect(k).not.toContain('sport_top');
    expect(chiffresDisponibles(d).find((x) => x.key === 'temps_total')!.value).toBe('10h');
  });
});

describe('mon annee', () => {
  it('objectif de l’annee : faites sur visees, rien sans rythme choisi', () => {
    const list = [s('2025-06-01'), ...jours('2026-01-05', 40, 2)];
    const d = cartePeriode(list, 'annee', '2026', { parSemaine: 4, aujourdhui: '2026-10-31' })!;
    expect(d.periode!.objectifAnnee).toMatchObject({ fait: 40, total: 208 });
    expect(d.sousTitre).toBe('2026, jusqu’ici');
    const obj = chiffresDisponibles(d).find((x) => x.key === 'objectif_periode')!;
    expect(obj.value).toBe('40');
    expect(obj.unit).toBe('/208');
    const sans = cartePeriode(list, 'annee', '2026', { parSemaine: 0, aujourdhui: '2026-10-31' })!;
    expect(sans.periode!.objectifAnnee).toBeNull();
    expect(cles(chiffresDisponibles(sans))).not.toContain('objectif_periode');
  });

  it('annee finie : pas « jusqu’ici », pas de repere de rythme', () => {
    const d = cartePeriode(jours('2025-01-06', 10, 7), 'annee', '2025', { parSemaine: 1, aujourdhui: '2026-10-31' })!;
    expect(d.sousTitre).toBe('2025');
    expect(d.periode!.enCours).toBe(false);
    expect(d.periode!.objectifAnnee!.attendu).toBeUndefined();
  });

  it('kilos souleves en musculation : chiffre en tonnes et retrospective en elephants', () => {
    const ex = [{ name: 'Squat', sets: 5, reps: 5, weight: 140 }];
    const list = jours('2026-01-05', 30, 7, { sport: 'musculation', exercises: ex as never });
    const d = cartePeriode(list, 'annee', '2026', { parSemaine: 0, aujourdhui: '2026-10-31' })!;
    expect(d.famille).toBe('muscu');
    expect(d.periode!.tonnage).toBe(30 * 5 * 5 * 140);
    expect(cles(chiffresDisponibles(d))[2]).toBe('charge');
    const cv = conversionPour(d)!;
    expect(cv.libelle).toMatch(/éléphant/);
    expect(directionsPour(d).map((x) => x.id)).toContain('retro');
  });

  it('modeles proposes : jamais le face a face ni la retransmission ; ecusson = seances', () => {
    expect(directionsPour(DEMO_MOIS).map((x) => x.id)).not.toContain('gala');
    expect(directionsPour(DEMO_ANNEE).map((x) => x.id)).not.toContain('tv');
    expect(directionsPour(DEMO_ANNEE).map((x) => x.id)).toEqual(expect.arrayContaining(['net', 'chrome', 'stickers', 'holo', 'serie', 'maillot']));
    expect(ecussonHolo(DEMO_ANNEE)).toEqual({ valeur: '186', label: 'SÉANCES' });
    const sansSerie = { ...DEMO_MOIS, serieSemaines: 1 };
    expect(directionsPour(sansSerie).map((x) => x.id)).not.toContain('serie');
  });
});

describe('objectifs du moment', () => {
  it('la semaine des la premiere seance, encore n seances, objectif tenu', () => {
    const list = [s('2026-10-26'), s('2026-10-28')];
    const e = objectifsDuMoment(list, { parSemaine: 4, aujourdhui: '2026-10-29' });
    const sem = e.find((x) => x.type === 'semaine_objectif')!;
    expect(sem.hero.value).toBe('2/4');
    expect(sem.accroche).toBe('Encore 2 séances cette semaine');
    const tenu = objectifsDuMoment([...list, s('2026-10-29'), s('2026-10-29')], { parSemaine: 4, aujourdhui: '2026-10-29' }).find((x) => x.type === 'semaine_objectif')!;
    expect(tenu.hero.value).toBe('4/4');
    expect(tenu.accroche).toBe('Toutes mes séances prévues sont faites');
  });

  it('aucune seance cette semaine ou aucun rythme : pas de carte de semaine', () => {
    expect(objectifsDuMoment([s('2026-10-20')], { parSemaine: 4, aujourdhui: '2026-10-29' }).some((x) => x.type === 'semaine_objectif')).toBe(false);
    expect(objectifsDuMoment([s('2026-10-28')], { parSemaine: 0, aujourdhui: '2026-10-29' })).toEqual([]);
  });

  it('l’annee : seances faites sur seances visees, pourcentage et seances a faire', () => {
    const list = [s('2025-06-01'), ...jours('2026-01-05', 100, 2)];
    const an = objectifsDuMoment(list, { parSemaine: 4, aujourdhui: '2026-10-29' }).find((x) => x.type === 'annee_progression')!;
    expect(an.hero).toEqual({ value: '100', unit: 'sur 208' });
    expect(an.cotes).toEqual([{ label: 'de l’objectif', value: '48', unit: '%' }, { label: 'séances à faire', value: '108' }]);
  });

  it('le poids : part du chemin, masquage sans poids absolu, rien sans objectif ou sans progres', () => {
    const e = objectifsDuMoment([], { parSemaine: 0, aujourdhui: '2026-10-29', poids: { poids: 84.6, depart: 91.2, objectif: 80 } });
    const p = e.find((x) => x.type === 'chemin_poids')!;
    expect(p.hero).toEqual({ value: '59', unit: '%' });
    expect(p.cotes!.map((c) => c.value)).toEqual(['−6,6', '4,6', '84,6']);
    const m = exploitVisible(p, 'ecart');
    expect(m.hero.value).toBe('59');
    expect(m.detail).toBeUndefined();
    expect(m.cotes!.some((c) => c.value === '84,6')).toBe(false);
    const pct = exploitVisible(p, 'pourcentage');
    expect(pct.cotes!.some((c) => c.unit === 'kg')).toBe(false);
    expect(objectifsDuMoment([], { parSemaine: 0, aujourdhui: '2026-10-29', poids: { poids: 91.4, depart: 91.2, objectif: 80 } })).toEqual([]);
    expect(objectifsDuMoment([], { parSemaine: 0, aujourdhui: '2026-10-29', poids: { poids: 84.6, depart: 91.2, objectif: null } })).toEqual([]);
  });

  it('carte du moment : ouverte dans l’atelier par sa cle, avec les modeles qui ont du sens', () => {
    const e = objectifsDuMoment([s('2026-10-28')], { parSemaine: 3, aujourdhui: '2026-10-29' })[0];
    const d = carteDuMoment(e, 'objectif');
    expect(d.cle).toBe('objectif:semaine_objectif');
    expect(d.source).toEqual({ type: 'objectif', ref: '2026-10-29' });
    expect(directionsPour(d).map((x) => x.id)).toEqual(['stickers', 'chrome', 'net', 'holo', 'maillot']);
  });
});

describe('compteurs', () => {
  it('seances depuis le debut, heures, km, tonnes et rounds de l’annee ; rien a 0', () => {
    const list = [
      s('2025-03-10', { sport: 'jjb', duration_minutes: 90, rounds: 5 }),
      s('2026-02-01', { sport: 'running', duration_minutes: 50, distance: 12.5 }),
      s('2026-03-01', { sport: 'jjb', duration_minutes: 90, rounds: 7 }),
    ];
    const c = compteursDuMoment(list, '2026-10-31');
    expect(c.map((x) => x.type)).toEqual(['cumul_seances', 'cumul_heures', 'cumul_km', 'cumul_rounds']);
    expect(c[0].hero).toEqual({ value: '3', unit: 'séances' });
    expect(c[0].accroche).toBe('depuis mars 2025');
    expect(c[1].hero.value).toBe('2,3');
    expect(c[2].hero).toEqual({ value: '12,5', unit: 'km' });
    expect(c[3].hero).toEqual({ value: '7', unit: 'rounds' });
    expect(compteursDuMoment([], '2026-10-31')).toEqual([]);
  });
});

describe('rangement et liens', () => {
  it('chaque exploit dans sa rubrique, les bilans laisses a Mon mois et Mon annee', () => {
    expect(rubriqueDe(DEMO_EXPLOITS[0].exploit!)).toBe('records');
    expect(rubriqueDe({ ...DEMO_EXPLOITS[0].exploit!, type: 'techniques' })).toBe('records');
    expect(rubriqueDe({ ...DEMO_EXPLOITS[0].exploit!, type: 'serie_semaines' })).toBe('objectifs');
    expect(rubriqueDe({ ...DEMO_EXPLOITS[0].exploit!, type: 'palier_total' })).toBe('compteurs');
    expect(rubriqueDe({ ...DEMO_EXPLOITS[0].exploit!, type: 'plus_bas' })).toBe('poids');
    expect(rubriqueDe({ ...DEMO_EXPLOITS[0].exploit!, type: 'bilan_mois' })).toBeNull();
    const r = rangerExploits(DEMO_EXPLOITS);
    expect(r.records.length).toBe(5);
  });

  it('mois et annee : lien vers l’atelier sans donnee personnelle, source de mesure', () => {
    const feuille = lire('components/yoroi/v2/cartes/FeuilleCarte.tsx');
    expect(feuille).toContain('/carte?moment=${d.moment}&ref=${encodeURIComponent(d.periode.ref)}');
    expect(lire('app/bilan-periode.tsx')).toContain('/carte?moment=mois&ref=${periode.debut.slice(0, 7)}');
    expect(lire('app/bilan-periode.tsx')).not.toContain("'/social-share/monthly-recap-v2'");
    expect(sourceDe('mois')).toBe('recap_mois');
    expect(sourceDe('annee')).toBe('compteur_annee');
    expect(sourceDe('exploit', 'chemin_poids')).toBe('carte_pesee');
  });

  it('demo : la bibliotheque est pleine, chaque rubrique a des cartes ; demoPour et demoExploit retrouvent tout', () => {
    const rub = rubriquesDe(bibliothequeDemo(), null);
    // 3 novembre 2026 (refonte de Mes cartes) : ce qu'on partage le plus d'abord, semaine et mois en bas
    expect(rub.map((r) => r.id)).toEqual(['pesees', 'records', 'compteurs', 'course', 'seances', 'objectifs', 'annee', 'semaine', 'mois']);
    for (const r of rub) expect(r.cartes.length).toBeGreaterThan(0);
    expect(demoPour('mois').moment).toBe('mois');
    expect(demoPour('annee').moment).toBe('annee');
    expect(demoExploit('chemin_poids', 'objectif:chemin_poids')).toBe(DEMO_OBJECTIFS[2]);
  });

  it('resume sous la vignette : les vrais chiffres', () => {
    expect(resumeCarte(DEMO_MOIS)).toBe('19 séances, 23h30, 3 sports');
    expect(resumeCarte(DEMO_OBJECTIFS[0])).toBe('3/4, Encore 1 séance cette semaine');
    expect(resumeCarte(DEMO_OBJECTIFS[2], 'ecart')).toBe('du chemin vers mon objectif');
  });
});
