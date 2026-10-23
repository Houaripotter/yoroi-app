/**
 * Noyau commun des graphiques v2.
 * Meme trait au pinceau, meme grille, meme typo d'axes, meme curseur au doigt,
 * meme tampon de record et meme bulle de valeur pour tous les graphiques de l'app
 * (WeightChart, InkLineChart, InkBarChart, BrushChart, HrChart).
 * Regles : une seule echelle par graphique, texte en couleur d'encre,
 * grille discrete, couleurs de series dans l'ordre de la palette validee.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { fontFamilies } from '../../fonts';
import { Ink } from '../Ink';

/** Mousse : teinte d'une courbe seule (eau du corps) */
export const CHART_MOSS = '#4D6F2A';
/**
 * Palette validee pour les series (ordre fixe, jamais cyclee). Aucune courbe en rouge.
 * Vague 30 : or et mousse re-etages pour passer le validateur du skill dataviz en toutes paires
 * (daltonisme protan et deutan, vision normale, contraste sur blanc et sur papier).
 */
export const CHART_COLORS = { blue: '#3D5D9E', gold: '#A68330', moss: CHART_MOSS } as const;
/** Rouge des tampons de record : reserve aux records, ne suit pas la couleur d'action */
export const RECORD_RED = '#B0282E';
/**
 * Vague 45 : le violet des petites courbes de records (le langage de la courbe de poids), jamais le rouge,
 * reserve au tampon de record. 4,9:1 sur blanc, 5,2:1 sur la carte sombre.
 */
export const VIOLET_CLAIR = '#6A4FE0';
export const VIOLET_SOMBRE = '#A08CF5';
/** Ordre des series : le rouge n'en fait plus partie, il reste aux records */
export const SERIES_ORDER = [CHART_COLORS.blue, CHART_COLORS.gold, CHART_MOSS] as const;

/**
 * Mesures communes a tous les graphiques (vague 30 : trait fin et net, lavis doux, point final avec halo).
 */
export const CHART = {
  // vague 33 : le langage de la courbe de poids (style C du labo) pour toutes les courbes :
  // trait plus franc, halo doux, point final blanc cercle de la couleur de la mesure
  stroke: 3,
  strokeCompact: 2.5,
  haloExtra: 6.5,
  haloOpacity: 0.13,
  /** opacite du haut du lavis sous la courbe (il s'efface vers le bas) */
  wash: 0.2,
  washCompact: 0.16,
  grid: '#E9E6DF',
  baseline: '#D6D3CB',
  /** encre douce des axes : lisible (4,7:1 sur papier, 5,3:1 sur blanc) sans crier */
  axisInk: '#686B75',
  axisSize: 11,
  axisFamily: fontFamilies.medium,
  labelSize: 12,
  labelFamily: fontFamilies.bold,
  cursorWidth: 1.5,
  cursorR: 5.5,
  endR: 5.5,
  /** rayon du halo autour du point final */
  haloR: 10,
  barMax: 22,
  barRadius: 6,
  padTop: 22,
  padBottom: 26,
  padLeft: 34,
  padRight: 14,
  /** duree de l'animation d'entree (la courbe se dessine de gauche a droite) */
  drawMs: 720,
} as const;

/** Melange deux couleurs hexadecimales (t = 0 : a, t = 1 : b) */
export function mix(a: string, b: string, t: number): string {
  const pa = a.replace('#', '');
  const pb = b.replace('#', '');
  const ca = [0, 2, 4].map((i) => parseInt(pa.slice(i, i + 2), 16));
  const cb = [0, 2, 4].map((i) => parseInt(pb.slice(i, i + 2), 16));
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Teinte claire d'une couleur de serie (barres des semaines passees, fond de pastille) */
export function tint(color: string, t = 0.62): string {
  return mix(color, '#FFFFFF', t);
}

/** Couleurs de texte et de structure (encre, jamais la couleur d'une serie) */
export function useChartInk() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return useMemo(
    () => ({
      ink: c.ink,
      axis: theme.isDark ? c.textMuted : CHART.axisInk,
      muted: c.textMuted,
      surface: c.background,
      card: c.surface,
      accent: c.accent,
      grid: theme.isDark ? c.divider : CHART.grid,
      baseline: theme.isDark ? c.divider : CHART.baseline,
      onDark: c.onDark,
    }),
    [c, theme.isDark],
  );
}

