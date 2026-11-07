/**
 * 18 octobre 2026 : la copie automatique hors du telephone (lib/v2/sauvegarde/copieAuto.ts) et ses textes.
 */
import { etatProtection, joursDepuisCopie, type InfosProtection } from '@/lib/v2/sauvegarde/copieAuto';
import { etapesSelecteur, texteAbri, texteCopieAuto } from '@/lib/v2/sauvegarde/textesCopie';

const J = 86400000;
const now = 1_800_000_000_000;
const base: InfosProtection = { dispo: true, connecte: false, dossier: null, succes: 0, echec: 0, manuel: 0 };

describe('etat de la protection', () => {
  it('sans module natif : copie a la main', () => {
    expect(etatProtection({ ...base, dispo: false }, now)).toBe('non_dispo');
  });
  it('dossier pas relie : a activer, meme avec une copie a la main', () => {
    expect(etatProtection({ ...base, manuel: now - J }, now)).toBe('a_activer');
  });
  it('relie et copie recente : protege, rien a dire', () => {
    // 7 novembre 2026 : protege seulement avec une copie de moins de 48 heures ; tout juste relie : en attente
    expect(etatProtection({ ...base, connecte: true, succes: now - 1 * J }, now)).toBe('protege');
    expect(etatProtection({ ...base, connecte: true, succes: now - 2.5 * J }, now)).toBe('en_attente');
    expect(etatProtection({ ...base, connecte: true }, now)).toBe('en_attente');
  });
  it('relie mais plus de copie depuis 3 jours : en panne', () => {
    expect(etatProtection({ ...base, connecte: true, succes: now - 4 * J }, now)).toBe('en_panne');
    expect(etatProtection({ ...base, connecte: true, echec: now - J }, now)).toBe('en_panne');
  });
  it('jours depuis la derniere copie hors du telephone', () => {
    expect(joursDepuisCopie(base, now)).toBeNull();
    expect(joursDepuisCopie({ ...base, succes: now - 4 * J, manuel: now - 2 * J }, now)).toBe(2);
  });
});

describe('textes', () => {
  it('sans tiret long, et avec le bon cloud', () => {
    const a = texteCopieAuto('a_activer', null, null, 'ios');
    expect(a.bouton).toBe('Activer la copie automatique');
    expect(a.texte).toContain('iCloud Drive');
    expect(texteCopieAuto('en_panne', 5, 'YOROI', 'android').texte).toContain('5 jours');
    expect(etapesSelecteur('android')).toContain('Google Drive');
    const t = texteAbri('a_activer', { rang: 'Confirmé', xp: 6715, serie: 12 });
    expect(t.texte).toContain('Confirmé');
    expect(t.texte).toContain('12 jours');
    for (const s of [a.titre, a.texte, t.titre, t.texte, etapesSelecteur('ios')]) expect(s).not.toMatch(/[—–]/);
  });
});

describe('coffre iCloud (iPhone, 18 octobre)', () => {
  it('connecte a iCloud : rien a choisir, protege apres une vraie copie (7 novembre 2026)', () => {
    expect(etatProtection({ ...base, dispo: true, icloud: true }, now)).toBe('en_attente');
    expect(etatProtection({ ...base, icloud: true, succesICloud: now - J }, now)).toBe('protege');
  });
  it('iCloud qui ne passe plus depuis 3 jours : en panne (une seule alerte)', () => {
    expect(etatProtection({ ...base, icloud: true, succesICloud: now - 5 * J }, now)).toBe('en_panne');
  });
  it('nom de la copie du jour : 7 noms a tour de role, au nom du telephone', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { nomCopieICloud } = require('@/lib/v2/sauvegarde/coffreICloud');
    const noms = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => nomCopieICloud(now + k * J, 'x1')));
    expect(noms.size).toBe(7);
    expect([...noms].every((n: string) => /^yoroi_backup_auto_x1_[1-7]\.json$/.test(n))).toBe(true);
  });
});
