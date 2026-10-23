/**
 * Vue de composition du corps (refonte v2) : la mesure d'une pesee, sa tendance,
 * la barre muscle, graisse, os, puis la liste des biomarqueurs avec ecart,
 * statut et jauge quand un repere fiable existe (voir lib/v2/progres/biomarkers.ts).
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { Chevron, tapLight, tapSelect } from './ui';
import { CHART_COLORS, CHART_MOSS, Sparkline as CoreSparkline } from '../charts/core';
import { CORPS } from '@/lib/v2/progres/couleursCorps';
import type { CompoPoint } from '@/lib/v2/progres/composition';
import { compositionBar, gaugePos } from '@/lib/v2/progres/biomarkers';
import type { BarPart, BioKey, BioList, BioRange, BioRow, KeyMass, StatusWord, Trend } from '@/lib/v2/progres/biomarkers';
import { capitalize, dayLong, num, todayIso } from '@/lib/v2/progres/format';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

/** Teintes des statuts : jamais le rouge, reserve aux records et aux erreurs */
const GOLD_TEXT = '#86671F';
export function statusTone(s: StatusWord, successText: string): { fg: string; bar: string; bg: string } {
  if (s === 'Bas') return { fg: CHART_COLORS.blue, bar: CHART_COLORS.blue, bg: 'rgba(61,93,158,0.12)' };
  if (s === 'Normal') return { fg: successText, bar: CHART_MOSS, bg: 'rgba(95,127,51,0.13)' };
  return { fg: GOLD_TEXT, bar: CHART_COLORS.gold, bg: 'rgba(168,131,47,0.15)' };
}

export function partColor(k: BarPart['key'], c: { textMuted: string; fillSubtle: string }): string {
  // vague 45 : couleurs de lib/v2/progres/couleursCorps.ts
  if (k === 'muscle' || k === 'lean') return CORPS.muscle;
  if (k === 'fat') return CORPS.graisse;
  if (k === 'bone') return CORPS.os;
  return c.fillSubtle;
}

export function StatusPill({ status }: { status: StatusWord }) {
  const { theme } = useYoroiTheme();
  const t = statusTone(status, theme.colors.successText);
  return (
    <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ink size={12} weight="extraBold" color={t.fg} numberOfLines={1}>
        {status}
      </Ink>
    </View>
  );
}

