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
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
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
} from 'lucide-react-native';

// Import events catalog data
import eventsData from '@/src/data/events.json';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, addDays, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/design';
import { getTrainings, getClubs, addTraining, deleteTraining, Club, Training, getCompetitions, Competition } from '@/lib/database';
import { getSportIcon } from '@/constants/sportIcons';
import { getProgressionItems, ProgressionItem } from '@/lib/trainingJournalService';
import { getCarnetStats, getSkills, getBenchmarks, Skill, Benchmark } from '@/lib/carnetService';
import { DayDetailModal } from '@/components/calendar';
import { getClubLogoSource } from '@/lib/sports';
import { PartnerDetailModal, Partner } from '@/components/PartnerDetailModal';
import { TimetableView, EnhancedCalendarView, EnhancedAddSessionModal, AddClubModal } from '@/components/planning';
import { getAllGoalsProgress, GoalProgress } from '@/lib/trainingGoalsService';
import { triggerVictoryModal, createCalendarVictoryData } from '@/lib/victoryTrigger';

// ============================================
// PLANNING SCREEN - SWIPEABLE VIEWS
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
  category: 'combat' | 'endurance';
  sport_tag: string;
  registration_link: string;
  federation: string | null;
  image_logo_url: string | null;
  isManual?: boolean;
}

