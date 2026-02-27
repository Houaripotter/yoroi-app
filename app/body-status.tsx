import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, AlertTriangle, CheckCircle, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserBodyStatus, saveUserBodyStatus } from '@/lib/storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { useI18n } from '@/lib/I18nContext';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';
import { usePreventDoubleClick } from '@/hooks/usePreventDoubleClick';

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

const BODY_ZONES: Array<{ key: BodyZone; icon: string }> = [
  { key: 'neck', icon: '🫁' },
  { key: 'shoulders', icon: '' },
  { key: 'back', icon: '🦴' },
  { key: 'elbows', icon: '🦾' },
  { key: 'wrists', icon: '✋' },
  { key: 'hips', icon: '🦵' },
  { key: 'knees', icon: '🦵' },
  { key: 'ankles', icon: '🦶' },
];

export default function BodyStatusScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [bodyStatus, setBodyStatus] = useState<BodyStatusData>({});
  const { isProcessing, executeOnce } = usePreventDoubleClick({ delay: 500 });

  // Helper pour obtenir le label traduit d'une zone
  const getZoneLabel = (zoneKey: BodyZone): string => {
    return t(`screens.bodyStatus.${zoneKey}`);
  };
  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      logger.error('Erreur chargement statut corporel:', error);
    }
  }, []);

  const handleZonePress = (zone: BodyZone) => {
    if (isProcessing) return;

    executeOnce(async () => {
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
    });
  };

  const handleSaveStatus = async () => {
    if (isSaving) return;
    if (!selectedZone) return;
    setIsSaving(true);

    try {
      const zoneData: BodyZoneData = {
        status: selectedStatus,
      };

      if (selectedStatus === 'warning') {
        zoneData.pain = painLevel;
      } else if (selectedStatus === 'injury') {
        if (!medicalNote.trim()) {
          showPopup(t('screens.bodyStatus.noteRequired'), t('screens.bodyStatus.noteRequiredDesc'), [{ text: t('common.ok'), style: 'primary' }]);
          return;
        }
        zoneData.note = medicalNote.trim();
      }

      const newStatus = {
        ...bodyStatus,
        [selectedZone]: zoneData,
      };

      await saveUserBodyStatus(newStatus);
      setBodyStatus(newStatus);
      setModalVisible(false);
      setSelectedZone(null);
      setMedicalNote('');
    } catch (error) {
      logger.error('Erreur sauvegarde statut:', error);
      showPopup(t('common.error'), t('screens.bodyStatus.saveError'), [{ text: t('common.ok'), style: 'primary' }]);
    } finally {
      setIsSaving(false);
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
      logger.error('Erreur suppression statut:', error);
      showPopup(t('common.error'), t('screens.bodyStatus.deleteError'), [{ text: t('common.ok'), style: 'primary' }]);
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
    if (!status || status === 'ok') return t('screens.bodyStatus.statusOk');
    if (status === 'warning') return t('screens.bodyStatus.statusWarning');
    return t('screens.bodyStatus.statusInjury');
  };

  return (
    <ScreenWrapper noPadding>
      <Header title={t('screens.bodyStatus.title')} showBack />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.backgroundCard }]}>
          <Activity size={22} color="#0EA5E9" strokeWidth={2.5} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('screens.bodyStatus.subtitle')}
          </Text>
        </View>

        <View style={styles.zonesGrid}>
          {BODY_ZONES.map((zone) => {
            const zoneStatus = bodyStatus[zone.key];
            const statusColor = getStatusColor(zoneStatus?.status);

            // Gestion spéciale des couleurs de fond des cartes en mode sombre
            // On veut garder la teinte mais adaptée
            let cardBgColor = colors.backgroundCard;
            if (zoneStatus?.status === 'injury') {
              cardBgColor = isDark ? '#450a0a' : '#FEF2F2'; // Rouge très sombre ou très clair
            } else if (zoneStatus?.status === 'warning') {
              cardBgColor = isDark ? '#451a03' : '#FFFBEB'; // Orange très sombre ou très clair
            } else {
              cardBgColor = isDark ? colors.backgroundCard : '#F0FDF4'; // Vert très clair ou défaut sombre
            }

            return (
              <TouchableOpacity
                key={zone.key}
                style={[
                  styles.zoneCard,
                  {
                    borderColor: statusColor,
                    borderWidth: zoneStatus ? 2.5 : 1.5,
                    backgroundColor: cardBgColor,
                  },
                ]}
                onPress={() => handleZonePress(zone.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.zoneIconContainer, { backgroundColor: statusColor + '20' }]}>
                  <Text style={styles.zoneIcon}>{zone.icon}</Text>
                </View>
                <Text style={[styles.zoneLabel, { color: colors.textPrimary }]}>{getZoneLabel(zone.key)}</Text>
                {zoneStatus ? (
                  <View style={styles.zoneStatusContainer}>
                    <View style={[styles.statusIconWrapper, { backgroundColor: statusColor + '20' }]}>
                      {getStatusIcon(zoneStatus.status)}
                    </View>
                    <Text style={[styles.zoneStatusText, { color: statusColor }]}>
                      {getStatusLabel(zoneStatus.status)}
                    </Text>
                    {zoneStatus.pain && (
                      <Text style={styles.zonePainText}>{t('screens.bodyStatus.painLevel')}: {zoneStatus.pain}/10</Text>
                    )}
                    {zoneStatus.note && (
                      <Text style={[styles.zoneNoteText, { color: colors.textSecondary }]} numberOfLines={1}>
                        📝 {zoneStatus.note}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.zoneEmptyText, { color: colors.textMuted }]}>{t('screens.bodyStatus.tapToSet')}</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {selectedZone ? getZoneLabel(selectedZone) : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.textMuted} strokeWidth={2.5} />
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
                  { 
                    borderColor: selectedStatus === 'ok' ? '#10B981' : colors.border,
                    backgroundColor: selectedStatus === 'ok' ? (isDark ? '#064e3b' : '#F0F9FF') : colors.backgroundElevated
                  },
                ]}
                onPress={() => setSelectedStatus('ok')}
                activeOpacity={0.7}
              >
                <CheckCircle size={32} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.statusOptionLabel, { color: colors.textPrimary }]}>{t('screens.bodyStatus.statusOk')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'warning' && styles.statusOptionSelected,
                  { 
                    borderColor: selectedStatus === 'warning' ? '#F59E0B' : colors.border,
                    backgroundColor: selectedStatus === 'warning' ? (isDark ? '#451a03' : '#FFFBEB') : colors.backgroundElevated
                  },
                ]}
                onPress={() => setSelectedStatus('warning')}
                activeOpacity={0.7}
              >
                <AlertTriangle size={32} color="#F59E0B" strokeWidth={2.5} />
                <Text style={[styles.statusOptionLabel, { color: colors.textPrimary }]}>{t('screens.bodyStatus.statusWarning')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'injury' && styles.statusOptionSelected,
                  { 
                    borderColor: selectedStatus === 'injury' ? '#EF4444' : colors.border,
                    backgroundColor: selectedStatus === 'injury' ? (isDark ? '#450a0a' : '#FEF2F2') : colors.backgroundElevated
                  },
                ]}
                onPress={() => setSelectedStatus('injury')}
                activeOpacity={0.7}
              >
                <Activity size={32} color="#EF4444" strokeWidth={2.5} />
                <Text style={[styles.statusOptionLabel, { color: colors.textPrimary }]}>{t('screens.bodyStatus.statusInjury')}</Text>
              </TouchableOpacity>
            </View>

            {/* Niveau de douleur (si warning) */}
            {selectedStatus === 'warning' && (
              <View style={styles.painSection}>
                <Text style={[styles.painLabel, { color: colors.textPrimary }]}>{t('screens.bodyStatus.painLevelLabel')}</Text>
                <View style={styles.painSliderContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.painLevelButton,
                        painLevel === level && styles.painLevelButtonActive,
                        { backgroundColor: painLevel === level ? '#F59E0B' : colors.backgroundElevated },
                      ]}
                      onPress={() => setPainLevel(level)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.painLevelText,
                          { color: painLevel === level ? '#FFFFFF' : colors.textPrimary },
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
                <Text style={[styles.noteLabel, { color: colors.textPrimary }]}>{t('screens.bodyStatus.medicalNoteLabel')}</Text>
                <TextInput
                  style={[styles.noteInput, {
                    backgroundColor: colors.backgroundElevated,
                    color: colors.textPrimary,
                    borderColor: colors.border
                  }]}
                  placeholder={t('screens.bodyStatus.medicalNotePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={medicalNote}
                  onChangeText={setMedicalNote}
                  multiline
                  numberOfLines={3}
                  maxLength={1000}
                />
              </View>
            )}

              <View style={styles.modalActions}>
                {bodyStatus[selectedZone || ''] && (
                  <TouchableOpacity
                    style={[styles.removeButton, { backgroundColor: colors.backgroundElevated }]}
                    onPress={handleRemoveStatus}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeButtonText}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.accent }]}
                  onPress={handleSaveStatus}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.saveButtonText, { color: colors.textOnAccent }]}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
    letterSpacing: -0.2,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  zoneCard: {
    width: '47%',
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
    marginTop: 4,
    textAlign: 'center',
  },
  zoneEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  statusOptionSelected: {
    // Style handled dynamically
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  painSection: {
    marginBottom: 24,
  },
  painLabel: {
    fontSize: 14,
    fontWeight: '700',
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
    marginBottom: 8,
  },
  noteInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
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
  },
});
