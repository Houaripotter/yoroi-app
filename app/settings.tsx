import React, { useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  Platform,
  Switch,
  Image,
  KeyboardAvoidingView,
  Linking,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  Target,
  Calendar,
  Scale,
  TrendingDown,
  Trash2,
  ChevronRight,
  X,
  Check,
  Award,
  CloudUpload,
  CloudDownload,
  ShieldCheck,
  BookOpen,
  Users,
  Lightbulb,
  Sparkles,
  FileText,
  Cloud,
  RefreshCw,
  Mail,
  Watch,
  Mic,
  Heart,
  Trophy,
  Smartphone,
  Moon,
  Activity as ActivityIcon,
  ShoppingBag,
  Dumbbell as DumbbellIcon,
  Shield,
  Footprints,
  CircleDot,
  Building2,
  Shirt,
  Palette,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useDevMode } from '@/lib/DevModeContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useFocusEffect, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { BadgesScreen } from '@/components/BadgesScreen'; 
import { ReminderSettingsComponent } from '@/components/ReminderSettings';
import { HealthSyncSettings } from '@/components/HealthSyncSettings';
import { SmartRemindersSettings } from '@/components/SmartRemindersSettings';
import { BriefingSettings } from '@/components/BriefingSettings';
import { PartnersScreen } from '@/components/PartnersScreen';
import * as ImagePicker from 'expo-image-picker';
import {
  exportData,
  importData,
  resetAllData,
  getUserSettings,
  saveUserSettings,
  getUserClubs,
  addUserClub,
  updateUserClub,
  deleteUserClub,
  getUserGear,
  addUserGear,
  updateUserGear,
  deleteUserGear,
} from '@/lib/storage';
import { CITATION_STYLE_OPTIONS, CitationStyle, setCitationStyle as saveCitationStyleToStorage } from '@/lib/citations';
import type { UserClub, UserGear } from '@/lib/storage';
import { exportDataToJSON, exportDataToCSV, shareProgress, importDataFromJSON } from '@/lib/exportService';
import { exportToPDF, previewPDFReport } from '@/lib/pdfExportService';
import { isiCloudSyncFeatureEnabled, getiCloudUnavailableMessage, getSyncStatus, SyncStatus } from '@/lib/iCloudSyncService';
import {
  getRamadanSettings,
  saveRamadanSettings,
  toggleRamadanMode,
  getRamadanDates,
  isRamadanPeriod,
  RamadanSettings,
} from '@/lib/ramadanService';
import { getUserMode, setUserMode, getUserSport } from '@/lib/fighterModeService';
import { UserMode, Sport } from '@/lib/fighterMode';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { loadScreenshotDemoData, clearScreenshotDemoData } from '@/lib/screenshotDemoData';
import { Weight } from '@/lib/database';
import { getWeightCategoriesForSport, WeightCategory } from '@/lib/weightCategories';

// Constants for non-theme values
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 };
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
const FONT_SIZE = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 20, display: 24 };

