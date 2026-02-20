import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Moon,
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
  Minus,
  Calendar,
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { format, Locale } from 'date-fns';
import { fr, enUS, es, pt, de, it, ru, ar, zhCN } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import {
  getSleepEntries,
  getSleepStats,
  getSleepGoal,
  setSleepGoal,
  getSleepAdvice,
  formatSleepDuration,
  SleepEntry,
  SleepStats,
} from '@/lib/sleepService';
import { notificationService } from '@/lib/notificationService';
import logger from '@/lib/security/logger';

// Map des locales date-fns par langue
const DATE_LOCALES: Record<string, Locale> = {
  fr, en: enUS, es, pt, de, it, ru, ar, zh: zhCN
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Couleur de qualité
const getQualityColor = (quality: number): string => {
  if (quality <= 1) return '#EF4444';
  if (quality <= 2) return '#F97316';
  if (quality <= 3) return '#F59E0B';
  if (quality <= 4) return '#10B981';
  return '#8B5CF6';
};

// Couleur de durée
const getDurationColor = (minutes: number): string => {
  if (minutes < 300) return '#EF4444';
  if (minutes < 420) return '#F59E0B';
  if (minutes <= 540) return '#10B981';
  return '#3B82F6';
};

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { t, language } = useI18n();
  const dateLocale = DATE_LOCALES[language] || fr;

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [goal, setGoal] = useState(480);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [bedtimeReminder, setBedtimeReminder] = useState('22:30');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Flag pour recharger après retour de sleep-input
  const needsReload = useRef(false);

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

      const notifSettings = notificationService.getSettings();
      setNotificationsEnabled(notifSettings.sleep.enabled);
      setBedtimeReminder(notifSettings.sleep.bedtimeReminder);
    } catch (error) {
      logger.error('Erreur:', error);
    }
  }, []);

  // Charger une seule fois au montage
  useEffect(() => { loadData(); }, []);

  // Recharger quand on revient de sleep-input seulement (pas à chaque focus)
  useFocusEffect(
    useCallback(() => {
      if (needsReload.current) {
        needsReload.current = false;
        // Refresh après ajout d'une nuit
        getSleepEntries().then(setEntries);
        getSleepStats().then(setStats);
      }
    }, [])
  );

  const handleGoalChange = async (minutes: number) => {
    try {
      const newGoal = Math.max(300, Math.min(600, goal + minutes));
      setGoal(newGoal);
      await setSleepGoal(newGoal);
      impactAsync(ImpactFeedbackStyle.Light);
    } catch (error) {
      logger.error('Erreur sauvegarde objectif sommeil:', error);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    impactAsync(ImpactFeedbackStyle.Light);

    const settings = notificationService.getSettings();
    await notificationService.updateSettings({
      sleep: {
        ...settings.sleep,
        enabled: value,
      },
    });

    if (value) {
      showPopup(t('sleep.activated'), t('sleep.reminderActivatedMessage'), [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleSaveBedtimeReminder = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const settings = notificationService.getSettings();
      await notificationService.updateSettings({
        sleep: {
          ...settings.sleep,
          bedtimeReminder,
        },
      });
      setShowNotificationSettings(false);
      notificationAsync(NotificationFeedbackType.Success);
      showPopup(t('sleep.saved'), t('sleep.reminderScheduled', { time: bedtimeReminder }), [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const advice = stats ? getSleepAdvice(stats.sleepDebtHours) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity
          disabled={isNavigating}
          onPress={() => {
            if (!isNavigating) {
              setIsNavigating(true);
              setTimeout(() => setIsNavigating(false), 1000);
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('sleep.title')}</Text>
        <Moon size={24} color="#8B5CF6" />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Carte principale */}
        <View style={[styles.mainCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.mainHeader}>
            <View style={[styles.mainIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Battery size={24} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.mainTitle, { color: colors.textMuted }]}>{t('sleep.sleepDebt')}</Text>
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
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('sleep.average')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B15' }]}>
              <Star size={18} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats ? (stats.averageQuality % 1 === 0 ? `${stats.averageQuality}` : `${stats.averageQuality.toFixed(1)}`) : '--'}/5
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('sleep.quality')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: stats?.trend === 'improving' ? '#10B98115' : stats?.trend === 'declining' ? '#EF444415' : colors.border }]}>
              {stats?.trend === 'improving' && <TrendingUp size={18} color="#10B981" strokeWidth={2.5} />}
              {stats?.trend === 'declining' && <TrendingDown size={18} color="#EF4444" strokeWidth={2.5} />}
              {stats?.trend === 'stable' && <Target size={18} color={colors.textMuted} strokeWidth={2.5} />}
            </View>
            <View style={{ alignItems: 'center', marginVertical: 4 }}>
              {stats?.trend === 'improving' ? (
                <TrendingUp size={20} color="#10B981" strokeWidth={2.5} />
              ) : stats?.trend === 'declining' ? (
                <TrendingDown size={20} color="#EF4444" strokeWidth={2.5} />
              ) : (
                <Minus size={20} color={colors.textPrimary} strokeWidth={2.5} />
              )}
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('sleep.trend')}</Text>
          </View>
        </View>

        {/* Objectif */}
        <View style={[styles.goalCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.goalTitle, { color: colors.textMuted }]}>{t('sleep.sleepGoal')}</Text>
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
            <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>{t('sleep.bedtimeReminder')}</Text>
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
                {t('sleep.reminderDescription')}
              </Text>

              {!showNotificationSettings ? (
                <TouchableOpacity
                  style={[styles.notificationTimeButton, { backgroundColor: colors.background }]}
                  onPress={() => setShowNotificationSettings(true)}
                >
                  <Clock size={16} color="#8B5CF6" />
                  <Text style={[styles.notificationTimeText, { color: colors.textPrimary }]}>
                    {t('sleep.reminderAt', { time: bedtimeReminder })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.notificationTimeEditor}>
                  <Text style={[styles.notificationLabel, { color: colors.textMuted }]}>{t('sleep.reminderTime')}</Text>
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
                      <Text style={[styles.notificationCancelText, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={isSaving}
                      onPress={handleSaveBedtimeReminder}
                      style={[styles.notificationSaveBtn, { backgroundColor: '#8B5CF6' }]}
                    >
                      <Text style={styles.notificationSaveText}>{t('common.save')}</Text>
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
            <Text style={[styles.protocolTitle, { color: colors.textPrimary }]}>{t('sleep.sleepProtocol')}</Text>
          </View>
          <Text style={[styles.protocolText, { color: colors.textSecondary }]}>
            {t('sleep.protocolDescription')}
          </Text>
          <View style={styles.protocolList}>
            <Text style={[styles.protocolItem, { color: colors.textMuted }]}>{t('sleep.protocolItem1')}</Text>
            <Text style={[styles.protocolItem, { color: colors.textMuted }]}>{t('sleep.protocolItem2')}</Text>
            <Text style={[styles.protocolItem, { color: colors.textMuted }]}>{t('sleep.protocolItem3')}</Text>
          </View>
        </View>

        {/* Ajouter sommeil */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#8B5CF6' }]}
          onPress={() => {
            needsReload.current = true;
            router.push('/sleep-input');
          }}
        >
          <Moon size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>{t('sleep.recordMyNight')}</Text>
        </TouchableOpacity>

        {/* Aperçu historique + lien vers écran dédié */}
        <TouchableOpacity
          style={[styles.historyCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push('/sleep-history')}
          activeOpacity={0.7}
        >
          <View style={styles.historyHeader}>
            <View style={[styles.historySectionIcon, { backgroundColor: '#8B5CF615' }]}>
              <Calendar size={18} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>{t('sleep.history')}</Text>
              <Text style={[styles.historySubtitle, { color: colors.textMuted }]}>
                {entries.length > 0
                  ? `${entries.length} nuit${entries.length > 1 ? 's' : ''} enregistrée${entries.length > 1 ? 's' : ''}`
                  : 'Aucune nuit enregistrée'}
              </Text>
            </View>
            <View style={[styles.historyArrow, { backgroundColor: '#8B5CF615' }]}>
              <ArrowLeft size={16} color="#8B5CF6" strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </View>

          {/* Aperçu des 3 dernières nuits */}
          {entries.length > 0 && (
            <View style={styles.historyPreview}>
              {entries.slice(0, 3).map((entry) => {
                const dColor = getDurationColor(entry.duration);
                return (
                  <View key={entry.id} style={[styles.previewEntry, { borderLeftColor: dColor }]}>
                    <Text style={[styles.previewDate, { color: colors.textMuted }]}>
                      {format(new Date(entry.date), 'EEE d', { locale: dateLocale })}
                    </Text>
                    <Text style={[styles.previewDuration, { color: dColor }]}>
                      {formatSleepDuration(entry.duration)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 1 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={8} color={i <= entry.quality ? '#F59E0B' : colors.border} fill={i <= entry.quality ? '#F59E0B' : 'transparent'} />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </TouchableOpacity>

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
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginBottom: 20 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // History card
  historyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historySectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: { fontSize: 15, fontWeight: '800' },
  historySubtitle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  historyArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyPreview: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  previewEntry: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 8,
    gap: 2,
  },
  previewDate: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  previewDuration: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

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
