/**
 * Briques d'interface des ecrans Progres (refonte v2) : bouton retour rond,
 * en-tete, cartes en verre, pastilles de choix, tampon, boutons.
 */
import React from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { EnTete, RetourCompact } from '@/components/yoroi/v2/entete/EnTete';
import { RECORD_RED, TropheeRecord } from '../charts/core';
import { PlusHint } from '../PlusHint';
import { RecordSeal } from '@/components/yoroi/v2/ornements/RecordSeal';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export const GUTTER = 22;
export const GLASS = 'rgba(255,255,255,0.78)';

export function tapLight() {
  impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
}
export function tapSelect() {
  selectionAsync().catch(() => {});
}

export function Chevron({ color, size = 16, dir = 'right' }: { color: string; size?: number; dir?: 'right' | 'left' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={dir === 'right' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  // 16 octobre 2026 : retour compact commun (cercle de 40, zone de toucher de 44)
  return <RetourCompact onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/progres' as any)))} />;
}

export function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? c.fillSoft : P.carte, borderWidth: 1, borderColor: P.carte, alignItems: 'center', justifyContent: 'center' })}
    >
      {children}
    </Pressable>
  );
}

/** En-tete d'ecran de detail (16 octobre 2026) : barre compacte figee, retour, titre et action sur la meme ligne */
export function DetailHeader({ title, sub, right, onBack }: { title: string; sub?: string; right?: React.ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return <EnTete titre={title} sousTitre={sub} droite={right} onRetour={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/progres' as any)))} zoneSure="insets" />;
}

export function GlassCard({ children, style, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const base: ViewStyle = { borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, padding: 16 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [base, style, pressed ? { backgroundColor: c.fillSoft, transform: [{ scale: 0.99 }] } : null]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHead({ title, aside, onPress, style }: { title: string; aside?: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const content = (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }, style]}>
      <Ink size={21} weight="black" tight style={{ flexShrink: 1 }}>
        {title}
      </Ink>
      {aside ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ink size={13} weight={onPress ? 'bold' : 'medium'} color={onPress ? c.accent : c.textSecondary}>
            {aside}
          </Ink>
          {onPress ? <Chevron color={c.accent} size={12} /> : null}
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${aside ?? ''}`} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
      {content}
    </Pressable>
  );
}

export type PillItem<T> = { value: T; label: string };

export function Pills<T extends string | number | null>({ items, value, onChange, scroll, style }: { items: PillItem<T>[]; value: T; onChange: (v: T) => void; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={[{ flexDirection: 'row', gap: 6, flexWrap: scroll ? 'nowrap' : 'wrap' }, style]}>
      {items.map((p) => {
        const on = p.value === value;
        return (
          <Pressable
            key={String(p.value) + p.label}
            onPress={() => {
              tapSelect();
              onChange(p.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: on ? c.ink : 'transparent', borderWidth: 1.5, borderColor: on ? c.ink : '#D5D2CA' }}
          >
            <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? P.paper : c.textSecondary} numberOfLines={1}>
              {traduire(p.label)}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tampon hanko rouge (record) : pictogramme dessine, char accepte et ignore */
export function Hanko({ size = 38, tampon }: { size?: number; char?: string; tampon?: TamponId }) {
  return <RecordSeal size={size} color={RECORD_RED} tampon={tampon} />;
}

export function PrimaryButton({ label, onPress, disabled, tone = 'accent', style }: { label: string; onPress: () => void; disabled?: boolean; tone?: 'accent' | 'ink'; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const bg = tone === 'accent' ? c.accent : c.ink;
  const pressedBg = tone === 'accent' ? c.accentPressed : '#000000';
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [{ height: 56, borderRadius: 18, backgroundColor: pressed ? pressedBg : bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Ink size={16} weight="extraBold" color={tone === 'accent' ? c.onAccent : c.background}>
        {label}
      </Ink>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [{ height: 56, borderRadius: 18, backgroundColor: pressed ? c.fillSoft : P.carte, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, style]}
    >
      <Ink size={14} weight="extraBold" numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Ink>
    </Pressable>
  );
}

/** Ecran vide engageant : illustration, phrase, action */
/** plusHint : repere vers le bouton + a la place du bouton quand l'action est un ajout (le + est la seule zone pour ajouter) */
export function EmptyInvite({ title, text, cta, onPress, plusHint, plusArrow = true, image, style }: { title: string; text: string; cta?: string; onPress?: () => void; plusHint?: string; plusArrow?: boolean; image?: ImageSourcePropType; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={[{ borderRadius: 26, overflow: 'hidden', backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }, style]}>
      {image ? (
        <View style={{ height: 150, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Image source={image} style={{ width: 150, height: 200, marginBottom: -50 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      ) : null}
      <View style={{ padding: 18, gap: 8 }}>
        <Ink size={20} weight="black" tight>
          {title}
        </Ink>
        <Ink size={14} color={c.textSecondary}>
          {text}
        </Ink>
        {plusHint ? <PlusHint text={plusHint} arrow={plusArrow} style={{ marginTop: 8 }} /> : cta && onPress ? <PrimaryButton label={cta} onPress={onPress} style={{ marginTop: 8, height: 50 }} /> : null}
      </View>
    </View>
  );
}

/** Rangee de chiffres separes par un filet */
export function StatStrip({ items, style }: { items: { value: string; label: string }[]; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={[{ flexDirection: 'row', paddingVertical: 14, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: c.border }, style]}>
      {items.map((it, i) => (
        <View key={it.label} style={{ flex: 1, gap: 3, paddingLeft: i ? 10 : 0, paddingRight: 6, borderLeftWidth: i ? 1.5 : 0, borderColor: c.border }}>
          <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {it.value}
          </Ink>
          <Ink size={12} color={c.textSecondary}>
            {traduire(it.label)}
          </Ink>
        </View>
      ))}
    </View>
  );
}

/** Petit repere de legende : trait, point ou carre */
export function LegendMark({ kind, color, label }: { kind: 'line' | 'dot' | 'square' | 'dash' | 'seal'; color: string; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {kind === 'line' ? (
        <Svg width={22} height={10} viewBox="0 0 26 10">
          <Path d="M2 6 C8 2 16 8 24 4" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </Svg>
      ) : kind === 'dash' ? (
        <Svg width={22} height={10} viewBox="0 0 22 10">
          <Path d="M2 5 H20" stroke={color} strokeWidth={2} strokeDasharray="0.1 4.5" strokeLinecap="round" />
        </Svg>
      ) : kind === 'dot' ? (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      ) : kind === 'seal' ? (
        // 16 octobre : la legende montre le meme trophee dore que la courbe (color garde pour compatibilite)
        <TropheeRecord size={18} />
      ) : (
        <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: color }} />
      )}
      <Ink size={13} weight="bold" color={c.textSecondary}>
        {label}
      </Ink>
    </View>
  );
}

/** Bouton d'enregistrement fixe en bas : couleur d'action indigo, petit tampon coche, retour haptique */
export function StampButton({ label, onPress, disabled, dim }: { label: string; onPress: () => void; disabled?: boolean; dim?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({ height: 60, borderRadius: 20, backgroundColor: pressed ? c.accentPressed : c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: dim ? 0.45 : 1 })}
    >
      <View style={{ width: 30, height: 30, borderRadius: 7, borderWidth: 2.5, borderColor: P.white, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.onAccent} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </View>
      <Ink size={17} weight="extraBold" color={c.onAccent}>
        {label}
      </Ink>
    </Pressable>
  );
}

/** Repere « Voir le detail » : dit qu'un graphique s'ouvre d'un appui */
export function DetailCue({ onPress, label = traduire('Voir le détail'), style }: { onPress: () => void; label?: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, opacity: pressed ? 0.6 : 1 }, style]}
    >
      <Ink size={13} weight="extraBold" color={c.accent} numberOfLines={1}>
        {label}
      </Ink>
      <Chevron color={c.accent} size={13} />
    </Pressable>
  );
}

/** Grille de chiffres 2 x 2 (moyenne, plus bas, plus haut, evolution), rien n'est coupe */
export function StatGrid({ items, style }: { items: { value: string; label: string; tone?: string }[]; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }, style]}>
      {items.map((it, i) => (
        <View
          key={it.label}
          style={{ width: '50%', paddingHorizontal: 16, paddingVertical: 14, gap: 3, borderLeftWidth: i % 2 ? 1 : 0, borderTopWidth: i > 1 ? 1 : 0, borderColor: c.divider }}
          accessible
          accessibilityLabel={`${it.label}, ${it.value}`}
        >
          <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={2}>
            {traduire(it.label)}
          </Ink>
          <Ink size={22} weight="black" tight color={it.tone ?? c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {it.value}
          </Ink>
        </View>
      ))}
    </View>
  );
}

/** Carte « Ce que ça mesure » : explication courte de la donnee */
export function ExplainCard({ title = traduire('Ce que ça mesure'), text, tip, style }: { title?: string; text: string; tip?: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={[{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }, style]}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: c.indigo }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Ink size={16} weight="extraBold">
          {title}
        </Ink>
        <Ink size={14} color={c.ink} style={{ lineHeight: 20 }}>
          {text}
        </Ink>
        {tip ? (
          <Ink size={13} weight="bold" color={c.textSecondary} style={{ lineHeight: 18 }}>
            {tip}
          </Ink>
        ) : null}
      </View>
    </View>
  );
}
