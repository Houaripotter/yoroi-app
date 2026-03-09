import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScrollableLineChart } from '../../charts/ScrollableLineChart';
import { Heart, Zap, Activity, Wind, TrendingUp, TrendingDown, Minus, Thermometer, Droplets } from 'lucide-react-native';

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
  onMetricPress,
}) => {
  const { colors, isDark } = useTheme();

  const currentHR = heartRate?.current || 0;
  const restingHR = heartRate?.resting || 0;
  const minHR = heartRate?.min || 0;
  const maxHR = heartRate?.max || 0;

  const hrvValue = hrv?.value || 0;
  const hrvBaseline = hrv?.baseline || 0;
  const hrvAbove = hrvValue > 0 && hrvBaseline > 0 && hrvValue >= hrvBaseline;

  const spO2Value = oxygenSaturation?.value || 0;
  const respRate = respiratoryRate?.value || 0;
  const vo2maxValue = vo2max?.value || vo2max || 0;
  const systolic = bloodPressure?.systolic || 0;
  const diastolic = bloodPressure?.diastolic || 0;
  const bodyTempValue = bodyTemperature?.value || 0;
  const bloodGlucoseValue = bloodGlucose?.value || 0;
  const bloodGlucoseUnit = bloodGlucose?.unit || 'mmol/L';

  // Defensive: garantir que les historiques sont des arrays
  const safeHRHistory = Array.isArray(heartRateHistory) ? heartRateHistory : [];
  const safeHRVHistory = Array.isArray(hrvHistory) ? hrvHistory : [];
  const safeSpo2History = Array.isArray(spo2History) ? spo2History : [];
  const safeRespHistory = Array.isArray(respiratoryRateHistory) ? respiratoryRateHistory : [];
  const safeVo2maxHistory = Array.isArray(vo2maxHistory) ? vo2maxHistory : [];

  // Tendance HRV : comparer les 3 dernières valeurs aux 4 précédentes
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

  return (
    <View>
      {/* Carte FC */}
      {(currentHR > 0 || restingHR > 0) && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
          activeOpacity={0.7}
          onPress={() => onMetricPress?.({
            key: 'heart_rate',
            label: 'Fréquence cardiaque',
            color: '#EC4899',
            unit: 'bpm',
            icon: <Heart size={18} color="#EC4899" strokeWidth={2.5} />,
          })}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Fréquence cardiaque</Text>
          <Text style={[styles.heroValue, { color: '#EC4899' }]}>
            {restingHR > 0 ? restingHR : currentHR}
            <Text style={styles.heroUnit}> bpm</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            {restingHR > 0 ? 'au repos' : 'actuelle'}
          </Text>

          {/* Sous-valeurs */}
          {(restingHR > 0 || minHR > 0 || maxHR > 0) && (
            <View style={styles.subValuesRow}>
              {restingHR > 0 && currentHR > 0 && currentHR !== restingHR && (
                <View style={styles.subValueItem}>
                  <Text style={[styles.subValueNumber, { color: colors.textPrimary }]}>{currentHR}</Text>
                  <Text style={[styles.subValueLabel, { color: colors.textMuted }]}>Actuelle</Text>
                </View>
              )}
              {minHR > 0 && (
                <View style={styles.subValueItem}>
                  <Text style={[styles.subValueNumber, { color: colors.textPrimary }]}>{minHR}</Text>
                  <Text style={[styles.subValueLabel, { color: colors.textMuted }]}>Min</Text>
                </View>
              )}
              {maxHR > 0 && (
                <View style={styles.subValueItem}>
                  <Text style={[styles.subValueNumber, { color: colors.textPrimary }]}>{maxHR}</Text>
                  <Text style={[styles.subValueLabel, { color: colors.textMuted }]}>Max</Text>
                </View>
              )}
            </View>
          )}

          {/* Graphique inline */}
          {safeHRHistory.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={safeHRHistory}
                color="#EC4899"
                unit="bpm"
                height={160}
                compact
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Carte HRV */}
      {hrvValue > 0 && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
          activeOpacity={0.7}
          onPress={() => onMetricPress?.({
            key: 'hrv',
            label: 'Variabilite cardiaque',
            color: '#10B981',
            unit: 'ms',
            icon: <Zap size={18} color="#10B981" strokeWidth={2.5} />,
          })}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Variabilite cardiaque (VRC)</Text>
          <Text style={[styles.heroValue, { color: '#10B981' }]}>
            {hrvValue}
            <Text style={styles.heroUnit}> ms</Text>
          </Text>
          {hrvBaseline > 0 && (
            <>
              <Text style={[styles.heroSub, { color: colors.textMuted }]}>
                Baseline : {hrvBaseline} ms
              </Text>
              <Text style={[styles.statusText, { color: hrvAbove ? colors.success : colors.warning }]}>
                {hrvAbove ? 'Au-dessus de ta moyenne' : 'En dessous de ta moyenne'}
              </Text>
            </>
          )}

          {/* Tendance HRV */}
          {hrvTrend && (
            <View style={styles.trendRow}>
              {hrvTrend === 'up' && <TrendingUp size={15} color="#22C55E" strokeWidth={2} />}
              {hrvTrend === 'down' && <TrendingDown size={15} color="#EF4444" strokeWidth={2} />}
              {hrvTrend === 'stable' && <Minus size={15} color="#F59E0B" strokeWidth={2} />}
              <Text style={[styles.trendText, {
                color: hrvTrend === 'up' ? '#22C55E' : hrvTrend === 'down' ? '#EF4444' : '#F59E0B',
              }]}>
                {hrvTrend === 'up' ? 'En progression' : hrvTrend === 'down' ? 'En baisse' : 'Stable'}
              </Text>
            </View>
          )}

          {/* Graphique inline */}
          {safeHRVHistory.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={safeHRVHistory}
                color="#10B981"
                unit="ms"
                height={160}
                compact
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Carte SpO2 */}
      {spO2Value > 0 && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
          activeOpacity={0.7}
          onPress={() => onMetricPress?.({
            key: 'spo2',
            label: 'Saturation en oxygene',
            color: '#3B82F6',
            unit: '%',
            icon: <Activity size={18} color="#3B82F6" strokeWidth={2.5} />,
          })}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Saturation en oxygene (SpO2)</Text>
          <Text style={[styles.heroValue, { color: '#3B82F6' }]}>
            {Math.round(spO2Value)}
            <Text style={styles.heroUnit}> %</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Derniere mesure</Text>
          {spO2Value >= 95 && (
            <Text style={[styles.statusText, { color: colors.success }]}>Normal</Text>
          )}
          {spO2Value > 0 && spO2Value < 95 && (
            <Text style={[styles.statusText, { color: colors.warning }]}>En dessous de la normale</Text>
          )}

          {safeSpo2History.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={safeSpo2History}
                color="#3B82F6"
                unit="%"
                height={160}
                compact
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Carte Freq respiratoire */}
      {respRate > 0 && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
          activeOpacity={0.7}
          onPress={() => onMetricPress?.({
            key: 'respiratory_rate',
            label: 'Fréquence respiratoire',
            color: '#8B5CF6',
            unit: 'resp/min',
            icon: <Wind size={18} color="#8B5CF6" strokeWidth={2.5} />,
          })}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Fréquence respiratoire</Text>
          <Text style={[styles.heroValue, { color: '#8B5CF6' }]}>
            {Math.round(respRate)}
            <Text style={styles.heroUnit}> resp/min</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Derniere mesure</Text>
          {respRate >= 12 && respRate <= 20 && (
            <Text style={[styles.statusText, { color: colors.success }]}>Normal (12-20 resp/min)</Text>
          )}

          {safeRespHistory.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={safeRespHistory}
                color="#8B5CF6"
                unit="resp/min"
                height={160}
                compact
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Carte VO2Max */}
      {vo2maxValue > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>VO2 Max</Text>
          <Text style={[styles.heroValue, { color: '#F59E0B' }]}>
            {Math.round(vo2maxValue)}
            <Text style={styles.heroUnit}> ml/kg/min</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Capacite aérobie max</Text>
          <View style={styles.subValuesRow}>
            {vo2maxValue >= 50 && (
              <View style={styles.subValueItem}>
                <Text style={[styles.subValueNumber, { color: '#22C55E' }]}>Excellent</Text>
                <Text style={[styles.subValueLabel, { color: colors.textMuted }]}>Niveau</Text>
              </View>
            )}
            {vo2maxValue >= 40 && vo2maxValue < 50 && (
              <View style={styles.subValueItem}>
                <Text style={[styles.subValueNumber, { color: '#3B82F6' }]}>Bon</Text>
                <Text style={[styles.subValueLabel, { color: colors.textMuted }]}>Niveau</Text>
              </View>
            )}
            {vo2maxValue > 0 && vo2maxValue < 40 && (
              <View style={styles.subValueItem}>
                <Text style={[styles.subValueNumber, { color: '#F59E0B' }]}>Moyen</Text>
                <Text style={[styles.subValueLabel, { color: colors.textMuted }]}>Niveau</Text>
              </View>
            )}
          </View>
          {safeVo2maxHistory.length > 1 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={safeVo2maxHistory}
                color="#F59E0B"
                unit="ml/kg/min"
                height={140}
                compact
              />
            </View>
          )}
        </View>
      )}

      {/* Carte Température corporelle */}
      {bodyTempValue > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Temperature corporelle</Text>
          <Text style={[styles.heroValue, { color: '#F97316' }]}>
            {bodyTempValue.toFixed(1)}
            <Text style={styles.heroUnit}> °C</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Derniere mesure</Text>
          {bodyTempValue >= 37.5 && bodyTempValue < 38 && (
            <Text style={[styles.statusText, { color: colors.warning }]}>Légèrement élevée</Text>
          )}
          {bodyTempValue >= 38 && bodyTempValue < 39 && (
            <Text style={[styles.statusText, { color: '#F97316' }]}>Fievre modérée</Text>
          )}
          {bodyTempValue >= 39 && (
            <Text style={[styles.statusText, { color: '#EF4444' }]}>Fievre élevée</Text>
          )}
          {bodyTempValue < 36 && (
            <Text style={[styles.statusText, { color: '#3B82F6' }]}>Hypothermie légère</Text>
          )}
          {bodyTempValue >= 36 && bodyTempValue < 37.5 && (
            <Text style={[styles.statusText, { color: colors.success }]}>Normale</Text>
          )}
        </View>
      )}

      {/* Carte Glycémie */}
      {bloodGlucoseValue > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Glycemie</Text>
          <Text style={[styles.heroValue, { color: '#06B6D4' }]}>
            {bloodGlucoseValue.toFixed(1)}
            <Text style={styles.heroUnit}> {bloodGlucoseUnit}</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Derniere mesure</Text>
          {bloodGlucoseValue >= 4.0 && bloodGlucoseValue <= 5.9 && (
            <Text style={[styles.statusText, { color: colors.success }]}>Normale a jeun</Text>
          )}
          {bloodGlucoseValue >= 6.0 && bloodGlucoseValue <= 6.9 && (
            <Text style={[styles.statusText, { color: colors.warning }]}>Légèrement élevée</Text>
          )}
          {bloodGlucoseValue >= 7.0 && (
            <Text style={[styles.statusText, { color: '#EF4444' }]}>Elevée — consulter un médecin</Text>
          )}
          {bloodGlucoseValue < 4.0 && (
            <Text style={[styles.statusText, { color: '#3B82F6' }]}>Basse — hypoglycémie possible</Text>
          )}
        </View>
      )}

      {/* Carte Tension artérielle */}
      {systolic > 0 && diastolic > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Tension artérielle</Text>
          <Text style={[styles.heroValue, { color: '#EF4444' }]}>
            {systolic}
            <Text style={styles.heroUnit}>/{diastolic}</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>mmHg · Derniere mesure</Text>
          {systolic < 120 && diastolic < 80 && (
            <Text style={[styles.statusText, { color: colors.success }]}>Normale</Text>
          )}
          {(systolic >= 120 && systolic < 130) && diastolic < 80 && (
            <Text style={[styles.statusText, { color: colors.warning }]}>Elevée</Text>
          )}
          {(systolic >= 130 || diastolic >= 80) && (
            <Text style={[styles.statusText, { color: '#EF4444' }]}>Hypertension stade 1</Text>
          )}
        </View>
      )}

      {/* Etat vide */}
      {currentHR === 0 && restingHR === 0 && hrvValue === 0 && spO2Value === 0 && respRate === 0 && vo2maxValue === 0 && systolic === 0 && bodyTempValue === 0 && bloodGlucoseValue === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Heart size={40} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune donnée de signes vitaux disponible
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  heroUnit: {
    fontSize: 20,
    fontWeight: '500',
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  subValuesRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  subValueItem: {
    alignItems: 'center',
  },
  subValueNumber: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subValueLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  metricLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricLineLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  metricLineValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metricLineSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
