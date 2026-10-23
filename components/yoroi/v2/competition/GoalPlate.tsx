/**
 * Pastille d'objectif : vide et pointillee tant qu'il est en cours, pleine et cochee quand il est atteint,
 * avec un tampon rouge qui s'imprime.
 * Vague 45 : pastilles de séance à la place des plaques kozane (le dessin vient de Kozane du kit).
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Kozane } from '@/components/yoroi/v2/accueil/kit';
import { Hanko } from '@/components/yoroi/v2/ornements/screens';
import { blancA } from '@/components/yoroi/livePalette';

export function GoalPlate({ done, size = 44 }: { done: boolean; size?: number; stamp?: string }) {
  const s = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    s.value = withTiming(done ? 1 : 0, { duration: 160 });
  }, [done]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value), transform: [{ scale: s.value === 0 ? 0.6 : s.value }, { rotate: '-10deg' }] }));
  return (
    <View style={{ width: size + 12, height: Math.round(size * 1.27) + 6, alignItems: 'center', justifyContent: 'center' }}>
      <Kozane on={done} w={size} h={Math.round(size * 1.27)} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: -4, bottom: -2 }, st]}>
        <View style={{ backgroundColor: blancA(0.9), borderRadius: 8 }}>
          <Hanko size={Math.round(size * 0.62)} rotate={0} />
        </View>
      </Animated.View>
    </View>
  );
}
