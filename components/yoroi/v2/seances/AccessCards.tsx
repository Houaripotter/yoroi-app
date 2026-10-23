/**
 * Acces illustres vers les fonctions combat, competition et outils (jamais une liste nue).
 * Vague 15 : plus aucun kanji en filigrane. Vague 21 : plus de motif de vagues, un fond doux uni.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { tap } from './ui';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import type { OrnementKey } from '@/components/yoroi/v2/ornements/images';
import { P, paletteSombre } from '@/components/yoroi/livePalette';

// audit 43 : les fonds pastel des tuiles passent a leur version de nuit en sombre (texte clair lisible)
const TUILE_NUIT: Record<string, string> = { '#E3E6EE': '#1E2537', '#E9E4D8': '#28241C', '#E6E4DD': '#232733', '#EEE1DF': '#2A1F22', '#E4EADB': '#1F271D', '#ECE3E8': '#27202A', '#F3EBDA': '#28241C', '#EFE7D6': '#28241C' };
const fondTuile = (t: string) => (paletteSombre() ? TUILE_NUIT[t.toUpperCase()] ?? P.white : t);

export type Access = { title: string; sub: string; href: string; kanji?: string; tint: string; art?: ImageSourcePropType; icon?: IconName; ornement?: OrnementKey };

/** Grande carte illustree, pleine largeur */
export function HeroAccess({ a }: { a: Access }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push(a.href as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={a.title}
      style={({ pressed }) => ({ height: 150, borderRadius: 26, backgroundColor: fondTuile(a.tint), overflow: 'hidden', transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      {a.ornement ? (
        <Ornement name={a.ornement} size={112} style={{ position: 'absolute', right: 12, top: 19 }} />
      ) : a.art ? (
        <Image source={a.art} style={{ position: 'absolute', right: -6, bottom: -62, width: 150, height: 200 }} resizeMode="contain" />
      ) : null}
      <View style={{ position: 'absolute', left: 14, bottom: 14, maxWidth: a.ornement ? '56%' : '62%', padding: 12, borderRadius: 18, backgroundColor: P.carte, borderWidth: 1, borderColor: P.white, gap: 2 }}>
        <Ink size={17} weight="black" tight>{a.title}</Ink>
        <Ink size={12} color={c.textSecondary} numberOfLines={2}>{a.sub}</Ink>
      </View>
    </Pressable>
  );
}

/** Carte carree illustree, en grille de deux */
export function TileAccess({ a }: { a: Access }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push(a.href as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={a.title}
      style={({ pressed }) => ({ width: '48.5%', height: 144, borderRadius: 22, backgroundColor: fondTuile(a.tint), overflow: 'hidden', padding: 14, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      {a.ornement ? (
        <Ornement name={a.ornement} size={58} style={{ position: 'absolute', right: 10, top: 10 }} />
      ) : a.art ? (
        <Image source={a.art} style={{ position: 'absolute', right: 6, top: 6, width: 58, height: 70 }} resizeMode="contain" />
      ) : null}
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: P.carte, alignItems: 'center', justifyContent: 'center' }}>
        {a.icon ? <Icon name={a.icon} size={21} color={c.ink} /> : null}
      </View>
      <View style={{ gap: 1 }}>
        <Ink size={15} weight="black" tight numberOfLines={2}>{a.title}</Ink>
        <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={2}>{a.sub}</Ink>
      </View>
    </Pressable>
  );
}

export function AccessGrid({ items }: { items: Access[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
      {items.map((a) => (
        <TileAccess key={a.href + a.title} a={a} />
      ))}
    </View>
  );
}
