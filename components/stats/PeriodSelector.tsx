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
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { fontStyle } from '@/components/yoroi/fonts';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { usePremium } from '@/context/PremiumContext';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { LOCALE } from '@/lib/i18n/tr';

function Glyph({ d, size, color }: { d: string; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
const CalendarIcon = (p: { size: number; color: string }) => <Glyph {...p} d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4" />;
const ChevronDownIcon = (p: { size: number; color: string }) => <Glyph {...p} d="M6 9l6 6 6-6" />;
const CheckIcon = (p: { size: number; color: string }) => <Glyph {...p} d="M5 12.5l4.5 4.5L19 7.5" />;
const LockIcon = (p: { size: number; color: string }) => <Glyph {...p} d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" />;

// Périodes accessibles sans premium
const FREE_PERIODS: Period[] = ['7j', '14j'];

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
  const { theme } = useYoroiTheme();
  const t = theme.colors;
  const colors = { accent: t.accent, textPrimary: t.ink, textSecondary: t.textSecondary, textMuted: t.textMuted };
  const { isPremium } = usePremium();
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
      return `du ${s} au ${e}`;
    }
    return PRESETS.find(p => p.value === selected)?.label ?? 'Période';
  }, [selected, customStart, customEnd]);

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  const handleSelectPreset = useCallback((value: Period) => {
    haptic();
    if (!isPremium && !FREE_PERIODS.includes(value)) {
      setModalOpen(false);
      ouvrirPaywall('periode');
      return;
    }
    onChange(value);
    setModalOpen(false);
  }, [onChange, haptic, isPremium]);

  const handleOpenCustom = useCallback(() => {
    haptic();
    if (!isPremium) {
      setModalOpen(false);
      ouvrirPaywall('periode');
      return;
    }
    setModalOpen(false);
    setCustomOpen(true);
  }, [haptic, isPremium]);

  const handleConfirmCustom = useCallback(() => {
    haptic();
    const startIso = draftStart.toISOString().slice(0, 10);
    const endIso = draftEnd.toISOString().slice(0, 10);
    onCustomRangeChange?.(startIso, endIso);
    onChange('custom');
    setCustomOpen(false);
  }, [draftStart, draftEnd, onChange, onCustomRangeChange, haptic]);

  const bg = t.surface;
  const sheetBg = t.background;
  const border = t.border;

  return (
    <>
      {/* Bouton dropdown */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { haptic(); setModalOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`Période : ${currentLabel}`}
        style={[
          styles.triggerButton,
          { backgroundColor: bg, borderColor: t.divider },
        ]}
      >
        <CalendarIcon size={18} color={colors.accent} />
        <Text style={[styles.triggerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {currentLabel}
        </Text>
        <ChevronDownIcon size={18} color={colors.textMuted} />
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
            style={[styles.sheet, { backgroundColor: sheetBg }]}
            onPress={() => { /* absorb */ }}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Choisir une période
            </Text>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {PRESETS.map(p => {
                const isActive = selected === p.value;
                const isLocked = !isPremium && !FREE_PERIODS.includes(p.value);
                return (
                  <TouchableOpacity
                    key={p.value}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPreset(p.value)}
                    style={[
                      styles.row,
                      isActive && { backgroundColor: t.accentTint },
                      isLocked && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[
                      styles.rowLabel,
                      { color: isActive ? colors.accent : colors.textPrimary },
                      
                    ]}>
                      {p.label}
                    </Text>
                    {isLocked ? (
                      <LockIcon size={16} color={t.goldDeep} />
                    ) : isActive ? (
                      <CheckIcon size={18} color={colors.accent} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.divider, { backgroundColor: border }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenCustom}
                style={[
                  styles.row,
                  selected === 'custom' && { backgroundColor: t.accentTint },
                  !isPremium && { opacity: 0.7 },
                ]}
              >
                <View style={styles.customLabelRow}>
                  <CalendarIcon size={16} color={selected === 'custom' ? colors.accent : colors.textSecondary} />
                  <Text style={[
                    styles.rowLabel,
                    { color: selected === 'custom' ? colors.accent : colors.textPrimary },
                    
                  ]}>
                    Période personnalisée
                  </Text>
                </View>
                {!isPremium ? (
                  <LockIcon size={16} color={t.goldDeep} />
                ) : selected === 'custom' ? (
                  <CheckIcon size={18} color={colors.accent} />
                ) : null}
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
            style={[styles.sheet, { backgroundColor: sheetBg }]}
            onPress={() => { /* absorb */ }}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Période personnalisée
            </Text>

            <TouchableOpacity
              style={[styles.dateField, { borderColor: t.divider, backgroundColor: bg }]}
              onPress={() => { haptic(); setPickerMode('start'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateFieldLabel, { color: colors.textMuted }]}>Du</Text>
              <Text style={[styles.dateFieldValue, { color: colors.textPrimary }]}>
                {format(draftStart, 'd MMMM yyyy', { locale: fr })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateField, { borderColor: t.divider, backgroundColor: bg }]}
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
                locale={LOCALE}
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
                style={[styles.actionBtn, { backgroundColor: bg, borderWidth: 1, borderColor: border }]}
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
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
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
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 52,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    ...fontStyle('extraBold'),
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,32,41,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    backgroundColor: '#E2DFD8',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 24,
    ...fontStyle('black'),
    marginBottom: 12,
    marginLeft: 6,
    letterSpacing: -1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 2,
  },
  rowLabel: {
    fontSize: 16,
    ...fontStyle('bold'),
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
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  dateFieldLabel: {
    fontSize: 14,
    ...fontStyle('bold'),
  },
  dateFieldValue: {
    fontSize: 16,
    ...fontStyle('extraBold'),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    ...fontStyle('extraBold'),
  },
});
