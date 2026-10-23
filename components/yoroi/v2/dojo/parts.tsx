/**
 * Petites briques partagees des ecrans du Dojo : en-tete avec retour, icones dessinees,
 * barre de ceinture, carte, veine d'or kintsugi.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { P, paletteSombre } from '@/components/yoroi/livePalette';

/** Palette du Dojo : lue dans la palette vivante a chaque rendu (vague 35, clair ou sombre) */
export const DOJO = {
  get paper(): string {
    return P.paper;
  },
  get ink(): string {
    return P.ink;
  },
  get ink2(): string {
    return P.ink2;
  },
  get muted(): string {
    return P.muted;
  },
  get border(): string {
    return P.line;
  },
  get border2(): string {
    return P.line2;
  },
  get accent(): string {
    return P.accent;
  },
  get danger(): string {
    return P.danger;
  },
  get record(): string {
    return P.record;
  },
  get red(): string {
    return P.red;
  },
  get indigo(): string {
    return P.indigo;
  },
  get gold(): string {
    return P.gold;
  },
  get goldLight(): string {
    return P.goldLight;
  },
  get moss(): string {
    return P.moss;
  },
  get mossText(): string {
    return P.mossText;
  },
  get card(): string {
    return P.white;
  },
  get inkCard(): string {
    return P.ink;
  },
  get inkCard2(): string {
    return (paletteSombre() ? '#D6D4CC' : '#2A2D38');
  },
};

export function tap() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Marge laterale commune a tous les ecrans v2 */
export const GUTTER = 22;

/**
 * En-tete commun (16 octobre 2026) : barre compacte, retour rond et titre sur la meme ligne.
 * A placer en haut d'un conteneur dont la marge laterale vaut GUTTER (il deborde sur la marge).
 * Avec une scene : la barre d'abord, la scene d'epoque en bandeau juste dessous.
 */
export function BackHeader({ title, subtitle, right, scene }: { title: string; subtitle?: string; right?: React.ReactNode; scene?: ImageSourcePropType }) {
  const router = useRouter();
  const entete = (
    <EnTete
      titre={title}
      sousTitre={subtitle}
      droite={right}
      onRetour={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/dojo' as any);
      }}
      style={{ marginHorizontal: -GUTTER, marginTop: -8 }}
    />
  );
  if (scene) {
    return (
      <View style={{ gap: 8, marginBottom: 4 }}>
        {entete}
        <View style={{ height: 120, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E9E4D8' }}>
          <Image source={scene} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
      </View>
    );
  }
  return <View style={{ marginBottom: 4 }}>{entete}</View>;
}

export function Card({ children, style, dark }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return (
    <View
      style={[
        {
          backgroundColor: dark ? DOJO.inkCard : DOJO.card,
          borderRadius: 22,
          borderWidth: dark ? 0 : 1,
          borderColor: DOJO.border,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ShieldIcon({ size = 24, filled = true, color = DOJO.goldLight }: { size?: number; filled?: boolean; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeDasharray={filled ? undefined : '3 2.5'} opacity={filled ? 1 : 0.6} />
      {filled ? <Path d="M12 6.5v11" stroke="#1D2029" strokeWidth={1.2} opacity={0.25} /> : null}
    </Svg>
  );
}

export function CheckIcon({ size = 20, color = DOJO.moss }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L19 7" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function LockIcon({ size = 20, color = DOJO.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={2} stroke={color} strokeWidth={2} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronIcon({ size = 16, color = DOJO.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PersonIcon({ size = 18, color = DOJO.goldLight }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={color} strokeWidth={2} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Ceinture dessinee : bande de couleur avec le noeud. */
export function BeltSwatch({ color, edge, width = 46, height = 14 }: { color: string; edge: string; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height + 6} viewBox={`0 0 ${width} ${height + 6}`}>
      <Rect x={0.5} y={3} width={width - 1} height={height} rx={3} fill={color} stroke={edge} strokeWidth={1} />
      <Rect x={width / 2 - 5} y={0.5} width={10} height={height + 5} rx={2.5} fill={color} stroke={edge} strokeWidth={1} />
      <Rect x={width * 0.72} y={3} width={width * 0.12} height={height} fill="#1D2029" opacity={color === '#1D2029' ? 0 : 0.85} />
    </Svg>
  );
}

/** Plaque de niveau : petite plaque de laque coloree, lacee de soie doree (niveaux de pratique). */
export function LevelPlate({ color, edge, size = 22 }: { color: string; edge: string; size?: number }) {
  // vague 47 : pastille ronde de la couleur du niveau, a la place de la plaque lacee
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={11.6} fill={color} stroke={edge} strokeWidth={1.6} />
    </Svg>
  );
}

/** Barre de progression a bout arrondi. */
export function Bar({ progress, color, track = '#ECEAE4', height = 8 }: { progress: number; color: string; track?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(pct * 100)}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Veine d'or kintsugi : un trait brise et dore, signe qu'on est revenu apres une pause. */
export function KintsugiVein({ width = 300, height = 18, color = DOJO.goldLight }: { width?: number; height?: number; color?: string }) {
  const h = height;
  const d = `M0 ${h * 0.6} L${width * 0.14} ${h * 0.35} L${width * 0.27} ${h * 0.7} L${width * 0.41} ${h * 0.3} L${width * 0.55} ${h * 0.62} L${width * 0.69} ${h * 0.4} L${width * 0.84} ${h * 0.68} L${width} ${h * 0.45}`;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Path d={d} stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="#FFF6DA" strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </Svg>
  );
}

export function formatXp(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function formatDay(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Cadre du rang (pour tous, Premium compris) : le rang reste une recompense visible.
 * Ashigaru : simple bordure. Bushi : liseré indigo. Samouraï : liseré or. Rōnin : double
 * liseré or. Shōgun : cadre doré épais, et un cartouche de dan au-dela.
 */
export function RankFrame({ rankIndex, dan = 0, radius = 28, children }: { rankIndex: number; dan?: number; radius?: number; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const outer = rankIndex >= 4 ? 4 : rankIndex >= 1 ? 2 : 1;
  const color = rankIndex === 0 ? c.border : rankIndex === 1 ? c.indigo : DOJO.gold;
  const inner = rankIndex >= 3;
  const pad = inner ? 3 : 0;
  return (
    <View style={{ borderRadius: radius + outer + pad, borderWidth: outer, borderColor: color, padding: pad }}>
      {inner ? (
        <View style={{ borderRadius: radius + 1, borderWidth: 1, borderColor: rankIndex >= 4 ? DOJO.goldLight : DOJO.gold, overflow: 'hidden' }}>{children}</View>
      ) : (
        children
      )}
      {dan > 0 ? (
        <View
          style={{ position: 'absolute', right: 14, bottom: 14, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#1D2029', borderWidth: 1, borderColor: DOJO.goldLight }}
          accessible
          accessibilityLabel={dan === 1 ? '1er dan' : `${dan}e dan`}
        >
          <Ink size={12} weight="extraBold" color={DOJO.goldLight}>{dan === 1 ? '1er dan' : `${dan}e dan`}</Ink>
        </View>
      ) : null}
    </View>
  );
}

/** Case du geste du jour : cochee des qu'une seance, une pesee ou de l'eau est notee aujourd'hui. */
export function CheckBox({ checked, size = 28 }: { checked: boolean; size?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ width: size, height: size, borderRadius: 8, borderWidth: 2, borderColor: checked ? c.accent : c.border, backgroundColor: checked ? c.accent : c.surface, alignItems: 'center', justifyContent: 'center' }}>
      {checked ? (
        <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.onAccent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}
