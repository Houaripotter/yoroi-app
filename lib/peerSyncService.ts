// ============================================
// YOROI - PEER SYNC SERVICE
// ============================================
// Synchronisation bidirectionnelle iPhone <-> iPad
// via Multipeer Connectivity (Bluetooth + WiFi local)
//
// PROTOCOLE :
//   1. Connexion détectée -> HANDSHAKE (échange du dernier timestamp de sync)
//   2. Chaque appareil envoie les enregistrements modifiés depuis ce timestamp
//   3. Réception -> UPSERT (INSERT OR REPLACE si le record distant est plus récent)
//   4. ACK mutuel -> sauvegarde du nouveau timestamp
//
// ANTI-DOUBLONS :
//   - Chaque enregistrement a un id + created_at
//   - INSERT OR REPLACE sur la clé primaire
//   - Si l'enregistrement local est plus récent, on l'ignore (on ne l'écrase pas)
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import MultipeerBridge, { PeerChangedEvent, DataReceivedEvent } from './multipeerBridge';
import { openDatabase } from './database';
import logger from './security/logger';

// ============================================
// CONSTANTES
// ============================================

const LAST_SYNC_KEY = '@yoroi_peer_last_sync';
// v2 : ajout de toutes les tables manquantes + sync des clés AsyncStorage (KV).
// Les anciens devices v1 continuent de fonctionner (on ignore les champs inconnus).
const PROTOCOL_VERSION = '2';

// Tables synchronisées dans l'ordre (FK : clubs avant trainings, etc.)
// v2 : version étendue qui couvre TOUTES les données utilisateur SQLite.
const SYNC_TABLES = [
  // Core user data
  'profile',
  'clubs',
  'weights',
  'measurements',
  'trainings',
  'body_compositions',
  // Santé & bien-être
  'sleep_entries',
  'fasting_sessions',
  // Planning & goals
  'weekly_plan',
  'slot_occurrences',
  'training_goals',
  // Compétition & combat
  'competitions',
  'combats',
  'injuries',
  'injury_eva_history',
  'injury_treatments',
  'treatment_reminders',
  // Gamification
  'achievements',
  // Training Journal (v5.5)
  'progression_items',
  'practice_logs',
] as const;

type SyncTable = typeof SYNC_TABLES[number];

// Clés AsyncStorage synchronisées entre devices (v2)
// → partenaires, templates game plans, records, etc. (tout ce qui n'est pas en SQLite)
// Les valeurs sont des strings JSON, on les transfère telles quelles.
const SYNC_KV_KEYS = [
  '@yoroi_sparring_partners',
  '@yoroi_playbook_custom_gamePlan',
  '@yoroi_playbook_custom_whatWorked',
  '@yoroi_playbook_custom_whatDidntWork',
  '@yoroi_playbook_custom_counteredBy',
  '@yoroi_playbook_custom_improvement',
  '@yoroi_drill_tracker',
  '@yoroi_gameplan_checked',
  '@yoroi_tool_favorites',
  '@yoroi_benchmarks_v2',
  '@yoroi_skills_v2',
  '@yoroi_personal_records',
  '@yoroi_training_loads',
  '@yoroi_health_bonus_history',
  '@sparring_weekly_goal',
  'bjj_fav_submissions_v2',
  '@yoroi_photo_history',
  // Apparence / personnalisation
  'yoroi_theme_color_v5',
  'yoroi_theme_mode_v5',
  '@yoroi_tab_order',
  '@yoroi_avatar_config',
  '@yoroi_user_gear',
  '@yoroi_user_mode',
  '@yoroi_weight_category',
  '@yoroi_belt',
] as const;

// ============================================
// TYPES DU PROTOCOLE
// ============================================

type MessageType = 'HANDSHAKE' | 'SYNC_DATA' | 'SYNC_ACK';

interface SyncMessage {
  type: MessageType;
  v: string;           // version protocole
  device: string;      // nom de l'appareil émetteur
  // HANDSHAKE
  lastSyncTs?: string;
  // SYNC_DATA
  tables?: Partial<Record<SyncTable, any[]>>;
  kv?: Record<string, { value: string | null; updatedAt: string }>; // v2 : AsyncStorage clés
  ts?: string;         // timestamp de cet envoi
  // SYNC_ACK
  ackTs?: string;
}

