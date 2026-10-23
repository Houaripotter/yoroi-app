/**
 * Ton activite v2 : volume, frequence et intensite de tes entrainements par semaine,
 * sur 7 jours, 30 jours, 90 jours ou depuis le debut.
 * Vague 14 : reprend aussi l'ancien ecran Performance (/performance-detail, redirige ici) :
 * charge par semaine (effort ressenti x heures) et nombre de seances dures.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { CHART_COLORS } from '@/components/yoroi/v2/charts/core';
import { DeviceEventEmitter, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getSessionTypeLabel } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { durationOf } from '@/lib/v2/trainingWeek';
import { hoursText, weekBuckets, weekLabels } from '@/lib/v2/progres/weekly';
import { InkBarChart } from '@/components/yoroi/v2/progres/InkBarChart';
import { PeriodSwitch } from '@/components/yoroi/v2/charts/PeriodSwitch';
import { addDaysISO, isoOf, sportLabel } from '@/lib/v2/seances/sessionData';
import { BackButton, EmptyState, Glass } from '@/components/yoroi/v2/seances/ui';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

const PERIODS = [
  { value: 7, label: traduire('7 jours') },
  { value: 30, label: traduire('1 mois') },
  { value: 90, label: traduire('3 mois') },
  { value: 0, label: traduire('Tout') },
];

function Tile({ value, unit, label }: { value: string; unit?: string; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexGrow: 1, flexBasis: '30%', minWidth: 96, padding: 14, borderRadius: 18, backgroundColor: blancA(0.8), borderWidth: 1, borderColor: c.divider, gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{label}</Ink>
      <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
        {unit ? <Ink size={13} weight="bold" color={c.textSecondary}>{` ${unit}`}</Ink> : null}
      </Ink>
    </View>
  );
}

export default function ActivityDetailScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<number>(30);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrainings((await getTrainings()) ?? []);
    } catch (error) {
      logger.error('Erreur chargement trainings:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
      return () => sub.remove();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const cutoff = period ? addDaysISO(isoOf(new Date()), -period + 1) : '0000-00-00';
    return trainings.filter((t) => t?.date && t.date.slice(0, 10) >= cutoff).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [trainings, period]);

  // Toutes les semaines de la periode, meme vides : 4 a 5 barres sur un mois
  const weeks = useMemo(() => weekBuckets(filtered, period || null, durationOf, (t) => (t.intensity && t.intensity > 0 ? t.intensity : null)), [filtered, period]);
  const labels = useMemo(() => weekLabels(weeks.map((w) => w.week)), [weeks]);

  const totalMin = filtered.reduce((s, t) => s + durationOf(t), 0);
  const perWeek = filtered.length / Math.max(1, weeks.length);
  const mainType = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((t) => {
      const k = t.session_type ? getSessionTypeLabel(t.session_type) : sportLabel(t.sport);
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  }, [filtered]);

  const thisWeek = weeks.length - 1;
  const volume = weeks.map((w, i) => ({ label: labels[i], value: Math.round((w.minutes / 60) * 10) / 10 }));
  const freq = weeks.map((w, i) => ({ label: labels[i], value: w.count }));
  const rpe = weeks.map((w, i) => ({ label: labels[i], value: w.rpeN > 0 ? Math.round((w.rpeSum / w.rpeN) * 10) / 10 : 0 }));
  const hasRpe = weeks.some((w) => w.rpeN > 0);
  const loadBars = weeks.map((w, i) => ({ label: labels[i], value: Math.round(w.load) }));
  const hard = filtered.filter((t) => (t.intensity ?? 0) >= 8).length;
  const avgOf = (list: { value: number }[]) => (list.length > 1 ? list.reduce((s, b) => s + b.value, 0) / list.length : null);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire("Ton activité")} sousTitre={traduire("Volume, fréquence et effort, semaine par semaine")} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />

        <PeriodSwitch value={period} onChange={setPeriod} options={PERIODS} />

        {loaded && filtered.length === 0 ? (
          <EmptyState title={traduire("Rien sur cette période")} text={traduire("Enregistre une séance et ton activité prend forme ici, semaine après semaine.")} action={traduire("Commencer une séance")} onAction={() => router.push('/seance' as any)} />
        ) : null}

        {filtered.length > 0 ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Tile value={String(filtered.length)} label={traduire("Séances")} />
              <Tile value={hoursText(totalMin)} label={traduire("Temps total")} />
              <Tile value={perWeek.toFixed(1).replace('.', DECIMAL)} label={traduire("Par semaine")} />
              {mainType ? <Tile value={mainType} label={traduire("Le plus fréquent")} /> : null}
            </View>

            <Glass style={{ gap: 8 }}>
              <Ink size={17} weight="black" tight>{traduire("Volume")}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire("Heures d’entraînement par semaine")}</Ink>
              <InkBarChart bars={volume} color="#3D5D9E" highlight={thisWeek} average={avgOf(volume)} format={(v) => hoursText(v * 60)} showValues="highlight" sparseLabels label={traduire("Heures d’entraînement par semaine")} />
            </Glass>

            <Glass style={{ gap: 8 }}>
              <Ink size={17} weight="black" tight>{traduire("Fréquence")}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire("Séances par semaine")}</Ink>
              <InkBarChart bars={freq} color={CHART_COLORS.gold} highlight={thisWeek} average={avgOf(freq)} format={(v) => `${Math.round(v)}`} showValues={weeks.length <= 6 ? 'all' : 'highlight'} sparseLabels label={traduire("Séances par semaine")} />
            </Glass>

            <Glass style={{ gap: 8 }}>
              <Ink size={17} weight="black" tight>Effort moyen</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire("Effort ressenti sur 10, quand tu l’as noté")}</Ink>
              {hasRpe ? (
                <InkBarChart bars={rpe} color={c.accent} highlight={thisWeek} format={(v) => v.toFixed(1).replace('.', DECIMAL).replace(',0', '')} showValues={weeks.length <= 6 ? 'all' : 'highlight'} sparseLabels label={traduire("Effort moyen par semaine")} />
              ) : (
                <Ink size={14} color={c.textSecondary}>{traduire("Note ton effort à la fin de tes séances pour voir ces barres.")}</Ink>
              )}
            </Glass>

            {hasRpe ? (
              <Glass style={{ gap: 8 }}>
                <Ink size={17} weight="black" tight>{traduire("Charge")}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire("Effort ressenti multiplié par les heures. Une semaine bien plus haute que ta moyenne demande de la récupération.")}</Ink>
                <InkBarChart bars={loadBars} color={c.indigo} highlight={thisWeek} average={avgOf(loadBars)} format={(v) => String(Math.round(v))} showValues="highlight" sparseLabels label={traduire("Charge par semaine")} />
                {hard > 0 ? <Ink size={13} weight="bold" color={c.textSecondary}>{traduirePluriel(hard, hard > 1, "{0} séance dure sur la période, effort de 8 ou plus.", "{0} séances dures sur la période, effort de 8 ou plus.", hard)}</Ink> : null}
              </Glass>
            ) : null}
            <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Barre rouge : la semaine en cours. Pointillés : ta moyenne. Touche une barre pour la lire.")}</Ink>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
