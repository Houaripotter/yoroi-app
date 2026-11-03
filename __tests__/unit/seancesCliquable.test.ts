/**
 * 3 novembre 2026 : l'onglet Séances, cartes cliquables et chiffres.
 *  - lib/v2/seances/logosDuMois.ts : « Ton mois », le logo du club de chaque sport, jamais un logo de marque ;
 *  - lib/v2/seances/kilosSouleves.ts : les kilos en entier à côté des tonnes ;
 *  - les cartes du jour et de la semaine s'ouvrent d'un appui, l'historique garde les mêmes stickers partout,
 *    Ta semaine ne répète pas sa période.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { Training } from '@/lib/database';
import { logosParSport, sportsDuJour, sportsDuMois } from '@/lib/v2/seances/logosDuMois';
import { kilosEnEntier } from '@/lib/v2/seances/kilosSouleves';

const lire = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', f), 'utf8');
const t = (o: Partial<Training> & { date: string; sport: string }): Training => ({ ...o }) as Training;
const MARQUES = ['basic-fit', 'gracie-barra', 'first-jja'];
const valable = (l: string) => !MARQUES.includes(l);

const seances: Training[] = [
  t({ id: 1, date: '2026-11-03', sport: 'jjb', start_time: '19:00', club_logo: 'file:///Documents/club_logo_1.jpg' }),
  t({ id: 2, date: '2026-11-03', sport: 'running', start_time: '07:10', is_outdoor: true }),
  t({ id: 3, date: '2026-11-02', sport: 'musculation', club_logo: 'basic-fit' }),
  t({ id: 4, date: '2026-11-01', sport: 'jjb', club_logo: 'file:///Documents/club_logo_ancien.jpg' }),
  t({ id: 5, date: '2026-10-20', sport: 'boxe', club_logo: 'file:///Documents/club_logo_boxe.jpg' }),
  t({ id: 6, date: '2026-11-02', sport: 'jjb,musculation' }),
  t({ id: 7, date: '2026-10-05', sport: 'running', club_logo: 'file:///Documents/club_logo_course.jpg' }),
];

describe('Ton mois : le logo du club de chaque sport', () => {
  it('le logo le plus récent de chaque sport, même d’un mois passé', () => {
    const l = logosParSport(seances, valable);
    expect(l.get('jjb')).toBe('file:///Documents/club_logo_1.jpg');
    expect(l.get('running')).toBe('file:///Documents/club_logo_course.jpg');
    expect(l.get('boxe')).toBe('file:///Documents/club_logo_boxe.jpg');
  });

  it('jamais un logo de marque : le sticker du sport à la place', () => {
    const l = logosParSport(seances, valable);
    expect(l.has('musculation')).toBe(false);
    const mois = sportsDuMois(seances, 2026, 10, valable);
    expect(mois.find((x) => x.sport === 'musculation')?.logo).toBeNull();
  });

  it('les sports du mois, du plus pratiqué au moins pratiqué, sans ceux des autres mois', () => {
    const mois = sportsDuMois(seances, 2026, 10, valable);
    expect(mois.map((x) => [x.sport, x.nombre])).toEqual([['jjb', 3], ['running', 1], ['musculation', 1]]);
    expect(mois.find((x) => x.sport === 'running')?.dehors).toBe(true);
    expect(mois.some((x) => x.sport === 'boxe')).toBe(false);
  });

  it('sans logo nulle part : null partout, le sticker s’affiche', () => {
    const sans = seances.map((x) => ({ ...x, club_logo: undefined }));
    expect(sportsDuMois(sans, 2026, 10, valable).every((x) => x.logo === null)).toBe(true);
  });

  it('les sports d’un jour, sans doublon', () => {
    expect(sportsDuJour([seances[0], seances[3], seances[1]])).toEqual(['jjb', 'running']);
  });

  it('la carte lit la vraie règle des logos de marque', () => {
    const m = lire('components/yoroi/v2/seances/MoisPastilles.tsx');
    expect(m).toContain('const logoValable = (logo: string) => !estLogoDeMarque(logo);');
    expect(m).toContain('sportsDuMois(trainings, y, mo, logoValable)');
    expect(m).toContain('onError={() => setCasse(true)}');
  });
});

describe('Kilos soulevés : les kilos à côté des tonnes', () => {
  it('en tonnes, le total en kilos entiers', () => {
    expect(kilosEnEntier(12400)).toBe('12\u00A0400\u00A0kg');
    expect(kilosEnEntier(16000.4, 'kg')).toBe('16\u00A0000\u00A0kg');
  });
  it('rien sous la tonne ni en livres', () => {
    expect(kilosEnEntier(850)).toBeNull();
    expect(kilosEnEntier(0)).toBeNull();
    expect(kilosEnEntier(12400, 'lb')).toBeNull();
  });
  it('la tuile ne montre le complément que s’il tient, avec un point médian, jamais un tiret', () => {
    const w = lire('components/yoroi/v2/seances/WeekHero.tsx');
    expect(w).toContain('const tient = !!complement && place > 0 && besoin > 0 && besoin <= place;');
    expect(w).toContain('\\u00B7\\u00A0');
    expect(w).toContain('complement: kilosEnEntier(cur.tonnageKg, unite) ?? undefined');
  });
});

describe('Cartes cliquables, stickers, période', () => {
  it('la carte du jour s’ouvre vers la page de son lien', () => {
    const c = lire('components/yoroi/v2/seances/CarteDuJour.tsx');
    expect(c).toContain('<Cadre onPress={voirProgramme}>');
    expect(c).toContain('onLien={voirProgramme}');
    expect(c).toContain("<Cadre onPress={() => router.push('/planning' as any)}>");
    const e = lire('components/yoroi/v2/seances/EnTeteSeance.tsx');
    expect(e).toContain('onPress={() => { tap(); onVoir(); }}');
    expect(e).toContain('onPress={onProgramme ? () => { tap(); onProgramme(); } : undefined}');
  });
  it('la carte Cette semaine s’ouvre sur Ta semaine', () => {
    const s = lire('components/yoroi/v2/seances/SemaineAnneau.tsx');
    expect(s).toContain('onPress={onOuvrir ? () => { tap(); onOuvrir(); } : undefined}');
    expect(lire('app/(tabs)/seances.tsx')).toContain("onOuvrir={() => router.push('/ta-semaine' as any)}");
  });
  it('l’historique de l’onglet prend le sticker de Ton historique (chaussure, gi)', () => {
    const h = lire('components/yoroi/v2/seances/HistoryCard.tsx');
    expect(h).toContain('<CarreSticker nom={stickerDuSport(t.sport, !!t.is_outdoor)}');
    expect(h).not.toContain('<SportThumb');
    expect(lire('app/history.tsx')).toContain('stickerDuSport(t.sport, !!t.is_outdoor)');
  });
  it('Ta semaine dit sa période une seule fois', () => {
    const s = lire('app/ta-semaine.tsx');
    expect(s).not.toContain('sousTitre={periodeSemaine(vu)}');
    expect(s.match(/periodeSemaine\(vu\)/g)).toHaveLength(1);
  });
});
