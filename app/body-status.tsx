import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, AlertTriangle, CheckCircle, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserBodyStatus, saveUserBodyStatus } from '@/lib/storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';

type BodyZoneStatus = 'ok' | 'warning' | 'injury';
type BodyZone = 'neck' | 'shoulders' | 'back' | 'elbows' | 'wrists' | 'hips' | 'knees' | 'ankles';

interface BodyZoneData {
  status: BodyZoneStatus;
  pain?: number; // 1-10 pour "warning"
  note?: string; // Note médicale pour "injury"
}

interface BodyStatusData {
  [key: string]: BodyZoneData;
}

const BODY_ZONES: Array<{ key: BodyZone; label: string; icon: string }> = [
  { key: 'neck', label: 'Cou', icon: '🫁' },
  { key: 'shoulders', label: 'Épaules', icon: '💪' },
  { key: 'back', label: 'Dos', icon: '🦴' },
  { key: 'elbows', label: 'Coudes', icon: '🦾' },
  { key: 'wrists', label: 'Poignets', icon: '✋' },
  { key: 'hips', label: 'Hanches', icon: '🦵' },
  { key: 'knees', label: 'Genoux', icon: '🦵' },
  { key: 'ankles', label: 'Chevilles', icon: '🦶' },
];

export default function BodyStatusScreen() {
  const router = useRouter();
  const [bodyStatus, setBodyStatus] = useState<BodyStatusData>({});
  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BodyZoneStatus>('ok');
  const [painLevel, setPainLevel] = useState<number>(5);
  const [medicalNote, setMedicalNote] = useState<string>('');

  useEffect(() => {
    loadBodyStatus();
  }, []);

  const loadBodyStatus = useCallback(async () => {
    try {
      const status = await getUserBodyStatus();
      setBodyStatus(status);
    } catch (error) {
      console.error('Erreur chargement statut corporel:', error);
    }
  }, []);

  const handleZonePress = (zone: BodyZone) => {
    const currentStatus = bodyStatus[zone];
    setSelectedZone(zone);
    if (currentStatus) {
      setSelectedStatus(currentStatus.status);
      setPainLevel(currentStatus.pain || 5);
      setMedicalNote(currentStatus.note || '');
    } else {
      setSelectedStatus('ok');
      setPainLevel(5);
      setMedicalNote('');
    }
    setModalVisible(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedZone) return;

    const zoneData: BodyZoneData = {
      status: selectedStatus,
    };

    if (selectedStatus === 'warning') {
      zoneData.pain = painLevel;
    } else if (selectedStatus === 'injury') {
      if (!medicalNote.trim()) {
        Alert.alert('Note requise', 'Veuillez ajouter une note médicale pour cette blessure.');
        return;
      }
      zoneData.note = medicalNote.trim();
    }

    const newStatus = {
      ...bodyStatus,
      [selectedZone]: zoneData,
    };

    try {
      await saveUserBodyStatus(newStatus);
      setBodyStatus(newStatus);
      setModalVisible(false);
      setSelectedZone(null);
      setMedicalNote('');
    } catch (error) {
      console.error('Erreur sauvegarde statut:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le statut.');
    }
  };

  const handleRemoveStatus = async () => {
    if (!selectedZone) return;

    const newStatus = { ...bodyStatus };
    delete newStatus[selectedZone];

    try {
      await saveUserBodyStatus(newStatus);
      setBodyStatus(newStatus);
      setModalVisible(false);
      setSelectedZone(null);
    } catch (error) {
      console.error('Erreur suppression statut:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le statut.');
    }
  };

  const getStatusColor = (status?: BodyZoneStatus): string => {
    if (!status || status === 'ok') return '#10B981';
    if (status === 'warning') return '#F59E0B';
    return '#EF4444';
  };

  const getStatusIcon = (status?: BodyZoneStatus) => {
    if (!status || status === 'ok') {
      return <CheckCircle size={24} color="#10B981" strokeWidth={2.5} />;
    }
    if (status === 'warning') {
      return <AlertTriangle size={24} color="#F59E0B" strokeWidth={2.5} />;
    }
    return <Activity size={24} color="#EF4444" strokeWidth={2.5} />;
  };

  const getStatusLabel = (status?: BodyZoneStatus): string => {
    if (!status || status === 'ok') return 'Opérationnel';
    if (status === 'warning') return 'Gêne / Douleur';
    return 'Blessure / Arrêt';
  };

  return (
    <ScreenWrapper noPadding>
      <Header title="Maintenance Corporelle" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <Activity size={22} color="#0EA5E9" strokeWidth={2.5} />
          <Text style={styles.subtitle}>
            Surveille l'état de ta machine de combat
          </Text>
        </View>

        <View style={styles.zonesGrid}>
          {BODY_ZONES.map((zone) => {
            const zoneStatus = bodyStatus[zone.key];
            const statusColor = getStatusColor(zoneStatus?.status);

            return (
              <TouchableOpacity
                key={zone.key}
                style={[
                  styles.zoneCard,
                  {
                    borderColor: statusColor,
                    borderWidth: zoneStatus ? 2.5 : 1.5,
                    backgroundColor: zoneStatus?.status === 'injury'
                      ? '#FEF2F2'
                      : zoneStatus?.status === 'warning'
                      ? '#FFFBEB'
                      : '#F0FDF4',
                  },
                ]}
                onPress={() => handleZonePress(zone.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.zoneIconContainer, { backgroundColor: statusColor + '20' }]}>
                  <Text style={styles.zoneIcon}>{zone.icon}</Text>
                </View>
                <Text style={styles.zoneLabel}>{zone.label}</Text>
                {zoneStatus ? (
                  <View style={styles.zoneStatusContainer}>
                    <View style={[styles.statusIconWrapper, { backgroundColor: statusColor + '20' }]}>
                      {getStatusIcon(zoneStatus.status)}
                    </View>
                    <Text style={[styles.zoneStatusText, { color: statusColor }]}>
                      {getStatusLabel(zoneStatus.status)}
                    </Text>
                    {zoneStatus.pain && (
                      <Text style={styles.zonePainText}>💥 Douleur: {zoneStatus.pain}/10</Text>
                    )}
                    {zoneStatus.note && (
                      <Text style={styles.zoneNoteText} numberOfLines={1}>
                        📝 {zoneStatus.note}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.zoneEmptyText}>Appuie pour définir</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal de sélection de statut */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedZone ? BODY_ZONES.find(z => z.key === selectedZone)?.label : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#1F2937" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: '70%' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.statusOptions}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'ok' && styles.statusOptionSelected,
                  { borderColor: selectedStatus === 'ok' ? '#10B981' : '#E5E7EB' },
                ]}
                onPress={() => setSelectedStatus('ok')}
                activeOpacity={0.7}
              >
                <CheckCircle size={32} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.statusOptionLabel}>Opérationnel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'warning' && styles.statusOptionSelected,
                  { borderColor: selectedStatus === 'warning' ? '#F59E0B' : '#E5E7EB' },
                ]}
                onPress={() => setSelectedStatus('warning')}
                activeOpacity={0.7}
              >
                <AlertTriangle size={32} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.statusOptionLabel}>Gêne / Douleur</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'injury' && styles.statusOptionSelected,
                  { borderColor: selectedStatus === 'injury' ? '#EF4444' : '#E5E7EB' },
                ]}
                onPress={() => setSelectedStatus('injury')}
                activeOpacity={0.7}
              >
                <Activity size={32} color="#EF4444" strokeWidth={2.5} />
                <Text style={styles.statusOptionLabel}>Blessure / Arrêt</Text>
              </TouchableOpacity>
            </View>

            {/* Niveau de douleur (si warning) */}
            {selectedStatus === 'warning' && (
              <View style={styles.painSection}>
                <Text style={styles.painLabel}>Niveau de douleur (1-10)</Text>
                <View style={styles.painSliderContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.painLevelButton,
                        painLevel === level && styles.painLevelButtonActive,
                        { backgroundColor: painLevel === level ? '#F59E0B' : '#F3F4F6' },
                      ]}
                      onPress={() => setPainLevel(level)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.painLevelText,
                          { color: painLevel === level ? '#FFFFFF' : '#1F2937' },
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Note médicale (si injury) */}
            {selectedStatus === 'injury' && (
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Note médicale (ex: "Strapping", "Glace")</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Décrivez la blessure ou le traitement..."
                  placeholderTextColor="#9CA3AF"
                  value={medicalNote}
                  onChangeText={setMedicalNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

              <View style={styles.modalActions}>
                {bodyStatus[selectedZone || ''] && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemoveStatus}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeButtonText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveStatus}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  subtitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: -0.2,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  zoneCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  zoneIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  zoneIcon: {
    fontSize: 44,
  },
  zoneLabel: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  zoneStatusContainer: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  statusIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  zoneStatusText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  zonePainText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 4,
  },
  zoneNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  zoneEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  statusOptions: {
    gap: 12,
    marginBottom: 24,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#F9FAFB',
  },
  statusOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  painSection: {
    marginBottom: 24,
  },
  painLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  painSliderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  painLevelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painLevelButtonActive: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  painLevelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noteSection: {
    marginBottom: 24,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  removeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
