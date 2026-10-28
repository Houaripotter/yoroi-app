/**
 * Ma semaine type (refonte v2) : l'ancienne routine hebdomadaire, toujours lisible et modifiable,
 * avec la conversion en creneaux du planning (un seul endroit pour ta semaine).
 * Garde la validation rapide de la seance du jour.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, Icon, P, Press, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Chip, ChipScroll, Field, Label, Stepper } from '@/components/yoroi/v2/competition/ui';
import { addWorkout, getAllWorkouts, getUserClubs, getUserSettings, saveUserSettings } from '@/lib/storage';
import type { UserClub } from '@/lib/storage';
import type { WorkoutType } from '@/types/workout';
import { convertRoutineToPlan, countBlocks, DAY_KEYS, DAY_LABELS, DAY_SHORT, guessSport, isRestDay, sportOfType } from '@/lib/v2/competition/routine';
import type { Routine, RoutineBlock } from '@/lib/v2/competition/routine';
import { isoLocal, mediumDate } from '@/lib/v2/competition/dates';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import logger from '@/lib/security/logger';
import { getSportName } from '@/lib/sports';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type ClubOption = { id: string; name: string; type: string; logoUri?: string | null };
const DEFAULT_CLUBS: ClubOption[] = [
  { id: 'gracie_barra', name: 'Club de JJB', type: 'gracie_barra' },
  { id: 'basic_fit', name: 'Salle de musculation', type: 'basic_fit' },
  { id: 'running', name: getSportName('running'), type: 'running' },
];

const todayIndex = () => {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
};
const fmtTime = (h: number, m: number) => `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;

export default function SportScreen() {
  const router = useRouter();
  const { gender } = useAthlete();
  const [routine, setRoutine] = useState<Routine>({});
  const [clubs, setClubs] = useState<UserClub[]>([]);
  const [convertedAt, setConvertedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(30);
  const [clubId, setClubId] = useState<string | null>(null);
  const [workoutType, setWorkoutType] = useState('');
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [settings, uc] = await Promise.all([getUserSettings(), getUserClubs()]);
      const s = settings as any;
      if (s.weekly_routine && typeof s.weekly_routine === 'object') setRoutine(s.weekly_routine);
      if (s.weekly_routine_converted_at) setConvertedAt(s.weekly_routine_converted_at);
      setClubs(uc);
    } catch (error) {
      logger.error('Erreur chargement données:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const options: ClubOption[] = clubs.length ? clubs.map((c) => ({ id: c.id, name: c.name, type: c.type, logoUri: c.logoUri })) : DEFAULT_CLUBS;
  const { sessions, restDays } = useMemo(() => countBlocks(routine), [routine]);
  const tIdx = todayIndex();
  const todayBlocks = routine[DAY_KEYS[tIdx]] || [];
  const todayActive = todayBlocks.length > 0 && !isRestDay(todayBlocks);

  const sportOf = (b: RoutineBlock) => {
    const c = options.find((o) => o.name === b.activity);
    return c ? sportOfType(c.type) : guessSport(b.activity);
  };

  const save = async (next: Routine) => {
    setRoutine(next);
    try {
      await saveUserSettings({ weekly_routine: next } as any);
    } catch (error) {
      logger.error('Erreur sauvegarde routine:', error);
    }
  };

  const openDay = (key: string) => {
    setEditing(key);
    setClubId(null);
    setWorkoutType('');
  };

  const addBlock = () => {
    if (!editing) return;
    const club = options.find((o) => o.id === clubId);
    if (!club) {
      appAlert(traduire('Choisis un club'), traduire('Sélectionne le club ou l’activité de ce créneau.'));
      return;
    }
    const cur = (routine[editing] || []).filter((b) => b.activity !== 'REPOS');
    if (cur.length >= 3) {
      appAlert(traduire('Trois créneaux au plus'), traduire('Tu ne peux pas ajouter plus de trois entraînements par jour.'));
      return;
    }
    tap('medium');
    save({ ...routine, [editing]: [...cur, { time: fmtTime(hour, minute), activity: club.name, workoutType: workoutType.trim() || undefined }] });
    setClubId(null);
    setWorkoutType('');
  };

  const removeBlock = (key: string, i: number) => {
    const blocks = [...(routine[key] || [])];
    blocks.splice(i, 1);
    const next = { ...routine };
    if (blocks.length) next[key] = blocks;
    else delete next[key];
    save(next);
  };

  const setRest = (key: string) => {
    tap();
    save({ ...routine, [key]: [{ time: '', activity: 'REPOS' }] });
    setEditing(null);
  };

  const validateToday = async () => {
    const first = todayBlocks[0];
    if (!todayActive || !first) {
      appAlert(traduire('Aucune activité'), traduire("Rien n'est prévu aujourd'hui dans ta semaine type."));
      return;
    }
    const club = options.find((o) => o.name === first.activity);
    const sport = sportOf(first);
    const type: WorkoutType | null = club && ['gracie_barra', 'basic_fit', 'running'].includes(club.type) ? (club.type as WorkoutType) : sport === 'jjb' ? 'gracie_barra' : sport === 'musculation' ? 'basic_fit' : sport === 'running' ? 'running' : null;
    if (!type) {
      appAlert(traduire('Activité non reconnue'), traduire('Note plutôt ta séance complète, elle comptera dans ton suivi.'), [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Noter la séance'), onPress: () => router.push('/seance' as any) },
      ]);
      return;
    }
    try {
      const day = isoLocal(new Date());
      const all = await getAllWorkouts();
      if (all.some((w) => w.date === day)) {
        appAlert(traduire('Déjà validé'), traduire("Tu as déjà validé une séance aujourd'hui."));
        return;
      }
      await addWorkout({ date: day, type } as any);
      tap('success');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      appAlert(traduire('Validé'), traduire("Séance {0} validée pour aujourd'hui. Pour garder le détail, note aussi la séance complète.", first.activity), [
        { text: traduire('Plus tard'), style: 'cancel' },
        { text: traduire('Noter la séance'), onPress: () => router.push('/seance' as any) },
      ]);
    } catch (error) {
      logger.error('Erreur validation:', error);
      appAlert(traduire('Validation impossible'), traduire('Réessaie dans un instant.'));
    }
  };

  const convert = async () => {
    setConverting(true);
    try {
      const r = await convertRoutineToPlan(routine, clubs);
      const at = new Date().toISOString();
      await saveUserSettings({ weekly_routine_converted_at: at } as any);
      setConvertedAt(at);
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      tap('success');
      appAlert(traduire('Planning mis à jour'), r.created ? traduirePluriel(r.created, r.created > 1, "{0} créneau ajouté au planning{1}.", "{0} créneaux ajoutéx au planning{1}.", r.created, r.skipped ? `, ${r.skipped} déjà présent${r.skipped > 1 ? 's' : ''}` : '') : traduire('Tous tes créneaux étaient déjà dans le planning.'), [
        { text: traduire('Rester ici'), style: 'cancel' },
        { text: traduire('Ouvrir le planning'), onPress: () => router.push('/planning' as any) },
      ]);
    } catch (error) {
      logger.error('Conversion routine impossible', error);
      appAlert(traduire('Conversion impossible'), traduire('Réessaie dans un instant.'));
    } finally {
      setConverting(false);
    }
  };

  const hasRoutine = Object.keys(routine).length > 0;
  const editBlocks = editing ? routine[editing] || [] : [];
  const editCount = editBlocks.filter((b) => b.activity !== 'REPOS').length;

  return (
    <DetailScreen title={traduire("Ta semaine type")} subtitle={traduire("Ta routine de la semaine")}>
      {loaded && hasRoutine ? (
        <Enter i={0}>
          <Glass style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="calendar" size={22} color={P.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={16} weight="black" tight>
                  {convertedAt ? traduire('Copiée dans ton planning') : traduire('À mettre dans ton planning')}
                </Ink>
                <Ink size={13} weight="medium" color={P.ink2}>
                  {convertedAt ? traduire("Le {0}. Tes créneaux vivent maintenant dans le planning.", mediumDate(new Date(convertedAt))) : traduire('Le planning remplace cette page : rappels, séances prévues, semaine tenue.')}
                </Ink>
              </View>
            </View>
            {convertedAt ? <BigButton label={traduire("Ouvrir le planning")} icon="calendar" onPress={() => router.push('/planning' as any)} /> : <BigButton label={converting ? 'Conversion' : traduire('Convertir en créneaux')} icon="refresh" onPress={convert} disabled={converting} />}
          </Glass>
        </Enter>
      ) : null}

      {loaded && !hasRoutine ? (
        <EmptyState title={traduire("Pas de semaine type")} text={traduire("Tes créneaux réguliers se gèrent maintenant dans le planning. Tu peux aussi en poser un ici, jour par jour.")} action={traduire("Ouvrir le planning")} onAction={() => router.push('/planning' as any)} />
      ) : null}

      <Enter i={1}>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {DAY_KEYS.map((k, i) => {
              const b = routine[k] || [];
              const rest = isRestDay(b);
              return (
                <Press key={k} onPress={() => openDay(k)} accessibilityRole="button" accessibilityLabel={traduire("{0}, {1}. Modifier", DAY_LABELS[i], rest ? traduire('repos') : b.length ? traduirePluriel(b.length, false, "{0} entraînement", "{0} entraînements", b.length) : traduire('rien de prévu'))}>
                  <View style={{ alignItems: 'center', gap: 4, minWidth: 40, minHeight: 44 }}>
                    <View style={{ width: 30, height: 38, borderRadius: 9, backgroundColor: b.length > 0 && !rest ? P.ink : 'transparent', borderWidth: b.length > 0 && !rest ? 0 : 1.5, borderStyle: 'dashed', borderColor: P.dashed }} />
                    <Ink size={12} weight={i === tIdx ? 'black' : 'bold'} color={i === tIdx ? P.accent : P.ink2}>
                      {DAY_SHORT[i]}
                    </Ink>
                  </View>
                </Press>
              );
            })}
          </View>
          <Ink size={13} weight="bold" color={P.ink2}>
            {`${traduirePluriel(sessions, sessions > 1, "{0} entraînement par semaine", "{0} entraînements par semaine", sessions)}, ${traduirePluriel(restDays, restDays > 1, "{0} jour de repos", "{0} jours de repos", restDays)}`}
          </Ink>
        </Card>
      </Enter>

      {todayActive ? (
        <Enter i={2}>
          <BigButton label={traduire("Valider la séance du jour")} icon="check" onPress={validateToday} />
        </Enter>
      ) : null}

      <SectionTitle>{traduire("Jour par jour")}</SectionTitle>
      {DAY_KEYS.map((k, i) => {
        const blocks = routine[k] || [];
        const rest = isRestDay(blocks);
        const first = blocks.find((b) => b.activity !== 'REPOS');
        return (
          <Enter key={k} i={3 + i}>
            <Press onPress={() => openDay(k)} accessibilityRole="button" accessibilityLabel={traduire("Modifier {0}", DAY_LABELS[i])}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderColor: i === tIdx ? P.accent : P.line2, borderWidth: i === tIdx ? 1.5 : 1, overflow: 'hidden' }}>
                <View style={{ width: 92 }}>
                  <Ink size={15} weight="black" tight color={i === tIdx ? P.accent : P.ink} numberOfLines={1}>
                    {DAY_LABELS[i]}
                  </Ink>
                  {i === tIdx ? (
                    <Ink size={11} weight="bold" color={P.accent}>
                      {traduire("Aujourd’hui")}</Ink>
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {rest ? (
                    <Ink size={14} weight="bold" color={P.indigo}>
                      {traduire("Repos")}</Ink>
                  ) : blocks.length ? (
                    blocks.map((b, bi) => (
                      <View key={bi} style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                        {b.time ? (
                          <Ink size={13} weight="black" color={P.ink2}>
                            {b.time}
                          </Ink>
                        ) : null}
                        <Ink size={14} weight="extraBold" style={{ flexShrink: 1 }} numberOfLines={2}>
                          {b.workoutType ? `${b.activity}, ${b.workoutType}` : b.activity}
                        </Ink>
                      </View>
                    ))
                  ) : (
                    <Ink size={13} weight="bold" color={P.muted}>
                      {traduire("Rien de prévu")}</Ink>
                  )}
                </View>
                {first ? <Image source={sportArt(sportOf(first), gender, 1)} style={{ width: 44, height: 58, marginVertical: -12 }} resizeMode="contain" /> : <Icon name="plus" size={18} color={P.muted} />}
              </Card>
            </Press>
          </Enter>
        );
      })}

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing ? DAY_LABELS[DAY_KEYS.indexOf(editing)] : ''} scroll>
        {editBlocks.length ? (
          <View style={{ gap: 8 }}>
            {editBlocks.map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingLeft: 14 }}>
                <Ink size={14} weight="extraBold" style={{ flex: 1 }}>
                  {b.activity === 'REPOS' ? traduire('Jour de repos') : [b.time, b.activity, b.workoutType].filter(Boolean).join(', ')}
                </Ink>
                <Press onPress={() => editing && removeBlock(editing, i)} accessibilityRole="button" accessibilityLabel={traduire("Retirer ce créneau")}>
                  <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="close" size={18} color={P.danger} />
                  </View>
                </Press>
              </View>
            ))}
          </View>
        ) : null}
        {editCount >= 3 ? (
          <Ink size={13} weight="bold" color={P.muted}>
            {traduire("Trois entraînements par jour au maximum.")}</Ink>
        ) : (
          <View style={{ gap: 14 }}>
            <Label>{traduire("Heure")}</Label>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <Stepper value={String(hour).padStart(2, '0')} suffix="heure" label="heure" onMinus={() => setHour((hour + 23) % 24)} onPlus={() => setHour((hour + 1) % 24)} />
              <Stepper value={String(minute).padStart(2, '0')} suffix={traduire("minutes")} label={traduire("minutes")} onMinus={() => setMinute((minute + 45) % 60)} onPlus={() => setMinute((minute + 15) % 60)} />
            </View>
            <Label>{traduire("Club ou activité")}</Label>
            <ChipScroll>
              {options.map((o) => (
                <Chip key={o.id} label={traduire(o.name)} active={clubId === o.id} accent={P.accent} onPress={() => setClubId(clubId === o.id ? null : o.id)} />
              ))}
            </ChipScroll>
            {clubId ? <Field value={workoutType} onChangeText={setWorkoutType} placeholder={traduire("Ex : Pecs et bras, Jambes, Full body")} maxLength={30} /> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <BigButton label={traduire("Jour de repos")} tone="light" onPress={() => editing && setRest(editing)} />
              </View>
              <View style={{ flex: 1 }}>
                <BigButton label={traduire("Ajouter")} icon="plus" onPress={addBlock} disabled={!clubId} />
              </View>
            </View>
          </View>
        )}
      </Sheet>
    </DetailScreen>
  );
}
