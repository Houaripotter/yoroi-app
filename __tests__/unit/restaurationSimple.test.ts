/**
 * Retrouver une sauvegarde sans fouiller les dossiers (7 novembre 2026) : lib/v2/sauvegarde/listeSauvegardes.ts et
 * lib/v2/sauvegarde/restaurerListe.ts. Tri et libelles des lignes, copies abimees grisees, copie de securite avant
 * la restauration, et une restauration ratee qui ne touche pas aux donnees actuelles.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  apresLecture, appareilDe, dateHumaine, idDuNom, libelleAppareil, libelleResume, lignesDepuisListe, marquerPlusRecente, peutRemettre, resumeDe,
} from '@/lib/v2/sauvegarde/listeSauvegardes';
import { lireCopie, restaurerTexte, type OutilsRestauration } from '@/lib/v2/sauvegarde/restaurerListe';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const sha = async (s: string) => createHash('sha256').update(s).digest('hex');
const racine = path.resolve(__dirname, '../..');
const lire = (f: string) => fs.readFileSync(path.join(racine, f), 'utf8');

/** Une vraie sauvegarde (bloc integrity calcule comme exportService) */
async function sauvegarde(contenu: Record<string, unknown>): Promise<string> {
  const d = { version: '6.0', exportDate: '2026-11-06T21:40:00.000Z', ...contenu };
  return JSON.stringify({ ...d, integrity: { algorithm: 'SHA-256', checksum: await sha(JSON.stringify(d)) } });
}

const t = (s: string) => new Date(s).getTime();
const now = t('2026-11-07T12:00:00');

describe('1. les lignes : tri, appareil, date humaine, la plus recente', () => {
  const liste = [
    { name: 'yoroi_backup_auto_1.json', size: 10, modifiedAt: t('2026-10-20T08:00:00'), telecharge: true },
    { name: 'yoroi_backup_auto_ab12cd_3.json', size: 10, modifiedAt: t('2026-11-03T18:12:00'), telecharge: true },
    { name: 'yoroi_backup_auto_moi234_7.json', size: 10, modifiedAt: t('2026-11-06T21:40:00'), telecharge: true },
    { name: 'yoroi_backup_auto_moi234_derniere.json', size: 10, modifiedAt: t('2026-11-06T21:40:30'), telecharge: true },
    { name: 'yoroi_backup_auto_moi234_6.json', size: 10, modifiedAt: t('2026-11-05T21:40:00'), telecharge: false },
    { name: 'autre_fichier.json', size: 10, modifiedAt: t('2026-11-07T10:00:00'), telecharge: true },
  ];
  const lignes = lignesDepuisListe(liste, 'moi234');

  it('la plus recente d abord, un seul exemplaire du fichier du jour et de « derniere », les autres fichiers ecartes', () => {
    expect(lignes.map((l) => l.nom)).toEqual([
      'yoroi_backup_auto_moi234_derniere.json',
      'yoroi_backup_auto_moi234_6.json',
      'yoroi_backup_auto_ab12cd_3.json',
      'yoroi_backup_auto_1.json',
    ]);
  });
  it('cet appareil, un autre appareil, une ancienne copie (anciens noms 1 a 3)', () => {
    expect(lignes.map((l) => l.appareil)).toEqual(['ce', 'ce', 'autre', 'ancien']);
    expect(idDuNom('yoroi_backup_auto_ab12cd_derniere.json')).toBe('ab12cd');
    expect(idDuNom('yoroi_backup_auto_2.json')).toBeNull();
    expect(appareilDe('yoroi_backup_auto_ab12cd_1.json', null)).toBe('autre');
    expect(libelleAppareil('ce', 'ios')).toBe('Cet iPhone');
    expect(libelleAppareil('ce', 'android')).toBe('Ce téléphone');
    expect(libelleAppareil('autre', 'ios')).toBe('Un autre appareil');
  });
  it('la plus recente est marquee, une seule fois', () => {
    expect(lignes.filter((l) => l.plusRecente).map((l) => l.nom)).toEqual(['yoroi_backup_auto_moi234_derniere.json']);
  });
  it('dates humaines : Aujourd’hui, Hier, puis le jour court', () => {
    expect(dateHumaine(t('2026-11-07T09:05:00'), now, 'fr-FR')).toBe('Aujourd’hui, 9 h 05');
    expect(dateHumaine(t('2026-11-06T21:40:00'), now, 'fr-FR')).toBe('Hier, 21 h 40');
    expect(dateHumaine(t('2026-11-03T18:12:00'), now, 'fr-FR')).toBe('3 nov., 18 h 12');
    expect(dateHumaine(t('2025-12-24T08:00:00'), now, 'fr-FR')).toMatch(/2025, 8 h 00$/);
  });
  it('le resume : seances, pesees, dernier poids, jamais le nom du fichier', () => {
    const r = resumeDe({ trainings: [{}, {}, {}], weights: [{ weight: 82.1, date: '2026-11-01' }, { weight: 81.4, date: '2026-11-06' }, { weight: 81.9, date: '2026-11-03' }] });
    expect(r).toEqual({ seances: 3, pesees: 3, dernierPoids: 81.4 });
    const texte = libelleResume(r!, 'kg', 'fr-FR')!;
    expect(texte).toMatch(/^3 séances · 3 pesées · 81,4 kg$/);
    expect(texte).not.toMatch(/yoroi_backup/);
    expect(libelleResume({ seances: 1, pesees: 0, dernierPoids: null }, 'kg', 'fr-FR')).toBe('1 séance · 0 pesée');
    expect(resumeDe({ foo: 1 })).toBeNull();
  });
});

