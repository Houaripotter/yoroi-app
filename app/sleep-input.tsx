/**
 * sleep-input.tsx
 * Écran de saisie manuelle du sommeil (modal)
 * Permet d'enregistrer manuellement les heures de coucher/réveil
 * Sauvegarde localement + sync optionnelle avec Apple Health
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, Sun, ChevronLeft, Check, Clock, Calendar } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { addSleepEntry } from '@/lib/sleepService';
import { healthConnect } from '@/lib/healthConnect';
import { useCustomPopup } from '@/components/CustomPopup';
import { logger } from '@/lib/security/logger';
import { format, Locale } from 'date-fns';
import { fr, enUS, es, pt, de, it, ru, ar, zhCN } from 'date-fns/locale';

const DATE_LOCALES: Record<string, Locale> = {
  fr, en: enUS, es, pt, de, it, ru, ar, zh: zhCN
};

// Défauts intelligents : hier 23:00 → aujourd'hui 07:00
function getDefaultBedtime(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 0, 0, 0);
  return d;
}

function getDefaultWakeTime(): Date {
  const d = new Date();
  d.setHours(7, 0, 0, 0);
  return d;
}

// Qualité labels
const QUALITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Terrible', color: '#EF4444' },
  2: { label: 'Mauvais', color: '#F97316' },
  3: { label: 'Correct', color: '#F59E0B' },
  4: { label: 'Bon', color: '#10B981' },
  5: { label: 'Excellent', color: '#8B5CF6' },
};

export default function SleepInputScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();
  const dateLocale = DATE_LOCALES[language] || fr;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bedtime, setBedtime] = useState(getDefaultBedtime);
  const [wakeTime, setWakeTime] = useState(getDefaultWakeTime);
  const [activePicker, setActivePicker] = useState<'date' | 'bedtime' | 'wake' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [quality, setQuality] = useState(3);

  // Calculer la durée du sommeil
  const calculateDuration = (): number => {
    const diffMs = wakeTime.getTime() - bedtime.getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const duration = calculateDuration();

  // Format durée en heures et minutes
  const formatDuration = (hours: number): string => {
    if (hours <= 0) return '0h 00min';
    const h = Math.floor(hours);
    const min = Math.round((hours - h) * 60);
    return `${h}h ${min.toString().padStart(2, '0')}min`;
  };

  // Sauvegarder le sommeil
  const handleSave = async () => {
    if (isSaving) return;

    // Validation
    if (duration <= 0) {
      showPopup(
        t('common.error'),
        t('sleepInput.wakeAfterBed'),
        [{ text: 'OK', style: 'primary' }]
      );
      return;
    }

    if (duration > 16) {
      showPopup(
        t('common.error'),
        t('sleepInput.maxDuration'),
        [{ text: 'OK', style: 'primary' }]
      );
      return;
    }

    setIsSaving(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      // Sauvegarder localement via sleepService
      const bedTimeStr = format(bedtime, 'HH:mm');
      const wakeTimeStr = format(wakeTime, 'HH:mm');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await addSleepEntry(bedTimeStr, wakeTimeStr, quality, '', dateStr);

      // Aussi écrire dans Apple Health (en arrière-plan, non bloquant)
      try {
        await healthConnect.writeSleepData({
          startDate: bedtime,
          endDate: wakeTime,
        });
      } catch {
        // Pas grave si Apple Health échoue
      }

      notificationAsync(NotificationFeedbackType.Success);
      showPopup(
        t('sleepInput.sleepSaved'),
        `${formatDuration(duration)} - ${format(selectedDate, 'EEEE d MMMM', { locale: dateLocale })}`,
        [{
          text: 'OK',
          style: 'primary',
          onPress: () => router.back(),
        }]
      );
    } catch (error) {
      logger.error('Error saving sleep:', error);
      notificationAsync(NotificationFeedbackType.Error);
      showPopup(
        t('common.error'),
        t('sleepInput.saveError'),
        [{ text: 'OK', style: 'primary' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handler DateTimePicker
  const handleDateChange = (type: 'date' | 'bedtime' | 'wake') => (event: DateTimePickerEvent, selectedDateValue?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (selectedDateValue) {
      if (type === 'date') {
        setSelectedDate(selectedDateValue);
      } else if (type === 'bedtime') {
        setBedtime(selectedDateValue);
      } else {
        setWakeTime(selectedDateValue);
      }
    }
  };

  // Status color based on duration
  const getStatusColor = (): string => {
    if (duration <= 0) return '#6B7280';
    if (duration < 5) return '#DC2626';
    if (duration < 7) return '#F59E0B';
    if (duration <= 9) return '#10B981';
    return '#3B82F6';
  };

  const getStatusLabel = (): string => {
    if (duration <= 0) return '\u2014';
    if (duration < 5) return t('sleepInput.insufficient');
    if (duration < 7) return t('sleepInput.average');
    if (duration <= 9) return t('sleepInput.optimal');
    return t('sleepInput.high');
  };

  const qualityInfo = QUALITY_LABELS[quality];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Moon size={32} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.headerTitle}>{t('sleepInput.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('sleepInput.subtitle')}</Text>
        </View>
      </LinearGradient>

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Sélecteur de date */}
        <TouchableOpacity
          style={[styles.dateSection, { backgroundColor: colors.backgroundCard }]}
          onPress={() => setActivePicker(activePicker === 'date' ? null : 'date')}
          activeOpacity={0.7}
        >
          <View style={styles.timeSectionHeader}>
            <View style={[styles.timeIconContainer, { backgroundColor: '#8B5CF620' }]}>
              <Calendar size={20} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <View style={styles.timeSectionText}>
              <Text style={[styles.timeSectionTitle, { color: colors.textMuted }]}>
                {t('sleepInput.nightOf')}
              </Text>
              <Text style={[styles.timeValue, { color: colors.textPrimary }]}>
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: dateLocale })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Picker date inline (iOS) */}
        {activePicker === 'date' && Platform.OS === 'ios' && (
          <View style={[styles.pickerContainer, { backgroundColor: colors.backgroundCard }]}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange('date')}
              locale={language}
              maximumDate={new Date()}
            />
            <TouchableOpacity
              style={[styles.pickerDoneButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => setActivePicker(null)}
            >
              <Text style={styles.pickerDoneText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Carte Durée */}
        <View style={[styles.durationCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.durationLabel, { color: colors.textMuted }]}>
            {t('sleepInput.sleepDuration')}
          </Text>
          <Text style={[styles.durationValue, { color: getStatusColor() }]}>
            {formatDuration(duration)}
          </Text>
          {duration > 0 && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          )}
        </View>

        {/* Heure de coucher */}
        <TouchableOpacity
          style={[styles.timeSection, { backgroundColor: colors.backgroundCard }]}
          onPress={() => setActivePicker(activePicker === 'bedtime' ? null : 'bedtime')}
          activeOpacity={0.7}
        >
          <View style={styles.timeSectionHeader}>
            <View style={[styles.timeIconContainer, { backgroundColor: '#6366F120' }]}>
              <Moon size={20} color="#6366F1" strokeWidth={2.5} />
            </View>
            <View style={styles.timeSectionText}>
              <Text style={[styles.timeSectionTitle, { color: colors.textMuted }]}>
                {t('sleepInput.bedtime')}
              </Text>
              <Text style={[styles.timeValue, { color: colors.textPrimary }]}>
                {format(bedtime, 'HH:mm')} - {format(bedtime, 'dd MMM', { locale: dateLocale })}
              </Text>
            </View>
            <Clock size={20} color={colors.textMuted} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Picker coucher inline (iOS) */}
        {activePicker === 'bedtime' && Platform.OS === 'ios' && (
          <View style={[styles.pickerContainer, { backgroundColor: colors.backgroundCard }]}>
            <DateTimePicker
              value={bedtime}
              mode="datetime"
              is24Hour={true}
              display="spinner"
              onChange={handleDateChange('bedtime')}
              locale={language}
            />
            <TouchableOpacity
              style={[styles.pickerDoneButton, { backgroundColor: '#6366F1' }]}
              onPress={() => setActivePicker(null)}
            >
              <Text style={styles.pickerDoneText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Heure de réveil */}
        <TouchableOpacity
          style={[styles.timeSection, { backgroundColor: colors.backgroundCard }]}
          onPress={() => setActivePicker(activePicker === 'wake' ? null : 'wake')}
          activeOpacity={0.7}
        >
          <View style={styles.timeSectionHeader}>
            <View style={[styles.timeIconContainer, { backgroundColor: '#F59E0B20' }]}>
              <Sun size={20} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <View style={styles.timeSectionText}>
              <Text style={[styles.timeSectionTitle, { color: colors.textMuted }]}>
                {t('sleepInput.wakeTime')}
              </Text>
              <Text style={[styles.timeValue, { color: colors.textPrimary }]}>
                {format(wakeTime, 'HH:mm')} - {format(wakeTime, 'dd MMM', { locale: dateLocale })}
              </Text>
            </View>
            <Clock size={20} color={colors.textMuted} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Picker réveil inline (iOS) */}
        {activePicker === 'wake' && Platform.OS === 'ios' && (
          <View style={[styles.pickerContainer, { backgroundColor: colors.backgroundCard }]}>
            <DateTimePicker
              value={wakeTime}
              mode="datetime"
              is24Hour={true}
              display="spinner"
              onChange={handleDateChange('wake')}
              locale={language}
            />
            <TouchableOpacity
              style={[styles.pickerDoneButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => setActivePicker(null)}
            >
              <Text style={styles.pickerDoneText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Qualité */}
        <View style={[styles.qualitySection, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.qualityTitle, { color: colors.textMuted }]}>
            {t('sleep.sleepQuality')}
          </Text>
          <View style={styles.qualityRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setQuality(i); impactAsync(ImpactFeedbackStyle.Light); }}
                style={[styles.qualityStar, {
                  backgroundColor: i <= quality ? qualityInfo.color + '20' : 'transparent',
                  borderColor: i <= quality ? qualityInfo.color : colors.border,
                }]}
              >
                <Text style={{ fontSize: 24 }}>{i <= quality ? '\u2B50' : '\u2606'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.qualityBadge, { backgroundColor: qualityInfo.color + '15' }]}>
            <Text style={[styles.qualityBadgeText, { color: qualityInfo.color }]}>
              {quality}/5 - {qualityInfo.label}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bouton Enregistrer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { opacity: isSaving || duration <= 0 ? 0.5 : 1 },
          ]}
          onPress={handleSave}
          disabled={isSaving || duration <= 0}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.saveButtonText}>
              {isSaving ? t('sleepInput.saving') : t('common.save')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Android pickers (modal style) */}
      {activePicker === 'date' && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange('date')}
          maximumDate={new Date()}
        />
      )}
      {activePicker === 'bedtime' && Platform.OS === 'android' && (
        <DateTimePicker
          value={bedtime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleDateChange('bedtime')}
        />
      )}
      {activePicker === 'wake' && Platform.OS === 'android' && (
        <DateTimePicker
          value={wakeTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleDateChange('wake')}
        />
      )}

      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  dateSection: {
    borderRadius: 16,
    padding: 16,
  },
  durationCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  durationValue: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeSection: {
    borderRadius: 16,
    padding: 16,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSectionText: {
    flex: 1,
  },
  timeSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pickerContainer: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginTop: -4,
  },
  pickerDoneButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  pickerDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  qualitySection: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  qualityTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qualityStar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  qualityBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
});
