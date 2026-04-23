// ============================================
// YOROI - REGLAGES (Settings Tab)
// Design: scrollable list with grouped sections
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  DeviceEventEmitter,
  Linking,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  UserRound,
  Hash,
  Image as ImageIcon,
  Palette,
  Sliders,
  Grip,
  Bell,
  Stethoscope,
  Download,
  Upload,
  FileUp,
  FileText,
  Archive,
  ShieldCheck,
  Lock,
  Trash2,
  LogOut,
  Info,
  Lightbulb,
  Camera,
  Star,
  Heart,
  ChevronRight,
  X,
  Search,
  MessageSquareQuote,
  Eye,
  LucideIcon,
  Table,
  CheckCircle,
  Smartphone,
  Wifi,
  BookOpen,
  Syringe,
  BarChart3,
  Database,
  Globe,
  Check,
  Share2,
  Sparkles,
  Mail,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Type } from 'lucide-react-native';
import { FontSizeLevel, FONT_SIZE_LABELS } from '@/lib/fontScaleManager';
import { useI18n, SUPPORTED_LANGUAGES } from '@/lib/I18nContext';
import { useCustomPopup } from '@/components/CustomPopup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { safeOpenURL } from '@/lib/security/validators';
import { exportDataToJSON, importDataFromJSON, exportEditableCSV, importEditableCSV, exportEmptyTemplate } from '@/lib/exportService';
import * as FileSystem from 'expo-file-system/legacy';
import { generateProgressPDF } from '@/lib/pdfExport';
import { resetAllData, resetDataOnly } from '@/lib/storage';
import { resetDatabase, deduplicateTrainings } from '@/lib/database';
import logger from '@/lib/security/logger';
import { verifyDevCode } from '@/lib/DevModeContext';
import { generateHenyDemoData, restoreRealData, isDemoDataActive } from '@/lib/demoDataService';

// ============================================
// SECTION DATA
// ============================================

interface SettingsItem {
  id: string;
  label: string;
  sublabel: string;
  Icon: LucideIcon;
  iconColor: string;
  route?: string;
  handler?: string;
  labelColor?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: 'settings.sections.profile',
    items: [
      { id: 'profile', label: 'settings.items.profile.label', sublabel: 'settings.items.profile.sublabel', Icon: UserRound, iconColor: '#3B82F6', route: '/profile' },
      { id: 'avatar', label: 'settings.items.avatar.label', sublabel: 'settings.items.avatar.sublabel', Icon: UserRound, iconColor: '#F97316', route: '/avatar-selection' },
      { id: 'frame', label: 'settings.items.frame.label', sublabel: 'settings.items.frame.sublabel', Icon: Hash, iconColor: '#8B5CF6', route: '/frame-selection' },
      { id: 'logos', label: 'settings.items.logos.label', sublabel: 'settings.items.logos.sublabel', Icon: ImageIcon, iconColor: '#8B5CF6', route: '/logo-selection' },
    ],
  },
  {
    title: 'settings.sections.appearance',
    items: [
      { id: 'themes', label: 'settings.items.themes.label', sublabel: 'settings.items.themes.sublabel', Icon: Palette, iconColor: '#8B5CF6', route: '/themes' },
      { id: 'units', label: 'settings.items.units.label', sublabel: 'settings.items.units.sublabel', Icon: Sliders, iconColor: '#8B5CF6', handler: 'units' },
    ],
  },
  {
    title: 'settings.sections.customization',
    items: [
      { id: 'navbar', label: 'settings.items.navbar.label', sublabel: 'settings.items.navbar.sublabel', Icon: Grip, iconColor: '#8B5CF6', route: '/customize-tabs' },
      { id: 'citations', label: 'settings.items.citations.label', sublabel: 'settings.items.citations.sublabel', Icon: MessageSquareQuote, iconColor: '#F59E0B', route: '/citations' },
    ],
  },
  {
    title: 'settings.sections.notifications',
    items: [
      { id: 'notifications', label: 'settings.items.notifications.label', sublabel: 'settings.items.notifications.sublabel', Icon: Bell, iconColor: '#F59E0B', route: '/notifications' },
      { id: 'health-data', label: 'settings.items.healthData.label', sublabel: 'settings.items.healthData.sublabel', Icon: Stethoscope, iconColor: '#EC4899', route: '/connected-devices' },
      { id: 'heart-zones', label: 'settings.items.heartZones.label', sublabel: 'settings.items.heartZones.sublabel', Icon: Heart, iconColor: '#EF4444', route: '/heart-zones-settings' },
    ],
  },
  {
    title: 'Sauvegarde & Données',
    items: [
      { id: 'companion', label: 'settings.items.companion.label', sublabel: 'settings.items.companion.sublabel', Icon: Table, iconColor: '#4F8EF7', route: '/companion' },
      { id: 'export', label: 'settings.items.export.label', sublabel: 'settings.items.export.sublabel', Icon: Download, iconColor: '#14B8A6', handler: 'export' },
      { id: 'import', label: 'settings.items.importData.label', sublabel: 'settings.items.importData.sublabel', Icon: Upload, iconColor: '#14B8A6', handler: 'import' },
      { id: 'backup-history', label: 'Mes sauvegardes', sublabel: 'Retrouver et restaurer vos backups locaux', Icon: Archive, iconColor: '#14B8A6', route: '/backup-history' },
      { id: 'sync-devices', label: 'Synchronisation locale', sublabel: 'iPhone ↔ iPad sans internet (Bluetooth + WiFi)', Icon: Wifi, iconColor: '#3B82F6', route: '/sync-devices' },
      { id: 'premium', label: 'Yoroi Premium', sublabel: 'Widget, insights, heatmap, partage HD…', Icon: Star, iconColor: '#A855F7', route: '/premium' },
      { id: 'deduplicate', label: 'Nettoyer les doublons', sublabel: 'Supprimer les séances en double (Apple Santé)', Icon: ShieldCheck, iconColor: '#F59E0B', handler: 'deduplicate' },
      { id: 'pdf', label: 'settings.items.pdf.label', sublabel: 'settings.items.pdf.sublabel', Icon: FileText, iconColor: '#6B7280', handler: 'pdf' },
      { id: 'privacy', label: 'settings.items.privacy.label', sublabel: 'settings.items.privacy.sublabel', Icon: ShieldCheck, iconColor: '#14B8A6', route: '/privacy-data' },
      { id: 'privacy-policy', label: 'settings.items.privacyPolicy.label', sublabel: 'settings.items.privacyPolicy.sublabel', Icon: Lock, iconColor: '#6B7280', handler: 'privacy-policy' },
    ],
  },
  {
    title: 'settings.sections.support',
    items: [
      { id: 'whats-new', label: 'Nouveautés de la version', sublabel: 'Découvre ce qui vient d\'être ajouté', Icon: Sparkles, iconColor: '#A855F7', handler: 'whats-new' },
      { id: 'share-app', label: 'Partager Yoroi avec un ami', sublabel: 'Lien App Store', Icon: Share2, iconColor: '#3B82F6', handler: 'share-app' },
      { id: 'rate', label: 'settings.items.rate.label', sublabel: 'settings.items.rate.sublabel', Icon: Star, iconColor: '#F59E0B', handler: 'rate' },
      { id: 'ideas', label: 'settings.items.ideas.label', sublabel: 'settings.items.ideas.sublabel', Icon: Lightbulb, iconColor: '#14B8A6', handler: 'ideas' },
      { id: 'contact-dev', label: 'Contacter le développeur', sublabel: 'Envoie-moi un email', Icon: Mail, iconColor: '#EC4899', handler: 'contact-dev' },
      { id: 'about', label: 'settings.items.about.label', sublabel: 'settings.items.about.sublabel', Icon: Info, iconColor: '#8B5CF6', handler: 'about' },
    ],
  },
  // Zone sensible · séparée visuellement pour éviter les clics par erreur
  {
    title: '⚠️  Zone sensible',
    items: [
      { id: 'clear-cache', label: 'settings.items.clearCache.label', sublabel: 'settings.items.clearCache.sublabel', Icon: Database, iconColor: '#F59E0B', handler: 'clear-cache' },
      { id: 'clean-uninstall', label: 'settings.items.cleanUninstall.label', sublabel: 'settings.items.cleanUninstall.sublabel', Icon: LogOut, iconColor: '#EF4444', handler: 'clean-uninstall', labelColor: '#EF4444' },
      { id: 'reset', label: 'settings.items.reset.label', sublabel: 'settings.items.reset.sublabel', Icon: Trash2, iconColor: '#EF4444', handler: 'reset', labelColor: '#EF4444' },
    ],
  },
];

