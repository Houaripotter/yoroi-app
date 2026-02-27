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
  Alert,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { useCustomPopup } from '@/components/CustomPopup';
import { useI18n } from '@/lib/I18nContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  Plus,
  Calendar,
  Dumbbell,
  ChevronRight,
  TrendingUp,
  Trophy,
  MapPin,
  ExternalLink,
  Search,
  Check,
  Globe,
  X,
  Trash2,
  Sun,
  Filter,
  Edit3,
  Clock,
  Star,
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
import { DayDetailModal } from '@/components/calendar';
import { getClubLogoSource, getSportById, getSportIcon as getSportIconLib, getSportColor, getSportName } from '@/lib/sports';
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

// ============================================
// PLANNING SCREEN - SWIPEABLE VIEWS
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375; // iPhone SE, petits téléphones
const DAYS_FR = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

type ViewMode = 'calendar' | 'clubs' | 'competitions';

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

// AsyncStorage keys
const SAVED_EVENTS_KEY = 'my_saved_events';
const FAVORITE_SPORTS_KEY = '@yoroi_favorite_sports';

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, screenBackground } = useTheme();
  const { t, locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar'); // Calendrier en premier
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

  // Modal sessions par club/sport
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessionsFilter, setSessionsFilter] = useState<{ id: string | number; name: string; logoUri?: string; color?: string; icon?: string; isSportOnly?: boolean } | null>(null);

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
        timer = setTimeout(() => setShowTutorial(true), 1000) as unknown as NodeJS.Timeout;
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
  const [favoriteSports, setFavoriteSports] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());


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
  const hasNavigatedAway = useRef(false);
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
    } catch (error) {
      logger.error('Erreur chargement planning:', error);
    }
  }, []);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => {
    loadData();
    loadSavedExternalEvents();
  }, []);

  // Recharger quand on revient d'un ajout/edition (sync calendrier + emploi du temps)
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (hasNavigatedAway.current) {
        hasNavigatedAway.current = false;
        loadData();
      }
    });
    return unsubscribe;
  }, [navigation, loadData]);

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

  // Load events + favorite sports on mount
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const [events, favStr] = await Promise.all([
          getFilteredEvents({ upcomingOnly: true, limit: 500 }),
          AsyncStorage.getItem(FAVORITE_SPORTS_KEY),
        ]);
        if (!cancelled) {
          setAllCatalogEvents(events as SportEvent[]);
          if (favStr) {
            try { setFavoriteSports(new Set(JSON.parse(favStr))); } catch {}
          }
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

  // Toggle favorite sport
  const toggleFavoriteSport = useCallback(async (sportTag: string) => {
    setFavoriteSports(prev => {
      const next = new Set(prev);
      if (next.has(sportTag)) {
        next.delete(sportTag);
      } else {
        next.add(sportTag);
      }
      AsyncStorage.setItem(FAVORITE_SPORTS_KEY, JSON.stringify([...next]));
      return next;
    });
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

    // Ordre par défaut des sports
    const defaultOrder = ['jjb', 'running', 'hyrox', 'trail', 'judo', 'grappling', 'marathon', 'crossfit', 'triathlon', 'obstacle', 'cycling', 'powerlifting', 'climbing'];
    // Trier: favoris d'abord, puis ordre par défaut, puis le reste
    const sortedSports = Object.keys(groups).sort((a, b) => {
      const aFav = favoriteSports.has(a) ? 1 : 0;
      const bFav = favoriteSports.has(b) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      const aIdx = defaultOrder.indexOf(a);
      const bIdx = defaultOrder.indexOf(b);
      const aOrder = aIdx >= 0 ? aIdx : 999;
      const bOrder = bIdx >= 0 ? bIdx : 999;
      return aOrder - bOrder;
    });

    return { groups, sortedSports };
  }, [filteredCatalogEvents, favoriteSports]);

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
    const stats: Record<number | string, { count: number; club: Club | { id: string; name: string; sport: string; color: string; isOutdoor?: true; isSportOnly?: true; icon?: string } }> = {};
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
        } else {
          // Sports sans club - grouper par sport
          const sport = w.sport || 'autre';
          const key = `sport_${sport}`;
          if (!stats[key]) {
            stats[key] = {
              count: 0,
              club: {
                id: key,
                name: getSportName(sport),
                sport,
                color: getSportColor(sport),
                isSportOnly: true,
                icon: getSportIconLib(sport),
              }
            };
          }
          stats[key].count++;
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
      .slice(0, 8);
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
    hasNavigatedAway.current = true;

    setShowDayModal(false);
    // Naviguer vers add-training avec la date sélectionnée
    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setTimeout(() => {
      router.push(`/add-training?date=${dateStr}`);
      // Reset après navigation
      setTimeout(() => setIsNavigatingToAdd(false), 1000);
    }, 300);
  };

  // Handler: editer une seance
  const handleEditSession = (session: Training) => {
    setShowDayModal(false);
    hasNavigatedAway.current = true;
    const dateStr = session.date || (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setTimeout(() => {
      router.push(`/add-training?date=${dateStr}&editId=${session.id}`);
    }, 300);
  };

  // Handler: clic sur un badge dans "Ce mois"
  const handleBadgePress = (club: any) => {
    if (!club.id) return;
    impactAsync(ImpactFeedbackStyle.Light);
    const isSport = 'isSportOnly' in club && club.isSportOnly;
    setSessionsFilter({
      id: club.id,
      name: club.name,
      logoUri: club.logo_uri,
      color: club.color,
      icon: isSport ? club.icon : undefined,
      isSportOnly: isSport,
    });
    setShowSessionsModal(true);
  };

  // Sessions filtrees pour le modal
  const filteredModalSessions = useMemo(() => {
    if (!sessionsFilter) return [];
    return workouts
      .filter(w => {
        if (!isSameMonth(new Date(w.date), currentMonth)) return false;
        if (sessionsFilter.isSportOnly) {
          // Filtrer par sport sans club
          const sportKey = `sport_${w.sport || 'autre'}`;
          return !w.club_id && sportKey === sessionsFilter.id;
        }
        if (String(sessionsFilter.id) === 'outdoor') return w.is_outdoor;
        return w.club_id === sessionsFilter.id;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessionsFilter, workouts, currentMonth]);

  const filteredTotalDuration = useMemo(() => {
    return filteredModalSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  }, [filteredModalSessions]);

  const formatDurationShort = (min: number): string => {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  };

  // Handler: supprimer une seance (avec corbeille inline pour garantir le fonctionnement)
  const handleDeleteSession = async (id: number) => {
    try {
      // Importer directement la connexion pour bypasser le cache module
      const SQLite = require('expo-sqlite');
      const database = await SQLite.openDatabaseAsync('yoroi.db');

      // Creer la table corbeille si elle n'existe pas
      await database.execAsync(`CREATE TABLE IF NOT EXISTS trash_trainings (id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, club_id INTEGER, sport TEXT, session_type TEXT, date TEXT, start_time TEXT, duration_minutes INTEGER, notes TEXT, muscles TEXT, exercises TEXT, technique_rating INTEGER, is_outdoor INTEGER DEFAULT 0, pente REAL, speed REAL, resistance INTEGER, watts INTEGER, cadence INTEGER, distance REAL, calories INTEGER, intensity INTEGER, rounds INTEGER, round_duration INTEGER, created_at TEXT, deleted_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

      // Lire la seance
      const row = await database.getFirstAsync('SELECT * FROM trainings WHERE id = ?', [id]);

      // Supprimer
      await database.runAsync('DELETE FROM trainings WHERE id = ?', [id]);

      // Mettre en corbeille
      if (row) {
        try {
          await database.runAsync(
            `INSERT INTO trash_trainings (original_id, club_id, sport, session_type, date, start_time, duration_minutes, notes, muscles, exercises, technique_rating, is_outdoor, distance, calories, intensity, rounds, round_duration, pente, speed, resistance, watts, cadence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [row.id, row.club_id || null, row.sport || null, row.session_type || null, row.date, row.start_time || null, row.duration_minutes || null, row.notes || null, row.muscles || null, row.exercises || null, row.technique_rating || null, row.is_outdoor || 0, row.distance || null, row.calories || null, row.intensity || null, row.rounds || null, row.round_duration || null, row.pente || null, row.speed || null, row.resistance || null, row.watts || null, row.cadence || null, row.created_at || null]
          );
        } catch (trashErr) {
          logger.error('Erreur corbeille insert:', trashErr);
        }
      }

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
    hasNavigatedAway.current = true;

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
      <View style={[styles.container, { backgroundColor: screenBackground }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={screenBackground} />

      {/* Header avec tabs circulaires - zIndex élevé pour rester visible */}
      <View style={[styles.tabsHeader, { backgroundColor: screenBackground, zIndex: 100, elevation: 10 }]}>
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
          {/* Bouton Corbeille */}
          <TouchableOpacity
            style={styles.tabWrapper}
            onPress={() => router.push('/trash' as any)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.circleTab,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}>
              <Trash2
                size={18}
                color={colors.textMuted}
                strokeWidth={2.5}
              />
            </View>
            <Text style={[styles.tabTitle, { color: colors.textMuted }]}>
              Corbeille
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Description de la page active (masquée pour events car header card) */}
        {viewMode !== 'competitions' && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>
              {tabs.find(t => t.key === viewMode)?.description || ''}
            </Text>
          </View>
        )}
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
        {/* Page Calendrier (avec clubs + emploi du temps intégrés) */}
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
                    const isSport = 'isSportOnly' in club && club.isSportOnly;
                    const display = (isOutdoor || isSport) ? null : getClubDisplay(club as Club);
                    return (
                      <TouchableOpacity
                        key={club.id}
                        style={styles.monthlyStatItem}
                        onPress={() => handleBadgePress(club)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.monthlyStatIcon, {
                          backgroundColor: isOutdoor ? '#22C55E20'
                            : isSport ? `${club.color}20`
                            : (display?.type === 'color' ? `${display.color}20` : colors.backgroundElevated)
                        }]}>
                          {isOutdoor ? (
                            <Sun size={24} color="#22C55E" strokeWidth={2} />
                          ) : isSport && 'icon' in club ? (
                            <MaterialCommunityIcons
                              name={(club as any).icon as any}
                              size={24}
                              color={club.color}
                            />
                          ) : display?.type === 'image' ? (
                            <Image source={display.source} style={styles.clubLogoSmall} />
                          ) : (
                            <View style={[styles.clubColorDot, { backgroundColor: display?.color || colors.accent }]} />
                          )}
                        </View>
                        <Text style={[styles.monthlyStatCount, { color: club.color || colors.accent }]}>x{count}</Text>
                        <Text style={[styles.monthlyStatName, { color: colors.textSecondary }]} numberOfLines={2}>{club.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* CALENDRIER AMÉLIORÉ */}
            <EnhancedCalendarView
              currentMonth={currentMonth}
              workouts={workouts}
              clubs={clubs}
              onMonthChange={setCurrentMonth}
              onDayPress={handleDayPress}
              selectedDate={selectedDate}
            />

            {/* EMPLOI DU TEMPS DE LA SEMAINE (intégré) */}
            <View style={{ marginTop: 8 }}>
              <TimetableView
                onAddSession={handleAddSessionFromProgramme}
                onSessionPress={handleSessionPress}
                refreshTrigger={refreshTrigger}
                workouts={workouts}
                clubs={clubs}
              />
            </View>

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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('planning.clubs')}</Text>

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
            {/* Header Card - même couleur que la tabbar */}
            <View style={[styles.eventsHeaderCard, { backgroundColor: colors.accent }]}>
              <View style={styles.eventsRegionRow}>
                {([
                  { key: 'france', label: 'France' },
                  { key: 'europe', label: 'Europe' },
                  { key: 'monde', label: 'Monde' },
                ] as const).map((region) => (
                  <TouchableOpacity
                    key={region.key}
                    style={styles.eventsRegionTab}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setCatalogLocationFilter(region.key);
                      if (eventsTabMode === 'my_events') setEventsTabMode('catalog');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.eventsRegionTabText,
                      { color: catalogLocationFilter === region.key ? '#FFFFFF' : 'rgba(255,255,255,0.5)' },
                      catalogLocationFilter === region.key && styles.eventsRegionTabTextActive,
                    ]}>
                      {region.label}
                    </Text>
                    {catalogLocationFilter === region.key && (
                      <View style={[styles.eventsRegionUnderline, { backgroundColor: '#FFFFFF' }]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.eventsHeaderSep, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
              <View style={styles.eventsSubRow}>
                <View style={[styles.eventsMiniToggle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <TouchableOpacity
                    style={[
                      styles.eventsMiniToggleBtn,
                      eventsTabMode === 'my_events' && [styles.eventsMiniToggleBtnActive, { backgroundColor: '#FFFFFF' }],
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setEventsTabMode('my_events');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.eventsMiniToggleText,
                      { color: eventsTabMode === 'my_events' ? colors.accent : 'rgba(255,255,255,0.7)' },
                    ]}>Mes RDV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.eventsMiniToggleBtn,
                      eventsTabMode === 'catalog' && [styles.eventsMiniToggleBtnActive, { backgroundColor: '#FFFFFF' }],
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setEventsTabMode('catalog');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.eventsMiniToggleText,
                      { color: eventsTabMode === 'catalog' ? colors.accent : 'rgba(255,255,255,0.7)' },
                    ]}>Catalogue</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.eventsFilterIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setShowFiltersModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Filter size={18} color="#FFFFFF" />
                  {(catalogCategoryFilter !== 'all' || catalogSportFilter !== 'all') && (
                    <View style={[styles.eventsFilterDot, { backgroundColor: '#FFFFFF' }]} />
                  )}
                </TouchableOpacity>
              </View>
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
                {/* Search Bar */}
                <View style={[styles.eventsSearchBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Search size={16} color={colors.textMuted} />
                  <TextInput
                    style={[styles.eventsSearchInput, { color: colors.textPrimary }]}
                    placeholder="Rechercher un evenement..."
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
                      <View style={[styles.filterModalHeader, { backgroundColor: colors.accent }]}>
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
                            { key: 'france', icon: 'flag' as const, label: 'France', color: '#3B82F6' },
                            { key: 'europe', icon: 'earth' as const, label: 'Europe', color: '#8B5CF6' },
                            { key: 'monde', icon: 'globe-model' as const, label: 'Monde', color: '#10B981' },
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
                              <MaterialCommunityIcons name={loc.icon} size={22} color={catalogLocationFilter === loc.key ? '#FFFFFF' : loc.color} />
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
                          style={[styles.filterApplyBtnNew, { backgroundColor: colors.accent }]}
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
                <View style={styles.eventsResultsRow}>
                  <View style={[styles.eventsResultsBadge, { backgroundColor: colors.accent + '15' }]}>
                    <Text style={[styles.eventsResultsNumber, { color: colors.accent }]}>
                      {filteredCatalogEvents.length}
                    </Text>
                  </View>
                  <Text style={[styles.eventsResultsLabel, { color: colors.textSecondary }]}>
                    evenement{filteredCatalogEvents.length > 1 ? 's' : ''} disponible{filteredCatalogEvents.length > 1 ? 's' : ''}
                  </Text>
                </View>

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
                  <>
                    {/* Back button when sport filter active */}
                    {catalogSportFilter !== 'all' && (
                      <TouchableOpacity
                        style={[styles.eventsBackChip, { backgroundColor: colors.backgroundCard }]}
                        onPress={() => {
                          impactAsync(ImpactFeedbackStyle.Light);
                          setCatalogSportFilter('all');
                          setCatalogSubFilter('all');
                        }}
                        activeOpacity={0.7}
                      >
                        <ChevronRight size={16} color={colors.accent} style={{ transform: [{ rotate: '180deg' }] }} />
                        <Text style={[styles.eventsBackChipText, { color: colors.accent }]}>Tous les sports</Text>
                      </TouchableOpacity>
                    )}

                    {groupedCatalogEvents.sortedSports.map((sportTag, sportIndex) => {
                      const events = groupedCatalogEvents.groups[sportTag];
                      const sport = getSportById(sportTag);
                      const sportInfo = sport ? {
                        label: sport.name,
                        icon: sport.icon,
                        color: sport.color,
                      } : {
                        label: sportTag.charAt(0).toUpperCase() + sportTag.slice(1),
                        icon: 'trophy' as const,
                        color: '#6B7280',
                      };
                      const isExpanded = expandedSports.has(sportTag);
                      const extraEvents = events.slice(6);
                      const isFav = favoriteSports.has(sportTag);

                      return (
                        <View key={sportTag}>
                          {/* Séparateur couleur thème entre sports */}
                          {sportIndex > 0 && (
                            <View style={{
                              height: 4,
                              marginHorizontal: 16,
                              marginBottom: 14,
                              borderRadius: 2,
                              backgroundColor: colors.accent,
                            }} />
                          )}
                          <View style={styles.eventsSportSectionOpen}>
                          {/* Sport Header */}
                          <View style={[styles.eventsSportHeader, { backgroundColor: colors.backgroundCard }]}>
                            <View style={[styles.eventsSportIconCircle, { backgroundColor: sportInfo.color }]}>
                              <MaterialCommunityIcons name={sportInfo.icon as any} size={18} color="#FFFFFF" />
                            </View>
                            <Text style={[styles.eventsSportTitle, { color: colors.textPrimary }]}>
                              {sportInfo.label}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                impactAsync(ImpactFeedbackStyle.Light);
                                toggleFavoriteSport(sportTag);
                              }}
                              activeOpacity={0.6}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Star
                                size={20}
                                color={isFav ? '#F59E0B' : colors.textMuted}
                                fill={isFav ? '#F59E0B' : 'transparent'}
                              />
                            </TouchableOpacity>
                            <View style={[styles.eventsSportCountBadge, { backgroundColor: sportInfo.color + '18' }]}>
                              <Text style={[styles.eventsSportCountText, { color: sportInfo.color }]}>
                                {events.length}
                              </Text>
                            </View>
                          </View>

                          {/* Horizontal scroll of first 6 cards */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.eventsHorizontalScroll}
                          >
                            {events.slice(0, 6).map((event) => {
                              const eventDate = new Date(event.date_start);
                              const isSaved = savedExternalEventIds.has(event.id);
                              const city = event.location?.city || 'Lieu inconnu';
                              const country = event.location?.country || '';

                              return (
                                <TouchableOpacity
                                  key={event.id}
                                  style={[styles.eventsCard, {
                                    backgroundColor: colors.backgroundCard,
                                    shadowColor: isDark ? '#000' : '#00000020',
                                  }]}
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
                                  {/* Sport color banner */}
                                  <View style={[styles.eventsCardBanner, { backgroundColor: sportInfo.color }]}>
                                    {event.image_logo_url && !failedImages.has(event.id) ? (
                                      <Image
                                        source={{ uri: event.image_logo_url }}
                                        style={styles.eventsCardImage}
                                        resizeMode="cover"
                                        onError={() => setFailedImages(prev => new Set(prev).add(event.id))}
                                      />
                                    ) : (
                                      <>
                                        <View style={styles.eventsCardBannerPattern}>
                                          <MaterialCommunityIcons name={sportInfo.icon as any} size={60} color="rgba(255,255,255,0.1)" />
                                        </View>
                                        <View style={styles.eventsCardBannerIcon}>
                                          <MaterialCommunityIcons name={sportInfo.icon as any} size={24} color="#FFFFFF" />
                                        </View>
                                      </>
                                    )}
                                    {/* Date Badge */}
                                    <View style={[styles.eventsCardDateBadge, { backgroundColor: colors.background + 'EE' }]}>
                                      <Text style={[styles.eventsCardDateBadgeDay, { color: sportInfo.color }]}>
                                        {eventDate.getDate()}
                                      </Text>
                                      <Text style={[styles.eventsCardDateBadgeMonth, { color: colors.textSecondary }]}>
                                        {eventDate.toLocaleDateString(locale, { month: 'short' }).toUpperCase()}
                                      </Text>
                                    </View>
                                    {/* Save Button */}
                                    <TouchableOpacity
                                      style={[styles.eventsCardSaveBtn, { backgroundColor: isSaved ? '#10B981' : 'rgba(255,255,255,0.25)' }]}
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

                                  {/* Card info */}
                                  <View style={styles.eventsCardInfo}>
                                    <Text style={[styles.eventsCardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                                      {event.title}
                                    </Text>
                                    <View style={styles.eventsCardLocation}>
                                      <MapPin size={11} color={colors.textMuted} />
                                      <Text style={[styles.eventsCardLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                                        {city}{country ? `, ${country}` : ''}
                                      </Text>
                                    </View>
                                    {event.registration_link && (
                                      <View style={[styles.eventsCardLinkBadge, { backgroundColor: sportInfo.color + '12' }]}>
                                        <ExternalLink size={10} color={sportInfo.color} />
                                        <Text style={[styles.eventsCardLinkText, { color: sportInfo.color }]}>
                                          Inscription
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>

                          {/* Expanded cards grid (vertical, 2 columns) */}
                          {isExpanded && extraEvents.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12, marginTop: 12 }}>
                              {extraEvents.map((event) => {
                                const eventDate = new Date(event.date_start);
                                const isSaved = savedExternalEventIds.has(event.id);
                                const city = event.location?.city || 'Lieu inconnu';
                                const country = event.location?.country || '';

                                return (
                                  <TouchableOpacity
                                    key={event.id}
                                    style={[styles.eventsCard, {
                                      backgroundColor: colors.backgroundCard,
                                      shadowColor: isDark ? '#000' : '#00000020',
                                      width: '47%' as any,
                                    }]}
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
                                    <View style={[styles.eventsCardBanner, { backgroundColor: sportInfo.color }]}>
                                      {event.image_logo_url && !failedImages.has(event.id) ? (
                                        <Image
                                          source={{ uri: event.image_logo_url }}
                                          style={styles.eventsCardImage}
                                          resizeMode="cover"
                                          onError={() => setFailedImages(prev => new Set(prev).add(event.id))}
                                        />
                                      ) : (
                                        <>
                                          <View style={styles.eventsCardBannerPattern}>
                                            <MaterialCommunityIcons name={sportInfo.icon as any} size={60} color="rgba(255,255,255,0.1)" />
                                          </View>
                                          <View style={styles.eventsCardBannerIcon}>
                                            <MaterialCommunityIcons name={sportInfo.icon as any} size={24} color="#FFFFFF" />
                                          </View>
                                        </>
                                      )}
                                      <View style={[styles.eventsCardDateBadge, { backgroundColor: colors.background + 'EE' }]}>
                                        <Text style={[styles.eventsCardDateBadgeDay, { color: sportInfo.color }]}>
                                          {eventDate.getDate()}
                                        </Text>
                                        <Text style={[styles.eventsCardDateBadgeMonth, { color: colors.textSecondary }]}>
                                          {eventDate.toLocaleDateString(locale, { month: 'short' }).toUpperCase()}
                                        </Text>
                                      </View>
                                      <TouchableOpacity
                                        style={[styles.eventsCardSaveBtn, { backgroundColor: isSaved ? '#10B981' : 'rgba(255,255,255,0.25)' }]}
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
                                    <View style={styles.eventsCardInfo}>
                                      <Text style={[styles.eventsCardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                                        {event.title}
                                      </Text>
                                      <View style={styles.eventsCardLocation}>
                                        <MapPin size={11} color={colors.textMuted} />
                                        <Text style={[styles.eventsCardLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                                          {city}{country ? `, ${country}` : ''}
                                        </Text>
                                      </View>
                                      {event.registration_link && (
                                        <View style={[styles.eventsCardLinkBadge, { backgroundColor: sportInfo.color + '12' }]}>
                                          <ExternalLink size={10} color={sportInfo.color} />
                                          <Text style={[styles.eventsCardLinkText, { color: sportInfo.color }]}>
                                            Inscription
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}

                          {/* See More / Collapse Button */}
                          {events.length > 6 && (
                            <TouchableOpacity
                              style={[styles.eventsSeeMoreBtn, { borderColor: sportInfo.color + '40', backgroundColor: colors.backgroundCard }]}
                              onPress={() => {
                                impactAsync(ImpactFeedbackStyle.Light);
                                setExpandedSports(prev => {
                                  const next = new Set(prev);
                                  if (next.has(sportTag)) {
                                    next.delete(sportTag);
                                  } else {
                                    next.add(sportTag);
                                  }
                                  return next;
                                });
                              }}
                            >
                              <Text style={[styles.eventsSeeMoreText, { color: sportInfo.color }]}>
                                {isExpanded ? 'Replier' : `Voir les ${events.length - 6} autres`}
                              </Text>
                              <ChevronRight size={16} color={sportInfo.color} style={{ transform: [{ rotate: isExpanded ? '-90deg' : '90deg' }] }} />
                            </TouchableOpacity>
                          )}
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bouton flottant "+" pour ajouter un RDV */}
          {eventsTabMode === 'my_events' && savedExternalEvents.length > 0 && (
            <TouchableOpacity
              style={[styles.floatingAddButton, { backgroundColor: colors.accent }]}
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
        onEditSession={handleEditSession}
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

      {/* Modal sessions par club/sport */}
      <Modal visible={showSessionsModal} animationType="slide" transparent>
        <View style={sessionsModalStyles.overlay}>
          <View style={[sessionsModalStyles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={[sessionsModalStyles.handle, { backgroundColor: colors.border }]} />
            <View style={sessionsModalStyles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[sessionsModalStyles.title, { color: colors.textPrimary }]}>
                  {sessionsFilter?.name || ''}
                </Text>
                <Text style={[sessionsModalStyles.subtitle, { color: colors.textMuted }]}>
                  {filteredModalSessions.length} seance{filteredModalSessions.length > 1 ? 's' : ''} ce mois
                  {filteredTotalDuration > 0 ? ` - ${formatDurationShort(filteredTotalDuration)}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSessionsModal(false)} style={sessionsModalStyles.closeBtn}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={sessionsModalStyles.list} showsVerticalScrollIndicator={false}>
              {filteredModalSessions.map((session) => {
                const club = session.club_id ? clubs.find(c => c.id === session.club_id) : undefined;
                const sportColor = getSportColor(session.sport || 'autre');
                const sportIcon = getSportIconLib(session.sport || 'autre');
                return (
                  <View
                    key={session.id}
                    style={[sessionsModalStyles.sessionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  >
                    <View style={[sessionsModalStyles.sessionIcon, { backgroundColor: `${sportColor}20` }]}>
                      {club?.logo_uri ? (
                        <Image source={getClubLogoSource(club.logo_uri)} style={{ width: 28, height: 28, borderRadius: 14 }} />
                      ) : (
                        <MaterialCommunityIcons name={sportIcon as any} size={22} color={sportColor} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[sessionsModalStyles.sessionTitle, { color: colors.textPrimary }]}>
                        {club?.name || getSportName(session.sport || 'autre')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Calendar size={12} color={colors.textMuted} />
                        <Text style={[sessionsModalStyles.sessionMeta, { color: colors.textSecondary }]}>
                          {format(new Date(session.date), 'EEEE d MMM', { locale: fr })}
                        </Text>
                        {session.start_time && (
                          <>
                            <Clock size={12} color={colors.textMuted} />
                            <Text style={[sessionsModalStyles.sessionMeta, { color: colors.textSecondary }]}>
                              {session.start_time}
                            </Text>
                          </>
                        )}
                        <Text style={[sessionsModalStyles.sessionMeta, { color: colors.textSecondary }]}>
                          {formatDurationShort(session.duration_minutes || 60)}
                        </Text>
                      </View>
                      {session.notes ? (
                        <Text style={[sessionsModalStyles.sessionNote, { color: colors.textMuted }]} numberOfLines={1}>
                          {session.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowSessionsModal(false);
                          handleEditSession(session);
                        }}
                        hitSlop={8}
                      >
                        <Edit3 size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (!session.id) return;
                          impactAsync(ImpactFeedbackStyle.Medium);
                          const sessionId = session.id;
                          const sessionName = club?.name || getSportName(session.sport || 'autre');
                          Alert.alert(
                            'Supprimer',
                            `${sessionName} - sera deplace dans la corbeille`,
                            [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: async () => {
                                  await handleDeleteSession(sessionId);
                                },
                              },
                            ]
                          );
                        }}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color={colors.error || '#EF4444'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {filteredModalSessions.length === 0 && (
                <Text style={[sessionsModalStyles.emptyText, { color: colors.textMuted }]}>
                  Aucune seance ce mois
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[sessionsModalStyles.closeButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={() => setShowSessionsModal(false)}
            >
              <Text style={[sessionsModalStyles.closeButtonText, { color: colors.textPrimary }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PopupComponent />

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

  // COMPACT CLUBS (top of calendar page)
  compactClubsSection: {
    borderRadius: RADIUS.xl,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  compactClubsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  compactClubsTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  compactClubAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactClubsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  compactClubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  compactClubLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactClubLogoImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  compactClubDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  compactClubName: {
    fontSize: 13,
    fontWeight: '600',
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
    width: 85,
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
  // EVENTS TAB - HEADER CARD + REGION TABS
  // ============================================
  eventsHeaderCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  eventsRegionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  eventsRegionTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  eventsRegionTabTextActive: {
    fontWeight: '800',
  },
  eventsRegionTabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  eventsRegionUnderline: {
    height: 3,
    borderRadius: 2,
    width: '80%',
    marginTop: 4,
  },
  eventsHeaderSep: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  eventsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventsMiniToggle: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  eventsMiniToggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  eventsMiniToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  eventsMiniToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventsFilterIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eventsFilterDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  eventsSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  eventsSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  eventsResultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventsResultsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  eventsResultsNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  eventsResultsLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventsSportSectionOpen: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  eventsSportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 10,
    borderRadius: 14,
  },
  eventsSportIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsSportTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  eventsSportCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventsSportCountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  eventsHorizontalScroll: {
    paddingLeft: 4,
    paddingRight: 16,
    gap: 12,
    paddingBottom: 4,
  },
  eventsCard: {
    width: 200,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  eventsCardBanner: {
    height: 90,
    position: 'relative' as const,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
  },
  eventsCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  eventsCardBannerPattern: {
    position: 'absolute' as const,
    right: -10,
    bottom: -10,
    opacity: 0.15,
  },
  eventsCardBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsCardDateBadge: {
    position: 'absolute' as const,
    bottom: 6,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  eventsCardDateBadgeDay: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
  },
  eventsCardDateBadgeMonth: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventsCardSaveBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsCardInfo: {
    padding: 10,
    gap: 4,
  },
  eventsCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  eventsCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventsCardLocationText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  eventsCardLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  eventsCardLinkText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventsSeeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: 'center',
    marginTop: 10,
  },
  eventsSeeMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventsBackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  eventsBackChipText: {
    fontSize: 13,
    fontWeight: '700',
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
  trashLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  trashLinkText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

const sessionsModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 400,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sessionMeta: {
    fontSize: 12,
  },
  sessionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 14,
  },
  closeButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
