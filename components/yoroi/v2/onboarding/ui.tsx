/**
 * Briques du nouvel onboarding : cadre d'ecran (barre de progression, retour, Passer),
 * bouton principal de 56, carte de choix qui grandit quand on la choisit.
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { FondEpoque } from '@/components/yoroi/v2/fonds/FondEpoque';
import type { FondId } from '@/components/yoroi/v2/fonds/FondEpoque';
import type { FontWeightKey } from '@/components/yoroi/tokens';
import { ApercuDansBarre, useApercuVisible } from '@/components/yoroi/v2/studio/PreviewBar';
import { finAtteinte } from '@/lib/v2/onboarding/finDefilement';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export const GUTTER = 22;

export function useColors() {
  return useYoroiTheme().theme.colors;
}

/** Bouton rond de 44 avec une icone */
export function RoundIcon({ name, label, onPress }: { name: 'back' | 'close'; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' })}
    >
      <Icon name={name} size={20} stroke={2.4} />
    </Pressable>
  );
}

/** Barre de progression fine, animee */
export function ProgressBar({ value }: { value: number }) {
  const c = useColors();
  const w = useSharedValue(value);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 420 });
  }, [value, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View
      style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.fillSubtle, overflow: 'hidden' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={traduire("Progression")}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: c.accent }, style]} />
    </View>
  );
}

/** Lien discret « Passer » (zone d'appui de 44) */
export function SkipLink({ onPress, label = traduire('Passer') }: { onPress: () => void; label?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Ink size={15} weight="bold" color={c.textSecondary}>{label}</Ink>
    </Pressable>
  );
}

/** Bouton principal (56 points, rayon 18) ou secondaire clair */
export function MainButton({ label, onPress, disabled, loading, tone = 'accent', accessibilityLabel }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'accent' | 'light';
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const light = tone === 'light';
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        tap('medium');
        onPress();
      }}
      onPressIn={() => {
        s.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        s.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      <Animated.View
        style={[
          { minHeight: 56, borderRadius: 18, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: light ? c.surface : c.accent, borderWidth: light ? 1 : 0, borderColor: c.border, opacity: disabled ? 0.38 : 1 },
          anim,
        ]}
      >
        {loading ? <ActivityIndicator color={light ? c.ink : c.onAccent} /> : <Ink size={16} weight="extraBold" color={light ? c.ink : c.onAccent} style={{ textAlign: 'center' }}>{label}</Ink>}
      </Animated.View>
    </Pressable>
  );
}

/** Or profond de la charte, lisible sur papier : les dates estimees (vague 30) */
export const OR_PROFOND = '#9A6B12';

type Morceau = { txt: string; cle: 'mot' | 'date' | null };

/** « texte **mot cle** et ^^date^^ » vers des morceaux (vague 30) */
export function decouper(t: string): Morceau[] {
  return t
    .split(/(\*\*[^*]+\*\*|\^\^[^^]+\^\^)/)
    .filter((x) => x.length > 0)
    .map((x) => (x.startsWith('**') && x.endsWith('**') && x.length > 4 ? { txt: x.slice(2, -2), cle: 'mot' as const } : x.startsWith('^^') && x.endsWith('^^') && x.length > 4 ? { txt: x.slice(2, -2), cle: 'date' as const } : { txt: x, cle: null }));
}

/** Entoure de ** chaque fragment trouve (une fois chacun), pour le mettre en gras et en couleur */
export function marquer(t: string, fragments: (string | null | undefined)[], marque: '**' | '^^' = '**'): string {
  let out = t;
  for (const f of fragments) {
    if (!f) continue;
    const i = out.indexOf(f);
    if (i >= 0) out = `${out.slice(0, i)}${marque}${f}${marque}${out.slice(i + f.length)}`;
  }
  return out;
}

/**
 * Texte riche de l'onboarding (vague 30) : les mots cles (** **) en gras dans la couleur donnee,
 * les dates (^^ ^^) en gras dans l'or profond. Houari : « les mots importants d'une couleur differente ».
 */
export function Riche({ text, size = 14, color, ink, dateInk = OR_PROFOND, weight = 'medium', lineHeight, style, numberOfLines }: {
  text: string;
  size?: number;
  color?: string;
  ink?: string;
  dateInk?: string;
  weight?: FontWeightKey;
  lineHeight?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Ink size={size} weight={weight} color={color ?? c.textSecondary} style={[{ lineHeight: lineHeight ?? Math.round(size * 1.4) }, style]} numberOfLines={numberOfLines}>
      {decouper(text).map((m, i) =>
        m.cle ? (
          <Ink key={i} size={size} weight="black" color={m.cle === 'date' ? dateInk : ink ?? c.accent}>{m.txt}</Ink>
        ) : (
          m.txt
        ),
      )}
    </Ink>
  );
}