// Creator mode items as standard rows
// Note : les toggles "Chirurgien" et "Stats Mock" sont retires car jamais consommes dans l'app.
const CREATOR_ITEMS: SettingsItem[] = [
  { id: 'creator-screenshot', label: 'Mode Screenshot', sublabel: 'Affiche les valeurs max pour captures App Store', Icon: Smartphone, iconColor: '#3B82F6', handler: 'toggle-screenshot' },
  { id: 'creator-journal', label: 'Mode Carnet', sublabel: 'Remplace le carnet par des donnees demo', Icon: BookOpen, iconColor: '#F97316', handler: 'toggle-journal' },
  { id: 'creator-hery', label: 'Profil Demo Heny', sublabel: 'Injecte un profil BJJ realiste (187 seances, 25 techniques…)', Icon: Database, iconColor: '#10B981', handler: 'demo-hery' },
  { id: 'creator-onboarding', label: 'Voir Onboarding', sublabel: 'Previsualiser l\'ecran d\'accueil', Icon: Eye, iconColor: '#06B6D4', handler: 'preview-onboarding' },
  { id: 'creator-reset', label: 'Tout Desactiver', sublabel: 'Nettoyer les donnees de demo', Icon: Trash2, iconColor: '#EF4444', handler: 'reset-creator', labelColor: '#EF4444' },
  { id: 'creator-purge', label: 'PURGE FORCEE', sublabel: 'Efface poids + seances (SQLite direct)', Icon: Trash2, iconColor: '#FF0000', handler: 'purge-data', labelColor: '#FF0000' },
];

