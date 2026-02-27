import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Ellipse, Line, Text as SvgText } from 'react-native-svg';
import {
  ArrowLeft, Flame, ChevronRight, Target, Droplets, Moon, Zap,
  Dumbbell, CheckCircle2, Home, BarChart2, TrendingDown,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HP = 16;
const GAP = 12;
const GRID_W = (SCREEN_WIDTH - HP * 2 - GAP) / 2;

// ── Theme ──
const T = {
  bg: '#F5F5F8', ocean: '#2872A1', sky: '#CBDDE9', card: '#FFFFFF',
  text: '#1A2E3B', sub: '#5A7D8F', muted: '#9BB0BF', border: '#E3EDF3',
  green: '#10B981', red: '#EF4444', orange: '#F97316', purple: '#8B5CF6',
  blue: '#3B82F6', cyan: '#0EA5E9', yellow: '#F59E0B', pink: '#EC4899',
};

const CB = { water: '#D6E8F4', weight: '#FEF3E2', calories: '#EDF5E4', bpm: '#FDE8F0' };

// ── Demo Data ──
const D = {
  name: 'Houari',
  quote: "La discipline est le pont entre les objectifs et les accomplissements.",
  rankName: 'ASHIGARU', level: 3, streak: 42, rankProgress: 45,
  nextRankName: 'Bushi', nextRankDays: 15,
  weight: 78.5, targetWeight: 75.0, startWeight: 82.0,
  muscleMass: 42.3, bodyFat: 15.2, waterPct: 58.1,
  challenges: [
    { id: '1', icon: 'walk', title: 'Faire 8000 pas', xp: 10, progress: 0.6, done: false },
    { id: '2', icon: 'water', title: "Boire 2.5L d'eau", xp: 15, done: false, progress: 0.3 },
    { id: '3', icon: 'train', title: "S'entra\u00EEner 1h", xp: 50, done: true, progress: 1 },
    { id: '4', icon: 'sleep', title: 'Dormir 7h+', xp: 10, done: false, progress: 0 },
  ],
  hydrationMl: 2100, hydrationGoal: 3500,
  sleepHours: 7.2, sleepGoal: 8,
  calories: 750, caloriesGoal: 2500,
  carbs: 120, carbsGoal: 250,
  protein: 65, proteinGoal: 100,
  fat: 40, fatGoal: 70,
};

// ═══════════════════════════════════════
// SVG COMPONENTS
// ═══════════════════════════════════════

// ── Water Waves (layered blue mountains) ──
const WaterWaves = ({ width: w }: { width: number }) => {
  const h = 95;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={`M 0 28 C ${w * .1} 12, ${w * .25} 8, ${w * .42} 24 C ${w * .58} 38, ${w * .72} 14, ${w * .88} 10 C ${w * .96} 8, ${w} 15, ${w} 22 L ${w} ${h} L 0 ${h} Z`} fill="#C4DEF0" opacity={0.45} />
      <Path d={`M 0 38 C ${w * .12} 18, ${w * .32} 15, ${w * .48} 32 C ${w * .62} 46, ${w * .78} 20, ${w} 28 L ${w} ${h} L 0 ${h} Z`} fill="#A8CEE4" opacity={0.55} />
      <Path d={`M 0 52 C ${w * .1} 34, ${w * .28} 38, ${w * .46} 50 C ${w * .6} 62, ${w * .76} 34, ${w} 42 L ${w} ${h} L 0 ${h} Z`} fill="#7CB8D8" opacity={0.6} />
      <Path d={`M 0 65 C ${w * .14} 52, ${w * .34} 54, ${w * .52} 64 C ${w * .68} 76, ${w * .84} 52, ${w} 58 L ${w} ${h} L 0 ${h} Z`} fill="#5DA8C8" opacity={0.7} />
    </Svg>
  );
};

