/**
 * Briques visuelles du carnet technique et des chronos (refonte v2, l'armure vivante).
 * Icones dessinees en SVG, en-tete, cartes, barres au pinceau, colonnes, avatars, champs.
 */
import React, { useEffect, useRef } from 'react';
import { CHART_COLORS, tint } from '@/components/yoroi/v2/charts/core';
import { Animated, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { fontStyle } from '@/components/yoroi/fonts';
import { P, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';
import { RetourCompact } from '@/components/yoroi/v2/entete/EnTete';

export { P, Press, tap };
export { Card, Glass, BigButton, Pill, shadow, Enter, Kozane } from '@/components/yoroi/v2/accueil/kit';
export { Hanko, EmptyState } from '@/components/yoroi/v2/ornements/screens';

// ─── Icones ────────────────────────────────────────────────────────────────

export type CIconName =
  | 'back' | 'close' | 'plus' | 'minus' | 'play' | 'pause' | 'stop' | 'skip' | 'reset' | 'check' | 'trash'
  | 'share' | 'film' | 'link' | 'camera' | 'image' | 'search' | 'settings' | 'star' | 'trophy' | 'flag'
  | 'clock' | 'chevron' | 'edit' | 'bolt' | 'shield' | 'users' | 'target' | 'heart' | 'flame' | 'more'
  | 'sound' | 'lock' | 'book' | 'swords' | 'mountain' | 'run' | 'dumbbell' | 'refresh' | 'up' | 'down'
  | 'eye' | 'grid' | 'crown' | 'calendar' | 'note';

const PATHS: Record<CIconName, string> = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  play: 'M7 4.5v15l13-7.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  stop: 'M6 6h12v12H6z',
  skip: 'M5 5l9 7-9 7zM17 5v14',
  reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  share: 'M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M16 16v4',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  chevron: 'M9 5l7 7-7 7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  flame: 'M12 21c4 0 7-2.8 7-6.8 0-3-1.8-5.2-3.6-7.2-.4 2-1.4 3.2-2.6 3.6.4-3.2-.8-6-3.8-7.6.2 3-1.4 5-3 6.8C4.6 11.4 5 13 5 14.2 5 18.2 8 21 12 21z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  sound: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  swords: 'M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M9 14l-4 4M15 14l4 4M6 21l-2-2M18 21l2-2',
  mountain: 'M3 20l6-10 4 6 3-4 5 8z',
  run: 'M14 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 21l2-6 3 3v5M8 11l3-3 4 2 2 4M6 14l3-1',
  dumbbell: 'M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4',
  note: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
};

const FILLED: Partial<Record<CIconName, boolean>> = { play: true, pause: true, stop: true };

export function CIcon({ name, size = 22, color = P.ink, width = 2.2, fill }: { name: CIconName; size?: number; color?: string; width?: number; fill?: string }) {
  const filled = fill ?? (FILLED[name] ? color : 'none');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill={filled} />
    </Svg>
  );
}

/** Bouton rond avec icone (44 points minimum) */
export function IconBtn({ name, label, onPress, tone = 'glass', size = 44, badge, disabled }: { name: CIconName; label: string; onPress: () => void; tone?: 'glass' | 'ink' | 'red' | 'soft'; size?: number; badge?: number; disabled?: boolean }) {
  // vague 45 : en sombre, le verre est la carte sombre (le blanc a 86 % faisait une pastille claire sans icone lisible)
  const bg = tone === 'ink' ? P.ink : tone === 'red' ? P.primary : tone === 'soft' ? (paletteSombre() ? P.line : '#EEF0F7') : paletteSombre() ? P.white : 'rgba(255,255,255,0.86)';
  const sombre = paletteSombre();
  const fg = tone === 'ink' ? P.white : tone === 'red' ? P.onPrimary : P.ink;
  return (
    <Press onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} disabled={disabled}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: tone === 'glass' ? 1 : 0, borderColor: tone === 'glass' && sombre ? P.line : P.white, opacity: disabled ? 0.4 : 1 }, tone === 'glass' ? { shadowColor: '#1D2029', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 } : null]}>
        <CIcon name={name} size={Math.round(size * 0.44)} color={fg} />
        {badge && badge > 0 ? (
          <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Ink size={10} weight="black" color={P.onPrimary}>{badge > 9 ? '9+' : String(badge)}</Ink>
          </View>
        ) : null}
      </View>
    </Press>
  );
}