/** Titre d'ecran : grand, serre, mot cle en couleur (vague 30) */
export function Titre({ text, sub, ink, petit }: { text: string; sub?: string; ink?: string; petit?: boolean }) {
  const c = useColors();
  const fs = petit ? 28 : 31;
  return (
    <View style={{ gap: 8 }}>
      <Ink size={fs} weight="black" tight style={{ lineHeight: Math.round(fs * 1.16) }} accessibilityRole="header" accessibilityLabel={text.replace(/\*\*|\^\^/g, '')}>
        {decouper(text).map((m, i) => (m.cle ? <Ink key={i} size={fs} weight="black" tight color={ink ?? c.accent}>{m.txt}</Ink> : m.txt))}
      </Ink>
      {sub ? <Riche text={sub} size={15} weight="medium" lineHeight={21} ink={ink ?? c.accent} /> : null}
    </View>
  );
}

/** Cadre commun d'un ecran d'etape */
export function Shell({
  progress,
  onBack,
  onSkip,
  onClose,
  title,
  sub,
  children,
  footer,
  scroll = true,
  gap = 18,
  fond,
  titleInk,
  onFin,
}: {
  progress?: number | null;
  onBack?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  title?: string;
  sub?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  gap?: number;
  /** fond d'epoque plein ecran sous un voile papier : l'image vit en haut, le contenu reste sur une zone calme */
  fond?: FondId;
  /** vague 30 : couleur des mots cles du titre (entre ** **), indigo par defaut */
  titleInk?: string;
  /** 15 octobre 2026 : appele quand le bas du contenu est visible (ou s'il tient sans defiler) */
  onFin?: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const mesure = useRef({ y: 0, visible: 0, contenu: 0 });
  const verifierFin = () => {
    if (!onFin) return;
    const m = mesure.current;
    if (finAtteinte(m.y, m.visible, m.contenu)) onFin();
  };
  const apercu = useApercuVisible();
  const petit = useWindowDimensions().height < 720;
  const head = title ? <Titre text={title} sub={sub} ink={titleInk} petit={petit} /> : null;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {fond ? <FondEpoque fond={fond} voile="clair" /> : null}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: apercu ? 6 : 12, minHeight: insets.top + 56 }}>
        {onBack ? <RoundIcon name="back" label={traduire("Retour")} onPress={onBack} /> : <View style={{ width: 44 }} />}
        {/* vague 30 : en apercu du Studio, la pastille prend la place de la barre de progression */}
        <ApercuDansBarre />
        {apercu ? null : progress != null ? <ProgressBar value={progress} /> : <View style={{ flex: 1 }} />}
        {onSkip ? <SkipLink onPress={onSkip} /> : <View style={{ width: 44 }} />}
        {onClose ? <RoundIcon name="close" label={traduire("Fermer l’aperçu")} onPress={onClose} /> : null}
      </View>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24, gap }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...(onFin
            ? {
                scrollEventThrottle: 32,
                onScroll: (e: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number }; contentSize: { height: number } } }) => {
                  const n = e.nativeEvent;
                  mesure.current = { y: n.contentOffset.y, visible: n.layoutMeasurement.height, contenu: n.contentSize.height };
                  verifierFin();
                },
                onLayout: (e: { nativeEvent: { layout: { height: number } } }) => {
                  mesure.current.visible = e.nativeEvent.layout.height;
                  verifierFin();
                },
                onContentSizeChange: (_w: number, h: number) => {
                  mesure.current.contenu = h;
                  verifierFin();
                },
              }
            : {})}
        >
          {head}
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: GUTTER, paddingTop: 12, gap }}>
          {head}
          {children}
        </View>
      )}
      {footer ? <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: insets.bottom + 14, gap: 6 }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

/** Carte de choix : grandit legerement et s'encadre d'indigo (ou de sa teinte, vague 29) quand elle est choisie */
export function ChoiceCard({ selected, onPress, label, children, style, height, tint }: {
  selected: boolean;
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  height?: number;
  /** vague 29 : teinte de la carte choisie (encre de la bordure et fond) */
  tint?: { ink: string; fond: string };
}) {
  const c = useColors();
  const s = useSharedValue(selected ? 1.03 : 1);
  useEffect(() => {
    s.value = withSpring(selected ? 1.03 : 1, { damping: 12, stiffness: 220 });
  }, [selected, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => {
        tap('medium');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={style}
    >
      <Animated.View
        style={[
          { height, borderRadius: 22, backgroundColor: selected ? tint?.fond ?? c.accentTint : c.surface, borderWidth: selected ? 3 : 1, borderColor: selected ? tint?.ink ?? c.accent : c.border, overflow: 'hidden' },
          anim,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Puce de choix de 44 points de haut */
export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border }}
    >
      <Ink size={14} weight="bold" color={on ? c.onAccent : c.ink}>{label}</Ink>
    </Pressable>
  );
}

/** Kilos a la francaise : virgule decimale */
export function kg(v: number, digits = 1): string {
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return (Number.isInteger(r) ? String(r) : r.toFixed(digits)).replace('.', DECIMAL);
}
