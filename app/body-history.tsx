// ============================================
// HISTORIQUE CORPOREL COMPLET
// Poids · Graisse · Muscle · Eau · Os · Viscérale
// Âge méta · BMR · Toutes les mensurations
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList, ScrollView, Animated, PanResponder,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, Trash2, Pencil, Check, X, Plus,
  Smartphone, Scale, Scan, User, Database,
  TrendingDown, TrendingUp, Minus, Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  getAllWeights, deleteWeight, updateWeight, addWeight, Weight,
  getMeasurements, deleteMeasurementRecord, updateMeasurementRecord, addMeasurementRecord, Measurement,
  deduplicateWeights, countWeightDuplicates,
} from '@/lib/database';
import { getAllBodyCompositions, deleteBodyComposition, updateBodyComposition, BodyComposition } from '@/lib/bodyComposition';
import { useCustomPopup } from '@/components/CustomPopup';
import logger from '@/lib/security/logger';

// ============================================
// DÉFINITION DES MÉTRIQUES
// ============================================

type MetricGroup = 'composition' | 'measurements';

interface MetricDef {
  key: string;
  label: string;      // label complet (header, modal)
  chip: string;       // label court pour les chips
  unit: string;
  group: MetricGroup;
  color: string;
  emoji: string;
  getValue: (w: Weight | null, bc: BodyComposition | null, m: Measurement | null) => number | null;
}

const METRICS: MetricDef[] = [
  // ── Composition corporelle ──
  { key: 'weight',        label: 'Poids',             chip: 'Poids',      unit: 'kg',   group: 'composition', color: '#3B82F6', emoji: '⚖️',
    getValue: (w) => w?.weight ?? null },
  { key: 'fat_percent',   label: 'Masse grasse',       chip: 'Grasse',     unit: '%',    group: 'composition', color: '#EF4444', emoji: '🔴',
    getValue: (w, bc) => w?.fat_percent ?? bc?.bodyFatPercent ?? null },
  { key: 'muscle',        label: 'Muscle',             chip: 'Muscle',     unit: 'kg',   group: 'composition', color: '#10B981', emoji: '💪',
    getValue: (w, bc) => {
      if (bc?.muscleMass) return bc.muscleMass;
      if (w?.muscle_percent && w?.weight) return parseFloat(((w.muscle_percent / 100) * w.weight).toFixed(1));
      return null;
    }},
  { key: 'water_percent', label: 'Eau',                chip: 'Eau',        unit: '%',    group: 'composition', color: '#06B6D4', emoji: '💧',
    getValue: (w, bc) => w?.water_percent ?? bc?.waterPercent ?? null },
  { key: 'bone_mass',     label: 'Os',                 chip: 'Os',         unit: 'kg',   group: 'composition', color: '#F59E0B', emoji: '🦴',
    getValue: (w, bc) => w?.bone_mass ?? bc?.boneMass ?? null },
  { key: 'visceral_fat',  label: 'Graisse viscérale',  chip: 'Viscérale',  unit: 'niv.', group: 'composition', color: '#F97316', emoji: '🟠',
    getValue: (w, bc) => w?.visceral_fat ?? bc?.visceralFat ?? null },
  { key: 'metabolic_age', label: 'Âge métabolique',    chip: 'Âge méta',   unit: 'ans',  group: 'composition', color: '#8B5CF6', emoji: '🧬',
    getValue: (w, bc) => w?.metabolic_age ?? bc?.metabolicAge ?? null },
  { key: 'bmr',           label: 'Métabolisme (BMR)',   chip: 'BMR',        unit: 'kcal', group: 'composition', color: '#EC4899', emoji: '🔥',
    getValue: (w, bc) => w?.bmr ?? bc?.bmr ?? null },
  // ── Mensurations ──
  { key: 'waist',       label: 'Tour de taille',    chip: 'Taille',    unit: 'cm', group: 'measurements', color: '#3B82F6', emoji: '📏',
    getValue: (_, __, m) => m?.waist ?? null },
  { key: 'navel',       label: 'Tour nombril',       chip: 'Nombril',   unit: 'cm', group: 'measurements', color: '#6366F1', emoji: '📏',
    getValue: (_, __, m) => m?.navel ?? null },
  { key: 'hips',        label: 'Tour de hanches',    chip: 'Hanches',   unit: 'cm', group: 'measurements', color: '#EC4899', emoji: '📏',
    getValue: (_, __, m) => m?.hips ?? null },
  { key: 'chest',       label: 'Tour de poitrine',   chip: 'Poitrine',  unit: 'cm', group: 'measurements', color: '#8B5CF6', emoji: '📏',
    getValue: (_, __, m) => m?.chest ?? null },
  { key: 'shoulders',   label: 'Épaules',             chip: 'Épaules',   unit: 'cm', group: 'measurements', color: '#F59E0B', emoji: '📏',
    getValue: (_, __, m) => m?.shoulders ?? null },
  { key: 'left_arm',    label: 'Bras gauche',         chip: 'Bras G',    unit: 'cm', group: 'measurements', color: '#10B981', emoji: '💪',
    getValue: (_, __, m) => m?.left_arm ?? null },
  { key: 'right_arm',   label: 'Bras droit',          chip: 'Bras D',    unit: 'cm', group: 'measurements', color: '#10B981', emoji: '💪',
    getValue: (_, __, m) => m?.right_arm ?? null },
  { key: 'left_thigh',  label: 'Cuisse gauche',       chip: 'Cuisse G',  unit: 'cm', group: 'measurements', color: '#F97316', emoji: '🦵',
    getValue: (_, __, m) => m?.left_thigh ?? null },
  { key: 'right_thigh', label: 'Cuisse droite',       chip: 'Cuisse D',  unit: 'cm', group: 'measurements', color: '#F97316', emoji: '🦵',
    getValue: (_, __, m) => m?.right_thigh ?? null },
  { key: 'left_calf',   label: 'Mollet gauche',       chip: 'Mollet G',  unit: 'cm', group: 'measurements', color: '#EF4444', emoji: '🦶',
    getValue: (_, __, m) => m?.left_calf ?? null },
  { key: 'right_calf',  label: 'Mollet droit',        chip: 'Mollet D',  unit: 'cm', group: 'measurements', color: '#EF4444', emoji: '🦶',
    getValue: (_, __, m) => m?.right_calf ?? null },
  { key: 'neck',        label: 'Tour de cou',          chip: 'Cou',       unit: 'cm', group: 'measurements', color: '#6B7280', emoji: '📏',
    getValue: (_, __, m) => m?.neck ?? null },
];

