/**
 * Compte a rebours de competition (refonte v2) : phase de preparation, plaques des jours restants,
 * check-list qui se deploie a l'approche du jour J. Parametre facultatif : compId (sinon la prochaine).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Enter, Glass, Icon, P, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { CheckDot, InkBar, Note } from '@/components/yoroi/v2/competition/ui';
import { CountdownPlates } from '@/components/yoroi/v2/competition/CountdownPlates';
import { getCompetitions } from '@/lib/database';
import type { Competition } from '@/lib/database';
import { capitalize, daysUntil, longDate, parseLocalDate, startOfToday } from '@/lib/v2/competition/dates';
import { loadChecklist, phaseOf, saveChecklist } from '@/lib/v2/competition/checklist';
import type { PrepStep } from '@/lib/v2/competition/checklist';
import { campStart, loadCamp } from '@/lib/v2/competition/camp';
import { formatKg } from '@/lib/v2/weightStats';

export default function CompetitionCountdownScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ compId?: string }>();
  const [comp, setComp] = useState<Competition | null>(null);
  const [steps, setSteps] = useState<PrepStep[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await getCompetitions().catch(() => [] as Competition[]);
      const now = startOfToday().getTime();
      const target =
        (params.compId && list.find((c) => String(c.id) === params.compId)) ||
        list.filter((c) => parseLocalDate(c.date).getTime() >= now).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())[0] ||
        null;
      setComp(target);
      if (target) {
        setSteps(await loadChecklist(target.id ?? 0));
        const camp = await loadCamp();
        if (camp && (!camp.competitionId || camp.competitionId === target.id)) setElapsed(Math.max(0, -daysUntil(campStart(camp))));
      }
      setLoaded(true);
    })();
  }, [params.compId]);

  const daysLeft = comp ? daysUntil(comp.date) : 0;
  const hoursLeft = useMemo(() => (comp ? Math.max(0, Math.round((parseLocalDate(comp.date).getTime() - Date.now()) / 3600000)) : 0), [comp]);
  const relevant = steps.filter((s) => daysLeft <= s.fromDays);
  const done = relevant.filter((s) => s.checked).length;
  const allDone = relevant.length > 0 && done === relevant.length;
  const upcomingSteps = steps.filter((s) => daysLeft > s.fromDays).sort((a, b) => b.fromDays - a.fromDays);

  const toggle = async (id: string) => {
    const next = steps.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s));
    setSteps(next);
    if (comp?.id != null) await saveChecklist(comp.id, next);
    const rel = next.filter((s) => daysLeft <= s.fromDays);
    if (rel.length && rel.every((s) => s.checked)) tap('success');
  };

  if (!loaded) return <DetailScreen title="Compte à rebours">{null}</DetailScreen>;

  if (!comp) {
    return (
      <DetailScreen title="Compte à rebours">
        <EmptyState title="Aucune compétition à venir" text="Ajoute ta prochaine compétition : tu verras ici chaque jour qui te sépare du combat, et ce qu'il te reste à préparer." action="Ajouter une compétition" onAction={() => router.push('/add-competition' as any)} />
      </DetailScreen>
    );
  }

  const phase = phaseOf(daysLeft);

  return (
    <DetailScreen title="Compte à rebours" subtitle={comp.nom}>
      <Enter i={0}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ backgroundColor: daysLeft < 0 ? P.paper : P.ink, padding: 20, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: daysLeft < 0 ? P.muted : phase.color === P.ink ? P.goldLight : phase.color }} />
              <Ink size={14} weight="extraBold" color={daysLeft < 0 ? P.ink2 : P.goldLight}>
                {phase.label}
              </Ink>
            </View>
            {daysLeft > 1 ? (
              <Ink size={88} weight="black" tight color={P.white} style={{ lineHeight: 92 }}>
                {String(daysLeft)}
                <Ink size={20} weight="extraBold" color="rgba(255,255,255,0.7)">
                  {' jours'}
                </Ink>
              </Ink>
            ) : daysLeft === 1 ? (
              <Ink size={88} weight="black" tight color={P.white} style={{ lineHeight: 92 }}>
                {String(hoursLeft)}
                <Ink size={20} weight="extraBold" color="rgba(255,255,255,0.7)">
                  {' heures'}
                </Ink>
              </Ink>
            ) : daysLeft === 0 ? (
              <Ink size={46} weight="black" tight color={P.white}>
                C'est aujourd'hui
              </Ink>
            ) : (
              <Ink size={40} weight="black" tight color={P.ink2}>
                Terminée
              </Ink>
            )}
            <Ink size={14} weight="bold" color={daysLeft < 0 ? P.ink2 : 'rgba(255,255,255,0.78)'}>
              {[capitalize(longDate(parseLocalDate(comp.date))), comp.lieu].filter(Boolean).join(', ')}
            </Ink>
            {comp.categorie_poids && comp.poids_max ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Icon name="scale" size={16} color={daysLeft < 0 ? P.ink2 : P.goldLight} />
                <Ink size={13} weight="extraBold" color={daysLeft < 0 ? P.ink2 : P.white}>
                  {`Catégorie ${comp.categorie_poids}, ${formatKg(comp.poids_max)} kg max`}
                </Ink>
              </View>
            ) : null}
          </View>
          {daysLeft >= 0 ? (
            <View style={{ padding: 16 }}>
              <CountdownPlates daysLeft={daysLeft} elapsed={elapsed} max={42} plate={24} />
            </View>
          ) : null}
        </Card>
      </Enter>

      {daysLeft >= 0 ? (
        <Enter i={1} style={{ gap: 10 }}>
          <SectionTitle>Check-list de préparation</SectionTitle>
          {relevant.length > 0 ? (
            <Glass style={{ gap: 4, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Ink size={14} weight="extraBold">
                    {`${done} sur ${relevant.length} faites`}
                  </Ink>
                  <InkBar value={relevant.length ? done / relevant.length : 0} color={allDone ? P.accent : P.ink} />
                </View>
                {allDone ? <Hanko size={44} /> : null}
              </View>
              {relevant.map((s, i) => (
                <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: s.checked ? P.accentSoft : P.paper, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                    <Icon name={s.icon} size={19} color={s.checked ? P.accent : P.ink2} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Ink size={15} weight="extraBold" color={s.checked ? P.muted : P.ink} style={{ textDecorationLine: s.checked ? 'line-through' : 'none' }}>
                      {s.label}
                    </Ink>
                    <Ink size={12} weight="medium" color={P.ink2}>
                      {s.description}
                    </Ink>
                  </View>
                  <CheckDot on={s.checked} onPress={() => toggle(s.id)} label={s.label} />
                </View>
              ))}
            </Glass>
          ) : (
            <EmptyState title="Rien à cocher pour l'instant" text="La check-list se déploie au fil des jours. Les premières étapes arrivent deux semaines avant." />
          )}
          {upcomingSteps.length > 0 ? (
            <Card style={{ gap: 10 }}>
              <Ink size={14} weight="extraBold">
                Ce qui arrive ensuite
              </Ink>
              {upcomingSteps.slice(0, 4).map((s) => (
                <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ minWidth: 64, paddingHorizontal: 8, height: 28, borderRadius: 10, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={12} weight="extraBold" color={P.ink2}>
                      {`J moins ${s.fromDays}`}
                    </Ink>
                  </View>
                  <Ink size={14} weight="bold" style={{ flex: 1 }}>
                    {s.label}
                  </Ink>
                </View>
              ))}
            </Card>
          ) : null}
          {daysLeft <= 3 ? <Note>Phase critique. Priorité au sommeil et à l'hydratation, et pas de séance trop intense.</Note> : null}
        </Enter>
      ) : (
        <EmptyState title="Cette compétition est passée" text="Note tes combats pour garder ton palmarès à jour." action="Voir la compétition" onAction={() => router.push(`/competition-detail?id=${comp.id}` as any)} />
      )}
    </DetailScreen>
  );
}
