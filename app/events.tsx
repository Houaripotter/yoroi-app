// ============================================
// EVENTS SCREEN - PREMIUM REDESIGN
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
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  MapPin,
  ExternalLink,
  Search,
  ArrowLeft,
  Plus,
  Check,
  Calendar,
  Filter,
  Globe,
  Flag,
  Bookmark,
  ChevronRight,
  X,
  Sword,
  Timer
} from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TypeScript interfaces
interface SportEvent {
  id: string;
  title: string;
  date_start: string;
  date_end?: string;
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
}

type ViewMode = 'discover' | 'saved';
type CategoryFilter = 'all' | 'combat' | 'endurance';
type LocationFilter = 'all' | 'monde' | 'europe' | 'france';

// AsyncStorage key
const PLANNING_STORAGE_KEY = 'my_planning';

// Sport tag configurations
const SPORT_TAGS = {
  combat: [
    { id: 'all', label: 'Tout', icon: '🥋' },
    { id: 'jjb', label: 'JJB', icon: '🥋' },
    { id: 'grappling', label: 'Grappling', icon: '🤼' },
    { id: 'mma', label: 'MMA', icon: '🥊' },
    { id: 'judo', label: 'Judo', icon: '🥋' },
    { id: 'lutte', label: 'Lutte', icon: '🤼' },
  ],
  endurance: [
    { id: 'all', label: 'Tout', icon: '🏃' },
    { id: 'hyrox', label: 'HYROX', icon: '💪' },
    { id: 'marathon', label: 'Marathon', icon: '🏃' },
    { id: 'trail', label: 'Trail', icon: '⛰️' },
    { id: 'triathlon', label: 'Triathlon', icon: '🏊' },
    { id: 'running', label: 'Running', icon: '👟' },
    { id: 'crossfit', label: 'CrossFit', icon: '🏋️' },
  ],
};

