import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScrollableLineChart } from '../../charts/ScrollableLineChart';
import { Heart, Zap, Activity, Wind } from 'lucide-react-native';

interface SignesVitauxTabProps {
  heartRate: any;
  hrv: any;
  oxygenSaturation: any;
  respiratoryRate: any;
  heartRateHistory: { date: string; value: number }[];
  hrvHistory: { date: string; value: number }[];
  spo2History?: { date: string; value: number }[];
  respiratoryRateHistory?: { date: string; value: number }[];
  onMetricPress?: (metric: { key: string; label: string; color: string; unit: string; icon: React.ReactNode }) => void;
}

export const SignesVitauxTab: React.FC<SignesVitauxTabProps> = ({
  heartRate,
  hrv,
  oxygenSaturation,
  respiratoryRate,
  heartRateHistory,
  hrvHistory,
  spo2History = [],
  respiratoryRateHistory = [],
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

  return (
    <View>
      {/* Carte FC */}
      {(currentHR > 0 || restingHR > 0) && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
          activeOpacity={0.7}
          onPress={() => onMetricPress?.({
            key: 'heart_rate',
            label: 'Frequence cardiaque',
            color: '#EC4899',
            unit: 'bpm',
            icon: <Heart size={18} color="#EC4899" strokeWidth={2.5} />,
          })}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Frequence cardiaque</Text>
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
          {heartRateHistory.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={heartRateHistory}
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

          {/* Graphique inline */}
          {hrvHistory.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={hrvHistory}
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

          {spo2History.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={spo2History}
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
            label: 'Frequence respiratoire',
            color: '#8B5CF6',
            unit: 'resp/min',
            icon: <Wind size={18} color="#8B5CF6" strokeWidth={2.5} />,
          })}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Frequence respiratoire</Text>
          <Text style={[styles.heroValue, { color: '#8B5CF6' }]}>
            {Math.round(respRate)}
            <Text style={styles.heroUnit}> resp/min</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Derniere mesure</Text>
          {respRate >= 12 && respRate <= 20 && (
            <Text style={[styles.statusText, { color: colors.success }]}>Normal (12-20 resp/min)</Text>
          )}

          {respiratoryRateHistory.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <ScrollableLineChart
                data={respiratoryRateHistory}
                color="#8B5CF6"
                unit="resp/min"
                height={160}
                compact
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Etat vide */}
      {currentHR === 0 && restingHR === 0 && hrvValue === 0 && spO2Value === 0 && respRate === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Heart size={40} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune donnee de signes vitaux disponible
          </Text>
        </View>
      )}
    </View>
  );
};

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
});
