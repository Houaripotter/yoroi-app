// ============================================
// YOROI - ECRAN APPAREILS CONNECTES
// ============================================
// Affiche les sources detectees, l'etat de connexion Apple Health / Health Connect,
// et des guides de configuration par marque (Withings, Garmin, Polar, Whoop, etc.)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useCustomPopup } from '@/components/CustomPopup';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  Scale,
  Watch,
  Activity,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Shield,
  Zap,
  Clock,
  Smartphone,
  Wifi,
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
import { getDetectedSources, getDetectedWeightSources, DetectedSource } from '@/lib/database';
import { useWatch } from '@/lib/WatchConnectivityProvider';

// ============================================
// SOURCE DISPLAY CONFIG
// ============================================

interface BrandConfig {
  key: string;
  name: string;
  color: string;
  emoji: string;
  types: string[];
  stepsIOS: string[];
  stepsAndroid: string[];
}

const BRAND_CONFIGS: BrandConfig[] = [
  {
    key: 'withings',
    name: 'Withings',
    color: '#00B5AD',
    emoji: 'W',
    types: ['Poids', 'Graisse', 'Masse maigre', 'FC', 'Sommeil'],
    stepsIOS: [
      'Ouvre Health Mate sur ton iPhone',
      'Va dans Profil > Sante > Apple Sante',
      'Active toutes les categories',
      'Reviens ici et synchronise',
    ],
    stepsAndroid: [
      'Ouvre Health Mate sur ton telephone',
      'Va dans Profil > Sante > Health Connect',
      'Active toutes les categories',
      'Reviens ici et synchronise',
    ],
  },
  {
    key: 'garmin',
    name: 'Garmin',
    color: '#007DC5',
    emoji: 'G',
    types: ['FC', 'HRV', 'Sommeil', 'Pas', 'VO2 Max', 'SpO2'],
    stepsIOS: [
      'Ouvre Garmin Connect sur ton iPhone',
      'Va dans Reglages > Apple Sante',
      'Active toutes les categories',
      'Reviens ici et synchronise',
    ],
    stepsAndroid: [
      'Ouvre Garmin Connect sur ton telephone',
      'Va dans Reglages > Health Connect',
      'Active toutes les categories',
      'Reviens ici et synchronise',
    ],
  },
  {
    key: 'polar',
    name: 'Polar',
    color: '#D5001C',
    emoji: 'P',
    types: ['FC', 'HRV', 'Sommeil', 'Calories', 'Distance'],
    stepsIOS: [
      'Ouvre Polar Flow sur ton iPhone',
      'Va dans Reglages > Apple Sante',
      'Active le partage de toutes les donnees',
      'Reviens ici et synchronise',
    ],
    stepsAndroid: [
      'Ouvre Polar Flow sur ton telephone',
      'Va dans Reglages > Health Connect',
      'Active le partage de toutes les donnees',
      'Reviens ici et synchronise',
    ],
  },
  {
    key: 'whoop',
    name: 'WHOOP',
    color: '#00C48C',
    emoji: 'WH',
    types: ['FC', 'HRV', 'Sommeil', 'Strain', 'Recovery'],
    stepsIOS: [
      'Ouvre WHOOP sur ton iPhone',
      'Va dans Reglages > Apps connectees > Apple Sante',
      'Active toutes les categories',
      'Reviens ici et synchronise',
    ],
    stepsAndroid: [
      'Ouvre WHOOP sur ton telephone',
      'Va dans Reglages > Apps connectees > Health Connect',
      'Active toutes les categories',
      'Reviens ici et synchronise',
    ],
  },
  {
    key: 'scales',
    name: 'Balances connectees',
    color: '#8B5CF6',
    emoji: 'B',
    types: ['Poids', 'Graisse', 'Masse maigre', 'BMR'],
    stepsIOS: [
      'Ouvre l\'app de ta balance (Xiaomi, Renpho, Eufy, Omron...)',
      'Va dans Reglages > Apple Sante',
      'Active le partage du poids et de la composition',
      'Reviens ici et synchronise',
    ],
    stepsAndroid: [
      'Ouvre l\'app de ta balance (Xiaomi, Renpho, Eufy, Omron...)',
      'Va dans Reglages > Health Connect',
      'Active le partage du poids et de la composition',
      'Reviens ici et synchronise',
    ],
  },
];

