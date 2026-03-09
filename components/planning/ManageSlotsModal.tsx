import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, Plus, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '@/lib/ThemeContext';
import { useWeeklySlots, WeeklySlotWithStatus } from '@/hooks/useWeeklySlots';
import { cancelSlot, getSlotOccurrences, getWeeklyPlan, Injury, SlotOccurrence, WeeklyPlan } from '@/lib/database';
import { getInjuriesWithZoneNames } from '@/lib/infirmaryService';
import { RecurringSlotCard } from './RecurringSlotCard';
import { AddSlotModal } from './AddSlotModal';
import { SlotValidationSheet } from './SlotValidationSheet';
import { getSportName } from '@/lib/sports';
import { isSportImpactedByInjury } from '@/lib/slotInjuryService';
import { useEffect } from 'react';
import { selectionAsync, notificationAsync, NotificationFeedbackType } from 'expo-haptics';

const DAY_LABELS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const DAY_FULL = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

const getCurrentWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

const shiftWeek = (weekStart: string, delta: number): string => {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
};

const formatWeekLabel = (weekStart: string): string => {
  const d = new Date(weekStart);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getDate()}/${dt.getMonth() + 1}`;
  return `${fmt(d)} - ${fmt(end)}`;
};

interface ManageSlotsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ManageSlotsModal: React.FC<ManageSlotsModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const router = useRouter();
  const { slotsWithStatus: currentSlots, loading, refresh, weekStart: currentWeekStart } = useWeeklySlots();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WeeklySlotWithStatus | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<WeeklySlotWithStatus | null>(null);
  const [activeInjuries, setActiveInjuries] = useState<Injury[]>([]);

  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0);
  const [historySlotsData, setHistorySlotsData] = useState<WeeklySlotWithStatus[] | null>(null);

  const isCurrentWeek = weekOffset === 0;
  const displayedWeekStart = useMemo(() => shiftWeek(currentWeekStart, weekOffset), [currentWeekStart, weekOffset]);
  const isFutureWeek = displayedWeekStart > getCurrentWeekStart();

  // Load history week data when offset changes
  useEffect(() => {
    if (weekOffset === 0) {
      setHistorySlotsData(null);
      return;
    }
    const loadHistory = async () => {
      const [slots, occurrences] = await Promise.all([
        getWeeklyPlan(),
        getSlotOccurrences(displayedWeekStart),
      ]);
      const merged: WeeklySlotWithStatus[] = slots
        .filter(s => !s.is_rest_day)
        .map(slot => {
          const occ = occurrences.find(o => o.weekly_plan_id === slot.id);
          return {
            ...slot,
            occurrence: occ,
            isValidated: occ?.status === 'validated',
            isCancelled: occ?.status === 'cancelled',
            isPending: !occ || occ.status === 'pending',
          };
        });
      setHistorySlotsData(merged);
    };
    loadHistory();
  }, [weekOffset, displayedWeekStart]);

  const slotsWithStatus = isCurrentWeek ? currentSlots : (historySlotsData || []);
  const weekStart = displayedWeekStart;

  useEffect(() => {
    if (visible) {
      refresh();
      setWeekOffset(0);
      getInjuriesWithZoneNames().then(all =>
        setActiveInjuries(all.filter(i => i.status === 'active' || i.status === 'healing'))
      );
    }
  }, [visible]);

  const slotsByDay = useMemo(() => {
    const grouped: Record<number, WeeklySlotWithStatus[]> = {};
    for (const slot of slotsWithStatus) {
      if (!grouped[slot.day_of_week]) grouped[slot.day_of_week] = [];
      grouped[slot.day_of_week].push(slot);
    }
    return grouped;
  }, [slotsWithStatus]);

  const daysWithSlots = useMemo(() => {
    return Object.keys(slotsByDay)
      .map(Number)
      .sort((a, b) => a - b);
  }, [slotsByDay]);

  // Stats globales
  const globalStats = useMemo(() => {
    const total = slotsWithStatus.length;
    const validated = slotsWithStatus.filter(s => s.isValidated).length;
    const cancelled = slotsWithStatus.filter(s => s.isCancelled).length;
    const pending = slotsWithStatus.filter(s => s.isPending).length;
    return { total, validated, cancelled, pending };
  }, [slotsWithStatus]);

  // Creneaux impactes par blessure (avec mapping zone -> sport)
  const injuryImpactedSlots = useMemo(() => {
    if (activeInjuries.length === 0) return [];
    return slotsWithStatus.filter(slot => {
      return activeInjuries.some(injury =>
        injury.fit_for_duty !== 'operational' && isSportImpactedByInjury(slot.sport, injury)
      );
    });
  }, [slotsWithStatus, activeInjuries]);

  const handleSlotSaved = useCallback(() => {
    refresh();
    setShowAddModal(false);
    setEditingSlot(null);
  }, [refresh]);

  const handleSlotPress = useCallback((slot: WeeklySlotWithStatus) => {
    selectionAsync();
    if (slot.isPending && isCurrentWeek) {
      setSelectedSlot(slot);
    } else if (isCurrentWeek) {
      setEditingSlot(slot);
      setShowAddModal(true);
    }
  }, [isCurrentWeek]);

  // Swipe validate: navigate to add-training with prefill
  const handleSwipeValidate = useCallback((slot: WeeklySlotWithStatus) => {
    selectionAsync();
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
  }, [onClose, router]);

  // Swipe cancel: cancel directly
  const handleSwipeCancel = useCallback(async (slot: WeeklySlotWithStatus) => {
    if (!slot.id) return;
    await cancelSlot(slot.id, weekStart);
    await notificationAsync(NotificationFeedbackType.Warning);
    refresh();
  }, [weekStart, refresh]);

  const handleCancelAllInjured = useCallback(async () => {
    for (const slot of injuryImpactedSlots) {
      if (slot.isPending && slot.id) {
        const injury = activeInjuries[0];
        await cancelSlot(slot.id, weekStart, 'Blessure active', injury?.id);
      }
    }
    refresh();
  }, [injuryImpactedSlots, activeInjuries, weekStart, refresh]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Creneaux reguliers
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Week navigator */}
        <View style={[styles.weekNavigator, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => { selectionAsync(); setWeekOffset(o => o - 1); }}
            hitSlop={8}
          >
            <ChevronLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { if (!isCurrentWeek) { selectionAsync(); setWeekOffset(0); } }}
            style={styles.weekNavCenter}
          >
            <Text style={[styles.weekNavLabel, { color: isCurrentWeek ? colors.accent : colors.textPrimary }]}>
              {isCurrentWeek ? 'Cette semaine' : formatWeekLabel(displayedWeekStart)}
            </Text>
            {!isCurrentWeek && (
              <Text style={[styles.weekNavHint, { color: colors.accent }]}>
                Revenir a cette semaine
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.weekNavButton, isFutureWeek && { opacity: 0.3 }]}
            onPress={() => {
              if (!isFutureWeek) { selectionAsync(); setWeekOffset(o => o + 1); }
            }}
            hitSlop={8}
            disabled={isFutureWeek}
          >
            <ChevronRight size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {/* Week overview: 7 day grid with dots */}
          <View style={[styles.weekOverview, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            {DAY_LABELS.map((day, i) => {
              const daySlots = slotsByDay[i] || [];
              const hasValidated = daySlots.some(s => s.isValidated);
              const hasPending = daySlots.some(s => s.isPending);
              const hasCancelled = daySlots.some(s => s.isCancelled);
              return (
                <View key={i} style={styles.weekDayCell}>
                  <Text style={[styles.weekDayLabel, { color: colors.textMuted }]}>{day}</Text>
                  <View style={styles.weekDayDots}>
                    {daySlots.length === 0 ? (
                      <View style={[styles.weekDot, { backgroundColor: colors.border }]} />
                    ) : (
                      daySlots.map((slot, j) => (
                        <View
                          key={j}
                          style={[
                            styles.weekDot,
                            {
                              backgroundColor: slot.isValidated
                                ? colors.success
                                : slot.isCancelled
                                ? colors.error
                                : colors.textMuted,
                            },
                          ]}
                        />
                      ))
                    )}
                  </View>
                  <Text style={[styles.weekDayCount, { color: colors.textMuted }]}>
                    {daySlots.length > 0 ? daySlots.length : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Injury alert */}
          {activeInjuries.length > 0 && injuryImpactedSlots.length > 0 && (
            <View style={[styles.injuryAlert, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
              <View style={styles.injuryAlertHeader}>
                <AlertTriangle size={18} color={colors.warning} />
                <Text style={[styles.injuryAlertTitle, { color: colors.warning }]}>
                  Blessure active
                </Text>
              </View>
              <Text style={[styles.injuryAlertText, { color: colors.textSecondary }]}>
                {injuryImpactedSlots.filter(s => s.isPending).length} creneau(x) concerne(s) cette semaine.
              </Text>
              <TouchableOpacity
                style={[styles.injuryCancelButton, { backgroundColor: colors.warning + '20' }]}
                onPress={handleCancelAllInjured}
              >
                <Text style={[styles.injuryCancelText, { color: colors.warning }]}>
                  Tout annuler cette semaine
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Slots by day */}
          {daysWithSlots.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Aucun creneau
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Ajoutez vos entraînements recurrents pour les valider chaque semaine d'un tap.
              </Text>
            </View>
          )}

          {daysWithSlots.map(dayIndex => (
            <View key={dayIndex} style={styles.daySection}>
              <Text style={[styles.dayHeader, { color: colors.textSecondary }]}>
                {DAY_FULL[dayIndex]}
              </Text>
              {(slotsByDay[dayIndex] || []).map(slot => (
                <RecurringSlotCard
                  key={slot.id}
                  slot={slot}
                  onPress={() => handleSlotPress(slot)}
                  onSwipeValidate={isCurrentWeek && slot.isPending ? () => handleSwipeValidate(slot) : undefined}
                  onSwipeCancel={isCurrentWeek && slot.isPending ? () => handleSwipeCancel(slot) : undefined}
                  injuryWarning={
                    activeInjuries.find(
                      inj => inj.fit_for_duty !== 'operational' && isSportImpactedByInjury(slot.sport, inj)
                    )
                      ? `Blessure: ${activeInjuries.find(inj => isSportImpactedByInjury(slot.sport, inj))!.zone_name || activeInjuries.find(inj => isSportImpactedByInjury(slot.sport, inj))!.zone_id} (EVA ${activeInjuries.find(inj => isSportImpactedByInjury(slot.sport, inj))!.eva_score}/10)`
                      : undefined
                  }
                />
              ))}
            </View>
          ))}

          {/* Stats */}
          {slotsWithStatus.length > 0 && (
            <View style={[styles.statsBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>{globalStats.validated}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Valide(s)</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textMuted }]}>{globalStats.pending}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>En attente</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.error }]}>{globalStats.cancelled}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Annule(s)</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {globalStats.total > 0 ? Math.round((globalStats.validated / globalStats.total) * 100) : 0}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Assiduite</Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Add button - only on current week */}
        {isCurrentWeek && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              selectionAsync();
              setEditingSlot(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.addButtonText}>Ajouter un creneau</Text>
          </TouchableOpacity>
        )}

        {/* Past week label */}
        {!isCurrentWeek && (
          <View style={[styles.pastWeekBanner, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="history" size={16} color={colors.textMuted} />
            <Text style={[styles.pastWeekText, { color: colors.textMuted }]}>
              Historique - consultation seule
            </Text>
          </View>
        )}
      </GestureHandlerRootView>

      {/* Sub-modals */}
      <AddSlotModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingSlot(null); }}
        onSave={handleSlotSaved}
        editingSlot={editingSlot}
      />

      <SlotValidationSheet
        visible={!!selectedSlot}
        slot={selectedSlot}
        weekStart={weekStart}
        activeInjuries={activeInjuries}
        onClose={() => setSelectedSlot(null)}
        onValidated={refresh}
        onEdit={(slot) => {
          setSelectedSlot(null);
          setEditingSlot(slot);
          setShowAddModal(true);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  weekOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  weekDayCell: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  weekDayLabel: { fontSize: 10, fontWeight: '700' },
  weekDayDots: {
    flexDirection: 'row',
    gap: 3,
    height: 8,
    alignItems: 'center',
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekDayCount: { fontSize: 9, fontWeight: '600' },
  injuryAlert: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  injuryAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  injuryAlertTitle: { fontSize: 14, fontWeight: '700' },
  injuryAlertText: { fontSize: 13 },
  injuryCancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  injuryCancelText: { fontSize: 13, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  daySection: { marginBottom: 16 },
  dayHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },
  statDivider: {
    width: 1,
    height: 30,
  },
  addButton: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  weekNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  weekNavButton: {
    padding: 6,
  },
  weekNavCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  weekNavLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekNavHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  pastWeekBanner: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pastWeekText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