/**
 * Courbe lissee au pinceau a travers les points.
 * Lissage monotone : la courbe passe par chaque point sans faire de marches
 * ni depasser les valeurs reelles (pas de bosse inventee entre deux points).
 */
export function brushPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return '';
  const f = (v: number) => v.toFixed(1);
  if (n === 1) return `M${f(pts[0].x)} ${f(pts[0].y)}`;
  if (n === 2) return `M${f(pts[0].x)} ${f(pts[0].y)} L${f(pts[1].x)} ${f(pts[1].y)}`;
  const dx: number[] = [];
  const sl: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = pts[i + 1].x - pts[i].x || 1e-6;
    dx.push(h);
    sl.push((pts[i + 1].y - pts[i].y) / h);
  }
  const m: number[] = [sl[0]];
  for (let i = 1; i < n - 1; i++) {
    if (sl[i - 1] * sl[i] <= 0) m.push(0);
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m.push((w1 + w2) / (w1 / sl[i - 1] + w2 / sl[i]));
    }
  }
  m.push(sl[n - 2]);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const h = dx[i] / 3;
    d += ` C${f(a.x + h)} ${f(a.y + m[i] * h)} ${f(b.x - h)} ${f(b.y - m[i + 1] * h)} ${f(b.x)} ${f(b.y)}`;
  }
  return d;
}

/** Graduations rondes (1, 2, 2,5, 5, 10 par puissance de dix) */
export function niceTicks(min: number, max: number, target = 3): number[] {
  const raw = (max - min) / target || 1;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.abs(raw))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return ticks;
}

/** Vague 45 : 2 ou 3 reperes ronds au plus (le langage de la courbe de poids), jamais colles aux bords */
export function reperesCourts(min: number, max: number): number[] {
  const m = (max - min) * 0.06;
  for (const target of [3, 2, 1.5, 1]) {
    const t = niceTicks(min + m, max - m, target).filter((v) => v >= min + m - 1e-9 && v <= max - m + 1e-9);
    if (t.length >= 2 && t.length <= 3) return t;
    if (t.length < 2) return t.length ? t : [Math.round(((min + max) / 2) * 10) / 10];
  }
  return niceTicks(min + m, max - m, 1).slice(0, 3);
}

