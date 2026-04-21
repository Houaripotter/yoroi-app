// ============================================
// YOROI - SIMULATEUR WEIGHT CUT
// ============================================
// Planification de coupe de poids pour combattants
// Avec protocole hydrique et alertes de securite

import React, { useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Scale,
  Calendar,
  AlertTriangle,
  Droplets,
  TrendingDown,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  BellOff,
  Zap,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { getWeights, Weight } from '@/lib/database';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface WeightCutPlan {
  totalToCut: number;
  percentToCut: number;
  daysAvailable: number;
  dailyCut: number;
  waterCutPossible: number;
  fatCutPossible: number;
  riskLevel: 'safe' | 'moderate' | 'risky' | 'dangerous';
  phases: Phase[];
  hydrationProtocol: HydrationDay[];
}

interface Phase {
  name: string;
  days: number;
  targetWeight: number;
  method: string;
  tips: string[];
}

interface HydrationDay {
  daysOut: number;
  waterLiters: number;
  sodium: string;
  notes: string;
}

// Limites de securite
const SAFE_WEEKLY_CUT = 1; // kg par semaine max en mode sain
const WATER_CUT_MAX = 0.08; // 8% du poids max en water cut
const DANGEROUS_CUT = 0.10; // 10% = dangereux

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function WeightCutScreen() {
  const { colors, isDark } = useTheme();

  // Inputs simulateur
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [daysUntilFight, setDaysUntilFight] = useState('');

  // Protocole rehydratation jour-J
  const [rehydDelta, setRehydDelta] = useState('');
  const [rehydHours, setRehydHours] = useState('');
  const [rehydNotifActive, setRehydNotifActive] = useState(false);

  const rehydTimeline = useMemo(() => {
    const delta = parseFloat(rehydDelta);
    const hours = parseFloat(rehydHours);
    if (!delta || !hours || delta <= 0 || hours <= 0) return null;
    // Protocole : 1.5L par kg perdu, réparti sur le temps dispo, rappels toutes les 20min
    const totalMl = delta * 1500;
    const slots = Math.floor((hours * 60) / 20);
    if (slots <= 0) return null;
    const mlPerSlot = Math.round(totalMl / slots);
    const steps: { minuteOffset: number; label: string; ml: number }[] = [];
    for (let i = 0; i < slots; i++) {
      const min = i * 20;
      const h = Math.floor(min / 60);
      const m = min % 60;
      steps.push({
        minuteOffset: min,
        label: h > 0 ? `+${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}` : `+${m}min`,
        ml: mlPerSlot,
      });
    }
    return { totalMl, slots, mlPerSlot, steps, totalHours: hours };
  }, [rehydDelta, rehydHours]);

  const scheduleRehydNotifs = async () => {
    if (!rehydTimeline) return;
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.requestPermissionsAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const step of rehydTimeline.steps) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Rehydratation Jour-J',
            body: `Bois ${step.ml} ml maintenant (${step.label} depuis la pesée)`,
            sound: true,
          },
          trigger: { seconds: Math.max(1, step.minuteOffset * 60), repeats: false } as any,
        });
      }
      setRehydNotifActive(true);
      Alert.alert('Rappels activés', `${rehydTimeline.slots} notifications programmées toutes les 20 min.`);
    } catch {
      Alert.alert('Erreur', 'Impossible de programmer les notifications.');
    }
  };

  const cancelRehydNotifs = async () => {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.cancelAllScheduledNotificationsAsync();
      setRehydNotifActive(false);
    } catch {}
  };

  // Suivi réel vers objectif compétition
  const GOAL_KEY = '@yoroi_weightcut_goal';
  const [goalWeight, setGoalWeight] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [weightHistory, setWeightHistory] = useState<Weight[]>([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ weight: '', date: '' });

  useEffect(() => {
    // Charger l'objectif sauvegardé
    AsyncStorage.getItem(GOAL_KEY).then(raw => {
      if (!raw) return;
      try {
        const g = JSON.parse(raw);
        setGoalWeight(g.weight ?? '');
        setGoalDate(g.date ?? '');
      } catch {}
    });
    // Charger l'historique poids (90 derniers jours)
    getWeights(90).then(ws => setWeightHistory(ws)).catch(() => {});
  }, []);

  // Calculer le plan
  const plan = useMemo((): WeightCutPlan | null => {
    const current = parseFloat(currentWeight);
    const target = parseFloat(targetWeight);
    const days = parseInt(daysUntilFight, 10);

    if (!current || !target || !days || target >= current || days <= 0) {
      return null;
    }

    const totalToCut = current - target;
    const percentToCut = (totalToCut / current) * 100;

    // Determiner le niveau de risque
    let riskLevel: WeightCutPlan['riskLevel'] = 'safe';
    if (percentToCut > DANGEROUS_CUT * 100) {
      riskLevel = 'dangerous';
    } else if (percentToCut > WATER_CUT_MAX * 100) {
      riskLevel = 'risky';
    } else if (percentToCut > 5) {
      riskLevel = 'moderate';
    }

    // Calculer les phases
    const waterCutPossible = Math.min(current * WATER_CUT_MAX, totalToCut);
    const fatCutNeeded = totalToCut - waterCutPossible;
    const weeksForFat = fatCutNeeded / SAFE_WEEKLY_CUT;
    const daysForFat = Math.ceil(weeksForFat * 7);

    const phases: Phase[] = [];

    // Phase 1: Perte de graisse (si necessaire)
    if (fatCutNeeded > 0.5 && days > 7) {
      const fatDays = Math.min(daysForFat, days - 5);
      const actualFatCut = Math.min(fatCutNeeded, (fatDays / 7) * SAFE_WEEKLY_CUT);
      phases.push({
        name: 'Deficit Calorique',
        days: fatDays,
        targetWeight: current - actualFatCut,
        method: 'Deficit de 500-750 kcal/jour',
        tips: [
          'Maintenir les proteines (2g/kg)',
          'Reduire les glucides progressivement',
          'Continuer l\'entraînement normal',
        ],
      });
    }

    // Phase 2: Water loading
    if (days >= 5) {
      phases.push({
        name: 'Water Loading',
        days: 4,
        targetWeight: current - (fatCutNeeded > 0 ? fatCutNeeded * 0.7 : 0),
        method: 'Hyperhydratation puis restriction',
        tips: [
          'Jours 5-3: boire 6-8L d\'eau/jour',
          'Sel normal les premiers jours',
          'Reduire le sel progressivement',
        ],
      });
    }

    // Phase 3: Water cut final
    phases.push({
      name: 'Water Cut Final',
      days: Math.min(2, days),
      targetWeight: target,
      method: 'Restriction hydrique + sudation',
      tips: [
        'Sauna ou bain chaud',
        'Vetements de sudation',
        'Maximum 2h de sauna par session',
        'Surveiller les signes de deshydratation',
      ],
    });

    // Protocole d'hydratation
    const hydrationProtocol: HydrationDay[] = [
      { daysOut: 7, waterLiters: 6, sodium: 'Normal', notes: 'Debut water loading' },
      { daysOut: 6, waterLiters: 7, sodium: 'Normal', notes: 'Augmenter l\'eau' },
      { daysOut: 5, waterLiters: 8, sodium: 'Normal', notes: 'Pic d\'hydratation' },
      { daysOut: 4, waterLiters: 6, sodium: 'Reduit', notes: 'Commencer restriction sel' },
      { daysOut: 3, waterLiters: 4, sodium: 'Tres faible', notes: 'Reduction eau' },
      { daysOut: 2, waterLiters: 2, sodium: 'Zero', notes: 'Minimum eau' },
      { daysOut: 1, waterLiters: 0.5, sodium: 'Zero', notes: 'Derniere coupe + sauna' },
      { daysOut: 0, waterLiters: 0, sodium: 'Zero', notes: 'Pesee puis rehydratation!' },
    ].filter(d => d.daysOut <= days);

    return {
      totalToCut,
      percentToCut,
      daysAvailable: days,
      dailyCut: totalToCut / days,
      waterCutPossible,
      fatCutPossible: totalToCut - waterCutPossible,
      riskLevel,
      phases,
      hydrationProtocol,
    };
  }, [currentWeight, targetWeight, daysUntilFight]);

  // Couleur selon le risque
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'safe': return '#22C55E';
      case 'moderate': return '#F59E0B';
      case 'risky': return '#EF4444';
      case 'dangerous': return '#DC2626';
      default: return colors.textMuted;
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'safe': return 'Coupe saine';
      case 'moderate': return 'Coupe moderee';
      case 'risky': return 'Coupe risquee';
      case 'dangerous': return 'DANGER';
      default: return '';
    }
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          WEIGHT CUT
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Banner */}
        <View style={[styles.warningBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <AlertTriangle size={18} color="#EF4444" />
          <Text style={[styles.warningText, { color: '#EF4444' }]}>
            Consulte un professionnel avant toute coupe de poids importante
          </Text>
        </View>

        {/* Input Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Parametres de coupe
          </Text>

          {/* Current Weight */}
          <View style={styles.inputRow}>
            <View style={styles.inputLabel}>
              <Scale size={18} color={colors.gold} />
              <Text style={[styles.inputLabelText, { color: colors.textSecondary }]}>
                Poids actuel
              </Text>
            </View>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={currentWeight}
                onChangeText={(text) => setCurrentWeight(text.replace(',', '.'))}
                keyboardType="decimal-pad"
                placeholder="80"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          {/* Target Weight */}
          <View style={styles.inputRow}>
            <View style={styles.inputLabel}>
              <Target size={18} color={colors.gold} />
              <Text style={[styles.inputLabelText, { color: colors.textSecondary }]}>
                Poids cible
              </Text>
            </View>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={targetWeight}
                onChangeText={(text) => setTargetWeight(text.replace(',', '.'))}
                keyboardType="decimal-pad"
                placeholder="77"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          {/* Days */}
          <View style={styles.inputRow}>
            <View style={styles.inputLabel}>
              <Calendar size={18} color={colors.gold} />
              <Text style={[styles.inputLabelText, { color: colors.textSecondary }]}>
                Jours avant pesee
              </Text>
            </View>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={daysUntilFight}
                onChangeText={setDaysUntilFight}
                keyboardType="number-pad"
                placeholder="7"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>jours</Text>
            </View>
          </View>
        </View>

        {/* Results */}
        {plan && (
          <>
            {/* Risk Card */}
            <View style={[styles.riskCard, { backgroundColor: getRiskColor(plan.riskLevel) + '15', borderColor: getRiskColor(plan.riskLevel) }]}>
              {plan.riskLevel === 'dangerous' ? (
                <XCircle size={24} color={getRiskColor(plan.riskLevel)} />
              ) : plan.riskLevel === 'safe' ? (
                <CheckCircle size={24} color={getRiskColor(plan.riskLevel)} />
              ) : (
                <AlertTriangle size={24} color={getRiskColor(plan.riskLevel)} />
              )}
              <View style={styles.riskContent}>
                <Text style={[styles.riskLabel, { color: getRiskColor(plan.riskLevel) }]}>
                  {getRiskLabel(plan.riskLevel)}
                </Text>
                <Text style={[styles.riskDetails, { color: colors.textSecondary }]}>
                  {plan.totalToCut.toFixed(1)} kg a perdre ({plan.percentToCut.toFixed(1)}% du poids)
                </Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <TrendingDown size={20} color={colors.gold} />
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {plan.dailyCut.toFixed(2)} kg
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>par jour</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Droplets size={20} color="#3B82F6" />
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {plan.waterCutPossible.toFixed(1)} kg
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>water cut</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Clock size={20} color="#8B5CF6" />
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {plan.daysAvailable}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>jours</Text>
              </View>
            </View>

            {/* Phases */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Plan de coupe
              </Text>

              {plan.phases.map((phase, index) => (
                <View key={index} style={[styles.phaseCard, { backgroundColor: colors.cardHover }]}>
                  <View style={styles.phaseHeader}>
                    <View style={[styles.phaseBadge, { backgroundColor: colors.goldMuted }]}>
                      <Text style={[styles.phaseBadgeText, { color: colors.gold }]}>
                        Phase {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.phaseDays, { color: colors.textMuted }]}>
                      {phase.days} jours
                    </Text>
                  </View>
                  <Text style={[styles.phaseName, { color: colors.textPrimary }]}>
                    {phase.name}
                  </Text>
                  <Text style={[styles.phaseMethod, { color: colors.textSecondary }]}>
                    {phase.method}
                  </Text>
                  <View style={styles.phaseTips}>
                    {phase.tips.map((tip, i) => (
                      <View key={i} style={styles.tipRow}>
                        <View style={[styles.tipDot, { backgroundColor: colors.gold }]} />
                        <Text style={[styles.tipText, { color: colors.textMuted }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Hydration Protocol */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Droplets size={20} color="#3B82F6" />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Protocole Hydrique
                </Text>
              </View>

              <View style={styles.hydrationTable}>
                <View style={[styles.hydrationHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.hydrationHeaderText, { color: colors.textMuted }]}>J-</Text>
                  <Text style={[styles.hydrationHeaderText, { color: colors.textMuted }]}>Eau</Text>
                  <Text style={[styles.hydrationHeaderText, { color: colors.textMuted }]}>Sel</Text>
                </View>

                {plan.hydrationProtocol.map((day, index) => (
                  <View
                    key={index}
                    style={[
                      styles.hydrationRow,
                      { borderBottomColor: colors.border },
                      day.daysOut <= 1 && { backgroundColor: 'rgba(239, 68, 68, 0.05)' }
                    ]}
                  >
                    <Text style={[styles.hydrationDay, { color: colors.textPrimary }]}>
                      J-{day.daysOut}
                    </Text>
                    <Text style={[
                      styles.hydrationWater,
                      { color: day.waterLiters > 4 ? '#3B82F6' : day.waterLiters < 2 ? '#EF4444' : colors.textPrimary }
                    ]}>
                      {day.waterLiters}L
                    </Text>
                    <Text style={[styles.hydrationSodium, { color: colors.textMuted }]}>
                      {day.sodium}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Dangerous Warning */}
            {plan.riskLevel === 'dangerous' && (
              <View style={[styles.dangerCard, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
                <AlertTriangle size={24} color="#DC2626" />
                <Text style={styles.dangerTitle}>ATTENTION</Text>
                <Text style={[styles.dangerText, { color: '#DC2626' }]}>
                  Cette coupe de poids depasse les limites de securite recommandees.
                  Risques: deshydratation severe, problemes cardiaques, baisse de performance.
                  Consulte absolument un medecin du sport!
                </Text>
              </View>
            )}
          </>
        )}

        {!plan && currentWeight && targetWeight && daysUntilFight && (
          <View style={[styles.errorCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>
              Verifie tes parametres. Le poids cible doit etre inferieur au poids actuel.
            </Text>
          </View>
        )}

        {/* ── PROTOCOLE REHYDRATATION JOUR-J ── */}
        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Droplets size={18} color="#3B82F6" />
            <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Protocole rehydratation jour-J</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 17 }}>
            Après la pesée, génère un plan de rehydratation et active les rappels toutes les 20 min.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 5 }}>Poids perdu (kg)</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={rehydDelta}
                  onChangeText={v => setRehydDelta(v.replace(',', '.'))}
                  keyboardType="decimal-pad"
                  placeholder="2.5"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 5 }}>Temps avant combat</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={rehydHours}
                  onChangeText={v => setRehydHours(v.replace(',', '.'))}
                  keyboardType="decimal-pad"
                  placeholder="2"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>h</Text>
              </View>
            </View>
          </View>

          {rehydTimeline && (
            <View style={{ gap: 8 }}>
              {/* Résumé */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <View style={{ flex: 1, backgroundColor: '#3B82F618', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>Total à boire</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#3B82F6' }}>{(rehydTimeline.totalMl / 1000).toFixed(1)} L</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#22C55E18', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>Par rappel</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#22C55E' }}>{rehydTimeline.mlPerSlot} ml</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F59E0B18', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>Rappels</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#F59E0B' }}>{rehydTimeline.slots}</Text>
                </View>
              </View>

              {/* Timeline (6 premières étapes) */}
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 }}>TIMELINE (20 MIN/RAPPEL)</Text>
              <View style={{ gap: 6 }}>
                {rehydTimeline.steps.slice(0, 6).map((step, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 38, height: 22, borderRadius: 6, backgroundColor: '#3B82F618', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#3B82F6' }}>{step.label}</Text>
                    </View>
                    <View style={{ flex: 1, height: 4, backgroundColor: `${colors.border}66`, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(100, ((i + 1) / rehydTimeline.slots) * 100)}%`, height: '100%', backgroundColor: '#3B82F6', borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textPrimary, minWidth: 50, textAlign: 'right' }}>{step.ml} ml</Text>
                  </View>
                ))}
                {rehydTimeline.steps.length > 6 && (
                  <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>+ {rehydTimeline.steps.length - 6} rappels supplémentaires...</Text>
                )}
              </View>

              {/* Bouton notifications */}
              {rehydNotifActive ? (
                <TouchableOpacity
                  onPress={cancelRehydNotifs}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EF444420', borderRadius: 12, paddingVertical: 12, marginTop: 4 }}
                >
                  <BellOff size={16} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14 }}>Annuler les rappels</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={scheduleRehydNotifs}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 12, marginTop: 4 }}
                >
                  <Bell size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Activer les rappels toutes les 20 min</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {!rehydTimeline && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B82F60A', borderRadius: 10, padding: 12 }}>
              <Zap size={14} color="#3B82F6" />
              <Text style={{ flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                Renseigne le poids perdu et le temps disponible pour générer le plan.
              </Text>
            </View>
          )}
        </View>

        {/* ── SUIVI RÉEL VERS OBJECTIF COMPÉTITION ── */}
        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={18} color="#8B5CF6" />
              <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Suivi objectif compétition</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setGoalDraft({ weight: goalWeight, date: goalDate });
                setEditingGoal(true);
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#8B5CF618' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>{goalWeight ? 'Modifier' : 'Définir'}</Text>
            </TouchableOpacity>
          </View>

          {editingGoal && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.inputContainer, { flex: 1, backgroundColor: colors.cardHover }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={goalDraft.weight}
                    onChangeText={v => setGoalDraft(d => ({ ...d, weight: v.replace(',', '.') }))}
                    keyboardType="decimal-pad"
                    placeholder="Poids cible (kg)"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
                </View>
                <View style={[styles.inputContainer, { flex: 1.5, backgroundColor: colors.cardHover }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={goalDraft.date}
                    onChangeText={v => setGoalDraft(d => ({ ...d, date: v }))}
                    placeholder="Date compét. AAAA-MM-JJ"
                    placeholderTextColor={colors.textMuted}
                    maxLength={10}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  setGoalWeight(goalDraft.weight);
                  setGoalDate(goalDraft.date);
                  await AsyncStorage.setItem(GOAL_KEY, JSON.stringify(goalDraft));
                  setEditingGoal(false);
                }}
                style={{ backgroundColor: '#8B5CF6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          )}

          {goalWeight && goalDate && weightHistory.length > 0 && (() => {
            const target = parseFloat(goalWeight);
            const compDate = new Date(goalDate);
            const today = new Date();
            const daysLeft = Math.max(0, Math.round((compDate.getTime() - today.getTime()) / 86400000));

            // Poids hebdomadaires (dernier pesée par semaine)
            const weekMap: Record<string, number> = {};
            for (const w of weightHistory) {
              const d = new Date(w.date);
              const week = `${d.getFullYear()}-${Math.floor(d.getTime() / (7 * 86400000))}`;
              if (!weekMap[week]) weekMap[week] = w.weight;
            }
            const weeks = Object.entries(weekMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
            const latestWeight = weeks[weeks.length - 1]?.[1];
            const toGo = latestWeight != null ? Math.max(0, latestWeight - target) : null;
            const maxW = Math.max(...weeks.map(w => w[1]), target + 1);
            const minW = Math.min(...weeks.map(w => w[1]), target - 0.5);
            const range = maxW - minW || 1;
            const BAR_HEIGHT = 80;

            return (
              <View style={{ gap: 10 }}>
                {/* Stats clés */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: '#8B5CF618', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Objectif</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#8B5CF6' }}>{target} kg</Text>
                  </View>
                  {latestWeight != null && (
                    <View style={{ flex: 1, backgroundColor: toGo != null && toGo <= 0 ? '#22C55E18' : '#F59E0B18', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>À perdre</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: toGo != null && toGo <= 0 ? '#22C55E' : '#F59E0B' }}>
                        {toGo != null && toGo <= 0 ? 'Atteint !' : `${toGo?.toFixed(1)} kg`}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, backgroundColor: daysLeft < 14 ? '#EF444418' : '#06B6D418', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Jours restants</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: daysLeft < 14 ? '#EF4444' : '#06B6D4' }}>{daysLeft}</Text>
                  </View>
                </View>

                {/* Mini graphique barres semaines */}
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 }}>ÉVOLUTION HEBDOMADAIRE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_HEIGHT + 20 }}>
                  {weeks.map(([week, w], i) => {
                    const barH = ((w - minW) / range) * BAR_HEIGHT;
                    const isLast = i === weeks.length - 1;
                    const col = w <= target ? '#22C55E' : w - target < 1 ? '#F59E0B' : '#8B5CF6';
                    return (
                      <View key={week} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                        <Text style={{ fontSize: 9, color: colors.textMuted }}>{w.toFixed(1)}</Text>
                        <View style={{
                          width: '100%',
                          height: Math.max(8, barH),
                          backgroundColor: col,
                          borderRadius: 4,
                          opacity: isLast ? 1 : 0.55,
                          borderWidth: isLast ? 1.5 : 0,
                          borderColor: isLast ? '#fff' : 'transparent',
                        }} />
                        <Text style={{ fontSize: 8, color: colors.textMuted }}>S{i + 1}</Text>
                      </View>
                    );
                  })}
                  {/* Ligne cible */}
                </View>

                {/* Ligne cible indication */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ flex: 1, height: 1.5, backgroundColor: '#22C55E', borderRadius: 1 }} />
                  <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '700' }}>Cible {target} kg</Text>
                  <View style={{ flex: 1, height: 1.5, backgroundColor: '#22C55E', borderRadius: 1 }} />
                </View>
              </View>
            );
          })()}

          {(!goalWeight || !goalDate) && !editingGoal && (
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
              Définis ton objectif de poids et la date de ta compétition pour suivre ta progression.
            </Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },

  // Warning
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },

  // Card
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 18,
    fontWeight: '700',
    width: 60,
    textAlign: 'center',
    paddingVertical: 10,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Risk Card
  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  riskContent: {
    flex: 1,
  },
  riskLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  riskDetails: {
    fontSize: 13,
    marginTop: 2,
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Phases
  phaseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  phaseDays: {
    fontSize: 12,
    fontWeight: '600',
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  phaseMethod: {
    fontSize: 13,
    marginBottom: 12,
  },
  phaseTips: {
    gap: 6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },

  // Hydration Table
  hydrationTable: {
    marginTop: 8,
  },
  hydrationHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  hydrationHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  hydrationRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  hydrationDay: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  hydrationWater: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  hydrationSodium: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },

  // Danger Card
  dangerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
    marginVertical: 8,
  },
  dangerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Error
  errorCard: {
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
