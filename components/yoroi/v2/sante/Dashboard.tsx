/**
 * Morceaux du tableau de bord Sante : carte des anneaux, semaine, conseils,
 * grille de mesures par famille, mesures en attente, seances de la montre, objectifs.
 */
import React, { useState } from 'react';
import { formatDuration } from '@/lib/v2/trainingWeek';
import { FamilyIcon } from '@/components/yoroi/v2/sante/familyIcon';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Press } from '@/components/yoroi/v2/accueil/kit';
import { Sheet } from '@/components/yoroi/v2/seances/ui';
import { FAMILY, FAMILY_ORDER } from '@/lib/v2/sante/metrics';
import type { Family, MetricDef, MetricKey } from '@/lib/v2/sante/metrics';
import { dateOf, thousands } from '@/lib/v2/progres/format';
import type { DayPoint } from '@/lib/v2/sante/stats';
import type { HealthWorkout, RingGoals, Rings, WeekRing } from '@/lib/v2/sante/data';
import type { Insight } from '@/components/health-charts/InsightCard';
import { ActivityRings, MiniRings, RingLegend } from './Rings';
import type { RingItem } from './Rings';
import { MetricCard } from './MetricCard';
import { IconDot, METRIC_ICON, SanteIcon } from './SanteIcon';
import { GlassBox, S, SmallButton } from './ui';
import { P } from '@/components/yoroi/livePalette';

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function ringItems(r: Rings | null, g: RingGoals): RingItem[] {
  const items: RingItem[] = [{ key: 'move', label: 'Bouger', value: r?.move ?? null, goal: g.move, unit: 'kcal' }];
  if (!r || r.hasExercise) items.push({ key: 'exercise', label: 'Exercice', value: r?.exercise ?? null, goal: g.exercise, unit: 'min' });
  if (r?.hasStand) items.push({ key: 'stand', label: 'Debout', value: r?.stand ?? null, goal: g.stand, unit: 'h' });
  return items;
}

export function RingsCard({ rings, goals, week, onEditGoals }: { rings: Rings | null; goals: RingGoals; week: WeekRing[]; onEditGoals: () => void }) {
  const items = ringItems(rings, goals);
  const hasStand = !!rings?.hasStand;
  return (
    <GlassBox style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ActivityRings items={items} size={160} />
        <RingLegend items={items} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: S.line2 }}>
        {week.map((d, i) => {
          const isToday = i === week.length - 1;
          return (
            <View key={d.date} style={{ alignItems: 'center', gap: 4 }} accessibilityLabel={`${d.date} : ${thousands(d.move)} kilocalories actives`}>
              <MiniRings move={goals.move ? d.move / goals.move : 0} exercise={goals.exercise ? d.exercise / goals.exercise : 0} stand={goals.stand ? d.stand / goals.stand : 0} hasStand={hasStand} size={32} />
              <Ink size={11} weight={isToday ? 'black' : 'bold'} color={isToday ? S.ink : S.muted}>
                {DAY_LETTERS[dateOf(d.date).getDay()]}
              </Ink>
            </View>
          );
        })}
      </View>
      <Press onPress={onEditGoals} accessibilityRole="button" accessibilityLabel="Modifier mes objectifs du jour">
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <SanteIcon name="spark" size={15} color={S.accent} />
          <Ink size={13} weight="extraBold" color={S.accent}>
            Ajuster mes objectifs
          </Ink>
        </View>
      </Press>
    </GlassBox>
  );
}

function Stepper({ label, value, unit, step, min, max, onChange }: { label: string; value: number; unit: string; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = (sign: 1 | -1) => (
    <Press onPress={() => onChange(Math.max(min, Math.min(max, value + sign * step)))} accessibilityRole="button" accessibilityLabel={`${sign > 0 ? 'Plus' : 'Moins'} ${step} ${unit}`}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, alignItems: 'center', justifyContent: 'center' }}>
        <Ink size={24} weight="black">
          {sign > 0 ? '+' : '−'}
        </Ink>
      </View>
    </Press>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <Ink size={13} weight="bold" color={S.ink2}>
          {label}
        </Ink>
        <Ink size={26} weight="black" tight>
          {thousands(value)}
          <Ink size={13} weight="bold" color={S.muted}>
            {` ${unit}`}
          </Ink>
        </Ink>
      </View>
      {btn(-1)}
      {btn(1)}
    </View>
  );
}

