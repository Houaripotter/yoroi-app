// ============================================
// YOROI MEDIC - DÉTAIL BLESSURE
// ============================================

import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Activity,
  Check,
  Trash2,
  Stethoscope,
  RotateCcw,
  Edit3,
  Calendar,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import {
  Injury,
  InjuryEvaHistory,
  getInjuryById,
  getEvaHistory,
  getTreatments,
  deleteInjury,
} from '@/lib/database';
import {
  updateInjuryEva,
  markInjuryAsHealed,
  recordTreatment,
  getTreatmentsWithLabels,
  getEVAColor,
  getEVAEmoji,
  getDaysSinceInjury,
  getInjuryRecommendation,
  getPainTypeLabel,
  getInjuryCauseLabel,
} from '@/lib/infirmaryService';
import { TREATMENT_TYPES } from '@/constants/bodyZones';
import logger from '@/lib/security/logger';

export default function InjuryDetailScreen() {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const params = useLocalSearchParams<{ id?: string }>();
  const injuryIdStr = params.id ?? '';
  const injuryId = injuryIdStr ? parseInt(injuryIdStr) : NaN;

  const [injury, setInjury] = useState<Injury | null>(null);
  const [evaHistory, setEvaHistory] = useState<InjuryEvaHistory[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [newEva, setNewEva] = useState<number | null>(null);
  const [evaNote, setEvaNote] = useState('');
  const [creatorModeActive, setCreatorModeActive] = useState(false);
  const [showSurgeonMode, setShowSurgeonMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    // Validation du paramètre
    if (!injuryIdStr || isNaN(injuryId)) {
      showPopup({
        title: 'Erreur',
        message: 'Blessure non trouvée',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => router.back() }],
      });
      return;
    }

    try {
      // 🔒 PROTECTION : Vérifier si Mode Créateur actif - AVEC GESTION D'ERREUR
      let creatorMode = false;
      try {
        const mode = await AsyncStorage.getItem('@yoroi_creator_mode');
        creatorMode = mode === 'true';
      } catch (storageError) {
        // Si AsyncStorage est inaccessible, logger mais continuer quand même
        logger.error('[InjuryDetail] Erreur lecture AsyncStorage:', storageError);
        creatorMode = false; // Mode safe par défaut
      }
      setCreatorModeActive(creatorMode);

      const injuryData = await getInjuryById(injuryId);
      if (injuryData) {
        setInjury(injuryData);
        setNewEva(injuryData.eva_score);

        const history = await getEvaHistory(injuryId);
        setEvaHistory(history);

        const treatmentsData = await getTreatmentsWithLabels(injuryId);
        setTreatments(treatmentsData);
      }
    } catch (error) {
      logger.error('[InjuryDetail] Erreur:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [injuryId])
  );

  const handleUpdateEva = async () => {
    if (newEva === null || newEva === injury?.eva_score) return;

    try {
      await updateInjuryEva(injuryId, newEva, evaNote || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEvaNote('');
      loadData();
    } catch (error) {
      showPopup({
        title: 'Erreur',
        message: 'Impossible de mettre a jour l EVA',
        type: 'error',
      });
    }
  };

  const handleMarkHealed = async () => {
    if (isProcessing) return;

    showPopup({
      title: 'Marquer comme gueri ?',
      message: 'Cette blessure sera archivee.',
      type: 'warning',
      buttons: [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            if (isProcessing) return;
            setIsProcessing(true);
            try {
              await markInjuryAsHealed(injuryId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              showPopup({
                title: 'Erreur',
                message: 'Impossible de marquer comme gueri',
                type: 'error',
              });
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    });
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    showPopup({
      title: 'Supprimer la blessure ?',
      message: 'Cette action est irreversible.',
      type: 'error',
      buttons: [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (isDeleting) return;
            setIsDeleting(true);
            try {
              await deleteInjury(injuryId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              showPopup({
                title: 'Erreur',
                message: 'Impossible de supprimer',
                type: 'error',
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    });
  };

  const handleAddTreatment = (treatmentType: string) => {
    showPopup({
      title: 'Enregistrer traitement',
      message: 'Marquer comme effectue aujourd hui ?',
      type: 'info',
      buttons: [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await recordTreatment({
                injury_id: injuryId,
                treatment_type: treatmentType,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadData();
            } catch (error) {
              showPopup({
                title: 'Erreur',
                message: 'Impossible d enregistrer le traitement',
                type: 'error',
              });
            }
          },
        },
      ],
    });
  };

  if (!injury) {
    return (
      <ScreenWrapper>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Chargement...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const daysSince = getDaysSinceInjury(injury.date);
  const recommendation = getInjuryRecommendation(injury.eva_score, daysSince);

  // 🔒 PROTECTION : Calcul sécurisé de la tendance EVA
  const trend = (() => {
    // Sécurité : vérifier qu'on a au moins 2 éléments dans l'historique
    if (!evaHistory || evaHistory.length < 2) {
      return 0;
    }

    const lastEva = evaHistory[evaHistory.length - 1];
    const previousEva = evaHistory[evaHistory.length - 2];

    // Double vérification que les objets existent
    if (!lastEva || !previousEva) {
      return 0;
    }

    return lastEva.eva_score - previousEva.eva_score;
  })();

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
              <Activity size={24} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Détail blessure
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Depuis {daysSince} jours
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.evaCard, { backgroundColor: getEVAColor(injury.eva_score) }]}>
          <Text style={styles.evaEmoji}>{getEVAEmoji(injury.eva_score)}</Text>
          <Text style={styles.evaScore}>EVA {injury.eva_score}/10</Text>
          {trend !== 0 && (
            <View style={styles.evaTrend}>
              {trend > 0 ? (
                <TrendingUp size={16} color="#FFFFFF" />
              ) : (
                <TrendingDown size={16} color="#FFFFFF" />
              )}
              <Text style={styles.evaTrendText}>
                {trend > 0 ? '+' : ''}{trend}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Zone</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {injury.zone_id}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Douleur</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {getPainTypeLabel(injury.pain_type)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cause</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {getInjuryCauseLabel(injury.cause)}
            </Text>
          </View>
          {injury.notes && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Notes</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {injury.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.recommendationCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
            {recommendation}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Mettre à jour l EVA
          </Text>
          <View style={styles.evaSlider}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.evaButton,
                  {
                    backgroundColor:
                      newEva === value ? getEVAColor(value) : colors.backgroundElevated,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNewEva(value);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.evaButtonText,
                    {
                      color: newEva === value ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: newEva === value ? '700' : '600',
                    },
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[
              styles.evaInput,
              { backgroundColor: colors.backgroundElevated, color: colors.textPrimary },
            ]}
            placeholder="Note (optionnel)"
            placeholderTextColor={colors.textMuted}
            value={evaNote}
            onChangeText={setEvaNote}
            maxLength={1000}
            multiline
            numberOfLines={3}
          />
          {newEva !== injury.eva_score && (
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: colors.accent }]}
              onPress={handleUpdateEva}
              activeOpacity={0.7}
            >
              <Check size={20} color={colors.textOnGold} />
              <Text style={[styles.updateButtonText, { color: colors.textOnGold }]}>Mettre à jour</Text>
            </TouchableOpacity>
          )}
        </View>

        {evaHistory.length > 1 && (
          <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Historique EVA
            </Text>
            {[...evaHistory].reverse().slice(0, 5).map((entry) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <View
                    style={[
                      styles.historyDot,
                      { backgroundColor: getEVAColor(entry.eva_score) },
                    ]}
                  />
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {new Date(entry.date).toLocaleDateString(locale)}
                  </Text>
                  <Text style={[styles.historyEva, { color: colors.textPrimary }]}>
                    EVA {entry.eva_score}
                  </Text>
                </View>
                {entry.notes && (
                  <Text style={[styles.historyNote, { color: colors.textMuted }]}>
                    {entry.notes}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Traitements
          </Text>
          <View style={styles.treatmentGrid}>
            {TREATMENT_TYPES.slice(0, 6).map((treatment) => (
              <TouchableOpacity
                key={treatment.id}
                style={[styles.treatmentButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => handleAddTreatment(treatment.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.treatmentIcon}>{treatment.icon}</Text>
                <Text style={[styles.treatmentLabel, { color: colors.textPrimary }]}>
                  {treatment.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {treatments.length > 0 && (
            <View style={styles.treatmentHistory}>
              <Text style={[styles.treatmentHistoryTitle, { color: colors.textSecondary }]}>
                Derniers traitements
              </Text>
              {treatments.slice(0, 3).map((treatment) => (
                <View key={treatment.id} style={styles.treatmentHistoryItem}>
                  <Text style={styles.treatmentHistoryIcon}>{treatment.icon}</Text>
                  <Text style={[styles.treatmentHistoryLabel, { color: colors.textPrimary }]}>
                    {treatment.label}
                  </Text>
                  <Text style={[styles.treatmentHistoryDate, { color: colors.textMuted }]}>
                    {new Date(treatment.date).toLocaleDateString(locale)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mode Chirurgien - Visible uniquement si Mode Créateur actif */}
        {creatorModeActive && (
          <View style={[styles.section, { backgroundColor: colors.backgroundCard, borderColor: '#8B5CF6', borderWidth: 2 }]}>
            <TouchableOpacity
              style={styles.surgeonHeader}
              onPress={() => setShowSurgeonMode(!showSurgeonMode)}
              activeOpacity={0.7}
            >
              <View style={styles.surgeonTitleRow}>
                <Stethoscope size={20} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: '#8B5CF6', marginBottom: 0, marginLeft: 8 }]}>
                  Mode Chirurgien
                </Text>
              </View>
              <Text style={[styles.surgeonToggle, { color: colors.textMuted }]}>
                {showSurgeonMode ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showSurgeonMode && (
              <View style={styles.surgeonContent}>
                <Text style={[styles.surgeonWarning, { color: colors.textMuted }]}>
                  Fonctionnalités avancées - À utiliser avec précaution
                </Text>

                {/* Tous les types de traitement */}
                <Text style={[styles.surgeonSubtitle, { color: colors.textPrimary }]}>
                  Tous les traitements disponibles
                </Text>
                <View style={styles.treatmentGrid}>
                  {TREATMENT_TYPES.map((treatment) => (
                    <TouchableOpacity
                      key={treatment.id}
                      style={[styles.treatmentButton, { backgroundColor: colors.backgroundElevated }]}
                      onPress={() => handleAddTreatment(treatment.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.treatmentIcon}>{treatment.icon}</Text>
                      <Text style={[styles.treatmentLabel, { color: colors.textPrimary }]}>
                        {treatment.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reinitialiser EVA a 0 */}
                <TouchableOpacity
                  style={[styles.surgeonAction, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    showPopup({
                      title: 'Reinitialiser EVA ?',
                      message: 'Mettre le score EVA a 0 (gueri)',
                      type: 'info',
                      buttons: [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Confirmer',
                          onPress: async () => {
                            await updateInjuryEva(injuryId, 0, 'Reset via Mode Chirurgien');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            loadData();
                          },
                        },
                      ],
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={18} color="#FFFFFF" />
                  <Text style={styles.surgeonActionText}>Reinitialiser EVA a 0</Text>
                </TouchableOpacity>

                {/* Forcer EVA max */}
                <TouchableOpacity
                  style={[styles.surgeonAction, { backgroundColor: '#EF4444' }]}
                  onPress={() => {
                    showPopup({
                      title: 'EVA Maximum ?',
                      message: 'Mettre le score EVA a 10 (douleur maximale)',
                      type: 'warning',
                      buttons: [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Confirmer',
                          onPress: async () => {
                            await updateInjuryEva(injuryId, 10, 'EVA Max via Mode Chirurgien');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            loadData();
                          },
                        },
                      ],
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Edit3 size={18} color="#FFFFFF" />
                  <Text style={styles.surgeonActionText}>Forcer EVA a 10</Text>
                </TouchableOpacity>

                {/* Info blessure brute */}
                <View style={[styles.surgeonInfo, { backgroundColor: colors.backgroundElevated }]}>
                  <Text style={[styles.surgeonInfoTitle, { color: colors.textPrimary }]}>
                    Données brutes
                  </Text>
                  <Text style={[styles.surgeonInfoText, { color: colors.textMuted }]}>
                    ID: {injury?.id}{'\n'}
                    Zone: {injury?.zone_id}{'\n'}
                    Date: {injury?.date}{'\n'}
                    EVA: {injury?.eva_score}{'\n'}
                    Status: {injury?.status}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleMarkHealed}
            activeOpacity={0.7}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Marquer comme guéri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.lg },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 100 },
  topSection: { marginBottom: SPACING.lg },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  iconContainer: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  evaCard: { padding: SPACING.xl, borderRadius: RADIUS.lg, alignItems: 'center', marginBottom: SPACING.md },
  evaEmoji: { fontSize: 72, marginBottom: SPACING.sm },
  evaScore: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  evaTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs },
  evaTrendText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  infoCard: { padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, gap: SPACING.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 14, flex: 2, textAlign: 'right' },
  recommendationCard: { padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  recommendationText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  section: { padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.md },
  evaSlider: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  evaButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  evaButtonText: { fontSize: 12 },
  evaInput: { borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, marginBottom: SPACING.sm },
  updateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: 12, borderRadius: RADIUS.md },
  updateButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  historyItem: { marginBottom: SPACING.md },
  historyItemHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyDate: { fontSize: 13, flex: 1 },
  historyEva: { fontSize: 13, fontWeight: '700' },
  historyNote: { fontSize: 12, marginLeft: 20, fontStyle: 'italic' },
  treatmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  treatmentButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: RADIUS.md, gap: SPACING.xs },
  treatmentIcon: { fontSize: 16 },
  treatmentLabel: { fontSize: 13, fontWeight: '600' },
  treatmentHistory: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  treatmentHistoryTitle: { fontSize: 12, fontWeight: '700', marginBottom: SPACING.sm, textTransform: 'uppercase' },
  treatmentHistoryItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  treatmentHistoryIcon: { fontSize: 14 },
  treatmentHistoryLabel: { fontSize: 13, flex: 1 },
  treatmentHistoryDate: { fontSize: 11 },
  actionsSection: { gap: SPACING.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 14, borderRadius: RADIUS.md },
  actionButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  // Mode Chirurgien
  surgeonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  surgeonTitleRow: { flexDirection: 'row', alignItems: 'center' },
  surgeonToggle: { fontSize: 14 },
  surgeonContent: { marginTop: SPACING.md },
  surgeonWarning: { fontSize: 12, fontStyle: 'italic', marginBottom: SPACING.md, textAlign: 'center' },
  surgeonSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: SPACING.sm },
  surgeonAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: SPACING.sm },
  surgeonActionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  surgeonInfo: { marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md },
  surgeonInfoTitle: { fontSize: 13, fontWeight: '700', marginBottom: SPACING.xs },
  surgeonInfoText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});
