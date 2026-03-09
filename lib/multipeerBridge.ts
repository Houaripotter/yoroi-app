// ============================================
// YOROI - MULTIPEER BRIDGE (TypeScript)
// ============================================
// Wrapper TypeScript du module natif iOS MultipeerConnectivity
// Sync iPhone <-> iPad local, zero serveur
// ============================================

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { MultipeerBridge: Native } = NativeModules;

// ============================================
// TYPES
// ============================================

export interface PeerChangedEvent {
  peer: string;   // Nom de l'appareil (ex: "iPad de Jean")
  state: 'connected' | 'connecting' | 'disconnected';
}

export interface DataReceivedEvent {
  peer: string;
  data: string;   // JSON stringifié
}

// ============================================
// EVENT EMITTER
// ============================================

const emitter =
  Platform.OS === 'ios' && Native
    ? new NativeEventEmitter(Native)
    : null;

// ============================================
// API
// ============================================

export const MultipeerBridge = {
  /** Disponible seulement sur iOS avec module natif chargé */
  isAvailable: Platform.OS === 'ios' && !!Native,

  /** Démarre la découverte Bluetooth/WiFi des appareils Yoroi proches */
  startDiscovery: async (): Promise<boolean> => {
    if (!Native) return false;
    try {
      return await Native.startDiscovery();
    } catch {
      return false;
    }
  },

  /** Arrête la découverte et déconnecte les pairs */
  stopDiscovery: async (): Promise<void> => {
    if (!Native) return;
    try {
      await Native.stopDiscovery();
    } catch {}
  },

  /** Envoie un objet JSON à tous les appareils connectés */
  sendData: async (payload: object): Promise<boolean> => {
    if (!Native) return false;
    try {
      const json = JSON.stringify(payload);
      return await Native.sendData(json);
    } catch {
      return false;
    }
  },

  /** Retourne la liste des noms d'appareils connectés */
  getConnectedPeers: async (): Promise<string[]> => {
    if (!Native) return [];
    try {
      return await Native.getConnectedPeers();
    } catch {
      return [];
    }
  },

  /** Retourne le nom de cet appareil (pour l'affichage) */
  getDeviceName: async (): Promise<string> => {
    if (!Native) return 'Mon appareil';
    try {
      return await Native.getDeviceName();
    } catch {
      return 'Mon appareil';
    }
  },

  /** Ecoute les changements de connexion (connected / disconnected) */
  onPeerChanged: (cb: (e: PeerChangedEvent) => void) => {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('multipeer_peer_changed', cb);
  },

  /** Ecoute les données reçues d'un pair */
  onDataReceived: (cb: (e: DataReceivedEvent) => void) => {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('multipeer_data_received', cb);
  },
};

export default MultipeerBridge;