interface PeerState {
  device: string;
  lastSyncTs: string;
}

// ============================================
// ETAT DU SERVICE
// ============================================

export interface SyncStatus {
  connectedPeers: string[];
  isSyncing: boolean;
  lastSyncTs: string | null;
  lastSyncDevice: string | null;
}

let myDeviceName = 'Mon appareil';
const peerStates = new Map<string, PeerState>();
let subscriptions: Array<{ remove: () => void }> = [];
let statusListeners: Array<(s: SyncStatus) => void> = [];
let isRunning = false;

let status: SyncStatus = {
  connectedPeers: [],
  isSyncing: false,
  lastSyncTs: null,
  lastSyncDevice: null,
};

const setStatus = (patch: Partial<SyncStatus>) => {
  status = { ...status, ...patch };
  statusListeners.forEach(cb => cb(status));
};

// ============================================
// API PUBLIQUE
// ============================================

/** Démarre le service de sync pair-à-pair */
export const initPeerSync = async (): Promise<void> => {
  if (!MultipeerBridge.isAvailable || isRunning) return;

  try {
    myDeviceName = await MultipeerBridge.getDeviceName();

    // Charger le dernier timestamp connu
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      status.lastSyncTs    = saved.ts     ?? null;
      status.lastSyncDevice = saved.device ?? null;
    }

    // Abonnements aux événements natifs
    subscriptions.push(
      MultipeerBridge.onPeerChanged(onPeerChanged),
      MultipeerBridge.onDataReceived(onDataReceived),
    );

    await MultipeerBridge.startDiscovery();
    isRunning = true;
    logger.info('[PeerSync] Démarré sur', myDeviceName);
  } catch (err) {
    logger.error('[PeerSync] Erreur init:', err);
  }
};

/** Arrête le service */
export const stopPeerSync = async (): Promise<void> => {
  subscriptions.forEach(s => s.remove());
  subscriptions = [];
  peerStates.clear();
  await MultipeerBridge.stopDiscovery();
  isRunning = false;
};

/** Abonne un composant aux mises à jour de statut */
export const onSyncStatusChange = (
  cb: (s: SyncStatus) => void
): (() => void) => {
  statusListeners.push(cb);
  cb(status); // état immédiat
  return () => { statusListeners = statusListeners.filter(l => l !== cb); };
};

/** Retourne le statut courant */
export const getSyncStatus = (): SyncStatus => ({ ...status });

// ============================================
// GESTION DES CONNEXIONS
// ============================================

const onPeerChanged = async (event: PeerChangedEvent) => {
  const { peer, state } = event;
  logger.info(`[PeerSync] ${peer} -> ${state}`);

  const peers = await MultipeerBridge.getConnectedPeers();
  setStatus({ connectedPeers: peers });

  if (state === 'connected') {
    // Envoyer notre handshake pour démarrer la sync
    await sendHandshake();
  } else if (state === 'disconnected') {
    peerStates.delete(peer);
    setStatus({ isSyncing: false });
  }
};

// ============================================
// ENVOI DU HANDSHAKE
// ============================================

const sendHandshake = async () => {
  const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
  const lastSyncTs = raw
    ? (JSON.parse(raw).ts ?? '1970-01-01 00:00:00')
    : '1970-01-01 00:00:00';

  await MultipeerBridge.sendData({
    type: 'HANDSHAKE',
    v: PROTOCOL_VERSION,
    device: myDeviceName,
    lastSyncTs,
  } satisfies SyncMessage);
};

// ============================================
// RECEPTION DES MESSAGES
// ============================================

const onDataReceived = async (event: DataReceivedEvent) => {
  try {
    const msg = JSON.parse(event.data) as SyncMessage;
    switch (msg.type) {
      case 'HANDSHAKE': await handleHandshake(event.peer, msg); break;
      case 'SYNC_DATA':  await handleSyncData(event.peer, msg);  break;
      case 'SYNC_ACK':   await handleSyncAck(event.peer, msg);   break;
    }
  } catch (err) {
    logger.error('[PeerSync] Erreur réception:', err);
  }
};