/** Index du point le plus proche d'une abscisse */
export function nearestIndex(xs: number[], x: number): number | null {
  if (xs.length === 0) return null;
  let best = 0;
  let bd = Infinity;
  xs.forEach((px, i) => {
    const d = Math.abs(px - x);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

type ScrubOptions = {
  /** abscisse locale vers index (ou null) */
  indexAt: (x: number) => number | null;
  onChange?: (i: number | null) => void;
  /** vrai : le doigt pose suffit (barres) ; faux : il faut glisser a l'horizontale (courbes dans une page qui defile) */
  startOnTouch?: boolean;
  /** garde la valeur visible un instant apres avoir leve le doigt */
  holdMs?: number;
  /** appui court sans glisser : ouvre le detail (le glisse garde le curseur) */
  onTap?: () => void;
};

/** Geste au doigt commun : curseur, retour haptique a chaque nouveau point */
export function useChartScrub(opts: ScrubOptions) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const viewRef = useRef<View>(null);
  const originX = useRef(0);
  const last = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  // Mode appui : le doigt est pris des le contact, le curseur ne nait qu'au premier glisse horizontal
  const scrubbing = useRef(false);
  const startedAt = useRef(0);
  const [pressed, setPressed] = useState(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const panHandlers = useMemo(() => {
    const pick = (e: GestureResponderEvent) => {
      const i = optsRef.current.indexAt(e.nativeEvent.pageX - originX.current);
      if (i === null || i === last.current) return;
      last.current = i;
      selectionAsync().catch(() => {});
      setActive(i);
      optsRef.current.onChange?.(i);
    };
    const end = () => {
      last.current = null;
      const finish = () => {
        setActive(null);
        optsRef.current.onChange?.(null);
      };
      const hold = optsRef.current.holdMs ?? 0;
      if (hold > 0) timer.current = setTimeout(finish, hold);
      else finish();
    };
    const tapMode = () => !!optsRef.current.onTap && !optsRef.current.startOnTouch;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !!optsRef.current.startOnTouch || !!optsRef.current.onTap,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      // En mode appui, tant que le doigt ne glisse pas a l'horizontale, la page peut defiler
      onPanResponderTerminationRequest: () => (tapMode() ? !scrubbing.current : !!optsRef.current.startOnTouch),
      onPanResponderGrant: (e, g) => {
        if (timer.current) clearTimeout(timer.current);
        viewRef.current?.measureInWindow((x) => {
          originX.current = x;
        });
        startedAt.current = Date.now();
        if (tapMode()) {
          // contact pose par le geste de defilement ou d'appui : pas encore de curseur
          scrubbing.current = Math.abs(g.dx) > 6;
          if (scrubbing.current) pick(e);
          else setPressed(true);
          return;
        }
        scrubbing.current = true;
        pick(e);
      },
      onPanResponderMove: (e, g) => {
        if (!scrubbing.current) {
          if (Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2) {
            scrubbing.current = true;
            setPressed(false);
          } else {
            if (Math.abs(g.dy) > 8) setPressed(false);
            return;
          }
        }
        pick(e);
      },
      onPanResponderRelease: (_e, g) => {
        const wasTap = tapMode() && !scrubbing.current && Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10 && Date.now() - startedAt.current < 600;
        const tapOnBar = !!optsRef.current.onTap && !!optsRef.current.startOnTouch && Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6 && Date.now() - startedAt.current < 300;
        setPressed(false);
        scrubbing.current = false;
        end();
        if (wasTap || tapOnBar) optsRef.current.onTap?.();
      },
      onPanResponderTerminate: () => {
        setPressed(false);
        scrubbing.current = false;
        end();
      },
    }).panHandlers;
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(Math.round(e.nativeEvent.layout.width));
    viewRef.current?.measureInWindow((x) => {
      originX.current = x;
    });
  };

  return { viewRef, width, onLayout, panHandlers, active, pressed };
}

/** Grille horizontale (filets tres discrets) et graduations de l'axe (a gauche, encre douce) */
export function ChartGrid({ ticks, y, x1, x2, format, right }: { ticks: number[]; y: (v: number) => number; x1: number; x2: number; format: (v: number) => string; /** vague 45 : reperes a droite, cales sur ce bord (comme la courbe de poids) */ right?: number }) {
  const k = useChartInk();
  return (
    <G>
      {ticks.map((t) => {
        const ty = Math.round(y(t)) + 0.5;
        return (
          <G key={`t${t}`}>
            <Line x1={x1} x2={x2} y1={ty} y2={ty} stroke={k.grid} strokeWidth={1} />
            <SvgText x={right ?? 0} y={ty + 3.5} textAnchor={right != null ? 'end' : 'start'} fontSize={CHART.axisSize} fontFamily={CHART.axisFamily} fill={k.axis}>
              {format(t)}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

/** Etiquette de l'axe du temps (en bas) */
export function AxisLabel({ x, y, text, anchor = 'middle', strong }: { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end'; strong?: boolean }) {
  const k = useChartInk();
  return (
    <SvgText x={x} y={y} textAnchor={anchor} fontSize={CHART.axisSize} fontFamily={strong ? CHART.labelFamily : CHART.axisFamily} fill={strong ? k.ink : k.axis}>
      {text}
    </SvgText>
  );
}

type Pt = { x: number; y: number };

/**
 * Choisit ou poser une etiquette pres d'une ligne horizontale sans toucher la courbe :
 * a droite ou a gauche, au-dessus ou en dessous, la place la plus libre.
 */
export function placeLineLabel(opts: { y: number; x1: number; x2: number; textWidth: number; avoid?: Pt[]; top?: number; bottom?: number }) {
  const { y, x1, x2, textWidth, avoid = [], top = 0, bottom = 99999 } = opts;
  const w = textWidth + 14;
  const h = 20;
  const cands = [
    { left: x2 - w, top: y - h - 4 },
    { left: x2 - w, top: y + 4 },
    { left: x1, top: y - h - 4 },
    { left: x1, top: y + 4 },
  ].filter((r) => r.top >= top - 2 && r.top + h <= bottom + 2);
  const list = cands.length ? cands : [{ left: x2 - w, top: y - h - 4 }];
  let best = list[0];
  let bestHits = Infinity;
  list.forEach((r) => {
    const hits = avoid.filter((p) => p.x >= r.left - 6 && p.x <= r.left + w + 6 && p.y >= r.top - 6 && p.y <= r.top + h + 6).length;
    if (hits < bestHits) {
      bestHits = hits;
      best = r;
    }
  });
  return { left: best.left, top: best.top, width: w, height: h };
}

/** Largeur approximative d'un texte d'etiquette (police grasse 12) */
export function labelWidth(text: string, size: number = CHART.labelSize) {
  return text.length * size * 0.58;
}

/**
 * Ligne de repere (objectif, moyenne) : pointilles ronds et fins.
 * L'etiquette est posee dans une pastille teintee, a la place la plus libre (jamais sur la courbe).
 */
export function RefLine({ y, x1, x2, label, color, avoid, top, bottom }: { y: number; x1: number; x2: number; label?: string; color?: string; avoid?: Pt[]; top?: number; bottom?: number }) {
  const k = useChartInk();
  const col = color ?? k.axis;
  const box = label ? placeLineLabel({ y, x1, x2, textWidth: labelWidth(label), avoid, top, bottom }) : null;
  return (
    <G>
      <Line x1={x1} x2={x2} y1={y} y2={y} stroke={col} strokeOpacity={0.75} strokeWidth={1.6} strokeDasharray="0.1 5" strokeLinecap="round" />
      {label && box ? (
        <G>
          <Rect x={box.left} y={box.top} width={box.width} height={box.height} rx={box.height / 2} fill={k.card} />
          <Rect x={box.left} y={box.top} width={box.width} height={box.height} rx={box.height / 2} fill={col} fillOpacity={0.1} />
          <SvgText x={box.left + box.width / 2} y={box.top + 14} textAnchor="middle" fontSize={CHART.labelSize} fontFamily={CHART.labelFamily} fill={col}>
            {label}
          </SvgText>
        </G>
      ) : null}
    </G>
  );
}

/** Curseur au doigt : filet vertical d'encre douce et pastille de la valeur touchee */
export function ChartCursor({ x, top, bottom, cy, compact, color }: { x: number; top: number; bottom: number; cy?: number | null; compact?: boolean; color?: string }) {
  const k = useChartInk();
  const col = color ?? k.ink;
  const rx = Math.round(x) + 0.5;
  return (
    <G>
      <Line x1={rx} x2={rx} y1={top} y2={bottom} stroke={k.ink} strokeOpacity={0.18} strokeWidth={CHART.cursorWidth} />
      {cy != null ? (
        <G>
          <Circle cx={x} cy={cy} r={compact ? 9 : 12} fill={col} fillOpacity={0.16} />
          <Circle cx={x} cy={cy} r={compact ? 4.5 : CHART.cursorR} fill={k.card} stroke={col} strokeWidth={compact ? 2.5 : 3} />
        </G>
      ) : null}
    </G>
  );
}

/** Point de fin de courbe (derniere valeur) : pastille pleine, anneau blanc et halo leger */
export function EndDot({ cx, cy, color, compact }: { cx: number; cy: number; color: string; compact?: boolean }) {
  const k = useChartInk();
  return (
    <G>
      <Circle cx={cx} cy={cy} r={compact ? 7.5 : 12} fill={color} fillOpacity={0.16} />
      <Circle cx={cx} cy={cy} r={compact ? 3.6 : CHART.endR} fill={k.card} stroke={color} strokeWidth={compact ? 2.2 : 3} />
    </G>
  );
}

/** Tampon hanko rouge pose sur un record : etoile dessinee */
/**
 * 16 octobre (Houari : « ça ne dit pas que c'est un record, fais le truc des records que tout le monde connaît ») :
 * le marqueur de record est un trophee dore dans une pastille ronde, cerclee de la couleur de la carte pour se
 * detacher de la courbe. L'or suffit : plus de rouge pour ce marqueur.
 */
export const RECORD_GOLD = { clair: '#A9822A', sombre: '#E3C47B' } as const;

export function useRecordGold(): { fond: string; trophee: string } {
  const { theme } = useYoroiTheme();
  return theme.isDark ? { fond: RECORD_GOLD.sombre, trophee: '#1D2029' } : { fond: RECORD_GOLD.clair, trophee: '#FFFFFF' };
}

/** Le trophee dessine sur une grille de 24, centre en (0, 0) */
function TropheeG({ size, color }: { size: number; color: string }) {
  const s = size / 24;
  return (
    <G transform={`translate(${(-size / 2).toFixed(2)} ${(-size / 2).toFixed(2)}) scale(${s.toFixed(4)})`}>
      <Path d="M7 3.5h10v5.2a5 5 0 0 1-10 0z" fill={color} />
      <Path d="M7.2 5.6H4.6v1.1a3.6 3.6 0 0 0 3.3 3.6M16.8 5.6h2.6v1.1a3.6 3.6 0 0 1-3.3 3.6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={10.7} y={13} width={2.6} height={4} fill={color} />
      <Rect x={7.4} y={16.8} width={9.2} height={3.4} rx={1.2} fill={color} />
    </G>
  );
}

/** Marqueur de record sur une courbe : pastille doree et trophee */
export function SealMark({ x, y, size = 22 }: { x: number; y: number; size?: number }) {
  const k = useChartInk();
  const g = useRecordGold();
  const h = size / 2;
  return (
    <G transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <Circle cx={0} cy={0} r={h + 1} fill={k.card} />
      <Circle cx={0} cy={0} r={h - 0.6} fill={g.fond} />
      <TropheeG size={size * 0.66} color={g.trophee} />
    </G>
  );
}

/** Le meme trophee hors graphique (legende, listes, bulle) */
export function TropheeRecord({ size = 18, couleurs }: { size?: number; couleurs?: { fond: string; trophee: string } }) {
  const theme = useRecordGold();
  const g = couleurs ?? theme;
  return (
    <Svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
      <Circle cx={0} cy={0} r={size / 2} fill={g.fond} />
      <TropheeG size={size * 0.62} color={g.trophee} />
    </Svg>
  );
}

/** « Record » en toutes lettres, trophee dore devant : la ligne de valeur au toucher d'un record */
export function BadgeRecord({ size = 15 }: { size?: number }) {
  const k = useChartInk();
  return (
    <View accessible accessibilityLabel="Record" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <TropheeRecord size={Math.round(size * 1.35)} />
      <Ink size={size} weight="black" color={k.ink} numberOfLines={1}>
        Record
      </Ink>
    </View>
  );
}

/** Bulle de valeur au-dessus du curseur (quand l'ecran n'affiche pas la valeur ailleurs) */
export function ChartTooltip({ x, width, value, caption, record }: { x: number; width: number; value: string; caption?: string; record?: boolean }) {
  const k = useChartInk();
  const w = record ? 236 : 180;
  const left = Math.min(Math.max(0, x - w / 2), Math.max(0, width - w));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -8, left, width: w, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, backgroundColor: k.ink, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
        {/* vague 45 : en sombre, la bulle est claire (encre papier) : texte couleur du fond, jamais papier sur papier */}
        {/* 16 octobre : un record se dit en toutes lettres dans la bulle, trophee dore devant */}
        {record ? (
          <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TropheeRecord size={16} />
            <Ink size={12} weight="black" color={k.surface} numberOfLines={1}>
              Record
            </Ink>
          </View>
        ) : null}
        <Ink size={13} weight="black" color={k.surface} numberOfLines={1}>
          {value}
        </Ink>
        {caption ? (
          <Ink size={11} weight="bold" color={k.surface} style={{ opacity: 0.75 }} numberOfLines={1}>
            {caption}
          </Ink>
        ) : null}
      </View>
    </View>
  );
}

/** Etat vide d'un graphique : courbe fantome et phrase qui dit quoi faire */
export function ChartEmpty({ height = 160, text }: { height?: number; text: string }) {
  const k = useChartInk();
  return (
    <View style={{ height, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, opacity: 0.6 }}>
        {[14, 22, 18, 30, 26, 38].map((h, i) => (
          <View key={i} style={{ width: 8, height: h, borderRadius: 4, backgroundColor: k.grid }} />
        ))}
      </View>
      <Ink size={14} weight="bold" color={k.axis} style={{ textAlign: 'center' }}>
        {text}
      </Ink>
    </View>
  );
}

// ---------- Langage graphique commun (vague 30) ----------

let clipSeq = 0;
const ARect = Animated.createAnimatedComponent(Rect);

/**
 * Animation d'entree courte : le contenu se devoile de gauche a droite (courbes) ou du bas vers le haut (barres).
 * Rejouee quand replayKey change (autre periode). Respecte le reglage « reduire les animations ».
 */
export function Reveal({ width, height, replayKey, dir = 'right', duration = CHART.drawMs, children }: { width: number; height: number; replayKey?: string | number; dir?: 'right' | 'up'; duration?: number; children: React.ReactNode }) {
  const id = useRef(`yrv${++clipSeq}`).current;
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      p.value = 1;
      return;
    }
    p.value = 0;
    p.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [replayKey, reduced, duration, p]);
  const W = width + 40;
  const H = height + 80;
  const props = useAnimatedProps(() =>
    dir === 'right' ? { x: -20, y: -40, width: Math.max(0.01, W * p.value), height: H } : { x: -20, y: -40 + H * (1 - p.value), width: W, height: Math.max(0.01, H * p.value) },
  );
  return (
    <G>
      <Defs>
        <ClipPath id={id}>
          <ARect animatedProps={props} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>{children}</G>
    </G>
  );
}

let washSeq = 0;

/**
 * Une serie de courbe : lavis en degrade qui s'efface vers le bas, puis le trait fin et net.
 * line : chemin de la courbe ; area : meme chemin ferme jusqu'a la ligne de base (optionnel).
 */
export function SeriesLine({ line, area, color, width = CHART.stroke, wash = CHART.wash, opacity = 1, dash }: { line: string; area?: string; color: string; width?: number; wash?: number; opacity?: number; dash?: string }) {
  const id = useRef(`ywash${++washSeq}`).current;
  return (
    <G>
      {area ? (
        <>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={wash} />
              <Stop offset="0.55" stopColor={color} stopOpacity={wash * 0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${id})`} />
        </>
      ) : null}
      {/* halo doux sous le trait (pas sous un trait en pointilles) */}
      {!dash && CHART.haloOpacity > 0 ? <Path d={line} stroke={color} strokeWidth={width + CHART.haloExtra} strokeOpacity={CHART.haloOpacity * opacity} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      <Path d={line} stroke={color} strokeWidth={width} strokeOpacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
    </G>
  );
}

/** Ferme une courbe jusqu'a la ligne de base pour son lavis */
export function areaOf(line: string, pts: { x: number; y: number }[], base: number): string {
  if (pts.length < 2 || !line) return '';
  return `${line} L${pts[pts.length - 1].x.toFixed(1)} ${base.toFixed(1)} L${pts[0].x.toFixed(1)} ${base.toFixed(1)} Z`;
}

/**
 * Points pour le trace seulement : quand les mesures sont plus serrees que minGap pixels,
 * on moyenne les voisines par paquets (le premier et le dernier point restent exacts).
 * Evite l'effet d'escalier des valeurs arrondies au dixieme. Le doigt lit toujours les vraies valeurs.
 */
export function displayPoints(pts: { x: number; y: number }[], minGap = 7): { x: number; y: number }[] {
  if (pts.length < 6) return pts;
  const spanX = pts[pts.length - 1].x - pts[0].x;
  const gap = spanX / (pts.length - 1);
  if (gap >= minGap) return pts;
  const per = Math.max(2, Math.round(minGap / Math.max(gap, 0.5)));
  const out: { x: number; y: number }[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += per) {
    const chunk = pts.slice(i, Math.min(i + per, pts.length - 1));
    if (!chunk.length) continue;
    out.push({ x: chunk.reduce((s, q) => s + q.x, 0) / chunk.length, y: chunk.reduce((s, q) => s + q.y, 0) / chunk.length });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Barre verticale : bout arrondi en haut, pied carre sur la ligne de base */
export function barPath(x0: number, base: number, w: number, h: number, radius: number = CHART.barRadius): string {
  if (h <= 0 || w <= 0) return '';
  const r = Math.min(radius, w / 2, h);
  const yTop = base - h;
  const f = (v: number) => v.toFixed(2);
  return `M${f(x0)} ${f(base)} V${f(yTop + r)} Q${f(x0)} ${f(yTop)} ${f(x0 + r)} ${f(yTop)} H${f(x0 + w - r)} Q${f(x0 + w)} ${f(yTop)} ${f(x0 + w)} ${f(yTop + r)} V${f(base)} Z`;
}

/**
 * Mini courbe (sparkline) : trait fin et net, petit lavis, dernier point en pastille avec halo.
 * Aucune graduation : la valeur est ecrite a cote dans la carte. Une seule echelle.
 */
export function Sparkline({ values, color, width = 120, height = 34, wash = true, animate = true, minSpan = 0 }: { values: number[]; color: string; width?: number; height?: number; wash?: boolean; animate?: boolean; /** ecart minimal de l'echelle : une petite variation ne devient pas une falaise */ minSpan?: number }) {
  if (values.length < 2 || width <= 0) return null;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < minSpan) {
    const mid = (max + min) / 2;
    min = mid - minSpan / 2;
    max = mid + minSpan / 2;
  }
  const span = max - min || 1;
  const padX = 4;
  const padY = 5;
  const pts = values.map((v, i) => ({ x: padX + (i / (values.length - 1)) * (width - padX * 2 - 4), y: padY + (1 - (v - min) / span) * (height - padY * 2) }));
  const line = brushPath(pts);
  const lastP = pts[pts.length - 1];
  const body = (
    <>
      <SeriesLine line={line} area={wash ? areaOf(line, pts, height) : undefined} color={color} width={2.25} wash={CHART.washCompact} />
      <EndDot cx={lastP.x} cy={lastP.y} color={color} compact />
    </>
  );
  return (
    <Svg width={width} height={height}>
      {animate ? (
        <Reveal width={width} height={height} replayKey={values.length}>
          {body}
        </Reveal>
      ) : (
        body
      )}
    </Svg>
  );
}
