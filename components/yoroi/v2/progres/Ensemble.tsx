/**
 * Progres, vue d'ensemble (vague 40) : six tuiles sur un rouleau de papier washi, une par facette
 * de ton evolution (poids, composition, mensurations, forme, force, endurance). Chaque tuile ouvre
 * l'onglet qui la detaille. Les chiffres viennent des sources uniques de lib/ (tendance du poids,
 * composition, mensurations, forme du jour, maximum estime, seances du mois).
 * 27 octobre 2026 (maquette Pastel-Progres) : plus de rouleau washi. Ton poids dans une carte blanche (le chiffre, le
 * rythme dans une pastille menthe, tes 10 dernieres semaines en barres), puis les autres facettes en cartes pastel
 * deux par deux (composition creme, mensurations bleu, forme menthe, force peche, endurance lilas).
 * Avant : _archive_ancien_design_2026-10-09/refonte_phase2_2026-10-27.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { tapLight } from './ui';
import { couleursTuile } from '../seances/WeekHero';
import { ombreCarte } from '../accueil/kit';
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
import { P, paletteSombre } from '@/components/yoroi/livePalette';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type EnsembleCible = 'corps' | 'force' | 'cardio' | 'sante';

type Tuile = { key: string; label: string; value: string; unit?: string; sub: string; cible: EnsembleCible; dot: string };
type TeinteVue = 'creme' | 'bleu' | 'peche' | 'menthe' | 'lilas';
const TEINTE_DE: Record<string, TeinteVue> = { compo: 'creme', mesures: 'bleu', forme: 'menthe', force: 'peche', endurance: 'lilas' };
function couleursVue(t: TeinteVue): { fond: string; texte: string } {
  if (t === 'lilas') return paletteSombre() ? { fond: '#2E2433', texte: '#D9A3CC' } : { fond: '#EFE6F3', texte: '#8A3F78' };
  return couleursTuile(t);
}

/** Une facette en carte pastel (maquette) : son nom en couleur, le chiffre en grand, la phrase dessous */
function TuileVue({ t, onPress }: { t: Tuile; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const col = couleursVue(TEINTE_DE[t.key] ?? 'bleu');
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${traduire(t.label)}, ${t.value}${t.unit ? ` ${t.unit}` : ''}, ${traduire(t.sub)}`}
      style={({ pressed }) => ({ flex: 1, minHeight: 92, paddingHorizontal: 14, paddingVertical: 12, gap: 1, borderRadius: 22, backgroundColor: col.fond, opacity: pressed ? 0.85 : 1 })}
    >
      <Ink size={12.5} weight="extraBold" color={col.texte} numberOfLines={1}>
        {traduire(t.label)}
      </Ink>
      <Ink size={24} weight="black" tight color={c.ink} numberOfLines={1} style={{ letterSpacing: -0.5 }}>
        {t.value}
        {t.unit ? (
          <Ink size={13} weight="black" color={c.ink}>
            {` ${t.unit}`}
          </Ink>
        ) : null}
      </Ink>
      <Ink size={11.5} weight="bold" color={col.texte} numberOfLines={2} style={{ lineHeight: 15 }}>
        {traduire(t.sub)}
      </Ink>
    </Pressable>
  );
}

/** Tes 10 dernieres semaines de poids (tendance de fin de semaine), en barres ; la derniere en bleu vif */
function BarresPoids({ series }: { series: DayWeight[] }) {
  const semaines = useMemo(() => {
    const parSemaine = new Map<string, number>();
    for (const p of series) {
      const d = new Date(`${p.date.slice(0, 10)}T12:00:00`);
      const lundi = new Date(d);
      lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      parSemaine.set(lundi.toISOString().slice(0, 10), p.trend);
    }
    return [...parSemaine.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-10).map((e) => e[1]);
  }, [series]);
  if (semaines.length < 2) return null;
  const min = Math.min(...semaines);
  const max = Math.max(...semaines);
  const ecart = Math.max(0.3, max - min);
  return (
    <View style={{ height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {semaines.map((v, i) => (
        <View key={i} style={{ flex: 1, height: `${Math.round(30 + (70 * (v - min)) / ecart)}%`, borderRadius: 8, backgroundColor: i === semaines.length - 1 ? P.detail : P.primary }} />
      ))}
    </View>
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
        ? { key: 'poids', label: 'Poids', value: formatKg(last.trend), unit: 'kg', sub: rate === null ? 'en tendance' : Math.abs(rate) < 0.03 ? 'stable en tendance' : rate < 0 ? traduire("{0} de moins par semaine", gramsText(rate)) : traduire("{0} de plus par semaine", gramsText(rate)), cible: 'corps', dot: '#7A5CF0' }
        : { key: 'poids', label: 'Poids', value: traduire('À noter'), sub: traduire('ta première pesée'), cible: 'corps', dot: '#7A5CF0' },
    );
    // Composition : la derniere masse grasse, le muscle en dessous
    const lc = [...compo].reverse().find((p) => p.fat !== undefined || p.muscle !== undefined);
    out.push(
      lc
        ? {
            key: 'compo',
            label: traduire('Composition'),
            value: lc.fat !== undefined ? num(lc.fat, 1) : num(lc.muscle ?? 0, 1),
            unit: '%',
            sub: lc.fat !== undefined ? traduire("de masse grasse{0}", lc.muscle !== undefined ? traduire(", muscle {0} %", num(lc.muscle, 1)) : '') : traduire('de muscle'),
            cible: 'corps',
            dot: '#B08A2E',
          }
        : { key: 'compo', label: traduire('Composition'), value: traduire('À noter'), sub: traduire('graisse, muscle, eau'), cible: 'corps', dot: '#B08A2E' },
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
        sub: autre.length < 2 || Math.abs(d) < 0.05 ? traduire('ta dernière mesure') : d < 0 ? traduire("{0} cm de moins {1}", num(Math.abs(d), 1), sinceText(autre[0].date)) : traduire("{0} cm de plus {1}", num(Math.abs(d), 1), sinceText(autre[0].date)),
        cible: 'corps',
        dot: c.accent,
      });
    } else out.push({ key: 'mesures', label: traduire('Mensurations'), value: traduire('À prendre'), sub: traduire('une fois par mois'), cible: 'corps', dot: c.accent });
    // Forme du jour (meme calcul que l'accueil)
    out.push(
      forme && forme.score !== null && forme.level
        ? { key: 'forme', label: traduire('Forme'), value: String(Math.round(forme.score)), unit: traduire('sur 100'), sub: forme.level.label, cible: 'sante', dot: '#4F8A5B' }
        : { key: 'forme', label: traduire('Forme'), value: traduire('À venir'), sub: traduire('note ta nuit ou relie ta montre'), cible: 'sante', dot: '#4F8A5B' },
    );
    // Force : l'exercice le plus suivi, son maximum estime
    const lift = computeLifts(trainings)[0];
    const lp = lift?.points[lift.points.length - 1];
    out.push(
      lift && lp
        ? { key: 'force', label: 'Force', value: num(versUnitePoids(lp.value, unite), versUnitePoids(lp.value, unite) >= 100 ? 0 : 1), unit: unite === 'lb' ? 'lb' : 'kg', sub: traduire("{0}, maximum estimé", lift.name), cible: 'force', dot: '#2C4A84' }
        : { key: 'force', label: 'Force', value: traduire('À venir'), sub: traduire('note tes charges'), cible: 'force', dot: '#2C4A84' },
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

  const poids = tuiles[0];
  const autres = tuiles.slice(1);
  const rows: Tuile[][] = [];
  for (let k = 0; k < autres.length; k += 2) rows.push(autres.slice(k, k + 2));
  const menthe = couleursTuile('menthe');
  return (
    <View style={[{ gap: 10 }, style]}>
      <Pressable
        onPress={() => {
          tapLight();
          onOpen(poids.cible);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${traduire(poids.label)}, ${poids.value}${poids.unit ? ` ${poids.unit}` : ''}, ${traduire(poids.sub)}`}
        style={({ pressed }) => [{ borderRadius: 24, backgroundColor: P.white, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10, opacity: pressed ? 0.92 : 1 }, ombreCarte]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flexShrink: 1 }}>
            <Ink size={12.5} weight="extraBold" color={c.accentText}>{traduire(poids.label)}</Ink>
            <Ink size={30} weight="black" tight numberOfLines={1} style={{ letterSpacing: -0.8 }}>
              {poids.value}
              {poids.unit ? <Ink size={14} weight="black">{` ${poids.unit}`}</Ink> : null}
            </Ink>
          </View>
          <View style={{ flexShrink: 1, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: menthe.fond, marginBottom: 4 }}>
            <Ink size={12} weight="black" color={menthe.texte} numberOfLines={2}>{traduire(poids.sub)}</Ink>
          </View>
        </View>
        <BarresPoids series={series} />
      </Pressable>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          {r.map((t) => (
            <TuileVue key={t.key} t={t} onPress={() => onOpen(t.cible)} />
          ))}
        </View>
      ))}
    </View>
  );
}
