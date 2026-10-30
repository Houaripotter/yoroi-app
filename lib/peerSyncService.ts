// ============================================
// YOROI - PEER SYNC SERVICE (protocole v3)
// ============================================
// Synchronisation bidirectionnelle iPhone <-> iPad
// via Multipeer Connectivity (Bluetooth + WiFi local), zéro serveur.
//
// POURQUOI UNE v3 :
//   La v2 identifiait les enregistrements par leur id SQLite local (AUTOINCREMENT).
//   Chaque appareil numérote ses lignes de son côté : l'id 7 de l'iPad et l'id 7
//   de l'iPhone sont deux séances différentes, et INSERT OR REPLACE écrasait l'une
//   par l'autre. Les modifications et suppressions n'étaient jamais transmises,
//   et les clés étrangères (club, compétition, blessure...) pointaient vers de
//   mauvaises lignes.
//
// PRINCIPES v3 :
//   1. IDENTITÉ GLOBALE : chaque ligne reçoit un identifiant de synchro `sync_uid`,
//      identique sur tous les appareils. Il est déterministe (calculé à partir du
//      contenu ou d'une clé naturelle), donc deux appareils qui ont déjà les mêmes
//      données (même sauvegarde restaurée, mêmes séances Apple Santé) les
//      reconnaissent au lieu de les dupliquer.
//   2. DÉTECTION AUTOMATIQUE DES CHANGEMENTS : une empreinte (hash) de chaque ligne
//      est mémorisée dans `sync_state`. À chaque synchro, les lignes dont
//      l'empreinte a changé sont marquées modifiées. Aucune modification de l'app
//      n'est nécessaire pour que les éditions soient propagées.
//   3. SUPPRESSIONS : une ligne disparue laisse une "pierre tombale"
//      (`sync_tombstones`) transmise aux autres appareils. Garde-fou : une
//      disparition massive (réinitialisation, bug) ne propage AUCUNE suppression.
//   4. CONFLITS : la version la plus récente gagne (last write wins), comparée
//      sur l'heure de modification d'origine.
//   5. CLÉS ÉTRANGÈRES : transmises sous forme de sync_uid du parent, puis
//      retraduites en id local à la réception.
//   6. ENVOI PAR PAQUETS : les données partent en plusieurs messages (~200 Ko)
//      adressés à un appareil précis, jamais un seul énorme message.
//   7. COMPATIBILITÉ : un appareil encore en v2 ne reçoit que les réglages (clés
//      AsyncStorage) ; ses données SQL ne sont jamais appliquées ici, et les nôtres
//      ne peuvent pas être appliquées chez lui. Rien n'est écrasé.
// ============================================

// SECURITE (13 octobre 2026) : la v3 d'origine acceptait n'importe quel appareil YOROI a proximite et lui
// envoyait toutes les donnees. Desormais :
//   . on n'echange qu'avec un appareil appaire par code a 6 chiffres (lib/v2/sync/appairageSpake.ts depuis le 30 octobre) ;
//   . chaque message est chiffre et authentifie avec la cle de la paire : le module natif diffuse a tous
//     les appareils connectes, un appareil non appaire ne recoit que des octets illisibles ;
//   . les appareils encore en v2 (sans chiffrement) ne recoivent plus rien.
//
// SYNCHRO AUTOMATIQUE (30 octobre 2026, lib/v2/synchro/auto.ts) : des que l'app est au premier plan et qu'au moins
// un appareil est appaire, la recherche tourne ; elle s'arrete a la mise en arriere plan. Deux appareils appaires
// proches se relient et s'echangent tout seuls ; apres un enregistrement, l'envoi part aussi vers ceux qui sont
// relies. Sans appareil appaire, rien ne tourne hors de l'ecran « Tes appareils ».
// Plus de deux appareils : chaque appareil relaie ce qu'il a recu (heure de reception locale, origine retenue),
// iPhone, iPad et Mac finissent avec les memes donnees, et ce que la montre donne a l'iPhone repart vers les autres.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getRandomBytes } from 'expo-crypto';
import { DeviceEventEmitter } from 'react-native';
import {
  DUREE_CODE_MS,
  codeValide,
  genererCode,
  ouvrir,
  sceller,
  type Enveloppe,
} from './v2/sync/appairage';
// 30 octobre 2026 : appairage version 2 (SPAKE2), le code ne peut plus etre retrouve hors ligne par un espion
import {
  confirmationValide,
  creerDemandeSpake,
  estDemandeSpake,
  lireAcceptationSpake,
  repondreSpake,
  type EnAttenteAffiche,
  type SecretSaisi,
} from './v2/sync/appairageSpake';
import MultipeerBridge, { PeerChangedEvent, DataReceivedEvent } from './multipeerBridge';
import { openDatabase } from './database';
import { CLE_PRATIQUES, EVENT_PRATIQUES, pratiquesPourEnvoi, pratiquesRecues, type ClubLeger } from './v2/profil/pratiques';
import logger from './security/logger';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
// 28 octobre 2026 : listes fusionnees par element, nouvelles donnees, journal du dernier echange (lib/v2/synchro)
import { FORMAT_ELEMENTS, type EtatEnvoi } from './v2/synchro/fusion';
import { CLES_ANCIENNES_PAR_ELEMENT } from './v2/synchro/cles';
import { appliquer as appliquerElements, appliquerAncienFormat, collecter as collecterElements } from './v2/synchro/elements';
import { NOMS_TABLES_ETENDUES, TABLES_ETENDUES } from './v2/synchro/tables';
import { ajouter, noterEchange, noterErreur, typeDeTable } from './v2/synchro/journal';

// ============================================
// CONSTANTES
// ============================================

const PROTOCOL_VERSION = '3';
const LAST_SYNC_KEY = '@yoroi_peer_last_sync';          // affichage (dernière synchro réussie)
const SINCE_MAP_KEY = '@yoroi_peer_since_v3';           // { deviceId: ts (horloge du pair) }
const SINCE_X_KEY = '@yoroi_peer_since_x_v1';           // idem pour le format par element (tables et cles ajoutees le 28 octobre 2026)
const DEVICE_ID_KEY = '@yoroi_peer_device_id';          // identifiant unique de cet appareil
const HAD_V2_KEY = '@yoroi_peer_had_v2';                // a déjà synchronisé avec l'ancienne version
const CHUNK_MAX_BYTES = 150 * 1024;                     // taille max d'un message avant chiffrement (base64 : +33 %)
const PAIRS_KEY = 'yoroi_peer_pairs_v1';                // SecureStore : appareils appaires et leur cle
const ESSAIS_MAX_APPAIRAGE = 5;                         // essais de code toleres avant d'annuler l'appairage (5 chances sur 1 million)
const DELAI_ENVOI_AUTO_MS = 4000;                       // apres un enregistrement, envoi aux appareils appaires relies
const KV_RELAIS_KEY = '@yoroi_peer_kv_relais_v1';       // reglages recus d'un pair : heure locale de reception, pour les relayer aux autres
const MASS_DELETE_MIN = 10;                             // garde-fou suppressions massives
const MASS_DELETE_RATIO = 0.5;

interface TableSpec {
  /** colonnes clé étrangère -> table parente */
  fks?: Record<string, string>;
  /** clé primaire texte (non AUTOINCREMENT) : l'id fait partie des données */
  textPk?: boolean;
  /** clé naturelle (identique sur tous les appareils) ; null = identifiant basé sur le contenu */
  natural?: (d: Record<string, any>) => string | null;
  /** une ligne sans parent n'a pas de sens : on ne l'insère pas */
  requiresParent?: string[];
}

// Ordre important : parents avant enfants
const TABLES: Array<[string, TableSpec]> = [
  ['profile', { natural: () => 'profile' }],
  ['clubs', {}],
  ['weights', {}],
  ['measurements', {}],
  ['body_compositions', {}],
  ['sleep_entries', {}],
  ['fasting_sessions', {}],
  ['weekly_plan', { fks: { club_id: 'clubs' } }],
  ['trainings', {
    fks: { club_id: 'clubs', weekly_plan_id: 'weekly_plan' },
    natural: d => (d.healthkit_uuid ? `hk:${d.healthkit_uuid}` : null),
  }],
  ['training_goals', { natural: d => (d.sport_id ? `tg:${d.sport_id}` : null) }],
  ['competitions', {}],
  ['combats', { fks: { competition_id: 'competitions' }, requiresParent: ['competition_id'] }],
  ['injuries', {}],
  ['injury_eva_history', { fks: { injury_id: 'injuries' }, requiresParent: ['injury_id'] }],
  ['injury_treatments', { fks: { injury_id: 'injuries' }, requiresParent: ['injury_id'] }],
  ['treatment_reminders', { fks: { injury_id: 'injuries' }, requiresParent: ['injury_id'] }],
  ['slot_occurrences', {
    fks: { weekly_plan_id: 'weekly_plan', training_id: 'trainings', injury_id: 'injuries' },
    natural: d => (d.weekly_plan_id && d.week_start ? `so:${d.weekly_plan_id}|${d.week_start}` : null),
  }],
  ['achievements', { textPk: true, natural: d => (d.id != null ? `ach:${d.id}` : null) }],
  ['progression_items', {}],
  ['practice_logs', { fks: { item_id: 'progression_items' }, requiresParent: ['item_id'] }],
  // 28 octobre 2026 : eau, objectif de poids, objectifs (envoyees seulement a un telephone a jour, voir tables.ts)
  ...TABLES_ETENDUES,
];
const TABLE_ORDER = new Map(TABLES.map(([t], i) => [t, i]));
const SPEC = new Map(TABLES);

