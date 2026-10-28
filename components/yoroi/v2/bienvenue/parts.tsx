/**
 * Briques de la bienvenue (refonte v2) : progression en traits, ecran d'etape avec bouton fixe,
 * tuiles illustrees, champs de saisie grands et lisibles.
 */
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { GUTTER, P, Press, softShadow } from '@/components/yoroi/v2/accueil/kit';
import { Icon as EIcon } from '@/components/yoroi/v2/espace/ui';
import { blancA } from '@/components/yoroi/livePalette';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

/** Progression en traits */
export function Traits({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Étape ${current + 1} sur ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ width: 22, height: 5, borderRadius: 3, backgroundColor: i <= current ? P.ink : '#DDD9CF' }} />
      ))}
    </View>
  );
}

function RoundIcon({ name, label, onPress }: { name: 'back' | 'close'; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <View style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: P.white, alignItems: 'center', justifyContent: 'center' }, softShadow]}>
        <EIcon name={name} size={20} stroke={2.4} />
      </View>
    </Press>
  );
}

/** Ecran d'etape : haut (retour, traits, fermer), contenu defilant, bouton fixe en bas */
export function StepScreen({
  step,
  total,
  onBack,
  onClose,
  title,
  sub,
  kanji,
  children,
  footer,
  hero,
}: {
  step?: number;
  total?: number;
  onBack?: () => void;
  onClose?: () => void;
  title?: string;
  sub?: string;
  kanji?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  hero?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: insets.top + 52 }}>
        {onBack ? <RoundIcon name="back" label="Retour" onPress={onBack} /> : null}
        {total != null && step != null ? <Traits total={total} current={step} /> : null}
        <View style={{ flex: 1 }} />
        {onClose ? <RoundIcon name="close" label="Fermer l’aperçu" onPress={onClose} /> : null}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {hero}
        {title ? (
          <View style={{ gap: 8 }}>
            <Ink size={32} weight="black" tight style={{ lineHeight: 36 }}>{title}</Ink>
            {sub ? <Ink size={15} weight="medium" color={P.ink2}>{sub}</Ink> : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: insets.bottom + 14, gap: 10 }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

/** Gros bouton encre (style maquette Bienvenue) */
export function InkButton({ label, onPress, disabled, tone = 'red', loading }: { label: string; onPress: () => void; disabled?: boolean; tone?: 'ink' | 'red' | 'light'; loading?: boolean }) {
  const bg = tone === 'ink' ? P.ink : tone === 'red' ? P.primary : P.white;
  const fg = tone === 'light' ? P.ink : tone === 'red' ? P.onPrimary : P.white;
  // 28 octobre 2026 : l'action principale prend le bouton partage (degrade bleu nuit, texte blanc)
  if (tone === 'red') {
    return <BoutonPrincipal label={loading ? 'Un instant' : label} onPress={onPress} disabled={disabled || loading} tailleTexte={16} />;
  }
  return (
    <Press onPress={disabled || loading ? undefined : onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      <View style={{ minHeight: 56, borderRadius: 18, backgroundColor: bg, borderWidth: tone === 'light' ? 1 : 0, borderColor: P.line2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
        <Ink size={16} weight="extraBold" color={fg}>{loading ? 'Un instant' : label}</Ink>
      </View>
    </Press>
  );
}

/** Lien texte discret (44 points de haut) */
export function TextLink({ label, onPress, color = P.ink2 }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Ink size={15} weight="bold" color={color}>{label}</Ink>
    </Pressable>
  );
}

/** Case a cocher ronde */
export function CheckRow({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Press onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.white, borderRadius: 18, borderWidth: checked ? 2 : 1, borderColor: checked ? P.ink : P.line2, padding: 14 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: checked ? P.primary : 'transparent', borderWidth: checked ? 0 : 2, borderColor: '#C9CEDF', alignItems: 'center', justifyContent: 'center' }}>
          {checked ? <EIcon name="check" size={15} color={P.onPrimary} stroke={3} /> : null}
        </View>
        <Ink size={14} weight="bold" style={{ flex: 1 }}>{label}</Ink>
      </View>
    </Press>
  );
}

/** Tuile illustree selectionnable */
export function IlluTile({ image, label, sub, selected, onPress, height = 200, style, tint }: {
  image?: ImageSourcePropType;
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  tint?: string;
}) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} style={style}>
      <View style={{ height, borderRadius: 22, overflow: 'hidden', backgroundColor: selected ? (tint ?? P.accentSoft) : P.white, borderWidth: selected ? 3 : 1, borderColor: selected ? P.accent : P.line2, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }}>
        {image ? <Image source={image} style={{ position: 'absolute', top: 6, width: '100%', height: height - (sub ? 62 : 46) }} resizeMode="contain" /> : null}
        <View style={{ alignItems: 'center', gap: 2, paddingHorizontal: 8 }}>
          <View style={{ backgroundColor: selected ? P.ink : P.white, borderWidth: selected ? 0 : 1, borderColor: P.line2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Ink size={14} weight="extraBold" color={selected ? P.white : P.ink} numberOfLines={1}>{label}</Ink>
          </View>
          {sub ? <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1}>{sub}</Ink> : null}
        </View>
        {selected ? (
          <View style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
            <EIcon name="check" size={14} color={P.onPrimary} stroke={3} />
          </View>
        ) : null}
      </View>
    </Press>
  );
}

/** Champ de saisie grand format */
export function BigField({ label, unit, valid, inputRef, ...rest }: TextInputProps & { label: string; unit?: string; valid?: boolean; inputRef?: React.Ref<TextInput> }) {
  return (
    <View style={{ backgroundColor: P.white, borderRadius: 20, borderWidth: valid ? 2 : 1, borderColor: valid ? P.moss : P.line2, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
      <Ink size={12} weight="bold" color={P.muted}>{label}</Ink>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <TextInput
          ref={inputRef}
          placeholderTextColor="#C2BFB7"
          {...rest}
          style={{ flex: 1, fontSize: 30, fontWeight: '900', color: P.ink, paddingVertical: 4, minHeight: 48 }}
        />
        {unit ? <Ink size={16} weight="extraBold" color={P.ink2} style={{ marginBottom: 12 }}>{unit}</Ink> : null}
        {valid ? (
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: P.moss, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <EIcon name="check" size={13} color="#FFFFFF" stroke={3} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Fleche au pinceau pour les objectifs */
export function BrushArrow({ dir, color }: { dir: 'down' | 'flat' | 'up'; color: string }) {
  const d = dir === 'down' ? 'M8 14 C 22 16, 30 34, 50 46 M38 46 L50 46 L48 34' : dir === 'up' ? 'M8 46 C 22 44, 30 26, 50 14 M38 14 L50 14 L48 26' : 'M6 30 C 20 26, 36 34, 52 30 M42 22 L52 30 L42 38';
  return (
    <Svg width={58} height={58} viewBox="0 0 58 58">
      <Path d={d} stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Tuile d'objectif avec fleche */
export function GoalTile({ dir, label, selected, onPress }: { dir: 'down' | 'flat' | 'up'; label: string; selected: boolean; onPress: () => void }) {
  const color = dir === 'down' ? P.indigo : dir === 'up' ? P.moss : P.gold;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} style={{ flex: 1 }}>
      <View style={{ height: 118, borderRadius: 22, backgroundColor: P.white, borderWidth: selected ? 3 : 1, borderColor: selected ? P.ink : P.line2, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <BrushArrow dir={dir} color={color} />
        <Ink size={14} weight="extraBold">{label}</Ink>
      </View>
    </Press>
  );
}