const SOURCE_DISPLAY: Record<string, { name: string; color: string; emoji: string }> = {
  withings: { name: 'Withings', color: '#00B5AD', emoji: 'W' },
  garmin: { name: 'Garmin', color: '#007DC5', emoji: 'G' },
  polar: { name: 'Polar', color: '#D5001C', emoji: 'P' },
  whoop: { name: 'WHOOP', color: '#00C48C', emoji: 'WH' },
  apple_watch: { name: 'Apple Watch', color: '#333333', emoji: 'AW' },
  samsung: { name: 'Samsung Health', color: '#1428A0', emoji: 'S' },
  fitbit: { name: 'Fitbit', color: '#00B0B9', emoji: 'F' },
  xiaomi: { name: 'Xiaomi / Mi Fitness', color: '#FF6900', emoji: 'X' },
  renpho: { name: 'Renpho', color: '#2563EB', emoji: 'R' },
  eufy: { name: 'Eufy', color: '#1D4ED8', emoji: 'E' },
  omron: { name: 'Omron', color: '#003DA5', emoji: 'O' },
  suunto: { name: 'Suunto', color: '#000000', emoji: 'Su' },
  oura: { name: 'Oura', color: '#D4AF37', emoji: 'Or' },
  iphone: { name: 'iPhone', color: '#666666', emoji: 'iP' },
  apple_health: { name: 'Apple Sante', color: '#FF3B30', emoji: 'AS' },
  health_connect: { name: 'Health Connect', color: '#4285F4', emoji: 'HC' },
  manual: { name: 'Saisie manuelle', color: '#9CA3AF', emoji: 'M' },
};

const DATA_TYPE_LABELS: Record<string, string> = {
  steps: 'Pas',
  calories_active: 'Calories',
  calories_basal: 'Calories repos',
  heart_rate: 'FC',
  heart_rate_resting: 'FC repos',
  hrv: 'HRV',
  sleep: 'Sommeil',
  distance: 'Distance',
  vo2max: 'VO2 Max',
  spo2: 'SpO2',
  body_fat: 'Graisse',
  lean_mass: 'Masse maigre',
  weight: 'Poids',
};

// ============================================
// DATA MATRIX - What each brand provides
// ============================================

const DATA_MATRIX: Record<string, string[]> = {
  withings:     ['weight', 'body_fat', 'lean_mass', 'heart_rate', 'sleep', 'spo2'],
  garmin:       ['heart_rate', 'hrv', 'sleep', 'steps', 'calories_active', 'vo2max', 'spo2', 'distance'],
  polar:        ['heart_rate', 'hrv', 'sleep', 'calories_active', 'distance'],
  whoop:        ['heart_rate', 'hrv', 'sleep', 'calories_active'],
  apple_watch:  ['heart_rate', 'hrv', 'sleep', 'steps', 'calories_active', 'vo2max', 'spo2', 'distance'],
  samsung:      ['heart_rate', 'sleep', 'steps', 'calories_active', 'distance'],
  fitbit:       ['heart_rate', 'hrv', 'sleep', 'steps', 'calories_active', 'spo2', 'distance'],
  xiaomi:       ['weight', 'body_fat', 'heart_rate', 'sleep', 'steps'],
  renpho:       ['weight', 'body_fat', 'lean_mass'],
  eufy:         ['weight', 'body_fat', 'lean_mass'],
  omron:        ['weight', 'body_fat'],
};

// ============================================
// COMPONENT
// ============================================