// Clés AsyncStorage synchronisées (celles de la v2, puis @yoroi_pratiques le 28 octobre 2026 : un appareil plus ancien l ignore)
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
  // 28 octobre 2026 : '@yoroi_benchmarks_v2' et '@yoroi_skills_v2' retirees, le carnet est range sans @ et passe
  // desormais par element (lib/v2/synchro/cles.ts). Partenaires, records, charges et photos y sont aussi fusionnes.
  '@yoroi_personal_records',
  '@yoroi_training_loads',
  '@yoroi_health_bonus_history',
  '@sparring_weekly_goal',
  'bjj_fav_submissions_v2',
  '@yoroi_photo_history',
  'yoroi_theme_color_v5',
  'yoroi_theme_mode_v5',
  '@yoroi_tab_order',
  '@yoroi_avatar_config',
  '@yoroi_user_gear',
  '@yoroi_user_mode',
  '@yoroi_weight_category',
  '@yoroi_belt',
  // 28 octobre 2026 : tes pratiques (sport, club, ceinture), recalees sur les clubs de chaque telephone par leur nom
  '@yoroi_pratiques',
] as const;

// ============================================
// TYPES DU PROTOCOLE
// ============================================

type KVDelta = Record<string, { value: string | null; updatedAt: string }>;

interface SyncItem { t: string; uid: string; u: number; d: Record<string, any> }
interface Tombstone { t: string; uid: string; u: number }

interface SyncMessage {
  type: 'HANDSHAKE' | 'SYNC_DATA' | 'SYNC_ACK';
  v: string;
  device: string;
  // v3
  from?: string;
  to?: string;
  since?: Record<string, number>;
  syncId?: string;
  seq?: number;
  last?: boolean;
  rows?: SyncItem[];
  tombs?: Tombstone[];
  kv3?: KVDelta;
  legacy?: boolean;    // l'expéditeur a déjà synchronisé en v2
  // 28 octobre 2026 : format par element. Absent chez un telephone pas encore a jour, qui ignore ces champs.
  fx?: number;                          // version du format par element connue de l'expediteur
  sinceX?: Record<string, number>;      // HANDSHAKE : jusqu'ou on a recu le format par element de chaque pair
  elems?: EtatEnvoi[];                  // SYNC_DATA : elements modifies (listes, reglages ajoutes)
  rappel?: boolean;                     // HANDSHAKE : « Synchroniser maintenant », l'autre envoie aussi le sien
  // v2 (compatibilité)
  lastSyncTs?: string;
  tables?: Record<string, any[]>;
  kv?: KVDelta;
  ts?: string | number;
  ackTs?: string | number;
}

// ============================================
// ÉTAT DU SERVICE
// ============================================

/** Appairage en cours : affiche un code, ou en a tape un */
export interface AppairageEnCours {
  role: 'affiche' | 'saisit';
  code: string;
  expireA: number;
}

export interface AppareilAppaire {
  id: string;
  nom: string;
}

export interface SyncStatus {
  /** Appareils APPAIRES actuellement relies (authentifies), jamais les inconnus a proximite */
  connectedPeers: string[];
  /** Appareils appaires, relies ou non */
  paires: AppareilAppaire[];
  appairage: AppairageEnCours | null;
  /** Message du dernier appairage : reussi, expire, refuse */
  appairageResultat?: 'reussi' | 'expire' | 'annule' | null;
  isSyncing: boolean;
  lastSyncTs: string | null;
  lastSyncDevice: string | null;
  /** Nom d'un appareil connecté qui utilise une ancienne version de Yoroi */
  outdatedPeer?: string | null;
}

let myDeviceName = traduire('Mon appareil');
let myDeviceId = '';
let subscriptions: Array<{ remove: () => void }> = [];
let statusListeners: Array<(s: SyncStatus) => void> = [];
let isRunning = false;
let schemaReady = false;

let status: SyncStatus = {
  connectedPeers: [],
  paires: [],
  appairage: null,
  appairageResultat: null,
  isSyncing: false,
  lastSyncTs: null,
  lastSyncDevice: null,
  outdatedPeer: null,
};

const setStatus = (patch: Partial<SyncStatus>) => {
  status = { ...status, ...patch };
  statusListeners.forEach(cb => {
    try { cb(status); } catch { /* ignore */ }
  });
};

// File d'attente : scans, envois et imports ne se chevauchent jamais
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
  const run = queue.then(fn).catch(err => {
    logger.error(`[PeerSync] Erreur ${label}:`, err);
    void noterErreur(`${label} : ${String((err as Error)?.message ?? err)}`).catch(() => undefined);
    return undefined;
  });
  queue = run;
  return run;
};

// Pendant une demo du Studio, la base contient le profil Heny : rien ne part vers un autre
// appareil et rien n'est applique ici. La synchro reprend quand les vraies donnees reviennent.
const demoBlocksSync = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem('@yoroi_demo_data_active')) === 'true';
  } catch {
    return false;
  }
};

let scanTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Apres un enregistrement : detection des changements, puis (30 octobre 2026) envoi automatique si un appareil
 * appaire est relie en ce moment. Rien ne part vers un appareil non appaire : l'envoi passe par envoyerA.
 */
const scheduleBackgroundScan = () => {
  if (scanTimer) clearTimeout(scanTimer);
  if (Date.now() < suppressBackgroundScanUntil) return; // changement venant de la synchro elle-même
  scanTimer = setTimeout(() => {
    scanTimer = null;
    if (status.isSyncing && relies.size === 0) return;
    enqueue(traduire('détection des changements'), async () => {
      if (await demoBlocksSync()) return;
      const db = await openDatabase();
      await scanAll(db);
      if (isRunning && relies.size > 0) await sendHandshake(true);
    });
  }, relies.size > 0 ? DELAI_ENVOI_AUTO_MS : 15000);
};

// ============================================
// APPAIRAGE ET CHIFFREMENT
// ============================================

const aleatoire = (n: number) => getRandomBytes(n);

type Paires = Record<string, { nom: string; cle: string }>;
let paires: Paires = {};
/** Appareils appaires authentifies dans cette session : id -> nom */
const relies = new Map<string, string>();

let appairage: (AppairageEnCours & {
  /** appareil qui tape le code : son secret SPAKE2 et sa demande */
  secret?: SecretSaisi;
  /** essais de code comptes : demandes distinctes recues (affiche) ou reponses fausses (saisit) */
  essais: number;
  /** ce qui a deja ete compte, pour qu'une demande renvoyee toutes les 3 s ne compte qu'une fois */
  vus: Set<string>;
  /** appareil qui affiche le code : reponses envoyees, en attente de la confirmation de l'autre */
  attentes: Map<string, EnAttenteAffiche>;
}) | null = null;
let appairageTimer: ReturnType<typeof setInterval> | null = null;

const publierPaires = () => {
  setStatus({
    paires: Object.entries(paires).map(([id, p]) => ({ id, nom: p.nom })),
    connectedPeers: Array.from(relies.values()),
  });
};

