/**
 * Masquage des chemins de fichiers dans ce qui part vers Sentry (2 novembre 2026, audit de confidentialite des cartes).
 *
 * Un message d'erreur peut contenir le chemin d'une photo (jamais l'image) : file:///var/mobile/.../photo.jpg,
 * content://media/external/images/1234, ph://ABCD..., ou un chemin brut /data/user/0/... .
 * Tout est remplace par [chemin]. Fonctions pures, sans dependance : testables dans node.
 */

export const CHEMIN_MASQUE = '[chemin]';

// Corps d'un chemin : s'arrete aux espaces, guillemets et chevrons ; « Application Support » (iPhone) reste entier
const CORPS = String.raw`(?:Application Support|[^\s"'<>\x60])+`;

/** Adresses avec schema : file://, content://, ph://, assets-library://, et leurs variantes encodees */
const AVEC_SCHEMA = new RegExp(String.raw`\b(?:file|content|ph|assets-library)(?::\/\/|%3A%2F%2F)${CORPS}`, 'gi');

/** Chemins absolus bruts des appareils et des machines de build */
const RACINES = '(?:private|var|data|storage|sdcard|mnt|Users|home|tmp|Volumes)';
const ABSOLU = new RegExp(String.raw`(^|[^\w:/.\-\]])(\/${RACINES}\/${CORPS})`, 'g');

/** Remplace tout chemin de fichier ou adresse de contenu par [chemin] */
export function masquerChemins<T>(s: T): T {
  if (typeof s !== 'string' || s.length === 0) return s;
  return s.replace(AVEC_SCHEMA, CHEMIN_MASQUE).replace(ABSOLU, (_m, avant: string) => `${avant}${CHEMIN_MASQUE}`) as unknown as T;
}

/** Masque les chemins dans toutes les chaines d'un objet (donnees de fil d'ariane), sur quelques niveaux */
export function masquerCheminsProfond<T>(v: T, profondeur = 4): T {
  if (typeof v === 'string') return masquerChemins(v);
  if (!v || typeof v !== 'object' || profondeur <= 0) return v;
  if (Array.isArray(v)) return v.map((x) => masquerCheminsProfond(x, profondeur - 1)) as unknown as T;
  const o = v as Record<string, unknown>;
  for (const k of Object.keys(o)) o[k] = masquerCheminsProfond(o[k], profondeur - 1);
  return v;
}
