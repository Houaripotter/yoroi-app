/**
 * Module photo YOROI : visages et detourage de ta photo, 100 % sur l'appareil.
 * iPhone, iPad, Mac (Designed for iPad) : Apple Vision. Android : Google ML Kit, modeles dans l'app.
 * Aucune photo n'est envoyee. Aucune permission. Aucun reseau.
 *
 * Toujours une reponse, jamais d'erreur : sans module natif (Expo Go, tests, build sans le module), avec une photo
 * illisible, ou si le natif tarde, on rend REPONSE_VIDE. La carte retombe alors sur la zone sure.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { CapacitesPhoto, MasqueNatif, ReponseNative, VisageNatif } from './src/YoroiPhoto.types';

export * from './src/YoroiPhoto.types';

type ModuleNatif = {
  analyserPhoto(uri: string, tailleMax: number): Promise<ReponseNative>;
  capacites(): CapacitesPhoto;
};

const natif = requireOptionalNativeModule<ModuleNatif>('YoroiPhoto');

/** Au-dela, on rend la reponse vide (le natif continue, sa reponse sera ignoree) */
export const DELAI_ANALYSE_MS = 20_000;

/**
 * Grand cote de la copie analysee, en pixels. LE reglage de la taille : 1024 en attendant le verdict du banc
 * (1024 contre 1440, banc/comparer.py). Le natif borne entre TAILLE_ANALYSE_MIN et TAILLE_ANALYSE_MAX.
 */
export const TAILLE_ANALYSE_DEFAUT = 1024;
export const TAILLE_ANALYSE_MIN = 512;
export const TAILLE_ANALYSE_MAX = 2048;
/** Les deux tailles comparees par le banc photo */
export const TAILLES_BANC = [1024, 1440] as const;

/** Une taille demandee, ramenee a un entier entre le min et le max ; la taille par defaut si elle ne se lit pas */
export function tailleAnalyse(px?: number | null): number {
  if (typeof px !== 'number' || !Number.isFinite(px)) return TAILLE_ANALYSE_DEFAUT;
  return Math.min(TAILLE_ANALYSE_MAX, Math.max(TAILLE_ANALYSE_MIN, Math.round(px)));
}

export const REPONSE_VIDE: ReponseNative = Object.freeze({
  visages: [],
  masque: null,
  lumiere: null,
  plateforme: null,
  moteur: '',
  versionModele: '',
  largeur: 0,
  hauteur: 0,
  largeurPhoto: 0,
  hauteurPhoto: 0,
  detourageDisponible: false,
  erreurs: [],
}) as ReponseNative;

export function moduleDisponible(): boolean {
  return !!natif;
}

export function capacites(): CapacitesPhoto {
  try {
    if (natif) return natif.capacites();
  } catch {
    // module present mais en echec : comme absent
  }
  return { visages: false, detourage: false, plateforme: null, moteur: '', versionModele: '' };
}

const nombre = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const part = (v: unknown): number | null => {
  const n = nombre(v);
  return n === null ? null : Math.min(Math.max(n, -1), 2);
};

function visage(v: Partial<VisageNatif> | null | undefined): VisageNatif | null {
  if (!v) return null;
  const x = part(v.x);
  const y = part(v.y);
  const w = nombre(v.w);
  const h = nombre(v.h);
  if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) return null;
  const out: VisageNatif = { x, y, w, h, confiance: nombre(v.confiance) };
  if (v.reperes && typeof v.reperes === 'object') out.reperes = v.reperes;
  if (nombre(v.lacet) !== null) out.lacet = v.lacet as number;
  if (nombre(v.roulis) !== null) out.roulis = v.roulis as number;
  return out;
}

function masque(m: Partial<MasqueNatif> | null | undefined): MasqueNatif | null {
  if (!m || typeof m.pixels !== 'string' || !m.pixels) return null;
  const largeur = nombre(m.largeur);
  const hauteur = nombre(m.hauteur);
  if (!largeur || !hauteur) return null;
  return { uri: typeof m.uri === 'string' ? m.uri : '', largeur, hauteur, personnes: nombre(m.personnes), pixels: m.pixels };
}

