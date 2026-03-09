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
import MultipeerBridge, { PeerChangedEvent, DataReceivedEvent } from './multipeerBridge';
import { openDatabase } from './database';
import logger from './security/logger';

// ============================================
// CONSTANTES
// ============================================

const LAST_SYNC_KEY = '@yoroi_peer_last_sync';
const PROTOCOL_VERSION = '1';

// Tables synchronisées dans l'ordre (clubs avant trainings pour les FK)
const SYNC_TABLES = [
  'profile',
  'clubs',
  'weights',
  'measurements',
  'trainings',
  'sleep_entries',
  'fasting_sessions',
  'weekly_plan',
] as const;

type SyncTable = typeof SYNC_TABLES[number];

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
        const rows = (await db.getAllAsync(
          `SELECT * FROM ${table} WHERE created_at > ? ORDER BY created_at ASC LIMIT 1000`,
          [sinceTs]
        )) as Record<string, unknown>[];
        if (rows.length > 0) {
          tables[table] = rows.map(sanitizeForTransfer);
          total += rows.length;
        }
      } catch {
        // Table inexistante sur cette version -> ignorer silencieusement
      }
    }

    const ts = nowTs();
    await MultipeerBridge.sendData({
      type: 'SYNC_DATA',
      v: PROTOCOL_VERSION,
      device: myDeviceName,
      tables,
      ts,
    } satisfies SyncMessage);

    logger.info(`[PeerSync] Envoi de ${total} enregistrements (depuis ${sinceTs})`);
  } catch (err) {
    logger.error('[PeerSync] Erreur export delta:', err);
    setStatus({ isSyncing: false });
  }
};

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
  const { tables, ts, device } = msg;
  if (!tables) return;

  setStatus({ isSyncing: true });

  try {
    const db = await openDatabase();
    let imported = 0;
    let skipped = 0;

    for (const table of SYNC_TABLES) {
      const rows = tables[table];
      if (!rows || rows.length === 0) continue;

      for (const row of rows) {
        const inserted = await upsertRow(db, table, row);
        if (inserted) imported++;
        else skipped++;
      }
    }

    logger.info(`[PeerSync] Import depuis ${device || peer}: ${imported} insérés, ${skipped} ignorés`);

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
