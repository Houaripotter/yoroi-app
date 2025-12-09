import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, Clock, Calendar, Dumbbell } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReminderSettings as ReminderSettingsType,
  ReminderType,
  DayOfWeek,
  requestNotificationPermissions,
  scheduleNotifications,
  checkNotificationPermissions,
  testNotification,
} from '@/lib/notificationService';

const DAYS_OF_WEEK = [
  { label: 'Dim', value: 0 as DayOfWeek },
  { label: 'Lun', value: 1 as DayOfWeek },
  { label: 'Mar', value: 2 as DayOfWeek },
  { label: 'Mer', value: 3 as DayOfWeek },
  { label: 'Jeu', value: 4 as DayOfWeek },
  { label: 'Ven', value: 5 as DayOfWeek },
  { label: 'Sam', value: 6 as DayOfWeek },
];

const REMINDER_TYPES: { label: string; value: ReminderType; icon: string }[] = [
  { label: 'Pesée', value: 'weight', icon: '⚖️' },
  { label: 'Entraînement', value: 'workout', icon: '💪' },
  { label: 'Les deux', value: 'both', icon: '🛡️' },
];

const STORAGE_KEY = '@yoroi_reminder_settings';

export function ReminderSettingsComponent() {
  const [settings, setSettings] = useState<ReminderSettingsType>({
    enabled: false,
    time: '07:00',
    days: [1, 2, 3, 4, 5], // Lun-Ven par défaut
    type: 'weight',
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les paramètres au montage
  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: ReminderSettingsType) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);

      // Planifier les notifications
      await scheduleNotifications(newSettings);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des paramètres:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    }
  };

  const checkPermissions = async () => {
    const permission = await checkNotificationPermissions();
    setHasPermission(permission);
  };

  const handleToggle = async (value: boolean) => {
    if (value && !hasPermission) {
      // Demander la permission
      const granted = await requestNotificationPermissions();
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permission requise',
          'Les notifications sont nécessaires pour les rappels. Veuillez autoriser les notifications dans les paramètres de votre appareil.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const newSettings = { ...settings, enabled: value };
    await saveSettings(newSettings);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      const newSettings = { ...settings, time: timeString };
      saveSettings(newSettings);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    const newDays = settings.days.includes(day)
      ? settings.days.filter((d) => d !== day)
      : [...settings.days, day].sort();

    if (newDays.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un jour');
      return;
    }

    const newSettings = { ...settings, days: newDays };
    saveSettings(newSettings);
  };

  const selectAllDays = () => {
    const allDays: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
    const newSettings = { ...settings, days: allDays };
    saveSettings(newSettings);
  };

  const selectWeekdays = () => {
    const weekdays: DayOfWeek[] = [1, 2, 3, 4, 5];
    const newSettings = { ...settings, days: weekdays };
    saveSettings(newSettings);
  };

  const handleTypeChange = (type: ReminderType) => {
    const newSettings = { ...settings, type };
    saveSettings(newSettings);
  };

  const handleTestNotification = async () => {
    await testNotification(settings.type);
    Alert.alert('Test', 'Une notification de test sera affichée dans 2 secondes');
  };

  if (loading) {
    return <View style={styles.container} />;
  }

  const timeDate = new Date();
  const [hours, minutes] = settings.time.split(':').map(Number);
  timeDate.setHours(hours, minutes);

  return (
    <View style={styles.container}>
      {/* Toggle principal */}
      <View style={styles.mainToggle}>
        <View style={styles.toggleLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#34D39920' }]}>
            <Bell size={20} color="#34D399" strokeWidth={2.5} />
          </View>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Activer les rappels</Text>
            <Text style={styles.toggleSubtitle}>
              {hasPermission ? 'Notifications autorisées' : 'Permissions requises'}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#E2E8F0', true: '#34D399' }}
          thumbColor={settings.enabled ? '#FFFFFF' : '#CBD5E0'}
          ios_backgroundColor="#E2E8F0"
        />
      </View>

      {settings.enabled && (
        <View style={styles.settingsContent}>
          {/* Sélecteur d'heure */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HEURE DU RAPPEL</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.timeButtonLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
                  <Clock size={20} color="#3B82F6" strokeWidth={2.5} />
                </View>
                <Text style={styles.timeText}>{settings.time}</Text>
              </View>
              <Text style={styles.changeText}>Modifier</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Sélection des jours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>JOURS DE LA SEMAINE</Text>

            {/* Raccourcis */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={styles.shortcutButton}
                onPress={selectAllDays}
                activeOpacity={0.7}
              >
                <Text style={styles.shortcutText}>Tous les jours</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shortcutButton}
                onPress={selectWeekdays}
                activeOpacity={0.7}
              >
                <Text style={styles.shortcutText}>Semaine</Text>
              </TouchableOpacity>
            </View>

            {/* Jours */}
            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = settings.days.includes(day.value);
                return (
                  <TouchableOpacity
                    key={day.value}
                    style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                    onPress={() => toggleDay(day.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Type de rappel */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TYPE DE RAPPEL</Text>
            <View style={styles.typesGrid}>
              {REMINDER_TYPES.map((type) => {
                const isSelected = settings.type === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeButton, isSelected && styles.typeButtonActive]}
                    onPress={() => handleTypeChange(type.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={[styles.typeText, isSelected && styles.typeTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bouton de test */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>Tester la notification</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
  },
  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  toggleSubtitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  settingsContent: {
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  timeButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  timeText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  changeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  shortcutButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    ...theme.shadow.xs,
  },
  shortcutText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadow.xs,
  },
  dayButtonActive: {
    backgroundColor: '#34D399',
    borderColor: '#34D399',
  },
  dayText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  typesGrid: {
    gap: theme.spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadow.xs,
  },
  typeButtonActive: {
    backgroundColor: '#34D39910',
    borderColor: '#34D399',
  },
  typeIcon: {
    fontSize: 24,
  },
  typeText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  typeTextActive: {
    color: theme.colors.primary,
  },
  testButton: {
    backgroundColor: theme.colors.beigeLight,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  testButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
});
