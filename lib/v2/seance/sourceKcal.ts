/**
 * D'ou viennent les kcal d'une seance (2 novembre 2026, cartes v7). Fonctions pures, sans base.
 *
 * Trois colonnes de `trainings` (lib/database.native.ts) :
 *   calories_source   'saisie' | 'sante' | 'appareil' | 'inconnue' | vide
 *   calories_appareil 'Apple Watch', 'Garmin', 'Montre YOROI'... ou vide
 *   calories_mesurees les kcal telles que recues de l'appareil ou de Sante (garde-fou des cartes), sinon vide
 *
 * Les anciennes seances gardent les 3 colonnes vides : on ne sait pas d'ou viennent leurs kcal.
 * Les cartes de partage ne montrent les kcal que si elles sont mesurees et pas retouchees (kcalMesureesIntactes).
 *
 * RETOUR ARRIERE : arreter de lire et d'ecrire ces colonnes (kcalPourCarte renvoie de nouveau undefined).
 * Rien n'est supprime de la base.
 */

export type SourceKcal = 'saisie' | 'sante' | 'appareil' | 'inconnue';

export const SOURCES_KCAL: readonly SourceKcal[] = ['saisie', 'sante', 'appareil', 'inconnue'];

export interface ChampsSourceKcal {
  calories_source: SourceKcal | null;
  calories_appareil: string | null;
  calories_mesurees: number | null;
}

/** Les 3 colonnes vides (kcal effacees, ancienne seance) */
export const SANS_SOURCE_KCAL: Readonly<ChampsSourceKcal> = Object.freeze({
  calories_source: null,
  calories_appareil: null,
  calories_mesurees: null,
});

/** Libelle de la montre YOROI (calories_appareil) */
export const APPAREIL_MONTRE_YOROI = 'Montre YOROI';

const nombre = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const texte = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, 80) : null;
};

/** Valeur de la colonne calories_source, ou null si absente ou inconnue de cette version */
export function normaliserSourceKcal(v: unknown): SourceKcal | null {
  return typeof v === 'string' && (SOURCES_KCAL as readonly string[]).includes(v) ? (v as SourceKcal) : null;
}

/** Des kcal a garder : un nombre strictement positif */
export const kcalPositives = (v: unknown): number | null => {
  const n = nombre(v);
  return n != null && n > 0 ? n : null;
};

/**
 * Les 3 champs pour des kcal recues d'un appareil ou de Sante (import, montre YOROI).
 * Sans kcal : les 3 vides. `calories_mesurees` = exactement les kcal enregistrees dans la seance.
 */
export function champsKcalMesurees(calories: unknown, source: 'appareil' | 'sante', appareil?: string | null): ChampsSourceKcal {
  const kcal = kcalPositives(calories);
  if (kcal == null) return { ...SANS_SOURCE_KCAL };
  return { calories_source: source, calories_appareil: texte(appareil ?? null), calories_mesurees: kcal };
}

/** Les 3 champs pour des kcal tapees a la main (ou modifiees a la main) */
export function champsKcalSaisie(calories: unknown): ChampsSourceKcal {
  if (kcalPositives(calories) == null) return { ...SANS_SOURCE_KCAL };
  return { calories_source: 'saisie', calories_appareil: null, calories_mesurees: null };
}

/**
 * Ce que la base doit ecrire dans les 3 colonnes quand une seance recoit `data` (ajout ou modification).
 * - kcal fournies et vides (null, 0) : les 3 colonnes sont effacees ;
 * - une des 3 colonnes fournie : elles sont ecrites, rendues coherentes (source inconnue de cette version = vide) ;
 * - sinon : null, on ne touche a rien (jamais d'effacement par oubli).
 */
export function colonnesSourceKcal(data: Record<string, unknown>): ChampsSourceKcal | null {
  if ('calories' in data && kcalPositives(data.calories) == null) return { ...SANS_SOURCE_KCAL };
  const fournie = data.calories_source !== undefined || data.calories_appareil !== undefined || data.calories_mesurees !== undefined;
  if (!fournie) return null;
  const source = normaliserSourceKcal(data.calories_source);
  if (!source) return { ...SANS_SOURCE_KCAL };
  const mesurees = source === 'appareil' || source === 'sante' ? kcalPositives(data.calories_mesurees) : null;
  return {
    calories_source: source,
    calories_appareil: source === 'saisie' ? null : texte(data.calories_appareil),
    calories_mesurees: mesurees != null ? Math.round(mesurees) : null,
  };
}

