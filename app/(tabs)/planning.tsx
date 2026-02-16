import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { useCustomPopup } from '@/components/CustomPopup';
import { useI18n } from '@/lib/I18nContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  Plus,
  Clock,
  Calendar,
  List,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  Moon,
  TrendingUp,
  Trophy,
  MapPin,
  Bell,
  ExternalLink,
  BookOpen,
  Search,
  Check,
  Globe,
  X,
  Trash2,
  Sun,
  Filter,
  Circle,
  Edit3,
} from 'lucide-react-native';

// Import events catalog service (SQLite optimized)
import { getFilteredEvents, SportEvent as ImportedSportEvent } from '@/lib/eventsService';
import { toggleRestDay } from '@/lib/restDaysService';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, addDays, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/design';
import { getTrainings, getClubs, addTraining, deleteTraining, deleteClub, Club, Training, getCompetitions, Competition } from '@/lib/database';
import { getSportIcon } from '@/constants/sportIcons';
import { getProgressionItems, ProgressionItem } from '@/lib/trainingJournalService';
import { getCarnetStats, getSkills, getBenchmarks, Skill, Benchmark } from '@/lib/carnetService';
import { DayDetailModal } from '@/components/calendar';
import { getClubLogoSource, getSportById } from '@/lib/sports';
import { PartnerDetailModal, Partner } from '@/components/PartnerDetailModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TimetableView, EnhancedCalendarView, AddClubModal } from '@/components/planning';
import { EmptyState } from '@/components/planning/EmptyState';
import { getAllGoalsProgress, GoalProgress } from '@/lib/trainingGoalsService';
import { triggerVictoryModal, createCalendarVictoryData } from '@/lib/victoryTrigger';
import { FeatureDiscoveryModal } from '@/components/FeatureDiscoveryModal';
import { PAGE_TUTORIALS, hasVisitedPage, markPageAsVisited } from '@/lib/featureDiscoveryService';
import { RatingPopup } from '@/components/RatingPopup';
import ratingService from '@/lib/ratingService';
import { HomeToolsMenu } from '@/components/home/HomeToolsMenu';

// ============================================
// PLANNING SCREEN - SWIPEABLE VIEWS
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375; // iPhone SE, petits téléphones
const DAYS_FR = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

type ViewMode = 'calendar' | 'programme' | 'clubs' | 'competitions' | 'journal';

// Types for external events catalog
interface SportEvent {
  id: string;
  title: string;
  date_start: string;
  location: {
    city: string;
    country: string;
    full_address: string;
  };
  category: 'combat' | 'endurance' | 'force' | 'nature' | 'autre';
  sport_tag: string;
  registration_link: string;
  federation: string | null;
  image_logo_url: string | null;
  isManual?: boolean;
}

type EventsTabMode = 'my_events' | 'catalog';
type CatalogCategoryFilter = 'all' | 'combat' | 'endurance' | 'force' | 'nature' | 'autre';
type CatalogLocationFilter = 'monde' | 'europe' | 'france';

// European countries for filtering
const EUROPEAN_COUNTRIES = [
  'France', 'United Kingdom', 'Spain', 'Italy', 'Germany', 'Portugal',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Ireland', 'Poland', 'Czech Republic', 'Greece',
  'Romania', 'Hungary', 'Croatia', 'Slovenia', 'Slovakia', 'Bulgaria',
  'Luxembourg', 'Estonia', 'Latvia', 'Lithuania', 'Cyprus', 'Malta',
  'Iceland', 'Serbia', 'Ukraine', 'Belarus', 'Albania', 'Europe',
];

