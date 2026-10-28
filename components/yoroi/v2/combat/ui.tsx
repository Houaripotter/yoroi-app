/**
 * Briques visuelles de l'espace Combat (refonte v2, l'armure vivante) :
 * sceau du partenaire, ceinture, barres de bilan, plaques de resultat,
 * feuille du bas avec saisie, champs, etiquettes, banniere de classement.
 */
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { P, tap } from '@/components/yoroi/v2/accueil/kit';
import { beltOf, RESULT_COLOR } from '@/lib/v2/combat/rounds';
import { getSportById, getSportName } from '@/lib/sports';
import type { Result } from '@/lib/v2/combat/rounds';
import { CIcon } from './Icon';
import type { CIconName } from './Icon';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

export { P, tap, Enter, Glass, Card, Kozane, KozaneBar, BrushRing, BigButton, Pill, Stat } from '@/components/yoroi/v2/accueil/kit';
export { Hanko, DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
export { CIcon } from './Icon';
export type { CIconName } from './Icon';

/**
 * Appui avec leger enfoncement et retour haptique. Le style s'applique a la zone
 * d'appui elle-meme : flex et largeur fonctionnent dans les rangees.
 */
export function Press({ onPress, style, children, haptic = 'light', ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; haptic?: 'light' | 'medium' | 'none'; children?: React.ReactNode }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      style={style}
      onPressIn={() => {
        s.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        s.value = withTiming(1, { duration: 140 });
      }}
      onPress={(e) => {
        if (haptic !== 'none') tap(haptic);
        onPress?.(e);
      }}
    >
      <Animated.View style={anim}>{children}</Animated.View>
    </Pressable>
  );
}

export const V = RESULT_COLOR.win;
export const D = RESULT_COLOR.loss;
export const N = RESULT_COLOR.draw;

/** Bouton rond avec icone (44 points) */
export function IconBtn({ icon, label, onPress, tone = 'light', size = 44 }: { icon: CIconName; label: string; onPress: () => void; tone?: 'light' | 'ink' | 'red'; size?: number }) {
  const bg = tone === 'ink' ? P.ink : tone === 'red' ? P.primary : 'rgba(255,255,255,0.86)';
  const fg = tone === 'light' ? P.ink : tone === 'red' ? P.onPrimary : P.white;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: tone === 'light' ? 1 : 0, borderColor: P.white, alignItems: 'center', justifyContent: 'center' }, tone === 'light' ? { shadowColor: '#1D2029', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 } : null]}>
        <CIcon name={icon} size={size * 0.45} color={fg} />
      </View>
    </Press>
  );
}

/** Titre de section avec sous-titre facultatif et action a droite */
export function Section({ title, sub, action, onAction, style }: { title: string; sub?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8, gap: 10 }, style]}>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={20} weight="black" tight>
          {title}
        </Ink>
        {sub ? (
          <Ink size={13} weight="medium" color={P.ink2}>
            {sub}
          </Ink>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={() => { tap(); onAction(); }} hitSlop={12} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Ink size={14} weight="extraBold" color={P.accent}>
            {action}
          </Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Sceau du partenaire : photo ou initiale dans un cachet, ceinture en bas */
export function Seal({ name, photoUri, belt, size = 56, tone = P.accent, rotate = -4 }: { name: string; photoUri?: string; belt?: string; size?: number; tone?: string; rotate?: number }) {
  const b = beltOf(belt);
  const r = size * 0.24;
  return (
    <View style={{ width: size, height: size, transform: [{ rotate: `${rotate}deg` }] }}>
      <View style={{ width: size, height: size, borderRadius: r, borderWidth: Math.max(2, size * 0.05), borderColor: tone, backgroundColor: photoUri ? P.ink : '#FBF7F2', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Ink weight="black" size={size * 0.46} color={tone} style={{ lineHeight: size * 0.56 }}>
            {(name.trim().charAt(0) || '?').toUpperCase()}
          </Ink>
        )}
        {b ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.max(5, size * 0.11), backgroundColor: b.color, borderTopWidth: 1, borderTopColor: b.edge }} /> : null}
      </View>
    </View>
  );
}

/** Ceinture dessinee : bande et noeud */
export function BeltBar({ belt, width = 96, height = 14 }: { belt?: string; width?: number; height?: number }) {
  const b = beltOf(belt);
  if (!b) return null;
  const k = width * 0.36;
  return (
    <Svg width={width} height={height + 10} viewBox={`0 0 ${width} ${height + 10}`}>
      <Rect x={0} y={2} width={width} height={height} rx={3} fill={b.color} stroke={b.edge} strokeWidth={1} />
      <Rect x={width * 0.72} y={2} width={width * 0.14} height={height} fill={b.key === 'noire' ? P.red : P.ink} opacity={b.key === 'blanche' ? 0.85 : 1} />
      <Path d={`M${k} ${2 + height / 2} l-7 ${height / 2 + 7} h6 l5 -${height / 2 + 4} z`} fill={b.color} stroke={b.edge} strokeWidth={1} />
      <Path d={`M${k + 6} ${2 + height / 2} l7 ${height / 2 + 7} h-6 l-5 -${height / 2 + 4} z`} fill={b.color} stroke={b.edge} strokeWidth={1} />
      <Rect x={k - 4} y={0} width={12} height={height + 4} rx={3} fill={b.color} stroke={b.edge} strokeWidth={1.2} />
    </Svg>
  );
}

