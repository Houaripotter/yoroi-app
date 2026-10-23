/**
 * Ecran de detail d'une mesure (refonte v2), ouvert d'un appui sur un graphique de Progres :
 * grand graphique au doigt, periode, moyenne, plus bas, plus haut et evolution avec l'unite,
 * explication courte de la donnee et historique des valeurs.
 * Sert au poids, a la composition, aux mensurations et a la force.
 * Vague 33 (poids) : periodes sur mesure (« Mon plan »), ligne sous le grand chiffre (statut), bloc sous la courbe
 * (chemin vers le torii), decimale toujours affichee pour les kilos, historique dit sur la periode.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { InkLineChart } from './InkLineChart';
import type { ChartPoint } from './InkLineChart';
import type { Domaine } from '../accueil/domaines';
import { DetailHeader, EmptyInvite, ExplainCard, GUTTER, LegendMark, SectionHead, StatGrid, tapLight } from './ui';
import { PeriodSwitch, periodPhrase } from '../charts/PeriodSwitch';
import type { PeriodOption } from '../charts/PeriodSwitch';
import { BadgeRecord, RECORD_RED, TropheeRecord } from '../charts/core';
import { capitalize, dayLong, dayShort, daysDiff, num, todayIso } from '@/lib/v2/progres/format';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export type DetailPoint = ChartPoint & { caption?: string };

export type MetricSpec = {
  /** « Masse grasse », affiche au-dessus du grand chiffre */
  label: string;
  /** '%', 'kg', 'cm', 'kcal', 'ans' ou '' */
  unit: string;
  digits: number;
  /** sens qui va dans le bon sens pour toi */
  good: 'up' | 'down' | 'none';
  /** unite des ecarts : « point » pour un pourcentage */
  deltaOne?: string;
  deltaMany?: string;
  /** ecart en dessous duquel on parle de stabilite */
  eps?: number;
  /** ecart minimal de l'echelle du graphique */
  minSpan?: number;
  /** vague 33 : garder la decimale (81,0 kg et non 81 kg) */
  keepZero?: boolean;
};

type Props = {
  title: string;
  sub?: string;
  headerRight?: ReactNode;
  /** choix de la mesure (pastilles), au-dessus du grand chiffre */
  picker?: ReactNode;
  spec: MetricSpec;
  /** toutes les valeurs, de la plus ancienne a la plus recente */
  points: DetailPoint[];
  color: string;
  explain: { text: string; tip?: string };
  loading?: boolean;
  defaultPeriod?: number;
  target?: { value: number; label: string } | null;
  /** graphique sur mesure (le poids et sa tendance) ; sinon la courbe au pinceau */
  renderChart?: (shown: DetailPoint[], onScrub: (p: DetailPoint | null) => void, period: number, setPeriod: (v: number) => void) => ReactNode;
  /** vague 33 : periodes sur mesure (le poids : 1 M a 1 A et « Mon plan ») */
  periods?: PeriodOption[];
  /** vague 33 : les valeurs d'une periode sur mesure (sinon les derniers jours) */
  periodFilter?: (points: DetailPoint[], period: number) => DetailPoint[] | null;
  /** vague 33 : sous le grand chiffre, a cote de l'evolution (pastille de statut) */
  headExtra?: (scrub: DetailPoint | null) => ReactNode;
  /** vague 35 (poids) : a droite du libelle, sur la meme ligne (la pastille de statut) */
  headSide?: (scrub: DetailPoint | null) => ReactNode;
  /** vague 35 (poids) : a cote du grand chiffre, entre parentheses (l'ecart de la periode) ; remplace la ligne d'ecart hors doigt */
  diffBeside?: (diff: number | null, period: number) => ReactNode;
  /** courbe v2 (poids) : une petite ligne discrete juste sous le grand chiffre (ton allure du jour) */
  headNote?: (scrub: DetailPoint | null) => ReactNode;
  /** vague 33 : bloc juste sous la courbe et le choix de periode (chemin vers le torii) */
  afterChart?: ReactNode;
  legend?: ReactNode;
  /** marque d'un tampon rouge la meilleure valeur de la periode */
  markBest?: boolean;
  /** phrase sous le chiffre pendant que le doigt glisse */
  scrubLine?: (p: DetailPoint) => string;
  /** blocs en plus, sous les chiffres (dernier record, boutons) */
  after?: ReactNode;
  /** plusHint : l'ajout passe par le bouton + (pas de bouton concurrent ici) */
  empty: { title: string; text: string; cta?: string; onPress?: () => void; plusHint?: string };
  historyNoun?: [string, string];
  /** NUIT 14 : appui sur une ligne d'historique (le poids : modifier ou supprimer la pesee) */
  onHistoryPress?: (p: DetailPoint) => void;
  /** NUIT 14 : petite ligne d'aide sous l'historique */
  historyHint?: string;
  /** nom du tampon dans la legende (« le plus fin ») */
  bestLabel?: string;
  /** evolution calculee autrement (la tendance du poids plutot que la pesee brute) */
  diffOf?: (shown: DetailPoint[]) => number | null;
  /** precision apres l'evolution (« en tendance ») */
  diffNote?: string;
  /** 16 octobre : couleur du domaine (accueil) ou couleur de courbe choisie dans Reglages ; sinon `color` */
  domaine?: Domaine;
};

