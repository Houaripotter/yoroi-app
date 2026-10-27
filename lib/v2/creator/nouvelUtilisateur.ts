/**
 * Studio, « Nouvel utilisateur » (27 octobre 2026). Houari : voir l'app EXACTEMENT comme quelqu'un qui vient de
 * l'installer (onboarding, paywall, puis l'app vide) sans perdre ses vraies données.
 *
 * Partie pure et testée : toutes les entrées et sorties passent par des « ports » (base de l'app, base de
 * sauvegarde, AsyncStorage, trousseau), branchés sur l'appareil dans nouvelUtilisateurAppareil.ts et sur une vraie
 * base SQLite en mémoire dans __tests__/unit/nouvelUtilisateur.test.ts.
 *
 * Pourquoi pas les copies demo_bak_ de Heny : elles vivent DANS yoroi.db et « Supprimer toutes mes données »
 * (lib/storage.ts) les supprime ; elles servent aussi de drapeau à la démo (Santé coupée, synchro coupée...).
 * Ici la copie est un FICHIER À PART, yoroi_nouvel_utilisateur.db, dans le dossier SQLite que les effacements
 * gardent. La méthode reste celle de Heny : copie table par table, vérifiée, puis seulement ensuite on vide.
 *
 * Étapes de « lancer » :
 *  1. refus si Heny est chargée ou si une vue nouvel utilisateur tourne déjà ;
 *  2. copie de chaque table (schéma des colonnes et lignes, valeurs exactes), relue et comparée ligne par ligne ;
 *  3. copie de TOUTES les clés AsyncStorage et des clés du trousseau, relues et comparées ;
 *  4. manifeste « prete » (rien n'est encore effacé), puis « active » : point de non retour ;
 *  5. on vide les tables, les clés et le trousseau, sauf ce qui n'est pas une donnée (catalogue, mesure d'audience,
 *     jeton créateur, cache de l'abonnement, mot de passe des sauvegardes) ; si ça casse, retour automatique.
 * Si l'app est tuée avant « active », rien n'a été effacé : la copie est jetée au lancement suivant. Après
 * « active », la copie reste jusqu'au retour, même si l'app est tuée, relancée ou si ses données sont effacées.
 *
 * « revenir » remet chaque table, chaque clé et chaque valeur du trousseau, vérifie tout (empreinte de chaque
 * table, chaque clé, chaque valeur) et ne jette la copie que si la vérification passe.
 */
import { traduire } from '@/lib/i18n/tr';

// ============================================
// PORTS
// ============================================

export type Ligne = Record<string, unknown>;

