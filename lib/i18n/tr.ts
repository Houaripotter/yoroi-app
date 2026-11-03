// ============================================
// YOROI : traduction des textes de l'app
// Le français écrit dans le code reste la source. traduire() le remplace par la traduction
// de la langue du téléphone, si elle existe. Fonctions : traduire() et traduirePluriel(). En français, le texte est rendu à l'identique.
// Dictionnaires : lib/i18n/dict/<langue>.json, clé = phrase française (espaces réduits).
// Outils : scripts/i18n (catalogue, contrôle, branchement).
// ============================================


/**
 * LES LANGUES DE YOROI : une ligne par langue, c'est le seul endroit à remplir pour en ajouter une.
 * Puis : python3 scripts/i18n/langues.py ajouter <code> (dictionnaire, montre, widgets, Android, réglages).
 * Le test __tests__/unit/languesCompletes.test.ts dit ce qui manque encore.
 * nom, drapeau, code : choix de la langue dans l'app. locale : dates et nombres. systeme : code iOS et Android.
 * decimal et milliers : séparateurs des nombres. jours : lettres des jours, lundi en premier.
 * unSingulier : 0 et 1 au singulier (comme le français), sinon singulier pour 1 seulement.
 */
const NBSP = '\u00A0';
const REGISTRE = {
  fr: { nom: 'Français', drapeau: '🇫🇷', code: 'FR', locale: 'fr-FR', systeme: 'fr', decimal: ',', milliers: NBSP, jours: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], unSingulier: true, dict: () => ({}) },
  en: { nom: 'English', drapeau: '🇬🇧', code: 'EN', locale: 'en-US', systeme: 'en', decimal: '.', milliers: ',', jours: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], unSingulier: false, dict: () => require('./dict/en.json') },
  de: { nom: 'Deutsch', drapeau: '🇩🇪', code: 'DE', locale: 'de-DE', systeme: 'de', decimal: ',', milliers: NBSP, jours: ['M', 'D', 'M', 'D', 'F', 'S', 'S'], unSingulier: false, dict: () => require('./dict/de.json') },
  nl: { nom: 'Nederlands', drapeau: '🇳🇱', code: 'NL', locale: 'nl-NL', systeme: 'nl', decimal: ',', milliers: NBSP, jours: ['M', 'D', 'W', 'D', 'V', 'Z', 'Z'], unSingulier: false, dict: () => require('./dict/nl.json') },
  es: { nom: 'Español', drapeau: '🇪🇸', code: 'ES', locale: 'es-ES', systeme: 'es', decimal: ',', milliers: NBSP, jours: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], unSingulier: false, dict: () => require('./dict/es.json') },
  pt: { nom: 'Português', drapeau: '🇧🇷', code: 'PT', locale: 'pt-BR', systeme: 'pt-BR', decimal: ',', milliers: NBSP, jours: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'], unSingulier: true, dict: () => require('./dict/pt.json') },
  it: { nom: 'Italiano', drapeau: '🇮🇹', code: 'IT', locale: 'it-IT', systeme: 'it', decimal: ',', milliers: NBSP, jours: ['L', 'M', 'M', 'G', 'V', 'S', 'D'], unSingulier: false, dict: () => require('./dict/it.json') },
} as const;

export type Lang = keyof typeof REGISTRE;

/** Langues proposées, dans l'ordre du registre. Une langue absente retombe sur l'anglais. */
export const LANGUES_ACTIVES: readonly Lang[] = Object.keys(REGISTRE) as Lang[];

/** Lancement en français seul : mettre à true pour forcer le français partout. */
const FRANCAIS_FORCE = false;

/** Nom, drapeau, code et réglages de chaque langue (le registre ci dessus). */
export const LANGUES_INFO: Record<Lang, { nom: string; drapeau: string; code: string; locale: string; systeme: string; decimal: string; milliers: string; jours: readonly string[]; unSingulier: boolean }> = REGISTRE;

