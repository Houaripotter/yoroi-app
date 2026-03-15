import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SamuraiCircleLoader } from '@/components/SamuraiLoader';
import { StatsSection } from '../../StatsSection';
import { StatsDetailModal } from '../../StatsDetailModal';
import { MultiLineComparisonCard } from '../../charts/MultiLineComparisonCard';
import { DualComparisonCard } from '../../charts/DualComparisonCard';
import { Moon, Plus, ChevronRight, Coffee, Brain, Heart, Wind, Thermometer } from 'lucide-react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Path, Line as SvgLine, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { SLEEP_DURATION_RANGES } from '@/lib/healthRanges';

interface SommeilTabProps {
  sleep: any;
  sleepPhasesData: {
    avgAwake: number;
    avgRem: number;
    avgCore: number;
    avgDeep: number;
    totalSleepMin: number;
    nightsCount: number;
  };
  sleepComparisonData: {
    heartRate?: { min: number; max: number; avg: number };
    respiratoryRate?: { min: number; max: number; avg: number };
    wristTemperature?: { value: number };
    heartRateHistory?: { date: string; value: number }[];
    respiratoryRateHistory?: { date: string; value: number }[];
  };
  sleepHistory: { date: string; value: number }[];
  rawSleepHistory?: any[];
  mindfulMinutes?: number;
  onMetricPress?: (metric: { key: string; label: string; color: string; unit: string; icon: React.ReactNode }) => void;
}

const formatSleepDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const min = Math.round((hours - h) * 60);
  return `${h}h ${min.toString().padStart(2, '0')}min`;
};

