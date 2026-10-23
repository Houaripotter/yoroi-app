/**
 * PHOTOS DATEES (13 octobre 2026) : c'est YOROI qui trouve la date, pas l'utilisateur.
 * Une balance comme la Tanita BC-545N n'affiche jamais la date, et l'IA ne voit pas la date de prise de vue.
 * YOROI lit donc la date de chaque photo choisie (EXIF, nom du fichier, galerie), les trie, les regroupe par
 * pesee (moins de 30 minutes d'ecart) et ajoute la liste a la consigne. Un bloc rendu sans date retrouve
 * ensuite la date de sa photo.
 * Fichier pur (aucun import React Native) : teste par jest (__tests__/unit/balancePhotosDatees.test.ts).
 */
import { BALANCE_PROMPT, readPhotoRefs } from './format';
import type { DateSource } from './format';

export { readPhotoRefs };

/** D'ou vient la date d'une photo */
export type PhotoSource = 'exif' | 'nom' | 'galerie' | 'modif' | 'aucune';

/** Une photo choisie : son adresse dans le cache de l'app et sa date de prise (heure locale, en ms) */
export type DatedPhoto = { uri: string; at?: number; source: PhotoSource; width?: number; height?: number; name?: string };

/** Deux photos a moins de 30 minutes d'ecart : la meme pesee */
export const SAME_SESSION_MS = 30 * 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, '0');

function localMs(y: number, mo: number, d: number, h = 12, mi = 0, s = 0): number | undefined {
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 60) return undefined;
  const dt = new Date(y, mo - 1, d, h, mi, s);
  if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return undefined;
  return dt.getTime();
}

