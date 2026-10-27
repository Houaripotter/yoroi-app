/**
 * Briques visuelles de l'espace Seances v2 : bouton retour, tampon hanko, pastille de séance,
 * cartes, puces, boutons et feuille du bas.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { RetourCompact } from '@/components/yoroi/v2/entete/EnTete';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { SceauEtoile } from '@/components/yoroi/v2/accueil/Ornements';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { ornementPour } from '@/components/yoroi/v2/ornements/images';
import type { OrnementKey } from '@/components/yoroi/v2/ornements/images';
import { P } from '@/components/yoroi/livePalette';
import { Pastille } from '@/components/yoroi/v2/dojo/Kozane';
import { traduire } from '@/lib/i18n/tr';

export const tap = () => {
  impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
};

/** Bouton retour rond, en haut a gauche des ecrans de detail (16 octobre 2026 : retour compact commun) */
export function BackButton({ onPress }: { onPress?: () => void; light?: boolean }) {
  const router = useRouter();
  return <RetourCompact onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/seances' as any)))} />;
}

/** Bouton icone rond (modifier, partager, supprimer...) */
export function RoundIcon({ name, label, onPress, color, tint }: { name: IconName; label: string; onPress: () => void; color?: string; tint?: string }) {
  const { theme } = useYoroiTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? P.white : tint ?? P.carte,
        borderWidth: 1,
        borderColor: P.white,
        shadowColor: '#1D2029', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
      })}
    >
      <Icon name={name} size={20} color={color ?? theme.colors.ink} />
    </Pressable>
  );
}

/** Tampon rouge des records : sceau dessine avec une etoile (plus aucune ecriture) */
export function Hanko({ size = 28, color = '#B0282E', rotate = -8, filled }: { size?: number; color?: string; rotate?: number; filled?: boolean }) {
  return <SceauEtoile size={size} color={color} rotate={rotate} filled={filled} />;
}

export type PlateState = 'done' | 'planned' | 'missed' | 'empty' | 'rest';

/**
 * Vague 45 : pastilles de séance à la place des plaques kozane.
 * done = pastille pleine cochée, planned = contour indigo épais, missed = pastille vide barrée,
 * rest = pastille vide avec une lune, empty = pastille vide. Diamètre = le plus petit de width et height.
 */
export function Kozane({ state, width = 34, height = 42, count: _count }: { state: PlateState; width?: number; height?: number; count?: number }) {
  const taille = Math.min(width, height);
  if (state === 'done') return <Pastille etat="fait" taille={taille} />;
  if (state === 'planned') return <Pastille etat="partiel" taille={taille} />;
  if (state === 'missed') return <Pastille etat="vide" taille={taille} signe="manque" />;
  if (state === 'rest') return <Pastille etat="vide" taille={taille} signe="repos" />;
  return <Pastille etat="vide" taille={taille} />;
}

/** Carte en verre (fond blanc translucide, bordure blanche) */
export function Glass({ children, style, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const { theme } = useYoroiTheme();
  const base: ViewStyle = { borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: theme.colors.divider, padding: 16 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [base, style, pressed ? { backgroundColor: P.white, transform: [{ scale: 0.99 }] } : null]}
    >
      {children}
    </Pressable>
  );
}

/** Titre de section avec lien optionnel a droite */
export function SectionTitle({ title, action, onAction, sub }: { title: string; action?: string; onAction?: () => void; sub?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, marginTop: 10 }}>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={21} weight="black" tight>{title}</Ink>
        {sub ? <Ink size={13} color={c.textSecondary}>{sub}</Ink> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={() => { tap(); onAction(); }} accessibilityRole="button" hitSlop={10} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 10 }}>
          <Ink size={14} weight="extraBold" color={c.accent}>{action}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Puce de filtre */
export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: on ? c.ink : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: '#C9CEDF' }}
    >
      <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? P.paper : c.textSecondary}>{label}</Ink>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
      {children}
    </ScrollView>
  );
}

/** Onglets segmentes (Semaine, Mois...) */
export function Segments<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.fillSubtle, borderRadius: 16, padding: 4, gap: 4 }}>
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
            style={{ flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.white : 'transparent', shadowColor: c.ink, shadowOpacity: on ? 0.08 : 0, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
          >
            <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ paddingHorizontal: 4 }}>{traduire(it.label)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Gros bouton d'action */
export function BigButton({ label, onPress, tone = 'accent', icon, style }: { label: string; onPress: () => void; tone?: 'accent' | 'ink' | 'soft' | 'danger'; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // 27 octobre 2026 (refonte Pastel) : le bouton principal en pastel, texte bleu nuit
  const bg = tone === 'accent' ? c.primary : tone === 'ink' ? c.ink : tone === 'danger' ? c.dangerTint : c.fillSubtle;
  const fg = tone === 'accent' ? c.onPrimary : tone === 'ink' ? c.background : tone === 'danger' ? c.danger : c.ink;
  return (
    <Pressable
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        { minHeight: 56, borderRadius: 18, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, opacity: pressed ? 0.88 : 1 },
        tone === 'accent' ? { shadowColor: '#1B2A44', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 } : null,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={fg} strokeWidth={2.6} /> : null}
      <Ink size={16} weight="extraBold" color={fg} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</Ink>
    </Pressable>
  );
}

/** Feuille qui monte du bas */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel={traduire("Fermer")} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.45)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 22, maxHeight: '88%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 12 }} />
          {title ? <Ink size={22} weight="black" tight style={{ paddingHorizontal: 4, marginBottom: 10 }}>{title}</Ink> : null}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Ligne de liste dans une feuille ou une carte */
export function Row({ title, sub, onPress, icon, right, danger }: { title: string; sub?: string; onPress?: () => void; icon?: IconName; right?: React.ReactNode; danger?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const content = (
    <>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: danger ? c.dangerTint : c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={danger ? c.danger : c.ink} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="bold" color={danger ? c.danger : c.ink}>{title}</Ink>
        {sub ? <Ink size={12} color={c.textMuted}>{sub}</Ink> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={18} color={c.textMuted} /> : null)}
    </>
  );
  const style: ViewStyle = { minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => [style, pressed ? { backgroundColor: P.white } : null]}>
      {content}
    </Pressable>
  );
}

/** Etat vide engageant, avec un ornement illustre adapte au contexte (torii par defaut) */
export function EmptyState({ title, text, action, onAction, ornement }: { title: string; text: string; action?: string; onAction?: () => void; kanji?: string; ornement?: OrnementKey }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 26, paddingHorizontal: 16, borderRadius: 24, backgroundColor: P.carte, borderWidth: 1.5, borderColor: '#C9CEDF', borderStyle: 'dashed' }}>
      <Ornement name={ornement ?? ornementPour(title, text)} size={88} />
      <Ink size={19} weight="black" tight style={{ textAlign: 'center' }}>{title}</Ink>
      <Ink size={14} color={c.textSecondary} style={{ textAlign: 'center' }}>{text}</Ink>
      {action && onAction ? <BigButton label={action} onPress={onAction} tone="ink" style={{ marginTop: 6, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

/** Petite tuile de chiffre (gros chiffre tres gras) */
export function Stat({ value, unit, label, color }: { value: string; unit?: string; label: string; color?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexGrow: 1, flexBasis: '30%', minWidth: 96, padding: 14, borderRadius: 18, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textSecondary}>{label}</Ink>
      <Ink size={24} weight="black" tight color={color ?? c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
        {unit ? <Ink size={13} weight="bold" color={c.textSecondary}>{` ${unit}`}</Ink> : null}
      </Ink>
    </View>
  );
}
