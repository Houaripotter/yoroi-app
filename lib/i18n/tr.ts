// ============================================
// YOROI : traduction des textes de l'app
// Le français écrit dans le code reste la source. traduire() le remplace par la traduction
// de la langue du téléphone, si elle existe. Fonctions : traduire() et traduirePluriel(). En français, le texte est rendu à l'identique.
// Dictionnaires : lib/i18n/dict/<langue>.json, clé = phrase française (espaces réduits).
// Outils : scripts/i18n (catalogue, contrôle, branchement).
// ============================================

import { getLocales } from 'expo-localization';

export type Lang = 'fr' | 'en' | 'de' | 'nl';

/** Langues proposées. Une langue absente de cette liste retombe sur l'anglais. */
export const LANGUES_ACTIVES: readonly Lang[] = ['fr', 'en', 'de', 'nl'];

/** Lancement en français seul : mettre à true pour forcer le français partout. */
const FRANCAIS_FORCE = false;

function detect(): Lang {
  if (FRANCAIS_FORCE) return 'fr';
  // Tests automatiques : toujours en français, pour vérifier que le texte d'origine est intact
  if (typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID) return 'fr';
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

/** Langue de l'app, fixée au démarrage (le choix se fait dans les réglages du téléphone). */
export const LANG: Lang = detect();

let dict: Record<string, string> | null = null;
function load(): Record<string, string> {
  if (dict) return dict;
  try {
    switch (LANG) {
      case 'en': dict = require('./dict/en.json'); break;
      case 'de': dict = require('./dict/de.json'); break;
      case 'nl': dict = require('./dict/nl.json'); break;
      default: dict = {};
    }
  } catch {
    dict = {};
  }
  return dict as Record<string, string>;
}

const BORDS = /^(\s*)([\s\S]*?)(\s*)$/;

/** Traduit une phrase française. Les {0}, {1} sont remplacés par les valeurs, après traduction. */
export function traduire(fr: string, ...valeurs: unknown[]): string {
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
  const pluriel = LANG === 'fr' ? plurielFr : Number(n) !== 1;
  return traduire(pluriel ? plusieurs : un, ...valeurs);
}

/** Locale pour les dates et les nombres (toLocaleDateString, Intl). */
export const LOCALE: string = ({ fr: 'fr-FR', en: 'en-US', de: 'de-DE', nl: 'nl-NL' } as const)[LANG];

/** Séparateur décimal de la langue : virgule en français, allemand, néerlandais ; point en anglais. */
export const DECIMAL: string = LANG === 'en' ? '.' : ',';
