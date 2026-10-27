/**
 * Briques de l'espace Competitions et objectifs (refonte v2, l'armure vivante) :
 * champ de saisie, choix de date, plaques du compte a rebours, barre au pinceau, ligne d'info, case a cocher.
 */
import React, { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { fontStyle } from '@/components/yoroi/fonts';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { BigButton, Icon, P, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { capitalize, longDate } from '@/lib/v2/competition/dates';
import { blancA, paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type IconName = React.ComponentProps<typeof Icon>['name'];

/** Petit libelle de section (casse de phrase) */
export function Label({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
      <Ink size={13} weight="extraBold" color={P.ink2}>
        {children}
      </Ink>
      {right}
    </View>
  );
}

/** Champ de saisie en carte blanche */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType,
  maxLength,
  multiline,
  suffix,
  autoFocus,
  onSubmit,
}: {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  icon?: IconName;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  multiline?: boolean;
  suffix?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: 10, minHeight: 56, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 16, paddingVertical: multiline ? 12 : 0 }}>
        {icon ? <Icon name={icon} size={19} color={P.muted} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={P.muted}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'url' || keyboardType === 'email-address' ? 'none' : undefined}
          autoCorrect={keyboardType === 'url' || keyboardType === 'email-address' ? false : undefined}
          maxLength={maxLength}
          multiline={multiline}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmit}
          returnKeyType={multiline ? 'default' : 'done'}
          accessibilityLabel={label ?? placeholder}
          style={[fontStyle('bold'), { flex: 1, fontSize: 16, color: P.ink, minHeight: multiline ? 72 : 54, textAlignVertical: multiline ? 'top' : 'center' }]}
        />
        {suffix ? (
          <Ink size={15} weight="extraBold" color={P.muted}>
            {suffix}
          </Ink>
        ) : null}
      </View>
    </View>
  );
}

/** Choix de date : carte qui ouvre le calendrier du telephone */
export function DateField({ label, value, onChange, minimumDate }: { label?: string; value: Date; onChange: (d: Date) => void; minimumDate?: Date }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <Press
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Date'} : ${longDate(value)}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 16 }}>
          <View style={{ width: 44, height: 48, borderRadius: 12, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={19} weight="black" color={P.accent} tight style={{ lineHeight: 21 }}>
              {String(value.getDate())}
            </Ink>
          </View>
          <Ink size={16} weight="extraBold" style={{ flex: 1 }}>
            {capitalize(longDate(value))}
          </Ink>
          <Icon name="calendar" size={20} color={P.muted} />
        </View>
      </Press>
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type !== 'dismissed' && d) onChange(d);
          }}
        />
      ) : null}
      {Platform.OS !== 'android' ? (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? traduire('Choisis la date')}>
          <DateTimePicker value={draft} mode="date" display="inline" minimumDate={minimumDate} themeVariant="light" accentColor={P.accent} onChange={(_, d) => d && setDraft(d)} />
          <BigButton
            label={traduire("Valider")}
            onPress={() => {
              onChange(draft);
              setOpen(false);
            }}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

/** Vague 47 : pastille ronde d'un jour, a la place de la plaque kozane : passee (cochee), aujourd'hui (or), objectif, a venir (pointilles) */
export function DayPlate({ state, w = 26, color = P.ink }: { state: 'past' | 'today' | 'future' | 'rest' | 'goal'; w?: number; color?: string }) {
  const s = w;
  if (state === 'past') {
    return (
      <Svg width={s} height={s} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={12} fill={color} />
        <Path d="M7.6 13.4 L11.3 17 L18.4 9.6" stroke={P.gold} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    );
  }
  if (state === 'goal') {
    return (
      <Svg width={s} height={s} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={12} fill={P.accent} />
        <Circle cx={13} cy={13} r={4} fill={P.goldLight} />
      </Svg>
    );
  }
  if (state === 'today') {
    return (
      <Svg width={s} height={s} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={10.8} fill={P.goldSoft} stroke={P.gold} strokeWidth={2.6} />
      </Svg>
    );
  }
  return (
    <Svg width={s} height={s} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={11.4} fill={state === 'rest' ? 'none' : P.white} stroke={state === 'rest' ? P.line : P.dashed} strokeWidth={1.4} strokeDasharray={state === 'rest' ? '1.4 2.6' : '2.6 2.2'} />
    </Svg>
  );
}

/** Barre de progression au pinceau (trait epais arrondi) */
export function InkBar({ value, color = P.ink, track = P.line, height = 10 }: { value: number; color?: string; track?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Ligne d'information : icone, libelle discret, valeur */
export function InfoRow({ icon, label, value, color = P.ink, last }: { icon: IconName; label: string; value: string; color?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: P.line2 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={color} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={12} weight="bold" color={P.muted}>
          {label}
        </Ink>
        <Ink size={15} weight="extraBold">
          {value}
        </Ink>
      </View>
    </View>
  );
}

/** Case a cocher ronde (44 points) avec tampon quand cochee */
export function CheckDot({ on, onPress, label, color = P.accent }: { on: boolean; onPress: () => void; label: string; color?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={8}>
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 30, height: 30, borderRadius: 10, borderWidth: 2.5, borderColor: on ? color : P.dashed, backgroundColor: on ? color : P.white, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: on ? '-6deg' : '0deg' }] }}>
          {on ? <Icon name="check" size={18} color={P.white} width={3} /> : null}
        </View>
      </View>
    </Press>
  );
}

