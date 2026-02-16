/**
 * WatchStatusIndicator
 *
 * Affiche le statut de la connexion Apple Watch
 * Petit indicateur discret qui montre si la Watch est connectée
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useWatch } from '@/lib/WatchConnectivityProvider';
import { useTheme } from '@/lib/ThemeContext';
import { Watch } from 'lucide-react-native';

export function WatchStatusIndicator() {
  const { isWatchAvailable, isWatchReachable, lastError, lastSyncDate } = useWatch();
  const { colors } = useTheme();

  // Ne rien afficher sur Android
  if (Platform.OS !== 'ios') {
    return null;
  }

  // Ne rien afficher si pas de Watch
  if (!isWatchAvailable) {
    return null;
  }

  const statusColor = isWatchReachable ? '#10B981' : '#F59E0B';
  const statusText = isWatchReachable ? 'Watch connectée' : 'Watch hors de portée';

  return (
    <View style={[styles.container, { backgroundColor: `${statusColor}15` }]}>
      <View style={styles.content}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />

        <Watch
          size={14}
          color={statusColor}
          strokeWidth={2.5}
        />

        <Text style={[styles.text, { color: statusColor }]}>
          {statusText}
        </Text>

        {lastError && (
          <Text style={[styles.error, { color: '#EF4444' }]}>
            ⚠️ {lastError}
          </Text>
        )}

        {lastSyncDate && isWatchReachable && (
          <Text style={[styles.syncTime, { color: colors.textMuted }]}>
            Sync: {formatRelativeTime(lastSyncDate)}
          </Text>
        )}
      </View>
    </View>
  );
}

// Format relatif du temps (ex: "il y a 2 min")
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'à l\'instant';
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  return `il y a ${Math.floor(seconds / 86400)}j`;
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  error: {
    fontSize: 11,
    fontWeight: '500',
  },
  syncTime: {
    fontSize: 10,
    fontWeight: '500',
  },
});
