// ============================================
// YOROI - DETAIL NUIT DE SOMMEIL
// ============================================
// Affiche toutes les metriques d'une nuit :
// Phases, efficacite, FC, respiratoire, temperature

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Moon, Clock, Bed, AlarmClock, Heart, Wind,
  Thermometer, Zap, Star, Eye, TrendingDown,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { SleepPhasesBar } from '@/components/stats/advanced/SleepPhasesBar';
import { getSleepEntriesByDate } from '@/lib/sleepService';
import type { SleepEntry } from '@/lib/sleepService';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// HELPERS
// ============================================

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, '0')}min`;
};

const formatDateFull = (date: string): string => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return date; }
};

const getQualityLabel = (quality: number): string => {
  if (quality >= 4.5) return 'Excellente';
  if (quality >= 3.5) return 'Bonne';
  if (quality >= 2.5) return 'Moyenne';
  if (quality >= 1.5) return 'Mediocre';
  return 'Mauvaise';
};

const getQualityColor = (quality: number): string => {
  if (quality >= 4) return '#22C55E';
  if (quality >= 3) return '#06B6D4';
  if (quality >= 2) return '#F59E0B';
  return '#EF4444';
};

const getEfficiencyColor = (eff: number): string => {
  if (eff >= 90) return '#22C55E';
  if (eff >= 80) return '#06B6D4';
  if (eff >= 70) return '#F59E0B';
  return '#EF4444';
};

// ============================================
// MAIN SCREEN
// ============================================

export default function SleepDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ date?: string }>();

  const [entry, setEntry] = useState<SleepEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!params.date) { setLoading(false); return; }
      const entries = await getSleepEntriesByDate(params.date);
      if (entries.length > 0) {
        setEntry(entries[0]);
      }
    } catch (error) {
      logger.error('[SleepDetail] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title={t('sleepDetail.title') || 'Detail Nuit'} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!entry) {
    return (
      <ScreenWrapper>
        <Header title={t('sleepDetail.title') || 'Detail Nuit'} showBack />
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune donnee pour cette nuit
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const qualityColor = getQualityColor(entry.quality);
  const hasPhases = entry.phases && (entry.phases.deep > 0 || entry.phases.rem > 0 || entry.phases.core > 0);
  const hasVitals = entry.sleepHeartRate || entry.respiratoryRate || entry.wristTemperature != null;

  return (
    <ScreenWrapper noPadding>
      <Header title={t('sleepDetail.title') || 'Detail Nuit'} showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ CARTE 1 - EN-TETE ═══ */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.headerRow}>
            <View style={[styles.moonBadge, { backgroundColor: '#8B5CF620' }]}>
              <Moon size={28} color="#8B5CF6" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {formatDateFull(entry.date)}
              </Text>
              <View style={styles.qualityRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    size={16}
                    color={i <= entry.quality ? qualityColor : `${colors.textMuted}40`}
                    fill={i <= entry.quality ? qualityColor : 'transparent'}
                  />
                ))}
                <Text style={[styles.qualityLabel, { color: qualityColor }]}>
                  {getQualityLabel(entry.quality)}
                </Text>
              </View>
            </View>
            {entry.source === 'healthkit' && (
              <View style={[styles.sourceBadge, { backgroundColor: '#FF375F15' }]}>
                <Heart size={12} color="#FF375F" />
                <Text style={styles.sourceText}>Apple</Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══ CARTE 2 - HORAIRES & DUREE ═══ */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.timesRow}>
            <TimeBlock
              icon={<Bed size={20} color="#8B5CF6" />}
              label="Coucher"
              value={entry.bedTime}
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <View style={styles.timeDivider}>
              <View style={[styles.timeLine, { backgroundColor: colors.textMuted + '30' }]} />
              <View style={[styles.durationBubble, { backgroundColor: '#8B5CF615' }]}>
                <Clock size={14} color="#8B5CF6" />
                <Text style={[styles.durationText, { color: '#8B5CF6' }]}>
                  {formatDuration(entry.duration)}
                </Text>
              </View>
              <View style={[styles.timeLine, { backgroundColor: colors.textMuted + '30' }]} />
            </View>
            <TimeBlock
              icon={<AlarmClock size={20} color="#F59E0B" />}
              label="Reveil"
              value={entry.wakeTime}
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
          </View>
        </View>

        {/* ═══ CARTE 3 - PHASES DE SOMMEIL ═══ */}
        {hasPhases && entry.phases && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('sleepDetail.phases') || 'Phases de sommeil'}
            </Text>
            <SleepPhasesBar
              phases={[
                { type: 'deep' as const, duration: entry.phases.deep },
                { type: 'light' as const, duration: entry.phases.core },
                { type: 'rem' as const, duration: entry.phases.rem },
                { type: 'awake' as const, duration: entry.phases.awake },
              ].filter(p => p.duration > 0)}
              height={50}
            />

            {/* Detail des phases en grille */}
            <View style={styles.phasesGrid}>
              <PhaseItem
                label="Profond"
                minutes={entry.phases.deep}
                total={entry.duration}
                color="#0093E7"
                textColor={colors.text}
                mutedColor={colors.textMuted}
              />
              <PhaseItem
                label="Leger"
                minutes={entry.phases.core}
                total={entry.duration}
                color="#7BA1BB"
                textColor={colors.text}
                mutedColor={colors.textMuted}
              />
              <PhaseItem
                label="REM"
                minutes={entry.phases.rem}
                total={entry.duration}
                color="#00F19F"
                textColor={colors.text}
                mutedColor={colors.textMuted}
              />
              <PhaseItem
                label="Eveils"
                minutes={entry.phases.awake}
                total={entry.duration}
                color="#FF0026"
                textColor={colors.text}
                mutedColor={colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* ═══ CARTE 4 - EFFICACITE & INTERRUPTIONS ═══ */}
        {(entry.efficiency != null || entry.interruptions != null) && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('sleepDetail.efficiency') || 'Efficacite'}
            </Text>
            <View style={styles.efficiencyRow}>
              {entry.efficiency != null && (
                <View style={styles.efficiencyItem}>
                  <Text style={[styles.efficiencyValue, { color: getEfficiencyColor(entry.efficiency) }]}>
                    {entry.efficiency}%
                  </Text>
                  <Text style={[styles.efficiencyLabel, { color: colors.textMuted }]}>
                    Efficacite
                  </Text>
                  <View style={styles.efficiencyBarBg}>
                    <View style={[
                      styles.efficiencyBarFill,
                      { width: `${entry.efficiency}%`, backgroundColor: getEfficiencyColor(entry.efficiency) },
                    ]} />
                  </View>
                </View>
              )}
              {entry.interruptions != null && (
                <View style={styles.efficiencyItem}>
                  <Text style={[styles.efficiencyValue, {
                    color: entry.interruptions <= 2 ? '#22C55E' : entry.interruptions <= 5 ? '#F59E0B' : '#EF4444',
                  }]}>
                    {entry.interruptions}
                  </Text>
                  <Text style={[styles.efficiencyLabel, { color: colors.textMuted }]}>
                    {entry.interruptions <= 1 ? 'Reveil' : 'Reveils'}
                  </Text>
                  <Eye size={20} color={colors.textMuted} style={{ marginTop: 8 }} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ═══ CARTE 5 - SIGNES VITAUX ═══ */}
        {hasVitals && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('sleepDetail.vitals') || 'Signes vitaux'}
            </Text>
            <View style={styles.vitalsGrid}>
              {entry.sleepHeartRate && (
                <VitalCard
                  icon={<Heart size={18} color="#EF4444" />}
                  label="FC sommeil"
                  value={`${entry.sleepHeartRate.min}-${entry.sleepHeartRate.max}`}
                  unit="bpm"
                  sub={`Moy: ${entry.sleepHeartRate.avg} bpm`}
                  textColor={colors.text}
                  mutedColor={colors.textMuted}
                  cardBg={`${colors.text}08`}
                />
              )}
              {entry.respiratoryRate && (
                <VitalCard
                  icon={<Wind size={18} color="#06B6D4" />}
                  label="Respiration"
                  value={`${entry.respiratoryRate.min}-${entry.respiratoryRate.max}`}
                  unit="resp/min"
                  textColor={colors.text}
                  mutedColor={colors.textMuted}
                  cardBg={`${colors.text}08`}
                />
              )}
              {entry.wristTemperature != null && (
                <VitalCard
                  icon={<Thermometer size={18} color="#F59E0B" />}
                  label="Temperature"
                  value={entry.wristTemperature > 0 ? `+${entry.wristTemperature.toFixed(1)}` : entry.wristTemperature.toFixed(1)}
                  unit="°C"
                  sub="vs baseline"
                  textColor={colors.text}
                  mutedColor={colors.textMuted}
                  cardBg={`${colors.text}08`}
                />
              )}
            </View>
          </View>
        )}

        {/* ═══ CARTE 6 - NOTES ═══ */}
        {entry.notes && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Notes
            </Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {entry.notes}
            </Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

const TimeBlock: React.FC<{
  icon: React.ReactNode; label: string; value: string;
  textColor: string; mutedColor: string;
}> = ({ icon, label, value, textColor, mutedColor }) => (
  <View style={styles.timeBlock}>
    {icon}
    <Text style={[styles.timeValue, { color: textColor }]}>{value}</Text>
    <Text style={[styles.timeLabel, { color: mutedColor }]}>{label}</Text>
  </View>
);

const PhaseItem: React.FC<{
  label: string; minutes: number; total: number; color: string;
  textColor: string; mutedColor: string;
}> = ({ label, minutes, total, color, textColor, mutedColor }) => {
  const pct = total > 0 ? Math.round((minutes / total) * 100) : 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <View style={styles.phaseItem}>
      <View style={[styles.phaseDot, { backgroundColor: color }]} />
      <Text style={[styles.phaseLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.phaseTime, { color: textColor }]}>{timeStr}</Text>
      <Text style={[styles.phasePct, { color: mutedColor }]}>{pct}%</Text>
    </View>
  );
};

const VitalCard: React.FC<{
  icon: React.ReactNode; label: string; value: string;
  unit: string; sub?: string;
  textColor: string; mutedColor: string; cardBg: string;
}> = ({ icon, label, value, unit, sub, textColor, mutedColor, cardBg }) => (
  <View style={[styles.vitalCard, { backgroundColor: cardBg }]}>
    {icon}
    <Text style={[styles.vitalLabel, { color: mutedColor }]}>{label}</Text>
    <Text style={[styles.vitalValue, { color: textColor }]}>
      {value} <Text style={[styles.vitalUnit, { color: mutedColor }]}>{unit}</Text>
    </Text>
    {sub && <Text style={[styles.vitalSub, { color: mutedColor }]}>{sub}</Text>}
  </View>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },

  card: {
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moonBadge: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  dateText: { fontSize: 15, fontWeight: '600' },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  qualityLabel: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  sourceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  sourceText: { fontSize: 10, fontWeight: '700', color: '#FF375F' },

  // Times
  timesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeBlock: { alignItems: 'center', gap: 4, width: 80 },
  timeValue: { fontSize: 24, fontWeight: '700' },
  timeLabel: { fontSize: 12, fontWeight: '500' },
  timeDivider: { flex: 1, alignItems: 'center', gap: 4 },
  timeLine: { width: 1, height: 16 },
  durationBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  durationText: { fontSize: 14, fontWeight: '700' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Phases grid
  phasesGrid: { marginTop: 12, gap: 10 },
  phaseItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  phaseLabel: { fontSize: 14, fontWeight: '500', width: 70 },
  phaseTime: { fontSize: 14, fontWeight: '700', flex: 1 },
  phasePct: { fontSize: 13, width: 35, textAlign: 'right' },

  // Efficiency
  efficiencyRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 24 },
  efficiencyItem: { alignItems: 'center', flex: 1 },
  efficiencyValue: { fontSize: 32, fontWeight: '800' },
  efficiencyLabel: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  efficiencyBarBg: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.05)', marginTop: 10, overflow: 'hidden',
  },
  efficiencyBarFill: { height: '100%', borderRadius: 3 },

  // Vitals
  vitalsGrid: { gap: 10 },
  vitalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
  },
  vitalLabel: { fontSize: 12, fontWeight: '500', width: 80 },
  vitalValue: { fontSize: 17, fontWeight: '700', flex: 1 },
  vitalUnit: { fontSize: 12, fontWeight: '400' },
  vitalSub: { fontSize: 11 },

  // Notes
  notesText: { fontSize: 14, lineHeight: 20 },
});