type EventsTabMode = 'my_events' | 'catalog';
type CatalogCategoryFilter = 'all' | 'combat' | 'endurance';
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
  const { showPopup, PopupComponent } = useCustomPopup();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Refs pour le scroll
  const horizontalScrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  // Modals state
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showProgrammeEditModal, setShowProgrammeEditModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSportInCategory, setSelectedSportInCategory] = useState<string>('all');
  const [expandedOrganizers, setExpandedOrganizers] = useState<{ [key: string]: boolean }>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ============================================
  // CATALOG STATE (for "Trouver" feature)
  // ============================================
  const [eventsTabMode, setEventsTabMode] = useState<EventsTabMode>('my_events');
  const [savedExternalEvents, setSavedExternalEvents] = useState<SportEvent[]>([]);
  const [savedExternalEventIds, setSavedExternalEventIds] = useState<Set<string>>(new Set());
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<CatalogCategoryFilter>('all');
  const [catalogLocationFilter, setCatalogLocationFilter] = useState<CatalogLocationFilter>('monde');
  const [catalogLoading, setCatalogLoading] = useState(false);

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
        { id: 'lutte', name: 'Lutte' },
        { id: 'sambo', name: 'Sambo' },
        { id: 'kickboxing', name: 'Kickboxing' },
        { id: 'muay-thai', name: 'Muay Thai' }
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
        { id: 'natation', name: 'Natation' }
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
        { id: 'strongman', name: 'Strongman' }
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
        { id: 'volley', name: 'Volleyball' }
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
      // Garder les 6 dernières techniques/skills (2 lignes de 3)
      const skills = await getSkills();
      setRecentSkills(skills.slice(0, 6));
      // Garder les 6 derniers records/benchmarks (2 lignes de 3)
      const benchmarks = await getBenchmarks();
      // Filter benchmarks that have entries (PRs)
      const benchmarksWithPRs = benchmarks.filter(b => b.entries && b.entries.length > 0);
      setRecentBenchmarks(benchmarksWithPRs.slice(0, 6));
    } catch (error) {
      console.error('Erreur chargement planning:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadSavedExternalEvents();
    }, [loadData])
  );

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
      console.error('Error loading saved external events:', error);
    }
  };

  // Get all events from JSON (typed)
  const allCatalogEvents = useMemo(() => eventsData as SportEvent[], []);

  // Filter catalog events
  const filteredCatalogEvents = useMemo(() => {
    let filtered = allCatalogEvents;

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
  }, [allCatalogEvents, catalogLocationFilter, catalogCategoryFilter, catalogSearchQuery]);

  // Event counts for filters
  const catalogEventCounts = useMemo(() => ({
    all: allCatalogEvents.length,
    combat: allCatalogEvents.filter(e => e.category === 'combat').length,
    endurance: allCatalogEvents.filter(e => e.category === 'endurance').length,
    monde: allCatalogEvents.length,
    europe: allCatalogEvents.filter(e => EUROPEAN_COUNTRIES.includes(e.location.country)).length,
    france: allCatalogEvents.filter(e => e.location.country.toLowerCase() === 'france').length,
  }), [allCatalogEvents]);

  // Add external event to saved list
  const addExternalEventToSaved = useCallback(async (event: SportEvent) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const newSavedEvents = [...savedExternalEvents, event];
      setSavedExternalEvents(newSavedEvents);
      setSavedExternalEventIds(prev => new Set(prev).add(event.id));
      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(newSavedEvents));

      showPopup('Ajoute', `"${event.title.substring(0, 30)}..." ajoute a ton planning`);
    } catch (error) {
      console.error('Error adding external event:', error);
      showPopup('Erreur', 'Impossible d\'ajouter l\'evenement');
    }
  }, [savedExternalEvents, showPopup]);

  // Remove external event from saved list
  const removeExternalEventFromSaved = useCallback(async (eventId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const newSavedEvents = savedExternalEvents.filter(e => e.id !== eventId);
      setSavedExternalEvents(newSavedEvents);
      setSavedExternalEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(newSavedEvents));
    } catch (error) {
      console.error('Error removing external event:', error);
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

  // Open external event link
  const handleOpenExternalEvent = useCallback((link: string) => {
    if (link) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(link);
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

  // Monthly stats by club
  const monthlyClubStats = useMemo(() => {
    const stats: Record<number, { count: number; club: Club }> = {};

    workouts.forEach(w => {
      if (isSameMonth(new Date(w.date), currentMonth) && w.club_id) {
        const club = clubs.find(c => c.id === w.club_id);
        if (club) {
          if (!stats[w.club_id]) {
            stats[w.club_id] = { count: 0, club };
          }
          stats[w.club_id].count++;
        }
      }
    });

    return Object.values(stats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [workouts, currentMonth, clubs]);

  // Handler: clic sur un jour du calendrier
  const handleDayPress = (day: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(day);
    setShowDayModal(true);
  };

  // Handler: ouvrir le modal d'ajout
  const handleOpenAddModal = () => {
    setShowDayModal(false);
    setTimeout(() => {
      setShowAddModal(true);
    }, 300);
  };

  // Handler: sauvegarder une nouvelle seance
  const handleSaveSession = async (session: Omit<Training, 'id' | 'created_at'>) => {
    try {
      await addTraining(session);

      // Petit délai pour s'assurer que la DB est à jour
      await new Promise(resolve => setTimeout(resolve, 300));

      await loadData();

      // Incrémenter le trigger pour rafraîchir le TimetableView
      setRefreshTrigger(prev => prev + 1);

      // Fermer le modal
      setShowAddModal(false);

      // TASK 4: Trigger Victory Modal after saving
      // Map sport to category type
      const sportToCategoryMap: Record<string, 'combat' | 'force' | 'running' | 'trail' | 'hyrox' | 'other'> = {
        jjb: 'combat',
        mma: 'combat',
        boxe: 'combat',
        muay_thai: 'combat',
        judo: 'combat',
        lutte: 'combat',
        karate: 'combat',
        musculation: 'force',
        crossfit: 'force',
        running: 'running',
        trail: 'trail',
        hyrox: 'hyrox',
      };

      const club = clubs.find(c => c.id === session.club_id);
      const sessionName = club?.name || session.sport || 'Entraînement';
      const category = sportToCategoryMap[session.sport] || 'other';

      const victoryData = createCalendarVictoryData(
        sessionName,
        category,
        {
          duration: session.duration || 60,
          performance: session.duration ? `${session.duration} min` : undefined,
        }
      );

      await triggerVictoryModal(victoryData);

      // Navigate to training journal to show the victory modal
      router.push('/training-journal');

    } catch (error) {
      console.error('❌ Erreur ajout seance:', error);
      showPopup('Erreur', "Impossible d'ajouter la seance");
      throw error;
    }
  };

  // Handler: supprimer une seance
  const handleDeleteSession = async (id: number) => {
    try {
      await deleteTraining(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error) {
      console.error('Erreur suppression seance:', error);
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

  // Handler: Toggle repos (à implémenter avec une table dédiée)
  const handleToggleRest = (dayId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implémenter la logique de repos avec une table dédiée
    showPopup('Repos', `Fonction repos pour ${dayId} a implementer`);
  };

  // Handler: Ouvrir une séance depuis la vue programme
  const handleSessionPress = (dayId: string, sessionIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Ouvrir le modal de détail de la séance
    showPopup('Seance', `Ouvrir la seance ${sessionIndex} du ${dayId}`);
  };

  // Handler: Ajouter une séance depuis la vue emploi du temps
  const handleAddSessionFromProgramme = (dayId: string, _timeSlot?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Calculer la prochaine date pour ce jour de la semaine
    const dayIndex = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].indexOf(dayId);
    const nextDate = getNextDateForDayOfWeek(dayIndex);
    setSelectedDate(nextDate);
    setShowAddModal(true);
  };

  // Gérer le clic sur un onglet
  const tabs: { key: ViewMode; label: string; sublabel?: string; icon: any; color: string }[] = [
    { key: 'calendar', label: 'Calendrier', icon: Calendar, color: colors.accent },
    { key: 'programme', label: 'Emploi du Temps', sublabel: 'Sportif', icon: List, color: '#8B5CF6' },
    { key: 'journal', label: 'Carnet', sublabel: 'Entraînement', icon: BookOpen, color: '#EF4444' },
    { key: 'clubs', label: 'Clubs', icon: Dumbbell, color: '#10B981' },
    { key: 'competitions', label: 'Prochains RDV', icon: Trophy, color: '#F59E0B' },
  ];

  const handleTabPress = (tab: ViewMode, index: number) => {
    if (isScrollingRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Reset le flag après un délai
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 100);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Planning</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Swipe pour naviguer</Text>
      </View>

      {/* VIEW MODE TOGGLE - Design moderne comme Stats */}
      <View style={styles.toggleScroll}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toggleScrollContent}
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = viewMode === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItemWrapper}
              onPress={() => handleTabPress(tab.key, index)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.tabIconCircle,
                {
                  backgroundColor: isActive ? tab.color : colors.backgroundCard,
                  borderColor: isActive ? tab.color : colors.border,
                }
              ]}>
                <Icon size={20} color={isActive ? '#FFF' : colors.textMuted} />
              </View>
              <View style={styles.tabLabelContainer}>
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? tab.color : colors.textMuted },
                  isActive && styles.tabLabelActive
                ]}>
                  {tab.label}
                </Text>
                {tab.sublabel && (
                  <Text style={[
                    styles.tabLabelSub,
                    { color: isActive ? tab.color : colors.textMuted }
                  ]}>
                    {tab.sublabel}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
                  <TrendingUp size={16} color={colors.accent} />
                  <Text style={[styles.monthlyStatsTitle, { color: colors.textPrimary }]}>Ce mois</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.monthlyStatsScroll}
                >
                  {monthlyClubStats.map(({ count, club }) => {
                    const display = getClubDisplay(club);
                    return (
                      <View key={club.id} style={styles.monthlyStatItem}>
                        <View style={[styles.monthlyStatIcon, { backgroundColor: display.type === 'color' ? `${display.color}20` : colors.backgroundElevated }]}>
                          {display.type === 'image' ? (
                            <Image source={display.source} style={styles.clubLogoSmall} />
                          ) : (
                            <View style={[styles.clubColorDot, { backgroundColor: display.color }]} />
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
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Carnet d'Entraînement</Text>

            {/* Stats du carnet - Records + Techniques */}
            <View style={[styles.journalStatsContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.journalStatsRow}>
                <View style={styles.journalStatItem}>
                  <Text style={[styles.journalStatValue, { color: '#EF4444' }]}>{journalStats.totalRecords}</Text>
                  <Text style={[styles.journalStatLabel, { color: colors.textMuted }]}>Records</Text>
                </View>
                <View style={[styles.journalStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.journalStatItem}>
                  <Text style={[styles.journalStatValue, { color: colors.accent }]}>{journalStats.total}</Text>
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
              <Text style={[styles.subsectionTitle, { color: colors.textSecondary, marginTop: 0 }]}>Mes Records</Text>
              <TouchableOpacity onPress={() => router.push('/training-journal')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>Voir tout</Text>
                <ChevronRight size={14} color={colors.accent} />
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
                            const month = date.toLocaleDateString('fr-FR', { month: 'short' });
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
              <Text style={[styles.subsectionTitle, { color: colors.textSecondary, marginTop: 0 }]}>Mes Techniques</Text>
              <TouchableOpacity onPress={() => router.push('/training-journal')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>Voir tout</Text>
                <ChevronRight size={14} color={colors.accent} />
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
                            const month = date.toLocaleDateString('fr-FR', { month: 'short' });
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
                                    <Text style={{ color: statusColor, fontSize: 8, fontWeight: '700' }}>
                                      {skill.status === 'mastered' ? '✓' : skill.status === 'in_progress' ? '⟳' : '○'}
                                    </Text>
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
              style={[styles.quickLogButton, { backgroundColor: colors.backgroundCard, borderColor: colors.accent }]}
              onPress={() => router.push('/quick-log')}
              activeOpacity={0.8}
            >
              <Plus size={20} color={colors.accent} />
              <Text style={[styles.quickLogButtonText, { color: colors.accent }]}>Logger une séance</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Mes Clubs</Text>

            {clubs.length === 0 ? (
              <View style={[styles.emptyClubsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Dumbbell size={48} color={colors.textMuted} />
                <Text style={[styles.emptyClubsTitle, { color: colors.textPrimary }]}>Aucun club</Text>
                <Text style={[styles.emptyClubsText, { color: colors.textMuted }]}>Ajoute tes clubs pour planifier tes entrainements</Text>
                <TouchableOpacity
                  style={[styles.addClubButton, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setEditingClub(null);
                    setShowAddClubModal(true);
                  }}
                >
                  <Plus size={18} color={colors.textOnGold} />
                  <Text style={[styles.addClubButtonText, { color: colors.textOnGold }]}>Ajouter un club</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
                    <TouchableOpacity
                      key={club.id}
                      style={[styles.clubCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        // Ouvrir le modal d'edition du club
                        setEditingClub(club);
                        setShowAddClubModal(true);
                      }}
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
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 16 }]}>
                      A L'HORIZON
                    </Text>
                    {savedExternalEvents
                      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
                      .map((event) => {
                        const eventDate = new Date(event.date_start);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        eventDate.setHours(0, 0, 0, 0);
                        const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const urgencyColor = daysLeft <= 7 ? '#EF4444' : daysLeft <= 30 ? '#F59E0B' : '#10B981';
                        const categoryColor = event.category === 'combat' ? '#EF4444' : '#10B981';

                        return (
                          <View
                            key={event.id}
                            style={[styles.savedEventCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                          >
                            <View style={styles.savedEventLeft}>
                              <View style={[styles.savedEventDateBadge, { backgroundColor: categoryColor + '20' }]}>
                                <Text style={[styles.savedEventDay, { color: categoryColor }]}>
                                  {eventDate.getDate()}
                                </Text>
                                <Text style={[styles.savedEventMonth, { color: categoryColor }]}>
                                  {eventDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.savedEventCenter}>
                              <Text style={[styles.savedEventTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                                {event.title}
                              </Text>
                              <View style={styles.savedEventMeta}>
                                <MapPin size={12} color={colors.textSecondary} />
                                <Text style={[styles.savedEventLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                                  {event.location.city}, {event.location.country}
                                </Text>
                              </View>
                              <View style={[styles.savedEventTagRow]}>
                                <View style={[styles.savedEventTag, { backgroundColor: categoryColor + '20' }]}>
                                  <Text style={[styles.savedEventTagText, { color: categoryColor }]}>
                                    {event.sport_tag.toUpperCase()}
                                  </Text>
                                </View>
                                {daysLeft > 0 && (
                                  <View style={[styles.savedEventTag, { backgroundColor: urgencyColor + '20' }]}>
                                    <Text style={[styles.savedEventTagText, { color: urgencyColor }]}>
                                      J-{daysLeft}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            <View style={styles.savedEventActions}>
                              {event.registration_link && (
                                <TouchableOpacity
                                  style={[styles.savedEventActionBtn, { backgroundColor: '#8B5CF620' }]}
                                  onPress={() => handleOpenExternalEvent(event.registration_link)}
                                >
                                  <ExternalLink size={16} color="#8B5CF6" />
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.savedEventActionBtn, { backgroundColor: '#EF444420' }]}
                                onPress={() => removeExternalEventFromSaved(event.id)}
                              >
                                <Trash2 size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                  </>
                ) : (
                  /* État vide */
                  <View style={[styles.emptyRdvCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <View style={[styles.emptyRdvIcon, { backgroundColor: '#F59E0B20' }]}>
                      <Trophy size={40} color="#F59E0B" />
                    </View>
                    <Text style={[styles.emptyRdvTitle, { color: colors.textPrimary }]}>
                      Aucun RDV prevu
                    </Text>
                    <Text style={[styles.emptyRdvText, { color: colors.textMuted }]}>
                      Ajoute ta prochaine course, combat, match ou competition depuis l'onglet "Trouver"
                    </Text>
                    <TouchableOpacity
                      style={[styles.emptyRdvButton, { backgroundColor: '#8B5CF6' }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setEventsTabMode('catalog');
                      }}
                    >
                      <Globe size={18} color="#FFFFFF" />
                      <Text style={styles.emptyRdvButtonText}>Trouver un evenement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.emptyRdvButtonSecondary, { borderColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push('/add-competition');
                      }}
                    >
                      <Plus size={18} color={colors.textPrimary} />
                      <Text style={[styles.emptyRdvButtonSecondaryText, { color: colors.textPrimary }]}>Ajouter manuellement</Text>
                    </TouchableOpacity>
                  </View>
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
                <View style={[styles.catalogSearchContainer, { backgroundColor: colors.backgroundCard }]}>
                  <Search size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.catalogSearchInput, { color: colors.textPrimary }]}
                    placeholder="Rechercher un evenement..."
                    placeholderTextColor={colors.textMuted}
                    value={catalogSearchQuery}
                    onChangeText={setCatalogSearchQuery}
                  />
                  {catalogSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCatalogSearchQuery('')}>
                      <X size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Location Filters */}
                <View style={styles.catalogFiltersRow}>
                  {(['monde', 'europe', 'france'] as CatalogLocationFilter[]).map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      style={[
                        styles.catalogFilterChip,
                        {
                          backgroundColor: catalogLocationFilter === loc ? '#8B5CF6' : colors.backgroundCard,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCatalogLocationFilter(loc);
                      }}
                    >
                      <Text style={[
                        styles.catalogFilterChipText,
                        { color: catalogLocationFilter === loc ? '#FFFFFF' : colors.textPrimary },
                      ]}>
                        {loc === 'monde' ? 'Monde' : loc === 'europe' ? 'Europe' : 'France'} ({catalogEventCounts[loc]})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Category Filters */}
                <View style={styles.catalogFiltersRow}>
                  {(['all', 'combat', 'endurance'] as CatalogCategoryFilter[]).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catalogFilterChip,
                        {
                          backgroundColor: catalogCategoryFilter === cat ? '#8B5CF6' : colors.backgroundCard,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCatalogCategoryFilter(cat);
                      }}
                    >
                      <Text style={[
                        styles.catalogFilterChipText,
                        { color: catalogCategoryFilter === cat ? '#FFFFFF' : colors.textPrimary },
                      ]}>
                        {cat === 'all' ? 'Tous' : cat === 'combat' ? 'Combat' : 'Endurance'} ({catalogEventCounts[cat]})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Results count */}
                <Text style={[styles.catalogResultsCount, { color: colors.textMuted }]}>
                  {filteredCatalogEvents.length} evenement{filteredCatalogEvents.length > 1 ? 's' : ''} trouve{filteredCatalogEvents.length > 1 ? 's' : ''}
                </Text>

                {/* Events List */}
                {filteredCatalogEvents.length === 0 ? (
                  <View style={[styles.catalogEmptyState, { backgroundColor: colors.backgroundCard }]}>
                    <Search size={48} color={colors.textMuted} />
                    <Text style={[styles.catalogEmptyTitle, { color: colors.textPrimary }]}>
                      Aucun evenement trouve
                    </Text>
                    <Text style={[styles.catalogEmptyText, { color: colors.textMuted }]}>
                      Modifiez vos filtres ou votre recherche
                    </Text>
                  </View>
                ) : (
                  filteredCatalogEvents.slice(0, 20).map((event) => {
                    const eventDate = new Date(event.date_start);
                    const formattedDate = eventDate.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const isSaved = savedExternalEventIds.has(event.id);

                    return (
                      <View
                        key={event.id}
                        style={[styles.catalogEventCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                      >
                        <View style={styles.catalogEventLeft}>
                          <View style={styles.catalogEventHeader}>
                            <Text style={[styles.catalogEventDate, { color: colors.textSecondary }]}>
                              {formattedDate}
                            </Text>
                            <View style={[styles.catalogCategoryBadge, { backgroundColor: event.category === 'combat' ? '#EF444420' : '#10B98120' }]}>
                              <Text style={[styles.catalogCategoryText, { color: event.category === 'combat' ? '#EF4444' : '#10B981' }]}>
                                {event.sport_tag.toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.catalogEventTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                            {event.title}
                          </Text>

                          <View style={styles.catalogLocationRow}>
                            <MapPin size={14} color={colors.textSecondary} />
                            <Text style={[styles.catalogLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
                              {event.location.city}, {event.location.country}
                            </Text>
                          </View>

                          {event.registration_link && (
                            <TouchableOpacity
                              style={styles.catalogLinkRow}
                              onPress={() => handleOpenExternalEvent(event.registration_link)}
                              activeOpacity={0.7}
                            >
                              <ExternalLink size={12} color="#8B5CF6" />
                              <Text style={[styles.catalogLinkText, { color: '#8B5CF6' }]}>
                                Inscription
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.catalogAddButton,
                            { backgroundColor: isSaved ? '#10B981' : '#8B5CF6' },
                          ]}
                          onPress={() => toggleExternalEventInSaved(event)}
                          activeOpacity={0.7}
                        >
                          {isSaved ? (
                            <Check size={20} color="#FFFFFF" strokeWidth={3} />
                          ) : (
                            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}

                {filteredCatalogEvents.length > 20 && (
                  <Text style={[styles.catalogMoreText, { color: colors.textMuted }]}>
                    + {filteredCatalogEvents.length - 20} autres evenements...
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

      <EnhancedAddSessionModal
        visible={showAddModal}
        date={selectedDate}
        clubs={clubs}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveSession}
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

      <PopupComponent />
    </View>
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

  // Toggle scroll pour 4 onglets - Style moderne
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

  // Saved Events Card styles
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
});
