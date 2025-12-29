import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Alert,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
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
} from 'lucide-react-native';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, addDays, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/design';
import { getTrainings, getClubs, addTraining, deleteTraining, Club, Training, getCompetitions, Competition } from '@/lib/database';
import { getSportIcon } from '@/constants/sportIcons';
import { DayDetailModal } from '@/components/calendar';
import { getClubLogoSource } from '@/lib/sports';
import { PartnerDetailModal, Partner } from '@/components/PartnerDetailModal';
import { TimetableView, EnhancedCalendarView, EnhancedAddSessionModal } from '@/components/planning';

// ============================================
// PLANNING SCREEN - SWIPEABLE VIEWS
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS_FR = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

type ViewMode = 'calendar' | 'programme' | 'clubs' | 'competitions' | 'journal';

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
      console.log('📥 Chargement des données...');
      const [trainingsData, clubsData, competitionsData] = await Promise.all([
        getTrainings(),
        getClubs(),
        getCompetitions ? getCompetitions() : Promise.resolve([]),
      ]);
      console.log('📥 Trainings chargés:', trainingsData.length);
      console.log('📥 Clubs chargés:', clubsData.length, '-', clubsData.map(c => c.name).join(', '));
      console.log('📥 Compétitions chargées:', competitionsData.length);
      setWorkouts(trainingsData);
      setClubs(clubsData);
      setCompetitions(competitionsData);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
      console.log('💾 Ajout de la séance...', session);
      await addTraining(session);
      console.log('✅ Séance ajoutée en DB');

      // Petit délai pour s'assurer que la DB est à jour
      await new Promise(resolve => setTimeout(resolve, 300));

      await loadData();
      console.log('✅ Données rechargées');
      console.log('📊 Nombre de workouts après reload:', workouts.length);

      // Incrémenter le trigger pour rafraîchir le TimetableView
      setRefreshTrigger(prev => {
        const newVal = prev + 1;
        console.log('✅ Refresh trigger incrémenté:', newVal);
        return newVal;
      });

      // Fermer le modal
      setShowAddModal(false);
      console.log('✅ Modal fermé');
    } catch (error) {
      console.error('❌ Erreur ajout seance:', error);
      Alert.alert('Erreur', "Impossible d'ajouter la seance");
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
      Alert.alert('Erreur', 'Impossible de supprimer la seance');
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
    Alert.alert('Repos', `Fonction repos pour ${dayId} à implémenter`);
  };

  // Handler: Ouvrir une séance depuis la vue programme
  const handleSessionPress = (dayId: string, sessionIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Ouvrir le modal de détail de la séance
    Alert.alert('Séance', `Ouvrir la séance ${sessionIndex} du ${dayId}`);
  };

  // Handler: Ajouter une séance depuis la vue emploi du temps
  const handleAddSessionFromProgramme = (dayId: string, timeSlot?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('🔥 handleAddSessionFromProgramme appelé', { dayId, timeSlot });
    console.log('🔥 Nombre de clubs:', clubs.length);
    console.log('🔥 Liste clubs:', clubs.map(c => c.name).join(', '));
    // Calculer la prochaine date pour ce jour de la semaine
    const dayIndex = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].indexOf(dayId);
    const nextDate = getNextDateForDayOfWeek(dayIndex);
    setSelectedDate(nextDate);
    console.log('🔥 Date sélectionnée:', nextDate);
    // TODO: Pré-remplir l'heure selon le timeSlot (morning, afternoon, evening)
    setShowAddModal(true);
    console.log('🔥 Modal ouvert');
  };

  // Gérer le clic sur un onglet
  const tabs: { key: ViewMode; label: string; sublabel?: string; icon: any; color: string }[] = [
    { key: 'calendar', label: 'Calendrier', icon: Calendar, color: colors.accent },
    { key: 'programme', label: 'Emploi du Temps', sublabel: 'Sportif', icon: List, color: '#8B5CF6' },
    { key: 'journal', label: 'Carnet', sublabel: 'Entraînement', icon: BookOpen, color: '#EF4444' },
    { key: 'clubs', label: 'Clubs', icon: Dumbbell, color: '#10B981' },
    { key: 'competitions', label: 'Événements', icon: Trophy, color: '#F59E0B' },
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthlyStatsScroll}>
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
                        <Text style={[styles.monthlyStatCount, { color: club.color || colors.accent }]}>{count}</Text>
                        <Text style={[styles.monthlyStatName, { color: colors.textSecondary }]} numberOfLines={1}>{club.name}</Text>
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

        {/* Page Carnet d'Entraînement */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Carnet d'Entraînement</Text>

            <View style={[styles.journalIntroCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <BookOpen size={48} color="#EF4444" />
              <Text style={[styles.journalIntroTitle, { color: colors.textPrimary }]}>
                Suivi de Progression
              </Text>
              <Text style={[styles.journalIntroText, { color: colors.textMuted }]}>
                Gère tes objectifs, suis ta progression et organise tes programmes d'entraînement
              </Text>
              <TouchableOpacity
                style={[styles.journalOpenButton, { backgroundColor: '#EF4444' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/training-journal');
                }}
                activeOpacity={0.8}
              >
                <BookOpen size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.journalOpenButtonText}>Ouvrir le carnet</Text>
              </TouchableOpacity>
            </View>

            {/* Features cards */}
            <View style={styles.journalFeaturesGrid}>
              <View style={[styles.journalFeatureCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={[styles.journalFeatureIcon, { backgroundColor: `${colors.accent}20` }]}>
                  <TrendingUp size={24} color={colors.accent} />
                </View>
                <Text style={[styles.journalFeatureTitle, { color: colors.textPrimary }]}>
                  Objectifs
                </Text>
                <Text style={[styles.journalFeatureText, { color: colors.textMuted }]}>
                  Crée et organise tes objectifs par sport
                </Text>
              </View>

              <View style={[styles.journalFeatureCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={[styles.journalFeatureIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Trophy size={24} color="#8B5CF6" />
                </View>
                <Text style={[styles.journalFeatureTitle, { color: colors.textPrimary }]}>
                  Statistiques
                </Text>
                <Text style={[styles.journalFeatureText, { color: colors.textMuted }]}>
                  Suis ta progression avec des stats détaillées
                </Text>
              </View>

              <View style={[styles.journalFeatureCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={[styles.journalFeatureIcon, { backgroundColor: '#10B98120' }]}>
                  <Calendar size={24} color="#10B981" />
                </View>
                <Text style={[styles.journalFeatureTitle, { color: colors.textPrimary }]}>
                  Calendrier
                </Text>
                <Text style={[styles.journalFeatureText, { color: colors.textMuted }]}>
                  Visualise ton historique d'entraînement
                </Text>
              </View>

              <View style={[styles.journalFeatureCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={[styles.journalFeatureIcon, { backgroundColor: '#F59E0B20' }]}>
                  <List size={24} color="#F59E0B" />
                </View>
                <Text style={[styles.journalFeatureTitle, { color: colors.textPrimary }]}>
                  Programmes
                </Text>
                <Text style={[styles.journalFeatureText, { color: colors.textMuted }]}>
                  Structure tes objectifs en programmes
                </Text>
              </View>
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
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Mes Clubs</Text>

            {clubs.length === 0 ? (
              <View style={[styles.emptyClubsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Dumbbell size={48} color={colors.textMuted} />
                <Text style={[styles.emptyClubsTitle, { color: colors.textPrimary }]}>Aucun club</Text>
                <Text style={[styles.emptyClubsText, { color: colors.textMuted }]}>Ajoute tes clubs pour planifier tes entrainements</Text>
                <TouchableOpacity
                  style={[styles.addClubButton, { backgroundColor: colors.accent }]}
                  onPress={() => router.push('/clubs')}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.addClubButtonText}>Ajouter un club</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.clubsGrid}>
                {clubs.map((club) => {
                  const display = getClubDisplay(club);
                  const clubWorkouts = workouts.filter(w => w.club_id === club.id);
                  const thisMonthWorkouts = clubWorkouts.filter(w => isSameMonth(new Date(w.date), new Date())).length;

                  return (
                    <TouchableOpacity
                      key={club.id}
                      style={[styles.clubCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        // Ouvrir le modal de détail du club
                        const partnerData: Partner = {
                          id: club.id || 0,
                          type: 'club',
                          name: club.name,
                          sport: club.sport,
                          photo: club.logo_uri ? { uri: club.logo_uri } : undefined,
                          color: club.color,
                          bio: club.bio,
                          address: club.address,
                          links: club.links ? JSON.parse(club.links) : undefined,
                        };
                        setSelectedPartner(partnerData);
                        setShowPartnerModal(true);
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
                      <View style={styles.clubStats}>
                        <Text style={[styles.clubStatsValue, { color: club.color || colors.accent }]}>{thisMonthWorkouts}</Text>
                        <Text style={[styles.clubStatsLabel, { color: colors.textMuted }]}>ce mois</Text>
                      </View>
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
                    router.push('/clubs');
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.addClubButtonFixedText}>Ajouter un club</Text>
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
            <View style={{ height: 20 }} />
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              MES ÉVÉNEMENTS
            </Text>

            {/* Filtre par catégorie */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilterContainer}
            >
              {Object.entries(sportCategories).map(([key, category]) => {
                const isActive = selectedCategory === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                      isActive && { backgroundColor: category.color, borderColor: category.color }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(key);
                      setSelectedSportInCategory('all');
                    }}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: colors.textPrimary },
                      isActive && { color: '#FFFFFF', fontWeight: '700' }
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sous-menu sports spécifiques */}
            {selectedCategory !== 'all' && sportCategories[selectedCategory as keyof typeof sportCategories]?.sports?.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sportFilterContainer}
              >
                {sportCategories[selectedCategory as keyof typeof sportCategories].sports.map((sport: any) => {
                  const isActive = selectedSportInCategory === sport.id;
                  const categoryColor = sportCategories[selectedCategory as keyof typeof sportCategories].color;
                  return (
                    <TouchableOpacity
                      key={sport.id}
                      style={[
                        styles.sportChip,
                        { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                        isActive && { backgroundColor: categoryColor, borderColor: categoryColor }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedSportInCategory(sport.id);
                      }}
                    >
                      <Text style={[
                        styles.sportChipText,
                        { color: colors.textSecondary },
                        isActive && { color: '#FFFFFF', fontWeight: '700' }
                      ]}>
                        {sport.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {Object.keys(groupedCompetitions).length === 0 ? (
              <View style={[styles.emptyClubsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Trophy size={48} color="#F59E0B" />
                <Text style={[styles.emptyClubsTitle, { color: colors.textPrimary }]}>Aucune compétition</Text>
                <Text style={[styles.emptyClubsText, { color: colors.textMuted }]}>
                  Ajoute ta prochaine compétition pour suivre ta préparation
                </Text>
                <TouchableOpacity
                  style={[styles.addClubButton, { backgroundColor: '#F59E0B' }]}
                  onPress={() => router.push('/add-competition')}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.addClubButtonText}>Ajouter une compétition</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Groupement par catégorie */}
                {Object.entries(groupedCompetitions).map(([categoryKey, comps]) => {
                  // Trouver la catégorie
                  const categoryData = categoryKey === 'autres'
                    ? { name: 'Autres', color: '#6B7280' }
                    : sportCategories[categoryKey as keyof typeof sportCategories];

                  if (!categoryData) return null;

                  const isExpanded = expandedOrganizers[categoryKey];
                  const displayedComps = isExpanded ? comps : comps.slice(0, 3);
                  const hasMore = comps.length > 3;

                  return (
                    <View key={categoryKey} style={styles.categoryGroup}>
                      {/* Header catégorie */}
                      <View style={[styles.categoryGroupHeader, { backgroundColor: categoryData.color + '15', borderColor: categoryData.color }]}>
                        <View style={styles.categoryGroupHeaderLeft}>
                          <View>
                            <Text style={[styles.categoryGroupName, { color: categoryData.color }]}>
                              {categoryData.name}
                            </Text>
                            <Text style={[styles.categoryGroupCount, { color: colors.textMuted }]}>
                              {comps.length} événement{comps.length > 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Compétitions */}
                      {displayedComps.map((competition) => {
                        const eventDate = new Date(competition.date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        eventDate.setHours(0, 0, 0, 0);
                        const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                        const sportInfo = getSportIcon(competition.sport || 'default');
                        const urgencyColor = daysLeft <= 7 ? '#EF4444' : daysLeft <= 30 ? '#F59E0B' : '#10B981';

                        return (
                          <TouchableOpacity
                            key={competition.id}
                            style={[styles.eventCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border, borderLeftColor: categoryData.color }]}
                            onPress={() => router.push('/competitions')}
                            activeOpacity={0.8}
                          >
                            <View style={styles.eventCardHeader}>
                              <View style={styles.eventCardLeft}>
                                <View style={[styles.eventIconBg, { backgroundColor: categoryData.color + '20' }]}>
                                  <Text style={styles.eventIconText}>{sportInfo.icon}</Text>
                                </View>
                                <View style={styles.eventCardInfo}>
                                  <Text style={[styles.eventCardName, { color: colors.textPrimary }]} numberOfLines={2}>
                                    {competition.nom}
                                  </Text>
                                  <View style={styles.eventCardMeta}>
                                    <Calendar size={12} color={categoryData.color} />
                                    <Text style={[styles.eventCardDate, { color: colors.textSecondary }]}>
                                      {format(eventDate, 'd MMMM yyyy', { locale: fr })}
                                    </Text>
                                  </View>
                                  {competition.lieu && (
                                    <View style={styles.eventCardMeta}>
                                      <MapPin size={12} color={colors.textMuted} />
                                      <Text style={[styles.eventCardLocation, { color: colors.textMuted }]} numberOfLines={1}>
                                        {competition.lieu}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              <View style={[styles.eventCountdownBadge, { backgroundColor: urgencyColor + '20' }]}>
                                <Text style={[styles.eventCountdownText, { color: urgencyColor }]}>
                                  J-{daysLeft}
                                </Text>
                              </View>
                            </View>

                            {competition.categorie_poids && (
                              <View style={[styles.eventWeightBadge, { backgroundColor: categoryData.color + '15' }]}>
                                <Text style={[styles.eventWeightText, { color: categoryData.color }]}>
                                  {competition.categorie_poids}
                                </Text>
                              </View>
                            )}

                            <View style={styles.eventCardActions}>
                              {competition.lien_inscription && (
                                <TouchableOpacity
                                  style={[styles.eventAction, { backgroundColor: categoryData.color + '15' }]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    Linking.openURL(competition.lien_inscription!);
                                  }}
                                >
                                  <ExternalLink size={14} color={categoryData.color} />
                                  <Text style={[styles.eventActionText, { color: categoryData.color }]}>Inscription</Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.eventAction, { backgroundColor: '#8B5CF615' }]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  Alert.alert('Rappels', 'Rappels J-30, J-7, J-1 et H-2 activés !');
                                }}
                              >
                                <Bell size={14} color="#8B5CF6" />
                                <Text style={[styles.eventActionText, { color: '#8B5CF6' }]}>Rappels</Text>
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Bouton "Voir plus" */}
                      {hasMore && (
                        <TouchableOpacity
                          style={[styles.seeMoreButton, { backgroundColor: categoryData.color + '15', borderColor: categoryData.color }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setExpandedOrganizers(prev => ({
                              ...prev,
                              [categoryKey]: !prev[categoryKey]
                            }));
                          }}
                        >
                          <Text style={[styles.seeMoreText, { color: categoryData.color }]}>
                            {isExpanded ? `Voir moins` : `Voir ${comps.length - 3} de plus`}
                          </Text>
                          <ChevronRight
                            size={16}
                            color={categoryData.color}
                            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {/* Ajouter une compétition */}
                <TouchableOpacity
                  style={[styles.addClubButtonFixed, { backgroundColor: '#F59E0B' }]}
                  onPress={() => router.push('/add-competition')}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.addClubButtonFixedText}>Ajouter une compétition</Text>
                </TouchableOpacity>
              </>
            )}

            {/* CALENDRIERS OFFICIELS */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 24 }]}>
              CALENDRIERS OFFICIELS
            </Text>
            <View style={styles.officialCalendars}>
              <TouchableOpacity
                style={[styles.officialCalendarCard, { backgroundColor: colors.backgroundCard, borderColor: '#1E88E5' }]}
                onPress={() => Linking.openURL('https://cfjjb.com/competitions/calendrier-competitions')}
                activeOpacity={0.8}
              >
                <View style={styles.officialCalendarInfo}>
                  <Text style={[styles.officialCalendarName, { color: colors.textPrimary }]}>CFJJB</Text>
                  <Text style={[styles.officialCalendarDesc, { color: colors.textMuted }]}>Confédération Française JJB</Text>
                </View>
                <ExternalLink size={18} color="#1E88E5" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.officialCalendarCard, { backgroundColor: colors.backgroundCard, borderColor: '#E53935' }]}
                onPress={() => Linking.openURL('https://ibjjf.com/events/calendar')}
                activeOpacity={0.8}
              >
                <View style={styles.officialCalendarInfo}>
                  <Text style={[styles.officialCalendarName, { color: colors.textPrimary }]}>IBJJF</Text>
                  <Text style={[styles.officialCalendarDesc, { color: colors.textMuted }]}>International Brazilian JJF</Text>
                </View>
                <ExternalLink size={18} color="#E53935" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.officialCalendarCard, { backgroundColor: colors.backgroundCard, borderColor: '#FF6F00' }]}
                onPress={() => Linking.openURL('https://www.ufc.com/events')}
                activeOpacity={0.8}
              >
                <View style={styles.officialCalendarInfo}>
                  <Text style={[styles.officialCalendarName, { color: colors.textPrimary }]}>UFC / MMA</Text>
                  <Text style={[styles.officialCalendarDesc, { color: colors.textMuted }]}>Événements MMA</Text>
                </View>
                <ExternalLink size={18} color="#FF6F00" />
              </TouchableOpacity>
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
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
    marginBottom: SPACING.lg,
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
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  monthlyStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  monthlyStatsTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  monthlyStatsScroll: {
    gap: SPACING.lg,
    paddingRight: SPACING.lg,
  },
  monthlyStatItem: {
    alignItems: 'center',
  },
  monthlyStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  clubLogoSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  clubColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  monthlyStatCount: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  monthlyStatName: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: 70,
    textAlign: 'center',
  },

  // CALENDAR CARD - Utilise le thème, pas de fond noir
  calendarCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
    aspectRatio: 0.75,  // Ratio ajusté pour moins d'espace
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
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
    marginTop: 4,
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
    backgroundColor: COLORS.border,
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
    backgroundColor: COLORS.backgroundSecondary,
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
    backgroundColor: COLORS.border,
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
});
