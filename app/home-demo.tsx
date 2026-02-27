import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle, Line, Polyline } from 'react-native-svg';
import {
  ChevronLeft,
  Droplets,
  Moon,
  Flame,
  Footprints,
  Zap,
  Trophy,
  Target,
  TrendingDown,
  TrendingUp,
  Dumbbell,
  Activity,
  BookOpen,
  CheckCircle2,
  Camera,
  FileText,
  Timer,
  Calendar,
  Clock,
  Calculator,
  FlaskConical,
  BarChart3,
  Battery,
  Plus,
  Home,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProfile } from '@/lib/database';

const { width: SW } = Dimensions.get('window');
const PAD = 20;
const GAP = 12;
const CARD_W = (SW - PAD * 2 - GAP) / 2;

// ============================================================
// EXACT COLORS from reference design
// ============================================================
const C = {
  bg: '#ECEEF4',
  card: '#FFFFFF',
  // Card backgrounds
  waterBg: '#DAEEF8',
  waterBlue: '#5AACDB',
  waterBlueDark: '#3A8CC0',
  weightBg: '#FDF4D8',
  weightOrange: '#E8844A',
  weightOrangeDark: '#D4693A',
  caloriesBg: '#FDE4E8',
  caloriesGreen: '#6ABF69',
  bpmBg: '#FDE4E8',
  bpmPink: '#E8658A',
  // Text
  text: '#1C1C2E',
  textSec: '#6B6B80',
  textLight: '#9E9EB0',
  // Accent
  green: '#5CB85C',
  greenBg: '#E6F5E6',
  salmon: '#F0A090',
  salmonDark: '#E08878',
  orange: '#F08050',
  purple: '#9B59B6',
  purpleBg: '#F0E6F6',
  blue: '#5AACDB',
  blueBg: '#E0F0FA',
  yellow: '#F0C040',
  yellowBg: '#FDF4D8',
  pink: '#E8658A',
  pinkBg: '#FDE4E8',
  red: '#E85050',
  border: '#E8E8F0',
};

