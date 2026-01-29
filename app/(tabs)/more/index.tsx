import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { useCustomPopup } from '@/components/CustomPopup';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { requestReview, isAvailableAsync } from 'expo-store-review';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { randomUUID, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
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
  Sun,
  Smartphone,
  MessageSquareQuote,
  Image as ImageIcon,
  Trash2,
  Search,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { MoreTabView } from '@/components/more/MoreTabView';
import { exportDataToJSON, exportDataToCSV, exportTrainingsToCSV, exportTrainingsToExcelCSV, importDataFromJSON, exportEditableCSV, importEditableCSV, exportEmptyTemplate } from '@/lib/exportService';
import { scale, scaleModerate } from '@/constants/responsive';
import { generateProgressPDF } from '@/lib/pdfExport';
import { getWeightCategoriesBySportAndGender, WeightCategory, sportHasWeightCategories } from '@/lib/weightCategories';
import { UserMode, Sport, SPORT_LABELS } from '@/lib/fighterMode';
import { getUserMode, setUserMode as saveUserMode } from '@/lib/fighterModeService';
import { resetAllData } from '@/lib/storage';
// Screenshot mode is now handled via /screenshot-mode route only
import { getHomeCustomization, saveHomeCustomization, isSectionVisible, HomeSection } from '@/lib/homeCustomizationService';
import { generateScreenshotDemoData, clearScreenshotDemoData, isScreenshotModeEnabled, DEMO_PROFILES, setActiveDemoProfile, DemoProfileKey } from '@/lib/screenshotDemoData';
import logger from '@/lib/security/logger';
import { useI18n } from '@/lib/I18nContext';

// Type pour la fonction de traduction
type TranslateFunction = (key: string, options?: any) => string;
import { FeatureDiscoveryModal } from '@/components/FeatureDiscoveryModal';
import { PAGE_TUTORIALS, hasVisitedPage, markPageAsVisited, resetAllTutorials } from '@/lib/featureDiscoveryService';

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
const getQuickActions = (t: TranslateFunction): QuickAction[] => [
  {
    id: 'timer',
    label: t('tools.timer'),
    Icon: Timer,
    route: '/timer',
    gradient: ['#4ECDC4', '#3DBDB5'],
  },
  {
    id: 'calculator',
    label: t('tools.calculators'),
    Icon: Calculator,
    route: '/calculators',
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    id: 'fasting',
    label: t('tools.fasting'),
    Icon: Utensils,
    route: '/fasting',
    gradient: ['#A855F7', '#9333EA'],
  },
  {
    id: 'training-journal',
    label: t('tools.journal'),
    Icon: BookOpen,
    route: '/training-journal',
    gradient: ['#F97316', '#EA580C'],
  },
  {
    id: 'lab',
    label: t('tools.knowledge'),
    Icon: FlaskConical,
    route: '/savoir',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  {
    id: 'nutrition',
    label: t('tools.nutrition'),
    Icon: Apple,
    route: '/nutrition-plan',
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'share-hub',
    label: t('tools.share'),
    Icon: Share2,
    route: '/share-hub',
    gradient: ['#EC4899', '#BE185D'],
  },
  {
    id: 'profile',
    label: t('menu.profile'),
    Icon: User,
    route: '/profile',
    gradient: ['#60A5FA', '#3B82F6'],
  },
  {
    id: 'photos',
    label: t('menu.transformation'),
    Icon: Camera,
    route: '/photos',
    gradient: ['#F472B6', '#EC4899'],
  },
  {
    id: 'appearance',
    label: t('menu.themes'),
    Icon: Palette,
    route: '/appearance',
    gradient: ['#A78BFA', '#8B5CF6'],
  },
];

// ============================================
// SECTION PROFIL & APPARENCE
// ============================================
const getProfileItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'profile',
    label: t('menu.profile'),
    sublabel: t('menu.profileDescription'),
    Icon: User,
    route: '/profile',
    iconColor: '#60A5FA',
    iconBg: '#60A5FA20',
  },
  {
    id: 'photos',
    label: t('menu.transformation'),
    sublabel: t('menu.transformationDescription'),
    Icon: Camera,
    route: '/photos',
    iconColor: '#F472B6',
    iconBg: '#F472B620',
  },
  {
    id: 'badges',
    label: t('menu.badges'),
    sublabel: t('menu.badgesDescription'),
    Icon: Award,
    route: '/badges',
    iconColor: '#FBBF24',
    iconBg: '#FBBF2420',
  },
  {
    id: 'avatars',
    label: t('menu.avatars'),
    sublabel: t('menu.avatarsDescription'),
    Icon: Sparkles,
    route: '/avatar-selection',
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'rangs',
    label: t('menu.ranks'),
    sublabel: t('menu.ranksDescription'),
    Icon: Trophy,
    route: '/gamification',
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'niveaux',
    label: t('menu.levels'),
    sublabel: t('menu.levelsDescription'),
    Icon: Zap,
    route: '/gamification',
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
  {
    id: 'competitor',
    label: t('menu.competitorSpace'),
    sublabel: t('menu.competitorSpaceDescription'),
    Icon: Swords,
    route: '/competitor-space',
    iconColor: '#EF4444',
    iconBg: '#EF444420',
  },
];

// ============================================
// SECTION OUTILS
// ============================================
const getToolsItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'timer',
    label: t('tools.timer'),
    sublabel: t('menu.timerDescription'),
    Icon: Timer,
    route: '/timer',
    iconColor: '#4ECDC4',
    iconBg: '#4ECDC420',
  },
  {
    id: 'calculator',
    label: t('tools.calculators'),
    sublabel: t('menu.calculatorsDescription'),
    Icon: Calculator,
    route: '/calculators',
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
  {
    id: 'fasting',
    label: t('tools.fasting'),
    sublabel: t('menu.fastingDescription'),
    Icon: Utensils,
    route: '/fasting',
    iconColor: '#A855F7',
    iconBg: '#A855F720',
  },
  {
    id: 'lab',
    label: t('tools.knowledge'),
    sublabel: t('menu.knowledgeDescription'),
    Icon: FlaskConical,
    route: '/savoir',
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'nutrition',
    label: t('tools.nutrition'),
    sublabel: t('menu.nutritionDescription'),
    Icon: Apple,
    route: '/nutrition-plan',
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'share-hub',
    label: t('tools.share'),
    sublabel: t('menu.shareProgressDescription'),
    Icon: Share2,
    route: '/share-hub',
    iconColor: '#EC4899',
    iconBg: '#EC489920',
  },
];

