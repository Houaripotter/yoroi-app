// ============================================
// YOROI : historique des notifications dans la langue actuelle de l'app
// ============================================
// L'historique garde le titre et le texte tels qu'ils ont été reçus, dans la langue du moment.
// Pour les réafficher dans la langue actuelle, une entrée peut garder en plus sa source :
// la phrase française (la clé des dictionnaires lib/i18n/dict), ses valeurs {0}, {1} et un éventuel pluriel.
// Sans source (anciennes entrées), le texte est retrouvé par recherche inverse exacte dans les
// dictionnaires. Rien de trouvé, ou plusieurs phrases possibles : le texte reçu reste tel quel.
// Fichier pur (aucun module natif), lit les dictionnaires sans jamais les modifier.
// ============================================

import { LANG, type Lang } from '@/lib/i18n/tr';
import { contientValeurSante } from '@/lib/v2/notifications/texte';

/** Une valeur {0} : un nombre, un texte gardé tel quel, ou une phrase à traduire elle aussi. */
export type ValeurNotif = string | number | SourceTexte;

/** De quoi retraduire un titre ou un texte. */
export interface SourceTexte {
  /** Phrase française d'origine, celle passée à traduire() (forme au singulier si pluriel). */
  fr: string;
  /** Valeurs des {0}, {1}... */
  v?: ValeurNotif[];
  /** Pluriel : mêmes arguments que traduirePluriel(n, plurielFr, fr, plusieurs). */
  pl?: { n: number; frPluriel: boolean; plusieurs: string };
}

/** Sources d'une notification, glissées dans data.__i18n au moment de la programmer. */
export interface SourceNotif {
  /** Langue dans laquelle le titre et le texte ont été écrits. */
  l: Lang;
  titre?: SourceTexte;
  texte?: SourceTexte;
}

export const CLE_DATA_I18N = '__i18n';

const LANGUES_DICO: readonly Exclude<Lang, 'fr'>[] = ['en', 'de', 'nl', 'es', 'pt', 'it'];
const LANGUES: readonly Lang[] = ['fr', ...LANGUES_DICO];

// ─── Construction (côté programmation des notifications) ─────────────────────

/** Source d'un texte écrit avec traduire(fr, ...v). */
export function src(fr: string, ...v: ValeurNotif[]): SourceTexte {
  return v.length ? { fr, v } : { fr };
}

/** Source d'un texte écrit avec traduirePluriel(n, frPluriel, un, plusieurs, ...v). */
export function srcPluriel(n: number, frPluriel: boolean, un: string, plusieurs: string, ...v: ValeurNotif[]): SourceTexte {
  return { fr: un, ...(v.length ? { v } : {}), pl: { n, frPluriel, plusieurs } };
}

/** À étaler dans le data d'une notification : { ...sourceNotif(src(...), src(...)) }. */
export function sourceNotif(titre?: SourceTexte | null, texte?: SourceTexte | null): { [CLE_DATA_I18N]: SourceNotif } {
  return { [CLE_DATA_I18N]: { l: LANG, ...(titre ? { titre } : {}), ...(texte ? { texte } : {}) } };
}

// ─── Dictionnaires (lecture seule) ───────────────────────────────────────────

const dicos: Partial<Record<Lang, Record<string, string>>> = {};

function dico(l: Lang): Record<string, string> {
  if (l === 'fr') return {};
  const deja = dicos[l];
  if (deja) return deja;
  let d: Record<string, string> = {};
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    switch (l) {
      case 'en': d = require('./i18n/dict/en.json'); break;
      case 'de': d = require('./i18n/dict/de.json'); break;
      case 'nl': d = require('./i18n/dict/nl.json'); break;
      case 'es': d = require('./i18n/dict/es.json'); break;
      case 'pt': d = require('./i18n/dict/pt.json'); break;
      case 'it': d = require('./i18n/dict/it.json'); break;
    }
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    d = {};
  }
  dicos[l] = d;
  return d;
}

const aCle = (d: Record<string, string>, k: string) => Object.prototype.hasOwnProperty.call(d, k);

const BORDS = /^(\s*)([\s\S]*?)(\s*)$/;

