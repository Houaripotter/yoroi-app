/**
 * Tables de la base ajoutees a la synchro le 28 octobre 2026 : l'eau (hydratation), l'objectif de poids
 * (objectifs_poids) et les objectifs (objectives). Synchronisees ligne par ligne exactement comme les seances et
 * les pesees (lib/peerSyncService.ts : identifiant sync_uid, empreinte, pierres tombales).
 *
 * Elles ne partent que vers un telephone qui annonce le format par element (FORMAT_ELEMENTS), avec un « depuis »
 * a part : un telephone mis a jour plus tard les recoit toutes, au lieu de les manquer parce que son « depuis »
 * des anciennes tables etait deja avance.
 */
export interface SpecTable {
  /** colonnes cle etrangere : table parente */
  fks?: Record<string, string>;
  textPk?: boolean;
  natural?: (d: Record<string, any>) => string | null;
  requiresParent?: string[];
}

export const TABLES_ETENDUES: Array<[string, SpecTable]> = [
  ['hydratation', {}],
  ['objectifs_poids', { fks: { competition_id: 'competitions' } }],
  ['objectives', {}],
];

export const NOMS_TABLES_ETENDUES = new Set(TABLES_ETENDUES.map(([t]) => t));
