/**
 * Kit des cartes partagees YOROI (refonte v2, l'armure vivante).
 * Trois habillages : papier de riz, laque noire, photo. Guerrier du rang, plaques kozane,
 * tampon hanko, gros chiffres, logo. Tout est dessine en vues et SVG pour la capture en image.
 */
import React, { forwardRef } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { personnageImage, SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import { SignatureCarte } from './SignatureCarte';

export type CardVariant = 'papier' | 'laque' | 'photo';

/** Les anciennes valeurs ('black', 'white', 'dark', 'light') restent comprises */
export function toVariant(bg?: string | null, hasPhoto?: boolean): CardVariant {
  if (bg === 'photo' && hasPhoto) return 'photo';
  if (bg === 'white' || bg === 'light' || bg === 'papier') return 'papier';
  return 'laque';
}

export type CardPalette = {
  bg: [string, string];
  ink: string;
  ink2: string;
  muted: string;
  line: string;
  /** couleur d'action, indigo */
  accent: string;
  /** reserve au tampon de record */
  red: string;
  gold: string;
  watermark: string;
  plate: string;
  plateTop: string;
  plateEmpty: string;
  panel: string;
  panelBorder: string;
  panelInk: string;
  panelInk2: string;
};

export function paletteOf(v: CardVariant): CardPalette {
  if (v === 'papier') {
    return {
      bg: ['#F6F5F0', '#ECEAE2'],
      ink: '#1D2029',
      ink2: '#4A4E5A',
      muted: '#8B8D96',
      line: '#E2DFD8',
      accent: '#2C4A84',
      red: '#B0282E',
      gold: '#A8832F',
      watermark: '#E4E1D8',
      plate: '#1D2029',
      plateTop: '#454A58',
      plateEmpty: '#C9C5BB',
      panel: 'rgba(255,255,255,0.86)',
      panelBorder: '#FFFFFF',
      panelInk: '#1D2029',
      panelInk2: '#4A4E5A',
    };
  }
  if (v === 'photo') {
    return {
      bg: ['#1D2029', '#1D2029'],
      ink: '#FFFFFF',
      ink2: 'rgba(255,255,255,0.86)',
      muted: 'rgba(255,255,255,0.66)',
      line: 'rgba(255,255,255,0.22)',
      accent: '#5B7BC0',
      red: '#D23A40',
      gold: '#E3C47B',
      watermark: 'rgba(255,255,255,0.08)',
      plate: '#1D2029',
      plateTop: '#454A58',
      plateEmpty: 'rgba(29,32,41,0.25)',
      panel: 'rgba(255,255,255,0.9)',
      panelBorder: '#FFFFFF',
      panelInk: '#1D2029',
      panelInk2: '#4A4E5A',
    };
  }
  return {
    bg: ['#262A35', '#14161D'],
    ink: '#FFFFFF',
    ink2: 'rgba(255,255,255,0.78)',
    muted: 'rgba(255,255,255,0.5)',
    line: 'rgba(255,255,255,0.12)',
    accent: '#5B7BC0',
    red: '#D23A40',
    gold: '#E3C47B',
    watermark: 'rgba(255,255,255,0.045)',
    plate: '#F2F1EC',
    plateTop: '#D8D5CC',
    plateEmpty: 'rgba(255,255,255,0.22)',
    panel: 'rgba(255,255,255,0.06)',
    panelBorder: 'rgba(255,255,255,0.12)',
    panelInk: '#FFFFFF',
    panelInk2: 'rgba(255,255,255,0.72)',
  };
}

const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');
const APPSTORE = require('@/assets/images/appstore.png');
const ANDROID = require('@/assets/images/android.png');

/** Cadre de la carte : fond, filigrane, cordon de soie indigo */
export const CardFrame = forwardRef<View, {
  variant: CardVariant;
  width: number;
  height: number;
  photo?: string | null;
  kanji?: string;
  children: React.ReactNode;
  radius?: number;
}>(({ variant, width, height, photo, children, radius = 28 }, ref) => {
  const p = paletteOf(variant);
  return (
    <View ref={ref} collapsable={false} style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: p.bg[1] }}>
      {variant === 'photo' && photo ? (
        <>
          <Image source={{ uri: photo }} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" />
          <LinearGradient colors={['rgba(20,22,29,0.55)', 'rgba(20,22,29,0.05)', 'rgba(20,22,29,0.25)', 'rgba(20,22,29,0.88)']} locations={[0, 0.3, 0.55, 1]} style={{ position: 'absolute', left: 0, top: 0, width, height }} />
        </>
      ) : (
        <>
          <LinearGradient colors={p.bg} style={{ position: 'absolute', left: 0, top: 0, width, height }} />
          {variant === 'papier' ? <PaperFibers width={width} height={height} /> : <LacquerSheen width={width} height={height} />}
          <View pointerEvents="none" style={{ position: 'absolute', right: -width * 0.14, top: height * 0.04 }}>
            <Glyph kind="sakura" size={width * 0.62} color={p.watermark} />
          </View>
        </>
      )}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: p.accent }} />
      <View style={{ position: 'absolute', left: 0, top: height * 0.18, width: 5, height: 14, backgroundColor: p.gold }} />
      {children}
    </View>
  );
});
CardFrame.displayName = 'CardFrame';

