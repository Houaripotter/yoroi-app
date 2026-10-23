/**
 * Creneaux reguliers v2 : tes entrainements qui reviennent chaque semaine.
 * Ajouter, modifier, supprimer un creneau ; assiduite sur 4 semaines ;
 * annulation des creneaux touches par une blessure.
 * Vague 14 : si tu avais une ancienne semaine type (/sport), un lien discret y mene d'ici.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { DeviceEventEmitter, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { addWeeklyPlanItem, cancelSlot, deleteWeeklyPlanItem, getClubs, getSlotAttendanceRate, getSlotOccurrences, getWeeklyPlan, updateWeeklyPlanItem } from '@/lib/database';
import type { Club, Injury, SlotOccurrence, WeeklyPlan } from '@/lib/database';
import { getInjuriesWithZoneNames } from '@/lib/infirmaryService';
import { isSportImpactedByInjury } from '@/lib/slotInjuryService';
import { DURATION_PRESETS, getSessionTypesForSport } from '@/lib/sessionTypes';
import { SPORTS, getSportName } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { getUserSettings } from '@/lib/storage';
import { getEspace } from '@/lib/v2/espace';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { formatDuration } from '@/lib/v2/trainingWeek';
import { PLAN_DAYS, PLAN_DAYS_SHORT, endTime, familyInk, slotWeekStart, sportLabel } from '@/lib/v2/seances/sessionData';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { BackButton, BigButton, Chip, EmptyState, Glass, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';

const QUICK = ['jjb', 'musculation', 'boxe', 'mma', 'muay_thai', 'judo', 'grappling', 'crossfit', 'running', 'kickboxing'];

type Draft = { id?: number; day: number; sport: string; clubId: number | null; time: string; duration: number; type: string; label: string };

function shiftTime(t: string, min: number): string {
  const [h, m] = t.split(':').map(Number);
  let tot = (h * 60 + m + min) % 1440;
  if (tot < 0) tot += 1440;
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
}

export default function SlotsScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<WeeklyPlan[]>([]);
  const [occ, setOcc] = useState<SlotOccurrence[]>([]);
  const [rates, setRates] = useState<Record<number, { rate: number; validated: number; total: number }>>({});
  const [clubs, setClubs] = useState<Club[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasRoutine, setHasRoutine] = useState(false);
  // vague 28 : jours choisis a l'onboarding (0 = lundi) et sports favoris, pour preremplir un nouveau creneau
  const [typeDays, setTypeDays] = useState<number[]>([]);
  const [favSport, setFavSport] = useState<string | null>(null);
  const weekKey = slotWeekStart();

  const load = useCallback(async () => {
    try {
      const [p, o, cl] = await Promise.all([getWeeklyPlan(), getSlotOccurrences(weekKey), getClubs()]);
      setPlan(p ?? []);
      setOcc(o ?? []);
      setClubs(cl ?? []);
      const r: Record<number, { rate: number; validated: number; total: number }> = {};
      for (const s of p ?? []) if (s.id && !s.is_rest_day) r[s.id] = await getSlotAttendanceRate(s.id);
      setRates(r);
    } catch (e) {
      logger.error('Lecture des créneaux impossible', e);
    }
    try {
      const all = await getInjuriesWithZoneNames();
      setInjuries((all ?? []).filter((i: Injury) => i.status === 'active' || i.status === 'healing'));
    } catch {
      // blessures facultatives
    }
    try {
      const esp = await getEspace();
      setTypeDays(esp.joursSemaine ?? []);
      setFavSport(esp.sportsFavoris?.[0] ?? null);
    } catch {
      // facultatif
    }
    try {
      const st = (await getUserSettings()) as any;
      const r = st?.weekly_routine;
      setHasRoutine(!!r && typeof r === 'object' && Object.values(r).some((v: any) => Array.isArray(v) && v.length > 0));
    } catch {
      setHasRoutine(false);
    }
  }, [weekKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const work = plan.filter((p) => !p.is_rest_day);
  const impacted = useMemo(() => work.filter((s) => injuries.some((inj) => inj.fit_for_duty !== 'operational' && isSportImpactedByInjury(s.sport, inj))), [work, injuries]);
  const impactedPending = impacted.filter((s) => {
    const o = occ.find((x) => x.weekly_plan_id === s.id);
    return !o || o.status === 'pending';
  });

  // jour propose : le premier de tes jours choisis qui n'a pas encore de creneau, sinon aujourd'hui
  const defaultDay = () => typeDays.find((j) => !work.some((w) => w.day_of_week === j)) ?? (new Date().getDay() + 6) % 7;
  const openNew = (day = defaultDay()) => {
    setSearch('');
    setDraft({ day, sport: work[0]?.sport ?? favSport ?? 'jjb', clubId: work[0]?.club_id ?? null, time: '18:00', duration: 60, type: '', label: '' });
  };
  const openEdit = (s: WeeklyPlan) => {
    setSearch('');
    setDraft({ id: s.id, day: s.day_of_week, sport: s.sport, clubId: s.club_id ?? null, time: s.time || '18:00', duration: s.duration_minutes || 60, type: s.session_type || '', label: s.label || '' });
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const data: WeeklyPlan = { day_of_week: draft.day, sport: draft.sport, club_id: draft.clubId || undefined, time: draft.time, duration_minutes: draft.duration, session_type: draft.type || undefined, label: draft.label.trim() || undefined };
      if (draft.id) await updateWeeklyPlanItem(draft.id, data);
      else await addWeeklyPlanItem(data);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setDraft(null);
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      await load();
    } catch (e) {
      logger.error('Enregistrement du créneau impossible', e);
      appAlert('Oups', 'Le créneau n’a pas pu être enregistré.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!draft?.id) return;
    const id = draft.id;
    appAlert('Supprimer ce créneau ?', 'Il ne reviendra plus chaque semaine. Tes séances déjà faites restent.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWeeklyPlanItem(id);
            notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
            setDraft(null);
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            await load();
          } catch (e) {
            logger.error('Suppression du créneau impossible', e);
          }
        },
      },
    ]);
  };

  const cancelInjured = async () => {
    try {
      for (const s of impactedPending) {
        const inj = injuries.find((i) => i.fit_for_duty !== 'operational' && isSportImpactedByInjury(s.sport, i));
        if (s.id) await cancelSlot(s.id, weekKey, 'Blessure active', inj?.id);
      }
      notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      await load();
    } catch (e) {
      logger.error('Annulation des créneaux impossible', e);
    }
  };

  const sportResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return SPORTS.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q)).slice(0, 10);
  }, [search]);
  const sportChoices = draft ? Array.from(new Set([draft.sport, ...clubs.map((cl) => cl.sport), ...work.map((w) => w.sport), ...QUICK])).slice(0, 12) : [];
  const types = draft ? getSessionTypesForSport(draft.sport) : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        <EnTete titre="Créneaux réguliers" sousTitre={work.length ? `${work.length} créneau${work.length > 1 ? 'x' : ''} par semaine` : 'Tes entraînements de chaque semaine'} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />

        {impactedPending.length > 0 ? (
          <Glass style={{ gap: 8, borderColor: c.dangerTint }}>
            <Ink size={16} weight="black" tight color={c.danger}>Une blessure touche certains créneaux</Ink>
            <Ink size={13} color={c.textSecondary}>{`${impactedPending.length} créneau${impactedPending.length > 1 ? 'x' : ''} de cette semaine sollicite${impactedPending.length > 1 ? 'nt' : ''} la zone blessée.`}</Ink>
            <BigButton label="Les annuler cette semaine" tone="danger" icon="close" onPress={cancelInjured} />
          </Glass>
        ) : null}

        {work.length === 0 ? (
          <EmptyState title="Aucun créneau pour l’instant" text="Ajoute ton cours du mardi soir ou ta muscu du jeudi. Il revient chaque semaine dans ton planning, tu n’as plus qu’à valider." action="Ajouter un créneau" onAction={() => openNew()} />
        ) : null}

        {PLAN_DAYS.map((dname, d) => {
          const list = work.filter((s) => s.day_of_week === d).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
          if (!list.length) return null;
          return (
            <View key={dname} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4 }}>
                <Ink size={16} weight="extraBold">{dname.charAt(0).toUpperCase() + dname.slice(1)}</Ink>
                <Pressable onPress={() => { tap(); openNew(d); }} accessibilityRole="button" accessibilityLabel={`Ajouter un créneau le ${dname}`} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={16} color={c.textSecondary} strokeWidth={2.6} />
                </Pressable>
              </View>
              {list.map((s) => {
                const o = occ.find((x) => x.weekly_plan_id === s.id);
                const r = s.id ? rates[s.id] : undefined;
                const hurt = impacted.some((x) => x.id === s.id);
                return (
                  <Pressable key={s.id} onPress={() => { tap(); openEdit(s); }} accessibilityRole="button" accessibilityLabel={`Modifier ${s.label || getSportName(s.sport)}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: pressed ? P.white : blancA(0.8), borderWidth: 1, borderColor: hurt ? c.accentTint : c.divider })}>
                    <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: s.club_color || familyInk(s.sport) }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={16} weight="extraBold" numberOfLines={1}>{s.label || sportLabel(s.sport)}</Ink>
                      <Ink size={12} color={c.textSecondary} numberOfLines={1}>{[s.time ? `${s.time}${s.duration_minutes ? ` à ${endTime(s.time, s.duration_minutes)}` : ''}` : '', s.club_name, s.session_type].filter(Boolean).join(', ')}</Ink>
                      {r && r.total > 0 ? <Ink size={11} weight="bold" color={c.textMuted}>{`${r.validated} sur ${r.total} ces dernières semaines`}</Ink> : null}
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: o?.status === 'validated' ? c.successTint : o?.status === 'cancelled' ? c.fillSubtle : c.indigoTint }}>
                      <Ink size={11} weight="extraBold" color={o?.status === 'validated' ? c.successText : o?.status === 'cancelled' ? c.textMuted : c.indigo}>{o?.status === 'validated' ? 'fait' : o?.status === 'cancelled' ? 'annulé' : 'prévu'}</Ink>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {work.length > 0 ? <BigButton label="Ajouter un créneau" icon="plus" onPress={() => openNew()} style={{ marginTop: 6 }} /> : null}
        <Pressable onPress={() => { tap(); router.push('/planning' as any); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={14} weight="extraBold" color={c.accent}>Voir mon planning de la semaine</Ink>
        </Pressable>
        {hasRoutine ? (
          <Pressable onPress={() => { tap(); router.push('/sport' as any); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={14} weight="bold" color={c.textSecondary}>Ta semaine type</Ink>
          </Pressable>
        ) : null}
      </ScrollView>

      <Sheet visible={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Modifier le créneau' : 'Nouveau créneau'}>
        {draft ? (
          <>
            <Ink size={14} weight="bold" color={c.textSecondary}>Jour</Ink>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {PLAN_DAYS_SHORT.map((l, i) => {
                const on = draft.day === i;
                return (
                  <Pressable key={i} onPress={() => { tap(); setDraft({ ...draft, day: i }); }} accessibilityRole="button" accessibilityLabel={PLAN_DAYS[i]} accessibilityState={{ selected: on }} style={{ flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : blancA(0.8), borderWidth: on ? 0 : 1, borderColor: c.border }}>
                    <Ink size={15} weight="black" color={on ? P.paper : c.ink}>{l}</Ink>
                  </Pressable>
                );
              })}
            </View>

            <Ink size={14} weight="bold" color={c.textSecondary}>{`Sport : ${getSportName(draft.sport)}`}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {sportChoices.map((id) => (
                <Chip key={id} label={getSportName(id)} on={id === draft.sport} onPress={() => setDraft({ ...draft, sport: id, type: '' })} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 46, borderRadius: 14, backgroundColor: P.white, borderWidth: 1, borderColor: c.border }}>
              <Icon name="search" size={18} color={c.textMuted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Un autre sport" placeholderTextColor={c.textMuted} style={{ flex: 1, fontSize: 15, color: c.ink, paddingVertical: 8 }} />
            </View>
            {sportResults.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {sportResults.map((s) => (
                  <Chip key={s.id} label={s.name} on={s.id === draft.sport} onPress={() => { setDraft({ ...draft, sport: s.id, type: '' }); setSearch(''); }} />
                ))}
              </View>
            ) : null}

            {clubs.length ? (
              <>
                <Ink size={14} weight="bold" color={c.textSecondary}>Club</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <Chip label="Aucun" on={!draft.clubId} onPress={() => setDraft({ ...draft, clubId: null })} />
                  {clubs.map((cl) => (
                    <Chip key={cl.id} label={cl.name} on={draft.clubId === cl.id} onPress={() => setDraft({ ...draft, clubId: cl.id ?? null, sport: draft.clubId === cl.id ? draft.sport : cl.sport })} />
                  ))}
                </View>
              </>
            ) : null}

            <Ink size={14} weight="bold" color={c.textSecondary}>Heure</Ink>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable onPress={() => { tap(); setDraft({ ...draft, time: shiftTime(draft.time, -15) }); }} accessibilityRole="button" accessibilityLabel="Un quart d’heure plus tôt" style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={22} weight="black">−</Ink>
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ink size={34} weight="black" tight>{draft.time.replace(':', ' h ')}</Ink>
                <Ink size={12} weight="bold" color={c.textMuted}>{`fin à ${endTime(draft.time, draft.duration)}`}</Ink>
              </View>
              <Pressable onPress={() => { tap(); setDraft({ ...draft, time: shiftTime(draft.time, 15) }); }} accessibilityRole="button" accessibilityLabel="Un quart d’heure plus tard" style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={20} color={c.ink} strokeWidth={2.6} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['07:00', '12:00', '12:30', '18:00', '19:00', '19:30', '20:00'].map((t) => (
                <Chip key={t} label={t.replace(':', ' h ')} on={draft.time === t} onPress={() => setDraft({ ...draft, time: t })} />
              ))}
            </View>

            <Ink size={14} weight="bold" color={c.textSecondary}>Durée</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {DURATION_PRESETS.map((d) => (
                <Chip key={d.value} label={formatDuration(d.value)} on={draft.duration === d.value} onPress={() => setDraft({ ...draft, duration: d.value })} />
              ))}
            </View>

            <Ink size={14} weight="bold" color={c.textSecondary}>Type de séance</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {types.map((t) => (
                <Chip key={t} label={t} on={draft.type === t} onPress={() => setDraft({ ...draft, type: draft.type === t ? '' : t })} />
              ))}
            </View>

            <Ink size={14} weight="bold" color={c.textSecondary}>Nom (facultatif)</Ink>
            <TextInput value={draft.label} onChangeText={(v) => setDraft({ ...draft, label: v })} placeholder="Ex. Cours débutants, Haut du corps" placeholderTextColor={c.textMuted} style={{ minHeight: 48, borderRadius: 14, backgroundColor: P.white, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, fontSize: 15, color: c.ink }} />

            <BigButton label={saving ? 'Enregistrement...' : draft.id ? 'Enregistrer' : 'Ajouter ce créneau'} icon="check" onPress={save} />
            {draft.id ? <BigButton label="Supprimer ce créneau" icon="trash" tone="danger" onPress={remove} /> : null}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
