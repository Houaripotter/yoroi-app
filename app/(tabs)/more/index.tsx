import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { CheckCircle, AlertCircle,
  User,
  Camera,
  Star,
  ChevronRight,
  Ruler,
  Download,
  Upload,
  Share2,
  LucideIcon,
  Utensils,
  Timer,
  Calculator,
  Apple,
  Activity,
  BookOpen,
  Sparkles,
  Heart,
  Shield,
  Zap,
  Trophy,
  FlaskConical,
  Info,
  Scale,
  X,
  Swords,
  Award,
  Moon,
  Wrench,
  Dumbbell,
  Target,
  History,
  Clock,
  Droplets,
  Stethoscope,
  Layers,
  Trash2,
  Search,
  RefreshCw,
  Table,
  Database,
  TrendingUp,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON, exportEditableCSV, exportEmptyTemplate } from '@/lib/exportService';
import { safeOpenURL } from '@/lib/security/validators';
import { scale, scaleModerate } from '@/constants/responsive';
import { resetAllData } from '@/lib/storage';
import logger from '@/lib/security/logger';
import { verifyDevCode } from '@/lib/DevModeContext';
import { useI18n } from '@/lib/I18nContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================
// TOOL SECTIONS DATA
// ============================================

interface ToolItem {
  id: string;
  label: string;
  sublabel: string;
  Icon: LucideIcon;
  route?: string;
  handler?: string; // special handler id
  iconColor: string;
}

interface ToolSection {
  title: string;
  items: ToolItem[];
}