// ── Weight Gauge WITH NUMBERS (BMI-style) ──
const WeightGauge = () => {
  const R = 42, CX = 72, CY = 64, SW = 11;
  const progress = Math.max(0, Math.min(1, (D.startWeight - D.weight) / (D.startWeight - D.targetWeight)));
  const numR = R + 16;

  const arcPt = (deg: number) => ({
    x: CX + R * Math.cos((deg * Math.PI) / 180),
    y: CY - R * Math.sin((deg * Math.PI) / 180),
  });
  const numPt = (deg: number) => ({
    x: CX + numR * Math.cos((deg * Math.PI) / 180),
    y: CY - numR * Math.sin((deg * Math.PI) / 180),
  });
  const arcD = (from: number, to: number) => {
    const p1 = arcPt(from), p2 = arcPt(to);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };

  const segs = [
    { from: 180, to: 144, color: '#FACC15' },
    { from: 143, to: 108, color: '#F59E0B' },
    { from: 107, to: 72, color: '#F97316' },
    { from: 71, to: 36, color: '#EA580C' },
    { from: 35, to: 0, color: '#DC2626' },
  ];

  const angle = progress * 180;
  const dot = arcPt(angle);

  // Reference numbers along the arc
  const nums = [75, 77, 79, 80, 82];

  return (
    <Svg width={145} height={82} viewBox="0 0 145 82">
      {segs.map((seg, i) => (
        <Path key={i} d={arcD(seg.from, seg.to)} stroke={seg.color} strokeWidth={SW} fill="none"
          strokeLinecap={i === 0 || i === segs.length - 1 ? 'round' : 'butt'} />
      ))}
      {/* Numbers along the arc */}
      {nums.map(val => {
        const a = ((D.startWeight - val) / (D.startWeight - D.targetWeight)) * 180;
        const pt = numPt(a);
        const isCurrent = Math.abs(val - D.weight) < 0.6;
        return (
          <SvgText key={val} x={pt.x} y={pt.y + (isCurrent ? 5 : 4)}
            textAnchor="middle" fontSize={isCurrent ? 13 : 9}
            fontWeight={isCurrent ? '900' : '600'}
            fill={isCurrent ? T.text : T.muted}>
            {val}
          </SvgText>
        );
      })}
      {/* Current value big at top */}
      <SvgText x={CX} y={CY - numR + 2} textAnchor="middle" fontSize={15} fontWeight="900" fill={T.text}>
        {D.weight}
      </SvgText>
      <Circle cx={dot.x} cy={dot.y} r={6} fill="#FFF" stroke={T.text} strokeWidth={3} />
    </Svg>
  );
};

// ── Calories Gauge (green tones) ──
const CaloriesGauge = () => {
  const R = 38, CX = 50, CY = 44, SW = 10;
  const arcPt = (deg: number) => ({
    x: CX + R * Math.cos((deg * Math.PI) / 180),
    y: CY - R * Math.sin((deg * Math.PI) / 180),
  });
  const arcD = (from: number, to: number) => {
    const p1 = arcPt(from), p2 = arcPt(to);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };
  const segs = [
    { from: 180, to: 135, color: '#D9F99D' }, { from: 134, to: 90, color: '#A3E635' },
    { from: 89, to: 45, color: '#65A30D' }, { from: 44, to: 0, color: '#3F6212' },
  ];
  return (
    <Svg width={100} height={52} viewBox="0 0 100 52">
      {segs.map((seg, i) => (
        <Path key={i} d={arcD(seg.from, seg.to)} stroke={seg.color} strokeWidth={SW} fill="none"
          strokeLinecap={i === 0 || i === segs.length - 1 ? 'round' : 'butt'} />
      ))}
    </Svg>
  );
};

