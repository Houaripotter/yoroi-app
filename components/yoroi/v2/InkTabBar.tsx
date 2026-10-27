/**
 * Barre de navigation v2 : 4 onglets (Accueil, Seances, Progres, Dojo) et le bouton + au centre.
 * 27 octobre 2026 (refonte Ciel, choisie par Houari) : pilule blanche flottante. L'onglet ouvert devient une pilule
 * etiree, icone et nom affiches ; les autres montrent seulement leur icone. Correction du meme jour (Houari : « le bleu
 * plein est trop fort ») : la pilule active est pastel (#DCE3FF) avec icone et nom bleu nuit (#23358F), les autres
 * icones en gris bleute (#646985) sans rond colore, le bouton + aussi en pastel. Ancienne barre (verre depoli, noms sous les icones) : _archive_ancien_design_2026-10-09/refonte_ciel_2026-10-27.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync, impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useYoroiTheme } from '../YoroiThemeProvider';
import { Ink } from './Ink';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { traduire } from '@/lib/i18n/tr';

const ICONS: Record<string, { label: string; d: string[]; join?: boolean }> = {
  index: { label: traduire('Accueil'), d: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], join: true },
  seances: { label: traduire('Séances'), d: ['M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11'] },
  progres: { label: traduire('Progrès'), d: ['M3 17l5-5 4 3 8-8', 'M15 7h5v5'], join: true },
  dojo: { label: traduire('Dojo'), d: ['M3 6h18M5 9.5h14M7 6v15M17 6v15'] },
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
      <Animated.View key={name} layout={LinearTransition.duration(220)} style={focused ? styles.slotActif : styles.slot}>
      <TourAnchor id={`onglet.${name}`} style={styles.ancre}>
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={traduire(icon.label)}
        accessibilityState={{ selected: focused }}
        style={[styles.tab, focused ? { backgroundColor: c.primary } : null]}
        hitSlop={4}
      >
        <Svg width={focused ? 19 : 20} height={focused ? 19 : 20} viewBox="0 0 24 24" fill="none">
          {icon.d.map((d) => (
            <Path
              key={d}
              d={d}
              stroke={focused ? c.onPrimary : c.textSecondary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin={icon.join ? 'round' : undefined}
            />
          ))}
        </Svg>
        {focused ? (
          <Ink size={14} weight="black" color={c.onPrimary} numberOfLines={1} style={{ flexShrink: 1 }}>
            {traduire(icon.label)}
          </Ink>
        ) : null}
      </Pressable>
      </TourAnchor>
      </Animated.View>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom }]}>
      <View style={[styles.shadow, { shadowColor: c.shadow }]}>
      <View style={[styles.pill, { backgroundColor: c.surface, borderColor: isDark ? c.border : 'rgba(255,255,255,0.9)' }]}>
        {LEFT.map(renderTab)}
        <TourAnchor id="onglet.plus" style={styles.slotPlus}>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
              onPressAdd();
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Enregistrer une séance, une pesée ou une mesure")}
            style={({ pressed }) => [
              styles.add,
              // 27 octobre 2026 soir (maquette Pastel-Final-Accueil) : rond pastel tres clair de 48, plus fin
              { backgroundColor: pressed ? c.primary : c.accentTint, transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
          >
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke={c.onPrimary} strokeWidth={2.6} strokeLinecap="round" />
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
  // 27 octobre 2026 soir (maquette Pastel-Final-Accueil) : 16 des bords, 64 de haut, rayon 32
  outer: { position: 'absolute', left: 16, right: 16 },
  pill: {
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 4,
  },
  shadow: {
    borderRadius: 32,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 12,
  },
  slot: { width: 48, height: 48 },
  slotActif: { flex: 1, height: 48 },
  slotPlus: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  ancre: { flex: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 16 },
  add: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
