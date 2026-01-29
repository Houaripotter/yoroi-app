import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useFocusEffect } from 'expo-router';
import {
  Clock,
  Play,
  Square,
  Settings,
  TrendingDown,
  Flame,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  X,
  MapPin,
  Calendar,
  Moon,
  Star,
  Cross,
  Swords,
  Utensils,
  RefreshCw,
  Droplets,
  Sun,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { successHaptic, errorHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import logger from '@/lib/security/logger';
import {
  FASTING_MODES,
  FastingMode,
  FastingState,
  FastingStats,
  CustomFastingSettings,
  RamadanSettings,
  getFastingState,
  startFasting,
  stopFasting,
  completeFasting,
  getFastingStats,
  getFastingMode,
  getCustomFastingSettings,
  saveCustomFastingSettings,
  getRamadanSettings,
  saveRamadanSettings,
  getTimeRemaining,
  getProgressPercentage,
  formatCountdown,
  formatTime,
  formatDate,
  formatDuration,
} from '@/lib/fasting';

// ============================================
// HELPER - ICON MAPPER
// ============================================

const getIconComponent = (iconName: string, size: number = 24, color: string = '#000') => {
  const iconMap: Record<string, React.ElementType> = {
    Clock,
    Moon,
    Star,
    Cross,
    Swords,
    Utensils,
    RefreshCw,
    Droplets,
    Settings,
    Sun,
  };

  const IconComponent = iconMap[iconName] || Clock;
  return <IconComponent size={size} color={color} strokeWidth={2.5} />;
};

// ============================================
// ECRAN PRINCIPAL JEUNE
// ============================================

export default function FastingScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Etats
  const [fastingState, setFastingState] = useState<FastingState | null>(null);
  const [stats, setStats] = useState<FastingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modals
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showRamadanModal, setShowRamadanModal] = useState(false);

  // Custom settings
  const [customStartTime, setCustomStartTime] = useState('20:00');
  const [customDuration, setCustomDuration] = useState('16');
  const [customDays, setCustomDays] = useState([1, 2, 3, 4, 5]); // Lun-Ven

  // Ramadan settings
  const [ramadanCity, setRamadanCity] = useState('Paris');
  const [ramadanFajr, setRamadanFajr] = useState('05:30');
  const [ramadanMaghrib, setRamadanMaghrib] = useState('18:45');

  // Charger les donnees
  const loadData = useCallback(async () => {
    try {
      const [state, fastingStats] = await Promise.all([
        getFastingState(),
        getFastingStats(),
      ]);
      setFastingState(state);
      setStats(fastingStats);

      // Charger les parametres personnalises
      const customSettings = await getCustomFastingSettings();
      if (customSettings) {
        setCustomStartTime(customSettings.startTime);
        setCustomDuration(customSettings.durationHours.toString());
        setCustomDays(customSettings.activeDays);
      }

      // Charger les parametres Ramadan
      const ramadanSettings = await getRamadanSettings();
      if (ramadanSettings) {
        setRamadanCity(ramadanSettings.city);
        setRamadanFajr(ramadanSettings.fajrTime);
        setRamadanMaghrib(ramadanSettings.maghribTime);
      }
    } catch (error) {
      logger.error('Erreur chargement fasting:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  // Timer update
  useEffect(() => {
    if (fastingState?.isActive && fastingState.targetEndTime) {
      const updateTimer = () => {
        const remaining = getTimeRemaining(fastingState.targetEndTime!);
        setTimeRemaining(remaining);

        const progressVal = getProgressPercentage(
          fastingState.startTime!,
          fastingState.targetEndTime!
        );
        setProgress(progressVal);

        // Verifier si complete
        if (remaining <= 0 && fastingState.phase === 'fasting') {
          handleFastingComplete();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [fastingState]);

  // Gestion de la completion
  const handleFastingComplete = async () => {
    successHaptic();
    playSuccessSound();
    await completeFasting();
    await loadData();

    showPopup(
      'Bravo !',
      'Tu as completé ton jeûne avec succès !',
      [{ text: 'Super !', style: 'primary' }]
    );
  };

  // Demarrer un jeune
  const handleStartFasting = async (mode: FastingMode) => {
    // Avertissement médical pour tous les jeûnes
    const warningMessage = mode.warning
      ? 'Le jeûne prolongé peut être dangereux. Consulte un médecin avant de commencer et assure-toi de bien vous hydrater.\n\nIMPORTANT : Ne mettez pas ton santé en danger. Si tu ne sais pas si le jeûne est adapté pour vous, consultez un professionnel de santé.'
      : 'IMPORTANT : Consulte un médecin avant de commencer le jeûne si tu as des problèmes de santé, prends des médicaments, es enceinte ou allaites.\n\nNe mettez pas ton santé en danger.';

    showPopup(
      'Avertissement médical',
      warningMessage,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Je comprends',
          style: 'primary',
          onPress: () => {
            if (mode.id === 'ramadan') {
              setShowRamadanModal(true);
              setShowModeSelector(false);
            } else if (mode.id === 'custom') {
              setShowCustomModal(true);
              setShowModeSelector(false);
            } else {
              proceedWithFasting(mode);
            }
          },
        },
      ]
    );
  };

  const proceedWithFasting = async (mode: FastingMode) => {
    const success = await startFasting(mode.id);
    if (success) {
      successHaptic();
      setShowModeSelector(false);
      await loadData();
    } else {
      errorHaptic();
      showPopup('Erreur', 'Impossible de démarrer le jeûne.');
    }
  };

  // Arreter le jeûne
  const handleStopFasting = () => {
    showPopup(
      'Arrêter le jeûne ?',
      'Es-tu sûr de vouloir arrêter ton jeûne maintenant ?',
      [
        { text: 'Continuer', style: 'cancel' },
        {
          text: 'Arrêter',
          style: 'destructive',
          onPress: async () => {
            await stopFasting(false);
            await loadData();
          },
        },
      ]
    );
  };

  // Sauvegarder les parametres personnalises
  const handleSaveCustomSettings = async () => {
    const settings: CustomFastingSettings = {
      startTime: customStartTime,
      durationHours: parseInt(customDuration, 10) || 16,
      activeDays: customDays,
    };
    await saveCustomFastingSettings(settings);
    setShowCustomModal(false);

    // Demarrer le jeûne
    const success = await startFasting('custom');
    if (success) {
      successHaptic();
      await loadData();
    }
  };

  // Sauvegarder les parametres Ramadan
  const handleSaveRamadanSettings = async () => {
    const settings: RamadanSettings = {
      city: ramadanCity,
      country: 'France',
      fajrTime: ramadanFajr,
      maghribTime: ramadanMaghrib,
      useManualTimes: true,
    };
    await saveRamadanSettings(settings);
    setShowRamadanModal(false);

    // Demarrer le jeûne
    const success = await startFasting('ramadan');
    if (success) {
      successHaptic();
      await loadData();
    }
  };

  // Toggle jour personnalise
  const toggleCustomDay = (day: number) => {
    setCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Mode actif
  const activeMode = fastingState?.modeId ? getFastingMode(fastingState.modeId) : null;

  if (isLoading) {
    return (
      <ScreenWrapper noPadding>
        <Header title="Mode Jeûne" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noPadding>
      <Header title="Mode Jeûne" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TIMER ACTIF */}
        {fastingState?.isActive && activeMode && (
          <Card style={{ ...styles.timerCard, borderColor: colors.gold }}>
            <View style={styles.timerHeader}>
              {getIconComponent(activeMode.icon, 28, colors.gold)}
              <Text style={[styles.timerModeName, { color: colors.textPrimary }]}>
                {activeMode.name}
              </Text>
            </View>

            {/* Phase indicator */}
            <View style={[
              styles.phaseIndicator,
              {
                backgroundColor: fastingState.phase === 'fasting'
                  ? colors.goldMuted
                  : colors.successMuted,
              }
            ]}>
              <Text style={[
                styles.phaseText,
                {
                  color: fastingState.phase === 'fasting'
                    ? colors.gold
                    : colors.success,
                }
              ]}>
                {fastingState.phase === 'fasting' ? '🔒 PERIODE DE JEUNE' : '🍽️ FENETRE ALIMENTAIRE'}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressContainer, { backgroundColor: colors.cardHover }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: fastingState.phase === 'fasting'
                      ? colors.gold
                      : colors.success,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>

            {/* Time remaining */}
            <Text style={[styles.timerCountdown, { color: colors.textPrimary }]}>
              {formatCountdown(timeRemaining)}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {fastingState.phase === 'fasting'
                ? `restant sur ${activeMode.fastingHours || '--'}h`
                : 'restant pour manger'}
            </Text>

            {/* Times */}
            <View style={styles.timesRow}>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Debut</Text>
                <Text style={[styles.timeValue, { color: colors.textSecondary }]}>
                  {formatTime(fastingState.startTime!)} ({formatDate(fastingState.startTime!)})
                </Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Fin</Text>
                <Text style={[styles.timeValue, { color: colors.textSecondary }]}>
                  {formatTime(fastingState.targetEndTime!)} ({formatDate(fastingState.targetEndTime!)})
                </Text>
              </View>
            </View>

            {/* Streak */}
            {stats && stats.currentStreak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: colors.cardHover }]}>
                <Flame size={16} color="#F59E0B" strokeWidth={2} />
                <Text style={[styles.streakText, { color: colors.textPrimary }]}>
                  Streak jeûne : {stats.currentStreak} jours
                </Text>
              </View>
            )}

            {/* Stop button */}
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.dangerMuted }]}
              onPress={handleStopFasting}
            >
              <Square size={18} color={colors.danger} strokeWidth={2} />
              <Text style={[styles.stopButtonText, { color: colors.danger }]}>
                Arreter le jeûne
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* SELECTION MODE */}
        {!fastingState?.isActive && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                🍽️ Mode Jeûne
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choisis ton type de jeûne pour commencer
              </Text>
            </View>

            {/* JEUNE INTERMITTENT */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              JEUNE INTERMITTENT
            </Text>
            <View style={styles.modesGrid}>
              {FASTING_MODES.filter(m => m.category === 'intermittent').map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleStartFasting(mode)}
                >
                  {getIconComponent(mode.icon, 32, colors.accent)}
                  <Text style={[styles.modeName, { color: colors.textPrimary }]}>
                    {mode.id === 'omad' ? 'OMAD' : `${mode.fastingHours}:${mode.eatingHours}`}
                  </Text>
                  <Text style={[styles.modeDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {mode.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* JEUNE RELIGIEUX */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              JEUNE RELIGIEUX
            </Text>
            <View style={styles.modesRow}>
              {FASTING_MODES.filter(m => m.category === 'religious').map(mode => {
                // Colors for each religious fasting
                const religiousColors: Record<string, { bg: string; border: string; icon: string }> = {
                  ramadan: { bg: '#1a1f3a', border: '#4a5bff', icon: '#7d8fff' },
                  yom_kippur: { bg: '#1a1f2e', border: '#6eb5ff', icon: '#90c7ff' },
                  careme: { bg: '#2a1a1f', border: '#d97706', icon: '#fbbf24' },
                };
                const colorScheme = religiousColors[mode.id] || { bg: colors.card, border: colors.border, icon: colors.accent };

                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.religiousCard,
                      {
                        backgroundColor: colorScheme.bg,
                        borderColor: colorScheme.border,
                      }
                    ]}
                    onPress={() => handleStartFasting(mode)}
                  >
                    <View style={[styles.religiousIconContainer, { backgroundColor: `${colorScheme.border}30` }]}>
                      {getIconComponent(mode.icon, 28, colorScheme.icon)}
                    </View>
                    <View style={styles.modeTextContainer}>
                      <Text style={[styles.religiousModeTitle, { color: '#FFFFFF' }]}>
                        {mode.name}
                      </Text>
                      <Text style={[styles.religiousModeDesc, { color: '#9ca3af' }]} numberOfLines={1}>
                        {mode.description}
                      </Text>
                    </View>
                    <ChevronRight size={22} color={colorScheme.icon} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* JEUNE AVANCE */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              JEUNE AVANCE
            </Text>
            <View style={styles.modesRow}>
              {FASTING_MODES.filter(m => m.category === 'advanced').map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeCardWide,
                    {
                      backgroundColor: mode.warning ? colors.dangerMuted : colors.card,
                      borderColor: mode.warning ? colors.danger : colors.border,
                    }
                  ]}
                  onPress={() => handleStartFasting(mode)}
                >
                  {getIconComponent(mode.icon, 36, mode.warning ? colors.danger : colors.accent)}
                  <View style={styles.modeTextContainer}>
                    <View style={styles.modeNameRow}>
                      <Text style={[styles.modeName, { color: colors.textPrimary }]}>
                        {mode.name}
                      </Text>
                      {mode.warning && (
                        <AlertTriangle size={14} color={colors.danger} strokeWidth={2} />
                      )}
                    </View>
                    <Text style={[styles.modeDesc, { color: colors.textMuted }]} numberOfLines={1}>
                      {mode.description}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            {/* PERSONNALISE */}
            <TouchableOpacity
              style={[styles.customButton, { backgroundColor: colors.goldMuted, borderColor: colors.gold }]}
              onPress={() => setShowCustomModal(true)}
            >
              <Settings size={24} color={colors.gold} strokeWidth={2} />
              <View style={styles.customButtonText}>
                <Text style={[styles.customButtonTitle, { color: colors.gold }]}>
                  Jeûne Personnalisé
                </Text>
                <Text style={[styles.customButtonDesc, { color: colors.textSecondary }]}>
                  Definis tes propres horaires
                </Text>
              </View>
              <ChevronRight size={20} color={colors.gold} />
            </TouchableOpacity>
          </>
        )}

        {/* STATISTIQUES */}
        {stats && stats.totalCompleted > 0 && (
          <Card style={styles.statsCard}>
            <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>
              Tes statistiques
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.gold }]}>
                  {stats.totalCompleted}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Jeûnes complétés
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {stats.totalHoursFasted}h
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Temps total
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {stats.longestStreak}j
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Record streak
                </Text>
              </View>
            </View>

            <View style={[styles.monthProgress, { backgroundColor: colors.cardHover }]}>
              <View style={styles.monthProgressHeader}>
                <Text style={[styles.monthProgressTitle, { color: colors.textSecondary }]}>
                  Ce mois
                </Text>
                <Text style={[styles.monthProgressValue, { color: colors.textPrimary }]}>
                  {stats.thisMonthCompleted} / {stats.thisMonthTarget}
                </Text>
              </View>
              <View style={[styles.monthProgressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.monthProgressFill,
                    {
                      backgroundColor: colors.gold,
                      width: `${Math.min(100, (stats.thisMonthCompleted / stats.thisMonthTarget) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL PERSONNALISE */}
      <Modal visible={showCustomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                ⚙️ Jeûne Personnalisé
              </Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Heure de debut du jeûne
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                value={customStartTime}
                onChangeText={setCustomStartTime}
                placeholder="20:00"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Duree du jeûne (heures)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                value={customDuration}
                onChangeText={setCustomDuration}
                placeholder="16"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Jours actifs
              </Text>
              <View style={styles.daysRow}>
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: customDays.includes(i) ? colors.gold : colors.cardHover,
                        borderColor: customDays.includes(i) ? colors.gold : colors.border,
                      }
                    ]}
                    onPress={() => toggleCustomDay(i)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      { color: customDays.includes(i) ? colors.textOnGold : colors.textSecondary }
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={handleSaveCustomSettings}
              >
                <Text style={[styles.saveButtonText, { color: colors.textOnGold }]}>
                  Commencer le jeûne
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL RAMADAN */}
      <Modal visible={showRamadanModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Ramadan
              </Text>
              <TouchableOpacity onPress={() => setShowRamadanModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.ramadanInfo}>
                <MapPin size={18} color={colors.textSecondary} />
                <Text style={[styles.ramadanInfoText, { color: colors.textSecondary }]}>
                  Entre les horaires de ta ville
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Ta ville
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                value={ramadanCity}
                onChangeText={setRamadanCity}
                placeholder="Paris"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                🌅 Fajr (debut du jeûne)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                value={ramadanFajr}
                onChangeText={setRamadanFajr}
                placeholder="05:30"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                🌆 Maghrib (fin du jeûne)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                value={ramadanMaghrib}
                onChangeText={setRamadanMaghrib}
                placeholder="18:45"
                placeholderTextColor={colors.textMuted}
              />

              <View style={[styles.ramadanDuration, { backgroundColor: colors.goldMuted }]}>
                <Clock size={16} color={colors.gold} />
                <Text style={[styles.ramadanDurationText, { color: colors.gold }]}>
                  Duree du jeûne : ~{calculateDuration(ramadanFajr, ramadanMaghrib)}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={handleSaveRamadanSettings}
              >
                <Text style={[styles.saveButtonText, { color: colors.textOnGold }]}>
                  Commencer le Ramadan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <PopupComponent />
    </ScreenWrapper>
  );
}

// Helper pour calculer la duree entre deux heures
const calculateDuration = (start: string, end: string): string => {
  try {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let duration = (endH * 60 + endM) - (startH * 60 + startM);
    if (duration < 0) duration += 24 * 60;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
  } catch {
    return '--';
  }
};

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15 },

  // Sections
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },

  // Modes grid
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  modeCard: {
    width: '47%',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeIcon: { fontSize: 32, marginBottom: 8 },
  modeName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  modeDesc: { fontSize: 11, textAlign: 'center', lineHeight: 15 },

  // Modes row
  modesRow: { gap: 10, marginBottom: 20 },
  modeCardWide: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 12,
  },
  modeIconLarge: { fontSize: 28 },
  modeTextContainer: { flex: 1 },
  modeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Religious fasting cards
  religiousCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  religiousIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  religiousModeTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  religiousModeDesc: {
    fontSize: 12,
    marginTop: 3,
  },

  // Custom button
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    gap: 12,
    marginBottom: 24,
  },
  customButtonText: { flex: 1 },
  customButtonTitle: { fontSize: 16, fontWeight: '700' },
  customButtonDesc: { fontSize: 12, marginTop: 2 },

  // Timer card
  timerCard: {
    marginBottom: 24,
    borderWidth: 2,
    alignItems: 'center',
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timerModeIcon: { fontSize: 24 },
  timerModeName: { fontSize: 18, fontWeight: '700' },
  phaseIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  phaseText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  progressContainer: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: { height: '100%', borderRadius: 6 },
  timerCountdown: { fontSize: 48, fontWeight: '800', letterSpacing: 2 },
  timerLabel: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  timesRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  timeItem: { alignItems: 'center' },
  timeLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  timeValue: { fontSize: 13, fontWeight: '500' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  streakText: { fontSize: 14, fontWeight: '600' },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
  },
  stopButtonText: { fontSize: 14, fontWeight: '600' },

  // Stats card
  statsCard: { marginBottom: 20 },
  statsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 4 },
  monthProgress: { padding: 12, borderRadius: RADIUS.md },
  monthProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthProgressTitle: { fontSize: 13, fontWeight: '500' },
  monthProgressValue: { fontSize: 13, fontWeight: '700' },
  monthProgressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  monthProgressFill: { height: '100%', borderRadius: 3 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayButtonText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, fontWeight: '700' },

  // Ramadan
  ramadanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ramadanInfoText: { fontSize: 13 },
  ramadanDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    marginTop: 16,
  },
  ramadanDurationText: { fontSize: 14, fontWeight: '600' },
});
