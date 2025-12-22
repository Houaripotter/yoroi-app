// ============================================
// 🩺 YOROI MEDIC - ÉVALUATION BLESSURE
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import {
  PAIN_TYPES,
  INJURY_CAUSES,
  PainType,
  InjuryCause,
} from '@/constants/bodyZones';
import {
  createInjury,
  shouldRecommendRICE,
  getRICEProtocol,
  checkZoneRecurrence,
  getEVAColor,
  getEVAEmoji,
} from '@/lib/infirmaryService';

export default function InjuryEvaluationScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const zoneId = params.zoneId as string;
  const zoneView = params.zoneView as 'front' | 'back';
  const zoneName = decodeURIComponent(params.zoneName as string);

  const [painType, setPainType] = useState<PainType | null>(null);
  const [cause, setCause] = useState<InjuryCause | null>(null);
  const [evaScore, setEvaScore] = useState(5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!painType || !cause) {
      Alert.alert('Champs requis', 'Veuillez sélectionner le type de douleur et la cause');
      return;
    }

    setIsSubmitting(true);

    try {
      // Créer la blessure
      const injuryId = await createInjury({
        zone_id: zoneId,
        zone_view: zoneView,
        pain_type: painType,
        cause: cause,
        eva_score: evaScore,
        notes: notes || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Vérifier récurrence
      const recurrence = await checkZoneRecurrence(zoneId, zoneView);
      if (recurrence.isRecurring) {
        Alert.alert(
          '⚠️ Récurrence détectée',
          `Cette zone a été blessée ${recurrence.count} fois dans les 30 derniers jours. Consultez un médecin si la douleur persiste.`,
          [{ text: 'OK' }]
        );
      }

      // Vérifier protocole RICE
      if (shouldRecommendRICE(evaScore)) {
        const protocol = getRICEProtocol();
        const protocolText = protocol
          .map(step => `${step.letter} - ${step.title}: ${step.description}`)
          .join('\n\n');

        Alert.alert(
          '🧊 Protocole RICE Recommandé',
          `Douleur sévère détectée (EVA ${evaScore}/10).\n\nAppliquez immédiatement :\n\n${protocolText}`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        router.back();
      }
    } catch (error) {
      console.error('[InjuryEvaluation] Erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la blessure');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.backgroundElevated }]}>
              <AlertCircle size={24} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Nouvelle blessure
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {zoneName}
              </Text>
            </View>
          </View>
        </View>

        {/* Échelle EVA */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Échelle de douleur (EVA)
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            De 0 (aucune douleur) à 10 (douleur maximale)
          </Text>

          {/* Score actuel */}
          <View style={styles.evaScoreDisplay}>
            <Text style={styles.evaEmoji}>{getEVAEmoji(evaScore)}</Text>
            <Text
              style={[
                styles.evaScoreText,
                { color: getEVAColor(evaScore) },
              ]}
            >
              {evaScore}/10
            </Text>
          </View>

          {/* Slider EVA */}
          <View style={styles.evaSlider}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.evaButton,
                  {
                    backgroundColor:
                      evaScore === value ? getEVAColor(value) : colors.backgroundElevated,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEvaScore(value);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.evaButtonText,
                    {
                      color: evaScore === value ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: evaScore === value ? '700' : '600',
                    },
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Gradient bar */}
          <View style={styles.evaGradient}>
            <View style={[styles.gradientSection, { backgroundColor: '#4CAF50' }]} />
            <View style={[styles.gradientSection, { backgroundColor: '#8BC34A' }]} />
            <View style={[styles.gradientSection, { backgroundColor: '#FFEB3B' }]} />
            <View style={[styles.gradientSection, { backgroundColor: '#FF9800' }]} />
            <View style={[styles.gradientSection, { backgroundColor: '#F44336' }]} />
          </View>
        </View>

        {/* Type de douleur */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Type de douleur *
          </Text>
          <View style={styles.optionsGrid}>
            {PAIN_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionButton,
                  { backgroundColor: colors.backgroundElevated },
                  painType === type.id && { backgroundColor: colors.accent },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPainType(type.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: painType === type.id ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cause */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Cause de la blessure *
          </Text>
          <View style={styles.optionsGrid}>
            {INJURY_CAUSES.map((causeItem) => (
              <TouchableOpacity
                key={causeItem.id}
                style={[
                  styles.optionButton,
                  { backgroundColor: colors.backgroundElevated },
                  cause === causeItem.id && { backgroundColor: colors.accent },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCause(causeItem.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>{causeItem.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: cause === causeItem.id ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {causeItem.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Notes (optionnel)
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              { backgroundColor: colors.backgroundElevated, color: colors.textPrimary },
            ]}
            placeholder="Comment c'est arrivé ? Que ressens-tu ?"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Bouton enregistrer */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.accent },
            isSubmitting && { opacity: 0.5 },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer la blessure'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  topSection: {
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  // Sections
  section: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  // EVA Scale
  evaScoreDisplay: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  evaEmoji: {
    fontSize: 64,
    marginBottom: SPACING.sm,
  },
  evaScoreText: {
    fontSize: 36,
    fontWeight: '800',
  },
  evaSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  evaButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaButtonText: {
    fontSize: 12,
  },
  evaGradient: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientSection: {
    flex: 1,
  },
  // Options
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  optionIcon: {
    fontSize: 18,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Notes
  notesInput: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    minHeight: 100,
  },
  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