const chargerPaires = async () => {
  try {
    const raw = await SecureStore.getItemAsync(PAIRS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    paires = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    paires = {};
  }
  publierPaires();
};

const enregistrerPaires = async () => {
  try {
    await SecureStore.setItemAsync(PAIRS_KEY, JSON.stringify(paires));
  } catch (err) {
    logger.error('[PeerSync] Enregistrement de la paire impossible:', err);
  }
  publierPaires();
};

const finirAppairage = (resultat: 'reussi' | 'expire' | 'annule') => {
  if (appairageTimer) { clearInterval(appairageTimer); appairageTimer = null; }
  appairage = null;
  setStatus({ appairage: null, appairageResultat: resultat });
};

const publierAppairage = () => {
  setStatus({ appairage: appairage ? { role: appairage.role, code: appairage.code, expireA: appairage.expireA } : null, appairageResultat: null });
};

/** Envoie un message chiffre pour un appareil appaire precis. Rien ne part sans paire. */
const envoyerA = async (to: string, msg: SyncMessage): Promise<boolean> => {
  const p = paires[to];
  if (!p) return false;
  const env = sceller(p.cle, myDeviceId, to, JSON.stringify(msg), aleatoire);
  return MultipeerBridge.sendData(env);
};

const renvoyerDemande = async () => {
  if (!appairage || appairage.role !== 'saisit' || !appairage.secret) return;
  if (Date.now() > appairage.expireA) { finirAppairage('expire'); return; }
  await MultipeerBridge.sendData(appairage.secret.demande);
};

let renvoiConfirmation: ReturnType<typeof setTimeout> | null = null;

/** Un essai de code de plus. Vrai si l'appairage vient d'etre annule (trop d'essais). */
const compterEssai = (cle: string): boolean => {
  if (!appairage) return true;
  if (appairage.vus.has(cle)) return false;
  appairage.vus.add(cle);
  appairage.essais += 1;
  if (appairage.essais > ESSAIS_MAX_APPAIRAGE) { finirAppairage('annule'); return true; }
  return false;
};

/** Paire enregistree seulement quand l'autre a prouve connaitre le code */
const enregistrerNouvellePaire = async (id: string, nom: string, cle: string) => {
  paires[id] = { nom: String(nom || traduire('Appareil')).slice(0, 60), cle };
  await enregistrerPaires();
  finirAppairage('reussi');
  await sendHandshake();
};

/** Appareil qui affiche le code : une demande arrive. Il repond, mais n'enregistre rien avant la confirmation. */
const recevoirDemande = async (d: unknown) => {
  if (!appairage || appairage.role !== 'affiche') return;
  if (Date.now() > appairage.expireA) { finirAppairage('expire'); return; }
  if (!estDemandeSpake(d) || d.from === myDeviceId) return;
  const cle = `${d.from}|${d.X}`;
  const deja = appairage.attentes.get(cle);
  if (deja) { await MultipeerBridge.sendData(deja.reponse); return; }
  if (compterEssai(`demande|${cle}`)) return;
  const attente = repondreSpake(appairage.code, d, myDeviceId, myDeviceName, aleatoire);
  if (!attente) return;
  appairage.attentes.set(cle, attente);
  await MultipeerBridge.sendData(attente.reponse);
};

/** Appareil qui a tape le code : la reponse de l'appareil qui l'affiche */
const recevoirAcceptation = async (a: any) => {
  if (!appairage || appairage.role !== 'saisit' || !appairage.secret) return;
  if (!a || a.to !== myDeviceId) return;
  if (Date.now() > appairage.expireA) { finirAppairage('expire'); return; }
  const r = lireAcceptationSpake(appairage.secret, a);
  if (!r) { compterEssai(`reponse|${String(a.from)}|${String(a.Y)}`); return; }
  // la confirmation part deux fois : si la premiere se perd, l'autre appareil la recoit quand meme
  await MultipeerBridge.sendData(r.confirmation);
  if (renvoiConfirmation) clearTimeout(renvoiConfirmation);
  renvoiConfirmation = setTimeout(() => { renvoiConfirmation = null; if (isRunning) void MultipeerBridge.sendData(r.confirmation); }, 1500);
  await enregistrerNouvellePaire(a.from, a.device, r.cle);
};

/** Appareil qui affiche le code : la confirmation prouve que l'autre connait le code */
const recevoirConfirmation = async (c: any) => {
  if (!appairage || appairage.role !== 'affiche' || !c || c.to !== myDeviceId) return;
  for (const attente of appairage.attentes.values()) {
    if (attente.s !== c.from) continue;
    if (confirmationValide(attente, c)) { await enregistrerNouvellePaire(attente.s, attente.device, attente.cle); return; }
  }
};

/**
 * Appareil qui affiche le code : la confirmation s'est perdue mais l'autre a deja envoye un message chiffre avec la
 * cle de l'echange. Il ne peut l'avoir que s'il connait le code : c'est une confirmation. Vrai si la paire est faite.
 */
const confirmationParMessage = async (env: Enveloppe): Promise<boolean> => {
  if (!appairage || appairage.role !== 'affiche') return false;
  for (const attente of appairage.attentes.values()) {
    if (attente.s !== env.from) continue;
    if (ouvrir(attente.cle, env)) { await enregistrerNouvellePaire(attente.s, attente.device, attente.cle); return true; }
  }
  return false;
};

/** Cet appareil affiche un code a taper sur l'autre. Renvoie le code. */
export const commencerAppairageAffiche = async (): Promise<string> => {
  await initPeerSync();
  const code = genererCode(aleatoire);
  if (appairageTimer) clearInterval(appairageTimer);
  appairage = { role: 'affiche', code, expireA: Date.now() + DUREE_CODE_MS, essais: 0, vus: new Set(), attentes: new Map() };
  appairageTimer = setInterval(() => {
    if (appairage && Date.now() > appairage.expireA) finirAppairage('expire');
  }, 2000);
  publierAppairage();
  return code;
};

/** Cet appareil a tape le code affiche sur l'autre. Faux si le code n'a pas 6 chiffres. */
export const commencerAppairageSaisi = async (code: string): Promise<boolean> => {
  const propre = code.replace(/\D/g, '');
  if (!codeValide(propre)) return false;
  await initPeerSync();
  if (appairageTimer) clearInterval(appairageTimer);
  appairage = {
    role: 'saisit',
    code: propre,
    expireA: Date.now() + DUREE_CODE_MS,
    essais: 0,
    vus: new Set(),
    attentes: new Map(),
    secret: creerDemandeSpake(propre, myDeviceId, myDeviceName, aleatoire),
  };
  publierAppairage();
  // l'autre appareil peut se relier quelques secondes plus tard : on redemande regulierement
  await renvoyerDemande();
  appairageTimer = setInterval(() => { void renvoyerDemande(); }, 3000);
  return true;
};

export const annulerAppairage = () => {
  if (appairage) finirAppairage('annule');
};

/** Oublie un appareil : plus aucun echange avec lui, il faudra l'appairer de nouveau */
export const oublierAppareil = async (id: string): Promise<void> => {
  delete paires[id];
  relies.delete(id);
  await enregistrerPaires();
};

/** Oublie tous les appareils (utilise par Tout effacer) */
export const oublierTousLesAppareils = async (): Promise<void> => {
  paires = {};
  relies.clear();
  try { await SecureStore.deleteItemAsync(PAIRS_KEY); } catch { /* ignore */ }
  publierPaires();
};

// Réassemblage des paquets reçus (par synchro)
const pendingIncoming = new Map<string, { from: string; device: string; failures: number; compte: Record<string, number>; erreurs: string[] }>();

// ============================================
// API PUBLIQUE
// ============================================

let initEnCours: Promise<void> | null = null;

/** Démarre le service de sync pair-à-pair (une seule fois, meme appele plusieurs fois en meme temps) */
export const initPeerSync = async (): Promise<void> => {
  if (!MultipeerBridge.isAvailable || isRunning) return;
  if (initEnCours) return initEnCours;
  initEnCours = demarrer().finally(() => { initEnCours = null; });
  return initEnCours;
};

const demarrer = async (): Promise<void> => {
  if (isRunning) return;

  try {
    myDeviceName = await MultipeerBridge.getDeviceName();
    myDeviceId = await getOrCreateDeviceId();
    await chargerPaires();

    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        status.lastSyncTs = saved.ts ?? null;
        status.lastSyncDevice = saved.device ?? null;
        // Format v2 ("AAAA-MM-JJ HH:MM:SS", sans "T") : cet appareil a déjà synchronisé en v2
        if (typeof saved.ts === 'string' && !saved.ts.includes('T')) {
          await AsyncStorage.setItem(HAD_V2_KEY, 'true');
        }
      } catch { /* ignore */ }
    }
    hadV2Sync = (await AsyncStorage.getItem(HAD_V2_KEY)) === 'true';

    subscriptions.push(
      MultipeerBridge.onPeerChanged(onPeerChanged),
      MultipeerBridge.onDataReceived(onDataReceived),
      // Détecter les modifications peu après qu'elles ont lieu : l'heure retenue pour
      // départager deux modifications concurrentes est ainsi proche de l'heure réelle
      DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', scheduleBackgroundScan),
      // 30 octobre 2026 : mes seances et programmes partent aussi tout seuls vers un appareil appaire relie
      DeviceEventEmitter.addListener('YOROI_MES_SEANCES_CHANGED', scheduleBackgroundScan),
      DeviceEventEmitter.addListener('YOROI_PROGRAMME_CHANGED', scheduleBackgroundScan),
    );

    await MultipeerBridge.startDiscovery();
    isRunning = true;
    logger.info('[PeerSync] Démarré (v3) sur', myDeviceName);
  } catch (err) {
    logger.error('[PeerSync] Erreur init:', err);
  }
};

/** Arrête le service : plus de recherche, plus de connexion (mise en arriere plan, ecran ferme sans appareil appaire) */
export const stopPeerSync = async (): Promise<void> => {
  if (initEnCours) { try { await initEnCours; } catch { /* ignore */ } }
  if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
  if (renvoiConfirmation) { clearTimeout(renvoiConfirmation); renvoiConfirmation = null; }
  if (!isRunning && subscriptions.length === 0) return;
  subscriptions.forEach(s => s.remove());
  subscriptions = [];
  pendingIncoming.clear();
  if (appairage) finirAppairage('annule');
  relies.clear();
  setStatus({ connectedPeers: [] });
  await MultipeerBridge.stopDiscovery();
  isRunning = false;
};

/** Abonne un composant aux mises à jour de statut */
export const onSyncStatusChange = (cb: (s: SyncStatus) => void): (() => void) => {
  statusListeners.push(cb);
  cb(status);
  return () => { statusListeners = statusListeners.filter(l => l !== cb); };
};

