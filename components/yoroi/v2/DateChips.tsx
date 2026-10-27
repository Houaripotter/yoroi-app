/**
 * Choix du jour d'une saisie : Aujourd'hui, Hier, Autre date (calendrier du telephone).
 * Les dates circulent au format local yyyy-MM-dd (jamais en UTC).
 * Sur iOS le calendrier s'ouvre dans une feuille du bas v2, sur Android c'est le dialogue natif.
 * Exporte aussi DayNav (fleches jour precedent et suivant, le jour au centre ouvre le calendrier)
 * et DatePickerSheet (le calendrier seul, pour un bouton maison).
 */
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Rect } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { traduire, LOCALE } from '@/lib/i18n/tr';

const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = [traduire('dimanche'), traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi')];
const MONTHS_SHORT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const MONTHS_LONG = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale vers yyyy-MM-dd (pas de passage par toISOString, qui est en UTC) */
export function isoLocalDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** yyyy-MM-dd vers une Date locale a midi (aucun risque de changer de jour) */
export function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayLocalIso(): string {
  return isoLocalDay(new Date());
}

export function shiftIso(iso: string, days: number): string {
  const d = dateFromIso(iso);
  d.setDate(d.getDate() + days);
  return isoLocalDay(d);
}

/** « mar. 12 août », avec l'annee si ce n'est pas l'annee en cours */
export function shortDayLabel(iso: string): string {
  const d = dateFromIso(iso);
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year}`;
}

/** « Aujourd'hui », « Hier », « Demain » ou « Mardi 12 août » */
export function relativeDayLabel(iso: string): string {
  const today = todayLocalIso();
  if (iso === today) return traduire('Aujourd’hui');
  if (iso === shiftIso(today, -1)) return traduire('Hier');
  if (iso === shiftIso(today, 1)) return traduire('Demain');
  const d = dateFromIso(iso);
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  const s = `${DAYS_LONG[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS_LONG[d.getMonth()]}${year}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeToDate(iso: string, time: string): Date {
  const d = dateFromIso(iso);
  const [h, m] = time.split(':').map((x) => parseInt(x, 10) || 0);
  d.setHours(h, m, 0, 0);
  return d;
}

const hhmmOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function CalendarIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={3.5} stroke={color} strokeWidth={2.1} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}

function Chevron({ dir, color }: { dir: 'left' | 'right'; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type PickerProps = {
  visible: boolean;
  /** jour actuel, yyyy-MM-dd */
  value: string;
  onClose: () => void;
  /** jour choisi, et l'heure si withTime */
  onPick: (iso: string, time?: string) => void;
  /** jour maximal, yyyy-MM-dd ; par defaut aujourd'hui ; null pour aucune limite */
  maxDate?: string | null;
  minDate?: string;
  /** heure actuelle « HH:MM » : affiche aussi le choix de l'heure (facultatif) */
  time?: string;
  title?: string;
  /** a l'interieur d'une feuille deja ouverte : calendrier affiche sur place (iOS) au lieu d'une nouvelle feuille */
  inline?: boolean;
};

/** Le calendrier seul : feuille du bas sur iOS, dialogue natif sur Android */
export function DatePickerSheet({ visible, value, onClose, onPick, maxDate, minDate, time, title, inline }: PickerProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const max = maxDate === null ? undefined : dateFromIso(maxDate ?? todayLocalIso());
  if (max) max.setHours(23, 59, 59, 0);
  const min = minDate ? dateFromIso(minDate) : undefined;
  if (min) min.setHours(0, 0, 0, 0);
  const [draft, setDraft] = useState<Date>(() => timeToDate(value, time ?? '12:00'));
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(timeToDate(value, time ?? '12:00'));
    if (Platform.OS === 'android') setAndroidStep('date');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (Platform.OS === 'android') {
    if (!visible || !androidStep) return null;
    return (
      <DateTimePicker
        key={androidStep}
        value={draft}
        mode={androidStep}
        display="default"
        is24Hour
        maximumDate={androidStep === 'date' ? max : undefined}
        minimumDate={androidStep === 'date' ? min : undefined}
        onChange={(e, d) => {
          if (e.type === 'dismissed' || !d) {
            setAndroidStep(null);
            onClose();
            return;
          }
          if (androidStep === 'date') {
            const next = new Date(d);
            next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
            setDraft(next);
            if (time !== undefined) {
              setAndroidStep('time');
              return;
            }
            setAndroidStep(null);
            onPick(isoLocalDay(next));
            onClose();
            return;
          }
          setAndroidStep(null);
          onPick(isoLocalDay(draft), hhmmOf(d));
          onClose();
        }}
      />
    );
  }

  const content = (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 6, paddingVertical: 4, overflow: 'hidden' }}>
        <DateTimePicker
          value={draft}
          mode="date"
          display="inline"
          locale={LOCALE}
          themeVariant="light"
          accentColor={c.accent}
          maximumDate={max}
          minimumDate={min}
          onChange={(_, d) => {
            if (!d) return;
            const next = new Date(d);
            next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
            setDraft(next);
            selectionAsync().catch(() => {});
          }}
        />
      </View>
      {time !== undefined ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, minHeight: 56, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
          <Ink size={15} weight="bold">{traduire("Heure, si tu veux")}</Ink>
          <DateTimePicker
            value={draft}
            mode="time"
            display="compact"
            locale={LOCALE}
            themeVariant="light"
            accentColor={c.accent}
            minuteInterval={5}
            onChange={(_, d) => d && setDraft(d)}
          />
        </View>
      ) : null}
      <Pressable
        onPress={() => {
          selectionAsync().catch(() => {});
          onPick(isoLocalDay(draft), time !== undefined ? hhmmOf(draft) : undefined);
          onClose();
        }}
        accessibilityRole="button"
        style={({ pressed }) => ({ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}
      >
        <Ink size={16} weight="extraBold" color={c.onPrimary}>{traduire("Choisir {0}", shortDayLabel(isoLocalDay(draft)))}</Ink>
      </Pressable>
      {inline ? (
        <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Annuler")}</Ink>
        </Pressable>
      ) : null}
    </View>
  );

  if (inline) return visible ? content : null;
  return (
    <Sheet visible={visible} onClose={onClose} title={title ?? traduire('Choisis le jour')} scroll>
      {content}
    </Sheet>
  );
}

type ChipsProps = {
  value: string;
  onChange: (iso: string) => void;
  maxDate?: string | null;
  minDate?: string;
  /** heure « HH:MM » et son changement : le calendrier propose alors aussi l'heure */
  time?: string;
  onTimeChange?: (t: string) => void;
  todayLabel?: string;
  yesterdayLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** fond des puces selectionnees (encre par defaut) */
  activeColor?: string;
  inline?: boolean;
};

/** Puces Aujourd'hui, Hier, Autre date. La troisieme affiche ensuite la date choisie. */
export function DateChips({ value, onChange, maxDate, minDate, time, onTimeChange, todayLabel, yesterdayLabel, style, activeColor, inline }: ChipsProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const today = todayLocalIso();
  const yesterday = shiftIso(today, -1);
  const other = value !== today && value !== yesterday;
  const on = activeColor ?? c.ink;
  // audit 43 : le texte de la pastille choisie se lit en clair comme en sombre (encre claire en sombre : texte fonce)
  const onFg = activeColor ? c.onAccent : c.background;

  const chip = (label: string, selected: boolean, onPress: () => void, icon?: boolean, a11y?: string) => (
    <Pressable
      key={label}
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: selected ? on : pressed ? c.fillSubtle : 'transparent',
        borderWidth: 1.5,
        borderColor: selected ? on : c.border,
      })}
    >
      {icon ? <CalendarIcon color={selected ? onFg : c.textSecondary} size={16} /> : null}
      <Ink size={14} weight={selected ? 'extraBold' : 'bold'} color={selected ? onFg : c.textSecondary} numberOfLines={1}>
        {label}
      </Ink>
    </Pressable>
  );

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {chip(todayLabel ?? traduire('Aujourd’hui'), value === today, () => onChange(today))}
        {chip(yesterdayLabel ?? traduire('Hier'), value === yesterday, () => onChange(yesterday))}
        {chip(other ? shortDayLabel(value) : 'Autre date', other, () => setOpen(true), true, other ? traduire("Date choisie : {0}, toucher pour changer", shortDayLabel(value)) : traduire('Choisir une autre date'))}
      </View>
      {inline && open ? <View style={{ marginTop: 10 }} /> : null}
      <DatePickerSheet
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(iso, t) => {
          onChange(iso);
          if (t && onTimeChange) onTimeChange(t);
        }}
        maxDate={maxDate}
        minDate={minDate}
        time={onTimeChange ? time ?? '12:00' : undefined}
        inline={inline}
      />
    </View>
  );
}