// ============================================
// PHASE 1 : HANDSHAKE
// ============================================

const handleHandshake = async (peer: string, msg: SyncMessage) => {
  const peerLastSyncTs = msg.lastSyncTs ?? '1970-01-01 00:00:00';

  peerStates.set(peer, {
    device: msg.device || peer,
    lastSyncTs: peerLastSyncTs,
  });

  // Envoyer les données que le pair n'a pas encore
  await sendDelta(peerLastSyncTs);
};

// ============================================
// PHASE 2 : ENVOI DES DONNÉES (DELTA)
// ============================================

const sendDelta = async (sinceTs: string) => {
  try {
    setStatus({ isSyncing: true });

    const db = await openDatabase();
    const tables: Partial<Record<SyncTable, any[]>> = {};
    let total = 0;

    for (const table of SYNC_TABLES) {
      try {
        // Essaie d'utiliser created_at, fallback sur une simple lecture full-table
        // pour les tables sans created_at (ex: achievements si c'est une table de mapping)
        let rows: Record<string, unknown>[] = [];
        try {
          rows = (await db.getAllAsync(
            `SELECT * FROM ${table} WHERE created_at > ? ORDER BY created_at ASC LIMIT 1000`,
            [sinceTs]
          )) as Record<string, unknown>[];
        } catch {
          // Colonne created_at absente → fallback : envoyer toute la table
          // (utile pour les petites tables comme achievements, training_goals)
          rows = (await db.getAllAsync(`SELECT * FROM ${table} LIMIT 1000`)) as Record<string, unknown>[];
        }
        if (rows.length > 0) {
          tables[table] = rows.map(sanitizeForTransfer);
          total += rows.length;
        }
      } catch {
        // Table inexistante sur cette version -> ignorer silencieusement
      }
    }

    // v2 : sync des clés AsyncStorage (partenaires, templates, records…)
    const kv = await collectKVDelta(sinceTs);

    const ts = nowTs();
    await MultipeerBridge.sendData({
      type: 'SYNC_DATA',
      v: PROTOCOL_VERSION,
      device: myDeviceName,
      tables,
      kv,
      ts,
    } satisfies SyncMessage);

    const kvCount = Object.keys(kv).length;
    logger.info(`[PeerSync] Envoi de ${total} enregistrements SQL + ${kvCount} clés KV (depuis ${sinceTs})`);
  } catch (err) {
    logger.error('[PeerSync] Erreur export delta:', err);
    setStatus({ isSyncing: false });
  }
};

/**
 * Collecte les valeurs AsyncStorage à envoyer au peer.
 *
 * DÉTECTION AUTOMATIQUE PAR HASH :
 * On stocke pour chaque clé un hash simple de sa dernière valeur synchronisée.
 * À chaque sync, on recalcule le hash. Si différent → la valeur a changé
 * quelque part et on l'inclut dans le delta. Pas besoin de brancher manuellement
 * une notification à chaque setItem dans l'app.
 */
const KV_HASHES_KEY = '@yoroi_kv_hashes';        // hash de la dernière valeur connue
const KV_TIMESTAMPS_KEY = '@yoroi_kv_timestamps'; // ts de la dernière modif détectée

/** Hash simple (FNV-1a 32-bit) rapide sur une string. Suffit pour détecter les changements. */
function fastHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

