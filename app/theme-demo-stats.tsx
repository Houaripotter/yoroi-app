import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop, Line, Rect, Text as SvgText } from 'react-native-svg';
import {
  ArrowLeft, Home, BarChart2, Plus, TrendingUp, TrendingDown,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HP = 16;
const GAP = 12;
const GRID_W = (SCREEN_WIDTH - HP * 2 - GAP) / 2;
const CHART_W = SCREEN_WIDTH - HP * 2;
const CHART_H = 220;
const CHART_PAD_X = 36;
const CHART_PAD_Y = 20;
const CHART_PAD_BOTTOM = 28;

// ── Theme ──
const T = {
  bg: '#F5F5F8',
  ocean: '#2872A1',
  sky: '#CBDDE9',
  card: '#FFFFFF',
  text: '#1A2E3B',
  sub: '#5A7D8F',
  muted: '#9BB0BF',
  border: '#E3EDF3',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F97316',
  purple: '#8B5CF6',
  cyan: '#0EA5E9',
};

// ── Chart colors (Dribbble style) ──
const CC = {
  calory: '#F4A27A',
  carbs: '#E84C88',
  fat: '#8B5CF6',
  protein: '#9CB342',
  bar: '#10B981',
  barLight: '#34D399',
};

// ── Multi-line chart series (7 days) ──
const SERIES = [
  { key: 'calory', label: 'Calory', color: CC.calory, data: [20, 35, 30, 55, 70, 85, 90], areaOpacity: 0.2 },
  { key: 'carbs', label: 'Carbs', color: CC.carbs, data: [10, 15, 20, 25, 35, 50, 55], areaOpacity: 0.12 },
  { key: 'fat', label: 'Fat', color: CC.fat, data: [5, 8, 12, 15, 18, 16, 14], areaOpacity: 0.08 },
  { key: 'protein', label: 'Protein', color: CC.protein, data: [8, 10, 12, 18, 22, 28, 35], areaOpacity: 0.1 },
];

// ── Bar chart data (7 days) ──
const BAR_DATA = [
  { day: 'S', value: 45 },
  { day: 'M', value: 72 },
  { day: 'T', value: 58 },
  { day: 'W', value: 85 },
  { day: 'T', value: 60 },
  { day: 'F', value: 92 },
  { day: 'S', value: 38 },
];

// ── Body fat chart data (8 weeks) ──
const BODY_FAT_DATA = [86, 85.2, 84.5, 84, 83.8, 83.2, 83, 82.5];
const BF_LABELS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const BF_HIGHLIGHT_IDX = 6; // "83 Kg" label

// ── Nutrition cards (emoji icons from screenshot) ──
const NUTRITION = [
  { label: 'Calories', emoji: '\uD83D\uDD25', value: 90, barColor: '#F4A27A', barBg: '#FDDCC8' },
  { label: 'Glucides', emoji: '\uD83C\uDF3E', value: 20, barColor: '#E84C88', barBg: '#F9C8DC' },
  { label: 'Lipides', emoji: '\uD83E\uDDC0', value: 30, barColor: '#8B5CF6', barBg: '#D4C4FB' },
  { label: 'Prot\u00E9ines', emoji: '\uD83C\uDF57', value: 42, barColor: '#9CB342', barBg: '#D8E8A8' },
];

// ── Themed sections ──
const SECTIONS = [
  { title: 'Corps', color: '#3B82F6', items: [
    { title: 'Poids', value: '78.5', unit: 'kg', trend: -3.5 },
    { title: 'IMC', value: '24.2', unit: '', trend: -1.1 },
  ]},
  { title: 'Composition', color: '#8B5CF6', items: [
    { title: 'Gras Visc.', value: '8', unit: '', trend: -3 },
    { title: 'Os', value: '3.2', unit: 'kg', trend: 0.1 },
    { title: 'BMR', value: '1820', unit: 'kcal', trend: 40 },
    { title: '\u00C2ge M\u00E9tab.', value: '28', unit: 'ans', trend: -3 },
  ]},
  { title: 'Mensures', color: '#F59E0B', items: [
    { title: 'Taille', value: '82.0', unit: 'cm', trend: -3 },
    { title: 'Pecs', value: '104.5', unit: 'cm', trend: 3.5 },
    { title: 'Bras', value: '38.5', unit: 'cm', trend: 2 },
    { title: 'Cuisse', value: '60.0', unit: 'cm', trend: 2 },
  ]},
  { title: 'Discipline', color: '#8B5CF6', items: [
    { title: 'Entra\u00EEnements', value: '18', unit: '/30j', trend: 3 },
    { title: 'Charge', value: '1850', unit: 'pts', trend: 120 },
  ]},
  { title: 'Sant\u00E9', color: '#10B981', items: [
    { title: 'Vitalit\u00E9', value: '88', unit: '/100', trend: 5 },
    { title: 'Sommeil', value: '7.6', unit: 'h', trend: 0.8 },
  ]},
];

// ═══════════════════════════════════════════
// CHART HELPERS
// ═══════════════════════════════════════════

const buildSmooth = (pts: { x: number; y: number }[]) => {
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cx1 = p.x + (c.x - p.x) * 0.4;
    const cx2 = c.x - (c.x - p.x) * 0.4;
    d += ` C ${cx1.toFixed(1)} ${p.y.toFixed(1)}, ${cx2.toFixed(1)} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
};

const normalizeToChart = (data: number[]) => {
  const allData = SERIES.flatMap(s => s.data);
  const min = Math.min(...allData);
  const max = Math.max(...allData);
  const range = max - min || 1;
  const plotW = CHART_W - CHART_PAD_X * 2;
  const plotH = CHART_H - CHART_PAD_Y - CHART_PAD_BOTTOM;
  return data.map((v, i) => ({
    x: CHART_PAD_X + (i / (data.length - 1)) * plotW,
    y: CHART_PAD_Y + plotH - ((v - min) / range) * plotH,
  }));
};

// ═══════════════════════════════════════════
// WATER GLASS SVG
// ═══════════════════════════════════════════

const WaterGlass = ({ filled }: { filled: boolean }) => (
  <Svg width={32} height={42} viewBox="0 0 32 42">
    <Path
      d="M 4 3 L 6.5 37 Q 16 41, 25.5 37 L 28 3 Z"
      fill={filled ? '#E0F2FE' : '#F3F4F6'}
      stroke={filled ? '#7DD3FC' : '#D1D5DB'}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    {filled && (
      <Path d="M 5.5 14 L 7 35 Q 16 39, 25 35 L 26.5 14 Z" fill="#38BDF8" opacity={0.55} />
    )}
    {filled && (
      <Path d="M 5.5 14 Q 10 10, 16 14 Q 22 18, 26.5 14" fill="#38BDF8" opacity={0.3} />
    )}
    {filled && (
      <>
        <SvgCircle cx={10} cy={9} r={1.5} fill="#7DD3FC" opacity={0.5} />
        <SvgCircle cx={17} cy={7} r={1} fill="#7DD3FC" opacity={0.4} />
        <SvgCircle cx={22} cy={10} r={1.2} fill="#7DD3FC" opacity={0.35} />
      </>
    )}
  </Svg>
);

// ═══════════════════════════════════════════
// BAR CHART COMPONENT
// ═══════════════════════════════════════════

const BAR_CHART_H = 180;
const BAR_CHART_PAD_TOP = 28;
const BAR_CHART_PAD_BOTTOM = 30;
const BAR_W = 28;

const BarChart = () => {
  const maxVal = Math.max(...BAR_DATA.map(d => d.value));
  const plotH = BAR_CHART_H - BAR_CHART_PAD_TOP - BAR_CHART_PAD_BOTTOM;
  const barCount = BAR_DATA.length;
  const spacing = (CHART_W - barCount * BAR_W) / (barCount + 1);

  return (
    <Svg width={CHART_W} height={BAR_CHART_H} viewBox={`0 0 ${CHART_W} ${BAR_CHART_H}`}>
      <Defs>
        <SvgLinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={CC.barLight} />
          <Stop offset="1" stopColor={CC.bar} />
        </SvgLinearGradient>
      </Defs>

      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = BAR_CHART_PAD_TOP + plotH * (1 - pct);
        const label = Math.round(maxVal * pct);
        return (
          <React.Fragment key={String(pct)}>
            <Line
              x1={32} y1={y} x2={CHART_W - 8} y2={y}
              stroke={T.border} strokeWidth={0.8} opacity={0.5}
            />
            <SvgText x={4} y={y + 4} fontSize={9} fontWeight="600" fill={T.muted}>
              {label}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Bars */}
      {BAR_DATA.map((d, i) => {
        const barH = (d.value / maxVal) * plotH;
        const x = spacing + i * (BAR_W + spacing);
        const y = BAR_CHART_PAD_TOP + plotH - barH;
        return (
          <React.Fragment key={i}>
            {/* Bar with rounded top */}
            <Rect
              x={x} y={y} width={BAR_W} height={barH}
              rx={6} ry={6}
              fill="url(#barGrad)"
            />
            {/* Value on top */}
            <SvgText
              x={x + BAR_W / 2} y={y - 6}
              textAnchor="middle" fontSize={10} fontWeight="800" fill={T.text}
            >
              {d.value}
            </SvgText>
            {/* Day label below */}
            <SvgText
              x={x + BAR_W / 2} y={BAR_CHART_H - 8}
              textAnchor="middle" fontSize={11} fontWeight="700" fill={T.muted}
            >
              {d.day}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

// ═══════════════════════════════════════════
// BODY FAT LINE CHART COMPONENT
// ═══════════════════════════════════════════

const BF_CHART_H = 160;
const BF_PAD_X = 36;
const BF_PAD_Y = 30;
const BF_PAD_BOTTOM = 28;

const BodyFatChart = () => {
  const min = Math.min(...BODY_FAT_DATA) - 0.5;
  const max = Math.max(...BODY_FAT_DATA) + 0.5;
  const range = max - min;
  const plotW = CHART_W - BF_PAD_X * 2;
  const plotH = BF_CHART_H - BF_PAD_Y - BF_PAD_BOTTOM;

  const pts = BODY_FAT_DATA.map((v, i) => ({
    x: BF_PAD_X + (i / (BODY_FAT_DATA.length - 1)) * plotW,
    y: BF_PAD_Y + plotH - ((v - min) / range) * plotH,
  }));

  const line = buildSmooth(pts);
  const area = line + ` L ${pts[pts.length - 1].x.toFixed(1)} ${BF_CHART_H - BF_PAD_BOTTOM} L ${pts[0].x.toFixed(1)} ${BF_CHART_H - BF_PAD_BOTTOM} Z`;

  const hlPt = pts[BF_HIGHLIGHT_IDX];
  const hlVal = BODY_FAT_DATA[BF_HIGHLIGHT_IDX];

  // Y-axis labels
  const ySteps = 5;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = min + (range / ySteps) * i;
    return Math.round(val * 10) / 10;
  });

  return (
    <Svg width={CHART_W} height={BF_CHART_H} viewBox={`0 0 ${CHART_W} ${BF_CHART_H}`}>
      <Defs>
        <SvgLinearGradient id="bfArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={T.ocean} stopOpacity="0.2" />
          <Stop offset="1" stopColor={T.ocean} stopOpacity="0.02" />
        </SvgLinearGradient>
      </Defs>

      {/* Y-axis labels + grid */}
      {yLabels.map((val, i) => {
        const y = BF_PAD_Y + plotH - (plotH / ySteps) * i;
        return (
          <React.Fragment key={i}>
            <Line x1={BF_PAD_X} y1={y} x2={CHART_W - 12} y2={y} stroke={T.border} strokeWidth={0.6} opacity={0.4} />
            <SvgText x={4} y={y + 4} fontSize={9} fontWeight="600" fill={T.muted}>
              {val}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* X-axis labels */}
      {BF_LABELS.map((label, i) => (
        <SvgText
          key={label + i}
          x={BF_PAD_X + (i / (BF_LABELS.length - 1)) * plotW}
          y={BF_CHART_H - 6}
          textAnchor="middle" fontSize={9} fontWeight="600" fill={T.muted}
        >
          {label}
        </SvgText>
      ))}

      {/* Area fill */}
      <Path d={area} fill="url(#bfArea)" />

      {/* Line */}
      <Path d={line} fill="none" stroke={T.ocean} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {pts.map((p, i) => (
        <SvgCircle
          key={i}
          cx={p.x} cy={p.y} r={i === BF_HIGHLIGHT_IDX ? 6 : 3}
          fill={i === BF_HIGHLIGHT_IDX ? T.ocean : '#FFF'}
          stroke={T.ocean}
          strokeWidth={i === BF_HIGHLIGHT_IDX ? 3 : 1.5}
        />
      ))}

      {/* Bubble label on highlighted point */}
      <Rect
        x={hlPt.x - 28} y={hlPt.y - 30}
        width={56} height={22}
        rx={11} ry={11}
        fill={T.text}
      />
      {/* Bubble arrow */}
      <Path
        d={`M ${hlPt.x - 5} ${hlPt.y - 8} L ${hlPt.x} ${hlPt.y - 3} L ${hlPt.x + 5} ${hlPt.y - 8}`}
        fill={T.text}
      />
      <SvgText
        x={hlPt.x} y={hlPt.y - 15}
        textAnchor="middle" fontSize={11} fontWeight="800" fill="#FFFFFF"
      >
        {hlVal} Kg
      </SvgText>
    </Svg>
  );
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function ThemeDemoStatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Week');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const barAnims = NUTRITION.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    barAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: NUTRITION[i].value,
        duration: 1000,
        delay: 300 + i * 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, []);

  const glassesFilled = 3;
  const glassesTotal = 6;
  const tabs = ['Day', 'Week', 'Month', 'Year'];

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══ BACK ═══ */}
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <ArrowLeft size={20} color={T.text} />
        </TouchableOpacity>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ═══ HEADER "Activités" + Kcal badge ═══ */}
          <Text style={st.mainTitle}>Activit{'\u00E9'}s</Text>

          <View style={st.kcalBadgeRow}>
            <View style={st.kcalBadge}>
              <Text style={st.kcalText}>582 Kcal</Text>
            </View>
          </View>

          <Text style={st.subtitle}>
            28 Mars - <Text style={{ fontWeight: '800' }}>3</Text> Repas - <Text style={{ fontWeight: '800' }}>49 Kcal</Text> restants
          </Text>

          {/* ═══ TAB SELECTOR (Day / Week / Month / Year) ═══ */}
          <View style={st.tabSelector}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[st.tabItem, activeTab === tab && st.tabItemActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[st.tabItemText, activeTab === tab && st.tabItemTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ═══ NUTRITION SUMMARY ROW ═══ */}
          <View style={st.summaryRow}>
            <View style={[st.summaryCard, { backgroundColor: '#FFE5D9' }]}>
              <Text style={st.summaryValue}>12,873</Text>
              <Text style={st.summaryLabel}>Total Calories</Text>
            </View>
            <View style={[st.summaryCard, { backgroundColor: '#E8F4FD' }]}>
              <Text style={st.summaryValue}>1,839</Text>
              <Text style={st.summaryLabel}>Daily Average</Text>
            </View>
          </View>

          {/* ═══ MULTI-LINE CHART (with Y-axis numbers) ═══ */}
          <View style={[st.card, { marginTop: 16, paddingHorizontal: 0, paddingBottom: 12 }]}>
            <Text style={st.chartTitle}>Macro Tracking</Text>
            <Svg width={CHART_W} height={CHART_H}>
              <Defs>
                {SERIES.map(s => (
                  <SvgLinearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={s.color} stopOpacity={String(s.areaOpacity)} />
                    <Stop offset="1" stopColor={s.color} stopOpacity="0.01" />
                  </SvgLinearGradient>
                ))}
              </Defs>

              {/* Y-axis labels */}
              {[0, 25, 50, 75, 100].map(val => {
                const allData = SERIES.flatMap(s => s.data);
                const min = Math.min(...allData);
                const max = Math.max(...allData);
                const plotH = CHART_H - CHART_PAD_Y - CHART_PAD_BOTTOM;
                const y = CHART_PAD_Y + plotH - ((val - min) / (max - min || 1)) * plotH;
                return (
                  <React.Fragment key={val}>
                    <Line
                      x1={CHART_PAD_X} y1={y} x2={CHART_W - 8} y2={y}
                      stroke={T.border} strokeWidth={0.8} opacity={0.5}
                    />
                    <SvgText x={4} y={y + 4} fontSize={9} fontWeight="600" fill={T.muted}>
                      {val}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* X-axis day labels */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => {
                const plotW = CHART_W - CHART_PAD_X * 2;
                const x = CHART_PAD_X + (i / 6) * plotW;
                return (
                  <SvgText key={label} x={x} y={CHART_H - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill={T.muted}>
                    {label}
                  </SvgText>
                );
              })}

              {/* Series: area fill + line + dots */}
              {SERIES.map(series => {
                const pts = normalizeToChart(series.data);
                const plotBottom = CHART_H - CHART_PAD_BOTTOM;
                const line = buildSmooth(pts);
                const area = line + ` L ${pts[pts.length - 1].x.toFixed(1)} ${plotBottom} L ${pts[0].x.toFixed(1)} ${plotBottom} Z`;

                return (
                  <React.Fragment key={series.key}>
                    <Path d={area} fill={`url(#area-${series.key})`} />
                    <Path d={line} fill="none" stroke={series.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    {/* Last point: open circle */}
                    <SvgCircle
                      cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y}
                      r={5} fill="#FFF" stroke={series.color} strokeWidth={2.5}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>

            {/* Legend */}
            <View style={st.legendRow}>
              {SERIES.map(s => (
                <View key={s.key} style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: s.color }]} />
                  <Text style={st.legendLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ═══ BAR CHART (green bars with values) ═══ */}
          <View style={[st.card, { marginTop: 16, paddingHorizontal: 0, paddingBottom: 8 }]}>
            <Text style={st.chartTitle}>Activit{'\u00E9'} hebdomadaire</Text>
            <BarChart />
          </View>

          {/* ═══ BODY FAT CHART (line with bubble label) ═══ */}
          <View style={[st.card, { marginTop: 16, paddingHorizontal: 0, paddingBottom: 8 }]}>
            <View style={st.bfHeaderRow}>
              <View>
                <Text style={st.chartTitle}>Body Fat</Text>
                <Text style={st.bfSubtitle}>-1 kg cette semaine</Text>
              </View>
              <View style={st.bfBadge}>
                <TrendingDown size={12} color={T.green} />
                <Text style={st.bfBadgeText}>-3.5 kg</Text>
              </View>
            </View>
            <BodyFatChart />
          </View>

          {/* ═══ NUTRITION CARDS 2×2 (emoji icons) ═══ */}
          <Text style={st.sectionHeading}>Nutrition</Text>
          <View style={st.grid}>
            {NUTRITION.map((n, idx) => (
              <View key={n.label} style={[st.nutritionCard, { backgroundColor: T.card }]}>
                <View style={st.nutritionHeader}>
                  <Text style={st.nutritionLabel}>{n.label}</Text>
                  <Text style={st.nutritionEmoji}>{n.emoji}</Text>
                </View>
                <Text style={st.nutritionValue}>{n.value}%</Text>
                <View style={[st.nutritionBarTrack, { backgroundColor: n.barBg }]}>
                  <Animated.View style={[st.nutritionBarFill, {
                    width: barAnims[idx].interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: n.barColor,
                  }]} />
                </View>
              </View>
            ))}
          </View>

          {/* ═══ WATER SECTION ═══ */}
          <View style={[st.card, { marginTop: 16 }]}>
            <View style={st.waterHeaderRow}>
              <View>
                <Text style={st.waterTitle}>Water</Text>
                <Text style={st.waterSub}>2.5 L / 4 liter</Text>
              </View>
              <View style={st.waterPctBadge}>
                <Text style={st.waterPctText}>63%</Text>
              </View>
            </View>

            <View style={st.glassRow}>
              {Array.from({ length: glassesFilled }).map((_, i) => (
                <View key={`f${i}`}><WaterGlass filled={true} /></View>
              ))}
              <TouchableOpacity style={st.addGlassBtn}>
                <Plus size={18} color={T.muted} />
              </TouchableOpacity>
              {Array.from({ length: glassesTotal - glassesFilled }).map((_, i) => (
                <View key={`e${i}`}><WaterGlass filled={false} /></View>
              ))}
            </View>
          </View>

          {/* ═══ 5 THEMED SECTIONS ═══ */}
          {SECTIONS.map(section => (
            <View key={section.title} style={{ marginTop: 20 }}>
              <Text style={[st.sectionTitle, { color: section.color }]}>{section.title}</Text>
              <View style={st.sectionGrid}>
                {section.items.map(item => (
                  <View key={item.title} style={[st.sectionCard, { borderLeftColor: section.color }]}>
                    <Text style={st.sectionItemTitle}>{item.title}</Text>
                    <View style={st.sectionValueRow}>
                      <Text style={st.sectionItemValue}>{item.value}</Text>
                      <Text style={st.sectionItemUnit}>{item.unit}</Text>
                    </View>
                    <View style={[st.trendBadge, { backgroundColor: item.trend >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                      {item.trend >= 0
                        ? <TrendingUp size={10} color={T.green} />
                        : <TrendingDown size={10} color={T.red} />
                      }
                      <Text style={[st.trendText, { color: item.trend >= 0 ? T.green : T.red }]}>
                        {item.trend >= 0 ? '+' : ''}{item.trend}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══ BOTTOM TAB BAR ═══ */}
      <View style={[st.tabBar, { paddingBottom: insets.bottom || 16 }]}>
        <TouchableOpacity style={st.tab} onPress={() => router.push('/theme-demo' as any)}>
          <Home size={22} color={T.muted} />
          <Text style={[st.tabBarLabel, { color: T.muted }]}>Accueil</Text>
        </TouchableOpacity>
        <View style={st.tabBarActive}>
          <BarChart2 size={22} color={T.ocean} />
          <Text style={[st.tabBarLabel, { color: T.ocean }]}>Stats</Text>
          <View style={[st.tabBarDot, { backgroundColor: T.ocean }]} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: HP, paddingBottom: 120, paddingTop: 8 },

  backBtn: { width: 36, height: 36, justifyContent: 'center', marginBottom: 8 },

  // Header
  mainTitle: { fontSize: 30, fontWeight: '900', color: T.text, letterSpacing: -0.5 },
  kcalBadgeRow: { alignItems: 'center', marginTop: 16, marginBottom: 10 },
  kcalBadge: { backgroundColor: '#F4A27A', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 22 },
  kcalText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, fontWeight: '500', color: T.sub, textAlign: 'center' },

  // Tab selector (Day/Week/Month/Year)
  tabSelector: {
    flexDirection: 'row', marginTop: 18, backgroundColor: '#E8EDF2', borderRadius: 14,
    padding: 3,
  },
  tabItem: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: T.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  tabItemText: { fontSize: 13, fontWeight: '700', color: T.muted },
  tabItemTextActive: { color: T.text },

  // Nutrition summary row
  summaryRow: { flexDirection: 'row', gap: GAP, marginTop: 16 },
  summaryCard: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '900', color: T.text, letterSpacing: -0.5 },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: T.sub, marginTop: 4 },

  // Card base
  card: { borderRadius: 24, padding: 16, backgroundColor: T.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  chartTitle: { fontSize: 16, fontWeight: '800', color: T.text, marginBottom: 10, paddingHorizontal: 16 },

  // Chart legend
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 10, paddingHorizontal: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: '600', color: T.sub },

  // Body fat header
  bfHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 4 },
  bfSubtitle: { fontSize: 12, fontWeight: '500', color: T.green, marginTop: 2 },
  bfBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  bfBadgeText: { fontSize: 12, fontWeight: '800', color: T.green },

  // Nutrition section
  sectionHeading: { fontSize: 17, fontWeight: '800', color: T.text, marginTop: 20, marginBottom: 10, marginLeft: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  nutritionCard: {
    width: GRID_W, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  nutritionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nutritionLabel: { fontSize: 15, fontWeight: '700', color: T.text },
  nutritionEmoji: { fontSize: 22 },
  nutritionValue: { fontSize: 34, fontWeight: '900', color: T.text, letterSpacing: -1, marginBottom: 10 },
  nutritionBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  nutritionBarFill: { height: '100%', borderRadius: 4 },

  // Water section
  waterHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  waterTitle: { fontSize: 18, fontWeight: '800', color: T.text },
  waterSub: { fontSize: 13, fontWeight: '500', color: T.muted, marginTop: 2 },
  waterPctBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  waterPctText: { fontSize: 14, fontWeight: '800', color: '#0284C7' },
  glassRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' },
  addGlassBtn: {
    width: 32, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: T.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg,
  },

  // Themed sections
  sectionTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  sectionCard: {
    width: GRID_W, backgroundColor: T.card, borderRadius: 16, padding: 12, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionItemTitle: { fontSize: 11, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 },
  sectionItemValue: { fontSize: 22, fontWeight: '900', color: T.text },
  sectionItemUnit: { fontSize: 12, fontWeight: '600', color: T.muted },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  trendText: { fontSize: 11, fontWeight: '800' },

  // Bottom tab bar
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border, position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: T.card },
  tab: { alignItems: 'center', gap: 4, flex: 1, paddingVertical: 4 },
  tabBarActive: { alignItems: 'center', gap: 4, flex: 1, paddingVertical: 4 },
  tabBarLabel: { fontSize: 11, fontWeight: '700' },
  tabBarDot: { width: 5, height: 5, borderRadius: 2.5 },
});
