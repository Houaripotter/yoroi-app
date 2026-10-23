/**
 * Briques visuelles de l'espace Nutrition et Soins (refonte v2, l'armure vivante).
 * Icones dessinees, champs chiffres, tuiles de choix, encadres de securite,
 * barres de macros, feuille du bas et lignes de sources.
 */
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { safeOpenURL } from '@/lib/security/validators';
import { Card, P, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import type { Source } from '@/lib/v2/nutrition/formulas';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export { P, tap };

/** Palette graphique validee pour plusieurs series */
export const SERIES = { blue: '#3D5D9E', moss: '#6E8C3A', gold: '#A8832F' };

/** 'red' garde son nom mais suit la couleur d'action (indigo) ; 'danger' pour les avertissements */
export type Tone = 'red' | 'danger' | 'gold' | 'indigo' | 'moss' | 'muted' | 'ink';

export function toneColor(t: Tone): { fg: string; soft: string } {
  switch (t) {
    case 'red':
      return { fg: P.accent, soft: P.accentSoft };
    case 'danger':
      return { fg: P.danger, soft: P.dangerSoft };
    case 'gold':
      return { fg: P.goldDark, soft: P.goldSoft };
    case 'indigo':
      return { fg: P.indigo, soft: P.indigoSoft };
    case 'moss':
      return { fg: P.mossText, soft: P.mossSoft };
    case 'ink':
      return { fg: P.ink, soft: '#ECEAE4' };
    default:
      return { fg: P.ink2, soft: '#ECEAE4' };
  }
}

// ============================================
// ICONES
// ============================================

const PATHS = {
  fork: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3v11',
  drop: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z',
  flame: 'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 5-3 8a6 6 0 0 0 6 6z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  scale: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8.5 10a3.5 3.5 0 0 1 7 0M12 10l1.5-2',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  bellOff: 'M6 16V11a6 6 0 0 1 9-5.2M18 11v5l2 2H8M10 20a2 2 0 0 0 4 0M4 4l16 16',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  link: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  pin: 'M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  leaf: 'M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  body: 'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 8h14M12 8v6M12 14l-3 7M12 14l3 7',
  snow: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4l3 2 3-2M9 20l3-2 3 2',
  bed: 'M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15.6L3 12a1.5 1.5 0 0 1 2.8-1L8 14',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  steth: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2M20 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  arrowUp: 'M12 20V5M6 11l6-6 6 6',
  move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
  circle: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  down: 'M3 7l6 6 4-4 8 8M15 17h6v-6',
  swords: 'M4 4l10 10M14 20l6-6M4 4h4v4M17 17l3 3M20 4L10 14M10 20l-6-6M20 4h-4v4M7 17l-3 3',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  waves: 'M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  percent: 'M19 5L5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6',
} as const;

export type NIconName = keyof typeof PATHS;

export function NIcon({ name, size = 22, color = P.ink, width = 2.2 }: { name: NIconName; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Pastille d'icone ronde teintee */
export function IconDot({ name, tone = 'ink', size = 40 }: { name: NIconName; tone?: Tone; size?: number }) {
  const c = toneColor(tone);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
      <NIcon name={name} size={size * 0.5} color={c.fg} />
    </View>
  );
}

// ============================================
// TEXTE ET MISE EN PAGE
// ============================================

export function H2({ children, sub, right }: { children: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={20} weight="black" tight accessibilityRole="header">
          {children}
        </Ink>
        {sub ? (
          <Ink size={13} weight="medium" color={P.ink2}>
            {sub}
          </Ink>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Badge({ label, tone = 'ink' }: { label: string; tone?: Tone }) {
  const c = toneColor(tone);
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: c.soft }}>
      <Ink size={12} weight="extraBold" color={c.fg}>
        {label}
      </Ink>
    </View>
  );
}

/** Gros chiffre tres gras avec unite */
export function BigNumber({ value, unit, color = P.ink, size = 64 }: { value: string; unit?: string; color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Ink size={size} weight="black" tight color={color} numberOfLines={1} style={{ lineHeight: Math.round(size * 1.05) }}>
        {value}
      </Ink>
      {unit ? (
        <Ink size={Math.max(14, size * 0.28)} weight="extraBold" color={P.ink2}>
          {unit}
        </Ink>
      ) : null}
    </View>
  );
}

/** Ligne libelle et valeur */
export function KV({ label, value, strong, color, last }: { label: string; value: string; strong?: boolean; color?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: P.line2 }}>
      <Ink size={14} weight={strong ? 'extraBold' : 'medium'} color={strong ? P.ink : P.ink2} style={{ flex: 1 }}>
        {label}
      </Ink>
      <Ink size={strong ? 17 : 15} weight={strong ? 'black' : 'extraBold'} color={color ?? P.ink} tight={strong}>
        {value}
      </Ink>
    </View>
  );
}

/** Puce de liste : un petit rond, pour ne pas ressembler a un tiret */
export function Bullet({ children, color = P.accent }: { children: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 8 }} />
      <Ink size={14} weight="medium" color={P.ink2} style={{ flex: 1 }}>
        {children}
      </Ink>
    </View>
  );
}