type NavProps = {
  value: string;
  onChange: (iso: string) => void;
  maxDate?: string | null;
  minDate?: string;
  /** libelle du jour au centre (par defaut Aujourd'hui, Hier ou la date) */
  label?: string;
  prevLabel?: string;
  nextLabel?: string;
  /** dans une feuille deja ouverte */
  inline?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  size?: number;
};

/** Fleches jour precedent et suivant, le jour au centre ouvre le calendrier */
export function DayNav({ value, onChange, maxDate, minDate, label, prevLabel, nextLabel, inline, buttonStyle, size = 19 }: NavProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const limit = maxDate === null ? null : maxDate ?? todayLocalIso();
  const canNext = limit === null || value < limit;
  const canPrev = !minDate || value > minDate;
  const round: ViewStyle = { width: 46, height: 46, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' };
  const text = label ?? relativeDayLabel(value);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => {
            if (!canPrev) return;
            selectionAsync().catch(() => {});
            onChange(shiftIso(value, -1));
          }}
          disabled={!canPrev}
          accessibilityRole="button"
          accessibilityLabel={prevLabel ?? traduire('Jour précédent')}
          style={[round, buttonStyle, { opacity: canPrev ? 1 : 0.35 }]}
        >
          <Chevron dir="left" color={c.ink} />
        </Pressable>
        <Pressable
          onPress={() => {
            selectionAsync().catch(() => {});
            setOpen((o) => !o);
          }}
          accessibilityRole="button"
          accessibilityLabel={traduire("{0}, toucher pour choisir dans le calendrier", text)}
          style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
        >
          <Ink size={size} weight="black" tight numberOfLines={1} style={{ flexShrink: 1 }}>
            {text}
          </Ink>
          <CalendarIcon color={c.textSecondary} size={18} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (!canNext) return;
            selectionAsync().catch(() => {});
            onChange(shiftIso(value, 1));
          }}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel={nextLabel ?? traduire('Jour suivant')}
          style={[round, buttonStyle, { opacity: canNext ? 1 : 0.35 }]}
        >
          <Chevron dir="right" color={c.ink} />
        </Pressable>
      </View>
      {inline && open && Platform.OS === 'ios' ? <View style={{ height: 10 }} /> : null}
      <DatePickerSheet visible={open} value={value} onClose={() => setOpen(false)} onPick={(iso) => onChange(iso)} maxDate={limit} minDate={minDate} inline={inline} />
    </View>
  );
}
