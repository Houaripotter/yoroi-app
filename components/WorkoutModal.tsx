import { Modal, StyleSheet, Text, View, TouchableOpacity, Image, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { WorkoutType, WORKOUT_TYPES } from '@/types/workout';
import { theme } from '@/lib/theme';

interface WorkoutModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectWorkout: (type: WorkoutType) => void;
}

export function WorkoutModal({ visible, selectedDate, onClose, onSelectWorkout }: WorkoutModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Ajouter un entraînement</Text>
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.workoutOptions}>
            <TouchableOpacity
              style={styles.workoutCard}
              onPress={() => {
                onSelectWorkout('gracie_barra');
                onClose();
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.logoContainer, { backgroundColor: '#FEE2E2' }]}>
                <Image
                  source={WORKOUT_TYPES.gracie_barra.logo}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.workoutLabel}>{WORKOUT_TYPES.gracie_barra.label}</Text>
              <Text style={styles.workoutShortLabel}>{WORKOUT_TYPES.gracie_barra.shortLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.workoutCard}
              onPress={() => {
                onSelectWorkout('basic_fit');
                onClose();
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.logoContainer, { backgroundColor: theme.colors.orangePastel }]}>
                <Image
                  source={WORKOUT_TYPES.basic_fit.logo}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.workoutLabel}>{WORKOUT_TYPES.basic_fit.label}</Text>
              <Text style={styles.workoutShortLabel}>{WORKOUT_TYPES.basic_fit.shortLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xxl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  workoutOptions: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  workoutCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    gap: theme.spacing.md,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  logo: {
    width: 50,
    height: 50,
  },
  workoutLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  workoutShortLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
});
