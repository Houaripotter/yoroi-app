// ============================================
// YOROI - HEATMAP POSITIONNELLE BJJ
// ============================================
// Schéma visuel des positions BJJ avec soumissions
// tentées / réussies par position, stocké AsyncStorage
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { ChevronLeft, Plus, X, Check, Target, TrendingUp } from 'lucide-react-native';

// ============================================
// TYPES
// ============================================

interface SubmissionEntry {
  id: string;
  name: string;
  attempts: number;
  successes: number;
}

interface BJJPosition {
  id: string;
  name: string;
  x: number;           // position % sur le schéma (0-100)
  y: number;
  color: string;
  submissions: SubmissionEntry[];
  timeMinutes: number; // temps estimé passé dans cette position
}

const STORAGE_KEY = '@yoroi_bjj_positions';

// ============================================
// POSITIONS PRÉDÉFINIES
// ============================================

const DEFAULT_POSITIONS: BJJPosition[] = [
  { id: 'mount', name: 'Monte', x: 50, y: 18, color: '#EF4444', submissions: [], timeMinutes: 0 },
  { id: 'back', name: 'Dos', x: 78, y: 30, color: '#F97316', submissions: [], timeMinutes: 0 },
  { id: 'guard', name: 'Garde fermée', x: 50, y: 55, color: '#3B82F6', submissions: [], timeMinutes: 0 },
  { id: 'half_guard', name: '1/2 garde', x: 28, y: 55, color: '#6366F1', submissions: [], timeMinutes: 0 },
  { id: 'side_control', name: 'Contrôle latéral', x: 72, y: 55, color: '#8B5CF6', submissions: [], timeMinutes: 0 },
  { id: 'turtle', name: 'Tortue', x: 22, y: 32, color: '#F59E0B', submissions: [], timeMinutes: 0 },
  { id: 'standing', name: 'Debout', x: 50, y: 85, color: '#22C55E', submissions: [], timeMinutes: 0 },
  { id: 'butterfly', name: 'Papillon', x: 50, y: 70, color: '#06B6D4', submissions: [], timeMinutes: 0 },
];

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function BJJPositionsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [positions, setPositions] = useState<BJJPosition[]>(DEFAULT_POSITIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<'sub' | null>(null);
  const [subDraft, setSubDraft] = useState({ name: '', attempts: '1', successes: '0' });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved: BJJPosition[] = JSON.parse(raw);
        // Merge avec les positions par défaut pour avoir les nouvelles positions
        const merged = DEFAULT_POSITIONS.map(def => {
          const existing = saved.find(s => s.id === def.id);
          return existing ?? def;
        });
        setPositions(merged);
      } catch {}
    });
  }, []);

  const persist = async (updated: BJJPosition[]) => {
    setPositions(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* storage error - state already updated */ }
  };

  const selected = selectedId ? positions.find(p => p.id === selectedId) ?? null : null;

  // Statistiques globales
  const globalStats = useMemo(() => {
    let totalAttempts = 0;
    let totalSuccesses = 0;
    let totalTime = 0;
    for (const pos of positions) {
      totalTime += pos.timeMinutes;
      for (const sub of pos.submissions) {
        totalAttempts += sub.attempts;
        totalSuccesses += sub.successes;
      }
    }
    return { totalAttempts, totalSuccesses, totalTime, finishRate: totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0 };
  }, [positions]);

  // Intensité heatmap : max soumissions réussies parmi toutes les positions
  const maxSuccess = useMemo(() => {
    return Math.max(1, ...positions.map(p => p.submissions.reduce((s, sub) => s + sub.successes, 0)));
  }, [positions]);

  const getHeatColor = (pos: BJJPosition) => {
    const successes = pos.submissions.reduce((s, sub) => s + sub.successes, 0);
    const ratio = successes / maxSuccess;
    if (ratio === 0) return pos.color + '40';
    if (ratio < 0.33) return pos.color + '80';
    if (ratio < 0.66) return pos.color + 'CC';
    return pos.color;
  };

  const addSubmission = async () => {
    if (!selected || !subDraft.name.trim()) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    const entry: SubmissionEntry = {
      id: makeId(),
      name: subDraft.name.trim(),
      attempts: Math.max(0, parseInt(subDraft.attempts) || 0),
      successes: Math.max(0, parseInt(subDraft.successes) || 0),
    };
    const updated = positions.map(p =>
      p.id === selected.id ? { ...p, submissions: [...p.submissions, entry] } : p
    );
    await persist(updated);
    setModal(null);
    setSubDraft({ name: '', attempts: '1', successes: '0' });
  };

  const removeSubmission = async (posId: string, subId: string) => {
    const updated = positions.map(p =>
      p.id === posId ? { ...p, submissions: p.submissions.filter(s => s.id !== subId) } : p
    );
    await persist(updated);
  };

  const updateTime = async (posId: string, delta: number) => {
    const updated = positions.map(p =>
      p.id === posId ? { ...p, timeMinutes: Math.max(0, p.timeMinutes + delta) } : p
    );
    await persist(updated);
  };

  const cardStyle = {
    backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    padding: 14,
    marginBottom: 12,
  };

  // ── SCHÉMA SVG-LIKE avec des View absolues ──
  const SCHEMA_HEIGHT = 260;
  const SCHEMA_WIDTH_PCT = 1; // 100% de la largeur

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F2F2F7' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{t('bjjPositions.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats globales */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: t('bjjPositions.attempts'), value: globalStats.totalAttempts, color: '#F59E0B' },
            { label: t('bjjPositions.finishes'), value: globalStats.totalSuccesses, color: '#22C55E' },
            { label: t('bjjPositions.finishRate'), value: `${globalStats.finishRate}%`, color: '#EF4444' },
          ].map(({ label, value, color }) => (
            <View key={label} style={[cardStyle, { flex: 1, alignItems: 'center', padding: 12, marginBottom: 0 }]}>
              <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginBottom: 3 }}>{label}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Schéma heatmap */}
        <View style={[cardStyle, { overflow: 'hidden' }]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{t('bjjPositions.mapTitle')}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginBottom: 12, lineHeight: 16 }}>
            {t('bjjPositions.mapHint')}
          </Text>

          {/* Corps schématique */}
          <View style={{ height: SCHEMA_HEIGHT, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 12, position: 'relative' }}>
            {/* Silhouette simple : tête + corps */}
            <View style={{ position: 'absolute', top: 10, left: '50%', marginLeft: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} />
            <View style={{ position: 'absolute', top: 42, left: '50%', marginLeft: -20, width: 40, height: 70, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} />
            <View style={{ position: 'absolute', top: 112, left: '50%', marginLeft: -18, width: 36, height: 60, borderRadius: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

            {/* Points de position */}
            {positions.map(pos => {
              const isSelected = pos.id === selectedId;
              const heat = getHeatColor(pos);
              const totalSubs = pos.submissions.reduce((s, sub) => s + sub.successes, 0);
              return (
                <TouchableOpacity
                  key={pos.id}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setSelectedId(pos.id === selectedId ? null : pos.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%` as any,
                    top: `${pos.y}%` as any,
                    transform: [{ translateX: -32 }, { translateY: -12 }],
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                    backgroundColor: heat,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#fff' : `${pos.color}60`,
                    minWidth: 64,
                    alignItems: 'center',
                    shadowColor: pos.color,
                    shadowOpacity: isSelected ? 0.6 : 0,
                    shadowRadius: 6,
                    elevation: isSelected ? 4 : 0,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }} numberOfLines={1}>{pos.name}</Text>
                    {totalSubs > 0 && (
                      <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>{totalSubs} fin.</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Légende */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: t('bjjPositions.legendLow'), opacity: '40' },
              { label: t('bjjPositions.legendMedium'), opacity: '80' },
              { label: t('bjjPositions.legendActive'), opacity: 'CC' },
              { label: t('bjjPositions.legendDominant'), opacity: 'FF' },
            ].map(({ label, opacity }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: `#EF4444${opacity}` }} />
                <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888' }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Détail position sélectionnée */}
        {selected && (
          <View style={[cardStyle, { borderLeftWidth: 3, borderLeftColor: selected.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: selected.color }} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{selected.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedId(null)}>
                <X size={16} color={colors.textMuted ?? '#888'} />
              </TouchableOpacity>
            </View>

            {/* Temps passé */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, backgroundColor: `${selected.color}10`, borderRadius: 10, padding: 10 }}>
              <TrendingUp size={14} color={selected.color} />
              <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>{t('bjjPositions.timeInPosition')}</Text>
              <TouchableOpacity onPress={() => updateTime(selected.id, -5)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${selected.color}20`, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: selected.color }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 14, fontWeight: '800', color: selected.color, minWidth: 55, textAlign: 'center' }}>{selected.timeMinutes} min</Text>
              <TouchableOpacity onPress={() => updateTime(selected.id, 5)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${selected.color}20`, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: selected.color }}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Soumissions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{t('bjjPositions.submissionsFromPosition')}</Text>
              <TouchableOpacity
                onPress={() => { setSubDraft({ name: '', attempts: '1', successes: '0' }); setModal('sub'); }}
                style={{ backgroundColor: `${selected.color}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Plus size={12} color={selected.color} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: selected.color }}>{t('bjjPositions.addSubmission')}</Text>
              </TouchableOpacity>
            </View>

            {selected.submissions.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', paddingVertical: 12 }}>{t('bjjPositions.noSubmissions')}</Text>
            ) : (
              <View style={{ gap: 6 }}>
                {/* En-tête */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.textMuted ?? '#888', fontWeight: '700' }}>{t('bjjPositions.techColumn')}</Text>
                  <Text style={{ width: 60, fontSize: 10, color: colors.textMuted ?? '#888', fontWeight: '700', textAlign: 'center' }}>{t('bjjPositions.attemptsColumn')}</Text>
                  <Text style={{ width: 60, fontSize: 10, color: colors.textMuted ?? '#888', fontWeight: '700', textAlign: 'center' }}>{t('bjjPositions.successColumn')}</Text>
                  <Text style={{ width: 50, fontSize: 10, color: colors.textMuted ?? '#888', fontWeight: '700', textAlign: 'center' }}>{t('bjjPositions.rateColumn')}</Text>
                  <View style={{ width: 24 }} />
                </View>
                {selected.submissions.map(sub => {
                  const rate = sub.attempts > 0 ? Math.round((sub.successes / sub.attempts) * 100) : 0;
                  const rateColor = rate >= 50 ? '#22C55E' : rate >= 25 ? '#F59E0B' : '#EF4444';
                  return (
                    <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{sub.name}</Text>
                        <View style={{ height: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                          <View style={{ width: `${rate}%`, height: '100%', backgroundColor: rateColor, borderRadius: 2 }} />
                        </View>
                      </View>
                      <Text style={{ width: 60, fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{sub.attempts}</Text>
                      <Text style={{ width: 60, fontSize: 13, fontWeight: '700', color: '#22C55E', textAlign: 'center' }}>{sub.successes}</Text>
                      <Text style={{ width: 50, fontSize: 11, fontWeight: '800', color: rateColor, textAlign: 'center' }}>{rate}%</Text>
                      <TouchableOpacity onPress={() => removeSubmission(selected.id, sub.id)} style={{ width: 24, alignItems: 'center' }}>
                        <X size={12} color={colors.textMuted ?? '#888'} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Top positions par finitions */}
        {globalStats.totalSuccesses > 0 && (
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Target size={14} color="#EF4444" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{t('bjjPositions.topOffensive')}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {[...positions]
                .map(p => ({ ...p, totalSubs: p.submissions.reduce((s, sub) => s + sub.successes, 0) }))
                .filter(p => p.totalSubs > 0)
                .sort((a, b) => b.totalSubs - a.totalSubs)
                .slice(0, 4)
                .map(pos => (
                  <View key={pos.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pos.color }} />
                    <Text style={{ flex: 1, fontSize: 12, color: colors.text, fontWeight: '600' }}>{pos.name}</Text>
                    <View style={{ flex: 2, height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${(pos.totalSubs / maxSuccess) * 100}%`, height: '100%', backgroundColor: pos.color, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: pos.color, minWidth: 30, textAlign: 'right' }}>{pos.totalSubs}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal ajout soumission */}
      <Modal visible={modal === 'sub'} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
              {t('bjjPositions.newSubmissionTitle').replace('{{position}}', selected?.name ?? '')}
            </Text>
            <View>
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 6 }}>{t('bjjPositions.technique')}</Text>
              <TextInput
                style={{ fontSize: 14, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                value={subDraft.name}
                onChangeText={v => setSubDraft(d => ({ ...d, name: v }))}
                placeholder={t('bjjPositions.placeholderTechnique')}
                placeholderTextColor={colors.textMuted ?? '#888'}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 6 }}>{t('bjjPositions.attemptsLabel')}</Text>
                <TextInput
                  style={{ fontSize: 14, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                  value={subDraft.attempts}
                  onChangeText={v => setSubDraft(d => ({ ...d, attempts: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 6 }}>{t('bjjPositions.successLabel')}</Text>
                <TextInput
                  style={{ fontSize: 14, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                  value={subDraft.successes}
                  onChangeText={v => setSubDraft(d => ({ ...d, successes: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setModal(null)} style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{t('bjjPositions.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addSubmission} style={{ flex: 2, backgroundColor: selected?.color ?? '#EF4444', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{t('bjjPositions.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