/** iPhone : la langue de l'app dans les réglages iOS (AppleLanguages), si c'est une langue de YOROI. */
function langueIOS(): Lang | null {
  try {
    const { Platform, Settings } = require('react-native');
    if (Platform.OS !== 'ios') return null;
    const v = Settings.get('AppleLanguages');
    const code = String(Array.isArray(v) ? v[0] ?? '' : '').slice(0, 2).toLowerCase();
    return (LANGUES_ACTIVES as readonly string[]).includes(code) ? (code as Lang) : null;
  } catch {
    return null;
  }
}

/** Langue choisie dans l'app, gardée dans le trousseau (lecture immédiate au démarrage). */
const CLE_LANGUE = 'yoroi_langue';
function langueEnregistree(): Lang | null {
  try {
    const v = require('expo-secure-store').getItem(CLE_LANGUE) as string | null;
    return v && (LANGUES_ACTIVES as readonly string[]).includes(v) ? (v as Lang) : null;
  } catch {
    return null;
  }
}

function detect(): Lang {
  if (FRANCAIS_FORCE) return 'fr';
  // Tests automatiques : toujours en français, pour vérifier que le texte d'origine est intact
  if (typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID) return 'fr';
  const choisie = langueEnregistree();
  if (choisie) {
    // iPhone : si la langue a été changée dans Réglages, YOROI, Langue, c'est ce choix là qui compte
    const ios = langueIOS();
    if (ios && ios !== choisie) {
      try { require('expo-secure-store').setItem(CLE_LANGUE, ios); } catch { /* rien */ }
      return ios;
    }
    return choisie;
  }
  try {
    // chargé ici seulement : les tests qui simulent react-native n'ont pas le module de langue
    const { getLocales } = require('expo-localization');
    const locales: { languageCode?: string | null }[] = getLocales();
    for (const l of locales ?? []) {
      const code = (l.languageCode ?? '').toLowerCase() as Lang;
      if (LANGUES_ACTIVES.includes(code)) return code;
    }
    return LANGUES_ACTIVES.includes('en') ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

/** Langue de l'app, fixée au démarrage : celle choisie dans l'app, sinon celle du téléphone. */
export const LANG: Lang = detect();

/** Change la langue de l'app : le choix est gardé, puis l'app redémarre pour tout afficher dans la nouvelle langue. */
export async function choisirLangue(l: Lang): Promise<void> {
  if (!(LANGUES_ACTIVES as readonly string[]).includes(l)) return;
  try {
    require('expo-secure-store').setItem(CLE_LANGUE, l);
  } catch {
    return;
  }
  // iPhone : la même langue pour les textes du système (autorisations, Siri) au prochain lancement
  try {
    const { Platform, Settings } = require('react-native');
    if (Platform.OS === 'ios') Settings.set({ AppleLanguages: [REGISTRE[l].systeme] });
  } catch {
    // sans effet : seule l'app change de langue
  }
  if (l === LANG) return;
  try {
    await require('expo').reloadAppAsync('langue');
  } catch {
    // relance impossible : la langue s'appliquera au prochain lancement
  }
}

/** Dictionnaire d'une langue (lecture seule), chargé une seule fois. Vide en français. */
const dicts: Partial<Record<Lang, Record<string, string>>> = {};
export function dictionnaire(l: Lang): Record<string, string> {
  const deja = dicts[l];
  if (deja) return deja;
  let d: Record<string, string> = {};
  try {
    d = REGISTRE[l].dict() as Record<string, string>;
  } catch {
    d = {};
  }
  dicts[l] = d;
  return d;
}
function load(): Record<string, string> {
  return dictionnaire(LANG);
}

const BORDS = /^(\s*)([\s\S]*?)(\s*)$/;

/** Traduit une phrase française. Les {0}, {1} sont remplacés par les valeurs, après traduction. */
export function traduire(fr: string, ...valeurs: unknown[]): string;
export function traduire(fr: string | undefined, ...valeurs: unknown[]): string | undefined;
export function traduire(fr: string | null | undefined, ...valeurs: unknown[]): string | null | undefined;
export function traduire(fr: string | null | undefined, ...valeurs: unknown[]): string | null | undefined {
  // Une valeur vide passe telle quelle (traduction à l'affichage d'un champ facultatif)
  if (typeof fr !== 'string') return fr;
  let out = fr;
  if (LANG !== 'fr') {
    const m = BORDS.exec(fr);
    if (m) {
      const t = load()[m[2].replace(/\s+/g, ' ')];
      if (t !== undefined) out = m[1] + t + m[3];
    }
  }
  if (valeurs.length === 0) return out;
  return out.replace(/\{(\d+)\}/g, (tout, i) => {
    const k = Number(i);
    return k < valeurs.length ? String(valeurs[k]) : tout;
  });
}

/**
 * Même mot français, deux sens selon l'écran (« Taille » : hauteur ou tour de taille).
 * Cherche la clé « fr§sens » dans le dictionnaire, sinon fait comme traduire(fr). Le français ne change pas.
 */
export function traduireSens(sens: string, fr: string, ...valeurs: unknown[]): string {
  const t = LANG !== 'fr' ? load()[`${fr}§${sens}`] : undefined;
  if (t === undefined) return traduire(fr, ...valeurs);
  if (valeurs.length === 0) return t;
  return t.replace(/\{(\d+)\}/g, (tout, i) => {
    const k = Number(i);
    return k < valeurs.length ? String(valeurs[k]) : tout;
  });
}

/** Règle de pluriel d'une langue autre que le français (unSingulier du registre). */
export function plurielDe(l: Lang, n: number): boolean {
  return REGISTRE[l].unSingulier ? Math.abs(Number(n)) >= 2 : Number(n) !== 1;
}

/**
 * Pluriel. plurielFr garde exactement la règle d'origine du code pour le français.
 * Les autres langues suivent leur règle : singulier pour 1 seulement.
 */
export function traduirePluriel(n: number, plurielFr: boolean, un: string, plusieurs: string, ...valeurs: unknown[]): string {
  const pluriel = LANG === 'fr' ? plurielFr : plurielDe(LANG, n);
  return traduire(pluriel ? plusieurs : un, ...valeurs);
}

/** Locale pour les dates et les nombres (toLocaleDateString, Intl). */
export const LOCALE: string = REGISTRE[LANG].locale;

/**
 * Hors français : jour et mois dans l'ordre de la langue (« Nov 3 », « 3. Nov. », « 3 nov »).
 * Le français garde ses propres textes (« 3 nov. », « 1er »), cette fonction n'est appelée que si LANG !== 'fr'.
 */
export function jourMois(d: Date, avecAnnee = false, mois: 'short' | 'long' = 'short'): string {
  return d.toLocaleDateString(LOCALE, avecAnnee ? { day: 'numeric', month: mois, year: 'numeric' } : { day: 'numeric', month: mois });
}

/**
 * Hors français : une plage de jours (« from Nov 2 to 8 », « vom 2. Nov. bis 8. Nov. »), par la clé « du {0} au {1} ».
 * suffixe : l'année ajoutée à la fin (« 2025 »), vide sinon.
 */
export function plageJours(a: Date, b: Date, cle = 'du {0} au {1}', suffixe = ''): string {
  const memeMois = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const fin = (LANG === 'en' && memeMois ? String(b.getDate()) : jourMois(b)) + (suffixe ? (LANG === 'en' ? ',' : '') + ' ' + suffixe.trim() : '');
  return traduire(cle, jourMois(a), fin);
}

/** Séparateur décimal de la langue : virgule en français, allemand, néerlandais ; point en anglais. */
export const DECIMAL: string = REGISTRE[LANG].decimal;

/** Séparateur des milliers de la langue : espace insécable en français, virgule en anglais. */
export const MILLIERS: string = REGISTRE[LANG].milliers;

/**
 * Lettres des jours, lundi en premier, dans la langue de l'app (« L M M J V S D » en français, inchangé).
 * Même table que lib/v2/sante/anneauxJours.ts, sans rien importer.
 */
export const JOURS_LETTRES: string[] = [...REGISTRE[LANG].jours];
