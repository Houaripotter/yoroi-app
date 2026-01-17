// ============================================
// ⏱️ YOROI - WIDGET COUNTDOWN COMPÉTITION
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Clock, Trophy, MapPin, Calendar, Scale } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { getNextCompetition } from '@/lib/fighterModeService';
import { Competition, calculateDaysUntil, SPORT_ICONS } from '@/lib/fighterMode';
import { SPACING, RADIUS } from '@/constants/appTheme';

export function CompetitionCountdownWidget() {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const [nextCompetition, setNextCompetition] = useState<Competition | null>(null);
  const [daysUntil, setDaysUntil] = useState<number>(0);

  useEffect(() => {
    loadNextCompetition();

    // Update countdown every hour
    const interval = setInterval(() => {
      if (nextCompetition) {
        setDaysUntil(calculateDaysUntil(nextCompetition.date));
      }
    }, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, []);

  const loadNextCompetition = async () => {
    const comp = await getNextCompetition();
    if (comp) {
      setNextCompetition(comp);
      setDaysUntil(calculateDaysUntil(comp.date));
    }
  };

  const handlePress = () => {
    if (!nextCompetition) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/competitions');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/competition-detail?id=${nextCompetition.id}`);
  };

  // No competition case
  if (!nextCompetition) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.backgroundCard }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: `${colors.textMuted}20` },
            ]}
          >
            <Trophy size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune compétition
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Ajoute ta prochaine compétition
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const isUrgent = daysUntil <= 7 && daysUntil > 0;
  const isToday = daysUntil === 0;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.backgroundCard }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.sportIconContainer,
              { backgroundColor: `${colors.accent}20` },
            ]}
          >
            <Text style={styles.sportIcon}>
              {SPORT_ICONS[nextCompetition.sport as keyof typeof SPORT_ICONS] || ''}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Prochaine compétition
            </Text>
            <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
              {nextCompetition.nom}
            </Text>
          </View>
        </View>
      </View>

      {/* Countdown */}
      <View
        style={[
          styles.countdownContainer,
          {
            backgroundColor: isToday
              ? '#FF6B6B20'
              : isUrgent
              ? '#FFA50020'
              : `${colors.accent}20`,
          },
        ]}
      >
        <Clock
          size={32}
          color={
            isToday ? '#FF6B6B' : isUrgent ? '#FFA500' : colors.accent
          }
        />
        <View style={styles.countdownText}>
          <Text
            style={[
              styles.countdownLabel,
              {
                color: isToday
                  ? '#FF6B6B'
                  : isUrgent
                  ? '#FFA500'
                  : colors.accent,
              },
            ]}
          >
            {isToday
              ? "C'est aujourd'hui !"
              : daysUntil < 0
              ? 'Terminée'
              : `J-${daysUntil}`}
          </Text>
          <Text
            style={[
              styles.countdownValue,
              {
                color: isToday
                  ? '#FF6B6B'
                  : isUrgent
                  ? '#FFA500'
                  : colors.textPrimary,
              },
            ]}
          >
            {isToday
              ? 'Bonne chance !'
              : daysUntil === 1
              ? 'Demain'
              : daysUntil < 0
              ? 'Compétition passée'
              : `${daysUntil} jours`}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        {/* Date */}
        <View style={styles.detailRow}>
          <Calendar size={16} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textMuted }]}>
            {new Date(nextCompetition.date).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Location */}
        {nextCompetition.lieu && (
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textMuted }]}>
              {nextCompetition.lieu}
            </Text>
          </View>
        )}

        {/* Weight Category */}
        {nextCompetition.categorie_poids && (
          <View style={styles.detailRow}>
            <Scale size={16} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textMuted }]}>
              {nextCompetition.categorie_poids}
              {nextCompetition.poids_max && ` (-${nextCompetition.poids_max}kg)`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },

  // Header
  header: {
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportIcon: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  competitionName: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Countdown
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  countdownText: {
    flex: 1,
  },
  countdownLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  countdownValue: {
    fontSize: 20,
    fontWeight: '900',
  },

  // Details
  details: {
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: 13,
    textTransform: 'capitalize',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 13,
  },
});
