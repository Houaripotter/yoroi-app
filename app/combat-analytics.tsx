/**
 * Analyse de combat v2 : ton bilan global, tes partenaires de sparring,
 * les techniques travaillees, tes forces et failles en soumission,
 * et l'equilibre entre drilling et sparring sur six mois.
 */
import React, { useMemo } from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { drillSparRatio, partnerAggregates, submissionAggregates, techniqueAggregates } from '@/lib/v2/combat/analytics';
import { agoText, plural, shortDate } from '@/lib/v2/combat/rounds';
import { BrushRing, Card, CIcon, D, DetailScreen, EmptyState, Enter, Glass, InkBar, N, P, Press, RankRow, RecordBars, Section, Seal, Stat, V, WdlRow, pctText } from '@/components/yoroi/v2/combat/ui';
import type { CIconName } from '@/components/yoroi/v2/combat/ui';
import { Legend, StackColumns } from '@/components/yoroi/v2/combat/charts';
import { useCombatArt } from '@/components/yoroi/v2/combat/images';
import { traduire } from '@/lib/i18n/tr';

const LINKS: { label: string; sub: string; icon: CIconName; route: string }[] = [
  { label: 'Partenaires', sub: traduire('Ton sparring'), icon: 'users', route: '/sparring-partners' },
  { label: traduire('Débriefs'), sub: traduire('Tes rounds notés'), icon: 'book', route: '/rounds-insights' },
  { label: traduire('Plan de jeu'), sub: traduire('Ta checklist'), icon: 'target', route: '/game-plan' },
  { label: 'Carte JJB', sub: 'Positions, finitions', icon: 'map', route: '/bjj-positions' },
  { label: 'Tatami', sub: traduire('Ton temps de mat'), icon: 'clock', route: '/mat-time' },
];

