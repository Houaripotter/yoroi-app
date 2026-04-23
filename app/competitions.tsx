// ============================================
// YOROI - MES COMPÉTITIONS
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
import { Calendar, MapPin, Plus, Trophy, Clock, ChevronRight, Download } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { getCompetitions, getUpcomingCompetitions } from '@/lib/fighterModeService';
import { Competition, calculateDaysUntil, SPORT_ICONS } from '@/lib/fighterMode';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { importAllCompetitions, getAvailableCompetitionsCount } from '@/lib/importCompetitionsService';
import { useCustomPopup } from '@/components/CustomPopup';
import logger from '@/lib/security/logger';

export default function CompetitionsScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Competition[]>([]);
  const [pastCompetitions, setPastCompetitions] = useState<Competition[]>([]);
  const [cancelledCompetitions, setCancelledCompetitions] = useState<Competition[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadCompetitions = async () => {
    try {
      const [all, upcoming] = await Promise.all([
        getCompetitions(),
        getUpcomingCompetitions(),
      ]);

      setCompetitions(all);
      setUpcomingCompetitions(upcoming);

      const today = new Date().toISOString().split('T')[0];
      // Toutes les compétitions passées (quel que soit le statut) + terminées futures
      const past = all.filter(c => c.date < today || c.statut === 'terminee');
      // Compétitions annulées non encore passées (dates futures annulées)
      const cancelled = all.filter(c => c.statut === 'annulee' && c.date >= today);
      setPastCompetitions(past);
      setCancelledCompetitions(cancelled);
    } catch (error) {
      logger.error('Error loading competitions:', error);
    }
  };

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadCompetitions(); }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', loadCompetitions);
    return () => sub.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompetitions();
    setRefreshing(false);
  };

  const handleImportCompetitions = async () => {
    try {
      const available = getAvailableCompetitionsCount();

      showPopup(
        t('competitions.importTitle'),
        t('competitions.importMessage', {
          total: available.total,
          ibjjf: available.ibjjf,
          cfjjb: available.cfjjb
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('competitions.import'),
            style: 'primary',
            onPress: async () => {
              setImporting(true);
              impactAsync(ImpactFeedbackStyle.Medium);

              try {
                const result = await importAllCompetitions();

                await loadCompetitions();

                showPopup(
                  t('competitions.importComplete'),
                  t('competitions.importResults', {
                    total: result.total,
                    ibjjfImported: result.ibjjf.imported,
                    ibjjfSkipped: result.ibjjf.skipped,
                    cfjjbImported: result.cfjjb.imported,
                    cfjjbSkipped: result.cfjjb.skipped
                  }),
                  [{ text: t('common.ok'), style: 'primary' }]
                );
              } catch (error) {
                showPopup(t('common.error'), t('competitions.importError'), [{ text: t('common.ok'), style: 'primary' }]);
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      showPopup(t('common.error'), t('competitions.errorOccurred'), [{ text: t('common.ok'), style: 'primary' }]);
    }
  };

  const handleAddCompetition = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    router.push('/add-competition');
  };

  const handleCompetitionPress = (competition: Competition) => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push(`/competition-detail?id=${competition.id}`);
  };

  const renderCompetitionCard = (competition: Competition) => {
    const daysUntil = calculateDaysUntil(competition.date);
    const isUpcoming = daysUntil >= 0 && competition.statut === 'a_venir';
    const isPast = competition.statut === 'terminee';

    return (
      <TouchableOpacity
        key={competition.id}
        style={[
          styles.competitionCard,
          { backgroundColor: colors.backgroundCard, borderColor: colors.border },
        ]}
        onPress={() => handleCompetitionPress(competition)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.sportIcon,
                {
                  backgroundColor: isUpcoming
                    ? `${colors.accent}20`
                    : `${colors.textMuted}20`,
                },
              ]}
            >
              <Text style={styles.sportEmoji}>
                {SPORT_ICONS[competition.sport as keyof typeof SPORT_ICONS] || ''}
              </Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
                {competition.nom}
              </Text>
              {competition.lieu && (
                <View style={styles.locationRow}>
                  <MapPin size={12} color={colors.textMuted} />
                  <Text style={[styles.locationText, { color: colors.textMuted }]}>
                    {competition.lieu}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {isUpcoming && daysUntil <= 30 && (
            <View style={[styles.urgentBadge, { backgroundColor: colors.accent }]}>
              <Clock size={12} color={colors.textOnGold} />
              <Text style={[styles.urgentText, { color: colors.textOnGold }]}>J-{daysUntil}</Text>
            </View>
          )}
        </View>

        {/* Date */}
        <View style={styles.cardDate}>
          <Calendar size={16} color={colors.accent} />
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {new Date(competition.date).toLocaleDateString(locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Category */}
        {competition.categorie_poids && (
          <View style={styles.categoryRow}>
            <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
              {t('competitions.category')}
            </Text>
            <Text style={[styles.categoryValue, { color: colors.textPrimary }]}>
              {competition.categorie_poids}
              {competition.poids_max && ` (-${competition.poids_max}kg)`}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isPast
                  ? `${colors.textMuted}20`
                  : `${colors.accent}20`,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isPast ? colors.textMuted : colors.accent },
              ]}
            >
              {competition.statut === 'a_venir'
                ? daysUntil === 0
                  ? t('competitions.today')
                  : daysUntil > 0
                  ? t('competitions.inDays', { days: daysUntil })
                  : t('competitions.upcoming')
                : competition.statut === 'terminee'
                ? t('competitions.completed')
                : t('competitions.cancelled')}
            </Text>
          </View>

          <ChevronRight size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <Header title={t('competitions.title')} showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Header */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Trophy size={24} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {competitions.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('competitions.total')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Calendar size={24} color="#0ABAB5" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {upcomingCompetitions.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('competitions.upcoming')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Clock size={24} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {pastCompetitions.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('competitions.past')}
            </Text>
          </View>
        </View>

        {/* ── PROCHAINE COMPÉTITION HIGHLIGHT (countdown) ── */}
        {upcomingCompetitions.length > 0 && (() => {
          const next = [...upcomingCompetitions].sort((a, b) => a.date.localeCompare(b.date))[0];
          const daysUntil = calculateDaysUntil(next.date);
          // Couleur urgence selon jours restants
          const urgencyColor = daysUntil <= 7 ? '#EF4444' : daysUntil <= 30 ? '#F59E0B' : '#22C55E';
          const urgencyLabel = daysUntil === 0 ? "C'EST AUJOURD'HUI" : daysUntil <= 7 ? 'URGENT' : daysUntil <= 30 ? 'BIENTÔT' : 'DANS LONGTEMPS';
          return (
            <View style={{
              marginHorizontal: 16, marginBottom: 12,
              borderRadius: 18, padding: 16,
              backgroundColor: colors.backgroundCard,
              borderLeftWidth: 5, borderLeftColor: urgencyColor,
              shadowColor: urgencyColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Trophy size={14} color={urgencyColor} />
                  <Text style={{ fontSize: 11, fontWeight: '900', color: urgencyColor, letterSpacing: 0.5 }}>
                    PROCHAINE COMPÉTITION
                  </Text>
                </View>
                <View style={{ backgroundColor: urgencyColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>{urgencyLabel}</Text>
                </View>
              </View>

              {/* Nom + date countdown */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{
                  width: 72, height: 72, borderRadius: 16,
                  backgroundColor: urgencyColor + '20',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: urgencyColor,
                }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: urgencyColor, letterSpacing: -1 }}>
                    {daysUntil >= 0 ? daysUntil : '·'}
                  </Text>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: urgencyColor, letterSpacing: 0.4 }}>
                    {daysUntil > 1 ? 'JOURS' : 'JOUR'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.3 }} numberOfLines={2}>
                    {next.nom}
                  </Text>
                  {next.lieu && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <MapPin size={11} color={colors.textMuted} />
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }} numberOfLines={1}>
                        {next.lieu}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Calendar size={11} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                      {(() => {
                        try {
                          return new Date(next.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        } catch { return next.date; }
                      })()}
                    </Text>
                  </View>
                  {next.categorie_poids && (
                    <View style={{ marginTop: 6, alignSelf: 'flex-start', backgroundColor: colors.accent + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>
                        Catégorie {next.categorie_poids}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Conseil contextuel selon urgence */}
              {daysUntil <= 7 && daysUntil > 0 && (
                <View style={{ marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: '#EF444415', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#EF4444' }}>
                    Coupe de poids et revue technique en cours · bonne chance !
                  </Text>
                </View>
              )}
              {daysUntil > 7 && daysUntil <= 30 && (
                <View style={{ marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: '#F59E0B15', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>
                    Phase d'intensification : drill technique + sparring sélectifs.
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Import Button */}
        <TouchableOpacity
          style={[
            styles.importCard,
            { backgroundColor: colors.backgroundCard, borderColor: colors.accent }
          ]}
          onPress={handleImportCompetitions}
          disabled={importing}
          activeOpacity={0.7}
        >
          <View style={styles.importIcon}>
            <Download size={24} color={importing ? colors.textMuted : colors.accent} />
          </View>
          <View style={styles.importContent}>
            <Text style={[styles.importTitle, { color: colors.textPrimary }]}>
              {importing ? t('competitions.importing') : t('competitions.importButtonText')}
            </Text>
            <Text style={[styles.importSubtitle, { color: colors.textMuted }]}>
              {t('competitions.availableCompetitions', { count: getAvailableCompetitionsCount().total })}
            </Text>
          </View>
          {!importing && <ChevronRight size={20} color={colors.textMuted} />}
        </TouchableOpacity>

        {/* Upcoming Competitions */}
        {upcomingCompetitions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('competitions.upcoming')}
            </Text>
            {upcomingCompetitions.map((comp) => renderCompetitionCard(comp))}
          </View>
        )}

        {/* Past Competitions */}
        {pastCompetitions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('competitions.history')}
            </Text>
            {pastCompetitions.map((comp) => renderCompetitionCard(comp))}
          </View>
        )}

        {/* Cancelled Competitions */}
        {cancelledCompetitions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {t('competitions.cancelled')}
            </Text>
            {cancelledCompetitions.map((comp) => renderCompetitionCard(comp))}
          </View>
        )}

        {/* Empty State */}
        {competitions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.accent + '22' }]}>
              <Trophy size={56} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {t('competitions.noCompetitions')}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('competitions.emptyMessage')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyCTA, { backgroundColor: colors.accent }]}
              onPress={handleAddCompetition}
              activeOpacity={0.8}
            >
              <Plus size={18} color={colors.textOnGold} />
              <Text style={[styles.emptyCTAText, { color: colors.textOnGold }]}>
                {t('competitions.addFirst') || 'Ajouter ma première compétition'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleAddCompetition}
        activeOpacity={0.8}
      >
        <Plus size={24} color={colors.textOnGold} />
      </TouchableOpacity>
      <PopupComponent />
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
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  competitionCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    gap: SPACING.md,
    flex: 1,
  },
  sportIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportEmoji: {
    fontSize: 24,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  competitionName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  categoryLabel: {
    fontSize: 13,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
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
    paddingHorizontal: SPACING.lg,
  },
  emptyIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCTA: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  emptyCTAText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: SPACING.md,
  },
  importIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importContent: {
    flex: 1,
  },
  importTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  importSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
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
