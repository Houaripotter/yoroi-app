// ============================================
// YOROI - DRILL TRACKER
// ============================================
// Compteur de répétitions par technique
// Objectif hebdomadaire + progression vers 1000 reps
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { Plus, Minus, Trash2, ChevronLeft, Target, Flame, Award } from 'lucide-react-native';
import logger from '@/lib/security/logger';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { SkeletonCard, SkeletonMessage } from '@/components/stats/SkeletonCard';

// ============================================
// TYPES & STORAGE
// ============================================

interface DrillTechnique {
  id: string;
  name: string;
  totalReps: number;   // Toutes séances confondues
  weekReps: number;    // Cette semaine (ISO week)
  weekGoal: number;    // Objectif hebdo
  targetTotal: number; // Objectif global (défaut 1000)
  lastUpdated?: string; // ISO date
}

const STORAGE_KEY = '@yoroi_drill_tracker';
const getCurrentWeek = () => {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1); // Lundi
  return start.toISOString().split('T')[0];
};

const DEFAULT_TECHNIQUES: Omit<DrillTechnique, 'id'>[] = [
  { name: 'Single leg', totalReps: 0, weekReps: 0, weekGoal: 100, targetTotal: 1000 },
  { name: 'Double leg', totalReps: 0, weekReps: 0, weekGoal: 100, targetTotal: 1000 },
  { name: 'Triangle', totalReps: 0, weekReps: 0, weekGoal: 50, targetTotal: 1000 },
  { name: 'Guillotine', totalReps: 0, weekReps: 0, weekGoal: 50, targetTotal: 1000 },
  { name: 'Armbar', totalReps: 0, weekReps: 0, weekGoal: 50, targetTotal: 1000 },
  { name: 'Passage de garde', totalReps: 0, weekReps: 0, weekGoal: 80, targetTotal: 1000 },
  { name: 'Sweep', totalReps: 0, weekReps: 0, weekGoal: 80, targetTotal: 1000 },
];

// ============================================
// HELPERS
// ============================================

async function loadTechniques(): Promise<DrillTechnique[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = DEFAULT_TECHNIQUES.map((t, i) => ({ ...t, id: `default_${i}` }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ week: getCurrentWeek(), techniques: defaults }));
      return defaults;
    }
    const data = JSON.parse(raw);
    // Reset weekReps si nouvelle semaine
    if (data.week !== getCurrentWeek()) {
      const reset = data.techniques.map((t: DrillTechnique) => ({ ...t, weekReps: 0 }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ week: getCurrentWeek(), techniques: reset }));
      return reset;
    }
    return data.techniques;
  } catch (e) {
    logger.error('[DrillTracker] load error:', e);
    return DEFAULT_TECHNIQUES.map((t, i) => ({ ...t, id: `default_${i}` }));
  }
}

async function saveTechniques(techniques: DrillTechnique[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ week: getCurrentWeek(), techniques }));
}

// ============================================
// COMPOSANT CARTE TECHNIQUE
// ============================================