/** Y a t il au moins un appareil appaire ? Lu dans le coffre sans rien demarrer (synchro automatique). */
export const aDesAppareilsAppaires = async (): Promise<boolean> => {
  if (Object.keys(paires).length > 0) return true;
  try {
    const raw = await SecureStore.getItemAsync(PAIRS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return !!parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
};

/** Le service tourne il (recherche des appareils active) ? */
export const synchroEnMarche = (): boolean => isRunning;

/** Retourne le statut courant */
export const getSyncStatus = (): SyncStatus => ({ ...status });

/**
 * Force une re-synchronisation avec tous les appareils connectés.
 * Retourne le nombre d'appareils contactés.
 */
export const forceSync = async (): Promise<number> => {
  if (!MultipeerBridge.isAvailable) return 0;
  const peers = await MultipeerBridge.getConnectedPeers();
  if (peers.length === 0 || Object.keys(paires).length === 0) return 0;
  try {
    // rappel : l'autre telephone renvoie aussi sa demande, l'echange part dans les deux sens
    await sendHandshake(true);
    return relies.size;
  } catch (err) {
    logger.error('[PeerSync] Erreur forceSync:', err);
    return 0;
  }
};

/** Renvoie le nom de l'appareil local (ex. "iPhone de Houari"). */
export const getMyDeviceName = (): string => myDeviceName;

/** Indique si le module natif Multipeer est disponible (iOS + linké). */
export const isPeerSyncAvailable = (): boolean => MultipeerBridge.isAvailable;

// ============================================
// CONNEXIONS
// ============================================

const onPeerChanged = async (event: PeerChangedEvent) => {
  const { peer, state } = event;
  logger.info(`[PeerSync] ${peer} -> ${state}`);

  const peers = await MultipeerBridge.getConnectedPeers();

  if (state === 'connected') {
    await sendHandshake();
    await renvoyerDemande();
  } else if (state === 'disconnected') {
    // on ne sait pas quel appareil appaire est parti (le natif ne donne que le nom affiche) : on revalide
    relies.clear();
    publierPaires();
    if (peers.length === 0) setStatus({ isSyncing: false, outdatedPeer: null });
    else await sendHandshake();
  }
};

const sendHandshake = async (rappel = false) => {
  const since = await loadSinceMap();
  const sinceX = await loadSinceMap(SINCE_X_KEY);
  const legacyRaw = await AsyncStorage.getItem(LAST_SYNC_KEY);
  let lastSyncTs = '1970-01-01 00:00:00';
  try { if (legacyRaw) lastSyncTs = JSON.parse(legacyRaw).legacyTs ?? lastSyncTs; } catch { /* ignore */ }

  for (const to of Object.keys(paires)) {
    await envoyerA(to, {
      type: 'HANDSHAKE',
      v: PROTOCOL_VERSION,
      device: myDeviceName,
      from: myDeviceId,
      to,
      since,
      lastSyncTs,
      fx: FORMAT_ELEMENTS,
      sinceX,
      ...(rappel ? { rappel: true } : {}),
    } satisfies SyncMessage);
  }
};

// ============================================
// RÉCEPTION
// ============================================

const onDataReceived = async (event: DataReceivedEvent) => {
  let brut: any;
  try {
    brut = JSON.parse(event.data);
  } catch (err) {
    logger.error('[PeerSync] Message illisible:', err);
    return;
  }

  try {
    // Appairage : seuls messages acceptes en clair, et seulement pendant un appairage en cours
    if (brut?.type === 'PAIR_REQUEST') { await recevoirDemande(brut); return; }
    if (brut?.type === 'PAIR_ACCEPT') { await recevoirAcceptation(brut); return; }
    if (brut?.type === 'PAIR_CONFIRM') { await recevoirConfirmation(brut); return; }

    // Tout le reste doit etre une enveloppe chiffree, pour nous, d'un appareil appaire
    if (brut?.type !== 'SEALED') return; // ancienne version ou inconnu : rien n'est lu, rien n'est renvoye
    const env = brut as Enveloppe;
    if (env.to !== myDeviceId) return;
    if (!paires[env.from] && !(await confirmationParMessage(env))) return;
    const paire = paires[env.from];
    if (!paire) return;
    const clair = ouvrir(paire.cle, env);
    if (!clair) return;
    const msg = JSON.parse(clair) as SyncMessage;
    if (msg.from !== env.from || msg.v !== PROTOCOL_VERSION) return;

    if (!relies.has(env.from)) {
      relies.set(env.from, paire.nom);
      publierPaires();
    }

    switch (msg.type) {
      case 'HANDSHAKE':
        enqueue('envoi delta', () => sendDeltaTo(msg));
        if (msg.rappel) await sendHandshake();
        break;
      case 'SYNC_DATA':
        enqueue('import', () => handleSyncData(msg));
        break;
      case 'SYNC_ACK':
        await handleAck(msg);
        break;
    }
  } catch (err) {
    logger.error('[PeerSync] Erreur réception:', err);
  }
};

// ============================================
// ENVOI DU DELTA (v3)
// ============================================

const sendDeltaTo = async (hs: SyncMessage) => {
  const peerId = hs.from;
  if (!peerId) return;
  if (await demoBlocksSync()) return;
  const sinceMs = Number(hs.since?.[myDeviceId] ?? 0) || 0;
  // Format par element : seulement si le pair le connait. Son « depuis » est a part (voir tables.ts).
  const etendu = (Number(hs.fx) || 0) >= 1 && !!hs.sinceX && typeof hs.sinceX === 'object';
  const sinceXMs = etendu ? Number(hs.sinceX?.[myDeviceId] ?? 0) || 0 : 0;
  const compte: Record<string, number> = {};

  setStatus({ isSyncing: true });
  try {
    const db = await openDatabase();
    await ensureSchema(db);

    // 1. Détecter toutes les modifications locales
    const resolver = await scanAll(db);
    const scanTs = Date.now();

    // 2. Envoyer par paquets
    const syncId = `${myDeviceId}-${scanTs}`;
    let seq = 0;
    let rows: SyncItem[] = [];
    let tombs: Tombstone[] = [];
    let elems: EtatEnvoi[] = [];
    let size = 0;
    let totalRows = 0;

    const flush = async (last: boolean, kv3?: KVDelta) => {
      await envoyerA(peerId, {
        type: 'SYNC_DATA',
        v: PROTOCOL_VERSION,
        device: myDeviceName,
        from: myDeviceId,
        to: peerId,
        syncId,
        seq: seq++,
        last,
        rows,
        tombs,
        kv3,
        legacy: hadV2Sync,
        ts: scanTs,
        ...(etendu ? { fx: FORMAT_ELEMENTS, elems } : {}),
      } satisfies SyncMessage);
      rows = [];
      tombs = [];
      elems = [];
      size = 0;
    };

    const existing = await existingTables(db);
    for (const [table] of TABLES) {
      if (!existing.has(table)) continue;
      const ext = NOMS_TABLES_ETENDUES.has(table);
      if (ext && !etendu) continue; // un telephone pas a jour ne saurait pas quoi en faire
      const depuis = ext ? sinceXMs : sinceMs;
      const PAGE = 200;
      // Pagination par rowid (et non OFFSET) : une suppression pendant l'envoi ne fait sauter aucune ligne
      for (let lastRowid = -1; ;) {
        const page = (await db.getAllAsync(
          `SELECT t.rowid AS __rid, t.*, s.updated_at AS __u FROM ${table} t
             JOIN sync_state s ON s.tbl = ? AND s.uid = t.sync_uid
           WHERE s.changed_at > ? AND (s.src IS NULL OR s.src != ?) AND t.rowid > ?
           ORDER BY t.rowid LIMIT ?`,
          [table, depuis, peerId, lastRowid, PAGE]
        )) as Record<string, any>[];
        if (page.length === 0) break;
        lastRowid = Number(page[page.length - 1].__rid);
        for (const r of page) {
          const u = Number(r.__u ?? 0) || 0;
          const d = await buildPayload(table, r, resolver);
          // id d'origine : permet de reconnaître une ligne déjà copiée par l'ancienne synchro (v2)
          if (!SPEC.get(table)!.textPk && r.id != null) d.__oid = r.id;
          const item: SyncItem = { t: table, uid: r.sync_uid, u, d };
          const itemSize = JSON.stringify(item).length;
          if (size > 0 && size + itemSize > CHUNK_MAX_BYTES) await flush(false);
          rows.push(item);
          size += itemSize;
          totalRows++;
          ajouter(compte, typeDeTable(table), 1);
        }
        if (page.length < PAGE) break;
      }
    }

    const tombRows = ((await db.getAllAsync(
      'SELECT tbl, uid, deleted_at, changed_at FROM sync_tombstones WHERE changed_at > ? AND (src IS NULL OR src != ?) ORDER BY deleted_at ASC',
      [etendu ? Math.min(sinceMs, sinceXMs) : sinceMs, peerId]
    )) as Array<{ tbl: string; uid: string; deleted_at: number; changed_at: number }>).filter(tr =>
      NOMS_TABLES_ETENDUES.has(tr.tbl) ? etendu && Number(tr.changed_at) > sinceXMs : Number(tr.changed_at) > sinceMs
    );
    ajouter(compte, 'suppressions', tombRows.length);
    for (const tr of tombRows) {
      const item: Tombstone = { t: tr.tbl, uid: tr.uid, u: Number(tr.deleted_at) };
      const itemSize = 80 + tr.uid.length;
      if (size > 0 && size + itemSize > CHUNK_MAX_BYTES) await flush(false);
      tombs.push(item);
      size += itemSize;
    }

    // Elements (listes fusionnees, reglages ajoutes) : en morceaux, parents avant leurs sous elements
    let erreursEnvoi: string[] = [];
    if (etendu) {
      const c = await collecterElements(sinceXMs, peerId);
      erreursEnvoi = c.erreurs;
      for (const [type, n] of Object.entries(c.compte)) ajouter(compte, type, n ?? 0);
      for (const etat of c.etats) {
        const PAR = 300;
        const parts: EtatEnvoi[] = [];
        for (let i = 0; i < Math.max(etat.items.length, 1); i += PAR) {
          parts.push({ ...etat, items: etat.items.slice(i, i + PAR), tombs: i === 0 ? etat.tombs : [] });
        }
        for (const part of parts) {
          const partSize = JSON.stringify(part).length;
          if (size > 0 && size + partSize > CHUNK_MAX_BYTES) await flush(false);
          elems.push(part);
          size += partSize;
        }
      }
    }

    // Réglages (AsyncStorage) dans le dernier paquet
    const kv3 = await collectKVDelta(formatKvTs(sinceMs), peerId);
    ajouter(compte, 'reglages', Object.keys(kv3).filter(k => !(etendu && CLES_ANCIENNES_PAR_ELEMENT.has(k))).length);
    await flush(true, kv3);

    await noterEchange('envoye', { quand: new Date().toISOString(), appareil: hs.device, compte, erreurs: erreursEnvoi });
    logger.info(`[PeerSync] Envoyé à ${hs.device}: ${totalRows} lignes, ${tombRows.length} suppressions, ${Object.keys(kv3).length} réglages (${seq} paquet(s))`);
  } finally {
    setStatus({ isSyncing: false });
  }
};

// ============================================
// IMPORT (v3)
// ============================================

let lastScanAt = 0;
// L'appareil a-t-il déjà synchronisé avec l'ancienne version (v2) ? Et l'expéditeur aussi ?
let hadV2Sync = false;
let legacyMatching = false;
let suppressBackgroundScanUntil = 0;

const handleSyncData = async (msg: SyncMessage) => {
  const from = msg.from;
  if (!from || !msg.syncId) return;
  if (await demoBlocksSync()) return;

  setStatus({ isSyncing: true });
  try {
    const db = await openDatabase();
    await ensureSchema(db);

    // Au premier paquet d'une synchro : mettre à jour notre propre état local
    // pour que les conflits soient jugés sur des informations à jour
    if (!pendingIncoming.has(msg.syncId)) {
      pendingIncoming.set(msg.syncId, { from, device: msg.device, failures: 0, compte: {}, erreurs: [] });
      if (Date.now() - lastScanAt > 3000) await scanAll(db);
    }
    const pending = pendingIncoming.get(msg.syncId)!;
    legacyMatching = msg.legacy === true;

    const existing = await existingTables(db);
    const resolver = createResolver(db);
    let applied = 0;

    const items = (msg.rows ?? []).slice().sort(
      (a, b) => (TABLE_ORDER.get(a.t) ?? 99) - (TABLE_ORDER.get(b.t) ?? 99)
    );

    // Un paquet = une transaction (beaucoup plus rapide sur iPhone).
    // Si la transaction échoue, rien n'est perdu : la synchro sera rejouée.
    let inTx = false;
    try {
      await db.execAsync('BEGIN');
      inTx = true;
    } catch {
      inTx = false; // une autre transaction est en cours : on applique ligne par ligne
    }

    try {
      for (const item of items) {
        if (!SPEC.has(item.t) || !existing.has(item.t)) continue;
        try {
          if (await applyRow(db, item, resolver, from)) {
            applied++;
            ajouter(pending.compte, typeDeTable(item.t), 1);
          }
        } catch (err) {
          pending.failures++;
          logger.warn(`[PeerSync] Ligne non appliquée (${item.t}):`, err);
        }
      }
      for (const tomb of msg.tombs ?? []) {
        if (!SPEC.has(tomb.t) || !existing.has(tomb.t)) continue;
        try {
          if (await applyTombstone(db, tomb, from)) {
            applied++;
            ajouter(pending.compte, 'suppressions', 1);
          }
        } catch (err) {
          pending.failures++;
          logger.warn(`[PeerSync] Suppression non appliquée (${tomb.t}):`, err);
        }
      }
      if (inTx) await db.execAsync('COMMIT');
    } catch (err) {
      pending.failures++;
      if (inTx) {
        try { await db.execAsync('ROLLBACK'); } catch { /* ignore */ }
      }
      logger.warn('[PeerSync] Paquet non appliqué, il sera renvoyé à la prochaine synchro:', err);
    }

    if (applied > 0) {
      suppressBackgroundScanUntil = Date.now() + 20000;
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
    }

    // Elements (format par element) : listes fusionnees, reglages ajoutes
    if ((Number(msg.fx) || 0) >= 1 && Array.isArray(msg.elems) && msg.elems.length) {
      // les ecrans previennent par evenement : ce n'est pas un enregistrement local a renvoyer
      suppressBackgroundScanUntil = Date.now() + 20000;
      const r = await appliquerElements(msg.elems, from);
      pending.failures += r.echecs;
      pending.erreurs.push(...r.erreurs);
      for (const [type, n] of Object.entries(r.compte)) ajouter(pending.compte, type, n ?? 0);
      if (r.cles.length) suppressBackgroundScanUntil = Date.now() + 20000;
    }

    if (msg.last) {
      pendingIncoming.delete(msg.syncId);

      let kvApplied = 0;
      if (msg.kv3) kvApplied = await applyKVDelta(msg.kv3, { from, fx: Number(msg.fx) || 0 });
      ajouter(pending.compte, 'reglages', kvApplied);
      if (kvApplied > 0) {
        suppressBackgroundScanUntil = Date.now() + 20000;
        DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
        DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
      }

      // Mémoriser jusqu'où on a reçu les données de ce pair (dans SON horloge).
      // En cas d'échec partiel, on n'avance PAS : tout sera renvoyé la prochaine fois.
      const peerTs = Number(msg.ts) || 0;
      if (pending.failures === 0) {
        const since = await loadSinceMap();
        since[from] = Math.max(since[from] ?? 0, peerTs);
        await AsyncStorage.setItem(SINCE_MAP_KEY, JSON.stringify(since));
        // le format par element n'avance que s'il a vraiment ete envoye
        if ((Number(msg.fx) || 0) >= 1) {
          const sinceX = await loadSinceMap(SINCE_X_KEY);
          sinceX[from] = Math.max(sinceX[from] ?? 0, peerTs);
          await AsyncStorage.setItem(SINCE_X_KEY, JSON.stringify(sinceX));
        }
      } else {
        logger.warn(`[PeerSync] ${pending.failures} élément(s) non appliqué(s) : la synchro avec ${msg.device} sera reprise`);
      }

      await envoyerA(from, {
        type: 'SYNC_ACK',
        v: PROTOCOL_VERSION,
        device: myDeviceName,
        from: myDeviceId,
        to: from,
        ackTs: peerTs,
      } satisfies SyncMessage);

      await markSynced(msg.device);
      await noterEchange('recu', {
        quand: new Date().toISOString(),
        appareil: msg.device,
        compte: pending.compte,
        erreurs: pending.failures > 0
          ? [traduirePluriel(pending.failures, pending.failures > 1, '{0} élément non appliqué, il sera repris à la prochaine synchro', '{0} éléments non appliqués, ils seront repris à la prochaine synchro', pending.failures), ...pending.erreurs]
          : pending.erreurs,
      });
      logger.info(`[PeerSync] Synchro reçue de ${msg.device} terminée`);
    }
  } finally {
    setStatus({ isSyncing: false });
  }
};

const handleAck = async (msg: SyncMessage) => {
  await markSynced(msg.device);
  logger.info(`[PeerSync] ${msg.device} a bien reçu nos données`);
};

const markSynced = async (device: string) => {
  const iso = new Date().toISOString();
  let saved: any = {};
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    saved = raw ? JSON.parse(raw) : {};
  } catch { /* ignore */ }
  await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ ...saved, ts: iso, device }));
  setStatus({ isSyncing: false, lastSyncTs: iso, lastSyncDevice: device });
};