export default function CombatAnalyticsScreen() {
  const router = useRouter();
  const { trainings, loaded } = useCombatData({ partners: false });
  const art = useCombatArt('mma', 3);
  const partners = useMemo(() => partnerAggregates(trainings), [trainings]);
  const techniques = useMemo(() => techniqueAggregates(trainings), [trainings]);
  const subs = useMemo(() => submissionAggregates(trainings), [trainings]);
  const ratio = useMemo(() => drillSparRatio(trainings), [trainings]);
  const g = useMemo(() => partners.reduce((a, p) => ({ rounds: a.rounds + p.totalRounds, w: a.w + p.wins, l: a.l + p.losses, n: a.n + p.draws, sg: a.sg + p.submissionsGiven }), { rounds: 0, w: 0, l: 0, n: 0, sg: 0 }), [partners]);
  const empty = partners.length === 0 && techniques.length === 0;
  const decided = g.w + g.l + g.n;
  const wr = decided > 0 ? Math.round((g.w / decided) * 100) : 0;

  return (
    <PremiumGate source="analyse_combat" featureTitle={traduire("Analyse de combat")} perks={[traduire('Ton taux de victoire sur tous tes rounds'), traduire('Tes partenaires et tes soumissions analysés'), traduire('Tes fiches tactiques et ton plan de jeu')]}>
      <DetailScreen title={traduire("Analyse de combat")} subtitle={traduire("Ce que disent tes rounds")}>
        {loaded && empty ? (
          <Enter i={0}>
            <Glass style={{ padding: 0, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <View style={{ flex: 1, padding: 20, gap: 8 }}>
                  <Ink size={23} weight="black" tight>
                    {traduire("Tes combats vont parler")}</Ink>
                  <Ink size={14} color={P.ink2}>
                    {traduire("Note tes rounds de sparring : partenaire, résultat, finition. Ici, tu verras qui te pose problème et ce qui passe.")}</Ink>
                </View>
                <Image source={art} style={{ width: 118, height: 165 }} resizeMode="contain" />
              </View>
              <View style={{ padding: 16, paddingTop: 0 }}>
                <Press onPress={() => router.push('/seance/combat' as any)} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Nouvelle séance de combat")}>
                  <View style={{ height: 58, borderRadius: 20, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={17} weight="extraBold" color={P.white}>
                      {traduire("Nouvelle séance de combat")}</Ink>
                  </View>
                </Press>
              </View>
            </Glass>
          </Enter>
        ) : null}

        {!empty ? (
          <Enter i={0}>
            <Glass style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 128, height: 128, alignItems: 'center', justifyContent: 'center' }}>
                  <BrushRing value={wr / 100} size={128} stroke={14} color={V} />
                  <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <Ink size={32} weight="black" tight>
                      {pctText(wr)}
                    </Ink>
                    <Ink size={11} weight="bold" color={P.ink2}>
                      {traduire("de victoires")}</Ink>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <RecordBars wins={g.w} losses={g.l} draws={g.n} compact />
                </View>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Stat value={String(g.rounds)} label="rounds" />
                <Stat value={String(partners.length)} label="partenaires" />
                <Stat value={String(g.sg)} label="finitions" color={V} />
                <Stat value={String(techniques.length)} label={traduire("thèmes")} />
              </View>
            </Glass>
          </Enter>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {LINKS.map((l) => (
            <Press key={l.route} onPress={() => router.push(l.route as any)} style={{ width: '47%', flexGrow: 1 }} accessibilityRole="button" accessibilityLabel={l.label}>
              <Card style={{ padding: 14, gap: 10, minHeight: 112 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <CIcon name={l.icon} size={21} color={P.accent} />
                </View>
                <View style={{ gap: 2 }}>
                  <Ink size={15} weight="black">
                    {l.label}
                  </Ink>
                  <Ink size={12} weight="bold" color={P.muted}>
                    {l.sub}
                  </Ink>
                </View>
              </Card>
            </Press>
          ))}
        </View>

        {partners.length > 0 ? (
          <>
            <Section title={traduire("Partenaires de sparring")} sub={plural(partners.length, 'partenaire')} action={traduire("Tous")} onAction={() => router.push('/sparring-partners' as any)} />
            {partners.slice(0, 12).map((p, i) => {
              const d = p.wins + p.losses + p.draws;
              return (
                <Enter key={p.name} i={Math.min(i, 8)}>
                  <Press onPress={() => router.push({ pathname: '/sparring-partners', params: { partnerName: p.name } } as any)} accessibilityRole="button" accessibilityLabel={traduire("Profil de {0}", p.name)}>
                    <Card style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ink size={14} weight="black" color={i < 3 ? P.accent : P.muted} style={{ width: 22 }}>
                          {String(i + 1)}
                        </Ink>
                        <Seal name={p.name} size={42} />
                        <View style={{ flex: 1 }}>
                          <Ink size={16} weight="black" numberOfLines={1}>
                            {p.name}
                          </Ink>
                          <Ink size={12} weight="bold" color={P.ink2}>
                            {`${plural(p.totalRounds, 'round')}${p.lastSession ? `, ${agoText(p.lastSession)}` : ''}`}
                          </Ink>
                        </View>
                        {d > 0 ? (
                          <Ink size={20} weight="black" tight color={p.wins >= p.losses ? V : D}>
                            {pctText(Math.round((p.wins / d) * 100))}
                          </Ink>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <WdlRow wins={p.wins} losses={p.losses} draws={p.draws} size={13} />
                        <View style={{ flex: 1 }} />
                        <View style={{ alignItems: 'flex-end' }}>
                          {p.submissionsGiven > 0 ? <Ink size={12} weight="bold" color={V}>{plural(p.submissionsGiven, 'finition')}</Ink> : null}
                          {p.submissionsTaken > 0 ? <Ink size={12} weight="bold" color={D}>{plural(p.submissionsTaken, 'subie')}</Ink> : null}
                        </View>
                      </View>
                      <InkBar value={p.totalRounds / Math.max(1, partners[0].totalRounds)} color={P.indigo} height={7} />
                    </Card>
                  </Press>
                </Enter>
              );
            })}
          </>
        ) : null}

        {techniques.length > 0 ? (
          <>
            <Section title={traduire("Techniques travaillées")} sub={plural(techniques.length, traduire('thème différent'), traduire('thèmes différents'))} />
            <Card style={{ gap: 14 }}>
              {techniques.slice(0, 10).map((t, i) => (
                <View key={t.name} style={{ gap: 2 }}>
                  <RankRow index={i} label={t.name} value={t.count} max={techniques[0].count} color={N} suffix={traduire(" fois")} />
                  {t.lastSession ? (
                    <Ink size={11} weight="bold" color={P.muted} style={{ paddingLeft: 36 }}>
                      {traduire("Dernière fois le {0}", shortDate(t.lastSession, true))}
                    </Ink>
                  ) : null}
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {subs.length > 0 ? (
          <>
            <Section title={traduire("Forces et failles")} sub={traduire("Soumissions placées et subies")} />
            <Card style={{ gap: 14 }}>
              <Legend items={[{ label: traduire('Placées'), color: V }, { label: 'Subies', color: D }]} />
              {subs.slice(0, 12).map((s) => {
                const m = Math.max(1, s.given, s.taken);
                const force = s.given >= s.taken;
                return (
                  <View key={s.name} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ink size={15} weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                        {s.name}
                      </Ink>
                      <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: force ? `${V}18` : `${D}18` }}>
                        <Ink size={12} weight="extraBold" color={force ? V : D}>
                          {force ? 'Force' : 'Faille'}
                        </Ink>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <InkBar value={s.given / m} color={V} height={8} />
                      </View>
                      <Ink size={13} weight="black" color={V} style={{ width: 24, textAlign: 'right' }}>
                        {String(s.given)}
                      </Ink>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <InkBar value={s.taken / m} color={D} height={8} />
                      </View>
                      <Ink size={13} weight="black" color={D} style={{ width: 24, textAlign: 'right' }}>
                        {String(s.taken)}
                      </Ink>
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        ) : null}

        {ratio.total > 0 ? (
          <>
            <Section title={traduire("Drilling et sparring")} sub={traduire("Séances des six derniers mois")} />
            <Card style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Ink size={28} weight="black" tight color={'#3D5D9E'}>
                    {pctText(ratio.dPct)}
                  </Ink>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    {`drilling, ${plural(ratio.drilling, traduire('séance'))}`}
                  </Ink>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Ink size={28} weight="black" tight color={D}>
                    {pctText(ratio.sPct)}
                  </Ink>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    {`sparring, ${plural(ratio.sparring, traduire('séance'))}`}
                  </Ink>
                </View>
              </View>
              <StackColumns data={ratio.months} colors={['#3D5D9E', '#A8832F']} />
              <Legend items={[{ label: 'Drilling', color: '#3D5D9E' }, { label: 'Sparring', color: D }]} />
              {ratio.advice ? (
                <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 16, backgroundColor: P.indigoSoft }}>
                  <CIcon name="target" size={18} color={P.indigo} />
                  <Ink size={14} weight="bold" color={P.indigo} style={{ flex: 1 }}>
                    {ratio.advice}
                  </Ink>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {loaded && empty ? null : !loaded ? <EmptyState title={traduire("Lecture de tes rounds")} text={traduire("Un instant.")} /> : null}
      </DetailScreen>
    </PremiumGate>
  );
}
