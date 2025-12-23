import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { NumericInput } from '@/components/NumericInput';
import {
  Droplet,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Activity,
  Bell,
  Settings,
  Check,
  X,
  Lightbulb,
  Dumbbell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { HydrationTracker } from '@/components/HydrationTracker';
import { useTheme } from '@/lib/ThemeContext';
import {
  getHydrationHistory,
  getHydrationSettings,
  saveHydrationSettings,
  getAverageHydration,
  analyzeHydrationWeightCorrelation,
  calculateRecommendedHydration,
  getLatestMeasurement,
  HydrationDayData,
  HydrationSettings,
} from '@/lib/storage';
import { toggleHydrationReminders } from '@/lib/hydrationNotifications';

// ============================================
// ECRAN HYDRATATION DETAILLE
// ============================================

const DAYS_OF_WEEK = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function HydrationScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<HydrationDayData[]>([]);
  const [settings, setSettings] = useState<HydrationSettings | null>(null);
  const [average7Days, setAverage7Days] = useState(0);
  const [correlation, setCorrelation] = useState<{
    avgWeightLossHighHydration: number;
    avgWeightLossLowHydration: number;
    recommendation: string;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGoal, setEditingGoal] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [historyData, settingsData, avgData, correlationData, measurement] = await Promise.all([
        getHydrationHistory(7),
        getHydrationSettings(),
        getAverageHydration(7),
        analyzeHydrationWeightCorrelation(),
        getLatestMeasurement(),
      ]);

      setHistory(historyData);
      setSettings(settingsData);
      setAverage7Days(avgData);
      setCorrelation(correlationData);
      if (measurement) {
        setCurrentWeight(measurement.weight);
      }
    } catch (error) {
      console.error('Erreur chargement hydratation:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSaveGoal = async () => {
    const goal = parseFloat(editingGoal);
    if (isNaN(goal) || goal <= 0 || goal > 10) {
      Alert.alert('Erreur', 'Veuillez entrer un objectif valide (0.5 - 10 L)');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveHydrationSettings({ customGoal: goal, dailyGoal: goal });
    setSettings(prev => prev ? { ...prev, customGoal: goal, dailyGoal: goal } : null);
    setEditingGoal('');
  };

  const toggleReminder = async () => {
    if (!settings) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !settings.reminderEnabled;

    const success = await toggleHydrationReminders(newValue);
    if (success) {
      setSettings(prev => prev ? { ...prev, reminderEnabled: newValue } : null);
      if (newValue) {
        Alert.alert(
          'Rappels actives',
          `Tu recevras un rappel toutes les ${settings.reminderInterval} minutes pour t'hydrater.`
        );
      }
    } else {
      Alert.alert(
        'Permission requise',
        'Active les notifications dans les parametres de ton telephone pour recevoir les rappels.'
      );
    }
  };

  const getStatusIcon = (day: HydrationDayData) => {
    const percentage = (day.totalAmount / day.goal) * 100;
    if (percentage >= 100) return { icon: Check, color: colors.success };
    if (percentage >= 70) return { icon: TrendingUp, color: colors.warning };
    return { icon: X, color: colors.danger };
  };

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return "Auj.";
    if (dateStr === yesterday.toISOString().split('T')[0]) return "Hier";
    return DAYS_OF_WEEK[date.getDay()];
  };

  const recommendedGoal = currentWeight ? calculateRecommendedHydration(currentWeight) : 2.5;

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.info}
            colors={[colors.info]}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Hydratation
          </Text>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.card }]}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* TRACKER PRINCIPAL */}
        <HydrationTracker
          currentWeight={currentWeight || undefined}
          onUpdate={loadData}
        />

        {/* PARAMETRES (toggle) */}
        {showSettings && (
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Parametres
            </Text>

            {/* Objectif personnalise */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Target size={18} color={colors.gold} />
                <View>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Objectif journalier
                  </Text>
                  {currentWeight && (
                    <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                      Recommande: {recommendedGoal}L (base sur {currentWeight}kg)
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.goalInput}>
                <NumericInput
                  value={editingGoal || settings?.dailyGoal?.toString() || ''}
                  onValueChange={setEditingGoal}
                  placeholder={settings?.dailyGoal?.toString() || '2.5'}
                  unit="L"
                  allowDecimal={true}
                  maxDecimals={1}
                  maxLength={4}
                  color={colors.textPrimary}
                  backgroundColor={colors.background}
                  inputStyle={[
                    styles.input,
                    {
                      borderColor: colors.border,
                    },
                  ]}
                />
                {editingGoal && (
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.success }]}
                    onPress={handleSaveGoal}
                  >
                    <Check size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Rappels */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Bell size={18} color={colors.info} />
                <View>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Rappels d'hydratation
                  </Text>
                  <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                    Notification toutes les {settings?.reminderInterval || 120} min
                  </Text>
                </View>
              </View>
              <Switch
                value={settings?.reminderEnabled || false}
                onValueChange={toggleReminder}
                trackColor={{ false: colors.border, true: colors.infoMuted }}
                thumbColor={settings?.reminderEnabled ? colors.info : colors.textMuted}
              />
            </View>

            {/* Bonus jour training */}
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <Dumbbell size={18} color={colors.success} />
                <View>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Bonus jours d'entrainement
                  </Text>
                  <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                    +{settings?.trainingDayBonus || 0.5}L les jours d'entrainement
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* HISTORIQUE 7 JOURS */}
        <Card style={styles.historyCard}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={colors.gold} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Historique
            </Text>
          </View>

          <View style={styles.historyGrid}>
            {history.slice(0, 7).reverse().map(day => {
              const status = getStatusIcon(day);
              const StatusIcon = status.icon;
              const percentage = Math.round((day.totalAmount / day.goal) * 100);

              return (
                <View key={day.date} style={styles.historyDay}>
                  <Text style={[styles.historyDayLabel, { color: colors.textSecondary }]}>
                    {formatDayLabel(day.date)}
                  </Text>
                  <View
                    style={[
                      styles.historyDayCircle,
                      {
                        backgroundColor: status.color + '20',
                        borderColor: status.color,
                      },
                    ]}
                  >
                    <Text style={[styles.historyDayAmount, { color: status.color }]}>
                      {(day.totalAmount / 1000).toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.historyDayStatus}>
                    <StatusIcon size={14} color={status.color} />
                    {day.isTrainingDay && (
                      <Dumbbell size={10} color={colors.success} style={{ marginLeft: 2 }} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Moyenne */}
          <View style={[styles.averageRow, { borderTopColor: colors.border }]}>
            <Activity size={18} color={colors.info} />
            <Text style={[styles.averageLabel, { color: colors.textSecondary }]}>
              Moyenne 7 jours :
            </Text>
            <Text style={[styles.averageValue, { color: colors.textPrimary }]}>
              {(average7Days / 1000).toFixed(1)} L
            </Text>
          </View>
        </Card>

        {/* ANALYSE CORRELATION POIDS */}
        {correlation && (
          <Card style={styles.insightCard}>
            <View style={styles.sectionHeader}>
              <Lightbulb size={20} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Analyse
              </Text>
            </View>

            <View style={[styles.insightBox, { backgroundColor: colors.warningMuted }]}>
              <Text style={[styles.insightText, { color: colors.textPrimary }]}>
                {correlation.recommendation}
              </Text>
            </View>

            <View style={styles.insightStats}>
              <View style={styles.insightStat}>
                <View style={[styles.insightIcon, { backgroundColor: colors.successMuted }]}>
                  <TrendingDown size={16} color={colors.success} />
                </View>
                <Text style={[styles.insightStatLabel, { color: colors.textSecondary }]}>
                  Bonne hydratation
                </Text>
                <Text style={[styles.insightStatValue, { color: colors.success }]}>
                  {correlation.avgWeightLossHighHydration > 0 ? '+' : ''}
                  {correlation.avgWeightLossHighHydration.toFixed(2)} kg/jour
                </Text>
              </View>
              <View style={styles.insightStat}>
                <View style={[styles.insightIcon, { backgroundColor: colors.dangerMuted }]}>
                  <TrendingUp size={16} color={colors.danger} />
                </View>
                <Text style={[styles.insightStatLabel, { color: colors.textSecondary }]}>
                  Faible hydratation
                </Text>
                <Text style={[styles.insightStatValue, { color: colors.danger }]}>
                  {correlation.avgWeightLossLowHydration > 0 ? '+' : ''}
                  {correlation.avgWeightLossLowHydration.toFixed(2)} kg/jour
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* MESSAGE SI PAS ASSEZ DE DONNEES */}
        {!correlation && (
          <Card style={styles.insightCard}>
            <View style={styles.sectionHeader}>
              <Lightbulb size={20} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Conseils
              </Text>
            </View>
            <View style={[styles.insightBox, { backgroundColor: colors.infoMuted }]}>
              <Text style={[styles.insightText, { color: colors.textPrimary }]}>
                Continue a enregistrer ton hydratation et ton poids. Apres 7 jours, tu verras l'impact de ton hydratation sur ta perte de poids !
              </Text>
            </View>
          </Card>
        )}

        {/* CONSEILS */}
        <Card style={styles.tipsCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Astuces
          </Text>
          <View style={styles.tipsList}>
            {[
              'Bois un verre d\'eau des le reveil',
              'Garde une bouteille toujours visible',
              'Bois avant chaque repas',
              'Les jours d\'entrainement, augmente de 0.5L',
              'Prefere l\'eau aux boissons sucrees',
            ].map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Droplet size={14} color={colors.info} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // PARAMETRES
  settingsCard: {
    marginTop: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingHint: {
    fontSize: 12,
    marginTop: 2,
  },
  goalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: 60,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // HISTORIQUE
  historyCard: {
    marginTop: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  historyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDay: {
    alignItems: 'center',
    flex: 1,
  },
  historyDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  historyDayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDayAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyDayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  averageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  averageLabel: {
    fontSize: 14,
    flex: 1,
  },
  averageValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // ANALYSE
  insightCard: {
    marginTop: 16,
    padding: 20,
  },
  insightBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  insightStats: {
    flexDirection: 'row',
    gap: 12,
  },
  insightStat: {
    flex: 1,
    alignItems: 'center',
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insightStatLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  insightStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // CONSEILS
  tipsCard: {
    marginTop: 16,
    padding: 20,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
