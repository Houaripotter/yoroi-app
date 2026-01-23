import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X, Check, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { Club, Training } from '@/lib/database';
import { getSessionTypesForSport, DURATION_PRESETS, getDefaultSessionType } from '@/lib/sessionTypes';
import { getClubLogoSource } from '@/lib/sports';
import logger from '@/lib/security/logger';

interface AddSessionModalProps {
  visible: boolean;
  date: Date | null;
  clubs: Club[];
  onClose: () => void;
  onSave: (session: Omit<Training, 'id' | 'created_at'>) => Promise<void>;
}

type Step = 'club' | 'details';

export function AddSessionModal({
  visible,
  date,
  clubs,
  onClose,
  onSave,
}: AddSessionModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Etats
  const [step, setStep] = useState<Step>('club');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [sessionType, setSessionType] = useState<string>('');
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);

  // Reset quand la modal se ferme
  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  // Mettre a jour les types de seances quand le club change
  useEffect(() => {
    if (selectedClub) {
      const types = getSessionTypesForSport(selectedClub.sport);
      setSessionTypes(types);
      setSessionType(types[0] || 'Seance');
    }
  }, [selectedClub]);

  const reset = () => {
    setStep('club');
    setSelectedClub(null);
    setSessionType('');
    setStartTime(new Date());
    setDuration(60);
    setNote('');
    setShowTimePicker(false);
    setIsSaving(false);
    setSessionTypes([]);
  };

  const handleClose = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    reset();
    onClose();
  };

  const handleClubSelect = (club: Club) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setSelectedClub(club);
    setStep('details');
  };

  const handleBack = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setStep('club');
    setSelectedClub(null);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setStartTime(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!selectedClub || !date || isSaving) return;

    setIsSaving(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    const timeStr = format(startTime, 'HH:mm');

    try {
      await onSave({
        date: format(date, 'yyyy-MM-dd'),
        club_id: selectedClub.id,
        sport: selectedClub.sport,
        session_type: sessionType,
        start_time: timeStr,
        duration_minutes: duration,
        notes: note.trim() || undefined,
      });

      notificationAsync(NotificationFeedbackType.Success);
      handleClose();
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      notificationAsync(NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const getClubDisplay = (club: Club) => {
    if (club.logo_uri) {
      const logoSource = getClubLogoSource(club.logo_uri);
      if (logoSource) {
        return { type: 'image' as const, source: logoSource };
      }
    }
    return { type: 'color' as const, color: club.color || colors.accent };
  };

  const formatDateTitle = (d: Date) => {
    return format(d, "EEEE d MMMM", { locale: fr });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* ETAPE 1: Selection du club */}
          {step === 'club' && (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ width: 40 }} />
                <View style={styles.headerCenter}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Choisir ton club</Text>
                  {date && (
                    <Text style={[styles.dateSubtitle, { color: colors.textSecondary }]}>
                      {formatDateTitle(date)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Grille des clubs */}
              {clubs.length === 0 ? (
                <View style={styles.emptyClubs}>
                  <Text style={[styles.emptyClubsText, { color: colors.textMuted }]}>
                    Tu n'as pas encore de clubs
                  </Text>
                  <Text style={[styles.emptyClubsSubtext, { color: colors.textMuted }]}>
                    Ajoute tes clubs dans les reglages
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.clubsScroll}
                  contentContainerStyle={styles.clubsGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {clubs.map((club) => {
                    const display = getClubDisplay(club);
                    return (
                      <TouchableOpacity
                        key={club.id}
                        style={[styles.clubCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                        onPress={() => handleClubSelect(club)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.clubLogo, { backgroundColor: display.type === 'color' ? `${display.color}20` : colors.backgroundElevated }]}>
                          {display.type === 'image' ? (
                            <Image source={display.source} style={styles.clubLogoImage} />
                          ) : (
                            <View style={[styles.clubColorDot, { backgroundColor: display.color }]} />
                          )}
                        </View>
                        <Text style={[styles.clubName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {club.name}
                        </Text>
                        <Text style={[styles.clubSport, { color: colors.textMuted }]} numberOfLines={1}>
                          {club.sport}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>Annuler</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ETAPE 2: Details de la seance */}
          {step === 'details' && selectedClub && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header avec retour */}
              <View style={styles.detailsHeader}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <ChevronLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.detailsClubInfo}>
                  {(() => {
                    const display = getClubDisplay(selectedClub);
                    return (
                      <View style={[styles.detailsClubLogo, { backgroundColor: display.type === 'color' ? `${display.color}20` : colors.backgroundElevated }]}>
                        {display.type === 'image' ? (
                          <Image source={display.source} style={styles.detailsClubLogoImage} />
                        ) : (
                          <View style={[styles.detailsClubColorDot, { backgroundColor: display.color }]} />
                        )}
                      </View>
                    );
                  })()}
                  <View>
                    <Text style={[styles.detailsClubName, { color: colors.textPrimary }]}>
                      {selectedClub.name}
                    </Text>
                    {date && (
                      <Text style={[styles.detailsDate, { color: colors.textSecondary }]}>
                        {formatDateTitle(date)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Type de seance */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TYPE DE SEANCE</Text>
              <View style={styles.typeGrid}>
                {sessionTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: sessionType === type ? colors.accent : colors.backgroundCard,
                        borderColor: sessionType === type ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSessionType(type);
                    }}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: sessionType === type ? colors.textOnAccent : colors.textPrimary },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Heure de debut */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>HEURE DE DEBUT</Text>
              <TouchableOpacity
                style={[styles.timeButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={20} color={colors.accentText} />
                <Text style={[styles.timeText, { color: colors.textPrimary }]}>
                  {format(startTime, 'HH:mm')}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.timePicker}
                />
              )}

              {Platform.OS === 'ios' && showTimePicker && (
                <TouchableOpacity
                  style={[styles.doneTimeButton, { backgroundColor: colors.accent }]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={[styles.doneTimeButtonText, { color: colors.textOnAccent }]}>OK</Text>
                </TouchableOpacity>
              )}

              {/* Duree */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DUREE</Text>
              <View style={styles.durationGrid}>
                {DURATION_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.value}
                    style={[
                      styles.durationButton,
                      {
                        backgroundColor: duration === preset.value ? colors.accent : colors.backgroundCard,
                        borderColor: duration === preset.value ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setDuration(preset.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        { color: duration === preset.value ? colors.textOnAccent : colors.textPrimary },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note optionnelle */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>NOTE (OPTIONNEL)</Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ex: Bon sparring, nouvelle technique apprise..."
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />

              {/* Boutons d'action */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: isSaving ? 0.7 : 1 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Check size={20} color={colors.textOnAccent} />
                  <Text style={[styles.saveBtnText, { color: colors.textOnAccent }]}>Enregistrer</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  dateSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  clubsScroll: {
    maxHeight: 400,
  },
  clubsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  clubCard: {
    width: '30%',
    aspectRatio: 0.9,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
  },
  clubLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  clubLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  clubColorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  clubName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  clubSport: {
    fontSize: 10,
    textAlign: 'center',
  },
  emptyClubs: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyClubsText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyClubsSubtext: {
    fontSize: 13,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Details step
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsClubInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailsClubLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsClubLogoImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  detailsClubColorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  detailsClubName: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsDate: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 20,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 28,
    fontWeight: '700',
  },
  timePicker: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  doneTimeButton: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  doneTimeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    minWidth: '15%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  durationButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noteInput: {
    padding: 16,
    borderRadius: 14,
    fontSize: 14,
    minHeight: 90,
    borderWidth: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AddSessionModal;
