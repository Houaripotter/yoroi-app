/**
 * Remettre une sauvegarde choisie dans la liste « Retrouver une sauvegarde » (7 novembre 2026).
 * Ordre, toujours le meme :
 *  1. la copie est lue en entier (JSON lisible, empreinte SHA-256 juste, vraie sauvegarde YOROI) : sinon rien n'est touche ;
 *  2. une copie de securite de tes donnees actuelles est faite sur ce telephone (safetyBackupService, sans rien
 *     envoyer dans le cloud) : si elle rate alors que le telephone a des donnees, on s'arrete, rien n'est touche ;
 *  3. la restauration existante (importDataFromBackupObject, fusion : rien n'est efface) remet la copie.
 * Une copie protegee par un mot de passe passe par l'import habituel (il demande le mot de passe).
 * Rien ne quitte le telephone : on lit seulement ton propre iCloud (ou ton dossier relie sur Android).
 * restaurerTexte() et lireCopie() sont purs (outils passes en parametre), testes dans
 * __tests__/unit/restaurationSimple.test.ts.
 */
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { avecDelai, empreinteOk } from './retrouver';
import { resumeDe, type EtatLigne, type Resume } from './listeSauvegardes';
import type { SauvegardeICloud } from './coffreICloud';

export type Lecture = { etat: EtatLigne; resume?: Resume };
export type Raison = 'nuage' | 'abimee' | 'protegee' | 'copie' | 'echec';
export type ResultatRestauration = { ok: true } | { ok: false; raison: Raison };

export type OutilsRestauration = {
  sha256: (s: string) => Promise<string>;
  valider: (d: unknown) => { valid: boolean };
  /** copie de securite locale de l'etat actuel ; vrai si faite */
  copieSecurite: () => Promise<boolean>;
  /** rien sur ce telephone (une copie de securite ratee n'a alors rien a proteger) */
  telephoneVide: () => Promise<boolean>;
  /** la restauration existante, sur l'objet deja verifie */
  restaurer: (d: unknown) => Promise<boolean>;
};

const estChiffree = (d: unknown) => !!d && typeof d === 'object' && typeof (d as { yoroi_encrypted?: unknown }).yoroi_encrypted === 'string';

/** Lit une copie pour sa ligne : entiere avec son resume, abimee, protegee, ou pas encore telechargee */
export async function lireCopie(texte: string | null | undefined, sha256: (s: string) => Promise<string>): Promise<Lecture> {
  if (texte == null) return { etat: 'nuage' };
  let d: unknown;
  try {
    d = JSON.parse(texte);
  } catch {
    return { etat: 'abimee' };
  }
  if (estChiffree(d)) return { etat: 'protegee' };
  if (!(await empreinteOk(texte, sha256))) return { etat: 'abimee' };
  const resume = resumeDe(d);
  return resume ? { etat: 'ok', resume } : { etat: 'abimee' };
}

/** Remet une copie (texte deja lu en entier). Toute erreur avant l'etape 3 laisse les donnees actuelles intactes. */
export async function restaurerTexte(texte: string | null | undefined, o: OutilsRestauration): Promise<ResultatRestauration> {
  if (texte == null) return { ok: false, raison: 'nuage' };
  let d: unknown;
  try {
    d = JSON.parse(texte);
  } catch {
    return { ok: false, raison: 'abimee' };
  }
  if (estChiffree(d)) return { ok: false, raison: 'protegee' };
  if (!(await empreinteOk(texte, o.sha256).catch(() => false))) return { ok: false, raison: 'abimee' };
  try {
    if (!o.valider(d).valid) return { ok: false, raison: 'abimee' };
  } catch {
    return { ok: false, raison: 'abimee' };
  }
  let copie = false;
  try {
    copie = await o.copieSecurite();
  } catch {
    copie = false;
  }
  if (!copie && !(await o.telephoneVide().catch(() => false))) return { ok: false, raison: 'copie' };
  try {
    return (await o.restaurer(d)) ? { ok: true } : { ok: false, raison: 'echec' };
  } catch (e) {
    logger.error('[RestaurerListe] restauration impossible', e);
    return { ok: false, raison: 'echec' };
  }
}

