/**
 * Planning, vue mois : calendrier de tes seances, jours de repos et competitions.
 * Appui sur un jour : ses seances (ouvrir, modifier, supprimer), ajouter, repos.
 * (vague 26) Chaque jour montre la pastille de ses seances : logo du club, sinon ses initiales,
 * sinon l'icone du sport (components/yoroi/v2/seances/MonthMarks.tsx), comme l'ancien calendrier.
 */
import React, { useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { deleteTraining } from '@/lib/database';
import type { Competition, Training, WeeklyPlan } from '@/lib/database';
import { toggleRestDay } from '@/lib/restDaysService';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { durationOf, formatDuration } from '@/lib/v2/trainingWeek';
import { MONTHS, PLAN_DAYS, PLAN_DAYS_SHORT, dateOf, familyInk, isCombat, isoOf, sessionTitle, sportLabel } from '@/lib/v2/seances/sessionData';
import { Icon } from './Icon';
import { DayMarks, SessionMark, groupByDay, monthCells } from './MonthMarks';
import { SessionRow } from './SessionRow';
import { Row, Sheet, tap } from './ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P } from '@/components/yoroi/livePalette';
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { useIllustrations } from '@/components/yoroi/v2/stickers';

type Props = {
  trainings: Training[];
  competitions: Competition[];
  plan: WeeklyPlan[];
  restDays: Set<string>;
  stampedTrainings: Map<number, number>;
  onChanged: () => void;
};

export function PlanMonth({ trainings, competitions, plan, restDays, stampedTrainings, onChanged }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1, 12);
  });
  const [day, setDay] = useState<string | null>(null);
  const [group, setGroup] = useState<{ key: string; name: string } | null>(null);
  const today = isoOf(new Date());

  const byDay = useMemo(() => groupByDay(trainings), [trainings]);

  const compDays = useMemo(() => new Set(competitions.map((cp) => (cp.date ?? '').slice(0, 10))), [competitions]);
  const y = cursor.getFullYear();
  const mo = cursor.getMonth();
  const cells = monthCells(y, mo);

  const monthTrainings = trainings.filter((t) => {
    const d = dateOf(t.date);
    return d.getFullYear() === y && d.getMonth() === mo;
  });
  const monthMinutes = monthTrainings.reduce((s, t) => s + durationOf(t), 0);
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; name: string; count: number; color: string; sample: Training }>();
    monthTrainings.forEach((t) => {
      const key = t.club_id ? `club:${t.club_id}` : t.is_outdoor ? 'outdoor' : `sport:${t.sport}`;
      const name = t.club_id ? t.club_name ?? sportLabel(t.sport) : t.is_outdoor ? traduire('En extérieur') : sportLabel(t.sport);
      const g = m.get(key) ?? { key, name, count: 0, color: t.club_color || familyInk(t.sport), sample: t };
      g.count += 1;
      m.set(key, g);
    });
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [monthTrainings]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupSessions = group
    ? monthTrainings
        .filter((t) => (group.key.startsWith('club:') ? `club:${t.club_id}` === group.key : group.key === 'outdoor' ? !t.club_id && t.is_outdoor : !t.club_id && !t.is_outdoor && `sport:${t.sport}` === group.key))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    : [];

  const remove = (t: Training) => {
    if (!t.id) return;
    appAlert(traduire('Supprimer cette séance ?'), traduire("{0} sera retirée de ton historique.", sessionTitle(t)), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTraining(t.id!);
            notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            onChanged();
          } catch (e) {
            logger.error('Suppression impossible', e);
            appAlert(traduire('Oups'), traduire('La séance n’a pas pu être supprimée.'));
          }
        },
      },
    ]);
  };

  const edit = (t: Training) => {
    setDay(null);
    if (isCombat(t.sport)) router.push({ pathname: '/seance/combat', params: { sport: t.sport, editId: String(t.id) } } as any);
    else router.push((saisieDirecte(t.sport, { date: t.date.slice(0, 10), editId: String(t.id) }) ?? `/seance?date=${t.date.slice(0, 10)}&editId=${t.id}`) as any);
  };

  const dayList = day ? byDay.get(day) ?? [] : [];
  const dayComps = day ? competitions.filter((cp) => (cp.date ?? '').slice(0, 10) === day) : [];
  const dayIdx = day ? (dateOf(day).getDay() + 6) % 7 : 0;
  const daySlots = day ? plan.filter((p) => p.day_of_week === dayIdx && !p.is_rest_day) : [];

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => { tap(); setCursor(new Date(y, mo - 1, 1, 12)); }} accessibilityRole="button" accessibilityLabel={traduire("Mois précédent")} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: P.carte, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color={c.ink} />
        </Pressable>
        <Pressable onPress={() => { tap(); const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1, 12)); }} accessibilityRole="button" accessibilityLabel={traduire("Revenir au mois en cours")} style={{ flex: 1, alignItems: 'center' }}>
          <Ink size={18} weight="black" tight>{`${MONTHS[mo].charAt(0).toUpperCase()}${MONTHS[mo].slice(1)} ${y}`}</Ink>
          <Ink size={12} weight="bold" color={c.textSecondary}>{traduirePluriel(monthTrainings.length, monthTrainings.length > 1, "{0} séance{1}", "{0} séances{1}", monthTrainings.length, monthMinutes ? `, ${formatDuration(monthMinutes)}` : '')}</Ink>
        </Pressable>
        <Pressable onPress={() => { tap(); setCursor(new Date(y, mo + 1, 1, 12)); }} accessibilityRole="button" accessibilityLabel={traduire("Mois suivant")} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: P.carte, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron" size={20} color={c.ink} />
        </Pressable>
      </View>

      <View style={{ borderRadius: 24, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, padding: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          {PLAN_DAYS_SHORT.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{d}</Ink>
            </View>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {cells.slice(r * 7, r * 7 + 7).map((iso, k) => {
              if (!iso) return <View key={k} style={{ flex: 1, height: 60 }} />;
              const list = byDay.get(iso) ?? [];
              const isToday = iso === today;
              const rest = restDays.has(iso);
              const comp = compDays.has(iso);
              const dnum = dateOf(iso).getDate();
              return (
                <Pressable
                  key={k}
                  onPress={() => { tap(); setDay(iso); }}
                  accessibilityRole="button"
                  accessibilityLabel={traduirePluriel(list.length, list.length > 1, "{0}, {1} séance{2}{3}", "{0}, {1} séances{2}{3}", dnum, list.length, rest ? traduire(', repos') : '', comp ? traduire(', compétition') : '')}
                  style={{ flex: 1, height: 60, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{ width: 42, height: 54, borderRadius: 14, alignItems: 'center', paddingTop: 5, gap: 3, backgroundColor: list.length ? c.fillSoft : 'transparent', borderWidth: isToday || comp ? 2 : 0, borderColor: isToday ? c.accent : c.gold }}>
                    <Ink size={13} weight={list.length || isToday ? 'black' : 'bold'} color={isToday ? c.accent : iso > today ? c.textMuted : list.length ? c.ink : c.textSecondary}>{String(dnum)}</Ink>
                    {list.length ? <DayMarks list={list} size={22} ring={c.fillSoft} sticker /> : null}
                    {rest && !list.length ? <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: c.textMuted, marginTop: 8 }} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{illus.stickers ? traduire("Logo : ton club. Sticker : ton sport. Contour or : compétition. Petit trait : jour de repos.") : traduire("Logo ou initiales : ton club. Icône : ton sport. Contour or : compétition. Petit trait : jour de repos.")}</Ink>

      {groups.length ? (
        <View style={{ gap: 8 }}>
          <Ink size={15} weight="extraBold" style={{ paddingHorizontal: 4 }}>{traduire("Ce mois")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {groups.map((g) => (
              <Pressable key={g.key} onPress={() => { tap(); setGroup({ key: g.key, name: g.name }); }} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
                <SessionMark t={g.sample} size={24} />
                <Ink size={14} weight="bold" numberOfLines={2} style={{ maxWidth: 170 }}>{sansTiret(traduire(g.name))}</Ink>
                <Ink size={14} weight="black">{`${g.count}`}</Ink>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Sheet visible={!!day} onClose={() => setDay(null)} title={day ? `${PLAN_DAYS[dayIdx]} ${dateOf(day).getDate()} ${MONTHS[dateOf(day).getMonth()]}` : undefined}>
        {day ? (
          <>
            {dayComps.map((cp) => (
              <Row key={`c${cp.id}`} title={sansTiret(traduire(cp.nom))} sub={sansTiret([cp.lieu, 'compétition'].filter(Boolean).join(', '))} icon="trophy" />
            ))}
            {dayList.map((t) => (
              <View key={t.id} style={{ gap: 6 }}>
                <SessionRow t={t} showDate={false} stamps={t.id ? stampedTrainings.get(t.id) ?? 0 : 0} onBeforeOpen={() => setDay(null)} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => { tap(); edit(t); }} accessibilityRole="button" style={{ flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: c.fillSubtle, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name="edit" size={16} color={c.ink} />
                    <Ink size={13} weight="extraBold">{traduire("Modifier")}</Ink>
                  </Pressable>
                  <Pressable onPress={() => { tap(); remove(t); }} accessibilityRole="button" style={{ flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: c.dangerTint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name="trash" size={16} color={c.danger} />
                    <Ink size={13} weight="extraBold" color={c.danger}>{traduire("Supprimer")}</Ink>
                  </Pressable>
                </View>
              </View>
            ))}
            {!dayList.length && daySlots.length ? (
              <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Créneau prévu : {0}", sansTiret(daySlots.map((s) => `${s.label || sportLabel(s.sport)}${s.time ? ` à ${s.time}` : ''}`).join(', ')))}</Ink>
            ) : null}
            <Row title={traduire("Ajouter une séance ce jour")} icon="plus" onPress={() => { const iso = day; setDay(null); router.push(`/seance?date=${iso}` as any); }} />
            <Row
              title={restDays.has(day) ? traduire('Ce n’est plus un jour de repos') : traduire('Marquer comme jour de repos')}
              icon="moon"
              onPress={async () => {
                try {
                  await toggleRestDay(day);
                  setDay(null);
                  onChanged();
                } catch (e) {
                  logger.error('Jour de repos impossible', e);
                }
              }}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!group} onClose={() => setGroup(null)} title={traduire(group?.name)}>
        <Ink size={13} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
          {traduirePluriel(groupSessions.length, groupSessions.length > 1, "{0} séance en {1}{2}", "{0} séances en {1}{2}", groupSessions.length, MONTHS[mo], groupSessions.reduce((s, t) => s + durationOf(t), 0) ? `, ${formatDuration(groupSessions.reduce((s, t) => s + durationOf(t), 0))}` : '')}
        </Ink>
        {groupSessions.map((t) => (
          <SessionRow key={t.id} t={t} stamps={t.id ? stampedTrainings.get(t.id) ?? 0 : 0} onBeforeOpen={() => setGroup(null)} />
        ))}
      </Sheet>
    </View>
  );
}
