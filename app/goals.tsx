import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronLeft, Target, Plus, Check, Trash2, Edit2 } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

// ============================================
// OBJECTIFS - MES BUTS PERSONNELS
// ============================================

interface Goal {
  id: string;
  title: string;
  description?: string;
  target?: string;
  deadline?: string;
  completed: boolean;
  createdAt: string;
}

const GOALS_STORAGE_KEY = '@yoroi_user_goals';

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (stored) {
        setGoals(JSON.parse(stored));
      }
    } catch (error) {
      logger.error('Erreur chargement objectifs:', error);
    }
  };

  const saveGoals = async (newGoals: Goal[]) => {
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(newGoals));
      setGoals(newGoals);
    } catch (error) {
      logger.error('Erreur sauvegarde objectifs:', error);
    }
  };

  const addGoal = () => {
    if (!newGoalTitle.trim()) return;

    impactAsync(ImpactFeedbackStyle.Medium);
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: newGoalTitle.trim(),
      target: newGoalTarget.trim() || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveGoals([newGoal, ...goals]);
    setNewGoalTitle('');
    setNewGoalTarget('');
    setShowAddForm(false);
  };

  const toggleGoal = (id: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    const updated = goals.map(g =>
      g.id === id ? { ...g, completed: !g.completed } : g
    );
    saveGoals(updated);
  };

  const deleteGoal = (id: string) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const updated = goals.filter(g => g.id !== id);
    saveGoals(updated);
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mes Objectifs</Text>
        <TouchableOpacity
          onPress={() => setShowAddForm(!showAddForm)}
          style={[styles.addButton, { backgroundColor: '#EF4444' }]}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.backgroundCard }]}>
          <Target size={32} color="#EF4444" />
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            Définis tes objectifs
          </Text>
          <Text style={[styles.introText, { color: colors.textMuted }]}>
            Note tes objectifs pour rester motivé et suivre ta progression.
          </Text>
        </View>

        {/* Formulaire d'ajout */}
        {showAddForm && (
          <View style={[styles.addForm, { backgroundColor: colors.backgroundCard }]}>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: colors.textPrimary }]}
              placeholder="Mon objectif..."
              placeholderTextColor={colors.textMuted}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
            />
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: colors.textPrimary }]}
              placeholder="Cible (ex: 80kg, 10km, 3x/semaine)"
              placeholderTextColor={colors.textMuted}
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
            />
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#EF4444' }]}
              onPress={addGoal}
            >
              <Text style={styles.submitButtonText}>Ajouter l'objectif</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Objectifs actifs */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              En cours ({activeGoals.length})
            </Text>
            {activeGoals.map((goal) => (
              <View
                key={goal.id}
                style={[styles.goalCard, { backgroundColor: colors.backgroundCard }]}
              >
                <TouchableOpacity
                  style={[styles.checkbox, { borderColor: '#EF4444' }]}
                  onPress={() => toggleGoal(goal.id)}
                >
                  {goal.completed && <Check size={16} color="#EF4444" />}
                </TouchableOpacity>
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>
                    {goal.title}
                  </Text>
                  {goal.target && (
                    <Text style={[styles.goalTarget, { color: colors.textMuted }]}>
                      Cible : {goal.target}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                  <Trash2 size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Objectifs complétés */}
        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Complétés ({completedGoals.length})
            </Text>
            {completedGoals.map((goal) => (
              <View
                key={goal.id}
                style={[styles.goalCard, styles.goalCompleted, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
              >
                <TouchableOpacity
                  style={[styles.checkbox, styles.checkboxCompleted, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                  onPress={() => toggleGoal(goal.id)}
                >
                  <Check size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalTitle, styles.goalTitleCompleted, { color: colors.textMuted }]}>
                    {goal.title}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                  <Trash2 size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {goals.length === 0 && !showAddForm && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucun objectif défini.{'\n'}Appuie sur + pour en ajouter un !
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  introCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  introTitle: { fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  introText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  addForm: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  submitButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  goalCompleted: { opacity: 0.7 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkboxCompleted: {},
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '600' },
  goalTitleCompleted: { textDecorationLine: 'line-through' },
  goalTarget: { fontSize: 13, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
