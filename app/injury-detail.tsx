// ============================================
// YOROI MEDIC - DÉTAIL BLESSURE
// ============================================

import React, { useState, useEffect } from 'react';
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

import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
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
  Bed,
  Snowflake,
  Flame,
  CircleDot,
  ArrowUp,
  Move,
  Pill,
  Hand,
  ChevronUp,
  ChevronDown,
  LucideIcon,
} from 'lucide-react-native';

const TREATMENT_ICON_MAP: Record<string, LucideIcon> = {
  Bed,
  Snowflake,
  Flame,
  CircleDot,
  ArrowUp,
  Move,
  Pill,
  Stethoscope,
  Hand,
  Edit3,
};

function TreatmentIcon({ name, size = 22, color }: { name: string; size?: number; color: string }) {
  const IconComponent = TREATMENT_ICON_MAP[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} strokeWidth={2} />;
}
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
  deleteInjury,
  getWeeklyPlan,
  WeeklyPlan,
  cancelSlot,
} from '@/lib/database';
import { isSportImpactedByInjury } from '@/lib/slotInjuryService';
import { getSportName, getSportIcon, getSportColor } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  getZoneDisplayName,
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
  const [affectedSlots, setAffectedSlots] = useState<WeeklyPlan[]>([]);
  const [creatorModeActive, setCreatorModeActive] = useState(false);
  const [showSurgeonMode, setShowSurgeonMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReturnPlan, setShowReturnPlan] = useState(false);

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

        // Charger les creneaux impactes
        if (injuryData && injuryData.fit_for_duty !== 'operational') {
          const allSlots = await getWeeklyPlan();
          const impacted = Array.isArray(allSlots) ? allSlots.filter(s => !s.is_rest_day && isSportImpactedByInjury(s.sport, injuryData)) : [];
          setAffectedSlots(impacted);
        } else {
          setAffectedSlots([]);
        }
      }
    } catch (error) {
      logger.error('[InjuryDetail] Erreur:', error);
    }
  };

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, [injuryId]);

  const handleUpdateEva = async () => {
    if (newEva === null || newEva === injury?.eva_score) return;

    try {
      await updateInjuryEva(injuryId, newEva, evaNote || undefined);
      notificationAsync(NotificationFeedbackType.Success);
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
              notificationAsync(NotificationFeedbackType.Success);
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
              notificationAsync(NotificationFeedbackType.Success);
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
              notificationAsync(NotificationFeedbackType.Success);
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
              impactAsync(ImpactFeedbackStyle.Light);
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
              {getZoneDisplayName(injury.zone_id, injury.zone_view)}
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
                  impactAsync(ImpactFeedbackStyle.Light);
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
                <TreatmentIcon name={treatment.icon} size={20} color={colors.textSecondary} />
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
                  <TreatmentIcon name={treatment.icon} size={16} color={colors.textSecondary} />
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
              <View style={{ padding: 2 }}>
                {showSurgeonMode
                  ? <ChevronUp size={18} color={colors.textMuted} />
                  : <ChevronDown size={18} color={colors.textMuted} />}
              </View>
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
                      <TreatmentIcon name={treatment.icon} size={20} color={colors.textSecondary} />
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
                            notificationAsync(NotificationFeedbackType.Success);
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
                            notificationAsync(NotificationFeedbackType.Warning);
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

        {/* Impact sur le planning */}
        {affectedSlots.length > 0 && injury && (
          <View style={[styles.section, { marginBottom: SPACING.lg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Impact sur le planning
            </Text>
            <View style={{ gap: 6 }}>
              {affectedSlots.map(slot => {
                const sportColor = getSportColor(slot.sport);
                return (
                  <View key={slot.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: RADIUS.md,
                    backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.warning + '30',
                  }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: sportColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name={getSportIcon(slot.sport) as any} size={18} color={sportColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                        {getSportName(slot.sport)}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][slot.day_of_week]}
                        {slot.time ? ` ${slot.time}` : ''}
                        {slot.club_name ? ` - ${slot.club_name}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity
                style={{
                  alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.md,
                  backgroundColor: colors.warning + '15', marginTop: 4,
                }}
                onPress={async () => {
                  const now = new Date();
                  const day = now.getDay();
                  const diff = day === 0 ? -6 : 1 - day;
                  const monday = new Date(now);
                  monday.setDate(now.getDate() + diff);
                  const weekStart = monday.toISOString().split('T')[0];
                  for (const slot of affectedSlots) {
                    if (slot.id) {
                      await cancelSlot(slot.id, weekStart, `Blessure: ${injury.zone_id}`, injury.id);
                    }
                  }
                  showPopup('Creneaux annules', `${affectedSlots.length} creneau(x) annule(s) pour cette semaine.`, [
                    { text: 'OK', style: 'primary' },
                  ]);
                }}
              >
                <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700' }}>
                  Annuler les creneaux de la semaine
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Mode Retour de blessure progressif */}
        {injury && (
          <View style={[styles.section, { backgroundColor: colors.backgroundCard, marginBottom: SPACING.lg }]}>
            <TouchableOpacity
              onPress={() => setShowReturnPlan(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="#06B6D4" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Plan de retour progressif
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: colors.textMuted }}>
                {showReturnPlan ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {showReturnPlan && (() => {
              // Protocoles par zone (simplifié en 3 familles)
              const zone = (injury.zone_id ?? '').toLowerCase();
              const isEpaule = zone.includes('epaule') || zone.includes('bras') || zone.includes('coude') || zone.includes('poignet');
              const isGenou = zone.includes('genou') || zone.includes('jambe') || zone.includes('cheville') || zone.includes('hanche');
              const isDos = zone.includes('dos') || zone.includes('cou') || zone.includes('nuque');

              const returnWeeks: { week: number; label: string; restrictions: string[]; color: string }[] = isEpaule ? [
                { week: 1, label: 'Repos & mobilité douce', restrictions: ['Aucun effort bras', 'Technique jambes uniquement', 'Mouvement doux amplitude réduite'], color: '#EF4444' },
                { week: 2, label: 'Technique sans résistance', restrictions: ['Technique bras léger', 'Pas de grip / saisies', 'Exercices proprioception'], color: '#F97316' },
                { week: 3, label: 'Drilling léger', restrictions: ['Drilling technique (pas de sparring)', 'Résistance minimale partenaire', 'Stop si douleur'], color: '#F59E0B' },
                { week: 4, label: 'Roulage léger partenaires confirmés', restrictions: ['Rolling light uniquement', 'Partenaires de confiance', 'Communication ouverte'], color: '#22C55E' },
                { week: 5, label: 'Sparring normal progressif', restrictions: ['Sparring technique → intensif', 'Écoute ton corps', 'Bilan avant compétition'], color: '#06B6D4' },
              ] : isGenou ? [
                { week: 1, label: 'Repos & glace', restrictions: ['Zéro appui si douleur', 'Élévation du membre', 'Mobilité passive uniquement'], color: '#EF4444' },
                { week: 2, label: 'Marche & mobilité', restrictions: ['Marche sans douleur', 'Renforcement quadriceps assis', 'Vélo stationnaire si toléré'], color: '#F97316' },
                { week: 3, label: 'Technique debout légère', restrictions: ['Travail debout sans projections', 'Pas de genou-à-terre', 'Renforcement chaîne postérieure'], color: '#F59E0B' },
                { week: 4, label: 'Travail au sol progressif', restrictions: ['Drilling au sol (pas de pression genou)', 'Rolling top position uniquement'], color: '#22C55E' },
                { week: 5, label: 'Retour complet progressif', restrictions: ['Rolling léger → normal', 'Bande de soutien si besoin', 'Bilan médical recommandé'], color: '#06B6D4' },
              ] : [
                { week: 1, label: 'Repos strict', restrictions: ['Pas de charge axiale', 'Étirements doux', 'Chaleur / anti-inflammatoires'], color: '#EF4444' },
                { week: 2, label: 'Mobilité douce', restrictions: ['Étirements progressifs', 'Gainage très doux', 'Pas de projections'], color: '#F97316' },
                { week: 3, label: 'Renforcement progressif', restrictions: ['Gainage statique', 'Technique debout sans chute', 'Mobilité rachidienne'], color: '#F59E0B' },
                { week: 4, label: 'Technique légère', restrictions: ['Drilling debout et au sol léger', 'Rolling top position', 'Stop si douleur'], color: '#22C55E' },
                { week: 5, label: 'Sparring progressif', restrictions: ['Rolling light', 'Communication avec partenaire', 'Avis médical avant intensif'], color: '#06B6D4' },
              ];

              return (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                    Protocole estimé — ajuste selon ton ressenti et l'avis de ton médecin.
                  </Text>
                  {returnWeeks.map(w => (
                    <View key={w.week} style={{ flexDirection: 'row', gap: 10, padding: 10, borderRadius: 10, backgroundColor: `${w.color}10`, borderLeftWidth: 3, borderLeftColor: w.color }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: w.color, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>S{w.week}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{w.label}</Text>
                        {w.restrictions.map((r, i) => (
                          <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: w.color, marginTop: 5 }} />
                            <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1, lineHeight: 16 }}>{r}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleMarkHealed}
            activeOpacity={0.7}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Marquer comme gueri</Text>
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
