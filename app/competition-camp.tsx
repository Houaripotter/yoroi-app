/**
 * Camp de competition (refonte v2) : periodisation en trois phases et plan semaine par semaine,
 * chaque jour une plaque. Lance ton camp pour voir les jours faits se lacer de rouge.
 * Parametre facultatif : compId (sinon la prochaine competition sert de repere).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, P, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { DayPlate, Note, Stepper } from '@/components/yoroi/v2/competition/ui';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { getCompetitionById, getNextCompetition } from '@/lib/fighterModeService';
import type { Competition } from '@/lib/fighterMode';
import { campStart, generateCamp, LOAD_LABELS, loadCamp, saveCamp, todayIso, trainingDaysOf } from '@/lib/v2/competition/camp';
import type { SavedCamp } from '@/lib/v2/competition/camp';
import { addDays, daysUntil, mediumDate, parseLocalDate, startOfToday } from '@/lib/v2/competition/dates';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

const clampWeeks = (n: number) => Math.max(2, Math.min(24, n));

export default function CompetitionCampScreen() {
  const params = useLocalSearchParams<{ compId?: string }>();
  const [comp, setComp] = useState<Competition | null>(null);
  const [weeks, setWeeks] = useState(8);
  const [sessions, setSessions] = useState(4);
  const [saved, setSaved] = useState<SavedCamp | null>(null);

  useEffect(() => {
    (async () => {
      const id = parseInt(params.compId ?? '', 10);
      const c = !isNaN(id) ? await getCompetitionById(id).catch(() => null) : await getNextCompetition().catch(() => null);
      setComp(c);
      const s = await loadCamp();
      if (s) {
        setSaved(s);
        setWeeks(s.weeks);
        setSessions(s.sessions);
      } else if (c) {
        const d = daysUntil(c.date);
        if (d > 0) setWeeks(clampWeeks(Math.ceil(d / 7)));
      }
    })();
  }, [params.compId]);

  const start = saved ? campStart(saved) : startOfToday();
  const camp = useMemo(() => generateCamp(weeks, sessions, start), [weeks, sessions, saved?.start]);
  const elapsed = saved ? Math.max(0, -daysUntil(start)) : -1;
  const totalDays = weeks * 7;
  const end = addDays(start, totalDays);

  const changeWeeks = (n: number) => {
    if (saved) return;
    tap();
    setWeeks(clampWeeks(n));
  };
  const changeSessions = (n: number) => {
    tap();
    const v = Math.max(1, Math.min(7, n));
    setSessions(v);
    if (saved) {
      const next = { ...saved, sessions: v };
      setSaved(next);
      saveCamp(next);
    }
  };

  const launch = async () => {
    const s: SavedCamp = { start: todayIso(), weeks, sessions, competitionId: comp?.id ?? null };
    await saveCamp(s);
    setSaved(s);
    tap('success');
  };
  const reset = () => {
    appAlert('Arrêter ce camp', 'Le suivi des jours faits sera effacé. Tu pourras en lancer un nouveau.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Arrêter',
        style: 'destructive',
        onPress: async () => {
          await saveCamp(null);
          setSaved(null);
        },
      },
    ]);
  };

  return (
    <PremiumGate source="camp_competition" featureTitle="Camp de compétition" perks={['Ton camp calé sur ta compétition', 'Les phases de préparation semaine par semaine', 'Des conseils concrets pour chaque phase']}>
      <DetailScreen title="Camp de compétition" subtitle={comp ? `${comp.nom}, ${mediumDate(parseLocalDate(comp.date))}` : 'Ta préparation en trois phases'}>
        <Enter i={0}>
          <Card style={{ gap: 16 }}>
            {saved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Ink size={12} weight="bold" color={P.muted}>
                    Ton camp est lancé
                  </Ink>
                  <Ink size={34} weight="black" tight>
                    {elapsed >= totalDays ? 'Camp terminé' : `Jour ${elapsed + 1}`}
                    {elapsed < totalDays ? (
                      <Ink size={15} weight="bold" color={P.muted}>
                        {` sur ${totalDays}`}
                      </Ink>
                    ) : null}
                  </Ink>
                  <Ink size={13} weight="bold" color={P.ink2}>
                    {`Du ${mediumDate(start, false)} au ${mediumDate(end, false)}`}
                  </Ink>
                </View>
                <Hanko size={52} />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">
                  Semaines
                </Ink>
                <Ink size={12} weight="bold" color={P.muted}>
                  {saved ? 'Fixé au lancement' : comp ? 'Calé sur ta compétition' : 'Avant la compétition'}
                </Ink>
              </View>
              <Stepper value={String(weeks)} label="semaines" onMinus={() => changeWeeks(weeks - 1)} onPlus={() => changeWeeks(weeks + 1)} />
            </View>
            <View style={{ height: 1, backgroundColor: P.line2 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">
                  Séances par semaine
                </Ink>
                <Ink size={12} weight="bold" color={P.muted}>
                  Ton rythme actuel
                </Ink>
              </View>
              <Stepper value={String(sessions)} label="séances par semaine" onMinus={() => changeSessions(sessions - 1)} onPlus={() => changeSessions(sessions + 1)} />
            </View>
          </Card>
        </Enter>

        <Enter i={1}>
          <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 3 }}>
            {camp.phases.map((ph) => (
              <View key={ph.key} style={{ flex: ph.weeks, backgroundColor: ph.color, borderRadius: 7 }} />
            ))}
          </View>
        </Enter>

        {camp.phases.map((ph, i) => (
          <Enter key={ph.key} i={2 + i}>
            <Card style={{ gap: 10, overflow: 'hidden' }}>
              <View pointerEvents="none" style={{ position: 'absolute', right: -8, top: -14 }}>
                <Glyph kind="sakura" size={96} color="#F0EDE6" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: ph.color }} />
                <Ink size={17} weight="black" tight style={{ flex: 1 }}>
                  {ph.name}
                </Ink>
                <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 10, backgroundColor: P.paper, justifyContent: 'center' }}>
                  <Ink size={12} weight="extraBold" color={ph.color}>
                    {`${ph.weeks} sem.`}
                  </Ink>
                </View>
              </View>
              <Ink size={14} weight="medium" color={P.ink2} style={{ lineHeight: 20 }}>
                {ph.focus}
              </Ink>
              <View style={{ gap: 6 }}>
                {ph.tips.map((t) => (
                  <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ph.color, marginTop: 7 }} />
                    <Ink size={13} weight="bold" color={P.ink} style={{ flex: 1, lineHeight: 19 }}>
                      {t}
                    </Ink>
                  </View>
                ))}
              </View>
            </Card>
          </Enter>
        ))}

        <SectionTitle>Semaine par semaine</SectionTitle>
        <Glass style={{ padding: 14, gap: 4 }}>
          {camp.weeks.map((w, wi) => {
            const pattern = trainingDaysOf(w.sessions);
            return (
              <View key={w.weekNumber} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: wi === 0 ? 0 : 1, borderTopColor: P.line2 }}>
                <View style={{ width: 62 }}>
                  <Ink size={15} weight="black" tight color={w.color}>
                    {`S${w.weekNumber}`}
                  </Ink>
                  <Ink size={11} weight="bold" color={P.muted}>
                    {w.startLabel}
                  </Ink>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {pattern.map((on, di) => {
                      const dayIndex = wi * 7 + di;
                      const state = elapsed < 0 ? (on ? 'future' : 'rest') : dayIndex < elapsed ? 'past' : dayIndex === elapsed ? 'today' : on ? 'future' : 'rest';
                      return <DayPlate key={di} state={state} w={18} color={on ? P.ink : P.lacquer} />;
                    })}
                  </View>
                  <Ink size={11} weight="bold" color={P.ink2}>
                    {`${w.sessions} séances, ${LOAD_LABELS[w.loadLevel].toLowerCase()}`}
                  </Ink>
                </View>
              </View>
            );
          })}
        </Glass>

        {saved ? <BigButton label="Arrêter ce camp" tone="light" onPress={reset} /> : <BigButton label="Lancer mon camp" icon="play" onPress={launch} />}

        <Note>Ce plan suit une périodisation classique. Adapte-le à tes sensations et aux conseils de ton coach, et regarde ta récupération du jour pour ajuster la charge.</Note>
      </DetailScreen>
    </PremiumGate>
  );
}
