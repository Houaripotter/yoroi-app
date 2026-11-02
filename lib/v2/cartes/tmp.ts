/**
 * Copies temporaires des cartes a partager (2 novembre 2026, audit de confidentialite des cartes v7).
 *
 * Toutes les copies de travail d'une carte passent par un seul dossier : cacheDirectory/cartes_tmp/.
 *   * la copie de la photo choisie (selecteur du systeme) et sa version reduite a 1440 px ;
 *   * l'image exportee (PNG ou JPEG) quand le systeme la laisse dans le cache de l'app ;
 *   * les futurs masques de detourage, dans cartes_tmp/masques/.
 *
 * Regle absolue : on n'efface QUE ce qui est dans cartes_tmp. Jamais l'original de la photothèque
 * (ph://, content://, assets-library://), jamais une photo gardee dans l'app (photos de progression,
 * avant et apres, photo de profil : elles vivent dans documentDirectory). Un chemin avec « .. » est refuse.
 *
 * Seule exception, hors de ce dossier : le fichier ecrit par react-native-view-shot dans son propre dossier
 * temporaire (iPhone : tmp/ReactNative, que l'app ne peut pas lire en JS). Il est libere par releaseCapture,
 * qui ne supprime que dans ce dossier-la (verifie dans RNViewShot.mm et RNViewShotModule.java).
 *
 * Rien ici ne leve d'erreur : un nettoyage rate ne doit jamais casser un partage ni le demarrage.
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { releaseCapture } from 'react-native-view-shot';

export const NOM_DOSSIER_CARTES = 'cartes_tmp';
export const NOM_DOSSIER_MASQUES = 'masques';

/** Android : la feuille de partage rend la main au retour dans l'app, l'app choisie peut encore lire le fichier */
export const DELAI_EFFACEMENT_ANDROID_MS = 60_000;
/** Le nettoyage du demarrage attend que l'app soit affichee */
export const DELAI_NETTOYAGE_DEMARRAGE_MS = 4_000;
/** Au plus tant de fichiers examines au demarrage : le nettoyage reste rapide */
const MAX_FICHIERS_DEMARRAGE = 400;

function avecSlash(s: string): string {
  return s.endsWith('/') ? s : `${s}/`;
}

