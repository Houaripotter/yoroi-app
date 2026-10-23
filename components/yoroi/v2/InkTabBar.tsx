/**
 * Barre de navigation v2 : pilule en verre depoli, 4 onglets avec leur nom ecrit sous l'icone
 * (Accueil, Seances, Progres, Dojo) et le bouton + au centre.
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync, impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useYoroiTheme } from '../YoroiThemeProvider';
import { Ink } from './Ink';
import { blancA } from '@/components/yoroi/livePalette';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';

const ICONS: Record<string, { label: string; d: string[]; join?: boolean }> = {
  index: { label: 'Accueil', d: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], join: true },
  seances: { label: 'Séances', d: ['M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11'] },
  progres: { label: 'Progrès', d: ['M3 17l5-5 4 3 8-8', 'M15 7h5v5'], join: true },
  dojo: { label: 'Dojo', d: ['M3 6h18M5 9.5h14M7 6v15M17 6v15'] },
};
const LEFT = ['index', 'seances'];
const RIGHT = ['progres', 'dojo'];

export const INK_TAB_BAR_SPACE = 64 + 22 + 20;

type Props = BottomTabBarProps & { onPressAdd: () => void };

export function InkTabBar({ state, navigation, onPressAdd }: Props) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom - 8, 0) + 14;

  const renderTab = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index < 0) return null;
    const route = state.routes[index];
    const focused = state.index === index;
    const icon = ICONS[name];
    const onPress = () => {
      selectionAsync().catch(() => {});
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <TourAnchor key={name} id={`onglet.${name}`} style={styles.ancre}>
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={icon.label}
        accessibilityState={{ selected: focused }}
        style={styles.tab}
        hitSlop={6}
      >
        <View style={[styles.tile, focused && { backgroundColor: c.accentTint }]}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            {icon.d.map((d) => (
              <Path
                key={d}
                d={d}
                stroke={focused ? c.accent : c.textSecondary}
                strokeWidth={focused ? 2.2 : 2}
                strokeLinecap="round"
                strokeLinejoin={icon.join ? 'round' : undefined}
              />
            ))}
          </Svg>
        </View>
        <Ink size={11} weight={focused ? 'extraBold' : 'bold'} color={focused ? c.accent : c.textSecondary} numberOfLines={1}>
          {icon.label}
        </Ink>
      </Pressable>
      </TourAnchor>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom }]}>
      <View style={[styles.shadow, { shadowColor: c.shadow }]}>
      <View style={[styles.pill, { borderColor: isDark ? c.border : 'rgba(255,255,255,0.9)' }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? (Platform.OS === 'ios' ? 'rgba(26,30,41,0.72)' : 'rgba(26,30,41,0.97)') : Platform.OS === 'ios' ? blancA(0.62) : blancA(0.96) }]} />
        {LEFT.map(renderTab)}
        <TourAnchor id="onglet.plus" style={styles.tab}>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
              onPressAdd();
            }}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer une séance, une pesée ou une mesure"
            style={({ pressed }) => [
              styles.add,
              { backgroundColor: pressed ? c.accentPressed : c.accent, shadowColor: c.accent, transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
          >
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke={c.onAccent} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </TourAnchor>
        {RIGHT.map(renderTab)}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 14, right: 14 },
  pill: {
    height: 64,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shadow: {
    borderRadius: 26,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 },
  ancre: { flex: 1, height: '100%' },
  tile: { width: 48, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  add: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
});