// ============================================
// SECTION COMMUNAUTÉ
// ============================================
const getCommunityItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'clubs',
    label: t('menu.clubsCoach'),
    sublabel: t('menu.clubsCoachDescription'),
    Icon: Building2,
    route: '/partners',
    iconColor: '#818CF8',
    iconBg: '#818CF820',
  },
  {
    id: 'health-pros',
    label: t('menu.healthPros'),
    sublabel: t('menu.healthProsDescription'),
    Icon: Heart,
    route: '/partners',
    iconColor: '#F87171',
    iconBg: '#F8717120',
  },
];

// ============================================
// SECTION AFFICHAGE
// ============================================
const getDisplayItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'appearance',
    label: t('menu.appearance'),
    sublabel: t('menu.appearanceDescription'),
    Icon: Palette,
    route: '/appearance',
    iconColor: '#A78BFA',
    iconBg: '#A78BFA20',
  },
  {
    id: 'language',
    label: t('menu.language') || 'Langue',
    sublabel: t('menu.languageDescription') || 'Choisir la langue de l\'app',
    Icon: Globe,
    onPress: () => {},
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'preferences',
    label: t('menu.units'),
    sublabel: t('menu.unitsDescription'),
    Icon: Sliders,
    onPress: () => {},
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
  // Screenshot mode removed from menu - accessible only via creator mode
];

// ============================================
// SECTION RAPPELS & NOTIFICATIONS
// ============================================
const getRemindersItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'notifications',
    label: t('menu.notifications'),
    sublabel: t('menu.notificationsDescription'),
    Icon: Bell,
    route: '/notifications',
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
];

// ============================================
// SECTION APPLE HEALTH
// ============================================
const getHealthItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'health-sync',
    label: t('tools.appleHealth'),
    sublabel: t('menu.appleHealthDescription'),
    Icon: Watch,
    route: '/health-connect',
    iconColor: '#EC4899',
    iconBg: '#EC489920',
  },
  {
    id: 'health-diagnostic',
    label: 'Diagnostic Sante',
    sublabel: 'Verifier HealthKit et Watch',
    Icon: Activity,
    route: '/health-diagnostic',
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'watch-debug',
    label: 'Debug Apple Watch',
    sublabel: 'Tester la sync iPhone-Watch',
    Icon: Watch,
    route: '/watch-debug',
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
];


// ============================================
// SECTION SAUVEGARDE & RESTAURATION
// ============================================
const getBackupItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'export',
    label: 'Sauvegarder',
    sublabel: 'Backup complet (photos, logos, séances)',
    Icon: Download,
    onPress: () => {},
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'import',
    label: 'Restaurer',
    sublabel: 'Importer un backup ou CSV éditable',
    Icon: Upload,
    onPress: () => {},
    iconColor: '#6366F1',
    iconBg: '#6366F120',
  },
  {
    id: 'export-editable',
    label: 'Export Éditable',
    sublabel: 'Modifier tes données sur ordinateur',
    Icon: FileText,
    onPress: () => {},
    iconColor: '#F97316',
    iconBg: '#F9731620',
  },
  {
    id: 'exportPdf',
    label: t('menu.pdfReport'),
    sublabel: t('menu.pdfReportDescription'),
    Icon: FileText,
    onPress: () => {},
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
];


// ============================================
// SECTION SÉCURITÉ
// ============================================
const getSecurityItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'tutorial',
    label: t('menu.tutorial'),
    sublabel: t('menu.tutorialDescription'),
    Icon: Info,
    onPress: () => {},
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'reset-all',
    label: t('menu.resetAll'),
    sublabel: t('menu.resetAllDescription'),
    Icon: Trash2,
    onPress: () => {},
    iconColor: '#EF4444',
    iconBg: '#EF444420',
  },
];

