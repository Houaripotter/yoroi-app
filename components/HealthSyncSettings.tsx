import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,

  ActivityIndicator,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { Activity, Download, Upload, Check, X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
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
  const { colors, themeName } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const isWellness = false;

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
      logger.error('❌ Erreur lors du chargement des paramètres:', error);
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
        showPopup(
          'Permission requise',
          'L\'accès à l\'app Santé est nécessaire pour l\'export automatique. Autorise l\'accès dans Réglages > Confidentialité > Santé > Yoroi',
          [{ text: 'OK', style: 'primary' }]
        );
        return;
      }
    }

    await setAppleHealthAutoExport(value);
    setAutoExportEnabled(value);

    showPopup(
      'Succès',
      value
        ? 'Les nouvelles mesures seront automatiquement envoyées vers l\'app Santé'
        : 'L\'export automatique vers l\'app Santé a été désactivé',
      [{ text: 'OK', style: 'primary' }]
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
      logger.error('❌ Erreur lors de l\'import:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);

    try {
      const count = await syncFromAppleHealth();

      if (count > 0) {
        showPopup('Succès', `${count} nouvelle(s) mesure(s) synchronisee(s)`, [{ text: 'OK', style: 'primary' }]);
      } else {
        showPopup('Information', 'Aucune nouvelle donnee a synchroniser', [{ text: 'OK', style: 'primary' }]);
      }

      // Mettre à jour la dernière sync
      const now = new Date();
      setLastSync(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
    } catch (error) {
      logger.error('❌ Erreur lors de la synchronisation:', error);
      showPopup('Erreur', 'Impossible de synchroniser les donnees', [{ text: 'OK', style: 'primary' }]);
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

  const cardShadow = isWellness ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  };

  // Si Apple Health n'est pas disponible (Android ou web)
  if (!available) {
    return (
      <View style={[styles.unavailableContainer, { backgroundColor: colors.card }, cardShadow]}>
        <View style={[styles.iconContainer, { backgroundColor: '#94A3B820' }]}>
          <X size={20} color="#94A3B8" strokeWidth={2.5} />
        </View>
        <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
          App Santé n'est disponible que sur iOS
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Statut de permission */}
      <View style={[styles.permissionStatus, { backgroundColor: colors.card }, cardShadow]}>
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
          <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
            {hasPermission ? 'Autorisé' : 'Permission requise'}
          </Text>
        </View>
      </View>

      {/* Export automatique */}
      <View style={[styles.toggleRow, { backgroundColor: colors.card }, cardShadow]}>
        <View style={styles.toggleLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
            <Upload size={20} color="#3B82F6" strokeWidth={2.5} />
          </View>
          <View style={styles.toggleText}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Export automatique</Text>
            <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
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
        style={[styles.actionButton, { backgroundColor: colors.card }, cardShadow]}
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
            <Text style={[styles.actionButtonTitle, { color: colors.textPrimary }]}>Importer depuis l'app Santé</Text>
            <Text style={[styles.actionButtonSubtitle, { color: colors.textSecondary }]}>
              Récupérer l'historique de poids (365 jours)
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Synchronisation */}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.card }, cardShadow]}
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
            <Text style={[styles.actionButtonTitle, { color: colors.textPrimary }]}>Synchroniser</Text>
            <Text style={[styles.actionButtonSubtitle, { color: colors.textSecondary }]}>
              Dernière sync: {formatLastSync()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
  },
  unavailableText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  permissionStatus: {
    borderRadius: 16,
    padding: 16,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  toggleSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  actionButton: {
    borderRadius: 16,
    padding: 16,
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
});
