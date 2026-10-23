/**
 * Briques visuelles de "Ton espace" (refonte v2) : en-tete avec retour rond, cartes,
 * lignes de reglage, interrupteurs, segments, pas a pas et plaques kozane.
 */
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { RecordSeal } from '@/components/yoroi/v2/ornements/RecordSeal';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

// ============================================
// ICONES (traits SVG, pas de dependance externe)
// ============================================

const ICONS: Record<string, string[]> = {
  back: ['M15 6l-6 6 6 6'],
  chevron: ['M9 5l7 7-7 7'],
  check: ['M5 12l5 5L19 7'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  up: ['M6 15l6-6 6 6'],
  down: ['M6 9l6 6 6-6'],
  close: ['M6 6l12 12M18 6L6 18'],
  lock: ['M5 11h14v10H5z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  bell: ['M6 16V11a6 6 0 1 1 12 0v5l2 2H4z', 'M10 21h4'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  watch: ['M8 7h8v10H8z', 'M9 7l1-4h4l1 4M9 17l1 4h4l1-4'],
  scale: ['M4 20h16l-2-13H6z', 'M9 11l3 3'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18'],
  text: ['M5 7V5h14v2M12 5v14M9 19h6'],
  save: ['M5 4h11l3 3v13H5z', 'M8 4v5h7V4M8 20v-6h8v6'],
  restore: ['M4 12a8 8 0 1 0 2.3-5.6L4 8.7', 'M4 4v4.7h4.7'],
  archive: ['M4 5h16v4H4z', 'M6 9v10h12V9M10 13h4'],
  upload: ['M12 16V4M7 9l5-5 5 5', 'M5 20h14'],
  download: ['M12 4v12M7 11l5 5 5-5', 'M5 20h14'],
  table: ['M4 5h16v14H4z', 'M4 10h16M10 10v9'],
  sync: ['M4 12a8 8 0 0 1 14-5.3L20 8', 'M20 4v4h-4', 'M20 12a8 8 0 0 1-14 5.3L4 16', 'M4 20v-4h4'],
  broom: ['M14 4l-4 9', 'M6 13h8l2 7H4z'],
  trash: ['M5 7h14M10 7V4h4v3', 'M7 7l1 13h8l1-13'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  doc: ['M6 3h9l4 4v14H6z', 'M14 3v5h5M9 13h7M9 17h5'],
  spark: ['M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3'],
  share: ['M12 15V3M7 8l5-5 5 5', 'M5 12v8h14v-8'],
  star: ['M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v6M12 7.5v.5'],
  exit: ['M14 4h5v16h-5', 'M10 8l-4 4 4 4M6 12h10'],
  crown: ['M4 18h16l1-10-5 4-4-7-4 7-5-4z'],
  // 16 octobre 2026 : crayon (modifier la photo du rond de profil)
  pencil: ['M4 20l1-4L16 5l3 3L8 19z', 'M14 7l3 3'],
  camera: ['M4 8h4l2-3h4l2 3h4v11H4z', 'M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 3-3 4 4', 'M15 9.5v.5'],
  frame: ['M5 5h14v14H5z', 'M8 8h8v8H8z'],
  quote: ['M7 17c-2 0-3-1.5-3-4 0-3 2-6 5-7M17 17c-2 0-3-1.5-3-4 0-3 2-6 5-7'],
  pulse: ['M3 12h4l2-5 4 10 2-5h6'],
  flame: ['M12 21c-4 0-7-2.7-7-6.5 0-3 2-5 3.5-6.5.3 2 1.3 3 2.5 3.5C11 8 12 5 15 3c0 3 4 5.5 4 11 0 4-3 7-7 7z'],
  grid: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
  code: ['M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14'],
  wand: ['M5 19L17 7', 'M15 5l4 4', 'M19 3v3M17.5 4.5h3'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5'],
  drop: ['M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z'],
  timer: ['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 9v4l2 2M10 2h4'],
  bed: ['M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5', 'M7 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],
  brain: ['M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1z', 'M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1'],
  swords: ['M4 4l9 9M4 4v4M4 4h4', 'M20 4l-9 9M20 4v4M20 4h-4', 'M7 17l-3 3M17 17l3 3'],
  trophy: ['M7 4h10v5a5 5 0 0 1-10 0z', 'M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8'],
  dumbbell: ['M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11'],
  ruler: ['M4 16L16 4l4 4L8 20z', 'M8 12l2 2M11 9l2 2M14 6l2 2'],
  cake: ['M4 20h16v-8H4z', 'M4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 4 0', 'M12 12V8M12 5.5v.5'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 12.5v-1'],
  belt: ['M3 10h18v4H3z', 'M10 9h4v6h-4z', 'M11 15l-2 5M13 15l2 5'],
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16M8 4v4M16 4v4'],
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color, stroke = 2.2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const { theme } = useYoroiTheme();
  const col = color ?? theme.colors.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICONS[name].map((d) => (
        <Path key={d} d={d} stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

// ============================================
// ECRAN : retour rond + titre
// ============================================

export function RoundButton({ icon, onPress, label, light }: { icon: IconName; onPress: () => void; label: string; light?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: pressed ? P.white : light ? P.carte : P.carte,
        borderWidth: 1,
        borderColor: P.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: c.ink,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Icon name={icon} size={20} stroke={2.4} />
    </Pressable>
  );
}

/** Marge laterale commune a tous les ecrans v2 */
export const GUTTER = 22;

/**
 * En-tete commun (16 octobre 2026) : barre compacte, retour rond et titre sur la meme ligne.
 * A placer en haut d'un conteneur dont la marge laterale vaut GUTTER (il deborde sur la marge).
 */
export function EspaceHeader({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return (
    <EnTete
      titre={title}
      sousTitre={subtitle}
      droite={right}
      onRetour={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)))}
      style={{ marginHorizontal: -GUTTER, marginTop: -8 }}
    />
  );
}

export function EspaceScreen({ title, subtitle, right, children, footer, onBack, gap = 18, onScrollY, scrollRef }: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  gap?: number;
  /** 14 octobre : position de defilement (galerie Ta scene : quelle vignette animee est visible) */
  onScrollY?: (y: number) => void;
  /** 14 octobre : pour remonter a l'apercu ou descendre a un bloc */
  scrollRef?: React.Ref<ScrollView>;
}) {
  const { theme } = useYoroiTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [defile, setDefile] = React.useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <EnTete
        titre={title}
        sousTitre={subtitle}
        droite={right}
        onRetour={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)))}
        zoneSure
        defile={defile}
        fond={theme.colors.background}
      />
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const d = y > 4;
          if (d !== defile) setDefile(d);
          onScrollY?.(y);
        }}
        scrollEventThrottle={onScrollY ? 100 : 32}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: GUTTER, paddingBottom: (footer ? 24 : insets.bottom + 40), gap }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.background, borderTopWidth: 1, borderColor: theme.colors.divider }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

// ============================================
// SECTIONS ET CARTES
// ============================================

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4, gap: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={19} weight="black" tight>{title}</Ink>
        {sub ? <Ink size={13} color={theme.colors.textSecondary}>{sub}</Ink> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, glass }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; glass?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        {
          borderRadius: 22,
          backgroundColor: glass ? P.carte : c.surface,
          borderWidth: 1,
          borderColor: glass ? '#FFFFFF' : c.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type RowProps = {
  icon?: IconName;
  iconTint?: string;
  label: string;
  sub?: string;
  subColor?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  first?: boolean;
  right?: React.ReactNode;
  chevron?: boolean;
  badge?: string;
};

export function Row({ icon, iconTint, label, sub, subColor, value, onPress, danger, first, right, chevron = true, badge }: RowProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const tint = danger ? c.danger : iconTint ?? c.ink;
  return (
    <Pressable
      onPress={onPress ? () => { selectionAsync().catch(() => {}); onPress(); } : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 58,
        paddingHorizontal: 14,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: pressed ? c.fillSoft : 'transparent',
        borderTopWidth: first ? 0 : 1,
        borderColor: c.divider,
      })}
    >
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: danger ? c.dangerTint : c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={19} color={tint} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ink size={15} weight="bold" color={danger ? c.danger : c.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</Ink>
          {badge ? (
            <View style={{ backgroundColor: c.successTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Ink size={11} weight="extraBold" color={c.successText}>{badge}</Ink>
            </View>
          ) : null}
        </View>
        {sub ? <Ink size={12} color={subColor ?? c.textMuted} numberOfLines={2}>{sub}</Ink> : null}
      </View>
      {value ? <Ink size={14} color={c.textMuted} numberOfLines={1} style={{ maxWidth: 140 }}>{value}</Ink> : null}
      {right}
      {onPress && chevron && !right ? <Icon name="chevron" size={16} color={c.textMuted} stroke={2.4} /> : null}
    </Pressable>
  );
}

export function ToggleRow({ icon, label, sub, value, onChange, first, disabled }: {
  icon?: IconName;
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Row
      icon={icon}
      label={label}
      sub={sub}
      first={first}
      chevron={false}
      right={
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={(v) => {
            selectionAsync().catch(() => {});
            onChange(v);
          }}
          trackColor={{ false: c.fillSubtle, true: c.accent }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={c.fillSubtle}
          accessibilityLabel={label}
        />
      }
    />
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.fillSoft, borderRadius: 14, padding: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            onPress={() => {
              selectionAsync().catch(() => {});
              onChange(o.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={traduire(o.label)}
            style={{ flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent', shadowColor: c.ink, shadowOpacity: on ? 0.08 : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
          >
            <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textSecondary}>{traduire(o.label)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({ label, onPress, tone = 'ink', loading, disabled, icon, small }: {
  label: string;
  onPress: () => void;
  tone?: 'ink' | 'accent' | 'ghost' | 'gold' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  small?: boolean;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const bg = tone === 'ink' ? c.ink : tone === 'accent' ? c.accent : tone === 'danger' ? c.danger : tone === 'gold' ? c.goldLight : c.fillSoft;
  // vague 45 : en sombre, l'accent et le rouge sont eclaircis : texte encre dessus (c.onAccent), plus de blanc delave
  const fg = tone === 'ink' ? c.background : tone === 'accent' || tone === 'danger' ? c.onAccent : c.ink;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => ({
        minHeight: small ? 44 : 56,
        paddingHorizontal: small ? 16 : 20,
        borderRadius: small ? 14 : 18,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      })}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Icon name={icon} size={18} color={fg} stroke={2.4} /> : null}
          <Ink size={small ? 14 : 16} weight="extraBold" color={fg}>{label}</Ink>
        </>
      )}
    </Pressable>
  );
}

export function Stepper({ value, suffix, onMinus, onPlus, minusLabel, plusLabel }: {
  value: string;
  suffix?: string;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const btn = (icon: IconName, label: string, fn: () => void) => (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); fn(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <Icon name={icon} size={18} stroke={3} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {btn('minus', minusLabel, onMinus)}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Ink size={44} weight="black" tight>{value}</Ink>
        {suffix ? <Ink size={15} color={c.textSecondary}>{suffix}</Ink> : null}
      </View>
      {btn('plus', plusLabel, onPlus)}
    </View>
  );
}

// ============================================
// SIGNATURES : plaque kozane et sceau
// ============================================

export function Plaque({ on, width = 30, gold }: { on: boolean; width?: number; gold?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const h = Math.round((width * 66) / 52);
  return (
    <Svg width={width} height={h} viewBox="0 0 52 66">
      {on ? (
        <>
          <Path d="M5 12 Q5 4 13 4 H39 Q47 4 47 12 V62 H5 Z" fill={c.ink} />
          <Path d="M10 10 Q10 8 13 8 H39 Q42 8 42 10 V16 H10 Z" fill="#3A3D48" opacity={0.9} />
          <Rect x={0} y={30} width={52} height={5} fill={c.accent} />
          <Rect x={0} y={46} width={52} height={5} fill={c.accent} />
          <Circle cx={16} cy={22} r={2.4} fill={gold ? c.goldLight : c.gold} />
          <Circle cx={36} cy={22} r={2.4} fill={gold ? c.goldLight : c.gold} />
        </>
      ) : (
        <>
          <Path d="M5 12 Q5 4 13 4 H39 Q47 4 47 12 V62 H5 Z" fill="none" stroke="#CFCAC0" strokeWidth={2.5} strokeDasharray="5 4" />
          <Rect x={4} y={30} width={44} height={4} fill="#E7D3D1" />
          <Rect x={4} y={46} width={44} height={4} fill="#E7D3D1" />
        </>
      )}
    </Svg>
  );
}

/** Tampon incline : pictogramme dessine, char accepte et ignore */
export function Hanko({ size = 46 }: { char?: string; size?: number }) {
  const { theme } = useYoroiTheme();
  return <Tampon name="vague" size={size} ink={theme.colors.accent} accessibilityLabel={null} />;
}

export function Check({ size = 26 }: { size?: number }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="check" size={size * 0.55} color={theme.colors.onAccent} stroke={3} />
    </View>
  );
}

export function LockBadge({ size = 24 }: { size?: number }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(29,32,41,0.78)', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="lock" size={size * 0.52} color={theme.colors.goldLight} stroke={2.6} />
    </View>
  );
}
