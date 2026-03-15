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
  BookOpen,
  Syringe,
  BarChart3,
  Database,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { safeOpenURL } from '@/lib/security/validators';
import { exportDataToJSON, importDataFromJSON, exportEditableCSV, importEditableCSV, exportEmptyTemplate } from '@/lib/exportService';
import * as FileSystem from 'expo-file-system/legacy';
import { generateProgressPDF } from '@/lib/pdfExport';
import { resetAllData, resetDataOnly } from '@/lib/storage';
import { resetDatabase } from '@/lib/database';
import logger from '@/lib/security/logger';
import { generateHenryDemoData, restoreRealData, isDemoDataActive } from '@/lib/demoDataService';
import { SamuraiLoader } from '@/components/SamuraiLoader';

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
    title: 'PROFIL & PRESENTATION',
    items: [
      { id: 'profile', label: 'Mon Profil', sublabel: 'Infos personnelles', Icon: UserRound, iconColor: '#3B82F6', route: '/profile' },
      { id: 'avatar', label: 'Avatar', sublabel: 'Personnaliser ton avatar', Icon: UserRound, iconColor: '#F97316', route: '/avatar-selection' },
      { id: 'frame', label: 'Photo de profil', sublabel: 'Cadre, accessoires et bordure', Icon: Hash, iconColor: '#8B5CF6', route: '/frame-selection' },
      { id: 'logos', label: 'Logo de l\'app', sublabel: 'Personalise l\'icone Yoroi sur ton ecran', Icon: ImageIcon, iconColor: '#8B5CF6', route: '/logo-selection' },
    ],
  },
  {
    title: 'APPARENCE',
    items: [
      { id: 'themes', label: 'Themes', sublabel: 'Themes et personnalisation', Icon: Palette, iconColor: '#8B5CF6', route: '/themes' },
      { id: 'units', label: 'Unites', sublabel: 'Kg/Lbs, Cm/Inches', Icon: Sliders, iconColor: '#8B5CF6', handler: 'units' },
    ],
  },
  {
    title: 'PERSONNALISATION',
    items: [
      { id: 'navbar', label: 'Barre de navigation', sublabel: 'Ordre et visibilite des onglets', Icon: Grip, iconColor: '#8B5CF6', route: '/customize-tabs' },
      { id: 'citations', label: 'Citations', sublabel: 'Style et notifications', Icon: MessageSquareQuote, iconColor: '#F59E0B', route: '/citations' },
    ],
  },
  {
    title: 'NOTIFICATIONS & CONNECTIVITE',
    items: [
      { id: 'notifications', label: 'Notifications', sublabel: 'Rappels, briefing, alertes intelligentes', Icon: Bell, iconColor: '#F59E0B', route: '/notifications' },
      { id: 'health-data', label: 'Données Santé', sublabel: 'Synchronise tes données santé', Icon: Stethoscope, iconColor: '#EC4899', route: '/connected-devices' },
      { id: 'heart-zones', label: 'Zones cardiaques', sublabel: 'Configure tes 5 zones personnelles', Icon: Heart, iconColor: '#EF4444', route: '/heart-zones-settings' },
    ],
  },
  {
    title: 'MES DONNÉES',
    items: [
      { id: 'companion', label: 'Mes données', sublabel: 'Tableau, graphiques, ajout et export CSV', Icon: Table, iconColor: '#4F8EF7', route: '/companion' },
      { id: 'export', label: 'Sauvegarder', sublabel: 'Backup complet (JSON ou CSV)', Icon: Download, iconColor: '#14B8A6', handler: 'export' },
      { id: 'import', label: 'Restaurer', sublabel: 'Importer un backup', Icon: Upload, iconColor: '#14B8A6', handler: 'import' },
      { id: 'import-csv', label: 'Import CSV', sublabel: 'Importer depuis un ordinateur (PC/Mac)', Icon: FileUp, iconColor: '#6366F1', route: '/import-csv' },
      { id: 'pdf', label: 'Rapport PDF', sublabel: 'Pour medecin ou coach', Icon: FileText, iconColor: '#6B7280', handler: 'pdf' },
      { id: 'clear-cache', label: 'Vider le cache', sublabel: 'Libere de l\'espace, garde tes données', Icon: Database, iconColor: '#F59E0B', handler: 'clear-cache' },
      { id: 'privacy', label: 'Vie Privee & Données', sublabel: 'Gere tes données personnelles', Icon: ShieldCheck, iconColor: '#14B8A6', route: '/privacy-data' },
      { id: 'privacy-policy', label: 'Politique de confidentialite', sublabel: '', Icon: Lock, iconColor: '#6B7280', handler: 'privacy-policy' },
      { id: 'clean-uninstall', label: 'Quitter sans laisser de trace', sublabel: 'Efface tout avant de desinstaller', Icon: LogOut, iconColor: '#EF4444', handler: 'clean-uninstall', labelColor: '#EF4444' },
      { id: 'reset', label: 'Reinitialiser Tout', sublabel: 'Effacer toutes les données', Icon: Trash2, iconColor: '#EF4444', handler: 'reset', labelColor: '#EF4444' },
    ],
  },
  {
    title: 'SUPPORT & A PROPOS',
    items: [
      { id: 'about', label: 'A propos de Yoroi', sublabel: 'Qui suis-je et pourquoi cette app', Icon: Info, iconColor: '#8B5CF6', handler: 'about' },
      { id: 'ideas', label: 'Boite a idees', sublabel: 'Proposer des idees et signaler des bugs', Icon: Lightbulb, iconColor: '#14B8A6', handler: 'ideas' },
      { id: 'instagram', label: 'Instagram : Yoroiapp', sublabel: "Suis l'avancee", Icon: Camera, iconColor: '#EC4899', handler: 'instagram' },
      { id: 'rate', label: "Noter l'App", sublabel: 'Laisse un avis sur le Store', Icon: Star, iconColor: '#F59E0B', handler: 'rate' },
    ],
  },
];

