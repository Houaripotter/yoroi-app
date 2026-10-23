/**
 * Vitrine de la visite guidee (18 octobre 2026).
 * Houari : « que la visite montre des donnees de demo, pour que l'utilisateur se projette ».
 *
 * Pendant la visite, l'app lit et ecrit dans une VITRINE EN MEMOIRE, jamais dans tes vraies donnees :
 *  - SQLite : une base ':memory:' a part (vitrineDb). lib/database, fighterModeService, trainingJournalService et
 *    trainingGoalsService la prennent a la place de yoroi.db tant que la vitrine est ouverte.
 *  - AsyncStorage et secureStorage : chaque ecriture va dans une table en memoire ; chaque lecture regarde d'abord
 *    cette table, puis le vrai stockage (lecture seule). Un effacement pendant la visite ne fait que masquer la cle.
 * Rien de la vitrine n'est jamais ecrit sur le disque : si l'app est fermee ou plante pendant la visite, tout
 * disparait avec la memoire, et au lancement suivant l'app lit tes vraies donnees comme avant.
 * Seules exceptions : les cles de la visite elle-meme (@yoroi_visite_..., @yoroi_tour_...) passent au vrai
 * stockage ; les cles de l'abonnement et du mode createur sont lues pour de vrai et jamais ecrites pendant la visite.
 *
 * Ce module ne depend d'aucune base (pas d'import de lib/database) : la base s'en sert sans boucle.
 * L'ouverture (base de demo, Heny) est dans lib/v2/visite/demoVisite.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import secureStorage from '@/lib/security/secureStorage';

/** Marque posee dans le VRAI stockage pendant la visite : retrouvee au lancement, elle dit que la visite a ete coupee */
export const CLE_VITRINE_EN_COURS = '@yoroi_visite_vitrine_en_cours';

let ouverte = false;
let base: SQLiteDatabase | null = null;
/** valeur ecrite pendant la visite ; null = effacee pendant la visite */
const memoire = new Map<string, string | null>();
const memoireSecure = new Map<string, string | null>();

/** Vrai pendant la visite avec l'exemple : tout ce qui est lu vient de la vitrine */
export function vitrineActive(): boolean {
  return ouverte;
}

/** La base de la vitrine, ou null hors visite */
export function vitrineDb(): SQLiteDatabase | null {
  return ouverte ? base : null;
}

/** Cles de la visite : vrai stockage, lecture et ecriture */
export function clePasseTout(key: string): boolean {
  return key.startsWith('@yoroi_visite_') || key.startsWith('@yoroi_tour_');
}

/** Abonnement et mode createur : lus pour de vrai, jamais ecrits ni effaces pendant la visite */
export function cleFigee(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('premium') || k.includes('revenuecat') || k.includes('subscription') || k.includes('creator') || k.includes('createur');
}

// ── AsyncStorage ─────────────────────────────────────────────────────────────

type AS = typeof AsyncStorage & Record<string, any>;
const as = AsyncStorage as AS;
type Originaux = { [k: string]: (...a: any[]) => any };
let orig: Originaux | null = null;
let origSecure: Originaux | null = null;

/** L'AsyncStorage d'origine (pour la marque et pour les tests) */
export function asyncStorageReel(): Originaux {
  installer();
  return orig as Originaux;
}

function fusion(avant: string | null, ajout: string): string {
  try {
    const a = avant ? JSON.parse(avant) : {};
    const b = JSON.parse(ajout);
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) return JSON.stringify({ ...a, ...b });
  } catch {
    // pas du JSON : on remplace
  }
  return ajout;
}

async function lire(key: string): Promise<string | null> {
  if (ouverte && !clePasseTout(key) && !cleFigee(key) && memoire.has(key)) return memoire.get(key) ?? null;
  return (orig as Originaux).getItem(key);
}

function ecrire(key: string, value: string | null): Promise<void> | void {
  if (clePasseTout(key)) return value === null ? (orig as Originaux).removeItem(key) : (orig as Originaux).setItem(key, value);
  if (cleFigee(key)) return;
  memoire.set(key, value);
}

