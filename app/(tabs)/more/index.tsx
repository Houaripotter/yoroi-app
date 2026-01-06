import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Camera,
  Settings,
  MessageCircle,
  Star,
  ChevronRight,
  Building2,
  Ruler,
  Download,
  Upload,
  Lock,
  Share2,
  FileText,
  LucideIcon,
  Utensils,
  Timer,
  Calculator,
  Apple,
  Lightbulb,
  Activity,
  BookOpen,
  Palette,
  Sparkles,
  Heart,
  Shield,
  Zap,
  Crown,
  Trophy,
  Target,
  FlaskConical,
  LayoutDashboard,
  Sliders,
  Info,
  Scale,
  X,
  Swords,
  Droplet,
  TrendingDown,
  Calendar,
  Award,
  Bell,
  Watch,
  Globe,
  RefreshCw,
  Moon,
  Trash2,
  Search,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON, exportDataToCSV, exportTrainingsToCSV, exportTrainingsToExcelCSV } from '@/lib/exportService';
import { scale, scaleModerate } from '@/constants/responsive';
import { importAllData } from '@/lib/exportService';
import { generateProgressPDF } from '@/lib/pdfExport';
import { getWeightCategoriesBySportAndGender, WeightCategory, sportHasWeightCategories } from '@/lib/weightCategories';
import { UserMode, Sport, SPORT_LABELS } from '@/lib/fighterMode';
import { getUserMode, setUserMode as saveUserMode } from '@/lib/fighterModeService';
import { resetAllData } from '@/lib/storage';
// Screenshot mode is now handled via /screenshot-mode route only
import logger from '@/lib/security/logger';

// ============================================
// ECRAN PLUS - DESIGN MODERNE
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuickAction {
  id: string;
  label: string;
  Icon: LucideIcon;
  route?: string;
  onPress?: () => void;
  gradient: readonly [string, string, ...string[]];
}

interface MenuItem {
  id: string;
  label: string;
  sublabel?: string;
  Icon: LucideIcon;
  route?: string;
  onPress?: () => void;
  iconColor?: string;
  iconBg?: string;
}

// ============================================
// ACTIONS RAPIDES (Grille en haut - Défilable)
// ============================================
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'timer',
    label: 'Timer',
    Icon: Timer,
    route: '/timer',
    gradient: ['#4ECDC4', '#3DBDB5'],
  },
  {
    id: 'calculator',
    label: 'Calculateurs',
    Icon: Calculator,
    route: '/calculators',
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    id: 'fasting',
    label: 'Jeûne',
    Icon: Utensils,
    route: '/fasting',
    gradient: ['#A855F7', '#9333EA'],
  },
  {
    id: 'training-journal',
    label: 'Carnet',
    Icon: BookOpen,
    route: '/training-journal',
    gradient: ['#F97316', '#EA580C'],
  },
  {
    id: 'lab',
    label: 'Savoir',
    Icon: FlaskConical,
    route: '/savoir',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    Icon: Apple,
    route: '/nutrition-plan',
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'share-hub',
    label: 'Partager',
    Icon: Share2,
    route: '/share-hub',
    gradient: ['#EC4899', '#BE185D'],
  },
  {
    id: 'profile',
    label: 'Profil',
    Icon: User,
    route: '/profile',
    gradient: ['#60A5FA', '#3B82F6'],
  },
  {
    id: 'photos',
    label: 'Photos',
    Icon: Camera,
    route: '/photos',
    gradient: ['#F472B6', '#EC4899'],
  },
  {
    id: 'appearance',
    label: 'Thèmes',
    Icon: Palette,
    route: '/appearance',
    gradient: ['#A78BFA', '#8B5CF6'],
  },
];