const TOOL_SECTIONS: ToolSection[] = [
  {
    title: 'ENTRAÎNEMENT',
    items: [
      { id: 'add-training', label: 'Ajouter une séance', sublabel: 'Enregistrer un entraînement', Icon: Dumbbell, route: '/add-training', iconColor: '#EF4444' },
      { id: 'training-journal', label: "Carnet d'entraînement", sublabel: 'Records et PR par exercice', Icon: BookOpen, route: '/training-journal', iconColor: '#F97316' },
      { id: 'history', label: 'Mes séances', sublabel: 'Toutes tes séances — GPS, FC, calories', Icon: Activity, route: '/history', iconColor: '#10B981' },
      { id: 'activity-history', label: 'Activité quotidienne', sublabel: 'Pas et calories du jour', Icon: History, route: '/activity-history', iconColor: '#6366F1' },
      { id: 'training-goals', label: 'Objectifs sportifs', sublabel: 'Definir et suivre tes objectifs', Icon: Target, route: '/training-goals', iconColor: '#10B981' },
      { id: 'records', label: 'Records personnels', sublabel: 'Tes meilleures performances', Icon: Trophy, route: '/records', iconColor: '#EF4444' },
      { id: 'sport', label: 'Mes sports', sublabel: 'Gerer tes disciplines', Icon: Swords, route: '/sport', iconColor: '#EC4899' },
      { id: 'slots', label: 'Creneaux reguliers', sublabel: 'Gerer tes entraînements recurrents', Icon: RefreshCw, route: '/slots', iconColor: '#6366F1' },
      { id: 'timer', label: 'Timer', sublabel: 'Chrono, rounds, HIIT, Tabata', Icon: Timer, route: '/timer', iconColor: '#4ECDC4' },
    ],
  },
  {
    title: 'CORPS & SANTÉ',
    items: [
      { id: 'body-history', label: 'Historique corporel', sublabel: 'Poids · Muscle · Graisse · Mensurations…', Icon: Database, route: '/body-history', iconColor: '#3B82F6' },
      { id: 'body-composition', label: 'Ajouter composition', sublabel: 'Saisir graisse, muscle, eau depuis balance', Icon: Activity, route: '/body-composition', iconColor: '#10B981' },
      { id: 'measurements', label: 'Ajouter mensurations', sublabel: 'Tour de bras, taille, cuisses...', Icon: Ruler, route: '/measurements', iconColor: '#8B5CF6' },
      { id: 'body-status', label: 'Etat du corps', sublabel: 'Carte des zones a surveiller', Icon: Shield, route: '/body-status', iconColor: '#F97316' },
      { id: 'infirmary', label: 'Infirmerie', sublabel: 'Suivi des blessures et recup', Icon: Heart, route: '/infirmary', iconColor: '#EF4444' },
      { id: 'injury-assessment', label: 'Evaluation blessure', sublabel: 'Severite et temps de recup', Icon: AlertCircle, route: '/injury-evaluation', iconColor: '#EF4444' },
      { id: 'heart-zones', label: 'Zones cardio', sublabel: 'Calcul par methode Karvonen', Icon: Heart, route: '/heart-zones', iconColor: '#EC4899' },
      { id: 'photos', label: 'Photos avant / apres', sublabel: 'Comparer ta transformation', Icon: Camera, route: '/photos', iconColor: '#8B5CF6' },
    ],
  },
  {
    title: 'SUIVI QUOTIDIEN',
    items: [
      { id: 'sleep', label: 'Sommeil', sublabel: 'Qualité et durée de tes nuits', Icon: Moon, route: '/sleep', iconColor: '#6366F1' },
      { id: 'hydration', label: 'Hydratation', sublabel: "Suivi de l'eau par jour", Icon: Droplets, route: '/hydration', iconColor: '#3B82F6' },
      { id: 'fasting', label: 'Jeune', sublabel: 'Ramadan, intermittent, OMAD', Icon: Utensils, route: '/fasting', iconColor: '#A855F7' },
      { id: 'nutrition-plan', label: 'Nutrition', sublabel: 'Plan alimentaire et macros', Icon: Apple, route: '/nutrition-plan', iconColor: '#10B981' },
      { id: 'energy', label: 'Énergie', sublabel: 'Niveau de charge et fatigue', Icon: Zap, route: '/energy', iconColor: '#F59E0B' },
      { id: 'health-metrics', label: 'Santé', sublabel: 'Données Apple Health / Google Fit', Icon: Stethoscope, route: '/health-metrics', iconColor: '#EC4899' },
    ],
  },
  {
    title: 'COMPETITEUR',
    items: [
      { id: 'competitor-space', label: 'Espace competiteur', sublabel: 'Mode fighter, stats de combat', Icon: Swords, route: '/competitor-space', iconColor: '#EF4444' },
      { id: 'competitions', label: 'Competitions', sublabel: 'Calendrier et inscriptions', Icon: Trophy, route: '/competitions', iconColor: '#F59E0B' },
      { id: 'palmares', label: 'Palmares', sublabel: 'Victoires, defaites, nuls', Icon: Award, route: '/palmares', iconColor: '#FBBF24' },
      { id: 'weight-cut', label: 'Coupe de poids', sublabel: 'Gestion de perte controlee', Icon: Scale, route: '/weight-cut', iconColor: '#F97316' },
      { id: 'fighter-card', label: 'Carte fighter', sublabel: 'Profil a partager', Icon: User, route: '/fighter-card', iconColor: '#EC4899' },
      { id: 'mat-time', label: 'Mat Time', sublabel: "Total d'heures sur le tatami", Icon: Clock, route: '/mat-time', iconColor: '#8B5CF6' },
      { id: 'match-tracker', label: 'Match Tracker', sublabel: 'Suivi de match en direct', Icon: Swords, route: '/match-tracker', iconColor: '#EF4444' },
      { id: 'competition-camp', label: 'Camp de competition', sublabel: 'Plan periodise avant une compet', Icon: Trophy, route: '/competition-camp', iconColor: '#8B5CF6' },
      { id: 'benchmark', label: 'Benchmark vs pairs', sublabel: 'Compare tes stats a ton niveau', Icon: Award, route: '/benchmark', iconColor: '#F59E0B' },
    ],
  },
  {
    title: 'COMBAT LAB',
    items: [
      { id: 'drill-tracker', label: 'Drill Tracker', sublabel: 'Compteur de repetitions par technique', Icon: Target, route: '/drill-tracker', iconColor: '#F97316' },
      { id: 'sparring-partners', label: 'Partenaires tactiques', sublabel: 'Forces, faiblesses, ce qui marche', Icon: Shield, route: '/sparring-partners', iconColor: '#06B6D4' },
      { id: 'sparring-ranking', label: 'Classement Sparring', sublabel: 'Rank tes partenaires de combat', Icon: Trophy, route: '/sparring-ranking', iconColor: '#F59E0B' },
      { id: 'combat-timer', label: 'Mode Salle', sublabel: 'Timer de rounds sparring avec suivi', Icon: Timer, route: '/combat-timer', iconColor: '#EF4444' },
      { id: 'game-plan', label: 'Mon Game Plan', sublabel: 'Checklist, playbook, dangers, journal', Icon: Target, route: '/game-plan', iconColor: '#8B5CF6' },
      { id: 'combat-achievements', label: 'Achievements Sparring', sublabel: 'Badges à débloquer', Icon: Award, route: '/combat-achievements', iconColor: '#EAB308' },
      { id: 'bjj-positions', label: 'Carte BJJ', sublabel: 'Heatmap des positions et soumissions', Icon: Layers, route: '/bjj-positions', iconColor: '#22C55E' },
      { id: 'combat-analytics', label: 'Analyse de combat', sublabel: 'Stats sparring, techniques, finitions', Icon: Activity, route: '/combat-analytics', iconColor: '#8B5CF6' },
      { id: 'rounds-insights', label: 'Suivi des débriefs', sublabel: 'Ce qui marche, ce qui bloque, ressentis', Icon: TrendingUp, route: '/rounds-insights', iconColor: '#22C55E' },
      { id: 'sync-history', label: 'Historique de synchronisation', sublabel: 'Backups, sync cloud, transferts iPad…', Icon: Clock, route: '/sync-history', iconColor: '#8B5CF6' },
      { id: 'quick-log', label: 'Log rapide', sublabel: 'Saisie vocale post-seance', Icon: Zap, route: '/quick-log', iconColor: '#8B5CF6' },
    ],
  },
  {
    title: 'OUTILS & CALCULS',
    items: [
      { id: 'calculators', label: 'Calculateurs', sublabel: 'IMC, macros, 1RM, metabolisme', Icon: Calculator, route: '/calculators', iconColor: '#F59E0B' },
      { id: 'performance-detail', label: 'Radar performance', sublabel: '6 dimensions de ta forme', Icon: Activity, route: '/performance-detail', iconColor: '#8B5CF6' },
      { id: 'quick-nutrition', label: 'Guide nutrition effort', sublabel: 'Quoi manger avant et apres', Icon: Apple, route: '/quick-nutrition', iconColor: '#10B981' },
      { id: 'share-hub', label: 'Partager', sublabel: 'Creer des cartes Instagram / stories', Icon: Share2, route: '/share-hub', iconColor: '#EC4899' },
    ],
  },
  {
    title: 'PROGRESSION & GAMIFICATION',
    items: [
      { id: 'gamification', label: 'Progression', sublabel: 'XP, niveaux, rang', Icon: Sparkles, route: '/gamification', iconColor: '#F59E0B' },
      { id: 'badges', label: 'Badges', sublabel: 'Succes debloques', Icon: Award, route: '/badges', iconColor: '#EC4899' },
      { id: 'challenges', label: 'Défis', sublabel: 'Quotidiens et hebdomadaires', Icon: Target, route: '/challenges', iconColor: '#10B981' },
    ],
  },
  {
    title: 'HISTORIQUES & COURBES',
    items: [
      { id: 'sleep-history', label: 'Historique sommeil', sublabel: 'Courbes et tendances', Icon: Moon, route: '/sleep-history', iconColor: '#6366F1' },
      { id: 'composition-detail', label: 'Courbes composition', sublabel: 'Evolution gras, muscle, eau', Icon: Layers, route: '/composition-detail', iconColor: '#4ECDC4' },
      { id: 'measurements-detail', label: 'Courbes mensurations', sublabel: 'Evolution des mesures', Icon: Ruler, route: '/measurements-detail', iconColor: '#8B5CF6' },
    ],
  },
  {
    title: 'DONNÉES',
    items: [
      { id: 'companion', label: 'Mes données', sublabel: 'Tableau, graphiques, ajout et export CSV', Icon: Table, route: '/companion', iconColor: '#4F8EF7' },
      { id: 'import-csv', label: 'Import CSV', sublabel: 'Importer poids, séances, sommeil... depuis un PC', Icon: Upload, route: '/import-csv', iconColor: '#6366F1' },
      { id: 'export-data', label: 'Exporter', sublabel: 'Sauvegarder tes données en JSON, CSV ou rapport', Icon: Download, handler: 'export', iconColor: '#10B981' },
    ],
  },
  {
    title: 'COMMUNAUTE & SAVOIR',
    items: [
      { id: 'savoir', label: 'Savoir', sublabel: 'Articles sur la science du sport', Icon: FlaskConical, route: '/savoir', iconColor: '#8B5CF6' },
      { id: 'sources', label: 'Sources scientifiques', sublabel: 'References academiques', Icon: BookOpen, route: '/scientific-sources', iconColor: '#10B981' },
    ],
  },
  {
    title: 'PARTENAIRES',
    items: [
      { id: 'partners', label: 'Coachs & Clubs', sublabel: 'Sander, Junior, Fouad, clubs partenaires', Icon: Swords, route: '/partners', iconColor: '#818CF8' },
      { id: 'health-professionals', label: 'Pros de Santé', sublabel: 'Kinés, médecins, nutritionnistes', Icon: Stethoscope, route: '/health-professionals', iconColor: '#F87171' },
    ],
  },
];

