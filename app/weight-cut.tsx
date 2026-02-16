// ============================================
// YOROI - SIMULATEUR WEIGHT CUT
// ============================================
// Planification de coupe de poids pour combattants
// Avec protocole hydrique et alertes de securite

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';

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

  // Inputs
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [daysUntilFight, setDaysUntilFight] = useState('');

  // Calculer le plan
  const plan = useMemo((): WeightCutPlan | null => {
    const current = parseFloat(currentWeight);
    const target = parseFloat(targetWeight);
    const days = parseInt(daysUntilFight);

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
          'Continuer l\'entrainement normal',
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