function installer(): void {
  if (orig) return;
  const o: Originaux = {};
  for (const m of ['getItem', 'setItem', 'removeItem', 'mergeItem', 'multiGet', 'multiSet', 'multiRemove', 'multiMerge', 'getAllKeys', 'clear']) {
    if (typeof as[m] === 'function') o[m] = as[m].bind(AsyncStorage);
  }
  orig = o;
  as.getItem = (key: string) => (ouverte ? lire(key) : o.getItem(key));
  as.setItem = (key: string, value: string) => (ouverte ? Promise.resolve(ecrire(key, String(value))) : o.setItem(key, value));
  as.removeItem = (key: string) => (ouverte ? Promise.resolve(ecrire(key, null)) : o.removeItem(key));
  as.mergeItem = async (key: string, value: string) => {
    if (!ouverte) return o.mergeItem ? o.mergeItem(key, value) : o.setItem(key, fusion(await o.getItem(key), value));
    await ecrire(key, fusion(await lire(key), value));
  };
  as.multiGet = async (keys: readonly string[]) => {
    if (!ouverte) return o.multiGet(keys);
    return Promise.all(keys.map(async (k) => [k, await lire(k)] as [string, string | null]));
  };
  as.multiSet = async (pairs: readonly (readonly [string, string])[]) => {
    if (!ouverte) return o.multiSet(pairs);
    for (const [k, v] of pairs) await ecrire(k, String(v));
  };
  as.multiRemove = async (keys: readonly string[]) => {
    if (!ouverte) return o.multiRemove ? o.multiRemove(keys) : Promise.all(keys.map((k) => o.removeItem(k)));
    for (const k of keys) await ecrire(k, null);
  };
  as.multiMerge = async (pairs: readonly (readonly [string, string])[]) => {
    if (!ouverte) return o.multiMerge ? o.multiMerge(pairs) : Promise.all(pairs.map(([k, v]) => as.mergeItem(k, v)));
    for (const [k, v] of pairs) await as.mergeItem(k, v);
  };
  as.getAllKeys = async () => {
    const reelles: string[] = ((await o.getAllKeys()) as string[] | null) ?? [];
    if (!ouverte) return reelles;
    const out = new Set(reelles);
    memoire.forEach((v, k) => {
      if (v === null) out.delete(k);
      else out.add(k);
    });
    return [...out];
  };
  // tout effacer pendant la visite : rien ne se passe (tes donnees restent intactes)
  as.clear = () => (ouverte ? Promise.resolve() : o.clear());

  // secureStorage (memes regles ; les valeurs gardent le format de secureStorage : texte, JSON relu)
  const s = secureStorage as unknown as Originaux;
  const os: Originaux = { setItem: s.setItem, getItem: s.getItem, getItemStrict: s.getItemStrict, removeItem: s.removeItem };
  origSecure = os;
  const relire = (v: string | null) => {
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };
  s.setItem = async (key: string, value: unknown) => {
    if (!ouverte) return os.setItem(key, value);
    if (!cleFigee(key)) memoireSecure.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  };
  s.getItem = async (key: string) => (ouverte && !cleFigee(key) && memoireSecure.has(key) ? relire(memoireSecure.get(key) ?? null) : os.getItem(key));
  s.getItemStrict = async (key: string) => (ouverte && !cleFigee(key) && memoireSecure.has(key) ? relire(memoireSecure.get(key) ?? null) : os.getItemStrict(key));
  s.removeItem = async (key: string) => {
    if (!ouverte) return os.removeItem(key);
    if (!cleFigee(key)) memoireSecure.set(key, null);
    return true;
  };
}

/**
 * Ouvre la vitrine sur une base deja ouverte (':memory:'). A partir d'ici, plus rien n'est ecrit dans tes vraies
 * donnees. La marque CLE_VITRINE_EN_COURS est posee dans le vrai stockage (elle ne contient qu'une date).
 */
export async function ouvrirVitrine(db: SQLiteDatabase): Promise<void> {
  installer();
  memoire.clear();
  memoireSecure.clear();
  base = db;
  ouverte = true;
  await Promise.resolve((orig as Originaux).setItem(CLE_VITRINE_EN_COURS, new Date().toISOString())).catch(() => undefined);
}

/** Ferme la vitrine : la memoire est videe, l'app relit tes vraies donnees. Renvoie la base de la vitrine (a fermer). */
export async function fermerVitrine(): Promise<SQLiteDatabase | null> {
  const db = base;
  ouverte = false;
  base = null;
  memoire.clear();
  memoireSecure.clear();
  if (orig) await Promise.resolve(orig.removeItem(CLE_VITRINE_EN_COURS)).catch(() => undefined);
  return db;
}

/**
 * Au lancement : la vitrine est toujours fermee (elle ne vit qu'en memoire). Si la marque est encore la, la visite a
 * ete coupee (app fermee ou plantage) : on l'enleve. Tes donnees n'ont jamais ete touchees. Renvoie vrai si c'etait le cas.
 */
export async function remiseAZeroAuDemarrage(): Promise<boolean> {
  installer();
  if (ouverte) return false;
  try {
    const m = await (orig as Originaux).getItem(CLE_VITRINE_EN_COURS);
    if (m) {
      await (orig as Originaux).removeItem(CLE_VITRINE_EN_COURS);
      return true;
    }
  } catch {
    // sans importance : rien d'autre n'est garde
  }
  return false;
}

/**
 * Pour les services qui gardent leur propre poignee sur yoroi.db (ouverte au chargement du module) :
 * la meme poignee, qui passe a la vitrine pendant la visite.
 */
export function baseOuVitrine<T>(vraie: T): T {
  // pas de base (web, tests) : rien a faire
  if (!vraie || typeof vraie !== 'object') return vraie;
  return new Proxy(vraie as unknown as object, {
    get(cible, prop) {
      const v = vitrineDb() as unknown as T | null;
      const t = (v ?? cible) as any;
      const val = t[prop];
      return typeof val === 'function' ? val.bind(t) : val;
    },
  }) as unknown as T;
}

/** Tests seulement */
export function _etatVitrine() {
  return { ouverte, cles: memoire.size, clesSecure: memoireSecure.size, origSecure: !!origSecure };
}
