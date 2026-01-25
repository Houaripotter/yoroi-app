// ============================================
// STATS DETAIL MODAL - Modal avec graphique complet et sélecteur de période
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { X, TrendingUp, TrendingDown, Minus, BookOpen, AlertTriangle, ExternalLink } from 'lucide-react-native';
import { ModernLineChart } from './charts/ModernLineChart';
import { MetricRangeIndicator, MetricRange } from './charts/MetricRangeIndicator';
import { getMetricRange } from '@/constants/metricRanges';
import { getUserSettings } from '@/lib/storage';
import { getProfile } from '@/lib/database';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

type Period = '30j' | '90j' | '6m' | '1a';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '30j', label: '30J' },
  { value: '90j', label: '90J' },
  { value: '6m', label: '6M' },
  { value: '1a', label: '1A' },
];

const getPeriodDays = (period: Period): number => {
  switch (period) {
    case '30j': return 30;
    case '90j': return 90;
    case '6m': return 180;
    case '1a': return 365;
    default: return 30;
  }
};

interface SleepPhases {
  deep: number;  // minutes
  rem: number;   // minutes
  core: number;  // minutes (light sleep)
}

interface SleepData {
  startTime?: string;  // ISO string
  endTime?: string;    // ISO string
  duration: number;    // minutes
  phases?: SleepPhases;
  quality?: number;    // 0-100
}

interface StatsDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: { value: number; label: string; date?: string }[];
  color: string;
  unit: string;
  icon: React.ReactNode;
  metricKey?: string;
  healthRange?: MetricRange; // Range directement passé (comme HistoryScrollCard)
  sleepData?: SleepData; // Données enrichies pour le sommeil
}