/** Rangee de pastilles defilante */
export function ChipScroll({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

/** Choix pastille compact (44 points) */
export function Chip({ label, sub, active, onPress, accent = P.ink }: { label: string; sub?: string; active?: boolean; onPress: () => void; accent?: string }) {
  return (
    <Press
      onPress={() => {
        tap();
        onPress();
      }}
      haptic="none"
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ selected: !!active }}
    >
      <View style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? P.primary : P.white, borderWidth: 1, borderColor: active ? P.primary : P.line2 }}>
        <Ink size={14} weight="extraBold" color={active ? P.onPrimary : P.ink}>
          {label}
        </Ink>
        {sub ? (
          <Ink size={11} weight="bold" color={active ? P.onPrimary : P.muted}>
            {sub}
          </Ink>
        ) : null}
      </View>
    </Press>
  );
}

/** Pas a pas : moins, valeur, plus */
export function Stepper({ value, label, onMinus, onPlus, suffix }: { value: string; label: string; onMinus: () => void; onPlus: () => void; suffix?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Press onPress={onMinus} accessibilityRole="button" accessibilityLabel={traduire("Moins, {0}", label)}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="minus" size={20} />
        </View>
      </Press>
      <View style={{ minWidth: 70, alignItems: 'center' }}>
        <Ink size={30} weight="black" tight>
          {value}
        </Ink>
        {suffix ? (
          <Ink size={11} weight="bold" color={P.muted}>
            {suffix}
          </Ink>
        ) : null}
      </View>
      <Press onPress={onPlus} accessibilityRole="button" accessibilityLabel={traduire("Plus, {0}", label)}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={20} color={P.white} />
        </View>
      </Press>
    </View>
  );
}

/** Note discrete en bas d'ecran */
export function Note({ children, color = P.ink2 }: { children: string; color?: string }) {
  return (
    <View style={{ borderRadius: 18, backgroundColor: blancA(0.6), borderWidth: 1, borderColor: P.line2, padding: 14, flexDirection: 'row', gap: 10 }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: P.gold }} />
      <Ink size={13} weight="medium" color={color} style={{ flex: 1, lineHeight: 19 }}>
        {children}
      </Ink>
    </View>
  );
}

/** Chemins d'icones propres a cet espace */
export const EXTRA_ICONS = {
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM17 7h2v13h-2M8 17h9',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  pin: 'M12 21s-6-5.7-6-11a6 6 0 0 1 12 0c0 5.3-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
  walk: 'M13 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 22l2-7 3 3v4M9 12l2-5 4 3 3 1M11 7L7 9v4',
  fire: 'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 5-3 8a6 6 0 0 0 6 6z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
} as const;
export type ExtraIcon = keyof typeof EXTRA_ICONS;

export function XIcon({ name, size = 20, color = P.ink, width = 2.2 }: { name: ExtraIcon; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={EXTRA_ICONS[name]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Bouton rond de 44 points avec une icone de cet espace */
export function RoundAction({ icon, label, onPress, tint }: { icon: ExtraIcon | IconName; label: string; onPress: () => void; tint?: string }) {
  const extra = (icon as string) in EXTRA_ICONS;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: P.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#1D2029', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
        {extra ? <XIcon name={icon as ExtraIcon} size={20} color={tint ?? P.ink} /> : <Icon name={icon as IconName} size={20} color={tint ?? P.ink} />}
      </View>
    </Press>
  );
}

/** Tuile d'acces riche : fleur de cerisier en filigrane, titre, phrase */
export function AccessTile({ title, text, onPress, tone = 'light' }: { kanji?: string; title: string; text: string; onPress: () => void; tone?: 'light' | 'ink' | 'red' }) {
  // 27 octobre 2026 (refonte Pastel) : la tuile rouge devient pastel, texte bleu nuit
  const bg = tone === 'ink' ? P.ink : tone === 'red' ? P.primary : P.white;
  const fg = tone === 'light' ? P.ink : tone === 'red' ? P.onPrimary : P.white;
  const sub = tone === 'light' ? P.ink2 : tone === 'red' ? P.onPrimary : paletteSombre() ? 'rgba(29,32,41,0.78)' : 'rgba(255,255,255,0.78)';
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${text}`} style={{ flex: 1 }}>
      <View style={{ minHeight: 120, borderRadius: 22, backgroundColor: bg, borderWidth: tone === 'light' ? 1 : 0, borderColor: P.line2, padding: 16, overflow: 'hidden', justifyContent: 'space-between' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -10, bottom: -12 }}>
          <Glyph kind="sakura" size={70} color={tone === 'light' ? '#EEF0F7' : tone === 'red' ? 'rgba(35,53,143,0.08)' : 'rgba(255,255,255,0.12)'} />
        </View>
        <Ink size={16} weight="black" tight color={fg}>
          {title}
        </Ink>
        <Ink size={12} weight="bold" color={sub} style={{ marginTop: 6, maxWidth: '86%' }}>
          {text}
        </Ink>
      </View>
    </Press>
  );
}