// ===== Branchements reels (telephone) =====

/** Ou sont les copies : coffre iCloud de l'app (iPhone), dossier relie par le systeme (Android) */
export type Source = {
  plateforme: 'ios' | 'android';
  /** iCloud connecte (iPhone) ou dossier relie (Android) */
  disponible: () => Promise<boolean>;
  lister: () => Promise<SauvegardeICloud[]>;
  /** le texte de la copie ; null si pas encore telechargee ou illisible */
  lireTexte: (nom: string) => Promise<string | null>;
  /** un chemin local du fichier, pour l'import habituel (copie protegee par un mot de passe) */
  chemin: (nom: string) => Promise<string | null>;
};

const DELAI_DISPO_MS = 3500;
const DELAI_LISTE_MS = 6000;
const DELAI_FICHIER_MS = 12000;

async function lireFichier(chemin: string | null): Promise<string | null> {
  if (!chemin) return null;
  const FS = await import('expo-file-system/legacy');
  return avecDelai(FS.readAsStringAsync(chemin, { encoding: FS.EncodingType.UTF8 }), DELAI_FICHIER_MS);
}

function sourceICloud(): Source {
  const ic = () => import('./coffreICloud');
  const chemin = async (nom: string) => avecDelai((await ic()).preparerICloud(nom), DELAI_FICHIER_MS);
  return {
    plateforme: 'ios',
    disponible: async () => (await avecDelai((await ic()).icloudDisponible(), DELAI_DISPO_MS)) === true,
    lister: async () => (await avecDelai((await ic()).listerICloud(), DELAI_LISTE_MS)) ?? [],
    lireTexte: async (nom) => lireFichier(await chemin(nom)),
    chemin,
  };
}

function sourceDossier(): Source {
  const cf = () => import('@/lib/cloudFolderService');
  const lireTexte = async (nom: string) => avecDelai((await cf()).readCloudBackupFile(nom), DELAI_FICHIER_MS);
  return {
    plateforme: 'android',
    disponible: async () => !!(await avecDelai((await cf()).getSavedCloudFolder(), DELAI_DISPO_MS)),
    lister: async () => {
      const l = (await avecDelai((await cf()).listCloudBackups(), DELAI_LISTE_MS)) ?? [];
      return l.map((x) => ({ name: x.name, size: x.size, modifiedAt: x.modifiedAt, telecharge: true }));
    },
    lireTexte,
    chemin: async (nom) => {
      // le dossier relie n'a pas de chemin de fichier : le texte est recopie dans le cache de l'app
      const texte = await lireTexte(nom);
      const FS = await import('expo-file-system/legacy');
      if (!texte || !FS.cacheDirectory) return null;
      const p = `${FS.cacheDirectory}${nom.replace(/[^a-zA-Z0-9_.]/g, '_')}`;
      await FS.writeAsStringAsync(p, texte, { encoding: FS.EncodingType.UTF8 });
      return p;
    },
  };
}

/** La source de ce telephone ; null sur le web */
export function sourceDuTelephone(os: string = Platform.OS): Source | null {
  if (os === 'ios') return sourceICloud();
  if (os === 'android') return sourceDossier();
  return null;
}

/** Les vrais outils : safetyBackupService (copie locale), validateBackup, importDataFromBackupObject */
export async function outilsReels(): Promise<OutilsRestauration> {
  const { digestStringAsync, CryptoDigestAlgorithm } = await import('expo-crypto');
  const { validateBackup } = await import('@/lib/backupMigrationService');
  return {
    sha256: (s) => digestStringAsync(CryptoDigestAlgorithm.SHA256, s),
    valider: (d) => validateBackup(d),
    copieSecurite: async () => (await import('@/lib/safetyBackupService')).runSafetyBackup('pre-restore-liste', { local: true }),
    telephoneVide: async () => (await import('./retrouver')).telephoneVide(),
    restaurer: async (d) => (await import('@/lib/exportService')).importDataFromBackupObject(d, { alreadyChecked: true }),
  };
}
