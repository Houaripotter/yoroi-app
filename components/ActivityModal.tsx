import { useState, useEffect } from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity, Image, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import { WorkoutType, WORKOUT_TYPES } from '@/types/workout';
import { theme } from '@/lib/theme';

interface ActivityModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectActivity: (types: WorkoutType[]) => Promise<void>;
  currentActivities?: WorkoutType[];
}

export function ActivityModal({ visible, selectedDate, onClose, onSelectActivity, currentActivities = [] }: ActivityModalProps) {
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
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Qu'as-tu fait le</Text>
              <Text style={styles.dateText}>{formatDate(selectedDate)} ?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#666666" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.activitiesContainer}>
            <TouchableOpacity
              style={[
                styles.activityButton,
                selectedActivities.includes('basic_fit') && styles.activityButtonSelected
              ]}
              onPress={() => handleActivityToggle('basic_fit')}
              activeOpacity={0.8}
            >
              <Image
                source={require('../assets/images/basic-fit.png')}
                style={styles.activityLogo}
                resizeMode="contain"
              />
              <Text style={[
                styles.activityLabel,
                selectedActivities.includes('basic_fit') && styles.activityLabelSelected
              ]}>Musculation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.activityButton,
                selectedActivities.includes('gracie_barra') && styles.activityButtonSelected
              ]}
              onPress={() => handleActivityToggle('gracie_barra')}
              activeOpacity={0.8}
            >
              <Image
                source={require('../assets/images/gracie-barra.png')}
                style={styles.activityLogo}
                resizeMode="contain"
              />
              <Text style={[
                styles.activityLabel,
                selectedActivities.includes('gracie_barra') && styles.activityLabelSelected
              ]}>JJB</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.activityButton,
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
                selectedActivities.includes('running') && styles.activityLabelSelected
              ]}>Running</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.validateButton}
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
    padding: theme.spacing.xl,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
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
    marginBottom: theme.spacing.xl,
    width: '100%',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: '#000000',
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#666666',
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  activitiesContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  activityButton: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: '#F8F8F8',
    borderRadius: theme.radius.lg,
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
    marginBottom: theme.spacing.sm,
  },
  activityLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#333333',
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: '#2196F3',
  },
  iconContainer: {
    width: 36,
    height: 36,
    marginBottom: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    width: '100%',
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});