/** Forme comparable d'un chemin : file://, sans requete, /private/var ramene a /var (iPhone), decode */
export function normaliserChemin(uri: string): string {
  let s = String(uri).split('?')[0].split('#')[0];
  if (s.startsWith('/')) s = `file://${s}`;
  try {
    s = decodeURI(s);
  } catch {
    // chemin mal encode : on garde tel quel
  }
  return s.replace(/^file:\/\/\/private\/var\//, 'file:///var/');
}

function aUnRetourEnArriere(uri: string): boolean {
  return normaliserChemin(uri)
    .replace(/^file:\/\//, '')
    .split('/')
    .some((seg) => seg === '..' || seg === '.');
}

function cache(): string | null {
  const c = FileSystem.cacheDirectory;
  return c ? avecSlash(c) : null;
}

/** cacheDirectory/cartes_tmp/ (null si le systeme de fichiers n'est pas disponible) */
export function dossierCartesTmp(): string | null {
  const c = cache();
  return c ? `${c}${NOM_DOSSIER_CARTES}/` : null;
}

/** cacheDirectory/cartes_tmp/masques/ */
export function dossierMasques(): string | null {
  const d = dossierCartesTmp();
  return d ? `${d}${NOM_DOSSIER_MASQUES}/` : null;
}

function estSous(uri: string | null | undefined, dossier: string | null): boolean {
  if (!uri || !dossier || typeof uri !== 'string') return false;
  if (aUnRetourEnArriere(uri)) return false;
  const n = normaliserChemin(uri);
  const d = normaliserChemin(dossier);
  return n.startsWith(d) && n.length > d.length;
}

/** Vrai seulement pour un fichier a l'interieur de cacheDirectory/cartes_tmp/ */
export function estDansCartesTmp(uri: string | null | undefined): boolean {
  return estSous(uri, dossierCartesTmp());
}

/** Vrai pour un fichier du cache de l'app (copie du selecteur, de la reduction ou de la capture) */
export function estDansCache(uri: string | null | undefined): boolean {
  return estSous(uri, cache());
}

async function assurerDossier(dossier: string | null): Promise<boolean> {
  if (!dossier) return false;
  try {
    const info = await FileSystem.getInfoAsync(dossier);
    if (info.exists && info.isDirectory) return true;
    await FileSystem.makeDirectoryAsync(dossier, { intermediates: true });
    return true;
  } catch {
    return false;
  }
}

function extension(uri: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(normaliserChemin(uri));
  return m ? m[1].toLowerCase() : 'jpg';
}

function nomUnique(prefixe: string, ext: string): string {
  return `${prefixe}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/**
 * Range une copie temporaire dans cartes_tmp/ (deplacement, pas de copie en double).
 * Seulement si elle est deja dans le cache de l'app : un original de la photothèque n'est jamais deplace.
 * Rend le nouveau chemin, ou le chemin d'origine si rien n'a ete fait.
 */
export async function rangerDansCartesTmp(uri: string, prefixe = 'photo'): Promise<string> {
  try {
    if (!uri || estDansCartesTmp(uri) || !estDansCache(uri)) return uri;
    const dossier = dossierCartesTmp();
    if (!(await assurerDossier(dossier))) return uri;
    const vers = `${dossier}${nomUnique(prefixe, extension(uri))}`;
    const source = uri.startsWith('/') ? `file://${uri}` : uri;
    await FileSystem.moveAsync({ from: source, to: vers });
    return vers;
  } catch {
    return uri;
  }
}

/** Efface une copie de carte. Ne touche a rien hors de cartes_tmp/. Vrai si un effacement a ete demande. */
export async function effacerCopieCarte(uri: string | null | undefined): Promise<boolean> {
  if (!uri || !estDansCartesTmp(uri)) return false;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Libere un fichier ecrit par react-native-view-shot hors de cartes_tmp (iPhone : tmp/ReactNative ;
 * Android : cache externe). La bibliotheque refuse elle-meme tout fichier hors de son dossier temporaire.
 */
export function libererCapture(uri: string | null | undefined): void {
  if (!uri || typeof uri !== 'string' || estDansCartesTmp(uri)) return;
  if (!/^(file:\/\/)?\//.test(uri) || aUnRetourEnArriere(uri)) return;
  try {
    // iPhone : RNViewShot compare un chemin brut, sans file://
    releaseCapture(Platform.OS === 'ios' ? uri.replace(/^file:\/\//, '') : uri);
  } catch {
    // module natif absent : le systeme videra son dossier temporaire
  }
}

/** Efface une image exportee : dans cartes_tmp, ou liberee par view-shot si elle est restee dans son dossier */
export async function effacerExport(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  if (estDansCartesTmp(uri)) await effacerCopieCarte(uri);
  else libererCapture(uri);
}

/**
 * Apres un partage, termine ou annule. iPhone : tout de suite, la feuille du systeme a fini quand elle rend la main.
 * Android : apres un delai, l'app choisie peut lire le fichier un peu apres le retour (le demarrage suivant rattrape).
 */
export function effacerApresPartage(uri: string | null | undefined): void {
  if (!uri) return;
  if (Platform.OS === 'android') {
    setTimeout(() => {
      void effacerExport(uri);
    }, DELAI_EFFACEMENT_ANDROID_MS);
  } else {
    void effacerExport(uri);
  }
}

/** Chemin d'un futur masque de detourage, dans cartes_tmp/masques/ (le dossier est cree). */
export async function cheminMasque(prefixe = 'masque', ext = 'png'): Promise<string | null> {
  const d = dossierMasques();
  if (!(await assurerDossier(d))) return null;
  return `${d}${nomUnique(prefixe, ext)}`;
}

/** Efface tous les masques temporaires (a la sortie de la carte) */
export async function effacerMasques(): Promise<void> {
  const d = dossierMasques();
  if (!d) return;
  try {
    await FileSystem.deleteAsync(d, { idempotent: true });
  } catch {
    // rien
  }
}

/**
 * Vide cartes_tmp/ des fichiers laisses par une session coupee : seulement ceux d'avant `avant` (ms),
 * pour ne jamais effacer la photo d'une carte ouverte pendant ce lancement. Rend le nombre de fichiers effaces.
 */
export async function viderCartesTmp(avant: number = Date.now()): Promise<number> {
  const racine = dossierCartesTmp();
  if (!racine) return 0;
  let effaces = 0;
  let vus = 0;
  const parcourir = async (dossier: string): Promise<void> => {
    let noms: string[];
    try {
      const info = await FileSystem.getInfoAsync(dossier);
      if (!info.exists || !info.isDirectory) return;
      noms = await FileSystem.readDirectoryAsync(dossier);
    } catch {
      return;
    }
    for (const nom of noms) {
      if (vus >= MAX_FICHIERS_DEMARRAGE) return;
      vus++;
      const chemin = `${dossier}${nom}`;
      if (!estDansCartesTmp(chemin)) continue;
      try {
        const info = await FileSystem.getInfoAsync(chemin);
        if (!info.exists) continue;
        if (info.isDirectory) {
          await parcourir(`${chemin}/`);
          continue;
        }
        const modifie = typeof info.modificationTime === 'number' ? info.modificationTime * 1000 : 0;
        if (modifie < avant) {
          await FileSystem.deleteAsync(chemin, { idempotent: true });
          effaces++;
        }
      } catch {
        // fichier suivant
      }
    }
  };
  await parcourir(racine);
  return effaces;
}

let nettoyageLance = false;

/** Au lancement : nettoyage en arriere-plan, une fois, apres l'affichage. Ne bloque rien, ne leve rien. */
export function lancerNettoyageDemarrage(delaiMs: number = DELAI_NETTOYAGE_DEMARRAGE_MS): void {
  if (nettoyageLance) return;
  nettoyageLance = true;
  const debutSession = Date.now();
  try {
    setTimeout(() => {
      viderCartesTmp(debutSession).catch(() => {});
    }, delaiMs);
  } catch {
    // rien
  }
}

/** Pour les tests seulement */
export function __reinitialiserNettoyage(): void {
  nettoyageLance = false;
}
