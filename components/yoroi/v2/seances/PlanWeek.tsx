/**
 * Planning, vue semaine : tes creneaux reguliers jour par jour, leur etat (fait, prevu, annule),
 * tes seances et tes competitions, les jours de repos. Validation et annulation d'un creneau.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { cancelSlot, getActiveInjuries, getSlotOccurrences, upsertSlotOccurrence } from '@/lib/database';
import type { Competition, Injury, SlotOccurrence, Training, WeeklyPlan } from '@/lib/database';
import { isSportImpactedByInjury } from '@/lib/slotInjuryService';
import { toggleRestDay } from '@/lib/restDaysService';
import { getSportName } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { formatDuration, mondayOf } from '@/lib/v2/trainingWeek';
import { MONTHS, MONTHS_SHORT, PLAN_DAYS, addDaysISO, dateOf, endTime, familyInk, isoOf, slotWeekStart, sportLabel } from '@/lib/v2/seances/sessionData';
import { Icon } from './Icon';
import { SessionRow } from './SessionRow';
import { BigButton, Glass, Row, Sheet, tap } from './ui';
import { DayDot } from './WeekPlates';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { traduire } from '@/lib/i18n/tr';

type Props = {
  plan: WeeklyPlan[];
  trainings: Training[];
  competitions: Competition[];
  restDays: Set<string>;
  stampedTrainings: Map<number, number>;
  onChanged: () => void;
};

type SlotView = WeeklyPlan & { occ?: SlotOccurrence; iso: string };

const REASONS = ['Fatigue', 'Blessure', 'Travail', 'Famille', 'Malade', 'Autre'];

export function PlanWeek({ plan, trainings, competitions, restDays, stampedTrainings, onChanged }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [occ, setOcc] = useState<SlotOccurrence[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [slot, setSlot] = useState<SlotView | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [reason, setReason] = useState('');

  const today = isoOf(new Date());
  const monday = addDaysISO(mondayOf(today), offset * 7);
  const weekKey = slotWeekStart(offset);

  const loadOcc = useCallback(async () => {
    try {
      setOcc((await getSlotOccurrences(weekKey)) ?? []);
    } catch (e) {
      logger.error('Lecture des créneaux de la semaine impossible', e);
    }
  }, [weekKey]);

  useEffect(() => {
    loadOcc();
  }, [loadOcc, plan]);

  useEffect(() => {
    getActiveInjuries().then((x) => setInjuries(x ?? [])).catch(() => {});
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysISO(monday, i);
      const slots: SlotView[] = plan
        .filter((p) => p.day_of_week === i && !p.is_rest_day)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
        .map((p) => ({ ...p, occ: occ.find((o) => o.weekly_plan_id === p.id), iso }));
      const done = trainings.filter((t) => t.date.slice(0, 10) === iso);
      const comps = competitions.filter((cp) => (cp.date ?? '').slice(0, 10) === iso);
      const rest = restDays.has(iso) || plan.some((p) => p.day_of_week === i && p.is_rest_day);
      return { i, iso, slots, done, comps, rest };
    });
  }, [monday, plan, occ, trainings, competitions, restDays]);

  const allSlots = days.flatMap((d) => d.slots);
  const validated = allSlots.filter((s) => s.occ?.status === 'validated').length;
  const sessions = days.reduce((s, d) => s + d.done.length, 0);
  const weekMinutes = days.reduce((s, d) => s + d.done.reduce((m, t) => m + (t.duration_minutes || t.duration || 0), 0), 0);
  const sunday = addDaysISO(monday, 6);
  const md = dateOf(monday);
  const sd = dateOf(sunday);
  const title = offset === 0 ? traduire('Cette semaine') : offset === -1 ? traduire('Semaine dernière') : offset === 1 ? traduire('Semaine prochaine') : traduire("Semaine du {0} {1}", md.getDate(), MONTHS[md.getMonth()]);
  const range = traduire("du {0} {1}au {2} {3}", md.getDate(), md.getMonth() !== sd.getMonth() ? MONTHS_SHORT[md.getMonth()] + ' ' : '', sd.getDate(), MONTHS_SHORT[sd.getMonth()]);

  const statusOf = (s: SlotView): { label: string; tone: string; state: 'done' | 'planned' | 'missed' | 'cancelled' } => {
    if (s.occ?.status === 'validated') return { label: 'fait', tone: c.successText, state: 'done' };
    if (s.occ?.status === 'cancelled' || s.occ?.status === 'skipped') return { label: s.occ.cancel_reason ? traduire("annulé, {0}", s.occ.cancel_reason.toLowerCase()) : traduire('annulé'), tone: c.textMuted, state: 'cancelled' };
    if (s.iso < today) return { label: traduire('pas validé'), tone: c.accent, state: 'missed' };
    return { label: traduire('prévu'), tone: c.indigo, state: 'planned' };
  };

  const validate = (s: SlotView) => {
    setSlot(null);
    const params = {
      slotId: String(s.id),
      prefillSport: s.sport,
      prefillClubId: s.club_id ? String(s.club_id) : undefined,
      prefillTime: s.time || undefined,
      prefillDuration: s.duration_minutes ? String(s.duration_minutes) : undefined,
      date: s.iso,
    };
    // navigation directe : la saisie du sport du creneau, sans l'ecran relais /seance
    router.push((saisieDirecte(s.sport, params) ?? { pathname: '/seance', params }) as any);
  };

  const doCancel = async (s: SlotView) => {
    if (!s.id) return;
    try {
      const injury = injuries.find((inj) => inj.fit_for_duty !== 'operational' && isSportImpactedByInjury(s.sport, inj));
      await cancelSlot(s.id, weekKey, reason.trim() || undefined, reason === 'Blessure' ? injury?.id : undefined);
      notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
      setSlot(null);
      setCancelMode(false);
      setReason('');
      await loadOcc();
      onChanged();
    } catch (e) {
      logger.error('Annulation du créneau impossible', e);
      appAlert(traduire('Oups'), traduire('Le créneau n’a pas pu être annulé.'));
    }
  };

  const restore = async (s: SlotView) => {
    if (!s.id) return;
    try {
      await upsertSlotOccurrence({ weekly_plan_id: s.id, week_start: weekKey, status: 'pending' });
      tap();
      setSlot(null);
      await loadOcc();
      onChanged();
    } catch (e) {
      logger.error('Rétablissement du créneau impossible', e);
    }
  };

  const toggleRest = async (iso: string) => {
    try {
      await toggleRestDay(iso);
      tap();
      setDay(null);
      onChanged();
    } catch (e) {
      logger.error('Jour de repos impossible', e);
    }
  };

  const slotInjury = slot ? injuries.find((inj) => inj.fit_for_duty !== 'operational' && isSportImpactedByInjury(slot.sport, inj)) : undefined;
  const dayData = day ? days.find((d) => d.iso === day) : undefined;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => { tap(); setOffset((o) => o - 1); }} accessibilityRole="button" accessibilityLabel={traduire("Semaine précédente")} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: P.carte, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color={c.ink} />
        </Pressable>
        <Pressable onPress={() => { if (offset !== 0) { tap(); setOffset(0); } }} accessibilityRole="button" accessibilityLabel={traduire("Revenir à cette semaine")} style={{ flex: 1, alignItems: 'center' }}>
          <Ink size={18} weight="black" tight>{title}</Ink>
          <Ink size={12} weight="bold" color={c.textSecondary}>{range}</Ink>
        </Pressable>
        <Pressable onPress={() => { tap(); setOffset((o) => o + 1); }} accessibilityRole="button" accessibilityLabel={traduire("Semaine suivante")} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: P.carte, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron" size={20} color={c.ink} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {allSlots.length > 0 ? (
          <View style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
            <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Créneaux validés")}</Ink>
            <Ink size={28} weight="black" tight>
              {String(validated)}
              <Ink size={14} weight="bold" color={c.textSecondary}>{traduire(" sur {0}", allSlots.length)}</Ink>
            </Ink>
          </View>
        ) : null}
        <View style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
          <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Séances faites")}</Ink>
          <Ink size={28} weight="black" tight>{String(sessions)}</Ink>
        </View>
        {allSlots.length === 0 ? (
          <View style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
            <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Temps")}</Ink>
            <Ink size={28} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{weekMinutes ? formatDuration(weekMinutes) : '0 min'}</Ink>
          </View>
        ) : null}
      </View>

      {days.map((d) => {
        const isToday = d.iso === today;
        const empty = d.slots.length === 0 && d.done.length === 0 && d.comps.length === 0;
        const plate = d.done.length ? 'done' : d.slots.length ? (d.slots.every((s) => statusOf(s).state === 'cancelled' || statusOf(s).state === 'missed') ? 'missed' : 'planned') : d.rest ? 'rest' : 'empty';
        const dd = dateOf(d.iso);
        return (
          <View key={d.iso} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 34, paddingTop: 2 }}>
              <DayDot state={plate} count={d.done.length} size={30} />
            </View>
            <View style={{ flex: 1, gap: 6, paddingBottom: 6 }}>
              <Pressable onPress={() => { tap(); setDay(d.iso); }} accessibilityRole="button" accessibilityLabel={traduire("{0} {1}, options du jour", PLAN_DAYS[d.i], dd.getDate())} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Ink size={15} weight="extraBold" color={isToday ? c.accent : c.ink}>
                  {`${PLAN_DAYS[d.i]} ${dd.getDate()}`}
                  {isToday ? <Ink size={12} weight="bold" color={c.accent}>{traduire('  aujourd’hui')}</Ink> : null}
                </Ink>
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={16} color={c.textSecondary} strokeWidth={2.6} />
                </View>
              </Pressable>
              {d.comps.map((cp) => (
                <View key={`c${cp.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: c.goldTint }}>
                  <Icon name="trophy" size={20} color={c.goldDeep} />
                  <View style={{ flex: 1 }}>
                    <Ink size={15} weight="extraBold" numberOfLines={2}>{traduire(cp.nom)}</Ink>
                    <Ink size={12} color={c.textSecondary}>{[getSportName(cp.sport), cp.lieu].filter(Boolean).join(', ')}</Ink>
                  </View>
                </View>
              ))}
              {d.slots.map((s) => {
                const st = statusOf(s);
                const linked = s.occ?.training_id != null;
                return (
                  <Pressable
                    key={`s${s.id}`}
                    onPress={() => { tap(); setCancelMode(false); setReason(''); setSlot(s); }}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.label || getSportName(s.sport)}, ${st.label}`}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: pressed ? P.white : st.state === 'planned' ? P.carte : blancA(0.55), borderWidth: 1.5, borderColor: st.state === 'planned' ? c.ink : c.divider, borderStyle: st.state === 'planned' ? 'dashed' : 'solid', opacity: st.state === 'cancelled' ? 0.7 : 1 })}
                  >
                    <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: s.club_color || familyInk(s.sport) }} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={15} weight="extraBold" numberOfLines={2} style={st.state === 'cancelled' ? { textDecorationLine: 'line-through' } : undefined}>{s.label || sportLabel(s.sport)}</Ink>
                      <Ink size={12} color={c.textSecondary} numberOfLines={2}>{[s.time ? `${s.time}${s.duration_minutes ? ` à ${endTime(s.time, s.duration_minutes)}` : ''}` : '', !s.time && s.duration_minutes ? formatDuration(s.duration_minutes) : '', s.club_name].filter(Boolean).join(', ') || 'horaire libre'}</Ink>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: st.state === 'done' ? c.successTint : st.state === 'missed' ? c.accentTint : c.fillSubtle }}>
                      <Ink size={11} weight="extraBold" color={st.tone}>{linked && st.state === 'done' ? 'fait' : st.label.split(',')[0]}</Ink>
                    </View>
                  </Pressable>
                );
              })}
              {d.done.filter((t) => !d.slots.some((s) => s.occ?.training_id === t.id)).map((t) => (
                <SessionRow key={`t${t.id}`} t={t} showDate={false} stamps={t.id ? stampedTrainings.get(t.id) ?? 0 : 0} />
              ))}
              {d.done.filter((t) => d.slots.some((s) => s.occ?.training_id === t.id)).length ? (
                <Ink size={12} color={c.textMuted}>{traduire("Séance liée au créneau, touche le créneau pour l’ouvrir.")}</Ink>
              ) : null}
              {empty ? <Ink size={13} color={c.textMuted}>{d.rest ? traduire('Repos') : 'Libre'}</Ink> : null}
            </View>
          </View>
        );
      })}

      {plan.filter((p) => !p.is_rest_day).length === 0 ? (
        <Glass onPress={() => router.push('/slots' as any)} label={traduire("Créer tes créneaux réguliers")} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="repeat" size={24} color={c.indigo} />
          <View style={{ flex: 1 }}>
            <Ink size={15} weight="extraBold">{traduire("Crée tes créneaux réguliers")}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire("Ton cours du mardi, ta muscu du jeudi... Ils reviennent chaque semaine, tu n’as plus qu’à valider.")}</Ink>
          </View>
        </Glass>
      ) : null}

      {/* Feuille d'un creneau */}
      <Sheet visible={!!slot} onClose={() => setSlot(null)} title={slot ? slot.label || sportLabel(slot.sport) : undefined}>
        {slot ? (
          <>
            <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
              {[`${PLAN_DAYS[slot.day_of_week]} ${dateOf(slot.iso).getDate()}`, slot.time ? `${slot.time}${slot.duration_minutes ? ` à ${endTime(slot.time, slot.duration_minutes)}` : ''}` : '', slot.club_name].filter(Boolean).join(', ')}
            </Ink>
            {slotInjury && statusOf(slot).state !== 'done' ? (
              <View style={{ padding: 12, borderRadius: 16, backgroundColor: c.dangerTint, gap: 2 }}>
                <Ink size={14} weight="extraBold" color={c.danger}>{traduire("Attention à ta blessure")}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire("{0} peut être sollicitée dans ce sport. Écoute ton corps.", slotInjury.zone_name ?? 'Une blessure en cours')}</Ink>
              </View>
            ) : null}
            {statusOf(slot).state === 'done' ? (
              <>
                <Row title={traduire("Créneau validé")} sub={traduire("Bien joué, une séance de plus")} icon="check" />
                {slot.occ?.training_id ? <Row title={traduire("Voir la séance")} icon="list" onPress={() => { const id = slot.occ!.training_id!; setSlot(null); router.push({ pathname: '/workout-detail', params: { id: String(id) } } as any); }} /> : null}
              </>
            ) : statusOf(slot).state === 'cancelled' ? (
              <>
                <Row title={traduire("Créneau annulé")} sub={slot.occ?.cancel_reason || undefined} icon="close" />
                {offset === 0 ? <Row title={traduire("Rétablir le créneau")} icon="refresh" onPress={() => restore(slot)} /> : null}
              </>
            ) : cancelMode ? (
              <>
                <Ink size={15} weight="extraBold" style={{ paddingHorizontal: 4 }}>{traduire("Pourquoi tu l’annules ?")}</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {REASONS.map((r) => (
                    <Pressable key={r} onPress={() => { tap(); setReason(r); }} accessibilityRole="button" accessibilityState={{ selected: reason === r }} style={{ minHeight: 40, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 12, backgroundColor: reason === r ? c.ink : 'transparent', borderWidth: reason === r ? 0 : 1.5, borderColor: '#D5D2CA' }}>
                      <Ink size={13} weight="bold" color={reason === r ? c.background : c.textSecondary}>{traduire(r)}</Ink>
                    </Pressable>
                  ))}
                </View>
                <TextInput value={REASONS.includes(reason) ? '' : reason} onChangeText={setReason} placeholder={traduire("Ou écris ta raison (facultatif)")} placeholderTextColor={c.textMuted} style={{ minHeight: 48, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, fontSize: 15, color: c.ink }} />
                <BigButton label={traduire("Annuler ce créneau")} tone="danger" icon="close" onPress={() => doCancel(slot)} />
                <BigButton label={traduire("Finalement je le garde")} tone="soft" onPress={() => setCancelMode(false)} />
              </>
            ) : offset === 0 ? (
              <>
                <BigButton label={traduire("Valider, j’y suis allé")} icon="check" onPress={() => validate(slot)} />
                <BigButton label={traduire("Annuler cette semaine")} tone="soft" icon="close" onPress={() => setCancelMode(true)} />
                <Row title={traduire("Modifier mes créneaux réguliers")} icon="edit" onPress={() => { setSlot(null); router.push('/slots' as any); }} />
              </>
            ) : (
              <>
                {slot.iso <= today ? (
                  <Row title={traduire("Ajouter la séance de ce jour")} sub={traduire("Le créneau d’une autre semaine ne se valide plus")} icon="plus" onPress={() => { const iso = slot.iso; setSlot(null); router.push(`/seance?date=${iso}` as any); }} />
                ) : (
                  <Row title={traduire("Prévu ce jour")} sub={traduire("Tu pourras le valider dans sa semaine")} icon="calendar" />
                )}
                <Row title={traduire("Modifier mes créneaux réguliers")} icon="edit" onPress={() => { setSlot(null); router.push('/slots' as any); }} />
              </>
            )}
          </>
        ) : null}
      </Sheet>

      {/* Feuille d'un jour */}
      <Sheet visible={!!dayData} onClose={() => setDay(null)} title={dayData ? `${PLAN_DAYS[dayData.i]} ${dateOf(dayData.iso).getDate()} ${MONTHS[dateOf(dayData.iso).getMonth()]}` : undefined}>
        {dayData ? (
          <>
            <Row title={traduire("Ajouter une séance ce jour")} icon="plus" onPress={() => { const iso = dayData.iso; setDay(null); router.push(`/seance?date=${iso}` as any); }} />
            <Row title={restDays.has(dayData.iso) ? traduire('Ce n’est plus un jour de repos') : traduire('Marquer comme jour de repos')} icon="moon" onPress={() => toggleRest(dayData.iso)} />
            <Row title={traduire("Gérer mes créneaux réguliers")} icon="repeat" onPress={() => { setDay(null); router.push('/slots' as any); }} />
            <Row title={traduire("Ajouter une compétition")} icon="trophy" onPress={() => { setDay(null); router.push('/add-competition' as any); }} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