function PaperFibers({ width, height }: { width: number; height: number }) {
  const lines = [0.12, 0.27, 0.41, 0.58, 0.73, 0.88];
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      {lines.map((y, i) => (
        <Path key={i} d={`M0 ${height * y} C ${width * 0.3} ${height * y - 6}, ${width * 0.6} ${height * y + 7}, ${width} ${height * y - 2}`} stroke="#E6E3DA" strokeWidth={1} fill="none" opacity={0.7} />
      ))}
    </Svg>
  );
}

function LacquerSheen({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Path d={`M${width * 0.55} 0 L${width} 0 L${width} ${height * 0.35} Z`} fill="rgba(255,255,255,0.03)" />
      <Path d={`M0 ${height * 0.82} C ${width * 0.4} ${height * 0.78}, ${width * 0.7} ${height * 0.9}, ${width} ${height * 0.84}`} stroke="rgba(227,196,123,0.18)" strokeWidth={2} fill="none" />
    </Svg>
  );
}

/** En-tete : logo, mot YOROI, etiquette a droite */
export function CardTop({ p, label, size = 1 }: { p: CardPalette; label?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image source={LOGO} style={{ width: 28 * size, height: 28 * size, borderRadius: 8 * size }} />
      <Ink size={15 * size} weight="black" color={p.ink} style={{ letterSpacing: 2 }}>YOROI</Ink>
      <View style={{ flex: 1 }} />
      {label ? (
        <View style={{ borderWidth: 1, borderColor: p.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Ink size={11 * size} weight="bold" color={p.ink2} numberOfLines={1}>{label}</Ink>
        </View>
      ) : null}
    </View>
  );
}

/** Pied de carte : marque, ligne d'adresse commune (SignatureCarte) et magasins */
export function CardFoot({ p, compact }: { p: CardPalette; compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: p.line, paddingTop: compact ? 8 : 10 }}>
      <Image source={LOGO} style={{ width: compact ? 22 : 26, height: compact ? 22 : 26, borderRadius: 6 }} />
      <View style={{ flex: 1 }}>
        <Ink size={compact ? 11 : 12} weight="black" color={p.ink}>YOROI</Ink>
        <SignatureCarte size={compact ? 9 : 10} color={p.muted} />
      </View>
      <Image source={APPSTORE} style={{ width: compact ? 54 : 62, height: compact ? 18 : 20 }} resizeMode="contain" />
      <Image source={ANDROID} style={{ width: compact ? 54 : 62, height: compact ? 18 : 20 }} resizeMode="contain" />
    </View>
  );
}

/** Vague 47 : pastille ronde a la place de la plaque kozane (faite = cochee, en cours = contour or, a faire = pointilles) */
export function Plate({ p, on, partial, w = 22 }: { p: CardPalette; on: boolean; partial?: boolean; w?: number; tone?: 'red' | 'gold' | 'muted' }) {
  const s = w;
  if (on) {
    const hex = p.plate.replace('#', '');
    const lum = hex.length === 6 ? (parseInt(hex.slice(0, 2), 16) * 299 + parseInt(hex.slice(2, 4), 16) * 587 + parseInt(hex.slice(4, 6), 16) * 114) / 1000 : 0;
    return (
      <Svg width={s} height={s} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={12} fill={p.plate} />
        <Path d="M7.6 13.4 L11.3 17 L18.4 9.6" stroke={lum > 140 ? '#1D2029' : '#FFFFFF'} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    );
  }
  if (partial) {
    return (
      <Svg width={s} height={s} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={10.8} fill="rgba(197,157,69,0.2)" stroke={p.gold} strokeWidth={2.6} />
      </Svg>
    );
  }
  return (
    <Svg width={s} height={s} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={11.4} fill="none" stroke={p.plateEmpty} strokeWidth={1.6} strokeDasharray="2.6 2.2" />
    </Svg>
  );
}

/** Rangee de pastilles : progress de 0 a 1 */
export function PlateRow({ p, progress, count = 10, w = 20, gap = 2 }: { p: CardPalette; progress: number; count?: number; w?: number; gap?: number }) {
  const v = Math.max(0, Math.min(1, progress));
  const filled = Math.floor(v * count);
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Plate key={i} p={p} on={i < filled} partial={i === filled && v < 1 && v > 0} w={w} />
      ))}
    </View>
  );
}

