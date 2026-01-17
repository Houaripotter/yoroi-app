import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Heart,
  Footprints,
  Moon,
  Scale,
  Activity,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Shield,
  Zap,
  Clock,
  Smartphone,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import logger from '@/lib/security/logger';
import {
  healthConnect, 
  getProviderIcon, 
  getConnectionInstructions,
  HealthPermissions,
  SyncStatus,
} from '@/lib/healthConnect';

export default function HealthConnectScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    await healthConnect.initialize();
    setSyncStatus(healthConnect.getSyncStatus());
  };

  const handleConnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsConnecting(true);
    
    try {
      const success = await healthConnect.connect();

      if (success) {
        showPopup(
          'Connecte !',
          `YOROI est maintenant connecte a ${healthConnect.getProviderName()}. Tes donnees seront synchronisees automatiquement.`,
          [{ text: 'Super !', style: 'primary' }]
        );
      } else {
        showPopup(
          'Erreur',
          `Impossible de se connecter a ${healthConnect.getProviderName()}. Verifie que l'app est installee et reessaie.`,
          [{ text: 'OK', style: 'primary' }]
        );
      }

      setSyncStatus(healthConnect.getSyncStatus());
    } catch (error) {
      logger.error('Erreur connexion:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    showPopup(
      'Deconnecter ?',
      `Veux-tu vraiment deconnecter YOROI de ${healthConnect.getProviderName()} ? Tes donnees ne seront plus synchronisees automatiquement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnecter',
          style: 'destructive',
          onPress: async () => {
            await healthConnect.disconnect();
            setSyncStatus(healthConnect.getSyncStatus());
          }
        },
      ]
    );
  };

  const handleSync = async () => {
    if (isSyncing) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    
    try {
      await healthConnect.syncAll();
      setSyncStatus(healthConnect.getSyncStatus());

      showPopup(
        'Synchronise !',
        'Tes donnees de sante ont ete mises a jour.',
        [{ text: 'OK', style: 'primary' }]
      );
    } catch (error) {
      logger.error('Erreur sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const openHealthApp = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('x-apple-health://');
    } else {
      Linking.openURL('market://details?id=com.google.android.apps.fitness');
    }
  };

  const formatLastSync = (dateString: string | null): string => {
    if (!dateString) return 'Jamais';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    return date.toLocaleDateString(locale);
  };

  const providerName = healthConnect.getProviderName();
  const providerIcon = getProviderIcon();
  const instructions = getConnectionInstructions();
  const isConnected = syncStatus?.isConnected || false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Connexion Santé
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Provider Card */}
        <View style={[styles.providerCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.providerHeader}>
            <Text style={styles.providerIcon}>{providerIcon}</Text>
            <View style={styles.providerInfo}>
              <Text style={[styles.providerName, { color: colors.textPrimary }]}>
                {providerName}
              </Text>
              <Text style={[styles.providerStatus, { color: isConnected ? '#10B981' : colors.textMuted }]}>
                {isConnected ? '● Connecté' : '○ Non connecté'}
              </Text>
            </View>
            {isConnected && (
              <TouchableOpacity 
                style={[styles.syncBtn, { backgroundColor: colors.accent }]}
                onPress={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw 
                  size={16} 
                  color="#FFFFFF" 
                  style={isSyncing ? { transform: [{ rotate: '45deg' }] } : undefined}
                />
              </TouchableOpacity>
            )}
          </View>

          {isConnected && syncStatus?.lastSync && (
            <View style={[styles.lastSyncRow, { borderTopColor: colors.border }]}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={[styles.lastSyncText, { color: colors.textMuted }]}>
                Dernière sync : {formatLastSync(syncStatus.lastSync)}
              </Text>
            </View>
          )}
        </View>

        {/* Connection Button */}
        {!isConnected ? (
          <TouchableOpacity 
            style={[styles.connectBtn, { backgroundColor: '#10B981' }]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            <Heart size={20} color="#FFFFFF" />
            <Text style={styles.connectBtnText}>
              {isConnecting ? 'Connexion...' : `Connecter à ${providerName}`}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.disconnectBtn, { borderColor: '#EF4444' }]}
            onPress={handleDisconnect}
          >
            <X size={18} color="#EF4444" />
            <Text style={[styles.disconnectBtnText, { color: '#EF4444' }]}>
              Déconnecter
            </Text>
          </TouchableOpacity>
        )}

        {/* Permissions */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          DONNÉES SYNCHRONISÉES
        </Text>
        
        <View style={[styles.permissionsCard, { backgroundColor: colors.backgroundCard }]}>
          {[
            { key: 'weight', label: 'Poids', icon: Scale, desc: 'Balance connectée' },
            { key: 'steps', label: 'Pas', icon: Footprints, desc: 'Podomètre' },
            { key: 'sleep', label: 'Sommeil', icon: Moon, desc: 'Données de sommeil' },
            { key: 'heartRate', label: 'Fréquence cardiaque', icon: Activity, desc: 'Montre connectée' },
          ].map((item, index) => {
            const Icon = item.icon;
            const hasPermission = syncStatus?.permissions[item.key as keyof HealthPermissions] || false;
            
            return (
              <View 
                key={item.key}
                style={[
                  styles.permissionRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.permissionIcon, { backgroundColor: `${colors.accent}15` }]}>
                  <Icon size={18} color={colors.accent} />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={[styles.permissionLabel, { color: colors.textPrimary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>
                    {item.desc}
                  </Text>
                </View>
                {isConnected ? (
                  hasPermission ? (
                    <Check size={18} color="#10B981" />
                  ) : (
                    <X size={18} color={colors.textMuted} />
                  )
                ) : (
                  <View style={[styles.lockedBadge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.lockedText, { color: colors.textMuted }]}>-</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Instructions */}
        {!isConnected && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              COMMENT ÇA MARCHE
            </Text>
            
            <View style={[styles.instructionsCard, { backgroundColor: colors.backgroundCard }]}>
              {instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionRow}>
                  <View style={[styles.instructionNumber, { backgroundColor: colors.accent }]}>
                    <Text style={styles.instructionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                    {instruction.substring(3)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Benefits */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          AVANTAGES
        </Text>
        
        <View style={[styles.benefitsCard, { backgroundColor: colors.backgroundCard }]}>
          {[
            { icon: Zap, title: 'Automatique', desc: 'Plus besoin de tout entrer manuellement' },
            { icon: Shield, title: 'Sécurisé', desc: 'Tes données restent sur ton téléphone' },
            { icon: Smartphone, title: 'Compatible', desc: 'Fonctionne avec toutes tes apps santé' },
          ].map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <View 
                key={index}
                style={[
                  styles.benefitRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.benefitIcon, { backgroundColor: `${colors.gold}15` }]}>
                  <Icon size={18} color={colors.gold} />
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={[styles.benefitTitle, { color: colors.textPrimary }]}>
                    {benefit.title}
                  </Text>
                  <Text style={[styles.benefitDesc, { color: colors.textMuted }]}>
                    {benefit.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Open Health App */}
        <TouchableOpacity 
          style={[styles.openAppBtn, { borderColor: colors.border }]}
          onPress={openHealthApp}
        >
          <Text style={[styles.openAppText, { color: colors.textSecondary }]}>
            Ouvrir {providerName}
          </Text>
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Note */}
        <Text style={[styles.note, { color: colors.textMuted }]}>
          Astuce : Pour une meilleure precision, utilise une balance connectee
          et porte ta montre pendant ton sommeil.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
      <PopupComponent />
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
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  providerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    fontSize: 36,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
  },
  providerStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  syncBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  lastSyncText: {
    fontSize: 12,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  connectBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  disconnectBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  permissionsCard: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  permissionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  permissionDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  lockedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  instructionsCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 10,
  },
  benefitsCard: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitInfo: {
    flex: 1,
    marginLeft: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  benefitDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  openAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  openAppText: {
    fontSize: 14,
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

