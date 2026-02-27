// ============================================
// YOROI - HISTORIQUE SEANCES (Workout History)
// ============================================
// Liste de toutes les seances avec filtres par sport
// Tap -> navigue vers le detail

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock, MapPin, Flame, Heart, Activity, Dumbbell,
  Sword, Bike, Waves, Footprints, Zap,
} from 'lucide-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPORT_FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'running', label: 'Course' },
  { key: 'musculation', label: 'Muscu' },
  { key: 'jjb', label: 'Combat' },
  { key: 'autre', label: 'Autre' },
];

const getSportIcon = (sport: string, color: string, size: number = 18) => {
  switch (sport) {
    case 'running': return <Footprints size={size} color={color} />;
    case 'musculation': return <Dumbbell size={size} color={color} />;
    case 'jjb': return <Sword size={size} color={color} />;
    default: return <Activity size={size} color={color} />;
  }
};

const formatDateShort = (date: string): string => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return date;
  }
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
  return `${m}min`;
};

export default function WorkoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getTrainings();
      setTrainings(data);
    } catch (error) {
      logger.error('[WorkoutHistory] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return trainings;
    return trainings.filter(t => t.sport === filter);
  }, [trainings, filter]);

  const onPressItem = useCallback((id: number) => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push({ pathname: '/workout-detail', params: { id: id.toString() } });
  }, []);

  const renderItem = useCallback(({ item }: { item: Training }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.card }]}
      onPress={() => item.id && onPressItem(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.itemIconContainer, { backgroundColor: `${colors.primary}15` }]}>
        {getSportIcon(item.sport, colors.primary, 20)}
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemSport, { color: colors.text }]} numberOfLines={1}>
          {item.session_type || item.sport}
        </Text>
        <Text style={[styles.itemDate, { color: colors.textMuted }]}>
          {formatDateShort(item.date)}{item.start_time ? ` - ${item.start_time}` : ''}
        </Text>
      </View>
      <View style={styles.itemStats}>
        {item.duration_minutes && (
          <View style={styles.itemStatRow}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.itemStatText, { color: colors.text }]}>
              {formatDuration(item.duration_minutes)}
            </Text>
          </View>
        )}
        {item.distance && (
          <View style={styles.itemStatRow}>
            <MapPin size={12} color={colors.textMuted} />
            <Text style={[styles.itemStatText, { color: colors.text }]}>
              {item.distance} km
            </Text>
          </View>
        )}
        {item.calories && (
          <View style={styles.itemStatRow}>
            <Flame size={12} color={colors.textMuted} />
            <Text style={[styles.itemStatText, { color: colors.text }]}>
              {item.calories} kcal
            </Text>
          </View>
        )}
      </View>
      {/* Indicateur details enrichis */}
      {item.workout_details_json && (
        <View style={[styles.detailBadge, { backgroundColor: `${colors.primary}20` }]}>
          <Heart size={10} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  ), [colors, onPressItem]);

  const renderFilterChip = useCallback((f: typeof SPORT_FILTERS[0]) => (
    <TouchableOpacity
      key={f.key}
      style={[
        styles.filterChip,
        { backgroundColor: filter === f.key ? colors.primary : `${colors.text}10` },
      ]}
      onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setFilter(f.key); }}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterChipText,
        { color: filter === f.key ? '#FFF' : colors.text },
      ]}>
        {f.label}
      </Text>
    </TouchableOpacity>
  ), [filter, colors]);

  return (
    <ScreenWrapper noPadding>
      <Header title={t('workoutHistory.title') || 'Historique Seances'} showBack />

      {/* Filtres */}
      <View style={styles.filtersRow}>
        {SPORT_FILTERS.map(renderFilterChip)}
      </View>

      {/* Compteur */}
      <Text style={[styles.countText, { color: colors.textMuted }]}>
        {filtered.length} {t('workoutHistory.sessions') || 'seances'}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString() || item.date}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Activity size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('workoutHistory.noWorkouts') || 'Aucune seance'}
            </Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  countText: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  itemIconContainer: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  itemContent: { flex: 1 },
  itemSport: { fontSize: 15, fontWeight: '600' },
  itemDate: { fontSize: 12, marginTop: 2 },
  itemStats: { alignItems: 'flex-end', gap: 2 },
  itemStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemStatText: { fontSize: 12, fontWeight: '600' },
  detailBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },

  emptyContainer: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyText: { fontSize: 16, fontWeight: '500' },
});
