import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  RefreshControl,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Moon,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Battery,
  CheckCircle2,
  Bell,
  BellOff,
  Minus,
  Calendar,
  Target,
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

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
import { notificationService, requestNotificationPermissions } from '@/lib/notificationService';
import HealthConnect from '@/lib/healthConnect';
import logger from '@/lib/security/logger';
import { usePremium } from '@/context/PremiumContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';

// Map des locales date-fns par langue


// Couleur de qualité
// Parse date sûr : 'yyyy-MM-dd' en local (évite le jour précédent à l'ouest d'UTC)
const toLocalDate = (v: any): Date =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseISO(v) : new Date(v);

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
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { t } = useI18n();
  const { isPremium } = usePremium();
  const dateLocale = fr;

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [goal, setGoal] = useState(480);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Données sommeil Apple Health
  const [hkLastNight, setHkLastNight] = useState<{
    total: number; deep: number; rem: number; core: number; awake: number;
    startTime?: string; endTime?: string;
  } | null>(null);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [bedtimeReminder, setBedtimeReminder] = useState('22:30');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Flag pour recharger après retour de sleep-input


  const loadData = useCallback(async () => {
    try {
      const [entriesData, statsData, goalData, hkSleepHistory] = await Promise.all([
        getSleepEntries(),
        getSleepStats(),
        getSleepGoal(),
        HealthConnect.getSleepHistory(1).catch(() => null),
      ]);
      setEntries(entriesData);
      setStats(statsData);
      setGoal(goalData);

      // Données Apple Health / Samsung Health (dernière nuit)
      if (hkSleepHistory && hkSleepHistory.length > 0) {
        const last = hkSleepHistory[hkSleepHistory.length - 1];
        if (last.total > 0) {
          setHkLastNight({
            total: last.total,
            deep: last.deep || 0,
            rem: last.rem || 0,
            core: last.core || 0,
            awake: last.awake || 0,
            startTime: (last as any).startTime,
            endTime: (last as any).endTime,
          });
        }
      }

      const notifSettings = notificationService.getSettings();
      setNotificationsEnabled(notifSettings.sleep.enabled);
      setBedtimeReminder(notifSettings.sleep.bedtimeReminder);
    } catch (error) {
      logger.error('Erreur:', error);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Charger une seule fois au montage
  useEffect(() => { loadData(); }, []);

  // Listener pour les changements de données YOROI
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', loadData);
    return () => sub.remove();
  }, []);

  // Recharge déclenchée par sleep-input via YOROI_DATA_CHANGED (plus de useFocusEffect)

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

    if (value) {
      // Demander la permission si pas encore accordée
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setNotificationsEnabled(false);
        showPopup(
          t('sleep.permissionRequired'),
          t('sleep.enableNotificationsMessage'),
          [{ text: 'OK', style: 'primary' }]
        );
        return;
      }
    }

    const settings = notificationService.getSettings();
    // Si days est vide, activer tous les jours par défaut
    const days = settings.sleep.days.length > 0
      ? settings.sleep.days
      : [0, 1, 2, 3, 4, 5, 6]; // tous les jours

    await notificationService.updateSettings({
      sleep: {
        ...settings.sleep,
        enabled: value,
        days,
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

  // Durée de la dernière nuit : HealthKit en priorité
  const lastNightTotal = hkLastNight?.total && hkLastNight.total > 0
    ? hkLastNight.total
    : (stats?.lastNightDuration || 0);

  const hasPhases = hkLastNight && (hkLastNight.deep + hkLastNight.rem + hkLastNight.core) > 0;

  // Heures coucher/réveil : SQLite en priorité (déjà en HH:MM local, toujours juste)
  // HealthKit donne des ISO UTC qui peuvent être décalés selon le fuseau
  // entries[0] = plus récent car addSleepEntry() utilise .unshift()
  const lastEntry = entries.length > 0 ? entries[0] : null;
  const displayBedTime = lastEntry?.bedTime || '--:--';
  const displayWakeTime = lastEntry?.wakeTime || '--:--';
  const hasSleepTimes = !!(lastEntry?.bedTime && lastEntry?.wakeTime);

  // Couleurs theme-aware : on respecte le mode (clair/sombre) de l'utilisateur.
  // En mode clair → fonds blanc/gris doux, lisible et joyeux.
  // En mode sombre → bleu marine nuit comme avant pour l'identité "sommeil".
  const nightBg = isDark ? '#0B1120' : (colors.background || '#F5F7FA');
  const nightCard = isDark ? '#131D36' : (colors.backgroundCard || '#FFFFFF');
  // Surface secondaire (boutons -30min, track switch, étoile vide, etc.)
  const surfaceMuted = isDark ? '#1E2D4D' : 'rgba(0,0,0,0.06)';
  const inputText = isDark ? '#E8ECF4' : (colors.textPrimary || '#1F2937');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <View style={[styles.screen, { backgroundColor: nightBg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: nightCard }]}>
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
          <ArrowLeft size={24} color={inputText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: inputText }]}>{t('sleep.title')}</Text>
        <Moon size={24} color="#8B5CF6" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >

        {/* Carte Dernière Nuit */}
        {lastNightTotal > 0 && (
          <View style={[styles.lastNightCard, { backgroundColor: nightCard }]}>
            <Text style={styles.lastNightLabel}>{t('sleep.lastNight')}</Text>

            {/* Durée + heures coucher/réveil */}
            <View style={styles.lastNightTopRow}>
              <Text style={[styles.lastNightDuration, { color: getDurationColor(lastNightTotal) }]}>
                {formatSleepDuration(lastNightTotal)}
              </Text>
              {hasSleepTimes && (
                <View style={styles.lastNightTimes}>
                  <Moon size={12} color="#7B8DB5" />
                  <Text style={styles.lastNightTimeText}>
                    {displayBedTime} → {displayWakeTime}
                  </Text>
                </View>
              )}
            </View>

            {/* Barre de phases colorée */}
            {hasPhases && (() => {
              const { deep, rem, core, awake } = hkLastNight!;
              const total = deep + rem + core + awake;
              if (total === 0) return null;
              const pct = (v: number) => `${Math.round((v / total) * 100)}%` as any;
              return (
                <View style={styles.phaseBarContainer}>
                  <View style={styles.phaseBar}>
                    {deep > 0 && <View style={[styles.phaseSegment, { width: pct(deep), backgroundColor: '#5856D6' }]} />}
                    {rem > 0 && <View style={[styles.phaseSegment, { width: pct(rem), backgroundColor: '#34D399' }]} />}
                    {core > 0 && <View style={[styles.phaseSegment, { width: pct(core), backgroundColor: '#60A5FA' }]} />}
                    {awake > 0 && <View style={[styles.phaseSegment, { width: pct(awake), backgroundColor: '#F97316' }]} />}
                  </View>

                  {/* Stats par phase */}
                  <View style={styles.phaseGrid}>
                    {deep > 0 && (
                      <View style={[styles.phaseCell, { borderLeftColor: '#5856D6' }]}>
                        <Text style={[styles.phaseCellValue, { color: '#5856D6' }]}>{formatSleepDuration(deep)}</Text>
                        <Text style={styles.phaseCellLabel}>{t('sleep.deepSleep')}</Text>
                      </View>
                    )}
                    {rem > 0 && (
                      <View style={[styles.phaseCell, { borderLeftColor: '#34D399' }]}>
                        <Text style={[styles.phaseCellValue, { color: '#34D399' }]}>{formatSleepDuration(rem)}</Text>
                        <Text style={styles.phaseCellLabel}>{t('sleep.remSleep')}</Text>
                      </View>
                    )}
                    {core > 0 && (
                      <View style={[styles.phaseCell, { borderLeftColor: '#60A5FA' }]}>
                        <Text style={[styles.phaseCellValue, { color: '#60A5FA' }]}>{formatSleepDuration(core)}</Text>
                        <Text style={styles.phaseCellLabel}>{t('sleep.lightSleep')}</Text>
                      </View>
                    )}
                    {awake > 0 && (
                      <View style={[styles.phaseCell, { borderLeftColor: '#F97316' }]}>
                        <Text style={[styles.phaseCellValue, { color: '#F97316' }]}>{formatSleepDuration(awake)}</Text>
                        <Text style={styles.phaseCellLabel}>{t('sleep.awake')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* Objectif */}
            <View style={styles.lastNightGoalRow}>
              <View style={styles.lastNightGoalBar}>
                <View style={[styles.lastNightGoalFill, {
                  width: `${Math.min((lastNightTotal / goal) * 100, 100)}%` as any,
                  backgroundColor: getDurationColor(lastNightTotal),
                }]} />
              </View>
              <Text style={styles.lastNightGoalText}>
                {t('sleep.goal')} {formatSleepDuration(goal)}
              </Text>
            </View>
          </View>
        )}

        {/* Carte principale */}
        <View style={[styles.mainCard, { backgroundColor: nightCard }]}>
          <View style={styles.mainHeader}>
            <View style={[styles.mainIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Battery size={24} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.mainTitle, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.sleepDebt')}</Text>
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
          <View style={[styles.statCard, { backgroundColor: nightCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Clock size={18} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: inputText }]}>
              {stats ? formatSleepDuration(stats.averageDuration) : '--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.average')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: nightCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B15' }]}>
              <Star size={18} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: inputText }]}>
              {stats ? (stats.averageQuality % 1 === 0 ? `${stats.averageQuality}` : `${stats.averageQuality.toFixed(1)}`) : '--'}/5
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.quality')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: nightCard }]}>
            <View style={[styles.statIconContainer, { backgroundColor: stats?.trend === 'improving' ? '#10B98115' : stats?.trend === 'declining' ? '#EF444415' : surfaceMuted }]}>
              {stats?.trend === 'improving' && <TrendingUp size={18} color="#10B981" strokeWidth={2.5} />}
              {stats?.trend === 'declining' && <TrendingDown size={18} color="#EF4444" strokeWidth={2.5} />}
              {stats?.trend === 'stable' && <Target size={18} color="#7B8DB5" strokeWidth={2.5} />}
            </View>
            <View style={{ alignItems: 'center', marginVertical: 4 }}>
              {stats?.trend === 'improving' ? (
                <TrendingUp size={20} color="#10B981" strokeWidth={2.5} />
              ) : stats?.trend === 'declining' ? (
                <TrendingDown size={20} color="#EF4444" strokeWidth={2.5} />
              ) : (
                <Minus size={20} color="#E8ECF4" strokeWidth={2.5} />
              )}
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.trend')}</Text>
          </View>
        </View>

        {/* Objectif */}
        <View style={[styles.goalCard, { backgroundColor: nightCard }]}>
          <Text style={[styles.goalTitle, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.sleepGoal')}</Text>
          <View style={styles.goalRow}>
            <TouchableOpacity onPress={() => handleGoalChange(-30)} style={[styles.goalBtn, { backgroundColor: surfaceMuted }]}>
              <Text style={[styles.goalBtnText, { color: inputText }]}>-30min</Text>
            </TouchableOpacity>
            <Text style={[styles.goalValue, { color: inputText }]}>{formatSleepDuration(goal)}</Text>
            <TouchableOpacity onPress={() => handleGoalChange(30)} style={[styles.goalBtn, { backgroundColor: '#8B5CF6' }]}>
              <Text style={[styles.goalBtnTextLight, { color: '#FFFFFF' }]}>+30min</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.notificationCard, { backgroundColor: nightCard }]}>
          <View style={styles.notificationHeader}>
            {notificationsEnabled ? <Bell size={18} color="#8B5CF6" /> : <BellOff size={18} color="#7B8DB5" />}
            <Text style={[styles.notificationTitle, { color: inputText }]}>{t('sleep.bedtimeReminder')}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: surfaceMuted, true: '#8B5CF680' }}
              thumbColor={notificationsEnabled ? '#8B5CF6' : colors.textMuted || '#7B8DB5'}
            />
          </View>

          {notificationsEnabled && (
            <>
              <Text style={[styles.notificationSubtext, { color: colors.textMuted || '#7B8DB5' }]}>
                {t('sleep.reminderDescription')}
              </Text>

              {!showNotificationSettings ? (
                <TouchableOpacity
                  style={[styles.notificationTimeButton, { backgroundColor: nightBg }]}
                  onPress={() => setShowNotificationSettings(true)}
                >
                  <Clock size={16} color="#8B5CF6" />
                  <Text style={[styles.notificationTimeText, { color: inputText }]}>
                    {t('sleep.reminderAt', { time: bedtimeReminder })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.notificationTimeEditor}>
                  <Text style={[styles.notificationLabel, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.reminderTime')}</Text>
                  <TextInput
                    style={[styles.notificationTimeInput, { color: inputText, borderColor: surfaceMuted }]}
                    value={bedtimeReminder}
                    onChangeText={setBedtimeReminder}
                    placeholder="22:30"
                    placeholderTextColor="#7B8DB5"
                    keyboardType="numbers-and-punctuation"
                  />
                  <View style={styles.notificationActions}>
                    <TouchableOpacity
                      onPress={() => setShowNotificationSettings(false)}
                      style={[styles.notificationCancelBtn, { borderColor: surfaceMuted }]}
                    >
                      <Text style={[styles.notificationCancelText, { color: colors.textMuted || '#7B8DB5' }]}>{t('common.cancel')}</Text>
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
        <View style={[styles.protocolCard, { backgroundColor: nightCard, borderColor: '#8B5CF620', borderWidth: 1 }]}>
          <View style={styles.protocolHeader}>
            <CheckCircle2 size={18} color="#8B5CF6" />
            <Text style={[styles.protocolTitle, { color: inputText }]}>{t('sleep.sleepProtocol')}</Text>
          </View>
          <Text style={[styles.protocolText, { color: colors.textSecondary || '#9AA8C7' }]}>
            {t('sleep.protocolDescription')}
          </Text>
          <View style={styles.protocolList}>
            <Text style={[styles.protocolItem, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.protocolItem1')}</Text>
            <Text style={[styles.protocolItem, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.protocolItem2')}</Text>
            <Text style={[styles.protocolItem, { color: colors.textMuted || '#7B8DB5' }]}>{t('sleep.protocolItem3')}</Text>
          </View>
        </View>

        {/* Ajouter sommeil */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#8B5CF6' }]}
          onPress={() => {
            router.push('/sleep-input');
          }}
        >
          <Moon size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>{t('sleep.recordMyNight')}</Text>
        </TouchableOpacity>

        {/* Historique sommeil — teaser pour free, complet pour premium */}
        {(() => {
          const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
          const FREE_VISIBLE = 2;
          const visibleEntries = isPremium ? sortedEntries : sortedEntries.slice(0, FREE_VISIBLE);
          const lockedEntries = isPremium ? [] : sortedEntries.slice(FREE_VISIBLE, FREE_VISIBLE + 4);

          const renderEntry = (entry: SleepEntry, locked = false) => {
            const dColor = locked ? '#9CA3AF' : getDurationColor(entry.duration);
            return (
              <TouchableOpacity
                key={entry.id}
                activeOpacity={locked ? 0.7 : 0.85}
                onPress={() => locked ? router.push('/paywall' as never) : router.push('/sleep-history' as never)}
                style={[
                  styles.previewEntry,
                  { borderLeftColor: dColor, opacity: locked ? 0.45 : 1 },
                ]}
              >
                <Text style={[styles.previewDate, { color: colors.textMuted || '#7B8DB5' }]}>
                  {format(toLocalDate(entry.date), 'EEE d', { locale: dateLocale })}
                </Text>
                <Text style={[styles.previewDuration, { color: dColor }]}>
                  {formatSleepDuration(entry.duration)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={8} color={i <= entry.quality ? '#F59E0B' : surfaceMuted} fill={i <= entry.quality ? '#F59E0B' : 'transparent'} />
                  ))}
                </View>
                {locked && (
                  <Lock size={13} color="#9CA3AF" strokeWidth={2} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            );
          };

          return (
            <View style={[styles.historyCard, { backgroundColor: nightCard }]}>
              {/* Header */}
              <TouchableOpacity
                style={styles.historyHeader}
                onPress={() => isPremium ? router.push('/sleep-history' as never) : router.push('/paywall' as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.historySectionIcon, { backgroundColor: '#8B5CF615' }]}>
                  <Calendar size={18} color="#8B5CF6" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyTitle, { color: inputText }]}>{t('sleep.history')}</Text>
                  <Text style={[styles.historySubtitle, { color: colors.textMuted || '#7B8DB5' }]}>
                    {entries.length > 0
                      ? t('sleep.nightsRecorded', { count: entries.length })
                      : t('sleep.noNightsRecorded')}
                  </Text>
                </View>
                <View style={[styles.historyArrow, { backgroundColor: '#8B5CF615' }]}>
                  <ArrowLeft size={16} color="#8B5CF6" strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
              </TouchableOpacity>

              {/* Entrées visibles */}
              {entries.length > 0 && (
                <View style={styles.historyPreview}>
                  {visibleEntries.map(e => renderEntry(e, false))}

                  {/* Entrées verrouillées (free users) */}
                  {lockedEntries.length > 0 && (
                    <View style={{ position: 'relative' }}>
                      {lockedEntries.map(e => renderEntry(e, true))}

                      {/* Gradient + CTA premium */}
                      <LinearGradient
                        colors={['transparent', nightCard]}
                        style={styles.lockGradient}
                        pointerEvents="none"
                      />
                      <TouchableOpacity
                        style={styles.lockCta}
                        onPress={() => router.push('/paywall' as never)}
                        activeOpacity={0.85}
                      >
                        <Lock size={14} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.lockCtaText}>Voir tout l'historique</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })()}

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  scrollView: { flex: 1 },
  content: { padding: 16 },

  // Carte Dernière Nuit
  lastNightCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lastNightLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: '#7B8DB5', textTransform: 'uppercase', marginBottom: 10 },
  lastNightTopRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  lastNightDuration: { fontSize: 42, fontWeight: '900', letterSpacing: -1.5, lineHeight: 46 },
  lastNightTimes: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 6 },
  lastNightTimeText: { fontSize: 13, fontWeight: '600', color: '#7B8DB5' },
  phaseBarContainer: { marginBottom: 16 },
  phaseBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#1E2D4D', marginBottom: 12 },
  phaseSegment: { height: '100%' },
  phaseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phaseCell: { flex: 1, minWidth: '22%', borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 2 },
  phaseCellValue: { fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  phaseCellLabel: { fontSize: 9, fontWeight: '600', color: '#7B8DB5', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  lastNightGoalRow: { gap: 6 },
  lastNightGoalBar: { height: 4, backgroundColor: '#1E2D4D', borderRadius: 2, overflow: 'hidden' },
  lastNightGoalFill: { height: '100%', borderRadius: 2 },
  lastNightGoalText: { fontSize: 10, fontWeight: '600', color: '#4A5568', textAlign: 'right' },

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
    flexDirection: 'column',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  previewEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
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
  lockGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  lockCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  lockCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
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