/**
 * Apres une saisie a la main du champ kcal d'une seance qui existe deja :
 * - kcal inchangees : undefined, on ne touche pas a la source (modification d'autre chose) ;
 * - kcal effacees : les 3 colonnes vides ;
 * - kcal changees : 'saisie', plus d'appareil ni de valeur mesuree.
 */
export function sourceApresSaisieKcal(
  avant: { calories?: unknown } | null | undefined,
  nouvelles: unknown,
): ChampsSourceKcal | undefined {
  const a = kcalPositives(avant?.calories);
  const n = kcalPositives(nouvelles);
  if (a != null && n != null && Math.round(a) === Math.round(n)) return undefined;
  if (a == null && n == null) return undefined;
  return n == null ? { ...SANS_SOURCE_KCAL } : champsKcalSaisie(n);
}

/**
 * Le garde-fou des cartes : des kcal mesurees (appareil ou Sante), egales a celles recues, superieures a 0.
 * Tout le reste (saisie, inconnue, ancienne seance sans source, kcal retouchees par n'importe quel chemin) : non.
 */
export function kcalMesureesIntactes(t: {
  calories?: unknown;
  calories_source?: unknown;
  calories_mesurees?: unknown;
} | null | undefined): number | undefined {
  if (!t) return undefined;
  const source = normaliserSourceKcal(t.calories_source);
  if (source !== 'appareil' && source !== 'sante') return undefined;
  const kcal = kcalPositives(t.calories);
  const mesurees = kcalPositives(t.calories_mesurees);
  if (kcal == null || mesurees == null || kcal !== mesurees) return undefined;
  return kcal;
}

// ============================================
// CLASSEMENT A L'IMPORT (Apple Sante, Health Connect)
// ============================================

export interface ClassementKcal {
  source: 'saisie' | 'sante' | 'appareil';
  appareil: string | null;
}

/** Marques de montres, bracelets et capteurs reconnues (nom normalise ou nom de paquet) -> libelle */
const MARQUES_APPAREIL: readonly [RegExp, string][] = [
  [/apple[_ ]?watch/i, 'Apple Watch'],
  [/garmin/i, 'Garmin'],
  [/polar/i, 'Polar'],
  [/coros/i, 'Coros'],
  [/suunto/i, 'Suunto'],
  [/wahoo|elemnt/i, 'Wahoo'],
  [/whoop/i, 'Whoop'],
  [/amazfit|zepp|huami/i, 'Amazfit'],
  [/huawei/i, 'Huawei'],
  [/samsung|galaxy|shealth/i, 'Samsung'],
  [/fitbit/i, 'Fitbit'],
];

const marque = (v: unknown): string | null => {
  if (typeof v !== 'string' || !v.trim()) return null;
  for (const [re, nom] of MARQUES_APPAREIL) if (re.test(v)) return nom;
  return null;
};

/** Ce que l'import iPhone sait d'une seance d'Apple Sante (@kingstinct/react-native-healthkit) */
export interface SeanceSanteIOS {
  metadataWasUserEntered?: boolean | null;
  metadata?: Record<string, unknown> | null;
  sourceRevision?: { productType?: string | null; source?: { name?: string | null; bundleIdentifier?: string | null } | null } | null;
  device?: { name?: string | null; model?: string | null; manufacturer?: string | null } | null;
  /** seance lue par le chemin de secours natif (YoroiHealthKitModule.swift) : ni appareil ni saisie connus */
  secoursNatif?: boolean;
}

/**
 * D'ou viennent les kcal d'une seance d'Apple Sante, dans cet ordre :
 * 1. tapee a la main dans Sante : 'saisie' ;
 * 2. productType « Watch... » ou modele « Watch » : 'appareil', « Apple Watch » ;
 * 3. un appareil nomme qui n'est pas un iPhone ni un iPad : 'appareil', avec sa marque ou son modele ;
 * 4. source reconnue comme une marque de montre (Garmin, Polar...) : 'appareil', avec la marque ;
 * 5. sinon (Sante, iPhone seul, Strava, autre app) : 'sante'.
 * Chemin de secours natif : 'sante', appareil vide (les champs n'arrivent pas de Swift).
 */
