import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SamuraiCircleLoader } from '@/components/SamuraiLoader';
import { StatsSection } from '../../StatsSection';
import { StatsDetailModal } from '../../StatsDetailModal';
import { MultiLineComparisonCard } from '../../charts/MultiLineComparisonCard';
import { DualComparisonCard } from '../../charts/DualComparisonCard';
import { Heart, Zap, Activity, Wind, TrendingUp, TrendingDown, Minus, Thermometer, Droplets } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Path, Line as SvgLine, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { HRV_RANGES, RESTING_HEART_RATE_RANGES } from '@/lib/healthRanges';

interface SignesVitauxTabProps {
  heartRate: any;
  hrv: any;
  oxygenSaturation: any;
  respiratoryRate: any;
  vo2max?: any;
  bloodPressure?: any;
  bodyTemperature?: any;
  bloodGlucose?: any;
  heartRateHistory: { date: string; value: number }[];
  hrvHistory: { date: string; value: number }[];
  spo2History?: { date: string; value: number }[];
  respiratoryRateHistory?: { date: string; value: number }[];
  vo2maxHistory?: { date: string; value: number }[];
  bodyTemperatureHistory?: { date: string; value: number }[];
  bloodGlucoseHistory?: { date: string; value: number }[];
  onMetricPress?: (metric: { key: string; label: string; color: string; unit: string; icon: React.ReactNode }) => void;
}

