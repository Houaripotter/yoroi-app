// ============================================
// YOROI - PALMARÈS / HISTORIQUE COMBATS
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { router } from 'expo-router';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Calendar,
  Flame,
  Target,
  Award,
} from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { getCombats } from '@/lib/fighterModeService';
import { Combat, calculateRecord } from '@/lib/fighterMode';
import { SPACING, RADIUS, SHADOWS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';
import { PremiumTeaser } from '@/components/premium/PremiumTeaser';
import { usePremium } from '@/context/PremiumContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router as expRouter } from 'expo-router';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';

const FREE_COMBATS_LIMIT = 3;

type FilterType = 'all' | 'victoire' | 'defaite' | 'nul';

export default function PalmaresScreen() {
  const { colors } = useTheme();
  const { isPremium } = usePremium();
  const { locale, t } = useI18n();
  const [combats, setCombats] = useState<Combat[]>([]);
  const [filteredCombats, setFilteredCombats] = useState<Combat[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadCombats(); }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', loadCombats);
    return () => sub.remove();
  }, []);

  const loadCombats = async () => {
    try {
      const allCombats = await getCombats();
      setCombats(allCombats);
      applyFilter(allCombats, filter);
    } catch (error) {
      logger.error('Error loading combats:', error);
    } finally {
      setLoading(false);
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
    impactAsync(ImpactFeedbackStyle.Light);
    setFilter(newFilter);
    applyFilter(combats, newFilter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCombats();
    setRefreshing(false);
  };

  const handleAddCombat = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    if (!isPremium && combats.length >= FREE_COMBATS_LIMIT) {
      router.push('/paywall' as never);
      return;
    }
    router.push('/add-combat');
  };

  const handleCombatPress = (combat: Combat) => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push(`/combat-detail?id=${combat.id}`);
  };

  const record = calculateRecord(combats);
  const totalFights = combats.length;
  const winRate = totalFights > 0 ? (record.victoires / totalFights) * 100 : 0;

  // ── Streak actuel (depuis le combat le plus récent) ──
  const sortedByDate = [...combats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const currentStreak = (() => {
    if (sortedByDate.length === 0) return null;
    const first = sortedByDate[0].resultat;
    if (first === 'nul') return null;
    let count = 0;
    for (const c of sortedByDate) {
      if (c.resultat === first) count++;
      else break;
    }
    return { type: first, count };
  })();
  const lastCombat = sortedByDate[0] || null;

  // ── Top techniques de finition (sur victoires uniquement) ──
  const topTechniques = (() => {
    const freq: Record<string, number> = {};
    for (const c of combats) {
      if (c.resultat === 'victoire' && c.technique) {
        freq[c.technique] = (freq[c.technique] || 0) + 1;
      }
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  // ── Méthodes de victoire (soumission/points/decision/ko/abandon) ──
  const methodsBreakdown = (() => {
    const labels: Record<string, string> = {
      soumission: 'Soumission',
      points: 'Points',
      decision: 'Décision',
      ko: 'KO',
      tko: 'TKO',
      abandon: 'Abandon',
      forfait: 'Forfait',
    };
    const counts: Record<string, number> = {};
    let totalWins = 0;
    for (const c of combats) {
      if (c.resultat === 'victoire' && c.methode) {
        counts[c.methode] = (counts[c.methode] || 0) + 1;
        totalWins++;
      }
    }
    return Object.entries(counts)
      .map(([key, count]) => ({
        key,
        label: labels[key] || key,
        count,
        pct: totalWins > 0 ? Math.round((count / totalWins) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  })();

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title={t('palmares.title')} showBack />
        <View style={{ flex: 1, padding: 16 }}>
          <SkeletonGrid count={4} cardHeight={140} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title={t('palmares.title')} showBack />

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
            <Trophy size={32} color={colors.accentText} />
            <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
              {t('palmares.recordTitle')}
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
                {t('palmares.stats.victories')}
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
                {t('palmares.stats.defeats')}
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
                {t('palmares.stats.draws')}
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
                {t('palmares.winRate', { rate: winRate.toFixed(1) })}
              </Text>
            </View>
          )}
        </View>

        {/* ── STREAK + DERNIER COMBAT ── */}
        {totalFights > 0 && (
          <View style={{
            backgroundColor: colors.backgroundCard,
            borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12,
            borderLeftWidth: 4,
            borderLeftColor: currentStreak?.type === 'victoire' ? '#22C55E' : currentStreak?.type === 'defaite' ? '#EF4444' : colors.accent,
          }}>
            {currentStreak && currentStreak.count >= 2 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 18 }}>{currentStreak.type === 'victoire' ? '🔥' : '⚠️'}</Text>
                <Text style={{
                  fontSize: 14, fontWeight: '900',
                  color: currentStreak.type === 'victoire' ? '#22C55E' : '#EF4444',
                  letterSpacing: -0.2,
                }}>
                  {currentStreak.count} {currentStreak.type === 'victoire' ? 'victoires' : 'défaites'} d'affilée
                </Text>
              </View>
            )}
            {lastCombat && (
              <View>
                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4, marginBottom: 4 }}>
                  DERNIER COMBAT
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                      {lastCombat.resultat === 'victoire' ? '✓' : lastCombat.resultat === 'defaite' ? '✗' : '='} {lastCombat.adversaire_nom || 'Adversaire inconnu'}
                    </Text>
                    {lastCombat.adversaire_club && (
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' }} numberOfLines={1}>
                        {lastCombat.adversaire_club}
                      </Text>
                    )}
                    {(lastCombat.methode || lastCombat.technique) && (
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
                        {lastCombat.methode}{lastCombat.technique ? ` · ${lastCombat.technique}` : ''}{lastCombat.temps ? ` · ${lastCombat.temps}` : ''}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                    {(() => {
                      try {
                        const days = Math.floor((Date.now() - new Date(lastCombat.date).getTime()) / 86400000);
                        if (days === 0) return "aujourd'hui";
                        if (days === 1) return 'hier';
                        if (days < 7) return `il y a ${days}j`;
                        if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
                        return `il y a ${Math.floor(days / 30)} mois`;
                      } catch { return ''; }
                    })()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── TOP TECHNIQUES DE FINITION ── */}
        {topTechniques.length > 0 && (
          <View style={{
            backgroundColor: colors.backgroundCard,
            borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Award size={16} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.3 }}>
                TES FINITIONS PRÉFÉRÉES
              </Text>
            </View>
            {topTechniques.map(([tech, count], i) => {
              const maxCount = topTechniques[0][1];
              const pct = (count / maxCount) * 100;
              const colorTint = ['#F59E0B', '#3B82F6', '#22C55E', '#A855F7', '#EC4899'][i] || '#64748B';
              return (
                <View key={tech} style={{ marginBottom: i < topTechniques.length - 1 ? 8 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      {i === 0 ? '🏆 ' : ''}{tech}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: colorTint }}>×{count}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colorTint, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── MÉTHODES DE VICTOIRE (distribution) ── */}
        {methodsBreakdown.length > 0 && (
          <View style={{
            backgroundColor: colors.backgroundCard,
            borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Target size={16} color="#A855F7" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.3 }}>
                MÉTHODES DE VICTOIRE
              </Text>
            </View>
            {/* Barre stacked */}
            <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10, backgroundColor: colors.border }}>
              {methodsBreakdown.map((m, i) => {
                const c = ['#22C55E', '#3B82F6', '#A855F7', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444'][i] || '#64748B';
                return <View key={m.key} style={{ width: `${m.pct}%`, backgroundColor: c }} />;
              })}
            </View>
            {/* Légende */}
            <View style={{ gap: 6 }}>
              {methodsBreakdown.map((m, i) => {
                const c = ['#22C55E', '#3B82F6', '#A855F7', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444'][i] || '#64748B';
                return (
                  <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
                      <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '600' }}>{m.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: c }}>{m.pct}%</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>({m.count})</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
                { color: filter === 'all' ? colors.textOnAccent : colors.textPrimary },
              ]}
            >
              {t('palmares.filter.all', { count: combats.length })}
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
              {t('palmares.filter.victories', { count: record.victoires })}
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
              {t('palmares.filter.defeats', { count: record.defaites })}
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
                      {t('palmares.fight.number', { num: filteredCombats.length - index })}
                    </Text>
                    <View style={styles.fightDate}>
                      <Calendar size={14} color={colors.textMuted} />
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        {new Date(combat.date).toLocaleDateString(locale, {
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
                        ? t('palmares.result.victory')
                        : combat.resultat === 'defaite'
                        ? t('palmares.result.defeat')
                        : t('palmares.result.draw')}
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
                  ? t('palmares.empty.title.all')
                  : filter === 'victoire'
                  ? t('palmares.empty.title.victories')
                  : filter === 'defaite'
                  ? t('palmares.empty.title.defeats')
                  : t('palmares.empty.title.draws')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted, marginBottom: SPACING.xl }]}>
                {filter === 'all'
                  ? t('palmares.empty.description.all')
                  : t('palmares.empty.description.filtered')}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: colors.accent }]}
                  onPress={handleAddCombat}
                  accessibilityLabel="Ajouter un combat"
                  accessibilityRole="button"
                >
                  <Plus size={20} color={colors.textOnAccent} />
                  <Text style={[styles.emptyStateButtonText, { color: colors.textOnAccent }]}>{t('palmares.empty.button')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
        <PremiumTeaser variant="detail" title="Palmarès complet" />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleAddCombat}
        activeOpacity={0.8}
        accessibilityLabel="Ajouter un combat"
        accessibilityRole="button"
      >
        <Plus size={24} color={colors.textOnAccent} />
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
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
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