// ─── En-tete d'ecran ───────────────────────────────────────────────────────

export function ScreenHead({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void; kanji?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/seances' as any)));
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        {/* 28 octobre 2026 : le meme retour rond que tous les ecrans (en-tete commun) */}
        <View style={{ marginLeft: -2 }}>
          <RetourCompact onPress={back} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
      </View>
      <View style={{ paddingHorizontal: 6, gap: 4 }}>
        <Ink size={30} weight="black" tight accessibilityRole="header">{title}</Ink>
        {subtitle ? <Ink size={15} weight="medium" color={P.ink2}>{subtitle}</Ink> : null}
      </View>
    </View>
  );
}

/** Titre de bloc avec action optionnelle */
export function BlockTitle({ title, aside, action, onAction }: { title: string; aside?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 }}>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={20} weight="black" tight>{title}</Ink>
        {aside ? <Ink size={13} weight="medium" color={P.ink2}>{aside}</Ink> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={() => { tap(); onAction(); }} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}>
          <Ink size={14} weight="extraBold" color={P.accent}>{action}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Carte blanche du carnet */
export function Sheet2({ children, style, onPress, label, tint }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string; tint?: string }) {
  const base: ViewStyle = { borderRadius: 24, backgroundColor: tint ?? P.white, borderWidth: 1, borderColor: tint ? 'transparent' : P.line2, padding: 16, gap: 12 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[base, style]}>
      {children}
    </Press>
  );
}

// ─── Barres et graphiques ──────────────────────────────────────────────────

/** Barre horizontale au pinceau, value de 0 a 1 */
export function BrushBar({ value, color = P.ink, height = 10, track = '#EEF0F7' }: { value: number; color?: string; height?: number; track?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Barre empilee (V, N, D par exemple) */
export function SplitBar({ parts, height = 10 }: { parts: { value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: '#EEF0F7', overflow: 'hidden', flexDirection: 'row' }}>
      {parts.map((p, i) => (p.value > 0 ? <View key={i} style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} /> : null))}
    </View>
  );
}

