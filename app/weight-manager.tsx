// ============================================
// HISTORIQUE DES PESÉES
// Voir, ajouter, modifier, supprimer
// Avec source de chaque entrée
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Trash2,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Smartphone,
  Scale,
  Scan,
  User,
  Database,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { getAllWeights, deleteWeight, updateWeight, deleteWeightsBySource, addWeight, Weight } from '@/lib/database';
import { useCustomPopup } from '@/components/CustomPopup';
import logger from '@/lib/security/logger';
import { SkeletonCard, SkeletonMessage } from '@/components/stats/SkeletonCard';
import { usePremium } from '@/context/PremiumContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';

// ============================================
// SOURCES
// ============================================

interface SourceConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  SourceProxy: { label: 'Apple Santé', color: '#FF3B30', bgColor: '#FF3B3018', icon: Smartphone },
  tanita:      { label: 'Tanita',       color: '#3B82F6', bgColor: '#3B82F618', icon: Scale },
  visbody:     { label: 'Visbody',      color: '#8B5CF6', bgColor: '#8B5CF618', icon: Scan },
  manual:      { label: 'Manuel',       color: '#10B981', bgColor: '#10B98118', icon: User },
};

function getSourceConfig(source?: string): SourceConfig {
  if (!source) return SOURCE_CONFIGS.manual;
  return SOURCE_CONFIGS[source] ?? { label: source, color: '#6B7280', bgColor: '#6B728018', icon: Database };
}

// ============================================
// HELPERS
// ============================================

function isoToFr(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function frToIso(fr: string): string {
  const match = fr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return fr;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function todayFr(): string {
  return isoToFr(todayIso());
}

// ============================================
// BADGE SOURCE
// ============================================

function SourceBadge({ source }: { source?: string }) {
  const config = getSourceConfig(source);
  const IconComp = config.icon;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: config.bgColor, borderColor: config.color + '50' }]}>
      <IconComp size={10} color={config.color} />
      <Text style={[badgeStyles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start',
  },
  text: { fontSize: 10, fontWeight: '600' },
});

// ============================================
// MODAL AJOUT / ÉDITION
// ============================================

interface EntryModalProps {
  visible: boolean;
  entry: Weight | null; // null = ajout, sinon édition
  onClose: () => void;
  onSave: (data: Partial<Weight>, id?: number) => Promise<void>;
  isDark: boolean;
}

