/**
 * Briques communes aux ecrans de sommeil.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { SleepEntry } from '@/lib/sleepService';
import { Icon, P, Press, tap } from './kit';
import { traduire } from '@/lib/i18n/tr';

export const QUALITY_LABELS = ['', traduire('Très mauvaise'), 'Mauvaise', 'Correcte', 'Bonne', 'Excellente'];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = [traduire('Dimanche'), traduire('Lundi'), traduire('Mardi'), traduire('Mercredi'), traduire('Jeudi'), traduire('Vendredi'), traduire('Samedi')];
const MONTHS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

export function hm(min: number): string {
  if (min <= 0) return '0 h';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export function clock(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${parseInt(h, 10)} h ${m ?? '00'}`;
}

export function shiftTime(t: string, delta: number): string {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10) || 0);
  let total = (h * 60 + m + delta) % 1440;
  if (total < 0) total += 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function dayLabel(iso: string, long = false): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  return long ? `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : `${DAYS[d.getDay()]} ${d.getDate()}`;
}

export function monthLabel(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  const m = MONTHS[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

export function durationColor(min: number, goal = 480): string {
  if (min >= goal) return P.mossText;
  if (min >= goal - 60) return P.indigo;
  if (min >= 300) return P.goldDark;
  return P.danger;
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 6 : 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const star = <Icon name="star" size={size} color={i <= value ? P.gold : P.dashed} fill={i <= value ? P.goldLight : 'none'} width={1.8} />;
        if (!onChange) return <View key={i}>{star}</View>;
        return (
          <Pressable key={i} onPress={() => { tap(); onChange(i); }} accessibilityRole="button" accessibilityLabel={traduire("{0} sur 5 : {1}", i, QUALITY_LABELS[i])} hitSlop={4} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Barres des nuits (7 ou 14) avec la ligne d'objectif en or */
export function NightBars({ entries, goal, days = 7, width = 320, height = 120 }: { entries: SleepEntry[]; goal: number; days?: number; width?: number; height?: number }) {
  const list = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, min: entries.find((e) => e.date === iso)?.duration ?? 0 };
  });
  const max = Math.max(goal + 60, ...list.map((x) => x.min));
  const step = width / days;
  const bw = Math.min(26, step * 0.6);
  const H = height - 20;
  const gy = H - (goal / max) * (H - 6);
  return (
    <Svg width={width} height={height}>
      {list.map((x, i) => {
        const h = x.min > 0 ? Math.max(8, (x.min / max) * (H - 6)) : 6;
        return <Rect key={x.iso} x={i * step + (step - bw) / 2} y={H - h} width={bw} height={h} rx={bw / 2} fill={x.min === 0 ? P.line : x.min >= goal ? P.indigo : '#9BAAD0'} />;
      })}
      <Path d={`M0 ${gy} H${width}`} stroke={P.gold} strokeWidth={2} strokeDasharray="6 5" />
    </Svg>
  );
}

export function NightLetters({ days = 7, width = 320 }: { days?: number; width?: number }) {
  const letters = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return 'DLMMJVS'[d.getDay()];
  });
  return (
    <View style={{ flexDirection: 'row', width }}>
      {letters.map((l, i) => (
        <Ink key={i} size={12} weight={i === days - 1 ? 'black' : 'bold'} color={i === days - 1 ? P.indigo : P.muted} style={{ flex: 1, textAlign: 'center' }}>
          {l}
        </Ink>
      ))}
    </View>
  );
}

export function NightRow({ entry, goal, onPress, onLongPress, locked, first }: { entry: SleepEntry; goal: number; onPress: () => void; onLongPress?: () => void; locked?: boolean; first?: boolean }) {
  return (
    <Press onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={`${dayLabel(entry.date, true)}, ${hm(entry.duration)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, borderTopWidth: first ? 0 : 1, borderTopColor: P.line2, opacity: locked ? 0.45 : 1 }}>
        <View style={{ width: 6, height: 34, borderRadius: 3, backgroundColor: locked ? P.line : durationColor(entry.duration, goal) }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold">
            {dayLabel(entry.date, true)}
          </Ink>
          <Ink size={12} weight="bold" color={P.ink2}>
            {entry.bedTime && entry.wakeTime ? traduire("{0} à {1}", clock(entry.bedTime), clock(entry.wakeTime)) : entry.source === 'healthkit' ? 'Santé' : ''}
          </Ink>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Ink size={17} weight="black" tight color={locked ? P.muted : durationColor(entry.duration, goal)}>
            {hm(entry.duration)}
          </Ink>
          {entry.quality > 0 ? <Stars value={entry.quality} size={10} /> : null}
        </View>
        {locked ? <Icon name="shield" size={16} color={P.muted} /> : <Icon name="chevron" size={16} color={P.muted} />}
      </View>
    </Press>
  );
}

/** Reglage par pas : - valeur + */
export function Stepper({ value, onMinus, onPlus, label, color = P.ink }: { value: string; onMinus: () => void; onPlus: () => void; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Press onPress={onMinus} accessibilityRole="button" accessibilityLabel={traduire("{0} : moins", label)}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="minus" size={20} />
        </View>
      </Press>
      <Ink size={26} weight="black" tight color={color} style={{ flex: 1, textAlign: 'center' }}>
        {value}
      </Ink>
      <Press onPress={onPlus} accessibilityRole="button" accessibilityLabel={traduire("{0} : plus", label)}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={20} color={P.white} />
        </View>
      </Press>
    </View>
  );
}

/** Interrupteur simple dessine */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => { tap(); onChange(!value); }} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} hitSlop={8} style={{ width: 56, height: 44, justifyContent: 'center' }}>
      <View style={{ width: 54, height: 32, borderRadius: 16, backgroundColor: value ? P.indigo : P.line, padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: P.white }} />
      </View>
    </Pressable>
  );
}