describe('2. les copies abimees sont grisees et jamais proposees', () => {
  it('JSON coupe ou empreinte fausse : Abîmée ; protegee : mot de passe ; pas encore telechargee : nuage', async () => {
    const bonne = await sauvegarde({ weights: [{ weight: 80, date: '2026-11-06' }], trainings: [] });
    expect((await lireCopie(bonne, sha)).etat).toBe('ok');
    expect((await lireCopie(bonne.slice(0, bonne.length - 20), sha)).etat).toBe('abimee');
    const trafiquee = bonne.replace('"weight":80', '"weight":90');
    expect((await lireCopie(trafiquee, sha)).etat).toBe('abimee');
    expect((await lireCopie(JSON.stringify({ yoroi_encrypted: 'x' }), sha)).etat).toBe('protegee');
    expect((await lireCopie(null, sha)).etat).toBe('nuage');
  });
  it('une ligne abimee ne se touche pas, et perd la marque « La plus récente » au profit de la suivante', () => {
    let l = lignesDepuisListe([
      { name: 'yoroi_backup_auto_moi234_2.json', size: 1, modifiedAt: t('2026-11-06T21:40:00'), telecharge: true },
      { name: 'yoroi_backup_auto_moi234_1.json', size: 1, modifiedAt: t('2026-11-05T21:40:00'), telecharge: true },
    ], 'moi234');
    expect(l[0].plusRecente).toBe(true);
    l = apresLecture(l, 'yoroi_backup_auto_moi234_2.json', 'abimee');
    expect(peutRemettre(l[0])).toBe(false);
    expect(l[0].plusRecente).toBe(false);
    expect(l[1].plusRecente).toBe(true);
    expect(marquerPlusRecente(l)).toEqual(l);
  });
});