function EntryModal({ visible, entry, onClose, onSave, isDark }: EntryModalProps) {
  const [weightVal, setWeightVal] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [noteVal, setNoteVal] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!entry;

  useEffect(() => {
    if (visible) {
      if (entry) {
        setWeightVal(entry.weight?.toString() ?? '');
        setDateVal(isoToFr(entry.date));
        setNoteVal(entry.note ?? '');
      } else {
        setWeightVal('');
        setDateVal(todayFr());
        setNoteVal('');
      }
    }
  }, [visible, entry]);

  const handleSave = async () => {
    const w = parseFloat(weightVal.replace(',', '.'));
    if (isNaN(w) || w < 20 || w > 300) {
      return; // silently ignore invalid weight
    }
    const isoDate = frToIso(dateVal);
    if (!isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setSaving(true);
    try {
      await onSave({ weight: w, date: isoDate, note: noteVal.trim() || undefined, source: 'manual' }, entry?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const card = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subColor = isDark ? '#8E8E93' : '#6B7280';
  const borderColor = isDark ? '#3C3C3E' : '#E5E7EB';
  const inputBg = isDark ? '#2C2C2E' : '#F9FAFB';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.card, { backgroundColor: card }]}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: textColor }]}>
              {isEdit ? 'Modifier la pesée' : 'Nouvelle pesée'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={subColor} />
            </TouchableOpacity>
          </View>

          {isEdit && entry && (
            <View style={{ marginBottom: 12 }}>
              <SourceBadge source={entry.source} />
            </View>
          )}

          {/* Poids */}
          <View style={[modalStyles.field, { backgroundColor: inputBg, borderColor }]}>
            <Text style={[modalStyles.fieldLabel, { color: subColor }]}>POIDS (kg)</Text>
            <TextInput
              style={[modalStyles.fieldInput, { color: textColor }]}
              value={weightVal}
              onChangeText={setWeightVal}
              keyboardType="decimal-pad"
              placeholder="ex : 88.5"
              placeholderTextColor={subColor}
              autoFocus
            />
          </View>

          {/* Date */}
          <View style={[modalStyles.field, { backgroundColor: inputBg, borderColor }]}>
            <Text style={[modalStyles.fieldLabel, { color: subColor }]}>DATE (JJ/MM/AAAA)</Text>
            <TextInput
              style={[modalStyles.fieldInput, { color: textColor }]}
              value={dateVal}
              onChangeText={setDateVal}
              placeholder="ex : 18/04/2026"
              placeholderTextColor={subColor}
            />
          </View>

          {/* Note */}
          <View style={[modalStyles.field, { backgroundColor: inputBg, borderColor }]}>
            <Text style={[modalStyles.fieldLabel, { color: subColor }]}>NOTE (optionnel)</Text>
            <TextInput
              style={[modalStyles.fieldInput, { color: textColor }]}
              value={noteVal}
              onChangeText={setNoteVal}
              placeholder="ex : matin à jeun"
              placeholderTextColor={subColor}
            />
          </View>

          {/* Actions */}
          <View style={modalStyles.actions}>
            <TouchableOpacity style={[modalStyles.cancelBtn, { borderColor }]} onPress={onClose}>
              <Text style={[modalStyles.cancelText, { color: subColor }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <><Check size={15} color="#FFF" /><Text style={modalStyles.saveText}>{isEdit ? 'Modifier' : 'Enregistrer'}</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 40, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  field: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  fieldInput: { fontSize: 17, fontWeight: '500', paddingVertical: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 15, borderRadius: 14, backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

// ============================================
// COMPOSANT LIGNE PESÉE
// ============================================

interface WeightRowProps {
  item: Weight;
  prev: Weight | null;
  textColor: string;
  subColor: string;
  card: string;
  borderColor: string;
  onEdit: (w: Weight) => void;
  onDelete: (w: Weight) => void;
}

function WeightRow({ item, prev, textColor, subColor, card, borderColor, onEdit, onDelete }: WeightRowProps) {
  const config = getSourceConfig(item.source);
  const IconComp = config.icon;

  const diff = prev ? item.weight - prev.weight : null;
  const diffAbs = diff !== null ? Math.abs(diff) : null;
  const diffColor = diff === null ? subColor : diff < -0.05 ? '#10B981' : diff > 0.05 ? '#EF4444' : subColor;
  const DiffIcon = diff === null ? null : diff < -0.05 ? TrendingDown : diff > 0.05 ? TrendingUp : Minus;

  return (
    <View style={[rowStyles.row, { backgroundColor: card, borderBottomColor: borderColor }]}>
      {/* Icône source */}
      <View style={[rowStyles.iconWrap, { backgroundColor: config.bgColor }]}>
        <IconComp size={17} color={config.color} />
      </View>

      {/* Infos */}
      <View style={rowStyles.info}>
        <Text style={[rowStyles.date, { color: textColor }]}>{isoToFr(item.date)}</Text>
        <SourceBadge source={item.source} />
        {item.note ? (
          <Text style={[rowStyles.note, { color: subColor }]} numberOfLines={1}>{item.note}</Text>
        ) : null}
      </View>

      {/* Poids + évolution */}
      <View style={rowStyles.valueBlock}>
        <Text style={[rowStyles.weight, { color: textColor }]}>
          {item.weight} <Text style={[rowStyles.unit, { color: subColor }]}>kg</Text>
        </Text>
        {DiffIcon && diffAbs !== undefined && diffAbs !== null && (
          <View style={rowStyles.diffRow}>
            <DiffIcon size={11} color={diffColor} />
            <Text style={[rowStyles.diff, { color: diffColor }]}>
              {diffAbs < 0.05 ? '=' : `${diffAbs.toFixed(1)} kg`}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={rowStyles.actions}>
        <TouchableOpacity style={[rowStyles.btn, { backgroundColor: '#3B82F612' }]} onPress={() => onEdit(item)}>
          <Pencil size={13} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity style={[rowStyles.btn, { backgroundColor: '#EF444412' }]} onPress={() => onDelete(item)}>
          <Trash2 size={13} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  info: { flex: 1, gap: 4 },
  date: { fontSize: 14, fontWeight: '600' },
  note: { fontSize: 11, marginTop: 1 },
  valueBlock: { alignItems: 'flex-end', gap: 3, minWidth: 68 },
  weight: { fontSize: 19, fontWeight: '800' },
  unit: { fontSize: 13, fontWeight: '400' },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  diff: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  btn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

export default function WeightManagerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isPremium } = usePremium();

  const [weights, setWeights] = useState<Weight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [modalEntry, setModalEntry] = useState<Weight | null | 'new'>('new' as any);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<Weight | null>(null);

  const bg = isDark ? '#000000' : '#F2F2F7';
  const card = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subColor = isDark ? '#8E8E93' : '#6B7280';
  const borderColor = isDark ? '#2C2C2E' : '#E5E7EB';
  const headerBg = isDark ? '#1C1C1E' : '#FFFFFF';

  // ── Chargement ──

  const loadData = useCallback(async () => {
    try {
      const all = await getAllWeights();
      setWeights(all);
    } catch (err) {
      logger.error('[WeightHistory] Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Sources dispo ──

  const availableSources = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of weights) counts[w.source ?? 'manual'] = (counts[w.source ?? 'manual'] ?? 0) + 1;
    return counts;
  }, [weights]);

  // ── Données filtrées ──

  const filtered = useMemo(() =>
    filter === 'all' ? weights : weights.filter(w => (w.source ?? 'manual') === filter),
    [weights, filter]
  );

  // ── Stats ──

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const vals = filtered.map(w => w.weight);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const first = filtered[filtered.length - 1];
    const last = filtered[0];
    const change = last.weight - first.weight;
    return { min, max, first, last, change, count: filtered.length };
  }, [filtered]);

  // ── Suppression ──

  const handleDelete = useCallback((entry: Weight) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const config = getSourceConfig(entry.source);
    showPopup(
      'Supprimer cette pesée ?',
      `${isoToFr(entry.date)}  ·  ${entry.weight} kg\nSource : ${config.label}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            if (!entry.id) return;
            await deleteWeight(entry.id);
            notificationAsync(NotificationFeedbackType.Success);
            loadData();
          },
        },
      ]
    );
  }, [showPopup, loadData]);

  // ── Suppression par source ──

  const handleDeleteSource = useCallback((source: string) => {
    const config = getSourceConfig(source);
    const count = availableSources[source] ?? 0;
    impactAsync(ImpactFeedbackStyle.Heavy);
    showPopup(
      `Supprimer toutes les pesées ${config.label} ?`,
      `${count} pesée${count > 1 ? 's' : ''} seront supprimées définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: `Supprimer ${count}`, style: 'destructive',
          onPress: async () => {
            await deleteWeightsBySource(source);
            notificationAsync(NotificationFeedbackType.Success);
            setFilter('all');
            loadData();
          },
        },
      ]
    );
  }, [availableSources, showPopup, loadData]);

  // ── Sauvegarde (ajout ou édition) ──

  const handleSave = useCallback(async (data: Partial<Weight>, id?: number) => {
    if (id) {
      await updateWeight(id, data);
    } else {
      await addWeight({ weight: data.weight!, date: data.date!, note: data.note, source: 'manual' });
    }
    notificationAsync(NotificationFeedbackType.Success);
    loadData();
  }, [loadData]);

  // ── Rendu ligne ──

  const renderItem = useCallback(({ item, index }: { item: Weight; index: number }) => (
    <WeightRow
      item={item}
      prev={filtered[index + 1] ?? null}
      textColor={textColor}
      subColor={subColor}
      card={card}
      borderColor={borderColor}
      onEdit={(w) => { setEditEntry(w); setShowModal(true); }}
      onDelete={handleDelete}
    />
  ), [filtered, textColor, subColor, card, borderColor, handleDelete]);

  // ── Stat mini card ──

  const StatChip = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={[statStyles.chip, { backgroundColor: card, borderColor }]}>
      <Text style={[statStyles.chipVal, { color: color ?? textColor }]}>{value}</Text>
      <Text style={[statStyles.chipLabel, { color: subColor }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: headerBg, paddingTop: insets.top + 8, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Historique du poids</Text>
          <Text style={[styles.headerSub, { color: subColor }]}>
            {weights.length} pesée{weights.length > 1 ? 's' : ''} enregistrée{weights.length > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#3B82F6' }]}
          onPress={() => { setEditEntry(null); setShowModal(true); }}
        >
          <Plus size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, padding: 16 }}>
          <SkeletonCard height={56} width="100%" marginBottom={12} />
          <SkeletonCard height={64} width="100%" marginBottom={8} />
          <SkeletonCard height={64} width="100%" marginBottom={8} />
          <SkeletonCard height={64} width="100%" marginBottom={8} />
          <SkeletonCard height={64} width="100%" marginBottom={8} />
          <SkeletonCard height={64} width="100%" marginBottom={8} />
          <SkeletonMessage />
        </View>
      ) : (
        <FlatList
          data={isPremium ? filtered : filtered.slice(0, 2)}
          keyExtractor={(item) => String(item.id ?? item.date)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={10}
          ListHeaderComponent={
            <View>
              {/* Explication source */}
              <View style={[styles.sourceNote, { backgroundColor: isDark ? '#1C2A3A' : '#EFF6FF' }]}>
                <Smartphone size={13} color="#3B82F6" />
                <Text style={[styles.sourceNoteText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                  <Text style={{ fontWeight: '700' }}>"Apple Santé"</Text> = pesées venant d'une balance connectée ou d'une autre app synchronisée (Withings, Garmin, Nokia…)
                </Text>
              </View>

              {/* Stats */}
              {stats && (
                <View style={styles.statsRow}>
                  <StatChip label="Total" value={String(stats.count)} />
                  <StatChip label="Min" value={`${stats.min} kg`} color="#3B82F6" />
                  <StatChip label="Max" value={`${stats.max} kg`} color="#F59E0B" />
                  <StatChip
                    label="Évolution"
                    value={stats.change === 0 ? '=' : `${stats.change > 0 ? '+' : ''}${stats.change.toFixed(1)} kg`}
                    color={stats.change < 0 ? '#10B981' : stats.change > 0 ? '#EF4444' : subColor}
                  />
                </View>
              )}

              {/* Filtres */}
              <View style={styles.filtersWrap}>
                <TouchableOpacity
                  style={[styles.filterChip, filter === 'all' && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }, filter !== 'all' && { borderColor }]}
                  onPress={() => setFilter('all')}
                >
                  <Text style={[styles.filterText, { color: filter === 'all' ? '#FFF' : subColor }]}>
                    Toutes ({weights.length})
                  </Text>
                </TouchableOpacity>
                {Object.entries(availableSources).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
                  const cfg = getSourceConfig(src);
                  const active = filter === src;
                  return (
                    <TouchableOpacity
                      key={src}
                      style={[styles.filterChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }, !active && { borderColor: cfg.color + '60' }]}
                      onPress={() => setFilter(active ? 'all' : src)}
                    >
                      <Text style={[styles.filterText, { color: active ? '#FFF' : cfg.color }]}>
                        {cfg.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bouton suppression par source */}
              {filter !== 'all' && (
                <TouchableOpacity style={styles.deleteSrcBtn} onPress={() => handleDeleteSource(filter)}>
                  <AlertTriangle size={13} color="#EF4444" />
                  <Text style={styles.deleteSrcText}>
                    Tout supprimer · {getSourceConfig(filter).label} ({availableSources[filter] ?? 0})
                  </Text>
                </TouchableOpacity>
              )}

              {/* En-tête liste */}
              <View style={[styles.listHeader, { borderBottomColor: borderColor }]}>
                <Text style={[styles.listHeaderText, { color: subColor }]}>
                  {filtered.length} résultat{filtered.length > 1 ? 's' : ''}{filter !== 'all' ? ` · ${getSourceConfig(filter).label}` : ''} · du plus récent au plus ancien
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Scale size={48} color={subColor} />
              <Text style={[styles.emptyText, { color: subColor }]}>Aucune pesée</Text>
            </View>
          }
          ListFooterComponent={
            !isPremium && filtered.length > 2 ? (
              <View style={{ position: 'relative' }}>
                {filtered.slice(2, 6).map((item, index) => (
                  <View key={String(item.id ?? item.date) + '_locked'} style={{ opacity: 0.4, position: 'relative' }}>
                    <WeightRow
                      item={item}
                      prev={filtered[2 + index + 1] ?? null}
                      textColor={textColor}
                      subColor={subColor}
                      card={card}
                      borderColor={borderColor}
                      onEdit={() => router.push('/paywall' as never)}
                      onDelete={() => router.push('/paywall' as never)}
                    />
                    <View style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}>
                      <Lock size={13} color="#9CA3AF" strokeWidth={2} />
                    </View>
                  </View>
                ))}
                <LinearGradient
                  colors={['transparent', bg]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  style={[styles.lockCta, { backgroundColor: '#3B82F6' }]}
                  onPress={() => router.push('/paywall' as never)}
                  activeOpacity={0.85}
                >
                  <Lock size={14} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.lockCtaText}>Voir tout l'historique</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* MODAL AJOUT / ÉDITION */}
      <EntryModal
        visible={showModal}
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

const statStyles = StyleSheet.create({
  chip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  chipVal: { fontSize: 15, fontWeight: '800' },
  chipLabel: { fontSize: 10, fontWeight: '500', marginTop: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sourceNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    margin: 12, padding: 12, borderRadius: 12,
  },
  sourceNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  filtersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  deleteSrcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 12, marginBottom: 8, padding: 10,
    borderRadius: 10, backgroundColor: '#EF444412',
    borderWidth: 1, borderColor: '#EF444430',
  },
  deleteSrcText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  listHeader: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  listHeaderText: { fontSize: 11, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  lockCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 12, paddingVertical: 14,
    borderRadius: 14,
  },
  lockCtaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