// ============================================
// ENCADRES
// ============================================

/** Encadre d'information ou de securite, mis en evidence */
export function Notice({ tone = 'gold', title, text, icon, style }: { tone?: Tone; title?: string; text: string; icon?: NIconName; style?: StyleProp<ViewStyle> }) {
  const c = toneColor(tone);
  return (
    <View style={[{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 20, backgroundColor: c.soft, alignItems: 'flex-start' }, style]} accessibilityRole="alert">
      <NIcon name={icon ?? (tone === 'red' ? 'alert' : tone === 'moss' ? 'check' : 'info')} size={20} color={c.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Ink size={15} weight="black" color={c.fg}>
            {title}
          </Ink>
        ) : null}
        <Ink size={13} weight="bold" color={tone === 'red' || tone === 'gold' ? c.fg : P.ink2}>
          {text}
        </Ink>
      </View>
    </View>
  );
}

/** Ligne de source scientifique, ouvrable si elle a un lien */
export function SourceRow({ source }: { source: Source }) {
  const content = (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 }}>
      <NIcon name={source.url ? 'link' : 'book'} size={16} color={source.url ? P.indigo : P.muted} />
      <View style={{ flex: 1 }}>
        <Ink size={13} weight="extraBold" color={P.ink}>
          {traduire(source.label)}
        </Ink>
        <Ink size={12} weight="medium" color={P.ink2}>
          {source.ref}
        </Ink>
      </View>
    </View>
  );
  if (!source.url) return content;
  return (
    <Pressable onPress={() => { tap(); safeOpenURL(source.url!); }} accessibilityRole="link" accessibilityLabel={traduire("Ouvrir la source {0}", source.label)}>
      {content}
    </Pressable>
  );
}

export function SourcesCard({ sources, note }: { sources: Source[]; note?: string }) {
  return (
    <Card style={{ gap: 2, paddingVertical: 10 }}>
      {sources.map((s) => (
        <SourceRow key={s.label} source={s} />
      ))}
      {note ? (
        <Ink size={12} weight="medium" color={P.ink2} style={{ marginTop: 6 }}>
          {note}
        </Ink>
      ) : null}
    </Card>
  );
}

// ============================================
// SAISIE
// ============================================

/** Champ chiffre en grand, unite a droite */
export function NumField({
  label,
  value,
  onChange,
  unit,
  placeholder = '0',
  integer,
  maxLength = 6,
  style,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  integer?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={[{ flex: 1, minWidth: 96, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }, style]}>
      <Ink size={12} weight="bold" color={P.ink2}>
        {label}
      </Ink>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <TextInput
          value={integer ? value : value.replace('.', DECIMAL)}
          onChangeText={(t) => onChange(integer ? t.replace(/[^0-9]/g, '') : t.replace(',', '.').replace(/[^0-9.]/g, ''))}
          keyboardType={keyboardType ?? (integer ? 'number-pad' : 'decimal-pad')}
          placeholder={placeholder}
          placeholderTextColor={P.dashed}
          maxLength={maxLength}
          accessibilityLabel={label}
          selectTextOnFocus
          style={[fontStyle('black'), { flex: 1, fontSize: 28, color: P.ink, paddingVertical: 2, letterSpacing: -1, minHeight: 40 }]}
        />
        {unit ? (
          <Ink size={14} weight="extraBold" color={P.ink2}>
            {unit}
          </Ink>
        ) : null}
      </View>
    </View>
  );
}

/** Champ texte simple */
export function TextField({ label, value, onChange, placeholder, multiline, maxLength = 1000 }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; maxLength?: number }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Ink size={12} weight="bold" color={P.ink2} style={{ paddingHorizontal: 4 }}>
          {label}
        </Ink>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={P.muted}
        multiline={multiline}
        maxLength={maxLength}
        accessibilityLabel={label ?? placeholder}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[fontStyle('medium'), { minHeight: multiline ? 92 : 52, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: P.ink }]}
      />
    </View>
  );
}

/** Tuile de choix (titre et sous-titre), active en encre */
export function ChoiceTile({ title, sub, extra, active, onPress, warn, style }: { title: string; sub?: string; extra?: string; active: boolean; onPress: () => void; warn?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={sub ? `${title}, ${sub}` : title} style={style}>
      <View style={{ minHeight: 56, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, gap: 2, backgroundColor: active ? P.ink : P.white, borderWidth: 1, borderColor: active ? P.ink : warn ? P.dangerSoft : P.line2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ink size={15} weight="extraBold" color={active ? P.white : P.ink} style={{ flexShrink: 1 }}>
            {title}
          </Ink>
          {warn ? <NIcon name="alert" size={14} color={active ? P.goldLight : P.danger} /> : null}
        </View>
        {sub ? (
          <Ink size={12} weight="bold" color={active ? '#D9D7D0' : P.ink2}>
            {sub}
          </Ink>
        ) : null}
        {extra ? (
          <Ink size={12} weight="medium" color={active ? '#D9D7D0' : P.ink2}>
            {extra}
          </Ink>
        ) : null}
      </View>
    </Press>
  );
}

/** Onglets segmentes */
export function Segments<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#E9E7E0', borderRadius: 18, padding: 4, gap: 4 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              tap();
              onChange(it.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.white : 'transparent', shadowColor: P.ink, shadowOpacity: on ? 0.08 : 0, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
          >
            <Ink size={14} weight={on ? 'black' : 'bold'} color={on ? P.ink : P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ paddingHorizontal: 4 }}>
              {traduire(it.label)}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Rangee horizontale defilante */
export function HRow({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ gap, paddingHorizontal: 22 }}>
      {children}
    </ScrollView>
  );
}