export function GoalsSheet({ visible, goals, hasStand, hasExercise, onClose, onSave }: { visible: boolean; goals: RingGoals; hasStand: boolean; hasExercise: boolean; onClose: () => void; onSave: (g: RingGoals) => void }) {
  const [g, setG] = useState<RingGoals>(goals);
  React.useEffect(() => {
    if (visible) setG(goals);
  }, [visible, goals]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Tes objectifs du jour">
      <Ink size={14} weight="medium" color={S.ink2} style={{ paddingHorizontal: 4 }}>
        Ils servent à remplir tes anneaux dans YOROI. Ils ne changent rien dans ta montre.
      </Ink>
      <Stepper label="Bouger" value={g.move} unit="kcal" step={25} min={50} max={3000} onChange={(v) => setG({ ...g, move: v })} />
      {hasExercise ? <Stepper label="Exercice" value={g.exercise} unit="min" step={5} min={5} max={240} onChange={(v) => setG({ ...g, exercise: v })} /> : null}
      {hasStand ? <Stepper label="Debout" value={g.stand} unit="h" step={1} min={1} max={18} onChange={(v) => setG({ ...g, stand: v })} /> : null}
      <SmallButton label="Enregistrer" tone="red" icon="check" onPress={() => onSave(g)} />
    </Sheet>
  );
}

// audit 43 : suit le theme (memes couleurs qu'avant en clair)
const INSIGHT_TONE: Record<string, { color: string; tint: string }> = {
  get success() { return { color: S.moss, tint: S.mossSoft }; },
  get warning() { return { color: S.gold, tint: S.goldSoft }; },
  get danger() { return { color: S.danger, tint: S.dangerSoft }; },
  get info() { return { color: S.indigo, tint: S.indigoSoft }; },
  get neutral() { return { color: S.ink2, tint: S.line2 }; },
};