export default function EventsScreen() {
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>('all');
  const [selectedSportTag, setSelectedSportTag] = useState<string>('all');

  // Data states
  const [allEvents, setAllEvents] = useState<SportEvent[]>([]);
  const [savedEvents, setSavedEvents] = useState<SportEvent[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load all events from all regions
  useEffect(() => {
    const loadAllEvents = async () => {
      setIsLoading(true);
      try {
        const [franceData, europeData, mondeData] = await Promise.all([
          import('@/src/data/events/france.json'),
          import('@/src/data/events/europe.json'),
          import('@/src/data/events/monde.json'),
        ]);

        const combined = [
          ...franceData.default,
          ...europeData.default,
          ...mondeData.default,
        ] as SportEvent[];

        // Sort by date
        combined.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

        setAllEvents(combined);
      } catch (error) {
        logger.error('Error loading events:', error);
        setAllEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllEvents();
  }, []);

  // Load saved events from AsyncStorage
  useEffect(() => {
    loadSavedEvents();
  }, []);

  const loadSavedEvents = async () => {
    try {
      const saved = await AsyncStorage.getItem(PLANNING_STORAGE_KEY);
      if (saved) {
        const events = JSON.parse(saved) as SportEvent[];
        setSavedEvents(events);
        setSavedEventIds(new Set(events.map(e => e.id)));
      }
    } catch (error) {
      logger.error('Error loading saved events:', error);
    }
  };

  // Reset sport tag when category changes
  useEffect(() => {
    setSelectedSportTag('all');
  }, [selectedCategory]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = allEvents;

    // Filter by location
    if (selectedLocation === 'france') {
      filtered = filtered.filter(e => e.location.country === 'France');
    } else if (selectedLocation === 'europe') {
      const europeanCountries = ['France', 'Germany', 'UK', 'United Kingdom', 'Spain', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Poland', 'Czech Republic', 'Greece'];
      filtered = filtered.filter(e => europeanCountries.includes(e.location.country));
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    // Filter by sport tag
    if (selectedSportTag !== 'all') {
      filtered = filtered.filter(e => e.sport_tag === selectedSportTag);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.location.city.toLowerCase().includes(query) ||
        e.location.country.toLowerCase().includes(query) ||
        (e.federation && e.federation.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allEvents, selectedLocation, selectedCategory, selectedSportTag, searchQuery]);

  // Event counts
  const eventCounts = useMemo(() => ({
    total: allEvents.length,
    combat: allEvents.filter(e => e.category === 'combat').length,
    endurance: allEvents.filter(e => e.category === 'endurance').length,
    saved: savedEvents.length,
  }), [allEvents, savedEvents]);

  // Toggle event in planning
  const toggleEventInPlanning = useCallback(async (event: SportEvent) => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      const isAlreadySaved = savedEventIds.has(event.id);
      let updatedEvents: SportEvent[];
      const newSet = new Set(savedEventIds);

      if (isAlreadySaved) {
        updatedEvents = savedEvents.filter(e => e.id !== event.id);
        newSet.delete(event.id);
        showPopup('Retiré', `Événement retiré de tes RDV`, [{ text: 'OK', style: 'primary' }]);
      } else {
        updatedEvents = [...savedEvents, event];
        newSet.add(event.id);
        showPopup('Ajouté', `Événement ajouté à tes RDV`, [{ text: 'OK', style: 'primary' }]);
      }

      setSavedEvents(updatedEvents);
      setSavedEventIds(newSet);
      await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(updatedEvents));
    } catch (error) {
      logger.error('Error toggling event:', error);
    }
  }, [savedEventIds, savedEvents, showPopup]);

  // Format date
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [locale]);

  // Get sport tag color
  const getSportColor = (tag: string) => {
    const colors: Record<string, string> = {
      jjb: '#8B5CF6',
      grappling: '#6366F1',
      mma: '#EF4444',
      judo: '#F59E0B',
      lutte: '#10B981',
      hyrox: '#EC4899',
      marathon: '#3B82F6',
      trail: '#22C55E',
      triathlon: '#06B6D4',
      running: '#F97316',
      crossfit: '#EF4444',
    };
    return colors[tag] || '#6B7280';
  };

  // Render event card - Premium Design
  const renderEventCard = useCallback(({ item }: { item: SportEvent }) => {
    const isSaved = savedEventIds.has(item.id);
    const sportColor = getSportColor(item.sport_tag);

    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: colors.card }]}
        onPress={() => safeOpenURL(item.registration_link)}
        activeOpacity={0.9}
      >
        {/* Image/Logo Section */}
        <View style={[styles.eventImageContainer, { backgroundColor: sportColor + '15' }]}>
          {item.image_logo_url ? (
            <Image
              source={{ uri: item.image_logo_url }}
              style={styles.eventImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.eventPlaceholder, { backgroundColor: sportColor + '30' }]}>
              <Text style={styles.eventPlaceholderText}>
                {item.sport_tag.toUpperCase().slice(0, 3)}
              </Text>
            </View>
          )}

          {/* Sport Tag Badge */}
          <View style={[styles.sportBadge, { backgroundColor: sportColor }]}>
            <Text style={styles.sportBadgeText}>{item.sport_tag.toUpperCase()}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.eventContent}>
          {/* Date */}
          <View style={styles.eventDateRow}>
            <Calendar size={12} color={sportColor} />
            <Text style={[styles.eventDate, { color: sportColor }]}>
              {formatDate(item.date_start)}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Location */}
          <View style={styles.eventLocationRow}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={[styles.eventLocation, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.location.city}, {item.location.country}
            </Text>
          </View>

          {/* Federation */}
          {item.federation && (
            <View style={[styles.federationBadge, { backgroundColor: colors.border }]}>
              <Text style={[styles.federationText, { color: colors.text }]}>
                {item.federation}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.eventActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: sportColor }]}
              onPress={() => safeOpenURL(item.registration_link)}
            >
              <ExternalLink size={14} color="#FFF" />
              <Text style={styles.actionButtonText}>Inscription</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: isSaved ? '#10B981' : 'transparent',
                  borderColor: isSaved ? '#10B981' : colors.border,
                }
              ]}
              onPress={() => toggleEventInPlanning(item)}
            >
              {isSaved ? (
                <Check size={16} color="#FFF" strokeWidth={3} />
              ) : (
                <Plus size={16} color={colors.text} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, savedEventIds, formatDate, toggleEventInPlanning]);

  // Render saved event card (compact)
  const renderSavedEventCard = useCallback(({ item }: { item: SportEvent }) => {
    const sportColor = getSportColor(item.sport_tag);

    return (
      <View style={[styles.savedCard, { backgroundColor: colors.card }]}>
        <View style={[styles.savedColorBar, { backgroundColor: sportColor }]} />

        <View style={styles.savedContent}>
          <View style={styles.savedHeader}>
            <View style={[styles.savedDateBadge, { backgroundColor: sportColor + '20' }]}>
              <Calendar size={10} color={sportColor} />
              <Text style={[styles.savedDate, { color: sportColor }]}>
                {formatDate(item.date_start)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleEventInPlanning(item)}
              style={styles.removeButton}
            >
              <X size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.savedTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.savedLocationRow}>
            <MapPin size={10} color={colors.textSecondary} />
            <Text style={[styles.savedLocation, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.location.city}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.savedLinkButton, { borderColor: sportColor }]}
            onPress={() => safeOpenURL(item.registration_link)}
          >
            <Text style={[styles.savedLinkText, { color: sportColor }]}>Voir</Text>
            <ChevronRight size={12} color={sportColor} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, formatDate, toggleEventInPlanning]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Événements</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {eventCounts.total} événements disponibles
          </Text>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={[styles.viewToggle, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            viewMode === 'discover' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setViewMode('discover')}
        >
          <Globe size={16} color={viewMode === 'discover' ? '#FFF' : colors.text} />
          <Text style={[
            styles.viewToggleText,
            { color: viewMode === 'discover' ? '#FFF' : colors.text }
          ]}>
            Découvrir
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            viewMode === 'saved' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setViewMode('saved')}
        >
          <Bookmark size={16} color={viewMode === 'saved' ? '#FFF' : colors.text} />
          <Text style={[
            styles.viewToggleText,
            { color: viewMode === 'saved' ? '#FFF' : colors.text }
          ]}>
            Mes RDV ({eventCounts.saved})
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'discover' ? (
        <>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher un événement..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips - Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            {/* Location Filters */}
            <View style={styles.filterGroup}>
              {[
                { id: 'all', label: '🌍 Tous', count: allEvents.length },
                { id: 'france', label: '🇫🇷 France', count: allEvents.filter(e => e.location.country === 'France').length },
                { id: 'europe', label: '🇪🇺 Europe', count: null },
              ].map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedLocation === loc.id ? colors.primary : colors.card,
                      borderColor: selectedLocation === loc.id ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setSelectedLocation(loc.id as LocationFilter);
                  }}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: selectedLocation === loc.id ? '#FFF' : colors.text }
                  ]}>
                    {loc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterDivider} />

            {/* Category Filters */}
            <View style={styles.filterGroup}>
              {[
                { id: 'all', label: 'Tous', icon: '🎯' },
                { id: 'combat', label: 'Combat', icon: '🥋' },
                { id: 'endurance', label: 'Endurance', icon: '🏃' },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedCategory === cat.id ? colors.primary : colors.card,
                      borderColor: selectedCategory === cat.id ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id as CategoryFilter);
                  }}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: selectedCategory === cat.id ? '#FFF' : colors.text }
                  ]}>
                    {cat.icon} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Sport Sub-filters */}
          {selectedCategory !== 'all' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sportFilterScroll}
              contentContainerStyle={styles.sportFilterContent}
            >
              {SPORT_TAGS[selectedCategory].map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportChip,
                    {
                      backgroundColor: selectedSportTag === sport.id
                        ? getSportColor(sport.id === 'all' ? 'jjb' : sport.id)
                        : colors.card,
                      borderColor: getSportColor(sport.id === 'all' ? 'jjb' : sport.id),
                    }
                  ]}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setSelectedSportTag(sport.id);
                  }}
                >
                  <Text style={[
                    styles.sportChipText,
                    { color: selectedSportTag === sport.id ? '#FFF' : colors.text }
                  ]}>
                    {sport.icon} {sport.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Results Count */}
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: colors.text }]}>
              {filteredEvents.length} résultat{filteredEvents.length > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Events List */}
          <FlatList
            data={filteredEvents}
            renderItem={renderEventCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  Aucun événement trouvé
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Modifie tes filtres pour voir plus de résultats
                </Text>
              </View>
            }
          />
        </>
      ) : (
        /* Saved Events View */
        <View style={styles.savedContainer}>
          {savedEvents.length > 0 ? (
            <FlatList
              data={savedEvents}
              renderItem={renderSavedEventCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.savedList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Bookmark size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text, marginTop: 16 }]}>
                Aucun RDV enregistré
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Ajoute des événements depuis l&apos;onglet Découvrir
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => setViewMode('discover')}
              >
                <Text style={styles.emptyButtonText}>Découvrir des événements</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportFilterScroll: {
    maxHeight: 40,
    marginBottom: 8,
  },
  sportFilterContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  sportChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  sportChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eventImageContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eventImage: {
    width: '60%',
    height: '70%',
  },
  eventPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventPlaceholderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  sportBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  eventContent: {
    padding: 14,
    gap: 6,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    fontSize: 13,
    flex: 1,
  },
  federationBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 2,
  },
  federationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  savedContainer: {
    flex: 1,
  },
  savedList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  savedCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  savedColorBar: {
    width: 4,
  },
  savedContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  savedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  savedDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  savedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  savedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedLocation: {
    fontSize: 12,
  },
  savedLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    gap: 2,
  },
  savedLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