/** Clé naturelle locale : retrouve une ligne existante qui n'a pas encore le même sync_uid */
async function findByNaturalKey(db: any, table: string, values: Record<string, any>, d: Record<string, any>): Promise<Record<string, any> | null> {
  switch (table) {
    case 'profile':
      return (await db.getFirstAsync('SELECT * FROM profile ORDER BY id LIMIT 1')) as Record<string, any> | null;
    case 'achievements':
      return values.id != null
        ? ((await db.getFirstAsync('SELECT * FROM achievements WHERE id = ? LIMIT 1', [values.id])) as Record<string, any> | null)
        : null;
    case 'training_goals':
      return values.sport_id != null
        ? ((await db.getFirstAsync('SELECT * FROM training_goals WHERE sport_id = ? LIMIT 1', [values.sport_id])) as Record<string, any> | null)
        : null;
    case 'slot_occurrences':
      return values.weekly_plan_id != null && values.week_start != null
        ? ((await db.getFirstAsync(
            'SELECT * FROM slot_occurrences WHERE weekly_plan_id = ? AND week_start = ? LIMIT 1',
            [values.weekly_plan_id, values.week_start]
          )) as Record<string, any> | null)
        : null;
    case 'trainings':
      if (d.healthkit_uuid) {
        const r = (await db.getFirstAsync(
          'SELECT * FROM trainings WHERE healthkit_uuid = ? LIMIT 1',
          [d.healthkit_uuid]
        )) as Record<string, any> | null;
        if (r) return r;
      }
      break;
  }
  // Ligne déjà copiée par l'ancienne synchro (v2) : même id, même date de création (et même date).
  // Uniquement si les DEUX appareils ont déjà synchronisé avec l'ancienne version.
  if (legacyMatching && hadV2Sync && !SPEC.get(table)!.textPk && d.__oid != null && d.created_at) {
    const r = (await db.getFirstAsync(
      `SELECT * FROM ${table} WHERE id = ? AND created_at = ? LIMIT 1`,
      [d.__oid, d.created_at]
    )) as Record<string, any> | null;
    const sameDate = !r || !('date' in r) || !('date' in d) || r.date === d.date;
    if (r && sameDate && (!r.sync_uid || String(r.sync_uid).startsWith('c:'))) {
      const st = r.sync_uid
        ? ((await db.getFirstAsync('SELECT src FROM sync_state WHERE tbl = ? AND uid = ?', [table, r.sync_uid])) as { src: string | null } | null)
        : null;
      if (!st || st.src == null) return r;
    }
  }
  return null;
}

/**
 * Faut-il remplacer la version locale par la version reçue ?
 * La plus récente gagne. À égalité : règle déterministe (identique sur les deux appareils).
 */
async function remoteWins(
  db: any, table: string, uid: string, remoteTs: number,
  d: Record<string, any>, local: Record<string, any>, resolver: Resolver
): Promise<boolean> {
  const st = (await db.getFirstAsync(
    'SELECT updated_at FROM sync_state WHERE tbl = ? AND uid = ?',
    [table, uid]
  )) as { updated_at: number } | null;
  const localTs = st ? Number(st.updated_at) || 0 : 0;

  // Créneau du planning : un "à faire" généré automatiquement n'écrase jamais un créneau déjà renseigné
  if (table === 'slot_occurrences' && d.status === 'pending' && !d.training_id && local.status && local.status !== 'pending') {
    return false;
  }

  if (remoteTs !== localTs) return remoteTs > localTs;

  // Égalité
  if (table === 'profile' && d.created_at && local.created_at && d.created_at !== local.created_at) {
    return String(d.created_at) < String(local.created_at); // le profil le plus ancien (établi) gagne
  }
  const localPayload = await buildPayload(table, local, resolver);
  const hr = hashPayload(d);
  const hl = hashPayload(localPayload);
  return hr > hl; // identiques : rien à faire ; différentes : même choix des deux côtés
}

