/**
 * Ton corps, mesure par mesure (v2) : poids, graisse, muscle, eau, os, viscerale, age du corps,
 * metabolisme et toutes les mensurations. Courbe au pinceau, plus bas et plus haut, liste avec la source,
 * ajout, modification, suppression, nettoyage des doublons. Parametre : metric (ex : fat_percent).
 * Ancien ecran archive dans _archive_ancien_design_2026-10-09/app/.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { CorpsHeader, RoundBtn, SourceTag, ValueSheet } from '@/components/yoroi/v2/seance/corps/ui';
import { countWeightDuplicates, deduplicateWeights } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { METRICS, addEntry, deleteEntry, entriesFor, fmtValue, loadBodyData, metricByKey, updateEntry } from '@/lib/v2/seance/corps';
import type { BodyData, Entry } from '@/lib/v2/seance/corps';
import { longDay } from '@/lib/v2/seance/format';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { ChargementBloc } from '@/components/yoroi/v2/chargement/Chargement';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

export default function CorpsParMesure() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ metric?: string }>();
  const [metricKey, setMetricKey] = useState(() => metricByKey(params.metric).key);
  const [data, setData] = useState<BodyData | null>(null);
  const [edit, setEdit] = useState<Entry | 'new' | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await loadBodyData());
    } catch (err) {
      logger.error('Lecture du corps impossible', err);
      setData({ weights: [], comps: [], measurements: [] });
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const metric = metricByKey(metricKey);
  const entries = useMemo(() => (data ? entriesFor(metric, data) : []), [data, metric]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    if (data) for (const x of METRICS) m[x.key] = entriesFor(x, data).length;
    return m;
  }, [data]);
  // Tout l'historique est gratuit
  const visible = entries;
  const points = useMemo(() => [...entries].reverse().map((e) => ({ date: e.date, value: e.value })), [entries]);
  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const vals = entries.map((e) => e.value);
    return { last: entries[0], min: Math.min(...vals), max: Math.max(...vals), change: entries[0].value - entries[entries.length - 1].value };
  }, [entries]);

  const changed = () => {
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    load();
  };

  const save = async (value: number, date: string) => {
    const target = edit;
    setEdit(null);
    if (!data) return;
    try {
      if (target && target !== 'new') await updateEntry(metric, target, value, date);
      else await addEntry(metric, value, date, data);
      changed();
    } catch (err) {
      logger.error('Enregistrement de la mesure impossible', err);
      appAlert(traduire('Oups'), traduire('La valeur n’a pas pu être enregistrée. Réessaie.'));
    }
  };

  const remove = (e: Entry) => {
    setEdit(null);
    appAlert(traduire('Supprimer cette valeur ?'), `${fmtValue(e.value, metric.digits)} ${metric.unit}, ${longDay(e.date)}${metric.key === 'weight' && e.table === 'weight' ? traduire('. La pesée entière part avec.') : ''}`, [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(metric, e);
            changed();
          } catch (err) {
            logger.error('Suppression impossible', err);
          }
        },
      },
    ]);
  };

  const cleanup = async () => {
    try {
      const n = await countWeightDuplicates();
      if (n === 0) {
        appAlert(traduire('Aucun doublon'), traduire('Ton historique est déjà propre.'));
        return;
      }
      appAlert(traduire('Nettoyer les doublons ?'), traduirePluriel(n, n > 1, "{0} doublon trouvé. Les mesures du même jour et de la même source sont fusionnées, en gardant les valeurs les plus complètes.", "{0} doublons trouvés. Les mesures du même jour et de la même source sont fusionnées, en gardant les valeurs les plus complètes.", n), [
        { text: traduire('Annuler'), style: 'cancel' },
        {
          text: traduire('Nettoyer'),
          style: 'destructive',
          onPress: async () => {
            setCleaning(true);
            try {
              const { removed } = await deduplicateWeights();
              changed();
              appAlert(traduire('Nettoyage fait'), traduirePluriel(removed, removed > 1, "{0} doublon supprimé.", "{0} doublons supprimés.", removed));
            } catch (err) {
              logger.error('Nettoyage impossible', err);
              appAlert(traduire('Oups'), traduire('Le nettoyage n’a pas pu se faire.'));
            } finally {
              setCleaning(false);
            }
          },
        },
      ]);
    } catch (err) {
      logger.error('Comptage des doublons impossible', err);
    }
  };

  const group = (g: 'composition' | 'measurements') => METRICS.filter((m) => m.group === g);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <CorpsHeader
          title={traduire("Ton corps")}
          sub={traduire("Chaque mesure, depuis le début")}
          right={<RoundBtn icon="plus" label={traduire("Ajouter : {0}", metric.label)} tone="accent" onPress={() => setEdit('new')} />}
        />

        <View style={{ paddingTop: 16, gap: 14 }}>
          {(['composition', 'measurements'] as const).map((g) => (
            <View key={g} style={{ gap: 6 }}>
              <Ink size={13} weight="bold" color={c.textMuted} style={{ paddingHorizontal: 22 }}>{g === 'composition' ? traduire('Composition') : traduire('Mensurations')}</Ink>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }}>
                {group(g).map((m) => {
                  const on = m.key === metric.key;
                  const n = counts[m.key] ?? 0;
                  return (
                    <Pressable key={m.key} onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); setMetricKey(m.key); }} accessibilityRole="button" accessibilityLabel={traduirePluriel(n, n > 1, "{0}, {1} mesure", "{0}, {1} mesures", m.chip, n)} accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.ink : blancA(0.75), borderWidth: on ? 0 : 1, borderColor: c.border, opacity: n === 0 && !on ? 0.6 : 1 }}>
                      <Ink size={14} weight="extraBold" color={on ? P.paper : c.ink}>{m.chip}</Ink>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ))}

          <View style={{ paddingHorizontal: 22, gap: 14 }}>
            {data === null ? (
              <ChargementBloc style={{ marginTop: 10 }} />
            ) : !stats ? (
              <View style={{ padding: 22, borderRadius: 26, backgroundColor: blancA(0.8), borderWidth: 1, borderColor: P.white, gap: 8 }}>
                <Ink size={22} weight="black" tight>{traduire("{0} : rien pour l’instant", metric.label)}</Ink>
                <Ink size={14} color={c.textSecondary}>{metric.group === 'measurements' ? traduire('Un mètre ruban, une minute, et tu suis ce qui change vraiment.') : traduire('Une balance à impédance ou une saisie à la main, et la courbe démarre.')}</Ink>
                <BoutonPrincipal onPress={() => setEdit('new')} haptique="light" label={traduire("Ajouter une valeur")} hauteur={50} rayon={16} tailleTexte={15} style={{ marginTop: 6 }} />
              </View>
            ) : (
              <>
                <View style={{ padding: 18, borderRadius: 26, backgroundColor: blancA(0.85), borderWidth: 1, borderColor: P.white, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                    <Ink size={52} weight="black" tight>{fmtValue(stats.last.value, metric.digits)}</Ink>
                    <Ink size={18} weight="bold" color={c.textSecondary} style={{ paddingBottom: 10 }}>{metric.unit}</Ink>
                    <View style={{ flex: 1 }} />
                    {entries.length > 1 && Math.abs(stats.change) > 0 ? (
                      <Ink size={15} weight="extraBold" color={c.indigo} style={{ paddingBottom: 12 }}>{traduire("{0}{1} depuis le début", stats.change > 0 ? '+' : '−', fmtValue(Math.abs(stats.change), metric.digits))}</Ink>
                    ) : null}
                  </View>
                  <Ink size={13} color={c.textMuted}>{traduire(metric.label)}, {longDay(stats.last.date)}</Ink>
                  {points.length > 1 ? <InkLineChart points={points} color={c.indigo} height={190} digits={metric.digits} label={`Courbe : ${metric.label}`} /> : null}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Mini label={traduire("plus bas")} value={`${fmtValue(stats.min, metric.digits)} ${metric.unit}`} />
                    <Mini label={traduire("plus haut")} value={`${fmtValue(stats.max, metric.digits)} ${metric.unit}`} />
                    <Mini label="mesures" value={String(entries.length)} />
                  </View>
                </View>

                <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                  {visible.map((e, i) => (
                    <Pressable key={e.id} onPress={() => setEdit(e)} onLongPress={() => remove(e)} accessibilityRole="button" accessibilityLabel={traduire("{0} {1}, {2}. Toucher pour modifier", fmtValue(e.value, metric.digits), metric.unit, longDay(e.date))} style={({ pressed }) => ({ minHeight: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSoft : 'transparent', borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider })}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Ink size={15} weight="bold">{longDay(e.date)}</Ink>
                        <SourceTag source={e.source} />
                      </View>
                      <Ink size={20} weight="black" tight>{fmtValue(e.value, metric.digits)}</Ink>
                      <Ink size={13} color={c.textMuted} style={{ minWidth: 34 }}>{metric.unit}</Ink>
                    </Pressable>
                  ))}
                </View>
                <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Touche une valeur pour la modifier, garde le doigt dessus pour la supprimer.")}</Ink>
              </>
            )}

            {metric.group === 'composition' && data && data.weights.length > 1 ? (
              <Pressable onPress={cleanup} disabled={cleaning} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.fillSubtle : blancA(0.7), borderWidth: 1, borderColor: c.border })}>
                {cleaning ? <ActivityIndicator size="small" color={c.ink} /> : null}
                <Ink size={14} weight="bold" style={{ flex: 1 }}>{traduire("Nettoyer les doublons")}</Ink>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <ValueSheet
        visible={edit !== null}
        onClose={() => setEdit(null)}
        title={edit && edit !== 'new' ? traduire("Modifier : {0}", metric.label.toLocaleLowerCase(LOCALE)) : metric.label}
        unit={metric.unit}
        initialValue={edit && edit !== 'new' ? edit.value : null}
        initialDate={edit && edit !== 'new' ? edit.date : undefined}
        onSave={save}
        onDelete={edit && edit !== 'new' ? () => { const e = edit; setEdit(null); setTimeout(() => remove(e), 450); } : undefined}
      />
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: c.fillSoft }}>
      <Ink size={15} weight="black" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Ink>
      <Ink size={11} color={c.textMuted}>{label}</Ink>
    </View>
  );
}