/** Comme traduire(), mais dans une langue donnée. */
export function traduireDans(l: Lang, fr: string, valeurs: ValeurNotif[] = []): string {
  let out = fr;
  if (l !== 'fr') {
    const m = BORDS.exec(fr);
    if (m) {
      const d = dico(l);
      const k = m[2].replace(/\s+/g, ' ');
      if (aCle(d, k)) out = m[1] + d[k] + m[3];
    }
  }
  if (!valeurs.length) return out;
  return out.replace(/\{(\d+)\}/g, (tout, i) => {
    const n = Number(i);
    if (n >= valeurs.length) return tout;
    const val = valeurs[n];
    return typeof val === 'object' && val !== null ? rendre(val, l) : String(val);
  });
}

/** Rend une source dans une langue, avec la règle de pluriel de traduirePluriel(). */
export function rendre(s: SourceTexte, l: Lang): string {
  let fr = s.fr;
  if (s.pl) {
    const n = Number(s.pl.n);
    const pluriel = l === 'fr' ? s.pl.frPluriel : l === 'pt' ? Math.abs(n) >= 2 : n !== 1;
    if (pluriel) fr = s.pl.plusieurs;
  }
  return traduireDans(l, fr, s.v ?? []);
}

// ─── Validation des données lues (stockage ou data de notification) ──────────

function estLangue(x: unknown): x is Lang {
  return typeof x === 'string' && (LANGUES as readonly string[]).includes(x);
}

function valeurValide(x: unknown, profondeur: number): x is ValeurNotif {
  if (typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x))) return true;
  return profondeur > 0 && sourceValide(x, profondeur - 1);
}

export function sourceValide(x: unknown, profondeur = 2): x is SourceTexte {
  if (!x || typeof x !== 'object') return false;
  const s = x as SourceTexte;
  if (typeof s.fr !== 'string' || !s.fr) return false;
  if (s.v !== undefined && !(Array.isArray(s.v) && s.v.length <= 10 && s.v.every((v) => valeurValide(v, profondeur)))) return false;
  if (s.pl !== undefined) {
    const p = s.pl;
    if (!p || typeof p !== 'object' || !Number.isFinite(Number(p.n)) || typeof p.frPluriel !== 'boolean' || typeof p.plusieurs !== 'string') return false;
  }
  return true;
}

/** Lit data.__i18n d'une notification, s'il est bien formé. */
export function lireSourceNotif(data: unknown): SourceNotif | null {
  if (!data || typeof data !== 'object') return null;
  const s = (data as Record<string, unknown>)[CLE_DATA_I18N] as SourceNotif | undefined;
  if (!s || typeof s !== 'object' || !estLangue(s.l)) return null;
  return {
    l: s.l,
    ...(sourceValide(s.titre) ? { titre: s.titre } : {}),
    ...(sourceValide(s.texte) ? { texte: s.texte } : {}),
  };
}

// ─── Recherche inverse exacte ────────────────────────────────────────────────

const inverses: Partial<Record<Lang, Map<string, string[]>>> = {};

function inverse(l: Exclude<Lang, 'fr'>): Map<string, string[]> {
  const deja = inverses[l];
  if (deja) return deja;
  const m = new Map<string, string[]>();
  const d = dico(l);
  for (const k of Object.keys(d)) {
    const v = typeof d[k] === 'string' ? d[k].trim() : '';
    if (!v) continue;
    const a = m.get(v);
    if (a) a.push(k);
    else m.set(v, [k]);
  }
  inverses[l] = m;
  return m;
}

/** Phrases françaises possibles pour un texte écrit dans une langue (correspondance exacte). */
function candidats(texte: string, l: Lang): string[] {
  const t = texte.trim();
  if (!t) return [];
  if (l === 'fr') return aCle(dico('en'), t.replace(/\s+/g, ' ')) ? [t] : [];
  return inverse(l).get(t) ?? [];
}

/**
 * La phrase française d'un texte reçu. langue : celle du texte, si on la connaît.
 * Langue inconnue (anciennes entrées) : toutes les langues sont cherchées.
 * Si plusieurs phrases sont possibles et ne donnent pas la même traduction dans la langue
 * visée, la recherche échoue : on ne devine jamais.
 */
