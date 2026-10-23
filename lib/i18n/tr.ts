// ============================================
// YOROI : traduction des textes de l'app
// Le français écrit dans le code reste la source. traduire() le remplace par la traduction
// de la langue du téléphone, si elle existe. Fonctions : traduire() et traduirePluriel(). En français, le texte est rendu à l'identique.
// Dictionnaires : lib/i18n/dict/<langue>.json, clé = phrase française (espaces réduits).
// Outils : scripts/i18n (catalogue, contrôle, branchement).
// ============================================

import { getLocales } from 'expo-localization';

export type Lang = 'fr' | 'en' | 'de' | 'nl' | 'es' | 'pt' | 'it';

/** Langues proposées. Une langue absente de cette liste retombe sur l'anglais. */
export const LANGUES_ACTIVES: readonly Lang[] = ['fr', 'en', 'de', 'nl', 'es', 'pt', 'it'];

/** Lancement en français seul : mettre à true pour forcer le français partout. */
const FRANCAIS_FORCE = false;

/** Nom, drapeau et code de chaque langue, pour le choix de la langue dans l'app. */
export const LANGUES_INFO: Record<Lang, { nom: string; drapeau: string; code: string }> = {
  fr: { nom: 'Français', drapeau: '🇫🇷', code: 'FR' },
  en: { nom: 'English', drapeau: '🇬🇧', code: 'EN' },
  de: { nom: 'Deutsch', drapeau: '🇩🇪', code: 'DE' },
  nl: { nom: 'Nederlands', drapeau: '🇳🇱', code: 'NL' },
  es: { nom: 'Español', drapeau: '🇪🇸', code: 'ES' },
  pt: { nom: 'Português', drapeau: '🇧🇷', code: 'PT' },
  it: { nom: 'Italiano', drapeau: '🇮🇹', code: 'IT' },
};

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
    const locales = getLocales();
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
    if (Platform.OS === 'ios') Settings.set({ AppleLanguages: [l === 'pt' ? 'pt-BR' : l] });
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

let dict: Record<string, string> | null = null;
function load(): Record<string, string> {
  if (dict) return dict;
  try {
    switch (LANG) {
      case 'en': dict = require('./dict/en.json'); break;
      case 'de': dict = require('./dict/de.json'); break;
      case 'nl': dict = require('./dict/nl.json'); break;
      case 'es': dict = require('./dict/es.json'); break;
      case 'pt': dict = require('./dict/pt.json'); break;
      case 'it': dict = require('./dict/it.json'); break;
      default: dict = {};
    }
  } catch {
    dict = {};
  }
  return dict as Record<string, string>;
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
 * Pluriel. plurielFr garde exactement la règle d'origine du code pour le français.
 * Les autres langues suivent leur règle : singulier pour 1 seulement.
 */
export function traduirePluriel(n: number, plurielFr: boolean, un: string, plusieurs: string, ...valeurs: unknown[]): string {
  // Portugais : singulier pour 0 et 1, comme le français. Autres langues : singulier pour 1 seulement.
  const pluriel = LANG === 'fr' ? plurielFr : LANG === 'pt' ? Math.abs(Number(n)) >= 2 : Number(n) !== 1;
  return traduire(pluriel ? plusieurs : un, ...valeurs);
}

/** Locale pour les dates et les nombres (toLocaleDateString, Intl). */
export const LOCALE: string = ({ fr: 'fr-FR', en: 'en-US', de: 'de-DE', nl: 'nl-NL', es: 'es-ES', pt: 'pt-BR', it: 'it-IT' } as const)[LANG];

/** Séparateur décimal de la langue : virgule en français, allemand, néerlandais ; point en anglais. */
export const DECIMAL: string = LANG === 'en' ? '.' : ',';
