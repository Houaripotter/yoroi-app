import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, RotateCcw, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';

interface WorkoutSummaryModalProps {
  visible: boolean;
  mode: string;
  onClose: () => void;
  onSave: () => void;
  onRestart: () => void;
  stats: {
    totalTime?: number;
    rounds?: number;
    sets?: number;
    series?: number;
    calories?: number;
    forTimeResult?: number; // Pour FOR TIME
    amrapRounds?: number; // Pour AMRAP
  };
}

export function WorkoutSummaryModal({
  visible,
  mode,
  onClose,
  onSave,
  onRestart,
  stats,
}: WorkoutSummaryModalProps) {
  const { colors, isDark } = useTheme();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'musculation':
        return 'Musculation terminée !';
      case 'combat':
        return 'Combat terminé !';
      case 'tabata':
        return 'Tabata terminé !';
      case 'emom':
        return 'EMOM terminé !';
      case 'amrap':
        return 'AMRAP terminé !';
      case 'fortime':
        return 'For Time terminé !';
      default:
        return 'Entraînement terminé !';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.modal, { backgroundColor: colors.backgroundCard }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {getModeTitle()}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={[styles.statsContainer, { backgroundColor: colors.backgroundElevated }]}>
              {mode === 'fortime' && stats.forTimeResult !== undefined && (
                <View style={styles.statBlock}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Temps final</Text>
                  <Text style={[styles.statValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
                    {formatTime(stats.forTimeResult)}
                  </Text>
                </View>
              )}

              {mode === 'amrap' && stats.amrapRounds !== undefined && (
                <View style={styles.statBlock}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rounds complétés</Text>
                  <Text style={[styles.statValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
                    {stats.amrapRounds}
                  </Text>
                </View>
              )}

              {stats.totalTime !== undefined && mode !== 'fortime' && (
                <View style={styles.statBlock}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Durée totale</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {formatTime(stats.totalTime)}
                  </Text>
                </View>
              )}

              {stats.rounds !== undefined && (
                <View style={styles.statBlock}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rounds</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {stats.rounds}/{stats.rounds}
                  </Text>
                </View>
              )}

              {stats.sets !== undefined && stats.sets > 1 && (
                <View style={styles.statBlock}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sets</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {stats.sets}
                  </Text>
                </View>
              )}

              {stats.series !== undefined && (
                <View style={styles.statBlock}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Séries</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {stats.series}
                  </Text>
                </View>
              )}

              {stats.calories !== undefined && (
                <View style={styles.statBlock}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calories (est.)</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {stats.calories} kcal
                  </Text>
                </View>
              )}
            </View>

            {/* Message */}
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Excellent travail ! Continue comme ça
            </Text>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.restartButton, { borderColor: colors.border }]}
                onPress={onRestart}
              >
                <RotateCcw size={20} color={colors.textPrimary} />
                <Text style={[styles.restartText, { color: colors.textPrimary }]}>
                  Recommencer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent }]}
                onPress={onSave}
              >
                <Check size={20} color={colors.textOnAccent} />
                <Text style={[styles.saveText, { color: colors.textOnAccent }]}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modal: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT.size.xxl,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  statsContainer: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  statBlock: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT.size.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT.size.xxxl,
    fontWeight: '900',
  },
  message: {
    fontSize: FONT.size.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  restartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 2,
  },
  restartText: {
    fontSize: FONT.size.md,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.full,
  },
  saveText: {
    fontSize: FONT.size.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
