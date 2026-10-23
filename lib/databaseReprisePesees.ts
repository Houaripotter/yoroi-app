/**
 * Reprise des pesees de l'ancien ecran (19 octobre 2026, verification du passage 2.4.2 vers 3.0.0).
 *
 * La 2.4.2 rangeait certaines saisies dans le coffre seulement, jamais dans la table weights :
 *  - '@yoroi_measurements' : pesee de l'historique et des quetes (app/entry.tsx), import Sante des
 *    Reglages (lib/healthService.ts), mesures rapides, et les fichiers de sauvegarde 1.0 ;
 *  - '@yoroi_body_composition' : ecran « Ajouter composition » (app/body-composition.tsx).
 * La 3.0 ne lit ses pesees que dans la table weights : sans cette reprise, ces pesees ne s'affichent plus.
 *
 * Quand :
 *  - au lancement, UNE SEULE FOIS (marqueur '@yoroi_reprise_pesees_v1_faite') : ensuite la 3.0 ecrit elle-meme
 *    une copie de ses compositions dans ce coffre, a cote de la pesee de la base ; une pesee supprimee dans
 *    la 3.0 ne doit pas revenir depuis cette copie ;
 *  - a l'import d'une sauvegarde d'avant la 3.0 (sans allTables) ou d'une copie de securite, sur les entrees
 *    de ce fichier seulement.
 *
 * Regles :
 *  - le coffre n'est jamais modifie (aucune ecriture, aucun effacement) ;
 *  - une entree n'est reprise qu'une fois (identifiants gardes dans '@yoroi_reprise_pesees_v1') : une pesee
 *    supprimee ensuite dans la 3.0 ne revient pas ;
 *  - meme jour et meme poids qu'une pesee deja dans la base : pas de nouvelle ligne, seules les cases vides
 *    de composition sont remplies (rien n'est ecrase) ;
 *  - coffre illisible (iPhone verrouille) : rien n'est marque, la reprise se refait au lancement suivant ;
 *  - les donnees d'exemple du mode demo (identifiant « demo... ») ne sont jamais reprises.
 * Test : __tests__/unit/migration242Complete.test.ts
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import secureStorage from '@/lib/security/secureStorage';
import { logger } from '@/lib/security/logger';

export const REPRISE_PESEES_KEY = '@yoroi_reprise_pesees_v1';
export const REPRISE_PESEES_FAITE_KEY = '@yoroi_reprise_pesees_v1_faite';
const LISTES = ['@yoroi_measurements', '@yoroi_body_composition'] as const;

type BaseMinimale = SQLiteDatabase;
type Valeur = SQLiteBindValue;

const nombre = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Une liste du coffre ; lance une erreur si le coffre est illisible */
async function lireListe(cle: string): Promise<any[]> {
  const v = await secureStorage.getItemStrict(cle);
  if (Array.isArray(v)) return v;
  // tres anciennes versions : la liste etait encore dans AsyncStorage
  const ancien = await AsyncStorage.getItem(cle);
  if (!ancien) return [];
  try {
    const a = JSON.parse(ancien);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/** Entrees d'une sauvegarde d'avant la 3.0 : compositions et liste rapide (identifiant texte) */
export function entreesDeSauvegarde(data: any): { liste: string; e: any }[] {
  const out: { liste: string; e: any }[] = [];
  for (const e of Array.isArray(data?.bodyCompositions) ? data.bodyCompositions : []) out.push({ liste: '@yoroi_body_composition', e });
  for (const e of Array.isArray(data?.measurements) ? data.measurements : []) {
    if (e && typeof e.id === 'string') out.push({ liste: '@yoroi_measurements', e });
  }
  return out;
}

/** Entrees d'une copie du coffre (copie de securite d'avant mise a jour) : cles d'origine ou nettoyees */
export function entreesDeCopieDuCoffre(secure: Record<string, unknown> | null | undefined): { liste: string; e: any }[] {
  const out: { liste: string; e: any }[] = [];
  if (!secure || typeof secure !== 'object') return out;
  for (const liste of LISTES) {
    const brut = secure[liste] ?? secure[liste.replace(/[^a-zA-Z0-9._-]/g, '_')];
    let v: unknown = brut;
    if (typeof brut === 'string') {
      try { v = JSON.parse(brut); } catch { v = null; }
    }
    if (Array.isArray(v)) for (const e of v) out.push({ liste, e });
  }
  return out;
}

/**
 * Reprend dans la table weights les pesees gardees dans le coffre (une fois, au lancement), ou celles
 * d'une sauvegarde d'avant la 3.0 (opts.entrees). Renvoie le nombre de lignes ajoutees.
 */
export async function reprendrePeseesDuCoffre(database: BaseMinimale, opts?: { entrees?: { liste: string; e: any }[] }): Promise<number> {
  let entrees: any[] = [];
  const auLancement = !opts?.entrees;
  if (auLancement) {
    try {
      if (await AsyncStorage.getItem(REPRISE_PESEES_FAITE_KEY)) return 0;
    } catch {
      return 0; // illisible : on reessaiera
    }
    try {
      for (const cle of LISTES) entrees = entrees.concat((await lireListe(cle)).map((e) => ({ ...e, __liste: cle })));
    } catch (e) {
      logger.warn('[Reprise pesees] Coffre illisible, reprise au prochain lancement', e);
      return 0;
    }
  } else {
    entrees = (opts?.entrees ?? []).filter((x) => x?.e && typeof x.e === 'object').map((x) => ({ ...x.e, __liste: x.liste }));
  }
  if (!entrees.length) {
    if (auLancement) await AsyncStorage.setItem(REPRISE_PESEES_FAITE_KEY, new Date().toISOString()).catch(() => undefined);
    return 0;
  }

  let faites: Set<string>;
  try {
    const raw = await AsyncStorage.getItem(REPRISE_PESEES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    faites = new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    faites = new Set();
  }

  let colonnes: Set<string>;
  try {
    colonnes = new Set((await database.getAllAsync<{ name: string }>("PRAGMA table_info('weights')")).map((c) => c.name));
  } catch (e) {
    logger.warn('[Reprise pesees] Table des pesees illisible', e);
    return 0;
  }

  let ajoutees = 0;
  let marquees = 0;
  for (const e of entrees) {
    if (!e || typeof e !== 'object') continue;
    const poids = nombre(e.weight);
    const date = typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.date) ? e.date : null;
    if (poids == null || date == null || poids > 500) continue;
    // donnees d'exemple (mode demo des anciennes versions) : jamais reprises comme vraies pesees
    if (typeof e.id === 'string' && /^demo/i.test(e.id)) continue;
    // identifiant + jour + poids : les identifiants de la liste ne sont pas toujours uniques
    // (une restauration recree plusieurs entrees dans la meme milliseconde, meme identifiant bc_<heure>)
    const id = `${e.__liste}|${e.id ?? ''}|${date}|${poids}`;
    if (faites.has(id)) continue;
    const compo: Record<string, number | null> = {
      fat_percent: nombre(e.bodyFatPercent ?? e.body_fat ?? e.fat_percent),
      water_percent: nombre(e.waterPercent ?? e.water ?? e.water_percent),
      bone_mass: nombre(e.boneMass ?? e.bone_mass),
      visceral_fat: nombre(e.visceralFat ?? e.visceral_fat),
      metabolic_age: nombre(e.metabolicAge ?? e.metabolic_age),
      bmr: nombre(e.bmr),
      muscle_kg: nombre(e.muscleMass ?? e.muscle_mass),
    };
    const cases = Object.keys(compo).filter((k) => colonnes.has(k) && compo[k] != null);
    try {
      const deja = await database.getFirstAsync<Record<string, unknown>>(
        'SELECT * FROM weights WHERE substr(date, 1, 10) = ? AND ABS(weight - ?) < 0.05 LIMIT 1',
        [date.slice(0, 10), poids],
      );
      if (deja) {
        // meme pesee : seules les cases vides sont remplies
        const vides = cases.filter((k) => deja[k] == null);
        if (vides.length) {
          await database.runAsync(
            `UPDATE weights SET ${vides.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
            [...vides.map((k) => compo[k]), deja.id as Valeur],
          );
        }
      } else {
        const note = typeof e.notes === 'string' ? e.notes : typeof e.note === 'string' ? e.note : null;
        const source = typeof e.source === 'string' && e.source.trim() ? e.source.trim() : 'manual';
        const cols = ['weight', ...cases, 'note', 'source', 'date'];
        const vals: Valeur[] = [poids, ...cases.map((k) => compo[k]), note, source, date];
        const creee = typeof e.created_at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.created_at) ? e.created_at.replace('T', ' ').slice(0, 19) : null;
        if (creee && colonnes.has('created_at')) { cols.push('created_at'); vals.push(creee); }
        await database.runAsync(`INSERT INTO weights (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
        ajoutees++;
      }
      faites.add(id);
      marquees++;
    } catch (err) {
      logger.warn('[Reprise pesees] Pesee non reprise', err);
    }
  }
  if (marquees) {
    try {
      await AsyncStorage.setItem(REPRISE_PESEES_KEY, JSON.stringify([...faites]));
    } catch (err) {
      logger.warn('[Reprise pesees] Liste des reprises non enregistree', err);
    }
  }
  if (auLancement) await AsyncStorage.setItem(REPRISE_PESEES_FAITE_KEY, new Date().toISOString()).catch(() => undefined);
  if (ajoutees) logger.info(`[Reprise pesees] ${ajoutees} pesee(s) de l'ancien ecran reprise(s) dans la base`);
  return ajoutees;
}
