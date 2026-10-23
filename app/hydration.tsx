/**
 * Ton eau : ajout en un appui, objectif, rappels par moment de la journee, semaine et historique.
 */
import { track } from '@/utils/telemetry';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { notificationService, requestNotificationPermissions } from '@/lib/notificationService';
import { usePremium } from '@/context/PremiumContext';
import { logger } from '@/lib/security/logger';
import {
  HYDRATION_AMOUNT_EVENT,
  formatLiters,
  loadHydration,
  localISO,
  saveHydrationAmount,
  saveHydrationGoal,
} from '@/lib/v2/accueil/hydration';
import type { HydrationDay } from '@/lib/v2/accueil/hydration';
import { BigButton, Card, Enter, Icon, P, Press, SectionTitle, Stat, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { Stepper, Toggle, clock, dayLabel, shiftTime } from '@/components/yoroi/v2/accueil/sleepKit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';

type Slot = { enabled: boolean; time: string; amount: number };
type SlotKey = 'morning' | 'afternoon' | 'evening';
const SLOT_LABEL: Record<SlotKey, string> = { morning: 'Matin', afternoon: 'Après-midi', evening: 'Soir' };
const DEFAULT_SLOTS: Record<SlotKey, Slot> = {
  morning: { enabled: true, time: '09:00', amount: 750 },
  afternoon: { enabled: true, time: '14:00', amount: 750 },
  evening: { enabled: true, time: '19:00', amount: 750 },
};

function Bottle({ ratio, size = 170 }: { ratio: number; size?: number }) {
  const h = size * 1.35;
  const r = Math.max(0, Math.min(1, ratio));
  const body = `M${size * 0.3} 6 H${size * 0.7} V${h * 0.14} Q${size * 0.92} ${h * 0.22} ${size * 0.92} ${h * 0.36} V${h - 18} Q${size * 0.92} ${h - 4} ${size * 0.78} ${h - 4} H${size * 0.22} Q${size * 0.08} ${h - 4} ${size * 0.08} ${h - 18} V${h * 0.36} Q${size * 0.08} ${h * 0.22} ${size * 0.3} ${h * 0.14} Z`;
  const top = h - 4 - (h - 10) * r;
  return (
    <Svg width={size} height={h}>
      <Defs>
        <ClipPath id="bottle">
          <Path d={body} />
        </ClipPath>
      </Defs>
      <Path d={body} fill={P.white} />
      <Rect x={0} y={top} width={size} height={h} fill={P.water} clipPath="url(#bottle)" />
      <Path d={`M0 ${top} Q${size * 0.25} ${top - 8} ${size * 0.5} ${top} T${size} ${top} V${top + 10} H0 Z`} fill="#5B78B4" clipPath="url(#bottle)" opacity={r > 0 && r < 1 ? 1 : 0} />
      <Path d={body} fill="none" stroke={P.ink} strokeWidth={4} strokeLinejoin="round" />
      <Rect x={size * 0.28} y={0} width={size * 0.44} height={12} rx={4} fill={P.accent} />
    </Svg>
  );
}

export default function Hydratation() {
  const { width } = useWindowDimensions();
  let isPremium = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isPremium = usePremium().isPremium;
  } catch {
    isPremium = false;
  }

  const [amount, setAmount] = useState(0);
  const [goal, setGoal] = useState(2.5);
  const [goalDraft, setGoalDraft] = useState<number | null>(null);
  const [history, setHistory] = useState<HydrationDay[]>([]);
  const [toast, setToast] = useState<{ id: number; ml: number } | null>(null);
  const [notif, setNotif] = useState(false);
  const [slots, setSlots] = useState<Record<SlotKey, Slot>>(DEFAULT_SLOTS);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const amountRef = useRef(0);

  const load = useCallback(async () => {
    const s = await loadHydration();
    amountRef.current = s.amount;
    setAmount(s.amount);
    setGoal(s.goal);
    setHistory(s.history);
    try {
      const h = (await notificationService.loadSettings().catch(() => null))?.hydration;
      setNotif(h?.enabled === true && h?.useSlots === true);
      if (h?.slots) {
        setSlots({
          morning: { ...DEFAULT_SLOTS.morning, ...h.slots.morning },
          afternoon: { ...DEFAULT_SLOTS.afternoon, ...h.slots.afternoon },
          evening: { ...DEFAULT_SLOTS.evening, ...h.slots.evening },
        });
      }
    } catch {
      // reglages des rappels indisponibles
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(HYDRATION_AMOUNT_EVENT, (p?: { amountMl?: number }) => {
      if (p && typeof p.amountMl === 'number' && Math.abs(p.amountMl / 1000 - amountRef.current) > 0.001) load();
    });
    return () => sub.remove();
  }, [load]);

  const add = async (l: number) => {
    const next = Math.min(15, Math.max(0, Math.round((amountRef.current + l) * 1000) / 1000));
    const wasBelow = amountRef.current < goal;
    amountRef.current = next;
    setAmount(next);
    if (next >= goal && wasBelow) tap('success');
    else tap(l > 0 ? 'light' : 'medium');
    setToast({ id: Date.now(), ml: Math.round(l * 1000) });
    const h = await saveHydrationAmount(next, goal);
    if (l > 0) track('hydratation_saisie');
    if (h.length > 0) setHistory(h);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  const saveGoal = async () => {
    if (goalDraft === null) return;
    const ok = await saveHydrationGoal(goalDraft);
    if (!ok) {
      appAlert('Objectif invalide', 'Choisis un objectif entre 0,5 et 10 litres.');
      return;
    }
    tap('success');
    setGoal(goalDraft);
    setGoalDraft(null);
  };

  const toggleNotif = async (v: boolean) => {
    if (v) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        appAlert('Autorisation nécessaire', 'Active les notifications pour YOROI dans les réglages de ton téléphone.');
        return;
      }
    }
    setNotif(v);
    try {
      const settings = await notificationService.loadSettings();
      await notificationService.updateSettings({ hydration: { ...settings.hydration, enabled: v, useSlots: true } });
      if (v) setSlotsOpen(true);
    } catch (err) {
      logger.error('Rappels d’hydratation non enregistrés', err);
    }
  };

  const saveSlots = async () => {
    try {
      const settings = await notificationService.loadSettings();
      await notificationService.updateSettings({ hydration: { ...settings.hydration, useSlots: true, slots } });
      tap('success');
      setSlotsOpen(false);
    } catch (err) {
      logger.error('Créneaux d’hydratation non enregistrés', err);
    }
  };

  const ratio = goal > 0 ? amount / goal : 0;
  const reached = amount >= goal;

  // Semaine : 7 jours calendaires, aujourd'hui a droite
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localISO(d);
    const h = key === localISO() ? { date: key, amount, goal } : history.find((x) => x.date === key);
    return { key, letter: 'DLMMJVS'[d.getDay()], data: h };
  });
  const withData = week.map((w) => w.data).filter((d): d is HydrationDay => !!d && d.amount > 0);
  const success = withData.filter((d) => d.amount >= d.goal).length;
  const avg = withData.length > 0 ? withData.reduce((s, d) => s + d.amount, 0) / withData.length : 0;
  const chartW = width - 44 - 36;
  const maxL = Math.max(goal, ...week.map((w) => w.data?.amount ?? 0));

  const sorted = [...history].filter((d) => d.amount > 0).sort((a, b) => b.date.localeCompare(a.date));
  // Le suivi de l'eau est gratuit, historique complet compris
  const visible = sorted;
  const locked: typeof sorted = [];

  return (
    <DetailScreen title="Hydratation" subtitle={reached ? 'Objectif atteint, bravo' : `Objectif ${formatLiters(goal)} litres`}>
      <Enter i={0}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 22 }}>
          <View>
            <Bottle ratio={ratio} size={120} />
            {toast ? (
              <Animated.View key={toast.id} entering={FadeInUp.duration(250)} exiting={FadeOut.duration(250)} style={{ position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: P.ink }}>
                  <Ink size={13} weight="extraBold" color={P.white}>
                    {`${toast.ml > 0 ? '+' : ''}${toast.ml} ml`}
                  </Ink>
                </View>
              </Animated.View>
            ) : null}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Ink size={13} weight="bold" color={P.ink2}>
              Aujourd’hui
            </Ink>
            <Ink size={52} weight="black" tight color={reached ? P.mossText : P.water}>
              {formatLiters(amount)}
              <Ink size={18} weight="black" color={P.muted}>
                {' L'}
              </Ink>
            </Ink>
            <Press onPress={() => setGoalDraft(goalDraft === null ? goal : null)} accessibilityRole="button" accessibilityLabel="Modifier l’objectif">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
                <Ink size={14} weight="bold" color={P.ink2}>
                  {`sur ${formatLiters(goal)} L`}
                </Ink>
                <Icon name="settings" size={14} color={P.muted} width={2} />
              </View>
            </Press>
            <Ink size={13} weight="bold" color={reached ? P.mossText : P.ink2}>
              {reached ? 'Objectif atteint' : `encore ${formatLiters(Math.max(0, goal - amount))} L, soit ${Math.ceil(Math.max(0, goal - amount) / 0.25)} verres`}
            </Ink>
          </View>
        </Card>
      </Enter>

      {goalDraft !== null ? (
        <Enter i={0}>
          <Card style={{ gap: 12 }}>
            <Ink size={15} weight="extraBold">
              Ton objectif par jour
            </Ink>
            <Stepper value={`${formatLiters(goalDraft)} L`} label="Objectif d’eau" onMinus={() => setGoalDraft(Math.max(0.5, Math.round((goalDraft - 0.25) * 100) / 100))} onPlus={() => setGoalDraft(Math.min(10, Math.round((goalDraft + 0.25) * 100) / 100))} color={P.water} />
            <BigButton label="Enregistrer" onPress={saveGoal} />
          </Card>
        </Enter>
      ) : null}

      {/* Ajout */}
      <Enter i={1} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Press onPress={() => add(-0.25)} haptic="none" accessibilityRole="button" accessibilityLabel="Retirer 250 millilitres">
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="minus" size={22} color={P.accent} />
            </View>
          </Press>
          <View style={{ flex: 1 }}>
            <Press onPress={() => add(0.25)} haptic="none" accessibilityRole="button" accessibilityLabel="Ajouter un verre, 250 millilitres">
              <View style={{ height: 64, borderRadius: 20, backgroundColor: paletteSombre() ? P.indigoSoft : '#E6ECF6', alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={17} weight="black" color={P.water}>
                  + un verre
                </Ink>
                <Ink size={11} weight="bold" color={P.water}>
                  250 ml
                </Ink>
              </View>
            </Press>
          </View>
          <View style={{ flex: 1 }}>
            <Press onPress={() => add(0.5)} haptic="none" accessibilityRole="button" accessibilityLabel="Ajouter une bouteille, 500 millilitres">
              <View style={{ height: 64, borderRadius: 20, backgroundColor: P.water, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={17} weight="black" color={P.white}>
                  + une gourde
                </Ink>
                <Ink size={11} weight="bold" color={paletteSombre() ? 'rgba(29,32,41,0.75)' : '#DCE4F3'}>
                  500 ml
                </Ink>
              </View>
            </Press>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[0.1, 0.33, 0.75, 1].map((l) => (
            <View key={l} style={{ flex: 1 }}>
              <Press onPress={() => add(l)} haptic="none" accessibilityRole="button" accessibilityLabel={`Ajouter ${Math.round(l * 1000)} millilitres`}>
                <View style={{ height: 46, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, alignItems: 'center', justifyContent: 'center' }}>
                  <Ink size={14} weight="extraBold" color={P.water}>
                    {l >= 1 ? '+1 L' : `+${Math.round(l * 1000)} ml`}
                  </Ink>
                </View>
              </Press>
            </View>
          ))}
        </View>
      </Enter>

      {/* Semaine */}
      <Enter i={2} style={{ gap: 10 }}>
        <SectionTitle>Ta semaine</SectionTitle>
        <Card style={{ gap: 12 }}>
          <Svg width={chartW} height={110}>
            {week.map((w, i) => {
              const step = chartW / 7;
              const bw = Math.min(26, step * 0.6);
              const v = w.data?.amount ?? 0;
              const hh = v > 0 ? Math.max(8, (v / maxL) * 96) : 6;
              const ok = v > 0 && v >= (w.data?.goal ?? goal);
              return <Rect key={w.key} x={i * step + (step - bw) / 2} y={104 - hh} width={bw} height={hh} rx={bw / 2} fill={v === 0 ? P.line : ok ? P.water : '#9BAAD0'} />;
            })}
            <Path d={`M0 ${104 - (goal / maxL) * 96} H${chartW}`} stroke={P.gold} strokeWidth={2} strokeDasharray="6 5" />
          </Svg>
          <View style={{ flexDirection: 'row', width: chartW }}>
            {week.map((w, i) => (
              <Ink key={w.key} size={12} weight={i === 6 ? 'black' : 'bold'} color={i === 6 ? P.water : P.muted} style={{ flex: 1, textAlign: 'center' }}>
                {w.letter}
              </Ink>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.line2 }}>
            <Stat value={`${success}/7`} label="jours réussis" color={P.mossText} />
            <Stat value={avg > 0 ? formatLiters(Math.round(avg * 10) / 10) : '0'} unit="L" label="par jour en moyenne" color={P.water} />
            <Stat value={withData.length > 0 ? `${Math.round((success / withData.length) * 100)} %` : '0 %'} label="de réussite" />
          </View>
        </Card>
      </Enter>

      {/* Rappels */}
      <Enter i={3} style={{ gap: 10 }}>
        <SectionTitle>Tes rappels</SectionTitle>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Ink size={15} weight="extraBold">
                Penser à boire
              </Ink>
              <Ink size={13} weight="medium" color={P.ink2}>
                Un rappel le matin, l’après-midi et le soir.
              </Ink>
            </View>
            <Toggle value={notif} onChange={toggleNotif} label="Rappels d’hydratation" />
          </View>
          {notif && !slotsOpen ? (
            <Press onPress={() => setSlotsOpen(true)} accessibilityRole="button">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
                <Ink size={14} weight="bold" color={P.ink2} style={{ flex: 1 }}>
                  {(Object.keys(SLOT_LABEL) as SlotKey[])
                    .filter((k) => slots[k].enabled)
                    .map((k) => `${SLOT_LABEL[k].toLowerCase()} ${clock(slots[k].time)}`)
                    .join(', ') || 'aucun créneau actif'}
                </Ink>
                <Ink size={14} weight="bold" color={P.accent}>
                  Régler
                </Ink>
              </View>
            </Press>
          ) : null}
          {notif && slotsOpen ? (
            <View style={{ gap: 14 }}>
              {(Object.keys(SLOT_LABEL) as SlotKey[]).map((k) => (
                <View key={k} style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.line2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ink size={15} weight="extraBold" style={{ flex: 1 }}>
                      {SLOT_LABEL[k]}
                    </Ink>
                    <Toggle value={slots[k].enabled} onChange={(v) => setSlots({ ...slots, [k]: { ...slots[k], enabled: v } })} label={`Rappel du ${SLOT_LABEL[k].toLowerCase()}`} />
                  </View>
                  {slots[k].enabled ? (
                    <>
                      <Stepper value={clock(slots[k].time)} label={`Heure du ${SLOT_LABEL[k].toLowerCase()}`} onMinus={() => setSlots({ ...slots, [k]: { ...slots[k], time: shiftTime(slots[k].time, -30) } })} onPlus={() => setSlots({ ...slots, [k]: { ...slots[k], time: shiftTime(slots[k].time, 30) } })} />
                      <Stepper value={`${slots[k].amount} ml`} label={`Quantité du ${SLOT_LABEL[k].toLowerCase()}`} onMinus={() => setSlots({ ...slots, [k]: { ...slots[k], amount: Math.max(100, slots[k].amount - 50) } })} onPlus={() => setSlots({ ...slots, [k]: { ...slots[k], amount: Math.min(2000, slots[k].amount + 50) } })} color={P.water} />
                    </>
                  ) : null}
                </View>
              ))}
              <BigButton label="Enregistrer mes rappels" onPress={saveSlots} />
            </View>
          ) : null}
        </Card>
      </Enter>

      {/* Historique */}
      {sorted.length > 0 ? (
        <Enter i={4} style={{ gap: 10 }}>
          <SectionTitle>Historique</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {[...visible.map((d) => ({ d, lock: false })), ...locked.map((d) => ({ d, lock: true }))].map(({ d, lock }, i) => {
              const ok = d.amount >= d.goal;
              return (
                <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2, opacity: lock ? 0.4 : 1 }}>
                  <Ink size={15} weight="extraBold" style={{ flex: 1 }}>
                    {dayLabel(d.date, true)}
                  </Ink>
                  <View style={{ width: 70, height: 8, borderRadius: 4, backgroundColor: P.line2, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, (d.amount / d.goal) * 100)}%`, height: 8, backgroundColor: ok ? P.water : '#9BAAD0' }} />
                  </View>
                  <Ink size={15} weight="black" color={ok ? P.mossText : P.ink} style={{ width: 64, textAlign: 'right' }}>
                    {`${formatLiters(d.amount)} L`}
                  </Ink>
                </View>
              );
            })}
            {locked.length > 0 ? (
              <View style={{ marginVertical: 8 }}><BigButton label="Voir tout l’historique" tone="ink" onPress={() => ouvrirPaywall('periode_longue')} /></View>
            ) : null}
          </Card>
        </Enter>
      ) : null}
    </DetailScreen>
  );
}