// ── ECG Heartbeat Line ──
const ECGLine = ({ width: w }: { width: number }) => {
  const h = 45, mid = h * .5, cw = w / 2.5;
  let d = `M 0 ${mid}`;
  for (let c = 0; c < 3; c++) {
    const x = c * cw;
    d += ` L ${(x + cw * .08).toFixed(1)} ${mid}`;
    d += ` L ${(x + cw * .16).toFixed(1)} ${(mid - 5).toFixed(1)}`;
    d += ` L ${(x + cw * .24).toFixed(1)} ${mid}`;
    d += ` L ${(x + cw * .30).toFixed(1)} ${(mid + 2).toFixed(1)}`;
    d += ` L ${(x + cw * .36).toFixed(1)} ${(mid - 22).toFixed(1)}`;
    d += ` L ${(x + cw * .42).toFixed(1)} ${(mid + 14).toFixed(1)}`;
    d += ` L ${(x + cw * .48).toFixed(1)} ${mid}`;
    d += ` L ${(x + cw * .62).toFixed(1)} ${(mid - 4).toFixed(1)}`;
    d += ` L ${(x + cw * .72).toFixed(1)} ${mid}`;
  }
  d += ` L ${w} ${mid}`;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={d} fill="none" stroke="#EC4899" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════

export default function ThemeDemoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const compBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.timing(barProgress, { toValue: D.rankProgress, duration: 1200, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.timing(compBarAnim, { toValue: 1, duration: 1000, delay: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const wave = Animated.loop(Animated.sequence([
      Animated.timing(waveAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    wave.start();
    return () => { wave.stop(); };
  }, []);

  const rankBarWidth = barProgress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const completedCount = D.challenges.filter(c => c.done).length;
  const getQuestIcon = (icon: string) => {
    switch (icon) {
      case 'walk': return <Ionicons name="walk" size={16} color={T.blue} />;
      case 'water': return <Droplets size={16} color={T.cyan} />;
      case 'train': return <Dumbbell size={16} color={T.orange} />;
      case 'sleep': return <Moon size={16} color={T.purple} />;
      default: return <Target size={16} color={T.ocean} />;
    }
  };

  // Calendar week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══ HEADER ═══ */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={20} color={T.text} />
          </TouchableOpacity>
          <View style={s.profileCircle}>
            <Ionicons name="person" size={28} color={T.sky} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerGreeting}>Bonjour {D.name} {'\uD83D\uDE0A'}</Text>
            <Text style={s.headerSub}>
              Tu as perdu <Text style={{ color: T.pink, fontWeight: '800' }}>{(D.startWeight - D.weight).toFixed(1)}kg</Text>, continue !
            </Text>
          </View>
          <TouchableOpacity style={s.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={T.text} />
          </TouchableOpacity>
        </View>

        {/* ═══ CALENDAR WEEK STRIP ═══ */}
        <View style={s.calendarRow}>
          {dayLabels.map((label, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const isToday = i === dayOfWeek;
            return (
              <View key={i} style={s.calendarDay}>
                <Text style={[s.calDayLabel, isToday && { color: T.ocean }]}>{label}</Text>
                <View style={[s.calCircle, isToday && s.calCircleActive]}>
                  <Text style={[s.calDate, isToday && s.calDateActive]}>{date.getDate()}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ═══ 4 CARDS GRID ═══ */}
          <View style={s.grid}>
            {/* Water */}
            <View style={[s.gridCard, { backgroundColor: CB.water, overflow: 'hidden' }]}>
              <Text style={[s.cardTitle, { color: '#1E3A5F' }]}>Hydratation</Text>
              <View style={s.cardVisual}>
                <Animated.View style={{ transform: [{ translateX: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) }] }}>
                  <WaterWaves width={GRID_W} />
                </Animated.View>
              </View>
              <Text style={[s.cardValue, { color: '#0284C7' }]}>{D.hydrationMl} ml</Text>
              <Text style={[s.cardSub, { color: '#1E3A5F' }]}>Objectif {(D.hydrationGoal / 1000).toFixed(1)}L</Text>
            </View>

            {/* Weight with numbers */}
            <View style={[s.gridCard, { backgroundColor: CB.weight }]}>
              <Text style={[s.cardTitle, { color: '#78350F' }]}>Poids</Text>
              <View style={[s.cardVisual, { alignItems: 'center' }]}>
                <WeightGauge />
              </View>
              <Text style={[s.cardValue, { color: T.text }]}>{D.weight} kg</Text>
              <Text style={[s.cardSub, { color: '#78350F' }]}>Objectif {D.targetWeight}kg</Text>
            </View>

            {/* Calories */}
            <View style={[s.gridCard, { backgroundColor: CB.calories }]}>
              <Text style={[s.cardTitle, { color: '#14532D' }]}>Calories</Text>
              <View style={[s.cardVisual, { alignItems: 'center' }]}>
                <CaloriesGauge />
                <Text style={{ fontSize: 22, marginTop: -4 }}>{'\uD83D\uDD25'}</Text>
              </View>
              <Text style={[s.cardValue, { color: '#15803D' }]}>{D.calories} kcal</Text>
              <Text style={[s.cardSub, { color: '#14532D' }]}>Reste {D.caloriesGoal} kcal</Text>
            </View>

            {/* Sleep/BPM */}
            <View style={[s.gridCard, { backgroundColor: CB.bpm }]}>
              <Text style={[s.cardTitle, { color: '#831843' }]}>Sommeil</Text>
              <View style={[s.cardVisual, { justifyContent: 'center' }]}>
                <ECGLine width={GRID_W - 28} />
              </View>
              <Text style={[s.cardValue, { color: T.text }]}>{D.sleepHours} h</Text>
              <Text style={[s.cardSub, { color: '#831843' }]}>Qualit{'\u00E9'} : Bon</Text>
            </View>
          </View>

          {/* ═══ DAILY OVERVIEW (Macro Grid) ═══ */}
          <Text style={s.sectionHeading}>Daily Overview</Text>
          <View style={s.macroGrid}>
            {/* Big Carbs card (left) */}
            <View style={[s.macroBig, { backgroundColor: '#DBEAFE' }]}>
              <Text style={s.macroEmoji}>{'\uD83C\uDF5E'}</Text>
              <Text style={s.macroName}>Glucides</Text>
              <Text style={s.macroVal}>{D.carbs} g <Text style={s.macroGoal}>/ {D.carbsGoal} g</Text></Text>
            </View>
            {/* Right stack */}
            <View style={s.macroRight}>
              <View style={[s.macroSmall, { backgroundColor: '#F3E8FF' }]}>
                <Text style={s.macroEmoji}>{'\uD83E\uDD90'}</Text>
                <Text style={s.macroName}>Prot{'\u00E9'}ines</Text>
                <Text style={s.macroVal}>{D.protein} g <Text style={s.macroGoal}>/ {D.proteinGoal} g</Text></Text>
              </View>
              <View style={[s.macroSmall, { backgroundColor: '#FCE7F3' }]}>
                <Text style={s.macroEmoji}>{'\uD83E\uDD5A'}</Text>
                <Text style={s.macroName}>Lipides</Text>
                <Text style={s.macroVal}>{D.fat} g <Text style={s.macroGoal}>/ {D.fatGoal} g</Text></Text>
              </View>
            </View>
          </View>

          {/* ═══ RANK CARD ═══ */}
          <View style={[s.baseCard, { backgroundColor: '#E8F4FD', marginTop: 16 }]}>
            <View style={s.rankRow}>
              <View style={s.rankAvatarWrap}>
                <View style={[s.rankAvatar, { borderColor: T.ocean }]}>
                  <Ionicons name="person" size={26} color={T.sky} />
                </View>
                <View style={[s.lvlBadge, { backgroundColor: T.ocean }]}>
                  <Text style={s.lvlText}>{D.level}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.rankName}>{D.rankName}</Text>
                  <View style={[s.streakChip, { backgroundColor: T.orange + '18' }]}>
                    <Flame size={10} color={T.orange} />
                    <Text style={[s.streakChipText, { color: T.orange }]}>{D.streak}j</Text>
                  </View>
                </View>
                <Text style={s.rankSubText}>{'\u8DB3\u8EFD'} - Le soldat de base</Text>
                <View style={[s.progressTrack, { backgroundColor: T.ocean + '25', marginTop: 6 }]}>
                  <Animated.View style={[s.progressFill, { width: rankBarWidth, backgroundColor: T.ocean }]} />
                </View>
                <View style={s.nextRow}>
                  <View style={[s.nextDot, { backgroundColor: T.purple }]} />
                  <Text style={s.nextText}>
                    <Text style={{ fontWeight: '800', color: T.purple }}>{D.nextRankName}</Text> dans {D.nextRankDays} jours
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={T.ocean} />
            </View>
          </View>

          {/* ═══ CHALLENGES ═══ */}
          <View style={[s.baseCard, { marginTop: 16 }]}>
            <View style={s.sectionHeader}>
              <Target size={18} color={T.ocean} />
              <Text style={s.sectionTitle}>Qu{'\u00EA'}tes du jour</Text>
              <View style={{ flex: 1 }} />
              <Text style={[s.sectionCount, { color: T.ocean }]}>{completedCount}/{D.challenges.length}</Text>
            </View>
            <View style={[s.xpBar, { backgroundColor: T.ocean + '10' }]}>
              <Zap size={14} color={T.ocean} />
              <Text style={[s.xpBarText, { color: T.ocean }]}>
                {D.challenges.filter(c => c.done).reduce((sum, c) => sum + c.xp, 0)} XP gagn{'\u00E9'}s
              </Text>
              <Text style={[s.xpBarTotal, { color: T.muted }]}>/ {D.challenges.reduce((sum, c) => sum + c.xp, 0)} XP</Text>
            </View>
            {D.challenges.map(ch => (
              <View key={ch.id} style={s.questItem}>
                <View style={[s.questIconWrap, { backgroundColor: ch.done ? T.green + '15' : T.sky + '40' }]}>
                  {ch.done ? <CheckCircle2 size={16} color={T.green} /> : getQuestIcon(ch.icon)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.questTitle, { textDecorationLine: ch.done ? 'line-through' : 'none' }]}>{ch.title}</Text>
                  <View style={[s.questProgressTrack, { backgroundColor: T.sky + '40' }]}>
                    <View style={[s.questProgressFill, { width: `${ch.progress * 100}%`, backgroundColor: ch.done ? T.green : T.ocean }]} />
                  </View>
                </View>
                <View style={[s.xpChip, { backgroundColor: ch.done ? T.green + '15' : T.ocean + '12' }]}>
                  <Text style={[s.xpChipText, { color: ch.done ? T.green : T.ocean }]}>+{ch.xp}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ═══ BODY COMPOSITION ═══ */}
          <View style={[s.baseCard, { marginTop: 16 }]}>
            <Text style={s.sectionTitleAlone}>Composition corporelle</Text>
            {[
              { label: 'MUSCLE', value: D.muscleMass, color: T.green, max: 60 },
              { label: 'GRAISSE', value: D.bodyFat, color: T.orange, max: 40 },
              { label: 'EAU', value: D.waterPct, color: T.cyan, max: 80 },
            ].map(item => (
              <View key={item.label} style={s.compRow}>
                <Text style={s.compLabel}>{item.label}</Text>
                <View style={s.compBarTrack}>
                  <Animated.View style={[s.compBarFill, {
                    width: compBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${(item.value / item.max) * 100}%`] }),
                    backgroundColor: item.color,
                  }]} />
                </View>
                <Text style={[s.compValue, { color: item.color }]}>{item.value}%</Text>
              </View>
            ))}
          </View>

        </Animated.View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══ TAB BAR ═══ */}
      <View style={[s.tabBar, { paddingBottom: insets.bottom || 16 }]}>
        <View style={s.tabActive}>
          <Home size={22} color={T.ocean} />
          <Text style={[s.tabLabel, { color: T.ocean }]}>Accueil</Text>
          <View style={[s.tabDot, { backgroundColor: T.ocean }]} />
        </View>
        <TouchableOpacity style={s.tab} onPress={() => router.push('/theme-demo-stats' as any)}>
          <BarChart2 size={22} color={T.muted} />
          <Text style={[s.tabLabel, { color: T.muted }]}>Stats</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: HP, paddingBottom: 120 },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, marginBottom: 6, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  profileCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, borderColor: '#F9A8D4', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  headerGreeting: { fontSize: 17, fontWeight: '800', color: T.text },
  headerSub: { fontSize: 13, fontWeight: '500', color: T.sub, marginTop: 2 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },

  // Calendar week strip
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, marginBottom: 8, backgroundColor: T.card, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  calendarDay: { alignItems: 'center', flex: 1 },
  calDayLabel: { fontSize: 12, fontWeight: '600', color: T.muted, marginBottom: 6 },
  calCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: T.border },
  calCircleActive: { backgroundColor: T.ocean, borderColor: T.ocean },
  calDate: { fontSize: 13, fontWeight: '700', color: T.text },
  calDateActive: { color: '#FFF' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  gridCard: { width: GRID_W, minHeight: 210, borderRadius: 24, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardVisual: { flex: 1, justifyContent: 'center', marginVertical: 2, overflow: 'hidden' },
  cardValue: { fontSize: 17, fontWeight: '800' },
  cardSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Macro overview
  sectionHeading: { fontSize: 17, fontWeight: '800', color: T.text, marginTop: 18, marginBottom: 10, marginLeft: 2 },
  macroGrid: { flexDirection: 'row', gap: GAP, height: 190 },
  macroBig: { flex: 1, borderRadius: 24, padding: 16, justifyContent: 'flex-end' },
  macroRight: { width: GRID_W, gap: GAP },
  macroSmall: { flex: 1, borderRadius: 20, padding: 12, justifyContent: 'flex-end' },
  macroEmoji: { fontSize: 28, marginBottom: 6 },
  macroName: { fontSize: 13, fontWeight: '700', color: T.text },
  macroVal: { fontSize: 14, fontWeight: '800', color: T.text, marginTop: 2 },
  macroGoal: { fontSize: 12, fontWeight: '500', color: T.muted },

  // Card base
  baseCard: { borderRadius: 24, padding: 16, backgroundColor: T.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },

  // Rank
  rankRow: { flexDirection: 'row', alignItems: 'center' },
  rankAvatarWrap: { position: 'relative', marginRight: 12 },
  rankAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  lvlBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#E8F4FD' },
  lvlText: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  rankName: { fontSize: 13, fontWeight: '900', color: T.text, textTransform: 'uppercase', letterSpacing: 1.5 },
  rankSubText: { fontSize: 10, fontWeight: '500', color: T.muted, marginTop: 2 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  streakChipText: { fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: 3 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  nextDot: { width: 6, height: 6, borderRadius: 3 },
  nextText: { fontSize: 10, fontWeight: '500', color: T.muted },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.text },
  sectionTitleAlone: { fontSize: 15, fontWeight: '800', color: T.text, marginBottom: 14 },
  sectionCount: { fontSize: 14, fontWeight: '900' },
  xpBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 10 },
  xpBarText: { fontSize: 13, fontWeight: '800' },
  xpBarTotal: { fontSize: 12, fontWeight: '600' },
  questItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border + '40' },
  questIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  questTitle: { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 4 },
  questProgressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', width: '100%' },
  questProgressFill: { height: '100%', borderRadius: 2 },
  xpChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  xpChipText: { fontSize: 11, fontWeight: '800' },

  compRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  compLabel: { width: 62, fontSize: 10, fontWeight: '700', letterSpacing: 1, color: T.muted },
  compBarTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: T.sky + '40', overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 5 },
  compValue: { width: 46, fontSize: 14, fontWeight: '900', textAlign: 'right' },

  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border, position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: T.card },
  tab: { alignItems: 'center', gap: 4, flex: 1, paddingVertical: 4 },
  tabActive: { alignItems: 'center', gap: 4, flex: 1, paddingVertical: 4 },
  tabLabel: { fontSize: 11, fontWeight: '700' },
  tabDot: { width: 5, height: 5, borderRadius: 2.5 },
});
