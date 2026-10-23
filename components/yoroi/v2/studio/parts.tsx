/**
 * Briques du Studio YOROI : contexte partage (rubriques ouvertes, recherche, demo chargee,
 * fenetres plein ecran), rubriques repliables, grandes tuiles claires, pastilles, notes.
 * Design v2 : papier de riz, cartes blanches, indigo du theme pour les actions.
 */
import React, { createContext, useContext, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

// ===== Contexte du Studio =====

/** Fenetres plein ecran ouvertes par-dessus le Studio (donnees fictives, rien n'est ecrit) */
export type StudioOverlay =
  | { kind: 'chargement' }
  | { kind: 'rang'; rankIndex: number }
  | { kind: 'dan' }
  | { kind: 'plaque' }
  | { kind: 'sceaux' }
  | { kind: 'lune' }
  | { kind: 'bienvenue' };

export type StudioContextValue = {
  query: string;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  openSection: (id: string) => void;
  onY: (id: string, y: number) => void;
  demoActive: boolean;
  /** relit l'etat de la demo (apres chargement ou retour des vraies donnees) */
  refreshDemo: () => void;
  show: (o: StudioOverlay) => void;
};

const NOOP: StudioContextValue = {
  query: '',
  isOpen: () => true,
  toggle: () => undefined,
  openSection: () => undefined,
  onY: () => undefined,
  demoActive: false,
  refreshDemo: () => undefined,
  show: () => undefined,
};

export const StudioContext = createContext<StudioContextValue>(NOOP);
export const useStudio = () => useContext(StudioContext);

/** Recherche sans accents ni majuscules */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matches(query: string, ...texts: (string | undefined)[]): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return q.split(/\s+/).every((w) => fold(texts.filter(Boolean).join(' ')).includes(w));
}

// ===== Rubrique repliable =====

/**
 * Rubrique du Studio : un en-tete en carte claire (pictogramme, titre, sous-titre, fleche),
 * le contenu seulement une fois ouverte. Avec une recherche : visible si elle correspond,
 * ouverte d'office.
 */
export function StudioSection({ id, title, sub, icon = 'grid', keywords, children }: { id: string; title: string; sub?: string; icon?: IconName; keywords?: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { query, isOpen, toggle, onY } = useStudio();
  const searching = query.trim().length > 0;
  if (searching && !matches(query, title, sub, keywords)) return null;
  const open = searching || isOpen(id);
  return (
    <Animated.View entering={ENTREE} onLayout={(e) => onY(id, e.nativeEvent.layout.y)} style={{ gap: 12 }}>
      <Pressable
        onPress={() => {
          selectionAsync().catch(() => {});
          toggle(id);
        }}
        disabled={searching}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${sub ? `, ${sub}` : ''}, ${open ? 'replier' : 'ouvrir'}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 68,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 22,
          backgroundColor: pressed ? c.fillSubtle : c.surface,
          borderWidth: 1,
          borderColor: open ? c.accent : c.border,
        })}
      >
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={21} color={c.accent} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={17} weight="black" tight>{title}</Ink>
          {sub ? <Ink size={12} color={c.textSecondary} numberOfLines={2}>{sub}</Ink> : null}
        </View>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron" size={18} color={c.textMuted} />
        </View>
      </Pressable>
      {open ? <View style={{ gap: 12 }}>{children}</View> : null}
    </Animated.View>
  );
}

/** Petit titre a l'interieur d'une rubrique */
export function SubTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return (
    <Ink size={13} weight="extraBold" color={theme.colors.textSecondary} style={{ paddingHorizontal: 4, marginTop: 4 }}>
      {children}
    </Ink>
  );
}

// ===== Tuiles =====