/** Remet en forme une reponse du natif, champ par champ : rien de faux ne passe */
export function normaliserReponse(r: Partial<ReponseNative> | null | undefined): ReponseNative {
  if (!r || typeof r !== 'object') return { ...REPONSE_VIDE, visages: [], erreurs: [] };
  const lum = nombre(r.lumiere);
  return {
    visages: Array.isArray(r.visages) ? (r.visages.map(visage).filter(Boolean) as VisageNatif[]) : [],
    masque: masque(r.masque),
    lumiere: lum === null ? null : Math.min(Math.max(lum, 0), 1),
    plateforme: r.plateforme === 'ios' || r.plateforme === 'ipados' || r.plateforme === 'macos' || r.plateforme === 'android' ? r.plateforme : null,
    moteur: typeof r.moteur === 'string' ? r.moteur : '',
    versionModele: typeof r.versionModele === 'string' ? r.versionModele : '',
    largeur: nombre(r.largeur) ?? 0,
    hauteur: nombre(r.hauteur) ?? 0,
    largeurPhoto: nombre(r.largeurPhoto) ?? nombre(r.largeur) ?? 0,
    hauteurPhoto: nombre(r.hauteurPhoto) ?? nombre(r.hauteur) ?? 0,
    detourageDisponible: r.detourageDisponible === true,
    erreurs: Array.isArray(r.erreurs) ? r.erreurs.filter((e) => typeof e === 'string') : [],
    dureeMs: nombre(r.dureeMs) ?? undefined,
    tailleMax: nombre(r.tailleMax) ?? undefined,
    memoireAvantMo: nombre(r.memoireAvantMo) ?? undefined,
    memoireApresMo: nombre(r.memoireApresMo) ?? undefined,
    memoirePicMo: nombre(r.memoirePicMo) ?? undefined,
  };
}

/**
 * Analyse une photo deja copiee dans le cache de l'app (file://). La copie est redressee et reduite par le natif,
 * a TAILLE_ANALYSE_DEFAUT (1024 px) sur le grand cote, ou a options.tailleMax (le banc compare 1024 et 1440).
 * Jamais d'erreur : la reponse vide si quelque chose manque.
 */
export async function analyserPhoto(uri: string | null | undefined, options?: { tailleMax?: number }): Promise<ReponseNative> {
  if (!natif || !uri || typeof uri !== 'string') return { ...REPONSE_VIDE, visages: [], erreurs: [] };
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    const delai = new Promise<null>((ok) => {
      minuteur = setTimeout(() => ok(null), DELAI_ANALYSE_MS);
    });
    const r = await Promise.race([natif.analyserPhoto(uri, tailleAnalyse(options?.tailleMax)), delai]);
    if (r === null) return { ...REPONSE_VIDE, visages: [], erreurs: ['delai'] };
    return normaliserReponse(r);
  } catch {
    return { ...REPONSE_VIDE, visages: [], erreurs: ['module'] };
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

/** Decode les pixels du masque (base64, 1 octet par pixel). null si la taille ne colle pas */
export function decoderPixels(m: MasqueNatif | null | undefined): Uint8Array | null {
  if (!m || !m.pixels) return null;
  try {
    const octets = base64VersOctets(m.pixels);
    return octets.length === m.largeur * m.hauteur ? octets : null;
  } catch {
    return null;
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const TABLE = (() => {
  const t = new Int16Array(256).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) t[ALPHABET.charCodeAt(i)] = i;
  t['-'.charCodeAt(0)] = 62;
  t['_'.charCodeAt(0)] = 63;
  return t;
})();

/** base64 vers octets, sans dependance (Hermes n'a pas Buffer) */
export function base64VersOctets(s: string): Uint8Array {
  let n = s.length;
  while (n > 0 && (s.charCodeAt(n - 1) === 61 || s.charCodeAt(n - 1) <= 32)) n--;
  const out = new Uint8Array(Math.floor((n * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < n; i++) {
    const v = TABLE[s.charCodeAt(i) & 255];
    if (v < 0) continue; // retours a la ligne, espaces
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  return o === out.length ? out : out.slice(0, o);
}
