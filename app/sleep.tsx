import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Moon,
  Sun,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Battery,
  Target,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import {
  getSleepEntries,
  addSleepEntry,
  getSleepStats,
  getSleepGoal,
  setSleepGoal,
  getSleepAdvice,
  formatSleepDuration,
  SleepEntry,
  SleepStats,
} from '@/lib/sleepService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [goal, setGoal] = useState(480); // 8h par défaut
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulaire
  const [bedTime, setBedTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [entriesData, statsData, goalData] = await Promise.all([
        getSleepEntries(),
        getSleepStats(),
        getSleepGoal(),
      ]);
      setEntries(entriesData);
      setStats(statsData);
      setGoal(goalData);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addSleepEntry(bedTime, wakeTime, quality, notes);
      setShowAddModal(false);
      setBedTime('23:00');
      setWakeTime('07:00');
      setQuality(3);
      setNotes('');
      loadData();
      Alert.alert('✅ Enregistré', 'Ton sommeil a été enregistré !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer.');
    }
  };

  const handleGoalChange = async (minutes: number) => {
    const newGoal = Math.max(300, Math.min(600, goal + minutes));
    setGoal(newGoal);
    await setSleepGoal(newGoal);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const advice = stats ? getSleepAdvice(stats.sleepDebtHours) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Sommeil</Text>
        <Moon size={24} color="#8B5CF6" />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Carte principale */}
        <View style={[styles.mainCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.mainHeader}>
            <Battery size={20} color="#8B5CF6" />
            <Text style={[styles.mainTitle, { color: colors.textMuted }]}>DETTE DE SOMMEIL</Text>
          </View>
          <Text style={[styles.debtValue, { color: advice?.severity === 'good' ? '#10B981' : advice?.severity === 'danger' ? '#EF4444' : '#F59E0B' }]}>
            {stats?.sleepDebtHours || 0}<Text style={styles.debtUnit}>h</Text>
          </Text>
          <View style={[styles.adviceBox, { backgroundColor: advice?.severity === 'good' ? '#10B98115' : advice?.severity === 'danger' ? '#EF444415' : '#F59E0B15' }]}>
            {advice?.severity !== 'good' && <AlertTriangle size={14} color={advice?.severity === 'danger' ? '#EF4444' : '#F59E0B'} />}
            {advice?.severity === 'good' && <CheckCircle2 size={14} color="#10B981" />}
            <Text style={[styles.adviceText, { color: advice?.severity === 'good' ? '#10B981' : advice?.severity === 'danger' ? '#EF4444' : '#F59E0B' }]}>
              {advice?.message}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Clock size={16} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats ? formatSleepDuration(stats.averageDuration) : '--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moyenne</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Star size={16} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats?.averageQuality.toFixed(1) || '--'}/5
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Qualité</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            {stats?.trend === 'improving' && <TrendingUp size={16} color="#10B981" />}
            {stats?.trend === 'declining' && <TrendingDown size={16} color="#EF4444" />}
            {stats?.trend === 'stable' && <Target size={16} color={colors.textMuted} />}
            <Text style={[styles.statValue, { color: stats?.trend === 'improving' ? '#10B981' : stats?.trend === 'declining' ? '#EF4444' : colors.textPrimary }]}>
              {stats?.trend === 'improving' ? '↗' : stats?.trend === 'declining' ? '↘' : '→'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tendance</Text>
          </View>
        </View>

        {/* Objectif */}
        <View style={[styles.goalCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.goalTitle, { color: colors.textMuted }]}>OBJECTIF SOMMEIL</Text>
          <View style={styles.goalRow}>
            <TouchableOpacity onPress={() => handleGoalChange(-30)} style={[styles.goalBtn, { backgroundColor: colors.border }]}>
              <Text style={[styles.goalBtnText, { color: colors.textPrimary }]}>-30min</Text>
            </TouchableOpacity>
            <Text style={[styles.goalValue, { color: colors.textPrimary }]}>{formatSleepDuration(goal)}</Text>
            <TouchableOpacity onPress={() => handleGoalChange(30)} style={[styles.goalBtn, { backgroundColor: colors.accent }]}>
              <Text style={styles.goalBtnTextLight}>+30min</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ajouter sommeil */}
        {!showAddModal ? (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => setShowAddModal(true)}>
            <Moon size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Enregistrer ma nuit</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.addTitle, { color: colors.textPrimary }]}>Ma nuit</Text>
            
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Sun size={14} color="#F59E0B" />
                <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Coucher</Text>
                <TextInput
                  style={[styles.timeField, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={bedTime}
                  onChangeText={setBedTime}
                  placeholder="23:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.timeInput}>
                <Moon size={14} color="#8B5CF6" />
                <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Réveil</Text>
                <TextInput
                  style={[styles.timeField, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  placeholder="07:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <Text style={[styles.qualityLabel, { color: colors.textMuted }]}>Qualité du sommeil</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => { setQuality(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Star size={28} color={i <= quality ? '#F59E0B' : colors.border} fill={i <= quality ? '#F59E0B' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.addActions}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Historique */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>HISTORIQUE</Text>
        {entries.slice(0, 7).map((entry) => (
          <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.backgroundCard }]}>
            <View>
              <Text style={[styles.entryDate, { color: colors.textMuted }]}>
                {format(new Date(entry.date), 'EEEE d MMMM', { locale: fr })}
              </Text>
              <Text style={[styles.entryDuration, { color: colors.textPrimary }]}>
                {formatSleepDuration(entry.duration)}
              </Text>
            </View>
            <View style={styles.entryStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={12} color={i <= entry.quality ? '#F59E0B' : colors.border} fill={i <= entry.quality ? '#F59E0B' : 'transparent'} />
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  scrollView: { flex: 1 },
  content: { padding: 16 },

  // Main card
  mainCard: { padding: 20, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  mainHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  mainTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  debtValue: { fontSize: 56, fontWeight: '900' },
  debtUnit: { fontSize: 20, fontWeight: '600' },
  adviceBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 10 },
  adviceText: { fontSize: 11, fontWeight: '600', flex: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 9, fontWeight: '600', marginTop: 2 },

  // Goal
  goalCard: { padding: 16, borderRadius: 14, marginBottom: 12 },
  goalTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  goalBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  goalBtnText: { fontSize: 12, fontWeight: '700' },
  goalBtnTextLight: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  goalValue: { fontSize: 28, fontWeight: '900' },

  // Add
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginBottom: 16 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  addCard: { padding: 16, borderRadius: 14, marginBottom: 16 },
  addTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timeInput: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 10, fontWeight: '600', marginVertical: 4 },
  timeField: { width: '100%', padding: 12, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  qualityLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  addActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Section
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },

  // Entry
  entryCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 8 },
  entryDate: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
  entryDuration: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  entryStars: { flexDirection: 'row', gap: 2 },
});