async function collectKVDelta(sinceTs: string): Promise<Record<string, { value: string | null; updatedAt: string }>> {
  const result: Record<string, { value: string | null; updatedAt: string }> = {};
  try {
    const [hashesRaw, tsRaw] = await Promise.all([
      AsyncStorage.getItem(KV_HASHES_KEY),
      AsyncStorage.getItem(KV_TIMESTAMPS_KEY),
    ]);
    const hashes: Record<string, string> = hashesRaw ? JSON.parse(hashesRaw) : {};
    const timestamps: Record<string, string> = tsRaw ? JSON.parse(tsRaw) : {};
    const now = nowTs();
    let anyChange = false;

    for (const key of SYNC_KV_KEYS) {
      const value = await AsyncStorage.getItem(key);
      const currentHash = fastHash(value ?? '__null__');
      const lastHash = hashes[key];

      if (currentHash !== lastHash) {
        // La valeur a changé depuis la dernière sync (ou jamais synchronisée)
        hashes[key] = currentHash;
        timestamps[key] = now;
        anyChange = true;
        result[key] = { value, updatedAt: now };
      } else {
        // Pas de changement, mais on envoie quand même si le ts > sinceTs
        // (cas où on a déjà envoyé mais le peer ne l'a pas reçu)
        const keyTs = timestamps[key] ?? '1970-01-01 00:00:00';
        if (keyTs > sinceTs) {
          result[key] = { value, updatedAt: keyTs };
        }
      }
    }

    if (anyChange) {
      await Promise.all([
        AsyncStorage.setItem(KV_HASHES_KEY, JSON.stringify(hashes)),
        AsyncStorage.setItem(KV_TIMESTAMPS_KEY, JSON.stringify(timestamps)),
      ]);
    }
  } catch (e) {
    logger.warn('[PeerSync] Erreur collecte KV:', e);
  }
  return result;
}

/**
 * (Optionnel, pour force manuelle) : marque une clé comme modifiée sans attendre
 * la détection automatique par hash. Utile pour déclencher une sync immédiate.
 */