/** Applique une ligne reçue. Retourne true si la base locale a changé. */
async function applyRow(db: any, item: SyncItem, resolver: Resolver, src: string): Promise<boolean> {
  const { t: table, uid, u: remoteTs, d } = item;
  const spec = SPEC.get(table)!;

  // Supprimée ici plus récemment : ne pas la ressusciter
  const tomb = (await db.getFirstAsync(
    'SELECT deleted_at FROM sync_tombstones WHERE tbl = ? AND uid = ?',
    [table, uid]
  )) as { deleted_at: number } | null;
  if (tomb && Number(tomb.deleted_at) >= remoteTs) return false;

  // Colonnes (seulement celles qui existent ici) avec clés étrangères retraduites
  const cols = await tableColumns(db, table);
  const values: Record<string, any> = {};
  for (const [key, value] of Object.entries(d)) {
    if (key.startsWith('__') || !cols.has(key) || key === 'sync_uid') continue;
    if (key === 'id' && !spec.textPk) continue;
    const parentTable = spec.fks?.[key];
    if (parentTable) {
      const localParentId = value ? await resolver.idForUid(parentTable, String(value)) : null;
      if (!localParentId && spec.requiresParent?.includes(key)) return false; // orphelin : ignoré
      values[key] = localParentId ?? null;
    } else {
      values[key] = value;
    }
  }

  let local = (await db.getFirstAsync(
    `SELECT * FROM ${table} WHERE sync_uid = ? LIMIT 1`,
    [uid]
  )) as Record<string, any> | null;

  if (!local) {
    local = await findByNaturalKey(db, table, values, d);
    if (local) await adoptUid(db, table, local, uid);
  }

  if (local && !(await remoteWins(db, table, uid, remoteTs, d, local, resolver))) return false;

  let localId: any;
  if (local) {
    const keys = Object.keys(values).filter(k => k !== 'id');
    if (keys.length > 0) {
      await db.runAsync(
        `UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE rowid = ?`,
        [...keys.map(k => values[k]), local.__rowid ?? (await rowidOf(db, table, local))]
      );
    }
    localId = local.id;
  } else {
    const keys = [...Object.keys(values), 'sync_uid'];
    const vals = [...Object.keys(values).map(k => values[k]), uid];
    const res = await db.runAsync(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      vals
    );
    localId = spec.textPk ? values.id : res?.lastInsertRowId;
    resolver.remember(table, localId, uid);
  }

  // Mémoriser l'empreinte LOCALE de la ligne écrite, datée de la version distante :
  // la prochaine détection ne la considérera pas comme une modification locale (pas d'écho)
  const written = (await db.getFirstAsync(
    `SELECT ${await scanColumns(db, table)} FROM ${table} WHERE sync_uid = ? LIMIT 1`,
    [uid]
  )) as Record<string, any> | null;
  if (written) {
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_state (tbl, uid, hash, updated_at, changed_at, src) VALUES (?, ?, ?, ?, ?, ?)',
      [table, uid, hashLocalRow(table, written), remoteTs, Date.now(), src]
    );
  }
  if (tomb) await db.runAsync('DELETE FROM sync_tombstones WHERE tbl = ? AND uid = ?', [table, uid]);
  return true;
}

async function rowidOf(db: any, table: string, local: Record<string, any>): Promise<any> {
  const r = (await db.getFirstAsync(
    `SELECT rowid AS r FROM ${table} WHERE sync_uid = ? LIMIT 1`,
    [local.sync_uid]
  )) as { r: any } | null;
  return r?.r;
}

/** Applique une suppression reçue. Retourne true si une ligne a été supprimée. */
async function applyTombstone(db: any, tomb: Tombstone, src: string): Promise<boolean> {
  const { t: table, uid, u: deletedAt } = tomb;
  const st = (await db.getFirstAsync(
    'SELECT updated_at FROM sync_state WHERE tbl = ? AND uid = ?',
    [table, uid]
  )) as { updated_at: number } | null;

  // Modifiée ici APRÈS la suppression sur l'autre appareil : on garde notre version
  if (st && Number(st.updated_at) > deletedAt) return false;

  const res = await db.runAsync(`DELETE FROM ${table} WHERE sync_uid = ?`, [uid]);
  await db.runAsync('DELETE FROM sync_state WHERE tbl = ? AND uid = ?', [table, uid]);
  await db.runAsync(
    `INSERT INTO sync_tombstones (tbl, uid, deleted_at, changed_at, src) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tbl, uid) DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at), changed_at = excluded.changed_at, src = excluded.src`,
    [table, uid, deletedAt, Date.now(), src]
  );
  return (res?.changes ?? 0) > 0;
}

/** Remplace l'identifiant de synchro d'une ligne locale, sans créer de fausse suppression */
async function adoptUid(db: any, table: string, local: Record<string, any>, newUid: string) {
  const oldUid = local.sync_uid;
  const rid = await (async () => {
    if (oldUid) return rowidOf(db, table, local);
    const r = (await db.getFirstAsync(
      `SELECT rowid AS r FROM ${table} WHERE ${SPEC.get(table)!.textPk ? 'id = ?' : 'id = ?'} LIMIT 1`,
      [local.id]
    )) as { r: any } | null;
    return r?.r;
  })();
  await db.runAsync(`UPDATE ${table} SET sync_uid = ? WHERE rowid = ?`, [newUid, rid]);
  if (oldUid && oldUid !== newUid) {
    await db.runAsync(
      'UPDATE OR REPLACE sync_state SET uid = ? WHERE tbl = ? AND uid = ?',
      [newUid, table, oldUid]
    );
  }
  local.sync_uid = newUid;
  local.__rowid = rid;
}

// ============================================
// DÉTECTION DES CHANGEMENTS (scan)
// ============================================

/**
 * Parcourt toutes les tables synchronisées :
 *  - attribue un sync_uid aux nouvelles lignes
 *  - marque comme modifiées les lignes dont l'empreinte a changé
 *  - crée une pierre tombale pour les lignes disparues (sauf disparition massive)
 */
async function scanAll(db: any): Promise<Resolver> {
  // Tables/colonnes créées depuis la dernière synchro (écrans ouverts entre-temps)
  tablesCache = null;
  columnsCache.clear();
  scanColumnsCache.clear();
  schemaReady = false;
  await ensureSchema(db);
  const resolver = createResolver(db);
  const existing = await existingTables(db);
  for (const [table] of TABLES) {
    if (!existing.has(table)) continue;
    try {
      await scanTable(db, table, resolver);
    } catch (err) {
      logger.warn(`[PeerSync] Scan ${table} impossible:`, err);
    }
  }
  lastScanAt = Date.now();
  return resolver;
}

async function scanTable(db: any, table: string, resolver: Resolver) {
  const spec = SPEC.get(table)!;
  const now = Date.now();

  const stateRows = (await db.getAllAsync(
    'SELECT uid, hash FROM sync_state WHERE tbl = ?',
    [table]
  )) as Array<{ uid: string; hash: string }>;
  const states = new Map(stateRows.map(r => [r.uid, r.hash]));

  const uidRows = (await db.getAllAsync(
    `SELECT sync_uid FROM ${table} WHERE sync_uid IS NOT NULL`
  )) as Array<{ sync_uid: string }>;
  const usedUids = new Set(uidRows.map(r => r.sync_uid));

  const tombUids = new Set(((await db.getAllAsync(
    'SELECT uid FROM sync_tombstones WHERE tbl = ?',
    [table]
  )) as Array<{ uid: string }>).map(r => r.uid));

  const present = new Set<string>();
  const uidUpdates: Array<[any, string]> = [];
  // [uid, hash, updated_at]
  const stateUpserts: Array<[string, string, number]> = [];
  const selectCols = await scanColumns(db, table);

  const PAGE = 300;
  // Pagination par rowid : une suppression pendant le scan ne fait sauter aucune ligne
  for (let lastRowid = -1; ;) {
    const rows = (await db.getAllAsync(
      `SELECT ${selectCols} FROM ${table} WHERE rowid > ? ORDER BY rowid LIMIT ?`,
      [lastRowid, PAGE]
    )) as Record<string, any>[];
    if (rows.length === 0) break;
    lastRowid = Number(rows[rows.length - 1].__rowid);

    for (const row of rows) {
      let uid: string = row.sync_uid;

      if (!uid) {
        const payload = await buildPayload(table, row, resolver);
        const base = spec.natural?.(payload) ?? `c:${hash64(stableStringify(contentForUid(payload)))}`;
        uid = base;
        let n = 0;
        while (usedUids.has(uid)) uid = `${base}#${++n}`;
        usedUids.add(uid);
        uidUpdates.push([row.__rowid, uid]);
      }
      resolver.remember(table, row.id, uid);
      present.add(uid);

      const h = hashLocalRow(table, row);
      const known = states.get(uid);
      if (known === undefined) {
        // Première fois qu'on voit cette ligne : on ne sait pas quand elle a été modifiée.
        // Date 0 : elle ne pourra jamais écraser une modification réelle faite ailleurs.
        // Exception : une ligne supprimée puis recréée (corbeille) est une action récente.
        stateUpserts.push([uid, h, tombUids.has(uid) ? now : 0]);
      } else if (known !== h) {
        stateUpserts.push([uid, h, now]);
      }
    }
    if (rows.length < PAGE) break;
  }

  // Écritures groupées (rapide même avec des milliers de lignes)
  for (const part of chunk(uidUpdates, 200)) {
    await db.runAsync(
      `UPDATE ${table} SET sync_uid = CASE rowid ${part.map(() => 'WHEN ? THEN ?').join(' ')} END
       WHERE rowid IN (${part.map(() => '?').join(', ')})`,
      [...part.flatMap(([rid, uid]) => [rid, uid]), ...part.map(([rid]) => rid)]
    );
  }
  for (const part of chunk(stateUpserts, 150)) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_state (tbl, uid, hash, updated_at, changed_at, src) VALUES ${part.map(() => '(?, ?, ?, ?, ?, NULL)').join(', ')}`,
      part.flatMap(([uid, h, u]) => [table, uid, h, u, now])
    );
  }

  // Une ligne réapparue (restauration depuis la corbeille, etc.) annule sa pierre tombale
  if (present.size > 0) {
    const revived = [...tombUids].filter(u => present.has(u));
    for (const part of chunk(revived, 300)) {
      await db.runAsync(
        `DELETE FROM sync_tombstones WHERE tbl = ? AND uid IN (${part.map(() => '?').join(', ')})`,
        [table, ...part]
      );
    }
  }

  // Lignes disparues
  const missing = [...states.keys()].filter(u => !present.has(u));
  if (missing.length === 0) return;

  const massive = missing.length >= MASS_DELETE_MIN && missing.length >= states.size * MASS_DELETE_RATIO;
  if (massive) {
    // Réinitialisation ou incident : on NE propage PAS ces suppressions aux autres appareils
    logger.warn(`[PeerSync] ${table}: ${missing.length}/${states.size} lignes disparues d'un coup, suppressions non propagées (sécurité)`);
  }
  for (const part of chunk(missing, 300)) {
    if (!massive) {
      await db.runAsync(
        `INSERT OR REPLACE INTO sync_tombstones (tbl, uid, deleted_at, changed_at, src) VALUES ${part.map(() => '(?, ?, ?, ?, NULL)').join(', ')}`,
        part.flatMap(u => [table, u, now, now])
      );
    }
    await db.runAsync(
      `DELETE FROM sync_state WHERE tbl = ? AND uid IN (${part.map(() => '?').join(', ')})`,
      [table, ...part]
    );
  }
}