const DrillCard: React.FC<{
  tech: DrillTechnique;
  onAdd: (id: string, count: number) => void;
  onDelete: (id: string) => void;
  colors: any;
  isDark: boolean;
}> = ({ tech, onAdd, onDelete, colors, isDark }) => {
  const weekPct = tech.weekGoal > 0 ? Math.min(1, tech.weekReps / tech.weekGoal) : 0;
  const totalPct = Math.min(1, tech.totalReps / tech.targetTotal);
  const weekDone = weekPct >= 1;
  const totalDone = totalPct >= 1;

  const weekColor = weekDone ? '#22C55E' : weekPct > 0.6 ? '#F59E0B' : '#8B5CF6';
  const totalColor = totalDone ? '#22C55E' : '#3B82F6';

  return (
    <View style={[styles.card, {
      backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
      borderColor: weekDone ? '#22C55E40' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }} numberOfLines={1}>{tech.name}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 2 }}>
            {tech.totalReps.toLocaleString()} / {tech.targetTotal.toLocaleString()} reps au total
          </Text>
        </View>
        {totalDone && <Award size={18} color="#22C55E" style={{ marginRight: 8 }} />}
        <TouchableOpacity
          onPress={() => onDelete(tech.id)}
          style={{ padding: 4, opacity: 0.5 }}
        >
          <Trash2 size={14} color={colors.textMuted ?? '#888'} />
        </TouchableOpacity>
      </View>

      {/* Barre semaine */}
      <View style={{ gap: 4, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>Cette semaine</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: weekColor }}>
            {tech.weekReps} / {tech.weekGoal}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <View style={{ width: `${weekPct * 100}%` as any, height: '100%', backgroundColor: weekColor, borderRadius: 3 }} />
        </View>
      </View>

      {/* Barre objectif global */}
      <View style={{ gap: 4, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>Objectif {tech.targetTotal.toLocaleString()}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: totalColor }}>
            {(totalPct * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <View style={{ width: `${totalPct * 100}%` as any, height: '100%', backgroundColor: totalColor, borderRadius: 2 }} />
        </View>
      </View>

      {/* Boutons +1 / +5 / +10 */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => { onAdd(tech.id, -1); impactAsync(ImpactFeedbackStyle.Light); }}
          style={[styles.counterBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', width: 36, height: 36 }]}
        >
          <Minus size={14} color={colors.text} />
        </TouchableOpacity>
        {[1, 5, 10, 20].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => { onAdd(tech.id, n); impactAsync(ImpactFeedbackStyle.Light); }}
            style={[styles.counterBtn, {
              backgroundColor: n === 1 ? '#8B5CF6' : n === 5 ? '#3B82F6' : n === 10 ? '#06B6D4' : '#22C55E',
              flex: 1,
            }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>+{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {weekDone && (
        <View style={{ marginTop: 8, backgroundColor: '#22C55E15', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E' }}>Objectif semaine atteint !</Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

export default function DrillTrackerScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [techniques, setTechniques] = useState<DrillTechnique[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('100');

  useEffect(() => {
    loadTechniques().then(t => { setTechniques(t); setLoading(false); });
  }, []);

  const save = useCallback(async (updated: DrillTechnique[]) => {
    setTechniques(updated);
    await saveTechniques(updated).catch(e => logger.error('[DrillTracker] save error:', e));
  }, []);

  const handleAdd = useCallback(async (id: string, count: number) => {
    const updated = techniques.map(t => {
      if (t.id !== id) return t;
      const newTotal = Math.max(0, t.totalReps + count);
      const newWeek = Math.max(0, t.weekReps + count);
      if (count > 0 && newTotal >= t.targetTotal && t.totalReps < t.targetTotal) {
        notificationAsync(NotificationFeedbackType.Success);
      }
      return { ...t, totalReps: newTotal, weekReps: newWeek, lastUpdated: new Date().toISOString() };
    });
    await save(updated);
  }, [techniques, save]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette technique et tous ses compteurs ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await save(techniques.filter(t => t.id !== id));
      }},
    ]);
  }, [techniques, save]);

  const handleAddTechnique = async () => {
    if (!newName.trim()) return;
    const newTech: DrillTechnique = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      totalReps: 0,
      weekReps: 0,
      weekGoal: parseInt(newGoal) || 100,
      targetTotal: 1000,
    };
    await save([...techniques, newTech]);
    setNewName('');
    setNewGoal('100');
    setShowAdd(false);
    impactAsync(ImpactFeedbackStyle.Medium);
  };

  // Totaux globaux
  const totalWeekReps = techniques.reduce((s, t) => s + t.weekReps, 0);
  const totalAllReps = techniques.reduce((s, t) => s + t.totalReps, 0);
  const completedGoals = techniques.filter(t => t.weekReps >= t.weekGoal).length;

  return (
    <PremiumGate featureTitle="Drill Tracker">
    <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Drill Tracker</Text>
        <TouchableOpacity
          onPress={() => { setShowAdd(true); impactAsync(ImpactFeedbackStyle.Light); }}
          style={[styles.headerBtn, { backgroundColor: '#8B5CF6' }]}
        >
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Résumé semaine */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}>
          <Flame size={16} color="#8B5CF6" />
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#8B5CF6', marginTop: 4 }}>{totalWeekReps.toLocaleString()}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>Reps cette semaine</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}>
          <Target size={16} color="#22C55E" />
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#22C55E', marginTop: 4 }}>{completedGoals}/{techniques.length}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>Objectifs atteints</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}>
          <Award size={16} color="#F59E0B" />
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#F59E0B', marginTop: 4 }}>{totalAllReps.toLocaleString()}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>Reps totales</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: insets.bottom + 32, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Skeleton pendant le chargement initial */}
        {loading && (
          <>
            <SkeletonCard height={100} width="100%" />
            <SkeletonCard height={100} width="100%" />
            <SkeletonCard height={100} width="100%" />
            <SkeletonCard height={100} width="100%" />
            <SkeletonMessage />
          </>
        )}
        {/* Formulaire ajout */}
        {showAdd && (
          <View style={[styles.card, {
            backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
            borderColor: '#8B5CF680',
          }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Nouvelle technique</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border ?? '#333', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
              placeholder="Nom de la technique..."
              placeholderTextColor={colors.textMuted ?? '#888'}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="next"
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border ?? '#333', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                placeholder="Objectif /semaine"
                placeholderTextColor={colors.textMuted ?? '#888'}
                value={newGoal}
                onChangeText={v => setNewGoal(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                onPress={() => { setShowAdd(false); setNewName(''); }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}
              >
                <Text style={{ color: colors.textMuted ?? '#888', fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddTechnique}
                disabled={!newName.trim()}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: newName.trim() ? '#8B5CF6' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {techniques.map(tech => (
          <DrillCard
            key={tech.id}
            tech={tech}
            onAdd={handleAdd}
            onDelete={handleDelete}
            colors={colors}
            isDark={isDark}
          />
        ))}

        {techniques.length === 0 && !loading && (
          <View style={{ alignItems: 'center', paddingTop: 48, gap: 12 }}>
            <Target size={48} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Aucune technique</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted ?? '#888', textAlign: 'center' }}>
              Ajoute des techniques avec le bouton + pour suivre tes répétitions.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
    </PremiumGate>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  counterBtn: {
    height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14,
  },
});
