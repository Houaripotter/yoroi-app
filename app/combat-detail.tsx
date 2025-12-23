// ============================================
// 🥊 YOROI - DÉTAIL COMBAT
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Calendar,
  Trophy,
  Trash2,
  User,
  Building2,
  Scale,
  Clock,
  FileText,
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import {
  getCombatById,
  deleteCombat,
  getCompetitionById,
} from '@/lib/fighterModeService';
import { Combat, Competition } from '@/lib/fighterMode';
import { SPACING, RADIUS } from '@/constants/appTheme';

export default function CombatDetailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const combatId = params.id as string;

  const [combat, setCombat] = useState<Combat | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCombatData();
  }, [combatId]);

  const loadCombatData = async () => {
    try {
      const fightData = await getCombatById(parseInt(combatId));
      setCombat(fightData);

      if (fightData?.competition_id) {
        const compData = await getCompetitionById(fightData.competition_id);
        setCompetition(compData);
      }
    } catch (error) {
      console.error('Error loading combat:', error);
      Alert.alert('Erreur', 'Impossible de charger le combat');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le combat',
      'Êtes-vous sûr de vouloir supprimer ce combat ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCombat(parseInt(combatId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              console.error('Error deleting combat:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le combat');
            }
          },
        },
      ]
    );
  };

  if (loading || !combat) {
    return (
      <ScreenWrapper>
        <Header title="Chargement..." showBack />
      </ScreenWrapper>
    );
  }

  const resultColor =
    combat.resultat === 'victoire'
      ? '#4CAF50'
      : combat.resultat === 'defaite'
      ? '#F44336'
      : colors.textMuted;

  const ResultIcon =
    combat.resultat === 'victoire'
      ? TrendingUp
      : combat.resultat === 'defaite'
      ? TrendingDown
      : Minus;

  return (
    <ScreenWrapper>
      <Header
        title="Détail Combat"
        showBack
        rightElement={
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Trash2 size={20} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Result Header */}
        <View
          style={[styles.resultHeader, { backgroundColor: `${resultColor}20` }]}
        >
          <View style={[styles.resultIconContainer, { backgroundColor: resultColor }]}>
            <ResultIcon size={40} color="#FFFFFF" />
          </View>
          <Text style={[styles.resultTitle, { color: resultColor }]}>
            {combat.resultat === 'victoire'
              ? 'Victoire'
              : combat.resultat === 'defaite'
              ? 'Défaite'
              : 'Match Nul'}
          </Text>
          {combat.methode && (
            <Text style={[styles.methodeLabel, { color: resultColor }]}>
              par {combat.methode.toUpperCase()}
            </Text>
          )}
        </View>

        {/* Competition Link */}
        {competition && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.push(`/competition-detail?id=${competition.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Trophy size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Compétition
              </Text>
            </View>
            <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
              {competition.nom}
            </Text>
          </TouchableOpacity>
        )}

        {/* Date */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Date
            </Text>
          </View>
          <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
            {new Date(combat.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Opponent */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Adversaire
            </Text>
          </View>
          <Text style={[styles.opponentName, { color: colors.textPrimary }]}>
            {combat.adversaire_nom || 'Non renseigné'}
          </Text>
          {combat.adversaire_club && (
            <View style={styles.clubRow}>
              <Building2 size={16} color={colors.textMuted} />
              <Text style={[styles.clubText, { color: colors.textMuted }]}>
                {combat.adversaire_club}
              </Text>
            </View>
          )}
        </View>

        {/* Method & Technique */}
        {combat.technique && (
          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.cardHeader}>
              <Zap size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Technique
              </Text>
            </View>
            <Text style={[styles.techniqueValue, { color: colors.textPrimary }]}>
              {combat.technique}
            </Text>
          </View>
        )}

        {/* Round & Time */}
        {(combat.round || combat.temps) && (
          <View style={styles.row}>
            {combat.round && (
              <View
                style={[
                  styles.card,
                  { flex: 1, backgroundColor: colors.backgroundCard },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Target size={20} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Round
                  </Text>
                </View>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                  {combat.round}
                </Text>
              </View>
            )}

            {combat.temps && (
              <View
                style={[
                  styles.card,
                  { flex: 1, backgroundColor: colors.backgroundCard },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Clock size={20} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Temps
                  </Text>
                </View>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                  {combat.temps}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Weights */}
        {(combat.poids_pesee || combat.poids_jour_j) && (
          <View style={styles.row}>
            {combat.poids_pesee && (
              <View
                style={[
                  styles.card,
                  { flex: 1, backgroundColor: colors.backgroundCard },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Scale size={20} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Pesée
                  </Text>
                </View>
                <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
                  {combat.poids_pesee} kg
                </Text>
              </View>
            )}

            {combat.poids_jour_j && (
              <View
                style={[
                  styles.card,
                  { flex: 1, backgroundColor: colors.backgroundCard },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Scale size={20} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Jour J
                  </Text>
                </View>
                <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
                  {combat.poids_jour_j} kg
                </Text>
                {combat.poids_pesee && (
                  <Text style={[styles.weightDiff, { color: colors.textMuted }]}>
                    {combat.poids_jour_j > combat.poids_pesee ? '+' : ''}
                    {(combat.poids_jour_j - combat.poids_pesee).toFixed(1)} kg
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {combat.notes && (
          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.cardHeader}>
              <FileText size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Notes
              </Text>
            </View>
            <Text style={[styles.notesText, { color: colors.textMuted }]}>
              {combat.notes}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
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
  headerButton: {
    padding: SPACING.xs,
  },

  // Result Header
  resultHeader: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  resultIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: SPACING.xs,
  },
  methodeLabel: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Cards
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Competition
  competitionName: {
    fontSize: 17,
    fontWeight: '800',
  },

  // Opponent
  opponentName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  clubText: {
    fontSize: 14,
  },

  // Technique
  techniqueValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Weights
  weightValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  weightDiff: {
    fontSize: 13,
    marginTop: SPACING.xs,
  },

  // Notes
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Row
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