// ============================================
// COMPONENT
// ============================================

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, screenBackground, screenText, screenTextMuted, fontSizeLevel, setFontSizeLevel, themeName } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { language, setLanguage, t } = useI18n();

  // Search
  const [searchText, setSearchText] = useState('');

  // Profil (pour la hero card en tête de page)
  const [profileName, setProfileName] = useState<string>('');
  const [profileBelt, setProfileBelt] = useState<string>('');
  const [profileStreak, setProfileStreak] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  // Stats hero + infos dynamiques sous-titres
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [weightLost, setWeightLost] = useState<number | null>(null);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [lastBackupAgo, setLastBackupAgo] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<string | null>(null);
  // Modal "Nouveautés 2.3.3"
  const [whatsNewVisible, setWhatsNewVisible] = useState<boolean>(false);

  // Reset modal
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Clean uninstall modal
  const [cleanUninstallVisible, setCleanUninstallVisible] = useState(false);
  const [cleanStep, setCleanStep] = useState(0); // 0=intro, 1=data cleared, 2=done

  // Language modal

  // Units modal
  const [unitsModalVisible, setUnitsModalVisible] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');

  // Version tap & creator mode
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showSecretCodeModal, setShowSecretCodeModal] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [screenshotMenuUnlocked, setScreenshotMenuUnlocked] = useState(false);

  // Creator mode states
  const [isGlobalScreenshotMode, setIsGlobalScreenshotMode] = useState(false);
  const [isJournalScreenshotMode, setIsJournalScreenshotMode] = useState(false);
  const [isSurgeonMode, setIsSurgeonMode] = useState(false);
  const [isMockStatsMode, setIsMockStatsMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);

  useEffect(() => {
    loadUnits();
    loadProfileHeader();
    loadLastBackupDate();
    loadStorageInfo();
    // Check if creator mode is unlocked
    AsyncStorage.getItem('@yoroi_screenshot_menu_unlocked').then(val => {
      if (val === 'true') {
        setScreenshotMenuUnlocked(true);
        loadCreatorSettings();
      }
    });
    // Check if demo data is active
    isDemoDataActive().then(setIsDemoActive);
    // Listener : recharge la hero card quand le profil change
    const sub = DeviceEventEmitter.addListener('YOROI_PROFILE_CHANGED', loadProfileHeader);
    return () => sub.remove();
  }, []);

  const loadProfileHeader = async () => {
    try {
      const [settingsRaw, belt, streakRaw, premiumRaw, bestStreakRaw, prRaw] = await Promise.all([
        AsyncStorage.getItem('@yoroi_user_settings'),
        AsyncStorage.getItem('@yoroi_belt'),
        AsyncStorage.getItem('@yoroi_current_streak'),
        AsyncStorage.getItem('@yoroi_is_premium'),
        AsyncStorage.getItem('@yoroi_best_streak'),
        AsyncStorage.getItem('@yoroi_personal_records'),
      ]);
      if (settingsRaw) {
        try {
          const s = JSON.parse(settingsRaw);
          setProfileName(s.username || '');
        } catch {}
      }
      if (belt) setProfileBelt(belt);
      if (streakRaw) setProfileStreak(parseInt(streakRaw, 10) || 0);
      if (bestStreakRaw) setBestStreak(parseInt(bestStreakRaw, 10) || 0);
      if (prRaw) {
        try {
          const pr = JSON.parse(prRaw);
          if (typeof pr.totalWorkouts === 'number') setTotalSessions(pr.totalWorkouts);
          if (typeof pr.totalWeightLoss === 'number') setWeightLost(pr.totalWeightLoss);
        } catch {}
      }
      setIsPremium(premiumRaw === 'true');
    } catch {}
  };

  const loadLastBackupDate = async () => {
    try {
      const dir = FileSystem.documentDirectory;
      if (!dir) return;
      const files = await FileSystem.readDirectoryAsync(dir);
      const backupFiles = files.filter(f => f.startsWith('yoroi_backup_') && f.endsWith('.json'));
      if (backupFiles.length === 0) {
        setLastBackupAgo('jamais');
        return;
      }
      let mostRecent = 0;
      for (const name of backupFiles) {
        try {
          const info = await FileSystem.getInfoAsync(`${dir}${name}`) as any;
          if (info.modificationTime && info.modificationTime > mostRecent) {
            mostRecent = info.modificationTime;
          }
        } catch {}
      }
      if (mostRecent === 0) return;
      const daysAgo = Math.floor((Date.now() - mostRecent * 1000) / 86400000);
      if (daysAgo === 0) setLastBackupAgo('aujourd\'hui');
      else if (daysAgo === 1) setLastBackupAgo('hier');
      else setLastBackupAgo(`il y a ${daysAgo} jours`);
    } catch {}
  };

  const loadStorageInfo = async () => {
    try {
      const dir = FileSystem.documentDirectory;
      if (!dir) return;
      const files = await FileSystem.readDirectoryAsync(dir);
      let total = 0;
      for (const f of files) {
        try {
          const info = await FileSystem.getInfoAsync(`${dir}${f}`) as any;
          if (info.exists && info.size) total += info.size;
        } catch {}
      }
      const mb = total / (1024 * 1024);
      setStorageInfo(mb < 1 ? `${Math.round(total / 1024)} Ko` : `${mb.toFixed(1)} Mo`);
    } catch {}
  };

  const loadCreatorSettings = async () => {
    try {
      const [globalMode, journalMode, surgeonMode, mockStats] = await Promise.all([
        AsyncStorage.getItem('@yoroi_screenshot_mode'),
        AsyncStorage.getItem('@yoroi_journal_screenshot_mode'),
        AsyncStorage.getItem('@yoroi_surgeon_mode'),
        AsyncStorage.getItem('@yoroi_mock_stats_mode'),
      ]);
      setIsGlobalScreenshotMode(globalMode === 'true');
      setIsJournalScreenshotMode(journalMode === 'true');
      setIsSurgeonMode(surgeonMode === 'true');
      setIsMockStatsMode(mockStats === 'true');
    } catch (e) {
      logger.error('Error loading creator settings', e);
    }
  };

  const toggleGlobalScreenshotMode = async (value: boolean) => {
    setIsGlobalScreenshotMode(value);
    await AsyncStorage.setItem('@yoroi_screenshot_mode', String(value));
    showPopup(value ? 'Mode Screenshot Active' : 'Mode Screenshot Desactive', value ? 'Activé.' : 'Desactivé.', [{ text: 'OK', style: 'primary' }]);
  };

  const toggleJournalScreenshotMode = async (value: boolean) => {
    setIsJournalScreenshotMode(value);
    await AsyncStorage.setItem('@yoroi_journal_screenshot_mode', String(value));
  };

  const toggleSurgeonMode = async (value: boolean) => {
    setIsSurgeonMode(value);
    await AsyncStorage.setItem('@yoroi_surgeon_mode', String(value));
  };

  const toggleMockStatsMode = async (value: boolean) => {
    setIsMockStatsMode(value);
    await AsyncStorage.setItem('@yoroi_mock_stats_mode', String(value));
  };

  const resetAllCreatorModes = async () => {
    setIsGenerating(true);
    try {
      // Restore real user data if demo was active
      if (isDemoActive) {
        await restoreRealData();
        setIsDemoActive(false);
        DeviceEventEmitter.emit('YOROI_DEMO_CHANGED');
      }
      await AsyncStorage.multiRemove([
        '@yoroi_screenshot_mode',
        '@yoroi_journal_screenshot_mode',
        '@yoroi_surgeon_mode',
        '@yoroi_mock_stats_mode',
      ]);
      setIsGlobalScreenshotMode(false);
      setIsJournalScreenshotMode(false);
      setIsSurgeonMode(false);
      setIsMockStatsMode(false);
      setIsGenerating(false);
      showPopup('Reset', isDemoActive ? 'Modes desactives. Tes vraies données ont ete restaurees.' : 'Tous les modes sont desactives.', [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      setIsGenerating(false);
      logger.error('[Creator] Reset error:', error);
      showPopup('Erreur', 'Impossible de restaurer les données.', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleForceDeleteData = () => {
    showPopup(
      'PURGE FORCEE',
      'Va supprimer TOUTES les séances et tous les poids directement dans la base de données. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'SUPPRIMER',
          style: 'primary',
          onPress: async () => {
            setIsGenerating(true);
            try {
              await resetDatabase();
              // Aussi vider les clés AsyncStorage liées aux données demo ET Apple Health
              await AsyncStorage.multiRemove([
                '@yoroi_demo_data_active',
                '@yoroi_demo_backup_sqlite',
                '@yoroi_demo_backup_async',
                '@yoroi_screenshot_mode',
                '@yoroi_journal_screenshot_mode',
                '@yoroi_surgeon_mode',
                '@yoroi_mock_stats_mode',
                '@yoroi_imported_workouts',           // fingerprints Apple Health
                '@yoroi_healthkit_asked',              // flag premier lancement HealthKit
                '@yoroi_competitions_auto_imported',  // compétitions auto-importées
                '@yoroi_import_version',              // version import (doit être réinitialisée pour forcer le re-import)
                '@yoroi_full_history_imported',       // flag import historique complet
              ]);
              setIsDemoActive(false);
              setIsGlobalScreenshotMode(false);
              setIsJournalScreenshotMode(false);
              setIsSurgeonMode(false);
              setIsMockStatsMode(false);
              DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
              setIsGenerating(false);
              showPopup(
                'Purge terminee',
                'Toutes les séances et poids ont été supprimés. Ferme et rouvre l\'app pour confirmer.',
                [{ text: 'OK', style: 'primary' }]
              );
            } catch (error) {
              setIsGenerating(false);
              logger.error('[Creator] Purge error:', error);
              showPopup('Erreur', String(error), [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
      ]
    );
  };

  const loadUnits = async () => {
    try {
      const settingsStr = await AsyncStorage.getItem('@yoroi_settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.weight_unit) setWeightUnit(settings.weight_unit);
        if (settings.measurement_unit) setMeasurementUnit(settings.measurement_unit);
      }
    } catch (e) {
      // ignore
    }
  };

  const saveUnits = async (key: string, value: string) => {
    try {
      const settingsStr = await AsyncStorage.getItem('@yoroi_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      settings[key] = value;
      await AsyncStorage.setItem('@yoroi_settings', JSON.stringify(settings));
    } catch (e) {
      logger.error('[Settings] Error saving units:', e);
    }
  };


  // Creator items with dynamic sublabels
  const creatorItems = useMemo((): SettingsItem[] => {
    return CREATOR_ITEMS.map(item => {
      switch (item.id) {
        case 'creator-screenshot':
          return { ...item, sublabel: isGlobalScreenshotMode ? t('settings.creatorMode.active') : t('settings.creatorMode.inactive') };
        case 'creator-journal':
          return { ...item, sublabel: isJournalScreenshotMode ? t('settings.creatorMode.active') : t('settings.creatorMode.inactive') };
        case 'creator-surgeon':
          return { ...item, sublabel: isSurgeonMode ? t('settings.creatorMode.active') : t('settings.creatorMode.inactive') };
        case 'creator-mock':
          return { ...item, sublabel: isMockStatsMode ? t('settings.creatorMode.active') : t('settings.creatorMode.inactive') };
        case 'creator-hery':
          return { ...item, sublabel: isDemoActive ? t('settings.creatorMode.demoActive') : t('settings.creatorMode.injectData') };
        case 'creator-reset':
          return { ...item, sublabel: isDemoActive ? t('settings.creatorMode.restoreData') : t('settings.creatorMode.clearDemo') };
        default:
          return item;
      }
    });
  }, [isGlobalScreenshotMode, isJournalScreenshotMode, isSurgeonMode, isMockStatsMode, isDemoActive, t]);

  // Filtered sections based on search
  const filteredSections = useMemo((): SettingsSection[] => {
    const query = searchText.trim().toLowerCase();
    if (!query) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          t(item.label).toLowerCase().includes(query) ||
          t(item.sublabel).toLowerCase().includes(query)
      ),
    })).filter(section => section.items.length > 0);
  }, [searchText, t]);

  // Filtered creator items based on search
  const filteredCreatorItems = useMemo((): SettingsItem[] => {
    const query = searchText.trim().toLowerCase();
    if (!query) return creatorItems;
    return creatorItems.filter(
      item =>
        item.label.toLowerCase().includes(query) ||
        item.sublabel.toLowerCase().includes(query)
    );
  }, [searchText, creatorItems]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleExport = () => {
    showPopup(
      t('settings.exportPopup.title'),
      t('settings.exportPopup.message'),
      [
        { text: t('settings.exportPopup.cancel'), style: 'cancel' },
        { text: t('settings.exportPopup.fullBackup'), style: 'primary', onPress: () => exportDataToJSON() },
        { text: t('settings.exportPopup.editableCSV'), style: 'default', onPress: () => handleExportEditable() },
      ]
    );
  };

  const handleExportEditable = () => {
    showPopup(
      t('settings.exportPopup.editableTitle'),
      t('settings.exportPopup.editableMsg'),
      [
        { text: t('settings.exportPopup.cancel'), style: 'cancel' },
        { text: t('settings.exportPopup.myData'), style: 'primary', onPress: () => exportEditableCSV() },
        { text: t('settings.exportPopup.emptyTemplate'), style: 'default', onPress: () => exportEmptyTemplate() },
      ]
    );
  };

  const handleImport = () => {
    // Un seul moyen de restaurer : le backup JSON.
    // La migration automatique gère toutes les versions (v1.0, v2.0, v5.0, etc.)
    showPopup(
      t('settings.importPopup.title'),
      t('settings.importPopup.message'),
      [
        { text: t('settings.importPopup.cancel'), style: 'cancel' },
        {
          text: t('settings.importPopup.backupJSON'),
          style: 'primary',
          onPress: async () => {
            try {
              const success = await importDataFromJSON();
              if (success) {
                notificationAsync(NotificationFeedbackType.Success);
                router.push('/(tabs)');
              }
            } catch (error) {
              logger.error('Import error:', error);
              notificationAsync(NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleExportPDF = () => {
    showPopup(
      t('settings.pdfPopup.title'),
      t('settings.pdfPopup.message'),
      [
        { text: t('settings.pdfPopup.cancel'), style: 'cancel' },
        {
          text: t('settings.pdfPopup.30days'),
          style: 'default',
          onPress: async () => {
            try { await generateProgressPDF('30j'); } catch (e) {
              showPopup(t('settings.error'), t('settings.pdfPopup.error'), [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
        {
          text: t('settings.pdfPopup.90days'),
          style: 'primary',
          onPress: async () => {
            try { await generateProgressPDF('90j'); } catch (e) {
              showPopup(t('settings.error'), t('settings.pdfPopup.error'), [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
      ]
    );
  };

  const openResetModal = () => {
    setResetConfirmText('');
    setResetModalVisible(true);
  };

  const handleResetAll = () => {
    showPopup(
      t('settings.resetModal.backupRecommended'),
      t('settings.resetModal.backupRecommendedMsg'),
      [
        { text: t('settings.resetModal.cancel'), style: 'cancel' },
        { text: t('settings.resetModal.backupFirst'), style: 'primary', onPress: async () => {
          await exportDataToJSON();
          openResetModal();
        }},
        { text: t('settings.resetModal.continueWithout'), style: 'default', onPress: () => openResetModal() },
      ]
    );
  };

  const normalizedText = resetConfirmText.trim().toUpperCase();
  const confirmWord = t('settings.resetModal.confirmWord').toUpperCase();
  const isResetConfirmed = normalizedText === confirmWord || normalizedText === 'SUPPRIMER' || normalizedText === 'SUPRIMER' || normalizedText === 'EFFACER' || normalizedText === 'OUI' || normalizedText === 'YES';

  const confirmReset = async () => {
    if (isResetConfirmed) {
      try {
        await resetDataOnly();
        setResetModalVisible(false);
        setResetConfirmText('');
        showPopup(
          t('settings.resetModal.deleted'),
          t('settings.resetModal.deletedMsg'),
          [{ text: 'OK', style: 'primary', onPress: () => router.replace('/onboarding') }],
          <CheckCircle size={32} color="#10B981" />
        );
      } catch (error) {
        logger.error('[Settings] Error resetting data:', error);
        showPopup(t('settings.error'), t('settings.resetModal.error'), [{ text: 'OK', style: 'primary' }]);
      }
    }
  };



  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 500) {
      const newCount = versionTapCount + 1;
      setVersionTapCount(newCount);
      if (newCount >= 2 && newCount < 5) impactAsync(ImpactFeedbackStyle.Light);
      if (newCount === 5) {
        notificationAsync(NotificationFeedbackType.Success);
        setVersionTapCount(0);
        setSecretCode('');
        setShowSecretCodeModal(true);
      }
    } else {
      setVersionTapCount(1);
    }
    setLastTapTime(now);
  };

  const handleSecretCodeSubmit = async () => {
    const isValid = await verifyDevCode(secretCode);
    if (isValid) {
      notificationAsync(NotificationFeedbackType.Success);
      await AsyncStorage.setItem('@yoroi_screenshot_menu_unlocked', 'true');
      setScreenshotMenuUnlocked(true);
      setShowSecretCodeModal(false);
      setSecretCode('');
      await loadCreatorSettings();
    } else {
      notificationAsync(NotificationFeedbackType.Error);
      showPopup(t('settings.secretCodeModal.incorrect'), t('settings.secretCodeModal.incorrectMsg'), [{ text: t('settings.secretCodeModal.retry'), style: 'primary' }]);
      setSecretCode('');
    }
  };

  const handleDemoHeny = () => {
    showPopup(
      'Profil Demo Heny',
      isDemoActive
        ? 'Le mode demo est deja actif. Regenerer les données ?'
        : 'Tes vraies données seront sauvegardees automatiquement et restaurees quand tu desactiveras le mode demo.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Generer',
          style: 'primary',
          onPress: async () => {
            setIsGenerating(true);
            try {
              const result = await generateHenyDemoData();
              setIsDemoActive(true);
              setIsGenerating(false);
              DeviceEventEmitter.emit('YOROI_DEMO_CHANGED');
              notificationAsync(NotificationFeedbackType.Success);
              showPopup(
                'Profil Heny cree',
                `${result.workouts} séances, ${result.weights} pesees, ${result.measurements} mensurations, ${result.sleepEntries} nuits, ${result.benchmarks} benchmarks, ${result.skills} techniques.\n\nTes vraies données sont sauvegardees. Utilise "Tout Desactiver" pour les restaurer.`,
                [{ text: 'OK', style: 'primary', onPress: () => router.replace('/(tabs)') }]
              );
            } catch (error) {
              setIsGenerating(false);
              logger.error('[DemoData] Error:', error);
              showPopup('Erreur', 'Impossible de generer les données demo.', [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = useCallback(() => {
    showPopup(
      t('settings.clearCachePopup.title'),
      t('settings.clearCachePopup.message'),
      [
        { text: t('settings.resetModal.cancel'), style: 'cancel' },
        {
          text: t('settings.clearCachePopup.confirm'),
          style: 'primary',
          onPress: async () => {
            setIsGenerating(true);
            try {
              // Vider le dossier cache expo-file-system
              const cacheDir = FileSystem.cacheDirectory;
              if (cacheDir) {
                const items = await FileSystem.readDirectoryAsync(cacheDir).catch(() => []);
                await Promise.all(
                  items.map((name) =>
                    FileSystem.deleteAsync(`${cacheDir}${name}`, { idempotent: true }).catch(() => {})
                  )
                );
              }

              // Supprimer les clés AsyncStorage non essentielles (preview, onboarding vues, etc.)
              const allKeys = await AsyncStorage.getAllKeys();
              const cacheKeys = allKeys.filter((k) =>
                k.startsWith('@yoroi_preview_') ||
                k.startsWith('@yoroi_cache_') ||
                k.startsWith('@yoroi_tmp_')
              );
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }

              notificationAsync(NotificationFeedbackType.Success);
              showPopup(t('settings.clearCachePopup.success'), t('settings.clearCachePopup.successMsg'), [{ text: 'OK', style: 'primary' }]);
            } catch (e) {
              logger.error('Clear cache error', e);
              showPopup(t('settings.error'), t('settings.clearCachePopup.error'), [{ text: 'OK', style: 'cancel' }]);
            } finally {
              setIsGenerating(false);
            }
          },
        },
      ]
    );
  }, [showPopup, t]);

  const handleCleanUninstall = useCallback(async () => {
    setIsGenerating(true);
    try {
      await resetDatabase();
      await resetAllData();
      const allKeys = await AsyncStorage.getAllKeys();
      const toRemove = allKeys.filter(k => k.startsWith('@yoroi'));
      if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        const items = await FileSystem.readDirectoryAsync(cacheDir).catch(() => []);
        await Promise.all(items.map(name =>
          FileSystem.deleteAsync(`${cacheDir}${name}`, { idempotent: true }).catch(() => {})
        ));
      }
      notificationAsync(NotificationFeedbackType.Success);
      setCleanStep(1);
    } catch (e) {
      logger.error('Clean uninstall error', e);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleDeduplicateTrainings = useCallback(() => {
    showPopup(
      '🔍 Nettoyer les doublons',
      'Cette action va analyser toutes tes séances et supprimer les entrées en double provenant d\'Apple Santé.\n\nLes séances que tu as créées manuellement ne seront pas touchées.\n\nRecommandé : faire une sauvegarde avant.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nettoyer',
          style: 'destructive',
          onPress: async () => {
            setIsGenerating(true);
            try {
              const deleted = await deduplicateTrainings();
              if (deleted === 0) {
                showPopup('✅ Aucun doublon', 'Tes séances sont déjà propres · aucun doublon trouvé.', [{ text: 'OK', style: 'primary' }]);
              } else {
                showPopup('✅ Nettoyage terminé', `${deleted} séance${deleted > 1 ? 's' : ''} en double supprimée${deleted > 1 ? 's' : ''}.\n\nTon journal d'entraînement est maintenant propre.`, [{ text: 'OK', style: 'primary' }]);
              }
            } catch (e) {
              logger.error('[Deduplicate] Erreur:', e);
              showPopup('Erreur', 'Impossible de nettoyer les doublons. Réessaie.', [{ text: 'OK', style: 'primary' }]);
            } finally {
              setIsGenerating(false);
            }
          },
        },
      ]
    );
  }, [showPopup]);

  const handleItemPress = useCallback((item: SettingsItem) => {
    impactAsync(ImpactFeedbackStyle.Light);

    // Handler-based items
    switch (item.handler) {
      case 'export': handleExport(); return;
      case 'import': handleImport(); return;
      case 'pdf': handleExportPDF(); return;
      case 'reset': handleResetAll(); return;
      case 'units': setUnitsModalVisible(true); return;
      case 'ideas': router.push({ pathname: '/ideas', params: { category: 'feature' } } as any); return;
      case 'about': router.push({ pathname: '/onboarding', params: { preview: 'true', page: '0' } } as any); return;
      case 'instagram': safeOpenURL('https://www.instagram.com/yoroiapp'); return;
      case 'rate':
        if (Platform.OS === 'android') {
          safeOpenURL('https://play.google.com/store/apps/details?id=com.houari24.yoroi');
        } else {
          safeOpenURL('https://apps.apple.com/fr/app/yoroi-suivi-poids-sport/id6757306612');
        }
        return;
      case 'privacy-policy': safeOpenURL('https://easy-woodwind-a70.notion.site/Yoroi-App-2d950188283880dbbd44d7e5abefecbb'); return;
      case 'whats-new': setWhatsNewVisible(true); return;
      case 'share-app':
        Share.share({
          message: 'J\'utilise YOROI pour tracker mes séances BJJ, mes stats et ma progression · 100% offline. Check ça : https://apps.apple.com/fr/app/yoroi-suivi-poids-sport/id6757306612',
        }).catch(() => {});
        return;
      case 'contact-dev':
        safeOpenURL('mailto:h_ouari@hotmail.com?subject=Feedback%20Yoroi%202.3.3&body=Salut%20Houari%2C%0A%0A');
        return;
      // Creator mode toggles
      case 'toggle-screenshot': toggleGlobalScreenshotMode(!isGlobalScreenshotMode); return;
      case 'toggle-journal': toggleJournalScreenshotMode(!isJournalScreenshotMode); return;
      case 'toggle-surgeon': toggleSurgeonMode(!isSurgeonMode); return;
      case 'toggle-mock': toggleMockStatsMode(!isMockStatsMode); return;
      case 'demo-hery': handleDemoHeny(); return;
      case 'preview-onboarding': router.push({ pathname: '/onboarding', params: { preview: 'true' } } as any); return;
      case 'reset-creator': resetAllCreatorModes(); return;
      case 'purge-data': handleForceDeleteData(); return;
      case 'clear-cache': handleClearCache(); return;
      case 'clean-uninstall': setCleanStep(0); setCleanUninstallVisible(true); return;
      case 'deduplicate': handleDeduplicateTrainings(); return;
    }

    // Route-based items
    if (item.route) {
      router.push(item.route as any);
    }
  }, [isGlobalScreenshotMode, isJournalScreenshotMode, isSurgeonMode, isMockStatsMode]);

  // ============================================
  // RENDER
  // ============================================

  // Sous-titres dynamiques : montrer la valeur actuelle plutôt qu'une desc générique
  const getDynamicSublabel = (item: SettingsItem, fallback: string): string => {
    switch (item.id) {
      case 'themes': {
        // themeName = "fizz_dark" → "Fizz · Sombre"
        const parts = themeName.split('_');
        const colorName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const mode = parts[1] === 'dark' ? 'Sombre' : 'Clair';
        return `${colorName} · ${mode}`;
      }
      case 'units':
        return `${weightUnit === 'kg' ? 'Kilogrammes' : 'Livres'} · ${measurementUnit === 'cm' ? 'Centimètres' : 'Pouces'}`;
      case 'backup-history':
        return lastBackupAgo ? `Dernière sauvegarde : ${lastBackupAgo}` : fallback;
      case 'clear-cache':
        return storageInfo ? `${storageInfo} utilisés dans l'app` : fallback;
      case 'sync-devices':
        return 'iPhone ↔ iPad · sans internet';
      default:
        return fallback;
    }
  };

  const renderItem = (item: SettingsItem, isLast: boolean) => {
    const IconComp = item.Icon;
    const translatedLabel = t(item.label);
    const rawSublabel = t(item.sublabel);
    const translatedSublabel = getDynamicSublabel(item, rawSublabel);
    // Badge "actif" pour certains items avec état
    const showPremiumActive = item.id === 'premium' && isPremium;
    const showDemoActive = item.id === 'creator-hery' && isDemoActive;
    // Couleur spéciale pour "Dernière sauvegarde : il y a X jours" quand vieille
    let sublabelColor = colors.textMuted;
    if (item.id === 'backup-history' && lastBackupAgo) {
      if (lastBackupAgo === 'jamais') sublabelColor = '#EF4444';
      else if (lastBackupAgo.match(/il y a (\d+) jours?/)) {
        const days = parseInt(RegExp.$1, 10);
        if (days >= 14) sublabelColor = '#EF4444';
        else if (days >= 7) sublabelColor = '#F59E0B';
      }
    }

    return (
      <View key={item.id}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.6}
        >
          <View style={[styles.iconBox, { backgroundColor: item.iconColor + '18' }]}>
            <IconComp size={20} color={item.iconColor} strokeWidth={2} />
          </View>
          <View style={styles.rowContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.rowLabel, { color: item.labelColor || colors.textPrimary }]} numberOfLines={1}>
                {translatedLabel}
              </Text>
              {showPremiumActive ? (
                <View style={{ backgroundColor: '#A855F7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>ACTIF</Text>
                </View>
              ) : null}
              {showDemoActive ? (
                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>ON</Text>
                </View>
              ) : null}
            </View>
            {translatedSublabel ? (
              <Text style={[styles.rowSublabel, { color: sublabelColor }]} numberOfLines={1}>
                {translatedSublabel}
              </Text>
            ) : null}
          </View>
          {/* Pastille couleur du thème actif à côté de la ligne Thèmes */}
          {item.id === 'themes' ? (
            <View
              style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: colors.accent,
                borderWidth: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                marginRight: 6,
              }}
            />
          ) : null}
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      {/* Loading overlay for demo generation */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Settings size={26} color={screenText} strokeWidth={2} />
          <Text style={[styles.headerTitle, { color: screenText }]}>{t('settings.title')}</Text>
        </View>

        {/* Hero profil · avatar + nom + chips + mini-stats, clic → profile */}
        {profileName ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/profile' as any)}
            style={[styles.heroCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}
          >
            <View style={styles.heroTop}>
              <View style={[styles.heroAvatar, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
                <Text style={[styles.heroAvatarText, { color: colors.accent }]}>
                  {profileName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {profileName}
                </Text>
                <View style={styles.heroMetaRow}>
                  {profileBelt ? (
                    <View style={[styles.heroChip, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}>
                      <Text style={[styles.heroChipText, { color: colors.accent }]}>
                        Ceinture {profileBelt}
                      </Text>
                    </View>
                  ) : null}
                  {profileStreak > 0 ? (
                    <View style={[styles.heroChip, { backgroundColor: '#F9731615', borderColor: '#F9731640' }]}>
                      <Text style={[styles.heroChipText, { color: '#EA580C' }]}>
                        🔥 {profileStreak} j
                      </Text>
                    </View>
                  ) : null}
                  {isPremium ? (
                    <View style={[styles.heroChip, { backgroundColor: '#A855F715', borderColor: '#A855F740' }]}>
                      <Text style={[styles.heroChipText, { color: '#9333EA' }]}>
                        PRO
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </View>

            {/* Mini stats row (sous le bloc principal, séparée par une ligne fine) */}
            {(totalSessions > 0 || weightLost !== null || bestStreak > 0) ? (
              <View style={[styles.heroStatsRow, { borderTopColor: colors.border }]}>
                {totalSessions > 0 ? (
                  <View style={styles.heroStatCol}>
                    <Text style={[styles.heroStatValue, { color: colors.textPrimary }]}>{totalSessions}</Text>
                    <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>séances</Text>
                  </View>
                ) : null}
                {weightLost !== null ? (
                  <View style={styles.heroStatCol}>
                    <Text style={[styles.heroStatValue, { color: weightLost > 0 ? '#10B981' : colors.textPrimary }]}>
                      {weightLost > 0 ? '-' : ''}{Math.abs(weightLost).toFixed(1)} kg
                    </Text>
                    <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>perdus</Text>
                  </View>
                ) : null}
                {bestStreak > 0 ? (
                  <View style={styles.heroStatCol}>
                    <Text style={[styles.heroStatValue, { color: colors.textPrimary }]}>{bestStreak}</Text>
                    <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>best streak</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
          <Search size={18} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('settings.search')}
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Language Selector */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: screenText, opacity: 0.7 }]}>{t('settings.language').toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={18} color="#3B82F6" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{t('settings.appLanguage')}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{t('settings.appLanguageSubtitle')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={async () => {
                        try {
                          impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
                          await setLanguage(lang.code);
                        } catch {
                          // Fallback silencieux · ne pas bloquer l'UI
                        }
                      }}
                      activeOpacity={0.75}
                      style={{
                        flex: 1,
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 14,
                        paddingHorizontal: 8,
                        borderRadius: 14,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? colors.accent : colors.border,
                        backgroundColor: isSelected ? colors.accent + '18' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '800' : '500',
                        color: isSelected ? colors.accent : colors.textSecondary,
                        textAlign: 'center',
                      }}>
                        {lang.nativeName}
                      </Text>
                      {isSelected && (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Sections */}
        {filteredSections.map((section) => (
          <View key={section.title} style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: screenText, opacity: 0.7 }]}>{t(section.title)}</Text>
            <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
              {section.items.map((item, idx) =>
                renderItem(item, idx === section.items.length - 1)
              )}
              {/* Taille du texte · inline dans la section Apparence */}
              {section.title === 'settings.sections.appearance' && (
                <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#8B5CF620', alignItems: 'center', justifyContent: 'center' }}>
                      <Type size={16} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Taille du texte</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                        {FONT_SIZE_LABELS[fontSizeLevel as FontSizeLevel]}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([1, 2, 3, 4] as FontSizeLevel[]).map((level) => {
                      const isActive = fontSizeLevel === level;
                      const previewSize = 11 + level * 2.5;
                      return (
                        <TouchableOpacity
                          key={level}
                          style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: isActive ? '#8B5CF6' : (isDark ? colors.backgroundElevated : '#F3F4F6'),
                            borderWidth: 1.5,
                            borderColor: isActive ? '#8B5CF6' : colors.border,
                            gap: 3,
                          }}
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            setFontSizeLevel(level);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={{ fontSize: previewSize, fontWeight: '800', color: isActive ? '#FFFFFF' : colors.textPrimary, lineHeight: previewSize + 4 }}>
                            Aa
                          </Text>
                          <Text style={{ fontSize: 9, color: isActive ? 'rgba(255,255,255,0.85)' : colors.textMuted, fontWeight: '600' }}>
                            {level === 1 ? 'S' : level === 2 ? 'M' : level === 3 ? 'L' : 'XL'}
                          </Text>
                          {isActive && (
                            <View style={{ position: 'absolute', top: 5, right: 5, width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={8} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Creator Mode - standard rows, visible only when unlocked */}
        {screenshotMenuUnlocked && filteredCreatorItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: screenText, opacity: 0.7 }]}>{t('settings.sections.creator')}</Text>
            <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
              {filteredCreatorItems.map((item, idx) =>
                renderItem(item, idx === filteredCreatorItems.length - 1)
              )}
            </View>
          </View>
        )}

        {/* Version + footer */}
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: screenText, opacity: 0.5 }]}>YOROI v2.3.3</Text>
          <Text style={[styles.versionSubtext, { color: screenText, opacity: 0.4 }]}>
            Made with ❤️ in Marseille · 100% offline
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ============ MODALS ============ */}

      {/* Units Modal */}
      <Modal visible={unitsModalVisible} transparent animationType="fade" onRequestClose={() => setUnitsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.unitsModal.title')}</Text>
              <TouchableOpacity onPress={() => setUnitsModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {/* Weight */}
              <Text style={[styles.unitSectionLabel, { color: colors.textMuted }]}>{t('settings.unitsModal.weight').toUpperCase()}</Text>
              <View style={styles.unitToggleRow}>
                {(['kg', 'lbs'] as const).map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, { backgroundColor: weightUnit === u ? colors.accent + '20' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: weightUnit === u ? colors.accent : 'transparent', borderWidth: weightUnit === u ? 2 : 1 }]}
                    onPress={() => { setWeightUnit(u); saveUnits('weight_unit', u); impactAsync(ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.unitBtnText, { color: weightUnit === u ? colors.accent : colors.textPrimary }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Measurements */}
              <Text style={[styles.unitSectionLabel, { color: colors.textMuted, marginTop: 20 }]}>{t('settings.unitsModal.measurements').toUpperCase()}</Text>
              <View style={styles.unitToggleRow}>
                {(['cm', 'in'] as const).map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, { backgroundColor: measurementUnit === u ? colors.accent + '20' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: measurementUnit === u ? colors.accent : 'transparent', borderWidth: measurementUnit === u ? 2 : 1 }]}
                    onPress={() => { setMeasurementUnit(u); saveUnits('measurement_unit', u); impactAsync(ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.unitBtnText, { color: measurementUnit === u ? colors.accent : colors.textPrimary }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.accent }]}
              onPress={() => { setUnitsModalVisible(false); notificationAsync(NotificationFeedbackType.Success); }}
            >
              <Text style={styles.modalSaveBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Modal */}
      <Modal visible={resetModalVisible} transparent animationType="fade" onRequestClose={() => setResetModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.resetModal.title')}</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.warningCard, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
                <Trash2 size={32} color="#EF4444" />
                <Text style={[styles.warningTitle, { color: '#EF4444' }]}>{t('settings.resetModal.irreversible')}</Text>
                <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                  {t('settings.resetModal.warningText')}
                </Text>
              </View>
              <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>
                {t('settings.resetModal.confirmLabel')} <Text style={{ fontWeight: '800', color: '#EF4444' }}>{t('settings.resetModal.confirmWord')}</Text>
              </Text>
              <TextInput
                style={[styles.confirmInput, { backgroundColor: colors.backgroundElevated, borderColor: isResetConfirmed ? '#10B981' : colors.border, color: colors.textPrimary }]}
                value={resetConfirmText}
                onChangeText={setResetConfirmText}
                placeholder={t('settings.resetModal.confirmPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <View style={styles.resetBtns}>
              <TouchableOpacity style={[styles.resetCancelBtn, { backgroundColor: colors.backgroundElevated }]} onPress={() => { setResetModalVisible(false); setResetConfirmText(''); }}>
                <Text style={[styles.resetCancelText, { color: colors.textPrimary }]}>{t('settings.resetModal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetConfirmBtn, { backgroundColor: isResetConfirmed ? '#EF4444' : colors.backgroundElevated, opacity: isResetConfirmed ? 1 : 0.5 }]}
                onPress={confirmReset}
                disabled={!isResetConfirmed}
              >
                <Trash2 size={18} color={isResetConfirmed ? '#FFF' : colors.textMuted} />
                <Text style={[styles.resetConfirmText, { color: isResetConfirmed ? '#FFF' : colors.textMuted }]}>{t('settings.resetModal.deleteAll')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clean Uninstall Modal */}
      <Modal visible={cleanUninstallVisible} transparent animationType="slide" onRequestClose={() => setCleanUninstallVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.cleanUninstallModal.title')}</Text>
              <TouchableOpacity onPress={() => setCleanUninstallVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>

              {cleanStep === 0 && (
                <>
                  <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
                    <LogOut size={28} color="#EF4444" />
                    <Text style={[styles.warningTitle, { color: '#EF4444' }]}>{t('settings.cleanUninstallModal.step1Title')}</Text>
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                      {t('settings.cleanUninstallModal.step1Text')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.resetConfirmBtn, { backgroundColor: '#EF4444', marginTop: 8, width: '100%', justifyContent: 'center' }]}
                    onPress={handleCleanUninstall}
                  >
                    <Trash2 size={18} color="#FFF" />
                    <Text style={[styles.resetConfirmText, { color: '#FFF' }]}>{t('settings.cleanUninstallModal.step1Btn')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.resetCancelBtn, { backgroundColor: colors.backgroundElevated, marginTop: 8, width: '100%', justifyContent: 'center' }]}
                    onPress={() => setCleanUninstallVisible(false)}
                  >
                    <Text style={[styles.resetCancelText, { color: colors.textPrimary }]}>{t('settings.cleanUninstallModal.cancel')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {cleanStep === 1 && (
                <>
                  <View style={[styles.warningCard, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
                    <CheckCircle size={28} color="#10B981" />
                    <Text style={[styles.warningTitle, { color: '#10B981' }]}>{t('settings.cleanUninstallModal.dataDeleted')}</Text>
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                      {t('settings.cleanUninstallModal.dataDeletedText')}
                    </Text>
                  </View>

                  <Text style={[styles.confirmLabel, { color: colors.textPrimary, marginTop: 12 }]}>{t('settings.cleanUninstallModal.step2Title')}</Text>
                  <Text style={[styles.warningText, { color: colors.textMuted, marginBottom: 8 }]}>
                    {t('settings.cleanUninstallModal.step2Text')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.resetConfirmBtn, { backgroundColor: '#FF3D80', width: '100%', justifyContent: 'center' }]}
                    onPress={() => safeOpenURL('x-apple-health://')}
                  >
                    <ShieldCheck size={18} color="#FFF" />
                    <Text style={[styles.resetConfirmText, { color: '#FFF' }]}>{t('settings.cleanUninstallModal.step2Btn')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.warningText, { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 12 }]}>
                    {t('settings.cleanUninstallModal.step2Hint')}
                  </Text>

                  <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>{t('settings.cleanUninstallModal.step3Title')}</Text>
                  <Text style={[styles.warningText, { color: colors.textMuted, marginBottom: 8 }]}>
                    {t('settings.cleanUninstallModal.step3Text')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.resetConfirmBtn, { backgroundColor: '#6366F1', width: '100%', justifyContent: 'center' }]}
                    onPress={() => Linking.openSettings()}
                  >
                    <Lock size={18} color="#FFF" />
                    <Text style={[styles.resetConfirmText, { color: '#FFF' }]}>{t('settings.cleanUninstallModal.step3Btn')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.warningText, { color: colors.textMuted, fontSize: 12, marginTop: 4 }]}>
                    {t('settings.cleanUninstallModal.step3Hint')}
                  </Text>

                  <TouchableOpacity
                    style={[styles.resetCancelBtn, { backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981', marginTop: 16, width: '100%', justifyContent: 'center' }]}
                    onPress={() => setCleanUninstallVisible(false)}
                  >
                    <Text style={[styles.resetCancelText, { color: '#10B981' }]}>{t('settings.cleanUninstallModal.doneBtn')}</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </View>
        </View>
      </Modal>

      {/* Secret Code Modal */}
      <Modal visible={showSecretCodeModal} transparent animationType="fade" onRequestClose={() => setShowSecretCodeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxWidth: 340 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.secretCodeModal.title')}</Text>
              <TouchableOpacity onPress={() => setShowSecretCodeModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.secretInput, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={secretCode}
                onChangeText={setSecretCode}
                placeholder={t('settings.secretCodeModal.title')}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoFocus
              />
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: secretCode.length === 4 ? colors.accent : colors.backgroundElevated, opacity: secretCode.length === 4 ? 1 : 0.5 }]}
                onPress={handleSecretCodeSubmit}
                disabled={secretCode.length !== 4}
              >
                <Text style={[styles.modalSaveBtnText, { color: secretCode.length === 4 ? '#FFF' : colors.textMuted }]}>{t('settings.secretCodeModal.unlock')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal "Nouveautés de la version" */}
      <Modal visible={whatsNewVisible} transparent animationType="fade" onRequestClose={() => setWhatsNewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#A855F720', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="#A855F7" />
                </View>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: colors.textPrimary }}>Nouveautés v2.3.3</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>La plus grosse mise à jour de Yoroi</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setWhatsNewVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { title: 'STATS QUI TE MOTIVENT', items: ['Nouveau tableau de bord 7 catégories', 'Vue calendrier annuelle des séances', 'Streak de jours d\'affilée animé', 'Records personnels mis en avant', 'Insights intelligents auto', 'Comparaisons fun "Le saviez-vous ?"', 'Graphiques poids/muscle/sommeil avec tendance', 'Badges débloqués en bandeau'] },
                { title: 'TRACKER COMBAT', items: ['Sparring round par round', 'Partenaires + clubs avec fiches', 'Analyse forces/faiblesses auto', 'BJJ, MMA, Boxe, K1, Judo, Lutte, Karaté', 'Palmarès & compétitions', 'Radar 5 dimensions Force/Cardio/Technique/Mental/Souplesse'] },
                { title: 'SYNCHRONISATION', items: ['iPhone ↔ iPad direct sans internet', 'Aucun serveur, aucun cloud'] },
                { title: 'NOUVEAU GUIDE D\'ACCUEIL', items: ['4 écrans clairs pour les premiers pas'] },
                { title: 'PARTAGE INSTAGRAM', items: ['Partager mes stats / mes records', 'Cartes 1080×1080 prêtes à poster'] },
                { title: 'INTERFACE', items: ['Tous les thèmes revus pour lisibilité parfaite', 'Cartes maintenant visibles sur tout fond', 'Petites bulles d\'aide mieux intégrées'] },
                { title: 'iPAD AMÉLIORÉ', items: ['Barre de navigation mieux proportionnée', 'Plus de contenu caché derrière la barre du bas'] },
                { title: 'SANTÉ', items: ['Connexion Apple Santé entièrement refaite', '27 types de données importés', 'FC moyenne et max sur chaque séance'] },
                { title: 'AUTRES', items: ['App nettement plus rapide sur Stats', 'Sommeil bien plus fluide', 'Le clavier ne cache plus les champs', 'Mises à jour instantanées partout'] },
                { title: 'CORRECTIONS', items: ['Plantage de l\'historique corrigé', 'Calendrier en mode sombre lisible', 'Plein de petits bugs chassés'] },
              ].map((section, sIdx) => (
                <View key={sIdx} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: colors.accent, letterSpacing: 0.8, marginBottom: 8 }}>
                    {section.title}
                  </Text>
                  {section.items.map((it, iIdx) => (
                    <View key={iIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, color: colors.accent, marginTop: 1 }}>•</Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                        {it}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginTop: 8, marginBottom: 8 }}>
                Merci à tous ceux qui envoient leurs retours · continuez, c'est ce qui fait grandir l'app.
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setWhatsNewVisible(false)}
              style={{ backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 }}>C'est noté</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    // paddingBottom important pour éviter que la tab bar flottante cache le contenu
    paddingBottom: 200,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // Hero profil
  heroCard: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    justifyContent: 'space-around',
  },
  heroStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    gap: 14,
  },
  // Sections
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    gap: 4,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  versionSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  modalSaveBtn: {
    margin: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Units modal
  unitSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  unitToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  unitBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Reset modal
  warningCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
  },
  confirmLabel: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  resetBtns: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  resetCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  resetCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetConfirmText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Secret
  secretInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 8,
  },
});