// ============================================
// SECTION SUPPORT
// ============================================
const getSupportItems = (t: TranslateFunction): MenuItem[] => [
  {
    id: 'help-tutorials',
    label: t('menu.helpAndTutorials'),
    sublabel: t('menu.helpAndTutorialsDescription'),
    Icon: Info,
    route: '/help-tutorials',
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'app-store',
    label: t('menu.appStore') || 'YOROI sur l\'App Store',
    sublabel: t('menu.appStoreDescription') || 'Voir l\'app sur l\'App Store',
    Icon: Apple,
    onPress: () => safeOpenURL('https://apps.apple.com/fr/app/yoroi-suivi-poids-sport/id6757306612'),
    iconColor: '#007AFF',
    iconBg: '#007AFF20',
  },
  {
    id: 'instagram',
    label: t('menu.instagram') || 'Instagram',
    sublabel: t('menu.instagramDescription') || '@yoroiapp',
    Icon: Camera,
    onPress: () => safeOpenURL('https://www.instagram.com/yoroiapp'),
    iconColor: '#E4405F',
    iconBg: '#E4405F20',
  },
  {
    id: 'privacy-policy',
    label: t('menu.privacyPolicy') || 'Politique de confidentialite',
    sublabel: t('menu.privacyPolicyDescription') || 'Conditions et confidentialite',
    Icon: Shield,
    onPress: () => safeOpenURL('https://easy-woodwind-a70.notion.site/Yoroi-App-2d950188283880dbbd44d7e5abefecbb'),
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'ideas',
    label: t('menu.ideas'),
    sublabel: t('menu.ideasDescription'),
    Icon: Lightbulb,
    onPress: () => {},
    iconColor: '#FCD34D',
    iconBg: '#FCD34D20',
  },
  {
    id: 'rate',
    label: t('menu.rateApp'),
    sublabel: t('menu.rateAppDescription'),
    Icon: Star,
    onPress: () => {},
    iconColor: '#FBBF24',
    iconBg: '#FBBF2420',
  },
  {
    id: 'contact',
    label: t('menu.contact'),
    sublabel: t('menu.contactDescription'),
    Icon: MessageCircle,
    onPress: () => {},
    iconColor: '#14B8A6',
    iconBg: '#14B8A620',
  },
];

