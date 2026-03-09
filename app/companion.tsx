// ============================================
// COMPANION - Gestionnaire de données corps
// Tableau + Graphiques + Import/Export CSV
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Download,
  Upload,
  Plus,
  Trash2,
  BarChart2,
  Table,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { getAllWeights, getMeasurements, deleteWeight, deleteMeasurementRecord, addWeight, addMeasurementRecord, Weight, Measurement } from '@/lib/database';
import { getAllBodyCompositions, deleteBodyComposition, BodyComposition } from '@/lib/bodyComposition';
import { shareExportCSV } from '@/lib/csvTemplates';
import { useCustomPopup } from '@/components/CustomPopup';
import logger from '@/lib/security/logger';
import { LineChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface MergedRow {
  date: string;
  weight?: Weight;
  measurement?: Measurement;
  composition?: BodyComposition;
}

// ============================================
// HELPERS
// ============================================

function getVal(row: MergedRow, key: string): string {
  const w = row.weight;
  const m = row.measurement;
  const c = row.composition;

  switch (key) {
    case 'weight':   return fmt(w?.weight ?? c?.weight);
    case 'fat':      return fmt(w?.fat_percent ?? c?.bodyFatPercent);
    case 'muscle':   return fmt(w?.muscle_percent ?? c?.muscleMass);
    case 'water':    return fmt(w?.water_percent ?? c?.waterPercent);
    case 'chest':    return fmt(m?.chest);
    case 'waist':    return fmt(m?.waist);
    case 'hips':     return fmt(m?.hips);
    case 'left_arm': return fmt(m?.left_arm);
    case 'right_arm':return fmt(m?.right_arm);
    default:         return '';
  }
}

function fmt(v?: number | null): string {
  if (v === undefined || v === null) return '—';
  return String(v);
}

function displayDate(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00');
    return format(d, 'dd MMM yy', { locale: fr });
  } catch {
    return iso;
  }
}

function isoToFr(iso: string): string {
  const d = iso.split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}

// ============================================
// COLONNES DU TABLEAU
// ============================================

const COLUMNS = [
  { key: 'weight',    label: 'Poids',      unit: 'kg',  width: 72 },
  { key: 'fat',       label: 'MG',         unit: '%',   width: 64 },
  { key: 'muscle',    label: 'MM',         unit: '%',   width: 64 },
  { key: 'water',     label: 'Eau',        unit: '%',   width: 60 },
  { key: 'chest',     label: 'Poitrine',   unit: 'cm',  width: 80 },
  { key: 'waist',     label: 'Taille',     unit: 'cm',  width: 72 },
  { key: 'hips',      label: 'Hanches',    unit: 'cm',  width: 80 },
  { key: 'left_arm',  label: 'Bras G',     unit: 'cm',  width: 72 },
  { key: 'right_arm', label: 'Bras D',     unit: 'cm',  width: 72 },
];

const DATE_COL_WIDTH = 88;

// ============================================
// ADD ROW MODAL
// ============================================

interface AddModalProps {
  visible: boolean;
  colors: any;
  onClose: () => void;
  onSave: (date: string, fields: Record<string, string>) => void;
}