export function classerKcalSanteIOS(w: SeanceSanteIOS | null | undefined): ClassementKcal {
  if (!w || w.secoursNatif) return { source: 'sante', appareil: null };
  if (w.metadataWasUserEntered === true || w.metadata?.HKWasUserEntered === true) return { source: 'saisie', appareil: null };
  const productType = String(w.sourceRevision?.productType ?? '');
  const d = w.device ?? null;
  const modele = String(d?.model ?? '').trim();
  if (/^watch/i.test(productType) || /^watch$/i.test(modele)) return { source: 'appareil', appareil: 'Apple Watch' };
  const nomAppareil = [d?.manufacturer, d?.model, d?.name].map((v) => String(v ?? '').trim()).filter(Boolean);
  const telephone = /iphone|ipad|ipod/i.test(`${productType} ${nomAppareil.join(' ')}`);
  if (nomAppareil.length && !telephone) {
    const m = marque(nomAppareil.join(' '));
    // jamais le nom donne a l'appareil (« Montre de Houari ») : la marque, sinon le modele
    return { source: 'appareil', appareil: m ?? (modele || texte(d?.manufacturer) || null) };
  }
  const m = marque(w.sourceRevision?.source?.name) ?? marque(w.sourceRevision?.source?.bundleIdentifier);
  if (m) return { source: 'appareil', appareil: m };
  return { source: 'sante', appareil: null };
}

/** Metadonnees Health Connect (react-native-health-connect) d'un enregistrement */
export interface MetaHealthConnect {
  dataOrigin?: string | { packageName?: string } | null;
  device?: { manufacturer?: string | null; model?: string | null; type?: number | null } | null;
  recordingMethod?: number | null;
}

/** Health Connect, Device.type : montre (1, absente de l'enumeration de la librairie), bague, bracelet, ceinture cardio */
const TYPES_APPAREIL_HC = new Set([1, 4, 6, 7]);
const HC_SAISIE = 3;
const HC_AUTOMATIQUE = 2;

const origineHC = (m: MetaHealthConnect): string => {
  const o = m.dataOrigin;
  return String((typeof o === 'object' && o ? o.packageName : o) ?? '').trim().toLowerCase();
};

/**
 * D'ou viennent les kcal d'une seance Health Connect, sur les enregistrements d'ou viennent vraiment les kcal
 * (la seance elle-meme, ou les enregistrements « calories totales » additionnes), dans cet ordre :
 * 1. un enregistrement saisi a la main : 'saisie' ;
 * 2. origines melangees (plusieurs apps) : 'sante' ;
 * 3. appareil de type montre, bague, bracelet ou ceinture cardio : 'appareil', avec fabricant et modele ;
 * 4. enregistrement automatique : 'appareil' ;
 * 5. paquet d'une marque connue (Garmin, Samsung Health...) : 'appareil', avec la marque ;
 * 6. sinon : 'sante'.
 */
export function classerKcalHealthConnect(metas: readonly (MetaHealthConnect | null | undefined)[]): ClassementKcal {
  const liste = metas.filter((m): m is MetaHealthConnect => !!m);
  if (!liste.length) return { source: 'sante', appareil: null };
  if (liste.some((m) => Number(m.recordingMethod) === HC_SAISIE)) return { source: 'saisie', appareil: null };
  const origines = new Set(liste.map(origineHC).filter(Boolean));
  if (origines.size > 1) return { source: 'sante', appareil: null };
  const paquet = [...origines][0] ?? '';
  const libelle = (m: MetaHealthConnect): string | null => {
    const fab = String(m.device?.manufacturer ?? '').trim();
    const mod = String(m.device?.model ?? '').trim();
    const brut = mod && fab && !mod.toLowerCase().includes(fab.toLowerCase()) ? `${fab} ${mod}` : (mod || fab);
    return texte(brut) ?? marque(paquet);
  };
  const montre = liste.find((m) => TYPES_APPAREIL_HC.has(Number(m.device?.type)));
  if (montre) return { source: 'appareil', appareil: libelle(montre) };
  if (liste.every((m) => Number(m.recordingMethod) === HC_AUTOMATIQUE)) return { source: 'appareil', appareil: libelle(liste[0]) };
  const m = marque(paquet);
  if (m) return { source: 'appareil', appareil: m };
  return { source: 'sante', appareil: null };
}

/** Les 3 colonnes d'une seance importee, a partir de ses kcal et du classement */
export function champsKcalImport(calories: unknown, c: ClassementKcal): ChampsSourceKcal {
  if (c.source === 'saisie') return champsKcalSaisie(calories);
  return champsKcalMesurees(calories, c.source, c.appareil);
}