/** Colonnes au pinceau (une seule echelle), derniere colonne en indigo */
export function Columns({ items, height = 120, color = CHART_COLORS.blue, highlightLast = true, goal }: { items: { label: string; value: number; display?: string; color?: string }[]; height?: number; color?: string; highlightLast?: boolean; goal?: number }) {
  const max = Math.max(1, goal ?? 0, ...items.map((i) => i.value));
  const barMax = height - 34;
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      {goal ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 18 + (goal / max) * barMax, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: P.gold }} />
      ) : null}
      {items.map((it, i) => {
        const last = highlightLast && i === items.length - 1;
        const h = it.value > 0 ? Math.max(8, (it.value / max) * barMax) : 4;
        // la colonne en cours en couleur pleine, les autres en teinte claire de la meme couleur
        const c = it.color ?? (last ? P.accent : highlightLast ? tint(color, 0.5) : color);
        return (
          <View key={`${it.label}-${i}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height }}>
            {it.value > 0 ? (
              <Ink size={10} weight="extraBold" color={last ? P.accent : P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{it.display ?? String(Math.round(it.value))}</Ink>
            ) : null}
            <View style={{ width: '56%', maxWidth: 22, height: h, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: it.value > 0 ? c : '#EEF0F7', marginTop: 3 }} />
            <Ink size={10} weight="bold" color={P.muted} style={{ marginTop: 4 }} numberOfLines={1}>{traduire(it.label)}</Ink>
          </View>
        );
      })}
    </View>
  );
}

/** Ligne classee avec barre (top techniques, finitions...) */
export function RankRow({ rank, title, value, sub, ratio, color = P.ink }: { rank?: number; title: string; value: string; sub?: string; ratio: number; color?: string }) {
  const medal = rank === 1 ? P.gold : rank === 2 ? '#A7A9B0' : rank === 3 ? '#B07A45' : null;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {rank ? (
          <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: medal ?? '#EEF0F7', alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={12} weight="black" color={medal ? P.white : P.ink2}>{String(rank)}</Ink>
          </View>
        ) : null}
        <Ink size={15} weight="bold" style={{ flex: 1 }} numberOfLines={1}>{title}</Ink>
        <Ink size={15} weight="black" color={color}>{value}</Ink>
      </View>
      <BrushBar value={ratio} color={color} height={8} />
      {sub ? <Ink size={12} weight="medium" color={P.muted}>{sub}</Ink> : null}
    </View>
  );
}

/** Gros chiffres en rangee */
export function BigStats({ items }: { items: { value: string; unit?: string; label: string; color?: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexBasis: items.length >= 4 ? '50%' : `${100 / items.length}%`, gap: 1, paddingRight: 8 }}>
          <Ink size={28} weight="black" tight color={it.color ?? P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {it.value}
            {it.unit ? <Ink size={13} weight="bold" color={P.muted}>{` ${it.unit}`}</Ink> : null}
          </Ink>
          <Ink size={12} weight="bold" color={P.ink2}>{traduire(it.label)}</Ink>
        </View>
      ))}
    </View>
  );
}

/** Tuile de record (encadre colore doux) */
export function RecordTile({ label, value, sub, tone = 'ink' }: { label: string; value: string; sub?: string; tone?: 'ink' | 'red' | 'indigo' | 'gold' | 'moss' }) {
  const map = { ink: ['#EEF0F7', P.ink], red: [P.accentSoft, P.accent], indigo: [P.indigoSoft, P.indigo], gold: [P.goldSoft, P.goldDark], moss: [P.mossSoft, P.mossText] } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flex: 1, minWidth: 130, borderRadius: 18, backgroundColor: bg, padding: 14, gap: 2 }}>
      <Ink size={12} weight="bold" color={fg}>{label}</Ink>
      <Ink size={24} weight="black" tight color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Ink>
      {sub ? <Ink size={12} weight="medium" color={P.ink2} numberOfLines={2}>{sub}</Ink> : null}
    </View>
  );
}

/** Petite pastille V, D ou N */
export function ResultDot({ result, size = 26 }: { result?: 'win' | 'loss' | 'draw' | 'V' | 'D' | 'N' | null; size?: number }) {
  const r = result === 'win' || result === 'V' ? 'V' : result === 'loss' || result === 'D' ? 'D' : result === 'draw' || result === 'N' ? 'N' : '?';
  const bg = r === 'V' ? P.moss : r === 'D' ? P.danger : r === 'N' ? P.gold : '#CFCAC0';
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ink size={size * 0.46} weight="black" color={P.white}>{r}</Ink>
    </View>
  );
}

export function winColor(rate: number | null): string {
  if (rate === null) return P.muted;
  if (rate >= 60) return P.mossText;
  if (rate >= 40) return P.goldDark;
  return P.danger;
}

// ─── Puces de navigation ───────────────────────────────────────────────────

export function TabChips<T extends string>({ items, value, onChange }: { items: { key: T; label: string; count?: number | null; locked?: boolean }[]; value: T; onChange: (k: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => { tap(); onChange(it.key); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={traduire(it.label)}
            style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}
          >
            {it.locked ? <CIcon name="lock" size={13} color={on ? P.goldLight : P.gold} width={2.4} /> : null}
            <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? P.white : P.ink2}>{traduire(it.label)}</Ink>
            {it.count ? (
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.18)' : '#EEF0F7' }}>
                <Ink size={11} weight="black" color={on ? P.white : P.ink2}>{it.count > 99 ? '99+' : String(it.count)}</Ink>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Petites puces de filtre a l'interieur d'un bloc */
export function MiniChips<T extends string | null>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={String(it.key)} onPress={() => { tap(); onChange(it.key); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: on ? P.ink : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: '#C9CEDF' }}>
            <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? P.white : P.ink2}>{traduire(it.label)}</Ink>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Champs ────────────────────────────────────────────────────────────────

export function Field({ label, style, ...rest }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Ink size={13} weight="bold" color={P.ink2} style={{ paddingHorizontal: 4 }}>{label}</Ink> : null}
      <TextInput
        placeholderTextColor={P.muted}
        {...rest}
        style={[fontStyle('bold'), { minHeight: 52, fontSize: 16, color: P.ink, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line }, rest.multiline ? { minHeight: 90, textAlignVertical: 'top' } : null, style]}
      />
    </View>
  );
}

export function Label({ children }: { children: string }) {
  return <Ink size={13} weight="bold" color={P.ink2} style={{ paddingHorizontal: 4 }}>{children}</Ink>;
}

// ─── Avatar ────────────────────────────────────────────────────────────────

const AVATAR_TONES = ['#2C4A84', '#3D5D9E', '#4F6B28', '#A8832F', '#454A58', '#7B3B63'];

export function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, uri, size = 46, ring, onError }: { name: string; uri?: string; size?: number; ring?: string; onError?: () => void }) {
  const tone = toneFor(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: uri ? '#EEF0F7' : tone, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: ring ? 2.5 : 0, borderColor: ring }}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={onError} /> : <Ink size={size * 0.36} weight="black" color={P.white}>{initialsOf(name)}</Ink>}
    </View>
  );
}

// ─── Message court en bas d'ecran ──────────────────────────────────────────

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const o = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    o.setValue(0);
    Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(o, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [message, o, onDone]);
  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 96, opacity: o, transform: [{ translateY: o.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 48, borderRadius: 24, backgroundColor: P.ink }}>
        <CIcon name="check" size={18} color={P.goldLight} width={2.8} />
        <Ink size={14} weight="extraBold" color={P.white}>{message}</Ink>
      </View>
    </Animated.View>
  );
}

// ─── Plaques kozane de maitrise ────────────────────────────────────────────

/** Vague 47 : pastille ronde a la place de la plaque kozane (maitrisee, en cours, a travailler) */
export function Plate({ state, w = 22, h = 28 }: { state: 'empty' | 'half' | 'full'; w?: number; h?: number }) {
  const s = Math.min(w, h);
  if (state === 'full') {
    return (
      <Svg width={s} height={s} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={12} fill={P.ink} />
        <Path d="M7.6 13.4 L11.3 17 L18.4 9.6" stroke={P.gold} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    );
  }
  if (state === 'half') {
    return (
      <Svg width={s} height={s} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={10.8} fill={P.goldSoft} stroke={P.gold} strokeWidth={2.6} />
      </Svg>
    );
  }
  return (
    <Svg width={s} height={s} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={11.4} fill="none" stroke={P.dashed} strokeWidth={1.4} strokeDasharray="2.6 2.2" />
    </Svg>
  );
}

/** Rangee de pastilles representant un ensemble de techniques *//** Rangee de plaques representant un ensemble de techniques */
export function PlateRow({ mastered, inProgress, total, max = 14 }: { mastered: number; inProgress: number; total: number; max?: number }) {
  if (total <= 0) return null;
  const scale = total > max ? max / total : 1;
  const m = Math.round(mastered * scale);
  const p = Math.round(inProgress * scale);
  const n = Math.min(max, total);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Plate key={i} state={i < m ? 'full' : i < m + p ? 'half' : 'empty'} />
      ))}
    </View>
  );
}

/** Tampon rouge de maitrise, incline, avec une couronne de laurier dessinee (kanji accepte et ignore) */
export function Stamp({ size = 54, label }: { kanji?: string; size?: number; label?: string }) {
  return (
    <View accessibilityLabel={label ?? traduire('Maîtrisé')} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: P.record, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }], backgroundColor: 'rgba(176,40,46,0.06)' }}>
      <View style={{ position: 'absolute', width: size - 10, height: size - 10, borderRadius: (size - 10) / 2, borderWidth: 1, borderColor: P.record, opacity: 0.6 }} />
      <Glyph kind={size >= 40 ? 'laurier' : 'etoile'} size={Math.round(size * 0.6)} color={P.record} />
    </View>
  );
}

/** Bouton d'action flottant rond */
export function Fab({ onPress, label }: { onPress: () => void; label: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', right: 18, bottom: insets.bottom + 20 }}>
      <Press onPress={onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={label}>
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#1B2A44', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <CIcon name="plus" size={28} color={P.onPrimary} width={2.8} />
        </View>
      </Press>
    </View>
  );
}

/** Ligne de choix dans une feuille du bas */
export function ChoiceLine({ title, sub, icon, onPress, danger, right }: { title: string; sub?: string; icon?: CIconName; onPress?: () => void; danger?: boolean; right?: React.ReactNode }) {
  const content = (
    <>
      {icon ? (
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: danger ? P.dangerSoft : '#EEF0F7', alignItems: 'center', justifyContent: 'center' }}>
          <CIcon name={icon} size={20} color={danger ? P.danger : P.ink} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="bold" color={danger ? P.danger : P.ink}>{title}</Ink>
        {sub ? <Ink size={12} weight="medium" color={P.muted}>{sub}</Ink> : null}
      </View>
      {right ?? (onPress ? <CIcon name="chevron" size={18} color={P.muted} /> : null)}
    </>
  );
  const style: ViewStyle = { minHeight: 60, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={style}>
      {content}
    </Press>
  );
}
