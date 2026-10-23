/**
 * Navigation du carnet (vague 16) : deux niveaux au plus.
 * Niveau 1 : SectionTabs (Records, Techniques, Videos, Combat si tu pratiques un sport de combat).
 * Niveau 2 : FilterChips, un filtre par sport a l'interieur de la section ouverte.
 * Plus : l'illustration du carnet (Illus), le bouton d'action principal (AddPill) et le resume chiffre (Summary).
 */
import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useAccent } from '@/components/yoroi/v2/accueil/kit';
import { carnetImage } from './images';
import type { CarnetIllus } from './images';
import { P, Press, CIcon, tap } from './ui';
import { blancA } from '@/components/yoroi/livePalette';

export type CarnetSection = 'records' | 'techniques' | 'videos' | 'combat';

export const SECTION_META: Record<CarnetSection, { label: string; illus: CarnetIllus; phrase: string; add: string }> = {
  records: { label: 'Records', illus: 'records', phrase: 'Tes meilleures perfs et leur évolution.', add: 'Record' },
  techniques: { label: 'Techniques', illus: 'techniques', phrase: 'Ce que tu apprends, et ce que tu maîtrises.', add: 'Technique' },
  videos: { label: 'Vidéos', illus: 'videos', phrase: 'Les vidéos qui t’inspirent, rangées et prêtes à revoir.', add: 'Vidéo' },
  combat: { label: 'Combat', illus: 'combat', phrase: 'Tes rounds, tes combats et ton palmarès.', add: 'Combat' },
};

/** Illustration du carnet, decorative */
export function Illus({ name, size = 48, style }: { name: CarnetIllus; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, style]}>
      <Image source={carnetImage(name)} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Niveau 1 : les grandes parties du carnet, illustrees, toujours visibles en entier */
export function SectionTabs({ items, value, onChange }: { items: CarnetSection[]; value: CarnetSection; onChange: (s: CarnetSection) => void }) {
  const { accent } = useAccent();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6, padding: 5, borderRadius: 24, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: P.line2 }}>
      {items.map((k) => {
        const on = k === value;
        const m = SECTION_META[k];
        return (
          <Pressable
            key={k}
            onPress={() => {
              if (!on) tap();
              onChange(k);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={m.label}
            style={{ flex: 1, minHeight: 70, borderRadius: 19, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2, backgroundColor: on ? P.white : 'transparent', borderWidth: on ? 1.5 : 0, borderColor: on ? accent : 'transparent', shadowColor: '#1D2029', shadowOpacity: on ? 0.08 : 0, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: on ? 2 : 0 }}
          >
            <Illus name={m.illus} size={30} style={{ opacity: on ? 1 : 0.55 }} />
            <Ink size={12} weight={on ? 'extraBold' : 'bold'} color={on ? accent : P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {m.label}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Niveau 2 : filtre par sport (ou par partie pour Combat). Rien n'est affiche s'il n'y a qu'un choix. */
export function FilterChips<T extends string>({ items, value, onChange }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  const { accent } = useAccent();
  if (items.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }} style={{ marginHorizontal: -22 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              if (!on) tap();
              onChange(it.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.count !== undefined ? `${it.label}, ${it.count}` : it.label}
            style={{ minHeight: 44, paddingHorizontal: 15, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: on ? accent : P.white, borderWidth: 1, borderColor: on ? accent : P.line2 }}
          >
            <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? P.white : P.ink2}>
              {it.label}
            </Ink>
            {it.count !== undefined && it.count > 0 ? (
              <Ink size={12} weight="black" color={on ? 'rgba(255,255,255,0.75)' : P.muted}>
                {String(it.count)}
              </Ink>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Le bouton d'action principal du carnet, dans le contexte de la section ouverte */
export function AddPill({ label, onPress }: { label: string; onPress: () => void }) {
  const { accent } = useAccent();
  return (
    <Press onPress={onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={`Ajouter : ${label}`} hitSlop={4}>
      <View style={{ minHeight: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: accent, shadowColor: accent, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }}>
        <CIcon name="plus" size={18} color={P.white} width={2.8} />
        <Ink size={15} weight="extraBold" color={P.white}>
          {label}
        </Ink>
      </View>
    </Press>
  );
}

/** Resume chiffre en haut d'une section : seulement quand il y a des donnees */
export function Summary({ illus, items, children }: { illus: CarnetIllus; items: { value: string; label: string; color?: string }[]; children?: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 16, gap: 12, overflow: 'hidden' }}>
      <Illus name={illus} size={92} style={{ position: 'absolute', right: -8, top: -6, opacity: 0.95 }} />
      <View style={{ flexDirection: 'row', gap: 6, paddingRight: 78 }}>
        {items.map((it) => (
          <View key={it.label} style={{ flex: 1, gap: 1 }}>
            <Ink size={28} weight="black" tight color={it.color ?? P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {it.value}
            </Ink>
            <Ink size={12} weight="bold" color={P.ink2} numberOfLines={2}>
              {it.label}
            </Ink>
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

/** Bel etat vide illustre : une phrase qui dit quoi faire, une action */
export function CarnetEmpty({ illus, title, text, action, onAction, compact }: { illus: CarnetIllus; title: string; text: string; action?: string; onAction?: () => void; compact?: boolean }) {
  const { accent } = useAccent();
  return (
    <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingVertical: compact ? 18 : 26, paddingHorizontal: 18, alignItems: 'center', gap: 10 }}>
      <Illus name={illus} size={compact ? 84 : 132} />
      <Ink size={compact ? 17 : 21} weight="black" tight style={{ textAlign: 'center' }}>
        {title}
      </Ink>
      <Ink size={14} weight="medium" color={P.ink2} style={{ textAlign: 'center', paddingHorizontal: 6 }}>
        {text}
      </Ink>
      {action && onAction ? (
        <Press onPress={onAction} haptic="medium" accessibilityRole="button" accessibilityLabel={action} style={{ alignSelf: 'stretch', marginTop: 4 }}>
          <View style={{ minHeight: 56, borderRadius: 18, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            <CIcon name="plus" size={20} color={P.white} width={2.6} />
            <Ink size={16} weight="extraBold" color={P.white} numberOfLines={1} style={{ flexShrink: 1 }}>
              {action}
            </Ink>
          </View>
        </Press>
      ) : null}
    </View>
  );
}

/** Titre de bloc simple */
export function BlockHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={{ paddingHorizontal: 4, marginTop: 6, gap: 1 }}>
      <Ink size={19} weight="black" tight accessibilityRole="header">
        {title}
      </Ink>
      {aside ? (
        <Ink size={13} weight="medium" color={P.ink2}>
          {aside}
        </Ink>
      ) : null}
    </View>
  );
}