export default function ConnectedDevicesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { syncAllData } = useWatch();

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [detectedSources, setDetectedSources] = useState<DetectedSource[]>([]);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [showDataMatrix, setShowDataMatrix] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load health connection status
    await healthConnect.initialize();
    setSyncStatus(healthConnect.getSyncStatus());

    // Load detected sources from DB
    try {
      const [healthSources, weightSources] = await Promise.all([
        getDetectedSources(30),
        getDetectedWeightSources(30),
      ]);
      // Merge and deduplicate
      const allSourcesMap = new Map<string, DetectedSource>();
      for (const s of [...healthSources, ...weightSources]) {
        const existing = allSourcesMap.get(s.source);
        if (!existing || s.last_date > existing.last_date) {
          allSourcesMap.set(s.source, s);
        }
      }
      setDetectedSources(Array.from(allSourcesMap.values()));
    } catch (e) {
      logger.warn('[ConnectedDevices] Error loading sources:', e);
    }
  };

  const handleConnect = async () => {
    if (isConnecting) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsConnecting(true);

    try {
      const isAvailable = await healthConnect.isAvailable();
      if (!isAvailable) {
        showPopup(
          'Non disponible',
          Platform.OS === 'ios'
            ? "L'app Sante n'est pas disponible sur cet appareil."
            : "Health Connect n'est pas disponible. Installe-le depuis le Play Store.",
          [{ text: "J'ai compris", style: 'primary' }]
        );
        return;
      }

      const success = await healthConnect.connect();
      const status = healthConnect.getSyncStatus();

      if (success) {
        showPopup(
          'Connecte !',
          `YOROI est maintenant connecte a ${healthConnect.getProviderName()}.`,
          [{ text: 'Super !', style: 'primary' }]
        );
        // Reload detected sources after successful sync
        loadData();
      } else {
        switch (status.failureReason) {
          case 'USER_DENIED':
            showPopup(
              'Permissions refusees',
              Platform.OS === 'ios'
                ? "Va dans Reglages > Sante > Partage de donnees > YOROI et active les permissions."
                : "Autorise l'acces dans les parametres de l'app.",
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Ouvrir Reglages', onPress: () => Platform.OS === 'ios' ? safeOpenURL('App-Prefs:HEALTH') : Linking.openSettings(), style: 'primary' },
              ]
            );
            break;
          default:
            showPopup(
              'Erreur',
              `Impossible de se connecter. Verifie que l'app est installee et reessaye.`,
              [{ text: 'OK', style: 'primary' }]
            );
        }
      }
      setSyncStatus(status);
    } catch (error) {
      logger.error('[ConnectedDevices] Connection error:', error);
      showPopup('Erreur', 'Une erreur inattendue est survenue.', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    showPopup(
      'Deconnecter ?',
      `Tes donnees ne seront plus synchronisees automatiquement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnecter',
          style: 'destructive',
          onPress: async () => {
            await healthConnect.disconnect();
            setSyncStatus(healthConnect.getSyncStatus());
          },
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
      // Reload detected sources
      loadData();
      showPopup('Synchronise !', 'Tes donnees de sante ont ete mises a jour.', [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      logger.error('[ConnectedDevices] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (dateString: string | null): string => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString(locale);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Aujourd'hui";
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays}j`;
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  };

  const isConnected = syncStatus?.isConnected || false;
  const providerName = healthConnect.getProviderName();
  const providerIcon = getProviderIcon();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Appareils connectes
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Recupere tes donnees automatiquement
            </Text>
          </View>
        </View>

        {/* ═══ SECTION 1: CONNECTION APPLE HEALTH / HEALTH CONNECT ═══ */}
        <View style={[styles.providerCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.providerHeader}>
            <Text style={styles.providerEmoji}>{providerIcon}</Text>
            <View style={styles.providerInfo}>
              <Text style={[styles.providerName, { color: colors.textPrimary }]}>
                {providerName}
              </Text>
              <Text style={[styles.providerStatus, { color: isConnected ? '#10B981' : colors.textMuted }]}>
                {isConnected ? 'Connecte' : 'Non connecte'}
              </Text>
            </View>
            {isConnected && (
              <TouchableOpacity
                style={[styles.syncBtn, { backgroundColor: colors.accent }]}
                onPress={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <RefreshCw size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {isConnected && syncStatus?.lastSync && (
            <View style={[styles.lastSyncRow, { borderTopColor: colors.border }]}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={[styles.lastSyncText, { color: colors.textMuted }]}>
                Derniere sync : {formatLastSync(syncStatus.lastSync)}
              </Text>
            </View>
          )}

          {!isConnected ? (
            <TouchableOpacity
              style={[styles.connectBtn, { backgroundColor: '#10B981' }]}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              <Heart size={18} color="#FFFFFF" />
              <Text style={styles.connectBtnText}>
                {isConnecting ? 'Connexion...' : `Connecter a ${providerName}`}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.disconnectBtn, { borderColor: colors.border }]}
              onPress={handleDisconnect}
            >
              <X size={14} color={colors.textMuted} />
              <Text style={[styles.disconnectBtnText, { color: colors.textMuted }]}>
                Deconnecter
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ SECTION 2: APPAREILS DETECTES ═══ */}
        {detectedSources.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              APPAREILS DETECTES
            </Text>
            <View style={[styles.sourcesCard, { backgroundColor: colors.backgroundCard }]}>
              {detectedSources.map((source, index) => {
                const display = SOURCE_DISPLAY[source.source] || {
                  name: source.source,
                  color: colors.accent,
                  emoji: '?',
                };
                return (
                  <View
                    key={source.source}
                    style={[
                      styles.sourceRow,
                      index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                    ]}
                  >
                    <View style={[styles.sourceBadge, { backgroundColor: display.color }]}>
                      <Text style={styles.sourceBadgeText}>{display.emoji}</Text>
                    </View>
                    <View style={styles.sourceInfo}>
                      <Text style={[styles.sourceName, { color: colors.textPrimary }]}>
                        {display.name}
                      </Text>
                      <Text style={[styles.sourceDetail, { color: colors.textMuted }]}>
                        {DATA_TYPE_LABELS[source.last_type] || source.last_type} - {formatDate(source.last_date)}
                      </Text>
                    </View>
                    <View style={[styles.sourceCountBadge, { backgroundColor: `${display.color}15` }]}>
                      <Text style={[styles.sourceCount, { color: display.color }]}>
                        {source.record_count}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ═══ SECTION 3: GUIDES DE CONFIGURATION PAR MARQUE ═══ */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          CONFIGURER TES APPAREILS
        </Text>

        <View style={[styles.infoNote, { backgroundColor: `${colors.accent}10` }]}>
          <Wifi size={16} color={colors.accent} />
          <Text style={[styles.infoNoteText, { color: colors.accent }]}>
            YOROI recupere les donnees via {providerName}. Configure ton appareil pour y partager ses donnees.
          </Text>
        </View>

        {BRAND_CONFIGS.map((brand) => {
          const isExpanded = expandedBrand === brand.key;
          const steps = Platform.OS === 'ios' ? brand.stepsIOS : brand.stepsAndroid;
          const isDetected = detectedSources.some(s => s.source === brand.key);

          return (
            <TouchableOpacity
              key={brand.key}
              style={[styles.brandCard, { backgroundColor: colors.backgroundCard }]}
              onPress={() => {
                lightHaptic();
                setExpandedBrand(isExpanded ? null : brand.key);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.brandHeader}>
                <View style={[styles.brandDot, { backgroundColor: brand.color }]}>
                  <Text style={styles.brandDotText}>{brand.emoji}</Text>
                </View>
                <View style={styles.brandInfo}>
                  <Text style={[styles.brandName, { color: colors.textPrimary }]}>
                    {brand.name}
                  </Text>
                  <Text style={[styles.brandTypes, { color: colors.textMuted }]}>
                    {brand.types.join(' / ')}
                  </Text>
                </View>
                {isDetected && (
                  <View style={[styles.detectedBadge, { backgroundColor: '#10B98120' }]}>
                    <Check size={12} color="#10B981" />
                  </View>
                )}
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={colors.textMuted} />
                )}
              </View>

              {isExpanded && (
                <View style={[styles.brandSteps, { borderTopColor: colors.border }]}>
                  {steps.map((step, stepIndex) => (
                    <View key={stepIndex} style={styles.stepRow}>
                      <View style={[styles.stepNumber, { backgroundColor: brand.color }]}>
                        <Text style={styles.stepNumberText}>{stepIndex + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ═══ SECTION 4: MATRICE DE DONNEES ═══ */}
        <TouchableOpacity
          style={[styles.matrixToggle, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            lightHaptic();
            setShowDataMatrix(!showDataMatrix);
          }}
        >
          <Activity size={18} color={colors.accent} />
          <Text style={[styles.matrixToggleText, { color: colors.textPrimary }]}>
            Matrice des donnees par appareil
          </Text>
          {showDataMatrix ? (
            <ChevronUp size={18} color={colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {showDataMatrix && (
          <View style={[styles.matrixCard, { backgroundColor: colors.backgroundCard }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header row */}
                <View style={styles.matrixRow}>
                  <View style={[styles.matrixHeaderCell, { width: 100 }]}>
                    <Text style={[styles.matrixHeaderText, { color: colors.textMuted }]}>Appareil</Text>
                  </View>
                  {['weight', 'body_fat', 'heart_rate', 'hrv', 'sleep', 'steps', 'calories_active', 'vo2max'].map((type) => (
                    <View key={type} style={styles.matrixHeaderCell}>
                      <Text style={[styles.matrixHeaderText, { color: colors.textMuted }]} numberOfLines={1}>
                        {DATA_TYPE_LABELS[type] || type}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* Data rows */}
                {Object.entries(DATA_MATRIX).map(([sourceKey, types]) => {
                  const display = SOURCE_DISPLAY[sourceKey];
                  if (!display) return null;
                  return (
                    <View key={sourceKey} style={[styles.matrixRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                      <View style={[styles.matrixLabelCell, { width: 100 }]}>
                        <Text style={[styles.matrixLabelText, { color: colors.textPrimary }]} numberOfLines={1}>
                          {display.name}
                        </Text>
                      </View>
                      {['weight', 'body_fat', 'heart_rate', 'hrv', 'sleep', 'steps', 'calories_active', 'vo2max'].map((type) => (
                        <View key={type} style={styles.matrixDataCell}>
                          {types.includes(type) ? (
                            <Check size={14} color="#10B981" />
                          ) : (
                            <Text style={{ color: colors.textMuted, fontSize: 10 }}>-</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ═══ AVANTAGES ═══ */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          AVANTAGES
        </Text>

        <View style={[styles.benefitsCard, { backgroundColor: colors.backgroundCard }]}>
          {[
            { icon: Zap, title: 'Automatique', desc: 'Plus besoin de tout entrer manuellement', iconColor: colors.accent },
            { icon: Shield, title: 'Securise', desc: 'Tes donnees restent sur ton telephone', iconColor: colors.accent },
            { icon: Smartphone, title: 'Compatible', desc: 'Fonctionne avec toutes les marques', iconColor: colors.accent },
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
                <View style={[styles.benefitIcon, { backgroundColor: `${benefit.iconColor}15` }]}>
                  <Icon size={18} color={benefit.iconColor} />
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={[styles.benefitTitle, { color: colors.textPrimary }]}>{benefit.title}</Text>
                  <Text style={[styles.benefitDesc, { color: colors.textMuted }]}>{benefit.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ═══ OPEN HEALTH APP ═══ */}
        <TouchableOpacity
          style={[styles.openAppBtn, { borderColor: colors.border }]}
          onPress={() => {
            if (Platform.OS === 'ios') {
              safeOpenURL('x-apple-health://');
            } else {
              safeOpenURL('market://details?id=com.google.android.apps.healthdata');
            }
          }}
        >
          <Text style={[styles.openAppText, { color: colors.textSecondary }]}>
            Ouvrir {providerName}
          </Text>
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  // Provider card
  providerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerEmoji: {
    fontSize: 36,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 17,
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
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  connectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  disconnectBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Section titles
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  // Detected sources
  sourcesCard: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  sourceBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  sourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sourceDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  sourceCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  // Brand cards
  brandCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDotText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  brandInfo: {
    flex: 1,
    marginLeft: 12,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '700',
  },
  brandTypes: {
    fontSize: 11,
    marginTop: 2,
  },
  detectedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandSteps: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 10,
  },
  // Data matrix
  matrixToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    marginTop: 6,
  },
  matrixToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  matrixCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  matrixHeaderCell: {
    width: 60,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  matrixHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  matrixLabelCell: {
    paddingHorizontal: 4,
  },
  matrixLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  matrixDataCell: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Benefits
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
    fontSize: 14,
    fontWeight: '600',
  },
  benefitDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  // Open app button
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
});
