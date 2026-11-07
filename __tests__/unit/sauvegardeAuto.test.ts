/**
 * Sauvegarde 100 % automatique, etape 1 JS (7 novembre 2026) : _propositions/sauvegarde_auto_2026-11-05/PLAN.md.
 * Photos jamais dans le cloud, « protege » seulement apres une vraie copie, declencheurs regroupes (2 minutes),
 * 7 versions au nom du telephone, restauration qui saute une copie abimee, ligne d'etat des Reglages, rappels.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { optionsExport, copieCloudPermise } from '@/lib/v2/sauvegarde/regleCopieCloud';
import { etatProtection, rappelsMasques, derniereReussite, type InfosProtection } from '@/lib/v2/sauvegarde/copieAuto';
import { montrerCarteAccueil, montrerFinSeance, type ContexteCopie } from '@/lib/v2/sauvegarde/momentCopie';
import { delaiAvantEcriture, peutEcrireMaintenant, INTERVALLE_MIN_MS } from '@/lib/v2/sauvegarde/declencheurs';
import { nomCopieICloud, nomDerniereICloud, estCopieAuto, ordreRestauration, COPIES_ICLOUD } from '@/lib/v2/sauvegarde/coffreICloud';
import { choisirSauvegardeValide, empreinteOk, avecDelai } from '@/lib/v2/sauvegarde/retrouver';
import { ligneEtatSauvegarde, ilYa } from '@/lib/v2/sauvegarde/ligneEtat';
import { nouvelId, idValide } from '@/lib/v2/sauvegarde/appareil';
import { isStorageKeySkipped } from '@/lib/v2/sauvegarde/fusion';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const H = 3600000;
const J = 24 * H;
const now = new Date('2026-11-07T12:00:00').getTime();
const base: InfosProtection = { dispo: true, connecte: false, dossier: null, succes: 0, echec: 0, manuel: 0 };
const racine = path.resolve(__dirname, '../..');
const lire = (f: string) => fs.readFileSync(path.join(racine, f), 'utf8');

describe('1. les photos ne quittent jamais le telephone', () => {
  it('une sauvegarde silencieuse se fait sans les photos par defaut', () => {
    expect(optionsExport({ silent: true })).toEqual({ silent: true, includePhotos: false });
  });
  it('un export lance a la main garde les photos, comme avant', () => {
    expect(optionsExport()).toEqual({ silent: false, includePhotos: true });
    expect(optionsExport({ includePhotos: false })).toEqual({ silent: false, includePhotos: false });
  });
  it('aucun fichier avec photos ne part dans le cloud (coffre iCloud ou dossier relie)', () => {
    expect(copieCloudPermise({ silent: false, includePhotos: true })).toBe(false);
    expect(copieCloudPermise({ silent: true, includePhotos: true })).toBe(false);
    expect(copieCloudPermise({ silent: true, includePhotos: false, counts: { weights: 3, trainings: 0 } })).toBe(true);
  });
  it('une copie automatique vide ne part jamais dans le cloud (elle ecraserait celle d avant une reinstallation)', () => {
    expect(copieCloudPermise({ silent: true, includePhotos: false, counts: { weights: 0, trainings: 0 } })).toBe(false);
  });
  it('exportService passe par la regle, et les copies automatiques demandent includePhotos:false', () => {
    const exp = lire('lib/exportService.ts');
    expect(exp).toMatch(/optionsExport\(options\)/);
    expect(exp).toMatch(/copieCloudPermise\(\{ silent, includePhotos, counts \}\)/);
    expect(exp).toMatch(/if \(versLeCloud\) try \{/);
    expect(exp).toMatch(/if \(versLeCloud && silent && Platform\.OS === 'ios'/);
    expect(lire('lib/autoBackupService.ts')).toMatch(/exportDataToJSON\(\{ silent: true, includePhotos: false \}\)/);
    // nulle part une sauvegarde silencieuse avec les photos
    for (const f of ['lib/autoBackupService.ts', 'lib/safetyBackupService.ts', 'lib/v2/sauvegarde/copieAuto.ts', 'lib/v2/sauvegarde/declencheurs.ts']) {
      expect(lire(f)).not.toMatch(/silent: true, includePhotos: true/);
    }
  });
});

describe('2. « protege » seulement avec une vraie copie de moins de 48 heures', () => {
  it('iCloud disponible mais aucune copie jamais passee : pas protege', () => {
    expect(etatProtection({ ...base, icloud: true }, now)).not.toBe('protege');
    expect(etatProtection({ ...base, icloud: true }, now)).toBe('en_attente');
  });
  it('iCloud disponible, essais rates depuis plus de 3 jours : en panne (la seule alerte)', () => {
    expect(etatProtection({ ...base, icloud: true, premierEssaiICloud: now - 4 * J, echecICloud: now - H }, now)).toBe('en_panne');
    expect(etatProtection({ ...base, icloud: true, premierEssaiICloud: now - 2 * J }, now)).toBe('en_attente');
  });
  it('copie iCloud reussie il y a moins de 48 h : protege ; 48 h a 3 jours : en attente ; plus : en panne', () => {
    expect(etatProtection({ ...base, icloud: true, succesICloud: now - 47 * H }, now)).toBe('protege');
    expect(etatProtection({ ...base, icloud: true, succesICloud: now - 49 * H }, now)).toBe('en_attente');
    expect(etatProtection({ ...base, icloud: true, succesICloud: now - 73 * H }, now)).toBe('en_panne');
  });
  it('dossier relie (Android) : meme regle sur la derniere copie reussie', () => {
    expect(etatProtection({ ...base, connecte: true }, now)).toBe('en_attente');
    expect(etatProtection({ ...base, connecte: true, succes: now - 10 * 60000 }, now)).toBe('protege');
    expect(etatProtection({ ...base, connecte: true, succes: now - 60 * H }, now)).toBe('en_attente');
    expect(etatProtection({ ...base, connecte: true, succes: now - 4 * J }, now)).toBe('en_panne');
    expect(etatProtection({ ...base }, now)).toBe('a_activer');
    expect(etatProtection({ ...base, dispo: false }, now)).toBe('non_dispo');
  });
  it('derniere reussite : la plus recente entre iCloud et le dossier relie', () => {
    expect(derniereReussite({ ...base, connecte: true, succes: now - J, succesICloud: now - 2 * J })).toBe(now - J);
    expect(derniereReussite({ ...base, succes: now - J })).toBe(0);
  });
});

describe('3. declencheurs : au plus une ecriture toutes les 2 minutes', () => {
  it('regroupement apres une saisie, et jamais avant 2 minutes apres la derniere ecriture', () => {
    expect(delaiAvantEcriture(now, 0)).toBe(20000);
    expect(delaiAvantEcriture(now, now - 30000)).toBe(INTERVALLE_MIN_MS - 30000);
    expect(delaiAvantEcriture(now, now - 10 * 60000)).toBe(20000);
    expect(peutEcrireMaintenant(now, now - 60000)).toBe(false);
    expect(peutEcrireMaintenant(now, now - INTERVALLE_MIN_MS)).toBe(true);
  });

  describe('plusieurs pesees a la suite : une seule copie', () => {
    let appels: string[];
    let derniere = 0;
    beforeEach(() => {
      jest.resetModules();
      jest.useFakeTimers();
      appels = [];
      derniere = 0;
      // le test tourne comme sur un iPhone (Platform.OS du telephone)
      Object.defineProperty(require('react-native').Platform, 'OS', { get: () => 'ios', configurable: true });
      jest.doMock('@/lib/autoBackupService', () => ({
        derniereEcritureSilencieuse: () => derniere,
        executerCopieSilencieuse: async (r: string) => {
          appels.push(r);
          derniere = Date.now();
          return true;
        },
      }));
    });
    afterEach(() => jest.useRealTimers());

    it('trois pesees en quelques secondes donnent une ecriture, puis une autre seulement 2 minutes apres', async () => {
      const d = require('@/lib/v2/sauvegarde/declencheurs');
      d.demanderCopie('pesee');
      d.demanderCopie('pesee');
      d.demanderCopie('pesee');
      await jest.advanceTimersByTimeAsync(25000);
      expect(appels).toEqual(['pesee']);
      d.demanderCopie('seance');
      await jest.advanceTimersByTimeAsync(30000);
      expect(appels.length).toBe(1);
      await jest.advanceTimersByTimeAsync(INTERVALLE_MIN_MS);
      expect(appels).toEqual(['pesee', 'seance']);
      expect(d._etatDeclencheurs().sale).toBe(false);
    });

    it('fin de seance : la promesse attend la copie', async () => {
      const d = require('@/lib/v2/sauvegarde/declencheurs');
      const p = d.demanderCopie('seance', { attendre: true });
      await jest.advanceTimersByTimeAsync(21000);
      await expect(p).resolves.toBe(true);
    });

    it('en quittant l app : copie seulement si une donnee a change', async () => {
      const d = require('@/lib/v2/sauvegarde/declencheurs');
      await d.auPassageArrierePlan();
      expect(appels).toEqual([]);
      d.marquerChangement();
      await d.auPassageArrierePlan();
      expect(appels).toEqual(['arriere_plan']);
    });
  });

  it('les declencheurs sont branches : pesee, seance, arriere plan, ouverture', () => {
    expect(lire('lib/v2/pesee/save.ts')).toMatch(/demanderCopie\('pesee'\)/);
    expect(lire('lib/v2/seance/save.ts')).toMatch(/demanderCopie\('seance'\)/);
    expect(lire('lib/autoBackupService.ts')).toMatch(/installerDeclencheurs\(\)/);
    expect(lire('lib/v2/sauvegarde/declencheurs.ts')).toMatch(/next === 'background'/);
  });
});

describe('4. versions dans iCloud', () => {
  it('7 noms a tour de role, avec l identifiant du telephone, plus « derniere »', () => {
    expect(COPIES_ICLOUD).toBe(7);
    const noms = new Set(Array.from({ length: 14 }, (_, k) => nomCopieICloud(now + k * J, 'ab3k9z')));
    expect(noms.size).toBe(7);
    for (const n of noms) expect(n).toMatch(/^yoroi_backup_auto_ab3k9z_[1-7]\.json$/);
    expect(nomDerniereICloud('ab3k9z')).toBe('yoroi_backup_auto_ab3k9z_derniere.json');
    // iPhone et iPad : jamais le meme fichier
    expect(nomCopieICloud(now, 'iphone1')).not.toBe(nomCopieICloud(now, 'ipad22'));
  });
  it('les anciens noms restent reconnus pour remettre une sauvegarde', () => {
    for (const n of ['yoroi_backup_auto_1.json', 'yoroi_backup_auto_3.json', 'yoroi_backup_auto_ab3k9z_7.json', 'yoroi_backup_auto_ab3k9z_derniere.json']) expect(estCopieAuto(n)).toBe(true);
    expect(estCopieAuto('yoroi_backup_2026-11-04_14h05.json')).toBe(false);
    const l = ordreRestauration([
      { name: 'yoroi_backup_auto_2.json', size: 1, modifiedAt: now - 3 * J, telecharge: true },
      { name: 'yoroi_backup_auto_x1_3.json', size: 1, modifiedAt: now - J, telecharge: true },
      { name: 'yoroi_backup_auto_x1_derniere.json', size: 1, modifiedAt: now - J, telecharge: true },
      { name: 'autre.txt', size: 1, modifiedAt: now, telecharge: true },
    ]);
    expect(l.map((x) => x.name)).toEqual(['yoroi_backup_auto_x1_derniere.json', 'yoroi_backup_auto_x1_3.json', 'yoroi_backup_auto_2.json']);
  });
  it('identifiant du telephone : court, propre, et jamais dans une sauvegarde', () => {
    let k = 0;
    const id = nouvelId(() => ((k++ * 7) % 31) / 31);
    expect(idValide(id)).toBe(true);
    expect(id).toHaveLength(6);
    expect(idValide('../x')).toBe(false);
    for (const cle of ['@yoroi_cloud_sync_appareil', '@yoroi_cloud_sync_icloud_echec', '@yoroi_cloud_sync_icloud_premier_essai', '@yoroi_last_icloud_success']) {
      expect(isStorageKeySkipped(cle)).toBe(true);
    }
  });
});

describe('5. remettre la sauvegarde au premier lancement', () => {
  const sha = async (s: string) => createHash('sha256').update(s).digest('hex');
  const sauvegarde = async (poids: number[]) => {
    const data = { version: '6.0', weights: poids.map((w) => ({ weight: w })), trainings: [] };
    return JSON.stringify({ ...data, integrity: { algorithm: 'SHA-256', checksum: await sha(JSON.stringify(data)) } }, null, 2);
  };

  it('empreinte juste : entiere ; fichier coupe ou modifie : abimee', async () => {
    const ok = await sauvegarde([80, 79]);
    expect(await empreinteOk(ok, sha)).toBe(true);
    expect(await empreinteOk(ok.slice(0, ok.length - 20), sha)).toBe(false);
    expect(await empreinteOk(ok.replace('79', '12'), sha)).toBe(false);
    expect(await empreinteOk(JSON.stringify({ yoroi_encrypted: '2.0', data: 'x' }), sha)).toBe(true);
  });

  it('la plus recente est abimee : on prend celle d avant', async () => {
    const fichiers: Record<string, string> = {
      'yoroi_backup_auto_a1_derniere.json': (await sauvegarde([80])).replace('80', '81'),
      'yoroi_backup_auto_a1_2.json': await sauvegarde([80]),
    };
    const liste = [
      { name: 'yoroi_backup_auto_a1_derniere.json', size: 1, modifiedAt: now, telecharge: true },
      { name: 'yoroi_backup_auto_a1_2.json', size: 1, modifiedAt: now - J, telecharge: true },
    ];
    const t = await choisirSauvegardeValide(liste, async (n) => n, async (c) => empreinteOk(fichiers[c], sha));
    expect(t?.nom).toBe('yoroi_backup_auto_a1_2.json');
    expect(t?.modifiedAt).toBe(now - J);
  });

  it('rien d entier : rien a proposer ; iCloud lent : on n attend pas', async () => {
    const liste = [{ name: 'yoroi_backup_auto_1.json', size: 1, modifiedAt: now, telecharge: false }];
    expect(await choisirSauvegardeValide(liste, async () => null, async () => true)).toBeNull();
    jest.useFakeTimers();
    const lent = avecDelai(new Promise(() => undefined), 3000);
    jest.advanceTimersByTime(3001);
    await expect(lent).resolves.toBeNull();
    jest.useRealTimers();
  });

  it('l onboarding propose la sauvegarde sans bloquer l ecran', () => {
    const o = lire('app/onboarding.tsx');
    expect(o).toMatch(/chercherSauvegardeICloud\(\)/);
    expect(o).toMatch(/telephoneVide\(\)/);
    const offre = lire('components/yoroi/v2/onboarding/OffreRetrouver.tsx');
    expect(offre).toMatch(/Retrouver tes données du \{0\} \?/);
    expect(offre).toMatch(/Commencer à zéro/);
  });
});

describe('6. ligne d etat dans les Reglages', () => {
  it('vert : derniere sauvegarde iCloud il y a X min', () => {
    const l = ligneEtatSauvegarde({ ...base, icloud: true, succesICloud: now - 12 * 60000 }, 'ios', now);
    expect(l).toEqual({ ton: 'vert', texte: 'Dernière sauvegarde iCloud : il y a 12 min\u00a0✓', bouton: false });
  });
  it('rouge : plus de 48 heures, ou la derniere a rate, avec le bouton', () => {
    const vieux = ligneEtatSauvegarde({ ...base, icloud: true, succesICloud: new Date('2026-11-04T09:00:00').getTime() }, 'ios', now);
    expect(vieux.ton).toBe('rouge');
    expect(vieux.texte).toBe('La sauvegarde n’a pas marché depuis le 4 novembre');
    expect(vieux.bouton).toBe(true);
    const rate = ligneEtatSauvegarde({ ...base, icloud: true, succesICloud: now - H, echecICloud: now - 60000 }, 'ios', now);
    expect(rate.ton).toBe('rouge');
  });
  it('iCloud indisponible : dit simplement', () => {
    const l = ligneEtatSauvegarde({ ...base, icloud: false }, 'ios', now);
    expect(l.ton).toBe('gris');
    expect(l.texte).toMatch(/iCloud n’est pas disponible/);
  });
  it('Android : la meme ligne sur la derniere copie du dossier relie', () => {
    expect(ligneEtatSauvegarde({ ...base, connecte: true, succes: now - 3 * H }, 'android', now).texte).toBe('Dernière sauvegarde Google Drive : il y a 3 h\u00a0✓');
    expect(ligneEtatSauvegarde({ ...base }, 'android', now).ton).toBe('gris');
  });
  it('« il y a » lisible, et aucun tiret dans les textes', () => {
    expect(ilYa(now - 20000, now)).toBe('à l’instant');
    expect(ilYa(now - 2 * J, now)).toBe('il y a 2 jours');
    for (const i of [{ ...base, icloud: true }, { ...base, icloud: true, succesICloud: now - 5 * J }, { ...base, icloud: true, succesICloud: now - H }]) {
      expect(ligneEtatSauvegarde(i, 'ios', now).texte).not.toMatch(/[—–]/);
    }
  });
});

describe('7. rappels : muets quand la copie automatique marche, une seule alerte apres 3 jours', () => {
  const ctx: ContexteCopie = {
    etat: 'protege', joursDepuisCopie: null, heuresDepuisInstallation: 100, visiteFaite: true, visiteEnCours: false,
    coachEnAttente: false, aDesDonnees: true, plusTardLe: null, autreCarteLe: null, aujourdhui: '2026-11-07', now,
  };
  it('protege ou en attente : aucune carte sur l accueil', () => {
    expect(rappelsMasques('protege')).toBe(true);
    expect(rappelsMasques('en_attente')).toBe(true);
    expect(montrerCarteAccueil(ctx)).toBe(false);
    expect(montrerCarteAccueil({ ...ctx, etat: 'en_attente' })).toBe(false);
  });
  it('3 jours sans copie : la carte revient', () => {
    expect(montrerCarteAccueil({ ...ctx, etat: 'en_panne' })).toBe(true);
  });
  it('fin de seance : la copie part en silence', () => {
    expect(montrerFinSeance({ ...ctx, etat: 'en_attente' })).toBe(true);
  });
  it('les autres rappels sont coupes, pas effaces', () => {
    expect(lire('lib/backupReminderService.ts')).toMatch(/rappelsMasques/);
    expect(lire('lib/v2/sauvegarde/rappel.ts')).toMatch(/rappelsMasques\(etat\)/);
    expect(lire('components/yoroi/v2/dojo/AbriDojo.tsx')).toMatch(/if \(e !== 'a_activer'\) return setEtat\(null\)/);
  });
});
