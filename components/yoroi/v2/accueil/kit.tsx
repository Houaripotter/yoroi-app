/**
 * Briques visuelles de l'espace Accueil (refonte v2, l'armure vivante).
 * Palette claire, pastilles de séance, tampon hanko, trait au pinceau, cartes en verre.
 */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { SceauEtoile } from './Ornements';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { ornementPour } from '@/components/yoroi/v2/ornements/images';
import type { OrnementKey } from '@/components/yoroi/v2/ornements/images';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Kozane as KozanePlates, Pastille } from '@/components/yoroi/v2/dojo/Kozane';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';

import { P } from '@/components/yoroi/livePalette';
/** Palette v2 : vivante depuis la vague 35 (claire ou sombre, voir components/yoroi/livePalette.ts) */
export { P };

/** Couleur des actions principales, lue dans le theme (elle suit le changement de couleur de l'app) */
export function useAccent(): { accent: string; accentPressed: string; accentTint: string } {
  const { theme } = useYoroiTheme();
  return { accent: theme.colors.accent, accentPressed: theme.colors.accentPressed, accentTint: theme.colors.accentTint };
}

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // retour haptique indisponible : sans importance
  }
}

/** Appui avec leger enfoncement et retour haptique */
export function Press({ onPress, style, children, haptic = 'light', ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: 'light' | 'medium' | 'none'; children?: React.ReactNode }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
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
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Entree commune a l'ouverture d'un ecran (vague 16) : un fondu tres court et discret,
 * sans glissement vertical ni cascade de delais. A utiliser partout a la place de FadeInDown.
 */
export const ENTREE = FadeIn.duration(160);

/** Entree d'un bloc : le fondu commun. i est garde pour la compatibilite, il ne decale plus rien. */
export function Enter({ i: _i = 0, children, style }: { i?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={ENTREE} style={style}>
      {children}
    </Animated.View>
  );
}

/** Marge laterale commune a tous les ecrans v2 */
export const GUTTER = 22;

/** Ombre douce commune des boutons ronds */
export const softShadow = {
  shadowColor: P.ink,
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const shadow = {
  shadowColor: P.ink,
  shadowOpacity: 0.1,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
};

export function Glass({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderRadius: 26, backgroundColor: P.glass, borderWidth: 1, borderColor: P.white, padding: 18 }, shadow, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 18 }, style]}>{children}</View>;
}

/** Vague 45 : pastilles de séance à la place des plaques kozane. Pastille ronde : pleine et cochée quand elle est faite, vide sinon, contour épais si partielle. */
export function Kozane({ on, w = 34, h = 43, partial, sport }: { on: boolean; w?: number; h?: number; partial?: boolean; sport?: string }) {
  return <Pastille etat={on ? 'fait' : partial ? 'partiel' : 'vide'} taille={Math.min(w, h)} sport={sport} />;
}

/** Vague 45 : rangée de pastilles de séance à la place des plaques kozane, remplie selon progress (de 0 à 1). */
export function KozaneBar({ progress, count = 10, w, h = 30, sport }: { progress: number; count?: number; w?: number; h?: number; sport?: string }) {
  const p = Math.max(0, Math.min(1, progress));
  const taille = w ?? Math.round(h * 0.8);
  return <KozanePlates nombre={count} rempli={p * count} taille={taille} ecart={4} sport={sport} accessibilityLabel={`Progression : ${Math.round(p * 100)} pour cent`} />;
}

/** Tampon rouge des records : sceau dessine, une etoile au centre (aucune ecriture). char est garde pour compatibilite et ignore. */
export function Hanko({ size = 44, rotate = -6 }: { char?: string; size?: number; rotate?: number }) {
  return <SceauEtoile size={size} color={P.record} rotate={rotate} />;
}

/** Courbe au pinceau (trait epais arrondi) */
export function BrushLine({ values, width, height, color = P.ink, stroke = 5 }: { values: number[]; width: number; height: number; color?: string; stroke?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = stroke;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2)]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={stroke * 0.9} fill={P.accent} />
    </Svg>
  );
}

/** Anneau au pinceau, value de 0 a 1 */
export function BrushRing({ value, size = 150, stroke = 14, color = P.ink, track = P.line }: { value: number; size?: number; stroke?: number; color?: string; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * (1 - v)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

type IconName =
  | 'back'
  | 'chevron'
  | 'user'
  | 'moon'
  | 'drop'
  | 'bolt'
  | 'calendar'
  | 'trophy'
  | 'quote'
  | 'shield'
  | 'plus'
  | 'minus'
  | 'play'
  | 'scale'
  | 'heart'
  | 'bell'
  | 'star'
  | 'check'
  | 'trash'
  | 'sun'
  | 'body'
  | 'refresh'
  | 'share'
  | 'clock'
  | 'flag'
  | 'settings'
  | 'list'
  | 'close'
  | 'mic';

const ICONS: Record<IconName, string> = {
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  drop: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z',
  quote: 'M9 7H6a2 2 0 0 0-2 2v3h5v5H4M20 7h-3a2 2 0 0 0-2 2v3h5v5h-5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  play: 'M7 4.5v15l13-7.5z',
  scale: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8.5 10a3.5 3.5 0 0 1 7 0M12 10l1.5-2',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  body: 'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 8h14M12 8v6M12 14l-3 7M12 14l3 7',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  share: 'M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M16 16v4',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  close: 'M6 6l12 12M18 6L6 18',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
};

export function Icon({ name, size = 22, color = P.ink, fill, width = 2.2 }: { name: IconName; size?: number; color?: string; fill?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={ICONS[name]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill={fill ?? 'none'} />
    </Svg>
  );
}

/** Bouton rond (44 points) */
export function RoundButton({ icon, onPress, label, dark, size = 44 }: { icon: IconName; onPress: () => void; label: string; dark?: boolean; size?: number }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: dark ? P.ink : P.glass, borderWidth: dark ? 0 : 1, borderColor: P.white, alignItems: 'center', justifyContent: 'center' }, dark ? null : softShadow]}>
        <Icon name={icon} size={20} color={dark ? P.white : P.ink} width={2.4} />
      </View>
    </Press>
  );
}

