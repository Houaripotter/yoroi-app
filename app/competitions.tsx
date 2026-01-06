// ============================================
// 🥊 YOROI - MES COMPÉTITIONS
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
import { Calendar, MapPin, Plus, Trophy, Clock, ChevronRight, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
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
  const { showPopup, PopupComponent } = useCustomPopup();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Competition[]>([]);
  const [pastCompetitions, setPastCompetitions] = useState<Competition[]>([]);
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
      const past = all.filter(c => c.date < today && c.statut === 'terminee');
      setPastCompetitions(past);
    } catch (error) {
      logger.error('Error loading competitions:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompetitions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompetitions();
    setRefreshing(false);
  };

  const handleImportCompetitions = async () => {
    try {
      const available = getAvailableCompetitionsCount();

      showPopup(
        'Importer les competitions',
        `Voulez-vous importer ${available.total} competitions IBJJF et CFJJB ?\n\n` +
        `- ${available.ibjjf} competitions IBJJF (2025-2026)\n` +
        `- ${available.cfjjb} competitions CFJJB (2026)`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Importer',
            style: 'primary',
            onPress: async () => {
              setImporting(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              try {
                const result = await importAllCompetitions();

                await loadCompetitions();

                showPopup(
                  'Import termine !',
                  `${result.total} competitions ajoutees\n\n` +
                  `IBJJF : ${result.ibjjf.imported} importees, ${result.ibjjf.skipped} deja presentes\n` +
                  `CFJJB : ${result.cfjjb.imported} importees, ${result.cfjjb.skipped} deja presentes`,
                  [{ text: 'OK', style: 'primary' }]
                );
              } catch (error) {
                showPopup('Erreur', 'Impossible d\'importer les competitions', [{ text: 'OK', style: 'primary' }]);
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      showPopup('Erreur', 'Une erreur est survenue', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleAddCompetition = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-competition');
  };

  const handleCompetitionPress = (competition: Competition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                {SPORT_ICONS[competition.sport as keyof typeof SPORT_ICONS] || '⚔️'}
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
            {new Date(competition.date).toLocaleDateString('fr-FR', {
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
              Catégorie:
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
                  ? "Aujourd'hui !"
                  : daysUntil > 0
                  ? `Dans ${daysUntil} jours`
                  : 'À venir'
                : competition.statut === 'terminee'
                ? 'Terminée'
                : 'Annulée'}
            </Text>
          </View>

          <ChevronRight size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <Header title="Mes Compétitions" showBack />

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
              Total
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Calendar size={24} color="#0ABAB5" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {upcomingCompetitions.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              À venir
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Clock size={24} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {pastCompetitions.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Passées
            </Text>
          </View>
        </View>

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
              {importing ? 'Import en cours...' : 'Importer les compétitions IBJJF & CFJJB'}
            </Text>
            <Text style={[styles.importSubtitle, { color: colors.textMuted }]}>
              {getAvailableCompetitionsCount().total} compétitions disponibles (2025-2026)
            </Text>
          </View>
          {!importing && <ChevronRight size={20} color={colors.textMuted} />}
        </TouchableOpacity>

        {/* Upcoming Competitions */}
        {upcomingCompetitions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Prochaines compétitions
            </Text>
            {upcomingCompetitions.map((comp) => renderCompetitionCard(comp))}
          </View>
        )}

        {/* Past Competitions */}
        {pastCompetitions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Historique
            </Text>
            {pastCompetitions.map((comp) => renderCompetitionCard(comp))}
          </View>
        )}

        {/* Empty State */}
        {competitions.length === 0 && (
          <View style={styles.emptyState}>
            <Trophy size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Aucune compétition
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Ajoute ta première compétition pour commencer ton suivi
            </Text>
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
