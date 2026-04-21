// ============================================
// PERIOD SELECTOR - Dropdown menu (bottom sheet) avec tous les presets
// + option "Période personnalisée" (du / au)
// ============================================

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDown, Calendar, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export type Period =
  | '7j'
  | '14j'
  | '30j'
  | '60j'
  | '90j'
  | '6m'
  | '9m'
  | '1a'
  | '2a'
  | 'tout'
  | 'custom';

interface PeriodSelectorProps {
  selected: Period;
  onChange: (period: Period) => void;
  customStart?: string; // ISO date
  customEnd?: string;   // ISO date
  onCustomRangeChange?: (start: string, end: string) => void;
}

const PRESETS: Array<{ value: Period; label: string }> = [
  { value: 'tout', label: "Tout l'historique" },
  { value: '7j',   label: '7 jours' },
  { value: '14j',  label: '14 jours' },
  { value: '30j',  label: '30 jours (1 mois)' },
  { value: '60j',  label: '60 jours (2 mois)' },
  { value: '90j',  label: '90 jours (3 mois)' },
  { value: '6m',   label: '6 mois' },
  { value: '9m',   label: '9 mois' },
  { value: '1a',   label: '1 an' },
  { value: '2a',   label: '2 ans' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = React.memo(({
  selected,
  onChange,
  customStart,
  customEnd,
  onCustomRangeChange,
}) => {
  const { colors, isDark } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const [draftStart, setDraftStart] = useState<Date>(
    customStart ? parseISO(customStart) : new Date(Date.now() - 30 * 24 * 3600 * 1000)
  );
  const [draftEnd, setDraftEnd] = useState<Date>(
    customEnd ? parseISO(customEnd) : new Date()
  );

  const currentLabel = useMemo(() => {
    if (selected === 'custom' && customStart && customEnd) {
      const s = format(parseISO(customStart), 'd MMM yy', { locale: fr });
      const e = format(parseISO(customEnd), 'd MMM yy', { locale: fr });
      return `${s} → ${e}`;
    }
    return PRESETS.find(p => p.value === selected)?.label ?? 'Période';
  }, [selected, customStart, customEnd]);

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  const handleSelectPreset = useCallback((value: Period) => {
    haptic();
    onChange(value);
    setModalOpen(false);
  }, [onChange, haptic]);

  const handleOpenCustom = useCallback(() => {
    haptic();
    setModalOpen(false);
    setCustomOpen(true);
  }, [haptic]);

  const handleConfirmCustom = useCallback(() => {
    haptic();
    const startIso = draftStart.toISOString().slice(0, 10);
    const endIso = draftEnd.toISOString().slice(0, 10);
    onCustomRangeChange?.(startIso, endIso);
    onChange('custom');
    setCustomOpen(false);
  }, [draftStart, draftEnd, onChange, onCustomRangeChange, haptic]);

  const bg = isDark ? colors.backgroundCard : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <>
      {/* Bouton dropdown */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { haptic(); setModalOpen(true); }}
        style={[
          styles.triggerButton,
          { backgroundColor: bg, borderColor: border },
        ]}
      >
        <Calendar size={16} color={colors.accent} />
        <Text style={[styles.triggerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {currentLabel}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Modal liste des presets */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: bg }]}
            onPress={() => { /* absorb */ }}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Choisir une période
            </Text>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {PRESETS.map(p => {
                const isActive = selected === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPreset(p.value)}
                    style={[
                      styles.row,
                      isActive && { backgroundColor: colors.accent + '18' },
                    ]}
                  >
                    <Text style={[
                      styles.rowLabel,
                      { color: isActive ? colors.accent : colors.textPrimary },
                      isActive && { fontWeight: '800' },
                    ]}>
                      {p.label}
                    </Text>
                    {isActive && <Check size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.divider, { backgroundColor: border }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenCustom}
                style={[
                  styles.row,
                  selected === 'custom' && { backgroundColor: colors.accent + '18' },
                ]}
              >
                <View style={styles.customLabelRow}>
                  <Calendar size={16} color={selected === 'custom' ? colors.accent : colors.textSecondary} />
                  <Text style={[
                    styles.rowLabel,
                    { color: selected === 'custom' ? colors.accent : colors.textPrimary },
                    selected === 'custom' && { fontWeight: '800' },
                  ]}>
                    Période personnalisée
                  </Text>
                </View>
                {selected === 'custom' && <Check size={18} color={colors.accent} />}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal date range custom */}
      <Modal
        visible={customOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCustomOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: bg }]}
            onPress={() => { /* absorb */ }}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Période personnalisée
            </Text>

            <TouchableOpacity
              style={[styles.dateField, { borderColor: border }]}
              onPress={() => { haptic(); setPickerMode('start'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateFieldLabel, { color: colors.textMuted }]}>Du</Text>
              <Text style={[styles.dateFieldValue, { color: colors.textPrimary }]}>
                {format(draftStart, 'd MMMM yyyy', { locale: fr })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateField, { borderColor: border }]}
              onPress={() => { haptic(); setPickerMode('end'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateFieldLabel, { color: colors.textMuted }]}>Au</Text>
              <Text style={[styles.dateFieldValue, { color: colors.textPrimary }]}>
                {format(draftEnd, 'd MMMM yyyy', { locale: fr })}
              </Text>
            </TouchableOpacity>

            {pickerMode !== null && (
              <DateTimePicker
                value={pickerMode === 'start' ? draftStart : draftEnd}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                locale="fr-FR"
                onChange={(_event, date) => {
                  if (Platform.OS !== 'ios') setPickerMode(null);
                  if (!date) return;
                  if (pickerMode === 'start') {
                    setDraftStart(date);
                    if (date > draftEnd) setDraftEnd(date);
                  } else {
                    setDraftEnd(date);
                    if (date < draftStart) setDraftStart(date);
                  }
                }}
              />
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: border }]}
                onPress={() => setCustomOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                onPress={handleConfirmCustom}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontWeight: '800' }]}>
                  Appliquer
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 48,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  customLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    height: 1,
    marginVertical: 6,
    opacity: 0.6,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  dateFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateFieldValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
