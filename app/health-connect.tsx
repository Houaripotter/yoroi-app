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
  Alert,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
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
  Watch,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import logger from '@/lib/security/logger';
import { lightHaptic } from '@/lib/haptics';
import {
  healthConnect,
  getProviderIcon,
  getConnectionInstructions,
  HealthPermissions,
  SyncStatus,
} from '@/lib/healthConnect';
import { useWatch } from '@/lib/WatchConnectivityProvider';

export default function HealthConnectScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { syncAllData, isWatchAvailable } = useWatch();

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
    // ✅ GUARD CLAUSE : Empêcher double connexion
    if (isConnecting) {
      logger.warn('[HealthConnect UI] Connection already in progress');
      return;
    }

    impactAsync(ImpactFeedbackStyle.Medium);
    setIsConnecting(true);

    try {
      // Vérifier la disponibilité réelle (Simulateur, iPad, etc.)
      const isAvailable = await healthConnect.isAvailable();
      if (!isAvailable) {
        showPopup(
          'Non disponible',
          Platform.OS === 'ios'
            ? 'L\'app Santé n\'est pas disponible sur cet appareil (ex: Simulateur ou tablette) ou le module n\'est pas chargé.'
            : 'Google Health Connect n\'est pas disponible sur cet appareil. Installe-le depuis le Play Store.',
          [{ text: 'J\'ai compris', style: 'primary' }]
        );
        return;
      }

      const success = await healthConnect.connect();
      const status = healthConnect.getSyncStatus();

      if (success) {
        showPopup(
          'Connecté !',
          `YOROI est maintenant connecté à ${healthConnect.getProviderName()}. Tes données seront synchronisées automatiquement.`,
          [{ text: 'Super !', style: 'primary' }]
        );
      } else {
        // ✅ MESSAGES D'ERREUR SPÉCIFIQUES SELON LA RAISON
        switch (status.failureReason) {
          case 'USER_DENIED':
            showPopup(
              'Permissions refusées',
              Platform.OS === 'ios'
                ? 'Tu as refusé l\'accès à l\'app Santé. Pour que YOROI fonctionne, tu dois autoriser l\'accès.\n\nVa dans Réglages > Santé > Partage de données > YOROI et active toutes les permissions.'
                : 'Tu as refusé l\'accès à Health Connect. Pour que YOROI fonctionne, tu dois autoriser l\'accès dans les paramètres de l\'app.',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Ouvrir Réglages', onPress: () => Platform.OS === 'ios' ? safeOpenURL('App-Prefs:HEALTH') : Linking.openSettings(), style: 'primary' }
              ]
            );
            break;

          case 'MODULE_NOT_LOADED':
            showPopup(
              'Module non chargé',
              'Le module HealthKit n\'est pas chargé. Cela arrive généralement sur simulateur ou si l\'app n\'est pas compilée correctement.',
              [{ text: 'OK', style: 'primary' }]
            );
            break;

          case 'DEVICE_NOT_SUPPORTED':
            showPopup(
              'Appareil non supporté',
              Platform.OS === 'ios'
                ? 'L\'app Santé n\'est pas disponible sur cet appareil (tablette ou ancien modèle).'
                : 'Health Connect n\'est pas disponible sur cet appareil. Vérifie que tu as Android 9 ou supérieur.',
              [{ text: 'J\'ai compris', style: 'primary' }]
            );
            break;

          case 'HEALTH_CONNECT_NOT_INSTALLED':
            showPopup(
              'Health Connect non installé',
              'Health Connect n\'est pas installé sur ton téléphone. C\'est l\'app de Google qui centralise toutes tes données de santé.\n\nInstalle-la depuis le Play Store pour continuer.',
              [
                { text: 'Plus tard', style: 'cancel' },
                {
                  text: 'Installer',
                  onPress: () => Linking.openURL('market://details?id=com.google.android.apps.healthdata'),
                  style: 'primary'
                }
              ]
            );
            break;

          default:
            showPopup(
              'Erreur',
              `Impossible de se connecter à ${healthConnect.getProviderName()}. Vérifie que l\'app est installée et réessaye.`,
              [{ text: 'OK', style: 'primary' }]
            );
        }
      }

      setSyncStatus(status);
    } catch (error) {
      logger.error('Erreur connexion:', error);
      showPopup(
        'Erreur',
        'Une erreur inattendue est survenue. Réessaye plus tard.',
        [{ text: 'OK', style: 'primary' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);

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
    
    impactAsync(ImpactFeedbackStyle.Medium);
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
      safeOpenURL('x-apple-health://');
    } else {
      // Ouvrir Health Connect (pas Google Fit)
      safeOpenURL('market://details?id=com.google.android.apps.healthdata');
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

        {/* Sync Apple Watch - NOUVEAU BOUTON MANUEL */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity 
            style={[styles.watchSyncBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={async () => {
              lightHaptic();
              await syncAllData();
              showPopup('Synchronisation', 'Données envoyées vers l\'Apple Watch !', [{ text: 'OK', style: 'primary' }]);
            }}
          >
            <View style={[styles.watchIconCircle, { backgroundColor: colors.accent + '20' }]}>
              <Watch size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.watchSyncTitle, { color: colors.textPrimary }]}>Synchroniser ma montre</Text>
              <Text style={[styles.watchSyncSub, { color: colors.textMuted }]}>Force l'envoi de ton avatar et profil</Text>
            </View>
            <RefreshCw size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Apple Watch Status */}
        {/* <WatchStatusIndicator /> */}

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

        {/* ═══ GUIDE MONTRES CONNECTÉES ═══ */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          CONNECTER TA MONTRE
        </Text>

        <View style={[styles.watchGuideCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.watchGuideIntro, { color: colors.textSecondary }]}>
            YOROI récupère tes données via {Platform.OS === 'ios' ? 'Apple Santé' : 'Health Connect'}. Configure ta montre pour y partager ses données.
          </Text>

          {(Platform.OS === 'ios' ? [
            {
              brand: 'Apple Watch',
              emoji: '\u2328\uFE0F',
              color: '#333333',
              steps: [
                'Automatique ! Les données sont déjà dans Apple Santé.',
                'Connecte YOROI à Apple Santé ci-dessus.',
              ],
            },
            {
              brand: 'Garmin',
              emoji: '\u25B3',
              color: '#007DC5',
              steps: [
                'Ouvre Garmin Connect sur ton iPhone.',
                'Va dans Réglages > App Santé > Active tout.',
                'Connecte YOROI à Apple Santé ci-dessus.',
              ],
            },
            {
              brand: 'Samsung Galaxy Watch',
              emoji: '\u2609',
              color: '#1428A0',
              steps: [
                'Installe Samsung Health sur ton iPhone.',
                'Active le partage vers Apple Santé dans Samsung Health > Réglages.',
                'Connecte YOROI à Apple Santé ci-dessus.',
              ],
            },
            {
              brand: 'Huawei Watch',
              emoji: '\u25C6',
              color: '#CF0A2C',
              steps: [
                'Ouvre Huawei Santé sur ton iPhone.',
                'Va dans Moi > Réglages > Partage de données > Apple Santé.',
                'Active toutes les catégories.',
                'Connecte YOROI à Apple Santé ci-dessus.',
              ],
            },
            {
              brand: 'Fitbit / Polar / Suunto',
              emoji: '\u25CF',
              color: '#00B0B9',
              steps: [
                'Ouvre l\'app officielle de ta montre.',
                'Active le partage vers Apple Santé dans les réglages.',
                'Connecte YOROI à Apple Santé ci-dessus.',
              ],
            },
          ] : [
            {
              brand: 'Samsung Galaxy Watch',
              emoji: '\u2609',
              color: '#1428A0',
              steps: [
                'Ouvre Samsung Health sur ton téléphone.',
                'Va dans Réglages > Health Connect > Autorisations.',
                'Active le partage de toutes les données.',
                'Connecte YOROI à Health Connect ci-dessus.',
              ],
            },
            {
              brand: 'Garmin',
              emoji: '\u25B3',
              color: '#007DC5',
              steps: [
                'Ouvre Garmin Connect sur ton téléphone.',
                'Va dans Réglages > Health Connect > Active tout.',
                'Connecte YOROI à Health Connect ci-dessus.',
              ],
            },
            {
              brand: 'Huawei Watch',
              emoji: '\u25C6',
              color: '#CF0A2C',
              steps: [
                'Ouvre Huawei Santé sur ton téléphone.',
                'Va dans Moi > Réglages > Health Connect.',
                'Active le partage de toutes les catégories.',
                'Connecte YOROI à Health Connect ci-dessus.',
              ],
            },
            {
              brand: 'Fitbit / Pixel Watch',
              emoji: '\u25CF',
              color: '#00B0B9',
              steps: [
                'Ouvre l\'app Fitbit.',
                'Va dans Compte > Health Connect > Active tout.',
                'Connecte YOROI à Health Connect ci-dessus.',
              ],
            },
            {
              brand: 'Polar / Suunto / Autres',
              emoji: '\u25A0',
              color: '#D5001C',
              steps: [
                'Ouvre l\'app officielle de ta montre.',
                'Cherche "Health Connect" dans les réglages.',
                'Active le partage des données.',
                'Connecte YOROI à Health Connect ci-dessus.',
              ],
            },
          ]).map((watch, index) => (
            <View
              key={watch.brand}
              style={[
                styles.watchBrandSection,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <View style={styles.watchBrandHeader}>
                <View style={[styles.watchBrandDot, { backgroundColor: watch.color }]}>
                  <Text style={styles.watchBrandEmoji}>{watch.emoji}</Text>
                </View>
                <Text style={[styles.watchBrandName, { color: colors.textPrimary }]}>
                  {watch.brand}
                </Text>
              </View>
              {watch.steps.map((step, stepIndex) => (
                <View key={stepIndex} style={styles.watchStep}>
                  <Text style={[styles.watchStepNumber, { color: watch.color }]}>
                    {stepIndex + 1}.
                  </Text>
                  <Text style={[styles.watchStepText, { color: colors.textSecondary }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <View style={[styles.watchGuideNote, { backgroundColor: `${colors.accent}10` }]}>
            <Text style={[styles.watchGuideNoteText, { color: colors.accent }]}>
              {Platform.OS === 'ios'
                ? 'Toutes les montres qui partagent vers Apple Santé sont compatibles avec YOROI.'
                : 'Toutes les montres qui partagent vers Health Connect sont compatibles avec YOROI.'}
            </Text>
          </View>
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

        {/* Emergency Reset */}
        <TouchableOpacity 
          style={{ marginTop: 30, padding: 10, alignItems: 'center' }}
          onPress={async () => {
            Alert.alert(
              'RÉINITIALISER SANTÉ',
              "Si la popup de l'app Santé ne s'affiche pas, cela va forcer l'app à oublier l'ancienne connexion. Continuer ?",
              [
                { text: 'Annuler', style: 'cancel' },
                { 
                  text: 'OUI, FORCER', 
                  onPress: async () => {
                    await AsyncStorage.removeItem('@yoroi_health_sync_status');
                    handleConnect();
                  }
                }
              ]
            );
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>
            Un problème de connexion ? Réinitialiser l'app Santé
          </Text>
        </TouchableOpacity>

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
  watchSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  watchIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchSyncTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  watchSyncSub: {
    fontSize: 12,
    marginTop: 2,
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
  // Guide montres connectées
  watchGuideCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  watchGuideIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  watchBrandSection: {
    paddingVertical: 14,
  },
  watchBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  watchBrandDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchBrandEmoji: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  watchBrandName: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  watchStep: {
    flexDirection: 'row',
    marginLeft: 40,
    marginBottom: 6,
  },
  watchStepNumber: {
    fontSize: 13,
    fontWeight: '700',
    width: 18,
  },
  watchStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  watchGuideNote: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
  },
  watchGuideNoteText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
});

