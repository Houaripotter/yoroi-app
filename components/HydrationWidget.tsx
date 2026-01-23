// ============================================
// 💧 YOROI - WIDGET HYDRATATION
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Droplet, Plus } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import {
  getTotalHydratationToday,
  addHydratation,
} from '@/lib/fighterModeService';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

const DAILY_GOAL_ML = 3000; // 3 liters per day
const QUICK_ADD_AMOUNTS = [250, 500, 750]; // in ml

interface HydrationWidgetProps {
  onPress?: () => void;
}

export function HydrationWidget({ onPress }: HydrationWidgetProps) {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [totalToday, setTotalToday] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadHydration();
  }, []);

  const loadHydration = async () => {
    const total = await getTotalHydratationToday();
    setTotalToday(total);
  };

  const handleQuickAdd = async (amount: number) => {
    if (isAdding) return;

    setIsAdding(true);
    impactAsync(ImpactFeedbackStyle.Light);

    try {
      await addHydratation(amount, 'eau');
      setTotalToday((prev) => prev + amount);
    } catch (error) {
      logger.error('Error adding hydration:', error);
      showPopup('Erreur', 'Impossible d\'ajouter l\'hydratation', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsAdding(false);
    }
  };

  const percentage = Math.min((totalToday / DAILY_GOAL_ML) * 100, 100);
  const isGoalReached = totalToday >= DAILY_GOAL_ML;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.backgroundCard }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isGoalReached
                  ? '#0ABAB520'
                  : `${colors.accent}20`,
              },
            ]}
          >
            <Droplet
              size={20}
              color={isGoalReached ? '#0ABAB5' : colors.accent}
              fill={isGoalReached ? '#0ABAB5' : 'transparent'}
            />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Hydratation
          </Text>
        </View>
        {isGoalReached && <Text style={styles.goalBadge}>✓</Text>}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: isGoalReached ? '#0ABAB5' : colors.accent,
              },
            ]}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {(totalToday / 1000).toFixed(2)} L
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Aujourd'hui
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textMuted }]}>
            {(DAILY_GOAL_ML / 1000).toFixed(2)} L
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Objectif
          </Text>
        </View>
      </View>

      {/* Quick Add Buttons */}
      <View style={styles.quickAddContainer}>
        <Text style={[styles.quickAddLabel, { color: colors.textMuted }]}>
          Ajout rapide
        </Text>
        <View style={styles.quickAddButtons}>
          {QUICK_ADD_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickAddButton,
                {
                  backgroundColor: colors.background,
                  opacity: isAdding ? 0.5 : 1,
                },
              ]}
              onPress={() => handleQuickAdd(amount)}
              disabled={isAdding}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.accentText} />
              <Text style={[styles.quickAddText, { color: colors.textPrimary }]}>
                {amount} ml
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <PopupComponent />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalBadge: {
    fontSize: 20,
  },

  // Progress
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Stats
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Quick Add
  quickAddContainer: {
    gap: SPACING.sm,
  },
  quickAddLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickAddButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
