import { Modal, StyleSheet, Text, View, TouchableOpacity, Image, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { WorkoutType, WORKOUT_TYPES } from '@/types/workout';
import { useTheme } from '@/lib/ThemeContext';

interface WorkoutModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectWorkout: (type: WorkoutType) => void;
}

export function WorkoutModal({ visible, selectedDate, onClose, onSelectWorkout }: WorkoutModalProps) {
  const { colors, themeName } = useTheme();
  const isWellness = false;

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
        <Pressable style={[
          styles.modalContainer,
          { backgroundColor: colors.card },
          isWellness && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
          }
        ]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Ajouter un entraînement</Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(selectedDate)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.workoutOptions}>
            <TouchableOpacity
              style={[styles.workoutCard, { backgroundColor: colors.cardHover }]}
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
              <Text style={[styles.workoutLabel, { color: colors.textPrimary }]}>{WORKOUT_TYPES.gracie_barra.label}</Text>
              <Text style={[styles.workoutShortLabel, { color: colors.textSecondary }]}>{WORKOUT_TYPES.gracie_barra.shortLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.workoutCard, { backgroundColor: colors.cardHover }]}
              onPress={() => {
                onSelectWorkout('basic_fit');
                onClose();
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.logoContainer, { backgroundColor: colors.warningLight }]}>
                <Image
                  source={WORKOUT_TYPES.basic_fit.logo}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.workoutLabel, { color: colors.textPrimary }]}>{WORKOUT_TYPES.basic_fit.label}</Text>
              <Text style={[styles.workoutShortLabel, { color: colors.textSecondary }]}>{WORKOUT_TYPES.basic_fit.shortLabel}</Text>
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
    padding: 24,
  },
  modalContainer: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 8,
  },
  workoutOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutCard: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 12,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 50,
    height: 50,
  },
  workoutLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  workoutShortLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