/** Le sous ensemble de l'API expo-sqlite utilisé ici */
export interface BaseSql {
  getAllAsync<T = Ligne>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T = Ligne>(sql: string, params?: unknown[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<unknown>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

export interface Stockage {
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  multiSet(pairs: [string, string][]): Promise<void>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

/** Trousseau, par nom déjà nettoyé (comme lib/security/secureStorage.ts) */
export interface Coffre {
  lire(nom: string): Promise<string | null>;
  ecrire(nom: string, valeur: string): Promise<void>;
  effacer(nom: string): Promise<void>;
}

export interface FichierSauvegarde {
  existe(): Promise<boolean>;
  ouvrir(): Promise<BaseSql>;
  fermer(): Promise<void>;
  supprimer(): Promise<void>;
}

export interface Ports {
  live(): Promise<BaseSql>;
  sauvegarde: FichierSauvegarde;
  stockage: Stockage;
  coffre: Coffre;
  demoActive(): Promise<boolean>;
  /** Noms (nettoyés) du trousseau à mettre de côté, d'après les clés AsyncStorage du moment */
  nomsCoffre(clesStockage: readonly string[]): string[];
  maintenant?: () => Date;
  log?: { info: (m: string) => void; warn: (m: string, e?: unknown) => void };
}

// ============================================
// CONSTANTES
// ============================================

/** Le fichier de la copie, dans le dossier SQLite de l'app */
export const NOM_BASE_SAUVEGARDE = 'yoroi_nouvel_utilisateur.db';
/** Repère posé pendant la vue (le vrai témoin reste le manifeste de la copie) */
export const CLE_VUE_NOUVEL_UTILISATEUR = '@yoroi_studio_vue_nouvel_utilisateur';
/** Même clé que SIMULATE_FREE_KEY de context/PremiumContext.tsx (vue gratuite du Studio) */
export const CLE_VUE_GRATUITE = '@yoroi_studio_simulate_free';
/** Événement émis quand la vue commence ou s'arrête */
export const EVENEMENT_VUE = 'YOROI_VUE_NOUVEL_UTILISATEUR';

/**
 * Tables jamais vidées : ce ne sont pas des données de l'utilisateur.
 * events_catalog (catalogue public des compétitions), android_metadata (technique), app_metadata (version du catalogue).
 */
export const TABLES_INTACTES: readonly string[] = ['events_catalog', 'android_metadata', 'app_metadata'];
/** Copies de la démo Heny : jamais copiées (Heny est refusée pendant la vue), supprimées au retour si elles sont nées pendant */
const PREFIXE_DEMO = 'demo_bak_';
/** Clés AsyncStorage gardées pendant la vue (mise de côté quand même, et remises au retour) : la mesure d'audience,
 * pour qu'elle ne compte pas une fausse nouvelle installation */
export const PREFIXES_CLES_GARDEES: readonly string[] = ['@yoroi_mesure_'];

/** Tables de la copie */
const T_MANIFESTE = 'nu_manifeste';
const T_STOCKAGE = 'nu_stockage';
const T_COFFRE = 'nu_coffre';
const PREFIXE_COPIE = 't_';

export type EtatCopie = 'copie' | 'prete' | 'active';

export type TableCopiee = { nom: string; colonnes: string[]; lignes: number; empreinte: string };

export type Manifeste = {
  version: 1;
  etat: EtatCopie;
  debut: string;
  tables: TableCopiee[];
  cles: number;
  /** tous les noms du trousseau regardés (présents ou non) */
  nomsCoffre: string[];
  valeursCoffre: number;
  /** compteurs d'identifiants (sqlite_sequence) des tables copiées : les ids reprennent là où ils en étaient */
  sequences: { name: string; seq: number }[];
};

export type RapportLancement = { tables: number; lignes: number; cles: number; coffre: number };
export type RapportRetour = { tables: number; lignes: number; cles: number; coffre: number; rien?: boolean };

export type CodeErreur = 'demo' | 'deja' | 'occupe' | 'copie' | 'stockage' | 'coffre' | 'vidage' | 'aucune' | 'verification';

export class ErreurVue extends Error {
  code: CodeErreur;
  constructor(code: CodeErreur, message: string) {
    super(message);
    this.code = code;
  }
}

export const messageDemo = () => traduire('Heny est chargée. Reviens d’abord à tes vraies données, puis lance la vue nouvel utilisateur : sinon c’est Heny qui serait mise de côté à la place de tes données.');

// ============================================
// OUTILS
// ============================================

const nomSur = (t: string) => /^[A-Za-z0-9_]+$/.test(t);
const q = (n: string) => `"${n}"`;

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** Une valeur de cellule, avec son type : 2 et '2' ne se confondent pas */
export function serialiserValeur(v: unknown): string {
  if (v === null || v === undefined) return 'n';
  if (typeof v === 'number') return Number.isInteger(v) ? `i${v}` : `r${v}`;
  if (typeof v === 'bigint') return `i${v.toString()}`;
  if (typeof v === 'string') return `s${JSON.stringify(v)}`;
  if (v instanceof Uint8Array) return `b${hex(v)}`;
  if (typeof ArrayBuffer !== 'undefined' && v instanceof ArrayBuffer) return `b${hex(new Uint8Array(v))}`;
  return `o${JSON.stringify(v)}`;
}

export function serialiserLigne(l: Ligne, colonnes: readonly string[]): string {
  return colonnes.map((c) => serialiserValeur(l[c])).join('|');
}

/** Empreinte 53 bits (cyrb53) d'un texte */
function cyrb53(s: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Lignes triées et sérialisées : deux tables identiques donnent la même liste, quel que soit l'ordre de lecture */
function lignesTriees(rows: Ligne[], colonnes: readonly string[]): string[] {
  return rows.map((r) => serialiserLigne(r, colonnes)).sort();
}

export function empreinte(rows: Ligne[], colonnes: readonly string[]): string {
  const l = lignesTriees(rows, colonnes);
  return `${l.length}:${cyrb53(l.join('\n'))}:${cyrb53(l.join('\n'), 7)}`;
}

async function aDesSequences(db: BaseSql): Promise<boolean> {
  const r = await db.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'");
  return !!r;
}

async function lireSequences(db: BaseSql, tables: readonly string[]): Promise<{ name: string; seq: number }[]> {
  if (!(await aDesSequences(db))) return [];
  const rows = await db.getAllAsync<{ name: string; seq: number }>('SELECT name, seq FROM sqlite_sequence');
  return rows.filter((r) => tables.includes(r.name)).map((r) => ({ name: r.name, seq: Number(r.seq) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Remet les compteurs d'identifiants des tables données (vides : remis à zéro, comme une installation neuve) */
async function ecrireSequences(db: BaseSql, tables: readonly string[], seqs: { name: string; seq: number }[]): Promise<void> {
  if (!tables.length || !(await aDesSequences(db))) return;
  await db.runAsync(`DELETE FROM sqlite_sequence WHERE name IN (${tables.map(() => '?').join(', ')})`, [...tables]);
  for (const s of seqs) await db.runAsync('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)', [s.name, s.seq]);
}

async function tablesDe(db: BaseSql): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
  return rows.map((r) => r.name).filter(nomSur);
}

async function colonnesDe(db: BaseSql, table: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${q(table)})`);
  return rows.map((r) => r.name).filter(nomSur);
}

async function toutLire(db: BaseSql, table: string, colonnes: readonly string[]): Promise<Ligne[]> {
  if (!colonnes.length) return [];
  return db.getAllAsync<Ligne>(`SELECT ${colonnes.map(q).join(', ')} FROM ${q(table)}`);
}

/** Insertion par paquets (900 valeurs au plus par requête) */
async function inserer(db: BaseSql, table: string, colonnes: readonly string[], rows: Ligne[]): Promise<void> {
  if (!rows.length || !colonnes.length) return;
  const parPaquet = Math.max(1, Math.floor(900 / colonnes.length));
  const liste = colonnes.map(q).join(', ');
  const une = `(${colonnes.map(() => '?').join(', ')})`;
  for (let i = 0; i < rows.length; i += parPaquet) {
    const paquet = rows.slice(i, i + parPaquet);
    const params: unknown[] = [];
    for (const r of paquet) for (const c of colonnes) params.push(r[c] === undefined ? null : r[c]);
    await db.runAsync(`INSERT INTO ${q(table)} (${liste}) VALUES ${paquet.map(() => une).join(', ')}`, params);
  }
}

/** Clés étrangères coupées le temps de vider et remplir, rétablies ensuite si elles étaient actives */
async function sansClesEtrangeres(db: BaseSql, fn: () => Promise<void>): Promise<void> {
  const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
  const actives = Number(row?.foreign_keys ?? 0) === 1;
  if (actives) await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await fn();
  } finally {
    if (actives) await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}

/** Toutes les valeurs, par paquets de 50, puis une par une si un paquet échoue ; une clé illisible fait échouer */
async function lireToutesLesCles(s: Stockage, cles: readonly string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < cles.length; i += 50) {
    const part = cles.slice(i, i + 50);
    try {
      for (const [k, v] of (await s.multiGet(part)) ?? []) out.set(k, v);
    } catch {
      for (const k of part) out.set(k, await s.getItem(k));
    }
    for (const k of part) if (!out.has(k)) out.set(k, await s.getItem(k));
  }
  return out;
}

const cleGardee = (k: string) => k === CLE_VUE_NOUVEL_UTILISATEUR || PREFIXES_CLES_GARDEES.some((p) => k.startsWith(p));

// ============================================
// MANIFESTE
// ============================================

async function creerTablesCopie(bak: BaseSql): Promise<void> {
  await bak.execAsync(
    `CREATE TABLE IF NOT EXISTS ${T_MANIFESTE} (cle TEXT PRIMARY KEY, valeur TEXT);
     CREATE TABLE IF NOT EXISTS ${T_STOCKAGE} (cle TEXT PRIMARY KEY, valeur TEXT);
     CREATE TABLE IF NOT EXISTS ${T_COFFRE} (nom TEXT PRIMARY KEY, valeur TEXT);`,
  );
}

async function ecrireManifeste(bak: BaseSql, m: Manifeste): Promise<void> {
  await bak.runAsync(`INSERT OR REPLACE INTO ${T_MANIFESTE} (cle, valeur) VALUES ('manifeste', ?)`, [JSON.stringify(m)]);
  const relu = await lireManifeste(bak);
  if (!relu || relu.etat !== m.etat) throw new ErreurVue('copie', traduire('Le manifeste de la copie n’a pas pu être écrit.'));
}

async function lireManifeste(bak: BaseSql): Promise<Manifeste | null> {
  try {
    const existe = await bak.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [T_MANIFESTE]);
    if (!existe) return null;
    const row = await bak.getFirstAsync<{ valeur: string }>(`SELECT valeur FROM ${T_MANIFESTE} WHERE cle = 'manifeste'`);
    if (!row?.valeur) return null;
    const m = JSON.parse(row.valeur) as Manifeste;
    return m && Array.isArray(m.tables) ? m : null;
  } catch {
    return null;
  }
}

// ============================================
// LE SERVICE
// ============================================

export type EtatVue = { actif: boolean; depuis: string | null; tables: number; lignes: number; cles: number };

export function creerServiceNouvelUtilisateur(p: Ports) {
  let enCours = false;
  const log = p.log ?? { info: () => undefined, warn: () => undefined };
  const maintenant = p.maintenant ?? (() => new Date());

  const verrou = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (enCours) throw new ErreurVue('occupe', traduire('Une opération est déjà en cours, patiente un instant.'));
    enCours = true;
    try {
      return await fn();
    } finally {
      enCours = false;
    }
  };

  /** Lit l'état sans rien toucher, sauf jeter une copie inachevée (rien n'avait été effacé) */
  async function etat(): Promise<EtatVue> {
    const vide: EtatVue = { actif: false, depuis: null, tables: 0, lignes: 0, cles: 0 };
    if (!(await p.sauvegarde.existe())) return vide;
    const bak = await p.sauvegarde.ouvrir();
    const m = await lireManifeste(bak);
    if (m && m.etat === 'active') {
      return { actif: true, depuis: m.debut, tables: m.tables.length, lignes: m.tables.reduce((n, t) => n + t.lignes, 0), cles: m.cles };
    }
    if (!enCours) {
      // copie commencée et jamais terminée : tes données n'ont pas été touchées, la copie ne sert plus
      log.info('[NouvelUtilisateur] copie inachevée jetée (rien n’avait été effacé)');
      await p.sauvegarde.supprimer().catch(() => undefined);
    }
    return vide;
  }

  async function copierTables(live: BaseSql, bak: BaseSql): Promise<TableCopiee[]> {
    const tables = (await tablesDe(live)).filter((t) => !TABLES_INTACTES.includes(t) && !t.startsWith(PREFIXE_DEMO));
    const out: TableCopiee[] = [];
    for (const t of tables) {
      const colonnes = await colonnesDe(live, t);
      const rows = await toutLire(live, t, colonnes);
      const copie = `${PREFIXE_COPIE}${t}`;
      await bak.execAsync(`DROP TABLE IF EXISTS ${q(copie)}; CREATE TABLE ${q(copie)} (${colonnes.length ? colonnes.map(q).join(', ') : '"_vide"'});`);
      await bak.withTransactionAsync(async () => {
        await inserer(bak, copie, colonnes, rows);
      });
      // vérification exacte : chaque ligne relue de la copie, comparée à la base
      const relues = await toutLire(bak, copie, colonnes);
      const a = lignesTriees(rows, colonnes);
      const b = lignesTriees(relues, colonnes);
      if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
        throw new ErreurVue('copie', traduire('La copie de la table {0} ne correspond pas. Rien n’a été effacé.', t));
      }
      out.push({ nom: t, colonnes, lignes: rows.length, empreinte: empreinte(rows, colonnes) });
    }
    return out;
  }

  async function copierStockage(bak: BaseSql): Promise<Map<string, string | null>> {
    const cles = [...(await p.stockage.getAllKeys())].filter((k) => k !== CLE_VUE_NOUVEL_UTILISATEUR);
    let valeurs: Map<string, string | null>;
    try {
      valeurs = await lireToutesLesCles(p.stockage, cles);
    } catch (e) {
      log.warn('[NouvelUtilisateur] réglages illisibles', e);
      throw new ErreurVue('stockage', traduire('Une partie de tes réglages n’a pas pu être lue. Rien n’a été effacé.'));
    }
    const presentes = [...valeurs.entries()].filter((e): e is [string, string] => typeof e[1] === 'string');
    await bak.withTransactionAsync(async () => {
      await bak.execAsync(`DELETE FROM ${T_STOCKAGE};`);
      for (let i = 0; i < presentes.length; i += 400) {
        const paquet = presentes.slice(i, i + 400);
        await bak.runAsync(`INSERT INTO ${T_STOCKAGE} (cle, valeur) VALUES ${paquet.map(() => '(?, ?)').join(', ')}`, paquet.flat());
      }
    });
    const relues = await bak.getAllAsync<{ cle: string; valeur: string }>(`SELECT cle, valeur FROM ${T_STOCKAGE}`);
    const m = new Map(relues.map((r) => [r.cle, r.valeur]));
    if (m.size !== presentes.length || presentes.some(([k, v]) => m.get(k) !== v)) {
      throw new ErreurVue('stockage', traduire('La copie de tes réglages ne correspond pas. Rien n’a été effacé.'));
    }
    return new Map(presentes);
  }

  async function copierCoffre(bak: BaseSql, cles: readonly string[]): Promise<{ noms: string[]; valeurs: number }> {
    const noms = [...new Set(p.nomsCoffre(cles))];
    const lus: [string, string][] = [];
    for (const nom of noms) {
      let v: string | null;
      try {
        v = await p.coffre.lire(nom);
      } catch (e) {
        log.warn(`[NouvelUtilisateur] trousseau illisible (${nom})`, e);
        throw new ErreurVue('coffre', traduire('Le trousseau du téléphone n’a pas pu être lu. Déverrouille le téléphone et réessaie. Rien n’a été effacé.'));
      }
      if (typeof v === 'string') lus.push([nom, v]);
    }
    await bak.withTransactionAsync(async () => {
      await bak.execAsync(`DELETE FROM ${T_COFFRE};`);
      for (const [nom, v] of lus) await bak.runAsync(`INSERT INTO ${T_COFFRE} (nom, valeur) VALUES (?, ?)`, [nom, v]);
    });
    const relus = await bak.getAllAsync<{ nom: string; valeur: string }>(`SELECT nom, valeur FROM ${T_COFFRE}`);
    const m = new Map(relus.map((r) => [r.nom, r.valeur]));
    if (m.size !== lus.length || lus.some(([k, v]) => m.get(k) !== v)) {
      throw new ErreurVue('coffre', traduire('La copie du trousseau ne correspond pas. Rien n’a été effacé.'));
    }
    return { noms, valeurs: lus.length };
  }

  /** Vide l'app : tables, réglages, trousseau (rien n'est fait avant que la copie soit « active ») */
  async function vider(live: BaseSql, m: Manifeste): Promise<void> {
    const tables = (await tablesDe(live)).filter((t) => !TABLES_INTACTES.includes(t));
    await sansClesEtrangeres(live, async () => {
      await live.withTransactionAsync(async () => {
        for (const t of tables) await live.execAsync(`DELETE FROM ${q(t)};`);
        await ecrireSequences(live, tables, []);
      });
    });
    for (const nom of m.nomsCoffre) await p.coffre.effacer(nom);
    const cles = (await p.stockage.getAllKeys()).filter((k) => !cleGardee(k));
    for (let i = 0; i < cles.length; i += 100) await p.stockage.multiRemove(cles.slice(i, i + 100));
    // contrôle : plus aucune ligne
    for (const t of tables) {
      const n = await live.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${q(t)}`);
      if (Number(n?.n ?? 0) !== 0) throw new ErreurVue('vidage', traduire('La table {0} n’a pas pu être vidée.', t));
    }
  }

  async function lancer(): Promise<RapportLancement> {
    return verrou(async () => {
      if (await p.demoActive()) throw new ErreurVue('demo', messageDemo());
      if (await p.sauvegarde.existe()) {
        const bak0 = await p.sauvegarde.ouvrir();
        const m0 = await lireManifeste(bak0);
        if (m0?.etat === 'active') throw new ErreurVue('deja', traduire('La vue nouvel utilisateur est déjà lancée. Reviens d’abord à tes données.'));
        await p.sauvegarde.supprimer();
      }
      const live = await p.live();
      const bak = await p.sauvegarde.ouvrir();
      let m: Manifeste;
      try {
        await creerTablesCopie(bak);
        m = { version: 1, etat: 'copie', debut: maintenant().toISOString(), tables: [], cles: 0, nomsCoffre: [], valeursCoffre: 0, sequences: [] };
        await ecrireManifeste(bak, m);
        m.tables = await copierTables(live, bak);
        m.sequences = await lireSequences(live, m.tables.map((t) => t.nom));
        const stockage = await copierStockage(bak);
        m.cles = stockage.size;
        const coffre = await copierCoffre(bak, [...stockage.keys()]);
        m.nomsCoffre = coffre.noms;
        m.valeursCoffre = coffre.valeurs;
        m.etat = 'prete';
        await ecrireManifeste(bak, m);
      } catch (e) {
        log.warn('[NouvelUtilisateur] copie abandonnée, rien n’a été effacé', e);
        await p.sauvegarde.supprimer().catch(() => undefined);
        throw e instanceof ErreurVue ? e : new ErreurVue('copie', traduire('La copie de tes données n’a pas abouti. Rien n’a été effacé.'));
      }

      // point de non retour : à partir d'ici, la copie est le témoin de la vue
      m.etat = 'active';
      await ecrireManifeste(bak, m);
      try {
        await vider(live, m);
        await p.stockage.setItem(CLE_VUE_NOUVEL_UTILISATEUR, 'true');
        await p.stockage.setItem(CLE_VUE_GRATUITE, 'true');
      } catch (e) {
        log.warn('[NouvelUtilisateur] vidage interrompu, retour automatique', e);
        try {
          await restaurer();
        } catch (err) {
          log.warn('[NouvelUtilisateur] retour automatique impossible, la copie reste en place', err);
        }
        throw new ErreurVue('vidage', traduire('L’app n’a pas pu être vidée. Tes données ont été remises.'));
      }
      log.info(`[NouvelUtilisateur] vue lancée : ${m.tables.length} tables, ${m.cles} clés, ${m.valeursCoffre} valeurs du trousseau`);
      return { tables: m.tables.length, lignes: m.tables.reduce((n, t) => n + t.lignes, 0), cles: m.cles, coffre: m.valeursCoffre };
    });
  }

  /** Vérifie que l'app contient exactement la copie ; renvoie la liste de ce qui ne va pas */
  async function ecarts(live: BaseSql, bak: BaseSql, m: Manifeste): Promise<string[]> {
    const pb: string[] = [];
    const presentes = new Set(await tablesDe(live));
    for (const t of m.tables) {
      if (!presentes.has(t.nom)) {
        pb.push(`table ${t.nom} absente`);
        continue;
      }
      const cols = new Set(await colonnesDe(live, t.nom));
      const communes = t.colonnes.filter((c) => cols.has(c));
      const rows = await toutLire(live, t.nom, communes);
      // une colonne disparue compterait comme null : l'empreinte ne collerait plus, c'est voulu
      const completes = rows.map((r) => Object.fromEntries(t.colonnes.map((c) => [c, communes.includes(c) ? r[c] : null])));
      if (empreinte(completes, t.colonnes) !== t.empreinte) pb.push(`table ${t.nom}`);
    }
    const seqs = await lireSequences(live, m.tables.map((t) => t.nom));
    if (JSON.stringify(seqs) !== JSON.stringify(m.sequences ?? [])) pb.push('compteurs d’identifiants');
    const attendu = await bak.getAllAsync<{ cle: string; valeur: string }>(`SELECT cle, valeur FROM ${T_STOCKAGE}`);
    const lu = await lireToutesLesCles(p.stockage, attendu.map((a) => a.cle));
    for (const a of attendu) if (lu.get(a.cle) !== a.valeur) pb.push(`clé ${a.cle}`);
    const coffre = new Map((await bak.getAllAsync<{ nom: string; valeur: string }>(`SELECT nom, valeur FROM ${T_COFFRE}`)).map((r) => [r.nom, r.valeur]));
    for (const nom of m.nomsCoffre) {
      const v = await p.coffre.lire(nom).catch(() => '\u0000illisible');
      if ((coffre.get(nom) ?? null) !== (v ?? null)) pb.push(`trousseau ${nom}`);
    }
    return pb;
  }

  async function restaurer(): Promise<RapportRetour> {
    if (!(await p.sauvegarde.existe())) throw new ErreurVue('aucune', traduire('Aucune copie de tes données à remettre.'));
    const bak = await p.sauvegarde.ouvrir();
    const m = await lireManifeste(bak);
    if (!m || m.etat !== 'active') {
      // rien n'avait été effacé : l'app contient toujours tes données
      await p.sauvegarde.supprimer().catch(() => undefined);
      await p.stockage.multiRemove([CLE_VUE_NOUVEL_UTILISATEUR]).catch(() => undefined);
      return { tables: 0, lignes: 0, cles: 0, coffre: 0, rien: true };
    }
    const live = await p.live();

    // 1. la base : on vide tout ce qui n'est pas intact, puis on remet chaque table copiée
    const presentes = (await tablesDe(live)).filter((t) => !TABLES_INTACTES.includes(t));
    const copiees = new Set(m.tables.map((t) => t.nom));
    for (const t of presentes) {
      if (t.startsWith(PREFIXE_DEMO) && !copiees.has(t)) await live.execAsync(`DROP TABLE IF EXISTS ${q(t)};`);
    }
    const plan: { t: TableCopiee; communes: string[]; rows: Ligne[] }[] = [];
    for (const t of m.tables) {
      if (!presentes.includes(t.nom)) continue;
      const cols = new Set(await colonnesDe(live, t.nom));
      const communes = t.colonnes.filter((c) => cols.has(c));
      plan.push({ t, communes, rows: await toutLire(bak, `${PREFIXE_COPIE}${t.nom}`, communes) });
    }
    await sansClesEtrangeres(live, async () => {
      await live.withTransactionAsync(async () => {
        for (const t of presentes) if (!t.startsWith(PREFIXE_DEMO) || copiees.has(t)) await live.execAsync(`DELETE FROM ${q(t)};`);
        for (const x of plan) await inserer(live, x.t.nom, x.communes, x.rows);
        await ecrireSequences(live, presentes.filter((t) => !t.startsWith(PREFIXE_DEMO) || copiees.has(t)), m.sequences ?? []);
      });
    });

    // 2. les réglages : exactement ceux d'avant (les clés nées pendant la vue partent)
    const attendu = await bak.getAllAsync<{ cle: string; valeur: string }>(`SELECT cle, valeur FROM ${T_STOCKAGE}`);
    const garder = new Set(attendu.map((a) => a.cle));
    const enTrop = (await p.stockage.getAllKeys()).filter((k) => !garder.has(k));
    for (let i = 0; i < enTrop.length; i += 100) await p.stockage.multiRemove(enTrop.slice(i, i + 100));
    const paires = attendu.map((a) => [a.cle, a.valeur] as [string, string]);
    for (let i = 0; i < paires.length; i += 50) await p.stockage.multiSet(paires.slice(i, i + 50));

    // 3. le trousseau
    const coffre = new Map((await bak.getAllAsync<{ nom: string; valeur: string }>(`SELECT nom, valeur FROM ${T_COFFRE}`)).map((r) => [r.nom, r.valeur]));
    for (const nom of m.nomsCoffre) {
      const v = coffre.get(nom);
      if (typeof v === 'string') await p.coffre.ecrire(nom, v);
      else await p.coffre.effacer(nom);
    }

    // 4. vérification complète ; la copie n'est jetée que si tout colle
    const pb = await ecarts(live, bak, m);
    if (pb.length) {
      log.warn(`[NouvelUtilisateur] vérification ratée : ${pb.slice(0, 10).join(', ')}`);
      throw new ErreurVue('verification', traduire('Tes données ont été remises mais la vérification a trouvé {0} écart(s). La copie est gardée : relance « Revenir à mes données ».', pb.length));
    }
    await p.sauvegarde.supprimer();
    log.info('[NouvelUtilisateur] vraies données remises et vérifiées');
    return { tables: m.tables.length, lignes: m.tables.reduce((n, t) => n + t.lignes, 0), cles: attendu.length, coffre: coffre.size };
  }

  return {
    etat,
    lancer,
    revenir: () => verrou(restaurer),
    enCours: () => enCours,
  };
}

export type ServiceNouvelUtilisateur = ReturnType<typeof creerServiceNouvelUtilisateur>;

/**
 * Noms du trousseau à mettre de côté : les clés connues de YOROI et chaque clé AsyncStorage (d'anciennes versions
 * rangeaient certaines données aux deux endroits), nettoyés comme lib/security/secureStorage.ts, sans les clés qui ne
 * sont pas des données de l'utilisateur et doivent rester (jeton créateur, cache de l'abonnement, mot de passe des
 * sauvegardes).
 */
export function nomsCoffreAMettreDeCote(connues: readonly string[], clesStockage: readonly string[], gardees: readonly string[]): string[] {
  const nettoie = (c: string) => c.replace(/[^a-zA-Z0-9._-]/g, '_');
  const exclus = new Set(gardees.map(nettoie));
  const out: string[] = [];
  const vus = new Set<string>();
  for (const c of [...connues, ...clesStockage]) {
    if (!c) continue;
    const n = nettoie(c);
    if (exclus.has(n) || vus.has(n)) continue;
    vus.add(n);
    out.push(n);
  }
  return out;
}