// Mots-clés supplémentaires pour améliorer la recherche
const SEARCH_KEYWORDS: Record<string, string[]> = {
  'timer': ['chrono', 'chronometre', 'temps', 'round', 'hiit', 'tabata'],
  'calculator': ['macro', 'imc', 'calorie', 'poids', 'calcul'],
  'fasting': ['jeune', 'intermittent', 'ramadan', 'kippur', 'omad'],
  'profile': ['profil', 'info', 'personnel', 'moi'],
  'photos': ['photo', 'transformation', 'avant', 'apres', 'image'],
  'badges': ['badge', 'collection', 'trophee', 'recompense', 'debloquer'],
  'avatars': ['avatar', 'personnaliser', 'guerrier', 'samurai', 'style'],
  'rangs': ['rang', 'grade', 'guerrier', 'ashigaru', 'bushi', 'samurai', 'ronin', 'shogun'],
  'niveaux': ['xp', 'niveau', 'progression', 'gamification', 'experience', 'points'],
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
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { t, language, setLanguage, supportedLanguages } = useI18n();

  // Generate menu items with translations
  const QUICK_ACTIONS = getQuickActions(t);
  const PROFILE_ITEMS = getProfileItems(t);
  const TOOLS_ITEMS = getToolsItems(t);
  const COMMUNITY_ITEMS = getCommunityItems(t);
  const DISPLAY_ITEMS = getDisplayItems(t);
  const REMINDERS_ITEMS = getRemindersItems(t);
  const HEALTH_ITEMS = getHealthItems(t);
  const BACKUP_ITEMS = getBackupItems(t);
  const SECURITY_ITEMS = getSecurityItems(t);
  const SUPPORT_ITEMS = getSupportItems(t);

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');

  // ... (autres etats) ...

  // Version Tap Logic - 5 taps pour débloquer le menu screenshot secret
  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 500) {
      const newCount = versionTapCount + 1;
      setVersionTapCount(newCount);

      // Feedback léger à chaque tap
      if (newCount >= 2 && newCount < 5) {
        impactAsync(ImpactFeedbackStyle.Light);
      }

      if (newCount === 5) {
        notificationAsync(NotificationFeedbackType.Success);
        setVersionTapCount(0);

        // Ouvrir le modal de code secret
        setSecretCode('');
        setShowSecretCodeModal(true);
      }
    } else {
      setVersionTapCount(1);
    }
    setLastTapTime(now);
  };

  // Validation du code secret pour le menu screenshot
  const handleSecretCodeSubmit = async () => {
    if (secretCode === '2022') {
      notificationAsync(NotificationFeedbackType.Success);
      setScreenshotMenuUnlocked(true);
      setCreatorModeActive(true);
      await AsyncStorage.setItem('@yoroi_screenshot_menu_unlocked', 'true');
      await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');
      setShowSecretCodeModal(false);
      setSecretCode('');

      showPopup(
        'Mode Créateur Débloqué',
        'L\'onglet Créateur est maintenant accessible. Tu peux générer des données de démo pour tes captures App Store.',
        [{ text: 'Parfait', style: 'primary' }],
        <Sparkles size={32} color={colors.accent} />
      );
    } else {
      notificationAsync(NotificationFeedbackType.Error);
      showPopup('Code Incorrect', 'Le code saisi n\'est pas valide.', [{ text: 'Réessayer', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
      setSecretCode('');
    }
  };

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

  // Language state
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const currentLang = language; // Utilise la langue du contexte

  // Tutoriel de découverte
  const [showTutorial, setShowTutorial] = useState(false);

  // Vérifier si c'est la première visite
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkFirstVisit = async () => {
      const visited = await hasVisitedPage('menu');
      if (!visited) {
        timer = setTimeout(() => setShowTutorial(true), 1000);
      }
    };
    checkFirstVisit();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleCloseTutorial = async () => {
    await markPageAsVisited('menu');
    setShowTutorial(false);
  };

  // Fermer sans marquer comme vu (bouton "Plus tard")
  const handleLaterTutorial = () => {
    setShowTutorial(false);
  };

  // Charger l'état du bouton partage flottant
  const SHARE_BUTTON_KEY = '@yoroi_stats_share_button_hidden';
  useEffect(() => {
    const loadShareButtonState = async () => {
      try {
        const hidden = await AsyncStorage.getItem(SHARE_BUTTON_KEY);
        setShareButtonVisible(!hidden);
      } catch (error) {
        logger.error('[More] Error loading share button state:', error);
      }
    };
    loadShareButtonState();
  }, []);

  // Toggle du bouton partage flottant
  const toggleShareButton = async (value: boolean) => {
    try {
      impactAsync(ImpactFeedbackStyle.Light);
      setShareButtonVisible(value);
      if (value) {
        await AsyncStorage.removeItem(SHARE_BUTTON_KEY);
      } else {
        await AsyncStorage.setItem(SHARE_BUTTON_KEY, 'true');
      }
    } catch (error) {
      logger.error('[More] Error toggling share button:', error);
    }
  };

  // Mode Créateur secret
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showCreatorInput, setShowCreatorInput] = useState(false);
  const [creatorCode, setCreatorCode] = useState('');
  const [creatorModeActive, setCreatorModeActive] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [longPressActive, setLongPressActive] = useState(false);
  const [secretGestureDone, setSecretGestureDone] = useState(0); // Geste secret: taper 3x sur le titre
  const [shareButtonVisible, setShareButtonVisible] = useState(true); // Bouton partage flottant

  // Menu Screenshot secret
  const [screenshotMenuUnlocked, setScreenshotMenuUnlocked] = useState(false);
  const [showSecretCodeModal, setShowSecretCodeModal] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [selectedDemoProfile, setSelectedDemoProfile] = useState<DemoProfileKey>('germain');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // Hash des codes secrets valides (ne jamais stocker les codes en clair)
  const SECRET_HASHES = [
    'f5903f51e341a783e69ffc2d9b335048716f5f040a782a2e1e1e14f8767e8c23',
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    'b1ab1e892617f210425f658cf1d361b5489028c8771b56d845fe1c62c1fbc8b0',
  ];

  // Charger l'état du mode créateur et du menu screenshot
  useEffect(() => {
    const loadCreatorMode = async () => {
      const mode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
      setCreatorModeActive(mode === 'true');

      // Charger l'état du menu screenshot secret
      const screenshotMenu = await AsyncStorage.getItem('@yoroi_screenshot_menu_unlocked');
      setScreenshotMenuUnlocked(screenshotMenu === 'true');
    };
    loadCreatorMode();
  }, []);

  const handlePurgeData = async () => {
    Alert.alert(
      '🔥 NETTOYAGE TOTAL',
      'Ceci va supprimer TOUTES les données de démo (Germain Del Jarret) et réinitialiser l\'application pour une synchronisation propre avec Apple Santé. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'OUI, TOUT SUPPRIMER', 
          style: 'destructive',
          onPress: async () => {
            const result = await clearScreenshotDemoData();
            if (result.success) {
              setCreatorModeActive(false);
              showPopup('Succès', 'Application nettoyée. Redémarre l\'app pour synchroniser tes vraies données Apple Santé.', [{ text: 'OK', style: 'primary' }]);
            }
          }
        }
      ]
    );
  };

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
        t('menu.deactivateCompetitorMode'),
        t('menu.confirmDeactivateCompetitor'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                await saveUserMode(newMode);
                await saveUserSettings({ userMode: newMode });
                setUserModeSetting(newMode);
                showPopup(t('menu.modeChanged'), t('menu.nowInLeisureMode'), [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
              } catch (error) {
                logger.error('[MoreScreen] Error changing mode:', error);
                showPopup(t('common.error'), t('errors.unknownError'), [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
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
            t('menu.competitorModeActivated'),
            t('menu.configureYourSports'),
            [{ text: 'OK', style: 'primary' }],
            <CheckCircle size={32} color="#10B981" />
          );
        }
      } catch (error) {
        logger.error('[MoreScreen] Error changing mode:', error);
        showPopup(t('common.error'), t('errors.unknownError'), [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
      }
    }
  };

  const handleShowTutorial = async () => {
    showPopup(
      t('menu.tutorial'),
      'Tu vas être redirigé vers l\'accueil pour revoir tous les tutoriels depuis le début. Continue ?',
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: 'Commencer',
          style: 'primary',
          onPress: async () => {
            try {
              // Réinitialiser tous les tutoriels
              await resetAllTutorials();

              // Rediriger vers l'accueil
              router.push('/(tabs)');

              // Feedback haptique
              notificationAsync(NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error resetting tutorials:', error);
              showPopup(
                t('common.error'),
                'Impossible de réinitialiser les tutoriels',
                [{ text: 'OK', style: 'primary' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    showPopup(
      t('menu.exportMyData'),
      'Choisis le format de sauvegarde',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Backup Complet',
          style: 'primary',
          onPress: () => exportDataToJSON()
        },
        {
          text: 'CSV Éditable',
          style: 'default',
          onPress: () => handleExportEditable()
        },
      ]
    );
  };

  // Export éditable pour modification sur ordinateur
  const handleExportEditable = async () => {
    showPopup(
      'Export Éditable',
      'Exporte tes données dans un format que tu peux modifier sur ordinateur puis réimporter',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Mes Données',
          style: 'primary',
          onPress: () => exportEditableCSV()
        },
        {
          text: 'Template Vide',
          style: 'default',
          onPress: () => exportEmptyTemplate()
        },
      ]
    );
  };

  const handleImport = async () => {
    showPopup(
      'Restaurer mes données',
      'Choisis le type de fichier à importer',
      [
        { text: t('common.cancel'), style: 'cancel' },
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
              logger.error('Erreur import:', error);
              notificationAsync(NotificationFeedbackType.Error);
            }
          }
        },
        {
          text: 'CSV Éditable',
          style: 'default',
          onPress: async () => {
            try {
              const success = await importEditableCSV();
              if (success) {
                notificationAsync(NotificationFeedbackType.Success);
                router.push('/(tabs)');
              }
            } catch (error) {
              logger.error('Erreur import CSV:', error);
              notificationAsync(NotificationFeedbackType.Error);
            }
          }
        },
      ]
    );
  };

  const handleRate = async () => {
    try {
      // Ouvrir directement la page App Store pour notation
      const appStoreURL = 'https://apps.apple.com/us/app/yoroi-suivi-poids-sport/id6757306612';
      await safeOpenURL(appStoreURL);
    } catch (e) {
      logger.error('Rate error:', e);
      showPopup(t('common.error'), t('errors.unknownError'), [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleContact = () => {
    router.push({ pathname: '/ideas', params: { category: 'other' } });
  };

  const handleExportPDF = async () => {
    showPopup(
      t('menu.pdfReportTitle'),
      t('menu.choosePeriod'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('menu.days30'),
          style: 'default',
          onPress: async () => {
            try {
              await generateProgressPDF('30j');
            } catch (e) {
              showPopup(t('common.error'), t('errors.unknownError'), [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
            }
          }
        },
        {
          text: t('menu.days90'),
          style: 'primary',
          onPress: async () => {
            try {
              await generateProgressPDF('90j');
            } catch (e) {
              showPopup(t('common.error'), t('errors.unknownError'), [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
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
          t('menu.dataDeleted'),
          t('menu.allDataDeleted'),
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
        showPopup(t('common.error'), t('errors.unknownError'), [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
      }
    } else {
      showPopup(t('common.error'), t('menu.typeYes'), [{ text: 'OK', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
    }
  };

  const handleLanguage = () => {
    setLanguageModalVisible(true);
  };

  const handleChangeLanguage = async (langCode: string) => {
    // Ne rien faire si c'est déjà la langue sélectionnée
    if (langCode === language) return;

    try {
      impactAsync(ImpactFeedbackStyle.Light);
      await setLanguage(langCode);
      setLanguageModalVisible(false); // Ferme le modal si ouvert
      notificationAsync(NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('[MoreScreen] Error changing language:', error);
      showPopup(
        t('common.error'),
        'Erreur lors du changement de langue',
        [{ text: 'OK', style: 'primary' }],
        <AlertCircle size={32} color="#EF4444" />
      );
    }
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
      t('menu.icloudSyncTitle'),
      t('menu.icloudSyncComingSoon'),
      [{ text: 'OK', style: 'primary' }]
    );
  };

  const handleUnits = () => {
    setUnitsModalVisible(true);
  };

  const handleIdeas = () => {
    router.push({ pathname: '/ideas', params: { category: 'feature' } });
  };

  const handleModeChange = async (mode: 'light' | 'dark' | 'auto') => {
    try {
      await setThemeMode(mode);
    } catch (error) {
      logger.error('[MoreScreen] Error changing theme mode:', error);
    }
  };

  const handleCloseCreatorModal = () => {
    setShowCreatorInput(false);
    setCreatorCode('');
    setSecretGestureDone(0);
  };

  const handleSecretGesture = () => {
    const newCount = secretGestureDone + 1;
    setSecretGestureDone(newCount);
    if (newCount >= 3) {
      notificationAsync(NotificationFeedbackType.Success);
      setShowCreatorInput(true);
      setSecretGestureDone(0);
    } else {
      impactAsync(ImpactFeedbackStyle.Light);
    }
  };

  const handleCreatorCodeSubmit = async () => {
    try {
      const hash = await digestStringAsync(
        CryptoDigestAlgorithm.SHA256,
        creatorCode
      );
      
      if (SECRET_HASHES.includes(hash)) {
        notificationAsync(NotificationFeedbackType.Success);
        setCreatorModeActive(true);
        await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');
        await generateScreenshotDemoData();
        handleCloseCreatorModal();
        showPopup('Mode Créateur Activé', 'Bienvenue Germain.', [{ text: 'Merci', style: 'primary' }]);
      } else {
        notificationAsync(NotificationFeedbackType.Error);
        Alert.alert('Erreur', 'Code incorrect.');
        setCreatorCode('');
      }
    } catch (error) {
      console.error(error);
    }
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
    if (item.id === 'export-editable') {
      handleExportEditable();
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MoreTabView showCaptureTab={screenshotMenuUnlocked} creatorModeActive={creatorModeActive}>
        {/* PAGE 1 - PROFIL */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* MODE UTILISATEUR */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('menu.mode')}</Text>
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
                  {userModeSetting === 'competiteur' ? t('menu.modeCompetitor') : t('menu.modeLeisure')}
                </Text>
                <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                  {userModeSetting === 'competiteur'
                    ? t('menu.modeCompetitorDescription')
                    : t('menu.modeLeisureDescription')}
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
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('menu.competitorConfig')}</Text>
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
                    {t('menu.weightCategory')}
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {selectedWeightCategory
                      ? `${selectedWeightCategory.name} (${selectedWeightCategory.maxWeight}kg)`
                      : t('menu.weightCategoryNotDefined')}
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
                    {t('menu.mySports')}
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {userSports.length > 0
                      ? userSports.map(s => SPORT_LABELS[s]).join(', ')
                      : t('menu.noSportDefined')}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

            </View>
          </View>
        )}

          {/* PROFIL */}
          {renderSection(t('menu.profileAndGamification'), PROFILE_ITEMS)}
        </ScrollView>

        {/* PAGE 2 - APPARENCE */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* MODE D'AFFICHAGE */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('menu.displayMode')}</Text>
            <View style={[styles.modeSection, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16 }]}>
              <View style={styles.modesContainer}>
                {[
                  { mode: 'dark' as const, label: t('menu.dark'), icon: Moon },
                  { mode: 'light' as const, label: t('menu.light'), icon: Sun },
                  { mode: 'auto' as const, label: t('menu.auto'), icon: Smartphone },
                ].map(({ mode, label, icon: Icon }) => {
                  const isActive = themeMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeButton,
                        { backgroundColor: colors.backgroundElevated },
                        isActive && { backgroundColor: colors.accent },
                      ]}
                      onPress={() => handleModeChange(mode)}
                      activeOpacity={0.7}
                    >
                      <Icon
                        size={20}
                        color={isActive ? colors.textOnAccent : colors.textPrimary}
                      />
                      <Text
                        style={[
                          styles.modeLabel,
                          {
                            color: isActive ? colors.textOnAccent : colors.textPrimary,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* PERSONNALISATION */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('menu.customization')}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Thèmes */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/themes' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: colors.accent + '15' }]}>
                  <Palette size={20} color={colors.accentText} strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    {t('menu.themes')}
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {t('menu.themesDescription')}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Logo de l'app */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/logo-selection' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#8B5CF615' }]}>
                  <ImageIcon size={20} color="#8B5CF6" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    {t('menu.appLogo')}
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {t('menu.appLogoDescription')}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Citations */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/citations' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#10B98115' }]}>
                  <MessageSquareQuote size={20} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    {t('menu.citations')}
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {t('menu.citationsDescription')}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Avatar */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/avatar-selection' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#F59E0B15' }]}>
                  <User size={20} color="#F59E0B" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    {t('menu.avatar')}
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {t('menu.avatarDescription')}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Toggle Bouton Partage Stats */}
              <View style={[styles.menuItem, { backgroundColor: colors.card }]}>
                <View style={[styles.menuItemIcon, { backgroundColor: '#3B82F615' }]}>
                  <Share2 size={20} color="#3B82F6" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    {t('menu.shareStatsButton') || 'Bouton Partage Stats'}
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {t('menu.shareStatsButtonDescription') || 'Afficher le bouton flottant'}
                  </Text>
                </View>
                <Switch
                  value={shareButtonVisible}
                  onValueChange={toggleShareButton}
                  trackColor={{ false: colors.border, true: colors.accent + '60' }}
                  thumbColor={shareButtonVisible ? colors.accent : colors.textMuted}
                  ios_backgroundColor={colors.border}
                />
              </View>
            </View>
          </View>

          {/* LANGUE - Drapeaux cliquables */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('menu.language') || 'Langue'}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
              <View style={styles.languageFlagsGrid}>
                {supportedLanguages.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.languageFlagButton,
                        {
                          backgroundColor: isSelected ? colors.accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => handleChangeLanguage(lang.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.languageFlagEmoji}>{lang.flag}</Text>
                      <Text
                        style={[
                          styles.languageFlagLabel,
                          {
                            color: isSelected ? colors.textOnAccent : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {lang.code.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.languageHint, { color: colors.textMuted }]}>
                {t('menu.languageDescription') || "La langue s'applique à toute l'interface"}
              </Text>
            </View>
          </View>

          {/* RAPPELS & NOTIFICATIONS */}
          {renderSection(t('menu.reminders'), REMINDERS_ITEMS)}
        </ScrollView>

        {/* PAGE 3 - DONNÉES */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* SANTÉ & DONNÉES */}
          {renderSection(t('menu.connectedHealth'), HEALTH_ITEMS)}
          {renderSection(t('menu.backupAndRestore'), BACKUP_ITEMS)}
        </ScrollView>

        {/* PAGE 4 - SUPPORT */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* COMMUNAUTÉ & SUPPORT */}
          {renderSection(t('menu.community'), COMMUNITY_ITEMS)}
          {renderSection(t('menu.support'), SUPPORT_ITEMS)}
          {renderSection(t('menu.security'), SECURITY_ITEMS)}

          {/* BIENTÔT DISPONIBLE */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('menu.comingSoon')}</Text>
          <TouchableOpacity
            style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setUpcomingModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.comingSoonContent}>
              <Zap size={24} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
                  {t('menu.newFeaturesComingSoon')}
                </Text>
                <Text style={[styles.comingSoonDesc, { color: colors.textSecondary }]}>
                  {t('menu.clickToSeeRoadmap')}
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
                {t('menu.private100')}
              </Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                {t('menu.privateDescription')}
              </Text>
            </View>
          </View>

          <View style={[styles.madeWith, { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>{t('menu.madeWithLove')}</Text>
            <Heart size={14} color="#EF4444" fill="#EF4444" />
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>{t('menu.inFrance')}</Text>
          </View>

          <TouchableOpacity
            onPress={handleVersionTap}
            activeOpacity={1}
          >
            <Text style={{
              color: colors.textMuted,
              fontSize: 12,
              marginTop: 12,
              textAlign: 'center'
            }}>
              YOROI Version 2.0
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

        {/* PAGE 5 - CRÉATEUR (conditionnel) */}
        {screenshotMenuUnlocked && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* HEADER */}
            <View style={[styles.captureHeader, { backgroundColor: colors.accent + '15' }]}>
              <Sparkles size={32} color={colors.accent} />
              <Text style={[styles.captureHeaderTitle, { color: colors.accent }]}>
                Mode Créateur
              </Text>
              <Text style={[styles.captureHeaderSubtitle, { color: colors.textMuted }]}>
                Outils pour screenshots App Store
              </Text>
            </View>

            {/* PROFILS DE DÉMO */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PROFILS DE DÉMO</Text>
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

                {/* Liste des profils */}
                {Object.entries(DEMO_PROFILES).map(([key, profile]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.menuItem,
                      {
                        backgroundColor: selectedDemoProfile === key ? colors.primary + '15' : colors.card,
                        borderLeftWidth: selectedDemoProfile === key ? 3 : 0,
                        borderLeftColor: colors.primary,
                      }
                    ]}
                    onPress={() => setSelectedDemoProfile(key as DemoProfileKey)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: selectedDemoProfile === key ? colors.primary + '30' : colors.accent + '20' }]}>
                      <User size={20} color={selectedDemoProfile === key ? colors.primary : colors.accent} strokeWidth={2} />
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={[styles.menuItemLabel, { color: selectedDemoProfile === key ? colors.primary : colors.textPrimary }]}>{profile.name}</Text>
                      <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>{profile.description}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        {profile.start_weight}kg → {profile.target_weight}kg • {profile.sport.toUpperCase()}
                      </Text>
                    </View>
                    {selectedDemoProfile === key && (
                      <CheckCircle size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                {/* Bouton Générer */}
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor: colors.primary,
                      marginTop: 12,
                      borderRadius: 12,
                      opacity: isGeneratingDemo ? 0.6 : 1,
                    }
                  ]}
                  onPress={async () => {
                    if (isGeneratingDemo) return;
                    setIsGeneratingDemo(true);
                    setActiveDemoProfile(selectedDemoProfile);
                    const result = await generateScreenshotDemoData();
                    setIsGeneratingDemo(false);
                    if (result.success) {
                      setCreatorModeActive(true);
                      await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');
                      notificationAsync(NotificationFeedbackType.Success);
                      showPopup(
                        `${DEMO_PROFILES[selectedDemoProfile].name} Activé`,
                        'Données de démo générées avec succès ! Redémarre l\'app pour voir les changements.',
                        [{ text: 'Parfait', style: 'primary' }],
                        <CheckCircle size={32} color="#10B981" />
                      );
                    } else {
                      showPopup('Erreur', result.error || 'Erreur lors de la génération', [{ text: 'OK', style: 'cancel' }], <AlertCircle size={32} color="#EF4444" />);
                    }
                  }}
                  disabled={isGeneratingDemo}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Sparkles size={20} color="#FFF" strokeWidth={2} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemLabel, { color: '#FFF' }]}>
                      {isGeneratingDemo ? 'Génération en cours...' : `Générer ${DEMO_PROFILES[selectedDemoProfile].name}`}
                    </Text>
                    <Text style={[styles.menuItemSublabel, { color: 'rgba(255,255,255,0.7)' }]}>Génère un profil complet avec belles données</Text>
                  </View>
                </TouchableOpacity>

              </View>
            </View>

            {/* NETTOYAGE */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NETTOYAGE</Text>
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

                {/* Reset / Nettoyer */}
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.card }]}
                  onPress={() => {
                    showPopup(
                      'Nettoyer les données',
                      'Supprimer toutes les données de démo et masquer l\'onglet Créateur ?',
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Nettoyer',
                          style: 'destructive',
                          onPress: async () => {
                            await clearScreenshotDemoData();
                            await AsyncStorage.removeItem('@yoroi_screenshot_menu_unlocked');
                            await AsyncStorage.removeItem('@yoroi_screenshot_mode');
                            setScreenshotMenuUnlocked(false);
                            setCreatorModeActive(false);
                            notificationAsync(NotificationFeedbackType.Success);
                            showPopup('Nettoyé', 'Données de démo supprimées. L\'onglet Créateur est maintenant masqué.', [{ text: 'OK', style: 'primary' }]);
                          },
                        },
                      ],
                      <Trash2 size={32} color="#EF4444" />
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: '#EF444420' }]}>
                    <Trash2 size={20} color="#EF4444" strokeWidth={2} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemLabel, { color: '#EF4444' }]}>Nettoyer & Masquer</Text>
                    <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>Supprime les données et cache l'onglet</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>

              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </MoreTabView>

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
                {t('menu.myCompetitionSports')}
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
                showPopup(t('menu.saved'), `${userSports.length} ${t('menu.sportsSelected')}`, [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
              }}
            >
              <Text style={styles.modalButtonText}>{t('common.save')}</Text>
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
                {t('menu.myWeightCategory')}
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
                    {t('menu.selectSportFirst')}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Sport Selector */}
                  {userSports.length > 1 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                        {t('menu.sport')}
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
                      {t('menu.gender')}
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
                          {t('menu.male')}
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
                          {t('menu.female')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Weight Categories */}
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    {t('menu.categories')}
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
                  showPopup(t('menu.saved'), `${t('menu.category')}: ${selectedWeightCategory.name}`, [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
                }
              }}
              disabled={!selectedWeightCategory}
            >
              <Text style={styles.modalButtonText}>{t('common.save')}</Text>
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
                {t('menu.roadmapYoroi')}
              </Text>
              <TouchableOpacity onPress={() => setUpcomingModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.upcomingSubtitle, { color: colors.textPrimary }]}>
                {t('menu.featuresInDevelopment')}
              </Text>

              <View style={styles.upcomingList}>
                <View style={styles.upcomingItem}>
                  <Watch size={18} color="#EC4899" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.appleWatchRealtime')}</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <MessageCircle size={18} color="#8B5CF6" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.siriMode')}</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Share2 size={18} color="#3B82F6" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.shareWithCoach')}</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Trophy size={18} color="#F59E0B" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.friendsLeaderboard')}</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Bell size={18} color="#10B981" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.smartReminders')}</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Globe size={18} color="#06B6D4" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.multilingual')}</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Activity size={18} color="#EF4444" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.videoAnalysis')}</Text>
                </View>
                <View style={styles.upcomingItem}>
                  <Calendar size={18} color="#A855F7" />
                  <Text style={[styles.upcomingText, { color: colors.textSecondary }]}>{t('menu.calendarSync')}</Text>
                </View>
              </View>

              <View style={[styles.feedbackCard, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: isDark ? '#F59E0B40' : '#F59E0B' }]}>
                <Lightbulb size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>
                    {t('menu.haveIdea')}
                  </Text>
                  <Text style={[styles.feedbackDesc, { color: colors.textSecondary }]}>
                    {t('menu.tellUsWhatYouWant')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.feedbackButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setUpcomingModalVisible(false);
                  router.push({ pathname: '/ideas', params: { category: 'feature' } });
                }}
              >
                <MessageCircle size={18} color={colors.textOnAccent} />
                <Text style={[styles.feedbackButtonText, { color: colors.textOnAccent }]}>{t('menu.sendIdea')}</Text>
              </TouchableOpacity>

              <Text style={[styles.upcomingNote, { color: colors.textMuted }]}>
                {t('menu.dontHesitateToContact')}
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
                {t('menu.resetData')}
              </Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.warningCard, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
                <Trash2 size={32} color="#EF4444" />
                <Text style={[styles.warningTitle, { color: '#EF4444' }]}>
                  {t('menu.irreversibleAction')}
                </Text>
                <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                  {t('menu.deleteAllDataWarning')}
                </Text>
                <View style={styles.warningList}>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• {t('menu.weightAndMeasures')}</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• {t('menu.transformationPhotos')}</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• {t('menu.trainingsAndPlanning')}</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• {t('menu.badgesAndProgress')}</Text>
                  <Text style={[styles.warningListItem, { color: colors.textSecondary }]}>• {t('menu.allSettings')}</Text>
                </View>
              </View>

              <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>
                {t('menu.toConfirmType')} <Text style={{ fontWeight: '800', color: '#EF4444' }}>OUI</Text> {t('menu.below')}
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
                placeholder={t('menu.typeYes')}
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
                <Text style={[styles.resetCancelButtonText, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
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
                  {t('common.deleteAll')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal - Code Secret Screenshot */}
      <Modal
        visible={showSecretCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSecretCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxWidth: 340 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Accès Mode Capture
              </Text>
              <TouchableOpacity onPress={() => setShowSecretCodeModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.secretCodeIconContainer, { backgroundColor: colors.accent + '15' }]}>
                <Camera size={40} color={colors.accent} />
              </View>

              <Text style={[styles.secretCodeTitle, { color: colors.textPrimary }]}>
                Mode Créateur
              </Text>
              <Text style={[styles.secretCodeSubtitle, { color: colors.textMuted }]}>
                Entre le code secret pour débloquer le mode créateur et les outils de démo.
              </Text>

              <TextInput
                style={[
                  styles.secretCodeInput,
                  {
                    backgroundColor: colors.backgroundElevated,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={secretCode}
                onChangeText={setSecretCode}
                placeholder="Code secret"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoFocus
              />

              <TouchableOpacity
                style={[
                  styles.secretCodeButton,
                  {
                    backgroundColor: secretCode.length === 4 ? colors.accent : colors.backgroundElevated,
                    opacity: secretCode.length === 4 ? 1 : 0.5,
                  },
                ]}
                onPress={handleSecretCodeSubmit}
                disabled={secretCode.length !== 4}
              >
                <Text style={[
                  styles.secretCodeButtonText,
                  { color: secretCode.length === 4 ? colors.textOnAccent : colors.textMuted },
                ]}>
                  Débloquer
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
                {t('menu.unitsOfMeasure')}
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
                        {t('menu.metric')}
                      </Text>
                      <Text style={[styles.unitsOptionDesc, { color: colors.textMuted }]}>
                        {t('menu.metricDescription')}
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
                        {t('menu.imperial')}
                      </Text>
                      <Text style={[styles.unitsOptionDesc, { color: colors.textMuted }]}>
                        {t('menu.imperialDescription')}
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
                showPopup(t('menu.saved'), `${t('menu.units')}: ${useMetric ? t('menu.unitsMetric') : t('menu.unitsImperial')}`, [{ text: 'OK', style: 'primary' }], <CheckCircle size={32} color="#10B981" />);
              }}
            >
              <Text style={styles.modalButtonText}>{t('common.save')}</Text>
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
                  {t('menu.activation')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCloseCreatorModal}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.creatorDescription, { color: colors.textSecondary }]}>
                {t('menu.enterActivationCode')}
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
                <Text style={[styles.creatorCancelButtonText, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
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
                  {t('menu.validate')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal - Language Selection */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('menu.language')}
              </Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {supportedLanguages.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.sportOption,
                      {
                        backgroundColor: isSelected ? colors.accent + '20' : colors.backgroundElevated,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => handleChangeLanguage(lang.code)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                      <View>
                        <Text style={[styles.sportOptionText, { color: colors.textPrimary }]}>
                          {lang.nativeName}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>
                          {lang.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tutoriel de découverte */}
      {showTutorial && (
        <FeatureDiscoveryModal
          visible={true}
          tutorial={PAGE_TUTORIALS.menu}
          onClose={handleCloseTutorial}
          onSkip={handleLaterTutorial}
        />
      )}

      <PopupComponent />
    </View>
  );
}

const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 60) / 4;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 250,
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
    paddingBottom: 100,
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

  // LANGUAGE FLAGS GRID
  languageFlagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 12,
  },
  languageFlagButton: {
    width: (SCREEN_WIDTH - 100) / 5,
    minWidth: 56,
    maxWidth: 70,
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  languageFlagEmoji: {
    fontSize: 24,
  },
  languageFlagLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  languageHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
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

  // Mode Display Section
  modeSection: {
    // Styles applied inline in component
  },
  modesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // SECRET CODE MODAL
  secretCodeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  secretCodeTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  secretCodeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  secretCodeInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  secretCodeButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  secretCodeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // CAPTURE TAB HEADER
  captureHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
  },
  captureHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  captureHeaderSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
