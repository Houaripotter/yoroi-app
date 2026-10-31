/**
 * 31 octobre 2026 (Houari : « quand les toggles sont activés, on dirait qu'ils sont désactivés, la couleur n'est pas top ») :
 * l'interrupteur commun de l'app. Allume : piste franche (theme.colors.switchOn), rond blanc avec une petite ombre.
 * Eteint : piste gris neutre (switchOff). Les couleurs vivent dans tokens.ts, clair et sombre.
 *
 * Interrupteur : le Switch du systeme, aux couleurs de YOROI (a utiliser a la place de Switch de react-native).
 * PisteInterrupteur : le meme, dessine et purement visuel, quand toute la ligne ou la tuile porte le toucher.
 */
import React, { useEffect } from 'react';
import { Switch, View } from 'react-native';
import type { SwitchProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from './YoroiThemeProvider';

export function Interrupteur({ trackColor: _trackColor, thumbColor: _thumbColor, ios_backgroundColor: _ios, ...props }: SwitchProps) {
  const c = useYoroiTheme().theme.colors;
  return (
    <Switch
      {...props}
      trackColor={{ false: c.switchOff, true: c.switchOn }}
      thumbColor={c.switchThumb}
      ios_backgroundColor={c.switchOff}
      // react-native-web : le rond reste blanc une fois allume
      {...({ activeThumbColor: c.switchThumb } as object)}
    />
  );
}

/** Interrupteur dessine (46 x 28 par defaut), sans toucher propre : la ligne qui le porte annonce l'etat */
export function PisteInterrupteur({ on, largeur = 46, hauteur = 28 }: { on: boolean; largeur?: number; hauteur?: number }) {
  const c = useYoroiTheme().theme.colors;
  const marge = hauteur >= 34 ? 4 : hauteur <= 22 ? 2.5 : 3;
  const rond = hauteur - marge * 2;
  const course = largeur - rond - marge * 2;
  const x = useSharedValue(on ? course : 0);
  useEffect(() => {
    x.value = withTiming(on ? course : 0, { duration: 160 });
  }, [on, course, x]);
  const glisse = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: largeur, height: hauteur, borderRadius: hauteur / 2, backgroundColor: on ? c.switchOn : c.switchOff, padding: marge, justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          { width: rond, height: rond, borderRadius: rond / 2, backgroundColor: c.switchThumb, shadowColor: c.shadow, shadowOpacity: 0.22, shadowRadius: 2.5, shadowOffset: { width: 0, height: 1.5 }, elevation: 2 },
          glisse,
        ]}
      />
    </View>
  );
}
