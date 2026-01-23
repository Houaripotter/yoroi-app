import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  Share2,
  Trophy,
  Dumbbell,
  Moon,
  Scale,
  Flame,
  Activity,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  AlertTriangle,
} from 'lucide-react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import { generateWeeklyReport, formatReportForSharing, WeeklyReport } from '@/lib/weeklyReportService';
import { formatSleepDuration } from '@/lib/sleepService';
import { getRiskColor, formatLoad } from '@/lib/trainingLoadService';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WeeklyReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const data = await generateWeeklyReport();
      setReport(data);
    } catch (error) {
      logger.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadReport(); }, [loadReport]));

  const handleShare = async () => {
    if (!report) return;
    try {
      notificationAsync(NotificationFeedbackType.Success);
      const text = formatReportForSharing(report);
      await Share.share({ message: text });
    } catch (error) {
      logger.error('Erreur partage:', error);
    }
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'S': return '#FF6B6B';
      case 'A': return '#10B981';
      case 'B': return '#06B6D4';
      case 'C': return '#F59E0B';
      case 'D': return '#F97316';
      case 'F': return '#EF4444';
      default: return colors.textMuted;
    }
  };

  if (!report) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Génération du rapport...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Rapport de Mission</Text>
        <TouchableOpacity onPress={handleShare} style={[styles.shareBtn, { backgroundColor: colors.accent }]}>
          <Share2 size={18} color={colors.textOnGold} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Période */}
        <View style={[styles.periodBadge, { backgroundColor: colors.backgroundCard }]}>
          <FileText size={14} color={colors.accent} />
          <Text style={[styles.periodText, { color: colors.textMuted }]}>
            Semaine {report.weekNumber} • {report.weekStart} - {report.weekEnd}
          </Text>
        </View>

        {/* Grade principal */}
        <View style={[styles.gradeCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(report.verdict.grade) }]}>
            <Text style={styles.gradeText}>{report.verdict.grade}</Text>
          </View>
          <View style={styles.verdictTitleRow}>
            {report.verdict.emoji === 'flame' && <Flame size={22} color={getGradeColor(report.verdict.grade)} />}
            {report.verdict.emoji === 'zap' && <Zap size={22} color={getGradeColor(report.verdict.grade)} />}
            {report.verdict.emoji === 'trophy' && <Trophy size={22} color={getGradeColor(report.verdict.grade)} />}
            {report.verdict.emoji === 'target' && <Target size={22} color={getGradeColor(report.verdict.grade)} />}
            {report.verdict.emoji === 'activity' && <Activity size={22} color={getGradeColor(report.verdict.grade)} />}
            {report.verdict.emoji === 'alert' && <AlertTriangle size={22} color={getGradeColor(report.verdict.grade)} />}
            <Text style={[styles.verdictTitle, { color: colors.textPrimary }]}>{report.verdict.title}</Text>
          </View>
          <Text style={[styles.verdictMessage, { color: colors.textMuted }]}>"{report.verdict.message}"</Text>
          <View style={[styles.scoreBar, { backgroundColor: colors.border }]}>
            <View style={[styles.scoreFill, { width: `${report.overallScore}%`, backgroundColor: getGradeColor(report.verdict.grade) }]} />
          </View>
          <Text style={[styles.scoreText, { color: colors.textMuted }]}>{report.overallScore}/100 pts</Text>
        </View>

        {/* Stats principales */}
        <View style={styles.statsGrid}>
          {/* Entraînements */}
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Dumbbell size={18} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{report.totalTrainings}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Séances</Text>
          </View>
          {/* Temps */}
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <BarChart3 size={18} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{Math.round(report.totalTrainingTime / 60)}h</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Temps</Text>
          </View>
          {/* Streak */}
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Flame size={18} color="#F97316" />
            <Text style={[styles.statValue, { color: '#F97316' }]}>{report.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Streak</Text>
          </View>
          {/* Charge */}
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Activity size={18} color={getRiskColor(report.riskLevel)} />
            <Text style={[styles.statValue, { color: getRiskColor(report.riskLevel) }]}>{formatLoad(report.totalLoad)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Charge</Text>
          </View>
        </View>

        {/* Détails Sommeil */}
        <View style={[styles.detailCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.detailHeader}>
            <Moon size={16} color="#8B5CF6" />
            <Text style={[styles.detailTitle, { color: colors.textMuted }]}>SOMMEIL</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Moyenne</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{report.avgSleepHours}h/nuit</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Qualité</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{report.sleepQuality.toFixed(1)}/5 ⭐</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Dette accumulée</Text>
            <Text style={[styles.detailValue, { color: report.sleepDebtHours > 5 ? '#EF4444' : colors.textPrimary }]}>
              {report.sleepDebtHours}h
            </Text>
          </View>
        </View>

        {/* Détails Poids */}
        <View style={[styles.detailCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.detailHeader}>
            <Scale size={16} color={colors.accent} />
            <Text style={[styles.detailTitle, { color: colors.textMuted }]}>POIDS</Text>
          </View>
          <View style={styles.weightRow}>
            <View style={styles.weightBlock}>
              <Text style={[styles.weightLabel, { color: colors.textMuted }]}>Début</Text>
              <Text style={[styles.weightValue, { color: colors.textPrimary }]}>{report.startWeight || '--'} kg</Text>
            </View>
            <View style={styles.weightArrow}>
              {report.weightChange < 0 ? (
                <TrendingDown size={24} color="#10B981" />
              ) : report.weightChange > 0 ? (
                <TrendingUp size={24} color="#EF4444" />
              ) : (
                <Text style={[styles.arrowText, { color: colors.textMuted }]}>→</Text>
              )}
            </View>
            <View style={styles.weightBlock}>
              <Text style={[styles.weightLabel, { color: colors.textMuted }]}>Fin</Text>
              <Text style={[styles.weightValue, { color: colors.textPrimary }]}>{report.endWeight || '--'} kg</Text>
            </View>
          </View>
          {report.weightChange !== 0 && (
            <View style={[styles.weightChangeBadge, { backgroundColor: report.weightChange < 0 ? '#10B98120' : '#EF444420' }]}>
              <Text style={[styles.weightChangeText, { color: report.weightChange < 0 ? '#10B981' : '#EF4444' }]}>
                {report.weightChange > 0 ? '+' : ''}{report.weightChange.toFixed(1)} kg
              </Text>
            </View>
          )}
        </View>

        {/* Répartition sports */}
        {report.sportBreakdown.length > 0 && (
          <View style={[styles.detailCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.detailHeader}>
              <Trophy size={16} color={colors.accent} />
              <Text style={[styles.detailTitle, { color: colors.textMuted }]}>RÉPARTITION</Text>
            </View>
            {report.sportBreakdown.map((sport, index) => (
              <View key={index} style={styles.sportRow}>
                <Text style={[styles.sportName, { color: colors.textPrimary }]}>{sport.sport}</Text>
                <Text style={[styles.sportCount, { color: colors.textMuted }]}>{sport.count}x • {Math.round(sport.duration / 60)}h</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bouton partage */}
        <TouchableOpacity style={[styles.shareMainBtn, { backgroundColor: colors.accent }]} onPress={handleShare}>
          <Share2 size={18} color="#FFFFFF" />
          <Text style={styles.shareMainBtnText}>Partager mon rapport</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          #YOROI #Discipline #Sport #Fitness
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  shareBtn: { padding: 10, borderRadius: 10 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  loadingText: { textAlign: 'center', marginTop: 100 },

  // Period
  periodBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
  periodText: { fontSize: 12, fontWeight: '600' },

  // Grade
  gradeCard: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
  gradeBadge: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  gradeText: { fontSize: 40, fontWeight: '900', color: '#FFFFFF' },
  verdictTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verdictTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  verdictMessage: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  scoreBar: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  scoreFill: { height: '100%', borderRadius: 4 },
  scoreText: { fontSize: 12, fontWeight: '600' },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: (SCREEN_WIDTH - 48) / 2, padding: 16, borderRadius: 14, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '900', marginTop: 6 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Detail Card
  detailCard: { padding: 16, borderRadius: 14, marginBottom: 12 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  detailTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  detailLabel: { fontSize: 12, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '700' },

  // Weight
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  weightBlock: { alignItems: 'center' },
  weightLabel: { fontSize: 10, fontWeight: '600' },
  weightValue: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  weightArrow: { marginHorizontal: 16 },
  arrowText: { fontSize: 24 },
  weightChangeBadge: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  weightChangeText: { fontSize: 14, fontWeight: '700' },

  // Sport
  sportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  sportName: { fontSize: 13, fontWeight: '600' },
  sportCount: { fontSize: 12, fontWeight: '500' },

  // Share
  shareMainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, marginTop: 8 },
  shareMainBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  footer: { textAlign: 'center', marginTop: 16, fontSize: 11 },
});