// Creator mode items as standard rows
const CREATOR_ITEMS: SettingsItem[] = [
  { id: 'creator-screenshot', label: 'Mode Screenshot', sublabel: 'Desactive', Icon: Smartphone, iconColor: '#3B82F6', handler: 'toggle-screenshot' },
  { id: 'creator-journal', label: 'Mode Carnet', sublabel: 'Desactive', Icon: BookOpen, iconColor: '#F97316', handler: 'toggle-journal' },
  { id: 'creator-surgeon', label: 'Mode Chirurgien', sublabel: 'Desactive', Icon: Syringe, iconColor: '#EF4444', handler: 'toggle-surgeon' },
  { id: 'creator-mock', label: 'Stats Mock', sublabel: 'Desactive', Icon: BarChart3, iconColor: '#8B5CF6', handler: 'toggle-mock' },
  { id: 'creator-hery', label: 'Profil Demo Henry', sublabel: 'Injecter données realistes', Icon: Database, iconColor: '#10B981', handler: 'demo-hery' },
  { id: 'creator-onboarding', label: 'Voir Onboarding', sublabel: 'Previsualiser l\'ecran d\'accueil', Icon: Eye, iconColor: '#06B6D4', handler: 'preview-onboarding' },
  { id: 'creator-reset', label: 'Tout Desactiver', sublabel: 'Nettoyer les données de demo', Icon: Trash2, iconColor: '#EF4444', handler: 'reset-creator', labelColor: '#EF4444' },
  { id: 'creator-purge', label: 'PURGE FORCEE', sublabel: 'Efface poids + séances (SQLite direct)', Icon: Trash2, iconColor: '#FF0000', handler: 'purge-data', labelColor: '#FF0000' },
];

