import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { Check, X, Edit3, AlertTriangle, Clock } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { cancelSlot, Injury } from '@/lib/database';
import { getSportIcon, getSportColor, getSportName } from '@/lib/sports';
import { WeeklySlotWithStatus } from '@/hooks/useWeeklySlots';
import { isSportImpactedByInjury } from '@/lib/slotInjuryService';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';

interface SlotValidationSheetProps {
  visible: boolean;
  slot: WeeklySlotWithStatus | null;
  weekStart: string;
  activeInjuries: Injury[];
  onClose: () => void;
  onValidated: () => void;
  onEdit: (slot: WeeklySlotWithStatus) => void;
}

const formatTime = (time?: string): string => time || '--:--';

const formatEndTime = (startTime?: string, durationMinutes?: number): string => {
  if (!startTime || !durationMinutes) return '';
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

export const SlotValidationSheet: React.FC<SlotValidationSheetProps> = ({
  visible,
  slot,
  weekStart,
  activeInjuries,
  onClose,
  onValidated,
  onEdit,
}) => {
  const { colors } = useTheme();
  const router = useRouter();
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!slot) return null;

  const sportColor = getSportColor(slot.sport);
  const sportIcon = getSportIcon(slot.sport);
  const sportName = getSportName(slot.sport);
  const endTime = formatEndTime(slot.time, slot.duration_minutes);

  // Blessures pertinentes pour ce sport (avec mapping zone -> sport)
  const relevantInjuries = activeInjuries.filter(
    inj => inj.fit_for_duty !== 'operational' && isSportImpactedByInjury(slot.sport, inj)
  );

  const handleValidate = () => {
    selectionAsync();
    // Navigate to add-training with prefilled data
    onClose();
    router.push({
      pathname: '/add-training',
      params: {
        slotId: String(slot.id),
        prefillSport: slot.sport,
        prefillClubId: slot.club_id ? String(slot.club_id) : undefined,
        prefillTime: slot.time || undefined,
        prefillDuration: slot.duration_minutes ? String(slot.duration_minutes) : undefined,
      },
    });
  };

  const handleCancel = async () => {
    if (!slot.id) return;
    const injury = relevantInjuries.length > 0 ? relevantInjuries[0] : undefined;
    await cancelSlot(slot.id, weekStart, cancelReason || undefined, injury?.id);
    await notificationAsync(NotificationFeedbackType.Warning);
    setShowCancelInput(false);
    setCancelReason('');
    onClose();
    onValidated();
  };

  const handleEdit = () => {
    selectionAsync();
    onEdit(slot);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Slot summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.sportIconLarge, { backgroundColor: sportColor + '20' }]}>
              <MaterialCommunityIcons
                name={sportIcon as any}
                size={32}
                color={sportColor}
              />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.sportTitle, { color: colors.textPrimary }]}>
                {slot.label || sportName}
              </Text>
              <View style={styles.timeRow}>
                <Clock size={14} color={colors.textMuted} />
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {formatTime(slot.time)}
                  {endTime ? ` - ${endTime}` : ''}
                  {slot.duration_minutes ? ` (${slot.duration_minutes} min)` : ''}
                </Text>
              </View>
              {slot.club_name && (
                <Text style={[styles.clubText, { color: colors.textMuted }]}>
                  {slot.club_name}
                </Text>
              )}
            </View>
          </View>

          {/* Injury warning */}
          {relevantInjuries.length > 0 && (
            <View style={[styles.injuryWarning, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
              <AlertTriangle size={18} color={colors.warning} />
              <View style={styles.injuryWarningContent}>
                <Text style={[styles.injuryWarningTitle, { color: colors.warning }]}>
                  Blessure active : {relevantInjuries[0].zone_id} (EVA {relevantInjuries[0].eva_score}/10)
                </Text>
                <Text style={[styles.injuryWarningText, { color: colors.textSecondary }]}>
                  {relevantInjuries[0].fit_for_duty === 'unfit'
                    ? 'Repos recommande'
                    : 'Entraînement adapte recommande'}
                </Text>
              </View>
            </View>
          )}

          {/* Cancel reason input */}
          {showCancelInput && (
            <View style={styles.cancelInputContainer}>
              <TextInput
                style={[styles.cancelInput, {
                  backgroundColor: colors.backgroundElevated,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }]}
                placeholder="Raison (optionnelle)..."
                placeholderTextColor={colors.textMuted}
                value={cancelReason}
                onChangeText={setCancelReason}
                autoFocus
              />
              <View style={styles.cancelActions}>
                <TouchableOpacity
                  style={[styles.cancelConfirmButton, { backgroundColor: colors.error }]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelConfirmText}>Confirmer l'annulation</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowCancelInput(false); setCancelReason(''); }}
                >
                  <Text style={[styles.cancelBackText, { color: colors.textMuted }]}>
                    Retour
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Actions */}
          {!showCancelInput && (
            <View style={styles.actions}>
              {/* Validate */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}
                onPress={handleValidate}
              >
                <Check size={22} color={colors.success} />
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.success }]}>
                    Valider la séance
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
                    Enregistrer un entraînement
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cancel this week */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '25' }]}
                onPress={() => setShowCancelInput(true)}
              >
                <X size={22} color={colors.warning} />
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.warning }]}>
                    Annuler cette semaine
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
                    Passer ce creneau cette fois
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Edit slot */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
                onPress={handleEdit}
              >
                <Edit3 size={22} color={colors.textSecondary} />
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                    Modifier le creneau
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
                    Changer horaire, sport, etc.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  sportIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
    gap: 4,
  },
  sportTitle: { fontSize: 18, fontWeight: '800' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: { fontSize: 14, fontWeight: '500' },
  clubText: { fontSize: 13, fontWeight: '500' },
  injuryWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  injuryWarningContent: { flex: 1, gap: 2 },
  injuryWarningTitle: { fontSize: 13, fontWeight: '700' },
  injuryWarningText: { fontSize: 12 },
  cancelInputContainer: { gap: 12, marginBottom: 8 },
  cancelInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  cancelActions: { gap: 8, alignItems: 'center' },
  cancelConfirmButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  cancelConfirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cancelBackText: { fontSize: 14, fontWeight: '600', paddingVertical: 8 },
  actions: { gap: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionContent: { flex: 1, gap: 2 },
  actionTitle: { fontSize: 15, fontWeight: '700' },
  actionSubtitle: { fontSize: 12 },
});
