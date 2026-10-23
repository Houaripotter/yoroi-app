/**
 * Raccourcis de tes sports, juste sous « Commencer une seance » : un appui ouvre la saisie du sport.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { sportImage, sportShortName, sportTint } from '@/lib/v2/seance/sportVisuals';
import { tap } from './ui';
import { Icon } from './Icon';
import { P } from '@/components/yoroi/livePalette';

export function SportShortcuts({ sports, femme, onPick }: { sports: string[]; femme: boolean; onPick: (sport: string) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {sports.map((s) => {
        const img = sportImage(s, femme, 0);
        const name = sportShortName(s);
        return (
          <Pressable
            key={s}
            onPress={() => { tap(); onPick(s); }}
            accessibilityRole="button"
            accessibilityLabel={`Commencer ${name}`}
            style={({ pressed }) => ({ flex: 1, gap: 6, transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <View style={{ height: 96, borderRadius: 18, backgroundColor: sportTint(s), overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: P.white }}>
              {img ? <Image source={img} style={{ position: 'absolute', top: 4, width: 96, height: 128 }} resizeMode="contain" /> : (
                <View style={{ flex: 1, justifyContent: 'center' }}><Icon name="dumbbell" size={32} color={c.textSecondary} /></View>
              )}
            </View>
            <Ink size={13} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center' }}>{name}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
