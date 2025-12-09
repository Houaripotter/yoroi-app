import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Activity, Download, Upload, Check, X } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isAppleHealthAvailable,
  initializeAppleHealth,
  importWeightFromAppleHealth,
  syncFromAppleHealth,
  setAppleHealthAutoExport,
  isAppleHealthAutoExportEnabled,
  checkHealthPermissions,
} from '@/lib/appleHealthService';

const LAST_SYNC_KEY = '@yoroi_last_health_sync';

export function HealthSyncSettings() {
  const [autoExportEnabled, setAutoExportEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Vérifier si Apple Health est disponible
  const available = isAppleHealthAvailable();

  useEffect(() => {
    if (available) {
      loadSettings();
      checkPermissions();
    } else {
      setLoading(false);
    }
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await isAppleHealthAutoExportEnabled();
      setAutoExportEnabled(enabled);

      const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (lastSyncStr) {
        setLastSync(new Date(lastSyncStr));
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    const permission = await checkHealthPermissions();
    setHasPermission(permission);
  };

  const handleToggleAutoExport = async (value: boolean) => {
    if (value && !hasPermission) {
      // Demander les permissions
      const granted = await initializeAppleHealth();
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permission requise',
          'L\'accès à Apple Health est nécessaire pour l\'export automatique. Veuillez autoriser l\'accès dans Réglages > Confidentialité > Santé > Yoroi',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    await setAppleHealthAutoExport(value);
    setAutoExportEnabled(value);

    Alert.alert(
      'Succès',
      value
        ? 'Les nouvelles mesures seront automatiquement envoyées vers Apple Health'
        : 'L\'export automatique vers Apple Health a été désactivé'
    );
  };

  const handleImport = async () => {
    setSyncing(true);

    try {
      const count = await importWeightFromAppleHealth();

      if (count > 0) {
        // Mettre à jour la dernière sync
        const now = new Date();
        setLastSync(now);
        await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);

    try {
      const count = await syncFromAppleHealth();

      if (count > 0) {
        Alert.alert('Succès', `${count} nouvelle(s) mesure(s) synchronisée(s)`);
      } else {
        Alert.alert('Information', 'Aucune nouvelle donnée à synchroniser');
      }

      // Mettre à jour la dernière sync
      const now = new Date();
      setLastSync(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      Alert.alert('Erreur', 'Impossible de synchroniser les données');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Jamais';

    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      return 'À l\'instant';
    }
  };

  // Si Apple Health n'est pas disponible (Android ou web)
  if (!available) {
    return (
      <View style={styles.unavailableContainer}>
        <View style={[styles.iconContainer, { backgroundColor: '#94A3B820' }]}>
          <X size={20} color="#94A3B8" strokeWidth={2.5} />
        </View>
        <Text style={styles.unavailableText}>
          Apple Health n'est disponible que sur iOS
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Statut de permission */}
      <View style={styles.permissionStatus}>
        <View style={styles.permissionLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: hasPermission ? '#34D39920' : '#F8717120' },
            ]}
          >
            {hasPermission ? (
              <Check size={20} color="#34D399" strokeWidth={2.5} />
            ) : (
              <X size={20} color="#F87171" strokeWidth={2.5} />
            )}
          </View>
          <Text style={styles.permissionText}>
            {hasPermission ? 'Autorisé' : 'Permission requise'}
          </Text>
        </View>
      </View>

      {/* Export automatique */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
            <Upload size={20} color="#3B82F6" strokeWidth={2.5} />
          </View>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Export automatique</Text>
            <Text style={styles.toggleSubtitle}>
              Envoyer chaque nouvelle mesure
            </Text>
          </View>
        </View>
        <Switch
          value={autoExportEnabled}
          onValueChange={handleToggleAutoExport}
          trackColor={{ false: '#E2E8F0', true: '#34D399' }}
          thumbColor={autoExportEnabled ? '#FFFFFF' : '#CBD5E0'}
          ios_backgroundColor="#E2E8F0"
        />
      </View>

      {/* Import depuis Apple Health */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleImport}
        activeOpacity={0.7}
        disabled={syncing}
      >
        <View style={styles.actionButtonLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#34D39920' }]}>
            {syncing ? (
              <ActivityIndicator size="small" color="#34D399" />
            ) : (
              <Download size={20} color="#34D399" strokeWidth={2.5} />
            )}
          </View>
          <View>
            <Text style={styles.actionButtonTitle}>Importer depuis Apple Health</Text>
            <Text style={styles.actionButtonSubtitle}>
              Récupérer l'historique de poids (365 jours)
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Synchronisation */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleSync}
        activeOpacity={0.7}
        disabled={syncing}
      >
        <View style={styles.actionButtonLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
            {syncing ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Activity size={20} color="#8B5CF6" strokeWidth={2.5} />
            )}
          </View>
          <View>
            <Text style={styles.actionButtonTitle}>Synchroniser</Text>
            <Text style={styles.actionButtonSubtitle}>
              Dernière sync: {formatLastSync()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  unavailableText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  permissionStatus: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  permissionText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  toggleSubtitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  actionButtonTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  actionButtonSubtitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
