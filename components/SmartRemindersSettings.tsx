import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Bell,
  Scale,
  Dumbbell,
  Droplets,
  Ruler,
  Flame,
  RefreshCw,
  Brain,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  SmartReminderSettings,
  DetectedHabits,
  getSmartReminderSettings,
  saveSmartReminderSettings,
  getDetectedHabits,
  analyzeHabits,
  formatWeighTime,
  formatTrainingDays,
  daysSinceLastMeasurements,
  DEFAULT_SETTINGS,
  DEFAULT_HABITS,
} from '@/lib/smartReminders';

// ============================================
// SMART REMINDERS SETTINGS COMPONENT
// ============================================

export const SmartRemindersSettings: React.FC = () => {
  const { colors } = useTheme();

  const [settings, setSettings] = useState<SmartReminderSettings>(DEFAULT_SETTINGS);
  const [habits, setHabits] = useState<DetectedHabits>(DEFAULT_HABITS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Charger les donnees
  const loadData = useCallback(async () => {
    try {
      const [savedSettings, detectedHabits] = await Promise.all([
        getSmartReminderSettings(),
        getDetectedHabits(),
      ]);
      setSettings(savedSettings);
      setHabits(detectedHabits);
    } catch (error) {
      console.error('Erreur chargement smart reminders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Forcer une re-analyse des habitudes
  const handleRefreshHabits = async () => {
    setIsRefreshing(true);
    try {
      const newHabits = await analyzeHabits();
      setHabits(newHabits);
    } catch (error) {
      console.error('Erreur refresh habitudes:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mettre a jour un parametre
  const updateSetting = async (key: keyof SmartReminderSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSmartReminderSettings({ [key]: value });
  };

  // Calculer les infos de mensurations
  const measurementsDays = daysSinceLastMeasurements(habits);
  const measurementsInfo = measurementsDays >= 0
    ? measurementsDays === 0
      ? 'Fait aujourd\'hui'
      : `Il y a ${measurementsDays} jour${measurementsDays > 1 ? 's' : ''}`
    : 'Jamais fait';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: colors.gold + '20' }]}>
            <Brain size={20} color={colors.gold} strokeWidth={2} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Rappels intelligents
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              S'adaptent a tes habitudes
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.cardHover }]}
          onPress={handleRefreshHabits}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <RefreshCw size={16} color={colors.textSecondary} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      {/* Rappel Pesee */}
      <View style={[styles.reminderItem, { borderBottomColor: colors.border }]}>
        <View style={[styles.reminderIcon, { backgroundColor: colors.gold + '20' }]}>
          <Scale size={18} color={colors.gold} strokeWidth={2} />
        </View>
        <View style={styles.reminderContent}>
          <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>
            Rappel pesee
          </Text>
          <View style={styles.detectedInfo}>
            <Text style={[styles.detectedLabel, { color: colors.textMuted }]}>
              Detecte :
            </Text>
            <Text style={[styles.detectedValue, { color: colors.textSecondary }]}>
              {formatWeighTime(habits.avgWeighTime)}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.weightReminder}
          onValueChange={(value) => updateSetting('weightReminder', value)}
          trackColor={{ false: colors.border, true: colors.gold + '60' }}
          thumbColor={settings.weightReminder ? colors.gold : colors.textMuted}
          ios_backgroundColor={colors.border}
        />
      </View>

      {/* Rappel Entrainement */}
      <View style={[styles.reminderItem, { borderBottomColor: colors.border }]}>
        <View style={[styles.reminderIcon, { backgroundColor: '#22C55E' + '20' }]}>
          <Dumbbell size={18} color="#22C55E" strokeWidth={2} />
        </View>
        <View style={styles.reminderContent}>
          <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>
            Rappel entrainement
          </Text>
          <View style={styles.detectedInfo}>
            <Text style={[styles.detectedLabel, { color: colors.textMuted }]}>
              Detecte :
            </Text>
            <Text style={[styles.detectedValue, { color: colors.textSecondary }]}>
              {formatTrainingDays(habits.trainingDays)}
              {habits.avgTrainingTime && ` vers ${habits.avgTrainingTime}`}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.trainingReminder}
          onValueChange={(value) => updateSetting('trainingReminder', value)}
          trackColor={{ false: colors.border, true: '#22C55E' + '60' }}
          thumbColor={settings.trainingReminder ? '#22C55E' : colors.textMuted}
          ios_backgroundColor={colors.border}
        />
      </View>

      {/* Rappel Hydratation */}
      <View style={[styles.reminderItem, { borderBottomColor: colors.border }]}>
        <View style={[styles.reminderIcon, { backgroundColor: '#3B82F6' + '20' }]}>
          <Droplets size={18} color="#3B82F6" strokeWidth={2} />
        </View>
        <View style={styles.reminderContent}>
          <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>
            Rappel hydratation
          </Text>
          <View style={styles.detectedInfo}>
            <Text style={[styles.detectedValue, { color: colors.textSecondary }]}>
              Toutes les {settings.hydrationIntervalHours}h
            </Text>
          </View>
        </View>
        <Switch
          value={settings.hydrationReminder}
          onValueChange={(value) => updateSetting('hydrationReminder', value)}
          trackColor={{ false: colors.border, true: '#3B82F6' + '60' }}
          thumbColor={settings.hydrationReminder ? '#3B82F6' : colors.textMuted}
          ios_backgroundColor={colors.border}
        />
      </View>

      {/* Rappel Mensurations */}
      <View style={[styles.reminderItem, { borderBottomColor: colors.border }]}>
        <View style={[styles.reminderIcon, { backgroundColor: '#A855F7' + '20' }]}>
          <Ruler size={18} color="#A855F7" strokeWidth={2} />
        </View>
        <View style={styles.reminderContent}>
          <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>
            Rappel mensurations
          </Text>
          <View style={styles.detectedInfo}>
            <Text style={[styles.detectedLabel, { color: colors.textMuted }]}>
              Derniere :
            </Text>
            <Text style={[styles.detectedValue, { color: colors.textSecondary }]}>
              {measurementsInfo}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.measurementsReminder}
          onValueChange={(value) => updateSetting('measurementsReminder', value)}
          trackColor={{ false: colors.border, true: '#A855F7' + '60' }}
          thumbColor={settings.measurementsReminder ? '#A855F7' : colors.textMuted}
          ios_backgroundColor={colors.border}
        />
      </View>

      {/* Protection Streak */}
      <View style={[styles.reminderItem, { borderBottomWidth: 0 }]}>
        <View style={[styles.reminderIcon, { backgroundColor: '#F59E0B' + '20' }]}>
          <Flame size={18} color="#F59E0B" strokeWidth={2} />
        </View>
        <View style={styles.reminderContent}>
          <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>
            Protection streak
          </Text>
          <View style={styles.detectedInfo}>
            <Text style={[styles.detectedLabel, { color: colors.textMuted }]}>
              Streak actuel :
            </Text>
            <Text style={[styles.detectedValue, { color: colors.gold }]}>
              {habits.currentStreak} jour{habits.currentStreak > 1 ? 's' : ''} 🔥
            </Text>
          </View>
        </View>
        <Switch
          value={settings.streakProtection}
          onValueChange={(value) => updateSetting('streakProtection', value)}
          trackColor={{ false: colors.border, true: '#F59E0B' + '60' }}
          thumbColor={settings.streakProtection ? '#F59E0B' : colors.textMuted}
          ios_backgroundColor={colors.border}
        />
      </View>

      {/* Info */}
      <View style={[styles.infoBox, { backgroundColor: colors.cardHover }]}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Les rappels s'adaptent automatiquement a tes habitudes. L'analyse est
          mise a jour chaque semaine.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  detectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detectedLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  detectedValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default SmartRemindersSettings;
