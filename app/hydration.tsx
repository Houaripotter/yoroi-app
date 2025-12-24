import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Droplets,
  Target,
  TrendingUp,
  Calendar,
  Check,
  Plus,
  Minus,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');
const HYDRATION_KEY = '@yoroi_hydration_today';
const HYDRATION_GOAL_KEY = '@yoroi_hydration_goal';
const HYDRATION_HISTORY_KEY = '@yoroi_hydration_history';

interface DayData {
  date: string;
  amount: number;
  goal: number;
}

export default function HydrationScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentAmount, setCurrentAmount] = useState(0);
  const [goal, setGoal] = useState(2.5);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('2.5');
  const [history, setHistory] = useState<DayData[]>([]);

  // Animations
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadData();

    // Animation vague
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    wave.start();

    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 12,
      useNativeDriver: true,
    }).start();

    return () => wave.stop();
  }, []);

  const loadData = async () => {
    try {
      const [amountStr, goalStr, historyStr] = await Promise.all([
        AsyncStorage.getItem(HYDRATION_KEY),
        AsyncStorage.getItem(HYDRATION_GOAL_KEY),
        AsyncStorage.getItem(HYDRATION_HISTORY_KEY),
      ]);

      if (amountStr) {
        const data = JSON.parse(amountStr);
        const today = new Date().toDateString();
        if (data.date === today) {
          setCurrentAmount(data.amount);
        }
      }

      if (goalStr) {
        setGoal(parseFloat(goalStr));
        setGoalInput(goalStr);
      }

      if (historyStr) {
        setHistory(JSON.parse(historyStr));
      }
    } catch (error) {
      console.error('Erreur chargement hydratation:', error);
    }
  };

  const saveAmount = async (amount: number) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(HYDRATION_KEY, JSON.stringify({ date: today, amount }));
      
      // Mettre à jour l'historique
      const todayISO = new Date().toISOString().split('T')[0];
      const newHistory = history.filter(d => d.date !== todayISO);
      newHistory.unshift({ date: todayISO, amount, goal });
      setHistory(newHistory.slice(0, 30)); // Garder 30 jours
      await AsyncStorage.setItem(HYDRATION_HISTORY_KEY, JSON.stringify(newHistory.slice(0, 30)));
    } catch (error) {
      console.error('Erreur sauvegarde hydratation:', error);
    }
  };

  const saveGoal = async (newGoal: number) => {
    try {
      await AsyncStorage.setItem(HYDRATION_GOAL_KEY, newGoal.toString());
      setGoal(newGoal);
      setEditingGoal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Erreur sauvegarde objectif:', error);
    }
  };

  const addWater = (amountL: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newAmount = Math.max(0, currentAmount + amountL);
    setCurrentAmount(newAmount);
    saveAmount(newAmount);
  };

  const percentage = Math.min((currentAmount / goal) * 100, 100);
  const waveTranslate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 5],
  });

  // Statistiques
  const last7Days = history.slice(0, 7);
  const successDays = last7Days.filter(d => d.amount >= d.goal).length;
  const successRate = last7Days.length > 0 ? Math.round((successDays / last7Days.length) * 100) : 0;
  const avgAmount = last7Days.length > 0
    ? last7Days.reduce((acc, d) => acc + d.amount, 0) / last7Days.length
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Hydratation</Text>
        <TouchableOpacity onPress={() => setEditingGoal(!editingGoal)} style={styles.settingsButton}>
          <Settings size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Grande bouteille animée */}
        <Animated.View style={[styles.bottleCard, { backgroundColor: colors.backgroundCard, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.bigBottle}>
            {/* Bouchon */}
            <View style={[styles.bottleCap, { backgroundColor: '#0EA5E9' }]} />
            
            {/* Corps */}
            <View style={[styles.bottleBody, { borderColor: '#0EA5E9' }]}>
              {/* Eau animée */}
              <Animated.View
                style={[
                  styles.water,
                  {
                    height: `${percentage}%`,
                    transform: [{ translateX: waveTranslate }],
                  }
                ]}
              >
                <View style={styles.waterWave} />
              </Animated.View>
              
              {/* Graduations */}
              <View style={styles.graduations}>
                {[0.25, 0.5, 0.75].map((ratio) => (
                  <View key={ratio} style={styles.graduation}>
                    <View style={[styles.gradLine, { backgroundColor: '#0EA5E930' }]} />
                    <Text style={[styles.gradLabel, { color: '#0EA5E950' }]}>
                      {(goal * ratio).toFixed(2)}L
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Valeur centrale */}
          <View style={styles.valueOverlay}>
            <Text style={[styles.bigValue, { color: percentage >= 100 ? '#10B981' : colors.textPrimary }]}>
              {currentAmount.toFixed(2)}
            </Text>
            <Text style={[styles.bigUnit, { color: colors.textMuted }]}>/ {goal}L</Text>
          </View>

          {/* Indicateur succès */}
          {percentage >= 100 && (
            <View style={styles.successBadge}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.successText}>Objectif atteint !</Text>
            </View>
          )}
        </Animated.View>

        {/* Boutons d'ajout */}
        <View style={[styles.buttonsCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ajouter de l'eau</Text>
          
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#EF444420' }]}
              onPress={() => addWater(-0.25)}
            >
              <Minus size={20} color="#EF4444" />
              <Text style={[styles.addButtonLabel, { color: '#EF4444' }]}>-250ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#0EA5E920' }]}
              onPress={() => addWater(0.25)}
            >
              <Plus size={20} color="#0EA5E9" />
              <Text style={[styles.addButtonLabel, { color: '#0EA5E9' }]}>+250ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#0EA5E9' }]}
              onPress={() => addWater(0.5)}
            >
              <Droplets size={20} color="#FFFFFF" />
              <Text style={[styles.addButtonLabel, { color: '#FFFFFF' }]}>+500ml</Text>
            </TouchableOpacity>
          </View>

          {/* Quick buttons */}
          <View style={styles.quickRow}>
            {[0.1, 0.33, 0.75, 1].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[styles.quickButton, { backgroundColor: colors.background }]}
                onPress={() => addWater(amount)}
              >
                <Text style={[styles.quickLabel, { color: '#0EA5E9' }]}>
                  +{(amount * 1000).toFixed(0)}ml
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Modifier l'objectif */}
        {editingGoal && (
          <View style={[styles.goalCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.goalHeader}>
              <Target size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Objectif quotidien</Text>
            </View>
            
            <View style={styles.goalInputRow}>
              <TouchableOpacity
                style={[styles.goalAdjust, { backgroundColor: colors.background }]}
                onPress={() => {
                  const newGoal = Math.max(0.5, parseFloat(goalInput) - 0.25);
                  setGoalInput(newGoal.toFixed(2));
                }}
              >
                <Minus size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.goalInputContainer}>
                <TextInput
                  style={[styles.goalInput, { color: colors.textPrimary }]}
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <Text style={[styles.goalInputUnit, { color: colors.textMuted }]}>litres</Text>
              </View>

              <TouchableOpacity
                style={[styles.goalAdjust, { backgroundColor: colors.background }]}
                onPress={() => {
                  const newGoal = Math.min(5, parseFloat(goalInput) + 0.25);
                  setGoalInput(newGoal.toFixed(2));
                }}
              >
                <Plus size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#0EA5E9' }]}
              onPress={() => saveGoal(parseFloat(goalInput))}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Statistiques */}
        <View style={[styles.statsCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Cette semaine</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <TrendingUp size={18} color="#10B981" />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{successRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Réussite</Text>
            </View>

            <View style={styles.statItem}>
              <Droplets size={18} color="#0EA5E9" />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{avgAmount.toFixed(2)}L</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moyenne/jour</Text>
            </View>

            <View style={styles.statItem}>
              <Calendar size={18} color="#8B5CF6" />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{successDays}/7</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Jours réussis</Text>
            </View>
          </View>

          {/* Barres 7 jours */}
          <View style={styles.weekBars}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => {
              const dayData = last7Days[6 - i];
              const dayPercentage = dayData ? Math.min((dayData.amount / dayData.goal) * 100, 100) : 0;
              const isToday = i === 6;

              return (
                <View key={i} style={styles.dayColumn}>
                  <View style={[styles.barBg, { backgroundColor: colors.background }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${dayPercentage}%`,
                          backgroundColor: dayPercentage >= 100 ? '#10B981' : '#0EA5E9',
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.dayLabel,
                    { color: isToday ? '#0EA5E9' : colors.textMuted },
                    isToday && styles.dayLabelActive
                  ]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },
  bottleCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  bigBottle: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bottleCap: {
    width: 50,
    height: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  bottleBody: {
    width: 120,
    height: 180,
    borderWidth: 4,
    borderRadius: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  water: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0EA5E9',
    opacity: 0.7,
  },
  waterWave: {
    position: 'absolute',
    top: -5,
    left: -10,
    right: -10,
    height: 15,
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    opacity: 0.9,
  },
  graduations: {
    position: 'absolute',
    right: 8,
    top: 10,
    bottom: 10,
    justifyContent: 'space-around',
  },
  graduation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gradLine: {
    width: 15,
    height: 2,
    borderRadius: 1,
  },
  gradLabel: {
    fontSize: 8,
    fontWeight: '600',
  },
  valueOverlay: {
    alignItems: 'center',
  },
  bigValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  bigUnit: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: -4,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  successText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  addButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  goalAdjust: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInputContainer: {
    alignItems: 'center',
  },
  goalInput: {
    fontSize: 36,
    fontWeight: '900',
    minWidth: 100,
  },
  goalInputUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: 20,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayLabelActive: {
    fontWeight: '900',
  },
});