interface SettingsScreenProps {
  onClose?: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps = { onClose: undefined }) {
  const { themeName, colors, isDark } = useTheme();
  const { isDevMode, handleSecretTap, disableDevMode } = useDevMode();
  const systemColorScheme = useColorScheme();

  // Use colors from theme context directly
  const backgroundColor = colors.background;
  const textColor = colors.textPrimary;
  const cardBackground = colors.card;
  
  const [height, setHeight] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');

  // Modals
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [measurementUnitModalVisible, setMeasurementUnitModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [badgesModalVisible, setBadgesModalVisible] = useState(false);
  const [partnersModalVisible, setPartnersModalVisible] = useState(false);
  const [customClubLogos, setCustomClubLogos] = useState<{ [key: string]: string }>({});
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('male');
  const [clubsModalVisible, setClubsModalVisible] = useState(false);
  const [userClan, setUserClan] = useState<'GB' | 'MFC' | 'Ronin' | null>(null);
  const [clanModalVisible, setClanModalVisible] = useState(false);
  const [userClubs, setUserClubs] = useState<UserClub[]>([]);
  const [editingClub, setEditingClub] = useState<UserClub | null>(null);
  const [newClubName, setNewClubName] = useState('');
  const [newClubType, setNewClubType] = useState<'gracie_barra' | 'basic_fit' | 'running' | 'mma' | 'foot' | 'other'>('basic_fit');
  const [newClubLogo, setNewClubLogo] = useState<string | null>(null);
  const [gearModalVisible, setGearModalVisible] = useState(false);
  const [userGear, setUserGear] = useState<UserGear[]>([]);
  const [editingGear, setEditingGear] = useState<UserGear | null>(null);
  const [newGearName, setNewGearName] = useState('');
  const [newGearBrand, setNewGearBrand] = useState('');
  const [newGearType, setNewGearType] = useState<'kimono' | 'chaussure' | 'gants' | 'protections' | 'autre'>('kimono');
  const [newGearPhoto, setNewGearPhoto] = useState<string | null>(null);

  // Ramadan Mode
  const [ramadanEnabled, setRamadanEnabled] = useState(false);
  const [ramadanSettings, setRamadanSettingsState] = useState<RamadanSettings | null>(null);
  const [ramadanModalVisible, setRamadanModalVisible] = useState(false);
  const [ramadanFajrTime, setRamadanFajrTime] = useState('05:30');
  const [ramadanMaghribTime, setRamadanMaghribTime] = useState('19:45');
  const [ramadanHydrationGoal, setRamadanHydrationGoal] = useState('3');

  // Hidden demo data generator (tap version 5 times)
  const [showHiddenDemo, setShowHiddenDemo] = useState(false);

  // Fighter Mode
  const [userModeSetting, setUserModeSetting] = useState<UserMode>('loisir');
  const [userSport, setUserSport] = useState<Sport | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await getUserSettings();
      setHeight(settings.height?.toString() || '');
      setWeightGoal(settings.weight_goal?.toString() || '');
      setTargetDate(settings.target_date || '');
      setWeightUnit(settings.weight_unit || 'kg');
      setMeasurementUnit(settings.measurement_unit || 'cm');
      setUserClan(settings.userClan || null);
      // Charger les logos personnalisés
      if (settings.custom_club_logos) {
        setCustomClubLogos(settings.custom_club_logos);
      }
      // Charger le genre de l'avatar
      if ((settings as any).gender) {
        setAvatarGender((settings as any).gender);
      }
      // Charger les clubs utilisateur
      const clubs = await getUserClubs();
      setUserClubs(clubs);

      // Charger les parametres Ramadan
      const ramSettings = await getRamadanSettings();
      setRamadanSettingsState(ramSettings);
      setRamadanEnabled(ramSettings.enabled);
      setRamadanFajrTime(ramSettings.fajrTime);
      setRamadanMaghribTime(ramSettings.maghribTime);
      setRamadanHydrationGoal(ramSettings.hydrationGoal.toString());

      // Charger le mode utilisateur (loisir / competiteur)
      const mode = await getUserMode();
      setUserModeSetting(mode);

      // Charger le sport (pour les compétiteurs)
      const sport = await getUserSport();
      setUserSport(sport);

      // Le thème est géré par le contexte, pas besoin de le mettre à jour ici
    } catch (e) {
      console.log("Erreur chargement settings", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [fetchSettings])
  );

  const handleChangeUserMode = async (newMode: UserMode) => {
    Alert.alert(
      'Changer de mode',
      newMode === 'competiteur'
        ? 'Passer en mode compétiteur activera les fonctionnalités avancées pour les combattants (compétitions, palmarès, hydratation).'
        : 'Passer en mode loisir désactivera les fonctionnalités spécifiques aux compétiteurs.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            await setUserMode(newMode);
            setUserModeSetting(newMode);

            // Si passage en mode compétiteur et pas de sport défini, rediriger vers sélection de sport
            if (newMode === 'competiteur' && !userSport) {
              Alert.alert(
                'Sport de combat',
                'Pour profiter pleinement du mode compétiteur, veuillez sélectionner votre sport principal.',
                [
                  {
                    text: 'Plus tard',
                    style: 'cancel',
                  },
                  {
                    text: 'Choisir',
                    onPress: () => router.push('/sport-selection'),
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const removeClubLogo = async (clubKey: string) => {
    Alert.alert(
      'Supprimer le logo',
      `Voulez-vous supprimer ce logo ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const newLogos = { ...customClubLogos };
            delete newLogos[clubKey];
            setCustomClubLogos(newLogos);
            await saveUserSettings({ custom_club_logos: newLogos });
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    const heightNum = parseFloat(height);
    const goalNum = parseFloat(weightGoal);

    await saveUserSettings({
      height: heightNum,
      weight_goal: goalNum,
      target_date: targetDate,
      weight_unit: weightUnit,
      measurement_unit: measurementUnit,
      theme: themeName,
    });
  };

  const handleExport = async () => {
    const success = await exportData();
    if (success && Platform.OS === 'web') {
        Alert.alert('Succès', 'Fichier généré.');
    }
    // Sur mobile, le share sheet s'ouvre tout seul
  };

  const handleImport = async () => {
    Alert.alert(
      'Restaurer une sauvegarde',
      'Attention : Ceci va écraser TOUTES vos données actuelles. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            const success = await importData();
            if (success) {
              await fetchSettings();
              router.replace('/(tabs)');
              Alert.alert("Succès", "Données restaurées.");
            }
          },
        },
      ]
    );
  };


  const handleExportJSON = async () => {
    await exportDataToJSON();
  };

  const handleExportCSV = async () => {
    await exportDataToCSV();
  };

  const handleImportJSON = async () => {
    const success = await importDataFromJSON();
    if (success) {
      // Recharger les paramètres après import
      await fetchSettings();
    }
  };

  const handleShareProgress = async () => {
    await shareProgress();
  };

  const handleResetData = async () => {
    try {
      const success = await resetAllData();
      setResetModalVisible(false);
      if (success) {
        Alert.alert('Réinitialisé', 'Toutes les données ont été effacées.');
        fetchSettings();
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer.');
    }
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Revoir l\'onboarding',
      'Voulez-vous revoir l\'écran d\'accueil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('yoroi_onboarding_done');
              router.replace('/onboarding');
            } catch (error) {
              console.error('Erreur reset onboarding:', error);
              Alert.alert('Erreur', 'Impossible de réinitialiser l\'onboarding.');
            }
          },
        },
      ]
    );
  };

  // Mode Screenshot pour captures d'écran App Store
  const handleLoadScreenshotDemo = async () => {
    Alert.alert(
      '📸 Mode Screenshot',
      'Charger des données de démonstration complètes pour faire des captures d\'écran professionnelles pour l\'App Store ?\n\n✨ Inclut :\n• 3 mois de transformation (82kg → 75.8kg)\n• Composition corporelle (22% → 16% gras, 38% → 42% muscle)\n• Tour de taille -9cm, biceps +3cm\n• 60+ entraînements (JJB + Musculation)\n• Sommeil & hydratation\n• 2 clubs : Gracie Barra + Basic Fit\n• Planning hebdomadaire équilibré\n• 12 badges débloqués\n\n⚠️ Toutes les données actuelles seront EFFACÉES !',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Charger',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await loadScreenshotDemoData();
              if (result.success) {
                Alert.alert(
                  '✅ Mode Screenshot activé !',
                  'Données complètes chargées.\n\n📱 Profil : Alex Martin\n📊 Transformation : -13kg en 6 mois\n🥋 3 clubs + planning complet\n\nL\'app est prête pour les screenshots !'
                );
                fetchSettings();
                router.replace('/(tabs)');
              } else {
                Alert.alert('Erreur', result.error || 'Échec du chargement');
              }
            } catch (error) {
              console.error('Erreur mode screenshot:', error);
              Alert.alert('Erreur', 'Impossible de charger les données de démonstration.');
            }
          },
        },
      ]
    );
  };

  const handleClearScreenshotDemo = async () => {
    Alert.alert(
      '🧹 Effacer le Mode Screenshot',
      'Supprimer toutes les données de démonstration et revenir à une app vierge ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearScreenshotDemoData();
              Alert.alert('✅ Effacé', 'L\'app est maintenant vierge.');
              fetchSettings();
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Erreur nettoyage:', error);
              Alert.alert('Erreur', 'Impossible d\'effacer les données.');
            }
          },
        },
      ]
    );
  };

  // Handle version tap - triggers Dev Mode secret code
  const handleVersionTap = () => {
    handleSecretTap();
  };

  // Toggle Dev Mode - allows user to disable it
  const handleToggleDevMode = async () => {
    Alert.alert(
      '🔓 Mode Créateur',
      isDevMode
        ? 'Voulez-vous désactiver le Mode Créateur ? Toutes les fonctionnalités Premium seront à nouveau verrouillées.'
        : 'Le Mode Créateur est actuellement activé. Toutes les fonctionnalités Premium sont débloquées.',
      isDevMode
        ? [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Désactiver',
              style: 'destructive',
              onPress: async () => {
                await disableDevMode();
                Alert.alert('🔒 Désactivé', 'Le Mode Créateur est désactivé.');
              },
            },
          ]
        : [{ text: 'OK', style: 'default' }]
    );
  };


  // Helper pour les lignes de menu
  const MenuRow = ({ icon: Icon, color, label, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDestructive ? '#3A1F1F' : `${color}20` }]}>
          <Icon size={20} color={isDestructive ? '#D32F2F' : color} strokeWidth={2.5} />
        </View>
        <View>
          <Text style={[styles.rowLabel, { color: textColor }, isDestructive && { color: '#D32F2F' }]}>{label}</Text>
          {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
        </View>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper noPadding>
      <Header title="Reglages" showBack onBack={onClose} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {/* AFFICHAGE */}
        <Text style={styles.sectionHeader}>AFFICHAGE</Text>

        {/* Sélecteur de langue */}
        <LanguageSelector />

        {/* Autres options d'affichage */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow
                icon={Palette}
                color={colors.accent}
                label="Apparence"
                value="Thèmes et personnalisation"
                onPress={() => router.push('/appearance')}
            />
            <MenuRow
                icon={Scale}
                color={colors.gold}
                label="Unité de poids"
                value={weightUnit === 'kg' ? 'Kilogrammes' : 'Livres'}
                onPress={() => setWeightUnitModalVisible(true)}
            />
            <MenuRow
                icon={TrendingDown}
                color={colors.gold}
                label="Unité de mesure"
                value={measurementUnit === 'cm' ? 'Centimètres' : 'Pouces'}
                onPress={() => setMeasurementUnitModalVisible(true)}
            />
        </View>

        {/* RAPPELS & NOTIFICATIONS */}
        <Text style={styles.sectionHeader}>RAPPELS & NOTIFICATIONS</Text>
        <ReminderSettingsComponent />

        {/* RAPPELS INTELLIGENTS */}
        <SmartRemindersSettings />

        {/* BRIEFING DU MATIN */}
        <BriefingSettings />

        {/* APPLE HEALTH */}
        <Text style={styles.sectionHeader}>APPLE HEALTH</Text>
        <HealthSyncSettings />

        {/* SYNCHRONISATION iCLOUD */}
        <Text style={styles.sectionHeader}>SYNCHRONISATION iCLOUD</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <View style={styles.icloudSection}>
            <View style={styles.icloudHeader}>
              <Cloud size={24} color={isiCloudSyncFeatureEnabled() ? colors.gold : '#888'} />
              <View style={styles.icloudHeaderText}>
                <Text style={[styles.icloudTitle, { color: colors.textPrimary }]}>
                  Sync iCloud
                </Text>
                <Text style={[styles.icloudStatus, { color: '#888' }]}>
                  {isiCloudSyncFeatureEnabled() ? 'Desactive' : 'Bientot disponible'}
                </Text>
              </View>
              <Switch
                value={false}
                disabled={true}
                trackColor={{ false: '#3e3e3e', true: colors.gold }}
                thumbColor={'#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>

            <View style={styles.icloudInfo}>
              <Text style={[styles.icloudInfoText, { color: colors.textSecondary }]}>
                {isiCloudSyncFeatureEnabled()
                  ? 'Synchronise automatiquement tes donnees entre iPhone, iPad et Mac.'
                  : 'La synchronisation iCloud sera disponible dans une prochaine mise a jour. Tes donnees seront synchronisees automatiquement entre tous tes appareils Apple.'}
              </Text>
            </View>

            {!isiCloudSyncFeatureEnabled() && (
              <View style={styles.icloudComingSoon}>
                <Sparkles size={16} color={colors.gold} />
                <Text style={[styles.icloudComingSoonText, { color: colors.gold }]}>
                  Prochainement disponible
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* SAUVEGARDE & RESTAURATION */}
        <Text style={styles.sectionHeader}>SAUVEGARDE & RESTAURATION</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <TouchableOpacity
              style={[styles.backupButton, { backgroundColor: colors.gold }]}
              onPress={handleExportJSON}
              activeOpacity={0.8}
            >
              <CloudUpload size={22} color="#FFFFFF" strokeWidth={2.5} />
              <View style={styles.backupButtonContent}>
                <Text style={styles.backupButtonTitle}>Sauvegarder (JSON)</Text>
                <Text style={styles.backupButtonSubtitle}>Pour réimporter dans l'app</Text>
              </View>
              <ChevronRight size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backupButton, { backgroundColor: '#10B981', marginTop: 12 }]}
              onPress={handleExportCSV}
              activeOpacity={0.8}
            >
              <FileText size={22} color="#FFFFFF" strokeWidth={2.5} />
              <View style={styles.backupButtonContent}>
                <Text style={styles.backupButtonTitle}>Exporter (CSV)</Text>
                <Text style={styles.backupButtonSubtitle}>Pour Excel, Numbers, Google Sheets</Text>
              </View>
              <ChevronRight size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backupButton, { backgroundColor: colors.accent, marginTop: 12 }]}
              onPress={handleImportJSON}
              activeOpacity={0.8}
            >
              <CloudDownload size={22} color="#FFFFFF" strokeWidth={2.5} />
              <View style={styles.backupButtonContent}>
                <Text style={styles.backupButtonTitle}>Restaurer (JSON)</Text>
                <Text style={styles.backupButtonSubtitle}>Importer une sauvegarde</Text>
              </View>
              <ChevronRight size={22} color="#FFFFFF" />
            </TouchableOpacity>
        </View>

        {/* MODE SCREENSHOT */}
        <Text style={styles.sectionHeader}>MODE SCREENSHOT 📸</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <TouchableOpacity
              style={[styles.screenshotButton, { backgroundColor: '#8B5CF6' }]}
              onPress={handleLoadScreenshotDemo}
              activeOpacity={0.8}
            >
              <Sparkles size={22} color="#FFFFFF" strokeWidth={2.5} />
              <View style={styles.screenshotButtonContent}>
                <Text style={styles.screenshotButtonTitle}>Charger données de démo</Text>
                <Text style={styles.screenshotButtonSubtitle}>Pour captures d'écran App Store</Text>
              </View>
              <ChevronRight size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.screenshotButton, { backgroundColor: '#64748B', marginTop: 12 }]}
              onPress={handleClearScreenshotDemo}
              activeOpacity={0.8}
            >
              <Trash2 size={22} color="#FFFFFF" strokeWidth={2.5} />
              <View style={styles.screenshotButtonContent}>
                <Text style={styles.screenshotButtonTitle}>Effacer les données démo</Text>
                <Text style={styles.screenshotButtonSubtitle}>Revenir à une app vierge</Text>
              </View>
              <ChevronRight size={22} color="#FFFFFF" />
            </TouchableOpacity>
        </View>

        {/* SÉCURITÉ DES DONNÉES */}
        <Text style={styles.sectionHeader}>SÉCURITÉ DES DONNÉES</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow
                icon={RefreshCw}
                color={colors.accent}
                label="Revoir l'onboarding"
                value="Écran d'accueil"
                onPress={handleResetOnboarding}
            />
            <MenuRow
                icon={Trash2}
                color="#D32F2F"
                label="Réinitialiser toutes les données"
                value="Supprimer définitivement tout"
                onPress={() => setResetModalVisible(true)}
                isDestructive={true}
            />
        </View>


        <View style={styles.offlineNotice}>
            <Text style={styles.offlineTitle}><ShieldCheck size={18} color="#4CAF50" /> Mode Confidentialité Totale</Text>
            <Text style={styles.offlineDescription}>
              Toutes vos données restent sur votre téléphone. Aucune information n'est envoyée vers un serveur externe. L'application fonctionne à 100% en mode avion.
            </Text>
          </View>

        {/* BIENTOT DISPONIBLE */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 24 }]}>BIENTOT DISPONIBLE</Text>
        <View style={[styles.comingSoonCard, { backgroundColor: colors.card }]}>
          <View style={styles.comingSoonIntro}>
            <View style={[styles.comingSoonIconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Sparkles size={24} color={colors.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
              Ces fonctionnalites arrivent bientot :
            </Text>
          </View>

          {/* iCloud */}
          <View style={[styles.comingSoonItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.comingSoonItemIcon, { backgroundColor: colors.info + '20' }]}>
              <Cloud size={20} color={colors.info} strokeWidth={2} />
            </View>
            <View style={styles.comingSoonItemContent}>
              <Text style={[styles.comingSoonItemTitle, { color: colors.textSecondary }]}>
                Synchronisation iCloud
              </Text>
              <Text style={[styles.comingSoonItemDesc, { color: colors.textMuted }]}>
                Sync automatique iPhone/iPad/Mac
              </Text>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.comingSoonBadgeText, { color: colors.gold }]}>Soon</Text>
            </View>
          </View>

          {/* Apple Watch */}
          <View style={[styles.comingSoonItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.comingSoonItemIcon, { backgroundColor: '#FF2D55' + '20' }]}>
              <Watch size={20} color="#FF2D55" strokeWidth={2} />
            </View>
            <View style={styles.comingSoonItemContent}>
              <Text style={[styles.comingSoonItemTitle, { color: colors.textSecondary }]}>
                Apple Watch
              </Text>
              <Text style={[styles.comingSoonItemDesc, { color: colors.textMuted }]}>
                Ton poids et streak au poignet
              </Text>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.comingSoonBadgeText, { color: colors.gold }]}>Soon</Text>
            </View>
          </View>

          {/* Siri */}
          <View style={[styles.comingSoonItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.comingSoonItemIcon, { backgroundColor: '#A855F7' + '20' }]}>
              <Mic size={20} color="#A855F7" strokeWidth={2} />
            </View>
            <View style={styles.comingSoonItemContent}>
              <Text style={[styles.comingSoonItemTitle, { color: colors.textSecondary }]}>
                Commandes Siri
              </Text>
              <Text style={[styles.comingSoonItemDesc, { color: colors.textMuted }]}>
                "Dis Siri, enregistre mon poids"
              </Text>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.comingSoonBadgeText, { color: colors.gold }]}>Soon</Text>
            </View>
          </View>

          {/* Apple Health */}
          <View style={[styles.comingSoonItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.comingSoonItemIcon, { backgroundColor: '#22C55E' + '20' }]}>
              <Heart size={20} color="#22C55E" strokeWidth={2} />
            </View>
            <View style={styles.comingSoonItemContent}>
              <Text style={[styles.comingSoonItemTitle, { color: colors.textSecondary }]}>
                Apple Health (ecriture)
              </Text>
              <Text style={[styles.comingSoonItemDesc, { color: colors.textMuted }]}>
                Envoyer les donnees vers Sante
              </Text>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.comingSoonBadgeText, { color: colors.gold }]}>Soon</Text>
            </View>
          </View>

          {/* Defis entre amis */}
          <View style={[styles.comingSoonItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.comingSoonItemIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <Users size={20} color="#F59E0B" strokeWidth={2} />
            </View>
            <View style={styles.comingSoonItemContent}>
              <Text style={[styles.comingSoonItemTitle, { color: colors.textSecondary }]}>
                Defis entre amis
              </Text>
              <Text style={[styles.comingSoonItemDesc, { color: colors.textMuted }]}>
                Affronte tes potes !
              </Text>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.comingSoonBadgeText, { color: colors.gold }]}>Soon</Text>
            </View>
          </View>

          {/* Dynamic Island */}
          <View style={[styles.comingSoonItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.comingSoonItemIcon, { backgroundColor: '#000000' + '30' }]}>
              <Smartphone size={20} color={colors.textPrimary} strokeWidth={2} />
            </View>
            <View style={styles.comingSoonItemContent}>
              <Text style={[styles.comingSoonItemTitle, { color: colors.textSecondary }]}>
                Dynamic Island
              </Text>
              <Text style={[styles.comingSoonItemDesc, { color: colors.textMuted }]}>
                Chrono toujours visible
              </Text>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.comingSoonBadgeText, { color: colors.gold }]}>Soon</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.7}>
            <Text style={styles.footerText}>Version 1.0.0</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>Yoroi - Health Tracker Pro</Text>

          {/* Badge Mode Créateur */}
          {isDevMode && (
            <TouchableOpacity
              onPress={handleToggleDevMode}
              style={[styles.devModeBadge, { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.devModeBadgeText, { color: colors.background }]}>🛠️ Mode Créateur Activé</Text>
            </TouchableOpacity>
          )}

          {/* Hidden Demo Data Button */}
          {showHiddenDemo && (
            <TouchableOpacity
              style={styles.hiddenDemoButton}
              onPress={handleLoadScreenshotDemo}
              activeOpacity={0.8}
            >
              <Sparkles size={18} color="#F59E0B" strokeWidth={2.5} />
              <Text style={styles.hiddenDemoButtonText}>Charger donnees App Store</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal Unité de poids */}
      <Modal visible={weightUnitModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setWeightUnitModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.backgroundElevated }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Unité de poids</Text>
              <TouchableOpacity onPress={() => setWeightUnitModalVisible(false)}>
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, weightUnit === 'kg' && styles.optionButtonActive]}
              onPress={() => {
                setWeightUnit('kg');
                saveUserSettings({ weight_unit: 'kg' });
                setWeightUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, weightUnit === 'kg' && styles.optionTextActive]}>Kilogrammes (kg)</Text>
              {weightUnit === 'kg' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, weightUnit === 'lbs' && styles.optionButtonActive]}
              onPress={() => {
                setWeightUnit('lbs');
                saveUserSettings({ weight_unit: 'lbs' });
                setWeightUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, weightUnit === 'lbs' && styles.optionTextActive]}>Livres (lbs)</Text>
              {weightUnit === 'lbs' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Unité de mesure */}
      <Modal visible={measurementUnitModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMeasurementUnitModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.backgroundElevated }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Unité de mesure</Text>
              <TouchableOpacity onPress={() => setMeasurementUnitModalVisible(false)}>
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, measurementUnit === 'cm' && styles.optionButtonActive]}
              onPress={() => {
                setMeasurementUnit('cm');
                saveUserSettings({ measurement_unit: 'cm' });
                setMeasurementUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, measurementUnit === 'cm' && styles.optionTextActive]}>Centimètres (cm)</Text>
              {measurementUnit === 'cm' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, measurementUnit === 'in' && styles.optionButtonActive]}
              onPress={() => {
                setMeasurementUnit('in');
                saveUserSettings({ measurement_unit: 'in' });
                setMeasurementUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, measurementUnit === 'in' && styles.optionTextActive]}>Pouces (inches)</Text>
              {measurementUnit === 'in' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Réinitialisation */}
      <Modal visible={resetModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setResetModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.backgroundElevated }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Réinitialiser les données</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={24} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Cette action supprimera définitivement toutes vos données (poids, mensurations, entraînements, photos, badges, paramètres). Cette action est irréversible.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleResetData}
              >
                <Text style={[styles.deleteButtonText, { color: '#FFFFFF' }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Ramadan Configuration */}
      <Modal visible={ramadanModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRamadanModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.backgroundElevated }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Moon size={20} color={colors.accent} strokeWidth={2} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Horaires Ramadan</Text>
              </View>
              <TouchableOpacity onPress={() => setRamadanModalVisible(false)}>
                <X size={24} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View style={styles.ramadanFormRow}>
              <Text style={[styles.ramadanFormLabel, { color: textColor }]}>Fajr (debut jeune)</Text>
              <TextInput
                style={[styles.ramadanTimeInput, { color: textColor, backgroundColor: colors.cardHover }]}
                value={ramadanFajrTime}
                onChangeText={setRamadanFajrTime}
                placeholder="05:30"
                keyboardType="default"
              />
            </View>

            <View style={styles.ramadanFormRow}>
              <Text style={[styles.ramadanFormLabel, { color: textColor }]}>Maghrib (fin jeune)</Text>
              <TextInput
                style={[styles.ramadanTimeInput, { color: textColor, backgroundColor: colors.cardHover }]}
                value={ramadanMaghribTime}
                onChangeText={setRamadanMaghribTime}
                placeholder="19:45"
                keyboardType="default"
              />
            </View>

            <View style={styles.ramadanFormRow}>
              <Text style={[styles.ramadanFormLabel, { color: textColor }]}>Objectif hydratation (L)</Text>
              <TextInput
                style={[styles.ramadanTimeInput, { color: textColor, backgroundColor: colors.cardHover }]}
                value={ramadanHydrationGoal}
                onChangeText={setRamadanHydrationGoal}
                placeholder="3"
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.ramadanFormHint, { color: colors.textSecondary }]}>
              Ces horaires sont utilises pour determiner les periodes de jeune et d'hydratation.
            </Text>

            <TouchableOpacity
              style={[styles.ramadanSaveButton, { backgroundColor: colors.gold }]}
              onPress={async () => {
                await saveRamadanSettings({
                  fajrTime: ramadanFajrTime,
                  maghribTime: ramadanMaghribTime,
                  hydrationGoal: parseFloat(ramadanHydrationGoal) || 3,
                });
                setRamadanModalVisible(false);
                Alert.alert('Horaires sauvegardes', 'Les horaires ont ete mis a jour.');
              }}
            >
              <Text style={styles.ramadanSaveButtonText}>Sauvegarder</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Badges */}
      <BadgesScreen
        visible={badgesModalVisible}
        onClose={() => setBadgesModalVisible(false)}
      />


      {/* Modal Partenaires */}
      <PartnersScreen
        visible={partnersModalVisible}
        onClose={() => setPartnersModalVisible(false)}
      />

      {/* Modal Clubs Management */}
      <ClubsManagementModal
        visible={clubsModalVisible}
        onClose={() => {
          setClubsModalVisible(false);
          setEditingClub(null);
        }}
        userClubs={userClubs}
        onClubsChange={async (clubs) => {
          setUserClubs(clubs);
          await fetchSettings();
        }}
        editingClub={editingClub}
        setEditingClub={setEditingClub}
        newClubName={newClubName}
        setNewClubName={setNewClubName}
        newClubType={newClubType}
        setNewClubType={setNewClubType}
        newClubLogo={newClubLogo}
        setNewClubLogo={setNewClubLogo}
      />

      {/* Modal Gestion Équipements */}
      <GearManagementModal
        visible={gearModalVisible}
        onClose={() => {
          setGearModalVisible(false);
          setEditingGear(null);
          setNewGearName('');
          setNewGearBrand('');
          setNewGearType('kimono');
          setNewGearPhoto(null);
        }}
        userGear={userGear}
        onGearChange={async (gear) => {
          setUserGear(gear);
          await fetchSettings();
        }}
        editingGear={editingGear}
        setEditingGear={setEditingGear}
        newGearName={newGearName}
        setNewGearName={setNewGearName}
        newGearBrand={newGearBrand}
        setNewGearBrand={setNewGearBrand}
        newGearType={newGearType}
        setNewGearType={setNewGearType}
        newGearPhoto={newGearPhoto}
        setNewGearPhoto={setNewGearPhoto}
      />
    </ScreenWrapper>
  );
}

// ============================================
// 🎒 MODAL GEAR MANAGEMENT
// ============================================
function GearManagementModal({ 
  visible, 
  onClose, 
  userGear,
  onGearChange,
  editingGear,
  setEditingGear,
  newGearName,
  setNewGearName,
  newGearBrand,
  setNewGearBrand,
  newGearType,
  setNewGearType,
  newGearPhoto,
  setNewGearPhoto,
}: { 
  visible: boolean; 
  onClose: () => void;
  userGear: UserGear[];
  onGearChange: (gear: UserGear[]) => Promise<void>;
  editingGear: UserGear | null;
  setEditingGear: (gear: UserGear | null) => void;
  newGearName: string;
  setNewGearName: (name: string) => void;
  newGearBrand: string;
  setNewGearBrand: (brand: string) => void;
  newGearType: 'kimono' | 'chaussure' | 'gants' | 'protections' | 'autre';
  setNewGearType: (type: 'kimono' | 'chaussure' | 'gants' | 'protections' | 'autre') => void;
  newGearPhoto: string | null;
  setNewGearPhoto: (photo: string | null) => void;
}) {
  const { colors, isDark } = useTheme();
  const textColor = colors.textPrimary;
  const cardBackground = colors.card;

  const GEAR_TYPES: { key: string; label: string; iconComponent: LucideIcon }[] = [
    { key: 'kimono', label: 'Kimono', iconComponent: Shirt },
    { key: 'chaussure', label: 'Chaussures', iconComponent: Footprints },
    { key: 'gants', label: 'Gants', iconComponent: ActivityIcon },
    { key: 'protections', label: 'Protections', iconComponent: Shield },
    { key: 'autre', label: 'Autre', iconComponent: ShoppingBag },
  ];

  const pickGearPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewGearPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo.');
    }
  };

  const handleSaveGear = async () => {
    if (!newGearName.trim()) {
      Alert.alert('Nom requis', 'Veuillez entrer un nom pour votre équipement.');
      return;
    }
    if (!newGearBrand.trim()) {
      Alert.alert('Marque requise', 'Veuillez entrer une marque/modèle.');
      return;
    }

    try {
      if (editingGear) {
        // Mettre à jour
        await updateUserGear(editingGear.id, {
          name: newGearName,
          brand: newGearBrand,
          type: newGearType,
          photoUri: newGearPhoto,
        });
      } else {
        // Créer nouveau
        await addUserGear({
          name: newGearName,
          brand: newGearBrand,
          type: newGearType,
          photoUri: newGearPhoto,
        });
      }
      
      const updatedGear = await getUserGear();
      await onGearChange(updatedGear);
      
      setEditingGear(null);
      setNewGearName('');
      setNewGearBrand('');
      setNewGearType('kimono');
      setNewGearPhoto(null);
      
      Alert.alert('✅ Succès', editingGear ? 'Équipement modifié !' : 'Équipement ajouté !');
    } catch (error) {
      console.error('Erreur sauvegarde équipement:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'équipement.');
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    Alert.alert(
      'Supprimer l\'équipement',
      'Êtes-vous sûr de vouloir supprimer cet équipement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteUserGear(gearId);
            const updatedGear = await getUserGear();
            await onGearChange(updatedGear);
          },
        },
      ]
    );
  };

  const startEditing = (gear: UserGear) => {
    setEditingGear(gear);
    setNewGearName(gear.name);
    setNewGearBrand(gear.brand);
    setNewGearType(gear.type);
    setNewGearPhoto(gear.photoUri || null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.clubsModalContainer, { backgroundColor: cardBackground }]}>
          <View style={styles.clubsModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.clubsModalCloseButton}>
              <X size={24} color={textColor} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>Mes Équipements</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: 20, paddingBottom: 90 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Liste des équipements existants */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor }]}>MES ÉQUIPEMENTS</Text>
            <View style={styles.clubsList}>
              {userGear.map((gear) => {
                const gearType = GEAR_TYPES.find(t => t.key === gear.type);
                const GearIcon = gearType?.iconComponent || ShoppingBag;
                return (
                  <View key={gear.id} style={[styles.clubItem, { backgroundColor: colors.cardHover }]}>
                    <View style={styles.clubItemLeft}>
                      {gear.photoUri ? (
                        <Image source={{ uri: gear.photoUri }} style={styles.clubItemLogo} />
                      ) : (
                        <View style={[styles.clubItemLogo, styles.clubItemLogoPlaceholder, { backgroundColor: colors.backgroundElevated }]}>
                          <GearIcon size={24} color={colors.accent} strokeWidth={2} />
                        </View>
                      )}
                      <View style={styles.clubItemInfo}>
                        <Text style={[styles.clubItemName, { color: textColor }]}>{gear.name}</Text>
                        <Text style={[styles.clubItemType, { color: colors.textSecondary }]}>
                          {gear.brand} • {gearType?.label || 'Autre'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.clubItemActions}>
                      <TouchableOpacity
                        onPress={() => startEditing(gear)}
                        style={styles.clubEditButton}
                      >
                        <Text style={styles.clubEditText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteGear(gear.id)}
                        style={styles.clubDeleteButton}
                      >
                        <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Formulaire d'ajout/édition */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor, marginTop: 32 }]}>
              {editingGear ? 'MODIFIER L\'ÉQUIPEMENT' : 'AJOUTER UN ÉQUIPEMENT'}
            </Text>
            <View style={[styles.addClubForm, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.clubNameInput, { color: textColor, backgroundColor: cardBackground }]}
                placeholder="Nom (ex: Kimono Blanc)"
                placeholderTextColor={isDark ? '#9E9E9E' : '#9CA3AF'}
                value={newGearName}
                onChangeText={setNewGearName}
              />

              <TextInput
                style={[styles.clubNameInput, { color: textColor, backgroundColor: cardBackground, marginTop: 12 }]}
                placeholder="Marque/Modèle (ex: Gracie Barra)"
                placeholderTextColor={isDark ? '#9E9E9E' : '#9CA3AF'}
                value={newGearBrand}
                onChangeText={setNewGearBrand}
              />

              {/* Sélecteur de type */}
              <Text style={[styles.clubFormLabel, { color: textColor, marginTop: 12 }]}>Type</Text>
              <View style={styles.clubTypesGrid}>
                {GEAR_TYPES.map((type) => {
                  const TypeIcon = type.iconComponent;
                  const isSelected = newGearType === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.clubTypeButton,
                        { backgroundColor: isSelected ? colors.gold : colors.card },
                      ]}
                      onPress={() => setNewGearType(type.key as any)}
                      activeOpacity={0.7}
                    >
                      <TypeIcon size={20} color={isSelected ? colors.background : colors.accent} strokeWidth={2} />
                      <Text style={[
                        styles.clubTypeLabel,
                        { color: isSelected ? colors.background : textColor }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Photo */}
              <Text style={[styles.clubFormLabel, { color: textColor, marginTop: 12 }]}>Photo</Text>
              <TouchableOpacity
                style={[styles.logoPickerButton, { backgroundColor: cardBackground }]}
                onPress={pickGearPhoto}
                activeOpacity={0.7}
              >
                {newGearPhoto ? (
                  <Image source={{ uri: newGearPhoto }} style={styles.logoPreview} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Award size={32} color={isDark ? '#9E9E9E' : '#9CA3AF'} />
                    <Text style={[styles.logoPlaceholderText, { color: isDark ? '#9E9E9E' : '#9CA3AF' }]}>
                      Choisir une photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Bouton sauvegarder */}
              <TouchableOpacity
                style={[styles.saveClubButton, { backgroundColor: colors.gold }]}
                onPress={handleSaveGear}
                activeOpacity={0.7}
              >
                <Text style={styles.saveClubText}>
                  {editingGear ? 'Modifier' : 'Ajouter'}
                </Text>
              </TouchableOpacity>

              {editingGear && (
                <TouchableOpacity
                  style={[styles.cancelButton, { marginTop: 12 }]}
                  onPress={() => {
                    setEditingGear(null);
                    setNewGearName('');
                    setNewGearBrand('');
                    setNewGearType('kimono');
                    setNewGearPhoto(null);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================
// 🏋️ MODAL CLUBS MANAGEMENT
// ============================================
function ClubsManagementModal({ 
  visible, 
  onClose, 
  userClubs,
  onClubsChange,
  editingClub,
  setEditingClub,
  newClubName,
  setNewClubName,
  newClubType,
  setNewClubType,
  newClubLogo,
  setNewClubLogo,
}: { 
  visible: boolean; 
  onClose: () => void;
  userClubs: UserClub[];
  onClubsChange: (clubs: UserClub[]) => Promise<void>;
  editingClub: UserClub | null;
  setEditingClub: (club: UserClub | null) => void;
  newClubName: string;
  setNewClubName: (name: string) => void;
  newClubType: 'gracie_barra' | 'basic_fit' | 'running' | 'mma' | 'foot' | 'other';
  setNewClubType: (type: 'gracie_barra' | 'basic_fit' | 'running' | 'mma' | 'foot' | 'other') => void;
  newClubLogo: string | null;
  setNewClubLogo: (logo: string | null) => void;
}) {
  const { colors, isDark } = useTheme();
  const textColor = colors.textPrimary;
  const cardBackground = colors.card;

  const CLUB_TYPES: { key: string; label: string; iconComponent: LucideIcon }[] = [
    { key: 'gracie_barra', label: 'JJB', iconComponent: Shirt },
    { key: 'basic_fit', label: 'Muscu', iconComponent: DumbbellIcon },
    { key: 'running', label: 'Running', iconComponent: Footprints },
    { key: 'mma', label: 'MMA', iconComponent: ActivityIcon },
    { key: 'foot', label: 'Foot', iconComponent: CircleDot },
    { key: 'other', label: 'Autre', iconComponent: Building2 },
  ];

  const pickClubLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewClubLogo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection logo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le logo.');
    }
  };

  const handleSaveClub = async () => {
    if (!newClubName.trim()) {
      Alert.alert('Nom requis', 'Veuillez entrer un nom pour votre club.');
      return;
    }

    try {
      if (editingClub) {
        // Mettre à jour
        await updateUserClub(editingClub.id, {
          name: newClubName,
          type: newClubType,
          logoUri: newClubLogo,
        });
      } else {
        // Créer nouveau
        await addUserClub({
          name: newClubName,
          type: newClubType,
          logoUri: newClubLogo,
        });
      }
      
      const updatedClubs = await getUserClubs();
      await onClubsChange(updatedClubs);
      
      setEditingClub(null);
      setNewClubName('');
      setNewClubType('basic_fit');
      setNewClubLogo(null);
      
      Alert.alert('✅ Succès', editingClub ? 'Club modifié !' : 'Club ajouté !');
    } catch (error) {
      console.error('Erreur sauvegarde club:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le club.');
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    Alert.alert(
      'Supprimer le club',
      'Êtes-vous sûr de vouloir supprimer ce club ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteUserClub(clubId);
            const updatedClubs = await getUserClubs();
            await onClubsChange(updatedClubs);
          },
        },
      ]
    );
  };

  const startEditing = (club: UserClub) => {
    setEditingClub(club);
    setNewClubName(club.name);
    setNewClubType(club.type);
    setNewClubLogo(club.logoUri || null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.clubsModalContainer, { backgroundColor: cardBackground }]}>
          <View style={styles.clubsModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.clubsModalCloseButton}>
              <X size={24} color={textColor} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>Clubs & Coach</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: 20, paddingBottom: 90 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Liste des clubs existants */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor }]}>MES CLUBS</Text>
            <View style={styles.clubsList}>
              {userClubs.map((club) => {
                const clubType = CLUB_TYPES.find(t => t.key === club.type);
                const ClubIcon = clubType?.iconComponent || Building2;
                return (
                  <View key={club.id} style={[styles.clubItem, { backgroundColor: colors.cardHover }]}>
                    <View style={styles.clubItemLeft}>
                      {club.logoUri ? (
                        <Image source={{ uri: club.logoUri }} style={styles.clubItemLogo} />
                      ) : (
                        <View style={[styles.clubItemLogo, styles.clubItemLogoPlaceholder, { backgroundColor: colors.backgroundElevated }]}>
                          <ClubIcon size={24} color={colors.accent} strokeWidth={2} />
                        </View>
                      )}
                      <View style={styles.clubItemInfo}>
                        <Text style={[styles.clubItemName, { color: textColor }]}>{club.name}</Text>
                        <Text style={[styles.clubItemType, { color: colors.textSecondary }]}>
                          {clubType?.label || 'Autre'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.clubItemActions}>
                      <TouchableOpacity
                        onPress={() => startEditing(club)}
                        style={styles.clubEditButton}
                      >
                        <Text style={styles.clubEditText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteClub(club.id)}
                        style={styles.clubDeleteButton}
                      >
                        <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Formulaire d'ajout/édition */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor, marginTop: 32 }]}>
              {editingClub ? 'MODIFIER LE CLUB' : 'AJOUTER UN CLUB'}
            </Text>
            <View style={[styles.addClubForm, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.clubNameInput, { color: textColor, backgroundColor: cardBackground }]}
                placeholder="Nom du club (ex: Marseille Fight Club)"
                placeholderTextColor={isDark ? '#9E9E9E' : '#9CA3AF'}
                value={newClubName}
                onChangeText={setNewClubName}
              />

              {/* Sélecteur de type */}
              <Text style={[styles.clubFormLabel, { color: textColor }]}>Type</Text>
              <View style={styles.clubTypesGrid}>
                {CLUB_TYPES.map((type) => {
                  const TypeIcon = type.iconComponent;
                  const isSelected = newClubType === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.clubTypeButton,
                        { backgroundColor: isSelected ? colors.gold : colors.card },
                      ]}
                      onPress={() => setNewClubType(type.key as any)}
                      activeOpacity={0.7}
                    >
                      <TypeIcon size={20} color={isSelected ? colors.background : colors.accent} strokeWidth={2} />
                      <Text style={[
                        styles.clubTypeLabel,
                        { color: isSelected ? colors.background : textColor }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Logo */}
              <Text style={[styles.clubFormLabel, { color: textColor }]}>Logo</Text>
              <TouchableOpacity
                style={[styles.logoPickerButton, { backgroundColor: cardBackground }]}
                onPress={pickClubLogo}
                activeOpacity={0.7}
              >
                {newClubLogo ? (
                  <Image source={{ uri: newClubLogo }} style={styles.logoPreview} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Award size={32} color={isDark ? '#9E9E9E' : '#9CA3AF'} />
                    <Text style={[styles.logoPlaceholderText, { color: isDark ? '#9E9E9E' : '#9CA3AF' }]}>
                      Choisir un logo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Boutons d'action */}
              <View style={styles.clubFormActions}>
                {editingClub && (
                  <TouchableOpacity
                    style={styles.cancelClubButton}
                    onPress={() => {
                      setEditingClub(null);
                      setNewClubName('');
                      setNewClubType('basic_fit');
                      setNewClubLogo(null);
                    }}
                  >
                    <Text style={styles.cancelClubText}>Annuler</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveClubButton, !newClubName.trim() && styles.saveClubButtonDisabled]}
                  onPress={handleSaveClub}
                  disabled={!newClubName.trim()}
                >
                  <Text style={styles.saveClubText}>
                    {editingClub ? 'Enregistrer' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 90,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#636E72',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    minWidth: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginLeft: 60, // IconContainer width + gap
  },
  offlineNotice: {
    backgroundColor: '#E8F8F5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  offlineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B894',
    letterSpacing: 0.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#636E72',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636E72',
    letterSpacing: 0.2,
  },
  devModeBadge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  devModeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#636E72',
    lineHeight: 22,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#E8F4FD',
    borderColor: '#4D96FF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  optionTextActive: {
    color: '#4D96FF',
    fontWeight: '700',
  },
  // Color Theme Selector
  colorOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
    borderWidth: 2,
    gap: 12,
  },
  colorOptionButtonActive: {
    backgroundColor: '#FEFCE8',
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionInfo: {
    flex: 1,
  },
  colorOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636E72',
    letterSpacing: -0.2,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  // Logos personnalisés
  logosPreview: {
    paddingTop: 16,
    gap: 12,
  },
  logoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  logoPreviewOld: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8EDF2',
  },
  logoLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  // Clubs Management Modal Styles
  clubsModalScroll: {
    flex: 1,
  },
  clubsModalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  clubsModalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#636E72',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  clubsList: {
    gap: 12,
  },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  clubItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clubItemLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8EDF2',
  },
  clubItemLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  clubItemLogoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#007AFF',
  },
  clubsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  clubPreviewItem: {
    alignItems: 'center',
    gap: 4,
  },
  clubPreviewLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  clubPreviewPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubPreviewName: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 60,
  },
  clubPreviewMore: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  clubItemInfo: {
    flex: 1,
  },
  clubItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 2,
  },
  clubItemType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#636E72',
  },
  clubItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clubEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
  },
  clubEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  clubDeleteButton: {
    padding: 6,
  },
  addClubForm: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  clubNameInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  clubFormLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  clubTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  clubTypeButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  clubTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  clubTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoPickerButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    minHeight: 120,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clubFormActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelClubButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelClubText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  saveClubButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveClubButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  saveClubText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addCustomButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EDEF',
    borderStyle: 'dashed',
  },
  addCustomButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  customInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  customNameInput: {
    backgroundColor: '#E8EDF2',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    borderWidth: 1,
    borderColor: '#E8EDEF',
  },
  customInputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  customCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
    alignItems: 'center',
  },
  customCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636E72',
  },
  customAddButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  customAddText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  teamPhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Clubs Management Modal Styles
  clubsModalContainer: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },
  clubsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clubsModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  // Hidden Demo Button
  hiddenDemoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1510',
    borderWidth: 2,
    borderColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  hiddenDemoButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Screenshot Mode Buttons
  screenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
  },
  screenshotButtonContent: {
    flex: 1,
  },
  screenshotButtonTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  screenshotButtonSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Backup/Restore Section
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  backupButtonContent: {
    flex: 1,
  },
  backupButtonTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backupButtonSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  // iCloud Sync Section
  icloudSection: {
    padding: 16,
  },
  icloudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icloudHeaderText: {
    flex: 1,
  },
  icloudTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  icloudStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  icloudInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  icloudInfoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  icloudComingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  icloudComingSoonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Ramadan Mode Styles
  ramadanSection: {
    padding: 16,
  },
  ramadanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ramadanIcon: {
    fontSize: 28,
  },
  ramadanHeaderText: {
    flex: 1,
  },
  ramadanTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  ramadanStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  ramadanInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  ramadanInfoText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  ramadanFeatures: {
    gap: 4,
  },
  ramadanFeature: {
    fontSize: 13,
    lineHeight: 20,
  },
  ramadanConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  ramadanConfigText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ramadanSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ramadanSuggestionText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  ramadanFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ramadanFormLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  ramadanTimeInput: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ramadanFormHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  ramadanSaveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ramadanSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },

  // ============================================
  // STYLES THEMES SPECIAUX
  // ============================================
  themeSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  themeOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  themeOptionButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  themeOptionLocked: {
    opacity: 0.7,
  },
  themePreviewContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  themePreviewBg: {
    flex: 1,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themePreviewCard: {
    width: '90%',
    height: '70%',
    borderRadius: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  themePreviewAccent: {
    width: '60%',
    height: 6,
    borderRadius: 3,
  },
  themeOptionInfo: {
    flex: 1,
  },
  themeOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  themeOptionDesc: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  themeLockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  themeProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  themeProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  themeProgressText: {
    fontSize: 10,
    fontWeight: '600',
    minWidth: 30,
  },
  themeFullPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  themeFullPreviewCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  themeFullPreviewTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  themeFullPreviewAccent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  themeFullPreviewText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ============================================
  // STYLES CELEBRATION DEBLOCAGE
  // ============================================
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  celebrationContent: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '90%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  celebrationName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  celebrationDesc: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  celebrationPreview: {
    width: 100,
    height: 80,
    borderRadius: 12,
    padding: 8,
    marginBottom: 24,
  },
  celebrationPreviewCard: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  celebrationPreviewAccent: {
    width: '50%',
    height: 8,
    borderRadius: 4,
  },
  celebrationButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  celebrationButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // ============================================
  // STYLES COMING SOON
  // ============================================
  comingSoonCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  comingSoonIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  comingSoonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  comingSoonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    opacity: 0.7,
  },
  comingSoonItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  comingSoonItemContent: {
    flex: 1,
  },
  comingSoonItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  comingSoonItemDesc: {
    fontSize: 12,
    fontWeight: '400',
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comingSoonFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  feedbackIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonFeedbackText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Sport Info
  sportInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sportInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  sportInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportInfoValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Confirm Button
  confirmButton: {
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Text Input
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});