/**
 * Ecran de detail (16 octobre 2026) : en-tete compact fige en haut, retour rond et titre sur la meme ligne,
 * un filet apparait quand le contenu defile dessous (kanji garde pour compatibilite, plus jamais affiche)
 */
export function DetailScreen({
  title,
  subtitle,
  right,
  children,
  footer,
  onBack,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  kanji?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  scroll?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/' as any)));
  const [defile, setDefile] = React.useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <EnTete titre={title} sousTitre={subtitle} droite={right} onRetour={back} zoneSure defile={defile} fond={P.paper} />
      {scroll ? (
        <ScrollView
          onScroll={(e) => {
            const d = e.nativeEvent.contentOffset.y > 4;
            if (d !== defile) setDefile(d);
          }}
          scrollEventThrottle={32}
          contentContainerStyle={{ paddingBottom: insets.bottom + (footer ? 110 : 40) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 8, gap: 14 }}>{children}</View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: GUTTER, paddingTop: 8 }}>{children}</View>
      )}
      {footer ? <View style={{ position: 'absolute', left: GUTTER, right: GUTTER, bottom: insets.bottom + 14 }}>{footer}</View> : null}
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  const { accent } = useAccent();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 6 }}>
      <Ink size={19} weight="black" tight>
        {children}
      </Ink>
      {action && onAction ? (
        <Pressable onPress={() => { tap(); onAction(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel={action}>
          <Ink size={14} weight="bold" color={accent}>
            {action}
          </Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Gros bouton d'action */
export function BigButton({ label, onPress, tone = 'red', icon, disabled, compact }: { label: string; onPress: () => void; tone?: 'red' | 'ink' | 'light'; icon?: IconName; disabled?: boolean; compact?: boolean }) {
  const { accent } = useAccent();
  const bg = tone === 'red' ? accent : tone === 'ink' ? P.ink : P.white;
  const fg = tone === 'light' ? P.ink : P.white;
  return (
    <Press onPress={disabled ? undefined : onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={label} disabled={disabled}>
      <View style={[{ minHeight: 56, paddingHorizontal: compact ? 12 : 18, borderRadius: 18, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: compact ? 7 : 10, opacity: disabled ? 0.5 : 1, borderWidth: tone === 'light' ? 1 : 0, borderColor: P.line2 }, tone === 'red' ? { shadowColor: accent, shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 } : null]}>
        {icon ? <Icon name={icon} size={compact ? 18 : 20} color={fg} /> : null}
        <Ink size={16} weight="extraBold" color={fg} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'center' }}>
          {label}
        </Ink>
      </View>
    </Press>
  );
}

/** Pastille de choix */
export function Pill({ label, active, onPress, accent = P.ink }: { label: string; active?: boolean; onPress: () => void; accent?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }}>
      <View style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? accent : P.white, borderWidth: 1, borderColor: active ? accent : P.line2 }}>
        <Ink size={14} weight="bold" color={active ? P.white : P.ink2}>
          {label}
        </Ink>
      </View>
    </Press>
  );
}

/** Etat vide engageant, avec un ornement illustre adapte au contexte (torii par defaut) */
export function EmptyState({ title, text, action, onAction, ornement }: { kanji?: string; title: string; text: string; action?: string; onAction?: () => void; ornement?: OrnementKey }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 10 }}>
      <Ornement name={ornement ?? ornementPour(title, text)} size={88} />
      <Ink size={19} weight="black" tight style={{ textAlign: 'center' }}>
        {title}
      </Ink>
      <Ink size={14} weight="medium" color={P.ink2} style={{ textAlign: 'center', paddingHorizontal: 10 }}>
        {text}
      </Ink>
      {action && onAction ? (
        <View style={{ marginTop: 6, alignSelf: 'stretch' }}>
          <BigButton label={action} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

/** Ligne de statistique : gros chiffre et legende */
export function Stat({ value, unit, label, color = P.ink }: { value: string; unit?: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Ink size={26} weight="black" tight color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
        {unit ? (
          <Ink size={13} weight="bold" color={P.muted}>
            {` ${unit}`}
          </Ink>
        ) : null}
      </Ink>
      <Ink size={12} weight="bold" color={P.ink2}>
        {label}
      </Ink>
    </View>
  );
}
