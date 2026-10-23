/**
 * Selecteurs visuels de "Ton espace" : scenes illustrees et guerrier ou guerriere.
 */
import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { SceneId } from '@/lib/v2/espace';
import { THEMES, isThemeUnlocked } from '@/lib/v2/dojo/personnages';
import { RANK_NAMES, SCENES, guerrierImage } from './assets';
import { Check, LockBadge } from './ui';
import { P } from '@/components/yoroi/livePalette';

/** Rang qui debloque une scene Premium sans abonnement (le Chateau au rang Samourai, le Temple au rang Ronin) */
export function sceneUnlockRankName(id: SceneId): string | null {
  const t = THEMES.find((x) => x.id === id);
  return t?.premium && t.unlockRank !== undefined ? RANK_NAMES[t.unlockRank] ?? null : null;
}

/** Vrai si la scene est verrouillee pour ce rang et cet abonnement */
export function isSceneLocked(id: SceneId, rankIndex: number, isPremium: boolean, isAnnual = false): boolean {
  const t = THEMES.find((x) => x.id === id);
  return t ? !isThemeUnlocked(t, rankIndex, isPremium, isAnnual) : false;
}

export function ScenePicker({ value, preview, isPremium, isAnnual = false, rankIndex = 0, onPick }: {
  value: SceneId;
  preview?: SceneId | null;
  isPremium: boolean;
  /** vague 27 : abonnement annuel actif (scene exclusive) */
  isAnnual?: boolean;
  rankIndex?: number;
  onPick: (id: SceneId, locked: boolean) => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const focus = preview ?? value;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 22 }} style={{ marginHorizontal: -22 }}>
      {SCENES.map((s) => {
        const on = focus === s.id;
        const chosen = value === s.id;
        const locked = isSceneLocked(s.id, rankIndex, isPremium, isAnnual);
        const rankName = sceneUnlockRankName(s.id);
        const lockLabel = s.annuel ? 'Offerte avec l’abonnement annuel' : rankName ? 'À gagner dans le Dojo' : 'Avec Premium';
        return (
          <Pressable
            key={s.id}
            onPress={() => { selectionAsync().catch(() => {}); onPick(s.id, locked); }}
            accessibilityRole="button"
            accessibilityLabel={`Scène ${s.nom}${s.annuel ? ', offerte avec l’abonnement annuel' : locked ? (rankName ? ', se débloque en progressant dans le Dojo, ou avec Premium' : ', avec Premium') : ''}`}
            accessibilityState={{ selected: chosen }}
            style={{ width: 138, gap: 8 }}
          >
            <View style={{ height: 184, borderRadius: 20, overflow: 'hidden', borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border }}>
              <Image source={s.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <View style={{ position: 'absolute', right: 8, top: 8 }}>{chosen ? <Check size={24} /> : locked ? <LockBadge size={24} /> : null}</View>
            </View>
            <View style={{ gap: 1, paddingHorizontal: 2 }}>
              <Ink size={15} weight="extraBold">{s.nom}</Ink>
              <Ink size={12} color={s.annuel ? c.goldDeep : c.textMuted} numberOfLines={2}>{locked || s.annuel ? lockLabel : s.phrase}</Ink>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function GuerrierPicker({ value, rankIndex, onPick, height = 250 }: {
  value: string;
  rankIndex: number;
  onPick: (personnage: 'guerrier_h' | 'guerrier_f') => void;
  height?: number;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const card = (id: 'guerrier_h' | 'guerrier_f', label: string) => {
    const on = value === id;
    return (
      <Pressable
        key={id}
        onPress={() => { selectionAsync().catch(() => {}); onPick(id); }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        style={{ flex: 1, height, borderRadius: 22, overflow: 'hidden', borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <LinearGradient colors={(on ? [c.accentTint, '#FFFFFF'] : [c.fillSoft, '#FFFFFF']) as [string, string]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <Image source={guerrierImage(id === 'guerrier_f' ? 'f' : 'h', rankIndex)} style={{ position: 'absolute', top: 6, width: '100%', height: height - 44 }} resizeMode="contain" />
        <View style={{ backgroundColor: on ? c.ink : P.white, borderWidth: on ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Ink size={14} weight="extraBold" color={on ? P.paper : c.ink}>{label}</Ink>
        </View>
        {on ? <View style={{ position: 'absolute', top: 10, right: 10 }}><Check /></View> : null}
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {card('guerrier_h', 'Guerrier')}
      {card('guerrier_f', 'Guerrière')}
    </View>
  );
}