/** Grande tuile de raccourci (deux par ligne) */
export function Tile({ icon, label, sub, onPress, on }: { icon: IconName; label: string; sub?: string; onPress: () => void; on?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={({ pressed }) => ({
        width: '48.5%',
        minHeight: 104,
        borderRadius: 22,
        padding: 14,
        gap: 8,
        backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.surface,
        borderWidth: 1,
        borderColor: on ? c.accent : c.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: on ? 'rgba(255,255,255,0.18)' : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={on ? '#FFFFFF' : c.accent} />
      </View>
      <View style={{ gap: 1 }}>
        <Ink size={15} weight="extraBold" color={on ? '#FFFFFF' : c.ink} numberOfLines={2}>{label}</Ink>
        {sub ? <Ink size={12} color={on ? 'rgba(255,255,255,0.86)' : c.textMuted} numberOfLines={2}>{sub}</Ink> : null}
      </View>
    </Pressable>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>{children}</View>;
}

/**
 * Bouton d'action du tableau de bord du Studio (19 octobre 2026), trois par ligne : pictogramme, libelle court
 * et l'etat actuel en dessous (« Halloween forcé », « Chargée »...). Allume, il prend la couleur d'action
 * (ou sa couleur propre : orange d'Halloween, vert de Noël).
 */
export function ActionTile({ icon, label, state, onPress, on, color, busy, disabled }: { icon: IconName; label: string; state: string; onPress: () => void; on?: boolean; color?: string; busy?: boolean; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const fill = color ?? c.accent;
  const gridWidth = useContext(GridWidth);
  const w = gridWidth > 0 ? Math.floor((gridWidth - GRID_GAP * 2) / 3) : undefined;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled, busy: !!busy }}
      accessibilityLabel={`${label}, ${state}`}
      style={({ pressed }) => ({
        width: w ?? '31%',
        minHeight: 112,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 12,
        gap: 7,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: on ? fill : pressed ? c.fillSubtle : c.surface,
        borderWidth: 1,
        borderColor: on ? fill : c.border,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: on ? 'rgba(255,255,255,0.2)' : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={busy ? 'sync' : icon} size={20} color={on ? '#FFFFFF' : color ?? c.accent} />
      </View>
      <Ink size={14} weight="extraBold" color={on ? '#FFFFFF' : c.ink} numberOfLines={2} style={{ lineHeight: 17 }}>{label}</Ink>
      <Ink size={11.5} weight="bold" color={on ? 'rgba(255,255,255,0.9)' : c.textMuted} numberOfLines={2} style={{ lineHeight: 14 }}>{busy ? 'Un instant' : state}</Ink>
    </Pressable>
  );
}

const GRID_GAP = 8;
const GridWidth = createContext(0);

/** Grille de trois colonnes pour les ActionTile (la largeur est mesuree, les tuiles se calent dessus) */
export function ActionGrid({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(0);
  return (
    <GridWidth.Provider value={width}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: GRID_GAP, rowGap: GRID_GAP }}>
        {children}
      </View>
    </GridWidth.Provider>
  );
}

// ===== Pastilles =====

/** Pastille de choix (44 points de haut) */
export function Chip({ label, on, onPress, accessibilityLabel, disabled }: { label: string; on?: boolean; onPress: () => void; accessibilityLabel?: string; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1, backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.fillSoft })}
    >
      <Ink size={14} weight="extraBold" color={on ? '#FFFFFF' : c.ink}>{label}</Ink>
    </Pressable>
  );
}

export function ChipWrap({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

/** Pastille d'etat (en-tete du Studio) */
export function StatePill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'gold' | 'moss' | 'danger' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const map = {
    accent: { bg: c.accentTint, fg: c.accent },
    gold: { bg: c.goldTint, fg: c.goldDeep },
    moss: { bg: c.successTint, fg: c.successText },
    danger: { bg: c.dangerTint, fg: c.danger },
  } as const;
  const m = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: m.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m.fg }} />
      <Ink size={12} weight="extraBold" color={m.fg}>{label}</Ink>
    </View>
  );
}

// ===== Divers =====

/** Petite note explicative */
export function Note({ children, tone }: { children: React.ReactNode; tone?: 'muted' | 'warn' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Ink size={12} color={tone === 'warn' ? c.danger : c.textMuted} style={{ paddingHorizontal: 4, lineHeight: 17 }}>
      {children}
    </Ink>
  );
}

/** Ligne libelle et valeur, en lecture seule */
export function KV({ label, value, first, mono, right }: { label: string; value: string; first?: boolean; mono?: boolean; right?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.divider }}>
      <Ink size={13} color={c.textSecondary} style={{ flex: 1 }}>{label}</Ink>
      <Ink size={14} weight="extraBold" style={{ flexShrink: 1, textAlign: 'right', fontVariant: mono ? ['tabular-nums'] : undefined }} selectable>{value}</Ink>
      {right}
    </View>
  );
}

/** Champ de recherche */
export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 14 }}>
      <Icon name="search" size={18} color={c.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel={label}
        style={{ flex: 1, fontSize: 16, color: c.ink, paddingVertical: 12 }}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Effacer la recherche" hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={c.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Demande de confirmation (une seule) */
export function confirm(title: string, message: string, okLabel: string, onOk: () => void, destructive = false) {
  appAlert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

/** Deux confirmations de suite, pour ce qui ne se rattrape pas */
export function confirmTwice(first: { title: string; message: string; ok: string }, second: { title: string; message: string; ok: string }, onOk: () => void) {
  confirm(first.title, first.message, first.ok, () => confirm(second.title, second.message, second.ok, onOk, true), true);
}

/** Bouton d'action compact a droite d'une ligne */
export function SmallAction({ label, onPress, danger, disabled }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? c.dangerTint : pressed ? c.fillSubtle : c.accentTint, opacity: disabled ? 0.45 : 1 })}
    >
      <Ink size={13} weight="extraBold" color={danger ? c.danger : c.accent}>{label}</Ink>
    </Pressable>
  );
}
