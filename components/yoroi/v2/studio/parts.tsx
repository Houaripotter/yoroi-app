/**
 * Briques du Studio YOROI : contexte partage (rubrique ouverte, recherche, demo chargee,
 * fenetres plein ecran, effacement complet), pages de rubrique, tuiles, pastilles, notes.
 * 26 octobre 2026 : habillage des pages Programmes et Coach (usePaletteProgramme) : fond bleu clair,
 * cartes blanches tres arrondies, carres d'icone teintes (indigo, orange, vert), grands titres.
 * Plus aucun accordeon : chaque rubrique est une tuile qui ouvre sa page d'un toucher.
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
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { traduire } from '@/lib/i18n/tr';

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
  /** « Tout effacer et repartir de zéro » : la premiere confirmation, puis le mot a ecrire */
  repartirDeZero: () => void;
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
  repartirDeZero: () => undefined,
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

// ===== Page de rubrique =====

/**
 * Contenu d'une rubrique du Studio. Depuis le 26 octobre 2026 il n'y a plus d'accordeon : la rubrique
 * s'ouvre en page entiere depuis sa tuile (app/creator-mode.tsx, qui affiche le titre et le retour).
 * Titre, sous-titre et mots cles restent declares ici pour memoire, la tuile reprend les siens.
 */
export function StudioSection({ children }: { id: string; title: string; sub?: string; icon?: IconName; keywords?: string; children: React.ReactNode }) {
  return (
    <Animated.View entering={ENTREE} style={{ gap: 12 }}>
      {children}
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

/** Les trois teintes des tuiles, prises a la palette des pages Programmes et Coach */
export type TonTuile = 'indigo' | 'orange' | 'vert' | 'rouge';

function useTeinte(ton: TonTuile) {
  const pal = usePaletteProgramme();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (ton === 'orange') return { fond: pal.orangeTint, encre: pal.orange };
  if (ton === 'vert') return { fond: pal.vertTint, encre: pal.vert };
  if (ton === 'rouge') return { fond: c.dangerTint, encre: c.danger };
  return { fond: pal.teinte, encre: pal.accent };
}

const ombre = (couleur: string): ViewStyle => ({ shadowColor: couleur, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 });

/**
 * Petite tuile d'action du Studio, trois par ligne : carre d'icone teinte, libelle court et l'etat actuel
 * en dessous (« Halloween forcé », « Chargée »...). Allumee, elle prend l'indigo (ou sa couleur propre :
 * orange d'Halloween, vert de Noël).
 */
export function ActionTile({ icon, label, state, onPress, on, color, busy, disabled, ton = 'indigo' }: { icon: IconName; label: string; state: string; onPress: () => void; on?: boolean; color?: string; busy?: boolean; disabled?: boolean; ton?: TonTuile }) {
  const pal = usePaletteProgramme();
  const t = useTeinte(ton);
  const fill = color ?? pal.indigo;
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
      style={({ pressed }) => [
        {
          width: w ?? '31%',
          minHeight: 122,
          borderRadius: 22,
          paddingHorizontal: 11,
          paddingVertical: 13,
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          backgroundColor: on ? fill : pal.carte,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        ombre(pal.indigo),
      ]}
    >
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: on ? 'rgba(255,255,255,0.2)' : t.fond, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={busy ? 'sync' : icon} size={20} color={on ? '#FFFFFF' : color ?? t.encre} />
      </View>
      <Ink size={14} weight="black" tight color={on ? '#FFFFFF' : pal.texte} numberOfLines={2} style={{ lineHeight: 17 }}>{label}</Ink>
      <Ink size={11.5} weight="bold" color={on ? 'rgba(255,255,255,0.9)' : pal.texte3} numberOfLines={2} style={{ lineHeight: 14 }}>{busy ? traduire('Un instant') : state}</Ink>
    </Pressable>
  );
}

/**
 * Grande tuile coloree des raccourcis (deux par ligne), comme les choix de la page Coach : fond teinte,
 * rond blanc pour l'icone, grand libelle et etat. Allumee, elle passe en indigo.
 */
export function TuileRaccourci({ icon, label, state, onPress, on, busy, ton = 'indigo' }: { icon: IconName; label: string; state: string; onPress: () => void; on?: boolean; busy?: boolean; ton?: TonTuile }) {
  const pal = usePaletteProgramme();
  const t = useTeinte(ton);
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, busy: !!busy }}
      accessibilityLabel={`${label}, ${state}`}
      style={({ pressed }) => ({
        width: '48.5%',
        minHeight: 148,
        padding: 16,
        borderRadius: 26,
        backgroundColor: on ? pal.indigo : t.fond,
        gap: 10,
        justifyContent: 'space-between',
        overflow: 'hidden',
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {on ? <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -50, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' }} /> : null}
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: on ? 'rgba(255,255,255,0.18)' : pal.carte, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={busy ? 'sync' : icon} size={23} color={on ? '#FFFFFF' : t.encre} />
      </View>
      <View style={{ gap: 3 }}>
        <Ink size={16} weight="black" tight color={on ? '#FFFFFF' : pal.texte} numberOfLines={2}>{label}</Ink>
        <Ink size={12} weight="bold" color={on ? 'rgba(255,255,255,0.88)' : pal.texte2} numberOfLines={2}>{busy ? traduire('Un instant') : state}</Ink>
      </View>
    </Pressable>
  );
}

/** Tuile d'une rubrique (deux par ligne) : carte blanche, carre d'icone teinte, titre, ce qu'on y trouve, fleche */
export function TuileRubrique({ icon, title, sub, onPress, ton = 'indigo' }: { icon: IconName; title: string; sub: string; onPress: () => void; ton?: TonTuile }) {
  const pal = usePaletteProgramme();
  const t = useTeinte(ton);
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      style={({ pressed }) => [
        { width: '48.5%', minHeight: 140, padding: 15, borderRadius: 24, backgroundColor: pal.carte, gap: 10, justifyContent: 'space-between', opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ombre(pal.indigo),
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} color={t.encre} />
        </View>
        <Icon name="chevron" size={16} color={pal.texte3} />
      </View>
      <View style={{ gap: 2 }}>
        <Ink size={15.5} weight="black" tight color={pal.texte} numberOfLines={2}>{title}</Ink>
        <Ink size={11.5} weight="bold" color={pal.texte3} numberOfLines={3} style={{ lineHeight: 15 }}>{sub}</Ink>
      </View>
    </Pressable>
  );
}

/** Grille de deux colonnes (raccourcis et rubriques) */
export function GrilleDeux({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>{children}</View>;
}

/** Titre d'un groupe du tableau de bord */
export function TitreGroupe({ children, sous }: { children: string; sous?: string }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ paddingHorizontal: 4, marginTop: 8, gap: 1 }}>
      <Ink size={20} weight="black" tight color={pal.texte} accessibilityRole="header">{children}</Ink>
      {sous ? <Ink size={12.5} weight="bold" color={pal.texte2}>{sous}</Ink> : null}
    </View>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 20, borderWidth: 1, borderColor: c.divider, backgroundColor: c.surface, paddingHorizontal: 14 }}>
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
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel={traduire("Effacer la recherche")} hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={c.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Demande de confirmation (une seule) */
export function confirm(title: string, message: string, okLabel: string, onOk: () => void, destructive = false) {
  appAlert(title, message, [
    { text: traduire('Annuler'), style: 'cancel' },
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