// AsyncStorage key for saved events
const SAVED_EVENTS_KEY = 'my_saved_events';

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [viewMode, setViewMode] = useState<ViewMode>('competitions'); // Prochains RDV en premier
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Refs pour le scroll
  const horizontalScrollRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  // Modals state
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showProgrammeEditModal, setShowProgrammeEditModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSportInCategory, setSelectedSportInCategory] = useState<string>('all');
  const [expandedOrganizers, setExpandedOrganizers] = useState<{ [key: string]: boolean }>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tutoriel de découverte
  const [showTutorial, setShowTutorial] = useState(false);

  // Rating popup state
  const [showRatingPopup, setShowRatingPopup] = useState(false);

  // Vérifier si c'est la première visite
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkFirstVisit = async () => {
      const visited = await hasVisitedPage('planning');
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
    await markPageAsVisited('planning');
    setShowTutorial(false);
  };

  // Fermer sans marquer comme vu (bouton "Plus tard")
  const handleLaterTutorial = () => {
    setShowTutorial(false);
  };

  // ============================================
  // CATALOG STATE (for "Trouver" feature)
  // ============================================
  const [eventsTabMode, setEventsTabMode] = useState<EventsTabMode>('catalog'); // Trouver par défaut
  const [savedExternalEvents, setSavedExternalEvents] = useState<SportEvent[]>([]);
  const [savedExternalEventIds, setSavedExternalEventIds] = useState<Set<string>>(new Set());
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<CatalogCategoryFilter>('all');
  const [catalogLocationFilter, setCatalogLocationFilter] = useState<CatalogLocationFilter>('monde');
  const [catalogSportFilter, setCatalogSportFilter] = useState<string>('all');
  const [catalogSubFilter, setCatalogSubFilter] = useState<string>('all'); // Distance, GI/NO GI, etc.
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Journal/Carnet state - Now uses carnetService
  const [journalStats, setJournalStats] = useState({ total: 0, in_progress: 0, mastered: 0, totalRecords: 0 });
  const [recentSkills, setRecentSkills] = useState<Skill[]>([]);
  const [recentBenchmarks, setRecentBenchmarks] = useState<Benchmark[]>([]);

  // Clubs & Objectifs state
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([]);

  // Fonction pour obtenir la prochaine date d'un jour de la semaine (0=Lundi, 6=Dimanche)
  const getNextDateForDayOfWeek = (dayIndex: number): Date => {
    const today = new Date();
    const todayDayOfWeek = getDay(today); // 0=Dimanche, 1=Lundi, etc.
    // Convertir: notre index 0=Lundi, mais getDay 0=Dimanche
    const targetDay = dayIndex === 6 ? 0 : dayIndex + 1; // 0=Lun->1, 6=Dim->0
    let daysToAdd = targetDay - todayDayOfWeek;
    if (daysToAdd <= 0) daysToAdd += 7; // Si le jour est deja passe cette semaine
    return addDays(today, daysToAdd);
  };

  // Protection anti-spam navigation
  const [isNavigatingToAdd, setIsNavigatingToAdd] = useState(false);
  const [isNavigatingFromProgramme, setIsNavigatingFromProgramme] = useState(false);

  // Programme hebdomadaire: grouper les séances par jour de la semaine
  const weeklyProgram = useMemo(() => {
    // Créer un objet avec un tableau pour chaque jour (0=Lundi, 6=Dimanche)
    const program: { [key: number]: { clubId: number | undefined; count: number }[] } = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    // Grouper les séances par jour de la semaine
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      let dayOfWeek = getDay(date); // 0=Dimanche, 1=Lundi, etc.
      // Convertir: 0=Dimanche->6, 1=Lundi->0, etc.
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const existing = program[dayOfWeek].find(p => p.clubId === workout.club_id);
      if (existing) {
        existing.count++;
      } else {
        program[dayOfWeek].push({ clubId: workout.club_id, count: 1 });
      }
    });

    // Trier par nombre d'occurrences (clubs les plus fréquents en premier)
    Object.keys(program).forEach(day => {
      program[parseInt(day)].sort((a, b) => b.count - a.count);
    });

    return program;
  }, [workouts]);

  // Catégories de sports
  const sportCategories = {
    all: { name: 'Tout', color: '#8B5CF6', sports: [] },
    combat: {
      name: 'Sports de Combat',
      color: '#EF4444',
      sports: [
        { id: 'all', name: 'Tous' },
        { id: 'jjb', name: 'JJB' },
        { id: 'mma', name: 'MMA' },
        { id: 'boxe', name: 'Boxe' },
        { id: 'judo', name: 'Judo' },
        { id: 'karate', name: 'Karaté' },
        { id: 'taekwondo', name: 'Taekwondo' },
        { id: 'lutte', name: 'Lutte' },
        { id: 'sambo', name: 'Sambo' },
        { id: 'kickboxing', name: 'Kickboxing' },
        { id: 'muay-thai', name: 'Muay Thai' },
        { id: 'aikido', name: 'Aikido' },
        { id: 'capoeira', name: 'Capoeira' }
      ]
    },
    endurance: {
      name: 'Endurance',
      color: '#10B981',
      sports: [
        { id: 'all', name: 'Tous' },
        { id: 'running', name: 'Running' },
        { id: 'marathon', name: 'Marathon' },
        { id: 'trail', name: 'Trail' },
        { id: 'triathlon', name: 'Triathlon' },
        { id: 'cyclisme', name: 'Cyclisme' },
        { id: 'natation', name: 'Natation' },
        { id: 'hyrox', name: 'HYROX' },
        { id: 'aviron', name: 'Aviron' }
      ]
    },
    force: {
      name: 'Force & Fitness',
      color: '#F59E0B',
      sports: [
        { id: 'all', name: 'Tous' },
        { id: 'crossfit', name: 'CrossFit' },
        { id: 'powerlifting', name: 'Powerlifting' },
        { id: 'haltérophilie', name: 'Haltérophilie' },
        { id: 'strongman', name: 'Strongman' },
        { id: 'musculation', name: 'Musculation' },
        { id: 'calisthenics', name: 'Calisthenics' }
      ]
    },
    collectif: {
      name: 'Sports Collectifs',
      color: '#3B82F6',
      sports: [
        { id: 'all', name: 'Tous' },
        { id: 'football', name: 'Football' },
        { id: 'basket', name: 'Basketball' },
        { id: 'rugby', name: 'Rugby' },
        { id: 'handball', name: 'Handball' },
        { id: 'volley', name: 'Volleyball' },
        { id: 'hockey', name: 'Hockey' },
        { id: 'water-polo', name: 'Water-Polo' }
      ]
    },
    autres: {
      name: 'Autres Sports',
      color: '#8B5CF6',
      sports: [
        { id: 'all', name: 'Tous' },
        { id: 'escalade', name: 'Escalade' },
        { id: 'yoga', name: 'Yoga' },
        { id: 'pilates', name: 'Pilates' },
        { id: 'tennis', name: 'Tennis' },
        { id: 'padel', name: 'Padel' },
        { id: 'surf', name: 'Surf' },
        { id: 'skateboard', name: 'Skateboard' },
        { id: 'parkour', name: 'Parkour' },
        { id: 'gymnastique', name: 'Gymnastique' },
        { id: 'equitation', name: 'Équitation' },
        { id: 'golf', name: 'Golf' }
      ]
    },
  };

  // Grouper les compétitions par catégorie
  const groupedCompetitions = useMemo(() => {
    const upcoming = competitions
      .filter(c => new Date(c.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const groups: { [key: string]: Competition[] } = {};

    upcoming.forEach(comp => {
      const sport = comp.sport?.toLowerCase() || '';

      // Trouver la catégorie du sport
      let category = 'autres';
      for (const [key, cat] of Object.entries(sportCategories)) {
        if (key === 'all') continue;
        const sportIds = cat.sports.map((s: any) => s.id);
        if (sportIds.includes(sport)) {
          category = key;
          break;
        }
      }

      // Filtrer par catégorie sélectionnée
      if (selectedCategory !== 'all' && category !== selectedCategory) {
        return;
      }

      // Filtrer par sport spécifique dans la catégorie
      if (selectedSportInCategory !== 'all' && sport !== selectedSportInCategory) {
        return;
      }

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(comp);
    });

    return groups;
  }, [competitions, selectedCategory, selectedSportInCategory]);

  const loadData = useCallback(async () => {
    try {
      // Charger les donnees de base
      const [trainingsData, clubsData, competitionsData] = await Promise.all([
        getTrainings(),
        getClubs(),
        getCompetitions ? getCompetitions() : Promise.resolve([]),
      ]);

      // Charger les objectifs separement pour eviter de bloquer si erreur
      let goalsData: any[] = [];
      try {
        goalsData = await getAllGoalsProgress();
      } catch {
        // Ignorer silencieusement les erreurs de chargement d'objectifs
      }
      setWorkouts(trainingsData);
      setClubs(clubsData);
      setCompetitions(competitionsData);
      setGoalsProgress(goalsData);

      // Charger les stats du carnet depuis carnetService
      const carnetStats = await getCarnetStats();
      setJournalStats({
        total: carnetStats.totalSkills,
        in_progress: carnetStats.skillsInProgress,
        mastered: carnetStats.skillsMastered,
        totalRecords: carnetStats.totalBenchmarks,
      });

      // Check for screenshot mode
      const isScreenshotMode = await AsyncStorage.getItem('@yoroi_journal_screenshot_mode') === 'true';

      if (isScreenshotMode) {
        // MOCK DATA FOR SCREENSHOTS
        const mockBenchmarks: Benchmark[] = [
          {
            id: 'bench_1', name: 'Développé Couché', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', createdAt: new Date().toISOString(), muscleGroup: 'PECTORAUX',
            entries: [
              { id: 'e1', value: 100, reps: 5, date: new Date().toISOString(), rpe: 9, notes: 'Record personnel !' }
            ]
          },
          {
            id: 'bench_2', name: 'Squat', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', createdAt: new Date().toISOString(), muscleGroup: 'JAMBES',
            entries: [
              { id: 'e2', value: 140, reps: 3, date: new Date().toISOString(), rpe: 9, notes: 'Technique solide' }
            ]
          },
          {
            id: 'bench_3', name: '10km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6', createdAt: new Date().toISOString(), muscleGroup: 'CARDIO',
            entries: [
              { id: 'e3', value: 2400, date: new Date().toISOString(), duration: 40, distance: 10, notes: 'Allure 4:00/km' }
            ]
          }
        ];

        const mockSkills: Skill[] = [
          {
            id: 'skill_1', name: 'Triangle', category: 'jjb_soumission', status: 'mastered', drillCount: 150, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            notes: []
          },
          {
            id: 'skill_2', name: 'Passage Toreando', category: 'jjb_passage', status: 'in_progress', drillCount: 45, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            notes: []
          },
          {
            id: 'skill_3', name: 'Berimbolo', category: 'jjb_garde', status: 'to_learn', drillCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            notes: []
          }
        ];

        setRecentBenchmarks(mockBenchmarks);
        setRecentSkills(mockSkills);
        setJournalStats({
          total: mockSkills.length,
          in_progress: mockSkills.filter(s => s.status === 'in_progress').length,
          mastered: mockSkills.filter(s => s.status === 'mastered').length,
          totalRecords: mockBenchmarks.length,
        });
      } else {
        // Garder les 6 dernières techniques/skills (2 lignes de 3)
        const skills = await getSkills();
        setRecentSkills(skills.slice(0, 6));
        // Garder les 6 derniers records/benchmarks (2 lignes de 3)
        const benchmarks = await getBenchmarks();
        // Filter benchmarks that have entries (PRs)
        const benchmarksWithPRs = benchmarks.filter(b => b.entries && b.entries.length > 0);
        setRecentBenchmarks(benchmarksWithPRs.slice(0, 6));
      }
    } catch (error) {
      logger.error('Erreur chargement planning:', error);
    }
  }, []);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => {
    loadData();
    loadSavedExternalEvents();
  }, []);

  // Plus de redirection automatique - le carnet s'affiche maintenant dans le swipe

  // ============================================
  // CATALOG FUNCTIONS
  // ============================================
  const loadSavedExternalEvents = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_EVENTS_KEY);
      if (saved) {
        const events = JSON.parse(saved) as SportEvent[];
        setSavedExternalEvents(events);
        setSavedExternalEventIds(new Set(events.map(e => e.id)));
      }
    } catch (error) {
      logger.error('Error loading saved external events:', error);
      // Ne pas bloquer l'app si le storage échoue
    }
  };

  // Get all events from SQLite (async loaded)
  const [allCatalogEvents, setAllCatalogEvents] = useState<SportEvent[]>([]);

  // Load events from SQLite on mount
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const events = await getFilteredEvents({ upcomingOnly: true, limit: 500 });
        if (!cancelled) {
          setAllCatalogEvents(events as SportEvent[]);
        }
      } catch (error) {
        logger.error('Erreur chargement événements:', error);
        if (!cancelled) setAllCatalogEvents([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // Filter catalog events
  const filteredCatalogEvents = useMemo(() => {
    let filtered = allCatalogEvents;

    // Filter: only future events (after today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filtered = filtered.filter(event => {
      const eventDate = new Date(event.date_start);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });

    // Filter by location
    if (catalogLocationFilter === 'france') {
      filtered = filtered.filter(event =>
        event?.location?.country?.toLowerCase() === 'france'
      );
    } else if (catalogLocationFilter === 'europe') {
      filtered = filtered.filter(event =>
        EUROPEAN_COUNTRIES.includes(event?.location?.country ?? '')
      );
    }

    // Filter by category
    if (catalogCategoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === catalogCategoryFilter);
    }

    // Filter by sport
    if (catalogSportFilter !== 'all') {
      filtered = filtered.filter(event => event.sport_tag === catalogSportFilter);
    }

    // Filter by sub-type (distance, GI/NO GI, etc.)
    if (catalogSubFilter !== 'all' && catalogSportFilter !== 'all') {
      filtered = filtered.filter(event => {
        const title = event.title.toLowerCase();

        // Running/Marathon - Distance filters
        if (catalogSportFilter === 'running' || catalogSportFilter === 'marathon') {
          if (catalogSubFilter === '10k') {
            return title.includes('10km') || title.includes('10 km');
          } else if (catalogSubFilter === 'semi') {
            return title.includes('semi-marathon') || title.includes('semi marathon');
          } else if (catalogSubFilter === 'marathon') {
            return title.includes('marathon') && !title.includes('semi');
          } else if (catalogSubFilter === 'ultra') {
            return title.includes('ultra') || title.includes('utmb');
          }
        }

        // Trail - Distance filters
        else if (catalogSportFilter === 'trail') {
          if (catalogSubFilter === 'court') {
            return title.match(/\b([0-9]|1[0-9])km/i); // < 20km
          } else if (catalogSubFilter === 'moyen') {
            return title.match(/\b(2[0-9]|3[0-9]|4[0-9])km/i); // 20-50km
          } else if (catalogSubFilter === 'long') {
            return title.match(/\b(5[0-9]|[6-9][0-9])km/i); // 50-100km
          } else if (catalogSubFilter === 'ultra') {
            return title.includes('ultra') || title.match(/\b(1[0-9]{2}|[2-9][0-9]{2})km/i); // > 100km
          }
        }

        // JJB/Grappling - GI filters
        else if (catalogSportFilter === 'jjb' || catalogSportFilter === 'grappling') {
          if (catalogSubFilter === 'gi') {
            // GI = tous les événements SANS "no-gi" dans le titre (par défaut c'est GI)
            return !title.includes('no-gi') && !title.includes('nogi') && !title.includes('no gi');
          } else if (catalogSubFilter === 'nogi') {
            // NO GI = événements avec "no-gi" dans le titre
            return title.includes('no-gi') || title.includes('nogi') || title.includes('no gi');
          }
        }

        // Climbing - Type filters
        else if (catalogSportFilter === 'climbing') {
          if (catalogSubFilter === 'bouldering') {
            return title.includes('bouldering') || title.includes('boulder');
          } else if (catalogSubFilter === 'lead') {
            return title.includes('lead') || title.includes('difficulte');
          } else if (catalogSubFilter === 'speed') {
            return title.includes('speed') || title.includes('vitesse');
          }
        }

        return true;
      });
    }

    // Filter by search query
    if (catalogSearchQuery.trim()) {
      const query = catalogSearchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event?.title?.toLowerCase()?.includes(query) ||
        event?.location?.city?.toLowerCase()?.includes(query) ||
        event?.location?.country?.toLowerCase()?.includes(query) ||
        (event?.federation && event?.federation?.toLowerCase()?.includes(query))
      );
    }

    return filtered;
  }, [allCatalogEvents, catalogLocationFilter, catalogCategoryFilter, catalogSportFilter, catalogSubFilter, catalogSearchQuery]);

  // Event counts for filters
  const catalogEventCounts = useMemo(() => ({
    all: allCatalogEvents.length,
    combat: allCatalogEvents.filter(e => e.category === 'combat').length,
    endurance: allCatalogEvents.filter(e => e.category === 'endurance').length,
    force: allCatalogEvents.filter(e => e.category === 'force').length,
    nature: allCatalogEvents.filter(e => e.category === 'nature').length,
    autre: allCatalogEvents.filter(e => e.category === 'autre').length,
    monde: allCatalogEvents.length,
    europe: allCatalogEvents.filter(e => EUROPEAN_COUNTRIES.includes(e.location?.country ?? '')).length,
    france: allCatalogEvents.filter(e => e.location?.country?.toLowerCase() === 'france').length,
  }), [allCatalogEvents]);

  // ============================================
  // GROUPEMENT DES ÉVÉNEMENTS DU CATALOGUE PAR SPORT
  // ============================================
  const groupedCatalogEvents = useMemo(() => {
    const groups: Record<string, SportEvent[]> = {};

    filteredCatalogEvents.forEach(event => {
      const sportTag = event.sport_tag || 'autre';
      if (!groups[sportTag]) {
        groups[sportTag] = [];
      }
      groups[sportTag].push(event);
    });

    // Trier les sports par nombre d'événements (décroissant)
    const sortedSports = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

    return { groups, sortedSports };
  }, [filteredCatalogEvents]);

  // Add external event to saved list
  const addExternalEventToSaved = useCallback(async (event: SportEvent) => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      const newSavedEvents = [...savedExternalEvents, event];
      setSavedExternalEvents(newSavedEvents);
      setSavedExternalEventIds(prev => new Set(prev).add(event.id));
      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(newSavedEvents));

      showPopup('Ajoute', `"${event.title.substring(0, 30)}..." ajoute a ton planning`);
    } catch (error) {
      logger.error('Error adding external event:', error);
      showPopup('Erreur', 'Impossible d\'ajouter l\'evenement');
    }
  }, [savedExternalEvents, showPopup]);

  // Remove external event from saved list
  const removeExternalEventFromSaved = useCallback(async (eventId: string) => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      const newSavedEvents = savedExternalEvents.filter(e => e.id !== eventId);
      setSavedExternalEvents(newSavedEvents);
      setSavedExternalEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(newSavedEvents));
    } catch (error) {
      logger.error('Error removing external event:', error);
    }
  }, [savedExternalEvents]);

  // Toggle external event in saved list
  const toggleExternalEventInSaved = useCallback(async (event: SportEvent) => {
    if (savedExternalEventIds.has(event.id)) {
      removeExternalEventFromSaved(event.id);
    } else {
      addExternalEventToSaved(event);
    }
  }, [savedExternalEventIds, addExternalEventToSaved, removeExternalEventFromSaved]);

  // ============================================
  // OPTIMISATION: Calcul des événements groupés
  // Éviter de recalculer à chaque render
  // ============================================
  const groupedEvents = useMemo(() => {
    // Filtrer événements futurs
    const futureEvents = savedExternalEvents.filter(event => {
      const eventDate = new Date(event.date_start);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    }).sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

    // Grouper par sport_tag
    const groupedBySport: Record<string, typeof futureEvents> = {};
    futureEvents.forEach(event => {
      const sport = event.sport_tag || 'autre';
      if (!groupedBySport[sport]) {
        groupedBySport[sport] = [];
      }
      groupedBySport[sport].push(event);
    });

    return { futureEvents, groupedBySport };
  }, [savedExternalEvents]);

  // Open external event link
  const handleOpenExternalEvent = useCallback((link: string) => {
    if (link) {
      impactAsync(ImpactFeedbackStyle.Light);
      safeOpenURL(link);
    }
  }, []);

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getWorkoutsForDate = useCallback((date: Date): Training[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return workouts.filter(w => w.date === dateStr);
  }, [workouts]);

  const selectedDateWorkouts = useMemo(() => {
    return selectedDate ? getWorkoutsForDate(selectedDate) : [];
  }, [selectedDate, getWorkoutsForDate]);

  // Stats des entraînements en plein air
  const outdoorStats = useMemo(() => {
    const outdoorWorkouts = workouts.filter(w => w.is_outdoor);
    const outdoorThisMonth = outdoorWorkouts.filter(w => isSameMonth(new Date(w.date), new Date())).length;
    return { total: outdoorWorkouts.length, thisMonth: outdoorThisMonth };
  }, [workouts]);

  // Monthly stats by club (including outdoor workouts)
  const monthlyClubStats = useMemo(() => {
    const stats: Record<number | string, { count: number; club: Club | { id: string; name: string; sport: string; color: string; isOutdoor: true } }> = {};
    let outdoorCount = 0;

    workouts.forEach(w => {
      if (isSameMonth(new Date(w.date), currentMonth)) {
        // Comptabiliser les entraînements en plein air
        if (w.is_outdoor) {
          outdoorCount++;
        }
        // Comptabiliser par club
        if (w.club_id) {
          const club = clubs.find(c => c.id === w.club_id);
          if (club) {
            if (!stats[w.club_id]) {
              stats[w.club_id] = { count: 0, club };
            }
            stats[w.club_id].count++;
          }
        }
      }
    });

    // Ajouter les stats "Plein air" si > 0
    if (outdoorCount > 0) {
      stats['outdoor'] = {
        count: outdoorCount,
        club: { id: 'outdoor', name: 'Plein air', sport: 'outdoor', color: '#22C55E', isOutdoor: true }
      };
    }

    return Object.values(stats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Augmenté à 5 pour inclure outdoor
  }, [workouts, currentMonth, clubs]);

  // Handler: clic sur un jour du calendrier
  const handleDayPress = (day: Date) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSelectedDate(day);
    setShowDayModal(true);
  };

  // Handler: ouvrir le flow d'ajout (même que le bouton +)
  const handleOpenAddModal = () => {
    // Protection anti-spam
    if (isNavigatingToAdd) return;
    setIsNavigatingToAdd(true);

    setShowDayModal(false);
    // Naviguer vers add-training avec la date sélectionnée
    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setTimeout(() => {
      router.push(`/add-training?date=${dateStr}`);
      // Reset après navigation
      setTimeout(() => setIsNavigatingToAdd(false), 1000);
    }, 300);
  };

  // Handler: supprimer une seance
  const handleDeleteSession = async (id: number) => {
    try {
      await deleteTraining(id);
      notificationAsync(NotificationFeedbackType.Success);
      await loadData();
    } catch (error) {
      logger.error('Erreur suppression seance:', error);
      showPopup('Erreur', 'Impossible de supprimer la seance');
    }
  };

  // Obtenir le logo du club ou une couleur par defaut
  const getClubDisplay = (club: Club) => {
    if (club.logo_uri) {
      const logoSource = getClubLogoSource(club.logo_uri);
      if (logoSource) {
        return { type: 'image' as const, source: logoSource };
      }
    }
    return { type: 'color' as const, color: club.color || colors.accent };
  };

  // Handler: Toggle repos
  const handleToggleRest = async (dayId: string) => {
    impactAsync(ImpactFeedbackStyle.Light);

    // Calculer la date du jour sélectionné dans la semaine courante
    const dayIndex = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].indexOf(dayId);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);
    const dateStr = targetDate.toISOString().split('T')[0];

    const isNowRest = await toggleRestDay(dateStr);
    showPopup(
      isNowRest ? 'Jour de repos' : 'Repos annulé',
      isNowRest
        ? `${dayId.charAt(0).toUpperCase() + dayId.slice(1)} marqué comme jour de repos`
        : `${dayId.charAt(0).toUpperCase() + dayId.slice(1)} n'est plus un jour de repos`,
      [{ text: 'OK', style: 'primary' }]
    );
  };

  // Handler: Ouvrir une séance depuis la vue programme
  const handleSessionPress = (dayId: string, sessionIndex: number) => {
    impactAsync(ImpactFeedbackStyle.Light);
    // Ouvrir le détail de la séance dans l'historique
    router.push('/history');
  };

  // Handler: Ajouter une séance depuis la vue emploi du temps
  const handleAddSessionFromProgramme = (dayId: string, _timeSlot?: string) => {
    // Protection anti-spam
    if (isNavigatingFromProgramme) return;
    setIsNavigatingFromProgramme(true);

    impactAsync(ImpactFeedbackStyle.Medium);
    // Calculer la prochaine date pour ce jour de la semaine
    const dayIndex = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].indexOf(dayId);
    const nextDate = getNextDateForDayOfWeek(dayIndex);
    // Naviguer vers add-training avec la date (même interface que le bouton +)
    const dateStr = format(nextDate, 'yyyy-MM-dd');
    router.push(`/add-training?date=${dateStr}`);

    // Reset après navigation
    setTimeout(() => setIsNavigatingFromProgramme(false), 1000);
  };

  // Handlers pour le popup de notation
  const handleRatingClose = async () => {
    await ratingService.onPopupDismissed();
    setShowRatingPopup(false);
  };

  const handleRated = async () => {
    await ratingService.onRated();
    setShowRatingPopup(false);
  };

  // Gérer le clic sur un onglet
  const tabs: { key: ViewMode; label: string; sublabel?: string; icon: any; color: string; description: string }[] = [
    { key: 'calendar', label: t('planning.calendar'), icon: Calendar, color: colors.accent, description: t('planning.calendarDescription') },
    { key: 'programme', label: t('planning.timetable'), icon: List, color: '#8B5CF6', description: t('planning.timetableDescription') },
    { key: 'journal', label: t('planning.journal'), icon: BookOpen, color: '#EF4444', description: t('planning.journalDescription') },
    { key: 'clubs', label: t('planning.clubs'), icon: Dumbbell, color: '#10B981', description: t('planning.clubsDescription') },
    { key: 'competitions', label: t('planning.events'), icon: Trophy, color: '#F59E0B', description: t('planning.eventsDescription') },
  ];

  const handleTabPress = (tab: ViewMode, index: number) => {
    if (isScrollingRef.current) return;

    impactAsync(ImpactFeedbackStyle.Light);

    setViewMode(tab);

    // Scroller vers la page correspondante
    horizontalScrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  };

  // ============================================
  // SCROLL INITIAL vers Prochains RDV (competitions)
  // ============================================
  useEffect(() => {
    // Scroll vers l'onglet competitions (index 4) au montage
    const competitionsIndex = tabs.findIndex(t => t.key === 'competitions');
    if (competitionsIndex >= 0 && horizontalScrollRef.current) {
      setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({
          x: competitionsIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 100);
    }
  }, []);

  // Gérer le scroll horizontal des pages
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offsetX / SCREEN_WIDTH);

    if (currentIndex >= 0 && currentIndex < tabs.length) {
      const newTab = tabs[currentIndex].key;
      if (newTab !== viewMode) {
        isScrollingRef.current = true;

        setViewMode(newTab);
        impactAsync(ImpactFeedbackStyle.Light);

        // Reset le flag après un délai
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 100);

        // Calculer la largeur totale des onglets (responsive)
        const tabWidth = IS_SMALL_SCREEN ? 38 : 44;
        const tabGap = IS_SMALL_SCREEN ? 6 : 12;
        const tabPadding = IS_SMALL_SCREEN ? 16 : 32;
        const totalTabsWidth = (tabs.length * (tabWidth + tabGap)) + tabPadding;

        // Si tous les onglets rentrent dans l'écran, ne pas scroller
        if (totalTabsWidth <= SCREEN_WIDTH) {
          return;
        }

        // Sinon, auto-scroll pour centrer l'onglet actif
        const scrollOffset = currentIndex * (tabWidth + tabGap) - SCREEN_WIDTH / 2 + (tabWidth / 2) + (IS_SMALL_SCREEN ? 8 : 16);
        tabScrollRef.current?.scrollTo({
          x: Math.max(0, scrollOffset),
          animated: true,
        });
      }
    }
  };

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header avec tabs circulaires - zIndex élevé pour rester visible */}
      <View style={[styles.tabsHeader, { backgroundColor: colors.background, zIndex: 100, elevation: 10 }]}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={(() => {
            const tabWidth = IS_SMALL_SCREEN ? 38 : 44;
            const tabGap = IS_SMALL_SCREEN ? 6 : 12;
            const tabPadding = IS_SMALL_SCREEN ? 16 : 32;
            const totalTabsWidth = (tabs.length * (tabWidth + tabGap)) + tabPadding;
            return totalTabsWidth > SCREEN_WIDTH;
          })()}
          contentContainerStyle={[
            styles.tabsContent,
            (() => {
              const tabWidth = IS_SMALL_SCREEN ? 38 : 44;
              const tabGap = IS_SMALL_SCREEN ? 6 : 12;
              const tabPadding = IS_SMALL_SCREEN ? 16 : 32;
              const totalTabsWidth = (tabs.length * (tabWidth + tabGap)) + tabPadding;
              return totalTabsWidth <= SCREEN_WIDTH && styles.tabsContentCentered;
            })()
          ]}
          style={styles.tabsScroll}
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabWrapper}
                onPress={() => handleTabPress(tab.key, index)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.circleTab,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                  },
                ]}>
                  <Icon
                    size={18}
                    color={isActive ? colors.textOnAccent : colors.textMuted}
                    strokeWidth={2.5}
                  />
                </View>
                <Text style={[
                  styles.tabTitle,
                  { color: isActive ? (isDark ? colors.accent : colors.textPrimary) : colors.textMuted }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Description de la page active */}
        <View style={styles.descriptionContainer}>
          <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>
            {tabs.find(t => t.key === viewMode)?.description || ''}
          </Text>
        </View>
      </View>

      {/* ScrollView horizontal avec pagination */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScroll}
        bounces={false}
        decelerationRate="fast"
      >
        {/* Page Calendrier */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* MONTHLY STATS BY CLUB - COMPACT */}
            {monthlyClubStats.length > 0 && (
              <View style={[styles.monthlyStatsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.monthlyStatsHeader}>
                  <TrendingUp size={16} color={colors.accentText} />
                  <Text style={[styles.monthlyStatsTitle, { color: colors.textPrimary }]}>Ce mois</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.monthlyStatsScroll}
                >
                  {monthlyClubStats.map(({ count, club }) => {
                    const isOutdoor = 'isOutdoor' in club && club.isOutdoor;
                    const display = isOutdoor ? null : getClubDisplay(club as Club);
                    return (
                      <View key={club.id} style={styles.monthlyStatItem}>
                        <View style={[styles.monthlyStatIcon, { backgroundColor: isOutdoor ? '#22C55E20' : (display?.type === 'color' ? `${display.color}20` : colors.backgroundElevated) }]}>
                          {isOutdoor ? (
                            <Sun size={24} color="#22C55E" strokeWidth={2} />
                          ) : display?.type === 'image' ? (
                            <Image source={display.source} style={styles.clubLogoSmall} />
                          ) : (
                            <View style={[styles.clubColorDot, { backgroundColor: display?.color || colors.accent }]} />
                          )}
                        </View>
                        <Text style={[styles.monthlyStatCount, { color: club.color || colors.accent }]}>x{count}</Text>
                        <Text style={[styles.monthlyStatName, { color: colors.textSecondary }]}>{club.name}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* NOUVEAU CALENDRIER AMÉLIORÉ */}
            <EnhancedCalendarView
              currentMonth={currentMonth}
              workouts={workouts}
              clubs={clubs}
              onMonthChange={setCurrentMonth}
              onDayPress={handleDayPress}
              selectedDate={selectedDate}
            />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Programme */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <TimetableView
              onAddSession={handleAddSessionFromProgramme}
              onSessionPress={handleSessionPress}
              refreshTrigger={refreshTrigger}
            />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Carnet d'entraînement */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('planning.journal')}</Text>

            {journalStats.total === 0 && journalStats.totalRecords === 0 ? (
              <EmptyState
                type="journal"
                onAction={() => {
                  impactAsync(ImpactFeedbackStyle.Medium);
                  router.push('/training-journal');
                }}
              />
            ) : (
              <>
                {/* Stats du carnet - Records + Techniques */}
                <View style={[styles.journalStatsContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <View style={styles.journalStatsRow}>
                    <View style={styles.journalStatItem}>
                      <Text style={[styles.journalStatValue, { color: '#EF4444' }]}>{journalStats.totalRecords}</Text>
                      <Text style={[styles.journalStatLabel, { color: colors.textMuted }]}>Records</Text>
                    </View>
                    <View style={[styles.journalStatDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.journalStatItem}>
                      <Text style={[styles.journalStatValue, { color: isDark ? colors.accent : colors.textPrimary }]}>{journalStats.total}</Text>
                      <Text style={[styles.journalStatLabel, { color: colors.textMuted }]}>Techniques</Text>
                    </View>
                    <View style={[styles.journalStatDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.journalStatItem}>
                      <Text style={[styles.journalStatValue, { color: '#10B981' }]}>{journalStats.mastered}</Text>
                      <Text style={[styles.journalStatLabel, { color: colors.textMuted }]}>Maîtrisées</Text>
                    </View>
                  </View>
                </View>

                {/* Mes Records - GRID 3 colonnes groupés par catégorie */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.subsectionTitle, { color: colors.textSecondary, marginTop: 0 }]}>Mes Records</Text>
                    <TouchableOpacity
                      onPress={() => router.push('/training-journal')}
                      style={{
                        backgroundColor: '#EF4444',
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={14} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/training-journal')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: isDark ? colors.accent : colors.textPrimary, fontSize: 12, fontWeight: '600' }}>Voir tout</Text>
                    <ChevronRight size={14} color={isDark ? colors.accent : colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                {recentBenchmarks.length === 0 ? (
                  <View style={[styles.emptyJournalCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border, paddingVertical: 20 }]}>
                    <Trophy size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyJournalTitle, { color: colors.textPrimary, fontSize: 14 }]}>Aucun record</Text>
                  </View>
                ) : (
              <>
                {/* Grouper les benchmarks par catégorie */}
                {(() => {
                  const categoryLabels: Record<string, string> = {
                    force: 'Musculation',
                    running: 'Running',
                    trail: 'Trail',
                    hyrox: 'Hyrox',
                    bodyweight: 'Poids de corps',
                  };
                  const categoryColors: Record<string, string> = {
                    force: '#EF4444',
                    running: '#3B82F6',
                    trail: '#10B981',
                    hyrox: '#F97316',
                    bodyweight: '#8B5CF6',
                  };
                  // Grouper par catégorie
                  const grouped = recentBenchmarks.reduce((acc, b) => {
                    const cat = b.category || 'other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(b);
                    return acc;
                  }, {} as Record<string, typeof recentBenchmarks>);

                  return Object.entries(grouped).map(([category, benchmarks]) => (
                    <View key={category}>
                      {/* Titre de la catégorie */}
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: categoryColors[category] || colors.textMuted,
                        marginTop: 12,
                        marginBottom: 6,
                        marginLeft: 4,
                      }}>
                        {categoryLabels[category] || category}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                        {/* Limiter à 3 éléments par catégorie pour un beau screenshot */}
                        {benchmarks.slice(0, 3).map((benchmark, index) => {
                          const lastEntry = benchmark.entries?.length > 0
                            ? benchmark.entries[benchmark.entries.length - 1]
                            : null;
                          const color = categoryColors[benchmark.category] || colors.accent;

                          // Format date
                          const formatDate = (dateStr: string) => {
                            const date = new Date(dateStr);
                            const day = date.getDate();
                            const month = date.toLocaleDateString(locale, { month: 'short' });
                            return `${day} ${month}`;
                          };

                          // Format display based on category
                          const getDisplay = () => {
                            if (!lastEntry) return { main: '--', sub: 'Pas de record' };

                            if (benchmark.category === 'force') {
                              // Force: show weight + kg, then reps
                              return {
                                main: `${lastEntry.value} ${benchmark.unit}`,
                                sub: lastEntry.reps ? `× ${lastEntry.reps} reps` : '',
                              };
                            }
                            if (benchmark.category === 'bodyweight' || benchmark.unit === 'reps') {
                              // Bodyweight: show reps
                              return {
                                main: `${lastEntry.value} reps`,
                                sub: '',
                              };
                            }
                            // Running/Trail - show time in h:min format with unit
                            if (lastEntry.duration && lastEntry.value) {
                              const totalMin = lastEntry.duration;
                              const hours = Math.floor(totalMin / 60);
                              const mins = Math.round(totalMin % 60);
                              const pacePerKm = totalMin / lastEntry.value;
                              const paceMin = Math.floor(pacePerKm);
                              const paceSec = Math.round((pacePerKm - paceMin) * 60);

                              let timeStr;
                              if (hours > 0) {
                                timeStr = `${hours}h${mins.toString().padStart(2, '0')}min`;
                              } else {
                                timeStr = `${mins}min`;
                              }
                              return {
                                main: timeStr,
                                sub: `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`,
                              };
                            }
                            return { main: `${lastEntry.value}`, sub: benchmark.unit };
                          };
                          const display = getDisplay();

                          return (
                            <TouchableOpacity
                              key={benchmark.id || index}
                              style={{ width: '33.33%', padding: 4 }}
                              onPress={() => router.push('/training-journal')}
                              activeOpacity={0.7}
                            >
                              <View style={{
                                backgroundColor: colors.backgroundCard,
                                borderRadius: 12,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: colors.border,
                                alignItems: 'center',
                                minHeight: 110,
                              }}>
                                {/* Icon + PR badge */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                  <View style={{
                                    backgroundColor: `${color}20`,
                                    borderRadius: 8,
                                    padding: 5,
                                  }}>
                                    <Trophy size={14} color={color} />
                                  </View>
                                  {lastEntry && (
                                    <View style={{
                                      backgroundColor: `${color}20`,
                                      borderRadius: 4,
                                      paddingHorizontal: 5,
                                      paddingVertical: 2,
                                      marginLeft: 4,
                                    }}>
                                      <Text style={{ color, fontSize: 9, fontWeight: '700' }}>PR</Text>
                                    </View>
                                  )}
                                </View>
                                {/* Main value - BIG */}
                                <Text style={{
                                  fontSize: 17,
                                  fontWeight: '800',
                                  color: lastEntry ? color : colors.textMuted,
                                  textAlign: 'center',
                                }} numberOfLines={1}>
                                  {display.main}
                                </Text>
                                {/* Sub info (reps or pace) */}
                                {display.sub ? (
                                  <Text style={{
                                    fontSize: 11,
                                    color: colors.textMuted,
                                    textAlign: 'center',
                                    marginTop: 2,
                                  }} numberOfLines={1}>
                                    {display.sub}
                                  </Text>
                                ) : null}
                                {/* Name */}
                                <Text style={{
                                  fontSize: 11,
                                  fontWeight: '600',
                                  color: colors.textSecondary,
                                  textAlign: 'center',
                                  marginTop: 4,
                                }} numberOfLines={1}>
                                  {benchmark.name}
                                </Text>
                                {/* Date */}
                                {lastEntry && (
                                  <Text style={{
                                    fontSize: 10,
                                    color: colors.textMuted,
                                    textAlign: 'center',
                                    marginTop: 3,
                                  }}>
                                    {formatDate(lastEntry.date)}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ));
                })()}
              </>
            )}

            {/* Mes Techniques - GRID 3 colonnes groupées par catégorie */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.subsectionTitle, { color: colors.textSecondary, marginTop: 0 }]}>Mes Techniques</Text>
                <TouchableOpacity
                  onPress={() => router.push('/training-journal')}
                  style={{
                    backgroundColor: '#8B5CF6',
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Plus size={14} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => router.push('/training-journal')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: isDark ? colors.accent : colors.textPrimary, fontSize: 12, fontWeight: '600' }}>Voir tout</Text>
                <ChevronRight size={14} color={isDark ? colors.accent : colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {recentSkills.length === 0 ? (
              <View style={[styles.emptyJournalCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border, paddingVertical: 20 }]}>
                <BookOpen size={32} color={colors.textMuted} />
                <Text style={[styles.emptyJournalTitle, { color: colors.textPrimary, fontSize: 14 }]}>Aucune technique</Text>
              </View>
            ) : (
              <>
                {/* Grouper les techniques par catégorie */}
                {(() => {
                  const categoryLabels: Record<string, string> = {
                    jjb_garde: 'JJB - Garde',
                    jjb_passage: 'JJB - Passage',
                    jjb_soumission: 'JJB - Soumission',
                    lutte: 'Lutte',
                    striking: 'Striking',
                    other: 'Autre',
                  };
                  const categoryColors: Record<string, string> = {
                    jjb_garde: '#8B5CF6',
                    jjb_passage: '#0ABAB5',
                    jjb_soumission: '#EC4899',
                    lutte: '#F97316',
                    striking: '#EF4444',
                    other: '#6B7280',
                  };
                  // Grouper par catégorie
                  const grouped = recentSkills.reduce((acc, s) => {
                    const cat = s.category || 'other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(s);
                    return acc;
                  }, {} as Record<string, typeof recentSkills>);

                  return Object.entries(grouped).map(([category, skills]) => (
                    <View key={category}>
                      {/* Titre de la catégorie */}
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: categoryColors[category] || colors.textMuted,
                        marginTop: 12,
                        marginBottom: 6,
                        marginLeft: 4,
                      }}>
                        {categoryLabels[category] || category}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                        {/* Limiter à 3 éléments par catégorie pour un beau screenshot */}
                        {skills.slice(0, 3).map((skill, index) => {
                          const color = categoryColors[skill.category] || colors.accent;
                          const statusColor = skill.status === 'mastered' ? '#10B981' : skill.status === 'in_progress' ? '#F97316' : '#EF4444';
                          const statusLabel = skill.status === 'mastered' ? 'Maîtrisé' : skill.status === 'in_progress' ? 'En cours' : 'À faire';

                          // Format date
                          const formatDate = (dateStr: string) => {
                            const date = new Date(dateStr);
                            const day = date.getDate();
                            const month = date.toLocaleDateString(locale, { month: 'short' });
                            return `${day} ${month}`;
                          };

                          return (
                            <TouchableOpacity
                              key={skill.id || index}
                              style={{ width: '33.33%', padding: 4 }}
                              onPress={() => router.push('/training-journal')}
                              activeOpacity={0.7}
                            >
                              <View style={{
                                backgroundColor: colors.backgroundCard,
                                borderRadius: 12,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: colors.border,
                                alignItems: 'center',
                                minHeight: 110,
                              }}>
                                {/* Icon + Status badge */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                  <View style={{
                                    backgroundColor: `${color}20`,
                                    borderRadius: 8,
                                    padding: 5,
                                  }}>
                                    <BookOpen size={14} color={color} />
                                  </View>
                                  <View style={{
                                    backgroundColor: `${statusColor}20`,
                                    borderRadius: 4,
                                    paddingHorizontal: 5,
                                    paddingVertical: 2,
                                    marginLeft: 4,
                                  }}>
                                    {skill.status === 'mastered' ? (
                                      <Check size={8} color={statusColor} strokeWidth={3} />
                                    ) : skill.status === 'in_progress' ? (
                                      <Clock size={8} color={statusColor} strokeWidth={2.5} />
                                    ) : (
                                      <Circle size={8} color={statusColor} strokeWidth={2} />
                                    )}
                                  </View>
                                </View>
                                {/* Status text */}
                                <Text style={{
                                  fontSize: 12,
                                  fontWeight: '700',
                                  color: statusColor,
                                  textAlign: 'center',
                                }}>
                                  {statusLabel}
                                </Text>
                                {/* Name */}
                                <Text style={{
                                  fontSize: 11,
                                  fontWeight: '600',
                                  color: colors.textPrimary,
                                  textAlign: 'center',
                                  marginTop: 4,
                                }} numberOfLines={2}>
                                  {skill.name}
                                </Text>
                                {/* Drill count if any */}
                                {skill.drillCount > 0 && (
                                  <Text style={{
                                    fontSize: 10,
                                    color: colors.textMuted,
                                    textAlign: 'center',
                                    marginTop: 2,
                                  }}>
                                    {skill.drillCount} drills
                                  </Text>
                                )}
                                {/* Date */}
                                <Text style={{
                                  fontSize: 10,
                                  color: colors.textMuted,
                                  textAlign: 'center',
                                  marginTop: 3,
                                }}>
                                  {formatDate(skill.updatedAt || skill.createdAt)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ));
                })()}
              </>
            )}
                </>
              )}

            {/* Bouton pour accéder au carnet complet */}
            <TouchableOpacity
              style={[styles.openJournalButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/training-journal')}
              activeOpacity={0.8}
            >
              <BookOpen size={20} color={colors.textOnGold} />
              <Text style={[styles.openJournalButtonText, { color: colors.textOnGold }]}>Ouvrir le Carnet complet</Text>
              <ChevronRight size={20} color={colors.textOnGold} />
            </TouchableOpacity>

            {/* Bouton pour logger rapidement */}
            <TouchableOpacity
              style={[styles.quickLogButton, { backgroundColor: colors.backgroundCard, borderColor: isDark ? colors.accent : colors.textPrimary }]}
              onPress={() => router.push('/quick-log')}
              activeOpacity={0.8}
            >
              <Plus size={20} color={isDark ? colors.accent : colors.textPrimary} />
              <Text style={[styles.quickLogButtonText, { color: isDark ? colors.accent : colors.textPrimary }]}>Logger une séance</Text>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Clubs */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('planning.clubs')}</Text>

            {/* Carte Plein Air - affichée si entraînements outdoor */}
            {outdoorStats.total > 0 && (
              <View style={[styles.outdoorCard, { backgroundColor: '#22C55E15', borderColor: '#22C55E40' }]}>
                <View style={styles.outdoorCardContent}>
                  <View style={[styles.outdoorIconBg, { backgroundColor: '#22C55E30' }]}>
                    <Sun size={32} color="#22C55E" strokeWidth={2} />
                  </View>
                  <View style={styles.outdoorInfo}>
                    <Text style={[styles.outdoorTitle, { color: '#22C55E' }]}>Plein air</Text>
                    <Text style={[styles.outdoorSubtitle, { color: colors.textSecondary }]}>Entraînements en extérieur</Text>
                  </View>
                  <View style={styles.outdoorStats}>
                    <Text style={[styles.outdoorStatValue, { color: '#22C55E' }]}>{outdoorStats.thisMonth}</Text>
                    <Text style={[styles.outdoorStatLabel, { color: colors.textMuted }]}>ce mois</Text>
                  </View>
                </View>
                <View style={[styles.outdoorTotal, { borderTopColor: '#22C55E20' }]}>
                  <Text style={[styles.outdoorTotalLabel, { color: colors.textMuted }]}>Total entraînements plein air</Text>
                  <Text style={[styles.outdoorTotalValue, { color: '#22C55E' }]}>{outdoorStats.total}</Text>
                </View>
              </View>
            )}

            {clubs.length === 0 && outdoorStats.total === 0 ? (
              <EmptyState
                type="clubs"
                onAction={() => {
                  impactAsync(ImpactFeedbackStyle.Medium);
                  setEditingClub(null);
                  setShowAddClubModal(true);
                }}
              />
            ) : clubs.length > 0 ? (
              <View style={styles.clubsGrid}>
                {clubs.map((club) => {
                  const display = getClubDisplay(club);
                  const clubWorkouts = workouts.filter(w => w.club_id === club.id);
                  const thisMonthWorkouts = clubWorkouts.filter(w => isSameMonth(new Date(w.date), new Date())).length;
                  // Trouver l'objectif pour ce sport
                  const goalProgress = goalsProgress.find(g => g.goal.sport_id === club.sport);
                  const hasGoal = goalProgress !== undefined;
                  const goalColor = hasGoal
                    ? goalProgress.weekPercent >= 100
                      ? '#22C55E'
                      : goalProgress.isOnTrack
                        ? colors.accent
                        : '#EF4444'
                    : colors.textMuted;

                  return (
                    <View
                      key={club.id}
                      style={[styles.clubCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                    >
                      {/* Boutons Edit / Delete en haut à droite */}
                      <View style={styles.clubCardActions}>
                        <TouchableOpacity
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            setEditingClub(club);
                            setShowAddClubModal(true);
                          }}
                          style={[styles.clubActionBtn, { backgroundColor: isDark ? colors.backgroundElevated : '#F3F4F6' }]}
                        >
                          <Edit3 size={14} color={colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Medium);
                            showPopup(
                              'Supprimer le club',
                              `Supprimer "${club.name}" ? Cette action est irréversible.`,
                              [
                                { text: 'Annuler', style: 'cancel' },
                                {
                                  text: 'Supprimer',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      await deleteClub(club.id!);
                                      await loadData();
                                    } catch (error) {
                                      showPopup('Erreur', 'Impossible de supprimer le club', [{ text: 'OK', style: 'primary' }]);
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                          style={[styles.clubActionBtn, { backgroundColor: isDark ? '#2D1515' : '#FEE2E2' }]}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          impactAsync(ImpactFeedbackStyle.Light);
                          setEditingClub(club);
                          setShowAddClubModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.clubLogoBg, { backgroundColor: display.type === 'color' ? `${display.color}20` : colors.backgroundElevated }]}>
                          {display.type === 'image' ? (
                            <Image source={display.source} style={styles.clubLogoLarge} />
                          ) : (
                            <View style={[styles.clubColorLarge, { backgroundColor: display.color }]} />
                          )}
                        </View>
                        <Text style={[styles.clubName, { color: colors.textPrimary }]} numberOfLines={1}>{club.name}</Text>
                        <Text style={[styles.clubSport, { color: colors.textSecondary }]}>{club.sport}</Text>
                      </TouchableOpacity>

                      {/* Objectif hebdomadaire */}
                      {hasGoal ? (
                        <View style={styles.clubGoalSection}>
                          <View style={styles.clubGoalRow}>
                            <Text style={[styles.clubGoalValue, { color: goalColor }]}>
                              {goalProgress.weekCount}/{goalProgress.weekTarget}
                            </Text>
                            <Text style={[styles.clubGoalLabel, { color: colors.textMuted }]}>
                              /sem
                            </Text>
                          </View>
                          <View style={[styles.clubGoalBar, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.clubGoalFill,
                                { width: `${Math.min(100, goalProgress.weekPercent)}%`, backgroundColor: goalColor }
                              ]}
                            />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.clubStats}>
                          <Text style={[styles.clubStatsValue, { color: club.color || colors.accent }]}>{thisMonthWorkouts}</Text>
                          <Text style={[styles.clubStatsLabel, { color: colors.textMuted }]}>ce mois</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Total Stats */}
            {clubs.length > 0 && (
              <>
                <View style={[styles.totalStatsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <View style={styles.totalStatItem}>
                    <Text style={[styles.totalStatValue, { color: colors.textPrimary }]}>{workouts.length}</Text>
                    <Text style={[styles.totalStatLabel, { color: colors.textMuted }]}>total seances</Text>
                  </View>
                  <View style={[styles.totalStatDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.totalStatItem}>
                    <Text style={[styles.totalStatValue, { color: colors.textPrimary }]}>{clubs.length}</Text>
                    <Text style={[styles.totalStatLabel, { color: colors.textMuted }]}>clubs</Text>
                  </View>
                </View>

                {/* Add Club Button - TOUJOURS VISIBLE */}
                <TouchableOpacity
                  style={[styles.addClubButtonFixed, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Medium);
                    setEditingClub(null);
                    setShowAddClubModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color={colors.textOnGold} strokeWidth={2.5} />
                  <Text style={[styles.addClubButtonFixedText, { color: colors.textOnGold }]}>Ajouter un club</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Compétitions */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Segmented Control: Mes RDV / Trouver */}
            <View style={[styles.eventsSegmentControl, { backgroundColor: colors.backgroundCard }]}>
              <TouchableOpacity
                style={[
                  styles.eventsSegmentButton,
                  eventsTabMode === 'my_events' && { backgroundColor: '#F59E0B' },
                ]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setEventsTabMode('my_events');
                }}
                activeOpacity={0.8}
              >
                <Trophy size={16} color={eventsTabMode === 'my_events' ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[
                  styles.eventsSegmentText,
                  { color: eventsTabMode === 'my_events' ? '#FFFFFF' : colors.textSecondary },
                ]}>
                  Mes RDV
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.eventsSegmentButton,
                  eventsTabMode === 'catalog' && { backgroundColor: '#8B5CF6' },
                ]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setEventsTabMode('catalog');
                }}
                activeOpacity={0.8}
              >
                <Globe size={16} color={eventsTabMode === 'catalog' ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[
                  styles.eventsSegmentText,
                  { color: eventsTabMode === 'catalog' ? '#FFFFFF' : colors.textSecondary },
                ]}>
                  Trouver
                </Text>
              </TouchableOpacity>
            </View>

            {/* ====== VIEW: MES RDV ====== */}
            {eventsTabMode === 'my_events' && (
              <>
                {/* Liste des RDV ajoutés */}
                {savedExternalEvents.length > 0 ? (
                  <>
                    {/* Grouper les événements par sport - OPTIMISÉ avec useMemo */}
                    {Object.keys(groupedEvents.groupedBySport).map(sportKey => {
                      // Get sport info from sports.ts
                      const sport = getSportById(sportKey);
                      const sportInfo = sport ? {
                        label: sport.name,
                        icon: sport.icon,
                        color: sport.color,
                      } : {
                        label: sportKey.charAt(0).toUpperCase() + sportKey.slice(1),
                        icon: 'trophy',
                        color: '#6B7280',
                      };

                      const events = groupedEvents.groupedBySport[sportKey];

                      return (
                          <View key={sportKey}>
                            {/* Sport Header */}
                            <View style={[styles.sportHeader, { backgroundColor: sportInfo.color + '15', borderLeftColor: sportInfo.color }]}>
                              <View style={[styles.sportIconContainer, { backgroundColor: sportInfo.color + '20' }]}>
                                <MaterialCommunityIcons name={sportInfo.icon as any} size={20} color={sportInfo.color} />
                              </View>
                              <Text style={[styles.sportLabel, { color: sportInfo.color }]}>
                                {sportInfo.label} ({events.length})
                              </Text>
                            </View>

                            {/* Events de ce sport - Nouveau design avec images */}
                            <View style={styles.savedEventsGrid}>
                            {events.map((event) => {
                              const eventDate = new Date(event.date_start);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              eventDate.setHours(0, 0, 0, 0);
                              const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              const urgencyColor = daysLeft <= 7 ? '#EF4444' : daysLeft <= 30 ? '#F59E0B' : '#10B981';

                              const categoryColor =
                                event.category === 'combat' ? '#EF4444' :
                                event.category === 'endurance' ? '#10B981' :
                                event.category === 'force' ? '#F59E0B' :
                                event.category === 'nature' ? '#8B5CF6' : '#6B7280';

                              const city = event.location?.city || 'Lieu inconnu';
                              const country = event.location?.country || '';

                        return (
                          <TouchableOpacity
                            key={event.id}
                            style={[styles.savedEventCardNew, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                            onPress={() => {
                              impactAsync(ImpactFeedbackStyle.Medium);
                              router.push({
                                pathname: '/event-detail',
                                params: {
                                  id: event.id,
                                  title: event.title,
                                  date_start: event.date_start,
                                  city: event.location?.city || '',
                                  country: event.location?.country || '',
                                  full_address: event.location?.full_address || '',
                                  category: event.category,
                                  sport_tag: event.sport_tag,
                                  registration_link: event.registration_link || '',
                                  federation: event.federation || '',
                                  image_logo_url: event.image_logo_url || '',
                                }
                              });
                            }}
                            activeOpacity={0.7}
                          >
                            {/* Visual Header avec gradient et icône */}
                            <View style={[styles.savedEventImageContainer, { backgroundColor: categoryColor }]}>
                              {/* Gradient overlay effect */}
                              <View style={[styles.savedEventGradientOverlay, { backgroundColor: categoryColor }]} />
                              {/* Pattern décoratif */}
                              <View style={styles.savedEventPattern}>
                                <MaterialCommunityIcons name={sportInfo.icon as any} size={80} color="rgba(255,255,255,0.08)" />
                              </View>
                              {/* Icône centrale */}
                              <View style={styles.savedEventIconCircle}>
                                <MaterialCommunityIcons name={sportInfo.icon as any} size={32} color="#FFFFFF" />
                              </View>
                              {/* Countdown Badge */}
                              {daysLeft > 0 && (
                                <View style={[styles.savedEventCountdownBadge, { backgroundColor: urgencyColor }]}>
                                  <Text style={styles.savedEventCountdownText}>J-{daysLeft}</Text>
                                </View>
                              )}
                              {/* Delete Button */}
                              <TouchableOpacity
                                style={styles.savedEventDeleteBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  removeExternalEventFromSaved(event.id);
                                }}
                              >
                                <Trash2 size={14} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>

                            {/* Event Info */}
                            <View style={styles.savedEventInfoNew}>
                              <View style={[styles.savedEventDateBadgeSmall, { backgroundColor: categoryColor + '15' }]}>
                                <Text style={[styles.savedEventDateText, { color: categoryColor }]}>
                                  {eventDate.getDate()} {eventDate.toLocaleDateString(locale, { month: 'short' }).toUpperCase()}
                                </Text>
                              </View>
                              <Text style={[styles.savedEventTitleNew, { color: colors.textPrimary }]} numberOfLines={2}>
                                {event.title}
                              </Text>
                              <View style={styles.savedEventLocationRow}>
                                <MapPin size={11} color={colors.textMuted} />
                                <Text style={[styles.savedEventLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                                  {city}{country ? `, ${country}` : ''}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                            </View>
                          </View>
                        );
                      })}
                  </>
                ) : (
                  /* État vide */
                  <EmptyState
                    type="competitions"
                    onAction={() => {
                      impactAsync(ImpactFeedbackStyle.Medium);
                      setEventsTabMode('catalog');
                    }}
                  />
                )}

                {/* Espace en bas pour le bouton flottant */}
                {savedExternalEvents.length > 0 && (
                  <View style={{ height: 80 }} />
                )}
              </>
            )}

            {/* ====== VIEW: TROUVER (CATALOG) ====== */}
            {eventsTabMode === 'catalog' && (
              <>
                {/* Search Bar + Filtres Compact */}
                <View style={[styles.searchAndFilters, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <View style={styles.searchBarCompact}>
                    <Search size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.catalogSearchInput, { color: colors.textPrimary }]}
                      placeholder="Rechercher..."
                      placeholderTextColor={colors.textMuted}
                      value={catalogSearchQuery}
                      onChangeText={setCatalogSearchQuery}
                    />
                    {catalogSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setCatalogSearchQuery('')}>
                        <X size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Bouton Filtres */}
                  <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: colors.accent }]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setShowFiltersModal(true);
                    }}
                  >
                    <Filter size={18} color="#FFFFFF" />
                    <Text style={styles.filterButtonText}>Filtres</Text>
                    {(catalogLocationFilter !== 'monde' || catalogCategoryFilter !== 'all') && (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>
                          {(catalogLocationFilter !== 'monde' ? 1 : 0) + (catalogCategoryFilter !== 'all' ? 1 : 0)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Modal Filtres - Design Premium */}
                <Modal
                  visible={showFiltersModal}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowFiltersModal(false)}
                >
                  <TouchableOpacity
                    style={styles.filterModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowFiltersModal(false)}
                  >
                    <TouchableOpacity
                      style={[styles.filterModalPanel, { backgroundColor: isDark ? '#1A1A1E' : '#FFFFFF' }]}
                      activeOpacity={1}
                    >
                      {/* Header avec gradient */}
                      <View style={[styles.filterModalHeader, { backgroundColor: '#8B5CF6' }]}>
                        <View style={styles.filterModalHeaderContent}>
                          <Filter size={22} color="#FFFFFF" />
                          <Text style={styles.filterModalTitle}>Filtres</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.filterModalCloseBtn}
                          onPress={() => setShowFiltersModal(false)}
                        >
                          <X size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
                        {/* Localisation - Cards design */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MapPin size={14} color={colors.textMuted} />
                          <Text style={[styles.filterModalSectionTitle, { color: colors.textMuted }]}>LOCALISATION</Text>
                        </View>
                        <View style={styles.filterLocationGrid}>
                          {([
                            { key: 'france', emoji: '🇫🇷', label: 'France', color: '#3B82F6' },
                            { key: 'europe', emoji: '🇪🇺', label: 'Europe', color: '#8B5CF6' },
                            { key: 'monde', emoji: '🌍', label: 'Monde', color: '#10B981' },
                          ] as const).map((loc) => (
                            <TouchableOpacity
                              key={loc.key}
                              style={[
                                styles.filterLocationCard,
                                {
                                  backgroundColor: catalogLocationFilter === loc.key ? loc.color : colors.background,
                                  borderColor: catalogLocationFilter === loc.key ? loc.color : colors.border,
                                },
                              ]}
                              onPress={() => {
                                impactAsync(ImpactFeedbackStyle.Medium);
                                setCatalogLocationFilter(loc.key);
                              }}
                            >
                              <Text style={styles.filterLocationEmoji}>{loc.emoji}</Text>
                              <Text style={[
                                styles.filterLocationLabel,
                                { color: catalogLocationFilter === loc.key ? '#FFFFFF' : colors.textPrimary },
                              ]}>
                                {loc.label}
                              </Text>
                              {catalogLocationFilter === loc.key && (
                                <View style={styles.filterCheckBadge}>
                                  <Check size={12} color={loc.color} strokeWidth={3} />
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Catégorie - Premium Cards */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 }}>
                          <Trophy size={14} color={colors.textMuted} />
                          <Text style={[styles.filterModalSectionTitle, { color: colors.textMuted }]}>CATÉGORIE</Text>
                        </View>
                        <View style={styles.filterCategoryGrid}>
                          {([
                            { key: 'all', icon: 'trophy-outline', label: 'Tous', color: '#6B7280' },
                            { key: 'combat', icon: 'karate', label: 'Combat', color: '#EF4444' },
                            { key: 'endurance', icon: 'run-fast', label: 'Endurance', color: '#10B981' },
                            { key: 'force', icon: 'dumbbell', label: 'Force', color: '#F59E0B' },
                            { key: 'nature', icon: 'terrain', label: 'Nature', color: '#8B5CF6' },
                          ] as const).map((cat) => (
                            <TouchableOpacity
                              key={cat.key}
                              style={[
                                styles.filterCategoryCard,
                                {
                                  backgroundColor: catalogCategoryFilter === cat.key ? cat.color + '15' : colors.background,
                                  borderColor: catalogCategoryFilter === cat.key ? cat.color : colors.border,
                                  borderWidth: catalogCategoryFilter === cat.key ? 2 : 1,
                                },
                              ]}
                              onPress={() => {
                                impactAsync(ImpactFeedbackStyle.Medium);
                                setCatalogCategoryFilter(cat.key as CatalogCategoryFilter);
                                setCatalogSportFilter('all');
                                setCatalogSubFilter('all');
                              }}
                            >
                              <View style={[styles.filterCategoryIconBg, { backgroundColor: cat.color + '20' }]}>
                                <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                              </View>
                              <Text style={[
                                styles.filterCategoryLabel,
                                { color: catalogCategoryFilter === cat.key ? cat.color : colors.textPrimary },
                              ]}>
                                {cat.label}
                              </Text>
                              {catalogCategoryFilter === cat.key && (
                                <View style={[styles.filterCategoryCheck, { backgroundColor: cat.color }]}>
                                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Sports spécifiques selon la catégorie */}
                        {catalogCategoryFilter !== 'all' && (
                          <>
                            <Text style={[styles.filterSectionTitle, { color: colors.textMuted, marginTop: 24 }]}>SPORT</Text>
                            <View style={styles.filterGrid}>
                              <TouchableOpacity
                                style={[
                                  styles.filterChip,
                                  {
                                    backgroundColor: catalogSportFilter === 'all' ? colors.accent : colors.background,
                                    borderColor: catalogSportFilter === 'all' ? colors.accent : colors.border,
                                  },
                                ]}
                                onPress={() => {
                                  impactAsync(ImpactFeedbackStyle.Light);
                                  setCatalogSportFilter('all');
                                }}
                              >
                                <Text style={[
                                  styles.filterChipText,
                                  { color: catalogSportFilter === 'all' ? '#FFFFFF' : colors.textPrimary },
                                ]}>
                                  Tous
                                </Text>
                              </TouchableOpacity>

                              {/* Sports Combat */}
                              {catalogCategoryFilter === 'combat' && (
                                <>
                                  {['jjb', 'grappling', 'judo'].map((sport) => {
                                    const sportInfo = getSportById(sport);
                                    return (
                                      <TouchableOpacity
                                        key={sport}
                                        style={[
                                          styles.filterChip,
                                          {
                                            backgroundColor: catalogSportFilter === sport ? colors.accent : colors.background,
                                            borderColor: catalogSportFilter === sport ? colors.accent : colors.border,
                                          },
                                        ]}
                                        onPress={() => {
                                          impactAsync(ImpactFeedbackStyle.Light);
                                          setCatalogSportFilter(sport);
                                          setCatalogSubFilter('all');
                                        }}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                          <MaterialCommunityIcons
                                            name={sportInfo?.icon as any}
                                            size={16}
                                            color={catalogSportFilter === sport ? '#FFFFFF' : sportInfo?.color || colors.textPrimary}
                                          />
                                          <Text style={[
                                            styles.filterChipText,
                                            { color: catalogSportFilter === sport ? '#FFFFFF' : colors.textPrimary },
                                          ]}>
                                            {sportInfo?.name || sport.toUpperCase()}
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </>
                              )}

                              {/* Sports Endurance */}
                              {catalogCategoryFilter === 'endurance' && (
                                <>
                                  {['running', 'marathon', 'trail', 'triathlon', 'obstacle', 'cycling'].map((sport) => {
                                    const sportInfo = getSportById(sport);
                                    return (
                                      <TouchableOpacity
                                        key={sport}
                                        style={[
                                          styles.filterChip,
                                          {
                                            backgroundColor: catalogSportFilter === sport ? colors.accent : colors.background,
                                            borderColor: catalogSportFilter === sport ? colors.accent : colors.border,
                                          },
                                        ]}
                                        onPress={() => {
                                          impactAsync(ImpactFeedbackStyle.Light);
                                          setCatalogSportFilter(sport);
                                          setCatalogSubFilter('all');
                                        }}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                          <MaterialCommunityIcons
                                            name={sportInfo?.icon as any}
                                            size={16}
                                            color={catalogSportFilter === sport ? '#FFFFFF' : sportInfo?.color || colors.textPrimary}
                                          />
                                          <Text style={[
                                            styles.filterChipText,
                                            { color: catalogSportFilter === sport ? '#FFFFFF' : colors.textPrimary },
                                          ]}>
                                            {sportInfo?.name || sport.toUpperCase()}
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </>
                              )}

                              {/* Sports Force */}
                              {catalogCategoryFilter === 'force' && (
                                <>
                                  {['hyrox', 'crossfit', 'powerlifting', 'fitness'].map((sport) => {
                                    const sportInfo = getSportById(sport);
                                    return (
                                      <TouchableOpacity
                                        key={sport}
                                        style={[
                                          styles.filterChip,
                                          {
                                            backgroundColor: catalogSportFilter === sport ? colors.accent : colors.background,
                                            borderColor: catalogSportFilter === sport ? colors.accent : colors.border,
                                          },
                                        ]}
                                        onPress={() => {
                                          impactAsync(ImpactFeedbackStyle.Light);
                                          setCatalogSportFilter(sport);
                                          setCatalogSubFilter('all');
                                        }}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                          <MaterialCommunityIcons
                                            name={sportInfo?.icon as any}
                                            size={16}
                                            color={catalogSportFilter === sport ? '#FFFFFF' : sportInfo?.color || colors.textPrimary}
                                          />
                                          <Text style={[
                                            styles.filterChipText,
                                            { color: catalogSportFilter === sport ? '#FFFFFF' : colors.textPrimary },
                                          ]}>
                                            {sportInfo?.name || sport.toUpperCase()}
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </>
                              )}

                              {/* Sports Nature */}
                              {catalogCategoryFilter === 'nature' && (
                                <>
                                  {['climbing', 'escalade'].map((sport) => {
                                    const sportInfo = getSportById(sport);
                                    return (
                                      <TouchableOpacity
                                        key={sport}
                                        style={[
                                          styles.filterChip,
                                          {
                                            backgroundColor: catalogSportFilter === sport ? colors.accent : colors.background,
                                            borderColor: catalogSportFilter === sport ? colors.accent : colors.border,
                                          },
                                        ]}
                                        onPress={() => {
                                          impactAsync(ImpactFeedbackStyle.Light);
                                          setCatalogSportFilter(sport);
                                          setCatalogSubFilter('all');
                                        }}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                          <MaterialCommunityIcons
                                            name={sportInfo?.icon as any}
                                            size={16}
                                            color={catalogSportFilter === sport ? '#FFFFFF' : sportInfo?.color || colors.textPrimary}
                                          />
                                          <Text style={[
                                            styles.filterChipText,
                                            { color: catalogSportFilter === sport ? '#FFFFFF' : colors.textPrimary },
                                          ]}>
                                            {sportInfo?.name || sport.toUpperCase()}
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </>
                              )}
                            </View>
                          </>
                        )}

                        {/* Sous-filtres spécifiques (Distance, Type, etc.) */}
                        {catalogSportFilter !== 'all' && (() => {
                          let subFilters: { value: string; label: string }[] = [];

                          // Running / Marathon - filtres par distance
                          if (catalogSportFilter === 'running' || catalogSportFilter === 'marathon') {
                            subFilters = [
                              { value: 'all', label: 'Toutes distances' },
                              { value: '10k', label: '10K' },
                              { value: 'semi', label: 'Semi-Marathon' },
                              { value: 'marathon', label: 'Marathon' },
                              { value: 'ultra', label: 'Ultra / UTMB' },
                            ];
                          }
                          // Trail - filtres par distance
                          else if (catalogSportFilter === 'trail') {
                            subFilters = [
                              { value: 'all', label: 'Toutes distances' },
                              { value: 'court', label: '< 20km' },
                              { value: 'moyen', label: '20-50km' },
                              { value: 'long', label: '50-100km' },
                              { value: 'ultra', label: '> 100km' },
                            ];
                          }
                          // JJB - filtres par type
                          else if (catalogSportFilter === 'jjb') {
                            subFilters = [
                              { value: 'all', label: 'Tous types' },
                              { value: 'gi', label: 'GI (Kimono)' },
                              { value: 'nogi', label: 'NO GI' },
                            ];
                          }
                          // Grappling
                          else if (catalogSportFilter === 'grappling') {
                            subFilters = [
                              { value: 'all', label: 'Tous types' },
                              { value: 'gi', label: 'Avec GI' },
                              { value: 'nogi', label: 'Sans GI' },
                            ];
                          }
                          // Climbing
                          else if (catalogSportFilter === 'climbing') {
                            subFilters = [
                              { value: 'all', label: 'Tous types' },
                              { value: 'bouldering', label: 'Bouldering' },
                              { value: 'lead', label: 'Lead' },
                              { value: 'speed', label: 'Speed' },
                            ];
                          }

                          if (subFilters.length > 0) {
                            return (
                              <>
                                <Text style={[styles.filterSectionTitle, { color: colors.textMuted, marginTop: 24 }]}>
                                  {catalogSportFilter === 'running' || catalogSportFilter === 'marathon' || catalogSportFilter === 'trail' ? 'DISTANCE' : 'TYPE'}
                                </Text>
                                <View style={styles.filterGrid}>
                                  {subFilters.map((filter) => (
                                    <TouchableOpacity
                                      key={filter.value}
                                      style={[
                                        styles.filterChip,
                                        {
                                          backgroundColor: catalogSubFilter === filter.value ? colors.accent : colors.background,
                                          borderColor: catalogSubFilter === filter.value ? colors.accent : colors.border,
                                        },
                                      ]}
                                      onPress={() => {
                                        impactAsync(ImpactFeedbackStyle.Light);
                                        setCatalogSubFilter(filter.value);
                                      }}
                                    >
                                      <Text style={[
                                        styles.filterChipText,
                                        { color: catalogSubFilter === filter.value ? '#FFFFFF' : colors.textPrimary },
                                      ]}>
                                        {filter.label}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </ScrollView>

                      {/* Footer avec boutons - Design Premium */}
                      <View style={[styles.filterModalFooter, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                          style={[styles.filterResetBtnNew, { borderColor: colors.border }]}
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            setCatalogLocationFilter('monde');
                            setCatalogCategoryFilter('all');
                            setCatalogSportFilter('all');
                            setCatalogSubFilter('all');
                          }}
                        >
                          <X size={16} color={colors.textSecondary} />
                          <Text style={[styles.filterResetBtnText, { color: colors.textSecondary }]}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.filterApplyBtnNew}
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Medium);
                            setShowFiltersModal(false);
                          }}
                        >
                          <Check size={18} color="#FFFFFF" strokeWidth={3} />
                          <Text style={styles.filterApplyBtnText}>Appliquer ({filteredCatalogEvents.length})</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>

                {/* Results count */}
                <Text style={[styles.catalogResultsCount, { color: colors.textMuted }]}>
                  {filteredCatalogEvents.length} evenement{filteredCatalogEvents.length > 1 ? 's' : ''} trouve{filteredCatalogEvents.length > 1 ? 's' : ''}
                </Text>

                {/* Events List - Grouped by Sport */}
                {catalogLoading ? (
                  <View style={[styles.catalogEmptyState, { backgroundColor: colors.backgroundCard }]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[styles.catalogEmptyText, { color: colors.textMuted, marginTop: 16 }]}>
                      Chargement des événements...
                    </Text>
                  </View>
                ) : filteredCatalogEvents.length === 0 ? (
                  <View style={[styles.catalogEmptyState, { backgroundColor: colors.backgroundCard }]}>
                    <Search size={48} color={colors.textMuted} />
                    <Text style={[styles.catalogEmptyTitle, { color: colors.textPrimary }]}>
                      Aucun evenement trouve
                    </Text>
                    <Text style={[styles.catalogEmptyText, { color: colors.textMuted }]}>
                      Modifie tes filtres ou ton recherche
                    </Text>
                  </View>
                ) : (
                  groupedCatalogEvents.sortedSports.map((sportTag) => {
                    const events = groupedCatalogEvents.groups[sportTag];
                    const sport = getSportById(sportTag);
                    const sportInfo = sport ? {
                      label: sport.name,
                      icon: sport.icon,
                      color: sport.color,
                    } : {
                      label: sportTag.charAt(0).toUpperCase() + sportTag.slice(1),
                      icon: 'trophy',
                      color: '#6B7280',
                    };

                    return (
                      <View key={sportTag} style={styles.catalogSportSection}>
                        {/* Sport Header */}
                        {/* Sport Header - Design épuré sans barre */}
                        <View style={[styles.catalogSportHeaderNew, { backgroundColor: sportInfo.color + '10' }]}>
                          <View style={[styles.catalogSportIconCircle, { backgroundColor: sportInfo.color }]}>
                            <MaterialCommunityIcons name={sportInfo.icon as any} size={20} color="#FFFFFF" />
                          </View>
                          <Text style={[styles.catalogSportTitleNew, { color: colors.textPrimary }]}>
                            {sportInfo.label}
                          </Text>
                          <View style={[styles.catalogSportCountBadge, { backgroundColor: sportInfo.color + '20' }]}>
                            <Text style={[styles.catalogSportCountText, { color: sportInfo.color }]}>
                              {events.length}
                            </Text>
                          </View>
                        </View>

                        {/* Events Grid - 2 par sport */}
                        <View style={styles.catalogEventsGrid}>
                          {events.slice(0, 2).map((event) => {
                            const eventDate = new Date(event.date_start);
                            const formattedDate = eventDate.toLocaleDateString(locale, {
                              day: 'numeric',
                              month: 'short',
                            });
                            const isSaved = savedExternalEventIds.has(event.id);
                            const city = event.location?.city || 'Lieu inconnu';
                            const country = event.location?.country || '';

                            const categoryColor =
                              event.category === 'combat' ? '#EF4444' :
                              event.category === 'endurance' ? '#10B981' :
                              event.category === 'force' ? '#F59E0B' :
                              event.category === 'nature' ? '#8B5CF6' : '#6B7280';

                            return (
                              <TouchableOpacity
                                key={event.id}
                                style={[styles.catalogEventCardNew, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                                onPress={() => {
                                  impactAsync(ImpactFeedbackStyle.Medium);
                                  router.push({
                                    pathname: '/event-detail',
                                    params: {
                                      id: event.id,
                                      title: event.title,
                                      date_start: event.date_start,
                                      city: event.location?.city || '',
                                      country: event.location?.country || '',
                                      full_address: event.location?.full_address || '',
                                      category: event.category,
                                      sport_tag: event.sport_tag,
                                      registration_link: event.registration_link || '',
                                      federation: event.federation || '',
                                      image_logo_url: event.image_logo_url || '',
                                    }
                                  });
                                }}
                                activeOpacity={0.7}
                              >
                                {/* Visual Header avec gradient et icône */}
                                <View style={[styles.catalogEventImageContainer, { backgroundColor: categoryColor }]}>
                                  {/* Pattern décoratif en arrière-plan */}
                                  <View style={styles.catalogEventPattern}>
                                    <MaterialCommunityIcons name={sportInfo.icon as any} size={90} color="rgba(255,255,255,0.08)" />
                                  </View>
                                  {/* Icône centrale dans un cercle */}
                                  <View style={styles.catalogEventIconCircle}>
                                    <MaterialCommunityIcons name={sportInfo.icon as any} size={28} color="#FFFFFF" />
                                  </View>
                                  {/* Date Badge */}
                                  <View style={[styles.catalogEventDateBadge, { backgroundColor: colors.background + 'EE' }]}>
                                    <Text style={[styles.catalogEventDateDay, { color: categoryColor }]}>
                                      {eventDate.getDate()}
                                    </Text>
                                    <Text style={[styles.catalogEventDateMonth, { color: colors.textSecondary }]}>
                                      {eventDate.toLocaleDateString(locale, { month: 'short' }).toUpperCase()}
                                    </Text>
                                  </View>
                                  {/* Save Button */}
                                  <TouchableOpacity
                                    style={[styles.catalogEventSaveBtn, { backgroundColor: isSaved ? '#10B981' : categoryColor }]}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      toggleExternalEventInSaved(event);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    {isSaved ? (
                                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                                    ) : (
                                      <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                                    )}
                                  </TouchableOpacity>
                                </View>

                                {/* Event Info */}
                                <View style={styles.catalogEventInfo}>
                                  <Text style={[styles.catalogEventTitleNew, { color: colors.textPrimary }]} numberOfLines={2}>
                                    {event.title}
                                  </Text>
                                  <View style={styles.catalogEventLocationRow}>
                                    <MapPin size={12} color={colors.textMuted} />
                                    <Text style={[styles.catalogEventLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                                      {city}{country ? `, ${country}` : ''}
                                    </Text>
                                  </View>
                                  {event.registration_link && (
                                    <View style={[styles.catalogEventLinkBadge, { backgroundColor: categoryColor + '15' }]}>
                                      <ExternalLink size={10} color={categoryColor} />
                                      <Text style={[styles.catalogEventLinkText, { color: categoryColor }]}>
                                        Inscription
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* See More Button - Affiche si plus de 2 événements */}
                        {events.length > 2 && (
                          <TouchableOpacity
                            style={[styles.catalogSeeMoreBtnNew, { backgroundColor: sportInfo.color + '15', borderColor: sportInfo.color + '30' }]}
                            onPress={() => {
                              impactAsync(ImpactFeedbackStyle.Light);
                              setCatalogSportFilter(sportTag);
                            }}
                          >
                            <Text style={[styles.catalogSeeMoreTextNew, { color: sportInfo.color }]}>
                              Voir les {events.length - 2} autres
                            </Text>
                            <ChevronRight size={18} color={sportInfo.color} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}

                {filteredCatalogEvents.length > 2500 && (
                  <Text style={[styles.catalogMoreText, { color: colors.textMuted }]}>
                    + {filteredCatalogEvents.length - 2500} autres evenements...
                  </Text>
                )}
              </>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bouton flottant "+" pour ajouter un RDV */}
          {eventsTabMode === 'my_events' && savedExternalEvents.length > 0 && (
            <TouchableOpacity
              style={[styles.floatingAddButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push('/add-competition')}
              activeOpacity={0.8}
            >
              <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Pagination Dots - STYLE iOS */}
      <View style={styles.paginationWrapper}>
        <View style={[styles.paginationContainer, {
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        }]}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key, index)}
              activeOpacity={0.7}
              style={[
                styles.dot,
                {
                  backgroundColor: viewMode === tab.key
                    ? (isDark ? '#FFFFFF' : '#000000')
                    : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                  width: 8,
                  height: 8,
                  opacity: viewMode === tab.key ? 1 : 0.5,
                }
              ]}
            />
          ))}
        </View>
      </View>

      {/* MODALS */}
      <DayDetailModal
        visible={showDayModal}
        date={selectedDate}
        sessions={selectedDateWorkouts}
        clubs={clubs}
        onClose={() => setShowDayModal(false)}
        onAddPress={handleOpenAddModal}
        onDeleteSession={handleDeleteSession}
      />

      {/* Modal détail partenaire (Club/Coach) */}
      <PartnerDetailModal
        visible={showPartnerModal}
        partner={selectedPartner}
        onClose={() => {
          setShowPartnerModal(false);
          setSelectedPartner(null);
        }}
      />

      {/* Modal ajout/édition club utilisateur */}
      <AddClubModal
        visible={showAddClubModal}
        editingClub={editingClub}
        onClose={() => {
          setShowAddClubModal(false);
          setEditingClub(null);
        }}
        onSave={() => {
          setShowAddClubModal(false);
          setEditingClub(null);
          loadData(); // Rafraîchir les données
        }}
      />

      {/* Tutoriel de découverte */}
      {showTutorial && (
        <FeatureDiscoveryModal
          visible={true}
          tutorial={PAGE_TUTORIALS.planning}
          onClose={handleCloseTutorial}
          onSkip={handleLaterTutorial}
        />
      )}

      {/* Rating Popup */}
      <RatingPopup
        visible={showRatingPopup}
        onClose={handleRatingClose}
        onRated={handleRated}
        actionType="session"
      />

      <PopupComponent />

      {/* Bouton outils flottant */}
      <HomeToolsMenu />
      </View>
    </ErrorBoundary>
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
    paddingHorizontal: SPACING.sm,
    paddingBottom: 120,
  },

  // HEADER
  header: {
    paddingHorizontal: SPACING.sm,
    paddingTop: 2,
    paddingBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#888888',
    marginTop: 0,
    marginBottom: 0,
  },

  // Horizontal scroll
  horizontalScroll: {
    flex: 1,
    marginTop: 0,
    paddingTop: 0, // Pas de padding top
  },
  page: {
    width: SCREEN_WIDTH,
    paddingTop: 0,
  },

  // TOGGLE
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    padding: SPACING.xs,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    // backgroundColor et borderColor définis dynamiquement
  },
  // Nouveaux styles pour les onglets (comme Stats)
  tabItemWrapper: {
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 2,
    minWidth: 68,
  },
  tabIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelSub: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 0,
    lineHeight: 12,
  },

  // Toggle scroll pour 4 onglets - Style moderne (OLD - kept for compatibility)
  toggleScroll: {
    marginBottom: 8,
    marginTop: 0,
    height: 88, // Hauteur fixe pour les tabs (52px icône + 16px label + 20px padding)
  },
  toggleScrollContent: {
    paddingHorizontal: SPACING.sm,
    gap: 8,
    alignItems: 'center',
  },

  // Header avec tabs circulaires
  tabsHeader: {
    paddingTop: 60,
    paddingBottom: 8,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingLeft: IS_SMALL_SCREEN ? 8 : 16,
    paddingRight: IS_SMALL_SCREEN ? 40 : 80,
    gap: IS_SMALL_SCREEN ? 6 : 12,
    alignItems: 'flex-start',
  },
  tabsContentCentered: {
    paddingLeft: IS_SMALL_SCREEN ? 8 : 16,
    paddingRight: IS_SMALL_SCREEN ? 8 : 16,
    justifyContent: 'center',
    flexGrow: 1,
  },
  tabWrapper: {
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 2 : 4,
  },
  circleTab: {
    width: IS_SMALL_SCREEN ? 38 : 44,
    height: IS_SMALL_SCREEN ? 38 : 44,
    borderRadius: IS_SMALL_SCREEN ? 19 : 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabTitle: {
    fontSize: IS_SMALL_SCREEN ? 8 : 9,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: IS_SMALL_SCREEN ? 50 : undefined,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pageDescription: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  // CALENDAR HEADER
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  calendarTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },

  // MONTHLY STATS - COMPACT
  monthlyStatsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: 4,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  monthlyStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 6,
  },
  monthlyStatsTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  monthlyStatsScroll: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.lg,
    gap: SPACING.md,
  },
  monthlyStatItem: {
    alignItems: 'center',
    marginRight: SPACING.xs,
    width: 75,
  },
  monthlyStatIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  clubLogoSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  clubColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  monthlyStatCount: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  monthlyStatName: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // CALENDAR CARD - Utilise le thème, pas de fond noir
  calendarCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    // backgroundColor et borderColor définis dynamiquement dans le JSX
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 0.68,  // Ratio réduit pour moins d'espace vertical
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 5,
    padding: 2,
  },
  calendarDayOther: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,  // Réduit pour laisser encore plus de place aux logos
    fontWeight: TYPOGRAPHY.weight.bold,  // Plus bold
    color: COLORS.text,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Club logos in calendar
  clubLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  clubLogoMini: {
    width: 18,  // Encore plus grand
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
  },
  clubLogoMiniImage: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  clubColorMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  moreWorkouts: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  emptyIndicator: {
    marginTop: 2,
    opacity: 0.3,
  },

  // LEGEND
  legendCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: SPACING.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotMulti: {
    flexDirection: 'row',
    gap: 2,
  },
  legendDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#555555',
    marginBottom: SPACING.xs,
    marginTop: 0,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },

  // OUTDOOR CARD
  outdoorCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  outdoorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  outdoorIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outdoorInfo: {
    flex: 1,
  },
  outdoorTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: 2,
  },
  outdoorSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
  },
  outdoorStats: {
    alignItems: 'center',
  },
  outdoorStatValue: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  outdoorStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
  },
  outdoorTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  outdoorTotalLabel: {
    fontSize: TYPOGRAPHY.size.xs,
  },
  outdoorTotalValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // CLUBS GRID
  clubsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  clubCard: {
    width: (SCREEN_WIDTH - SPACING.sm * 2 - SPACING.sm) / 2,
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xxl,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    position: 'relative',
  },
  clubCardActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  clubActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubLogoBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  clubLogoLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  clubColorLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  clubName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  clubSport: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  clubStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  clubStatsValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  clubStatsLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },

  // Club Goal Progress (Objectifs hebdomadaires)
  clubGoalSection: {
    marginTop: SPACING.xs,
  },
  clubGoalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 4,
  },
  clubGoalValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  clubGoalLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    marginLeft: 2,
  },
  clubGoalBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  clubGoalFill: {
    height: '100%',
    borderRadius: 2,
  },

  // EMPTY CLUBS
  emptyClubsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  emptyClubsTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyClubsText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  addClubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  addClubButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
  addClubButtonFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xxl,
    marginTop: SPACING.lg,
  },
  addClubButtonFixedText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },

  // ÉVÉNEMENTS / COMPÉTITIONS
  eventCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    flex: 1,
  },
  eventIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventIconText: {
    fontSize: 22,
  },
  eventCardInfo: {
    flex: 1,
  },
  eventCardName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: 6,
    lineHeight: 20,
  },
  eventCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  eventCardDate: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  eventCardLocation: {
    fontSize: TYPOGRAPHY.size.xs,
    flex: 1,
  },
  eventCountdownBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    minWidth: 56,
    alignItems: 'center',
  },
  eventCountdownText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  eventWeightBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  eventWeightText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  eventCardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  eventAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  eventActionText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // TOTAL STATS
  totalStatsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  totalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatValue: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  totalStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  totalStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1A1A1A',
  },

  // PROGRAMME VIEW STYLES
  programmeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  editProgrammeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  editProgrammeBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  programmeDay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  programmeDayLeft: {
    width: 50,
    marginRight: SPACING.md,
  },
  programmeDayName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  programmeDayCenter: {
    flex: 1,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  restText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  programmeClubs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  programmeClubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  programmeClubLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  programmeClubDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  programmeClubName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  noSessionText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  weeklyStatsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  weeklyStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyStatValue: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  weeklyStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  weeklyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1A1A1A',
  },

  // Calendriers officiels
  officialCalendars: {
    gap: SPACING.md,
  },
  officialCalendarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderLeftWidth: 4,
    gap: SPACING.md,
  },
  officialCalendarInfo: {
    flex: 1,
  },
  officialCalendarName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  officialCalendarDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 2,
  },

  // Filtre catégorie
  categoryFilterContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingRight: SPACING.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 2,
  },
  categoryChipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Filtre sports spécifiques
  sportFilterContainer: {
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    paddingRight: SPACING.lg,
  },
  sportChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  sportChipText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Groupement par catégorie
  categoryGroup: {
    marginBottom: SPACING.lg,
  },
  categoryGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
  },
  categoryGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  categoryGroupName: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: 0.3,
  },
  categoryGroupCount: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    marginTop: 2,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: SPACING.sm,
  },
  seeMoreText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // ============================================
  // CARNET D'ENTRAÎNEMENT
  // ============================================
  journalIntroCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  journalIntroTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginTop: SPACING.sm,
  },
  journalIntroText: {
    fontSize: TYPOGRAPHY.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  journalOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  journalOpenButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
  journalFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  journalFeatureCard: {
    flex: 1,
    minWidth: '47%',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  journalFeatureIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  journalFeatureTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  journalFeatureText: {
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 16,
  },

  // ============================================
  // EVENTS TAB - SEGMENTED CONTROL & CATALOG
  // ============================================
  eventsSegmentControl: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  eventsSegmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  eventsSegmentText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Catalog styles
  catalogSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  catalogFiltersRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  catalogFilterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  catalogFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Nouveau système de filtres
  searchAndFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  searchBarCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filtersPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filtersPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  filtersPanelTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  filtersPanelContent: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: '30%',
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filtersPanelFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterResetButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  catalogResultsCount: {
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  catalogEmptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  catalogEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  catalogEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  catalogEventCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  catalogEventLeft: {
    flex: 1,
    gap: 4,
  },
  catalogEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogEventDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  catalogCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catalogCategoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catalogEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  catalogLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catalogLocationText: {
    fontSize: 12,
    flex: 1,
  },
  catalogLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  catalogLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  catalogAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  catalogMoreText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },

  // ============================================
  // NOUVEAU DESIGN CATALOGUE - GROUPÉ PAR SPORT
  // ============================================
  catalogSportSection: {
    marginBottom: 24,
  },
  catalogSportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderRadius: 12,
    gap: 12,
  },
  catalogSportIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogSportHeaderText: {
    flex: 1,
  },
  catalogSportTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  catalogSportCount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  catalogEventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catalogEventCardNew: {
    width: (SCREEN_WIDTH - SPACING.sm * 2 - 10) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  catalogEventImageContainer: {
    position: 'relative',
    height: 100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogEventPattern: {
    position: 'absolute',
    right: -25,
    bottom: -25,
    opacity: 1,
  },
  catalogEventIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  catalogEventImage: {
    width: '100%',
    height: '100%',
  },
  catalogEventImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogEventDateBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  catalogEventDateDay: {
    fontSize: 16,
    fontWeight: '800',
  },
  catalogEventDateMonth: {
    fontSize: 9,
    fontWeight: '600',
  },
  catalogEventSaveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogEventInfo: {
    padding: 10,
    gap: 4,
  },
  catalogEventTitleNew: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  catalogEventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catalogEventLocationText: {
    fontSize: 11,
    flex: 1,
  },
  catalogEventLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  catalogEventLinkText: {
    fontSize: 10,
    fontWeight: '600',
  },
  catalogSeeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 6,
  },
  catalogSeeMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ============================================
  // NOUVEAU HEADER SPORT - Design épuré sans barre
  // ============================================
  catalogSportHeaderNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    gap: 12,
  },
  catalogSportIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogSportTitleNew: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  catalogSportCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catalogSportCountText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ============================================
  // NOUVEAU BOUTON VOIR PLUS
  // ============================================
  catalogSeeMoreBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 12,
    gap: 8,
  },
  catalogSeeMoreTextNew: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ============================================
  // NOUVEAU MODAL FILTRES - Design Premium
  // ============================================
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  filterModalPanel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  filterModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalContent: {
    padding: 20,
  },
  filterModalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  filterLocationGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  filterLocationCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  filterLocationEmoji: {
    fontSize: 24,
  },
  filterLocationLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterCategoryCard: {
    width: '31%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  filterCategoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCategoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterCategoryCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  filterResetBtnNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  filterResetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterApplyBtnNew: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    gap: 8,
  },
  filterApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Sport Header
  sportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderRadius: 12,
    gap: 12,
  },
  sportIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sportLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ============================================
  // NOUVEAU DESIGN MES RDV - CARTES AVEC IMAGES
  // ============================================
  savedEventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  savedEventCardNew: {
    width: (SCREEN_WIDTH - SPACING.sm * 2 - 10) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  savedEventImageContainer: {
    position: 'relative',
    height: 90,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedEventGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  savedEventPattern: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 1,
  },
  savedEventIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  savedEventImage: {
    width: '100%',
    height: '100%',
  },
  savedEventImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedEventCountdownBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savedEventCountdownText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  savedEventDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedEventInfoNew: {
    padding: 10,
    gap: 4,
  },
  savedEventDateBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  savedEventDateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  savedEventTitleNew: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  savedEventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  savedEventLocationText: {
    fontSize: 11,
    flex: 1,
  },

  // Ancien design Saved Events (gardé pour compatibilité)
  savedEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  savedEventLeft: {
    alignItems: 'center',
  },
  savedEventDateBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedEventDay: {
    fontSize: 18,
    fontWeight: '700',
  },
  savedEventMonth: {
    fontSize: 10,
    fontWeight: '600',
  },
  savedEventCenter: {
    flex: 1,
    gap: 4,
  },
  savedEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  savedEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedEventLocation: {
    fontSize: 12,
    flex: 1,
  },
  savedEventTagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  savedEventTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savedEventTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  savedEventActions: {
    flexDirection: 'column',
    gap: 8,
  },
  savedEventActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty RDV state
  emptyRdvCard: {
    marginTop: 40,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyRdvIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyRdvTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyRdvText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyRdvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  emptyRdvButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyRdvButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
  },
  emptyRdvButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Floating add button
  floatingAddButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Journal/Carnet styles
  journalStatsContainer: {
    padding: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  journalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  journalStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  journalStatValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  journalStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  journalStatDivider: {
    width: 1,
    height: 40,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyJournalCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyJournalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyJournalText: {
    fontSize: 14,
    textAlign: 'center',
  },
  techniquesListPreview: {
    gap: 10,
  },
  techniquePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  techniqueIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueInfo: {
    flex: 1,
  },
  techniqueName: {
    fontSize: 15,
    fontWeight: '600',
  },
  techniqueCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  masteryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  masteryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  openJournalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    marginTop: 24,
    gap: 10,
  },
  openJournalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
    borderWidth: 2,
  },
  quickLogButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Pagination Dots
  paginationWrapper: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dot: {
    borderRadius: 4,
  },
});