export const StatsDetailModal: React.FC<StatsDetailModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  data,
  color,
  unit,
  icon,
  metricKey,
  healthRange: passedHealthRange,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [userAge, setUserAge] = useState(30);
  const [userWeight, setUserWeight] = useState(75);
  const [userHeight, setUserHeight] = useState<number | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);

  // Charger les paramètres utilisateur au montage
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settings, profile] = await Promise.all([
          getUserSettings(),
          getProfile()
        ]);
        setUserGender(settings.gender as 'male' | 'female' || 'male');
        setUserWeight(settings.weight_goal || 75);

        // Récupérer la taille du profil
        if (profile?.height_cm) {
          setUserHeight(profile.height_cm);
        } else {
          setUserHeight(null);
          // Vérifier si on a besoin de la taille pour cette métrique
          if (metricKey === 'bmi' || metricKey === 'bmr') {
            setMissingProfile(true);
          }
        }

        // Calculer l'âge depuis la date de naissance
        if (profile?.birth_date) {
          const birthDate = new Date(profile.birth_date);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          setUserAge(age);
        } else if (metricKey === 'bmr' || metricKey === 'vo2Max') {
          setMissingProfile(true);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    if (visible) {
      loadSettings();
    }
  }, [visible, metricKey]);

  // Filtrer les données selon la période sélectionnée
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const days = getPeriodDays(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return data.filter(item => {
      if (!item.date) return true;
      return new Date(item.date) >= cutoffDate;
    });
  }, [data, selectedPeriod]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const values = filteredData.map(d => d.value);
    const latest = values[values.length - 1];
    const first = values[0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const change = latest - first;
    const changePercent = first !== 0 ? (change / first) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 2) trend = 'up';
    else if (changePercent < -2) trend = 'down';

    return { latest, first, min, max, avg, change, changePercent, trend };
  }, [filteredData]);

  const handlePeriodChange = (period: Period) => {
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Light);
    }
    setSelectedPeriod(period);
  };

  // Mapper les clés de metrics vers les clés de metricRanges
  const getMetricRangeKey = (key?: string): string | null => {
    if (!key) return null;
    const mapping: Record<string, string> = {
      'visceral_fat': 'visceralFat',
      'fat_percent': 'bodyFat',
      'muscle_percent': 'muscleMass',
      'bone_mass': 'boneMass',
      'water_percent': 'waterPercentage',
      'bmr': 'bmr',
      'resting_hr': 'restingHR',
      'heart_rate': 'restingHR',
      'vo2_max': 'vo2Max',
      'bmi': 'bmi',
      'sleep': 'sleepHours',
      'sleep_quality': 'sleepQuality',
      'hrv': 'hrv',
      'waist': 'waistCircumference',
    };
    return mapping[key] || null;
  };

  const rangeKey = getMetricRangeKey(metricKey);
  // Utiliser le healthRange passé en priorité, sinon essayer de le récupérer via metricKey
  const metricRange = passedHealthRange || (rangeKey
    ? getMetricRange(rangeKey, userGender, {
        weight: userWeight,
        height: userHeight || 175,
        age: userAge,
      })
    : null);

  const handleInfoPress = () => {
    if (metricRange?.explanation) {
      showPopup(title, metricRange.explanation, [{ text: 'OK', style: 'primary' }]);
    }
  };

  const getTrendIcon = () => {
    if (!stats) return null;
    const iconSize = 16;
    switch (stats.trend) {
      case 'up':
        return <TrendingUp size={iconSize} color="#2BCBBA" strokeWidth={2.5} />;
      case 'down':
        return <TrendingDown size={iconSize} color="#FC5C65" strokeWidth={2.5} />;
      default:
        return <Minus size={iconSize} color={colors.textMuted} strokeWidth={2.5} />;
    }
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                {icon}
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {title}
                </Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Sélecteur de période */}
          <View style={styles.periodContainer}>
            {PERIODS.map((period) => {
              const isSelected = selectedPeriod === period.value;
              return (
                <TouchableOpacity
                  key={period.value}
                  onPress={() => handlePeriodChange(period.value)}
                  activeOpacity={0.7}
                  style={[
                    styles.periodPill,
                    {
                      backgroundColor: isSelected ? color : colors.backgroundCard,
                      borderColor: isSelected ? color : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Valeur actuelle avec tendance */}
            {stats && (
              <View style={[styles.currentValueCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.currentValueRow}>
                  <View>
                    <Text style={[styles.currentValueLabel, { color: colors.textMuted }]}>
                      {t('statsModal.currentValue')}
                    </Text>
                    <Text style={[styles.currentValue, { color: color }]}>
                      {stats.latest.toFixed(1)}
                      <Text style={[styles.currentValueUnit, { color: colors.textMuted }]}> {unit}</Text>
                    </Text>
                  </View>
                  <View style={[styles.trendBadge, { backgroundColor: stats.trend === 'up' ? '#2BCBBA20' : stats.trend === 'down' ? '#FC5C6520' : colors.border }]}>
                    {getTrendIcon()}
                    <Text style={[styles.trendText, { color: stats.trend === 'up' ? '#2BCBBA' : stats.trend === 'down' ? '#FC5C65' : colors.textMuted }]}>
                      {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(1)} {unit}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Avertissement données profil manquantes */}
            {missingProfile && (
              <View style={[styles.warningCard, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
                <AlertTriangle size={20} color="#F59E0B" strokeWidth={2.5} />
                <View style={styles.warningContent}>
                  <Text style={[styles.warningTitle, { color: '#F59E0B' }]}>
                    {t('statsModal.missingProfileData')}
                  </Text>
                  <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                    {t('statsModal.missingProfileDescription')}
                  </Text>
                </View>
              </View>
            )}

            {/* Indicateur de range si disponible */}
            {metricRange && stats && stats.latest > 0 && (
              <View style={[styles.rangeCard, { backgroundColor: colors.backgroundCard }]}>
                <MetricRangeIndicator
                  value={stats.latest}
                  range={metricRange}
                  onInfoPress={handleInfoPress}
                />
              </View>
            )}

            {/* Section Explication Scientifique */}
            {metricRange?.explanation && (
              <View style={[styles.scienceCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.scienceHeader}>
                  <BookOpen size={18} color={colors.accentText} strokeWidth={2.5} />
                  <Text style={[styles.scienceTitle, { color: colors.textPrimary }]}>
                    {t('statsModal.scientificExplanation')}
                  </Text>
                </View>
                <Text style={[styles.scienceText, { color: colors.textSecondary }]}>
                  {metricRange.explanation}
                </Text>
                {metricRange.source && (
                  <TouchableOpacity
                    style={[styles.scienceSourceContainer, { backgroundColor: metricRange.sourceUrl ? colors.accent + '15' : 'transparent' }]}
                    onPress={() => {
                      if (metricRange.sourceUrl) {
                        Linking.openURL(metricRange.sourceUrl);
                      }
                    }}
                    disabled={!metricRange.sourceUrl}
                    activeOpacity={metricRange.sourceUrl ? 0.7 : 1}
                  >
                    <Text style={[styles.scienceSource, { color: metricRange.sourceUrl ? (isDark ? colors.accent : colors.textPrimary) : colors.textMuted }]}>
                      Source: {metricRange.source}
                    </Text>
                    {metricRange.sourceUrl && (
                      <ExternalLink size={14} color={isDark ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Graphique complet */}
            <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                {t('statsModal.evolutionOver')} {selectedPeriod === '30j' ? t('statsModal.30days') : selectedPeriod === '90j' ? t('statsModal.90days') : selectedPeriod === '6m' ? t('statsModal.6months') : t('statsModal.1year')}
              </Text>
              {filteredData.length > 0 ? (
                <ModernLineChart
                  data={filteredData}
                  color={color}
                  height={260}
                  showGrid={true}
                  showGradient={true}
                  maxDataPoints={selectedPeriod === '1a' ? 60 : selectedPeriod === '6m' ? 45 : 30}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={[styles.noDataText, { color: colors.textMuted }]}>
                    {t('statsModal.noDataForPeriod')}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats supplémentaires */}
            {stats && (
              <View style={[styles.statsCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>
                  {t('statsModal.detailedStats')}
                </Text>
                <View style={styles.statsGrid}>
                  <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('statsModal.min')}</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {stats.min.toFixed(1)} {unit}
                    </Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('statsModal.max')}</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {stats.max.toFixed(1)} {unit}
                    </Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('statsModal.avg')}</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {stats.avg.toFixed(1)} {unit}
                    </Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('statsModal.evolution')}</Text>
                    <Text style={[styles.statValue, { color: stats.changePercent >= 0 ? '#2BCBBA' : '#FC5C65' }]}>
                      {stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <PopupComponent />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  periodPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  periodText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  currentValueCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  currentValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentValueLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  currentValueUnit: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '700',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  rangeCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scienceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scienceTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  scienceText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 12,
  },
  scienceSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  scienceSource: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