// ============================================================
// MAIN
// ============================================================
export default function HomeDemo() {
  const insets = useSafeAreaInsets();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState('Guerrier');

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        if (p?.profile_photo) setProfilePhoto(p.profile_photo);
        if (p?.name) setUserName(p.name);
      } catch {}
    })();
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon apres-midi' : 'Bonsoir';
  const d = new Date();
  const mois = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TouchableOpacity
        style={[s.backBtn, { top: insets.top + 10 }]}
        onPress={() => router.back()}
      >
        <ChevronLeft size={22} color={C.text} strokeWidth={2.5} />
      </TouchableOpacity>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: PAD, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ======== HEADER ======== */}
        <View style={s.header}>
          <View style={s.avatar}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={s.avatarImg} />
            ) : (
              <LinearGradient colors={[C.salmon, C.salmonDark]} style={s.avatarFallback}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFF' }}>{userName[0]?.toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>
              {greeting} {userName}
            </Text>
            <Text style={{ fontSize: 13, color: C.textSec, marginTop: 2 }}>
              Tu as perdu <Text style={{ color: C.green, fontWeight: '700' }}>0.5kg</Text> cette semaine !
            </Text>
          </View>
        </View>

        {/* ======== DATE ======== */}
        <View style={s.dateRow}>
          <Calendar size={15} color={C.text} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginLeft: 8 }}>
            {d.getDate()} {mois[d.getMonth()]} {d.getFullYear()}
          </Text>
        </View>

        {/* ======== 4 METRIC CARDS (2x2) ======== */}
        <View style={s.grid}>
          {/* HYDRATATION - Water card with waves */}
          <View style={[s.metricCard, { backgroundColor: C.waterBg }]}>
            <Text style={s.metricLabel}>Hydratation</Text>
            <View style={s.waveContainer}>
              {/* Wave layers using Views */}
              <View style={[s.wave, { backgroundColor: C.waterBlue, opacity: 0.2, bottom: 0, height: '65%', borderTopLeftRadius: 40, borderTopRightRadius: 60 }]} />
              <View style={[s.wave, { backgroundColor: C.waterBlue, opacity: 0.35, bottom: 0, height: '50%', borderTopLeftRadius: 60, borderTopRightRadius: 30 }]} />
              <View style={[s.wave, { backgroundColor: C.waterBlue, opacity: 0.5, bottom: 0, height: '35%', borderTopLeftRadius: 30, borderTopRightRadius: 50 }]} />
            </View>
            <Text style={[s.metricBigValue, { color: C.waterBlueDark }]}>1800 ml</Text>
            <Text style={s.metricSmallText}>Objectif 2500 ml</Text>
          </View>

          {/* POIDS - Weight card with gauge */}
          <View style={[s.metricCard, { backgroundColor: C.weightBg }]}>
            <Text style={s.metricLabel}>Poids</Text>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <Svg width={CARD_W - 50} height={(CARD_W - 50) / 2 + 10}>
                {/* Background arc */}
                <Path
                  d={`M 10 ${(CARD_W-50)/2} A ${(CARD_W-70)/2} ${(CARD_W-70)/2} 0 0 1 ${CARD_W-60} ${(CARD_W-50)/2}`}
                  fill="none" stroke="#E8DFC0" strokeWidth={10} strokeLinecap="round"
                />
                {/* Filled arc (80%) */}
                <Path
                  d={`M 10 ${(CARD_W-50)/2} A ${(CARD_W-70)/2} ${(CARD_W-70)/2} 0 0 1 ${CARD_W-60} ${(CARD_W-50)/2}`}
                  fill="none" stroke={C.weightOrange} strokeWidth={10} strokeLinecap="round"
                  strokeDasharray={`${Math.PI * ((CARD_W-70)/2) * 0.8} ${Math.PI * ((CARD_W-70)/2)}`}
                />
                {/* Needle */}
                {(() => {
                  const r = (CARD_W-70)/2 - 8;
                  const cx = (CARD_W-50)/2;
                  const cy = (CARD_W-50)/2;
                  const angle = Math.PI - Math.PI * 0.8;
                  return (
                    <>
                      <Line x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy - Math.sin(angle) * r}
                        stroke={C.text} strokeWidth={2.5} strokeLinecap="round" />
                      <SvgCircle cx={cx} cy={cy} r={4} fill={C.text} />
                    </>
                  );
                })()}
              </Svg>
            </View>
            <Text style={[s.metricBigValue, { color: C.weightOrangeDark }]}>80.2 kg</Text>
            <Text style={s.metricSmallText}>Objectif 75 kg</Text>
          </View>
        </View>

        <View style={s.grid}>
          {/* SOMMEIL - Semi-circle ring */}
          <View style={[s.metricCard, { backgroundColor: C.caloriesBg }]}>
            <Text style={s.metricLabel}>Sommeil</Text>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <Svg width={CARD_W - 50} height={(CARD_W - 50) / 2 + 10}>
                <Path
                  d={`M 10 ${(CARD_W-50)/2} A ${(CARD_W-70)/2} ${(CARD_W-70)/2} 0 0 1 ${CARD_W-60} ${(CARD_W-50)/2}`}
                  fill="none" stroke="#F0D0D8" strokeWidth={12} strokeLinecap="round"
                />
                <Path
                  d={`M 10 ${(CARD_W-50)/2} A ${(CARD_W-70)/2} ${(CARD_W-70)/2} 0 0 1 ${CARD_W-60} ${(CARD_W-50)/2}`}
                  fill="none" stroke={C.caloriesGreen} strokeWidth={12} strokeLinecap="round"
                  strokeDasharray={`${Math.PI * ((CARD_W-70)/2) * 0.94} ${Math.PI * ((CARD_W-70)/2)}`}
                />
              </Svg>
            </View>
            <Text style={[s.metricBigValue, { color: C.caloriesGreen }]}>7h 32m</Text>
            <Text style={s.metricSmallText}>Objectif 8h</Text>
          </View>

          {/* CHARGE - Heartbeat */}
          <View style={[s.metricCard, { backgroundColor: C.bpmBg }]}>
            <Text style={s.metricLabel}>Charge</Text>
            <View style={{ marginVertical: 12, paddingHorizontal: 4 }}>
              <Svg width={CARD_W - 40} height={45}>
                <Polyline
                  points={`0,22 ${(CARD_W-40)*0.12},22 ${(CARD_W-40)*0.18},8 ${(CARD_W-40)*0.24},35 ${(CARD_W-40)*0.30},5 ${(CARD_W-40)*0.36},28 ${(CARD_W-40)*0.42},22 ${(CARD_W-40)*0.55},22 ${(CARD_W-40)*0.62},12 ${(CARD_W-40)*0.68},32 ${(CARD_W-40)*0.74},3 ${(CARD_W-40)*0.80},26 ${(CARD_W-40)*0.86},22 ${CARD_W-40},22`}
                  fill="none" stroke={C.bpmPink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text style={[s.metricBigValue, { color: C.bpmPink }]}>Moderee</Text>
            <Text style={s.metricSmallText}>4 seances / sem</Text>
          </View>
        </View>

        {/* ======== MACROS (Composition corporelle) ======== */}
        <View style={s.whiteCard}>
          <View style={s.macrosRow}>
            <View style={s.macroBox}>
              <View style={s.macroTop}>
                <Text style={s.macroName}>Muscle</Text>
                <Dumbbell size={14} color={C.salmon} />
              </View>
              <Text style={[s.macroPercent, { color: C.salmon }]}>54%</Text>
              <View style={[s.macroBar, { backgroundColor: '#FDE4E0' }]}>
                <View style={[s.macroFill, { width: '54%', backgroundColor: C.salmon }]} />
              </View>
            </View>
            <View style={s.macroBox}>
              <View style={s.macroTop}>
                <Text style={s.macroName}>Graisse</Text>
                <Flame size={14} color={C.orange} />
              </View>
              <Text style={[s.macroPercent, { color: C.orange }]}>16%</Text>
              <View style={[s.macroBar, { backgroundColor: '#FDE8D8' }]}>
                <View style={[s.macroFill, { width: '16%', backgroundColor: C.orange }]} />
              </View>
            </View>
          </View>
          <View style={[s.macrosRow, { marginTop: 14 }]}>
            <View style={s.macroBox}>
              <View style={s.macroTop}>
                <Text style={s.macroName}>Eau</Text>
                <Droplets size={14} color={C.blue} />
              </View>
              <Text style={[s.macroPercent, { color: C.blue }]}>58%</Text>
              <View style={[s.macroBar, { backgroundColor: '#DDF0FA' }]}>
                <View style={[s.macroFill, { width: '58%', backgroundColor: C.blue }]} />
              </View>
            </View>
            <View style={s.macroBox}>
              <View style={s.macroTop}>
                <Text style={s.macroName}>Os</Text>
                <Activity size={14} color={C.green} />
              </View>
              <Text style={[s.macroPercent, { color: C.green }]}>12%</Text>
              <View style={[s.macroBar, { backgroundColor: '#DDF0DD' }]}>
                <View style={[s.macroFill, { width: '12%', backgroundColor: C.green }]} />
              </View>
            </View>
          </View>
        </View>

        {/* ======== WATER GLASSES ======== */}
        <View style={s.whiteCard}>
          <Text style={s.cardTitle}>Hydratation</Text>
          <Text style={{ fontSize: 13, color: C.textLight, marginTop: 2 }}>1.8 L / 2.5 L</Text>
          <View style={s.glassRow}>
            {[1,1,1,1,0,0].map((filled, i) => (
              <View key={i} style={[s.glass, filled ? s.glassFilled : s.glassEmpty]}>
                {filled ? (
                  <View style={s.glassWater}>
                    <View style={s.glassWaterInner} />
                  </View>
                ) : null}
              </View>
            ))}
            <TouchableOpacity style={s.glassAdd}>
              <Plus size={16} color={C.blue} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ======== BATTERIE ATHLETE ======== */}
        <View style={s.whiteCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.iconBubble, { backgroundColor: C.greenBg }]}>
                <Battery size={16} color={C.green} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={s.cardTitle}>Energie</Text>
                <Text style={{ fontSize: 11, color: C.textLight }}>Readiness</Text>
              </View>
            </View>
            <View style={[s.pill, { backgroundColor: C.greenBg }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.green }}>Bonne forme</Text>
            </View>
          </View>
          <View style={s.batteryBar}>
            <LinearGradient colors={['#6ABF69', '#4CAF50']} start={{x:0,y:0}} end={{x:1,y:0}} style={[s.batteryFill, { width: '72%' }]} />
            <Text style={s.batteryPct}>72%</Text>
          </View>
          <View style={s.breakdownRow}>
            {[
              { l: 'Sommeil', v: '85%', c: C.purple, Icon: Moon },
              { l: 'Hydra.', v: '72%', c: C.blue, Icon: Droplets },
              { l: 'Charge', v: '65%', c: C.orange, Icon: Activity },
              { l: 'Streak', v: '100%', c: C.green, Icon: Flame },
            ].map((x, i) => (
              <View key={i} style={s.breakdownItem}>
                <x.Icon size={12} color={x.c} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.text }}>{x.v}</Text>
                <Text style={{ fontSize: 8, color: C.textLight, fontWeight: '600' }}>{x.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ======== ACTIVITIES ======== */}
        <View style={s.whiteCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.cardTitle}>Activites</Text>
            <View style={[s.kcalBadge, { backgroundColor: C.salmon }]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>486 Kcal</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: C.textLight, marginTop: 4, marginBottom: 10 }}>
            {d.getDate()} {mois[d.getMonth()]} - 8 432 pas - 4 seances
          </Text>
          {/* Multi-line chart */}
          <View style={{ height: 130, marginBottom: 8 }}>
            <Svg width={SW - PAD * 2 - 32} height={130}>
              {/* Grid */}
              {[0.25, 0.5, 0.75].map((y, i) => (
                <Line key={i} x1={0} y1={130*y} x2={SW-PAD*2-32} y2={130*y} stroke="#E8E8F0" strokeWidth={1} strokeDasharray="4,4" />
              ))}
              {/* Bar backgrounds */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                const x = i * ((SW-PAD*2-32) / 7.5);
                return <Line key={`bg${i}`} x1={x+15} y1={130} x2={x+15} y2={20} stroke="#F4F4F8" strokeWidth={16} strokeLinecap="round" />;
              })}
              {/* Lines */}
              {[
                { data: [0.35, 0.5, 0.45, 0.7, 0.6, 0.75, 0.65, 0.85], color: C.salmon },
                { data: [0.2, 0.3, 0.35, 0.45, 0.5, 0.48, 0.55, 0.6], color: C.orange },
                { data: [0.45, 0.35, 0.55, 0.45, 0.3, 0.38, 0.32, 0.28], color: C.purple },
                { data: [0.12, 0.18, 0.22, 0.28, 0.32, 0.30, 0.38, 0.42], color: C.green },
              ].map((line, li) => {
                const w = SW - PAD * 2 - 32;
                const pts = line.data.map((v, i) => `${(i / (line.data.length - 1)) * w},${130 - v * 120}`).join(' ');
                const lastX = w;
                const lastY = 130 - line.data[line.data.length - 1] * 120;
                return (
                  <React.Fragment key={li}>
                    <Polyline points={pts} fill="none" stroke={line.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                    <SvgCircle cx={lastX} cy={lastY} r={4} fill={line.color} stroke="#FFF" strokeWidth={2} />
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
          {/* Legend */}
          <View style={s.legendRow}>
            {[
              { l: 'Pas', c: C.salmon },
              { l: 'Calories', c: C.orange },
              { l: 'Sommeil', c: C.purple },
              { l: 'Charge', c: C.green },
            ].map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: x.c }} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.textLight }}>{x.l}</Text>
              </View>
            ))}
          </View>
          {/* Mini stats */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {[
              { v: '8 432', l: 'pas', c: C.salmon, bg: '#FDE8E0' },
              { v: '486', l: 'kcal', c: C.orange, bg: C.yellowBg },
              { v: '14', l: 'jours', c: C.green, bg: C.greenBg },
            ].map((x, i) => (
              <View key={i} style={[s.miniStat, { backgroundColor: x.bg }]}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: x.c }}>{x.v}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.textLight }}>{x.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ======== RANG ======== */}
        <View style={s.whiteCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[s.rankIcon, { backgroundColor: C.yellowBg, borderColor: C.yellow }]}>
              <Trophy size={22} color={C.yellow} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '900', letterSpacing: 2, color: C.text }}>SAMURAI</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDE8E0', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, gap: 3 }}>
                  <Flame size={10} color={C.orange} fill={C.orange} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.orange }}>14j</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>侍 - Niveau 3</Text>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: '#FDE4E0', marginTop: 6, overflow: 'hidden' }}>
                <View style={{ width: '68%', height: '100%', borderRadius: 3, backgroundColor: C.salmon }} />
              </View>
              <Text style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>
                <Text style={{ fontWeight: '800', color: C.orange }}>Ronin</Text> dans 32 jours
              </Text>
            </View>
          </View>
        </View>

        {/* ======== DEFIS ======== */}
        <View style={s.whiteCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.iconBubble, { backgroundColor: C.yellowBg }]}>
                <Target size={16} color={C.yellow} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={s.cardTitle}>Defis du jour</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Zap size={11} color={C.yellow} fill={C.yellow} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.yellow }}>+25 XP</Text>
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.yellow }}>2<Text style={{ fontSize: 12, color: C.textLight }}>/5</Text></Text>
          </View>
          {/* Progress */}
          <View style={{ height: 7, borderRadius: 4, backgroundColor: C.yellowBg, marginVertical: 10, overflow: 'hidden' }}>
            <LinearGradient colors={[C.yellow, '#F0A820']} start={{x:0,y:0}} end={{x:1,y:0}} style={{ width: '40%', height: '100%', borderRadius: 4 }} />
          </View>
          {/* Quests */}
          {[
            { t: 'Enregistre ton poids', s: 'Pesee quotidienne', xp: 15, done: true, c: C.pink },
            { t: 'Bois 2L d\'eau', s: 'Hydratation complete', xp: 10, done: true, c: C.blue },
            { t: 'Fais un entrainement', s: '30 min minimum', xp: 25, done: false, c: C.orange },
            { t: 'Dors 7h minimum', s: 'Sommeil recuperateur', xp: 20, done: false, c: C.purple },
            { t: 'Marche 8000 pas', s: 'Activite quotidienne', xp: 15, done: false, c: C.green, p: 65 },
          ].map((q, i) => (
            <View key={i} style={[s.questRow, { backgroundColor: q.done ? C.greenBg : C.bg }]}>
              <View style={[s.questDot, { backgroundColor: q.c + '20' }]}>
                {q.done ? <CheckCircle2 size={16} color={C.green} /> : <Target size={16} color={q.c} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.questT, q.done && { textDecorationLine: 'line-through', color: C.textLight }]}>{q.t}</Text>
                <Text style={s.questS}>{q.s}</Text>
                {!q.done && q.p !== undefined && (
                  <View style={{ height: 3, borderRadius: 2, backgroundColor: q.c + '20', marginTop: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${q.p}%`, height: '100%', backgroundColor: q.c, borderRadius: 2 }} />
                  </View>
                )}
              </View>
              <View style={[s.xpBadge, { backgroundColor: q.done ? C.greenBg : C.yellowBg }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: q.done ? C.green : C.yellow }}>{q.done ? '✓' : `+${q.xp}`}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ======== OUTILS ======== */}
        <Text style={s.sectionLabel}>OUTILS</Text>
        <View style={s.toolsGrid}>
          {[
            { Icon: BookOpen, l: 'Carnet', c: C.orange, bg: '#FDE8D8' },
            { Icon: Timer, l: 'Timer', c: C.salmon, bg: C.pinkBg },
            { Icon: Calendar, l: 'Planning', c: C.blue, bg: C.blueBg },
            { Icon: Dumbbell, l: 'Exercices', c: C.green, bg: C.greenBg },
            { Icon: Camera, l: 'Photos', c: C.purple, bg: C.purpleBg },
            { Icon: Calculator, l: 'Calculs', c: C.yellow, bg: C.yellowBg },
            { Icon: FlaskConical, l: 'Savoir', c: C.pink, bg: C.pinkBg },
            { Icon: Clock, l: 'Jeune', c: C.orange, bg: '#FDE8D8' },
          ].map((t, i) => (
            <View key={i} style={s.toolItem}>
              <View style={[s.toolIcon, { backgroundColor: t.bg }]}>
                <t.Icon size={20} color={t.c} />
              </View>
              <Text style={s.toolLabel}>{t.l}</Text>
            </View>
          ))}
        </View>

        {/* ======== RAPPORT ======== */}
        <View style={[s.whiteCard, { padding: 0, overflow: 'hidden' }]}>
          <LinearGradient colors={[C.salmon, C.salmonDark]} style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FileText size={18} color="#FFF" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>Rapport Hebdo</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={s.grade}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: C.salmon }}>B+</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>Belle progression</Text>
                <Text style={{ fontSize: 11, color: '#FFFFFFAA' }}>Score: 72/100</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { l: 'Poids', v: '-0.7 kg', I: TrendingDown },
                { l: 'Seances', v: '4', I: Dumbbell },
                { l: 'Sommeil', v: '7h15', I: Moon },
                { l: 'Pas', v: '52 840', I: Footprints },
              ].map((r, i) => (
                <View key={i} style={s.reportItem}>
                  <r.I size={12} color="#FFF" />
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>{r.v}</Text>
                  <Text style={{ fontSize: 9, color: '#FFFFFFAA' }}>{r.l}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* ======== PREDICTIONS ======== */}
        <View style={s.whiteCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={14} color={C.purple} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.purple }}>Predictions</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {[{ l: '30j', v: '79.3' }, { l: '90j', v: '77.8' }, { l: '6 mois', v: '76.0' }, { l: '1 an', v: '75.0' }].map((p, i) => (
              <View key={i} style={[s.predItem, i < 3 && { borderRightWidth: 1, borderRightColor: C.border }]}>
                <Text style={{ fontSize: 9, color: C.textLight, fontWeight: '600' }}>{p.l}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{p.v} kg</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ======== BOTTOM NAV (decoratif) ======== */}
        <View style={s.bottomNav}>
          <View style={[s.navBtn, { backgroundColor: C.greenBg }]}>
            <Home size={20} color={C.green} />
          </View>
          <View style={s.navBtn}>
            <BarChart3 size={20} color={C.textLight} />
          </View>
          <View style={s.navBtn}>
            <User size={20} color={C.textLight} />
          </View>
        </View>

      </Animated.ScrollView>
    </View>
  );
}

// ============================================================
const s = StyleSheet.create({
  backBtn: { position: 'absolute', left: 16, zIndex: 99, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }) },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingLeft: 36 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  avatarImg: { width: 48, height: 48 },
  avatarFallback: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },

  // 2x2 grid
  grid: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  metricCard: { width: CARD_W, borderRadius: 22, padding: 14, ...Platform.select({ ios: { shadowColor: '#8888AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 }, android: { elevation: 2 } }) },
  metricLabel: { fontSize: 15, fontWeight: '700', color: '#1C1C2E' },
  metricBigValue: { fontSize: 17, fontWeight: '900', marginTop: 2 },
  metricSmallText: { fontSize: 11, color: '#9E9EB0', marginTop: 1 },

  // Waves
  waveContainer: { height: 70, borderRadius: 16, overflow: 'hidden', marginVertical: 6, position: 'relative' },
  wave: { position: 'absolute', left: 0, right: 0 },

  // White card
  whiteCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#8888AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 }, android: { elevation: 2 } }) },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C2E' },

  // Macros
  macrosRow: { flexDirection: 'row', gap: 14 },
  macroBox: { flex: 1 },
  macroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  macroName: { fontSize: 12, fontWeight: '600', color: '#6B6B80' },
  macroPercent: { fontSize: 24, fontWeight: '900', marginVertical: 2 },
  macroBar: { height: 5, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },

  // Water glasses
  glassRow: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'center', alignItems: 'flex-end' },
  glass: { width: 34, height: 44, borderRadius: 8, borderWidth: 2, justifyContent: 'flex-end', overflow: 'hidden' },
  glassFilled: { borderColor: '#5AACDB', backgroundColor: '#E8F4FC' },
  glassEmpty: { borderColor: '#D0D8E0', backgroundColor: 'transparent' },
  glassWater: { height: '65%', backgroundColor: '#5AACDB', opacity: 0.35, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  glassWaterInner: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', backgroundColor: '#5AACDB', opacity: 0.5 },
  glassAdd: { width: 34, height: 44, borderRadius: 8, borderWidth: 2, borderColor: '#5AACDB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  // Battery
  batteryBar: { height: 32, borderRadius: 10, borderWidth: 2, borderColor: '#E0E4EA', overflow: 'hidden', marginTop: 12, marginBottom: 8, justifyContent: 'center', position: 'relative' },
  batteryFill: { position: 'absolute', left: 2, top: 2, bottom: 2, borderRadius: 8 },
  batteryPct: { textAlign: 'center', fontSize: 13, fontWeight: '900', color: '#1C1C2E', zIndex: 1 },
  breakdownRow: { flexDirection: 'row', backgroundColor: '#F4F5FA', borderRadius: 12, padding: 8 },
  breakdownItem: { flex: 1, alignItems: 'center', gap: 2 },

  // Icon bubble
  iconBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },

  // Kcal
  kcalBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },

  // Legend
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },

  // Mini stat
  miniStat: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center' },

  // Rank
  rankIcon: { width: 48, height: 48, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  // Quests
  questRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, marginBottom: 6, gap: 10 },
  questDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  questT: { fontSize: 13, fontWeight: '700', color: '#1C1C2E' },
  questS: { fontSize: 11, color: '#9E9EB0' },
  xpBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Tools
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#9E9EB0', marginBottom: 10 },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  toolItem: { width: (SW - PAD * 2 - 30) / 4, backgroundColor: '#FFF', borderRadius: 16, padding: 10, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#8888AA', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  toolIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  toolLabel: { fontSize: 10, fontWeight: '700', color: '#1C1C2E', textAlign: 'center' },

  // Report
  grade: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  reportItem: { width: (SW - PAD * 2 - 44) / 2, backgroundColor: '#FFFFFF20', borderRadius: 12, padding: 10, gap: 2 },

  // Predictions
  predItem: { flex: 1, alignItems: 'center' },

  // Bottom nav
  bottomNav: { flexDirection: 'row', justifyContent: 'center', gap: 24, backgroundColor: '#FFF', borderRadius: 28, paddingVertical: 10, paddingHorizontal: 28, alignSelf: 'center', marginTop: 8, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 4 } }) },
  navBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
