/**
 * Compteur de drills v2 : tes repetitions par technique. Objectif de la semaine
 * en plaques kozane, et un palier par technique qui monte a mesure que tu
 * approches de ton objectif total (1 000 repetitions par defaut).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { logger } from '@/lib/security/logger';
import { BigButton, Card, CIcon, DetailScreen, EmptyState, Enter, Field, FormSheet, Glass, Hanko, IconBtn, InkBar, P, Press, Stat, Stepper, tap, V } from '@/components/yoroi/v2/combat/ui';
import { isoOf } from '@/lib/v2/progres/format';
import { ProgressBar } from '@/components/yoroi/v2/espace/ProgressBar';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, LOCALE } from '@/lib/i18n/tr';

interface DrillTechnique {
  id: string;
  name: string;
  totalReps: number;
  weekReps: number;
  weekGoal: number;
  targetTotal: number;
  lastUpdated?: string;
}

const STORAGE_KEY = '@yoroi_drill_tracker';
const getCurrentWeek = () => {
  const d = new Date();
  const start = new Date(d);
  const day = d.getDay();
  start.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return isoOf(start);
};
const DEFAULTS: Omit<DrillTechnique, 'id'>[] = [
  { name: 'Single leg', totalReps: 0, weekReps: 0, weekGoal: 100, targetTotal: 1000 },
  { name: 'Double leg', totalReps: 0, weekReps: 0, weekGoal: 100, targetTotal: 1000 },
  { name: 'Triangle', totalReps: 0, weekReps: 0, weekGoal: 50, targetTotal: 1000 },
  { name: 'Guillotine', totalReps: 0, weekReps: 0, weekGoal: 50, targetTotal: 1000 },
  { name: 'Clé de bras', totalReps: 0, weekReps: 0, weekGoal: 50, targetTotal: 1000 },
  { name: 'Passage de garde', totalReps: 0, weekReps: 0, weekGoal: 80, targetTotal: 1000 },
  { name: 'Renversement', totalReps: 0, weekReps: 0, weekGoal: 80, targetTotal: 1000 },
];

async function loadTechniques(): Promise<DrillTechnique[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defs = DEFAULTS.map((t, i) => ({ ...t, id: `default_${i}` }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ week: getCurrentWeek(), techniques: defs }));
      return defs;
    }
    const data = JSON.parse(raw);
    const list: DrillTechnique[] = Array.isArray(data?.techniques) ? data.techniques : [];
    if (data.week !== getCurrentWeek()) {
      const reset = list.map((t) => ({ ...t, weekReps: 0 }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ week: getCurrentWeek(), techniques: reset }));
      return reset;
    }
    return list;
  } catch (e) {
    logger.error('Chargement des drills impossible', e);
    return DEFAULTS.map((t, i) => ({ ...t, id: `default_${i}` }));
  }
}
async function saveTechniques(list: DrillTechnique[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ week: getCurrentWeek(), techniques: list }));
}

// Palier de la technique : de 1 a 5 selon le chemin parcouru vers l'objectif total
// (paliers neutres, jamais une ceinture de grade)
const STEPS = 5;
function stepFor(t: DrillTechnique): { n: number; toNext: number } {
  const step = Math.max(1, t.targetTotal / (STEPS - 1));
  const i = Math.min(STEPS - 1, Math.floor(t.totalReps / step));
  return { n: i + 1, toNext: i < STEPS - 1 ? Math.ceil(step * (i + 1) - t.totalReps) : 0 };
}

function StepPlates({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <View key={i} style={{ width: 10, height: 13, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: i < n ? P.detail : P.line2 }} />
      ))}
    </View>
  );
}

function DrillCard({ t, onAdd, onEdit }: { t: DrillTechnique; onAdd: (n: number) => void; onEdit: () => void }) {
  const wk = t.weekGoal > 0 ? Math.min(1, t.weekReps / t.weekGoal) : 0;
  const tot = Math.min(1, t.totalReps / Math.max(1, t.targetTotal));
  const step = stepFor(t);
  const done = wk >= 1;
  return (
    <Card style={{ gap: 14, borderColor: done ? '#C9D6B0' : P.line2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Ink size={20} weight="black" tight numberOfLines={1}>
            {traduire(t.name)}
          </Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StepPlates n={step.n} />
            <Ink size={12} weight="bold" color={P.ink2} style={{ flex: 1 }}>
              {step.n < STEPS ? traduire("Palier {0} sur {1}, encore {2} répétitions", step.n, STEPS, step.toNext.toLocaleString(LOCALE)) : `Palier ${STEPS} atteint`}
            </Ink>
          </View>
        </View>
        {tot >= 1 ? <Hanko size={40} /> : null}
        <IconBtn icon="edit" size={40} label={traduire("Modifier {0}", traduire(t.name))} onPress={onEdit} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <Ink size={38} weight="black" tight color={done ? '#4F6B28' : P.ink}>
          {t.weekReps.toLocaleString(LOCALE)}
        </Ink>
        <Ink size={14} weight="bold" color={P.ink2} style={{ marginBottom: 6 }}>
          {traduire("sur {0} cette semaine", t.weekGoal)}
        </Ink>
      </View>
      <ProgressBar progress={wk} accessibilityLabel={traduire("Ta semaine")} />
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Ink size={12} weight="bold" color={P.ink2}>
            {traduire("{0} sur {1} au total", t.totalReps.toLocaleString(LOCALE), t.targetTotal.toLocaleString(LOCALE))}
          </Ink>
          <Ink size={12} weight="extraBold" color={V}>
            {`${Math.round(tot * 100)}%`}
          </Ink>
        </View>
        <InkBar value={tot} color={V} height={7} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Press onPress={() => onAdd(-1)} accessibilityRole="button" accessibilityLabel={traduire("Retirer une répétition de {0}", traduire(t.name))}>
          <View style={{ width: 48, height: 52, borderRadius: 16, backgroundColor: '#E6E4DD', alignItems: 'center', justifyContent: 'center' }}>
            <CIcon name="minus" size={18} color={P.ink} width={2.8} />
          </View>
        </Press>
        {[1, 5, 10, 20].map((n, i) => (
          <Press key={n} onPress={() => onAdd(n)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={traduire("Ajouter {0} répétitions de {1}", n, traduire(t.name))}>
            <View style={{ height: 52, borderRadius: 16, backgroundColor: i === 3 ? P.primary : P.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={17} weight="black" color={i === 3 ? P.onPrimary : P.paper}>
                {`+${n}`}
              </Ink>
            </View>
          </Press>
        ))}
      </View>
      {done ? (
        <Ink size={13} weight="extraBold" color="#4F6B28">
          {traduire("Objectif de la semaine atteint")}</Ink>
      ) : null}
    </Card>
  );
}

export default function DrillTrackerScreen() {
  const [list, setList] = useState<DrillTechnique[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<'add' | string | null>(null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(100);
  const [target, setTarget] = useState(1000);

  useEffect(() => {
    loadTechniques().then((t) => {
      setList(t);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (next: DrillTechnique[]) => {
    setList(next);
    await saveTechniques(next).catch((e) => logger.error('Enregistrement des drills impossible', e));
  }, []);

  const add = useCallback(
    async (id: string, n: number) => {
      const next = list.map((t) => {
        if (t.id !== id) return t;
        const total = Math.max(0, t.totalReps + n);
        const week = Math.max(0, t.weekReps + n);
        if (n > 0 && ((total >= t.targetTotal && t.totalReps < t.targetTotal) || (week >= t.weekGoal && t.weekReps < t.weekGoal))) tap('success');
        return { ...t, totalReps: total, weekReps: week, lastUpdated: new Date().toISOString() };
      });
      await save(next);
    },
    [list, save],
  );

  const editing = sheet && sheet !== 'add' ? list.find((t) => t.id === sheet) ?? null : null;
  const openAdd = () => {
    setName('');
    setGoal(100);
    setTarget(1000);
    setSheet('add');
  };
  const openEdit = (t: DrillTechnique) => {
    setName(t.name);
    setGoal(t.weekGoal);
    setTarget(t.targetTotal);
    setSheet(t.id);
  };
  const submit = async () => {
    if (!name.trim()) return;
    tap('medium');
    if (editing) await save(list.map((t) => (t.id === editing.id ? { ...t, name: name.trim(), weekGoal: goal, targetTotal: target } : t)));
    else await save([...list, { id: `custom_${Date.now()}`, name: name.trim(), totalReps: 0, weekReps: 0, weekGoal: goal, targetTotal: target }]);
    setSheet(null);
  };
  const remove = (t: DrillTechnique) => {
    appAlert(traduire("Supprimer {0} ?", traduire(t.name)), traduire('La technique et tous ses compteurs seront effacés.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          await save(list.filter((x) => x.id !== t.id));
          setSheet(null);
        },
      },
    ]);
  };

  const week = list.reduce((s, t) => s + t.weekReps, 0);
  const all = list.reduce((s, t) => s + t.totalReps, 0);
  const reached = list.filter((t) => t.weekReps >= t.weekGoal).length;

  return (
    <PremiumGate source="drills" featureTitle={traduire("Compteur de drills")} perks={[traduire('Tes répétitions comptées par technique'), traduire('Un objectif par semaine pour chaque drill'), traduire('Ton total vers les 1 000 répétitions')]}>
      <DetailScreen title="Drills" subtitle={traduire("Mille répétitions forgent une technique")} right={<IconBtn icon="plus" label={traduire("Ajouter une technique")} tone="red" onPress={openAdd} />}>
        {!loading && list.length > 0 ? (
          <Enter i={0}>
            <Glass style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row' }}>
                <Stat value={week.toLocaleString(LOCALE)} label={traduire("cette semaine")} color={P.accent} />
                <Stat value={traduire("{0} sur {1}", reached, list.length)} label={traduire("objectifs atteints")} color={V} />
                <Stat value={all.toLocaleString(LOCALE)} label={traduire("au total")} />
              </View>
              <ProgressBar progress={list.length > 0 ? reached / list.length : 0} accessibilityLabel={traduire("Objectifs atteints")} />
            </Glass>
          </Enter>
        ) : null}

        {!loading && list.length === 0 ? <EmptyState title={traduire("Aucune technique")} text={traduire("Ajoute les techniques que tu répètes. Chaque série compte, et chaque palier franchi marque ta progression.")} action={traduire("Ajouter une technique")} onAction={openAdd} /> : null}

        {list.map((t, i) => (
          <Enter key={t.id} i={Math.min(i + 1, 8)}>
            <DrillCard t={t} onAdd={(n) => add(t.id, n)} onEdit={() => openEdit(t)} />
          </Enter>
        ))}

        <FormSheet visible={sheet !== null} onClose={() => setSheet(null)} title={editing ? traduire("Modifier {0}", traduire(editing.name)) : traduire('Nouvelle technique')}>
          <Field value={name} onChangeText={setName} autoFocus={!editing} placeholder={traduire("Nom de la technique")} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={14} weight="bold" color={P.ink2}>
              {traduire("Objectif par semaine")}</Ink>
            <Stepper value={goal} onChange={setGoal} step={10} min={10} max={2000} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={14} weight="bold" color={P.ink2}>
              {traduire("Objectif total")}</Ink>
            <Stepper value={target} onChange={setTarget} step={250} min={250} max={20000} format={(v) => v.toLocaleString(LOCALE)} />
          </View>
          <BigButton label={editing ? traduire('Enregistrer') : traduire('Ajouter')} onPress={submit} disabled={!name.trim()} />
          {editing ? <BigButton label={traduire("Supprimer la technique")} tone="light" icon="trash" onPress={() => remove(editing)} /> : null}
        </FormSheet>
      </DetailScreen>
    </PremiumGate>
  );
}
