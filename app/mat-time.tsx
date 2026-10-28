/**
 * Temps sur le tatami v2 : tes heures de JJB, MMA, judo, lutte et grappling.
 * Objectif de la semaine en anneau au pinceau (modifiable), chemin vers 1 000 h
 * en tatamis qui s'encrent, semaine en colonnes, repartition par discipline.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { SPORTS, getSportName } from '@/lib/sports';
import type { Training } from '@/lib/database';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { monthLong, parseDate, plural } from '@/lib/v2/combat/rounds';
import { BigButton, BrushRing, Card, DetailScreen, EmptyState, Enter, FormSheet, Glass, Hanko, P, Press, RankRow, Section, Stat, Stepper, V } from '@/components/yoroi/v2/combat/ui';
import { BrushColumns } from '@/components/yoroi/v2/combat/charts';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

const GOAL_KEY = '@yoroi_mat_time_goal';
const TARGET_H = 1000;
const MAT_NAMES = ['jjb', 'jiu-jitsu', 'mma', 'judo', 'lutte', 'grappling', 'no-gi', 'wrestling', 'submission', 'sambo'];
const MAT_IDS = new Set(SPORTS.filter((s) => s.category === 'combat_grappling' || s.id === 'mma').map((s) => s.id));
const DAYS = [traduire('Lun'), traduire('Mar'), traduire('Mer'), traduire('Jeu'), traduire('Ven'), traduire('Sam'), traduire('Dim')];

function isMat(t: Training & { activity_type?: string }): boolean {
  const sp = (t.sport ?? '').toLowerCase();
  if (MAT_IDS.has(sp)) return true;
  const at = (t.activity_type ?? '').toLowerCase();
  return MAT_NAMES.some((n) => sp.includes(n) || at.includes(n));
}

const minutesOf = (t: Training) => t.duration || t.duration_minutes || 0;

function hm(min: number): string {
  if (!min || min <= 0) return '0 h';
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h} h`;
  return `${h} h ${String(r).padStart(2, '0')}`;
}

export default function MatTimeScreen() {
  const router = useRouter();
  const { trainings, loaded } = useCombatData({ partners: false });
  const [goal, setGoal] = useState(300);
  const [goalOpen, setGoalOpen] = useState(false);
  const [draftGoal, setDraftGoal] = useState(300);

  useEffect(() => {
    AsyncStorage.getItem(GOAL_KEY)
      .then((v) => {
        const n = v ? Number(v) : NaN;
        if (!isNaN(n) && n > 0) setGoal(n);
      })
      .catch(() => {});
  }, []);

  const s = useMemo(() => {
    const mats = trainings.filter(isMat);
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const startWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let total = 0;
    let week = 0;
    let month = 0;
    let longest = 0;
    const days = DAYS.map((d) => ({ label: d, value: 0 }));
    const disc: Record<string, { minutes: number; sessions: number }> = {};
    for (const t of mats) {
      const m = minutesOf(t);
      const d = parseDate(t.date);
      total += m;
      if (d >= startWeek) {
        week += m;
        days[(d.getDay() + 6) % 7].value += m;
      }
      if (d >= startMonth) month += m;
      if (m > longest) longest = m;
      const k = t.sport || 'autre';
      if (!disc[k]) disc[k] = { minutes: 0, sessions: 0 };
      disc[k].minutes += m;
      disc[k].sessions += 1;
    }
    const byDisc = Object.entries(disc)
      .map(([k, v]) => ({ name: SPORTS.some((x) => x.id === k) ? getSportName(k) : k, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
    return { sessions: mats.length, total, week, month, longest, avg: mats.length ? Math.round(total / mats.length) : 0, days, byDisc, today: dow };
  }, [trainings]);

  const weekPct = goal > 0 ? s.week / goal : 0;
  const target = TARGET_H * 60;
  const pct1000 = Math.min(1, s.total / target);
  const remaining = Math.max(0, target - s.total);
  const pace = s.week > 0 ? s.week : goal;
  const weeksLeft = pace > 0 ? remaining / pace : null;
  const proj = weeksLeft != null ? new Date(Date.now() + Math.round(weeksLeft * 7) * 86400000) : null;
  const monthsLeft = weeksLeft != null ? Math.round(weeksLeft / 4.33) : null;
  const matsFilled = Math.floor(s.total / 600); // un tatami = 10 heures

  return (
    <PremiumGate source="temps_tatami" featureTitle={traduire("Temps sur le tatami")} perks={[traduire('Ton temps total sur le tatami'), traduire('Ton objectif d’heures par semaine'), traduire('Le chemin vers les 1 000 heures')]}>
      <DetailScreen title={traduire("Tatami")} subtitle={traduire("Tes heures sur le tapis")}>
        {loaded && s.sessions === 0 ? (
          <EmptyState title={traduire("Pas encore d'heures sur le tapis")} text={traduire("Enregistre tes séances de JJB, MMA, judo, lutte ou grappling : chaque minute s'ajoute ici.")} action={traduire("Nouvelle séance de combat")} onAction={() => router.push('/seance/combat' as any)} />
        ) : null}

        {s.sessions > 0 ? (
          <>
            <Enter i={0}>
              <Glass style={{ gap: 6 }}>
                <Ink size={13} weight="extraBold" color={P.ink2}>
                  {traduire("Au total sur le tatami")}</Ink>
                <Ink size={56} weight="black" tight color={P.goldDark}>
                  {hm(s.total)}
                </Ink>
                <Ink size={14} weight="bold" color={P.ink2}>
                  {plural(s.sessions, traduire('séance'))}
                </Ink>
              </Glass>
            </Enter>

            <Enter i={1}>
              <Card style={{ alignItems: 'center', gap: 12 }}>
                <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Ink size={18} weight="black" tight>
                    {traduire("Objectif de la semaine")}</Ink>
                  <Press onPress={() => { setDraftGoal(goal); setGoalOpen(true); }} accessibilityRole="button" accessibilityLabel={traduire("Modifier l'objectif de la semaine")}>
                    <View style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Ink size={14} weight="extraBold" color={P.accent}>
                        {traduire("Modifier")}</Ink>
                    </View>
                  </Press>
                </View>
                <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
                  <BrushRing value={weekPct} size={200} stroke={18} color={weekPct >= 1 ? '#6E8C3A' : P.gold} />
                  <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <Ink size={36} weight="black" tight>
                      {hm(s.week)}
                    </Ink>
                    <Ink size={13} weight="bold" color={P.ink2}>
                      {traduire("sur {0}", hm(goal))}
                    </Ink>
                  </View>
                  {weekPct >= 1 ? (
                    <View style={{ position: 'absolute', right: -6, top: 4 }}>
                      <Hanko size={46} />
                    </View>
                  ) : null}
                </View>
                {weekPct >= 1 ? (
                  <Ink size={14} weight="extraBold" color="#4F6B28">
                    {traduire("Objectif atteint cette semaine")}</Ink>
                ) : null}
                <View style={{ alignSelf: 'stretch' }}>
                  <BrushColumns data={s.days.map((d, i) => ({ label: d.label, value: d.value, color: i === s.today ? P.accent : P.gold }))} highlightLast={false} format={(v) => `${v}`} height={140} />
                  <Ink size={12} color={P.muted}>
                    {traduire("Minutes par jour cette semaine")}</Ink>
                </View>
              </Card>
            </Enter>

            <Card style={{ flexDirection: 'row' }}>
              <Stat value={hm(s.month)} label={`en ${monthLong(new Date().getMonth())}`} />
              <Stat value={hm(s.avg)} label={traduire("par séance")} />
              <Stat value={hm(s.longest)} label={traduire("la plus longue")} color={P.accent} />
            </Card>

            {s.byDisc.length > 0 ? (
              <>
                <Section title={traduire("Par discipline")} />
                <Card style={{ gap: 14 }}>
                  {s.byDisc.map((d, i) => (
                    <View key={d.name} style={{ gap: 2 }}>
                      <RankRow index={i} label={traduire(d.name)} value={Math.round(d.minutes / 6) / 10} max={Math.round(s.byDisc[0].minutes / 6) / 10} color={i === 0 ? P.goldDark : V} suffix=" h" />
                      <Ink size={11} weight="bold" color={P.muted} style={{ paddingLeft: 36 }}>
                        {plural(d.sessions, traduire('séance'))}
                      </Ink>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            <Section title={traduire("Le chemin des 1 000 heures")} sub={traduire("Chaque tatami représente 10 heures")} />
            <Card style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                {Array.from({ length: 100 }).map((_, i) => (
                  <View key={i} style={{ width: '9.2%', aspectRatio: 2, borderRadius: 2, backgroundColor: i < matsFilled ? P.ink : i === matsFilled ? P.goldLight : '#E9E4D4', borderWidth: 1, borderColor: i < matsFilled ? P.ink : '#DCD3BA' }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Ink size={13} weight="bold" color={P.ink2}>
                  {traduire("{0} sur 1 000 h", hm(s.total))}
                </Ink>
                <Ink size={13} weight="extraBold" color={P.goldDark}>
                  {`${(pct1000 * 100).toFixed(1).replace('.', DECIMAL)} %`}
                </Ink>
              </View>
              {pct1000 < 1 ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: P.goldSoft }}>
                    <Ink size={12} weight="bold" color={P.ink2}>
                      {traduire("Il reste")}</Ink>
                    <Ink size={20} weight="black" color={P.goldDark}>
                      {hm(remaining)}
                    </Ink>
                  </View>
                  {proj && monthsLeft != null ? (
                    <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: P.goldSoft }}>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {traduire("À ce rythme")}</Ink>
                      <Ink size={16} weight="black" color={P.goldDark}>
                        {monthsLeft > 0 ? traduire("dans {0}", plural(monthsLeft, 'mois', 'mois')) : traduire('ce mois')}
                      </Ink>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {`${monthLong(proj.getMonth())} ${proj.getFullYear()}`}
                      </Ink>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Hanko size={48} />
                  <Ink size={16} weight="black" color="#4F6B28">
                    {traduire("Les 1 000 heures sont atteintes")}</Ink>
                </View>
              )}
            </Card>

            <Card style={{ backgroundColor: P.goldSoft, borderColor: '#EADBB4' }}>
              <Ink size={14} weight="bold" color={P.goldDark}>
                {traduire("Choisis un objectif que tu peux tenir chaque semaine, même pendant les semaines chargées. La régularité compte plus qu'une grosse semaine isolée.")}</Ink>
            </Card>
          </>
        ) : null}

        <FormSheet visible={goalOpen} onClose={() => setGoalOpen(false)} title={traduire("Objectif de la semaine")} sub={traduire("Le temps que tu veux passer sur le tatami chaque semaine")}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Stepper value={draftGoal} onChange={setDraftGoal} step={30} min={30} max={2400} format={hm} />
          </View>
          <BigButton
            label={traduire("Enregistrer")}
            onPress={() => {
              setGoal(draftGoal);
              AsyncStorage.setItem(GOAL_KEY, String(draftGoal)).catch(() => {});
              setGoalOpen(false);
            }}
          />
        </FormSheet>
      </DetailScreen>
    </PremiumGate>
  );
}
