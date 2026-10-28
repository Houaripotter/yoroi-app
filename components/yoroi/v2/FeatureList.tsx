/**
 * Liste d'acces aux fonctions, rangee par theme (refonte v2).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '../YoroiThemeProvider';
import { Ink } from './Ink';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { traduire } from '@/lib/i18n/tr';

export type Feature = { label: string; sub?: string; href: string };

export function FeatureList({ title, items }: { title: string; items: Feature[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      <Ink size={15} weight="extraBold" style={{ paddingHorizontal: 4 }}>{title}</Ink>
      {/* 28 octobre 2026 (Pastel) : carte blanche a ombre douce ; l'ombre dehors, les coins decoupes dedans */}
      <View style={carteBlanche(c.surface, c.border)}>
      <View style={{ borderRadius: 22, overflow: 'hidden' }}>
        {items.map((it, i) => (
          <Pressable
            key={it.href + it.label}
            onPress={() => router.push(it.href as any)}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.fillSoft : 'transparent', borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider })}
          >
            <View style={{ flex: 1, gap: 1, paddingVertical: 10 }}>
              <Ink size={15} weight="bold">{traduire(it.label)}</Ink>
              {it.sub ? <Ink size={12} color={c.textMuted}>{traduire(it.sub)}</Ink> : null}
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M9 5l7 7-7 7" stroke={c.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        ))}
      </View>
      </View>
    </View>
  );
}
