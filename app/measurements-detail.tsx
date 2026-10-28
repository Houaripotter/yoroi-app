/**
 * Evolution des mensurations v2, ouverte d'un appui sur une mensuration dans Progres :
 * le choix de la mesure en tuiles, grand graphique au doigt, periode, moyenne, plus fin,
 * plus large, evolution, explication et historique des prises. Parametre optionnel : field.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { GLASS, GUTTER, tapSelect } from '@/components/yoroi/v2/progres/ui';
import { MetricDetail } from '@/components/yoroi/v2/progres/MetricDetail';
import type { DetailPoint, MetricSpec } from '@/components/yoroi/v2/progres/MetricDetail';
import { MEASURE_EXPLAIN, MEASURE_TIP } from '@/components/yoroi/v2/progres/explain';
import { CHART_COLORS } from '@/components/yoroi/v2/charts/core';
import { cmDelta } from '@/components/yoroi/v2/progres/CorpsSection';
import { useMeasuresData } from '@/lib/v2/progres/useProgresData';
import { deleteMeasuresOfDay, VIEW_FIELDS, viewSeries, viewValue } from '@/lib/v2/progres/measures';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { formatLongDate } from '@/lib/v2/weightStats';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import type { ViewKey } from '@/lib/v2/progres/measures';
import { num } from '@/lib/v2/progres/format';
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export default function MeasurementsDetailScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const params = useLocalSearchParams<{ field?: string }>();
  const { isBlurred, screenshotDetected } = useSensitiveScreen();
  const { points, loading, reload } = useMeasuresData();
  const asKey = (v?: string): ViewKey | null => (v && VIEW_FIELDS.some((f) => f.key === v) ? (v as ViewKey) : null);
  const [sel, setSel] = useState<ViewKey | null>(asKey(params.field));

  useEffect(() => {
    const k = asKey(params.field);
    if (k) setSel(k);
  }, [params.field]);

  const fields = useMemo(() => VIEW_FIELDS.map((f) => ({ ...f, all: viewSeries(points, f.key) })).filter((f) => f.all.length > 0), [points]);
  const active = fields.find((f) => f.key === sel) ?? fields.find((f) => f.key === 'waist') ?? fields[0];

  const series: DetailPoint[] = useMemo(() => {
    if (!active) return [];
    return active.all.map((p) => {
      const day = points.find((q) => q.date === p.date);
      const others = day
        ? VIEW_FIELDS.filter((f) => f.key !== active.key)
            .map((f) => {
              const v = viewValue(day, f.key);
              return v ? `${f.label.toLowerCase()} ${num(v, 1)}` : null;
            })
            .filter(Boolean)
        : [];
      return { ...p, caption: others.length ? `aussi : ${others.join(', ')}` : undefined };
    });
  }, [active, points]);

  // 18 octobre 2026 : une prise fausse se supprime d'un appui, apres confirmation (meme fenetre que les pesees)
  const onHistoryPress = (pt: DetailPoint) => {
    appAlert(traduire('Supprimer cette prise ?'), traduire("Toutes tes mensurations du {0} restent 30 jours dans la corbeille.", formatLongDate(pt.date)), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeasuresOfDay(pt.date);
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            reload();
          } catch (err) {
            logger.error('Suppression des mensurations impossible', err);
            appAlert(traduire('Oups'), traduire('Cette prise n’a pas pu être supprimée. Réessaie.'));
          }
        },
      },
    ]);
  };

  const spec: MetricSpec = { label: active?.long ?? 'Tes mensurations', unit: 'cm', digits: 1, good: active?.good ?? 'none', eps: 0.25, minSpan: 2 };

  const picker = (
    <View style={{ paddingHorizontal: GUTTER, marginTop: 12, gap: 10 }}>
      {screenshotDetected ? (
        <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.accentTint }}>
          <Ink size={13} weight="bold">
            {traduire("Capture d’écran repérée. Tes mesures sont personnelles.")}</Ink>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {fields.map((f) => {
          const on = f.key === active?.key;
          const l = f.all[f.all.length - 1];
          const d = f.all.length > 1 ? l.value - f.all[0].value : null;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                tapSelect();
                setSel(f.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={traduire("{0}, {1} centimètres", f.long, num(l.value, 1))}
              style={{ width: '31.5%', minHeight: 84, padding: 10, borderRadius: 18, backgroundColor: on ? c.ink : blancA(0.78), borderWidth: 1, borderColor: on ? c.ink : c.divider, gap: 2 }}
            >
              <Ink size={12} weight="bold" color={on ? c.onDarkSecondary : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {traduire(f.label)}
              </Ink>
              <Ink size={19} weight="black" tight color={on ? P.paper : c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {num(l.value, 1)}
                <Ink size={12} weight="bold" color={on ? c.onDarkSecondary : c.textSecondary}>
                  {' cm'}
                </Ink>
              </Ink>
              <Ink size={11} weight="bold" color={on ? c.onDarkSecondary : c.textSecondary} numberOfLines={2}>
                {d === null ? traduire('une prise') : cmDelta(d)}
              </Ink>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <MetricDetail
        key={active?.key ?? 'vide'}
        title="Tes mensurations"
        sub={traduire("Une prise par mois suffit pour voir ton corps changer.")}
        picker={fields.length ? picker : null}
        spec={spec}
        points={series}
        color={CHART_COLORS.blue}
        explain={{ text: active ? MEASURE_EXPLAIN[active.key].text : traduire('Le mètre ruban voit ce que la balance ne voit pas, surtout quand tu prends du muscle.'), tip: (active && MEASURE_EXPLAIN[active.key].tip) || MEASURE_TIP }}
        loading={loading}
        defaultPeriod={180}
        markBest={active?.good !== 'none'}
        historyNoun={['prise', 'prises']}
        onHistoryPress={onHistoryPress}
        historyHint={traduire("Une prise fausse ? Appuie dessus pour la supprimer.")}
        bestLabel={active?.good === 'down' ? traduire('le plus fin') : traduire('le plus large')}
        scrubLine={(p) => {
          const last = series[series.length - 1];
          if (!last) return ' ';
          const d = last.value - p.value;
          return Math.abs(d) < 0.25 ? traduire('pareil qu’aujourd’hui') : traduire("{0} aujourd’hui", cmDelta(d));
        }}
        empty={{
          title: traduire('Aucune mesure pour l’instant'),
          text: traduire('Prends tes mesures une fois par mois, le matin. Tes courbes apparaîtront ici dès la deuxième prise.'),
          plusHint: traduire('Prends tes mesures avec le bouton + de la barre d’onglets'),
        }}
      />
      {isBlurred && Platform.OS === 'ios' ? <BlurView style={StyleSheet.absoluteFill} intensity={100} tint="light" /> : null}
    </View>
  );
}
