/**
 * Hote unique du petit message apres un tirer pour actualiser (28 octobre 2026).
 * Monte une fois dans app/_layout.tsx. Pastille sombre en bas de l'ecran, au dessus de la barre d'onglets :
 * coche doree pour « À jour », point d'alerte pour une erreur (qui reste un peu plus longtemps pour etre lue).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ecouterToast, effacerToast, toastCourant } from '@/lib/v2/actualiser/toast';
import type { MessageToast } from '@/lib/v2/actualiser/toast';

const FOND = '#1D2029';
const OR = '#E8C77A';
const ALERTE = '#F08A7E';

export function ToastActualiser() {
  const insets = useSafeAreaInsets();
  const [m, setM] = useState<MessageToast | null>(toastCourant());
  const o = useRef(new Animated.Value(0)).current;

  useEffect(() => ecouterToast(setM), []);

  useEffect(() => {
    if (!m) return;
    o.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(m.ton === 'erreur' ? 3600 : 1400),
      Animated.timing(o, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) effacerToast(m.id);
    });
    return () => anim.stop();
  }, [m, o]);

  if (!m) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 96, alignItems: 'center', opacity: o, transform: [{ translateY: o.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}
    >
      <View style={{ maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, backgroundColor: FOND, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          {m.ton === 'ok' ? (
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={OR} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <Circle cx={12} cy={12} r={9} stroke={ALERTE} strokeWidth={2.4} />
              <Path d="M12 7.5v5.5M12 16.5v.01" stroke={ALERTE} strokeWidth={2.6} strokeLinecap="round" />
            </>
          )}
        </Svg>
        <Ink size={14} weight="extraBold" color="#FFFFFF" style={{ flexShrink: 1 }} numberOfLines={3}>
          {m.texte}
        </Ink>
      </View>
    </Animated.View>
  );
}