function AddModal({ visible, colors, onClose, onSave }: AddModalProps) {
  const today = new Date().toLocaleDateString('fr-FR');
  const [date, setDate] = useState(today);
  const fields = COLUMNS.map(c => c.key);
  const [vals, setVals] = useState<Record<string, string>>({});

  const handleSave = () => {
    onSave(date, vals);
    setVals({});
    setDate(today);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nouvelle entrée</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Date (JJ/MM/AAAA)</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={date}
              onChangeText={setDate}
              placeholder="01/01/2026"
              placeholderTextColor={colors.textMuted}
            />

            {COLUMNS.map(col => (
              <View key={col.key}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {col.label} ({col.unit})
                </Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={vals[col.key] || ''}
                  onChangeText={v => setVals(prev => ({ ...prev, [col.key]: v }))}
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.accent }]}
              onPress={handleSave}
            >
              <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

type TabType = 'table' | 'charts';

export default function CompanionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [rows, setRows] = useState<MergedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('table');
  const [exporting, setExporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // ----------------------------------------
  // Chargement des données
  // ----------------------------------------

  const loadData = useCallback(async () => {
    try {
      const [weights, measurements, compositions] = await Promise.all([
        getAllWeights(),
        getMeasurements(),
        getAllBodyCompositions(),
      ]);

      const byDate: Record<string, MergedRow> = {};

      for (const w of weights) {
        if (!byDate[w.date]) byDate[w.date] = { date: w.date };
        byDate[w.date].weight = w;
      }
      for (const m of measurements) {
        if (!byDate[m.date]) byDate[m.date] = { date: m.date };
        byDate[m.date].measurement = m;
      }
      for (const c of compositions) {
        const dateKey = c.date.split('T')[0];
        if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey };
        byDate[dateKey].composition = c;
      }

      const sorted = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
      setRows(sorted);
    } catch (err) {
      logger.error('[Companion] Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  // ----------------------------------------
  // Suppression d'une ligne
  // ----------------------------------------

  const handleDelete = useCallback((row: MergedRow) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    showPopup(
      'Supprimer cette entrée',
      `${isoToFr(row.date)} — Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'secondary' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const promises: Promise<any>[] = [];
              if (row.weight?.id) promises.push(deleteWeight(row.weight.id));
              if (row.measurement?.id) promises.push(deleteMeasurementRecord(row.measurement.id));
              if (row.composition?.id) promises.push(deleteBodyComposition(row.composition.id));
              await Promise.all(promises);
              notificationAsync(NotificationFeedbackType.Success);
              await loadData();
            } catch (err) {
              logger.error('[Companion] Erreur suppression:', err);
              showPopup('Erreur', 'Impossible de supprimer cette entrée', [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
      ]
    );
  }, [loadData, showPopup]);

  // ----------------------------------------
  // Ajout d'une ligne
  // ----------------------------------------

  const handleAdd = useCallback(async (dateStr: string, fields: Record<string, string>) => {
    try {
      // Convertir date JJ/MM/AAAA → AAAA-MM-JJ
      let isoDate = dateStr.trim();
      const frMatch = isoDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (frMatch) isoDate = `${frMatch[3]}-${frMatch[2].padStart(2, '0')}-${frMatch[1].padStart(2, '0')}`;

      const p = (k: string) => {
        const v = fields[k]?.replace(',', '.').trim();
        return v ? parseFloat(v) : undefined;
      };

      const weight = p('weight');
      const fat = p('fat');
      const muscle = p('muscle');
      const water = p('water');
      const chest = p('chest');
      const waist = p('waist');
      const hips = p('hips');
      const leftArm = p('left_arm');
      const rightArm = p('right_arm');

      if (weight !== undefined) {
        await addWeight({
          weight,
          fat_percent: fat,
          muscle_percent: muscle,
          water_percent: water,
          date: isoDate,
          source: 'manual',
        });
      }

      const hasMeasurement = [chest, waist, hips, leftArm, rightArm].some(v => v !== undefined);
      if (hasMeasurement) {
        await addMeasurementRecord({
          chest,
          waist,
          hips,
          left_arm: leftArm,
          right_arm: rightArm,
          date: isoDate,
        });
      }

      notificationAsync(NotificationFeedbackType.Success);
      await loadData();
    } catch (err) {
      logger.error('[Companion] Erreur ajout:', err);
      showPopup('Erreur', "Impossible d'enregistrer l'entrée", [{ text: 'OK', style: 'primary' }]);
    }
  }, [loadData, showPopup]);

  // ----------------------------------------
  // Export CSV
  // ----------------------------------------

  const handleExport = async () => {
    setExporting(true);
    impactAsync(ImpactFeedbackStyle.Medium);
    try {
      const ok = await shareExportCSV();
      if (ok) notificationAsync(NotificationFeedbackType.Success);
    } catch (err) {
      logger.error('[Companion] Erreur export:', err);
      showPopup('Erreur', "Impossible d'exporter les données", [{ text: 'OK', style: 'primary' }]);
    } finally {
      setExporting(false);
    }
  };

  // ----------------------------------------
  // Stats
  // ----------------------------------------

  const lastWeight = rows.find(r => r.weight?.weight)?.weight?.weight;
  const firstWeight = [...rows].reverse().find(r => r.weight?.weight)?.weight?.weight;
  const weightDiff = lastWeight !== undefined && firstWeight !== undefined ? lastWeight - firstWeight : null;

  // ----------------------------------------
  // Données pour les graphiques
  // ----------------------------------------

  const chartRows = [...rows].reverse().filter(r => r.weight?.weight || r.composition?.weight);
  const weightData = chartRows
    .map(r => ({ value: r.weight?.weight ?? r.composition?.weight ?? 0, label: displayDate(r.date).split(' ').slice(0, 2).join('\n') }))
    .filter(d => d.value > 0)
    .slice(-20);

  const fatData = chartRows
    .map(r => ({ value: r.weight?.fat_percent ?? r.composition?.bodyFatPercent ?? 0, label: displayDate(r.date).split(' ').slice(0, 2).join('\n') }))
    .filter(d => d.value > 0)
    .slice(-20);

  const muscleData = chartRows
    .map(r => ({ value: r.weight?.muscle_percent ?? r.composition?.muscleMass ?? 0, label: '' }))
    .filter(d => d.value > 0)
    .slice(-20);

  // ----------------------------------------
  // Rendu tableau
  // ----------------------------------------

  const renderTableHeader = () => (
    <View style={[styles.tableRow, { backgroundColor: colors.backgroundCard, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.dateCell, styles.headerCell]}>
        <Text style={[styles.headerText, { color: colors.textMuted }]}>Date</Text>
      </View>
      {COLUMNS.map(col => (
        <View key={col.key} style={[styles.dataCell, styles.headerCell, { width: col.width }]}>
          <Text style={[styles.headerText, { color: colors.textMuted }]}>{col.label}</Text>
          <Text style={[styles.headerUnit, { color: colors.textMuted + '80' }]}>{col.unit}</Text>
        </View>
      ))}
      <View style={[styles.actionCell, styles.headerCell]} />
    </View>
  );

  const renderDataRow = (item: MergedRow, index: number) => {
    const isEven = index % 2 === 0;
    const bg = isEven ? colors.background : `${colors.backgroundCard}CC`;

    return (
      <View key={item.date} style={[styles.tableRow, { backgroundColor: bg }]}>
        <View style={[styles.dateCell, { borderBottomColor: colors.border + '30' }]}>
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {displayDate(item.date)}
          </Text>
        </View>
        {COLUMNS.map(col => {
          const val = getVal(item, col.key);
          const isEmpty = val === '—';
          return (
            <View key={col.key} style={[styles.dataCell, { width: col.width, borderBottomColor: colors.border + '30' }]}>
              <Text style={[styles.dataText, { color: isEmpty ? colors.textMuted + '40' : colors.textPrimary }]}>
                {val}
              </Text>
            </View>
          );
        })}
        <TouchableOpacity
          style={[styles.actionCell, { borderBottomColor: colors.border + '30' }]}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={15} color={colors.textMuted + '80'} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  };

  // ----------------------------------------
  // Rendu graphiques
  // ----------------------------------------

  const CHART_COLOR = '#4F8EF7';
  const FAT_COLOR = '#F97316';
  const MUSCLE_COLOR = '#10B981';
  const chartWidth = SCREEN_WIDTH - 32;

  const renderCharts = () => {
    if (weightData.length < 2) {
      return (
        <View style={styles.emptyCharts}>
          <BarChart2 size={40} color={colors.textMuted + '40'} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Ajoute au moins 2 entrées de poids pour voir les graphiques
          </Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Graphique poids */}
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Évolution du poids</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
            {weightData.length} mesure{weightData.length > 1 ? 's' : ''}
          </Text>
          <LineChart
            data={weightData}
            width={chartWidth - 32}
            height={160}
            color={CHART_COLOR}
            thickness={2.5}
            startFillColor={CHART_COLOR + '40'}
            endFillColor={CHART_COLOR + '05'}
            areaChart
            curved
            hideDataPoints={weightData.length > 15}
            dataPointsColor={CHART_COLOR}
            dataPointsRadius={4}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            rulesColor={colors.border + '40'}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            noOfSections={4}
            adjustToWidth
            isAnimated
          />
        </View>

        {/* Graphique MG/MM */}
        {fatData.length >= 2 && (
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Composition corporelle</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: FAT_COLOR }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>Masse grasse %</Text>
              </View>
              {muscleData.length >= 2 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: MUSCLE_COLOR }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Masse musculaire %</Text>
                </View>
              )}
            </View>
            <LineChart
              data={fatData}
              data2={muscleData.length >= 2 ? muscleData : undefined}
              width={chartWidth - 32}
              height={160}
              color={FAT_COLOR}
              color2={MUSCLE_COLOR}
              thickness={2.5}
              thickness2={2.5}
              startFillColor={FAT_COLOR + '30'}
              endFillColor={FAT_COLOR + '05'}
              areaChart
              curved
              hideDataPoints={fatData.length > 15}
              dataPointsColor={FAT_COLOR}
              dataPointsColor2={MUSCLE_COLOR}
              dataPointsRadius={4}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
              rulesColor={colors.border + '40'}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              noOfSections={4}
              adjustToWidth
              isAnimated
            />
          </View>
        )}
      </ScrollView>
    );
  };

  // ----------------------------------------
  // RENDU
  // ----------------------------------------

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.back(); }}
          style={styles.headerBtn}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mes données</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/import-csv' as any); }}
          >
            <Upload size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Download size={20} color={colors.textPrimary} strokeWidth={2} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {rows.length > 0 && (
        <View style={[styles.statsRow, { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{rows.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>entrées</Text>
          </View>
          {lastWeight !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{lastWeight} kg</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>dernier poids</Text>
            </View>
          )}
          {weightDiff !== null && Math.abs(weightDiff) > 0.1 && (
            <View style={styles.statItem}>
              <View style={styles.statDiffRow}>
                {weightDiff < 0
                  ? <TrendingDown size={14} color="#10B981" strokeWidth={2} />
                  : <TrendingUp size={14} color="#F97316" strokeWidth={2} />
                }
                <Text style={[styles.statValue, { color: weightDiff < 0 ? '#10B981' : '#F97316' }]}>
                  {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>total</Text>
            </View>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'table' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setTab('table'); }}
        >
          <Table size={16} color={tab === 'table' ? colors.accent : colors.textMuted} strokeWidth={2} />
          <Text style={[styles.tabText, { color: tab === 'table' ? colors.accent : colors.textMuted }]}>
            Tableau
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'charts' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setTab('charts'); }}
        >
          <BarChart2 size={16} color={tab === 'charts' ? colors.accent : colors.textMuted} strokeWidth={2} />
          <Text style={[styles.tabText, { color: tab === 'charts' ? colors.accent : colors.textMuted }]}>
            Graphiques
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Table size={48} color={colors.textMuted + '40'} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Aucune donnée</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Ajoute ton premier poids avec le bouton +{'\n'}ou importe un fichier CSV
          </Text>
        </View>
      ) : tab === 'table' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} bounces={false}>
          <View>
            {renderTableHeader()}
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            >
              {rows.map((item, index) => renderDataRow(item, index))}
            </ScrollView>
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.chartsContainer, { paddingHorizontal: 16 }]}>
          {renderCharts()}
        </View>
      )}

      {/* FAB Ajouter */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent, bottom: insets.bottom + 20 }]}
        onPress={() => { impactAsync(ImpactFeedbackStyle.Medium); setShowAdd(true); }}
      >
        <Plus size={24} color="#FFF" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Modal ajout */}
      <AddModal
        visible={showAdd}
        colors={colors}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
      />

      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statDiffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Tableau
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dateCell: {
    width: DATE_COL_WIDTH,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dataCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerUnit: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dataText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Charts
  chartsContainer: { flex: 1 },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // États vides
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyCharts: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal ajout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
