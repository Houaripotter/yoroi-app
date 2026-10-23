/**
 * Progres, vue d'ensemble (vague 40) : six tuiles sur un rouleau de papier washi, une par facette
 * de ton evolution (poids, composition, mensurations, forme, force, endurance). Chaque tuile ouvre
 * l'onglet qui la detaille. Les chiffres viennent des sources uniques de lib/ (tendance du poids,
 * composition, mensurations, forme du jour, maximum estime, seances du mois).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { tapLight } from './ui';
import { Rouleau } from '../seances/Decor';
import type { Training } from '@/lib/database';
import type { DayWeight } from '@/lib/v2/weightStats';
import { formatKg, weeklyRate } from '@/lib/v2/weightStats';
import type { CompoPoint } from '@/lib/v2/progres/composition';
import type { MeasurePoint } from '@/lib/v2/progres/measures';
import { viewSeries } from '@/lib/v2/progres/measures';
import { computeLifts } from '@/lib/v2/progres/strength';
import { durationOf, formatDuration } from '@/lib/v2/trainingWeek';
import { monthLong, num, sinceText, todayIso } from '@/lib/v2/progres/format';
import { safeComputeForme } from '@/lib/v2/accueil/forme';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import { P } from '@/components/yoroi/livePalette';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type EnsembleCible = 'corps' | 'force' | 'cardio' | 'sante';

type Tuile = { key: string; label: string; value: string; unit?: string; sub: string; cible: EnsembleCible; dot: string };

function TuileVue({ t, onPress, left, top }: { t: Tuile; onPress: () => void; left: boolean; top: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${t.label}, ${t.value}${t.unit ? ` ${t.unit}` : ''}, ${t.sub}`}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 92,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 2,
        borderLeftWidth: left ? 1 : 0,
        borderTopWidth: top ? 1 : 0,
        borderColor: P.washiBord,
        backgroundColor: pressed ? c.fillSoft : 'transparent',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.dot }} />
        <Ink size={12.5} weight="extraBold" color={c.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
          {t.label}
        </Ink>
      </View>
      <Ink size={24} weight="black" tight numberOfLines={1}>
        {t.value}
        {t.unit ? (
          <Ink size={13} weight="black" color={c.textSecondary}>
            {` ${t.unit}`}
          </Ink>
        ) : null}
      </Ink>
      <Ink size={12} color={c.textSecondary} numberOfLines={2}>
        {t.sub}
      </Ink>
    </Pressable>
  );
}

const gramsText = (rate: number) => {
  const g = Math.round((Math.abs(rate) * 1000) / 10) * 10;
  return g >= 1000 ? `${formatKg(g / 1000)} kg` : `${g} g`;
};

export function VueEnsemble({
  series,
  compo,
  measures,
  trainings,
  onOpen,
  style,
}: {
  series: DayWeight[];
  compo: CompoPoint[];
  measures: MeasurePoint[];
  trainings: Training[];
  onOpen: (c: EnsembleCible) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [forme, setForme] = useState<FormeResult | null>(null);
  // 18 octobre 2026 : la tuile Force suit l'unite du reglage (kg ou lb)
  const unite = useUnitePoids();
  useEffect(() => {
    let alive = true;
    safeComputeForme()
      .then((f) => {
        if (alive) setForme(f);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [trainings.length]);

  const today = todayIso();
  const tuiles = useMemo<Tuile[]>(() => {
    const out: Tuile[] = [];
    // Poids : la tendance lissee et son rythme (meme calcul que la carte Poids)
    const last = series[series.length - 1];
    const rate = weeklyRate(series);
    out.push(
      last
        ? { key: 'poids', label: 'Poids', value: formatKg(last.trend), unit: 'kg', sub: rate === null ? 'en tendance' : Math.abs(rate) < 0.03 ? 'stable en tendance' : traduire("{0} de {1} par semaine", gramsText(rate), rate < 0 ? 'moins' : 'plus'), cible: 'corps', dot: '#7A5CF0' }
        : { key: 'poids', label: 'Poids', value: 'À noter', sub: traduire('ta première pesée'), cible: 'corps', dot: '#7A5CF0' },
    );
    // Composition : la derniere masse grasse, le muscle en dessous
    const lc = [...compo].reverse().find((p) => p.fat !== undefined || p.muscle !== undefined);
    out.push(
      lc
        ? {
            key: 'compo',
            label: 'Composition',
            value: lc.fat !== undefined ? num(lc.fat, 1) : num(lc.muscle ?? 0, 1),
            unit: '%',
            sub: lc.fat !== undefined ? traduire("de masse grasse{0}", lc.muscle !== undefined ? `, muscle ${num(lc.muscle, 1)} %` : '') : traduire('de muscle'),
            cible: 'corps',
            dot: '#B08A2E',
          }
        : { key: 'compo', label: 'Composition', value: 'À noter', sub: traduire('graisse, muscle, eau'), cible: 'corps', dot: '#B08A2E' },
    );
    // Mensurations : le tour de taille, sinon la premiere mesure prise
    const taille = viewSeries(measures, 'waist');
    const autre = taille.length ? taille : viewSeries(measures, 'chest');
    if (autre.length) {
      const a = autre[autre.length - 1];
      const d = autre.length > 1 ? a.value - autre[0].value : 0;
      out.push({
        key: 'mesures',
        label: taille.length ? 'Tour de taille' : 'Poitrine',
        value: num(a.value, 1),
        unit: 'cm',
        sub: autre.length < 2 || Math.abs(d) < 0.05 ? traduire('ta dernière mesure') : traduire("{0} cm de {1} {2}", num(Math.abs(d), 1), d < 0 ? 'moins' : 'plus', sinceText(autre[0].date)),
        cible: 'corps',
        dot: c.accent,
      });
    } else out.push({ key: 'mesures', label: 'Mensurations', value: 'À prendre', sub: traduire('une fois par mois'), cible: 'corps', dot: c.accent });
    // Forme du jour (meme calcul que l'accueil)
    out.push(
      forme && forme.score !== null && forme.level
        ? { key: 'forme', label: traduire('Forme'), value: String(Math.round(forme.score)), unit: traduire('sur 100'), sub: forme.level.label, cible: 'sante', dot: '#4F8A5B' }
        : { key: 'forme', label: traduire('Forme'), value: 'À venir', sub: traduire('note ta nuit ou relie ta montre'), cible: 'sante', dot: '#4F8A5B' },
    );
    // Force : l'exercice le plus suivi, son maximum estime
    const lift = computeLifts(trainings)[0];
    const lp = lift?.points[lift.points.length - 1];
    out.push(
      lift && lp
        ? { key: 'force', label: 'Force', value: num(versUnitePoids(lp.value, unite), versUnitePoids(lp.value, unite) >= 100 ? 0 : 1), unit: unite === 'lb' ? 'lb' : 'kg', sub: traduire("{0}, maximum estimé", lift.name), cible: 'force', dot: '#2C4A84' }
        : { key: 'force', label: 'Force', value: 'À venir', sub: traduire('note tes charges'), cible: 'force', dot: '#2C4A84' },
    );
    // Endurance : ton temps d'entrainement du mois, tes kilometres s'il y en a
    const month = today.slice(0, 7);
    const inMonth = trainings.filter((t) => (t.date || '').slice(0, 7) === month);
    const minutes = inMonth.reduce((s, t) => s + durationOf(t), 0);
    const km = inMonth.reduce((s, t) => s + (t.distance || 0), 0);
    out.push({
      key: 'endurance',
      label: 'Endurance',
      value: minutes > 0 ? formatDuration(minutes) : '0 h',
      sub: traduirePluriel(inMonth.length, inMonth.length > 1, "{0} séance en {1}{2}", "{0} séances en {1}{2}", inMonth.length, monthLong(today), km > 0 ? `, ${num(km, 1)} km` : ''),
      cible: 'cardio',
      dot: '#C0573E',
    });
    return out;
  }, [series, compo, measures, trainings, forme, today, c.accent, unite]);

  const rows = [tuiles.slice(0, 2), tuiles.slice(2, 4), tuiles.slice(4, 6)];
  return (
    <Rouleau style={style}>
      <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
        {rows.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row' }}>
            {r.map((t, j) => (
              <TuileVue key={t.key} t={t} left={j === 1} top={i > 0} onPress={() => onOpen(t.cible)} />
            ))}
          </View>
        ))}
      </View>
    </Rouleau>
  );
}