export function InsightsRow({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      {insights.slice(0, 3).map((it, i) => {
        const t = INSIGHT_TONE[it.type] ?? INSIGHT_TONE.neutral;
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 12, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 14 }}>
            <View style={{ width: 5, borderRadius: 3, backgroundColor: t.color }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="black" tight>
                {it.title}
              </Ink>
              <Ink size={13} weight="medium" color={S.ink2}>
                {it.message}
              </Ink>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Grille de cartes en deux colonnes ; la derniere s'etale si le nombre est impair */
export function MetricGrid({ defs, series, onOpen }: { defs: MetricDef[]; series: Record<MetricKey, DayPoint[]>; onOpen: (k: MetricKey) => void }) {
  const rows: MetricDef[][] = [];
  for (let i = 0; i < defs.length; i += 2) rows.push(defs.slice(i, i + 2));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((d) => (
            <MetricCard key={d.key} def={d} points={series[d.key] ?? []} onPress={() => onOpen(d.key)} wide={row.length === 1} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Mesures sans donnee : on dit d'ou elles viendront.
 * Plus de cent rubriques depuis le 10 octobre 2026 : rangees par famille, depliables.
 */
export function WaitingList({ defs, onOpen }: { defs: MetricDef[]; onOpen: (k: MetricKey) => void }) {
  const [open, setOpen] = useState<Family | null>(null);
  if (defs.length === 0) return null;
  const groups = FAMILY_ORDER.map((f) => ({ f, list: defs.filter((d) => d.family === f) })).filter((g) => g.list.length > 0);
  return (
    <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, gap: 4 }}>
      <Ink size={14} weight="medium" color={S.ink2} style={{ paddingBottom: 6 }}>
        Elles apparaîtront dès qu'une montre, une bague ou une balance les envoie à Santé sur iPhone ou à Health Connect sur Android.
      </Ink>
      {groups.map(({ f, list }) => {
        const fam = FAMILY[f];
        const isOpen = open === f;
        return (
          <View key={f} style={{ borderTopWidth: 1, borderTopColor: S.line2 }}>
            <Press onPress={() => setOpen(isOpen ? null : f)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${fam.label}, ${list.length} mesures en attente`}>
              <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: fam.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <FamilyIcon family={f} size={18} color={fam.color} />
                </View>
                <Ink size={14} weight="extraBold" style={{ flex: 1 }}>
                  {fam.label}
                </Ink>
                <Ink size={12} weight="bold" color={S.muted}>
                  {String(list.length)}
                </Ink>
                <SanteIcon name={isOpen ? 'up' : 'down'} size={16} color={S.muted} />
              </View>
            </Press>
            {isOpen ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
                {list.map((d) => (
                  <Press key={d.key} onPress={() => onOpen(d.key)} accessibilityRole="button" accessibilityLabel={`${d.label}, en attente`}>
                    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, borderRadius: 22, backgroundColor: '#F7F5F0', borderWidth: 1, borderColor: S.line2 }}>
                      <IconDot name={METRIC_ICON[d.key] ?? 'pulse'} color={fam.color} tint={fam.tint} size={30} />
                      <Ink size={13} weight="bold" color={S.ink2}>
                        {d.label}
                      </Ink>
                    </View>
                  </Press>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const ACTIVITY_FR: Record<string, string> = {
  running: 'Course',
  walking: 'Marche',
  cycling: 'Vélo',
  swimming: 'Natation',
  hiking: 'Randonnée',
  boxing: 'Boxe',
  kickboxing: 'Kick-boxing',
  martialarts: 'Arts martiaux',
  wrestling: 'Lutte',
  traditionalstrengthtraining: 'Musculation',
  functionalstrengthtraining: 'Renforcement',
  strengthtraining: 'Musculation',
  highintensityintervaltraining: 'Fractionné intense',
  crosstraining: 'Cross training',
  yoga: 'Yoga',
  rowing: 'Rameur',
  elliptical: 'Elliptique',
  coretraining: 'Gainage',
  mixedcardio: 'Cardio',
  other: 'Séance',
};

export function workoutName(t: string): string {
  const k = String(t || '').toLowerCase().replace(/[^a-z]/g, '');
  return ACTIVITY_FR[k] ?? (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Séance');
}

export function WorkoutList({ workouts, limit, onMore }: { workouts: HealthWorkout[]; limit: number; onMore?: () => void }) {
  const list = workouts.slice(0, limit);
  return (
    <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, paddingHorizontal: 16, paddingVertical: 4 }}>
      {list.map((w, i) => {
        const d = new Date(w.startDate);
        const when = Number.isFinite(d.getTime()) ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) : '';
        // duree en minutes ; une valeur au-dela d'une journee vient d'un pont qui donne des secondes
        const minutes = w.duration > 1440 ? w.duration / 60 : w.duration;
        // format unique des durees (lib/v2/trainingWeek) : « 45 min », « 1 h 05 »
        const bits = minutes > 0 ? [formatDuration(minutes)] : [];
        if (w.distance && w.distance > 0) bits.push(`${String(Math.round(w.distance * 10) / 10).replace('.', ',')} km`);
        if (w.calories && w.calories > 0) bits.push(`${thousands(w.calories)} kcal`);
        if (w.averageHeartRate && w.averageHeartRate > 0) bits.push(`${Math.round(w.averageHeartRate)} bpm`);
        return (
          <View key={w.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: S.line2 }}>
            <IconDot name="watch" color={S.accent} tint={S.accentSoft} size={38} />
            <View style={{ flex: 1 }}>
              <Ink size={15} weight="extraBold">
                {workoutName(w.activityType)}
              </Ink>
              <Ink size={12} weight="bold" color={S.ink2}>
                {`${when}, ${bits.join(', ')}`}
              </Ink>
            </View>
          </View>
        );
      })}
      {onMore ? (
        <Press onPress={onMore} accessibilityRole="button" accessibilityLabel="Voir toutes les séances avec Premium">
          <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: S.line2 }}>
            <SanteIcon name="lock" size={14} color={S.accent} />
            <Ink size={13} weight="extraBold" color={S.accent}>
              {`Voir les ${workouts.length} séances avec Premium`}
            </Ink>
          </View>
        </Press>
      ) : null}
    </View>
  );
}
