/**
 * NUIT 14 : la date d'une photo de forme ajoutee depuis la galerie.
 * La lecture (EXIF DateTimeOriginal « AAAA:MM:JJ HH:MM:SS », nom du fichier, date de la galerie) est celle
 * deja ecrite pour l'import balance (lib/v2/balance/photos.ts) : on la reutilise, on ne la duplique pas.
 * A defaut de date, aujourd'hui. Une photo prise avec l'appareil photo de l'app prend la date du moment.
 * Fichier pur : teste par jest (__tests__/unit/photosCadrage.test.ts).
 */
import { isoDay, pickPhotoTime } from '@/lib/v2/balance/photos';
import { traduire } from '@/lib/i18n/tr';

export type PhotoDay = {
  /** jour local AAAA-MM-JJ */
  date: string;
  /** vrai si la date vient de la photo elle-meme */
  found: boolean;
  /** ce que l'on affiche sous la photo */
  label: string;
};

/**
 * La date proposee pour une photo choisie : EXIF, sinon nom du fichier, sinon date de creation dans la galerie
 * (MediaLibrary creationTime), sinon aujourd'hui. La date de modification n'est pas retenue : une photo
 * retouchee ou copiee hier n'a pas ete prise hier.
 */
export function photoDay(p: { exif?: unknown; fileName?: unknown; creationTime?: number | null }, now: number = Date.now()): PhotoDay {
  const t = pickPhotoTime({ exif: p.exif, fileName: p.fileName, creationTime: p.creationTime ?? undefined }, now);
  if (t.at !== undefined && t.source !== 'modif') return { date: isoDay(t.at), found: true, label: traduire('Date de la photo') };
  return { date: isoDay(now), found: false, label: traduire('Aucune date dans la photo : aujourd’hui') };
}

/** une photo prise maintenant avec l'appareil de l'app */
export function cameraDay(now: number = Date.now()): PhotoDay {
  return { date: isoDay(now), found: true, label: traduire('Photo prise maintenant') };
}
