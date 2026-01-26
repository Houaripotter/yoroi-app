// ============================================
// OPTIMIZED EVENTS SCREEN - PRODUCTION READY
// ============================================
// Performance: Handles 1,873 events smoothly
// Features: Location filters, Cascading sport filters, Add to Planning
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { MapPin, ExternalLink, Search, ArrowLeft, Plus, Check } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

// Dynamic imports for lazy-loading events by region
const EVENTS_BY_REGION = {
  france: () => import('@/src/data/events/france.json'),
  europe: () => import('@/src/data/events/europe.json'),
  monde: () => import('@/src/data/events/monde.json'),
} as const;

// TypeScript interfaces
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
  sport_tag: 'jjb' | 'grappling' | 'hyrox' | 'marathon' | 'running' | 'trail';
  registration_link: string;
  federation: string | null;
  image_logo_url: string | null;
}

type CategoryFilter = 'all' | 'combat' | 'endurance';
type LocationFilter = 'monde' | 'europe' | 'france';
type SportTagFilter = 'all' | 'jjb' | 'grappling' | 'hyrox' | 'marathon' | 'running' | 'trail';

// European countries list
const EUROPEAN_COUNTRIES = [
  'France', 'United Kingdom', 'Spain', 'Italy', 'Germany', 'Portugal',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Ireland', 'Poland', 'Czech Republic', 'Greece',
  'Romania', 'Hungary', 'Croatia', 'Slovenia', 'Slovakia', 'Bulgaria',
  'Luxembourg', 'Estonia', 'Latvia', 'Lithuania', 'Cyprus', 'Malta',
  'Iceland', 'Serbia', 'Ukraine', 'Belarus', 'Albania', 'Bosnia and Herzegovina',
  'North Macedonia', 'Montenegro', 'Moldova', 'Monaco', 'Andorra', 'Liechtenstein',
  'San Marino', 'Vatican City',
];

// AsyncStorage key
const PLANNING_STORAGE_KEY = 'my_planning';

// Fixed item height for performance optimization
const ITEM_HEIGHT = 160;