/** Bilan victoires, defaites, nuls en barres epaisses */
export function RecordBars({ wins, losses, draws, compact }: { wins: number; losses: number; draws: number; compact?: boolean }) {
  const max = Math.max(1, wins, losses, draws);
  const rows: { label: string; v: number; c: string }[] = [
    { label: compact ? 'V' : traduire('Victoires'), v: wins, c: V },
    { label: compact ? 'D' : traduire('Défaites'), v: losses, c: D },
    { label: compact ? 'N' : traduire('Nuls'), v: draws, c: N },
  ];
  const h = compact ? 8 : 12;
  return (
    <View style={{ gap: compact ? 5 : 8 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ink size={compact ? 11 : 13} weight="bold" color={P.ink2} style={{ width: compact ? 12 : 72 }}>
            {traduire(r.label)}
          </Ink>
          <View style={{ flex: 1, height: h, borderRadius: h / 2, backgroundColor: P.line2, overflow: 'hidden' }}>
            <View style={{ width: `${(r.v / max) * 100}%`, height: '100%', borderRadius: h / 2, backgroundColor: r.c }} />
          </View>
          <Ink size={compact ? 13 : 16} weight="black" color={r.v > 0 ? r.c : P.muted} style={{ minWidth: 22, textAlign: 'right' }}>
            {r.v}
          </Ink>
        </View>
      ))}
    </View>
  );
}

/** Plaque de resultat (V, D, N) facon kozane */
export function ResultPlate({ result, size = 28, label, dim }: { result: Result | null | undefined; size?: number; label?: string; dim?: boolean }) {
  const c = result ? RESULT_COLOR[result] : P.line;
  const letter = result === 'win' ? 'V' : result === 'loss' ? 'D' : result === 'draw' ? 'N' : '?';
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <View style={{ width: size, height: size * 1.22, borderTopLeftRadius: size * 0.3, borderTopRightRadius: size * 0.3, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: result ? c : 'transparent', borderWidth: result ? 0 : 1.5, borderColor: P.dashed, borderStyle: result ? 'solid' : 'dashed', opacity: dim ? 0.55 : 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: size * 0.62, height: 3, backgroundColor: result ? 'rgba(255,255,255,0.35)' : P.line }} />
        <Ink size={size * 0.46} weight="black" color={result ? P.white : P.muted}>
          {letter}
        </Ink>
      </View>
      {label ? (
        <Ink size={10} weight="bold" color={P.muted}>
          {label}
        </Ink>
      ) : null}
    </View>
  );
}

/** Barre de progression au pinceau (trait epais arrondi) */
export function InkBar({ value, color = P.ink, height = 10, track = P.line2 }: { value: number; color?: string; height?: number; track?: string }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Champ de saisie v2 */
export function Field({ label, style, multiline, ...rest }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Ink size={13} weight="bold" color={P.ink2}>
          {label}
        </Ink>
      ) : null}
      <TextInput
        placeholderTextColor={P.muted}
        multiline={multiline}
        {...rest}
        style={[
          {
            minHeight: multiline ? 96 : 50,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: P.line,
            backgroundColor: P.white,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 10,
            fontSize: 16,
            color: P.ink,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
    </View>
  );
}

/** Etiquettes modifiables (forces, faiblesses...) */
export function TagEditor({ items, color, onChange, placeholder = traduire('Ajouter') }: { items: string[]; color: string; onChange: (next: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    tap();
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <View style={{ gap: 10 }}>
      {items.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {items.map((it, i) => (
            <Pressable
              key={`${it}_${i}`}
              onPress={() => { tap(); onChange(items.filter((_, j) => j !== i)); }}
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${it}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: `${color}14`, borderWidth: 1, borderColor: `${color}40` }}
            >
              <Ink size={14} weight="bold" color={color}>
                {it}
              </Ink>
              <CIcon name="close" size={12} color={color} width={2.6} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor={P.muted}
          style={{ flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: P.line, backgroundColor: P.white, paddingHorizontal: 12, fontSize: 15, color: P.ink }}
        />
        <Press onPress={add} accessibilityRole="button" accessibilityLabel={traduire("Ajouter")}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <CIcon name="plus" size={20} color={P.white} width={2.6} />
          </View>
        </Press>
      </View>
    </View>
  );
}

/** Puce de choix (petite) */
export function Chip({ label, on, onPress, color = P.ink }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }}>
      <View style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? color : blancA(0.8), borderWidth: 1, borderColor: on ? color : P.line2 }}>
        <Ink size={14} weight="bold" color={on ? P.white : P.ink2}>
          {label}
        </Ink>
      </View>
    </Press>
  );
}

export function ChipScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }} style={{ marginHorizontal: -2 }}>
      {children}
    </ScrollView>
  );
}