describe('3. restauration : copie de securite avant, donnees actuelles intactes en cas d echec', () => {
  const outils = (sur: Partial<OutilsRestauration> = {}) => {
    const ordre: string[] = [];
    const o: OutilsRestauration = {
      sha256: sha,
      valider: () => ({ valid: true }),
      copieSecurite: jest.fn(async () => { ordre.push('copie'); return true; }),
      telephoneVide: jest.fn(async () => false),
      restaurer: jest.fn(async () => { ordre.push('restaurer'); return true; }),
      ...sur,
    };
    return { o, ordre };
  };

  it('la copie de securite est faite avant la restauration', async () => {
    const { o, ordre } = outils();
    const r = await restaurerTexte(await sauvegarde({ weights: [], trainings: [{ id: 1 }] }), o);
    expect(r).toEqual({ ok: true });
    expect(ordre).toEqual(['copie', 'restaurer']);
  });
  it('copie abimee : ni copie de securite ni restauration, rien n est touche', async () => {
    const { o } = outils();
    const bonne = await sauvegarde({ weights: [{ weight: 80 }], trainings: [] });
    for (const texte of [bonne.slice(0, 40), bonne.replace('"weight":80', '"weight":70'), null]) {
      const r = await restaurerTexte(texte, o);
      expect(r.ok).toBe(false);
    }
    expect(o.copieSecurite).not.toHaveBeenCalled();
    expect(o.restaurer).not.toHaveBeenCalled();
  });
  it('fichier qui n est pas une sauvegarde YOROI : refuse avant toute ecriture', async () => {
    const { o } = outils({ valider: () => ({ valid: false }) });
    expect(await restaurerTexte(await sauvegarde({ foo: 1 }), o)).toEqual({ ok: false, raison: 'abimee' });
    expect(o.restaurer).not.toHaveBeenCalled();
  });
  it('copie de securite ratee sur un telephone avec des donnees : on s arrete, la restauration n est pas lancee', async () => {
    const { o } = outils({ copieSecurite: jest.fn(async () => false) });
    expect(await restaurerTexte(await sauvegarde({ weights: [], trainings: [] }), o)).toEqual({ ok: false, raison: 'copie' });
    expect(o.restaurer).not.toHaveBeenCalled();
  });
  it('copie de securite ratee sur un telephone vide : rien a proteger, la restauration continue', async () => {
    const { o } = outils({ copieSecurite: jest.fn(async () => false), telephoneVide: jest.fn(async () => true) });
    expect(await restaurerTexte(await sauvegarde({ weights: [], trainings: [] }), o)).toEqual({ ok: true });
  });
  it('restauration qui rate ou plante : erreur claire, jamais une exception', async () => {
    const a = outils({ restaurer: jest.fn(async () => false) });
    expect(await restaurerTexte(await sauvegarde({ weights: [], trainings: [] }), a.o)).toEqual({ ok: false, raison: 'echec' });
    const b = outils({ restaurer: jest.fn(async () => { throw new Error('base verrouillee'); }) });
    expect(await restaurerTexte(await sauvegarde({ weights: [], trainings: [] }), b.o)).toEqual({ ok: false, raison: 'echec' });
  });
  it('copie protegee par un mot de passe : renvoyee a l import habituel, sans rien ecrire ici', async () => {
    const { o } = outils();
    expect(await restaurerTexte(JSON.stringify({ yoroi_encrypted: 'x' }), o)).toEqual({ ok: false, raison: 'protegee' });
    expect(o.copieSecurite).not.toHaveBeenCalled();
  });
});

describe('4. branchements', () => {
  it('la copie de securite reste sur le telephone (local), et la restauration passe par le code existant', () => {
    const src = lire('lib/v2/sauvegarde/restaurerListe.ts');
    expect(src).toMatch(/runSafetyBackup\('pre-restore-liste', \{ local: true \}\)/);
    expect(src).toMatch(/importDataFromBackupObject\(d, \{ alreadyChecked: true \}\)/);
    expect(lire('lib/safetyBackupService.ts')).toMatch(/opts\?\.local \? \{ silent: true, local: true \}/);
    expect(lire('lib/exportService.ts')).toMatch(/copieCloudPermise\(\{ silent, includePhotos, counts \}\) && options\?\.local !== true/);
  });
  it('Reglages : l entree « Retrouver une sauvegarde » ; l onboarding ouvre la meme liste', () => {
    expect(lire('app/settings/sauvegardes.tsx')).toMatch(/Retrouver une sauvegarde[\s\S]*\/settings\/retrouver/);
    const o = lire('app/onboarding.tsx');
    expect(o).toMatch(/<ListeSauvegardes/);
    expect(o).toMatch(/if \(liste\) setListeOuverte\(true\);\s*else void restaurer\(\);/);
  });
  it('« Importer un fichier » reste en bas, et le nom du fichier n est jamais affiche', () => {
    const ui = lire('components/yoroi/v2/sauvegarde/ListeSauvegardes.tsx');
    expect(ui).toMatch(/Importer un fichier/);
    expect(ui).not.toMatch(/>\{l\.nom\}</);
    expect(ui).not.toMatch(/[぀-ヿ一-龯]/);
  });
});