export async function markKVKeyChanged(key: string): Promise<void> {
  if (!(SYNC_KV_KEYS as readonly string[]).includes(key)) return;
  try {
    const tsRaw = await AsyncStorage.getItem(KV_TIMESTAMPS_KEY);
    const timestamps: Record<string, string> = tsRaw ? JSON.parse(tsRaw) : {};
    timestamps[key] = nowTs();
    await AsyncStorage.setItem(KV_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    // On invalide aussi le hash pour forcer la détection au prochain collectKVDelta
    const hashesRaw = await AsyncStorage.getItem(KV_HASHES_KEY);
    const hashes: Record<string, string> = hashesRaw ? JSON.parse(hashesRaw) : {};
    delete hashes[key];
    await AsyncStorage.setItem(KV_HASHES_KEY, JSON.stringify(hashes));
  } catch { /* silent */ }
}

/** Supprime les champs trop lourds (photos base64) avant l'envoi réseau */
const sanitizeForTransfer = (row: Record<string, unknown>): Record<string, unknown> => {
  const clean = { ...row };
  // Photo de profil base64 pouvant peser plusieurs Mo
  if (typeof clean.profile_photo === 'string' && clean.profile_photo.length > 500) {
    delete clean.profile_photo;
  }
  return clean;
};

// ============================================
// PHASE 3 : RECEPTION ET UPSERT
// ============================================

const handleSyncData = async (peer: string, msg: SyncMessage) => {
  const { tables, kv, ts, device } = msg;
  // Au moins tables ou kv doit être présent pour traiter le message
  if (!tables && !kv) return;

  setStatus({ isSyncing: true });

  try {
    const db = await openDatabase();
    let imported = 0;
    let skipped = 0;

    // Applique les tables SQL
    if (tables) {
      for (const table of SYNC_TABLES) {
        const rows = tables[table];
        if (!rows || rows.length === 0) continue;

        for (const row of rows) {
          const inserted = await upsertRow(db, table, row);
          if (inserted) imported++;
          else skipped++;
        }
      }
    }

    // v2 : Applique les clés AsyncStorage reçues
    let kvApplied = 0;
    if (kv) {
      await applyKVDelta(kv);
      kvApplied = Object.keys(kv).length;
    }

    logger.info(`[PeerSync] Import depuis ${device || peer}: ${imported} SQL insérés, ${skipped} ignorés, ${kvApplied} clés KV appliquées`);

    // Émet un event pour que les écrans écoutant les KV changés rafraîchissent
    // (ex: autocomplete partenaires dans add-combat-session)
    if (kvApplied > 0) {
      DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
    }

    // Envoyer l'ACK
    const ackTs = ts ?? nowTs();
    await MultipeerBridge.sendData({
      type: 'SYNC_ACK',
      v: PROTOCOL_VERSION,
      device: myDeviceName,
      ackTs,
    } satisfies SyncMessage);

    await saveSyncTs(ackTs, device || peer);
    setStatus({ isSyncing: false, lastSyncTs: ackTs, lastSyncDevice: device || peer });
  } catch (err) {
    logger.error('[PeerSync] Erreur import:', err);
    setStatus({ isSyncing: false });
  }
};

/**
 * Applique les valeurs KV reçues du peer.
 * Stratégie "last-write-wins" : on compare avec notre updatedAt local.
 * Si la valeur reçue est plus récente → on l'applique. Sinon on garde la nôtre.
 */
async function applyKVDelta(kv: Record<string, { value: string | null; updatedAt: string }>): Promise<void> {
  try {
    const [tsRaw, hashesRaw] = await Promise.all([
      AsyncStorage.getItem(KV_TIMESTAMPS_KEY),
      AsyncStorage.getItem(KV_HASHES_KEY),
    ]);
    const timestamps: Record<string, string> = tsRaw ? JSON.parse(tsRaw) : {};
    const hashes: Record<string, string> = hashesRaw ? JSON.parse(hashesRaw) : {};

    for (const [key, payload] of Object.entries(kv)) {
      if (!(SYNC_KV_KEYS as readonly string[]).includes(key)) continue;

      const localTs = timestamps[key] ?? '1970-01-01 00:00:00';
      const remoteTs = payload.updatedAt;

      // Conflict resolution : plus récent gagne. En cas d'égalité : on garde local (pas de flicker).
      if (remoteTs > localTs) {
        if (payload.value === null) {
          await AsyncStorage.removeItem(key);
        } else {
          await AsyncStorage.setItem(key, payload.value);
        }
        timestamps[key] = remoteTs;
        // Met à jour le hash pour que la prochaine sync ne re-détecte pas ce changement comme local
        hashes[key] = fastHash(payload.value ?? '__null__');
      }
    }

    await Promise.all([
      AsyncStorage.setItem(KV_TIMESTAMPS_KEY, JSON.stringify(timestamps)),
      AsyncStorage.setItem(KV_HASHES_KEY, JSON.stringify(hashes)),
    ]);
  } catch (e) {
    logger.warn('[PeerSync] Erreur apply KV:', e);
  }
}

// ============================================
// PHASE 4 : ACK
// ============================================

const handleSyncAck = async (peer: string, msg: SyncMessage) => {
  const peerState = peerStates.get(peer);
  const ackTs = msg.ackTs ?? nowTs();

  await saveSyncTs(ackTs, peerState?.device || peer);
  setStatus({
    isSyncing: false,
    lastSyncTs: ackTs,
    lastSyncDevice: peerState?.device || peer,
  });

  logger.info(`[PeerSync] Sync complete avec ${peerState?.device || peer}`);
};

// ============================================
// UPSERT SANS DOUBLONS
// ============================================

/**
 * Insère ou remplace un enregistrement dans la table.
 * - Si l'enregistrement local est plus récent (created_at >=), on l'ignore.
 * - Sinon, INSERT OR REPLACE (remplace par la clé primaire id).
 * Retourne true si inséré, false si ignoré.
 */
const upsertRow = async (
  db: any,
  table: string,
  row: Record<string, unknown>
): Promise<boolean> => {
  try {
    // Vérifier si notre version locale est déjà plus récente
    if (row.id !== undefined) {
      const existing = (await db.getFirstAsync(
        `SELECT created_at FROM ${table} WHERE id = ?`,
        [row.id]
      )) as { created_at: string } | null;
      if (existing && existing.created_at >= ((row.created_at as string) ?? '')) {
        return false; // Notre version est plus fraîche -> ignorer
      }
    }

    // Construire INSERT OR REPLACE dynamique
    const cols = Object.keys(row).join(', ');
    const placeholders = Object.keys(row).map(() => '?').join(', ');
    const values = Object.values(row);

    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`,
      values
    );
    return true;
  } catch {
    // Colonne inconnue (migration différente entre appareils) -> ignorer ce row
    return false;
  }
};

// ============================================
// HELPERS
// ============================================

const nowTs = (): string =>
  new Date().toISOString().replace('T', ' ').split('.')[0];

const saveSyncTs = async (ts: string, device: string) => {
  await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ ts, device }));
};

export default { initPeerSync, stopPeerSync, onSyncStatusChange, getSyncStatus };