/** Feuille du bas avec saisie (clavier gere) */
export function FormSheet({ visible, onClose, title, sub, children }: { visible: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(29,32,41,0.45)' }} onPress={onClose} accessibilityLabel={traduire("Fermer")} />
        <View style={{ backgroundColor: P.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 22, paddingBottom: insets.bottom + 18, maxHeight: '90%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={22} weight="black" tight accessibilityRole="header">
                {title}
              </Ink>
              {sub ? (
                <Ink size={14} color={P.ink2}>
                  {sub}
                </Ink>
              ) : null}
            </View>
            <IconBtn icon="close" label={traduire("Fermer")} onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 6 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Choix moins / valeur / plus */
export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, format, color = P.ink }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; format?: (v: number) => string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Press onPress={() => onChange(Math.max(min, value - step))} accessibilityRole="button" accessibilityLabel={traduire("Moins")}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#E6E4DD', alignItems: 'center', justifyContent: 'center' }}>
          <CIcon name="minus" size={18} color={P.ink} width={2.8} />
        </View>
      </Press>
      <Ink size={22} weight="black" tight color={color} style={{ minWidth: 70, textAlign: 'center' }}>
        {format ? format(value) : String(value)}
      </Ink>
      <Press onPress={() => onChange(Math.min(max, value + step))} accessibilityRole="button" accessibilityLabel="Plus">
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#E6E4DD', alignItems: 'center', justifyContent: 'center' }}>
          <CIcon name="plus" size={18} color={P.ink} width={2.8} />
        </View>
      </Press>
    </View>
  );
}

/** Banniere nobori (drapeau vertical a queue fourchue) */
export function Nobori({ width, height, color, children }: { width: number; height: number; color: string; children?: React.ReactNode }) {
  const notch = Math.min(18, height * 0.12);
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Rect x={width / 2 - 1.5} y={0} width={3} height={height} fill={P.ink} opacity={0.18} />
        <Rect x={2} y={4} width={width - 4} height={5} rx={2.5} fill={P.ink} />
        <Path d={`M6 9 H${width - 6} V${height - 2} L${width / 2} ${height - 2 - notch} L6 ${height - 2} Z`} fill={color} />
        <Path d={`M6 9 H${width - 6} V${height * 0.24}`} stroke="rgba(255,255,255,0.25)" strokeWidth={2} fill="none" />
      </Svg>
      <View style={{ position: 'absolute', left: 6, right: 6, top: 14, bottom: notch + 6, alignItems: 'center' }}>{children}</View>
    </View>
  );
}

/** Ligne cle/valeur sobre */
export function KV({ label, value, color = P.ink }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <Ink size={14} weight="medium" color={P.ink2}>
        {label}
      </Ink>
      <Ink size={15} weight="extraBold" color={color}>
        {value}
      </Ink>
    </View>
  );
}

/** Ligne de classement : rang, libelle, barre, valeur */
export function RankRow({ index, label, value, max, color, suffix = '' }: { index: number; label: string; value: number; max: number; color: string; suffix?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: index === 0 ? color : `${color}1F`, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={12} weight="black" color={index === 0 ? P.white : color}>
            {index + 1}
          </Ink>
        </View>
        <Ink size={15} weight="bold" style={{ flex: 1 }} numberOfLines={2}>
          {label}
        </Ink>
        <Ink size={15} weight="black" color={color}>
          {`${value}${suffix}`}
        </Ink>
      </View>
      <View style={{ paddingLeft: 36 }}>
        <InkBar value={max > 0 ? value / max : 0} color={color} height={7} />
      </View>
    </View>
  );
}

/** Bilan victoires, défaites, nuls en trois pastilles de largeur fixe, alignées d'une ligne à l'autre. */
export function WdlRow({ wins, losses, draws, size = 13, showDraws = true }: { wins: number; losses: number; draws: number; size?: number; showDraws?: boolean }) {
  const items: { n: number; l: string; c: string }[] = [
    { n: wins, l: 'V', c: V },
    { n: losses, l: 'D', c: D },
  ];
  if (showDraws) items.push({ n: draws, l: 'N', c: N });
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {items.map((it) => (
        <View key={it.l} style={{ minWidth: size * 3.6, height: size + 13, paddingHorizontal: 8, borderRadius: (size + 13) / 2, backgroundColor: `${it.c}14`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Ink size={size} weight="black" color={it.n > 0 ? it.c : P.muted}>
            {String(it.n)}
          </Ink>
          <Ink size={size - 2} weight="bold" color={it.n > 0 ? it.c : P.muted}>
            {it.l}
          </Ink>
        </View>
      ))}
    </View>
  );
}

/** Pourcentage à la française : espace insécable avant le signe. */
export function pctText(n: number): string {
  return `${n} %`;
}

/** Nom du sport a afficher : identifiant connu (« jjb », « JJB », « Muay-thaï ») vers son nom, sinon le texte tel quel. */
export function sportLabel(raw?: string | null): string {
  if (!raw) return '';
  const t = raw.trim();
  const keys = [t, t.toLowerCase(), t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_'), t.toLowerCase().replace(/[\s-]+/g, '')];
  for (const k of keys) if (getSportById(k)) return getSportName(k);
  return sansTiret(t);
}
