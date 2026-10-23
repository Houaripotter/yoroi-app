/**
 * Briques visuelles Premium (refonte v2, l'armure vivante).
 * Uniquement du visuel : la logique Premium reste dans PremiumContext.
 * L'or est la couleur du Premium : liseré, veine kintsugi, sceau dore.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';

export function premiumTap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  } catch {
    // sans importance
  }
}

/** Sceau Premium : tampon dore a couronne de laurier (l'excellence) */
export function PremiumSeal({ size = 56 }: { size?: number }) {
  const { theme } = useYoroiTheme();
  return <Hanko tampon="medaille_or" size={size} rotate={-6} accessibilityLabel="Sceau Premium" />;
}

/** Petite pastille « Premium » dorée */
export function PremiumBadge({ light }: { light?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: light ? 'rgba(255,255,255,0.85)' : c.goldTint,
        borderWidth: 1,
        borderColor: c.goldLight,
      }}
    >
      <Svg width={10} height={13} viewBox="0 0 52 66">
        <Path d="M5 12 Q5 4 13 4 H39 Q47 4 47 12 V62 H5 Z" fill={c.goldDeep} />
        <Rect x={0} y={30} width={52} height={6} fill={c.accent} />
      </Svg>
      <Ink size={12} weight="extraBold" color={c.goldDeep}>
        Premium
      </Ink>
    </View>
  );
}

/** Veine d'or kintsugi pleine largeur (dessin vectoriel qui s'etire) */
export function GoldVein({ height = 14, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const w = 300;
  const h = height;
  const d = `M0 ${h * 0.6} L${w * 0.14} ${h * 0.35} L${w * 0.27} ${h * 0.7} L${w * 0.41} ${h * 0.3} L${w * 0.55} ${h * 0.62} L${w * 0.69} ${h * 0.4} L${w * 0.84} ${h * 0.68} L${w} ${h * 0.45}`;
  return (
    <View style={[{ height: h, width: '100%' }, style]} pointerEvents="none">
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Path d={d} stroke={theme.colors.gold} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} stroke="#FFF6DA" strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      </Svg>
    </View>
  );
}

/** Ligne d'avantage avec coche doree */
export function PerkRow({ label, desc, icon }: { label: string; desc?: string; icon?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.goldTint, alignItems: 'center', justifyContent: 'center' }}>
        {icon ?? <CheckMark color={c.goldDeep} />}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="extraBold">
          {label}
        </Ink>
        {desc ? (
          <Ink size={13} weight="medium" color={c.textSecondary}>
            {desc}
          </Ink>
        ) : null}
      </View>
    </View>
  );
}

export function CheckMark({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Icones dessinees (traits) pour les avantages */
const PERK_PATHS = {
  infinite: 'M7 9a3 3 0 1 0 0 6c2 0 3-1.5 5-3s3-3 5-3a3 3 0 1 1 0 6c-2 0-3-1.5-5-3S9 9 7 9z',
  chart: 'M4 19h16M7 16V11M12 16V6M17 16v-7',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6',
  save: 'M12 4v11M7 10l5 5 5-5M5 19h14',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  close: 'M6 6l12 12M18 6L6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};

export function PerkIcon({ name, color, size = 20 }: { name: keyof typeof PERK_PATHS; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PERK_PATHS[name]} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Gros bouton rouge vers l'abonnement */
export function PremiumButton({ label, sub, onPress }: { label: string; sub?: string; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        premiumTap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 60,
        borderRadius: 20,
        backgroundColor: pressed ? c.accentPressed : c.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: c.accent,
        shadowOpacity: 0.3,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      })}
    >
      <Svg width={14} height={18} viewBox="0 0 52 66">
        <Path d="M5 12 Q5 4 13 4 H39 Q47 4 47 12 V62 H5 Z" fill={c.goldLight} />
        <Rect x={0} y={30} width={52} height={5} fill={c.accentPressed} />
        <Rect x={0} y={46} width={52} height={5} fill={c.accentPressed} />
        <Circle cx={16} cy={20} r={2.4} fill={c.accent} />
        <Circle cx={36} cy={20} r={2.4} fill={c.accent} />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Ink size={17} weight="extraBold" color={c.onAccent}>
          {label}
        </Ink>
        {sub ? (
          <Ink size={12} weight="bold" color="rgba(255,255,255,0.8)">
            {sub}
          </Ink>
        ) : null}
      </View>
    </Pressable>
  );
}