// ============================================
// SECTION PROFIL & APPARENCE
// ============================================
const PROFILE_ITEMS: MenuItem[] = [
  {
    id: 'profile',
    label: 'Mon Profil',
    sublabel: 'Informations personnelles',
    Icon: User,
    route: '/profile',
    iconColor: '#60A5FA',
    iconBg: '#60A5FA20',
  },
  {
    id: 'photos',
    label: 'Transformation',
    sublabel: 'Photos avant/après',
    Icon: Camera,
    route: '/photos',
    iconColor: '#F472B6',
    iconBg: '#F472B620',
  },
  {
    id: 'dojo',
    label: 'Mon Dojo',
    sublabel: 'XP, badges, avatars et défis',
    Icon: Sparkles,
    route: '/gamification',
    iconColor: '#FBBF24',
    iconBg: '#FBBF2420',
  },
  {
    id: 'competitor',
    label: 'Espace Compétiteur',
    sublabel: 'Compétitions, palmarès, cut',
    Icon: Swords,
    route: '/competitor-space',
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
];

// ============================================
// SECTION OUTILS
// ============================================
const TOOLS_ITEMS: MenuItem[] = [
  {
    id: 'timer',
    label: 'Timer',
    sublabel: 'Chrono musculation, combat, HIIT',
    Icon: Timer,
    route: '/timer',
    iconColor: '#4ECDC4',
    iconBg: '#4ECDC420',
  },
  {
    id: 'calculator',
    label: 'Calculateurs',
    sublabel: 'Macros, IMC, calories',
    Icon: Calculator,
    route: '/calculators',
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
  {
    id: 'fasting',
    label: 'Jeûne',
    sublabel: 'Intermittent, OMAD, Ramadan, Kippur',
    Icon: Utensils,
    route: '/fasting',
    iconColor: '#A855F7',
    iconBg: '#A855F720',
  },
  {
    id: 'lab',
    label: 'Savoir',
    sublabel: 'Dormir moins bête · Peer-reviewed',
    Icon: FlaskConical,
    route: '/savoir',
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    sublabel: 'Plan personnalisé',
    Icon: Apple,
    route: '/nutrition-plan',
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'share-hub',
    label: 'Partager ma progression',
    sublabel: '6 cartes pour réseaux sociaux',
    Icon: Share2,
    route: '/share-hub',
    iconColor: '#EC4899',
    iconBg: '#EC489920',
  },
];

// ============================================
// SECTION COMMUNAUTÉ
// ============================================
const COMMUNITY_ITEMS: MenuItem[] = [
  {
    id: 'clubs',
    label: 'Clubs & Coach',
    sublabel: 'Partenaires et salles',
    Icon: Building2,
    route: '/partners',
    iconColor: '#818CF8',
    iconBg: '#818CF820',
  },
  {
    id: 'health-pros',
    label: 'Pros de Santé',
    sublabel: 'Kinés, nutritionnistes',
    Icon: Heart,
    route: '/partners',
    iconColor: '#F87171',
    iconBg: '#F8717120',
  },
];

// ============================================
// SECTION AFFICHAGE
// ============================================
const DISPLAY_ITEMS: MenuItem[] = [
  {
    id: 'appearance',
    label: 'Apparence',
    sublabel: 'Thèmes et personnalisation',
    Icon: Palette,
    route: '/appearance',
    iconColor: '#A78BFA',
    iconBg: '#A78BFA20',
  },
  {
    id: 'preferences',
    label: 'Unités',
    sublabel: 'Kg/Lbs, Cm/Inches',
    Icon: Sliders,
    onPress: () => {},
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
  {
    id: 'screenshot-mode',
    label: 'Mode Screenshot',
    sublabel: 'Données démo pour captures',
    Icon: Camera,
    route: '/screenshot-mode',
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
];

// ============================================
// SECTION RAPPELS & NOTIFICATIONS
// ============================================
const REMINDERS_ITEMS: MenuItem[] = [
  {
    id: 'reminders',
    label: 'Rappels',
    sublabel: 'Entraînement, hydratation',
    Icon: Bell,
    onPress: () => {},
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
  {
    id: 'smart-reminders',
    label: 'Rappels Intelligents',
    sublabel: 'Adaptés à ton rythme',
    Icon: Zap,
    onPress: () => {},
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'briefing',
    label: 'Briefing du Matin',
    sublabel: 'Résumé quotidien',
    Icon: Settings,
    onPress: () => {},
    iconColor: '#06B6D4',
    iconBg: '#06B6D420',
  },
];

// ============================================
// SECTION APPLE HEALTH
// ============================================
const HEALTH_ITEMS: MenuItem[] = [
  {
    id: 'health-sync',
    label: 'Apple Health',
    sublabel: 'Synchronise tes données santé',
    Icon: Watch,
    route: '/health-connect',
    iconColor: '#EC4899',
    iconBg: '#EC489920',
  },
];


// ============================================
// SECTION SAUVEGARDE & RESTAURATION
// ============================================
const BACKUP_ITEMS: MenuItem[] = [
  {
    id: 'icloud-sync',
    label: 'Sync iCloud',
    sublabel: 'Sauvegarde automatique',
    Icon: RefreshCw,
    onPress: () => {},
    iconColor: '#3B82F6',
    iconBg: '#3B82F620',
  },
  {
    id: 'exportPdf',
    label: 'Rapport PDF',
    sublabel: 'Pour médecin ou coach',
    Icon: FileText,
    onPress: () => {},
    iconColor: '#F97316',
    iconBg: '#F9731620',
  },
  {
    id: 'export',
    label: 'Exporter',
    sublabel: 'Sauvegarder tes données',
    Icon: Download,
    onPress: () => {},
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'import',
    label: 'Importer',
    sublabel: 'Restaurer un backup',
    Icon: Upload,
    onPress: () => {},
    iconColor: '#6366F1',
    iconBg: '#6366F120',
  },
];


// ============================================
// SECTION SÉCURITÉ
// ============================================
const SECURITY_ITEMS: MenuItem[] = [
  {
    id: 'tutorial',
    label: 'Revoir le Tutoriel',
    sublabel: 'Découvre toutes les fonctionnalités',
    Icon: Info,
    onPress: () => {},
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'reset-all',
    label: 'Réinitialiser Tout',
    sublabel: 'Effacer toutes les données',
    Icon: Trash2,
    onPress: () => {},
    iconColor: '#EF4444',
    iconBg: '#EF444420',
  },
];

// ============================================
// SECTION SUPPORT
// ============================================
const SUPPORT_ITEMS: MenuItem[] = [
  {
    id: 'ideas',
    label: 'Boîte à idées',
    sublabel: 'Proposer des idées et signaler des bugs',
    Icon: Lightbulb,
    onPress: () => {},
    iconColor: '#FCD34D',
    iconBg: '#FCD34D20',
  },
  {
    id: 'rate',
    label: "Noter l'App",
    sublabel: 'Laisse un avis sur l\'App Store',
    Icon: Star,
    onPress: () => {},
    iconColor: '#FBBF24',
    iconBg: '#FBBF2420',
  },
  {
    id: 'contact',
    label: 'Contact',
    sublabel: 'Questions ou suggestions',
    Icon: MessageCircle,
    onPress: () => {},
    iconColor: '#14B8A6',
    iconBg: '#14B8A620',
  },
];

// Liste complète des fonctionnalités pour la recherche
const ALL_FEATURES: MenuItem[] = [
  ...PROFILE_ITEMS,
  ...TOOLS_ITEMS,
  ...COMMUNITY_ITEMS,
  ...DISPLAY_ITEMS,
  ...REMINDERS_ITEMS,
  ...HEALTH_ITEMS,
  ...BACKUP_ITEMS,
  ...SUPPORT_ITEMS,
  ...SECURITY_ITEMS,
];

// Mots-clés supplémentaires pour améliorer la recherche
const SEARCH_KEYWORDS: Record<string, string[]> = {
  'timer': ['chrono', 'chronometre', 'temps', 'round', 'hiit', 'tabata'],
  'calculator': ['macro', 'imc', 'calorie', 'poids', 'calcul'],
  'fasting': ['jeune', 'intermittent', 'ramadan', 'kippur', 'omad'],
  'profile': ['profil', 'info', 'personnel', 'moi'],
  'photos': ['photo', 'transformation', 'avant', 'apres', 'image'],
  'dojo': ['badge', 'xp', 'niveau', 'avatar', 'defi', 'gamification'],
  'competitor': ['competition', 'palmares', 'cut', 'tournoi'],
  'lab': ['savoir', 'science', 'article', 'apprendre'],
  'nutrition': ['regime', 'alimentation', 'manger', 'repas'],
  'share-hub': ['partage', 'social', 'instagram', 'story', 'carte'],
  'appearance': ['theme', 'sombre', 'clair', 'couleur', 'dark', 'light'],
  'health-sync': ['apple', 'health', 'sante', 'montre', 'watch'],
  'export': ['sauvegarde', 'backup', 'json', 'csv'],
  'import': ['restaurer', 'restore', 'backup'],
  'rate': ['noter', 'avis', 'etoile', 'review'],
  'contact': ['email', 'message', 'aide', 'support'],
  'reset-all': ['supprimer', 'effacer', 'reinitialiser', 'donnees'],
  'reminders': ['rappel', 'notification', 'alerte'],
  'screenshot-mode': ['demo', 'capture', 'ecran'],
};

export default function MoreScreen() {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');

  // Mode Competiteur state
  const [userModeSetting, setUserModeSetting] = useState<UserMode>('loisir');
  const [userSports, setUserSports] = useState<Sport[]>([]);
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [selectedWeightCategory, setSelectedWeightCategory] = useState<WeightCategory | null>(null);
  const [sportsModalVisible, setSportsModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [upcomingModalVisible, setUpcomingModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [unitsModalVisible, setUnitsModalVisible] = useState(false);
  const [useMetric, setUseMetric] = useState(true);

  // Mode Créateur secret
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showCreatorInput, setShowCreatorInput] = useState(false);
  const [creatorCode, setCreatorCode] = useState('');
  const [creatorModeActive, setCreatorModeActive] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [longPressActive, setLongPressActive] = useState(false);
  const [secretGestureDone, setSecretGestureDone] = useState(0); // Geste secret: taper 3x sur le titre

  // Clé secrète (obfusquée)
  const getSecretKey = () => {
    const k = [50, 48, 50, 50]; // ASCII codes
    return k.map(c => String.fromCharCode(c)).join('');
  };

  const handleVersionTap = () => {
    const now = Date.now();
    // Reset si plus de 2 secondes entre les taps
    if (now - lastTapTime > 2000) {
      setVersionTapCount(1);
    } else {
      setVersionTapCount(prev => prev + 1);
    }
    setLastTapTime(now);

    // Après 5 taps rapides, activer le long press
    if (versionTapCount >= 4) {
      setLongPressActive(true);
      setTimeout(() => setLongPressActive(false), 3000);
    }
  };

  const handleVersionLongPress = () => {
    if (versionTapCount >= 5 || longPressActive) {
      setShowCreatorInput(true);
      setVersionTapCount(0);
      setLongPressActive(false);
    }
  };

  const handleCreatorCodeSubmit = async () => {
    // Vérifier le code ET le geste secret (3 taps sur le titre)
    if (creatorCode === getSecretKey() && secretGestureDone >= 3) {
      setCreatorModeActive(true);
      setShowCreatorInput(false);
      setCreatorCode('');
      setSecretGestureDone(0);
      await AsyncStorage.setItem('@yoroi_creator_mode', 'true');
      showPopup('Mode Createur', 'Active avec succes. Acces aux fonctionnalites avancees debloque.', [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
      router.push('/screenshot-mode');
    } else if (creatorCode === getSecretKey() && secretGestureDone < 3) {
      // Code correct mais geste secret pas fait - message générique pour ne pas révéler le secret
      showPopup('Erreur', 'Activation incomplete.', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
    } else {
      showPopup('Code incorrect', 'Essayez encore.', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
      setCreatorCode('');
    }
  };

  const handleSecretGesture = () => {
    setSecretGestureDone(prev => prev + 1);
  };

  const handleCloseCreatorModal = () => {
    setShowCreatorInput(false);
    setCreatorCode('');
    setSecretGestureDone(0);
  };

  // Charger l'état du mode créateur
  useEffect(() => {
    const loadCreatorMode = async () => {
      const mode = await AsyncStorage.getItem('@yoroi_creator_mode');
      setCreatorModeActive(mode === 'true');
    };
    loadCreatorMode();
  }, []);

  // Load user settings on mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const settingsStr = await AsyncStorage.getItem('@yoroi_settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        setUserModeSetting(settings.userMode || 'loisir');
        setUserSports(settings.userSports || []);
        setUserGender(settings.userGender || 'male');
        if (settings.selectedWeightCategory) {
          setSelectedWeightCategory(settings.selectedWeightCategory);
        }
      }

      // Load mode from fighterModeService as well
      const mode = await getUserMode();
      setUserModeSetting(mode);
    } catch (error) {
      logger.error('[MoreScreen] Error loading settings:', error);
    }
  };

  const saveUserSettings = async (updates: any) => {
    try {
      const settingsStr = await AsyncStorage.getItem('@yoroi_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      const newSettings = { ...settings, ...updates };
      await AsyncStorage.setItem('@yoroi_settings', JSON.stringify(newSettings));
    } catch (error) {
      logger.error('[MoreScreen] Error saving settings:', error);
    }
  };

  const handleChangeUserMode = async (newMode: UserMode) => {
    // Si on desactive le mode competiteur, demander confirmation
    if (newMode === 'loisir' && userModeSetting === 'competiteur') {
      showPopup(
        'Desactiver le Mode Competiteur ?',
        'Etes-vous sur de vouloir revenir au Mode Loisir ? Vos sports et categorie de poids seront conserves.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            style: 'destructive',
            onPress: async () => {
              try {
                await saveUserMode(newMode);
                await saveUserSettings({ userMode: newMode });
                setUserModeSetting(newMode);
                showPopup('Mode change', 'Vous etes maintenant en Mode Loisir', [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
              } catch (error) {
                logger.error('[MoreScreen] Error changing mode:', error);
                showPopup('Erreur', 'Impossible de changer le mode', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
              }
            },
          },
        ],
        <AlertTriangle size={32} color="#F59E0B" />
      );
    } else {
      // Activation du mode competiteur sans confirmation
      try {
        await saveUserMode(newMode);
        await saveUserSettings({ userMode: newMode });
        setUserModeSetting(newMode);
        if (newMode === 'competiteur') {
          showPopup(
            'Mode Competiteur active',
            'Configurez vos sports et votre categorie de poids ci-dessous',
            [{ text: 'OK', style: 'primary' }],
            <CheckCircle size={32} color="#10B981" />
          );
        }
      } catch (error) {
        logger.error('[MoreScreen] Error changing mode:', error);
        showPopup('Erreur', 'Impossible de changer le mode', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
      }
    }
  };

  const handleShowTutorial = async () => {
    showPopup(
      'Tutoriel',
      'La fonctionnalite de tutoriel sera bientot disponible.',
      [{ text: 'OK', style: 'primary' }]
    );
  };

  const handleExport = async () => {
    showPopup(
      'Exporter mes donnees',
      'Choisis le format d\'export',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'JSON', style: 'default', onPress: () => exportDataToJSON() },
        { text: 'CSV', style: 'primary', onPress: () => exportDataToCSV() },
      ]
    );
  };

  const handleImport = async () => {
    showPopup(
      'Importer des donnees',
      'Cette action remplacera tes donnees actuelles.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Choisir un fichier',
          style: 'primary',
          onPress: async () => {
            try {
              await importAllData(async (data) => {
                logger.info('Data to import:', data);
              });
            } catch (e) {
              logger.info('Import error:', e);
            }
          }
        },
      ],
      <AlertTriangle size={32} color="#F59E0B" />
    );
  };

  const handleRate = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        showPopup('Merci !', 'Tu peux nous noter sur l\'App Store', [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
      }
    } catch (e) {
      logger.info('Rate error:', e);
    }
  };

  const handleContact = () => {
    Linking.openURL('mailto:yoroiapp@hotmail.com?subject=Contact%20Yoroi');
  };

  const handleExportPDF = async () => {
    showPopup(
      'Rapport PDF',
      'Choisis la periode du rapport',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '30 jours',
          style: 'default',
          onPress: async () => {
            try {
              await generateProgressPDF('30j');
            } catch (e) {
              showPopup('Erreur', 'Impossible de generer le PDF', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
            }
          }
        },
        {
          text: '90 jours',
          style: 'primary',
          onPress: async () => {
            try {
              await generateProgressPDF('90j');
            } catch (e) {
              showPopup('Erreur', 'Impossible de generer le PDF', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
            }
          }
        },
      ]
    );
  };

  // 🔒 SÉCURITÉ: Modal sécurisé avec confirmation par texte
  const handleResetAll = () => {
    setResetConfirmText('');
    setResetModalVisible(true);
  };

  // Helper pour vérifier le texte de confirmation (accepte variantes courantes)
  const normalizedText = resetConfirmText.trim().toUpperCase();
  const isResetConfirmed = normalizedText === 'SUPPRIMER' || normalizedText === 'SUPRIMER' || normalizedText === 'EFFACER' || normalizedText === 'OUI';

  const confirmReset = async () => {
    if (isResetConfirmed) {
      try {
        await resetAllData();
        setResetModalVisible(false);
        setResetConfirmText('');
        showPopup(
          'Donnees supprimees',
          'Toutes vos donnees ont ete effacees. L\'application va redemarrer.',
          [
            {
              text: 'OK',
              style: 'primary',
              onPress: () => router.replace('/onboarding'),
            },
          ],
          <CheckCircle size={32} color="#10B981" />
        );
      } catch (error) {
        logger.error('[MoreScreen] Error resetting data:', error);
        showPopup('Erreur', 'Impossible de reinitialiser les donnees', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
      }
    } else {
      showPopup('Erreur', 'Tapez "SUPPRIMER", "EFFACER" ou "OUI" pour confirmer', [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
    }
  };

  const handleLanguage = () => {
    showPopup(
      'Langue',
      'La selection de langue sera bientot disponible.\n\nPour l\'instant, YOROI est disponible en francais.',
      [{ text: 'OK', style: 'primary' }]
    );
  };

  const handleReminders = () => {
    router.push('/notifications');
  };

  const handleSmartReminders = () => {
    router.push('/notifications');
  };

  const handleBriefing = () => {
    router.push('/notifications');
  };

  const handleICloudSync = () => {
    showPopup(
      'Synchronisation iCloud',
      'La synchronisation iCloud sera bientot disponible.\n\nTes donnees seront automatiquement sauvegardees et synchronisees entre tous tes appareils Apple.',
      [{ text: 'OK', style: 'primary' }]
    );
  };

  const handleUnits = () => {
    setUnitsModalVisible(true);
  };

  const handleIdeas = () => {
    Linking.openURL('mailto:yoroiapp@hotmail.com?subject=Idée%20pour%20YOROI&body=Bonjour,%0A%0AVoici%20mon%20idée%20:%0A%0A');
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.route) {
      router.push(action.route as any);
    } else if (action.onPress) {
      action.onPress();
    }
  };

  const handleMenuItem = (item: MenuItem) => {
    if (item.id === 'export') {
      handleExport();
      return;
    }
    if (item.id === 'import') {
      handleImport();
      return;
    }
    if (item.id === 'rate') {
      handleRate();
      return;
    }
    if (item.id === 'contact') {
      handleContact();
      return;
    }
    if (item.id === 'exportPdf') {
      handleExportPDF();
      return;
    }
    if (item.id === 'tutorial') {
      handleShowTutorial();
      return;
    }
    if (item.id === 'reset-all') {
      handleResetAll();
      return;
    }
    if (item.id === 'language') {
      handleLanguage();
      return;
    }
    if (item.id === 'reminders') {
      handleReminders();
      return;
    }
    if (item.id === 'smart-reminders') {
      handleSmartReminders();
      return;
    }
    if (item.id === 'briefing') {
      handleBriefing();
      return;
    }
    if (item.id === 'icloud-sync') {
      handleICloudSync();
      return;
    }
    if (item.id === 'preferences') {
      handleUnits();
      return;
    }
    if (item.id === 'ideas') {
      handleIdeas();
      return;
    }

    if (item.route) {
      router.push(item.route as any);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  // Rendu d'une action rapide (grille)
  const renderQuickAction = (action: QuickAction) => {
    const IconComponent = action.Icon;
    return (
      <TouchableOpacity
        key={action.id}
        style={styles.quickActionContainer}
        onPress={() => handleQuickAction(action)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={action.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickActionGradient}
        >
          <IconComponent size={26} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.quickActionLabel}>{action.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Rendu d'un item de menu
  const renderMenuItem = (item: MenuItem) => {
    const IconComponent = item.Icon;
    const iconColor = item.iconColor || colors.textSecondary;
    const iconBg = item.iconBg || colors.cardHover;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, { backgroundColor: colors.card }]}
        onPress={() => handleMenuItem(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: iconBg }]}>
          <IconComponent size={20} color={iconColor} strokeWidth={2} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
          {item.sublabel && (
            <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>{item.sublabel}</Text>
          )}
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  // Rendu d'une section
  const renderSection = (title: string, items: MenuItem[]) => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {items.map((item, index) => (
          <View key={item.id}>
            {renderMenuItem(item)}
            {index < items.length - 1 && (
              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  // Rendu d'une section en GRILLE 3x3
  const renderGridSection = (title: string, items: MenuItem[]) => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {items.map((item) => {
          const IconComponent = item.Icon;
          const iconColor = item.iconColor || colors.textSecondary;
          const iconBg = item.iconBg || colors.cardHover;
          return (
            <TouchableOpacity
              key={item.id}
              style={{
                width: '33.33%',
                padding: 4,
              }}
              onPress={() => handleMenuItem(item)}
              activeOpacity={0.7}
            >
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 10,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                minHeight: 105,
              }}>
                <View style={{
                  backgroundColor: iconBg,
                  borderRadius: 12,
                  padding: 8,
                  marginBottom: 6,
                }}>
                  <IconComponent size={22} color={iconColor} strokeWidth={2} />
                </View>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.textPrimary,
                  textAlign: 'center',
                }} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.sublabel && (
                  <Text style={{
                    fontSize: 9,
                    color: colors.textMuted,
                    textAlign: 'center',
                    marginTop: 3,
                    lineHeight: 11,
                  }} numberOfLines={2}>
                    {item.sublabel}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenWrapper noPadding>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Menu</Text>
            <View style={[styles.versionBadge, { backgroundColor: colors.cardHover }]}>
              <Text style={[styles.versionText, { color: colors.textMuted }]}>v1.0.0</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Profil, outils et paramètres
          </Text>
        </View>

        {/* BARRE DE RECHERCHE */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher une fonctionnalité..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* RÉSULTATS DE RECHERCHE */}
        {searchQuery.length > 0 ? (
          <View style={styles.searchResults}>
            {(() => {
              const query = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const filtered = ALL_FEATURES.filter(item => {
                const label = item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const sublabel = (item.sublabel || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const keywords = SEARCH_KEYWORDS[item.id] || [];

                return label.includes(query) ||
                       sublabel.includes(query) ||
                       keywords.some(kw => kw.includes(query));
              });

              if (filtered.length === 0) {
                return (
                  <View style={[styles.noResultsContainer, { backgroundColor: colors.card }]}>
                    <Search size={40} color={colors.textMuted} />
                    <Text style={[styles.noResultsText, { color: colors.textMuted }]}>
                      Aucun résultat pour "{searchQuery}"
                    </Text>
                  </View>
                );
              }

              return (
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {filtered.map((item, index) => (
                    <View key={item.id}>
                      {renderMenuItem(item)}
                      {index < filtered.length - 1 && (
                        <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        ) : (
          <>
            {/* QUICK ACTIONS GRID */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsContainer}
              style={styles.quickActionsScroll}
            >
              {QUICK_ACTIONS.map(renderQuickAction)}
            </ScrollView>

            {/* MODE UTILISATEUR - En haut */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MODE</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => handleChangeUserMode(userModeSetting === 'loisir' ? 'competiteur' : 'loisir')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.menuItemIcon,
                { backgroundColor: userModeSetting === 'competiteur' ? '#FF6B6B20' : '#4ECDC420' }
              ]}>
                {userModeSetting === 'competiteur' ? (
                  <Swords size={20} color="#FF6B6B" strokeWidth={2} />
                ) : (
                  <Heart size={20} color="#4ECDC4" strokeWidth={2} />
                )}
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                  {userModeSetting === 'competiteur' ? 'Mode Compétiteur' : 'Mode Loisir'}
                </Text>
                <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                  {userModeSetting === 'competiteur'
                    ? 'Compétitions, palmarès, catégories'
                    : 'Bien-être et progression personnelle'}
                </Text>
              </View>
              <Switch
                value={userModeSetting === 'competiteur'}
                onValueChange={(value) => handleChangeUserMode(value ? 'competiteur' : 'loisir')}
                trackColor={{ false: colors.border, true: '#FF6B6B' }}
                thumbColor={'#fff'}
                ios_backgroundColor={colors.border}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* MODE COMPÉTITEUR - Config sports/catégorie */}
        {userModeSetting === 'competiteur' && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CONFIG COMPÉTITEUR</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

              {/* Catégorie de poids */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => setCategoryModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: colors.gold + '20' }]}>
                  <Scale size={20} color={colors.gold} strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Catégorie de poids
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {selectedWeightCategory
                      ? `${selectedWeightCategory.name} (${selectedWeightCategory.maxWeight}kg)`
                      : 'Non défini'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Sports pratiqués */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => setSportsModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#FF6B6B20' }]}>
                  <Trophy size={20} color="#FF6B6B" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Mes sports
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {userSports.length > 0
                      ? userSports.map(s => SPORT_LABELS[s]).join(', ')
                      : 'Aucun sport défini'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

            </View>
          </View>
        )}

        {/* SECTIONS */}
        {renderGridSection('PROFIL', PROFILE_ITEMS)}
        {renderGridSection('OUTILS', TOOLS_ITEMS)}
        {renderGridSection('COMMUNAUTÉ', COMMUNITY_ITEMS)}
        {renderGridSection('AFFICHAGE', DISPLAY_ITEMS)}
        {renderGridSection('RAPPELS & NOTIFICATIONS', REMINDERS_ITEMS)}
        {renderGridSection('APPLE HEALTH', HEALTH_ITEMS)}
        {renderGridSection('SAUVEGARDE & RESTAURATION', BACKUP_ITEMS)}
        {renderGridSection('SUPPORT', SUPPORT_ITEMS)}
        {renderGridSection('SÉCURITÉ', SECURITY_ITEMS)}
          </>
        )}

        {/* BIENTÔT DISPONIBLE */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BIENTOT DISPONIBLE</Text>
          <TouchableOpacity
            style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setUpcomingModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.comingSoonContent}>
              <Zap size={24} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
                  Nouvelles fonctionnalites a venir
                </Text>
                <Text style={[styles.comingSoonDesc, { color: colors.textSecondary }]}>
                  Clique pour voir la roadmap
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={[styles.privacyCard, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
            <View style={styles.privacyIconContainer}>
              <Shield size={20} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <View style={styles.privacyContent}>
              <Text style={[styles.privacyTitle, { color: isDark ? '#4ADE80' : '#16A34A' }]}>
                100% Privé
              </Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                Tes données restent uniquement sur ton téléphone
              </Text>
            </View>
          </View>

          <View style={[styles.madeWith, { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>Made with</Text>
            <Heart size={14} color="#EF4444" fill="#EF4444" />
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>in France</Text>
          </View>

          {/* Version - Secret tap zone */}
          <TouchableOpacity
            onPress={handleVersionTap}
            onLongPress={handleVersionLongPress}
            delayLongPress={800}
            activeOpacity={1}
          >
            <Text style={{
              color: longPressActive ? colors.accent : colors.textMuted,
              fontSize: 12,
              marginTop: 12,
              textAlign: 'center'
            }}>
              YOROI v1.0.0
            </Text>
          </TouchableOpacity>

          {/* Mode Créateur activé - accès rapide */}
          {creatorModeActive && (
            <TouchableOpacity
              onPress={() => router.push('/screenshot-mode')}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: colors.accent, fontSize: 11, textAlign: 'center' }}>
                ⚙️ Mode Créateur actif
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal - Sports Selection */}
      <Modal
        visible={sportsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSportsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Mes sports de compétition
              </Text>
              <TouchableOpacity onPress={() => setSportsModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {Object.entries(SPORT_LABELS).map(([key, label]) => {
                const isSelected = userSports.includes(key as Sport);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.sportOption,
                      {
                        backgroundColor: isSelected ? colors.accent + '20' : colors.backgroundElevated,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      const newSports = isSelected
                        ? userSports.filter(s => s !== key)
                        : [...userSports, key as Sport];
                      setUserSports(newSports);
                    }}
                  >
                    <Text style={[styles.sportOptionText, { color: colors.textPrimary }]}>
                      {label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={async () => {
                await saveUserSettings({ userSports });
                setSportsModalVisible(false);
                showPopup('Enregistre', `${userSports.length} sport(s) selectionne(s)`, [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
              }}
            >
              <Text style={styles.modalButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal - Weight Category Selection */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Ma catégorie de poids
              </Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Sport Selection Hint */}
              {userSports.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.backgroundElevated }]}>
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Sélectionne d'abord un sport de compétition
                  </Text>
                </View>
              ) : (
                <>
                  {/* Sport Selector */}
                  {userSports.length > 1 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                        SPORT
                      </Text>
                      <View style={styles.sportSelector}>
                        {userSports.map(sport => (
                          <TouchableOpacity
                            key={sport}
                            style={[
                              styles.sportChip,
                              {
                                backgroundColor: colors.backgroundElevated,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text style={[styles.sportChipText, { color: colors.textPrimary }]}>
                              {SPORT_LABELS[sport]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Gender Selector */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                      GENRE
                    </Text>
                    <View style={styles.genderSelector}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          {
                            backgroundColor: userGender === 'male' ? colors.accent : colors.backgroundElevated,
                            borderColor: userGender === 'male' ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setUserGender('male')}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            { color: userGender === 'male' ? '#fff' : colors.textPrimary },
                          ]}
                        >
                          Homme
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          {
                            backgroundColor: userGender === 'female' ? colors.accent : colors.backgroundElevated,
                            borderColor: userGender === 'female' ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setUserGender('female')}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            { color: userGender === 'female' ? '#fff' : colors.textPrimary },
                          ]}
                        >
                          Femme
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Weight Categories */}
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    CATÉGORIES
                  </Text>
                  {userSports.map(sport => {
                    if (!sportHasWeightCategories(sport)) return null;
                    const categories = getWeightCategoriesBySportAndGender(sport, userGender);

                    return (
                      <View key={sport} style={{ marginBottom: 12 }}>
                        {userSports.length > 1 && (
                          <Text style={[styles.sportSubheader, { color: colors.textSecondary }]}>
                            {SPORT_LABELS[sport]}
                          </Text>
                        )}
                        {categories.map(category => {
                          const isSelected = selectedWeightCategory?.id === category.id;
                          return (
                            <TouchableOpacity
                              key={category.id}
                              style={[
                                styles.categoryOption,
                                {
                                  backgroundColor: isSelected ? colors.gold + '20' : colors.backgroundElevated,
                                  borderColor: isSelected ? colors.gold : colors.border,
                                },
                              ]}
                              onPress={() => setSelectedWeightCategory(category)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                                  {category.name}
                                </Text>
                                <Text style={[styles.categoryWeight, { color: colors.textMuted }]}>
                                  {category.minWeight > 0 && `${category.minWeight}kg - `}
                                  {category.maxWeight < 999 ? `${category.maxWeight}kg` : '+'}
                                </Text>
                              </View>
                              {isSelected && (
                                <View style={[styles.checkmark, { backgroundColor: colors.gold }]}>
                                  <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: selectedWeightCategory ? colors.gold : colors.backgroundElevated,
                  opacity: selectedWeightCategory ? 1 : 0.5,
                },
              ]}
              onPress={async () => {
                if (selectedWeightCategory) {
                  await saveUserSettings({ selectedWeightCategory, userGender });
                  setCategoryModalVisible(false);
                  showPopup('Enregistre', `Categorie: ${selectedWeightCategory.name}`, [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
                }
              }}
              disabled={!selectedWeightCategory}
            >
              <Text style={styles.modalButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal - Fonctionnalités à venir */}
      <Modal
        visible={upcomingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUpcomingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Roadmap YOROI
              </Text>
              <TouchableOpacity onPress={() => setUpcomingModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.upcomingSubtitle, { color: colors.textPrimary }]}>
                Fonctionnalites en cours de developpement
              </Text>

              <View style={styles.upcomingList}>
                <View style={styles.upcomingItem}>
                  <Watch size={18} color="#EC4899" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Apple Watch - Suivi en temps reel</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <MessageCircle size={18} color="#8B5CF6" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Mode Siri - Commandes vocales</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Share2 size={18} color="#3B82F6" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Partage avec coach/nutritionniste</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Trophy size={18} color="#F59E0B" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Classement entre amis</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Bell size={18} color="#10B981" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Rappels intelligents personnalises</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Globe size={18} color="#06B6D4" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Multilingue (EN, ES, AR...)</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Activity size={18} color="#EF4444" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Analyse video de techniques</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Calendar size={18} color="#A855F7" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>Sync avec calendrier externe</Text>
                </View>
              </View>

              <View style={[styles.feedbackCard, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: isDark ? '#F59E0B40' : '#F59E0B' }]}>
                <Lightbulb size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>
                    Tu as une idee ?
                  </Text>
                  <Text style={[styles.feedbackDesc, { color: colors.textSecondary }]}>
                    Dis-nous ce que tu veux voir dans YOROI !
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.feedbackButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setUpcomingModalVisible(false);
                  Linking.openURL('mailto:yoroiapp@hotmail.com?subject=Idée%20pour%20YOROI');
                }}
              >
                <MessageCircle size={18} color="#FFF" />
                <Text style={styles.feedbackButtonText}>Envoyer une idée</Text>
              </TouchableOpacity>

              <Text style={[styles.upcomingNote, { color: colors.textMuted }]}>
                N'hésite pas à nous contacter pour suggérer des améliorations !
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal - Réinitialisation Sécurisée */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Réinitialiser les données
              </Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.warningCard, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
                <Trash2 size={32} color="#EF4444" />
                <Text style={[styles.warningTitle, { color: '#EF4444' }]}>
                  Action irréversible
                </Text>
                <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                  Cette action supprimera définitivement toutes vos données :
                </Text>
                <View style={styles.warningList}>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• Poids et mesures</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• Photos de transformation</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• Entraînements et planning</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• Badges et progression</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• Tous les paramètres</Text>
                </View>
              </View>

              <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>
                Pour confirmer, tapez <Text style={{ fontWeight: '800', color: '#EF4444' }}>OUI</Text> ci-dessous :
              </Text>

              <TextInput
                style={[
                  styles.confirmInput,
                  {
                    backgroundColor: colors.backgroundElevated,
                    borderColor: isResetConfirmed ? '#10B981' : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={resetConfirmText}
                onChangeText={setResetConfirmText}
                placeholder="Tapez OUI"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.resetButtonsContainer}>
              <TouchableOpacity
                style={[styles.resetCancelButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => {
                  setResetModalVisible(false);
                  setResetConfirmText('');
                }}
              >
                <Text style={[styles.resetCancelButtonText, { color: colors.textPrimary }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resetConfirmButton,
                  {
                    backgroundColor: isResetConfirmed ? '#EF4444' : colors.backgroundElevated,
                    opacity: isResetConfirmed ? 1 : 0.5,
                  },
                ]}
                onPress={confirmReset}
                disabled={!isResetConfirmed}
              >
                <Trash2 size={18} color={isResetConfirmed ? '#FFF' : colors.textMuted} />
                <Text
                  style={[
                    styles.resetConfirmButtonText,
                    { color: isResetConfirmed ? '#FFF' : colors.textMuted },
                  ]}
                >
                  Supprimer tout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal - Unités */}
      <Modal
        visible={unitsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Unités de mesure
              </Text>
              <TouchableOpacity onPress={() => setUnitsModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.unitsOptionContainer}>
                <TouchableOpacity
                  style={[
                    styles.unitsOption,
                    {
                      backgroundColor: useMetric ? colors.accent + '20' : colors.backgroundElevated,
                      borderColor: useMetric ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setUseMetric(true)}
                >
                  <View style={styles.unitsOptionContent}>
                    <Ruler size={24} color={useMetric ? colors.accent : colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.unitsOptionTitle, { color: colors.textPrimary }]}>
                        Métrique
                      </Text>
                      <Text style={[styles.unitsOptionDesc, { color: colors.textMuted }]}>
                        Kilogrammes (kg) et Centimètres (cm)
                      </Text>
                    </View>
                    {useMetric && (
                      <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.unitsOption,
                    {
                      backgroundColor: !useMetric ? colors.accent + '20' : colors.backgroundElevated,
                      borderColor: !useMetric ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setUseMetric(false)}
                >
                  <View style={styles.unitsOptionContent}>
                    <Ruler size={24} color={!useMetric ? colors.accent : colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.unitsOptionTitle, { color: colors.textPrimary }]}>
                        Impérial
                      </Text>
                      <Text style={[styles.unitsOptionDesc, { color: colors.textMuted }]}>
                        Livres (lbs) et Pouces (inches)
                      </Text>
                    </View>
                    {!useMetric && (
                      <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={async () => {
                await saveUserSettings({ useMetric });
                setUnitsModalVisible(false);
                showPopup('Enregistre', `Unites : ${useMetric ? 'Metrique (kg/cm)' : 'Imperial (lbs/in)'}`, [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
              }}
            >
              <Text style={styles.modalButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal - Mode Créateur Secret */}
      <Modal
        visible={showCreatorInput}
        transparent
        animationType="fade"
        onRequestClose={handleCloseCreatorModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              {/* Titre tappable - geste secret */}
              <TouchableOpacity onPress={handleSecretGesture} activeOpacity={1}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Activation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCloseCreatorModal}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.creatorDescription, { color: colors.textSecondary }]}>
                Entrez le code d'activation
              </Text>

              <TextInput
                style={[
                  styles.creatorInput,
                  {
                    backgroundColor: colors.backgroundElevated,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={creatorCode}
                onChangeText={setCreatorCode}
                placeholder="••••"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                textAlign="center"
              />
            </View>

            <View style={styles.creatorButtonsContainer}>
              <TouchableOpacity
                style={[styles.creatorCancelButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={handleCloseCreatorModal}
              >
                <Text style={[styles.creatorCancelButtonText, { color: colors.textPrimary }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.creatorConfirmButton,
                  {
                    backgroundColor: creatorCode.length === 4 ? colors.accent : colors.backgroundElevated,
                    opacity: creatorCode.length === 4 ? 1 : 0.5,
                  },
                ]}
                onPress={handleCreatorCodeSubmit}
                disabled={creatorCode.length !== 4}
              >
                <Text
                  style={[
                    styles.creatorConfirmButtonText,
                    { color: creatorCode.length === 4 ? '#FFF' : colors.textMuted },
                  ]}
                >
                  Valider
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PopupComponent />
    </ScreenWrapper>
  );
}

const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 60) / 4;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },

  // SEARCH
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  searchResults: {
    marginBottom: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 16,
    gap: 12,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  // QUICK ACTIONS
  quickActionsScroll: {
    marginBottom: 28,
  },
  quickActionsContainer: {
    gap: 12,
    paddingRight: 20,
  },
  quickActionContainer: {
    width: QUICK_ACTION_SIZE,
    height: QUICK_ACTION_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  // SECTIONS
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },

  // MENU ITEM
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    marginLeft: 68,
  },

  // BIENTÔT DISPONIBLE
  comingSoonCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  comingSoonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  comingSoonDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Modal Upcoming Features
  upcomingSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  upcomingList: {
    gap: 12,
    marginBottom: 20,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingText: {
    fontSize: 14,
    flex: 1,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  feedbackDesc: {
    fontSize: 12,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  feedbackButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  upcomingNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
    gap: 14,
  },
  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: scaleModerate(14, 0.3),
    fontWeight: '700',
  },
  privacyText: {
    fontSize: 12,
    marginTop: 2,
  },
  madeWith: {
    // View style - text styles applied inline
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
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
    padding: scale(20),
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  modalButton: {
    margin: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: scaleModerate(16, 0.3),
    fontWeight: '700',
  },

  // Sports Options
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  sportOptionText: {
    fontSize: scaleModerate(16, 0.3),
    fontWeight: '600',
  },

  // Weight Categories
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sportSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sportChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportSubheader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryWeight: {
    fontSize: 13,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
  },

  // Reset Modal
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
    marginBottom: 12,
  },
  warningList: {
    alignSelf: 'stretch',
    paddingLeft: 8,
  },
  warningListItem: {
    fontSize: 13,
    marginVertical: 2,
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
  resetButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  resetCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  resetCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Units Modal
  unitsOptionContainer: {
    gap: 12,
  },
  unitsOption: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
  },
  unitsOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  unitsOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  unitsOptionDesc: {
    fontSize: 13,
  },

  // Creator Mode Modal
  creatorDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  creatorInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  creatorButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  creatorCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  creatorCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  creatorConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  creatorConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
