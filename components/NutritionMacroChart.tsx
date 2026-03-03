// ============================================
// YOROI - NUTRITION MACRO CHART
// ============================================
// Graphique de courbes + cartes macros en grille
// Inspiré des apps nutrition premium
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import { Flame, Wheat, Droplets, Drumstick, GlassWater } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - SPACING.lg * 4;
const CHART_H = 180;
const CARD_GAP = SPACING.md;

// Couleurs macros
const MACRO_COLORS = {
  calories: '#FF9F6B',
  carbs: '#E8578A',
  fat: '#7B5EBF',
  protein: '#A2B636',
};

// Couleurs macros claires (pour le fond des cartes en light mode)
const MACRO_COLORS_BG = {
  calories: '#FFF3ED',
  carbs: '#FFF0F5',
  fat: '#F3EEFA',
  protein: '#F5F7E8',
};

const MACRO_COLORS_BG_DARK = {
  calories: 'rgba(255,159,107,0.12)',
  carbs: 'rgba(232,87,138,0.12)',
  fat: 'rgba(123,94,191,0.12)',
  protein: 'rgba(162,182,54,0.12)',
};

interface MacroData {
  calories: { value: number; percentage: number; label: string };
  carbs: { value: number; percentage: number; label: string };
  fat: { value: number; percentage: number; label: string };
  protein: { value: number; percentage: number; label: string };
}

interface ChartDataPoint {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
}

interface WaterData {
  current: number;
  target: number;
  unit?: string;
}

interface NutritionMacroChartProps {
  macros: MacroData;
  chartData?: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  water?: WaterData;
}

