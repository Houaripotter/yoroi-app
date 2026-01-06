import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Switch,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
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
  Bell,
  BellOff,
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
import { notificationService, NotificationSettings } from '@/lib/notificationService';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [goal, setGoal] = useState(480); // 8h par défaut
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulaire
  const [bedTime, setBedTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [bedtimeReminder, setBedtimeReminder] = useState('22:30');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

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

      // Charger les paramètres de notifications
      const notifSettings = notificationService.getSettings();
      setNotificationsEnabled(notifSettings.sleep.enabled);
      setBedtimeReminder(notifSettings.sleep.bedtimeReminder);
    } catch (error) {
      logger.error('Erreur:', error);
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
      showPopup('Enregistre', 'Ton sommeil a ete enregistre !', [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      showPopup('Erreur', 'Impossible d\'enregistrer.', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleGoalChange = async (minutes: number) => {
    const newGoal = Math.max(300, Math.min(600, goal + minutes));
    setGoal(newGoal);
    await setSleepGoal(newGoal);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const settings = notificationService.getSettings();
    await notificationService.updateSettings({
      sleep: {
        ...settings.sleep,
        enabled: value,
      },
    });

    if (value) {
      showPopup('Active', 'Tu recevras un rappel pour aller dormir !', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleSaveBedtimeReminder = async () => {
    const settings = notificationService.getSettings();
    await notificationService.updateSettings({
      sleep: {
        ...settings.sleep,
        bedtimeReminder,
      },
    });
    setShowNotificationSettings(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showPopup('Enregistre', `Rappel programme a ${bedtimeReminder}`, [{ text: 'OK', style: 'primary' }]);
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
            <View style={[styles.mainIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Battery size={24} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.mainTitle, { color: colors.textMuted }]}>DETTE DE SOMMEIL</Text>
          </View>
          <Text style={[styles.debtValue, { color: advice?.severity === 'good' ? '#10B981' : advice?.severity === 'danger' ? '#EF4444' : '#F59E0B' }]}>
            {stats?.sleepDebtHours || 0}<Text style={styles.debtUnit}>h</Text>
          </Text>
          <View style={[styles.adviceBox, { backgroundColor: advice?.severity === 'good' ? '#10B98120' : advice?.severity === 'danger' ? '#EF444420' : '#F59E0B20' }]}>
            <View style={[styles.adviceIconContainer, { backgroundColor: advice?.severity === 'good' ? '#10B98130' : advice?.severity === 'danger' ? '#EF444430' : '#F59E0B30' }]}>
              {advice?.severity !== 'good' && <AlertTriangle size={16} color={advice?.severity === 'danger' ? '#EF4444' : '#F59E0B'} strokeWidth={2.5} />}
              {advice?.severity === 'good' && <CheckCircle2 size={16} color="#10B981" strokeWidth={2.5} />}
            </View>
            <Text style={[styles.adviceText, { color: advice?.severity === 'good' ? '#10B981' : advice?.severity === 'danger' ? '#EF4444' : '#F59E0B' }]}>
              {advice?.message}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Clock size={18} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats ? formatSleepDuration(stats.averageDuration) : '--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moyenne</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B15' }]}>
              <Star size={18} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats?.averageQuality.toFixed(1) || '--'}/5
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Qualité</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: stats?.trend === 'improving' ? '#10B98115' : stats?.trend === 'declining' ? '#EF444415' : colors.border }]}>
              {stats?.trend === 'improving' && <TrendingUp size={18} color="#10B981" strokeWidth={2.5} />}
              {stats?.trend === 'declining' && <TrendingDown size={18} color="#EF4444" strokeWidth={2.5} />}
              {stats?.trend === 'stable' && <Target size={18} color={colors.textMuted} strokeWidth={2.5} />}
            </View>
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
              <Text style={[styles.goalBtnTextLight, { color: colors.textOnGold }]}>+30min</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.notificationCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.notificationHeader}>
            {notificationsEnabled ? <Bell size={18} color="#8B5CF6" /> : <BellOff size={18} color={colors.textMuted} />}
            <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>Rappel coucher</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: '#8B5CF680' }}
              thumbColor={notificationsEnabled ? '#8B5CF6' : colors.textMuted}
            />
          </View>

          {notificationsEnabled && (
            <>
              <Text style={[styles.notificationSubtext, { color: colors.textMuted }]}>
                Reçois un rappel pour aller dormir et atteindre ton objectif
              </Text>

              {!showNotificationSettings ? (
                <TouchableOpacity
                  style={[styles.notificationTimeButton, { backgroundColor: colors.background }]}
                  onPress={() => setShowNotificationSettings(true)}
                >
                  <Clock size={16} color="#8B5CF6" />
                  <Text style={[styles.notificationTimeText, { color: colors.textPrimary }]}>
                    Rappel à {bedtimeReminder}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.notificationTimeEditor}>
                  <Text style={[styles.notificationLabel, { color: colors.textMuted }]}>Heure du rappel</Text>
                  <TextInput
                    style={[styles.notificationTimeInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={bedtimeReminder}
                    onChangeText={setBedtimeReminder}
                    placeholder="22:30"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                  <View style={styles.notificationActions}>
                    <TouchableOpacity
                      onPress={() => setShowNotificationSettings(false)}
                      style={[styles.notificationCancelBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.notificationCancelText, { color: colors.textMuted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveBedtimeReminder}
                      style={[styles.notificationSaveBtn, { backgroundColor: '#8B5CF6' }]}
                    >
                      <Text style={styles.notificationSaveText}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Protocole Sommeil */}
        <View style={[styles.protocolCard, { backgroundColor: colors.backgroundCard, borderColor: '#8B5CF620', borderWidth: 1 }]}>
          <View style={styles.protocolHeader}>
            <CheckCircle2 size={18} color="#8B5CF6" />
            <Text style={[styles.protocolTitle, { color: colors.textPrimary }]}>Protocole Sommeil</Text>
          </View>
          <Text style={[styles.protocolText, { color: colors.textSecondary }]}>
            💤 Avant de dormir, pense à faire ton check-up :
          </Text>
          <View style={styles.protocolList}>
            <Text style={[styles.protocolItem, { color: colors.textMuted }]}>• Enregistrer ta nuit (heure coucher/réveil)</Text>
            <Text style={[styles.protocolItem, { color: colors.textMuted }]}>• Noter la qualité de ton sommeil</Text>
            <Text style={[styles.protocolItem, { color: colors.textMuted }]}>• Ajouter des notes si besoin</Text>
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
      <PopupComponent />
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
  mainCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  mainHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  mainIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  debtValue: { fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  debtUnit: { fontSize: 24, fontWeight: '700', letterSpacing: -1 },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16
  },
  adviceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adviceText: { fontSize: 13, fontWeight: '700', flex: 1, letterSpacing: -0.2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Goal
  goalCard: { padding: 16, borderRadius: 14, marginBottom: 12 },
  goalTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  goalBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  goalBtnText: { fontSize: 12, fontWeight: '700' },
  goalBtnTextLight: { fontSize: 12, fontWeight: '700' },
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

  // Notifications
  notificationCard: { padding: 16, borderRadius: 14, marginBottom: 12 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notificationTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  notificationSubtext: { fontSize: 11, fontWeight: '500', marginTop: 8, lineHeight: 16 },
  notificationTimeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, marginTop: 12 },
  notificationTimeText: { fontSize: 14, fontWeight: '700' },
  notificationTimeEditor: { marginTop: 16 },
  notificationLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  notificationTimeInput: { padding: 12, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  notificationActions: { flexDirection: 'row', gap: 10 },
  notificationCancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  notificationCancelText: { fontSize: 14, fontWeight: '600' },
  notificationSaveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  notificationSaveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Protocole
  protocolCard: { padding: 16, borderRadius: 14, marginBottom: 12 },
  protocolHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  protocolTitle: { fontSize: 14, fontWeight: '700' },
  protocolText: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  protocolList: { gap: 6 },
  protocolItem: { fontSize: 12, lineHeight: 18 },
});

