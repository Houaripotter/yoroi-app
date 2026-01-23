// ============================================
// YOROI MEDIC - ÉVALUATION BLESSURE
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  AlertCircle,
  Save,
  Zap,
  Waves,
  Flame,
  Sparkles,
  Lock,
  Dumbbell,
  Swords,
  AlertTriangle,
  RotateCcw,
  HelpCircle,
  LucideIcon,
  Info,
} from 'lucide-react-native';
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
  checkZoneRecurrence,
  getEVAColor,
  getEVAEmoji,
} from '@/lib/infirmaryService';
import { updateInjury } from '@/lib/database';
import logger from '@/lib/security/logger';

// Mapping des noms d'icônes vers les composants Lucide
const iconMap: Record<string, React.ComponentType<any>> = {
  Zap,
  Waves,
  Flame,
  Sparkles,
  Lock,
  AlertCircle,
  Dumbbell,
  Swords,
  AlertTriangle,
  RotateCcw,
  HelpCircle,
};

const renderIcon = (iconName: string, color: string, size: number = 24) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} strokeWidth={2} />;
};

export default function InjuryEvaluationScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const { showPopup, PopupComponent } = useCustomPopup();

  const zoneId = params.zoneId as string;
  const zoneView = params.zoneView as 'front' | 'back';
  const zoneName = decodeURIComponent(params.zoneName as string);

  // Mode édition si injuryId est présent
  const injuryId = params.injuryId ? parseInt(params.injuryId as string) : null;
  const isEditMode = injuryId !== null;

  const [painType, setPainType] = useState
  const [isNavigating, setIsNavigating] = useState(false);<PainType | null>(null);
  const [cause, setCause] = useState
  const [isNavigating, setIsNavigating] = useState(false);<InjuryCause | null>(null);
  const [evaScore, setEvaScore] = useState
  const [isNavigating, setIsNavigating] = useState(false);(
    params.existingEva ? parseInt(params.existingEva as string) : 5
  );
  const [estimatedRecoveryDays, setEstimatedRecoveryDays] = useState
  const [isNavigating, setIsNavigating] = useState(false);(
    params.existingDuration ? parseInt(params.existingDuration as string) : 7
  );
  const [notes, setNotes] = useState
  const [isNavigating, setIsNavigating] = useState(false);('');
  const [isSubmitting, setIsSubmitting] = useState
  const [isNavigating, setIsNavigating] = useState(false);(false);

  // Suggestion simple basée sur l'EVA (juste une aide, pas un avis médical)
  const getSuggestedDays = (eva: number): number => {
    if (eva <= 3) return 7;
    if (eva <= 6) return 14;
    return 21;
  };
  const suggestedDays = getSuggestedDays(evaScore);

  const handleSubmit = async () => {
    if (!isEditMode && (!painType || !cause)) {
      showPopup('Champs requis', 'Sélectionne le type de douleur et la cause', [
        { text: 'OK', style: 'primary' },
      ]);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Mode édition - mettre à jour la blessure existante
        await updateInjury(injuryId, {
          eva_score: evaScore,
          estimated_recovery_days: estimatedRecoveryDays,
          notes: notes || undefined,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showPopup('Blessure mise à jour', 'Les informations ont été modifiées avec succès.', [
          { text: 'OK', style: 'primary', onPress: () => { if (!isNavigating) { setIsNavigating(true); setTimeout(() => setIsNavigating(false), 1000); router.back(); } } },
        ]);
      } else {
        // Mode création - créer une nouvelle blessure
        const newInjuryId = await createInjury({
          zone_id: zoneId,
          zone_view: zoneView,
          pain_type: painType!,
          cause: cause!,
          eva_score: evaScore,
          estimated_recovery_days: estimatedRecoveryDays,
          notes: notes || undefined,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Vérifier récurrence
        const recurrence = await checkZoneRecurrence(zoneId, zoneView);
        if (recurrence.isRecurring) {
          showPopup(
            'Récurrence détectée',
            `Cette zone a été blessée ${recurrence.count} fois dans les 30 derniers jours.`,
            [{ text: 'OK', style: 'primary' }]
          );
        }

        if (!isNavigating) { setIsNavigating(true); router.back(); }
      }
    } catch (error) {
      logger.error('[InjuryEvaluation] Erreur:', error);
      showPopup('Erreur', `Impossible d'${isEditMode ? 'mettre à jour' : 'enregistrer'} la blessure`, [
        { text: 'OK', style: 'primary' },
      ]);
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
              if (!isNavigating) { setIsNavigating(true); router.back(); }
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
                {isEditMode ? 'Modifier blessure' : 'Nouvelle blessure'}
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
                <View style={styles.optionIconContainer}>
                  {renderIcon(type.icon, painType === type.id ? '#FFFFFF' : colors.textPrimary, 22)}
                </View>
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
                <View style={styles.optionIconContainer}>
                  {renderIcon(causeItem.icon, cause === causeItem.id ? '#FFFFFF' : colors.textPrimary, 22)}
                </View>
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

        {/* Durée de récupération estimée */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Durée de récupération estimée
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Modifiable plus tard si besoin
          </Text>

          {/* Suggestion cliquable basée sur EVA */}
          <TouchableOpacity
            style={[
              styles.suggestionButton,
              {
                backgroundColor: estimatedRecoveryDays === suggestedDays ? '#10B98120' : colors.backgroundElevated,
                borderColor: estimatedRecoveryDays === suggestedDays ? '#10B981' : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEstimatedRecoveryDays(suggestedDays);
            }}
            activeOpacity={0.7}
          >
            <Info size={18} color={estimatedRecoveryDays === suggestedDays ? '#10B981' : colors.textMuted} />
            <Text style={[styles.suggestionText, { color: estimatedRecoveryDays === suggestedDays ? '#10B981' : colors.textPrimary }]}>
              Suggestion : {suggestedDays} jours (EVA {evaScore}/10)
            </Text>
          </TouchableOpacity>

          <View style={styles.durationContainer}>
            <TouchableOpacity
              style={[styles.durationButton, { backgroundColor: colors.backgroundElevated }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEstimatedRecoveryDays(Math.max(1, estimatedRecoveryDays - 1));
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.durationButtonText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>

            <View style={[styles.durationDisplay, { backgroundColor: colors.backgroundElevated }]}>
              <Text style={[styles.durationValue, { color: colors.accent }]}>
                {estimatedRecoveryDays}
              </Text>
              <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
                jours
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.durationButton, { backgroundColor: colors.backgroundElevated }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEstimatedRecoveryDays(estimatedRecoveryDays + 1);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.durationButtonText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Boutons de raccourci */}
          <View style={styles.durationPresets}>
            {[3, 7, 14, 21, 30].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.presetButton,
                  { backgroundColor: colors.backgroundElevated },
                  estimatedRecoveryDays === days && { backgroundColor: colors.accent },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEstimatedRecoveryDays(days);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    {
                      color: estimatedRecoveryDays === days ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {days}j
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
            {isSubmitting
              ? isEditMode
                ? 'Modification...'
                : 'Enregistrement...'
              : isEditMode
              ? 'Modifier la blessure'
              : 'Enregistrer la blessure'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
        <PopupComponent />
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
  optionIconContainer: {
    marginBottom: SPACING.xs,
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
  // Duration
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  durationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationButtonText: {
    fontSize: 24,
    fontWeight: '700',
  },
  durationDisplay: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    minWidth: 120,
  },
  durationValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 2,
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  durationPresets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  presetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Suggestion Button
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
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
