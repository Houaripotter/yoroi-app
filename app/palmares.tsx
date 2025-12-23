// ============================================
// 🥊 YOROI - PALMARÈS / HISTORIQUE COMBATS
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Calendar,
  Filter,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { getCombats } from '@/lib/fighterModeService';
import { Combat, calculateRecord } from '@/lib/fighterMode';
import { SPACING, RADIUS } from '@/constants/appTheme';

type FilterType = 'all' | 'victoire' | 'defaite' | 'nul';

export default function PalmaresScreen() {
  const { colors } = useTheme();
  const [combats, setCombats] = useState<Combat[]>([]);
  const [filteredCombats, setFilteredCombats] = useState<Combat[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCombats();
    }, [])
  );

  const loadCombats = async () => {
    try {
      const allCombats = await getCombats();
      setCombats(allCombats);
      applyFilter(allCombats, filter);
    } catch (error) {
      console.error('Error loading combats:', error);
    }
  };

  const applyFilter = (combatsList: Combat[], filterType: FilterType) => {
    if (filterType === 'all') {
      setFilteredCombats(combatsList);
    } else {
      setFilteredCombats(combatsList.filter((c) => c.resultat === filterType));
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
    applyFilter(combats, newFilter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCombats();
    setRefreshing(false);
  };

  const handleAddCombat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-combat');
  };

  const handleCombatPress = (combat: Combat) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/combat-detail?id=${combat.id}`);
  };

  const record = calculateRecord(combats);
  const totalFights = combats.length;
  const winRate = totalFights > 0 ? (record.victoires / totalFights) * 100 : 0;

  return (
    <ScreenWrapper>
      <Header title="Mon Palmarès" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Record Card */}
        <View style={[styles.recordCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.recordHeader}>
            <Trophy size={32} color={colors.accent} />
            <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
              Bilan Global
            </Text>
          </View>

          <View style={styles.recordStats}>
            {/* Victoires */}
            <View style={styles.statColumn}>
              <View style={[styles.statIcon, { backgroundColor: '#4CAF5020' }]}>
                <TrendingUp size={24} color="#4CAF50" />
              </View>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {record.victoires}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Victoires
              </Text>
            </View>

            {/* Défaites */}
            <View style={styles.statColumn}>
              <View style={[styles.statIcon, { backgroundColor: '#F4433620' }]}>
                <TrendingDown size={24} color="#F44336" />
              </View>
              <Text style={[styles.statValue, { color: '#F44336' }]}>
                {record.defaites}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Défaites
              </Text>
            </View>

            {/* Nuls */}
            <View style={styles.statColumn}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${colors.textMuted}20` },
                ]}
              >
                <Minus size={24} color={colors.textMuted} />
              </View>
              <Text style={[styles.statValue, { color: colors.textMuted }]}>
                {record.nuls}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Nuls
              </Text>
            </View>
          </View>

          {/* Win Rate */}
          {totalFights > 0 && (
            <View style={styles.winRateContainer}>
              <View style={styles.winRateBar}>
                <View
                  style={[
                    styles.winRateFill,
                    { width: `${winRate}%`, backgroundColor: colors.accent },
                  ]}
                />
              </View>
              <Text style={[styles.winRateText, { color: colors.textMuted }]}>
                {winRate.toFixed(1)}% de victoires
              </Text>
            </View>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === 'all' ? colors.accent : colors.backgroundCard,
                borderColor: filter === 'all' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => handleFilterChange('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === 'all' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Tous ({combats.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === 'victoire' ? '#4CAF50' : colors.backgroundCard,
                borderColor: filter === 'victoire' ? '#4CAF50' : colors.border,
              },
            ]}
            onPress={() => handleFilterChange('victoire')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === 'victoire' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Victoires ({record.victoires})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === 'defaite' ? '#F44336' : colors.backgroundCard,
                borderColor: filter === 'defaite' ? '#F44336' : colors.border,
              },
            ]}
            onPress={() => handleFilterChange('defaite')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === 'defaite' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Défaites ({record.defaites})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fights List */}
        <View style={styles.fightsList}>
          {filteredCombats.length > 0 ? (
            filteredCombats.map((combat, index) => (
              <TouchableOpacity
                key={combat.id}
                style={[
                  styles.fightCard,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderLeftColor:
                      combat.resultat === 'victoire'
                        ? '#4CAF50'
                        : combat.resultat === 'defaite'
                        ? '#F44336'
                        : colors.textMuted,
                  },
                ]}
                onPress={() => handleCombatPress(combat)}
                activeOpacity={0.7}
              >
                <View style={styles.fightHeader}>
                  <View style={styles.fightHeaderLeft}>
                    <Text style={[styles.fightNumber, { color: colors.textMuted }]}>
                      Combat #{combats.length - combats.indexOf(combat)}
                    </Text>
                    <View style={styles.fightDate}>
                      <Calendar size={14} color={colors.textMuted} />
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        {new Date(combat.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.resultBadge,
                      {
                        backgroundColor:
                          combat.resultat === 'victoire'
                            ? '#4CAF5020'
                            : combat.resultat === 'defaite'
                            ? '#F4433620'
                            : `${colors.textMuted}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resultText,
                        {
                          color:
                            combat.resultat === 'victoire'
                              ? '#4CAF50'
                              : combat.resultat === 'defaite'
                              ? '#F44336'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {combat.resultat === 'victoire'
                        ? 'Victoire'
                        : combat.resultat === 'defaite'
                        ? 'Défaite'
                        : 'Nul'}
                    </Text>
                  </View>
                </View>

                {combat.adversaire_nom && (
                  <Text style={[styles.opponent, { color: colors.textPrimary }]}>
                    vs {combat.adversaire_nom}
                  </Text>
                )}

                {combat.methode && (
                  <View style={styles.methodRow}>
                    <Text style={[styles.method, { color: colors.textMuted }]}>
                      {combat.methode.toUpperCase()}
                    </Text>
                    {combat.technique && (
                      <>
                        <Text style={[styles.separator, { color: colors.textMuted }]}>
                          •
                        </Text>
                        <Text style={[styles.technique, { color: colors.textMuted }]}>
                          {combat.technique}
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {combat.round && combat.temps && (
                  <Text style={[styles.timing, { color: colors.textMuted }]}>
                    Round {combat.round} - {combat.temps}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Trophy size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {filter === 'all'
                  ? 'Aucun combat'
                  : filter === 'victoire'
                  ? 'Aucune victoire'
                  : filter === 'defaite'
                  ? 'Aucune défaite'
                  : 'Aucun match nul'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {filter === 'all'
                  ? 'Ajoute ton premier combat pour commencer ton palmarès'
                  : 'Aucun combat trouvé avec ce filtre'}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleAddCombat}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },

  // Record Card
  recordCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  recordStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  statColumn: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  winRateContainer: {
    gap: SPACING.sm,
  },
  winRateBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  winRateFill: {
    height: '100%',
    borderRadius: 4,
  },
  winRateText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 2,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Fights List
  fightsList: {
    gap: SPACING.md,
  },
  fightCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
  },
  fightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  fightHeaderLeft: {
    flex: 1,
    gap: SPACING.xs,
  },
  fightNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  fightDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dateText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  resultBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
  },
  opponent: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  method: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    fontSize: 13,
  },
  technique: {
    fontSize: 13,
  },
  timing: {
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.xl * 2,
    right: SPACING.lg,
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
});
