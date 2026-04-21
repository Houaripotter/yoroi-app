// ============================================
// PAGE : HISTORIQUE DE SYNC
// Log transparent de toutes les opérations backup/sync
// pour que l'user voie que tout fonctionne.
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, DeviceEventEmitter,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2, Activity } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getSyncHistory, clearSyncHistory, SyncEvent, SYNC_EVENT_LABELS } from '@/lib/syncHistoryService';
import { formatRelative, formatSize } from '@/lib/utils/formatDate';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

export default function SyncHistoryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<SyncEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const list = await getSyncHistory();
    setHistory(list);
  }, []);

  useEffect(() => {
    refresh();
    const sub = DeviceEventEmitter.addListener('YOROI_SYNC_HISTORY_UPDATED', refresh);
    return () => sub.remove();
  }, [refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleClear = () => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Effacer l\'historique ?',
      "Seul l'historique des opérations sera supprimé. Tes données et tes sauvegardes restent intactes.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Effacer', style: 'destructive', onPress: async () => { await clearSyncHistory(); } },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Historique de synchronisation</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted ?? '#888' }]}>
            {history.length} opération{history.length > 1 ? 's' : ''} récente{history.length > 1 ? 's' : ''}
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} accessibilityLabel="Effacer l'historique">
            <Trash2 size={18} color={colors.textMuted ?? '#888'} />
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Activity size={48} color={colors.textMuted ?? '#888'} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune activité récente</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted ?? '#888' }]}>
            Dès qu'une sauvegarde ou sync est faite, elle apparaît ici.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {history.map((event, i) => {
            const meta = SYNC_EVENT_LABELS[event.type] ?? { label: event.type, emoji: '•', color: '#888' };
            return (
              <View
                key={`${event.timestamp}_${i}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? '#1E1E22' : '#fff',
                    borderColor: event.success ? `${meta.color}30` : '#EF444440',
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                  <Text style={[styles.cardTitle, { color: meta.color }]}>{meta.label}</Text>
                  <View style={[styles.statusPill, { backgroundColor: event.success ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.statusText, { color: event.success ? '#10B981' : '#EF4444' }]}>
                      {event.success ? 'OK' : 'Échec'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTime, { color: colors.textMuted ?? '#888' }]}>
                    {formatRelative(new Date(event.timestamp))}
                  </Text>
                  {event.device && (
                    <Text style={[styles.cardDetail, { color: colors.textMuted ?? '#888' }]}>
                      📱 {event.device}
                    </Text>
                  )}
                  {event.itemsCount !== undefined && (
                    <Text style={[styles.cardDetail, { color: colors.textMuted ?? '#888' }]}>
                      {event.itemsCount} élément{event.itemsCount > 1 ? 's' : ''}
                    </Text>
                  )}
                  {event.sizeBytes !== undefined && (
                    <Text style={[styles.cardDetail, { color: colors.textMuted ?? '#888' }]}>
                      {formatSize(event.sizeBytes)}
                    </Text>
                  )}
                  {event.details && (
                    <Text style={[styles.cardDetail, { color: colors.textMuted ?? '#888' }]} numberOfLines={2}>
                      {event.details}
                    </Text>
                  )}
                  {event.error && !event.success && (
                    <Text style={[styles.cardError, { color: '#EF4444' }]} numberOfLines={2}>
                      ⚠️ {event.error}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { padding: 6 },
  clearBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  card: {
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '800' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  cardBody: { marginTop: 6, gap: 3, paddingLeft: 24 },
  cardTime: { fontSize: 11, fontWeight: '600' },
  cardDetail: { fontSize: 11 },
  cardError: { fontSize: 11, fontWeight: '600' },
});