// Build a flat lookup for favorites rendering
const ALL_ITEMS_MAP = new Map<string, ToolItem>();
for (const section of TOOL_SECTIONS) {
  for (const item of section.items) {
    ALL_ITEMS_MAP.set(item.id, item);
  }
}

const FAVORITES_KEY = '@yoroi_tool_favorites';
const RECENTS_KEY = '@yoroi_tool_recents';
const COLLAPSED_SECTIONS_KEY = '@yoroi_tool_collapsed_sections';
const RECENTS_MAX = 6;

// IDs d'outils ajoutés récemment (badge NEW affiché à droite)
const NEW_TOOL_IDS = new Set<string>([
  'game-plan',
  'sync-history',
  'rounds-insights',
  'combat-analytics',
  'match-tracker',
  'mat-time',
  'combat-achievements',
  'sparring-ranking',
  'competition-camp',
  'benchmark',
]);

// IDs d'outils nécessitant Premium (badge PRO affiché à droite)
const PREMIUM_TOOL_IDS = new Set<string>([
  'combat-analytics',
  'rounds-insights',
  'sparring-ranking',
  'benchmark',
  'competition-camp',
  'game-plan',
  'fighter-card',
  'match-tracker',
  'weight-cut',
]);

// Petite icône thématique par section pour visualisation rapide
const SECTION_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  'ENTRAÎNEMENT': { Icon: Dumbbell, color: '#EF4444' },
  'CORPS & SANTÉ': { Icon: Heart, color: '#EC4899' },
  'SUIVI QUOTIDIEN': { Icon: Moon, color: '#6366F1' },
  'COMPETITEUR': { Icon: Swords, color: '#F59E0B' },
  'COMBAT LAB': { Icon: Layers, color: '#8B5CF6' },
  'OUTILS & CALCULS': { Icon: Calculator, color: '#06B6D4' },
  'PROGRESSION & GAMIFICATION': { Icon: Sparkles, color: '#FBBF24' },
  'HISTORIQUES & COURBES': { Icon: TrendingUp, color: '#10B981' },
  'DONNÉES': { Icon: Database, color: '#4F8EF7' },
  'COMMUNAUTE & SAVOIR': { Icon: BookOpen, color: '#22C55E' },
  'PARTENAIRES': { Icon: Award, color: '#818CF8' },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function MoreScreen() {
  const { colors, isDark, screenBackground, screenText, screenTextMuted } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Search
  const [searchText, setSearchText] = useState('');

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Recents (derniers outils ouverts, ordre récent → ancien)
  const [recents, setRecents] = useState<string[]>([]);

  // Premium status — pour décider d'afficher le badge PRO
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // Sections repliées (set des titres de section actuellement collapsées)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Creator mode / secret code states
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [creatorModeActive, setCreatorModeActive] = useState(false);
  const [screenshotMenuUnlocked, setScreenshotMenuUnlocked] = useState(false);
  const [showSecretCodeModal, setShowSecretCodeModal] = useState(false);
  const [secretCode, setSecretCode] = useState('');

  // Reset modal
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Show info card
  const [showInfoCard, setShowInfoCard] = useState(true);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(FAVORITES_KEY);
      if (saved) {
        try {
          setFavorites(new Set(JSON.parse(saved)));
        } catch {
          // ignore parse errors
        }
      }
      const recentsRaw = await AsyncStorage.getItem(RECENTS_KEY);
      if (recentsRaw) {
        try { setRecents(JSON.parse(recentsRaw)); } catch {}
      }
      const collapsedRaw = await AsyncStorage.getItem(COLLAPSED_SECTIONS_KEY);
      if (collapsedRaw) {
        try { setCollapsedSections(new Set(JSON.parse(collapsedRaw))); } catch {}
      }
      const premium = await AsyncStorage.getItem('@yoroi_is_premium');
      setIsPremium(premium === 'true');
      const infoDismissed = await AsyncStorage.getItem('@yoroi_tool_info_dismissed');
      if (infoDismissed === 'true') setShowInfoCard(false);
      const mode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
      setCreatorModeActive(mode === 'true');
      const screenshotMenu = await AsyncStorage.getItem('@yoroi_screenshot_menu_unlocked');
      setScreenshotMenuUnlocked(screenshotMenu === 'true');
    } catch {
      // ignore errors
    }
  }, []);

  // Track quand un tool est ouvert pour la section "Récemment utilisés"
  const trackToolOpen = useCallback((id: string) => {
    setRecents(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, RECENTS_MAX);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Toggle d'une section collapsed/expanded
  const toggleSection = useCallback((title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      AsyncStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const collapseAll = useCallback(() => {
    const all = new Set(TOOL_SECTIONS.map(s => s.title));
    setCollapsedSections(all);
    AsyncStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...all])).catch(() => {});
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedSections(new Set());
    AsyncStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([])).catch(() => {});
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // Toutes plies ?
  const allCollapsed = collapsedSections.size >= TOOL_SECTIONS.length;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Load favorites on mount — defaults pour le premier lancement
  const DEFAULT_FAVORITES = ['share-hub', 'timer', 'infirmary', 'photos', 'import-csv', 'savoir', 'partners', 'health-professionals'];

  // IDs à toujours injecter dans les favoris (même pour utilisateurs existants)
  const MANDATORY_FAVORITES = ['share-hub', 'partners', 'health-professionals'];

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(saved => {
      if (saved !== null) {
        try {
          const parsed: string[] = JSON.parse(saved);
          const merged = new Set(parsed);
          // Injecter les nouveaux favoris obligatoires si absents
          let changed = false;
          for (const id of MANDATORY_FAVORITES) {
            if (!merged.has(id)) {
              merged.add(id);
              changed = true;
            }
          }
          setFavorites(merged);
          if (changed) {
            AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...merged]));
          }
        } catch {
          // ignore parse errors
        }
      } else {
        // Premier lancement : mettre les favoris par défaut
        setFavorites(new Set(DEFAULT_FAVORITES));
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(DEFAULT_FAVORITES));
      }
    });
  }, []);

  // Load info card visibility
  useEffect(() => {
    AsyncStorage.getItem('@yoroi_tool_info_dismissed').then(val => {
      if (val === 'true') setShowInfoCard(false);
    });
  }, []);

  // Load creator mode state
  useEffect(() => {
    const loadCreatorMode = async () => {
      const mode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
      setCreatorModeActive(mode === 'true');
      const screenshotMenu = await AsyncStorage.getItem('@yoroi_screenshot_menu_unlocked');
      setScreenshotMenuUnlocked(screenshotMenu === 'true');
    };
    loadCreatorMode();
  }, []);

  // ============================================
  // FAVORITES
  // ============================================

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
    impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  const favoriteItems = useMemo(() => {
    const items: ToolItem[] = [];
    for (const id of favorites) {
      const item = ALL_ITEMS_MAP.get(id);
      if (item) items.push(item);
    }
    return items;
  }, [favorites]);

  // Outils récemment utilisés (filtrés pour exister + dédoublonnés des favoris)
  const recentItems = useMemo(() => {
    const out: ToolItem[] = [];
    for (const id of recents) {
      if (favorites.has(id)) continue; // pas en double avec les favoris
      const it = ALL_ITEMS_MAP.get(id);
      if (it) out.push(it);
      if (out.length >= RECENTS_MAX) break;
    }
    return out;
  }, [recents, favorites]);

  // Total tools count (pour le sous-titre du header)
  const totalToolsCount = useMemo(() => ALL_ITEMS_MAP.size, []);

  // Filtered sections based on search
  const filteredSections = useMemo(() => {
    if (!searchText.trim()) return TOOL_SECTIONS;
    const query = searchText.toLowerCase().trim();
    return TOOL_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.sublabel.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      ),
    })).filter(section => section.items.length > 0);
  }, [searchText]);

  // ============================================
  // HANDLERS (kept from original)
  // ============================================

  const handleExport = async () => {
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

  const handleExportEditable = async () => {
    showPopup(
      'Export Editable',
      'Exporte tes données dans un format que tu peux modifier sur ordinateur puis reimporter',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Mes Données', style: 'primary', onPress: () => exportEditableCSV() },
        { text: 'Template Vide', style: 'default', onPress: () => exportEmptyTemplate() },
      ]
    );
  };

  const handleItemPress = useCallback((item: ToolItem) => {
    trackToolOpen(item.id);
    if (item.handler === 'export') {
      handleExport();
      return;
    }
    if (item.handler === 'instagram-yoroiapp') {
      safeOpenURL('https://www.instagram.com/yoroiapp');
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  }, [trackToolOpen]);

  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 500) {
      const newCount = versionTapCount + 1;
      setVersionTapCount(newCount);
      if (newCount >= 2 && newCount < 5) {
        impactAsync(ImpactFeedbackStyle.Light);
      }
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
      setScreenshotMenuUnlocked(true);
      setCreatorModeActive(true);
      await AsyncStorage.setItem('@yoroi_screenshot_menu_unlocked', 'true');
      await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');
      setShowSecretCodeModal(false);
      setSecretCode('');
      showPopup(
        'Mode Createur Debloque',
        "L'onglet Createur est maintenant accessible.",
        [{ text: 'Parfait', style: 'primary' }],
        <Sparkles size={32} color={colors.accent} />
      );
    } else {
      notificationAsync(NotificationFeedbackType.Error);
      showPopup('Code Incorrect', "Le code saisi n'est pas valide.", [{ text: 'Reessayer', style: 'primary' }], <AlertCircle size={32} color="#EF4444" />);
      setSecretCode('');
    }
  };

  const handleResetAll = () => {
    setResetConfirmText('');
    setResetModalVisible(true);
  };

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
          [{ text: 'OK', style: 'primary', onPress: () => router.replace('/onboarding') }],
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


  const dismissInfoCard = async () => {
    setShowInfoCard(false);
    await AsyncStorage.setItem('@yoroi_tool_info_dismissed', 'true');
  };

  // ============================================
  // RENDER TOOL ITEM
  // ============================================

  const renderToolItem = useCallback((item: ToolItem) => {
    const IconComponent = item.Icon;
    const isFav = favorites.has(item.id);
    const isPremiumLocked = PREMIUM_TOOL_IDS.has(item.id) && !isPremium;
    const isNew = NEW_TOOL_IDS.has(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.toolItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.toolItemIcon, { backgroundColor: item.iconColor + '18' }]}>
          <IconComponent size={20} color={item.iconColor} strokeWidth={2} />
        </View>
        <View style={styles.toolItemContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.toolItemLabel, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.label}
            </Text>
            {isNew ? (
              <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.4 }}>NEW</Text>
              </View>
            ) : null}
            {isPremiumLocked ? (
              <View style={{ backgroundColor: '#A855F7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.4 }}>PRO</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.toolItemSublabel, { color: colors.textMuted }]} numberOfLines={1}>
            {item.sublabel}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleFavorite(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.starButton}
        >
          <Star
            size={18}
            color={isFav ? '#FBBF24' : colors.textMuted}
            fill={isFav ? '#FBBF24' : 'transparent'}
            strokeWidth={2}
          />
        </TouchableOpacity>
        <ChevronRight size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }, [favorites, colors, handleItemPress, toggleFavorite, isPremium]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={[styles.screen, { backgroundColor: screenBackground }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Wrench size={28} color={screenText} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: screenText }]}>Outils</Text>
              <Text style={{ color: screenText, opacity: 0.6, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                {totalToolsCount} outils · {favorites.size} en favoris
              </Text>
            </View>
            {/* Bouton ? d'aide (rouvre la carte info) */}
            <TouchableOpacity
              onPress={() => { setShowInfoCard(true); AsyncStorage.removeItem('@yoroi_tool_info_dismissed'); }}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Info size={18} color={screenText} strokeWidth={2.2} />
            </TouchableOpacity>
            {/* Bouton tout replier / déplier */}
            <TouchableOpacity
              onPress={allCollapsed ? expandAll : collapseAll}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Layers size={18} color={screenText} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher un outil..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* INFO CARD (theme-safe : utilise les couleurs du thème courant) */}
        {showInfoCard && (
          <TouchableOpacity
            style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.accent + '40' }]}
            onPress={dismissInfoCard}
            activeOpacity={0.8}
          >
            <Info size={18} color={colors.accent} />
            <Text style={[styles.infoCardText, { color: colors.textSecondary }]}>
              Touche l'étoile d'un outil pour l'épingler en favoris. Tes derniers outils ouverts apparaissent en "Récemment utilisés".
            </Text>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* UPSELL PREMIUM (uniquement si pas premium et pas de recherche en cours) */}
        {!isPremium && !searchText && (
          <TouchableOpacity
            onPress={() => router.push('/premium' as any)}
            activeOpacity={0.88}
            style={{
              marginBottom: 16,
              borderRadius: 18,
              padding: 16,
              backgroundColor: colors.card,
              borderWidth: 1.5,
              borderColor: '#A855F7' + '60',
              shadowColor: '#A855F7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#A855F720', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={22} color="#A855F7" fill="#A855F7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.2 }}>
                  Yoroi Premium
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>
                  Débloque {PREMIUM_TOOL_IDS.size} outils PRO + widget + insights
                </Text>
              </View>
              <ChevronRight size={18} color="#A855F7" />
            </View>
            {/* Preview des icônes locked */}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {Array.from(PREMIUM_TOOL_IDS).slice(0, 6).map(id => {
                const item = ALL_ITEMS_MAP.get(id);
                if (!item) return null;
                const I = item.Icon;
                return (
                  <View key={id} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: item.iconColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <I size={14} color={item.iconColor} strokeWidth={2.2} />
                  </View>
                );
              })}
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#A855F7' + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, color: '#A855F7', fontWeight: '900' }}>+{PREMIUM_TOOL_IDS.size - 6}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* FAVORITES SECTION */}
        {!searchText && favoriteItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Star size={14} color="#FBBF24" fill="#FBBF24" />
              <Text style={[styles.sectionTitle, { color: '#FBBF24' }]}>FAVORIS · {favoriteItems.length}</Text>
            </View>
            {favoriteItems.map(renderToolItem)}
          </View>
        )}

        {/* RECENTS SECTION (uniquement si on a des récents distincts des favoris) */}
        {!searchText && recentItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Clock size={14} color="#06B6D4" />
              <Text style={[styles.sectionTitle, { color: '#06B6D4' }]}>RÉCEMMENT UTILISÉS · {recentItems.length}</Text>
            </View>
            {recentItems.map(renderToolItem)}
          </View>
        )}

        {/* EMPTY SEARCH STATE */}
        {searchText && filteredSections.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
            <Search size={36} color={screenText} style={{ opacity: 0.3, marginBottom: 14 }} />
            <Text style={{ color: screenText, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
              Aucun outil pour "{searchText}"
            </Text>
            <Text style={{ color: screenText, opacity: 0.6, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              Essaie avec un autre mot-clé{'\n'}(sport, sommeil, sparring, photos…)
            </Text>
            <TouchableOpacity
              onPress={() => setSearchText('')}
              style={{ backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Effacer la recherche</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTIONS — clickables pour collapse/expand (sauf si recherche en cours) */}
        {filteredSections.map((section) => {
          const sectionMeta = SECTION_ICONS[section.title];
          const SectionIcon = sectionMeta?.Icon;
          const sectionColor = sectionMeta?.color || screenTextMuted;
          // Quand recherche active, on force expand pour voir les résultats
          const isCollapsed = !searchText && collapsedSections.has(section.title);

          return (
            <View key={section.title} style={styles.sectionContainer}>
              <TouchableOpacity
                onPress={() => !searchText && toggleSection(section.title)}
                activeOpacity={searchText ? 1 : 0.6}
                style={[styles.sectionHeader, { justifyContent: 'space-between', paddingVertical: 4 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {SectionIcon ? <SectionIcon size={14} color={sectionColor} /> : null}
                  <Text style={[styles.sectionTitle, { color: SectionIcon ? sectionColor : screenTextMuted }]}>
                    {section.title} · {section.items.length}
                  </Text>
                </View>
                {!searchText ? (
                  <ChevronRight
                    size={16}
                    color={sectionColor}
                    style={{
                      opacity: 0.6,
                      transform: [{ rotate: isCollapsed ? '0deg' : '90deg' }],
                    }}
                  />
                ) : null}
              </TouchableOpacity>
              {!isCollapsed && section.items.map(renderToolItem)}
            </View>
          );
        })}

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
              <Text style={[styles.privacyText, { color: isDark ? colors.textSecondary : '#374151' }]}>
                {t('menu.privateDescription')}
              </Text>
            </View>
          </View>

          <View style={styles.madeWith}>
            <Text style={{ color: screenText, opacity: 0.6, fontSize: 13, fontWeight: '500' }}>{t('menu.madeWithLove')}</Text>
            <Heart size={14} color="#EF4444" fill="#EF4444" />
            <Text style={{ color: screenText, opacity: 0.6, fontSize: 13, fontWeight: '500' }}>{t('menu.inFrance')}</Text>
          </View>

          <TouchableOpacity onPress={handleVersionTap} activeOpacity={1}>
            <Text style={{ color: screenText, opacity: 0.5, fontSize: 12, marginTop: 12, textAlign: 'center', fontWeight: '700', letterSpacing: 0.4 }}>
              YOROI v2.3.3
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal - Reset */}
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
              </View>
              <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>
                {t('menu.toConfirmType')} <Text style={{ fontWeight: '800', color: '#EF4444' }}>OUI</Text> {t('menu.below')}
              </Text>
              <TextInput
                style={[styles.confirmInput, { backgroundColor: colors.backgroundElevated, borderColor: isResetConfirmed ? '#10B981' : colors.border, color: colors.textPrimary }]}
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
                onPress={() => { setResetModalVisible(false); setResetConfirmText(''); }}
              >
                <Text style={[styles.resetCancelButtonText, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetConfirmButton, { backgroundColor: isResetConfirmed ? '#EF4444' : colors.backgroundElevated, opacity: isResetConfirmed ? 1 : 0.5 }]}
                onPress={confirmReset}
                disabled={!isResetConfirmed}
              >
                <Trash2 size={18} color={isResetConfirmed ? '#FFF' : colors.textMuted} />
                <Text style={[styles.resetConfirmButtonText, { color: isResetConfirmed ? '#FFF' : colors.textMuted }]}>
                  {t('common.deleteAll')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal - Secret Code */}
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
                Acces Mode Capture
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
                Mode Createur
              </Text>
              <Text style={[styles.secretCodeSubtitle, { color: colors.textMuted }]}>
                Entre le code secret pour debloquer le mode createur et les outils de demo.
              </Text>
              <TextInput
                style={[styles.secretCodeInput, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.textPrimary }]}
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
                style={[styles.secretCodeButton, { backgroundColor: secretCode.length === 4 ? colors.accent : colors.backgroundElevated, opacity: secretCode.length === 4 ? 1 : 0.5 }]}
                onPress={handleSecretCodeSubmit}
                disabled={secretCode.length !== 4}
              >
                <Text style={[styles.secretCodeButtonText, { color: secretCode.length === 4 ? colors.textOnAccent : colors.textMuted }]}>
                  Debloquer
                </Text>
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
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // HEADER
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // SEARCH BAR
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // INFO CARD
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // SECTIONS
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // TOOL ITEM
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    gap: 12,
  },
  toolItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolItemContent: {
    flex: 1,
  },
  toolItemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolItemSublabel: {
    fontSize: 12,
    marginTop: 1,
  },
  starButton: {
    padding: 4,
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    paddingTop: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
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

  // Secret Code Modal
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
});
