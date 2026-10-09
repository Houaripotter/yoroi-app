// ============================================
// SYNC DEVICES SCREEN
// Debug + status sync iPhone↔iPad en direct.
// Voir les peers connectés, forcer sync, voir historique.
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Wifi, WifiOff, Smartphone, Tablet, Clock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import {
  onSyncStatusChange,
  getSyncStatus,
  forceSync,
  getMyDeviceName,
  isPeerSyncAvailable,
  initPeerSync,
  type SyncStatus,
} from '@/lib/peerSyncService';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SyncDevicesScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [myName, setMyName] = useState<string>(getMyDeviceName());
  const [syncing, setSyncing] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState<string>('');
  const [isAvailable] = useState<boolean>(isPeerSyncAvailable());

  useEffect(() => {
    // Si le service pas encore init (écran ouvert avant _layout), on init ici
    if (isAvailable && status.connectedPeers.length === 0 && !status.lastSyncTs) {
      initPeerSync().catch(() => {});
    }
    // Updates temps réel du status
    const unsub = onSyncStatusChange(setStatus);
    // Refresh device name si changé
    const tn = setTimeout(() => setMyName(getMyDeviceName()), 500);
    return () => { unsub(); clearTimeout(tn); };
  }, []);

  const handleForceSync = useCallback(async () => {
    if (syncing) return;
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setSyncing(true);
    setLastActionMsg('');
    try {
      const count = await forceSync();
      if (count === 0) {
        setLastActionMsg('Aucun appareil à proximité détecté. Vérifie que l\'autre appareil Yoroi est ouvert, sur le même WiFi et qu\'il a autorisé le réseau local.');
      } else {
        setLastActionMsg(`Synchronisation envoyée à ${count} appareil${count > 1 ? 's' : ''}. Les données vont se mettre à jour dans les secondes qui viennent.`);
      }
    } catch (e: any) {
      setLastActionMsg(`Erreur : ${e?.message || 'inconnue'}`);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  const handleBack = () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  const isConnected = status.connectedPeers.length > 0;
  const lastSyncStr = status.lastSyncTs
    ? (() => {
        try { return format(parseISO(status.lastSyncTs), 'd MMM yyyy à HH:mm', { locale: fr }); }
        catch { return status.lastSyncTs; }
      })()
    : null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Synchronisation locale</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte statut principal */}
        <View style={[
          styles.card,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: isConnected ? '#22C55E40' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
            borderWidth: 1,
          },
        ]}>
          <View style={[styles.iconCircle, {
            backgroundColor: isConnected ? '#22C55E20' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
          }]}>
            {isConnected
              ? <Wifi size={28} color="#22C55E" strokeWidth={2.5} />
              : <WifiOff size={28} color={colors.textMuted} strokeWidth={2.5} />}
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {!isAvailable
              ? 'Non disponible'
              : isConnected
                ? `${status.connectedPeers.length} appareil${status.connectedPeers.length > 1 ? 's' : ''} connecté${status.connectedPeers.length > 1 ? 's' : ''}`
                : 'En recherche d\'appareils…'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            {!isAvailable
              ? 'Le module Multipeer n\'est pas linké. Voir SETUP_XCODE.md.'
              : isConnected
                ? 'Tes données sont synchronisées automatiquement'
                : 'Assure-toi que l\'autre appareil Yoroi est ouvert'}
          </Text>
        </View>

        {/* Cet appareil */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accent + '20' }]}>
              <Smartphone size={18} color={colors.accent} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>CET APPAREIL</Text>
              <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{myName}</Text>
            </View>
          </View>
        </View>

        {/* Peers connectés */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPAREILS À PROXIMITÉ</Text>
          {status.connectedPeers.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun appareil détecté pour l'instant</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Ouvre Yoroi sur ton autre appareil, active le WiFi, et autorise le "Réseau local".
              </Text>
            </View>
          ) : (
            status.connectedPeers.map((peer, i) => (
              <View key={i} style={[styles.row, i > 0 && { marginTop: 8 }]}>
                <View style={[styles.rowIcon, { backgroundColor: '#22C55E20' }]}>
                  <Tablet size={18} color="#22C55E" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{peer}</Text>
                  {status.outdatedPeer === peer ? (
                    <Text style={[styles.rowSub, { color: '#F59E0B' }]}>Mets à jour Yoroi sur cet appareil pour synchroniser tes données</Text>
                  ) : (
                    <Text style={[styles.rowSub, { color: '#22C55E' }]}>Connecté</Text>
                  )}
                </View>
                <CheckCircle2 size={18} color="#22C55E" />
              </View>
            ))
          )}
        </View>

        {/* Dernière synchro */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#8B5CF620' }]}>
              <Clock size={18} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>DERNIÈRE SYNCHRONISATION</Text>
              <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
                {lastSyncStr || 'Aucune pour le moment'}
              </Text>
              {status.lastSyncDevice && (
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  avec {status.lastSyncDevice}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Bouton force sync */}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.accent,
              opacity: syncing || !isAvailable ? 0.5 : 1,
            },
          ]}
          onPress={handleForceSync}
          disabled={syncing || !isAvailable}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Forcer la synchronisation maintenant"
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RefreshCw size={18} color="#FFFFFF" strokeWidth={2.5} />
          )}
          <Text style={styles.primaryBtnText}>
            {syncing ? 'Synchronisation…' : 'Forcer la synchronisation'}
          </Text>
        </TouchableOpacity>

        {/* Message action */}
        {lastActionMsg !== '' && (
          <View style={[
            styles.actionMsg,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}>
            <AlertCircle size={14} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={[styles.actionMsgText, { color: colors.textSecondary }]}>
              {lastActionMsg}
            </Text>
          </View>
        )}

        {/* Aide */}
        <View style={[styles.helpCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)', borderColor: '#3B82F640' }]}>
          <Text style={[styles.helpTitle, { color: '#3B82F6' }]}>💡 Comment ça marche ?</Text>
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            La synchronisation se fait <Text style={{ fontWeight: '800' }}>100% en local</Text>, sans internet ni serveur, via Bluetooth et WiFi peer-to-peer. Tes données sont chiffrées de bout en bout.
          </Text>
          <Text style={[styles.helpText, { color: colors.textSecondary, marginTop: 8 }]}>
            Tes appareils se trouvent <Text style={{ fontWeight: '800' }}>automatiquement</Text> quand ils sont à proximité et que Yoroi est ouvert sur les deux.
          </Text>
          <Text style={[styles.helpText, { color: colors.textSecondary, marginTop: 8 }]}>
            Si la sync ne démarre pas : Réglages iOS → Confidentialité → Réseau local → vérifie que <Text style={{ fontWeight: '800' }}>Yoroi est activé</Text>.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  card: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
    lineHeight: 18,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 20,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  actionMsg: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionMsgText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  helpCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
});