/** Pastille compacte */
export function Chip({ label, active, onPress, accent = P.ink }: { label: string; active?: boolean; onPress: () => void; accent?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }} accessibilityLabel={label}>
      <View style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? accent : P.white, borderWidth: 1, borderColor: active ? accent : P.line2 }}>
        <Ink size={14} weight={active ? 'extraBold' : 'bold'} color={active ? P.white : P.ink2}>
          {label}
        </Ink>
      </View>
    </Press>
  );
}

/** Choix homme ou femme */
export function GenderSwitch({ value, onChange }: { value: 'male' | 'female'; onChange: (g: 'male' | 'female') => void }) {
  return (
    <Segments
      items={[
        { key: 'male', label: traduire('Homme') },
        { key: 'female', label: traduire('Femme') },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

/** Compteur avec moins et plus */
export function Stepper({ value, onChange, min = 1, max = 365, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit: string }) {
  const btn = (icon: 'minus' | 'plus', next: number, label: string) => (
    <Press onPress={() => onChange(Math.max(min, Math.min(max, next)))} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, alignItems: 'center', justifyContent: 'center' }}>
        <NIcon name={icon} size={22} />
      </View>
    </Press>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn('minus', value - 1, traduire('Un de moins'))}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <BigNumber value={String(value)} unit={unit} size={44} />
      </View>
      {btn('plus', value + 1, traduire('Un de plus'))}
    </View>
  );
}

// ============================================
// MACROS
// ============================================

export type MacroLine = { key: string; label: string; grams: number; percent: number; color: string };

/** Barre empilee des macros et detail par ligne, palette validee */
export function MacroBars({ lines, compact }: { lines: MacroLine[]; compact?: boolean }) {
  const total = lines.reduce((s, l) => s + l.percent, 0) || 1;
  return (
    <View style={{ gap: compact ? 10 : 14 }}>
      <View style={{ flexDirection: 'row', height: compact ? 12 : 18, borderRadius: 10, overflow: 'hidden', backgroundColor: P.line, gap: 3 }}>
        {lines.map((l) => (
          <View key={l.key} style={{ flex: l.percent / total, backgroundColor: l.color, borderRadius: 6 }} />
        ))}
      </View>
      {lines.map((l) => (
        <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={traduire("{0} : {1} grammes, {2} pour cent", l.label, l.grams, l.percent)}>
          <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: l.color }} />
          <Ink size={15} weight="bold" style={{ flex: 1 }}>
            {traduire(l.label)}
          </Ink>
          {!compact ? (
            <View style={{ width: 70, height: 6, borderRadius: 3, backgroundColor: P.line, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, l.percent)}%`, height: '100%', backgroundColor: l.color, borderRadius: 3 }} />
            </View>
          ) : null}
          <Ink size={compact ? 17 : 22} weight="black" tight style={{ minWidth: 64, textAlign: 'right' }}>
            {`${l.grams} g`}
          </Ink>
          <Ink size={12} weight="bold" color={P.ink2} style={{ width: 36, textAlign: 'right' }}>
            {`${l.percent} %`}
          </Ink>
        </View>
      ))}
    </View>
  );
}

// ============================================
// FEUILLE DU BAS
// ============================================

export function BottomSheet({ visible, onClose, title, subtitle, children, footer }: { visible: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(29,32,41,0.42)' }} onPress={onClose} accessibilityLabel={traduire("Fermer")} />
        <View style={{ maxHeight: '90%', backgroundColor: P.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line, marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={24} weight="black" tight accessibilityRole="header">
                {title}
              </Ink>
              {subtitle ? (
                <Ink size={14} weight="bold" color={P.ink2}>
                  {subtitle}
                </Ink>
              ) : null}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} hitSlop={6} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, alignItems: 'center', justifyContent: 'center' }}>
              <NIcon name="close" size={18} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 14, gap: 14, paddingBottom: footer ? 14 : insets.bottom + 24 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 4 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Carte appuyable avec fleche */
export function LinkCard({ icon, tone = 'ink', title, sub, onPress, right }: { icon: NIconName; tone?: Tone; title: string; sub?: string; onPress: () => void; right?: React.ReactNode }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={sub ? `${title}, ${sub}` : title}>
      <View style={{ minHeight: 64, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconDot name={icon} tone={tone} />
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={15} weight="extraBold">
            {title}
          </Ink>
          {sub ? (
            <Ink size={12} weight="medium" color={P.ink2}>
              {sub}
            </Ink>
          ) : null}
        </View>
        {right ?? <NIcon name="chevron" size={18} color={P.muted} />}
      </View>
    </Press>
  );
}