// Colonnes lues pendant le scan : tout sauf les détails GPS/FC (lourds), remplacés par leur longueur
const HEAVY_COLUMNS = new Set(['workout_details_json']);
const scanColumnsCache = new Map<string, string>();
async function scanColumns(db: any, table: string): Promise<string> {
  if (scanColumnsCache.has(table)) return scanColumnsCache.get(table)!;
  const cols = [...(await tableColumns(db, table))];
  const parts = ['rowid AS __rowid'];
  for (const c of cols) {
    if (HEAVY_COLUMNS.has(c)) parts.push(`length(${c}) AS __len_${c}`);
    else parts.push(c);
  }
  const sql = parts.join(', ');
  scanColumnsCache.set(table, sql);
  return sql;
}

/**
 * Empreinte de changement calculée sur la ligne LOCALE (clés étrangères = ids locaux).
 * Ainsi, la suppression d'un club ne fait pas passer toutes ses séances pour "modifiées".
 */
function hashLocalRow(table: string, row: Record<string, any>): string {
  const spec = SPEC.get(table)!;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === '__rowid' || key === 'sync_uid' || key === 'created_at') continue;
    if (key === 'id' && !spec.textPk) continue;
    if (HEAVY_COLUMNS.has(key)) continue;
    if (isLocalPathColumn(key)) continue;
    out[key] = value;
  }
  return hash64(stableStringify(out));
}

// ============================================
// CONVERSION LIGNE <-> DONNÉES TRANSFÉRÉES
// ============================================

interface Resolver {
  uidForId(table: string, id: any): Promise<string | null>;
  idForUid(table: string, uid: string): Promise<any | null>;
  remember(table: string, id: any, uid: string): void;
}

function createResolver(db: any): Resolver {
  const idToUid = new Map<string, string>();
  const uidToId = new Map<string, any>();
  return {
    async uidForId(table, id) {
      if (id === null || id === undefined || id === '') return null;
      const k = `${table}|${id}`;
      if (idToUid.has(k)) return idToUid.get(k)!;
      try {
        const r = (await db.getFirstAsync(`SELECT sync_uid FROM ${table} WHERE id = ?`, [id])) as { sync_uid: string | null } | null;
        if (r?.sync_uid) {
          idToUid.set(k, r.sync_uid);
          uidToId.set(`${table}|${r.sync_uid}`, id);
          return r.sync_uid;
        }
      } catch { /* table absente */ }
      return null;
    },
    async idForUid(table, uid) {
      const k = `${table}|${uid}`;
      if (uidToId.has(k)) return uidToId.get(k);
      try {
        const r = (await db.getFirstAsync(`SELECT id FROM ${table} WHERE sync_uid = ? LIMIT 1`, [uid])) as { id: any } | null;
        if (r) {
          uidToId.set(k, r.id);
          idToUid.set(`${table}|${r.id}`, uid);
          return r.id;
        }
      } catch { /* table absente */ }
      return null;
    },
    remember(table, id, uid) {
      if (id === null || id === undefined) return;
      idToUid.set(`${table}|${id}`, uid);
      uidToId.set(`${table}|${uid}`, id);
    },
  };
}

/** Colonnes qui contiennent un chemin de fichier propre à l'appareil (photo, logo...) */
const isLocalPathColumn = (key: string): boolean => /photo|logo|uri|image|avatar|path/i.test(key);

/** Valeur de chemin local inutilisable sur un autre appareil */
const isLocalPathValue = (v: unknown): boolean =>
  typeof v === 'string' &&
  (v.startsWith('file:') || v.startsWith('/') || v.startsWith('ph://') || v.startsWith('content:') || v.startsWith('assets-library:'));

/** Données transférables d'une ligne : sans id local, sans chemins locaux, FK -> sync_uid */
async function buildPayload(table: string, row: Record<string, any>, resolver: Resolver): Promise<Record<string, any>> {
  const spec = SPEC.get(table)!;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('__') || key === 'sync_uid') continue;
    if (key === 'id' && !spec.textPk) continue;
    if (isLocalPathColumn(key) && isLocalPathValue(value)) continue;
    // Photo de profil en base64 : trop lourde pour la synchro
    if (key === 'profile_photo' && typeof value === 'string' && value.length > 500) continue;
    const parentTable = spec.fks?.[key];
    out[key] = parentTable ? await resolver.uidForId(parentTable, value) : value;
  }
  return out;
}

/** Empreinte du contenu transféré (utilisée pour départager deux versions de même date) */
function hashPayload(payload: Record<string, any>): string {
  const rest: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'created_at' || k.startsWith('__') || HEAVY_COLUMNS.has(k)) continue;
    rest[k] = v;
  }
  return hash64(stableStringify(rest));
}

/** Contenu servant à l'identifiant : stable, sans données annexes volumineuses */
function contentForUid(payload: Record<string, any>): Record<string, any> {
  const rest: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'created_at' || k.startsWith('__') || HEAVY_COLUMNS.has(k)) continue;
    rest[k] = v;
  }
  return rest;
}

function stableStringify(obj: Record<string, any>): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(keys.map(k => [k, obj[k] === undefined ? null : obj[k]]));
}

