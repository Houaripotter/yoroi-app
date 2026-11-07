/**
 * Retrouver ses donnees au premier lancement (7 novembre 2026). iPhone seulement.
 * Plan : _propositions/sauvegarde_auto_2026-11-05/PLAN.md, etape 5.
 *
 * Au premier lancement (rien sur le telephone), l'app regarde le coffre iCloud (dossier YOROI d'iCloud Drive) et
 * cherche la sauvegarde la plus recente qui soit entiere : son empreinte (SHA-256, bloc integrity) doit
 * correspondre. Si la plus recente est abimee, on passe a celle d'avant. Les anciens noms
 * (yoroi_backup_auto_1 a 3) comptent aussi.
 * Jamais bloquant : tout est limite dans le temps (iCloud lent juste apres l'installation) et dans des try/catch.
 * Rien ne sort du telephone : on lit seulement ton propre iCloud.
 *
 * choisirSauvegardeValide() et empreinteOk() sont purs (testes dans __tests__/unit/sauvegardeAuto.test.ts).
 */
import { logger } from '@/lib/security/logger';
import type { SauvegardeICloud } from './coffreICloud';

export type Trouvee = { nom: string; chemin: string; modifiedAt: number };

/** Le temps total de la recherche, au plus */
export const DELAI_RECHERCHE_MS = 9000;
const DELAI_LISTE_MS = 3500;
const DELAI_FICHIER_MS = 5000;
/** On essaie au plus 4 fichiers (la plus recente, sa copie « derniere », puis celles d'avant) */
export const ESSAIS_MAX = 4;

/** Une promesse limitee dans le temps : null si trop long ou en erreur */
export function avecDelai<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
    );
  });
}

/**
 * Le texte d'une sauvegarde est-il entier ?
 * - JSON lisible ;
 * - sauvegarde chiffree : on ne peut pas verifier sans le mot de passe, elle compte comme entiere ;
 * - empreinte presente : elle doit correspondre (calculee sur la sauvegarde sans le bloc integrity) ;
 * - sans empreinte (tres vieilles versions) : il faut au moins des donnees.
 */
export async function empreinteOk(texte: string, sha256: (s: string) => Promise<string>): Promise<boolean> {
  let d: Record<string, unknown> & { integrity?: { algorithm?: string; checksum?: string } };
  try {
    d = JSON.parse(texte);
  } catch {
    return false;
  }
  if (!d || typeof d !== 'object') return false;
  if (typeof (d as { yoroi_encrypted?: unknown }).yoroi_encrypted === 'string') return true;
  const integrity = d.integrity;
  if (integrity?.checksum && integrity.algorithm === 'SHA-256') {
    const { integrity: _i, ...reste } = d;
    try {
      return (await sha256(JSON.stringify(reste))) === integrity.checksum;
    } catch {
      return false;
    }
  }
  return Array.isArray((d as { weights?: unknown }).weights) || Array.isArray((d as { trainings?: unknown }).trainings);
}

/**
 * La sauvegarde la plus recente qui passe la verification, en essayant au plus ESSAIS_MAX fichiers.
 * preparer : telecharge et renvoie le chemin local (null si impossible) ; verifier : vrai si entiere.
 */
export async function choisirSauvegardeValide(
  liste: SauvegardeICloud[],
  preparer: (nom: string) => Promise<string | null>,
  verifier: (chemin: string) => Promise<boolean>,
  essais = ESSAIS_MAX,
): Promise<Trouvee | null> {
  let n = 0;
  for (const s of liste) {
    if (n >= essais) break;
    n += 1;
    try {
      const chemin = await preparer(s.name);
      if (chemin && (await verifier(chemin))) return { nom: s.name, chemin, modifiedAt: s.modifiedAt };
    } catch {
      // fichier suivant
    }
    logger.info('[Retrouver] sauvegarde ecartee (abimee ou pas encore telechargee)', s.name);
  }
  return null;
}

/** Cherche, sans jamais bloquer, la sauvegarde iCloud a proposer. null : rien a proposer. */
export async function chercherSauvegardeICloud(delaiTotal = DELAI_RECHERCHE_MS): Promise<Trouvee | null> {
  const travail = (async (): Promise<Trouvee | null> => {
    try {
      const ic = await import('./coffreICloud');
      const dispo = await avecDelai(ic.icloudDisponible(), DELAI_LISTE_MS);
      if (!dispo) return null;
      const liste = ic.ordreRestauration((await avecDelai(ic.listerICloud(), DELAI_LISTE_MS)) ?? []);
      if (!liste.length) return null;
      const FS = await import('expo-file-system/legacy');
      const { digestStringAsync, CryptoDigestAlgorithm } = await import('expo-crypto');
      const sha = (s: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, s);
      return await choisirSauvegardeValide(
        liste,
        (nom) => avecDelai(ic.preparerICloud(nom), DELAI_FICHIER_MS),
        async (chemin) => {
          const texte = await avecDelai(FS.readAsStringAsync(chemin, { encoding: FS.EncodingType.UTF8 }), DELAI_FICHIER_MS);
          return !!texte && (await empreinteOk(texte, sha));
        },
      );
    } catch (e) {
      logger.warn('[Retrouver] recherche impossible', e);
      return null;
    }
  })();
  return avecDelai(travail, delaiTotal);
}

/**
 * Rien sur ce telephone ? (premier lancement, ou app supprimee puis remise). Lecture seule, par les fonctions
 * existantes de la base. En cas de doute : faux (on ne propose rien).
 */
export async function telephoneVide(): Promise<boolean> {
  try {
    const db = await import('@/lib/database');
    const [profil, pesees, seances] = await Promise.all([
      avecDelai(db.getProfile(), 2500),
      avecDelai(db.getWeights(), 2500),
      avecDelai(db.getTrainings(), 2500),
    ]);
    if (pesees === null || seances === null) return false;
    return !profil?.name && (pesees ?? []).length === 0 && (seances ?? []).length === 0;
  } catch {
    return false;
  }
}