/** Tampon hanko : couronne de laurier dessinee (char accepte et ignore) */
export function Stamp({ p, size = 46, rotate = -8, filled }: { p: CardPalette; char?: string; size?: number; rotate?: number; filled?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.2, borderWidth: 3, borderColor: p.red, backgroundColor: filled ? p.red : 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${rotate}deg` }] }}>
      <Glyph kind={size >= 40 ? 'laurier' : 'etoile'} size={Math.round(size * (size >= 40 ? 0.64 : 0.5))} color={filled ? '#FFFFFF' : p.red} />
    </View>
  );
}

/** Gros chiffre tres gras */
export function Big({ value, unit, label, color, size = 72, unitColor, labelColor }: { value: string | number; unit?: string; label?: string; color: string; size?: number; unitColor?: string; labelColor?: string }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Ink size={size} weight="black" tight color={color} numberOfLines={1} style={{ lineHeight: Math.round(size * 1.02) }}>{String(value)}</Ink>
        {unit ? <Ink size={Math.max(14, size * 0.24)} weight="extraBold" color={unitColor ?? color} style={{ marginBottom: size * 0.12 }}>{unit}</Ink> : null}
      </View>
      {label ? <Ink size={Math.max(12, size * 0.18)} weight="bold" color={labelColor ?? color}>{label}</Ink> : null}
    </View>
  );
}

/** Petite statistique */
export function Mini({ value, label, p, onPanel, accent }: { value: string; label: string; p: CardPalette; onPanel?: boolean; accent?: string }) {
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <Ink size={20} weight="black" tight color={accent ?? (onPanel ? p.panelInk : p.ink)} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Ink>
      <Ink size={10} weight="bold" color={onPanel ? p.panelInk2 : p.muted} numberOfLines={1}>{label}</Ink>
    </View>
  );
}

/** Panneau : verre sur photo, carte sur papier, laque claire sur laque */
export function Panel({ p, children, style }: { p: CardPalette; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: p.panel, borderColor: p.panelBorder, borderWidth: 1, borderRadius: 20, padding: 12 }, style]}>{children}</View>;
}

/** Pastille du rang : petite etoile et nom (kanji accepte et ignore) */
export function RankTag({ p, name, onPanel }: { p: CardPalette; kanji?: string; name: string; onPanel?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: onPanel ? '#1D2029' : p.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Glyph kind="etoile" size={11} color={p.gold === '#A8832F' ? '#E3C47B' : p.gold} />
      <Ink size={11} weight="extraBold" color="#FFFFFF">{name}</Ink>
    </View>
  );
}

/** Guerrier du rang, ou illustration du sport quand elle existe */
export function figureFor(opts: { personnage: string; rankIndex: number; genre: 'h' | 'f'; sport?: string | null }): ImageSourcePropType {
  const sport = opts.sport ? normaliseSport(opts.sport) : null;
  const illu = sport ? SPORT_ILLUS.find((s) => s.id === sport) : undefined;
  if (illu && (opts.personnage === 'guerrier_h' || opts.personnage === 'guerrier_f')) return opts.genre === 'f' ? illu.f : illu.h;
  return personnageImage(opts.personnage, opts.rankIndex, opts.genre);
}

function normaliseSport(raw: string): string {
  const id = raw.split(',')[0].trim().toLowerCase();
  if (id === 'course' || id === 'running' || id === 'trail') return 'running';
  if (id === 'crosstraining' || id === 'cross_training' || id === 'crossfit' || id === 'hyrox') return 'crossfit';
  if (id === 'bjj' || id === 'jjb' || id === 'grappling' || id === 'luta_livre') return 'jjb';
  if (id === 'boxe' || id === 'boxing' || id === 'boxe_anglaise' || id === 'kickboxing' || id === 'muay_thai') return 'boxe';
  if (id === 'muscu' || id === 'musculation' || id === 'street_workout' || id === 'powerlifting') return 'musculation';
  return id;
}

/** Sol sous le guerrier : trait au pinceau */
export function Ground({ width, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height={14}>
      <Path d={`M6 8 C ${width * 0.3} 3, ${width * 0.65} 12, ${width - 6} 6`} stroke={color} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.85} />
    </Svg>
  );
}

/** Ligne d'information sur fond de carte */
export function LineItem({ p, label, value, onPanel, strong }: { p: CardPalette; label: string; value: string; onPanel?: boolean; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderColor: onPanel && p.panelInk === '#1D2029' ? '#ECE9E1' : p.line }}>
      <Ink size={11} weight="bold" color={onPanel ? p.panelInk : p.ink} numberOfLines={1} style={{ flex: 1 }}>{label}</Ink>
      <Ink size={11} weight={strong ? 'black' : 'extraBold'} color={onPanel ? p.panelInk : p.ink} numberOfLines={1}>{value}</Ink>
    </View>
  );
}

export function fmtDuration(min: number): string {
  const m = Math.round(min || 0);
  if (m <= 0) return '0 min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r > 0 ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
}

/** Largeur par defaut d'une carte : l'ecran moins les marges, 400 points au plus */
export function cardWidthFor(screenWidth: number, max = 400): number {
  return Math.min(screenWidth - 44, max);
}