/** Hash 64 bits (deux FNV-1a 32 bits indépendants) : collisions négligeables */
function hash64(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 ^= c;
    h2 = Math.imul(h2, 0x5bd1e995);
    h2 ^= h2 >>> 15;
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

// ============================================
// SCHÉMA DE SYNCHRO
// ============================================

async function ensureSchema(db: any) {
  if (schemaReady) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_state (
      tbl TEXT NOT NULL,
      uid TEXT NOT NULL,
      hash TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      changed_at INTEGER NOT NULL,
      src TEXT,
      PRIMARY KEY (tbl, uid)
    );
    CREATE INDEX IF NOT EXISTS idx_sync_state_changed ON sync_state(changed_at);
    CREATE TABLE IF NOT EXISTS sync_tombstones (
      tbl TEXT NOT NULL,
      uid TEXT NOT NULL,
      deleted_at INTEGER NOT NULL,
      changed_at INTEGER NOT NULL,
      src TEXT,
      PRIMARY KEY (tbl, uid)
    );
    CREATE INDEX IF NOT EXISTS idx_sync_tombstones_changed ON sync_tombstones(changed_at);
  `);
  const existing = await existingTables(db);
  for (const [table] of TABLES) {
    if (!existing.has(table)) continue;
    const cols = await tableColumns(db, table);
    if (!cols.has('sync_uid')) {
      try {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN sync_uid TEXT`);
        columnsCache.delete(table);
      } catch (e) {
        logger.warn(`[PeerSync] Ajout sync_uid sur ${table} impossible:`, e);
      }
    }
    try {
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_${table}_sync_uid ON ${table}(sync_uid)`);
    } catch { /* ignore */ }
  }
  schemaReady = true;
}

let tablesCache: Set<string> | null = null;
async function existingTables(db: any): Promise<Set<string>> {
  if (tablesCache) return tablesCache;
  const rows = (await db.getAllAsync("SELECT name FROM sqlite_master WHERE type = 'table'")) as Array<{ name: string }>;
  tablesCache = new Set(rows.map(r => r.name));
  return tablesCache;
}

const columnsCache = new Map<string, Set<string>>();
async function tableColumns(db: any, table: string): Promise<Set<string>> {
  if (columnsCache.has(table)) return columnsCache.get(table)!;
  const rows = (await db.getAllAsync(`PRAGMA table_info(${table})`)) as Array<{ name: string }>;
  const set = new Set(rows.map(r => r.name));
  columnsCache.set(table, set);
  return set;
}

// ============================================
// COMPATIBILITÉ AVEC LES APPAREILS EN v2
// ============================================

// Les appareils en v2 (sans chiffrement) ne recoivent plus rien depuis le 13 octobre 2026 : voir l'en-tete.

// ============================================
// RÉGLAGES (AsyncStorage)
// ============================================
// Détection automatique par hash de chaque clé ; la plus récente gagne.

const KV_HASHES_KEY = '@yoroi_kv_hashes';
const KV_TIMESTAMPS_KEY = '@yoroi_kv_timestamps';

function fastHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Format des horodatages KV ("AAAA-MM-JJ HH:MM:SS.mmm", UTC), comparable avec l'ancien format sans ms */
const formatKvTs = (ms: number): string =>
  new Date(ms || 0).toISOString().replace('T', ' ').replace('Z', '');

/** Les clubs de ce telephone (id, nom, sport), pour recaler tes pratiques ; [] si la base ne repond pas */
async function clubsLocaux(): Promise<ClubLeger[]> {
  try {
    const db = await openDatabase();
    return ((await db.getAllAsync('SELECT id, name, sport FROM clubs')) ?? []) as ClubLeger[];
  } catch {
    return [];
  }
}

/** La valeur d'un reglage telle qu'elle part : tes pratiques emportent le nom des clubs retires, le reste part tel quel */
async function valeurAEnvoyer(key: string, value: string | null): Promise<string | null> {
  if (key !== CLE_PRATIQUES || value === null) return value;
  return pratiquesPourEnvoi(value, await clubsLocaux());
}

/**
 * Reglages a envoyer a `pair`. 30 octobre 2026, plus de deux appareils : un reglage recu de l'iPad garde l'heure
 * de l'iPad (pour departager), mais part aussi vers le Mac s'il est arrive ici apres le dernier echange avec le Mac
 * (heure de reception, KV_RELAIS_KEY). Sans cela, le Mac ne le recevait jamais par l'iPhone.
 */
async function collectKVDelta(sinceTs: string, pair?: string): Promise<KVDelta> {
  const result: KVDelta = {};
  try {
    const [hashesRaw, tsRaw, relaisRaw] = await Promise.all([
      AsyncStorage.getItem(KV_HASHES_KEY),
      AsyncStorage.getItem(KV_TIMESTAMPS_KEY),
      AsyncStorage.getItem(KV_RELAIS_KEY),
    ]);
    const hashes: Record<string, string> = hashesRaw ? JSON.parse(hashesRaw) : {};
    const timestamps: Record<string, string> = tsRaw ? JSON.parse(tsRaw) : {};
    const relais: Record<string, { c: string; s: string }> = (() => {
      try { const r = relaisRaw ? JSON.parse(relaisRaw) : {}; return r && typeof r === 'object' ? r : {}; } catch { return {}; }
    })();
    let relaisChange = false;
    const now = formatKvTs(Date.now());
    let anyChange = false;

    for (const key of SYNC_KV_KEYS) {
      const value = await AsyncStorage.getItem(key);
      const currentHash = fastHash(value ?? '__null__');
      // Clé jamais vue et absente sur cet appareil : ce n'est pas une modification
      // (sinon ce "vide" pouvait écraser la vraie valeur de l'autre appareil)
      if (hashes[key] === undefined && value === null) {
        hashes[key] = currentHash;
        anyChange = true;
        continue;
      }
      if (currentHash !== hashes[key]) {
        hashes[key] = currentHash;
        timestamps[key] = now;
        anyChange = true;
        if (relais[key]) { delete relais[key]; relaisChange = true; } // modifie ici : ce n'est plus un relais
        result[key] = { value: await valeurAEnvoyer(key, value), updatedAt: now };
      } else {
        const keyTs = timestamps[key] ?? '1970-01-01 00:00:00';
        const r = relais[key];
        // relais seulement vers un appareil connu, jamais vers celui d'ou vient la valeur
        const aRelayer = !!pair && !!r && typeof r.c === 'string' && r.c > sinceTs && r.s !== pair;
        if (keyTs > sinceTs || aRelayer) result[key] = { value: await valeurAEnvoyer(key, value), updatedAt: keyTs };
      }
    }

    if (relaisChange) await AsyncStorage.setItem(KV_RELAIS_KEY, JSON.stringify(relais));
    if (anyChange) {
      await Promise.all([
        AsyncStorage.setItem(KV_HASHES_KEY, JSON.stringify(hashes)),
        AsyncStorage.setItem(KV_TIMESTAMPS_KEY, JSON.stringify(timestamps)),
      ]);
    }
  } catch (e) {
    logger.warn('[PeerSync] Erreur collecte réglages:', e);
  }
  return result;
}

/**
 * Applique les réglages reçus. Retourne le nombre de clés modifiées.
 * 28 octobre 2026 : les listes (partenaires, records, charges, photos) ne sont plus remplacees entieres.
 * D'un telephone a jour (fx >= 1), elles arrivent par element (elems) et leur valeur entiere est ignoree ;
 * d'un ancien telephone, la valeur entiere est fusionnee sans rien retirer (lib/v2/synchro/elements.ts).
 */
async function applyKVDelta(kv: KVDelta, opts: { from?: string; fx?: number } = {}): Promise<number> {
  let applied = 0;
  let pratiquesChangees = false;
  try {
    const [tsRaw, hashesRaw] = await Promise.all([
      AsyncStorage.getItem(KV_TIMESTAMPS_KEY),
      AsyncStorage.getItem(KV_HASHES_KEY),
    ]);
    const timestamps: Record<string, string> = tsRaw ? JSON.parse(tsRaw) : {};
    const hashes: Record<string, string> = hashesRaw ? JSON.parse(hashesRaw) : {};
    let relais: Record<string, { c: string; s: string }> = {};
    try {
      const r = JSON.parse((await AsyncStorage.getItem(KV_RELAIS_KEY)) ?? '{}');
      if (r && typeof r === 'object') relais = r;
    } catch { /* ignore */ }

    for (const [key, payload] of Object.entries(kv)) {
      if (!(SYNC_KV_KEYS as readonly string[]).includes(key)) continue;
      if (CLES_ANCIENNES_PAR_ELEMENT.has(key)) {
        if ((opts.fx ?? 0) >= 1 || !payload || typeof payload.updatedAt !== 'string') continue;
        try {
          const r = await appliquerAncienFormat(key, payload.value ?? null, payload.updatedAt, opts.from ?? '');
          if (r) {
            // la liste fusionnee repart vers l'ancien telephone (elle contient tout, la sienne et la notre)
            timestamps[key] = formatKvTs(Date.now());
            hashes[key] = fastHash(r.valeur ?? '__null__');
            applied++;
          }
        } catch (e) {
          logger.warn(`[PeerSync] Fusion de ${key} remise a plus tard:`, e);
        }
        continue;
      }
      const localTs = timestamps[key] ?? '1970-01-01 00:00:00';
      if (payload.updatedAt > localTs) {
        let value = payload.value;
        // tes pratiques : recalees sur les clubs de ce telephone ; illisibles ou d'un format inconnu, rien n'est applique
        if (key === CLE_PRATIQUES && value !== null) {
          value = pratiquesRecues(value, await clubsLocaux());
          if (value === null) continue;
          pratiquesChangees = true;
        }
        if (value === null) await AsyncStorage.removeItem(key);
        else await AsyncStorage.setItem(key, value);
        timestamps[key] = payload.updatedAt;
        // l'empreinte de la valeur enregistree ici : la prochaine synchro n'y voit pas un changement a renvoyer
        hashes[key] = fastHash(value ?? '__null__');
        // mais elle repart vers tes autres appareils (pas vers celui qui l'a envoyee)
        relais[key] = { c: formatKvTs(Date.now()), s: opts.from ?? '' };
        applied++;
      }
    }

    await Promise.all([
      AsyncStorage.setItem(KV_TIMESTAMPS_KEY, JSON.stringify(timestamps)),
      AsyncStorage.setItem(KV_HASHES_KEY, JSON.stringify(hashes)),
      AsyncStorage.setItem(KV_RELAIS_KEY, JSON.stringify(relais)),
    ]);
    // les ecrans de tes pratiques se relisent
    if (pratiquesChangees) DeviceEventEmitter.emit(EVENT_PRATIQUES);
  } catch (e) {
    logger.warn('[PeerSync] Erreur application réglages:', e);
  }
  return applied;
}

/**
 * Marque une clé de réglage comme modifiée sans attendre la détection automatique.
 */
export async function markKVKeyChanged(key: string): Promise<void> {
  if (!(SYNC_KV_KEYS as readonly string[]).includes(key)) return;
  try {
    const tsRaw = await AsyncStorage.getItem(KV_TIMESTAMPS_KEY);
    const timestamps: Record<string, string> = tsRaw ? JSON.parse(tsRaw) : {};
    timestamps[key] = formatKvTs(Date.now());
    await AsyncStorage.setItem(KV_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    const hashesRaw = await AsyncStorage.getItem(KV_HASHES_KEY);
    const hashes: Record<string, string> = hashesRaw ? JSON.parse(hashesRaw) : {};
    delete hashes[key];
    await AsyncStorage.setItem(KV_HASHES_KEY, JSON.stringify(hashes));
  } catch { /* silent */ }
}

// ============================================
// HELPERS
// ============================================

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
  } catch { /* ignore */ }
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  try { await AsyncStorage.setItem(DEVICE_ID_KEY, id); } catch { /* ignore */ }
  return id;
}

async function loadSinceMap(cle: string = SINCE_MAP_KEY): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(cle);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Exposé pour les tests uniquement
export const __test__ = {
  scanAll,
  applyRow,
  applyTombstone,
  ensureSchema,
  buildPayload,
  createResolver,
  hash64,
  resetCaches: () => { schemaReady = false; tablesCache = null; columnsCache.clear(); },
  handleSyncData,
  sendDeltaTo,
  setDeviceId: (id: string) => { myDeviceId = id; },
  collectKVDelta,
  applyKVDelta,
  sendHandshake,
  scheduleBackgroundScan,
  /** appareils appaires authentifies en ce moment (id) */
  relies: () => [...relies.keys()],
  /** la file d'attente actuelle (tests : attendre la fin d'un envoi ou d'un import) */
  attendre: () => queue,
};

export default { initPeerSync, stopPeerSync, onSyncStatusChange, getSyncStatus, forceSync, getMyDeviceName, isPeerSyncAvailable, aDesAppareilsAppaires, synchroEnMarche };
