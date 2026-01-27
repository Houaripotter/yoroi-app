// ============================================
// PAGE DE DEBUG APPLE WATCH
// ============================================
// Permet de tester et debugger la synchronisation
// entre l'iPhone et l'Apple Watch
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Watch,
  Wifi,
  WifiOff,
  Send,
  Trash2,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { WatchSyncService, WatchSyncStatus } from '@/lib/watchSyncService';
import { isWatchModuleAvailable } from '@/lib/watchConnectivity.ios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function WatchDebugPage() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<WatchSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Ajouter un log
  const addLog = useCallback((message: string) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  // Charger le statut
  const loadStatus = useCallback(async () => {
    try {
      const newStatus = await WatchSyncService.updateStatus();
      setStatus(newStatus);
    } catch (error) {
      addLog(`Erreur chargement statut: ${error}`);
    }
  }, [addLog]);

  // Initialisation
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      addLog('Initialisation du service Watch...');

      try {
        await WatchSyncService.initialize();
        await loadStatus();
        addLog('Service initialisé avec succès');
      } catch (error) {
        addLog(`Erreur initialisation: ${error}`);
      }

      setIsLoading(false);
    };

    init();

    // S'abonner aux changements de statut
    const unsubscribe = WatchSyncService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      addLog(`Statut mis à jour: ${newStatus.isReachable ? 'Connecté' : 'Déconnecté'}`);
    });

    // S'abonner aux données de la Watch
    const unsubscribeData = WatchSyncService.onDataFromWatch((data) => {
      addLog(`Données reçues de la Watch: ${JSON.stringify(data).substring(0, 100)}...`);
    });

    return () => {
      unsubscribe();
      unsubscribeData();
    };
  }, [addLog, loadStatus]);

  // Lancer le diagnostic
  const runDiagnostic = useCallback(async () => {
    setIsLoading(true);
    addLog('Lancement du diagnostic complet...');

    try {
      const result = await WatchSyncService.runDiagnostic();
      setDiagnosticResult(result);
      addLog('Diagnostic terminé');

      if (result.isAvailable) {
        addLog(`✓ Watch disponible`);
      } else {
        addLog(`✗ Watch non disponible`);
      }

      if (result.isReachable) {
        addLog(`✓ Watch à portée`);
      } else {
        addLog(`✗ Watch pas à portée`);
      }

      if (result.pendingItems > 0) {
        addLog(`⚠ ${result.pendingItems} messages en attente`);
      }
    } catch (error) {
      addLog(`Erreur diagnostic: ${error}`);
    }

    setIsLoading(false);
  }, [addLog]);

  // Forcer une sync complète
  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    addLog('Forçage de la synchronisation...');

    try {
      // Envoyer des données de test
      const testData = {
        userName: 'Test User',
        weight: 75.5,
        waterIntake: 1500,
        waterGoal: 2500,
        streak: 5,
        level: 10,
        rank: 'Guerrier',
        avatarConfig: {
          pack: 'samurai',
          name: 'samurai',
        },
      };

      const success = await WatchSyncService.syncAllData(testData);

      if (success) {
        addLog('✓ Sync réussie!');
      } else {
        addLog('⚠ Sync mise en queue (Watch pas reachable)');
      }

      await loadStatus();
    } catch (error) {
      addLog(`✗ Erreur sync: ${error}`);
    }

    setIsSyncing(false);
  }, [addLog, loadStatus]);

  // Traiter la queue
  const processQueue = useCallback(async () => {
    addLog('Traitement de la queue...');
    try {
      await WatchSyncService.forceProcessQueue();
      await loadStatus();
      addLog('Queue traitée');
    } catch (error) {
      addLog(`Erreur traitement queue: ${error}`);
    }
  }, [addLog, loadStatus]);

  // Vider la queue
  const clearQueue = useCallback(async () => {
    addLog('Vidage de la queue...');
    try {
      await WatchSyncService.clearQueue();
      await loadStatus();
      addLog('Queue vidée');
    } catch (error) {
      addLog(`Erreur vidage queue: ${error}`);
    }
  }, [addLog, loadStatus]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }, [loadStatus]);

  // Composant Status Icon
  const StatusIcon = ({ status: s }: { status: 'ok' | 'warning' | 'error' }) => {
    if (s === 'ok') return <CheckCircle size={20} color="#10B981" />;
    if (s === 'warning') return <AlertTriangle size={20} color="#F59E0B" />;
    return <XCircle size={20} color="#EF4444" />;
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Debug Watch</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerContent}>
          <XCircle size={60} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>
            Apple Watch n'est disponible que sur iOS
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Debug Apple Watch</Text>
        <TouchableOpacity onPress={runDiagnostic} style={styles.backButton} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <RefreshCw size={24} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Module Status */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Module Natif</Text>
            <StatusIcon status={isWatchModuleAvailable ? 'ok' : 'error'} />
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            WatchConnectivityBridge: {isWatchModuleAvailable ? 'Chargé' : 'NON CHARGÉ'}
          </Text>
        </View>

        {/* Watch Status */}
        {status && (
          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Statut Watch</Text>
              <Watch size={24} color={status.isAvailable ? '#10B981' : '#EF4444'} />
            </View>

            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Watch disponible</Text>
              <View style={styles.statusValue}>
                {status.isAvailable ? (
                  <Wifi size={16} color="#10B981" />
                ) : (
                  <WifiOff size={16} color="#EF4444" />
                )}
                <Text style={[styles.value, { color: status.isAvailable ? '#10B981' : '#EF4444' }]}>
                  {status.isAvailable ? 'Oui' : 'Non'}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Watch à portée</Text>
              <View style={styles.statusValue}>
                {status.isReachable ? (
                  <Zap size={16} color="#10B981" />
                ) : (
                  <WifiOff size={16} color="#F59E0B" />
                )}
                <Text style={[styles.value, { color: status.isReachable ? '#10B981' : '#F59E0B' }]}>
                  {status.isReachable ? 'Oui' : 'Non'}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Dernière sync</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {status.lastSyncDate
                  ? format(status.lastSyncDate, 'dd/MM HH:mm:ss', { locale: fr })
                  : 'Jamais'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Messages en queue</Text>
              <Text style={[styles.value, { color: status.pendingItems > 0 ? '#F59E0B' : colors.textPrimary }]}>
                {status.pendingItems}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12 }]}>Actions</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.gold }]}
              onPress={forceSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Send size={18} color="#000" />
                  <Text style={styles.actionButtonText}>Sync Test</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={processQueue}
            >
              <RefreshCw size={18} color="#FFF" />
              <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Traiter Queue</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={clearQueue}
            >
              <Trash2 size={18} color="#FFF" />
              <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Vider Queue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
              onPress={runDiagnostic}
            >
              <Zap size={18} color="#FFF" />
              <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Diagnostic</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Diagnostic Result */}
        {diagnosticResult && (
          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Résultat Diagnostic</Text>
            <Text style={[styles.codeBlock, { color: colors.textSecondary }]}>
              {JSON.stringify(diagnosticResult, null, 2)}
            </Text>
          </View>
        )}

        {/* Errors */}
        {status && status.errors.length > 0 && (
          <View style={[styles.card, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={[styles.cardTitle, { color: '#EF4444' }]}>Erreurs récentes</Text>
            {status.errors.map((error, i) => (
              <Text key={i} style={[styles.errorItem, { color: '#EF4444' }]}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {/* Logs */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Logs</Text>
            <TouchableOpacity onPress={() => setLogs([])}>
              <Trash2 size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text style={[styles.logItem, { color: colors.textMuted }]}>Aucun log</Text>
            ) : (
              logs.map((log, i) => (
                <Text key={i} style={[styles.logItem, { color: colors.textSecondary }]}>
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Instructions</Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            1. Vérifie que ta Watch est jumelée avec cet iPhone
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            2. Ouvre l'app Yoroi sur ta Watch au moins une fois
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            3. Active le Bluetooth sur les deux appareils
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            4. Rapproche la Watch de l'iPhone
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            5. Utilise "Sync Test" pour envoyer des données de test
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  codeBlock: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    marginTop: 8,
  },
  errorItem: {
    fontSize: 13,
    marginTop: 4,
  },
  logsContainer: {
    maxHeight: 200,
  },
  logItem: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
