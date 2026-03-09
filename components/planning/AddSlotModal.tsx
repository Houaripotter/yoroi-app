import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import {
  addWeeklyPlanItem,
  updateWeeklyPlanItem,
  deleteWeeklyPlanItem,
  getClubs,
  WeeklyPlan,
  Club,
} from '@/lib/database';
import { SPORTS, SPORTS_BY_CATEGORY, CATEGORY_LABELS, getSportIcon } from '@/lib/sports';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_SHORT = ['L', 'M', 'Me', 'J', 'V', 'S', 'D'];

const CATEGORY_ICONS: Record<string, string> = {
  combat_striking: 'boxing-glove',
  combat_grappling: 'kabaddi',
  fitness: 'dumbbell',
  cardio: 'run-fast',
  collectif: 'account-group',
  raquettes: 'tennis',
  danse: 'human-female-dance',
  glisse: 'snowboard',
  nature: 'pine-tree',
  aquatique: 'swim',
  precision: 'target',
  autre: 'dots-horizontal',
};

interface AddSlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editingSlot?: WeeklyPlan | null;
}

export const AddSlotModal: React.FC<AddSlotModalProps> = ({
  visible,
  onClose,
  onSave,
  editingSlot,
}) => {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [selectedSport, setSelectedSport] = useState('jjb');
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [sessionType, setSessionType] = useState('');
  const [label, setLabel] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [sportSearch, setSportSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showClubPicker, setShowClubPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      getClubs().then(setClubs);
      if (editingSlot) {
        setDayOfWeek(editingSlot.day_of_week);
        setSelectedSport(editingSlot.sport);
        setSelectedClubId(editingSlot.club_id || null);
        setSessionType(editingSlot.session_type || '');
        setLabel(editingSlot.label || '');
        setDurationMinutes(editingSlot.duration_minutes || 60);
        if (editingSlot.time) {
          const [h, m] = editingSlot.time.split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          setStartTime(d);
        }
      } else {
        setDayOfWeek(0);
        setSelectedSport('jjb');
        setSelectedClubId(null);
        setSessionType('');
        setLabel('');
        setDurationMinutes(60);
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        setStartTime(d);
      }
      setExpandedCategories([]);
      setSportSearch('');
      setShowSportPicker(false);
      setShowClubPicker(false);
    }
  }, [visible, editingSlot]);

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
      const data: WeeklyPlan = {
        day_of_week: dayOfWeek,
        sport: selectedSport,
        club_id: selectedClubId || undefined,
        time: timeStr,
        duration_minutes: durationMinutes,
        session_type: sessionType || undefined,
        label: label || undefined,
      };

      if (editingSlot?.id) {
        await updateWeeklyPlanItem(editingSlot.id, data);
      } else {
        await addWeeklyPlanItem(data);
      }

      await notificationAsync(NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (error) {
      showPopup('Erreur', 'Impossible de sauvegarder le creneau.', [
        { text: 'OK', style: 'primary' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!editingSlot?.id) return;
    showPopup('Supprimer', 'Supprimer ce creneau regulier ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteWeeklyPlanItem(editingSlot.id!);
          await notificationAsync(NotificationFeedbackType.Warning);
          onSave();
          onClose();
        },
      },
    ]);
  };

  const toggleCategory = useCallback((cat: string) => {
    selectionAsync();
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const selectedClub = clubs.find(c => c.id === selectedClubId);
  const sportObj = SPORTS.find(s => s.id === selectedSport);

  const filteredCategories = Object.keys(SPORTS_BY_CATEGORY).filter(cat => {
    const sportsInCat = SPORTS_BY_CATEGORY[cat as keyof typeof SPORTS_BY_CATEGORY];
    if (!sportSearch) return sportsInCat.length > 0;
    return sportsInCat.some(s =>
      s.name.toLowerCase().includes(sportSearch.toLowerCase())
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {editingSlot ? 'Modifier le creneau' : 'Nouveau creneau'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSubmitting} hitSlop={12}>
            <Check size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Day selector */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Jour de la semaine
          </Text>
          <View style={styles.dayRow}>
            {DAY_SHORT.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: dayOfWeek === i ? colors.accent : colors.backgroundElevated,
                    borderColor: dayOfWeek === i ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  selectionAsync();
                  setDayOfWeek(i);
                }}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: dayOfWeek === i ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {d}
                </Text>
                <Text
                  style={[
                    styles.dayLabel,
                    { color: dayOfWeek === i ? '#FFFFFF90' : colors.textMuted },
                  ]}
                >
                  {DAY_LABELS[i].substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sport selector */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Sport</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
            onPress={() => setShowSportPicker(!showSportPicker)}
          >
            <View style={styles.pickerButtonContent}>
              <View style={[styles.sportIconSmall, { backgroundColor: (sportObj?.color || '#6B7280') + '20' }]}>
                <MaterialCommunityIcons
                  name={(sportObj?.icon || 'trophy') as any}
                  size={20}
                  color={sportObj?.color || '#6B7280'}
                />
              </View>
              <Text style={[styles.pickerButtonText, { color: colors.textPrimary }]}>
                {sportObj?.name || 'Choisir un sport'}
              </Text>
            </View>
            {showSportPicker ? (
              <ChevronDown size={20} color={colors.textMuted} />
            ) : (
              <ChevronRight size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          {showSportPicker && (
            <View style={styles.sportPickerContainer}>
              <View style={[styles.searchBar, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Rechercher..."
                  placeholderTextColor={colors.textMuted}
                  value={sportSearch}
                  onChangeText={setSportSearch}
                />
                {sportSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setSportSearch('')}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {filteredCategories.map(category => {
                const sportsInCat = SPORTS_BY_CATEGORY[category as keyof typeof SPORTS_BY_CATEGORY]
                  .filter(s => !sportSearch || s.name.toLowerCase().includes(sportSearch.toLowerCase()));
                const isExpanded = expandedCategories.includes(category) || sportSearch.length > 0;
                const catIcon = CATEGORY_ICONS[category] || 'dots-horizontal';

                return (
                  <View key={category}>
                    <TouchableOpacity
                      style={[styles.categoryHeader, { backgroundColor: isExpanded ? colors.backgroundElevated : colors.backgroundCard }]}
                      onPress={() => toggleCategory(category)}
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <MaterialCommunityIcons name={catIcon as any} size={18} color={colors.textSecondary} />
                        <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>
                          {CATEGORY_LABELS[category] || category}
                        </Text>
                      </View>
                      <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
                        {sportsInCat.length}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.sportsGrid}>
                        {sportsInCat.map(sport => {
                          const isSelected = selectedSport === sport.id;
                          return (
                            <TouchableOpacity
                              key={sport.id}
                              style={[
                                styles.sportGridItem,
                                { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                                isSelected && { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
                              ]}
                              onPress={() => {
                                selectionAsync();
                                setSelectedSport(sport.id);
                                setShowSportPicker(false);
                              }}
                            >
                              <View style={[styles.sportGridIcon, { backgroundColor: sport.color + '20' }]}>
                                <MaterialCommunityIcons name={sport.icon as any} size={24} color={isSelected ? colors.accent : sport.color} />
                              </View>
                              <Text style={[styles.sportGridName, { color: colors.textPrimary }]} numberOfLines={2}>
                                {sport.name}
                              </Text>
                              {isSelected && (
                                <View style={[styles.sportGridCheck, { backgroundColor: colors.accent }]}>
                                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Club selector */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Club (optionnel)
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
            onPress={() => setShowClubPicker(!showClubPicker)}
          >
            <Text style={[styles.pickerButtonText, { color: selectedClub ? colors.textPrimary : colors.textMuted }]}>
              {selectedClub?.name || 'Aucun club'}
            </Text>
            {showClubPicker ? (
              <ChevronDown size={20} color={colors.textMuted} />
            ) : (
              <ChevronRight size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          {showClubPicker && (
            <View style={styles.clubList}>
              <TouchableOpacity
                style={[styles.clubItem, {
                  backgroundColor: !selectedClubId ? colors.accent + '15' : colors.backgroundCard,
                  borderColor: !selectedClubId ? colors.accent : colors.border,
                }]}
                onPress={() => { selectionAsync(); setSelectedClubId(null); setShowClubPicker(false); }}
              >
                <Text style={[styles.clubItemText, { color: !selectedClubId ? colors.accent : colors.textPrimary }]}>
                  Aucun club
                </Text>
              </TouchableOpacity>
              {clubs.map(club => {
                const isSelected = selectedClubId === club.id;
                return (
                  <TouchableOpacity
                    key={club.id}
                    style={[styles.clubItem, {
                      backgroundColor: isSelected ? colors.accent + '15' : colors.backgroundCard,
                      borderColor: isSelected ? colors.accent : colors.border,
                    }]}
                    onPress={() => { selectionAsync(); setSelectedClubId(club.id!); setShowClubPicker(false); }}
                  >
                    <View style={[styles.clubDot, { backgroundColor: club.color || colors.accent }]} />
                    <Text style={[styles.clubItemText, { color: isSelected ? colors.accent : colors.textPrimary }]}>
                      {club.name}
                    </Text>
                    {isSelected && <Check size={16} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Time picker */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Heure de debut
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
            onPress={() => setShowTimePicker(!showTimePicker)}
          >
            <Text style={[styles.pickerButtonText, { color: colors.textPrimary }]}>
              {String(startTime.getHours()).padStart(2, '0')}:{String(startTime.getMinutes()).padStart(2, '0')}
            </Text>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={colors.textPrimary}
              onChange={(event, selectedTime) => {
                if (Platform.OS === 'android') setShowTimePicker(false);
                if (selectedTime) setStartTime(selectedTime);
              }}
            />
          )}

          {/* Duration */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Durée (minutes)
          </Text>
          <View style={styles.durationRow}>
            {[30, 45, 60, 90, 120].map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: durationMinutes === d ? colors.accent : colors.backgroundElevated,
                    borderColor: durationMinutes === d ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => { selectionAsync(); setDurationMinutes(d); }}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    { color: durationMinutes === d ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.customDurationRow, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
            <TextInput
              style={[styles.durationInput, { color: colors.textPrimary }]}
              value={String(durationMinutes)}
              onChangeText={t => {
                const v = parseInt(t) || 0;
                setDurationMinutes(Math.min(Math.max(v, 0), 480));
              }}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.durationUnit, { color: colors.textMuted }]}>min</Text>
          </View>

          {/* Session type */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Type de séance (optionnel)
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.textPrimary }]}
            value={sessionType}
            onChangeText={setSessionType}
            placeholder="Ex: Cours, Sparring, Drilling..."
            placeholderTextColor={colors.textMuted}
          />

          {/* Label */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Nom personnalise (optionnel)
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.textPrimary }]}
            value={label}
            onChangeText={setLabel}
            placeholder="Ex: JJB du lundi soir"
            placeholderTextColor={colors.textMuted}
          />

          {/* Delete button (edit mode) */}
          {editingSlot?.id && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}
              onPress={handleDelete}
            >
              <Trash2 size={18} color={colors.error} />
              <Text style={[styles.deleteText, { color: colors.error }]}>
                Supprimer ce creneau
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              {editingSlot ? 'Modifier' : 'Ajouter le creneau'}
            </Text>
          </TouchableOpacity>
        </View>

        <PopupComponent />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayText: { fontSize: 15, fontWeight: '700' },
  dayLabel: { fontSize: 9, fontWeight: '500', marginTop: 2 },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerButtonText: { fontSize: 15, fontWeight: '600' },
  sportIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportPickerContainer: { marginTop: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600' },
  categoryCount: { fontSize: 12 },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 4,
    marginBottom: 8,
  },
  sportGridItem: {
    width: '23%',
    aspectRatio: 0.85,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sportGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sportGridName: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  sportGridCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubList: { marginTop: 8, gap: 4 },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  clubDot: { width: 10, height: 10, borderRadius: 5 },
  clubItemText: { fontSize: 14, fontWeight: '600', flex: 1 },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  durationChipText: { fontSize: 14, fontWeight: '600' },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  durationInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 12 },
  durationUnit: { fontSize: 13 },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
  },
  deleteText: { fontSize: 15, fontWeight: '600' },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
