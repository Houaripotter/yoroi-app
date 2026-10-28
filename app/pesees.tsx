/**
 * Historique des pesees v2 : regroupe par mois, ecart avec la pesee precedente,
 * appui pour modifier ou supprimer. Une nouvelle pesee passe par le bouton + (vague 13).
 * Filtre par source (Apple Sante, balance, import, a la main) et suppression de toutes
 * les pesees d'une source : reprend l'ancien ecran /weight-manager (vague 14).
 */
import React, { useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { DeviceEventEmitter, Pressable, ScrollView, SectionList, View } from 'react-native';
import { lienBilan } from '@/lib/v2/bilan/reglage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BackButton, EmptyInvite } from '@/components/yoroi/v2/progres/ui';
import { deleteWeight, deleteWeightsBySource } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT, useWeightData } from '@/lib/v2/useWeightData';
import { daysWithSeveral, sameDayTag } from '@/lib/v2/progres/weighTime';
import { formatKg, formatLongDate, monthName } from '@/lib/v2/weightStats';
import { describeSource } from '@/lib/v2/pesee/health';
import { sourceOf } from '@/lib/v2/seance/corps';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Row = { w: Weight; delta: number | null };

export default function Pesees() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { raw, series } = useWeightData();
  const [filter, setFilter] = useState('all');

  // Nombre de pesees par source, la plus fournie d'abord
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of raw) m.set(sourceOf(w.source).key, (m.get(sourceOf(w.source).key) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [raw]);
  const active = filter !== 'all' && counts.some(([k]) => k === filter) ? filter : 'all';
  const shown = useMemo(() => (active === 'all' ? raw : raw.filter((w) => sourceOf(w.source).key === active)), [raw, active]);

  const sections = useMemo(() => {
    const sorted = [...shown].sort((a, b) => (a.date === b.date ? (b.id ?? 0) - (a.id ?? 0) : a.date < b.date ? 1 : -1));
    const groups: { title: string; data: Row[] }[] = [];
    sorted.forEach((w, i) => {
      const next = sorted[i + 1];
      const row: Row = { w, delta: next ? w.weight - next.weight : null };
      const title = `${monthName(w.date.slice(0, 10))} ${w.date.slice(0, 4)}`;
      const g = groups[groups.length - 1];
      if (g && g.title === title) g.data.push(row);
      else groups.push({ title, data: [row] });
    });
    return groups;
  }, [shown]);

  const deleteSource = (key: string) => {
    const n = counts.find(([k]) => k === key)?.[1] ?? 0;
    const label = sourceOf(key).label;
    appAlert(traduire("Supprimer les pesées {0} ?", label), traduirePluriel(n, n > 1, "{0} pesée seront supprimées pour de bon.", "{0} pesées seront supprimées pour de bon.", n), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire("Supprimer {0}", n),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWeightsBySource(key);
            setFilter('all');
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
          } catch (err) {
            logger.error('Suppression par source impossible', err);
          }
        },
      },
    ]);
  };

  const latest = series[series.length - 1];
  const several = useMemo(() => daysWithSeveral(raw), [raw]);

  const onRow = (w: Weight) => {
    appAlert(formatLongDate(w.date.slice(0, 10)), traduire("{0} kilos", formatKg(w.weight)), [
      { text: traduire('Voir le bilan'), onPress: () => router.push(lienBilan({ type: 'corps', date: w.date.slice(0, 10), origine: 'detail' }) as never) },
      { text: traduire('Modifier'), onPress: () => router.push({ pathname: '/pesee', params: { id: String(w.id), date: w.date.slice(0, 10), value: String(w.weight) } } as any) },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        // NUIT 14 : une confirmation avant de supprimer pour de bon
        onPress: () =>
          appAlert(traduire('Supprimer cette pesée ?'), traduire("{0} kg, {1}. Elle reste 30 jours dans la corbeille, avec sa composition.", formatKg(w.weight), formatLongDate(w.date.slice(0, 10))), [
            { text: traduire('Annuler'), style: 'cancel' },
            {
              text: traduire('Supprimer'),
              style: 'destructive',
              onPress: async () => {
                try {
                  if (w.id) await deleteWeight(w.id);
                  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
                } catch (err) {
                  logger.error('Suppression de la pesee impossible', err);
                }
              },
            },
          ]),
      },
      { text: traduire('Annuler'), style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => String(r.w.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 8 }}>
            <EnTete titre={traduire("Tes pesées")} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />
            <View style={{ flexDirection: 'row', paddingVertical: 14, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: c.border }}>
              <Mini value={latest ? formatKg(latest.value) : traduire('à venir')} label={traduire("dernière pesée, kg")} />
              <Mini value={latest ? formatKg(latest.trend) : traduire('à venir')} label={traduire("tendance lissée")} border />
              <Mini value={String(raw.length)} label={traduire("pesées")} border />
            </View>
            {counts.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -22 }}>
                <View style={{ width: 14 }} />
                <SourceChip label={traduire("Toutes ({0})", raw.length)} on={active === 'all'} onPress={() => setFilter('all')} />
                {counts.map(([k, n]) => (
                  <SourceChip key={k} label={`${sourceOf(k).label} (${n})`} on={active === k} onPress={() => setFilter(active === k ? 'all' : k)} />
                ))}
                <View style={{ width: 14 }} />
              </ScrollView>
            ) : null}
            {active !== 'all' ? (
              <Pressable onPress={() => deleteSource(active)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? c.dangerTint : blancA(0.7), borderWidth: 1, borderColor: c.border })}>
                <Ink size={14} weight="extraBold" color={c.danger}>{traduire("Supprimer toutes les pesées {0}", sourceOf(active).label)}</Ink>
              </Pressable>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Ink size={14} weight="extraBold" color={c.textSecondary} style={{ marginTop: 18, marginBottom: 4 }}>{traduire(section.title)}</Ink>
        )}
        renderItem={({ item }) => {
          const d = item.delta;
                    const deltaText = d === null ? '' : Math.abs(d) < 0.05 ? 'stable' : `${d < 0 ? '−' : '+'} ${formatKg(Math.abs(d))} kg`;
          const w0 = item.w;
          const src = w0.source && w0.source !== 'manual' && w0.source !== 'csv' ? describeSource(w0.source, '').label ?? traduire('importée') : '';
          const compo = w0.fat_percent || w0.muscle_percent || w0.water_percent || w0.bone_mass || w0.visceral_fat || w0.bmr || w0.metabolic_age ? traduire('avec composition') : '';
          const base = [src, compo].filter(Boolean).join(', ');
          const when = several.has(item.w.date.slice(0, 10)) ? sameDayTag(item.w, raw) : '';
          const extra = [when, base].filter(Boolean).join(', ');
          return (
            <Pressable onPress={() => onRow(item.w)} accessibilityRole="button" accessibilityLabel={traduire("{0}, {1} kilos, modifier ou supprimer", formatLongDate(item.w.date.slice(0, 10)), formatKg(item.w.weight))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 58, borderBottomWidth: 1, borderColor: c.divider, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={15} weight="bold">{formatLongDate(item.w.date.slice(0, 10))}</Ink>
                {extra ? <Ink size={12} color={c.textSecondary}>{extra}</Ink> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 1 }}>
                <Ink size={18} weight="black">{formatKg(item.w.weight)}</Ink>
                {deltaText ? <Ink size={12} weight="bold" color={c.textSecondary}>{deltaText}</Ink> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyInvite style={{ marginTop: 18 }} title={traduire("Aucune pesée pour l’instant")} text={traduire("Monte sur la balance le matin, à jeun, quelques fois par semaine. Ta liste et ta courbe se remplissent dès la première.")} plusHint={traduire("Note ta pesée avec le bouton + de la barre d’onglets")} plusArrow={false} />
        }
        ListFooterComponent={raw.length > 0 ? <Ink size={13} color={c.textSecondary} style={{ marginTop: 16 }}>{traduire("Appuie sur une pesée pour la modifier ou la supprimer.")}</Ink> : null}
      />
    </View>
  );
}

function SourceChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.ink : blancA(0.75), borderWidth: on ? 0 : 1, borderColor: c.border }}>
      <Ink size={14} weight="extraBold" color={on ? P.paper : c.ink}>{label}</Ink>
    </Pressable>
  );
}

function Mini({ value, label, border }: { value: string; label: string; border?: boolean }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flex: 1, gap: 3, paddingLeft: border ? 12 : 0, borderLeftWidth: border ? 1.5 : 0, borderColor: theme.colors.border }}>
      <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{value}</Ink>
      <Ink size={12} color={theme.colors.textSecondary}>{label}</Ink>
    </View>
  );
}