// ============================================
// ENTRÉE UNIFIÉE
// ============================================

interface UnifiedEntry {
  id: string;
  date: string;
  value: number;
  source?: string;
  tableType: 'weight' | 'bodycomp' | 'measurement';
  tableId: number | string;
  metricKey: string;
  rawWeight?: Weight;
  rawBodyComp?: BodyComposition;
  rawMeasurement?: Measurement;
}

// ============================================
// SOURCES
// ============================================

interface SourceCfg { label: string; color: string; bgColor: string; Icon: React.ComponentType<any> }
const SOURCE_MAP: Record<string, SourceCfg> = {
  SourceProxy: { label: 'Apple Santé', color: '#FF3B30', bgColor: '#FF3B3015', Icon: Smartphone },
  tanita:      { label: 'Tanita',       color: '#3B82F6', bgColor: '#3B82F615', Icon: Scale },
  visbody:     { label: 'Visbody',      color: '#8B5CF6', bgColor: '#8B5CF615', Icon: Scan },
  manual:      { label: 'Manuel',       color: '#10B981', bgColor: '#10B98115', Icon: User },
};
function src(s?: string): SourceCfg {
  return SOURCE_MAP[s ?? 'manual'] ?? { label: s ?? 'Manuel', color: '#6B7280', bgColor: '#6B728015', Icon: Database };
}
function SourceBadge({ source }: { source?: string }) {
  const c = src(source);
  return (
    <View style={[badge.wrap, { backgroundColor: c.bgColor, borderColor: c.color + '50' }]}>
      <c.Icon size={9} color={c.color} />
      <Text style={[badge.txt, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  txt: { fontSize: 10, fontWeight: '600' },
});

// ============================================
// HELPERS
// ============================================

function isoToFr(iso: string) { const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function frToIso(fr: string) {
  const x = fr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return x ? `${x[3]}-${x[2].padStart(2,'0')}-${x[1].padStart(2,'0')}` : fr;
}
function todayFr() { return isoToFr(new Date().toISOString().split('T')[0]); }

// ============================================
// MODAL ÉDITION / AJOUT
// ============================================

function EntryModal({ visible, metric, entry, onClose, onSave, isDark }: {
  visible: boolean;
  metric: MetricDef | null;
  entry: UnifiedEntry | null;
  onClose: () => void;
  onSave: (val: number, date: string, entry: UnifiedEntry | null) => Promise<void>;
  isDark: boolean;
}) {
  const [val, setVal] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [saving, setSaving] = useState(false);
  const card = isDark ? '#1C1C1E' : '#FFF';
  const text = isDark ? '#FFF' : '#111';
  const sub = isDark ? '#8E8E93' : '#6B7280';
  const border = isDark ? '#3C3C3E' : '#E5E7EB';
  const inputBg = isDark ? '#2C2C2E' : '#F9FAFB';

  useEffect(() => {
    if (visible) {
      setVal(entry ? String(entry.value) : '');
      setDateVal(entry ? isoToFr(entry.date) : todayFr());
    }
  }, [visible, entry]);

  const handleSave = async () => {
    const n = parseFloat(val.replace(',', '.'));
    if (isNaN(n)) return;
    const iso = frToIso(dateVal);
    if (!iso.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setSaving(true);
    try { await onSave(n, iso, entry); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
          <View style={mStyle.overlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[mStyle.card, { backgroundColor: card }]}>
                <View style={mStyle.hdr}>
                  <Text style={[mStyle.title, { color: text }]}>
                    {entry ? 'Modifier' : 'Ajouter'} · {metric?.label}
                  </Text>
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} hitSlop={{ top:16,bottom:16,left:16,right:16 }} style={{ padding: 4 }}>
                    <X size={22} color={sub} />
                  </TouchableOpacity>
                </View>
                {entry && <SourceBadge source={entry.source} />}
                <View style={[mStyle.field, { backgroundColor: inputBg, borderColor: border }]}>
                  <Text style={[mStyle.label, { color: sub }]}>{metric?.label?.toUpperCase()} ({metric?.unit})</Text>
                  <TextInput style={[mStyle.input, { color: text }]} value={val} onChangeText={setVal}
                    keyboardType="decimal-pad" placeholder="ex : 88.5" placeholderTextColor={sub} autoFocus returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                </View>
                <View style={[mStyle.field, { backgroundColor: inputBg, borderColor: border }]}>
                  <Text style={[mStyle.label, { color: sub }]}>DATE (JJ/MM/AAAA)</Text>
                  <TextInput style={[mStyle.input, { color: text }]} value={dateVal} onChangeText={setDateVal}
                    placeholder="ex : 18/04/2026" placeholderTextColor={sub} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                </View>
                <View style={mStyle.actions}>
                  <TouchableOpacity style={[mStyle.cancel, { borderColor: border }]} onPress={() => { Keyboard.dismiss(); onClose(); }}>
                    <Text style={[mStyle.cancelTxt, { color: sub }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[mStyle.save, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#FFF" /> :
                      <><Check size={14} color="#FFF" /><Text style={mStyle.saveTxt}>{entry ? 'Modifier' : 'Enregistrer'}</Text></>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const mStyle = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' },
  card: { borderTopLeftRadius:26, borderTopRightRadius:26, padding:22, paddingBottom:42, gap:12 },
  hdr: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 },
  title: { fontSize:18, fontWeight:'700' },
  field: { borderRadius:14, borderWidth:1, paddingHorizontal:14, paddingVertical:10, gap:4 },
  label: { fontSize:10, fontWeight:'700', letterSpacing:0.8 },
  input: { fontSize:17, fontWeight:'500', paddingVertical:2 },
  actions: { flexDirection:'row', gap:10, marginTop:6 },
  cancel: { flex:1, paddingVertical:15, borderRadius:14, borderWidth:1, alignItems:'center' },
  cancelTxt: { fontSize:15, fontWeight:'600' },
  save: { flex:2, paddingVertical:15, borderRadius:14, backgroundColor:'#3B82F6', flexDirection:'row', alignItems:'center', justifyContent:'center', gap:7 },
  saveTxt: { color:'#FFF', fontSize:15, fontWeight:'700' },
});

// ============================================
// SWIPEABLE ROW (glisse à gauche pour supprimer)
// ============================================

const SWIPE_THRESHOLD = 60;
const DELETE_BTN_WIDTH = 80;

function SwipeableRow({ children, onDelete, borderColor }: {
  children: React.ReactNode;
  onDelete: () => void;
  borderColor: string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const hapticFired = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        translateX.setOffset((translateX as any)._value);
        translateX.setValue(0);
        hapticFired.current = false;
      },
      onPanResponderMove: (_, g) => {
        const next = Math.max(-DELETE_BTN_WIDTH, Math.min(0, g.dx));
        translateX.setValue(next);
        if (!hapticFired.current && g.dx < -SWIPE_THRESHOLD) {
          impactAsync(ImpactFeedbackStyle.Light);
          hapticFired.current = true;
        }
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        if (g.dx < -SWIPE_THRESHOLD) {
          // Ouvrir
          Animated.spring(translateX, {
            toValue: -DELETE_BTN_WIDTH,
            useNativeDriver: true,
            tension: 60, friction: 10,
          }).start();
          isOpen.current = true;
        } else {
          // Fermer
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 60, friction: 10,
          }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0, useNativeDriver: true, tension: 60, friction: 10,
    }).start();
    isOpen.current = false;
  };

  return (
    <View style={{ overflow: 'hidden', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }}>
      {/* Bouton rouge révélé derrière */}
      <View style={swipe.backdrop}>
        <TouchableOpacity
          style={swipe.deleteBtn}
          onPress={() => { close(); setTimeout(onDelete, 100); }}>
          <Trash2 size={20} color="#FFF" />
          <Text style={swipe.deleteTxt}>Supprimer</Text>
        </TouchableOpacity>
      </View>
      {/* Contenu qui glisse */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const swipe = StyleSheet.create({
  backdrop: { position:'absolute', right:0, top:0, bottom:0, width:DELETE_BTN_WIDTH, backgroundColor:'#EF4444', justifyContent:'center', alignItems:'center' },
  deleteBtn: { flex:1, width:'100%', justifyContent:'center', alignItems:'center', gap:3 },
  deleteTxt: { color:'#FFF', fontSize:10, fontWeight:'700' },
});

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

export default function BodyHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const bg = isDark ? '#000' : '#F2F2F7';
  const card = isDark ? '#1C1C1E' : '#FFF';
  const text = isDark ? '#FFF' : '#111';
  const sub = isDark ? '#8E8E93' : '#6B7280';
  const border = isDark ? '#2C2C2E' : '#E5E7EB';
  const headerBg = isDark ? '#1C1C1E' : '#FFF';

  const [weights, setWeights] = useState<Weight[]>([]);
  const [bodyComps, setBodyComps] = useState<BodyComposition[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // Métrique initiale : param d'URL (ex: /body-history?metric=water_percent) sinon 'weight'.
  // Alias pour compatibilité avec les clés utilisées ailleurs dans l'app
  // (ex: DashboardPage envoie 'muscle_percent' alors que body-history utilise 'muscle').
  const params = useLocalSearchParams<{ metric?: string }>();
  const METRIC_ALIASES: Record<string, string> = {
    muscle_percent: 'muscle',
  };
  const requestedMetric = params.metric ? (METRIC_ALIASES[params.metric] || params.metric) : undefined;
  const initialMetric = requestedMetric && METRICS.some(m => m.key === requestedMetric)
    ? requestedMetric
    : 'weight';
  const [selectedMetric, setSelectedMetric] = useState<string>(initialMetric);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<UnifiedEntry | null>(null);

  // ── Chargement ──

  const loadData = useCallback(async () => {
    try {
      const [w, bc, m] = await Promise.all([
        getAllWeights(),
        getAllBodyCompositions(),
        getMeasurements(),
      ]);
      setWeights(w);
      setBodyComps(bc);
      setMeasurements(m);
    } catch (e) {
      logger.error('[BodyHistory] Erreur:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Nettoyage des doublons ──
  const handleCleanupDuplicates = useCallback(async () => {
    try {
      const count = await countWeightDuplicates();
      if (count === 0) {
        Alert.alert('Aucun doublon', 'Ton historique est déjà propre 👍');
        return;
      }
      Alert.alert(
        'Nettoyer les doublons ?',
        `${count} doublon${count > 1 ? 's' : ''} détecté${count > 1 ? 's' : ''}.\n\nJe vais fusionner les entrées qui ont la même date et la même source (csv, Apple Santé, manuel…) en gardant les valeurs les plus complètes.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Nettoyer',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                const { removed } = await deduplicateWeights();
                await loadData();
                notificationAsync(NotificationFeedbackType.Success).catch(() => {});
                Alert.alert('✅ Nettoyage terminé', `${removed} doublon${removed > 1 ? 's' : ''} supprimé${removed > 1 ? 's' : ''}.`);
              } catch (e) {
                logger.error('[BodyHistory] Erreur nettoyage:', e);
                Alert.alert('Erreur', 'Impossible de nettoyer les doublons.');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      logger.error('[BodyHistory] Erreur count:', e);
    }
  }, [loadData]);

  // ── Métrique sélectionnée ──

  const metric = useMemo(() => METRICS.find(m => m.key === selectedMetric)!, [selectedMetric]);

  // ── Construction des entrées unifiées ──

  const entries = useMemo((): UnifiedEntry[] => {
    const result: UnifiedEntry[] = [];

    if (metric.group === 'composition') {
      // Depuis weights
      for (const w of weights) {
        const val = metric.getValue(w, null, null);
        if (val !== null && val !== undefined) {
          result.push({
            id: `w_${w.id}_${metric.key}`,
            date: w.date,
            value: val,
            source: w.source,
            tableType: 'weight',
            tableId: w.id!,
            metricKey: metric.key,
            rawWeight: w,
          });
        }
      }
      // Depuis body compositions (pour éviter les doublons de même date)
      const weightDates = new Set(weights.map(w => w.date));
      for (const bc of bodyComps) {
        const dateKey = bc.date?.split('T')[0] ?? '';
        if (weightDates.has(dateKey)) continue; // déjà dans weights
        const val = metric.getValue(null, bc, null);
        if (val !== null && val !== undefined) {
          result.push({
            id: `bc_${bc.id}_${metric.key}`,
            date: dateKey,
            value: val,
            source: bc.source,
            tableType: 'bodycomp',
            tableId: bc.id,
            metricKey: metric.key,
            rawBodyComp: bc,
          });
        }
      }
    } else {
      // Depuis measurements
      for (const m of measurements) {
        const val = metric.getValue(null, null, m);
        if (val !== null && val !== undefined) {
          result.push({
            id: `m_${m.id}_${metric.key}`,
            date: m.date,
            value: val,
            source: 'manual',
            tableType: 'measurement',
            tableId: m.id!,
            metricKey: metric.key,
            rawMeasurement: m,
          });
        }
      }
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [weights, bodyComps, measurements, metric]);

  // ── Stats ──

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const vals = entries.map(e => e.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const first = entries[entries.length - 1];
    const last = entries[0];
    const change = last.value - first.value;
    return { min, max, change, count: entries.length, first, last };
  }, [entries]);

  // ── Suppression ──

  const handleDelete = useCallback((entry: UnifiedEntry) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    showPopup(
      'Supprimer cette entrée ?',
      `${isoToFr(entry.date)}  ·  ${entry.value} ${metric.unit}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              if (entry.tableType === 'weight') {
                if (metric.key === 'weight') {
                  await deleteWeight(entry.tableId as number);
                } else {
                  // Mettre à null le champ, pas supprimer la ligne
                  await updateWeight(entry.tableId as number, { [metric.key]: null } as any);
                }
              } else if (entry.tableType === 'bodycomp') {
                await deleteBodyComposition(entry.tableId as string);
              } else if (entry.tableType === 'measurement') {
                const fieldMap: Record<string, keyof Measurement> = {
                  waist: 'waist', navel: 'navel', hips: 'hips', chest: 'chest',
                  shoulders: 'shoulders', left_arm: 'left_arm', right_arm: 'right_arm',
                  left_thigh: 'left_thigh', right_thigh: 'right_thigh',
                  left_calf: 'left_calf', right_calf: 'right_calf', neck: 'neck',
                };
                const field = fieldMap[metric.key];
                if (field) {
                  await updateMeasurementRecord(entry.tableId as number, { [field]: null } as any);
                }
              }
              notificationAsync(NotificationFeedbackType.Success);
              loadData();
            } catch (e) {
              logger.error('[BodyHistory] Erreur suppression:', e);
            }
          },
        },
      ]
    );
  }, [metric, showPopup, loadData]);

  // ── Sauvegarde ──

  const handleSave = useCallback(async (val: number, date: string, entry: UnifiedEntry | null) => {
    if (entry) {
      // Modification
      if (entry.tableType === 'weight') {
        const fieldMap: Record<string, keyof Weight> = {
          weight: 'weight', fat_percent: 'fat_percent', muscle: 'muscle_percent',
          water_percent: 'water_percent', bone_mass: 'bone_mass', visceral_fat: 'visceral_fat',
          metabolic_age: 'metabolic_age', bmr: 'bmr',
        };
        await updateWeight(entry.tableId as number, { [fieldMap[metric.key] ?? metric.key]: val, date });
      } else if (entry.tableType === 'bodycomp') {
        const bcFieldMap: Record<string, string> = {
          fat_percent: 'bodyFatPercent', muscle: 'muscleMass', water_percent: 'waterPercent',
          bone_mass: 'boneMass', visceral_fat: 'visceralFat', metabolic_age: 'metabolicAge',
          bmr: 'bmr', weight: 'weight',
        };
        await updateBodyComposition(entry.tableId as string, { [bcFieldMap[metric.key] ?? metric.key]: val });
      } else if (entry.tableType === 'measurement') {
        const fMap: Record<string, keyof Measurement> = {
          waist: 'waist', navel: 'navel', hips: 'hips', chest: 'chest',
          shoulders: 'shoulders', left_arm: 'left_arm', right_arm: 'right_arm',
          left_thigh: 'left_thigh', right_thigh: 'right_thigh',
          left_calf: 'left_calf', right_calf: 'right_calf', neck: 'neck',
        };
        const f = fMap[metric.key];
        if (f) await updateMeasurementRecord(entry.tableId as number, { [f]: val, date });
      }
    } else {
      // Ajout
      if (metric.group === 'composition') {
        if (metric.key === 'weight') {
          await addWeight({ weight: val, date, source: 'manual' });
        } else {
          const wFieldMap: Record<string, keyof Weight> = {
            fat_percent: 'fat_percent', muscle: 'muscle_percent', water_percent: 'water_percent',
            bone_mass: 'bone_mass', visceral_fat: 'visceral_fat', metabolic_age: 'metabolic_age', bmr: 'bmr',
          };
          await addWeight({ weight: 0, date, source: 'manual', [wFieldMap[metric.key] ?? metric.key]: val });
        }
      } else {
        const fMap: Record<string, keyof Measurement> = {
          waist: 'waist', navel: 'navel', hips: 'hips', chest: 'chest',
          shoulders: 'shoulders', left_arm: 'left_arm', right_arm: 'right_arm',
          left_thigh: 'left_thigh', right_thigh: 'right_thigh',
          left_calf: 'left_calf', right_calf: 'right_calf', neck: 'neck',
        };
        const f = fMap[metric.key];
        if (f) await addMeasurementRecord({ date, [f]: val });
      }
    }
    notificationAsync(NotificationFeedbackType.Success);
    loadData();
  }, [metric, loadData]);

  // ── Rendu ligne ──

  const renderItem = useCallback(({ item, index }: { item: UnifiedEntry; index: number }) => {
    const prev = entries[index + 1] ?? null;
    const diff = prev ? item.value - prev.value : null;
    const diffAbs = diff !== null ? Math.abs(diff) : null;
    const diffColor = diff === null ? sub
      : diff < -0.05 ? '#10B981'
      : diff > 0.05 ? '#EF4444'
      : sub;
    const DiffIcon = diff === null ? null : diff < -0.05 ? TrendingDown : diff > 0.05 ? TrendingUp : Minus;
    const cfg = src(item.source);

    return (
      <SwipeableRow onDelete={() => handleDelete(item)} borderColor={border}>
        <View style={[row.wrap, { backgroundColor: card }]}>
          {/* Icône source */}
          <View style={[row.iconWrap, { backgroundColor: cfg.bgColor }]}>
            <cfg.Icon size={16} color={cfg.color} />
          </View>

          {/* Date + badge */}
          <View style={row.info}>
            <Text style={[row.date, { color: text }]}>{isoToFr(item.date)}</Text>
            <SourceBadge source={item.source} />
          </View>

          {/* Valeur + évolution */}
          <View style={row.valBlock}>
            <Text style={[row.val, { color: metric.color }]}>
              {item.value}
              <Text style={[row.unit, { color: sub }]}> {metric.unit}</Text>
            </Text>
            {DiffIcon && diffAbs !== null && (
              <View style={row.diffWrap}>
                <DiffIcon size={11} color={diffColor} />
                <Text style={[row.diff, { color: diffColor }]}>
                  {diffAbs < 0.05 ? '=' : `${diffAbs.toFixed(1)} ${metric.unit}`}
                </Text>
              </View>
            )}
          </View>

          {/* Bouton édition */}
          <TouchableOpacity style={[row.btn, { backgroundColor: '#3B82F612' }]}
            onPress={() => { setEditEntry(item); setShowModal(true); }}>
            <Pencil size={13} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </SwipeableRow>
    );
  }, [entries, card, border, text, sub, metric, handleDelete]);

  const StatChip = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={[stat.chip, { backgroundColor: card, borderColor: border }]}>
      <Text style={[stat.val, { color: color ?? text }]}>{value}</Text>
      <Text style={[stat.lbl, { color: sub }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: bg }]}>
      {/* ── HEADER ── */}
      <View style={[s.header, { backgroundColor: headerBg, paddingTop: insets.top + 8, borderBottomColor: border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={text} />
        </TouchableOpacity>
        <View style={s.hdrCenter}>
          <Text style={[s.hdrTitle, { color: text }]}>Historique corporel</Text>
          <Text style={[s.hdrSub, { color: sub }]}>
            {metric.emoji} {metric.label} · {entries.length} entrée{entries.length > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.cleanupBtn, { backgroundColor: headerBg, borderColor: border }]}
          onPress={handleCleanupDuplicates}
          accessibilityLabel="Nettoyer les doublons"
        >
          <Sparkles size={16} color={metric.color} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: metric.color }]}
          onPress={() => { setEditEntry(null); setShowModal(true); }}>
          <Plus size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── SÉLECTEUR DE MÉTRIQUE ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.metricBar} contentContainerStyle={s.metricBarContent}>
        {/* Groupe composition */}
        {METRICS.filter(m => m.group === 'composition').map(m => {
          const active = selectedMetric === m.key;
          return (
            <TouchableOpacity key={m.key}
              style={[s.metricChip, active && { backgroundColor: m.color }, !active && { borderColor: m.color + '60', borderWidth: 1 }]}
              onPress={() => setSelectedMetric(m.key)}>
              <Text style={[s.metricChipTxt, { color: active ? '#FFF' : m.color }]} numberOfLines={1}>
                {m.emoji} {m.chip}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* Séparateur */}
        <View style={[s.metricSep, { backgroundColor: border }]} />
        {/* Groupe mensurations */}
        {METRICS.filter(m => m.group === 'measurements').map(m => {
          const active = selectedMetric === m.key;
          return (
            <TouchableOpacity key={m.key}
              style={[s.metricChip, active && { backgroundColor: m.color }, !active && { borderColor: m.color + '60', borderWidth: 1 }]}
              onPress={() => setSelectedMetric(m.key)}>
              <Text style={[s.metricChipTxt, { color: active ? '#FFF' : m.color }]} numberOfLines={1}>
                {m.emoji} {m.chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={metric.color} /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={10}
          ListHeaderComponent={
            <View>
              {/* Stats */}
              {stats ? (
                <View style={s.statsRow}>
                  <StatChip label="Total" value={String(stats.count)} />
                  <StatChip label="Min" value={`${stats.min} ${metric.unit}`} color="#3B82F6" />
                  <StatChip label="Max" value={`${stats.max} ${metric.unit}`} color="#F59E0B" />
                  <StatChip
                    label="Évolution"
                    value={stats.change === 0 ? '=' : `${stats.change > 0 ? '+' : ''}${stats.change.toFixed(1)}`}
                    color={stats.change < 0 ? '#10B981' : stats.change > 0 ? '#EF4444' : sub}
                  />
                </View>
              ) : null}
              {/* En-tête liste */}
              <View style={[s.listHdr, { borderBottomColor: border }]}>
                <Text style={[s.listHdrTxt, { color: sub }]}>
                  {entries.length > 0
                    ? `${entries.length} entrée${entries.length > 1 ? 's' : ''} · du plus récent au plus ancien`
                    : `Aucune donnée pour "${metric.label}"`}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>{metric.emoji}</Text>
              <Text style={[s.emptyTxt, { color: sub }]}>Aucune donnée enregistrée</Text>
              <TouchableOpacity style={[s.emptyAdd, { backgroundColor: metric.color }]}
                onPress={() => { setEditEntry(null); setShowModal(true); }}>
                <Plus size={16} color="#FFF" />
                <Text style={s.emptyAddTxt}>Ajouter la première mesure</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* MODAL */}
      <EntryModal
        visible={showModal}
        metric={metric}
        entry={editEntry}
        onClose={() => { setShowModal(false); setEditEntry(null); }}
        onSave={handleSave}
        isDark={isDark}
      />

      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const row = StyleSheet.create({
  wrap: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:13, gap:10 },
  iconWrap: { width:34, height:34, borderRadius:10, justifyContent:'center', alignItems:'center', flexShrink:0 },
  info: { flex:1, gap:4 },
  date: { fontSize:14, fontWeight:'600' },
  valBlock: { alignItems:'flex-end', gap:3, minWidth:80 },
  val: { fontSize:19, fontWeight:'800' },
  unit: { fontSize:13, fontWeight:'400' },
  diffWrap: { flexDirection:'row', alignItems:'center', gap:2 },
  diff: { fontSize:11, fontWeight:'600' },
  btn: { width:30, height:30, borderRadius:8, justifyContent:'center', alignItems:'center', flexShrink:0 },
});
const stat = StyleSheet.create({
  chip: { flex:1, alignItems:'center', paddingVertical:10, borderRadius:12, borderWidth:1 },
  val: { fontSize:14, fontWeight:'800' },
  lbl: { fontSize:10, fontWeight:'500', marginTop:1 },
});
const s = StyleSheet.create({
  container: { flex:1 },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingBottom:12, borderBottomWidth:StyleSheet.hairlineWidth },
  backBtn: { width:36, height:36, justifyContent:'center', alignItems:'center' },
  hdrCenter: { flex:1, alignItems:'center' },
  hdrTitle: { fontSize:17, fontWeight:'700', letterSpacing:-0.3 },
  hdrSub: { fontSize:12, marginTop:1 },
  addBtn: { width:36, height:36, borderRadius:18, justifyContent:'center', alignItems:'center' },
  cleanupBtn: { width:36, height:36, borderRadius:18, borderWidth:1, justifyContent:'center', alignItems:'center', marginRight:6 },
  metricBar: { flexGrow:0 },
  metricBarContent: { paddingHorizontal:12, paddingVertical:10, gap:8, alignItems:'center' },
  metricChip: { paddingHorizontal:14, paddingVertical:8, borderRadius:20, minHeight: 34, justifyContent: 'center' },
  metricChipTxt: { fontSize:13, fontWeight:'700', includeFontPadding: false },
  metricSep: { width:1, height:24, marginHorizontal:4 },
  loader: { flex:1, justifyContent:'center', alignItems:'center' },
  statsRow: { flexDirection:'row', gap:8, paddingHorizontal:12, paddingVertical:12 },
  listHdr: { paddingHorizontal:16, paddingVertical:10, borderBottomWidth:StyleSheet.hairlineWidth },
  listHdrTxt: { fontSize:11, fontStyle:'italic' },
  empty: { alignItems:'center', paddingTop:80, gap:14 },
  emptyTxt: { fontSize:16 },
  emptyAdd: { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:20, paddingVertical:12, borderRadius:14, marginTop:8 },
  emptyAddTxt: { color:'#FFF', fontSize:14, fontWeight:'700' },
});
