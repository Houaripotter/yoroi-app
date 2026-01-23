// ============================================
// YOROI - DÉTAIL COMPÉTITION
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Calendar,
  MapPin,
  Trophy,
  Clock,
  Edit,
  Trash2,
  Plus,
  TrendingDown,
  Scale,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import {
  getCompetitionById,
  deleteCompetition,
  getCombatsByCompetition,
} from '@/lib/fighterModeService';
import {
  Competition,
  Combat,
  calculateDaysUntil,
  SPORT_ICONS,
  SPORT_LABELS,
} from '@/lib/fighterMode';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

export default function CompetitionDetailScreen() {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const params = useLocalSearchParams<{ id?: string }>();
  const competitionId = params.id ?? '';
  const { showPopup, PopupComponent } = useCustomPopup();

  const [competition, setCompetition] = useState
  const [isNavigating, setIsNavigating] = useState(false);<Competition | null>(null);
  const [combats, setCombats] = useState
  const [isNavigating, setIsNavigating] = useState(false);<Combat[]>([]);
  const [loading, setLoading] = useState
  const [isNavigating, setIsNavigating] = useState(false);(true);
  const [isDeleting, setIsDeleting] = useState
  const [isNavigating, setIsNavigating] = useState(false);(false);
  const [isNavigating, setIsNavigating] = useState
  const [isNavigating, setIsNavigating] = useState(false);(false);

  useEffect(() => {
    loadCompetitionData();
  }, [competitionId]);

  const loadCompetitionData = async () => {
    // Validation du paramètre
    if (!competitionId || isNaN(parseInt(competitionId))) {
      showPopup('Erreur', 'Compétition non trouvée', [
        { text: 'OK', style: 'primary', onPress: () => { if (!isNavigating) { setIsNavigating(true); setTimeout(() => setIsNavigating(false), 1000); router.back(); } } }
      ]);
      setLoading(false);
      return;
    }

    try {
      const [comp, fights] = await Promise.all([
        getCompetitionById(parseInt(competitionId)),
        getCombatsByCompetition(parseInt(competitionId)),
      ]);

      setCompetition(comp);
      setCombats(fights);
    } catch (error) {
      logger.error('Error loading competition:', error);
      showPopup('Erreur', 'Impossible de charger la compétition', [
        { text: 'OK', style: 'primary', onPress: () => { if (!isNavigating) { setIsNavigating(true); setTimeout(() => setIsNavigating(false), 1000); router.back(); } } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (isDeleting) return;

    showPopup(
      'Supprimer la compétition',
      'Êtes-vous sûr de vouloir supprimer cette compétition ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (isDeleting) return;
            setIsDeleting(true);
            try {
              await deleteCompetition(parseInt(competitionId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (!isNavigating) { setIsNavigating(true); router.back(); }
            } catch (error) {
              logger.error('Error deleting competition:', error);
              showPopup('Erreur', 'Impossible de supprimer la compétition', [
                { text: 'OK', style: 'primary' }
              ]);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleAddFight = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/add-combat?competitionId=${competitionId}`);
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleEdit = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/edit-competition?id=${competitionId}`);
    setTimeout(() => setIsNavigating(false), 1000);
  };

  if (loading || !competition) {
    return (
      <ScreenWrapper>
        <Header title="Chargement..." showBack />
      </ScreenWrapper>
    );
  }

  const daysUntil = calculateDaysUntil(competition.date);
  const isUpcoming = daysUntil >= 0 && competition.statut === 'a_venir';
  const isPast = competition.statut === 'terminee';

  return (
    <ScreenWrapper>
      <Header
        title="Détail Compétition"
        showBack
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.headerButton}
            >
              <Edit size={20} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.headerButton}
            >
              <Trash2 size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.backgroundCard }]}>
          {/* Sport Icon */}
          <View
            style={[
              styles.sportIconLarge,
              {
                backgroundColor: isUpcoming
                  ? `${colors.accent}20`
                  : `${colors.textMuted}20`,
              },
            ]}
          >
            <Text style={styles.sportEmojiLarge}>
              {SPORT_ICONS[competition.sport as keyof typeof SPORT_ICONS] || ''}
            </Text>
          </View>

          {/* Competition Name */}
          <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
            {competition.nom}
          </Text>

          {/* Sport Label */}
          <Text style={[styles.sportLabel, { color: colors.textMuted }]}>
            {SPORT_LABELS[competition.sport as keyof typeof SPORT_LABELS]}
          </Text>

          {/* Date */}
          <View style={styles.dateRow}>
            <Calendar size={20} color={colors.accent} />
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {new Date(competition.date).toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Location */}
          {competition.lieu && (
            <View style={styles.locationRow}>
              <MapPin size={18} color={colors.textMuted} />
              <Text style={[styles.locationText, { color: colors.textMuted }]}>
                {competition.lieu}
              </Text>
            </View>
          )}

          {/* Countdown */}
          {isUpcoming && (
            <View style={[styles.countdownCard, { backgroundColor: colors.accent }]}>
              <Clock size={32} color="#FFFFFF" />
              <View style={styles.countdownText}>
                <Text style={styles.countdownLabel}>Dans</Text>
                <Text style={styles.countdownValue}>
                  {daysUntil === 0 ? "Aujourd'hui !" : `${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>
          )}

          {/* Status Badge */}
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
                ? 'À venir'
                : competition.statut === 'terminee'
                ? 'Terminée'
                : 'Annulée'}
            </Text>
          </View>
        </View>

        {/* Weight Category */}
        {competition.categorie_poids && (
          <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.sectionHeader}>
              <Scale size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Catégorie de poids
              </Text>
            </View>
            <View style={styles.weightInfo}>
              <Text style={[styles.weightCategory, { color: colors.textPrimary }]}>
                {competition.categorie_poids}
              </Text>
              {competition.poids_max && (
                <Text style={[styles.weightMax, { color: colors.textMuted }]}>
                  Maximum: {competition.poids_max} kg
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Fights Section */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.sectionHeader}>
            <Trophy size={20} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Combats ({combats.length})
            </Text>
          </View>

          {combats.length > 0 ? (
            <View style={styles.fightsList}>
              {combats.map((combat, index) => (
                <TouchableOpacity
                  key={combat.id}
                  style={[
                    styles.fightCard,
                    {
                      backgroundColor: colors.background,
                      borderLeftColor:
                        combat.resultat === 'victoire'
                          ? '#4CAF50'
                          : combat.resultat === 'defaite'
                          ? '#F44336'
                          : colors.textMuted,
                    },
                  ]}
                  onPress={() => router.push(`/combat-detail?id=${combat.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.fightHeader}>
                    <Text style={[styles.fightNumber, { color: colors.textMuted }]}>
                      Combat #{index + 1}
                    </Text>
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
                    <Text style={[styles.method, { color: colors.textMuted }]}>
                      {combat.methode.toUpperCase()}
                      {combat.technique && ` - ${combat.technique}`}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyFights}>
              <Trophy size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucun combat enregistré
              </Text>
            </View>
          )}

          {/* Add Fight Button */}
          <TouchableOpacity
            style={[styles.addFightButton, { backgroundColor: colors.accent }]}
            onPress={handleAddFight}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addFightText}>Ajouter un combat</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
        <PopupComponent />
      </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.xs,
  },

  // Header Card
  headerCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sportIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  sportEmojiLarge: {
    fontSize: 40,
  },
  competitionName: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  sportLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  locationText: {
    fontSize: 14,
  },
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  countdownText: {
    alignItems: 'flex-start',
  },
  countdownLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  countdownValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Section
  section: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Weight
  weightInfo: {
    gap: SPACING.xs,
  },
  weightCategory: {
    fontSize: 20,
    fontWeight: '800',
  },
  weightMax: {
    fontSize: 14,
  },

  // Fights
  fightsList: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  fightCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
  },
  fightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  fightNumber: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  method: {
    fontSize: 13,
  },
  emptyFights: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
  },
  addFightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  addFightText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