// Arrondir un nombre pour eviter les paths SVG trop longs
const r = (n: number): number => {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

// Generer une courbe smooth a partir de points
const buildSmoothPath = (
  points: number[],
  width: number,
  height: number,
  maxVal: number,
  padTop: number = 20,
  padBottom: number = 10,
): string => {
  if (points.length < 2 || width <= 0 || height <= 0 || maxVal <= 0) return '';

  const usableH = height - padTop - padBottom;
  if (usableH <= 0) return '';
  const stepX = width / (points.length - 1);

  const coords = points.map((val, i) => ({
    x: r(i * stepX),
    y: r(padTop + usableH - (val / maxVal) * usableH),
  }));

  // Catmull-Rom to cubic bezier
  let d = `M${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    const cp1x = r(p1.x + (p2.x - p0.x) / 6);
    const cp1y = r(p1.y + (p2.y - p0.y) / 6);
    const cp2x = r(p2.x - (p3.x - p1.x) / 6);
    const cp2y = r(p2.y - (p3.y - p1.y) / 6);

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
};

// Fermer le path pour le fill gradient
const buildFillPath = (
  points: number[],
  width: number,
  height: number,
  maxVal: number,
  padTop: number = 20,
  padBottom: number = 10,
): string => {
  const linePath = buildSmoothPath(points, width, height, maxVal, padTop, padBottom);
  if (!linePath) return '';
  const stepX = width / (points.length - 1);
  const lastX = r((points.length - 1) * stepX);
  return `${linePath} L${lastX},${r(height)} L0,${r(height)} Z`;
};

// Donnees demo pour le graphique (7 jours)
const DEFAULT_CHART_DATA: ChartDataPoint[] = [
  { calories: 120, carbs: 30, fat: 50, protein: 20 },
  { calories: 200, carbs: 80, fat: 40, protein: 35 },
  { calories: 180, carbs: 60, fat: 55, protein: 45 },
  { calories: 250, carbs: 70, fat: 50, protein: 60 },
  { calories: 350, carbs: 90, fat: 65, protein: 55 },
  { calories: 500, carbs: 120, fat: 80, protein: 70 },
  { calories: 420, carbs: 100, fat: 60, protein: 75 },
];

export default function NutritionMacroChart({
  macros,
  chartData = DEFAULT_CHART_DATA,
  title,
  subtitle,
  water,
}: NutritionMacroChartProps) {
  const { colors, isDark } = useTheme();

  // Determiner le max pour le graphique
  const allValues = chartData.flatMap(d => [d.calories, d.carbs, d.fat, d.protein]);
  const rawMax = Math.max(...allValues);
  const maxVal = rawMax > 0 ? rawMax * 1.15 : 1;

  const caloriesPoints = chartData.map(d => d.calories);
  const carbsPoints = chartData.map(d => d.carbs);
  const fatPoints = chartData.map(d => d.fat);
  const proteinPoints = chartData.map(d => d.protein);

  // Dernier point pour les cercles
  const lastIdx = chartData.length - 1;
  const stepX = lastIdx > 0 ? CHART_W / lastIdx : 0;
  const padTop = 20;
  const padBottom = 10;
  const usableH = CHART_H - padTop - padBottom;

  const getLastY = (val: number) => maxVal > 0 ? r(padTop + usableH - (val / maxVal) * usableH) : r(padTop + usableH);

  // Pre-compute paths
  const paths = {
    caloriesFill: buildFillPath(caloriesPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
    carbsFill: buildFillPath(carbsPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
    fatFill: buildFillPath(fatPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
    proteinFill: buildFillPath(proteinPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
    caloriesLine: buildSmoothPath(caloriesPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
    carbsLine: buildSmoothPath(carbsPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
    fatLine: buildSmoothPath(fatPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
    proteinLine: buildSmoothPath(proteinPoints, CHART_W, CHART_H, maxVal, padTop, padBottom),
  };

  const bgColors = isDark ? MACRO_COLORS_BG_DARK : MACRO_COLORS_BG;

  return (
    <View style={styles.container}>
      {/* Titre optionnel */}
      {title && (
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
        </View>
      )}

      {/* ====== GRAPHIQUE DE COURBES ====== */}
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
        {/* Legende */}
        <View style={styles.legend}>
          {([
            { key: 'calories', label: 'Calories' },
            { key: 'carbs', label: 'Glucides' },
            { key: 'fat', label: 'Lipides' },
            { key: 'protein', label: 'Proteines' },
          ] as const).map(({ key, label }) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MACRO_COLORS[key] }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* SVG Chart */}
        <Svg width={CHART_W} height={CHART_H} style={styles.svg}>
          <Defs>
            {/* Gradients pour les fills */}
            <SvgGradient id="gradCalories" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={MACRO_COLORS.calories} stopOpacity="0.35" />
              <Stop offset="1" stopColor={MACRO_COLORS.calories} stopOpacity="0.02" />
            </SvgGradient>
            <SvgGradient id="gradCarbs" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={MACRO_COLORS.carbs} stopOpacity="0.25" />
              <Stop offset="1" stopColor={MACRO_COLORS.carbs} stopOpacity="0.02" />
            </SvgGradient>
            <SvgGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={MACRO_COLORS.fat} stopOpacity="0.2" />
              <Stop offset="1" stopColor={MACRO_COLORS.fat} stopOpacity="0.02" />
            </SvgGradient>
            <SvgGradient id="gradProtein" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={MACRO_COLORS.protein} stopOpacity="0.2" />
              <Stop offset="1" stopColor={MACRO_COLORS.protein} stopOpacity="0.02" />
            </SvgGradient>
          </Defs>

          {/* Lignes verticales de grille */}
          {chartData.map((_, i) => (
            <Line
              key={i}
              x1={i * stepX}
              y1={0}
              x2={i * stepX}
              y2={CHART_H}
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={1}
            />
          ))}

          {/* Fills (en dessous des lignes) */}
          {paths.caloriesFill ? <Path d={paths.caloriesFill} fill="url(#gradCalories)" /> : null}
          {paths.carbsFill ? <Path d={paths.carbsFill} fill="url(#gradCarbs)" /> : null}
          {paths.fatFill ? <Path d={paths.fatFill} fill="url(#gradFat)" /> : null}
          {paths.proteinFill ? <Path d={paths.proteinFill} fill="url(#gradProtein)" /> : null}

          {/* Lignes de courbes */}
          {paths.caloriesLine ? <Path d={paths.caloriesLine} stroke={MACRO_COLORS.calories} strokeWidth={2.5} fill="none" /> : null}
          {paths.carbsLine ? <Path d={paths.carbsLine} stroke={MACRO_COLORS.carbs} strokeWidth={2} fill="none" /> : null}
          {paths.fatLine ? <Path d={paths.fatLine} stroke={MACRO_COLORS.fat} strokeWidth={2} fill="none" /> : null}
          {paths.proteinLine ? <Path d={paths.proteinLine} stroke={MACRO_COLORS.protein} strokeWidth={2} fill="none" /> : null}

          {/* Points finaux (cercles) */}
          {lastIdx > 0 && (
            <>
              <Circle cx={r(lastIdx * stepX)} cy={getLastY(caloriesPoints[lastIdx])} r={5} fill="#FFF" stroke={MACRO_COLORS.calories} strokeWidth={2.5} />
              <Circle cx={r(lastIdx * stepX)} cy={getLastY(carbsPoints[lastIdx])} r={4.5} fill="#FFF" stroke={MACRO_COLORS.carbs} strokeWidth={2} />
              <Circle cx={r(lastIdx * stepX)} cy={getLastY(fatPoints[lastIdx])} r={4.5} fill="#FFF" stroke={MACRO_COLORS.fat} strokeWidth={2} />
              <Circle cx={r(lastIdx * stepX)} cy={getLastY(proteinPoints[lastIdx])} r={4.5} fill="#FFF" stroke={MACRO_COLORS.protein} strokeWidth={2} />
            </>
          )}
        </Svg>
      </View>

      {/* ====== CARTES MACROS - GRILLE 2x2 ====== */}
      <View style={styles.macrosGrid}>
        {/* Calories */}
        <View style={[styles.macroCard, { backgroundColor: bgColors.calories }]}>
          <View style={styles.macroCardHeader}>
            <Text style={[styles.macroCardLabel, { color: MACRO_COLORS.calories }]}>Calories</Text>
            <View style={[styles.macroCardIcon, { backgroundColor: MACRO_COLORS.calories + '20' }]}>
              <Flame size={18} color={MACRO_COLORS.calories} strokeWidth={2.5} />
            </View>
          </View>
          <Text style={[styles.macroCardValue, { color: isDark ? colors.textPrimary : '#1A1A1E' }]}>
            {macros.calories.percentage}%
          </Text>
          <Text style={[styles.macroCardSub, { color: colors.textMuted }]}>
            {macros.calories.label}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : MACRO_COLORS.calories + '20' }]}>
            <View style={[styles.progressFill, {
              backgroundColor: MACRO_COLORS.calories,
              width: `${Math.min(macros.calories.percentage, 100)}%`,
            }]} />
          </View>
        </View>

        {/* Glucides */}
        <View style={[styles.macroCard, { backgroundColor: bgColors.carbs }]}>
          <View style={styles.macroCardHeader}>
            <Text style={[styles.macroCardLabel, { color: MACRO_COLORS.carbs }]}>Glucides</Text>
            <View style={[styles.macroCardIcon, { backgroundColor: MACRO_COLORS.carbs + '20' }]}>
              <Wheat size={18} color={MACRO_COLORS.carbs} strokeWidth={2.5} />
            </View>
          </View>
          <Text style={[styles.macroCardValue, { color: isDark ? colors.textPrimary : '#1A1A1E' }]}>
            {macros.carbs.percentage}%
          </Text>
          <Text style={[styles.macroCardSub, { color: colors.textMuted }]}>
            {macros.carbs.label}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : MACRO_COLORS.carbs + '20' }]}>
            <View style={[styles.progressFill, {
              backgroundColor: MACRO_COLORS.carbs,
              width: `${Math.min(macros.carbs.percentage, 100)}%`,
            }]} />
          </View>
        </View>

        {/* Lipides */}
        <View style={[styles.macroCard, { backgroundColor: bgColors.fat }]}>
          <View style={styles.macroCardHeader}>
            <Text style={[styles.macroCardLabel, { color: MACRO_COLORS.fat }]}>Lipides</Text>
            <View style={[styles.macroCardIcon, { backgroundColor: MACRO_COLORS.fat + '20' }]}>
              <Droplets size={18} color={MACRO_COLORS.fat} strokeWidth={2.5} />
            </View>
          </View>
          <Text style={[styles.macroCardValue, { color: isDark ? colors.textPrimary : '#1A1A1E' }]}>
            {macros.fat.percentage}%
          </Text>
          <Text style={[styles.macroCardSub, { color: colors.textMuted }]}>
            {macros.fat.label}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : MACRO_COLORS.fat + '20' }]}>
            <View style={[styles.progressFill, {
              backgroundColor: MACRO_COLORS.fat,
              width: `${Math.min(macros.fat.percentage, 100)}%`,
            }]} />
          </View>
        </View>

        {/* Proteines */}
        <View style={[styles.macroCard, { backgroundColor: bgColors.protein }]}>
          <View style={styles.macroCardHeader}>
            <Text style={[styles.macroCardLabel, { color: MACRO_COLORS.protein }]}>Proteines</Text>
            <View style={[styles.macroCardIcon, { backgroundColor: MACRO_COLORS.protein + '20' }]}>
              <Drumstick size={18} color={MACRO_COLORS.protein} strokeWidth={2.5} />
            </View>
          </View>
          <Text style={[styles.macroCardValue, { color: isDark ? colors.textPrimary : '#1A1A1E' }]}>
            {macros.protein.percentage}%
          </Text>
          <Text style={[styles.macroCardSub, { color: colors.textMuted }]}>
            {macros.protein.label}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : MACRO_COLORS.protein + '20' }]}>
            <View style={[styles.progressFill, {
              backgroundColor: MACRO_COLORS.protein,
              width: `${Math.min(macros.protein.percentage, 100)}%`,
            }]} />
          </View>
        </View>
      </View>

      {/* ====== CARTE EAU (pleine largeur) ====== */}
      {water && (
        <View style={[styles.waterCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF' }]}>
          <View style={styles.waterLeft}>
            <View style={[styles.waterIconBg, { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE' }]}>
              <GlassWater size={22} color="#3B82F6" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={[styles.waterTitle, { color: isDark ? colors.textPrimary : '#1A1A1E' }]}>Eau</Text>
              <Text style={[styles.waterSub, { color: colors.textMuted }]}>
                {water.current}L / {water.target}L
              </Text>
            </View>
          </View>
          <View style={styles.waterRight}>
            <Text style={[styles.waterPercent, { color: '#3B82F6' }]}>
              {Math.round((water.current / water.target) * 100)}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
  },
  titleRow: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Chart card
  chartCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },

  svg: {
    alignSelf: 'center',
  },

  // Macros grid
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  macroCard: {
    width: (SCREEN_W - SPACING.lg * 2 - CARD_GAP) / 2 - 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  macroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  macroCardLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCardValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 2,
  },
  macroCardSub: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },

  // Progress bar
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Water card
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: CARD_GAP,
  },
  waterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  waterIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  waterSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  waterRight: {
    alignItems: 'flex-end',
  },
  waterPercent: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
});
