// ============================================
// SAISIE RAPIDE AUTRES ACTIVITÉS
// Vélo, Natation, Yoga, etc.
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
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
  Heart,
  Activity,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  Sport,
  ProgressionItem,
  createProgressionItem,
  createPracticeLog,
  getProgressionItems,
  getLastPracticeLog,
} from '@/lib/trainingJournalService';

type OtherActivity = 'bike' | 'swimming' | 'yoga' | 'hiking' | 'autre';

interface ActivityConfig {
  id: OtherActivity;
  sport: Sport;
  label: string;
  icon: string;
  color: string;
  fields: ('duration' | 'distance' | 'intensity' | 'calories')[];
  iconType: 'lucide' | 'material';
}

const ACTIVITIES: ActivityConfig[] = [
  {
    id: 'bike',
    sport: 'autre',
    label: 'Vélo',
    icon: 'bike',
    color: '#3B82F6',
    fields: ['duration', 'distance', 'intensity'],
    iconType: 'material',
  },
  {
    id: 'swimming',
    sport: 'autre',
    label: 'Natation',
    icon: 'swim',
    color: '#06B6D4',
    fields: ['duration', 'distance'],
    iconType: 'material',
  },
  {
    id: 'yoga',
    sport: 'autre',
    label: 'Yoga',
    icon: 'yoga',
    color: '#8B5CF6',
    fields: ['duration', 'intensity'],
    iconType: 'material',
  },
  {
    id: 'hiking',
    sport: 'trail',
    label: 'Randonnée',
    icon: 'hiking',
    color: '#10B981',
    fields: ['duration', 'distance'],
    iconType: 'material',
  },
  {
    id: 'autre',
    sport: 'autre',
    label: 'Autre',
    icon: 'activity',
    color: '#6B7280',
    fields: ['duration'],
    iconType: 'lucide',
  },
];

export default function QuickLogOtherScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // États
  const [selectedActivity, setSelectedActivity] = useState<ActivityConfig | null>(null);
  const [activityName, setActivityName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [distance, setDistance] = useState('10');
  const [intensity, setIntensity] = useState(3); // 1-5
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedActivity) {
      setActivityName(selectedActivity.label);
    }
  }, [selectedActivity]);

  const incrementValue = (field: 'duration' | 'distance', increment: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (field === 'duration') {
      const newValue = (parseInt(durationMinutes) || 0) + increment;
      setDurationMinutes(Math.max(0, newValue).toString());
    } else {
      const newValue = (parseFloat(distance) || 0) + increment;
      setDistance(Math.max(0, newValue).toFixed(1));
    }
  };

  const handleSave = () => {
    if (!selectedActivity) {
      Alert.alert('Erreur', 'Sélectionne une activité');
      return;
    }

    const duration = parseInt(durationMinutes) || 0;
    if (duration === 0) {
      Alert.alert('Erreur', 'Entre une durée valide');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Créer ou récupérer l'item
    const items = getProgressionItems();
    let item = items.find(
      (i) => i.name === activityName && i.sport === selectedActivity.sport
    );

    let itemId = item?.id;

    if (!itemId) {
      itemId = createProgressionItem({
        type: 'performance',
        sport: selectedActivity.sport,
        name: activityName,
        status: 'in_progress',
        priority: 3,
      });
    }

    // Logger la séance
    createPracticeLog({
      item_id: itemId,
      date: new Date().toISOString(),
      time: duration * 60,
      distance: distance ? parseFloat(distance) : undefined,
      quality_rating: intensity,
      notes: notes || undefined,
    });

    Alert.alert(
      'Séance enregistrée',
      `${activityName} : ${duration} minutes`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const renderIcon = (activity: ActivityConfig, size: number) => {
    if (activity.iconType === 'material') {
      return <MaterialCommunityIcons name={activity.icon as any} size={size} color={activity.color} />;
    }

    return <Activity size={size} color={activity.color} strokeWidth={2.5} />;
  };

  if (!selectedActivity) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Autre Activité
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.selectTitle, { color: colors.textPrimary }]}>
            Quelle activité ?
          </Text>

          <View style={styles.activitiesGrid}>
            {ACTIVITIES.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityCard,
                  { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setSelectedActivity(activity);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.activityIconContainer,
                    { backgroundColor: `${activity.color}15` },
                  ]}
                >
                  {renderIcon(activity, 32)}
                </View>
                <Text style={[styles.activityLabel, { color: colors.textPrimary }]}>
                  {activity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedActivity(null);
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {selectedActivity.label}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
        >
          <Check size={20} color={colors.textOnGold} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nom de l'activité */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            NOM DE L'ACTIVITÉ
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundCard,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={activityName}
            onChangeText={setActivityName}
            placeholder={`Ex: ${selectedActivity.label} en montagne`}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Durée */}
        {selectedActivity.fields.includes('duration') && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              DURÉE (MIN)
            </Text>
            <View
              style={[
                styles.inputCard,
                { backgroundColor: colors.backgroundCard, borderColor: colors.border },
              ]}
            >
              <Clock size={24} color={selectedActivity.color} />
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  onPress={() => incrementValue('duration', -5)}
                  style={[
                    styles.stepperButton,
                    { backgroundColor: colors.backgroundElevated },
                  ]}
                >
                  <Minus size={18} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.stepperValue, { color: colors.textPrimary }]}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  onPress={() => incrementValue('duration', 5)}
                  style={[
                    styles.stepperButton,
                    { backgroundColor: colors.backgroundElevated },
                  ]}
                >
                  <Plus size={18} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.unit, { color: colors.textMuted }]}>min</Text>
            </View>
          </View>
        )}

        {/* Distance */}
        {selectedActivity.fields.includes('distance') && (
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
              <MapPin size={24} color={selectedActivity.color} />
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
                  onChangeText={setDistance}
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
        )}

        {/* Intensité */}
        {selectedActivity.fields.includes('intensity') && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              INTENSITÉ
            </Text>
            <View style={styles.intensityButtons}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.intensityButton,
                    {
                      backgroundColor:
                        intensity === level ? selectedActivity.color : colors.backgroundCard,
                      borderColor: intensity === level ? selectedActivity.color : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIntensity(level);
                  }}
                >
                  <Text
                    style={[
                      styles.intensityText,
                      {
                        color: intensity === level ? '#FFFFFF' : colors.textPrimary,
                      },
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            NOTES (OPTIONNEL)
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.backgroundCard,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Commentaires sur la séance..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  selectTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityCard: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
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
  input: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  intensityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    aspectRatio: 1,
  },
  intensityText: {
    fontSize: 18,
    fontWeight: '800',
  },
  notesInput: {
    fontSize: 14,
    fontWeight: '500',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
