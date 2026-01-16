import { useState, useEffect } from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import { WorkoutType, WORKOUT_TYPES } from '@/types/workout';
import { useTheme } from '@/lib/ThemeContext';

interface ActivityModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectActivity: (types: WorkoutType[]) => Promise<void>;
  currentActivities?: WorkoutType[];
}

export function ActivityModal({ visible, selectedDate, onClose, onSelectActivity, currentActivities = [] }: ActivityModalProps) {
  const { colors, themeName } = useTheme();
  const isWellness = false;
  const [selectedActivities, setSelectedActivities] = useState<WorkoutType[]>(currentActivities);

  // Synchroniser l'état interne avec les activités actuelles quand la modal s'ouvre
  useEffect(() => {
    if (visible) {
      setSelectedActivities(currentActivities);
    }
  }, [visible, currentActivities]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const handleActivityToggle = (type: WorkoutType) => {
    setSelectedActivities(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleValidate = async () => {
    // Attendre que la sauvegarde soit terminée avant de fermer la modal
    await onSelectActivity(selectedActivities);
    setSelectedActivities([]);
    onClose();
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
              <Text style={[styles.title, { color: colors.textPrimary }]}>Qu'as-tu fait le</Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(selectedDate)} ?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.activitiesContainer}>
            <TouchableOpacity
              style={[
                styles.activityButton,
                { backgroundColor: colors.cardHover },
                selectedActivities.includes('basic_fit') && styles.activityButtonSelected
              ]}
              onPress={() => handleActivityToggle('basic_fit')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.activityEmoji}></Text>
              </View>
              <Text style={[
                styles.activityLabel,
                { color: colors.textPrimary },
                selectedActivities.includes('basic_fit') && styles.activityLabelSelected
              ]}>Musculation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.activityButton,
                { backgroundColor: colors.cardHover },
                selectedActivities.includes('gracie_barra') && styles.activityButtonSelected
              ]}
              onPress={() => handleActivityToggle('gracie_barra')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.activityEmoji}></Text>
              </View>
              <Text style={[
                styles.activityLabel,
                { color: colors.textPrimary },
                selectedActivities.includes('gracie_barra') && styles.activityLabelSelected
              ]}>JJB</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.activityButton,
                { backgroundColor: colors.cardHover },
                selectedActivities.includes('running') && styles.activityButtonSelected
              ]}
              onPress={() => handleActivityToggle('running')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="run" size={32} color={selectedActivities.includes('running') ? "#FFFFFF" : "#10B981"} />
              </View>
              <Text style={[
                styles.activityLabel,
                { color: colors.textPrimary },
                selectedActivities.includes('running') && styles.activityLabelSelected
              ]}>Running</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.validateButton, { backgroundColor: colors.gold }]}
            onPress={handleValidate}
            activeOpacity={0.8}
          >
            <Text style={styles.validateButtonText}>Valider</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
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
  activitiesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  activityButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    minWidth: 90,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  activityLogo: {
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: '#2196F3',
  },
  iconContainer: {
    width: 36,
    height: 36,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityEmoji: {
    fontSize: 28,
  },
  validateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