export function fmtValue(spec: MetricSpec, v: number): string {
  return `${num(v, spec.digits, !spec.keepZero)}${spec.unit ? ` ${spec.unit}` : ''}`;
}

/** « 6,2 points de moins », « 3 mm de plus », « stable » */
export function deltaPhrase(spec: MetricSpec, d: number): string {
  const eps = spec.eps ?? (spec.digits === 0 ? 0.5 : 0.05);
  const abs = Math.abs(d);
  if (abs < eps) return 'stable';
  const way = d < 0 ? traduire('moins') : 'plus';
  if (spec.unit === 'cm' && abs < 1) return traduire("{0} mm de {1}", Math.round(abs * 10), way);
  const one = spec.deltaOne ?? spec.unit;
  const many = spec.deltaMany ?? spec.unit;
  const u = abs >= 2 ? many : one;
  return traduire("{0}{1} de {2}", num(abs, spec.digits === 0 ? 0 : 1, !spec.keepZero), u ? ` ${u}` : '', way);
}

export function MetricDetail(props: Props) {
  const { title, sub, headerRight, picker, spec, points, color, explain, loading, defaultPeriod = 90, target, renderChart, legend, markBest, scrubLine, after, empty, historyNoun = ['mesure', 'mesures'], onHistoryPress, historyHint, bestLabel, diffOf, diffNote, periods, periodFilter, headExtra, headSide, diffBeside, afterChart, headNote, domaine } = props;
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState(defaultPeriod);
  // courbe v2 : la periode par defaut peut arriver apres coup (« Mon plan » des que ton plan est lu) ; elle s'applique
  // tant que tu n'as pas choisi toi-meme
  const choisi = useRef(false);
  useEffect(() => {
    if (!choisi.current) setPeriod(defaultPeriod);
  }, [defaultPeriod]);
  const choisir = (v: number) => {
    choisi.current = true;
    setPeriod(v);
  };
  const [scrub, setScrub] = useState<DetailPoint | null>(null);
  const [more, setMore] = useState(false);
  const today = todayIso();

  const shown = useMemo(() => {
    const custom = periodFilter ? periodFilter(points, period) : null;
    const base = custom ?? (period ? points.filter((p) => daysDiff(p.date, today) <= period) : points);
    if (!markBest || spec.good === 'none' || base.length < 3) return base;
    const vals = base.map((p) => p.value);
    const best = spec.good === 'down' ? Math.min(...vals) : Math.max(...vals);
    let idx = -1;
    base.forEach((p, i) => {
      if (p.value === best) idx = i;
    });
    return base.map((p, i) => ({ ...p, record: i === idx && i > 0 }));
  }, [points, period, today, markBest, spec.good, periodFilter]);

  if (points.length === 0) {
    if (loading) {
      return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <DetailHeader title={title} right={headerRight} />
          {picker}
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <DetailHeader title={title} right={headerRight} />
        {picker}
        <EmptyInvite style={{ margin: GUTTER }} title={empty.title} text={empty.text} cta={empty.cta} onPress={empty.onPress} plusHint={empty.plusHint} plusArrow={false} />
        <ExplainCard text={explain.text} tip={explain.tip} style={{ marginHorizontal: GUTTER }} />
      </View>
    );
  }

  const last = shown[shown.length - 1];
  const first = shown[0];
  const allLast = points[points.length - 1];
  const vals = shown.map((p) => p.value);
  const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  const diff = diffOf ? (shown.length > 1 ? diffOf(shown) : null) : first && last && shown.length > 1 ? last.value - first.value : null;
  const note = diffNote ? `, ${diffNote}` : '';
  const goodWay = diff !== null && Math.abs(diff) >= (spec.eps ?? (spec.digits === 0 ? 0.5 : 0.05)) && ((spec.good === 'down' && diff < 0) || (spec.good === 'up' && diff > 0));
  const head = scrub ?? last ?? allLast;
  const evoWords = diff === null ? null : deltaPhrase(spec, diff);
  // Vague 31 : en kg la tuile dit « 4,6 kg » comme ses voisines (pas « 4,6 kilos »), libelle avec majuscule comme les autres tuiles
  const evoValue = diff === null ? traduire('Bientôt') : evoWords === 'stable' ? 'Stable' : spec.unit === 'kg' ? fmtValue(spec, Math.abs(diff)) : evoWords!.replace(/ de (moins|plus)$/, '');
  const evoLabel = diff === null ? traduire('dès la deuxième mesure') : evoWords === 'stable' ? capitalize(periodPhrase(period)) : `En ${diff < 0 ? traduire('moins') : 'plus'} ${periodPhrase(period)}`;

  const history = [...shown].reverse();
  const histShown = more ? history : history.slice(0, 12);
  const thisYear = today.slice(0, 4);

  const chart = renderChart ? (
    renderChart(shown, setScrub, period, (v) => {
      choisir(v);
      setScrub(null);
    })
  ) : (
    <InkLineChart
      points={shown}
      color={color}
      domaine={domaine}
      suitStyle
      height={260}
      digits={spec.digits === 0 ? 0 : 1}
      minSpan={spec.minSpan ?? (spec.unit === 'kcal' ? 40 : spec.digits === 0 ? 2 : 1)}
      target={target}
      onScrub={(p) => setScrub(p as DetailPoint | null)}
      label={`${spec.label}, ${evoWords ?? traduire('une seule mesure')}`}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <DetailHeader title={title} sub={sub} right={headerRight} />
        {picker}

        <View style={{ paddingHorizontal: GUTTER, marginTop: 18, minHeight: 104, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: headSide ? 24 : undefined }}>
            <Ink size={14} weight="bold" color={c.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
              {scrub ? capitalize(dayLong(scrub.date)) : spec.label}
            </Ink>
            {headSide ? headSide(scrub) : null}
          </View>
          {head ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Ink size={52} weight="black" tight numberOfLines={1} style={diffBeside ? { flexShrink: 0 } : undefined}>
                {num(head.value, spec.digits, !spec.keepZero)}
                {spec.unit ? <Ink size={20} weight="black" color={c.textSecondary}>{` ${spec.unit}`}</Ink> : null}
              </Ink>
              {diffBeside && !scrub ? <View style={{ flexShrink: 1 }}>{diffBeside(diff, period)}</View> : null}
            </View>
          ) : null}
          {headNote ? headNote(scrub) : null}
          {diffBeside && !scrub && !headExtra ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {scrub?.record ? <BadgeRecord /> : null}
          {headExtra ? headExtra(scrub) : null}
          <Ink size={15} weight="bold" color={scrub ? c.ink : goodWay ? c.successText : c.ink} numberOfLines={2} style={{ flexShrink: 1 }}>
            {scrub
              ? scrubLine
                ? scrubLine(scrub)
                : scrub.caption ?? ' '
              : diff === null
                ? shown.length === 1
                  ? traduire('Une seule mesure sur la période')
                  : traduire('Aucune mesure sur la période')
                : evoWords === 'stable'
                  ? traduire("stable depuis le {0}{1}", dayShort(first.date), note)
                  : traduire("{0} depuis le {1}{2}", evoWords, dayShort(first.date), note)}
          </Ink>
          </View>
          )}
        </View>

        {shown.length > 0 ? (
          <View style={{ paddingHorizontal: renderChart ? 0 : 8, marginTop: 10 }}>{chart}</View>
        ) : (
          <View style={{ marginHorizontal: GUTTER, marginTop: 14, padding: 18, borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
            <Ink size={14} color={c.textSecondary}>
              {allLast ? traduire("Aucune mesure {0}. La dernière date du {1} : élargis la période pour la revoir.", periodPhrase(period), dayShort(allLast.date, allLast.date.slice(0, 4) !== thisYear)) : traduire("Aucune mesure {0}.", periodPhrase(period))}
            </Ink>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: GUTTER, marginTop: 10, flexWrap: 'wrap' }}>
          {legend ?? (
            <>
              <LegendMark kind="line" color={color} label={spec.label.toLowerCase()} />
              {shown.some((p) => p.record) ? <LegendMark kind="seal" color={RECORD_RED} label={bestLabel ?? (spec.good === 'down' ? traduire('ton plus bas') : traduire('ton meilleur'))} /> : null}
            </>
          )}
        </View>

        <PeriodSwitch
          options={periods}
          value={period}
          onChange={(v) => {
            choisir(v);
            setScrub(null);
          }}
          style={{ marginHorizontal: GUTTER, marginTop: 16 }}
        />
        <Ink size={12} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 8 }}>
          {traduire("Glisse ton doigt sur la courbe pour revoir chaque valeur.")}</Ink>

        {afterChart}

        {vals.length > 0 && avg !== null ? (
          <StatGrid
            style={{ marginHorizontal: GUTTER, marginTop: 20 }}
            items={[
              { value: fmtValue(spec, avg), label: `Moyenne ${periodPhrase(period)}` },
              { value: evoValue, label: evoLabel, tone: goodWay ? c.successText : undefined },
              { value: fmtValue(spec, Math.min(...vals)), label: traduire('Le plus bas') },
              { value: fmtValue(spec, Math.max(...vals)), label: traduire('Le plus haut') },
            ]}
          />
        ) : null}

        {after}

        <ExplainCard text={explain.text} tip={explain.tip} style={{ marginHorizontal: GUTTER, marginTop: 22 }} />

        {history.length > 0 ? (
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <SectionHead title={traduire("Historique")} aside={`${history.length} ${history.length > 1 ? historyNoun[1] : historyNoun[0]} ${periodPhrase(period)}`} />
            <View style={{ marginTop: 10, borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
              {histShown.map((p, i) => {
                const prev = history[i + 1];
                const d = prev ? p.value - prev.value : null;
                const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, minHeight: 58, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: c.divider, gap: 10 };
                const Row = onHistoryPress ? Pressable : View;
                const rowProps = onHistoryPress
                  ? {
                      onPress: () => {
                        tapLight();
                        onHistoryPress(p);
                      },
                      accessibilityRole: 'button' as const,
                      accessibilityLabel: traduire("{0}, {1}, modifier ou supprimer", dayShort(p.date, p.date.slice(0, 4) !== thisYear), fmtValue(spec, p.value)),
                      style: ({ pressed }: { pressed: boolean }) => [rowStyle, pressed ? { backgroundColor: c.fillSoft } : null],
                    }
                  : { style: rowStyle };
                return (
                  <Row key={`${p.date}${i}`} {...(rowProps as any)}>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={15} weight="bold">
                        {dayShort(p.date, p.date.slice(0, 4) !== thisYear)}
                      </Ink>
                      {p.caption ? (
                        <Ink size={12} color={c.textSecondary} numberOfLines={2}>
                          {p.caption}
                        </Ink>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {p.record ? (
                          <View accessible accessibilityLabel={traduire("Record")}>
                            <TropheeRecord size={18} />
                          </View>
                        ) : null}
                        <Ink size={17} weight="black">
                          {fmtValue(spec, p.value)}
                        </Ink>
                      </View>
                      {d !== null ? (
                        <Ink size={12} color={c.textSecondary}>
                          {deltaPhrase(spec, d)}
                        </Ink>
                      ) : null}
                    </View>
                  </Row>
                );
              })}
            </View>
            {historyHint ? (
              <Ink size={13} color={c.textSecondary} style={{ marginTop: 10 }}>
                {historyHint}
              </Ink>
            ) : null}
            {history.length > histShown.length ? (
              <Pressable
                onPress={() => {
                  tapLight();
                  setMore(true);
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({ marginTop: 10, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : 'transparent', borderWidth: 1, borderColor: c.border })}
              >
                <Ink size={14} weight="extraBold">
                  {traduire("Voir les {0} autres", history.length - histShown.length)}
                </Ink>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
