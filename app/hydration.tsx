import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  TextInput,
  Switch,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Droplets,
  Target,
  TrendingUp,
  Calendar,
  Check,
  Plus,
  Minus,
  Settings,
  Bell,
  BellOff,
  Sun,
  CloudRain,
  Moon as MoonIcon,
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { notificationService } from '@/lib/notificationService';
import logger from '@/lib/security/logger';
import AnimatedWaterBottle from '@/components/AnimatedWaterBottle';
import { useWatch } from '@/lib/WatchConnectivityProvider';

const { width: screenWidth } = Dimensions.get('window');
const HYDRATION_KEY = '@yoroi_hydration_today';
const HYDRATION_GOAL_KEY = '@yoroi_hydration_goal';
const HYDRATION_HISTORY_KEY = '@yoroi_hydration_history';

interface DayData {
  date: string;
  amount: number;
  goal: number;
}

export default function HydrationScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { t } = useI18n();
  const { syncHydration, isWatchAvailable } = useWatch();

  const [currentAmount, setCurrentAmount] = useState(0);
  const [goal, setGoal] = useState(2.5);
  const [editingGoal, setEditingGoal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [goalInput, setGoalInput] = useState('2.5');
  const [history, setHistory] = useState<DayData[]>([]);

  // Toast notification (comme Apple Watch)
  const [showToast, setShowToast] = useState(false);
  const [lastAmount, setLastAmount] = useState(0);
  const [animateBubbles, setAnimateBubbles] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [morningTime, setMorningTime] = useState('09:00');
  const [morningAmount, setMorningAmount] = useState('750');
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [afternoonTime, setAfternoonTime] = useState('14:00');
  const [afternoonAmount, setAfternoonAmount] = useState('750');
  const [afternoonEnabled, setAfternoonEnabled] = useState(true);
  const [eveningTime, setEveningTime] = useState('19:00');
  const [eveningAmount, setEveningAmount] = useState('750');
  const [eveningEnabled, setEveningEnabled] = useState(true);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadData();

    // Animation d'entrée
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const [amountStr, homeKeyStr, goalStr, historyStr] = await Promise.all([
        AsyncStorage.getItem(HYDRATION_KEY),
        AsyncStorage.getItem(`${HYDRATION_KEY}_${todayISO}`),
        AsyncStorage.getItem(HYDRATION_GOAL_KEY),
        AsyncStorage.getItem(HYDRATION_HISTORY_KEY),
      ]);

      // Read from hydration screen's own key (liters, JSON format)
      let amountFromHydrationKey = 0;
      if (amountStr) {
        try {
          const data = JSON.parse(amountStr);
          const today = new Date().toDateString();
          if (data.date === today) {
            amountFromHydrationKey = data.amount;
          }
        } catch {
          // Données corrompues, on ignore
        }
      }

      // Read from home screen's key (ml, date-keyed format)
      let amountFromHomeKey = 0;
      if (homeKeyStr) {
        const parsedMl = parseInt(homeKeyStr, 10);
        if (!isNaN(parsedMl) && parsedMl > 0) {
          amountFromHomeKey = parsedMl / 1000; // Convert ml to liters
        }
      }

      // Use the higher value to avoid data loss from stale state overwrites
      const resolvedAmount = Math.max(amountFromHydrationKey, amountFromHomeKey);
      if (resolvedAmount > 0) {
        setCurrentAmount(resolvedAmount);
      }

      if (goalStr) {
        setGoal(parseFloat(goalStr));
        setGoalInput(goalStr);
      }

      if (historyStr) {
        try {
          setHistory(JSON.parse(historyStr));
        } catch {
          // Données corrompues, on ignore
        }
      }

      // Charger les paramètres de notifications
      const notifSettings = notificationService.getSettings();
      const hydrationSettings = notifSettings?.hydration;
      const slots = hydrationSettings?.slots;

      setNotificationsEnabled(hydrationSettings?.enabled === true && hydrationSettings?.useSlots === true);
      setMorningTime(slots?.morning?.time ?? '09:00');
      setMorningAmount((slots?.morning?.amount ?? 750).toString());
      setMorningEnabled(slots?.morning?.enabled ?? true);
      setAfternoonTime(slots?.afternoon?.time ?? '14:00');
      setAfternoonAmount((slots?.afternoon?.amount ?? 750).toString());
      setAfternoonEnabled(slots?.afternoon?.enabled ?? true);
      setEveningTime(slots?.evening?.time ?? '19:00');
      setEveningAmount((slots?.evening?.amount ?? 750).toString());
      setEveningEnabled(slots?.evening?.enabled ?? true);
    } catch (error) {
      logger.error('Erreur chargement hydratation:', error);
    }
  };

  const saveAmount = async (amount: number) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(HYDRATION_KEY, JSON.stringify({ date: today, amount }));

      // Sync avec l'accueil : sauvegarder aussi au format que l'accueil attend (ml, clé avec date ISO)
      const todayISO = new Date().toISOString().split('T')[0];
      const amountMl = Math.round(amount * 1000);
      await AsyncStorage.setItem(`${HYDRATION_KEY}_${todayISO}`, amountMl.toString());

      // Mettre à jour l'historique
      const newHistory = history.filter(d => d.date !== todayISO);
      newHistory.unshift({ date: todayISO, amount, goal });
      setHistory(newHistory.slice(0, 30)); // Garder 30 jours
      await AsyncStorage.setItem(HYDRATION_HISTORY_KEY, JSON.stringify(newHistory.slice(0, 30)));

      // 🔄 Sync avec Apple Watch si disponible
      if (isWatchAvailable) {
        const waterIntakeMl = Math.round(amount * 1000); // Convertir litres en millilitres
        await syncHydration(waterIntakeMl);
        logger.info(`✅ Hydratation synchronisée avec Watch: ${waterIntakeMl}ml`);
      }
    } catch (error) {
      logger.error('Erreur sauvegarde hydratation:', error);
    }
  };

  const saveGoal = async (newGoal: number) => {
    try {
      await AsyncStorage.setItem(HYDRATION_GOAL_KEY, newGoal.toString());
      setGoal(newGoal);
      setEditingGoal(false);
      notificationAsync(NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('Erreur sauvegarde objectif:', error);
    }
  };

  const addWater = (amountL: number) => {
    impactAsync(ImpactFeedbackStyle.Light);
    const newAmount = Math.max(0, currentAmount + amountL);
    setCurrentAmount(newAmount);
    saveAmount(newAmount);

    // Afficher le toast (comme sur Apple Watch)
    const amountMl = Math.round(amountL * 1000);
    setLastAmount(amountMl);
    setShowToast(true);

    // Animation des bulles si on ajoute de l'eau
    if (amountL > 0) {
      setAnimateBubbles(true);
      setTimeout(() => setAnimateBubbles(false), 500);
    }

    // Animation du toast
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    impactAsync(ImpactFeedbackStyle.Light);

    const settings = notificationService.getSettings();
    await notificationService.updateSettings({
      hydration: {
        ...settings.hydration,
        enabled: value,
        useSlots: true,
      },
    });

    if (value) {
      showPopup(t('hydration.activated'), t('hydration.reminderActivatedMessage'));
    }
  };

  const handleSaveNotificationSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const settings = notificationService.getSettings();
      await notificationService.updateSettings({
        hydration: {
          ...settings.hydration,
          useSlots: true,
          slots: {
            morning: {
              enabled: morningEnabled,
              time: morningTime,
              amount: parseInt(morningAmount, 10),
            },
            afternoon: {
              enabled: afternoonEnabled,
              time: afternoonTime,
              amount: parseInt(afternoonAmount, 10),
            },
            evening: {
              enabled: eveningEnabled,
              time: eveningTime,
              amount: parseInt(eveningAmount, 10),
            },
          },
        },
      });
      setShowNotificationSettings(false);
      notificationAsync(NotificationFeedbackType.Success);
      showPopup(t('hydration.saved'), t('hydration.remindersSavedMessage'));
    } finally {
      setIsSaving(false);
    }
  };

  const percentage = Math.min((currentAmount / goal) * 100, 100);

  // Statistiques
  const last7Days = history.slice(0, 7);
  const successDays = last7Days.filter(d => d.amount >= d.goal).length;
  const successRate = last7Days.length > 0 ? Math.round((successDays / last7Days.length) * 100) : 0;
  const avgAmount = last7Days.length > 0
    ? last7Days.reduce((acc, d) => acc + d.amount, 0) / last7Days.length
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('hydration.title')}</Text>
        <TouchableOpacity onPress={() => setEditingGoal(!editingGoal)} style={styles.settingsButton}>
          <Settings size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Grande bouteille animée */}
        <Animated.View style={[styles.bottleCard, { backgroundColor: colors.backgroundCard, transform: [{ scale: scaleAnim }] }]}>
          {/* Bouteille animée avec vagues et bulles (comme Apple Watch) */}
          <AnimatedWaterBottle
            fillPercentage={percentage / 100}
            width={140}
            height={220}
            color="#0EA5E9"
            showBubbles={animateBubbles}
          />

          {/* Valeur centrale */}
          <View style={styles.valueOverlay}>
            <Text style={[styles.bigValue, { color: percentage >= 100 ? '#10B981' : colors.textPrimary }]}>
              {currentAmount.toFixed(2)}
            </Text>
            <TouchableOpacity onPress={() => setEditingGoal(true)} activeOpacity={0.7}>
              <Text style={[styles.bigUnit, { color: colors.textMuted }]}>/ {goal}L</Text>
            </TouchableOpacity>
          </View>

          {/* Indicateur succès */}
          {percentage >= 100 && (
            <View style={styles.successBadge}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.successText}>{t('hydration.goalReached')}</Text>
            </View>
          )}

          {/* Toast notification (comme Apple Watch) */}
          {showToast && (
            <Animated.View
              style={[
                styles.toast,
                {
                  backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                  opacity: toastAnim,
                  transform: [{
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={[
                styles.toastIcon,
                { backgroundColor: lastAmount > 0 ? '#10B98120' : '#EF444420' }
              ]}>
                {lastAmount > 0 ? (
                  <Check size={16} color="#10B981" strokeWidth={3} />
                ) : (
                  <Minus size={16} color="#EF4444" strokeWidth={3} />
                )}
              </View>
              <Text style={[
                styles.toastText,
                { color: lastAmount > 0 ? '#10B981' : '#EF4444' }
              ]}>
                {lastAmount > 0 ? `+${lastAmount}ml` : `${lastAmount}ml`}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Boutons d'ajout */}
        <View style={[styles.buttonsCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <Droplets size={22} color="#0EA5E9" strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('hydration.addWater')}</Text>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#EF444415' }]}
              onPress={() => addWater(-0.25)}
              activeOpacity={0.7}
            >
              <View style={[styles.addButtonIcon, { backgroundColor: '#EF444425' }]}>
                <Minus size={18} color="#EF4444" strokeWidth={2.5} />
              </View>
              <Text style={[styles.addButtonLabel, { color: '#EF4444' }]}>-250ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#0EA5E915' }]}
              onPress={() => addWater(0.25)}
              activeOpacity={0.7}
            >
              <View style={[styles.addButtonIcon, { backgroundColor: '#0EA5E925' }]}>
                <Plus size={18} color="#0EA5E9" strokeWidth={2.5} />
              </View>
              <Text style={[styles.addButtonLabel, { color: '#0EA5E9' }]}>+250ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#0EA5E9' }]}
              onPress={() => addWater(0.5)}
              activeOpacity={0.8}
            >
              <View style={[styles.addButtonIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Droplets size={18} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={[styles.addButtonLabel, { color: '#FFFFFF' }]}>+500ml</Text>
            </TouchableOpacity>
          </View>

          {/* Quick buttons */}
          <View style={styles.quickRow}>
            {[0.1, 0.33, 0.75, 1].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[styles.quickButton, { backgroundColor: colors.background, borderColor: '#0EA5E930' }]}
                onPress={() => addWater(amount)}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickLabel, { color: '#0EA5E9' }]}>
                  +{(amount * 1000).toFixed(0)}ml
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Modifier l'objectif */}
        {editingGoal && (
          <View style={[styles.goalCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.goalHeader}>
              <Target size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('hydration.dailyGoal')}</Text>
            </View>

            <View style={styles.goalInputRow}>
              <TouchableOpacity
                style={[styles.goalAdjust, { backgroundColor: colors.background }]}
                onPress={() => {
                  const newGoal = Math.max(0.5, parseFloat(goalInput) - 0.25);
                  setGoalInput(newGoal.toFixed(2));
                }}
              >
                <Minus size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.goalInputContainer}>
                <TextInput
                  style={[styles.goalInput, { color: colors.textPrimary }]}
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <Text style={[styles.goalInputUnit, { color: colors.textMuted }]}>{t('hydration.liters')}</Text>
              </View>

              <TouchableOpacity
                style={[styles.goalAdjust, { backgroundColor: colors.background }]}
                onPress={() => {
                  const newGoal = Math.min(5, parseFloat(goalInput) + 0.25);
                  setGoalInput(newGoal.toFixed(2));
                }}
              >
                <Plus size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#0EA5E9' }]}
              onPress={() => saveGoal(parseFloat(goalInput))}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications personnalisées */}
        <View style={[styles.notificationCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.notificationHeader}>
            {notificationsEnabled ? <Bell size={18} color="#0EA5E9" /> : <BellOff size={18} color={colors.textMuted} />}
            <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>{t('hydration.hydrationReminders')}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: '#0EA5E980' }}
              thumbColor={notificationsEnabled ? '#0EA5E9' : colors.textMuted}
            />
          </View>

          {notificationsEnabled && (
            <>
              <Text style={[styles.notificationSubtext, { color: colors.textMuted }]}>
                {t('hydration.reminderDescription')}
              </Text>

              {!showNotificationSettings ? (
                <TouchableOpacity
                  style={[styles.notificationSettingsButton, { backgroundColor: colors.background }]}
                  onPress={() => setShowNotificationSettings(true)}
                >
                  <Settings size={16} color="#0EA5E9" />
                  <Text style={[styles.notificationSettingsText, { color: colors.textPrimary }]}>
                    {t('hydration.configureReminders')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.notificationSlots}>
                  {/* Matin */}
                  <View style={[styles.slotCard, { backgroundColor: colors.background }]}>
                    <View style={styles.slotHeader}>
                      <Sun size={16} color="#F59E0B" />
                      <Text style={[styles.slotTitle, { color: colors.textPrimary }]}>{t('hydration.morning')}</Text>
                      <Switch
                        value={morningEnabled}
                        onValueChange={setMorningEnabled}
                        trackColor={{ false: colors.border, true: '#F59E0B80' }}
                        thumbColor={morningEnabled ? '#F59E0B' : colors.textMuted}
                      />
                    </View>
                    {morningEnabled && (
                      <View style={styles.slotInputs}>
                        <View style={styles.slotInputGroup}>
                          <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{t('hydration.time')}</Text>
                          <TextInput
                            style={[styles.slotInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={morningTime}
                            onChangeText={setMorningTime}
                            placeholder="09:00"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                        <View style={styles.slotInputGroup}>
                          <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{t('hydration.quantity')}</Text>
                          <TextInput
                            style={[styles.slotInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={morningAmount}
                            onChangeText={setMorningAmount}
                            placeholder="750"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                          />
                          <Text style={[styles.slotUnit, { color: colors.textMuted }]}>ml</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Après-midi */}
                  <View style={[styles.slotCard, { backgroundColor: colors.background }]}>
                    <View style={styles.slotHeader}>
                      <CloudRain size={16} color="#0EA5E9" />
                      <Text style={[styles.slotTitle, { color: colors.textPrimary }]}>{t('hydration.afternoon')}</Text>
                      <Switch
                        value={afternoonEnabled}
                        onValueChange={setAfternoonEnabled}
                        trackColor={{ false: colors.border, true: '#0EA5E980' }}
                        thumbColor={afternoonEnabled ? '#0EA5E9' : colors.textMuted}
                      />
                    </View>
                    {afternoonEnabled && (
                      <View style={styles.slotInputs}>
                        <View style={styles.slotInputGroup}>
                          <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{t('hydration.time')}</Text>
                          <TextInput
                            style={[styles.slotInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={afternoonTime}
                            onChangeText={setAfternoonTime}
                            placeholder="14:00"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                        <View style={styles.slotInputGroup}>
                          <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{t('hydration.quantity')}</Text>
                          <TextInput
                            style={[styles.slotInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={afternoonAmount}
                            onChangeText={setAfternoonAmount}
                            placeholder="750"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                          />
                          <Text style={[styles.slotUnit, { color: colors.textMuted }]}>ml</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Soir */}
                  <View style={[styles.slotCard, { backgroundColor: colors.background }]}>
                    <View style={styles.slotHeader}>
                      <MoonIcon size={16} color="#8B5CF6" />
                      <Text style={[styles.slotTitle, { color: colors.textPrimary }]}>{t('hydration.evening')}</Text>
                      <Switch
                        value={eveningEnabled}
                        onValueChange={setEveningEnabled}
                        trackColor={{ false: colors.border, true: '#8B5CF680' }}
                        thumbColor={eveningEnabled ? '#8B5CF6' : colors.textMuted}
                      />
                    </View>
                    {eveningEnabled && (
                      <View style={styles.slotInputs}>
                        <View style={styles.slotInputGroup}>
                          <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{t('hydration.time')}</Text>
                          <TextInput
                            style={[styles.slotInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={eveningTime}
                            onChangeText={setEveningTime}
                            placeholder="19:00"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                        <View style={styles.slotInputGroup}>
                          <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{t('hydration.quantity')}</Text>
                          <TextInput
                            style={[styles.slotInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={eveningAmount}
                            onChangeText={setEveningAmount}
                            placeholder="750"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                          />
                          <Text style={[styles.slotUnit, { color: colors.textMuted }]}>ml</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Boutons d'action */}
                  <View style={styles.notificationActions}>
                    <TouchableOpacity
                      onPress={() => setShowNotificationSettings(false)}
                      style={[styles.notificationCancelBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.notificationCancelText, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveNotificationSettings}
                      disabled={isSaving}
                      style={[styles.notificationSaveBtn, { backgroundColor: '#0EA5E9' }]}
                    >
                      <Text style={styles.notificationSaveText}>{t('common.save')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Statistiques */}
        <View style={[styles.statsCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('hydration.thisWeek')}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <TrendingUp size={18} color="#10B981" />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{successRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('hydration.successRate')}</Text>
            </View>

            <View style={styles.statItem}>
              <Droplets size={18} color="#0EA5E9" />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{avgAmount.toFixed(2)}L</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('hydration.averagePerDay')}</Text>
            </View>

            <View style={styles.statItem}>
              <Calendar size={18} color="#8B5CF6" />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{successDays}/7</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('hydration.successfulDays')}</Text>
            </View>
          </View>

          {/* Barres 7 jours */}
          <View style={styles.weekBars}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => {
              const dayData = last7Days[6 - i];
              const dayPercentage = dayData ? Math.min((dayData.amount / dayData.goal) * 100, 100) : 0;
              const isToday = i === 6;

              return (
                <View key={i} style={styles.dayColumn}>
                  <View style={[styles.barBg, { backgroundColor: colors.background }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${dayPercentage}%`,
                          backgroundColor: dayPercentage >= 100 ? '#10B981' : '#0EA5E9',
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.dayLabel,
                    { color: isToday ? '#0EA5E9' : colors.textMuted },
                    isToday && styles.dayLabelActive
                  ]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },
  bottleCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  valueOverlay: {
    alignItems: 'center',
    marginTop: 16,
  },
  bigValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  bigUnit: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: -4,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  successText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  toast: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 16,
    fontWeight: '800',
  },
  buttonsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  goalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  goalAdjust: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInputContainer: {
    alignItems: 'center',
  },
  goalInput: {
    fontSize: 36,
    fontWeight: '900',
    minWidth: 100,
  },
  goalInputUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: 20,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayLabelActive: {
    fontWeight: '900',
  },

  // Notifications
  notificationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  notificationSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 16,
  },
  notificationSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  notificationSettingsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notificationSlots: {
    marginTop: 16,
    gap: 12,
  },
  slotCard: {
    padding: 12,
    borderRadius: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  slotInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  slotInputGroup: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  slotInput: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  slotUnit: {
    position: 'absolute',
    right: 10,
    top: 22,
    fontSize: 10,
    fontWeight: '600',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  notificationCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  notificationCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationSaveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  notificationSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