/** « 2026:10:03 08:12:45 » (EXIF), ou « 2026-10-03T08:12:45 », en heure locale de l'appareil photo */
export function readExifDateText(raw: unknown): number | undefined {
  if (typeof raw !== 'string') return undefined;
  const m = raw.trim().match(/^(\d{4})[:\-/.](\d{2})[:\-/.](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return undefined;
  return localMs(+m[1], +m[2], +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
}

/** La date de prise de vue dans l'EXIF renvoye par le selecteur (plat sur Android, par dictionnaires sur iOS) */
export function exifDate(exif: unknown): number | undefined {
  if (!exif || typeof exif !== 'object') return undefined;
  const e = exif as Record<string, any>;
  const sub = (k: string) => (e[k] && typeof e[k] === 'object' ? (e[k] as Record<string, unknown>) : {});
  const candidates = [
    e.DateTimeOriginal,
    sub('{Exif}').DateTimeOriginal,
    e.DateTimeDigitized,
    sub('{Exif}').DateTimeDigitized,
    e.DateTime,
    sub('{TIFF}').DateTime,
  ];
  for (const c of candidates) {
    const t = readExifDateText(c);
    if (t !== undefined) return t;
  }
  return undefined;
}

/** Un nom de fichier date : IMG_20261003_081245.jpg, Screenshot_20261003-081245.png, 2026-10-03 08.12.45.jpg */
export function nameDate(name: unknown): number | undefined {
  if (typeof name !== 'string') return undefined;
  const m =
    name.match(/(20\d{2})(\d{2})(\d{2})[_\-\sT]?(\d{2})(\d{2})(\d{2})/) ??
    name.match(/(20\d{2})-(\d{2})-(\d{2})[_\s]+(\d{2})[.h:\-](\d{2})(?:[.:\-](\d{2}))?/);
  if (!m) return undefined;
  return localMs(+m[1], +m[2], +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
}

/**
 * La date d'une photo, de la plus sure a la moins sure : EXIF, nom du fichier, date de creation dans la galerie,
 * date de modification. Une date dans le futur ou avant 2000 est ignoree.
 */
export function pickPhotoTime(p: { exif?: unknown; fileName?: unknown; creationTime?: number | null; modificationTime?: number | null }, now: number = Date.now()): { at?: number; source: PhotoSource } {
  const ok = (t: number | null | undefined) => typeof t === 'number' && Number.isFinite(t) && t > 946684800000 && t <= now + 60000;
  const exif = exifDate(p.exif);
  if (ok(exif)) return { at: exif, source: 'exif' };
  const byName = nameDate(p.fileName);
  if (ok(byName)) return { at: byName, source: 'nom' };
  if (ok(p.creationTime)) return { at: p.creationTime as number, source: 'galerie' };
  if (ok(p.modificationTime)) return { at: p.modificationTime as number, source: 'modif' };
  return { source: 'aucune' };
}

/** De la plus ancienne a la plus recente ; les photos sans date a la fin, dans l'ordre du choix */
export function sortPhotos<T extends { at?: number }>(list: T[]): T[] {
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const x = a.p.at;
      const y = b.p.at;
      if (x === undefined && y === undefined) return a.i - b.i;
      if (x === undefined) return 1;
      if (y === undefined) return -1;
      return x === y ? a.i - b.i : x - y;
    })
    .map((x) => x.p);
}

/**
 * Les pesees : des photos triees, chacune a moins de 30 minutes de la precedente, font une seule pesee.
 * Une photo sans date est une pesee a elle seule. Indices dans la liste triee (0 pour la photo 1).
 */
export function groupSessions(sorted: { at?: number }[], gap: number = SAME_SESSION_MS): number[][] {
  const out: number[][] = [];
  let last: number | undefined;
  sorted.forEach((p, i) => {
    if (p.at === undefined) {
      out.push([i]);
      last = undefined;
      return;
    }
    if (last !== undefined && p.at - last < gap && out.length) out[out.length - 1].push(i);
    else out.push([i]);
    last = p.at;
  });
  return out;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Jour local AAAA-MM-JJ d'une date en ms */
export function isoDay(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** « 3 octobre 2026 à 8 h 12 » */
export function frenchDateTime(at: number): string {
  const d = new Date(at);
  const day = d.getDate() === 1 ? '1er' : String(d.getDate());
  return `${day} ${MOIS[d.getMonth()]} ${d.getFullYear()} à ${d.getHours()} h ${pad2(d.getMinutes())}`;
}

/** « 8 h 12 » */
export function frenchTime(at: number): string {
  const d = new Date(at);
  return `${d.getHours()} h ${pad2(d.getMinutes())}`;
}

/** Le nom de la copie envoyee : 2026-10-03_08h12_photo-01.jpg (sans-date_photo-03.jpg si aucune date) */
export function photoFileName(at: number | undefined, n: number, ext = 'jpg'): string {
  const num = `photo-${pad2(n)}`;
  if (at === undefined) return `sans-date_${num}.${ext}`;
  const d = new Date(at);
  return `${isoDay(at)}_${pad2(d.getHours())}h${pad2(d.getMinutes())}_${num}.${ext}`;
}

/** Le nom du document envoye : YOROI_photos_2026-10-03_au_2026-10-12.pdf */
export function documentName(sorted: { at?: number }[]): string {
  const days = sorted.filter((p) => p.at !== undefined).map((p) => isoDay(p.at as number));
  if (!days.length) return 'YOROI_photos.pdf';
  const first = days[0];
  const last = days[days.length - 1];
  return first === last ? `YOROI_photos_${first}.pdf` : `YOROI_photos_${first}_au_${last}.pdf`;
}

/** « Photo 1 : prise le 3 octobre 2026 à 8 h 12 ; » une ligne par photo, dans l'ordre */
export function photoListLines(sorted: { at?: number }[]): string[] {
  return sorted.map((p, i) => `Photo ${i + 1} : ${p.at !== undefined ? `prise le ${frenchDateTime(p.at)}` : 'date de prise inconnue'}`);
}

/** « 1, 2 et 3 » */
function andList(nums: number[]): string {
  if (nums.length <= 1) return nums.join('');
  return `${nums.slice(0, -1).join(', ')} et ${nums[nums.length - 1]}`;
}

/** Ce que YOROI ajoute a la fin de la consigne quand il connait les dates des photos */
export function photoSection(sorted: { at?: number }[]): string {
  if (!sorted.length) return '';
  const groups = groupSessions(sorted).filter((g) => g.length > 1);
  const lines = [
    'Dates de prise des photos, lues par YOROI sur mon téléphone :',
    ...photoListLines(sorted).map((l, i, all) => `${l}${i < all.length - 1 ? ' ;' : '.'}`),
    '',
    'Les photos sont numérotées dans cet ordre, de la plus ancienne à la plus récente. Elles peuvent arriver dans un document PDF, une photo par page avec son numéro et sa date en haut de la page, ou en fichiers nommés avec la date et le numéro, par exemple 2026-10-03_08h12_photo-01.jpg.',
    "Pour la date d'un bloc : si une date est visible sur l'écran, la capture, le ticket ou la note photographiés, elle prime (date_source: ecran ou ticket). Si aucune date n'est visible, utilise la date de prise de la photo donnée dans cette liste. Écris alors date_source: photo.",
    'Photos prises à moins de 30 minutes d’intervalle : c’est la même pesée, un seul bloc.',
    ...(groups.length ? [`Même pesée : ${groups.map((g) => `photos ${andList(g.map((i) => i + 1))}`).join(' ; ')}.`] : []),
    'Dans chaque bloc, ajoute la ligne photos: avec les numéros des photos lues pour ce bloc, par exemple photos: 1, 2, 3.',
  ];
  return lines.join('\n');
}

/** La consigne complete, avec la liste des dates des photos */
export function buildPhotoPrompt(sorted: { at?: number }[]): string {
  const extra = photoSection(sorted);
  return extra ? `${BALANCE_PROMPT}\n\n${extra}` : BALANCE_PROMPT;
}

export type PhotoDateGuess = { date: string; at: number; photo?: number };

/**
 * La date proposee pour un bloc rendu sans date :
 * - le bloc cite ses photos : la date de la premiere photo citee qui a une date ;
 * - il n'en cite aucune, mais toutes les photos datees sont du meme jour : ce jour-la ;
 * - sinon rien, l'app demande le jour.
 */
export function dateFromPhotos(refs: number[] | undefined, sorted: { at?: number }[]): PhotoDateGuess | undefined {
  if (!sorted.length) return undefined;
  for (const n of refs ?? []) {
    const p = sorted[n - 1];
    if (p?.at !== undefined) return { date: isoDay(p.at), at: p.at, photo: n };
  }
  if (refs?.length) return undefined;
  const dated = sorted.filter((p) => p.at !== undefined) as { at: number }[];
  if (!dated.length) return undefined;
  const day = isoDay(dated[0].at);
  return dated.every((p) => isoDay(p.at) === day) ? { date: day, at: dated[0].at } : undefined;
}

/**
 * NUIT 14 : la date d'un bloc. Celle lue sur la photo ou ecrite dans le bloc ; sinon la date de prise de la
 * photo citee par le bloc ; sinon aujourd'hui (s'il n'y a qu'une pesee sans date, pour ne pas en ranger deux
 * le meme jour). Les dates gardees d'un passage precedent (photos choisies plus tot) ne servent que si le
 * bloc cite ses photos : une reponse collee sans numero de photo ne prend jamais la date d'anciennes photos.
 */
export function blockDate(
  b: { date?: string; photos?: number[] },
  dates: { at?: number }[],
  fromThisVisit: boolean,
  undatedCount: number,
  today: string,
): { date: string; guess?: PhotoDateGuess; todayDefault?: boolean } {
  if (b.date) return { date: b.date };
  const usable = fromThisVisit || !!b.photos?.length ? dates : [];
  const guess = dateFromPhotos(b.photos, usable);
  if (guess) return { date: guess.date, guess };
  if (undatedCount <= 1) return { date: today, todayDefault: true };
  return { date: '' };
}

/** Les dates seules (jamais les photos), gardees un jour au cas ou le telephone ferme l'app pendant le passage par l'IA */
export type StoredPhotoDates = { savedAt: number; dates: (number | null)[] };
export const PHOTO_DATES_TTL = 24 * 60 * 60 * 1000;

export function readStoredDates(raw: string | null | undefined, now: number = Date.now()): { at?: number }[] {
  if (!raw) return [];
  try {
    const o = JSON.parse(raw) as StoredPhotoDates;
    if (!o || typeof o.savedAt !== 'number' || now - o.savedAt > PHOTO_DATES_TTL || !Array.isArray(o.dates)) return [];
    return o.dates.map((d) => (typeof d === 'number' && Number.isFinite(d) ? { at: d } : {}));
  } catch {
    return [];
  }
}

/**
 * BALANCE 3 : d'ou vient la date proposee pour un bloc. Jamais de date silencieuse : l'app la montre
 * (« Date détectée : 12 oct. (écran de la balance). C'est bon ? ») et attend Oui ou Changer.
 * - ecran, ticket, photo : la date ecrite par l'IA avec sa source ;
 * - lue : un ancien bloc avec une date mais sans date_source ;
 * - exif : l'IA n'a pas trouve de date, YOROI a la date de prise de la photo ;
 * - aujourdhui : aucune date nulle part, une seule pesee : aujourd'hui, a confirmer ;
 * - aucune : a choisir.
 */
export type ProposalSource = Exclude<DateSource, 'inconnue'> | 'lue' | 'exif' | 'aujourdhui' | 'aucune';

export type DateProposal = {
  date: string;
  source: ProposalSource;
  /** la date de prise de la photo (YOROI) quand elle sert ou quand elle contredit l'IA */
  photo?: PhotoDateGuess;
  /** la date de prise de la photo est un autre jour que celle de l'IA : les deux se montrent, tu choisis */
  conflict?: PhotoDateGuess;
};

export function dateProposal(
  b: { date?: string; dateSource?: DateSource; photos?: number[]; yearAdded?: boolean },
  dates: { at?: number }[],
  fromThisVisit: boolean,
  undatedCount: number,
  today: string,
): DateProposal {
  const usable = fromThisVisit || !!b.photos?.length ? dates : [];
  const guess = dateFromPhotos(b.photos, usable);
  if (b.date) {
    const source: ProposalSource = b.dateSource && b.dateSource !== 'inconnue' ? b.dateSource : 'lue';
    if (guess && guess.date !== b.date) return { date: b.date, source, conflict: guess };
    return { date: b.date, source, ...(guess ? { photo: guess } : {}) };
  }
  if (guess) return { date: guess.date, source: 'exif', photo: guess };
  if (undatedCount <= 1) return { date: today, source: 'aujourdhui' };
  return { date: '', source: 'aucune' };
}

/** « écran de la balance », « date de prise de la photo 3 »... pour « Date détectée : 12 oct. (...) » */
export function proposalLabel(p: DateProposal, yearAdded?: boolean): string {
  switch (p.source) {
    case 'ecran':
      return yearAdded ? 'écran de la balance, année ajoutée' : 'écran de la balance';
    case 'ticket':
      return yearAdded ? 'ticket, année ajoutée' : 'ticket';
    case 'photo':
      return 'date de prise de vue, lue par l’IA';
    case 'lue':
      return yearAdded ? 'lue sur la photo, année ajoutée' : 'lue sur la photo par l’IA';
    case 'exif':
      return p.photo?.photo ? `date de prise de la photo ${p.photo.photo}` : 'jour de prise de tes photos';
    case 'aujourdhui':
      return 'aucune date trouvée, aujourd’hui par défaut';
    default:
      return 'aucune date trouvée';
  }
}
