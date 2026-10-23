/**
 * L'entree « Personnaliser » tout en haut des Reglages (16 octobre 2026, Houari : « c'est grave caché »).
 * Une carte visible au premier coup d'oeil : ta scene et ton personnage en vignette, et ce que tu as choisi en
 * quelques mots (dont le style de ta courbe). Elle ouvre l'ecran Personnaliser (app/settings/style.tsx).
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { StyleCourbe } from '@/lib/v2/courbes/prefs';
import type { ImageSourcePropType } from 'react-native';

export function EntreePersonnaliser({ scene, personnage, resume, onPress }: { scene: ImageSourcePropType; personnage?: ImageSourcePropType; style?: StyleCourbe; resume: string; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Personnaliser : ${resume}`}
      style={({ pressed }) => ({ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.accent, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      {/* ta scene et ton personnage */}
      <View style={{ width: 78, height: 78, borderRadius: 16, overflow: 'hidden', backgroundColor: c.fillSoft }}>
        <Image source={scene} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        {personnage ? <Image source={personnage} style={{ position: 'absolute', right: -6, bottom: 0, width: 50, height: 70 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="wand" size={16} color={c.accent} stroke={2.4} />
          <Ink size={18} weight="black" tight color={c.ink}>Personnaliser</Ink>
        </View>
        <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>{resume}</Ink>
      </View>
      <Icon name="chevron" size={16} color={c.accent} stroke={2.6} />
    </Pressable>
  );
}