/** Jauge a segments egaux (bas, normal, eleve), curseur sur la valeur, seuils sous les jonctions */
export function Gauge({ range, value, style }: { range: BioRange; value: number; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [w, setW] = useState(0);
  const n = range.segments.length;
  const pos = gaugePos(range, value);
  const active = range.segments.findIndex((s, i) => value < s.to || i === n - 1);
  return (
    <View style={style} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={traduire("Repère : {0}", range.segments.map((s) => s.status.toLowerCase()).join(', '))}>
      <View style={{ height: 18, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {range.segments.map((s, i) => (
            <View key={s.status} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: statusTone(s.status, c.successText).bar, opacity: i === active ? 1 : 0.28 }} />
          ))}
        </View>
        {w > 0 ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: Math.min(w - 16, Math.max(0, pos * w - 8)), width: 16, height: 16, borderRadius: 8, backgroundColor: c.ink, borderWidth: 3, borderColor: P.white, shadowColor: '#1D2029', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}
          />
        ) : null}
      </View>
      {w > 0 ? (
        <View style={{ height: 16, marginTop: 2 }}>
          {range.segments.slice(0, -1).map((s, i) => (
            <Ink key={s.status} size={11} weight="bold" color={c.textMuted} style={{ position: 'absolute', left: ((i + 1) / n) * w - 22, width: 44, textAlign: 'center' }}>
              {num(s.to, s.to % 1 ? 1 : 0)}
            </Ink>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Une ligne de biomarqueur : nom, valeur, ecart, statut et jauge */
export function BioRowView({ row, onPress, first }: { row: BioRow; onPress?: () => void; first?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const body = (
    <View style={{ paddingVertical: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold" numberOfLines={2}>
            {row.label}
          </Ink>
          {row.sub ? (
            <Ink size={12} color={c.textSecondary} numberOfLines={2}>
              {row.sub}
            </Ink>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: '52%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Ink size={22} weight="black" tight numberOfLines={1}>
              {row.value}
            </Ink>
            {row.unit ? (
              <Ink size={13} weight="bold" color={c.textSecondary}>
                {row.unit}
              </Ink>
            ) : null}
            {onPress ? <Chevron color={c.textMuted} size={12} /> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 26 }}>
        <Ink size={13} weight="bold" color={row.deltaGood ? c.successText : c.textSecondary} style={{ flex: 1 }} numberOfLines={2}>
          {row.delta ? capitalize(row.delta) : traduire('Première mesure')}
        </Ink>
        {row.status ? <StatusPill status={row.status} /> : null}
      </View>
      {row.range ? <Gauge range={row.range} value={row.raw} style={{ marginTop: 2 }} /> : null}
    </View>
  );
  const wrap = { borderTopWidth: first ? 0 : 1, borderColor: c.divider, paddingHorizontal: 16 };
  if (!onPress) return <View style={wrap}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire("{0}, {1}{2}{3}, voir le détail", row.label, row.value, row.unit ? ` ${row.unit}` : '', row.status ? `, ${row.status.toLowerCase()}` : '')}
      style={({ pressed }) => [wrap, { backgroundColor: pressed ? c.fillSoft : 'transparent' }]}
    >
      {body}
    </Pressable>
  );
}

/** La liste « Tes biomarqueurs » dans une carte en verre */
export function BioListCard({
  list,
  onPressRow,
  onAddMissing,
  onAddHeight,
  style,
}: {
  list: BioList;
  onPressRow?: (k: BioKey) => void;
  onAddMissing?: () => void;
  onAddHeight?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const hasStatus = list.rows.some((r) => r.status);
  const fatWithout = list.rows.some((r) => r.key === 'fat' && !r.status);
  return (
    <View style={style}>
      <View style={{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
        {list.rows.map((r, i) => (
          <BioRowView key={r.key} row={r} first={i === 0} onPress={onPressRow ? () => onPressRow(r.key) : undefined} />
        ))}
        {list.needHeight ? (
          <Pressable
            onPress={onAddHeight}
            disabled={!onAddHeight}
            accessibilityRole="button"
            accessibilityLabel={traduire("Ajouter ta taille pour calculer ton IMC")}
            style={({ pressed }) => ({ borderTopWidth: list.rows.length ? 1 : 0, borderColor: c.divider, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="extraBold">
                {traduire("IMC")}</Ink>
              <Ink size={12} color={c.textSecondary}>
                {traduire("Ajoute ta taille dans ton profil pour le calculer.")}</Ink>
            </View>
            <Ink size={13} weight="extraBold" color={c.accent}>
              {traduire("Ajouter")}</Ink>
          </Pressable>
        ) : null}
        {list.missing.length ? (
          <Pressable
            onPress={onAddMissing}
            disabled={!onAddMissing}
            accessibilityRole="button"
            accessibilityLabel={traduire("Ajouter les mesures manquantes")}
            style={({ pressed }) => ({ borderTopWidth: list.rows.length || list.needHeight ? 1 : 0, borderColor: c.divider, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={14} weight="extraBold" color={c.textSecondary}>
                {traduire("À saisir")}</Ink>
              <Ink size={12} color={c.textSecondary}>
                {capitalize(list.missing.join(', '))}
              </Ink>
            </View>
            {onAddMissing ? <Chevron color={c.accent} size={12} /> : null}
          </Pressable>
        ) : null}
      </View>
      {hasStatus ? (
        <Ink size={12} color={c.textSecondary} style={{ marginTop: 8 }}>
          {traduire("Statut affiché seulement quand un repère reconnu existe : OMS pour l’IMC, Gallagher 2000 selon ton sexe et ton âge pour la masse grasse, Tanita pour l’eau et la graisse viscérale. Ta balance donne une estimation.")}</Ink>
      ) : null}
      {fatWithout ? (
        <Ink size={12} color={c.textSecondary} style={{ marginTop: 6 }} onPress={onAddHeight} suppressHighlighting>
          {traduire("Pour situer ta masse grasse, renseigne ton sexe et ta date de naissance dans ton profil.")}</Ink>
      ) : null}
    </View>
  );
}

/** Barre empilee muscle, graisse, os, et la part d'eau a part (elle se superpose aux autres) */
export function CompositionBar({ point, style }: { point: CompoPoint; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const parts = compositionBar(point);
  if (!parts.length && !point.water) return null;
  return (
    <View style={style}>
      {parts.length ? (
        <>
          <View
            style={{ flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: c.fillSubtle, gap: 2 }}
            accessible
            accessibilityLabel={parts.map((p) => `${p.label} ${num(p.pct, 1)} %`).join(', ')}
          >
            {parts.map((p) => (
              <View key={p.key} style={{ flex: p.pct, backgroundColor: partColor(p.key, c) }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 10 }}>
            {parts
              .filter((p) => p.key !== 'other')
              .map((p) => (
                <View key={p.key} style={{ width: '33.33%', gap: 2, paddingRight: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: partColor(p.key, c) }} />
                    <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ flexShrink: 1 }}>
                      {p.label}
                    </Ink>
                  </View>
                  <Ink size={19} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {`${num(p.pct, 1)} %`}
                  </Ink>
                </View>
              ))}
          </View>
        </>
      ) : null}
      {point.water ? (
        <View style={{ marginTop: parts.length ? 16 : 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: CORPS.eau }} />
              <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ flexShrink: 1 }}>
                {traduire("Eau, présente dans les muscles et les organes")}</Ink>
            </View>
            <Ink size={15} weight="black" numberOfLines={1} style={{ flexShrink: 0 }}>{`${num(point.water, 1)}\u00A0%`}</Ink>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, point.water)}%`, height: 8, borderRadius: 4, backgroundColor: CORPS.eau }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Carte d'une mesure : date, tendance honnete, barre de composition */
export function CompositionCard({ point, trend, onPress, showDate = true, style }: { point: CompoPoint; trend: Trend | null; onPress?: () => void; showDate?: boolean; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const thisYear = todayIso().slice(0, 4);
  const content = (
    <View style={{ padding: 18, gap: 14 }}>
      <View style={{ gap: 4 }}>
        {showDate ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ink size={13} weight="bold" color={c.textSecondary} style={{ flex: 1 }} numberOfLines={2}>
              {`${capitalize(dayLong(point.date))}${point.date.slice(0, 4) !== thisYear ? ` ${point.date.slice(0, 4)}` : ''}${point.weight ? `, ${num(point.weight, 1)} kg` : ''}`}
            </Ink>
            {onPress ? <Chevron color={c.accent} size={12} /> : null}
          </View>
        ) : null}
        {trend ? (
          <>
            <Ink size={22} weight="black" tight>
              {trend.title}
            </Ink>
            <Ink size={13} color={c.textSecondary}>
              {trend.text}
            </Ink>
          </>
        ) : null}
      </View>
      <CompositionBar point={point} />
    </View>
  );
  const base: ViewStyle = { borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider };
  if (!onPress) return <View style={[base, style]}>{content}</View>;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire("{0}, voir chaque mesure", trend?.title ?? 'Composition')}
      style={({ pressed }) => [base, style, pressed ? { backgroundColor: c.fillSoft } : null]}
    >
      {content}
    </Pressable>
  );
}

function NavButton({ dir, disabled, onPress }: { dir: 'left' | 'right'; disabled: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tapSelect();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={dir === 'left' ? traduire('Mesure précédente') : traduire('Mesure suivante')}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : P.carte, borderWidth: 1, borderColor: c.divider, opacity: disabled ? 0.3 : 1 })}
    >
      <Chevron color={c.ink} size={16} dir={dir} />
    </Pressable>
  );
}

/** Date de la mesure et fleches pour passer d'une pesee a l'autre */
export function MeasureNav({ date, index, total, caption, onPrev, onNext, style }: { date: string; index: number; total: number; caption?: string; onPrev: () => void; onNext: () => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const thisYear = todayIso().slice(0, 4);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <NavButton dir="left" disabled={index <= 0} onPress={onPrev} />
      <View style={{ flex: 1, alignItems: 'center', gap: 2 }} accessible accessibilityLabel={traduire("Mesure du {0}, {1} sur {2}", dayLong(date), index + 1, total)}>
        <Ink size={17} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {`${capitalize(dayLong(date))}${date.slice(0, 4) !== thisYear ? ` ${date.slice(0, 4)}` : ''}`}
        </Ink>
        <Ink size={12} color={c.textSecondary} numberOfLines={2} style={{ textAlign: 'center' }}>
          {traduire("Mesure {0} sur {1}{2}", index + 1, total, caption ? `, ${caption}` : '')}
        </Ink>
      </View>
      <NavButton dir="right" disabled={index >= total - 1} onPress={onNext} />
    </View>
  );
}

/** Petite courbe des dernieres mesures (la mini courbe commune : trait fin, lavis, point final avec halo) */
function Spark({ values, color }: { values: number[]; color: string }) {
  const [w, setW] = useState(0);
  const h = 34;
  return (
    <View style={{ height: h }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && values.length >= 2 ? <CoreSparkline values={values} color={color} width={w} height={h} minSpan={0.6} /> : null}
    </View>
  );
}

/** Deux cartes cote a cote : masse musculaire et masse grasse en kg, ecart et petite courbe */
export function KeyMassCards({ masses, onPress, style }: { masses: KeyMass[]; onPress?: (k: KeyMass['key']) => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (!masses.length) return null;
  return (
    <View style={[{ flexDirection: 'row', gap: 10 }, style]}>
      {masses.map((m) => {
        const color = m.key === 'muscleKg' ? CORPS.muscle : CORPS.graisse;
        const stable = m.diff !== undefined && Math.abs(m.diff) < 0.05;
        const good = m.diff !== undefined && !stable && ((m.good === 'up' && m.diff > 0) || (m.good === 'down' && m.diff < 0));
        const deltaText = m.diff === undefined ? traduire('Première mesure') : stable ? 'Stable' : `${m.diff > 0 ? '+' : '-'}${num(Math.abs(m.diff), 1)} kg`;
        const body = (
          <View style={{ padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
              <Ink size={13} weight="extraBold" numberOfLines={2} style={{ flex: 1 }}>
                {m.label}
              </Ink>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <Ink size={26} weight="black" tight numberOfLines={1} style={{ flexShrink: 1 }}>
                {num(m.kg, 1)}
              </Ink>
              <Ink size={13} weight="bold" color={c.textSecondary}>
                kg
              </Ink>
            </View>
            <Ink size={12} weight="bold" color={good ? c.successText : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {`${deltaText}${m.pct ? `, ${num(m.pct, 1)} %` : ''}`}
            </Ink>
            {m.spark.length >= 2 ? <Spark values={m.spark} color={color} /> : <View style={{ height: 34, justifyContent: 'center' }}><Ink size={11} color={c.textMuted} numberOfLines={2}>{traduire("La courbe vient avec la mesure suivante.")}</Ink></View>}
            {m.status ? (
              <View style={{ alignSelf: 'flex-start' }}>
                <StatusPill status={m.status} />
              </View>
            ) : null}
          </View>
        );
        const base: ViewStyle = { flex: 1, borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' };
        if (!onPress) return <View key={m.key} style={base}>{body}</View>;
        return (
          <Pressable
            key={m.key}
            onPress={() => {
              tapLight();
              onPress(m.key);
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("{0}, {1} kilos, {2}, voir la courbe", m.label, num(m.kg, 1), deltaText)}
            style={({ pressed }) => [base, pressed ? { backgroundColor: c.fillSoft } : null]}
          >
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}