const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, '0')}`;
};

export const SommeilTab: React.FC<SommeilTabProps> = React.memo(({
  sleep,
  sleepPhasesData,
  sleepComparisonData,
  sleepHistory,
  rawSleepHistory = [],
  mindfulMinutes = 0,
  onMetricPress,
}) => {
  const { colors, isDark, screenBackground } = useTheme();

  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 7000);
    return () => clearTimeout(t);
  }, []);

  const [selectedMetric, setSelectedMetric] = useState<{
    key: string; label: string; color: string; unit: string; icon: React.ReactNode;
  } | null>(null);

  const avgHours = sleepPhasesData.totalSleepMin > 0 ? sleepPhasesData.totalSleepMin / 60 : 0;

  // Score de sommeil
  const sleepScore = useMemo(() => {
    const avg = sleepPhasesData.totalSleepMin;
    if (avg === 0) return null;
    const hours = avg / 60;
    let durationScore = 0;
    if (hours >= 7 && hours <= 9) durationScore = 100;
    else if (hours > 9 && hours <= 10) durationScore = 80;
    else if (hours >= 6 && hours < 7) durationScore = 65;
    else if (hours >= 5 && hours < 6) durationScore = 35;
    else durationScore = 10;
    const total = sleepPhasesData.avgDeep + sleepPhasesData.avgRem + sleepPhasesData.avgCore + sleepPhasesData.avgAwake;
    let phaseScore = 70;
    if (total > 0) {
      const deepRatio = sleepPhasesData.avgDeep / total;
      const remRatio = sleepPhasesData.avgRem / total;
      const deepScore = deepRatio >= 0.13 && deepRatio <= 0.28 ? 100 : deepRatio > 0.05 ? 60 : 20;
      const remScore = remRatio >= 0.18 && remRatio <= 0.30 ? 100 : remRatio > 0.08 ? 60 : 20;
      phaseScore = (deepScore + remScore) / 2;
    }
    const final = Math.round(durationScore * 0.6 + phaseScore * 0.4);
    if (final >= 85) return { grade: 'A', label: 'Excellent', color: '#22C55E', score: final };
    if (final >= 70) return { grade: 'B', label: 'Bon', color: '#3B82F6', score: final };
    if (final >= 50) return { grade: 'C', label: 'Moyen', color: '#F59E0B', score: final };
    return { grade: 'D', label: 'Insuffisant', color: '#EF4444', score: final };
  }, [sleepPhasesData]);

  // Stabiliser les références des arrays pour éviter les recalculs inutiles des useMemo dépendants
  const safeSleepHistory = useMemo(
    () => (Array.isArray(sleepHistory) ? sleepHistory : []),
    [sleepHistory]
  );
  const safeSleepHistory_ = useMemo(
    () => (Array.isArray(rawSleepHistory) ? rawSleepHistory : []),
    [rawSleepHistory]
  );

  // Nuits filtrées (pas les siestes)
  const sortedNights = useMemo(() =>
    [...safeSleepHistory_]
      .filter(item => {
        if (!item?.date) return false;
        const total = item.total || item.duration || 0;
        if (total > 0 && total < 180) {
          if (!item.startTime) return false;
          const hour = new Date(item.startTime).getHours();
          if (hour >= 9 && hour <= 21) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [safeSleepHistory_]
  );

  const siestes = useMemo(() =>
    [...safeSleepHistory_]
      .filter(item => {
        if (!item?.date) return false;
        const total = item.total || item.duration || 0;
        if (total <= 0 || total >= 180) return false;
        if (!item.startTime) return true;
        const hour = new Date(item.startTime).getHours();
        return hour >= 9 && hour <= 21;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [safeSleepHistory_]
  );

  // Historiques par phase (pour MultiLineComparisonCard)
  const phaseHistories = useMemo(() => {
    const sorted = [...safeSleepHistory_]
      .filter(n => n?.date && (n.deep > 0 || n.rem > 0 || n.core > 0))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      deep: sorted.filter(n => n.deep > 0).map(n => ({ date: n.date, value: Math.round(n.deep) })),
      rem: sorted.filter(n => n.rem > 0).map(n => ({ date: n.date, value: Math.round(n.rem) })),
      core: sorted.filter(n => n.core > 0).map(n => ({ date: n.date, value: Math.round(n.core) })),
    };
  }, [safeSleepHistory_]);

  const durationHistory = useMemo(() =>
    [...safeSleepHistory].sort((a, b) => a.date.localeCompare(b.date)),
    [safeSleepHistory]
  );

  // Données modal
  const getModalData = useCallback(() => {
    if (!selectedMetric) return [];
    if (selectedMetric.key === 'sleep') {
      return durationHistory.map(h => ({
        value: h.value,
        label: (() => { try { return format(parseISO(h.date), 'd MMM', { locale: fr }); } catch { return h.date; } })(),
        date: h.date,
      }));
    }
    if (selectedMetric.key === 'deep') return phaseHistories.deep.map(h => ({ value: h.value, label: (() => { try { return format(parseISO(h.date), 'd MMM', { locale: fr }); } catch { return h.date; } })(), date: h.date }));
    if (selectedMetric.key === 'rem') return phaseHistories.rem.map(h => ({ value: h.value, label: (() => { try { return format(parseISO(h.date), 'd MMM', { locale: fr }); } catch { return h.date; } })(), date: h.date }));
    return [];
  }, [selectedMetric, durationHistory, phaseHistories]);

  // ── Gauge score sommeil — variables précalculées et memoizées (trigonométrie)
  const gaugeData = useMemo(() => {
    const gaugeGW = 200, gaugeGH = 120;
    const gaugeGcx = gaugeGW / 2, gaugeGcy = gaugeGH - 2;
    const gaugeGr = 65, gaugeGsw = 16;
    const gaugeProgress = sleepScore ? Math.max(0, Math.min(100, sleepScore.score)) / 100 : 0;
    const gaugeSegs = [
      { from: 0, to: 0.5, color: '#EF4444' },
      { from: 0.5, to: 0.7, color: '#F59E0B' },
      { from: 0.7, to: 0.85, color: '#3B82F6' },
      { from: 0.85, to: 1, color: '#22C55E' },
    ];
    const gaugeMakeArc = (p1: number, p2: number) => {
      const a1 = Math.PI * (1 - p1), a2 = Math.PI * (1 - p2);
      return `M ${gaugeGcx + gaugeGr * Math.cos(a1)} ${gaugeGcy - gaugeGr * Math.sin(a1)} A ${gaugeGr} ${gaugeGr} 0 0 1 ${gaugeGcx + gaugeGr * Math.cos(a2)} ${gaugeGcy - gaugeGr * Math.sin(a2)}`;
    };
    const gaugeNeedleAngle = Math.PI * (1 - gaugeProgress);
    const gaugeNLen = gaugeGr + gaugeGsw / 2;
    const gaugeNx = gaugeGcx + gaugeNLen * Math.cos(gaugeNeedleAngle);
    const gaugeNy = gaugeGcy - gaugeNLen * Math.sin(gaugeNeedleAngle);
    const gaugeLabels = [{ v: 'D', p: 0.15 }, { v: 'C', p: 0.45 }, { v: 'B', p: 0.72 }, { v: 'A', p: 0.92 }];
    return { gaugeGW, gaugeGH, gaugeGcx, gaugeGcy, gaugeGr, gaugeGsw, gaugeSegs, gaugeMakeArc, gaugeNx, gaugeNy, gaugeLabels };
  }, [sleepScore]);

  const { gaugeGW, gaugeGH, gaugeGcx, gaugeGcy, gaugeGr, gaugeGsw, gaugeSegs, gaugeMakeArc, gaugeNx, gaugeNy, gaugeLabels } = gaugeData;

  const gaugeExplanation = useMemo(() => {
    if (!sleepScore) return null;
    if (sleepScore.grade === 'A') {
      return { text: 'Ton sommeil est optimal. Durée et phases idéales. Continue ainsi !', tips: [] as string[] };
    }
    if (sleepScore.grade === 'B') {
      return {
        text: 'Bon sommeil, quelques axes d\'amélioration possibles.',
        tips: [
          avgHours < 7 ? 'Vise 7-9h de sommeil par nuit' : null,
          sleepPhasesData.avgDeep < 60 ? 'Ton sommeil profond est un peu court — évite les écrans 1h avant de dormir' : null,
          sleepPhasesData.avgRem < 90 ? 'Peu de sommeil REM — essaie de te coucher plus tôt' : null,
        ].filter(Boolean) as string[],
      };
    }
    if (sleepScore.grade === 'C') {
      return {
        text: 'Ton sommeil est insuffisant. Voici ce que tu peux améliorer :',
        tips: [
          avgHours < 6 ? 'Tu dors trop peu — vise au minimum 7h par nuit' : null,
          'Couche-toi et lève-toi à des heures fixes chaque jour',
          'Évite la caféine après 14h et l\'alcool le soir',
          'Maintiens ta chambre fraîche (18-20°C) et sombre',
        ].filter(Boolean) as string[],
      };
    }
    return {
      text: 'Ton sommeil est sérieusement déficient. Priorité absolue :',
      tips: [
        'Tu dors bien moins que les 7h recommandées',
        'Consulte un médecin si ce manque de sommeil dure depuis plusieurs semaines',
        'Évite les somnifères sans avis médical',
        'Commence par une routine de coucher fixe chaque soir',
      ] as string[],
    };
  }, [sleepScore, avgHours, sleepPhasesData.avgDeep, sleepPhasesData.avgRem]);

  // Fond légèrement teinté de la couleur accent (entre les cartes)
  const sectionBg = isDark
    ? colors.accent + '10'   // ~6% accent en sombre
    : colors.accent + '08';  // ~3% accent en clair
  // Fond des cartes : légèrement plus clair que backgroundCard
  const cardBg = isDark ? '#242430' : '#FFFFFF';
  const cardBorder = isDark ? colors.accent + '30' : colors.border;

  if (showLoader) return <SamuraiCircleLoader duration={7000} bgColor={screenBackground} />;

  return (
    <View style={{ backgroundColor: sectionBg, borderRadius: 16, marginHorizontal: 0, paddingTop: 8, paddingBottom: 8 }}>
      {/* ── Jauge score sommeil — JSX inline (pas de composant interne) */}
      {sleepScore && gaugeExplanation && (
        <StatsSection>
          <View style={[styles.gaugeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* ── Jauge SVG */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/sleep' as any)}>
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ width: gaugeGW, height: gaugeGH, overflow: 'visible' }}>
                  <Svg width={gaugeGW} height={gaugeGH} viewBox={`0 0 ${gaugeGW} ${gaugeGH}`} style={{ overflow: 'visible' }}>
                    <Path d={gaugeMakeArc(0, 1)} stroke={colors.border || 'rgba(255,255,255,0.06)'} strokeWidth={gaugeGsw + 4} fill="none" strokeLinecap="butt" />
                    {gaugeSegs.map((s, i) => (
                      <Path key={i} d={gaugeMakeArc(s.from, s.to)} stroke={s.color} strokeWidth={gaugeGsw} fill="none" strokeLinecap="butt" />
                    ))}
                    {gaugeLabels.map((l, i) => {
                      const a = Math.PI * (1 - l.p);
                      const lr = gaugeGr + gaugeGsw / 2 + 16;
                      return (
                        <SvgText key={i} x={gaugeGcx + lr * Math.cos(a)} y={gaugeGcy - lr * Math.sin(a) + 3} fontSize={10} fontWeight="800" fill={colors.textMuted || '#6B7280'} textAnchor="middle">{l.v}</SvgText>
                      );
                    })}
                    <SvgLine x1={gaugeGcx} y1={gaugeGcy} x2={gaugeNx} y2={gaugeNy} stroke={colors.textPrimary || '#FFF'} strokeWidth={3} strokeLinecap="round" />
                    <SvgCircle cx={gaugeGcx} cy={gaugeGcy} r={5} fill={colors.background || '#1A1A2E'} stroke={colors.border || 'rgba(255,255,255,0.15)'} strokeWidth={2} />
                  </Svg>
                </View>
                <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1, marginTop: 4 }}>
                  {sleepScore.score}<Text style={{ fontSize: 16, fontWeight: '600' }}>/100</Text>
                </Text>
                <View style={[styles.gradeBigBadge, { backgroundColor: sleepScore.color + '18', borderColor: sleepScore.color + '40' }]}>
                  <Text style={[styles.gradeBigText, { color: sleepScore.color }]}>{sleepScore.grade} — {sleepScore.label}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[{ label: 'D Insuffisant', color: '#EF4444' }, { label: 'C Moyen', color: '#F59E0B' }, { label: 'B Bon', color: '#3B82F6' }, { label: 'A Excellent', color: '#22C55E' }].map(c => (
                    <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 16, height: 5, borderRadius: 2.5, backgroundColor: c.color }} />
                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted }}>{c.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Durée / Note / Nuits */}
              <View style={[styles.gaugeBottom, { borderTopColor: colors.border }]}>
                <View style={styles.gaugeBottomItem}>
                  <Text style={[styles.gaugeBottomValue, { color: '#6366F1' }]}>
                    {avgHours > 0 ? formatSleepDuration(avgHours) : '--'}
                  </Text>
                  <Text style={[styles.gaugeBottomLabel, { color: colors.textMuted }]}>Durée moy.</Text>
                </View>
                <View style={[styles.gaugeBottomDivider, { backgroundColor: colors.border }]} />
                <View style={styles.gaugeBottomItem}>
                  <Text style={[styles.gaugeBottomValue, { color: colors.textPrimary }]}>
                    {Math.round(sleepPhasesData.totalSleepMin / 60 * 10) / 10 > 0 ? `${Math.floor(avgHours)}h${Math.round((avgHours % 1) * 60).toString().padStart(2,'0')}` : '--'}
                  </Text>
                  <Text style={[styles.gaugeBottomLabel, { color: colors.textMuted }]}>Effectif</Text>
                </View>
                <View style={[styles.gaugeBottomDivider, { backgroundColor: colors.border }]} />
                <View style={styles.gaugeBottomItem}>
                  <Text style={[styles.gaugeBottomValue, { color: colors.textPrimary }]}>
                    {sleepPhasesData.nightsCount}
                  </Text>
                  <Text style={[styles.gaugeBottomLabel, { color: colors.textMuted }]}>Nuits</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ── Explication contextuelle du score */}
            <View style={[styles.explanationBlock, { backgroundColor: sleepScore.color + '10', borderColor: sleepScore.color + '30' }]}>
              <Text style={[styles.explanationTitle, { color: sleepScore.color }]}>
                {sleepScore.grade === 'A' ? 'Comment est calculé ce score ?' : 'Comment améliorer ton score ?'}
              </Text>
              <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{gaugeExplanation.text}</Text>
              <Text style={[styles.explanationCalc, { color: colors.textMuted }]}>
                Score = 60% durée + 40% qualité des phases (profond + REM)
              </Text>
              {gaugeExplanation.tips.length > 0 && (
                <View style={styles.tipsList}>
                  {gaugeExplanation.tips.map((tip, i) => (
                    <View key={i} style={styles.tipRow}>
                      <View style={[styles.tipDot, { backgroundColor: sleepScore.color }]} />
                      <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── Lien journal */}
            <TouchableOpacity
              style={styles.journalLink}
              onPress={() => router.push('/sleep' as any)}
              activeOpacity={0.7}
            >
              <Moon size={13} color="#6366F1" strokeWidth={2} />
              <Text style={[styles.journalLinkText, { color: '#6366F1' }]}>Voir le journal sommeil complet</Text>
              <ChevronRight size={13} color="#6366F1" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* ── Bouton historique durée */}
            <TouchableOpacity
              style={[styles.historyBtn, { borderColor: cardBorder }]}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric({ key: 'sleep', label: 'Durée de sommeil', color: '#6366F1', unit: 'h', icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} /> })}
            >
              <Text style={[styles.historyBtnText, { color: colors.textMuted }]}>Voir l'historique des durées</Text>
              <ChevronRight size={13} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </StatsSection>
      )}

      {/* ── Phases de sommeil (multi-ligne si données dispo) */}
      {(phaseHistories.deep.length > 0 || phaseHistories.rem.length > 0) ? (
        <StatsSection>
          <MultiLineComparisonCard
            title="Phases de sommeil"
            unit="min"
            lines={[
              {
                label: 'Profond',
                color: '#312E81',
                history: phaseHistories.deep,
                currentValue: sleepPhasesData.avgDeep,
                onPress: () => setSelectedMetric({ key: 'deep', label: 'Sommeil profond', color: '#312E81', unit: 'min', icon: <Moon size={18} color="#312E81" strokeWidth={2.5} /> }),
              },
              {
                label: 'REM',
                color: '#6366F1',
                history: phaseHistories.rem,
                currentValue: sleepPhasesData.avgRem,
                onPress: () => setSelectedMetric({ key: 'rem', label: 'Sommeil REM', color: '#6366F1', unit: 'min', icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} /> }),
              },
              {
                label: 'Léger',
                color: '#818CF8',
                history: phaseHistories.core,
                currentValue: sleepPhasesData.avgCore,
                onPress: () => setSelectedMetric({ key: 'core', label: 'Sommeil léger', color: '#818CF8', unit: 'min', icon: <Moon size={18} color="#818CF8" strokeWidth={2.5} /> }),
              },
            ]}
          />
        </StatsSection>
      ) : (sleepPhasesData.avgDeep > 0 || sleepPhasesData.avgRem > 0 || sleepPhasesData.avgCore > 0) ? (
        // Fallback: barre empilée des phases moyennes
        <StatsSection>
          {(() => {
            const { avgDeep, avgRem, avgCore, avgAwake } = sleepPhasesData;
            const totalPhases = avgDeep + avgRem + avgCore + avgAwake;
            if (totalPhases === 0) return null;
            const phases = [
              { label: 'Profond', value: avgDeep, color: '#312E81', pct: (avgDeep / totalPhases * 100) },
              { label: 'REM', value: avgRem, color: '#6366F1', pct: (avgRem / totalPhases * 100) },
              { label: 'Léger', value: avgCore, color: '#818CF8', pct: (avgCore / totalPhases * 100) },
              { label: 'Éveillé', value: avgAwake, color: '#C7D2FE', pct: (avgAwake / totalPhases * 100) },
            ].filter(p => p.value > 0);
            return (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Phases moyennes</Text>
                <View style={styles.phasesBarContainer}>
                  {phases.map((phase, i) => (
                    <View key={i} style={[styles.phasesBarSegment, { backgroundColor: phase.color, width: `${phase.pct}%` as any, borderTopLeftRadius: i === 0 ? 6 : 0, borderBottomLeftRadius: i === 0 ? 6 : 0, borderTopRightRadius: i === phases.length - 1 ? 6 : 0, borderBottomRightRadius: i === phases.length - 1 ? 6 : 0 }]} />
                  ))}
                </View>
                <View style={styles.phasesLegend}>
                  {phases.map((phase, i) => (
                    <View key={i} style={styles.phasesLegendItem}>
                      <View style={[styles.phasesLegendDot, { backgroundColor: phase.color }]} />
                      <View>
                        <Text style={[styles.phasesLegendLabel, { color: colors.textSecondary }]}>{phase.label}</Text>
                        <Text style={[styles.phasesLegendValue, { color: colors.textPrimary }]}>
                          {formatMinutes(phase.value)} ({Math.round(phase.pct)}%)
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </StatsSection>
      ) : null}

      {/* ── Données pendant le sommeil (DualComparisonCard si FC + FreqResp) */}
      {sleepComparisonData.heartRate && sleepComparisonData.respiratoryRate ? (
        <StatsSection>
          <DualComparisonCard
            title="Pendant le sommeil"
            leftLabel="FC nocturne"
            rightLabel="Fréq. resp."
            leftColor="#EF4444"
            rightColor="#06B6D4"
            leftHistory={sleepComparisonData.heartRateHistory ?? []}
            rightHistory={sleepComparisonData.respiratoryRateHistory ?? []}
            leftValue={Math.round(sleepComparisonData.heartRate.avg)}
            rightValue={Math.round(sleepComparisonData.respiratoryRate.avg)}
            unit=""
            leftUnit="bpm moy"
            rightUnit="resp/min"
          />
        </StatsSection>
      ) : sleepComparisonData.heartRate || sleepComparisonData.respiratoryRate || sleepComparisonData.wristTemperature ? (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Pendant le sommeil</Text>
            <View style={styles.sleepMetricsRow}>
              {sleepComparisonData.heartRate && (
                <View style={styles.sleepMetricPill}>
                  <Heart size={16} color="#EF4444" strokeWidth={2} />
                  <Text style={[styles.sleepMetricValue, { color: '#EF4444' }]}>{Math.round(sleepComparisonData.heartRate.avg)}</Text>
                  <Text style={[styles.sleepMetricUnit, { color: colors.textMuted }]}>bpm moy</Text>
                  <Text style={[styles.sleepMetricRange, { color: colors.textMuted }]}>{Math.round(sleepComparisonData.heartRate.min)}-{Math.round(sleepComparisonData.heartRate.max)}</Text>
                </View>
              )}
              {sleepComparisonData.respiratoryRate && (
                <View style={styles.sleepMetricPill}>
                  <Wind size={16} color="#06B6D4" strokeWidth={2} />
                  <Text style={[styles.sleepMetricValue, { color: '#06B6D4' }]}>{Math.round(sleepComparisonData.respiratoryRate.avg)}</Text>
                  <Text style={[styles.sleepMetricUnit, { color: colors.textMuted }]}>resp/min</Text>
                </View>
              )}
              {sleepComparisonData.wristTemperature && (
                <View style={styles.sleepMetricPill}>
                  <Thermometer size={16} color="#F97316" strokeWidth={2} />
                  <Text style={[styles.sleepMetricValue, { color: '#F97316' }]}>{sleepComparisonData.wristTemperature.value.toFixed(1)}</Text>
                  <Text style={[styles.sleepMetricUnit, { color: colors.textMuted }]}>°C poignet</Text>
                </View>
              )}
            </View>
          </View>
        </StatsSection>
      ) : null}

      {/* ── Durée de sommeil — historique horizontal (plus récent à gauche) */}
      {durationHistory.length > 0 && (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedMetric({ key: 'sleep', label: 'Durée de sommeil', color: '#6366F1', unit: 'h', icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} /> })}
            >
              <View style={styles.historyTitleRow}>
                <View style={[styles.historyTitleDash, { backgroundColor: '#6366F1' }]} />
                <Text style={[styles.historyTitleText, { color: colors.textMuted }]}>
                  NUITS ({sortedNights.length})
                </Text>
                <View style={[styles.historyTitleDash, { backgroundColor: '#6366F1' }]} />
              </View>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
              {sortedNights.map((night, index) => {
                const total = night.total || night.duration || 0;
                const hours = total / 60;
                const dateStr = night.date || '';
                let formattedDate = dateStr;
                try { formattedDate = format(parseISO(dateStr), 'd MMM', { locale: fr }); } catch {}
                const isFirst = index === 0;
                const qualityColor = hours >= 7 ? '#22C55E' : hours >= 6 ? '#3B82F6' : hours >= 5 ? '#F59E0B' : '#EF4444';
                return (
                  <TouchableOpacity
                    key={dateStr + index}
                    activeOpacity={0.7}
                    onPress={() => { if (dateStr) router.push(`/sleep-detail?date=${dateStr.split('T')[0]}` as any); }}
                    style={[styles.nightCard, { backgroundColor: cardBg, borderColor: isFirst ? '#6366F1' : cardBorder }, isFirst && styles.nightCardRecent]}
                  >
                    {isFirst && (
                      <View style={styles.nightCardBadge}>
                        <Text style={styles.nightCardBadgeText}>RECENT</Text>
                      </View>
                    )}
                    <Text style={[styles.nightCardDate, { color: colors.textMuted }]}>{formattedDate}</Text>
                    <Text style={[styles.nightCardDuration, { color: isFirst ? '#6366F1' : qualityColor }]}>
                      {hours > 0 ? formatSleepDuration(hours) : '--'}
                    </Text>
                    {night.deep > 0 && (
                      <Text style={[styles.nightCardExtra, { color: colors.textMuted }]}>
                        Prof. {formatMinutes(night.deep)}
                      </Text>
                    )}
                    {night.rem > 0 && (
                      <Text style={[styles.nightCardExtra, { color: colors.textMuted }]}>
                        REM {formatMinutes(night.rem)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </StatsSection>
      )}

      {/* ── Méditation */}
      {mindfulMinutes > 0 && (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.mindfulHeader}>
              <Brain size={18} color="#8B5CF6" strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Méditation du jour</Text>
            </View>
            <View style={styles.mindfulRow}>
              <Text style={[styles.mindfulValue, { color: '#8B5CF6' }]}>{mindfulMinutes}</Text>
              <Text style={[styles.mindfulUnit, { color: colors.textMuted }]}>min</Text>
            </View>
            <View style={[styles.mindfulBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[styles.mindfulBarFill, { width: `${Math.min(100, (mindfulMinutes / 20) * 100)}%`, backgroundColor: mindfulMinutes >= 10 ? '#22C55E' : '#8B5CF6' }]} />
            </View>
            <Text style={[styles.mindfulNote, { color: colors.textMuted }]}>
              {mindfulMinutes >= 10 ? 'Bonne séance de pleine conscience' : mindfulMinutes >= 5 ? 'Continue comme ça' : 'Chaque minute compte'}
            </Text>
          </View>
        </StatsSection>
      )}

      {/* ── Siestes */}
      {siestes.length > 0 && (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.siestesHeader}>
              <Coffee size={16} color="#F59E0B" strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Siestes ({siestes.length})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
              {siestes.map((sieste, index) => {
                const total = sieste.total || sieste.duration || 0;
                const minutes = Math.round(total);
                let formattedDate = sieste.date || '';
                try { formattedDate = format(parseISO(sieste.date), 'EEE d MMM', { locale: fr }); } catch {}
                return (
                  <View key={(sieste.date || '') + index} style={[styles.siesteCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', borderColor: '#F59E0B40' }]}>
                    <Coffee size={14} color="#F59E0B" strokeWidth={2} />
                    <Text style={[styles.siesteDate, { color: colors.textPrimary }]}>{formattedDate}</Text>
                    <Text style={[styles.siesteDuration, { color: '#F59E0B' }]}>
                      {minutes >= 60 ? `${Math.floor(minutes / 60)}h ${(minutes % 60).toString().padStart(2, '0')}min` : `${minutes} min`}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </StatsSection>
      )}

      <View style={{ height: 40 }} />

      {selectedMetric && (
        <StatsDetailModal
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.label}
          subtitle="Évolution complète"
          data={getModalData()}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.key}
          healthRange={selectedMetric.key === 'sleep' ? SLEEP_DURATION_RANGES : undefined}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  gaugeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gaugeBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 14,
  },
  gaugeBottomItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  gaugeBottomValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  gaugeBottomLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  gaugeBottomDivider: {
    width: 1,
    height: 36,
  },
  gradeBigBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
  },
  gradeBigText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  explanationBlock: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
    gap: 6,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  explanationCalc: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 4,
  },
  tipsList: { gap: 6, marginTop: 6 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  tipText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
  journalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  journalLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  phasesBarContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  phasesBarSegment: { height: '100%' },
  phasesLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  phasesLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phasesLegendDot: { width: 10, height: 10, borderRadius: 5 },
  phasesLegendLabel: { fontSize: 11, fontWeight: '600' },
  phasesLegendValue: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  sleepMetricsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  sleepMetricPill: {
    flex: 1,
    minWidth: 90,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.06)',
  },
  sleepMetricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sleepMetricUnit: { fontSize: 11, fontWeight: '600' },
  sleepMetricRange: { fontSize: 10, fontWeight: '500' },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  historyTitleDash: { flex: 1, height: 1.5, borderRadius: 1, opacity: 0.4 },
  historyTitleText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  historyScroll: { paddingHorizontal: 2, gap: 10 },
  nightCard: {
    width: 110,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  nightCardRecent: { borderWidth: 2 },
  nightCardBadge: { backgroundColor: '#6366F120', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  nightCardBadgeText: { fontSize: 9, fontWeight: '700', color: '#6366F1', letterSpacing: 0.5 },
  nightCardDate: { fontSize: 11, fontWeight: '500' },
  nightCardDuration: { fontSize: 15, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  nightCardExtra: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  mindfulHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mindfulRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  mindfulValue: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  mindfulUnit: { fontSize: 16, fontWeight: '500' },
  mindfulBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  mindfulBarFill: { height: '100%', borderRadius: 4 },
  mindfulNote: { fontSize: 13, fontWeight: '500' },
  siestesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  siesteCard: {
    width: 110,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  siesteDate: { fontSize: 11, fontWeight: '600', textAlign: 'center', textTransform: 'capitalize' },
  siesteDuration: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
});