// ============================================
// COMPONENT
// ============================================

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, screenBackground } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Search
  const [searchText, setSearchText] = useState('');

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
    // Check if creator mode is unlocked
    AsyncStorage.getItem('@yoroi_screenshot_menu_unlocked').then(val => {
      if (val === 'true') {
        setScreenshotMenuUnlocked(true);
        loadCreatorSettings();
      }
    });
    // Check if demo data is active
    isDemoDataActive().then(setIsDemoActive);
  }, []);

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
          return { ...item, sublabel: isGlobalScreenshotMode ? 'Active' : 'Desactive' };
        case 'creator-journal':
          return { ...item, sublabel: isJournalScreenshotMode ? 'Active' : 'Desactive' };
        case 'creator-surgeon':
          return { ...item, sublabel: isSurgeonMode ? 'Active' : 'Desactive' };
        case 'creator-mock':
          return { ...item, sublabel: isMockStatsMode ? 'Active' : 'Desactive' };
        case 'creator-hery':
          return { ...item, sublabel: isDemoActive ? 'Active - données demo injectees' : 'Injecter données realistes' };
        case 'creator-reset':
          return { ...item, sublabel: isDemoActive ? 'Restaurer tes vraies données' : 'Nettoyer les données de demo' };
        default:
          return item;
      }
    });
  }, [isGlobalScreenshotMode, isJournalScreenshotMode, isSurgeonMode, isMockStatsMode, isDemoActive]);

  // Filtered sections based on search
  const filteredSections = useMemo((): SettingsSection[] => {
    const query = searchText.trim().toLowerCase();
    if (!query) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.label.toLowerCase().includes(query) ||
          item.sublabel.toLowerCase().includes(query)
      ),
    })).filter(section => section.items.length > 0);
  }, [searchText]);

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
      'Exporter mes données',
      'Choisis le format de sauvegarde',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Backup Complet', style: 'primary', onPress: () => exportDataToJSON() },
        { text: 'CSV Editable', style: 'default', onPress: () => handleExportEditable() },
      ]
    );
  };

  const handleExportEditable = () => {
    showPopup(
      'Export Editable',
      'Exporte tes données dans un format modifiable sur ordinateur',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Mes Données', style: 'primary', onPress: () => exportEditableCSV() },
        { text: 'Template Vide', style: 'default', onPress: () => exportEmptyTemplate() },
      ]
    );
  };

  const handleImport = () => {
    showPopup(
      'Restaurer mes données',
      'Choisis le type de fichier a importer',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Backup JSON',
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
        {
          text: 'CSV Editable',
          style: 'default',
          onPress: async () => {
            try {
              const success = await importEditableCSV();
              if (success) {
                notificationAsync(NotificationFeedbackType.Success);
                router.push('/(tabs)');
              }
            } catch (error) {
              logger.error('Import CSV error:', error);
              notificationAsync(NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleExportPDF = () => {
    showPopup(
      'Rapport PDF',
      'Choisis la periode du rapport',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '30 jours',
          style: 'default',
          onPress: async () => {
            try { await generateProgressPDF('30j'); } catch (e) {
              showPopup('Erreur', 'Impossible de generer le PDF', [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
        {
          text: '90 jours',
          style: 'primary',
          onPress: async () => {
            try { await generateProgressPDF('90j'); } catch (e) {
              showPopup('Erreur', 'Impossible de generer le PDF', [{ text: 'OK', style: 'primary' }]);
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
      'Sauvegarde recommandee',
      'Avant de reinitialiser, on te recommande de sauvegarder tes données.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Sauvegarder d\'abord', style: 'primary', onPress: async () => {
          await exportDataToJSON();
          openResetModal();
        }},
        { text: 'Continuer sans sauvegarder', style: 'default', onPress: () => openResetModal() },
      ]
    );
  };

  const normalizedText = resetConfirmText.trim().toUpperCase();
  const isResetConfirmed = normalizedText === 'SUPPRIMER' || normalizedText === 'SUPRIMER' || normalizedText === 'EFFACER' || normalizedText === 'OUI';

  const confirmReset = async () => {
    if (isResetConfirmed) {
      try {
        await resetDataOnly();
        setResetModalVisible(false);
        setResetConfirmText('');
        showPopup(
          'Données supprimees',
          'Tes données ont ete effacees. Tes photos ont ete conservees.',
          [{ text: 'OK', style: 'primary', onPress: () => router.replace('/onboarding') }],
          <CheckCircle size={32} color="#10B981" />
        );
      } catch (error) {
        logger.error('[Settings] Error resetting data:', error);
        showPopup('Erreur', 'Impossible de reinitialiser', [{ text: 'OK', style: 'primary' }]);
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
    if (secretCode === '2022') {
      notificationAsync(NotificationFeedbackType.Success);
      await AsyncStorage.setItem('@yoroi_screenshot_menu_unlocked', 'true');
      setScreenshotMenuUnlocked(true);
      setShowSecretCodeModal(false);
      setSecretCode('');
      await loadCreatorSettings();
    } else {
      notificationAsync(NotificationFeedbackType.Error);
      showPopup('Code Incorrect', "Le code saisi n'est pas valide.", [{ text: 'Reessayer', style: 'primary' }]);
      setSecretCode('');
    }
  };

  const handleDemoHenry = () => {
    showPopup(
      'Profil Demo Henry',
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
              const result = await generateHenryDemoData();
              setIsDemoActive(true);
              setIsGenerating(false);
              DeviceEventEmitter.emit('YOROI_DEMO_CHANGED');
              notificationAsync(NotificationFeedbackType.Success);
              showPopup(
                'Profil Henry cree',
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
      'Vider le cache',
      'Efface les fichiers temporaires et les images en cache. Tes données, séances et statistiques sont conservees.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
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
              showPopup('Cache vide !', 'Le cache a ete nettoye avec succes.', [{ text: 'OK', style: 'primary' }]);
            } catch (e) {
              logger.error('Clear cache error', e);
              showPopup('Erreur', 'Impossible de vider le cache.', [{ text: 'OK', style: 'cancel' }]);
            } finally {
              setIsGenerating(false);
            }
          },
        },
      ]
    );
  }, [showPopup]);

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
          safeOpenURL('https://play.google.com/store/search?q=Yoroi+Suivi+poids+Sport&c=apps');
        } else {
          safeOpenURL('https://apps.apple.com/fr/app/yoroi-suivi-poids-sport/id6757306612');
        }
        return;
      case 'privacy-policy': safeOpenURL('https://easy-woodwind-a70.notion.site/Yoroi-App-2d950188283880dbbd44d7e5abefecbb'); return;
      // Creator mode toggles
      case 'toggle-screenshot': toggleGlobalScreenshotMode(!isGlobalScreenshotMode); return;
      case 'toggle-journal': toggleJournalScreenshotMode(!isJournalScreenshotMode); return;
      case 'toggle-surgeon': toggleSurgeonMode(!isSurgeonMode); return;
      case 'toggle-mock': toggleMockStatsMode(!isMockStatsMode); return;
      case 'demo-hery': handleDemoHenry(); return;
      case 'preview-onboarding': router.push({ pathname: '/onboarding', params: { preview: 'true' } } as any); return;
      case 'reset-creator': resetAllCreatorModes(); return;
      case 'purge-data': handleForceDeleteData(); return;
      case 'clear-cache': handleClearCache(); return;
      case 'clean-uninstall': setCleanStep(0); setCleanUninstallVisible(true); return;
    }

    // Route-based items
    if (item.route) {
      router.push(item.route as any);
    }
  }, [isGlobalScreenshotMode, isJournalScreenshotMode, isSurgeonMode, isMockStatsMode]);

  // ============================================
  // RENDER
  // ============================================

  const renderItem = (item: SettingsItem, isLast: boolean) => {
    const IconComp = item.Icon;
    const sublabel = item.sublabel;

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
            <Text style={[styles.rowLabel, { color: item.labelColor || colors.textPrimary }]} numberOfLines={1}>
              {item.label}
            </Text>
            {sublabel ? (
              <Text style={[styles.rowSublabel, { color: colors.textMuted }]} numberOfLines={1}>
                {sublabel}
              </Text>
            ) : null}
          </View>
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
            <SamuraiLoader message="Chargement en cours..." />
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
          <Settings size={26} color="#FFFFFF" strokeWidth={2} />
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Reglages</Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
          <Search size={18} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Sections */}
        {filteredSections.map((section) => (
          <View key={section.title} style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: 'rgba(255,255,255,0.7)' }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
              {section.items.map((item, idx) =>
                renderItem(item, idx === section.items.length - 1)
              )}
            </View>
          </View>
        ))}

        {/* Creator Mode - standard rows, visible only when unlocked */}
        {screenshotMenuUnlocked && filteredCreatorItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: 'rgba(255,255,255,0.7)' }]}>CREATEUR</Text>
            <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
              {filteredCreatorItems.map((item, idx) =>
                renderItem(item, idx === filteredCreatorItems.length - 1)
              )}
            </View>
          </View>
        )}

        {/* Version */}
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: 'rgba(255,255,255,0.5)' }]}>YOROI v2.0</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ============ MODALS ============ */}

      {/* Units Modal */}
      <Modal visible={unitsModalVisible} transparent animationType="fade" onRequestClose={() => setUnitsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Unites</Text>
              <TouchableOpacity onPress={() => setUnitsModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {/* Weight */}
              <Text style={[styles.unitSectionLabel, { color: colors.textMuted }]}>POIDS</Text>
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
              <Text style={[styles.unitSectionLabel, { color: colors.textMuted, marginTop: 20 }]}>MESURES</Text>
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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Reinitialiser</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.warningCard, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
                <Trash2 size={32} color="#EF4444" />
                <Text style={[styles.warningTitle, { color: '#EF4444' }]}>Action irreversible</Text>
                <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                  Toutes tes données seront supprimees : poids, séances, badges, reglages... Tes photos seront conservees.
                </Text>
              </View>
              <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>
                Pour confirmer, ecris <Text style={{ fontWeight: '800', color: '#EF4444' }}>OUI</Text>
              </Text>
              <TextInput
                style={[styles.confirmInput, { backgroundColor: colors.backgroundElevated, borderColor: isResetConfirmed ? '#10B981' : colors.border, color: colors.textPrimary }]}
                value={resetConfirmText}
                onChangeText={setResetConfirmText}
                placeholder="Ecris OUI"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <View style={styles.resetBtns}>
              <TouchableOpacity style={[styles.resetCancelBtn, { backgroundColor: colors.backgroundElevated }]} onPress={() => { setResetModalVisible(false); setResetConfirmText(''); }}>
                <Text style={[styles.resetCancelText, { color: colors.textPrimary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetConfirmBtn, { backgroundColor: isResetConfirmed ? '#EF4444' : colors.backgroundElevated, opacity: isResetConfirmed ? 1 : 0.5 }]}
                onPress={confirmReset}
                disabled={!isResetConfirmed}
              >
                <Trash2 size={18} color={isResetConfirmed ? '#FFF' : colors.textMuted} />
                <Text style={[styles.resetConfirmText, { color: isResetConfirmed ? '#FFF' : colors.textMuted }]}>Tout supprimer</Text>
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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Quitter sans laisser de trace</Text>
              <TouchableOpacity onPress={() => setCleanUninstallVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>

              {cleanStep === 0 && (
                <>
                  <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
                    <LogOut size={28} color="#EF4444" />
                    <Text style={[styles.warningTitle, { color: '#EF4444' }]}>3 etapes pour partir proprement</Text>
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                      Cette action va effacer TOUTES tes données dans l'app. Ensuite on te guide pour supprimer les acces Apple Santé et desactiver iCloud.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.resetConfirmBtn, { backgroundColor: '#EF4444', marginTop: 8, width: '100%', justifyContent: 'center' }]}
                    onPress={handleCleanUninstall}
                  >
                    <Trash2 size={18} color="#FFF" />
                    <Text style={[styles.resetConfirmText, { color: '#FFF' }]}>Etape 1 — Effacer toutes mes données</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.resetCancelBtn, { backgroundColor: colors.backgroundElevated, marginTop: 8, width: '100%', justifyContent: 'center' }]}
                    onPress={() => setCleanUninstallVisible(false)}
                  >
                    <Text style={[styles.resetCancelText, { color: colors.textPrimary }]}>Annuler</Text>
                  </TouchableOpacity>
                </>
              )}

              {cleanStep === 1 && (
                <>
                  <View style={[styles.warningCard, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
                    <Text style={{ fontSize: 28 }}>✓</Text>
                    <Text style={[styles.warningTitle, { color: '#10B981' }]}>Données effacees !</Text>
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                      Toutes tes données Yoroi sont supprimees. Suis maintenant les etapes 2 et 3 pour partir sans laisser de trace.
                    </Text>
                  </View>

                  <Text style={[styles.confirmLabel, { color: colors.textPrimary, marginTop: 12 }]}>Etape 2 — Revoquer les acces Apple Santé</Text>
                  <Text style={[styles.warningText, { color: colors.textMuted, marginBottom: 8 }]}>
                    iOS garde les permissions Santé meme apres desinstallation. Va les supprimer manuellement.
                  </Text>
                  <TouchableOpacity
                    style={[styles.resetConfirmBtn, { backgroundColor: '#FF3D80', width: '100%', justifyContent: 'center' }]}
                    onPress={() => safeOpenURL('x-apple-health://')}
                  >
                    <ShieldCheck size={18} color="#FFF" />
                    <Text style={[styles.resetConfirmText, { color: '#FFF' }]}>Ouvrir Apple Santé</Text>
                  </TouchableOpacity>
                  <Text style={[styles.warningText, { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 12 }]}>
                    Dans Santé : Acces aux apps → Yoroi → tout desactiver
                  </Text>

                  <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>Etape 3 — Desactiver iCloud pour Yoroi</Text>
                  <Text style={[styles.warningText, { color: colors.textMuted, marginBottom: 8 }]}>
                    Sans ca, tes données reviennent a la reinstallation.
                  </Text>
                  <TouchableOpacity
                    style={[styles.resetConfirmBtn, { backgroundColor: '#6366F1', width: '100%', justifyContent: 'center' }]}
                    onPress={() => Linking.openSettings()}
                  >
                    <Lock size={18} color="#FFF" />
                    <Text style={[styles.resetConfirmText, { color: '#FFF' }]}>Ouvrir les Reglages iPhone</Text>
                  </TouchableOpacity>
                  <Text style={[styles.warningText, { color: colors.textMuted, fontSize: 12, marginTop: 4 }]}>
                    Dans Reglages : ton nom → iCloud → Sauvegardes → desactive Yoroi
                  </Text>

                  <TouchableOpacity
                    style={[styles.resetCancelBtn, { backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981', marginTop: 16, width: '100%', justifyContent: 'center' }]}
                    onPress={() => setCleanUninstallVisible(false)}
                  >
                    <Text style={[styles.resetCancelText, { color: '#10B981' }]}>C'est bon, je peux desinstaller</Text>
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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Mode Createur</Text>
              <TouchableOpacity onPress={() => setShowSecretCodeModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.secretInput, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={secretCode}
                onChangeText={setSecretCode}
                placeholder="Code"
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
                <Text style={[styles.modalSaveBtnText, { color: secretCode.length === 4 ? '#FFF' : colors.textMuted }]}>Debloquer</Text>
              </TouchableOpacity>
            </View>
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
  content: { paddingHorizontal: 16 },

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
  },
  versionText: {
    fontSize: 13,
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
