/**
 * Ajout d'une perf a un record (carnet v2). Les champs suivent le type d'exercice :
 * charge et repetitions, repetitions seules, course (distance, temps, allure, denivele),
 * cardio sur machine, Hyrox, ou valeur libre. Valeurs pre-remplies avec la derniere fois.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { niceName } from '@/lib/v2/carnet/records';
import { DayNav, dateFromIso, isoLocalDay } from '@/components/yoroi/v2/DateChips';
import { fontStyle } from '@/components/yoroi/fonts';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { METS_VALUES, calculateCalories, getBenchmarkPR, parseTimeToSeconds } from '@/lib/carnetService';
import type { Benchmark } from '@/lib/carnetService';
import { entryText, isWeightCategory, sortedEntries } from '@/lib/v2/carnet/journal';
import { shortDate } from '@/lib/v2/carnet/format';
import { intensite, niveauRpe } from '@/lib/v2/intensite';
import { P, Press, CIcon, Hanko, BigButton, Field, Label, MiniChips } from './ui';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export type EntryValues = {
  value: number;
  reps?: number;
  rpe: number;
  date: Date;
  duration?: number;
  calories?: number;
  notes?: string;
  advanced: { distance?: number; incline?: number; speed?: number; pace?: string; watts?: number; level?: number };
};

type HyroxEffort = 'course' | 'station_force' | 'repetitions';

const RPE_LABEL = (v: number) => (v <= 3 ? traduire('Facile') : v <= 5 ? traduire('Modéré') : v <= 7 ? traduire('Difficile') : v <= 9 ? traduire('Très dur') : 'Maximum');

function shift(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function EntrySheet({ visible, benchmark, busy, userWeight, onClose, onSubmit, onError }: { visible: boolean; benchmark: Benchmark | null; busy: boolean; userWeight: number; onClose: () => void; onSubmit: (v: EntryValues) => void; onError: (msg: string) => void }) {
  const cat = benchmark?.category ?? 'custom';
  const unit = benchmark?.unit ?? 'kg';
  const isWeight = isWeightCategory(cat);
  const isBody = cat === 'bodyweight' || cat === 'street_workout';
  const isRun = cat === 'running' || cat === 'trail';
  const isHyrox = cat === 'hyrox';
  const isCardio = cat === 'cardio';
  const genericValue = !isWeight && !isBody && !isRun && !((isCardio || isHyrox) && unit === 'time');

  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(8);
  const [valueText, setValueText] = useState('');
  const [distance, setDistance] = useState('');
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [s, setS] = useState('');
  const [incline, setIncline] = useState('');
  const [speed, setSpeed] = useState('');
  const [watts, setWatts] = useState('');
  const [level, setLevel] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [hyrox, setHyrox] = useState<HyroxEffort>('course');
  const [rpe, setRpe] = useState(5);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  const history = useMemo(() => (benchmark ? sortedEntries(benchmark).slice(0, 3) : []), [benchmark]);
  const pr = benchmark ? getBenchmarkPR(benchmark) : null;

  // Pre-remplissage avec la derniere perf
  useEffect(() => {
    if (!visible || !benchmark) return;
    const last = history[0];
    setDate(new Date());
    setNotes('');
    setRpe(last?.rpe ?? 5);
    setDistance(last?.distance ? String(last.distance) : '');
    setIncline('');
    setSpeed(last?.speed ? String(last.speed) : '');
    setWatts('');
    setLevel(last?.level ? String(last.level) : '');
    setCalories('');
    setDuration(last?.duration ? String(last.duration) : '');
    setH('');
    setM('');
    setS('');
    setValueText('');
    if (isWeight) {
      setWeight(last?.value ?? 20);
      setReps(last?.reps ?? 8);
    } else if (isBody) {
      setReps(last?.value ?? 10);
    }
  }, [visible, benchmark]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSeconds = (parseInt(h, 10) || 0) * 3600 + (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
  const distKm = parseFloat(distance.replace(',', '.'));
  const paceText = isRun && distKm > 0 && totalSeconds > 0 ? `${Math.floor(totalSeconds / distKm / 60)}:${String(Math.floor((totalSeconds / distKm) % 60)).padStart(2, '0')} /km` : null;

  // Calories estimees a partir du temps (comme avant : duree x poids x MET)
  useEffect(() => {
    if (!benchmark || isWeight || isBody) return;
    const min = isRun && totalSeconds > 0 ? Math.round(totalSeconds / 60) : parseInt(duration, 10) || 0;
    if (min > 0) {
      if (isRun) setDuration(String(min));
      setCalories(String(calculateCalories(min, userWeight, benchmark.category)));
    }
  }, [totalSeconds, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!benchmark || busy) return;
    let value: number;
    if (isWeight) {
      if (!reps) return onError(traduire('Indique au moins une répétition.'));
      value = weight;
    } else if (isBody) {
      value = reps;
    } else if (isRun && unit === 'time') {
      value = totalSeconds;
      if (value === 0) return onError(traduire('Indique ta durée.'));
    } else if (isRun) {
      value = distKm;
    } else if ((isCardio || isHyrox) && unit === 'time') {
      value = (parseInt(duration, 10) || 0) * 60;
      if (value === 0) return onError(traduire('Indique ta durée.'));
    } else if (unit === 'time') {
      value = parseTimeToSeconds(valueText.trim());
    } else {
      value = parseFloat(valueText.replace(',', '.'));
    }
    if (!isFinite(value) || isNaN(value) || value <= 0) return onError(traduire('La valeur n’est pas valide.'));
    const dur = duration.trim() ? parseInt(duration, 10) : undefined;
    let cal = calories.trim() ? parseInt(calories, 10) : undefined;
    if (!cal && dur && dur > 0) cal = calculateCalories(dur, userWeight, benchmark.category);
    onSubmit({
      value,
      reps: isWeight ? reps : undefined,
      rpe,
      date,
      duration: dur,
      calories: cal,
      notes: notes.trim() || undefined,
      advanced: {
        distance: distance.trim() ? distKm : undefined,
        incline: incline.trim() ? parseFloat(incline.replace(',', '.')) : undefined,
        speed: speed.trim() ? parseFloat(speed.replace(',', '.')) : undefined,
        pace: paceText ? paceText.replace(' /km', '') : undefined,
        watts: watts.trim() ? parseInt(watts, 10) : undefined,
        level: level.trim() ? parseInt(level, 10) : undefined,
      },
    });
  };

  if (!benchmark) return null;

  return (
    <Sheet visible={visible} onClose={onClose} scroll>
      <View style={{ gap: 2 }}>
        <Ink size={24} weight="black" tight numberOfLines={2}>{niceName(benchmark.name)}</Ink>
        {pr ? <Ink size={13} weight="bold" color={P.accent}>{traduire("Ton record : {0}", entryText(benchmark, pr))}</Ink> : <Ink size={13} weight="bold" color={P.ink2}>{traduire("Ta première perf sera ton record")}</Ink>}
      </View>

      {history.length > 0 ? (
        <View style={{ borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 14, paddingVertical: 6 }}>
          {history.map((e, i) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2 }}>
              <Ink size={12} weight="bold" color={P.muted} style={{ width: 56 }}>{shortDate(e.date)}</Ink>
              <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{entryText(benchmark, e)}</Ink>
              {pr && pr.id === e.id ? <Hanko size={22} /> : null}
              {e.rpe ? <Ink size={12} weight="bold" color={P.muted}>{`effort ${e.rpe}`}</Ink> : null}
            </View>
          ))}
        </View>
      ) : null}

      <Label>{traduire("Quand")}</Label>
      <DayNav value={isoLocalDay(date)} onChange={(iso) => setDate(dateFromIso(iso))} size={18} inline />

      {isHyrox ? (
        <>
          <Label>{traduire("Type d’effort")}</Label>
          <MiniChips items={[{ key: 'course' as HyroxEffort, label: 'Course' }, { key: 'station_force' as HyroxEffort, label: traduire('Station force') }, { key: 'repetitions' as HyroxEffort, label: traduire('Répétitions') }]} value={hyrox} onChange={setHyrox} />
        </>
      ) : null}

      {isWeight ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
            <Ink size={13} weight="bold" color={P.ink2}>{traduire("Charge")}</Ink>
            <Stepper value={weight} step={2} fine={0.5} min={0} max={600} decimals onChange={setWeight} unit="kilos" size={28} button={36} format={(v) => `${String(v).replace('.', DECIMAL)} ${unit === 'lbs' ? 'lbs' : 'kg'}`} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
            <Ink size={13} weight="bold" color={P.ink2}>{traduire("Répétitions")}</Ink>
            <Stepper value={reps} step={1} min={1} max={200} onChange={setReps} unit={traduire("répétitions")} size={28} button={36} />
          </View>
        </View>
      ) : null}
      {isWeight ? <Ink size={13} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>{`Volume : ${Math.round(weight * reps)} ${unit === 'lbs' ? 'lbs' : 'kg'}`}</Ink> : null}

      {isBody ? (
        <View style={{ alignItems: 'center', gap: 6, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
          <Ink size={13} weight="bold" color={P.ink2}>{traduire("Répétitions")}</Ink>
          <Stepper value={reps} step={1} min={1} max={500} onChange={setReps} unit={traduire("répétitions")} size={34} />
        </View>
      ) : null}

      {isRun ? (
        <>
          <Field label={traduire("Distance en km")} value={distance} onChangeText={(t) => setDistance(t.replace(',', '.'))} keyboardType="decimal-pad" placeholder="10" />
          {unit === 'time' || unit === 'km' ? (
            <>
              <Label>{traduire("Durée")}</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { v: h, set: setH, u: 'h', ph: '0' },
                  { v: m, set: setM, u: 'min', ph: '45' },
                  { v: s, set: setS, u: 's', ph: '30' },
                ].map((f) => (
                  <View key={f.u} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line, paddingHorizontal: 12 }}>
                    <TextInput value={f.v} onChangeText={f.set} keyboardType="number-pad" maxLength={2} placeholder={f.ph} placeholderTextColor={P.muted} accessibilityLabel={traduire("Durée en {0}", f.u)} style={[fontStyle('black'), { flex: 1, fontSize: 22, color: P.ink, textAlign: 'center', paddingVertical: 0 }]} />
                    <Ink size={13} weight="bold" color={P.muted}>{f.u}</Ink>
                  </View>
                ))}
              </View>
              {paceText ? <Ink size={14} weight="extraBold" color={P.indigo} style={{ paddingHorizontal: 4 }}>{`Allure : ${paceText}`}</Ink> : null}
            </>
          ) : null}
          <Field label={traduire("Dénivelé en mètres, si tu veux")} value={incline} onChangeText={setIncline} keyboardType="number-pad" placeholder="150" />
        </>
      ) : null}

      {isCardio ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flexBasis: '47%', flexGrow: 1 }}><Field label={traduire("Distance (km)")} value={distance} onChangeText={(t) => setDistance(t.replace(',', '.'))} keyboardType="decimal-pad" placeholder="5" /></View>
          <View style={{ flexBasis: '47%', flexGrow: 1 }}><Field label={traduire("Vitesse (km/h)")} value={speed} onChangeText={(t) => setSpeed(t.replace(',', '.'))} keyboardType="decimal-pad" placeholder="12,5" /></View>
          <View style={{ flexBasis: '47%', flexGrow: 1 }}><Field label={traduire("Puissance (W)")} value={watts} onChangeText={setWatts} keyboardType="number-pad" placeholder="250" /></View>
          <View style={{ flexBasis: '47%', flexGrow: 1 }}><Field label={traduire("Niveau")} value={level} onChangeText={setLevel} keyboardType="number-pad" placeholder="8" /></View>
        </View>
      ) : null}

      {genericValue && !isRun ? (
        <Field
          label={unit === 'time' ? traduire('Ton temps (min:s)') : unit === 'reps' ? traduire('Répétitions') : unit === 'km' ? traduire('Kilomètres') : unit === 'meters' ? traduire('Mètres') : unit === 'lbs' ? traduire('Livres') : traduire('Kilos')}
          value={valueText}
          onChangeText={setValueText}
          keyboardType={unit === 'time' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder={unit === 'time' ? '3:45' : '0'}
        />
      ) : null}

      {!isWeight && !isBody ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label={traduire("Durée (min)")} value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="45" /></View>
          <View style={{ flex: 1 }}><Field label={traduire("Calories")} value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="350" /></View>
        </View>
      ) : null}
      {!isWeight && !isBody ? <Ink size={12} weight="medium" color={P.muted} style={{ paddingHorizontal: 4 }}>{traduire("Calories estimées avec ton poids et un coefficient d’effort de {0}.", METS_VALUES[benchmark.category] || 5)}</Ink> : null}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
          <Ink size={13} weight="bold" color={P.ink2}>{traduire("Effort ressenti")}</Ink>
          <Ink size={15} weight="black" color={intensite(niveauRpe(rpe)).text}>{traduire("{0} sur 10, {1}", rpe, RPE_LABEL(rpe).toLowerCase())}</Ink>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
            <View key={v} style={{ flex: 1 }}>
              <Press onPress={() => setRpe(v)} accessibilityRole="button" accessibilityLabel={`Effort ${v}`} accessibilityState={{ selected: v === rpe }}>
                <View style={{ height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: v <= rpe ? intensite(niveauRpe(v)).fill : '#ECEAE4' }}>
                  <Ink size={13} weight="black" color={v <= rpe ? intensite(niveauRpe(v)).onFill : P.ink2}>{String(v)}</Ink>
                </View>
              </Press>
            </View>
          ))}
        </View>
      </View>

      <Field value={notes} onChangeText={setNotes} placeholder={traduire("Une note : sensations, matériel, conditions")} multiline accessibilityLabel="Note" />

      <BigButton label={busy ? 'Enregistrement...' : traduire('Enregistrer')} icon="check" disabled={busy} onPress={submit} />
    </Sheet>
  );
}
