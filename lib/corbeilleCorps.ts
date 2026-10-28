/**
 * Corbeille des pesées et des mensurations (28 octobre 2026, audit « ne jamais perdre de données »).
 * Même principe que la corbeille des séances (trash_trainings) : la ligne entière est copiée AVANT
 * l'effacement, gardée 30 jours, et se remet telle quelle (son id d'origine s'il est libre).
 * La copie ratée bloque la suppression : rien ne part sans copie. Seule exception : « Supprimer mes données »
 * (app/privacy-data.tsx, definitif), qui ne doit rien garder.
 * Partagé par lib/database.native.ts (téléphone) et lib/database.ts (web).
 */
export type TableCorps = 'weights' | 'measurements';
export type ElementCorbeilleCorps = {
  id: number;
  kind: TableCorps;
  original_id: number | null;
  date: string | null;
  deleted_at: string;
  /** pesée : le poids en kg */
  poids?: number | null;
};

type Db = {
  execAsync: (sql: string) => Promise<unknown>;
  runAsync: (sql: string, params?: any[]) => Promise<{ lastInsertRowId?: number; changes?: number } | any>;
  getFirstAsync: <T>(sql: string, params?: any[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, params?: any[]) => Promise<T[]>;
};

export const EVENEMENT_CORPS_SUPPRIME = 'YOROI_CORPS_SUPPRIME';
const TABLES: readonly TableCorps[] = ['weights', 'measurements'];

let pret = false;
export async function assurerCorbeilleCorps(db: Db): Promise<void> {
  if (pret) return;
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS trash_corps (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, original_id INTEGER, date TEXT, row_json TEXT NOT NULL, deleted_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  );
  try {
    await db.execAsync(`DELETE FROM trash_corps WHERE deleted_at < datetime('now', '-30 days')`);
  } catch {
    // le nettoyage attendra
  }
  pret = true;
}

/** Pour les tests : la table est recréée à la prochaine utilisation */
export function oublierCorbeilleCorpsPrete(): void {
  pret = false;
}

/**
 * Copie la ligne dans la corbeille puis l'efface. Renvoie l'id dans la corbeille (null : ligne introuvable,
 * ou suppression définitive). Copie ratée : l'erreur remonte, rien n'est effacé.
 */
export async function supprimerAvecCorbeille(db: Db, table: TableCorps, id: number, definitif = false): Promise<number | null> {
  if (!TABLES.includes(table)) throw new Error('table inconnue');
  let trashId: number | null = null;
  if (!definitif) {
    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (row) {
      await assurerCorbeilleCorps(db);
      const r = await db.runAsync('INSERT INTO trash_corps (kind, original_id, date, row_json) VALUES (?, ?, ?, ?)', [table, id, (row.date as string) ?? null, JSON.stringify(row)]);
      trashId = r?.lastInsertRowId ?? null;
      if (!trashId) throw new Error('corbeille indisponible');
    }
  }
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
  if (trashId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').DeviceEventEmitter.emit(EVENEMENT_CORPS_SUPPRIME, { trashId, kind: table });
    } catch {
      // sans barre « Annuler » : la ligne reste 30 jours dans la corbeille
    }
  }
  return trashId;
}

export async function lireCorbeilleCorps(db: Db): Promise<ElementCorbeilleCorps[]> {
  await assurerCorbeilleCorps(db);
  const rows = await db.getAllAsync<{ id: number; kind: TableCorps; original_id: number | null; date: string | null; deleted_at: string; row_json: string }>(
    `SELECT id, kind, original_id, date, deleted_at, row_json FROM trash_corps WHERE deleted_at >= datetime('now', '-30 days') ORDER BY deleted_at DESC, id DESC`,
  );
  return rows.map((r) => {
    let poids: number | null = null;
    if (r.kind === 'weights') {
      try {
        const v = JSON.parse(r.row_json);
        poids = typeof v?.weight === 'number' ? v.weight : null;
      } catch {
        poids = null;
      }
    }
    return { id: r.id, kind: r.kind, original_id: r.original_id, date: r.date, deleted_at: r.deleted_at, ...(r.kind === 'weights' ? { poids } : {}) };
  });
}

/** Remet la ligne (colonnes encore présentes dans la table) puis la retire de la corbeille. false : déjà remise. */
export async function restaurerCorps(db: Db, trashId: number): Promise<boolean> {
  await assurerCorbeilleCorps(db);
  const item = await db.getFirstAsync<{ kind: TableCorps; row_json: string }>('SELECT kind, row_json FROM trash_corps WHERE id = ?', [trashId]);
  if (!item) return false;
  if (!TABLES.includes(item.kind)) throw new Error('table inconnue');
  const row = JSON.parse(item.row_json) as Record<string, unknown>;
  const cols = new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${item.kind})`)).map((c) => c.name));
  const libre = row.id != null && !(await db.getFirstAsync(`SELECT id FROM ${item.kind} WHERE id = ?`, [row.id]));
  const keys = Object.keys(row).filter((k) => cols.has(k) && (k !== 'id' || libre));
  await db.runAsync(`INSERT INTO ${item.kind} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => (row[k] ?? null)));
  await db.runAsync('DELETE FROM trash_corps WHERE id = ?', [trashId]);
  return true;
}