export function phraseFrancaise(texte: string, langue: Lang | undefined, cible: Lang = LANG): string | null {
  if (typeof texte !== 'string' || !texte.trim()) return null;
  let liste: string[] = [];
  if (langue) liste = candidats(texte, langue);
  if (!liste.length) {
    const tous = new Set<string>();
    for (const l of LANGUES) for (const c of candidats(texte, l)) tous.add(c);
    liste = [...tous];
  }
  if (!liste.length) return null;
  if (liste.length === 1) return liste[0];
  const rendus = new Set(liste.map((fr) => traduireDans(cible, fr)));
  return rendus.size === 1 ? liste[0] : null;
}

// ─── Enregistrement ──────────────────────────────────────────────────────────

/**
 * Ce que l'historique garde en plus du titre et du texte : leur langue et leurs sources.
 * Une source n'est gardée que si elle redonne exactement le texte enregistré (un texte remplacé
 * par la garde santé, ou modifié en route, garde seulement son texte). Sans source, une phrase fixe
 * des dictionnaires est retrouvée dans la langue du texte. data est rendu sans data.__i18n.
 */
export function preparerEntree(
  title: string,
  body: string,
  data?: Record<string, any>,
): { lang: Lang; src?: { titre?: SourceTexte; texte?: SourceTexte }; data?: Record<string, any> } {
  let dataPropre = data;
  let sn: SourceNotif | null = null;
  try {
    sn = lireSourceNotif(data);
    if (data && typeof data === 'object' && CLE_DATA_I18N in data) {
      const { [CLE_DATA_I18N]: _retire, ...reste } = data;
      dataPropre = reste;
    }
  } catch {
    sn = null;
  }
  const lang: Lang = sn?.l ?? LANG;
  const choisir = (texte: string, s?: SourceTexte): SourceTexte | undefined => {
    try {
      if (s && rendre(s, lang) === texte) return s;
      if (lang === 'fr' || typeof texte !== 'string') return undefined;
      const liste = candidats(texte, lang);
      if (liste.length === 1 && texte === texte.trim()) return { fr: liste[0] };
    } catch {
      // rien : le texte seul suffit
    }
    return undefined;
  };
  const titre = choisir(title, sn?.titre);
  const texte = choisir(body, sn?.texte);
  return {
    lang,
    ...(titre || texte ? { src: { ...(titre ? { titre } : {}), ...(texte ? { texte } : {}) } } : {}),
    ...(dataPropre !== undefined ? { data: dataPropre } : {}),
  };
}

// ─── Affichage ───────────────────────────────────────────────────────────────

/** Les champs utiles d'une entrée d'historique. */
export interface EntreeLocalisable {
  title: string;
  body: string;
  /** Langue du titre et du texte enregistrés. Absente sur les anciennes entrées. */
  lang?: Lang;
  /** Sources pour retraduire. Absentes sur les anciennes entrées. */
  src?: { titre?: SourceTexte; texte?: SourceTexte };
}

/** Un titre ou un texte dans la langue visée, sinon le texte enregistré. */
export function localiserTexte(texte: string, source: SourceTexte | undefined, langue: Lang | undefined, cible: Lang = LANG): string {
  if (typeof texte !== 'string') return texte;
  try {
    if (source && sourceValide(source)) {
      const rendu = rendre(source, cible);
      // Filet de sécurité : jamais une valeur de santé que le texte enregistré n'avait pas
      return contientValeurSante(rendu) && !contientValeurSante(texte) ? texte : rendu;
    }
    if (!estLangue(langue)) langue = undefined;
    if (langue === cible) return texte;
    if (langue === 'fr') return traduireDans(cible, texte);
    const fr = phraseFrancaise(texte, langue, cible);
    if (fr === null) return texte;
    const m = BORDS.exec(texte);
    return (m ? m[1] : '') + traduireDans(cible, fr.trim()) + (m ? m[3] : '');
  } catch {
    return texte;
  }
}

/** L'entrée avec son titre et son texte dans la langue visée (une copie, l'entrée d'origine n'est pas touchée). */
export function localiserNotification<T extends EntreeLocalisable>(item: T, cible: Lang = LANG): T {
  if (!item || typeof item !== 'object') return item;
  const title = localiserTexte(item.title, item.src?.titre, item.lang, cible);
  const body = localiserTexte(item.body, item.src?.texte, item.lang, cible);
  if (title === item.title && body === item.body) return item;
  return { ...item, title, body };
}
