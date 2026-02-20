// ============================================
// SAISIE RAPIDE RUNNING
// Interface simple pour logger ses runs
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Minus,
  Check,
  Clock,
  MapPin,
  Zap,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  ProgressionItem,
  PracticeLog,
  getProgressionItems,
  createProgressionItem,
  createPracticeLog,
  getPracticeLogsByItemId,
} from '@/lib/trainingJournalService';

export default function QuickLogRunningScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // États
  const [runType, setRunType] = useState('Course Libre');
  const [isSaving, setIsSaving] = useState(false);
  const [distance, setDistance] = useState('5');
  const [timeMinutes, setTimeMinutes] = useState('25');
  const [timeSeconds, setTimeSeconds] = useState('00');
  const [feeling, setFeeling] = useState(3); // 1-5
  const [lastRuns, setLastRuns] = useState<PracticeLog[]>([]);

  // Calculer l'allure (min/km)
  const pace = () => {
    const dist = parseFloat(distance) || 0;
    const mins = parseInt(timeMinutes) || 0;
    const secs = parseInt(timeSeconds) || 0;
    const totalMinutes = mins + secs / 60;

    if (dist === 0 || totalMinutes === 0) return '-';

    const paceValue = totalMinutes / dist;
    const paceMin = Math.floor(paceValue);
    const paceSec = Math.round((paceValue - paceMin) * 60);

    return `${paceMin}'${paceSec.toString().padStart(2, '0')}"/km`;
  };

  // Charger les derniers runs
  useEffect(() => {
    loadLastRuns();
  }, []);

  const loadLastRuns = () => {
    const items = getProgressionItems();
    const runItem = items.find((item) => item.sport === 'running');

    if (runItem) {
      const logs = getPracticeLogsByItemId(runItem.id).slice(0, 5);
      setLastRuns(logs);
    }
  };

  const incrementValue = (
    field: 'distance' | 'timeMinutes' | 'timeSeconds',
    increment: number
  ) => {
    impactAsync(ImpactFeedbackStyle.Light);

    if (field === 'distance') {
      const newValue = (parseFloat(distance) || 0) + increment;
      setDistance(newValue.toFixed(1));
    } else if (field === 'timeMinutes') {
      const newValue = (parseInt(timeMinutes) || 0) + increment;
      setTimeMinutes(Math.max(0, newValue).toString());
    } else {
      const newValue = (parseInt(timeSeconds) || 0) + increment;
      if (newValue >= 60) {
        setTimeSeconds('00');
        setTimeMinutes((parseInt(timeMinutes) + 1).toString());
      } else if (newValue < 0) {
        setTimeSeconds('00');
      } else {
        setTimeSeconds(newValue.toString().padStart(2, '0'));
      }
    }
  };

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    const dist = parseFloat(distance);
    const mins = parseInt(timeMinutes);
    const secs = parseInt(timeSeconds);

    if (!dist || dist <= 0) {
      showPopup('Erreur', 'Entre une distance valide', [
        { text: 'OK', style: 'primary' }
      ]);
      return;
    }

    if (!mins && !secs) {
      showPopup('Erreur', 'Entre un temps valide', [
        { text: 'OK', style: 'primary' }
      ]);
      return;
    }

    notificationAsync(NotificationFeedbackType.Success);

    // Chercher ou créer l'item "Running"
    let items = getProgressionItems();
    let runItem = items.find((item) => item.sport === 'running');

    if (!runItem) {
      const itemId = createProgressionItem({
        type: 'performance',
        sport: 'running',
        name: runType,
        status: 'in_progress',
        priority: 3,
      });
      runItem = { id: itemId } as ProgressionItem;
    }

    // Logger le run
    const totalSeconds = mins * 60 + secs;
    createPracticeLog({
      item_id: runItem.id,
      date: new Date().toISOString(),
      distance: dist,
      time: totalSeconds,
      quality_rating: feeling,
    });

    showPopup(
      'Run enregistré',
      `${dist}km en ${mins}min ${secs}s (${pace()})`,
      [
        {
          text: 'OK',
          style: 'primary',
          onPress: () => router.back(),
        },
      ]
    );
    setIsSaving(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Running
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: isSaving ? colors.textMuted : colors.accent }]}
        >
          <Check size={20} color={colors.textOnGold} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type de course */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            TYPE DE COURSE
          </Text>
          <View style={styles.typeButtons}>
            {['Course Libre', 'Interval Training', 'Long Run'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      runType === type ? colors.accent : colors.backgroundCard,
                    borderColor: runType === type ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setRunType(type);
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color: runType === type ? '#FFFFFF' : colors.textPrimary,
                    },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            DISTANCE (KM)
          </Text>
          <View
            style={[
              styles.inputCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <MapPin size={24} color="#3B82F6" />
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => incrementValue('distance', -0.5)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: colors.backgroundElevated },
                ]}
              >
                <Minus size={18} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
              <TextInput
                style={[styles.stepperValue, { color: colors.textPrimary }]}
                value={distance}
                onChangeText={(text) => setDistance(text.replace(',', '.'))}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                onPress={() => incrementValue('distance', 0.5)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: colors.backgroundElevated },
                ]}
              >
                <Plus size={18} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.unit, { color: colors.textMuted }]}>km</Text>
          </View>
        </View>

        {/* Temps */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            TEMPS
          </Text>
          <View
            style={[
              styles.inputCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <Clock size={24} color="#10B981" />
            <View style={styles.timeInputs}>
              {/* Minutes */}
              <View style={styles.timeGroup}>
                <TouchableOpacity
                  onPress={() => incrementValue('timeMinutes', -1)}
                  style={[
                    styles.stepperButton,
                    { backgroundColor: colors.backgroundElevated },
                  ]}
                >
                  <Minus size={18} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.timeValue, { color: colors.textPrimary }]}
                  value={timeMinutes}
                  onChangeText={setTimeMinutes}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TouchableOpacity
                  onPress={() => incrementValue('timeMinutes', 1)}
                  style={[
                    styles.stepperButton,
                    { backgroundColor: colors.backgroundElevated },
                  ]}
                >
                  <Plus size={18} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={[styles.timeUnit, { color: colors.textMuted }]}>
                  min
                </Text>
              </View>

              <Text style={[styles.timeSeparator, { color: colors.textMuted }]}>
                :
              </Text>

              {/* Secondes */}
              <View style={styles.timeGroup}>
                <TouchableOpacity
                  onPress={() => incrementValue('timeSeconds', -5)}
                  style={[
                    styles.stepperButton,
                    { backgroundColor: colors.backgroundElevated },
                  ]}
                >
                  <Minus size={18} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.timeValue, { color: colors.textPrimary }]}
                  value={timeSeconds}
                  onChangeText={setTimeSeconds}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <TouchableOpacity
                  onPress={() => incrementValue('timeSeconds', 5)}
                  style={[
                    styles.stepperButton,
                    { backgroundColor: colors.backgroundElevated },
                  ]}
                >
                  <Plus size={18} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={[styles.timeUnit, { color: colors.textMuted }]}>
                  sec
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Allure calculée */}
        <View
          style={[
            styles.paceCard,
            { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` },
          ]}
        >
          <Zap size={20} color={colors.accent} />
          <Text style={[styles.paceLabel, { color: isDark ? colors.accent : colors.textPrimary }]}>
            Allure moyenne :
          </Text>
          <Text style={[styles.paceValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
            {pace()}
          </Text>
        </View>

        {/* Ressenti */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            RESSENTI
          </Text>
          <View style={styles.feelingButtons}>
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.feelingButton,
                  {
                    backgroundColor:
                      feeling === level ? colors.accent : colors.backgroundCard,
                    borderColor: feeling === level ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setFeeling(level);
                }}
              >
                <Text
                  style={[
                    styles.feelingEmoji,
                    { opacity: feeling === level ? 1 : 0.5 },
                  ]}
                >
                  {level === 1
                    ? '1'
                    : level === 2
                    ? '2'
                    : level === 3
                    ? '3'
                    : level === 4
                    ? '4'
                    : '5'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Derniers runs */}
        {lastRuns.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              DERNIERS RUNS
            </Text>
            {lastRuns.map((log, index) => (
              <View
                key={log.id}
                style={[
                  styles.lastRunCard,
                  { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                ]}
              >
                <TrendingUp size={16} color={colors.accent} />
                <Text style={[styles.lastRunText, { color: colors.textPrimary }]}>
                  {log.distance}km
                </Text>
                <Text style={[styles.lastRunDot, { color: colors.textMuted }]}>
                  •
                </Text>
                <Text style={[styles.lastRunText, { color: colors.textPrimary }]}>
                  {Math.floor((log.time || 0) / 60)}'
                  {((log.time || 0) % 60).toString().padStart(2, '0')}"
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  typeButtons: {
    gap: 8,
  },
  typeButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  stepperContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeValue: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  timeUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
  },
  paceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  paceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  paceValue: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 'auto',
  },
  feelingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feelingButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    aspectRatio: 1,
  },
  feelingEmoji: {
    fontSize: 28,
  },
  lastRunCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 6,
    borderWidth: 1,
  },
  lastRunText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastRunDot: {
    fontSize: 13,
    fontWeight: '600',
  },
});
