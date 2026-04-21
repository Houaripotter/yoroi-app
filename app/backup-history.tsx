// ============================================================
// YOROI — Mes sauvegardes — Bibliothèque (v4)
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import {
  Trash2,
  Download,
  RotateCcw,
  ChevronLeft,
  Shield,
  FileText,
  Cloud,
  Plus,
  Eye,
  FolderOpen,
  Link2Off,
  Link,
  X,
  Scale,
  Dumbbell,
  Camera,
  Moon,
  Droplets,
  Trophy,
  Heart,
  User,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { BackupStatusHeader } from '@/components/BackupStatusHeader';
import { BackupEncryptionToggle } from '@/components/BackupEncryptionToggle';
import { SafetyBackupRestoreButton } from '@/components/SafetyBackupRestoreButton';
import { BackupTypeSelector } from '@/components/BackupTypeSelector';
import { CrossPlatformMigrationButton } from '@/components/CrossPlatformMigrationButton';
import { TestRestoreButton } from '@/components/TestRestoreButton';
import { BackupFaqAccordion } from '@/components/BackupFaqAccordion';
import { exportDataToJSON } from '@/lib/exportService';
import { notificationAsync, impactAsync, NotificationFeedbackType, ImpactFeedbackStyle } from 'expo-haptics';
import logger from '@/lib/security/logger';
import {
  pickCloudFolder,
  getSavedCloudFolder,
  listCloudBackups,
  readCloudBackupFile,
  copyToCloudFolder,
  disconnectCloudFolder,
  type CloudFolder,
  type CloudBackupFile,
} from '@/lib/cloudFolderService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 12;

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface BackupFile {
  name: string;
  uri: string;
  size: number;
  modifiedAt: number;
  version: string;
  userName: string;
  weightsCount: number;
  trainingsCount: number;
  photosCount: number;
  sleepCount: number;
  hydrationCount: number;
  injuriesCount: number;
  competitionsCount: number;
  clubsCount: number;
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatDateLong(ts: number): string {
  const d = new Date(ts);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateFromFileName(name: string): number {
  try {
    const match = name.match(/yoroi_backup_(\d{4}-\d{2}-\d{2})_(\d{2})h(\d{2})/);
    if (match) return new Date(`${match[1]}T${match[2]}:${match[3]}:00`).getTime();
    const matchOld = name.match(/yoroi_backup_(\d{4}-\d{2}-\d{2})/);
    if (matchOld) return new Date(matchOld[1]).getTime();
  } catch { }
  return 0;
}

// ─────────────────────────────────────────────
// FICHE DE PRÉVISUALISATION (bottom sheet)
// ─────────────────────────────────────────────

interface PreviewSheetProps {
  backup: BackupFile | null;
  visible: boolean;
  onClose: () => void;
  onRestore: (b: BackupFile) => void;
  onDownload: (b: BackupFile) => void;
  onDelete: (b: BackupFile) => void;
  isDark: boolean;
  colors: any;
}

function PreviewSheet({ backup, visible, onClose, onRestore, onDownload, onDelete, isDark, colors }: PreviewSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const insets     = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!backup) return null;

  const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const muted   = colors.textMuted;

  const stats = [
    { icon: Scale,    label: 'Pesées',       value: backup.weightsCount,     color: '#14B8A6' },
    { icon: Dumbbell, label: 'Séances',       value: backup.trainingsCount,   color: '#8B5CF6' },
    { icon: Camera,   label: 'Photos',        value: backup.photosCount,      color: '#F59E0B' },
    { icon: Moon,     label: 'Sommeil',       value: backup.sleepCount,       color: '#3B82F6' },
    { icon: Droplets, label: 'Hydratation',   value: backup.hydrationCount,   color: '#06B6D4' },
    { icon: Heart,    label: 'Blessures',     value: backup.injuriesCount,    color: '#EF4444' },
    { icon: Trophy,   label: 'Compétitions',  value: backup.competitionsCount,color: '#EAB308' },
    { icon: User,     label: 'Clubs',         value: backup.clubsCount,       color: '#EC4899' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Fond sombre */}
      <Animated.View style={[styles.sheetOverlay, { opacity }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Panneau */}
      <Animated.View style={[styles.sheet, { backgroundColor: sheetBg, paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* En-tête */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetFileIcon}>
            <LinearGradient colors={['#0EA5E9', '#14B8A6']} style={styles.sheetFileIconGradient}>
              <FileText size={28} color="#FFFFFF" strokeWidth={1.5} />
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              {formatDateLong(backup.modifiedAt)}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: muted }]}>
              {formatTime(backup.modifiedAt)} · {formatSize(backup.size)} · v{backup.version}
            </Text>
            {backup.userName !== '?' && (
              <Text style={[styles.sheetUser, { color: '#0EA5E9' }]}>👤 {backup.userName}</Text>
            )}
          </View>
          <TouchableOpacity style={[styles.sheetCloseBtn, { backgroundColor: isDark ? '#FFFFFF15' : '#F1F5F9' }]} onPress={onClose}>
            <X size={18} color={muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Grille des stats */}
        <Text style={[styles.sheetSectionLabel, { color: muted }]}>CONTENU DE CE BACKUP</Text>
        <View style={styles.sheetStatsGrid}>
          {stats.map(({ icon: Icon, label, value, color }) => (
            <View key={label} style={[styles.sheetStatCell, { backgroundColor: isDark ? '#FFFFFF08' : '#F8FAFC' }]}>
              <View style={[styles.sheetStatIcon, { backgroundColor: `${color}20` }]}>
                <Icon size={16} color={color} strokeWidth={2} />
              </View>
              <Text style={[styles.sheetStatValue, { color: colors.textPrimary }]}>{value}</Text>
              <Text style={[styles.sheetStatLabel, { color: muted }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={[styles.sheetActionPrimary, { backgroundColor: '#14B8A6' }]}
            onPress={() => { onClose(); setTimeout(() => onRestore(backup), 300); }}
            activeOpacity={0.85}
          >
            <RotateCcw size={18} color="#FFF" strokeWidth={2} />
            <Text style={styles.sheetActionPrimaryText}>Restaurer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sheetActionSecondary, { backgroundColor: isDark ? '#FFFFFF12' : '#EFF6FF', borderColor: isDark ? '#FFFFFF20' : '#BFDBFE' }]}
            onPress={() => { onClose(); setTimeout(() => onDownload(backup), 300); }}
            activeOpacity={0.85}
          >
            <Download size={18} color="#0EA5E9" strokeWidth={2} />
            <Text style={[styles.sheetActionSecondaryText, { color: '#0EA5E9' }]}>Télécharger</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sheetDeleteBtn, { borderColor: isDark ? '#EF444430' : '#FECACA', backgroundColor: isDark ? '#EF444410' : '#FEF2F2' }]}
          onPress={() => { onClose(); setTimeout(() => onDelete(backup), 300); }}
          activeOpacity={0.85}
        >
          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
          <Text style={styles.sheetDeleteText}>Supprimer ce backup</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// CARTE DE BACKUP (grille 2 colonnes)
// ─────────────────────────────────────────────

interface BackupCardProps {
  backup: BackupFile;
  isLatest: boolean;
  isRestoring: boolean;
  isSyncing: boolean;
  hasCloud: boolean;
  isDark: boolean;
  colors: any;
  cardWidth: number;
  onPreview: () => void;
  onDownload: () => void;
  onRestore: () => void;
  onCopyCloud: () => void;
  onDelete: () => void;
}

function BackupCard({ backup, isLatest, isRestoring, isSyncing, hasCloud, isDark, colors, cardWidth, onPreview, onDownload, onRestore, onCopyCloud, onDelete }: BackupCardProps) {
  const cardBg  = isDark ? colors.card : '#FFFFFF';
  const muted   = colors.textMuted;
  const accentColor = isLatest ? '#14B8A6' : '#0EA5E9';

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth, backgroundColor: cardBg }]}
      onPress={onPreview}
      activeOpacity={0.92}
    >
      {/* Bandeau couleur haut */}
      <LinearGradient
        colors={isLatest ? ['#14B8A6', '#0EA5E9'] : ['#0EA5E930', '#14B8A620']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.cardBanner}
      >
        <FileText size={26} color={isLatest ? '#FFFFFF' : accentColor} strokeWidth={1.5} />
        {isLatest && (
          <View style={styles.cardRecentBadge}>
            <CheckCircle2 size={10} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.cardRecentText}>RÉCENT</Text>
          </View>
        )}
      </LinearGradient>

      {/* Corps */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardDate, { color: colors.textPrimary }]}>
          {formatDateShort(backup.modifiedAt)}
        </Text>
        <Text style={[styles.cardTime, { color: muted }]}>
          {formatTime(backup.modifiedAt)}
        </Text>
        <Text style={[styles.cardMeta, { color: muted }]}>
          {formatSize(backup.size)} · v{backup.version}
        </Text>

        {/* Mini stats */}
        <View style={[styles.cardMiniStats, { borderTopColor: isDark ? '#FFFFFF10' : '#F1F5F9' }]}>
          <Text style={[styles.cardMiniStat, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: accentColor }}>{backup.weightsCount}</Text> pesées
          </Text>
          <Text style={[styles.cardMiniStat, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: accentColor }}>{backup.trainingsCount}</Text> séances
          </Text>
        </View>
      </View>

      {/* Barre d'actions icon-only */}
      <View style={[styles.cardActions, { borderTopColor: isDark ? '#FFFFFF10' : '#F1F5F9' }]}>
        {/* Aperçu */}
        <TouchableOpacity style={styles.cardActionBtn} onPress={onPreview} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Eye size={16} color={accentColor} strokeWidth={2} />
        </TouchableOpacity>

        {/* Télécharger / Cloud */}
        <TouchableOpacity style={styles.cardActionBtn} onPress={hasCloud ? onCopyCloud : onDownload} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {isSyncing
            ? <ActivityIndicator size="small" color={accentColor} />
            : hasCloud
              ? <Cloud size={16} color={accentColor} strokeWidth={2} />
              : <Download size={16} color={accentColor} strokeWidth={2} />}
        </TouchableOpacity>

        {/* Restaurer */}
        <TouchableOpacity style={styles.cardActionBtn} onPress={onRestore} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {isRestoring
            ? <ActivityIndicator size="small" color={accentColor} />
            : <RotateCcw size={16} color={accentColor} strokeWidth={2} />}
        </TouchableOpacity>

        {/* Supprimer */}
        <TouchableOpacity style={styles.cardActionBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────

export default function BackupHistoryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [backups, setBackups]           = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [restoringUri, setRestoringUri] = useState<string | null>(null);
  const [isCreating, setIsCreating]     = useState(false);
  const [syncingUri, setSyncingUri]     = useState<string | null>(null);

  // Preview sheet
  const [previewBackup, setPreviewBackup] = useState<BackupFile | null>(null);
  const [sheetVisible, setSheetVisible]   = useState(false);

  // Cloud
  const [cloudFolder, setCloudFolder]   = useState<CloudFolder | null>(null);
  const [cloudBackups, setCloudBackups] = useState<CloudBackupFile[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [restoringCloud, setRestoringCloud] = useState<string | null>(null);

  // Largeur des cartes
  const cardWidth = (Dimensions.get('window').width - 16 * 2 - CARD_GAP) / 2;

  // ── Chargement ───────────────────────────────────────────

  const loadBackups = useCallback(async () => {
    try {
      const dir = FileSystem.documentDirectory!;
      const files = await FileSystem.readDirectoryAsync(dir);
      const backupFiles = files.filter(f => f.startsWith('yoroi_backup_') && f.endsWith('.json'));
      const detailed: BackupFile[] = [];

      for (const name of backupFiles) {
        const uri = `${dir}${name}`;
        try {
          const info = await FileSystem.getInfoAsync(uri, { size: true }) as any;
          if (!info.exists) continue;
          let version = '?', userName = '?';
          let weightsCount = 0, trainingsCount = 0, photosCount = 0;
          let sleepCount = 0, hydrationCount = 0, injuriesCount = 0;
          let competitionsCount = 0, clubsCount = 0;
          try {
            const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
            const parsed = JSON.parse(raw);
            version          = parsed.version || '?';
            userName         = parsed.profile?.name || '?';
            weightsCount     = Array.isArray(parsed.weights)      ? parsed.weights.length      : 0;
            trainingsCount   = Array.isArray(parsed.trainings)    ? parsed.trainings.length    : 0;
            photosCount      = Array.isArray(parsed.photos)       ? parsed.photos.length       : 0;
            sleepCount       = Array.isArray(parsed.sleep)        ? parsed.sleep.length        : 0;
            hydrationCount   = Array.isArray(parsed.hydration)    ? parsed.hydration.length    : 0;
            injuriesCount    = Array.isArray(parsed.injuries)     ? parsed.injuries.length     : 0;
            competitionsCount= Array.isArray(parsed.competitions) ? parsed.competitions.length : 0;
            clubsCount       = Array.isArray(parsed.clubs)        ? parsed.clubs.length        : 0;
          } catch { }

          detailed.push({
            name, uri,
            size: info.size || 0,
            modifiedAt: dateFromFileName(name) || (info.modificationTime ? info.modificationTime * 1000 : Date.now()),
            version, userName,
            weightsCount, trainingsCount, photosCount, sleepCount,
            hydrationCount, injuriesCount, competitionsCount, clubsCount,
          });
        } catch { }
      }
      detailed.sort((a, b) => b.modifiedAt - a.modifiedAt);
      setBackups(detailed);
    } catch (error) {
      logger.error('[BackupHistory] Erreur chargement:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadCloudData = useCallback(async () => {
    const folder = await getSavedCloudFolder().catch(() => null);
    setCloudFolder(folder);
    if (folder) {
      const files = await listCloudBackups().catch(() => []);
      setCloudBackups(files);
    } else {
      setCloudBackups([]);
    }
  }, []);

  useEffect(() => { loadBackups(); loadCloudData(); }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBackups();
    loadCloudData();
  }, [loadBackups, loadCloudData]);

  // ── Actions locales ───────────────────────────────────────

  const handleNewBackup = useCallback(async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsCreating(true);
    try {
      await exportDataToJSON();
      await loadBackups();
      if (cloudFolder) await loadCloudData();
    } finally {
      setIsCreating(false);
    }
  }, [loadBackups, loadCloudData, cloudFolder]);

  const openPreview = useCallback((backup: BackupFile) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setPreviewBackup(backup);
    setSheetVisible(true);
  }, []);

  const closePreview = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setPreviewBackup(null), 300);
  }, []);

  const handleDownload = useCallback(async (backup: BackupFile) => {
    try {
      impactAsync(ImpactFeedbackStyle.Light);
      await shareAsync(backup.uri, { mimeType: 'application/json', dialogTitle: 'Télécharger / partager ce backup', UTI: 'public.json' });
    } catch (error) {
      logger.error('[BackupHistory] Erreur téléchargement:', error);
    }
  }, []);

  const handleCopyToCloud = useCallback(async (backup: BackupFile) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSyncingUri(backup.uri);
    try {
      const cleanPath = backup.uri.startsWith('file://') ? decodeURIComponent(backup.uri.slice(7)) : backup.uri;
      const success = await copyToCloudFolder(cleanPath);
      if (success) {
        notificationAsync(NotificationFeedbackType.Success);
        await loadCloudData();
      }
    } catch (error) {
      logger.error('[BackupHistory] Erreur copie cloud:', error);
    } finally {
      setSyncingUri(null);
    }
  }, [loadCloudData]);

  const handleRestore = useCallback((backup: BackupFile) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    showPopup(
      'Restaurer cette sauvegarde ?',
      `${formatDateShort(backup.modifiedAt)} · ${backup.weightsCount} pesées · ${backup.trainingsCount} séances\n\nCela va ajouter ces données à tes données actuelles.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'primary',
          onPress: async () => {
            setRestoringUri(backup.uri);
            try {
              const content = await FileSystem.readAsStringAsync(backup.uri, { encoding: FileSystem.EncodingType.UTF8 });
              const raw = JSON.parse(content);
              const { migrateBackup, validateBackup } = await import('@/lib/backupMigrationService');
              const validation = validateBackup(raw);
              if (!validation.valid) {
                showPopup('Fichier invalide', validation.errors.join('\n'), [{ text: 'OK', style: 'primary' }]);
                return;
              }
              const migrated = migrateBackup(raw);
              const { importDataFromBackupObject } = await import('@/lib/exportService');
              const success = await importDataFromBackupObject(migrated);
              if (success) {
                notificationAsync(NotificationFeedbackType.Success);
                showPopup('✅ Restauration réussie', 'Tes données ont été restaurées avec succès.', [{ text: 'OK', style: 'primary', onPress: () => router.replace('/(tabs)') }]);
              }
            } catch (error) {
              logger.error('[BackupHistory] Erreur restauration:', error);
              showPopup('Erreur', 'Impossible de restaurer cette sauvegarde.', [{ text: 'OK', style: 'primary' }]);
            } finally {
              setRestoringUri(null);
            }
          },
        },
      ]
    );
  }, [showPopup]);

  const handleDelete = useCallback((backup: BackupFile) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    showPopup(
      'Supprimer ce backup ?',
      `${formatDateShort(backup.modifiedAt)} · ${formatSize(backup.size)}\n\nAction irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'primary',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(backup.uri, { idempotent: true });
              notificationAsync(NotificationFeedbackType.Success);
              setBackups(prev => prev.filter(b => b.uri !== backup.uri));
            } catch {
              showPopup('Erreur', 'Impossible de supprimer ce fichier.', [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
      ]
    );
  }, [showPopup]);

  // ── Actions cloud ─────────────────────────────────────────

  const handleConnectCloud = useCallback(async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsConnecting(true);
    try {
      const folder = await pickCloudFolder();
      if (folder) {
        setCloudFolder(folder);
        const files = await listCloudBackups().catch(() => []);
        setCloudBackups(files);
        notificationAsync(NotificationFeedbackType.Success);
      }
    } catch (error) {
      showPopup('Erreur', 'Impossible de connecter le dossier.', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsConnecting(false);
    }
  }, [showPopup]);

  const handleDisconnectCloud = useCallback(() => {
    showPopup(
      'Déconnecter le dossier ?',
      `"${cloudFolder?.displayName}" sera déconnecté. Tes backups locaux restent intacts.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'primary', onPress: async () => {
          await disconnectCloudFolder();
          setCloudFolder(null);
          setCloudBackups([]);
        }},
      ]
    );
  }, [showPopup, cloudFolder]);

  const handleRestoreFromCloud = useCallback((file: CloudBackupFile) => {
    showPopup(
      'Restaurer depuis le cloud ?',
      `${formatDateShort(file.modifiedAt)} · ${formatSize(file.size)}\n\nCela va ajouter ces données à tes données actuelles.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'primary',
          onPress: async () => {
            setRestoringCloud(file.name);
            try {
              const content = await readCloudBackupFile(file.name);
              if (!content) { showPopup('Erreur', 'Impossible de lire le fichier cloud.', [{ text: 'OK', style: 'primary' }]); return; }
              const raw = JSON.parse(content);
              const { migrateBackup, validateBackup } = await import('@/lib/backupMigrationService');
              const validation = validateBackup(raw);
              if (!validation.valid) { showPopup('Fichier invalide', validation.errors.join('\n'), [{ text: 'OK', style: 'primary' }]); return; }
              const migrated = migrateBackup(raw);
              const { importDataFromBackupObject } = await import('@/lib/exportService');
              const success = await importDataFromBackupObject(migrated);
              if (success) {
                notificationAsync(NotificationFeedbackType.Success);
                showPopup('✅ Restauration réussie', 'Tes données ont été restaurées.', [{ text: 'OK', style: 'primary', onPress: () => router.replace('/(tabs)') }]);
              }
            } catch (error) {
              showPopup('Erreur', 'Impossible de restaurer ce backup cloud.', [{ text: 'OK', style: 'primary' }]);
            } finally {
              setRestoringCloud(null);
            }
          },
        },
      ]
    );
  }, [showPopup]);

  // ─────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────

  const bgColor = isDark ? colors.background : '#F1F5F9';
  const cardBg  = isDark ? colors.card : '#FFFFFF';
  const muted   = colors.textMuted;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>

      {/* ── HEADER GRADIENT ── */}
      <LinearGradient
        colors={['#0EA5E9', '#14B8A6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={26} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Bibliothèque</Text>
            <Text style={styles.headerSub}>
              {isLoading ? '…' : `${backups.length} sauvegarde${backups.length > 1 ? 's' : ''} locale${backups.length > 1 ? 's' : ''}`}
            </Text>
          </View>
          <View style={styles.headerIconBox}>
            <Shield size={20} color="#FFF" strokeWidth={2} />
          </View>
        </View>

        <TouchableOpacity style={styles.newBackupBtn} onPress={handleNewBackup} disabled={isCreating} activeOpacity={0.85}>
          {isCreating ? <ActivityIndicator size="small" color="#0EA5E9" /> : <Plus size={18} color="#0EA5E9" strokeWidth={2.5} />}
          <Text style={styles.newBackupText}>{isCreating ? 'Création…' : 'Nouvelle sauvegarde'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#14B8A6" colors={['#14B8A6']} />}
      >

        {/* ── STATUT RASSURANT EN HAUT ── */}
        <BackupStatusHeader />

        {/* ── Choix du type de backup (complet / léger) ── */}
        <BackupTypeSelector />

        {/* ── Migration cross-platform (iPhone ↔ Android) ── */}
        <CrossPlatformMigrationButton />

        {/* ── Test d'un backup sans modifier les données ── */}
        <TestRestoreButton />

        {/* ── FAQ in-app ── */}
        <BackupFaqAccordion />

        {/* ── Revenir à l'état précédent (si safety backups dispos) ── */}
        <SafetyBackupRestoreButton />

        {/* ── Toggle chiffrement AES-256 ── */}
        <BackupEncryptionToggle />

        {/* ── SECTION CLOUD ── */}
        {Platform.OS === 'ios' && (
          <View style={[styles.cloudCard, { backgroundColor: cardBg }]}>
            {cloudFolder ? (
              <>
                <View style={styles.cloudConnectedRow}>
                  <View style={[styles.cloudIconBox, { backgroundColor: '#0EA5E915' }]}>
                    <FolderOpen size={20} color="#0EA5E9" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cloudFolderName, { color: colors.textPrimary }]} numberOfLines={1}>{cloudFolder.displayName}</Text>
                    <Text style={[styles.cloudFolderSub, { color: muted }]}>
                      {cloudBackups.length === 0 ? 'Aucun backup cloud' : `${cloudBackups.length} backup${cloudBackups.length > 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  <TouchableOpacity style={[styles.disconnectBtn, { borderColor: isDark ? '#FFFFFF20' : '#E2E8F0' }]} onPress={handleDisconnectCloud}>
                    <Link2Off size={14} color={muted} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                {cloudBackups.length > 0 && (
                  <View style={[styles.cloudList, { borderTopColor: isDark ? '#FFFFFF10' : '#F1F5F9' }]}>
                    {cloudBackups.map((file, i) => (
                      <View key={file.name} style={[styles.cloudItem, i < cloudBackups.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#FFFFFF08' : '#F1F5F9' }]}>
                        <Cloud size={13} color={i === 0 ? '#0EA5E9' : muted} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cloudItemDate, { color: colors.textPrimary }]}>{formatDateShort(file.modifiedAt)} · {formatTime(file.modifiedAt)}</Text>
                          <Text style={[styles.cloudItemSize, { color: muted }]}>{formatSize(file.size)}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.cloudRestoreBtn, { backgroundColor: isDark ? '#0EA5E920' : '#EFF6FF' }]}
                          onPress={() => handleRestoreFromCloud(file)}
                          disabled={restoringCloud === file.name}
                        >
                          {restoringCloud === file.name
                            ? <ActivityIndicator size="small" color="#0EA5E9" />
                            : <RotateCcw size={13} color="#0EA5E9" strokeWidth={2} />}
                          <Text style={styles.cloudRestoreText}>Restaurer</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity style={styles.connectRow} onPress={handleConnectCloud} disabled={isConnecting} activeOpacity={0.85}>
                <View style={[styles.cloudIconBox, { backgroundColor: '#0EA5E915' }]}>
                  {isConnecting ? <ActivityIndicator size="small" color="#0EA5E9" /> : <Link size={20} color="#0EA5E9" strokeWidth={2} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cloudFolderName, { color: colors.textPrimary }]}>Connecter un dossier cloud</Text>
                  <Text style={[styles.cloudFolderSub, { color: muted }]}>iCloud Drive, Google Drive, Dropbox…</Text>
                </View>
                <ChevronLeft size={16} color={muted} strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── GRILLE ── */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text style={[styles.loadingText, { color: muted }]}>Chargement…</Text>
          </View>
        ) : backups.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient colors={['#0EA5E930', '#14B8A620']} style={styles.emptyIcon}>
              <FileText size={44} color="#0EA5E9" strokeWidth={1.5} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Bibliothèque vide</Text>
            <Text style={[styles.emptyBody, { color: muted }]}>Appuie sur "Nouvelle sauvegarde" pour créer ton premier backup.</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: muted }]}>SAUVEGARDES LOCALES</Text>
            <View style={styles.grid}>
              {backups.map((backup, index) => (
                <BackupCard
                  key={backup.uri}
                  backup={backup}
                  isLatest={index === 0}
                  isRestoring={restoringUri === backup.uri}
                  isSyncing={syncingUri === backup.uri}
                  hasCloud={!!cloudFolder}
                  isDark={isDark}
                  colors={colors}
                  cardWidth={cardWidth}
                  onPreview={() => openPreview(backup)}
                  onDownload={() => handleDownload(backup)}
                  onRestore={() => handleRestore(backup)}
                  onCopyCloud={() => handleCopyToCloud(backup)}
                  onDelete={() => handleDelete(backup)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── FICHE APERÇU ── */}
      <PreviewSheet
        backup={previewBackup}
        visible={sheetVisible}
        onClose={closePreview}
        onRestore={handleRestore}
        onDownload={handleDownload}
        onDelete={handleDelete}
        isDark={isDark}
        colors={colors}
      />

      <PopupComponent />
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerGradient: { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  newBackupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14 },
  newBackupText: { fontSize: 15, fontWeight: '700', color: '#0EA5E9' },

  // Scroll
  content: { padding: 16, paddingTop: 14 },

  // Cloud card
  cloudCard: {
    borderRadius: 18, marginBottom: 18, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10 }, android: { elevation: 3 } }),
  },
  connectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cloudConnectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cloudIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cloudFolderName: { fontSize: 15, fontWeight: '700' },
  cloudFolderSub: { fontSize: 12, marginTop: 2 },
  disconnectBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cloudList: { borderTopWidth: 1, paddingHorizontal: 14 },
  cloudItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  cloudItemDate: { fontSize: 13, fontWeight: '600' },
  cloudItemSize: { fontSize: 11, marginTop: 1 },
  cloudRestoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  cloudRestoreText: { fontSize: 12, fontWeight: '600', color: '#0EA5E9' },

  // Etat vide
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  emptyIcon: { width: 90, height: 90, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 270 },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12, marginLeft: 2 },

  // Grille
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },

  // Carte
  card: {
    borderRadius: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardBanner: { height: 80, alignItems: 'center', justifyContent: 'center' },
  cardRecentBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  cardRecentText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  cardBody: { padding: 12 },
  cardDate: { fontSize: 15, fontWeight: '800' },
  cardTime: { fontSize: 12, marginTop: 1 },
  cardMeta: { fontSize: 11, marginTop: 4 },
  cardMiniStats: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, gap: 3 },
  cardMiniStat: { fontSize: 11 },

  // Actions carte
  cardActions: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'space-around' },
  cardActionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Bottom sheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20 }, android: { elevation: 20 } }),
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24 },
  sheetFileIcon: { width: 60, height: 60 },
  sheetFileIconGradient: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  sheetSubtitle: { fontSize: 13, marginTop: 3 },
  sheetUser: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  sheetCloseBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  sheetStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  sheetStatCell: { width: '22%', flexGrow: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 6 },
  sheetStatIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sheetStatValue: { fontSize: 18, fontWeight: '800' },
  sheetStatLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  sheetActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sheetActionPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  sheetActionPrimaryText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  sheetActionSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  sheetActionSecondaryText: { fontSize: 15, fontWeight: '600' },
  sheetDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1 },
  sheetDeleteText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});
