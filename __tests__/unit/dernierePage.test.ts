/**
 * Revenir sur ta derniere page (2 novembre 2026) : l'app fermee completement se rouvre ou tu etais,
 * moins de 2 heures apres, jamais sur un ecran passager, jamais avec ta photo, jamais sur une donnee effacee.
 * Logique : lib/v2/nav/dernierePage.ts ; branchement : lib/v2/nav/RouvrirDernierePage.tsx.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CLE_DERNIERE_PAGE,
  DELAI_ECRITURE_MS,
  DUREE_DETAILS_MS,
  DUREE_MAX_MS,
  creerMemoire,
  decider,
  estExclu,
  hrefDe,
  lire,
  nettoyerParams,
  pageDe,
  poserDetailsRestaures,
  prendreDetailRestaure,
  serialiser,
  verifierDonnees,
  type DernierePage,
  type Verifs,
} from '@/lib/v2/nav/dernierePage';
import { CLES_ANCIENNES_PAR_ELEMENT, CLES_ELEMENTS, SPEC_PAR_CLE } from '@/lib/v2/synchro/cles';

const racine = join(__dirname, '..', '..');
const source = (f: string) => readFileSync(join(racine, f), 'utf8');

const T0 = 1_762_000_000_000;

function stockage() {
  const m = new Map<string, string>();
  return { m, setItem: jest.fn(async (k: string, v: string) => void m.set(k, v)) };
}

const tout: Verifs = {
  seance: async () => true,
  carte: async () => true,
  programme: async () => true,
  competition: async () => true,
  combat: async () => true,
  pesee: async () => true,
};

describe('memoriser et rouvrir une page', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('la carte de partage est gardee puis rouverte, au-dessus de l accueil', () => {
    const s = stockage();
    const mem = creerMemoire(s);
    mem.activer();
    mem.noter(pageDe('/carte', { moment: 'seance', id: '42' }, ['carte'], T0));
    jest.advanceTimersByTime(DELAI_ECRITURE_MS);
    const lu = lire(s.m.get(CLE_DERNIERE_PAGE));
    expect(lu).toMatchObject({ chemin: '/carte', params: { moment: 'seance', id: '42' }, at: T0 });
    const d = decider(lu, T0 + 10 * 60 * 1000);
    expect(d).toEqual({ rouvrir: true, href: '/carte?moment=seance&id=42', onglet: false });
  });

  it('ecriture regroupee : plusieurs ecrans rapides, une seule ecriture, la derniere page', () => {
    const s = stockage();
    const mem = creerMemoire(s);
    mem.activer();
    mem.noter(pageDe('/progres', {}, ['(tabs)', 'progres'], T0));
    mem.noter(pageDe('/programmes/ppl', { id: 'ppl' }, ['programmes', '[id]'], T0 + 50));
    mem.noter(pageDe('/settings', {}, ['settings'], T0 + 100));
    expect(s.setItem).not.toHaveBeenCalled();
    jest.advanceTimersByTime(DELAI_ECRITURE_MS);
    expect(s.setItem).toHaveBeenCalledTimes(1);
    expect(lire(s.m.get(CLE_DERNIERE_PAGE))?.chemin).toBe('/settings');
  });

  it('rien n est ecrit avant la relecture de la page d avant (l accueil ne l ecrase pas)', () => {
    const s = stockage();
    const mem = creerMemoire(s);
    mem.noter(pageDe('/', {}, ['(tabs)'], T0));
    jest.advanceTimersByTime(DELAI_ECRITURE_MS * 3);
    mem.vider(T0 + 5);
    expect(s.setItem).not.toHaveBeenCalled();
  });

  it('en arriere-plan, l heure gardee est celle ou tu quittes l app', () => {
    const s = stockage();
    const mem = creerMemoire(s);
    mem.activer();
    mem.noter(pageDe('/progres', {}, ['(tabs)', 'progres'], T0));
    mem.vider(T0 + 3 * 60 * 60 * 1000);
    expect(lire(s.m.get(CLE_DERNIERE_PAGE))?.at).toBe(T0 + 3 * 60 * 60 * 1000);
  });

  it('le chemin d un programme garde son id dans le chemin, sans le repeter', () => {
    const p = pageDe('/programmes/ppl', { id: 'ppl' }, ['programmes', '[id]'], T0);
    expect(p.params).toEqual({});
    expect(hrefDe(p)).toBe('/programmes/ppl');
  });

  it('un onglet se rouvre en changeant d onglet (le retour ramene a l accueil)', () => {
    const d = decider(pageDe('/(tabs)/progres', {}, ['(tabs)', 'progres'], T0), T0 + 1000);
    expect(d).toEqual({ rouvrir: true, href: '/progres', onglet: true });
  });

  it('l accueil et une valeur abimee ne rouvrent rien', () => {
    expect(decider(pageDe('/', {}, ['(tabs)'], T0), T0 + 1)).toMatchObject({ rouvrir: false, raison: 'accueil' });
    expect(lire('{pas du json')).toBeNull();
    expect(lire(JSON.stringify({ v: 2, chemin: '/carte', at: T0 }))).toBeNull();
    expect(decider(null, T0)).toMatchObject({ rouvrir: false });
  });

  it('les details donnes par la page (onglet, fiche) reviennent dans l adresse', () => {
    const s = stockage();
    const mem = creerMemoire(s);
    mem.activer();
    // les effets de l ecran passent avant ceux du layout : les details arrivent avant la page
    mem.noterDetails('/programmes/ppl', { fiche: 'Développé couché' }, T0);
    mem.noter(pageDe('/programmes/ppl', { id: 'ppl' }, ['programmes', '[id]'], T0));
    jest.advanceTimersByTime(DELAI_ECRITURE_MS);
    const lu = lire(s.m.get(CLE_DERNIERE_PAGE))!;
    expect(lu.details).toEqual({ fiche: 'Développé couché' });
    expect(hrefDe(lu)).toBe('/programmes/ppl?fiche=D%C3%A9velopp%C3%A9%20couch%C3%A9');
  });

  it('la fiche d exercice se rouvre une seule fois, et pas apres quelques secondes', () => {
    poserDetailsRestaures({ fiche: 'Squat' }, T0);
    expect(prendreDetailRestaure('fiche', 'Tractions', T0 + 10)).toBe(false);
    expect(prendreDetailRestaure('fiche', 'Squat', T0 + 10)).toBe(true);
    expect(prendreDetailRestaure('fiche', 'Squat', T0 + 20)).toBe(false);
    poserDetailsRestaures({ fiche: 'Squat' }, T0);
    expect(prendreDetailRestaure('fiche', 'Squat', T0 + DUREE_DETAILS_MS + 1)).toBe(false);
  });
});

describe('expiration apres 2 heures', () => {
  const p = pageDe('/carte', { moment: 'seance', id: '7' }, ['carte'], T0);
  it('juste avant 2 heures : rouverte', () => {
    expect(decider(p, T0 + DUREE_MAX_MS - 1).rouvrir).toBe(true);
  });
  it('a 2 heures et au-dela : l accueil', () => {
    expect(decider(p, T0 + DUREE_MAX_MS)).toMatchObject({ rouvrir: false, raison: 'ancienne' });
    expect(decider(p, T0 + 26 * 60 * 60 * 1000)).toMatchObject({ rouvrir: false, raison: 'ancienne' });
  });
  it('une heure dans le futur (horloge changee, autre telephone) : l accueil', () => {
    expect(decider(p, T0 - 60 * 1000)).toMatchObject({ rouvrir: false, raison: 'heure' });
  });
  it('2 heures pile', () => {
    expect(DUREE_MAX_MS).toBe(2 * 60 * 60 * 1000);
  });
});

describe('ecrans jamais rouverts', () => {
  const exclus = [
    '/onboarding', '/onboarding-tour', '/nouveautes', '/paywall',
    '/ajouter', '/pesee', '/add-training', '/quick-nutrition', '/wrapped', '/mes-seances/modifier',
    '/+not-found', '/w/chrono',
    '/sync-devices', '/sync-history',
    '/corbeille', '/privacy-data', '/backup-history', '/settings/copies-securite',
    '/seance', '/seance/muscu', '/seance/combat', '/seance/cardio', '/seance/sprints', '/seance/fin', '/timer',
    '/studio/etats', '/studio/fenetres',
  ];
  it.each(exclus)('%s', (c) => {
    expect(estExclu(c)).toBe(true);
    expect(decider(pageDe(c, {}, [], T0), T0 + 1000)).toMatchObject({ rouvrir: false, raison: 'exclue' });
  });

  it('la carte Avant apres (photos du coffre) et un apercu ne se rouvrent pas', () => {
    expect(estExclu('/carte', { moment: 'avant_apres', avant: '1', apres: '2' })).toBe(true);
    expect(estExclu('/onboarding', { preview: '1' })).toBe(true);
    expect(estExclu('/settings', { preview: '1' })).toBe(true);
  });

  it('les ecrans importants se rouvrent', () => {
    for (const c of ['/carte', '/mes-cartes', '/progres', '/seances', '/programmes', '/programmes/ppl', '/settings', '/settings/affichage', '/workout-detail', '/force-detail'])
      expect(estExclu(c, { moment: 'seance' })).toBe(false);
  });
});

describe('une donnee disparue renvoie a l accueil', () => {
  const page = (chemin: string, params: Record<string, string>): DernierePage => ({ v: 1, chemin, params, at: T0 });

  it('carte d une seance effacee', async () => {
    const carte = jest.fn(async () => false);
    expect(await verifierDonnees(page('/carte', { moment: 'seance', id: '42' }), { ...tout, carte })).toBe(false);
    expect(carte).toHaveBeenCalledWith({ moment: 'seance', id: '42' });
  });

  it('seance supprimee (detail de seance)', async () => {
    const seance = jest.fn(async (id: number) => id !== 42);
    expect(await verifierDonnees(page('/workout-detail', { id: '42' }), { ...tout, seance })).toBe(false);
    expect(await verifierDonnees(page('/workout-detail', { id: '43' }), { ...tout, seance })).toBe(true);
    expect(await verifierDonnees(page('/workout-detail', { id: 'abc' }), { ...tout, seance })).toBe(false);
  });

  it('programme, competition, combat et pesee effaces', async () => {
    const non = async () => false;
    expect(await verifierDonnees(page('/programmes/perso-123', {}), { ...tout, programme: non })).toBe(false);
    expect(await verifierDonnees(page('/competition-detail', { id: '3' }), { ...tout, competition: non })).toBe(false);
    expect(await verifierDonnees(page('/combat-detail', { id: '3' }), { ...tout, combat: non })).toBe(false);
    expect(await verifierDonnees(page('/pesee-detail', { id: '3' }), { ...tout, pesee: non })).toBe(false);
  });

  it('une lecture en erreur compte comme absente, sans plantage', async () => {
    const boum = async () => {
      throw new Error('base fermee');
    };
    await expect(verifierDonnees(page('/carte', { moment: 'seance', id: '1' }), { ...tout, carte: boum })).resolves.toBe(false);
  });

  it('une page avec un id qu on ne sait pas verifier n est pas rouverte', async () => {
    expect(await verifierDonnees(page('/coach-construire', { id: '9' }), tout)).toBe(false);
    expect(await verifierDonnees(page('/progres', {}), tout)).toBe(true);
    expect(await verifierDonnees(page('/settings/affichage', {}), tout)).toBe(true);
  });

  it('les pages de conseils et de zones des programmes ne sont pas prises pour un programme', async () => {
    const programme = jest.fn(async () => false);
    expect(await verifierDonnees(page('/programmes/zones', {}), { ...tout, programme })).toBe(true);
    expect(programme).not.toHaveBeenCalled();
  });
});

describe('la carte rouverte sans photo', () => {
  it('aucun chemin de photo n est garde, meme passe en parametre', () => {
    const p = nettoyerParams({
      moment: 'seance',
      id: '42',
      photo: 'file:///var/mobile/Containers/Data/Application/X/Library/Caches/cartes_tmp/abc.jpg',
      photo2: 'https://exemple.fr/p.jpg',
      fond: 'file:///tmp/a.jpg',
      image: 'ph://ABC-123',
      autre: '/var/mobile/x.png',
      cache: 'cartes_tmp/abc.jpg',
    });
    expect(p).toEqual({ moment: 'seance', id: '42' });
    const brut = serialiser(pageDe('/carte', { moment: 'seance', id: '42', photo: 'file:///x/cartes_tmp/a.jpg' }, ['carte'], T0));
    expect(brut).not.toMatch(/file:|cartes_tmp|\.jpg/);
  });

  it('seulement « il y avait une photo », pour proposer Ajouter ta photo', () => {
    jest.useFakeTimers();
    const s = stockage();
    const mem = creerMemoire(s);
    mem.activer();
    mem.noter(pageDe('/carte', { moment: 'seance', id: '42' }, ['carte'], T0));
    mem.noterDetails('/carte', { onglet: 'modele', chiffres: 'duree,volume,series', avaitPhoto: '1', photo: 'file:///x.jpg' }, T0 + 1);
    jest.advanceTimersByTime(DELAI_ECRITURE_MS);
    jest.useRealTimers();
    const lu = lire(s.m.get(CLE_DERNIERE_PAGE))!;
    expect(lu.details).toEqual({ onglet: 'modele', chiffres: 'duree,volume,series', avaitPhoto: '1' });
    expect(hrefDe(lu)).toBe('/carte?moment=seance&id=42&onglet=modele&chiffres=duree%2Cvolume%2Cseries&avaitPhoto=1');
  });

  it('avaitPhoto ne reste pas colle a l adresse : seule la carte le redonne', () => {
    const p = pageDe('/carte', { moment: 'seance', id: '42', avaitPhoto: '1', fiche: 'x' }, ['carte'], T0);
    expect(p.params).toEqual({ moment: 'seance', id: '42' });
  });

  it('l effacement des copies de la photo n est pas contourne', () => {
    for (const f of ['lib/v2/nav/dernierePage.ts', 'lib/v2/nav/RouvrirDernierePage.tsx']) {
      const src = source(f);
      expect(src).not.toMatch(/from '@\/lib\/v2\/cartes\/tmp'/);
      expect(src).not.toMatch(/k\.photo\b(?!\s*\?)/);
    }
    // la carte ne donne qu un drapeau, jamais l adresse de la photo
    const carte = source('app/carte.tsx');
    expect(carte).toContain("avaitPhoto: k.photo ? '1' : ''");
    expect(carte).toContain("traduire('Ajouter ta photo')");
    // la sortie de la carte efface toujours la copie (useCarte)
    expect(source('components/yoroi/v2/cartes/useCarte.ts')).toMatch(/return \(\) => \{\s*void effacerCopieCarte\(photoTmp\.current\)/);
  });
});

describe('la cle n est pas synchronisee', () => {
  it('ni dans les cles synchronisees par element, ni dans l ancienne synchro', () => {
    expect(CLE_DERNIERE_PAGE).toBe('yoroi_derniere_page_v1');
    expect(CLES_ELEMENTS.some((s) => s.cle === CLE_DERNIERE_PAGE)).toBe(false);
    expect(SPEC_PAR_CLE.has(CLE_DERNIERE_PAGE)).toBe(false);
    expect(CLES_ANCIENNES_PAR_ELEMENT.has(CLE_DERNIERE_PAGE)).toBe(false);
    for (const f of ['lib/v2/synchro/cles.ts', 'lib/peerSyncService.ts', 'lib/v2/synchro/auto.ts']) expect(source(f)).not.toContain('derniere_page');
  });
});

describe('branchement', () => {
  it('monte une fois dans le layout racine, apres les notifications', () => {
    const l = source('app/_layout.tsx');
    expect(l.match(/<RouvrirDernierePage \/>/g)).toHaveLength(1);
    expect(l.indexOf('<RouvrirDernierePage />')).toBeGreaterThan(l.indexOf('<OuvertureNotifications />'));
  });

  it('une fois par lancement, apres l accueil, le verrou et la base ; notification et widget passent avant', () => {
    const src = source('lib/v2/nav/RouvrirDernierePage.tsx');
    expect(src).toMatch(/let decide = false/);
    expect(src).toMatch(/premier !== '\(tabs\)' \|\| !estAccueil\(pathname\)/);
    expect(src).toContain('attendreVerrou');
    expect(src).toContain('initDatabase');
    expect(src).toContain('cibleEnAttente()');
    expect(src).toContain('lienEnAttente()');
    // la seance en direct garde sa reprise : rien ici ne la rouvre
    expect(src).not.toContain('repriseSeance');
  });
});