export default function EventsScreen() {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>('monde');
  const [selectedSportTag, setSelectedSportTag] = useState<SportTagFilter>('all');
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [eventsData, setEventsData] = useState<SportEvent[]>([]);

  // Load events dynamically based on selected location
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const { default: data } = await EVENTS_BY_REGION[selectedLocation]();
        setEventsData(data as SportEvent[]);
      } catch (error) {
        logger.error('Error loading events:', error);
        setEventsData([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, [selectedLocation]);

  // Load saved events from AsyncStorage on mount
  useEffect(() => {
    loadSavedEvents();
  }, []);

  // Reset sport tag when category changes
  useEffect(() => {
    setSelectedSportTag('all');
  }, [selectedCategory]);

  const loadSavedEvents = async () => {
    try {
      const saved = await AsyncStorage.getItem(PLANNING_STORAGE_KEY);
      if (saved) {
        const events = JSON.parse(saved) as SportEvent[];
        setSavedEventIds(new Set(events.map(e => e.id)));
      }
    } catch (error) {
      logger.error('Error loading saved events:', error);
    }
  };

  // Get all events (already typed from state)
  const allEvents = useMemo(() => eventsData, [eventsData]);

  // Helper function to get filtered events by location first
  const getLocationFilteredEvents = useCallback((events: SportEvent[]) => {
    if (selectedLocation === 'france') {
      return events.filter(event =>
        event.location.country.toLowerCase() === 'france'
      );
    } else if (selectedLocation === 'europe') {
      return events.filter(event =>
        EUROPEAN_COUNTRIES.includes(event.location.country)
      );
    }
    return events;
  }, [selectedLocation]);

  // OPTIMIZED: Filter events with useMemo to prevent re-calculations
  const filteredEvents = useMemo(() => {
    let filtered = allEvents;

    // Filter by location
    filtered = getLocationFilteredEvents(filtered);

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    // Filter by sport tag (cascading filter)
    if (selectedSportTag !== 'all') {
      filtered = filtered.filter(event => event.sport_tag === selectedSportTag);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.location.city.toLowerCase().includes(query) ||
        event.location.country.toLowerCase().includes(query) ||
        (event.federation && event.federation.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allEvents, selectedLocation, selectedCategory, selectedSportTag, searchQuery, getLocationFilteredEvents]);

  // Event counts for each filter (memoized) - Only counts loaded events
  const eventCounts = useMemo(() => {
    const locationFiltered = getLocationFilteredEvents(allEvents);

    const combatEvents = locationFiltered.filter(e => e.category === 'combat');
    const enduranceEvents = locationFiltered.filter(e => e.category === 'endurance');

    return {
      all: locationFiltered.length,
      combat: combatEvents.length,
      endurance: enduranceEvents.length,
      // Location counts: These are approximate/fixed to avoid loading all regions
      monde: 2050, // Total across all regions
      europe: 1148,
      france: 301,
      // Combat sport tags
      jjb: combatEvents.filter(e => e.sport_tag === 'jjb').length,
      grappling: combatEvents.filter(e => e.sport_tag === 'grappling').length,
      // Endurance sport tags
      hyrox: enduranceEvents.filter(e => e.sport_tag === 'hyrox').length,
      marathon: enduranceEvents.filter(e => e.sport_tag === 'marathon').length,
      running: enduranceEvents.filter(e => e.sport_tag === 'running').length,
      trail: enduranceEvents.filter(e => e.sport_tag === 'trail').length,
    };
  }, [allEvents, getLocationFilteredEvents]);

  // Add/Remove event from planning (Optimized: Single setState)
  const toggleEventInPlanning = useCallback(async (event: SportEvent) => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      const saved = await AsyncStorage.getItem(PLANNING_STORAGE_KEY);
      let savedEvents: SportEvent[] = saved ? JSON.parse(saved) : [];

      const isAlreadySaved = savedEvents.some(e => e.id === event.id);

      // Create new Set once
      const newSet = new Set(savedEventIds);

      if (isAlreadySaved) {
        // Remove from planning
        savedEvents = savedEvents.filter(e => e.id !== event.id);
        newSet.delete(event.id);
        showPopup('Retiré', `"${event.title.substring(0, 40)}..." retiré de ton planning`, [
          { text: 'OK', style: 'primary' }
        ]);
      } else {
        // Add to planning
        savedEvents.push(event);
        newSet.add(event.id);
        showPopup('Ajouté', `"${event.title.substring(0, 40)}..." ajouté à ton planning`, [
          { text: 'OK', style: 'primary' }
        ]);
      }

      // Single setState call
      setSavedEventIds(newSet);

      await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(savedEvents));
      logger.info(`Event ${isAlreadySaved ? 'removed from' : 'added to'} planning:`, event.id);
    } catch (error) {
      logger.error('Error toggling event in planning:', error);
      showPopup('Erreur', 'Impossible de sauvegarder l\'événement', [
        { text: 'OK', style: 'primary' }
      ]);
    }
  }, [savedEventIds, showPopup]);

  // Open event registration link
  const handleOpenEvent = useCallback((link: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    safeOpenURL(link);
  }, []);

  // PERFORMANCE: getItemLayout for fixed height items
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // PERFORMANCE: keyExtractor
  const keyExtractor = useCallback((item: SportEvent) => item.id, []);

  // Render individual event item
  const renderEventItem = useCallback(({ item }: { item: SportEvent }) => {
    const eventDate = new Date(item.date_start);
    const formattedDate = eventDate.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const isSaved = savedEventIds.has(item.id);

    return (
      <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
        {/* Left: Date + Info */}
        <View style={styles.eventLeft}>
          {/* Header: Date + Sport Tag */}
          <View style={styles.eventHeader}>
            <Text style={[styles.eventDate, { color: colors.textSecondary }]}>
              {formattedDate}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>
                {item.sport_tag.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.location.city}, {item.location.country}
            </Text>
          </View>

          {/* Federation (if available) */}
          {item.federation && (
            <View style={[styles.federationBadge, { backgroundColor: colors.border }]}>
              <Text style={[styles.federationText, { color: colors.text }]}>
                {item.federation}
              </Text>
            </View>
          )}

          {/* Link */}
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => handleOpenEvent(item.registration_link)}
            activeOpacity={0.7}
          >
            <ExternalLink size={12} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Voir l'événement
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right: Add to Planning Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: isSaved ? colors.success : colors.primary,
              borderColor: isSaved ? colors.success : colors.primary,
            },
          ]}
          onPress={() => toggleEventInPlanning(item)}
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
  }, [colors, savedEventIds, handleOpenEvent, toggleEventInPlanning]);

  // Empty state
  const renderEmptyState = useCallback(() => (
    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
      <Text style={[styles.emptyText, { color: colors.text }]}>
        Aucun événement trouvé
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Essaie de modifier tes filtres ou ta recherche
      </Text>
    </View>
  ), [colors]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Chargement des événements...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          disabled={isNavigating}
          onPress={() => {
            if (!isNavigating) {
              setIsNavigating(true);
              setTimeout(() => setIsNavigating(false), 1000);
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Événements Sportifs
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par nom, ville, pays..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          maxLength={100}
        />
      </View>

      {/* Row 1: Location Filters (Monde, Europe, France) - KEEP FLAGS */}
      <View style={styles.locationFiltersContainer}>
        <TouchableOpacity
          style={[
            styles.locationFilter,
            {
              backgroundColor: selectedLocation === 'monde' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setSelectedLocation('monde');
          }}
        >
          <Text
            style={[
              styles.locationFilterText,
              { color: selectedLocation === 'monde' ? colors.textOnAccent : colors.text },
            ]}
          >
            🌍 Monde ({eventCounts.monde})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.locationFilter,
            {
              backgroundColor: selectedLocation === 'europe' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setSelectedLocation('europe');
          }}
        >
          <Text
            style={[
              styles.locationFilterText,
              { color: selectedLocation === 'europe' ? colors.textOnAccent : colors.text },
            ]}
          >
            🇪🇺 Europe ({eventCounts.europe})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.locationFilter,
            {
              backgroundColor: selectedLocation === 'france' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setSelectedLocation('france');
          }}
        >
          <Text
            style={[
              styles.locationFilterText,
              { color: selectedLocation === 'france' ? colors.textOnAccent : colors.text },
            ]}
          >
            🇫🇷 France ({eventCounts.france})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Row 2: Category Filters (Tous, Combat, Endurance) - NO EMOJIS */}
      <View style={styles.categoryFiltersContainer}>
        <TouchableOpacity
          style={[
            styles.categoryFilterButton,
            {
              backgroundColor: selectedCategory === 'all' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setSelectedCategory('all');
          }}
        >
          <Text
            style={[
              styles.categoryFilterText,
              { color: selectedCategory === 'all' ? colors.textOnAccent : colors.text },
            ]}
          >
            Tous ({eventCounts.all})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.categoryFilterButton,
            {
              backgroundColor: selectedCategory === 'combat' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setSelectedCategory('combat');
          }}
        >
          <Text
            style={[
              styles.categoryFilterText,
              { color: selectedCategory === 'combat' ? colors.textOnAccent : colors.text },
            ]}
          >
            Combat ({eventCounts.combat})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.categoryFilterButton,
            {
              backgroundColor: selectedCategory === 'endurance' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setSelectedCategory('endurance');
          }}
        >
          <Text
            style={[
              styles.categoryFilterText,
              { color: selectedCategory === 'endurance' ? colors.textOnAccent : colors.text },
            ]}
          >
            Endurance ({eventCounts.endurance})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Row 3: DYNAMIC Sport Sub-Filters (Cascading Logic) */}
      {selectedCategory === 'combat' && (
        <View style={styles.sportFiltersContainer}>
          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'all' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('all');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'all' ? colors.textOnAccent : colors.text },
              ]}
            >
              Tout Combat ({eventCounts.combat})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'jjb' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('jjb');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'jjb' ? colors.textOnAccent : colors.text },
              ]}
            >
              JJB ({eventCounts.jjb})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'grappling' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('grappling');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'grappling' ? colors.textOnAccent : colors.text },
              ]}
            >
              Grappling ({eventCounts.grappling})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedCategory === 'endurance' && (
        <View style={styles.sportFiltersContainer}>
          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'all' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('all');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'all' ? colors.textOnAccent : colors.text },
              ]}
            >
              Tout Endurance ({eventCounts.endurance})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'hyrox' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('hyrox');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'hyrox' ? colors.textOnAccent : colors.text },
              ]}
            >
              Hyrox ({eventCounts.hyrox})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'marathon' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('marathon');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'marathon' ? colors.textOnAccent : colors.text },
              ]}
            >
              Marathon ({eventCounts.marathon})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'running' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('running');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'running' ? colors.textOnAccent : colors.text },
              ]}
            >
              Running ({eventCounts.running})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sportFilterButton,
              {
                backgroundColor: selectedSportTag === 'trail' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedSportTag('trail');
            }}
          >
            <Text
              style={[
                styles.sportFilterText,
                { color: selectedSportTag === 'trail' ? colors.textOnAccent : colors.text },
              ]}
            >
              Trail ({eventCounts.trail})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OPTIMIZED FlatList with Performance Settings */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        // PERFORMANCE OPTIMIZATIONS
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        updateCellsBatchingPeriod={50}
      />
      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  locationFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  locationFilter: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.full, // Full pill shape
    alignItems: 'center',
    borderWidth: 1,
  },
  locationFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryFilterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.full, // Full pill shape
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  sportFilterButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full, // Full pill shape
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 80,
  },
  sportFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    height: ITEM_HEIGHT, // Fixed height for performance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventLeft: {
    flex: 1,
    gap: SPACING.xs,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  federationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  federationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  emptyState: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