export const SignesVitauxTab: React.FC<SignesVitauxTabProps> = React.memo(({
  heartRate,
  hrv,
  oxygenSaturation,
  respiratoryRate,
  vo2max,
  bloodPressure,
  bodyTemperature,
  bloodGlucose,
  heartRateHistory,
  hrvHistory,
  spo2History = [],
  respiratoryRateHistory = [],
  vo2maxHistory = [],
  bodyTemperatureHistory = [],
  bloodGlucoseHistory = [],
  onMetricPress,
}) => {
  const { colors, isDark, screenBackground } = useTheme();

  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 7000);
    return () => clearTimeout(t);
  }, []);

  const sectionBg = isDark ? colors.accent + '10' : colors.accent + '08';
  const cardBg = isDark ? '#242430' : '#FFFFFF';
  const cardBorder = isDark ? colors.accent + '30' : colors.border;

  const [selectedMetric, setSelectedMetric] = useState<{
    key: string; label: string; color: string; unit: string; icon: React.ReactNode;
  } | null>(null);

  const currentHR = heartRate?.current || 0;
  const restingHR = heartRate?.resting || 0;
  const minHR = heartRate?.min || 0;
  const maxHR = heartRate?.max || 0;
  const hrvValue = hrv?.value || 0;
  const hrvBaseline = hrv?.baseline || 0;
  const spO2Value = oxygenSaturation?.value || 0;
  const respRate = respiratoryRate?.value || 0;
  const vo2maxValue = vo2max?.value || vo2max || 0;
  const systolic = bloodPressure?.systolic || 0;
  const diastolic = bloodPressure?.diastolic || 0;
  const bodyTempValue = bodyTemperature?.value || 0;
  const bloodGlucoseValue = bloodGlucose?.value || 0;
  const bloodGlucoseUnit = bloodGlucose?.unit || 'mmol/L';

  const safeHRHistory = useMemo(() => Array.isArray(heartRateHistory) ? [...heartRateHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [heartRateHistory]);
  const safeHRVHistory = useMemo(() => Array.isArray(hrvHistory) ? [...hrvHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [hrvHistory]);
  const safeSpo2History = useMemo(() => Array.isArray(spo2History) ? [...spo2History].sort((a, b) => a.date.localeCompare(b.date)) : [], [spo2History]);
  const safeRespHistory = useMemo(() => Array.isArray(respiratoryRateHistory) ? [...respiratoryRateHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [respiratoryRateHistory]);
  const safeVo2maxHistory = useMemo(() => Array.isArray(vo2maxHistory) ? [...vo2maxHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [vo2maxHistory]);

  // Tendance HRV
  const hrvTrend = useMemo(() => {
    const valid = safeHRVHistory.filter(h => h.value > 0);
    if (valid.length < 7) return null;
    const recent = valid.slice(-3);
    const older = valid.slice(-7, -3);
    const recentAvg = recent.reduce((s, h) => s + h.value, 0) / recent.length;
    const olderAvg = older.reduce((s, h) => s + h.value, 0) / older.length;
    const diff = recentAvg - olderAvg;
    if (Math.abs(diff) < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }, [safeHRVHistory]);

  const getModalData = useCallback(() => {
    if (!selectedMetric) return [];
    const formatDate = (d: string) => { try { return format(parseISO(d), 'd MMM', { locale: fr }); } catch { return d; } };
    switch (selectedMetric.key) {
      case 'heart_rate': return safeHRHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'hrv': return safeHRVHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'spo2': return safeSpo2History.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'respiratory_rate': return safeRespHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'vo2max': return safeVo2maxHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      default: return [];
    }
  }, [selectedMetric, safeHRHistory, safeHRVHistory, safeSpo2History, safeRespHistory, safeVo2maxHistory]);

  // ── Gauge FC (demi-cercle identique IMC) —
  const displayHR = restingHR > 0 ? restingHR : currentHR;
  const hrStatusLabel = displayHR === 0 ? '' : displayHR < 50 ? 'Athlète' : displayHR < 60 ? 'Excellent' : displayHR < 70 ? 'Bon' : displayHR < 80 ? 'Normal' : displayHR < 90 ? 'Élevé' : 'Très élevé';
  const hrStatusColor = displayHR === 0 ? colors.textMuted : displayHR < 60 ? '#22C55E' : displayHR < 70 ? '#3B82F6' : displayHR < 80 ? '#F59E0B' : '#EF4444';

  // ── Gauge FC — variables précalculées (pas de composant interne)
  const hrGaugeGW = 200, hrGaugeGH = 120;
  const hrGaugeGcx = hrGaugeGW / 2, hrGaugeGcy = hrGaugeGH - 2;
  const hrGaugeGr = 65, hrGaugeGsw = 16;
  const HR_MIN = 40, HR_MAX = 100;
  const hrGaugeProgress = displayHR > 0 ? (Math.max(HR_MIN, Math.min(HR_MAX, displayHR)) - HR_MIN) / (HR_MAX - HR_MIN) : 0;
  const hrGaugeSegs = [
    { from: 0, to: (60 - HR_MIN) / (HR_MAX - HR_MIN), color: '#22C55E' },
    { from: (60 - HR_MIN) / (HR_MAX - HR_MIN), to: (80 - HR_MIN) / (HR_MAX - HR_MIN), color: '#3B82F6' },
    { from: (80 - HR_MIN) / (HR_MAX - HR_MIN), to: (90 - HR_MIN) / (HR_MAX - HR_MIN), color: '#F59E0B' },
    { from: (90 - HR_MIN) / (HR_MAX - HR_MIN), to: 1, color: '#EF4444' },
  ];
  const hrGaugeMakeArc = (p1: number, p2: number) => {
    const a1 = Math.PI * (1 - p1), a2 = Math.PI * (1 - p2);
    return `M ${hrGaugeGcx + hrGaugeGr * Math.cos(a1)} ${hrGaugeGcy - hrGaugeGr * Math.sin(a1)} A ${hrGaugeGr} ${hrGaugeGr} 0 0 1 ${hrGaugeGcx + hrGaugeGr * Math.cos(a2)} ${hrGaugeGcy - hrGaugeGr * Math.sin(a2)}`;
  };
  const hrGaugeNeedleAngle = Math.PI * (1 - hrGaugeProgress);
  const hrGaugeNLen = hrGaugeGr + hrGaugeGsw / 2;
  const hrGaugeNx = hrGaugeGcx + hrGaugeNLen * Math.cos(hrGaugeNeedleAngle);
  const hrGaugeNy = hrGaugeGcy - hrGaugeNLen * Math.sin(hrGaugeNeedleAngle);
  const hrGaugeLabelPositions = [40, 60, 80, 100].map(v => {
    const p = (v - HR_MIN) / (HR_MAX - HR_MIN);
    const a = Math.PI * (1 - p);
    const lr = hrGaugeGr + hrGaugeGsw / 2 + 16;
    return { v, x: hrGaugeGcx + lr * Math.cos(a), y: hrGaugeGcy - lr * Math.sin(a) };
  });

  // VO2Max — badge de niveau
  const getVo2maxLevel = (v: number) => {
    if (v >= 55) return { label: 'Excellent', color: '#22C55E' };
    if (v >= 45) return { label: 'Bon', color: '#3B82F6' };
    if (v >= 35) return { label: 'Moyen', color: '#F59E0B' };
    return { label: 'Faible', color: '#EF4444' };
  };

  const allEmpty = displayHR === 0 && hrvValue === 0 && spO2Value === 0 && respRate === 0 && vo2maxValue === 0 && systolic === 0 && bodyTempValue === 0 && bloodGlucoseValue === 0;

  if (showLoader) return <SamuraiCircleLoader duration={7000} bgColor={screenBackground} />;

  if (allEmpty) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
        <Heart size={40} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune donnée de signes vitaux disponible</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: sectionBg, borderRadius: 16, paddingTop: 8, paddingBottom: 8 }}>
      {/* ── Jauge FC — JSX inline (pas de composant interne) */}
      {displayHR > 0 && (
        <StatsSection>
          <TouchableOpacity
            style={[styles.gaugeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
            onPress={() => setSelectedMetric({ key: 'heart_rate', label: 'Fréquence cardiaque', color: '#EC4899', unit: 'bpm', icon: <Heart size={18} color="#EC4899" strokeWidth={2.5} /> })}
          >
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: hrGaugeGW, height: hrGaugeGH, overflow: 'visible' }}>
                <Svg width={hrGaugeGW} height={hrGaugeGH} viewBox={`0 0 ${hrGaugeGW} ${hrGaugeGH}`} style={{ overflow: 'visible' }}>
                  <Path d={hrGaugeMakeArc(0, 1)} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} strokeWidth={hrGaugeGsw + 4} fill="none" strokeLinecap="butt" />
                  {hrGaugeSegs.map((s, i) => (
                    <Path key={i} d={hrGaugeMakeArc(s.from, s.to)} stroke={s.color} strokeWidth={hrGaugeGsw} fill="none" strokeLinecap="butt" />
                  ))}
                  {hrGaugeLabelPositions.map((lp, i) => (
                    <SvgText key={i} x={lp.x} y={lp.y + 3} fontSize={10} fontWeight="800" fill={colors.textMuted || '#6B7280'} textAnchor="middle">{lp.v}</SvgText>
                  ))}
                  <SvgLine x1={hrGaugeGcx} y1={hrGaugeGcy} x2={hrGaugeNx} y2={hrGaugeNy} stroke={colors.textPrimary || '#FFF'} strokeWidth={3} strokeLinecap="round" />
                  <SvgCircle cx={hrGaugeGcx} cy={hrGaugeGcy} r={5} fill={colors.background || '#1A1A2E'} stroke={colors.border || 'rgba(255,255,255,0.15)'} strokeWidth={2} />
                </Svg>
              </View>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1, marginTop: 4 }}>
                {displayHR}<Text style={{ fontSize: 16, fontWeight: '600' }}> bpm</Text>
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: hrStatusColor, marginTop: 2 }}>{hrStatusLabel}</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 2 }}>
                {restingHR > 0 ? 'Au repos' : 'Actuelle'}
              </Text>

              {/* Min / Max / Actuelle sous la jauge */}
              {(minHR > 0 || maxHR > 0 || (restingHR > 0 && currentHR > 0)) && (
                <View style={styles.gaugeSubRow}>
                  {restingHR > 0 && currentHR > 0 && currentHR !== restingHR && (
                    <View style={styles.gaugeSubItem}>
                      <Text style={[styles.gaugeSubValue, { color: colors.textPrimary }]}>{currentHR}</Text>
                      <Text style={[styles.gaugeSubLabel, { color: colors.textMuted }]}>Actuelle</Text>
                    </View>
                  )}
                  {minHR > 0 && (
                    <View style={styles.gaugeSubItem}>
                      <Text style={[styles.gaugeSubValue, { color: '#22C55E' }]}>{minHR}</Text>
                      <Text style={[styles.gaugeSubLabel, { color: colors.textMuted }]}>Min</Text>
                    </View>
                  )}
                  {maxHR > 0 && (
                    <View style={styles.gaugeSubItem}>
                      <Text style={[styles.gaugeSubValue, { color: '#EF4444' }]}>{maxHR}</Text>
                      <Text style={[styles.gaugeSubLabel, { color: colors.textMuted }]}>Max</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[{ label: '< 60 Excellent', color: '#22C55E' }, { label: '60-80 Normal', color: '#3B82F6' }, { label: '80-90 Élevé', color: '#F59E0B' }, { label: '> 90 Très élevé', color: '#EF4444' }].map(c => (
                  <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 18, height: 5, borderRadius: 2.5, backgroundColor: c.color }} />
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted }}>{c.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* ── FC + VRC — MultiLine si historiques */}
      {(safeHRHistory.length > 0 || safeHRVHistory.length > 0) && (
        <StatsSection>
          <MultiLineComparisonCard
            title="Fréquence cardiaque & VRC"
            unit=""
            lines={[
              ...(safeHRHistory.length > 0 ? [{
                label: 'FC',
                color: '#EC4899',
                history: safeHRHistory,
                currentValue: displayHR,
                unit: 'bpm',
                onPress: () => setSelectedMetric({ key: 'heart_rate', label: 'Fréquence cardiaque', color: '#EC4899', unit: 'bpm', icon: <Heart size={18} color="#EC4899" strokeWidth={2.5} /> }),
              }] : []),
              ...(safeHRVHistory.length > 0 ? [{
                label: 'VRC',
                color: '#10B981',
                history: safeHRVHistory,
                currentValue: hrvValue,
                unit: 'ms',
                onPress: () => setSelectedMetric({ key: 'hrv', label: 'Variabilité cardiaque', color: '#10B981', unit: 'ms', icon: <Zap size={18} color="#10B981" strokeWidth={2.5} /> }),
              }] : []),
            ]}
          />
        </StatsSection>
      )}

      {/* ── VRC seule si pas de graphique multi-ligne */}
      {hrvValue > 0 && safeHRVHistory.length === 0 && (
        <StatsSection>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
            onPress={() => setSelectedMetric({ key: 'hrv', label: 'Variabilité cardiaque', color: '#10B981', unit: 'ms', icon: <Zap size={18} color="#10B981" strokeWidth={2.5} /> })}
          >
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Variabilité cardiaque (VRC)</Text>
            <View style={styles.heroValueRow}>
              <Text style={[styles.heroValue, { color: '#10B981' }]}>{hrvValue}</Text>
              <Text style={[styles.heroUnit, { color: colors.textMuted }]}> ms</Text>
            </View>
            {hrvBaseline > 0 && (
              <Text style={[styles.heroSub, { color: colors.textMuted }]}>Baseline : {hrvBaseline} ms</Text>
            )}
            {hrvTrend && (
              <View style={styles.trendRow}>
                {hrvTrend === 'up' && <TrendingUp size={15} color="#22C55E" strokeWidth={2} />}
                {hrvTrend === 'down' && <TrendingDown size={15} color="#EF4444" strokeWidth={2} />}
                {hrvTrend === 'stable' && <Minus size={15} color="#F59E0B" strokeWidth={2} />}
                <Text style={[styles.trendText, { color: hrvTrend === 'up' ? '#22C55E' : hrvTrend === 'down' ? '#EF4444' : '#F59E0B' }]}>
                  {hrvTrend === 'up' ? 'En progression' : hrvTrend === 'down' ? 'En baisse' : 'Stable'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* ── SpO2 + Fréq. Respiratoire — DualComparison */}
      {(spO2Value > 0 || respRate > 0) && (
        <StatsSection>
          {(spO2Value > 0 && respRate > 0) ? (
            <DualComparisonCard
              title="Respiratoire"
              leftLabel="SpO2"
              rightLabel="Fréq. resp."
              leftColor="#3B82F6"
              rightColor="#8B5CF6"
              leftHistory={safeSpo2History}
              rightHistory={safeRespHistory}
              leftValue={Math.round(spO2Value)}
              rightValue={Math.round(respRate)}
              unit=""
              leftUnit="%"
              rightUnit="resp/min"
              onPressLeft={() => setSelectedMetric({ key: 'spo2', label: 'Saturation en oxygène', color: '#3B82F6', unit: '%', icon: <Activity size={18} color="#3B82F6" strokeWidth={2.5} /> })}
              onPressRight={() => setSelectedMetric({ key: 'respiratory_rate', label: 'Fréquence respiratoire', color: '#8B5CF6', unit: 'resp/min', icon: <Wind size={18} color="#8B5CF6" strokeWidth={2.5} /> })}
            />
          ) : spO2Value > 0 ? (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.8}
              onPress={() => setSelectedMetric({ key: 'spo2', label: 'Saturation en oxygène', color: '#3B82F6', unit: '%', icon: <Activity size={18} color="#3B82F6" strokeWidth={2.5} /> })}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Saturation en oxygène (SpO2)</Text>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroValue, { color: '#3B82F6' }]}>{Math.round(spO2Value)}</Text>
                <Text style={[styles.heroUnit, { color: colors.textMuted }]}> %</Text>
              </View>
              <Text style={[styles.statusBadge, { color: spO2Value >= 95 ? '#22C55E' : '#F59E0B' }]}>
                {spO2Value >= 95 ? 'Normal' : 'En dessous de la normale'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.8}
              onPress={() => setSelectedMetric({ key: 'respiratory_rate', label: 'Fréquence respiratoire', color: '#8B5CF6', unit: 'resp/min', icon: <Wind size={18} color="#8B5CF6" strokeWidth={2.5} /> })}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Fréquence respiratoire</Text>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroValue, { color: '#8B5CF6' }]}>{Math.round(respRate)}</Text>
                <Text style={[styles.heroUnit, { color: colors.textMuted }]}> resp/min</Text>
              </View>
              <Text style={[styles.statusBadge, { color: respRate >= 12 && respRate <= 20 ? '#22C55E' : '#F59E0B' }]}>
                {respRate >= 12 && respRate <= 20 ? 'Normal (12-20)' : 'Hors norme'}
              </Text>
            </TouchableOpacity>
          )}
        </StatsSection>
      )}

      {/* ── VO2Max */}
      {vo2maxValue > 0 && (
        <StatsSection>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
            onPress={() => setSelectedMetric({ key: 'vo2max', label: 'VO2 Max', color: '#F59E0B', unit: 'ml/kg/min', icon: <Activity size={18} color="#F59E0B" strokeWidth={2.5} /> })}
          >
            <View style={styles.vo2Header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>VO2 Max</Text>
                <View style={styles.heroValueRow}>
                  <Text style={[styles.heroValue, { color: '#F59E0B' }]}>{Math.round(vo2maxValue)}</Text>
                  <Text style={[styles.heroUnit, { color: colors.textMuted }]}> ml/kg/min</Text>
                </View>
              </View>
              {(() => {
                const level = getVo2maxLevel(vo2maxValue);
                return (
                  <View style={[styles.levelBadge, { backgroundColor: level.color + '20', borderColor: level.color + '50' }]}>
                    <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
                  </View>
                );
              })()}
            </View>
            {/* Barre de progression VO2Max (20-70 ml/kg/min) */}
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', marginTop: 12 }]}>
              <View style={[styles.progressFill, { width: `${Math.min(100, ((vo2maxValue - 20) / 50) * 100)}%`, backgroundColor: '#F59E0B' }]} />
            </View>
            <View style={styles.vo2Scale}>
              {[20, 30, 40, 50, 60, 70].map(v => (
                <Text key={v} style={[styles.vo2ScaleLabel, { color: colors.textMuted }]}>{v}</Text>
              ))}
            </View>
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* ── Température + Glycémie — DualComparison */}
      {(bodyTempValue > 0 || bloodGlucoseValue > 0) && (
        <StatsSection>
          {bodyTempValue > 0 && bloodGlucoseValue > 0 ? (
            <DualComparisonCard
              title="Biologie"
              leftLabel="Température"
              rightLabel="Glycémie"
              leftColor="#F97316"
              rightColor="#06B6D4"
              leftHistory={bodyTemperatureHistory}
              rightHistory={bloodGlucoseHistory}
              leftValue={bodyTempValue}
              rightValue={bloodGlucoseValue}
              unit=""
              leftUnit="°C"
              rightUnit={bloodGlucoseUnit}
            />
          ) : bodyTempValue > 0 ? (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.cardHeader}>
                <Thermometer size={18} color="#F97316" strokeWidth={2} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Température corporelle</Text>
              </View>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroValue, { color: '#F97316' }]}>{bodyTempValue.toFixed(1)}</Text>
                <Text style={[styles.heroUnit, { color: colors.textMuted }]}> °C</Text>
              </View>
              <Text style={[styles.statusBadge, { color: bodyTempValue >= 36 && bodyTempValue < 37.5 ? '#22C55E' : bodyTempValue >= 37.5 && bodyTempValue < 38 ? '#F59E0B' : bodyTempValue >= 38 ? '#EF4444' : '#3B82F6' }]}>
                {bodyTempValue >= 39 ? 'Fièvre élevée' : bodyTempValue >= 38 ? 'Fièvre modérée' : bodyTempValue >= 37.5 ? 'Légèrement élevée' : bodyTempValue < 36 ? 'Hypothermie légère' : 'Normale'}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.cardHeader}>
                <Droplets size={18} color="#06B6D4" strokeWidth={2} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Glycémie</Text>
              </View>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroValue, { color: '#06B6D4' }]}>{bloodGlucoseValue.toFixed(1)}</Text>
                <Text style={[styles.heroUnit, { color: colors.textMuted }]}> {bloodGlucoseUnit}</Text>
              </View>
              <Text style={[styles.statusBadge, { color: bloodGlucoseValue >= 4.0 && bloodGlucoseValue <= 5.9 ? '#22C55E' : bloodGlucoseValue >= 7.0 ? '#EF4444' : '#F59E0B' }]}>
                {bloodGlucoseValue >= 7.0 ? 'Élevée — consulter un médecin' : bloodGlucoseValue >= 6.0 ? 'Légèrement élevée' : bloodGlucoseValue < 4.0 ? 'Basse — hypoglycémie possible' : 'Normale à jeun'}
              </Text>
            </View>
          )}
        </StatsSection>
      )}

      {/* ── Tension artérielle */}
      {systolic > 0 && diastolic > 0 && (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardHeader}>
              <Heart size={18} color="#EF4444" strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Tension artérielle</Text>
            </View>
            <View style={styles.heroValueRow}>
              <Text style={[styles.heroValue, { color: '#EF4444' }]}>{systolic}</Text>
              <Text style={[styles.heroUnit, { color: colors.textMuted }]}>/{diastolic} mmHg</Text>
            </View>
            <Text style={[styles.statusBadge, {
              color: systolic < 120 && diastolic < 80 ? '#22C55E'
                : (systolic >= 120 && systolic < 130) && diastolic < 80 ? '#F59E0B'
                : '#EF4444',
            }]}>
              {systolic < 120 && diastolic < 80 ? 'Normale'
                : (systolic >= 120 && systolic < 130) && diastolic < 80 ? 'Élevée'
                : 'Hypertension stade 1'}
            </Text>
            {/* Barre tension */}
            <View style={{ marginTop: 12 }}>
              <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(100, ((systolic - 90) / 60) * 100)}%`,
                  backgroundColor: systolic < 120 ? '#22C55E' : systolic < 130 ? '#F59E0B' : '#EF4444',
                }]} />
              </View>
              <View style={styles.tensionScale}>
                {[90, 110, 120, 130, 140, 150].map(v => (
                  <Text key={v} style={[styles.tensionScaleLabel, { color: colors.textMuted }]}>{v}</Text>
                ))}
              </View>
            </View>
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
          healthRange={
            selectedMetric.key === 'hrv' ? HRV_RANGES :
            selectedMetric.key === 'heart_rate' ? RESTING_HEART_RATE_RANGES :
            undefined
          }
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  cardLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 },
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
  gaugeSubRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  gaugeSubItem: { alignItems: 'center', gap: 2 },
  gaugeSubValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  gaugeSubLabel: { fontSize: 11, fontWeight: '600' },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  heroValue: { fontSize: 42, fontWeight: '700', letterSpacing: -1.5 },
  heroUnit: { fontSize: 18, fontWeight: '500' },
  heroSub: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  statusBadge: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  trendText: { fontSize: 13, fontWeight: '600' },
  vo2Header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  levelText: { fontSize: 13, fontWeight: '800' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  vo2Scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  vo2ScaleLabel: { fontSize: 9, fontWeight: '600' },
  tensionScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tensionScaleLabel: { fontSize: 9, fontWeight: '600' },
  emptyCard: {
    borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  emptyText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
