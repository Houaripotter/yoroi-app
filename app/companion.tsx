/**
 * Tableau du corps (v2) : toutes tes pesees, ta composition et tes mensurations, une ligne par jour.
 * Ajouter une ligne, supprimer un jour, courbes du poids et de la masse grasse,
 * export CSV (partage) et import CSV. Ancien ecran archive dans _archive_ancien_design_2026-10-09/app/.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { ActivityIndicator, DeviceEventEmitter, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { CorpsHeader, RoundBtn } from '@/components/yoroi/v2/seance/corps/ui';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { deleteBodyComposition } from '@/lib/bodyComposition';
import type { BodyComposition } from '@/lib/bodyComposition';
import { shareExportCSV } from '@/lib/csvTemplates';
import { addMeasurementRecord, addWeight, deleteMeasurementRecord, deleteWeight } from '@/lib/database';
import type { Measurement, Weight } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { fmtValue, frDay, loadBodyData, parseDay } from '@/lib/v2/seance/corps';
import { isoDay } from '@/lib/v2/seance/format';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { ChargementBloc } from '@/components/yoroi/v2/chargement/Chargement';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type Row = { date: string; weight?: Weight; measurement?: Measurement; composition?: BodyComposition };

const COLUMNS: { key: string; label: string; unit: string; width: number }[] = [
  { key: 'weight', label: 'Poids', unit: 'kg', width: 74 },
  { key: 'fat', label: 'Graisse', unit: '%', width: 78 },
  { key: 'muscle', label: 'Muscle', unit: '%', width: 76 },
  { key: 'water', label: 'Eau', unit: '%', width: 70 },
  { key: 'chest', label: 'Poitrine', unit: 'cm', width: 84 },
  { key: 'waist', label: 'Taille', unit: 'cm', width: 74 },
  { key: 'hips', label: 'Hanches', unit: 'cm', width: 86 },
  { key: 'left_arm', label: 'Bras G', unit: 'cm', width: 74 },
  { key: 'right_arm', label: 'Bras D', unit: 'cm', width: 74 },
];

/** Colonnes de la pesee (visibles d'emblee) : un jour de mensurations seules y affiche une mention au lieu d'une ligne vide */
const COMPO_COLS = COLUMNS.slice(0, 4);
const COMPO_W = COMPO_COLS.reduce((a, col) => a + col.width, 0);

const DATE_W = 92;
const HEAD_H = 48;
const ROW_H = 46;

function val(r: Row, key: string): number | undefined {
  const w = r.weight;
  const m = r.measurement;
  const c = r.composition;
  const pos = (v?: number | null) => (v && v > 0 ? v : undefined);
  switch (key) {
    case 'weight': return pos(w?.weight) ?? pos(c?.weight);
    case 'fat': return pos(w?.fat_percent) ?? pos(c?.bodyFatPercent);
    case 'muscle': return pos(w?.muscle_percent) ?? (c?.muscleMass && c.weight ? Math.round((c.muscleMass / c.weight) * 1000) / 10 : undefined);
    case 'water': return pos(w?.water_percent) ?? pos(c?.waterPercent);
    case 'chest': return pos(m?.chest);
    case 'waist': return pos(m?.waist);
    case 'hips': return pos(m?.hips);
    case 'left_arm': return pos(m?.left_arm);
    case 'right_arm': return pos(m?.right_arm);
    default: return undefined;
  }
}

function shortDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const M = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
  return `${d.getDate()} ${M[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export default function TableauCorps() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<'table' | 'charts'>('table');
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await loadBodyData();
      const by: Record<string, Row> = {};
      const at = (day: string) => (by[day] ??= { date: day });
      for (const w of d.weights) if (w.date) at(w.date.slice(0, 10)).weight = w;
      for (const m of d.measurements) if (m.date) at(m.date.slice(0, 10)).measurement = m;
      for (const comp of d.comps) {
        const day = (comp.date ?? '').slice(0, 10);
        if (day) at(day).composition = comp;
      }
      // un jour sans aucune valeur dans les colonnes affichees ne fait qu'une ligne vide : on le laisse de cote
      setRows(Object.values(by).filter((r) => COLUMNS.some((col) => val(r, col.key) !== undefined)).sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      logger.error('Lecture du tableau impossible', err);
      setRows([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const changed = () => {
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    load();
  };

  const removeRow = (r: Row) => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    appAlert(traduire('Supprimer ce jour ?'), traduire("Tout ce qui est noté le {0} sera supprimé : pesée, composition et mensurations.", frDay(r.date)), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            const jobs: Promise<unknown>[] = [];
            if (r.weight?.id) jobs.push(deleteWeight(r.weight.id));
            if (r.measurement?.id) jobs.push(deleteMeasurementRecord(r.measurement.id));
            if (r.composition?.id) jobs.push(deleteBodyComposition(r.composition.id));
            await Promise.all(jobs);
            changed();
          } catch (err) {
            logger.error('Suppression impossible', err);
            appAlert(traduire('Oups'), traduire('La suppression n’a pas pu se faire.'));
          }
        },
      },
    ]);
  };

  const addRow = async (day: string, f: Record<string, number | undefined>) => {
    setAdding(false);
    try {
      if (f.weight !== undefined) {
        await addWeight({ weight: f.weight, fat_percent: f.fat, muscle_percent: f.muscle, water_percent: f.water, date: day, source: 'manual' });
      }
      if ([f.chest, f.waist, f.hips, f.left_arm, f.right_arm].some((v) => v !== undefined)) {
        await addMeasurementRecord({ date: day, chest: f.chest, waist: f.waist, hips: f.hips, left_arm: f.left_arm, right_arm: f.right_arm });
      }
      changed();
    } catch (err) {
      logger.error('Ajout impossible', err);
      appAlert(traduire('Oups'), traduire('La ligne n’a pas pu être ajoutée.'));
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const ok = await shareExportCSV();
      if (ok) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      logger.error('Export impossible', err);
      appAlert(traduire('Oups'), traduire('L’export n’a pas pu se faire.'));
    } finally {
      setExporting(false);
    }
  };

  const weightPts = useMemo(() => (rows ?? []).filter((r) => val(r, 'weight')).map((r) => ({ date: r.date, value: val(r, 'weight') as number })).reverse(), [rows]);
  const fatPts = useMemo(() => (rows ?? []).filter((r) => val(r, 'fat')).map((r) => ({ date: r.date, value: val(r, 'fat') as number })).reverse(), [rows]);
  const lastW = weightPts[weightPts.length - 1]?.value;
  const firstW = weightPts[0]?.value;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <CorpsHeader
          title={traduire("Tableau du corps")}
          sub={traduire("Une ligne par jour, tout au même endroit")}
          right={<RoundBtn icon="plus" label={traduire("Ajouter une ligne")} tone="accent" onPress={() => setAdding(true)} />}
        />

        <View style={{ paddingHorizontal: 22, paddingTop: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => router.push('/import-csv' as any)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : blancA(0.8), borderWidth: 1, borderColor: c.border })}>
              <Ink size={14} weight="extraBold">{traduire("Importer un CSV")}</Ink>
            </Pressable>
            <Pressable onPress={exportCsv} disabled={exporting} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : blancA(0.8), borderWidth: 1, borderColor: c.border, opacity: exporting ? 0.6 : 1 })}>
              {exporting ? <ActivityIndicator size="small" color={c.ink} /> : null}
              <Ink size={14} weight="extraBold">{traduire("Exporter en CSV")}</Ink>
            </Pressable>
          </View>

          {rows && rows.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Tile value={String(rows.length)} label={traduire("jours notés")} />
              {lastW ? <Tile value={`${fmtValue(lastW, 1)} kg`} label={traduire("dernier poids")} /> : null}
              {lastW && firstW && weightPts.length > 1 ? <Tile value={`${lastW - firstW > 0 ? '+' : lastW - firstW < 0 ? '−' : ''}${fmtValue(Math.abs(lastW - firstW), 1)} kg`} label={traduire("depuis le début")} /> : null}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: c.fillSubtle }}>
            {(['table', 'charts'] as const).map((t) => {
              const on = tab === t;
              return (
                <Pressable key={t} onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); setTab(t); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent' }}>
                  <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textSecondary}>{t === 'table' ? 'Tableau' : 'Courbes'}</Ink>
                </Pressable>
              );
            })}
          </View>

          {rows === null ? (
            <ChargementBloc style={{ marginTop: 10 }} />
          ) : rows.length === 0 ? (
            <View style={{ padding: 22, borderRadius: 26, backgroundColor: blancA(0.8), borderWidth: 1, borderColor: P.white, gap: 8 }}>
              <Glyph kind="sakura" size={44} color={c.indigo} />
              <Ink size={22} weight="black" tight>{traduire("Ton tableau est vide")}</Ink>
              <Ink size={14} color={c.textSecondary}>{traduire("Ajoute une ligne à la main, ou importe ton historique depuis un fichier CSV.")}</Ink>
              <Pressable onPress={() => setAdding(true)} accessibilityRole="button" style={({ pressed }) => ({ marginTop: 6, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}>
                <Ink size={15} weight="extraBold" color={c.onPrimary}>{traduire("Ajouter une ligne")}</Ink>
              </Pressable>
            </View>
          ) : tab === 'table' ? (
            <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden', flexDirection: 'row' }}>
              {/* colonne du jour, fixe */}
              <View style={{ width: DATE_W, borderRightWidth: 1, borderColor: c.divider }}>
                <View style={{ height: HEAD_H, justifyContent: 'center', backgroundColor: c.fillSoft, paddingLeft: 14 }}>
                  <Ink size={12} weight="extraBold" color={c.textSecondary}>{traduire("Jour")}</Ink>
                </View>
                {rows.map((r, i) => (
                  <Pressable key={r.date} onPress={() => removeRow(r)} accessibilityRole="button" accessibilityLabel={traduire("{0}, toucher pour supprimer ce jour", frDay(r.date))} style={({ pressed }) => ({ height: ROW_H, justifyContent: 'center', paddingLeft: 14, backgroundColor: pressed ? c.dangerTint : i % 2 ? 'rgba(242,241,236,0.5)' : 'transparent' })}>
                    <Ink size={13} weight="bold" numberOfLines={1}>{shortDay(r.date)}</Ink>
                  </Pressable>
                ))}
              </View>
              {/* valeurs, qui defilent sur le cote */}
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }} contentContainerStyle={{ paddingRight: 6 }}>
                <View>
                  <View style={{ flexDirection: 'row', height: HEAD_H, alignItems: 'center', backgroundColor: c.fillSoft }}>
                    {COLUMNS.map((col) => (
                      <View key={col.key} style={{ width: col.width, alignItems: 'flex-end', paddingRight: 12 }}>
                        <Ink size={12} weight="extraBold" color={c.textSecondary} numberOfLines={1}>{traduire(col.label)}</Ink>
                        <Ink size={10} color={c.textMuted}>{col.unit}</Ink>
                      </View>
                    ))}
                  </View>
                  {rows.map((r, i) => (
                    <Pressable key={r.date} onPress={() => removeRow(r)} accessibilityRole="button" accessibilityLabel={traduire("{0}, toucher pour supprimer ce jour", frDay(r.date))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', height: ROW_H, backgroundColor: pressed ? c.dangerTint : i % 2 ? 'rgba(242,241,236,0.5)' : 'transparent' })}>
                      {COMPO_COLS.every((col) => val(r, col.key) === undefined) ? (
                        <View style={{ width: COMPO_W, paddingLeft: 14, paddingRight: 12, justifyContent: 'center' }}>
                          <Ink size={12} weight="bold" color={c.textMuted} numberOfLines={1}>{traduire("Mensurations du jour, fais glisser →")}</Ink>
                        </View>
                      ) : null}
                      {(COMPO_COLS.every((col) => val(r, col.key) === undefined) ? COLUMNS.slice(COMPO_COLS.length) : COLUMNS).map((col) => {
                        const v = val(r, col.key);
                        return (
                          <Ink key={col.key} size={14} weight={v !== undefined ? 'black' : 'medium'} color={v !== undefined ? c.ink : c.border} numberOfLines={1} style={{ width: col.width, textAlign: 'right', paddingRight: 12, fontVariant: ['tabular-nums'] }}>
                            {v !== undefined ? fmtValue(v, 1) : ''}
                          </Ink>
                        );
                      })}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {weightPts.length > 1 ? (
                <View style={{ padding: 16, borderRadius: 24, backgroundColor: blancA(0.85), borderWidth: 1, borderColor: P.white, gap: 8 }}>
                  <Ink size={16} weight="black">Poids</Ink>
                  <InkLineChart points={weightPts} color="#3D5D9E" height={190} digits={1} label={traduire("Courbe du poids")} />
                </View>
              ) : null}
              {fatPts.length > 1 ? (
                <View style={{ padding: 16, borderRadius: 24, backgroundColor: blancA(0.85), borderWidth: 1, borderColor: P.white, gap: 8 }}>
                  <Ink size={16} weight="black">{traduire("Masse grasse, en %")}</Ink>
                  <InkLineChart points={fatPts} color="#A8832F" height={170} digits={1} label={traduire("Courbe de la masse grasse")} />
                </View>
              ) : null}
              {weightPts.length < 2 && fatPts.length < 2 ? (
                <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Il faut au moins deux jours notés pour tracer une courbe.")}</Ink>
              ) : null}
            </View>
          )}
          {tab === 'table' && rows && rows.length > 0 ? <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Fais glisser les colonnes sur le côté, le jour reste en place. Touche un jour pour le supprimer.")}</Ink> : null}
        </View>
      </ScrollView>

      <AddRowSheet visible={adding} onClose={() => setAdding(false)} onSave={addRow} />
    </View>
  );
}

function AddRowSheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (day: string, f: Record<string, number | undefined>) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [date, setDate] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setDate(frDay(isoDay(new Date())));
    setVals({});
    setError('');
  }, [visible]);

  const submit = () => {
    const day = parseDay(date);
    if (!day) return setError(traduire('Écris le jour comme ceci : 12/03/2026.'));
    const f: Record<string, number | undefined> = {};
    for (const col of COLUMNS) {
      const n = parseFloat((vals[col.key] ?? '').replace(',', '.'));
      f[col.key] = Number.isFinite(n) && n > 0 ? n : undefined;
    }
    if (Object.values(f).every((v) => v === undefined)) return setError(traduire('Remplis au moins une valeur.'));
    if (f.weight === undefined && [f.fat, f.muscle, f.water].some((v) => v !== undefined)) return setError(traduire('La graisse, le muscle et l’eau se notent avec le poids du jour.'));
    onSave(day, f);
  };

  const field = [fontStyle('bold'), { height: 48, fontSize: 16, color: c.ink, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }];

  return (
    <Sheet visible={visible} onClose={onClose} title={traduire("Nouvelle ligne")} scroll>
      <View style={{ gap: 6 }}>
        <Ink size={13} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Jour")}</Ink>
        <TextInput value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="12/03/2026" placeholderTextColor={c.textMuted} accessibilityLabel={traduire("Jour")} style={field} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {COLUMNS.map((col) => (
          <View key={col.key} style={{ width: '31%', flexGrow: 1, gap: 4 }}>
            <Ink size={12} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire(col.label)}, {col.unit}</Ink>
            <TextInput value={vals[col.key] ?? ''} onChangeText={(v) => setVals((p) => ({ ...p, [col.key]: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.textMuted} accessibilityLabel={`${col.label} en ${col.unit}`} style={field} />
          </View>
        ))}
      </View>
      {error ? <Ink size={13} weight="bold" color={c.danger} style={{ paddingHorizontal: 4 }}>{error}</Ink> : null}
      <Pressable onPress={submit} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}>
        <Ink size={16} weight="extraBold" color={c.onPrimary}>{traduire("Ajouter")}</Ink>
      </Pressable>
    </Sheet>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: blancA(0.85), borderWidth: 1, borderColor: P.white }}>
      <Ink size={19} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Ink>
      <Ink size={12} color={c.textMuted} numberOfLines={1}>{label}</Ink>
    </View>
  );
}
