/**
 * Suivi des debriefs v2 : ce que tu notes apres chaque round prend sens.
 * Note moyenne, ressentis, ce qui marche, ce qui bloque, objectifs recurrents,
 * et la courbe au pinceau de tes notes seance apres seance.
 */
import React, { useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { SPORTS, getSportName } from '@/lib/sports';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { debriefStats } from '@/lib/v2/combat/analytics';
import { plural, shortDate } from '@/lib/v2/combat/rounds';
import { BigButton, Card, Chip, ChipScroll, CIcon, D, EmptyState, Enter, Glass, IconBtn, InkBar, N, P, RankRow, Section, V } from '@/components/yoroi/v2/combat/ui';
import { BrushTrend } from '@/components/yoroi/v2/combat/charts';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

function TopCard({ title, sub, items, color, alerts }: { title: string; sub?: string; items: { label: string; count: number }[]; color: string; alerts?: boolean }) {
  if (items.length === 0) return null;
  return (
    <Card style={{ gap: 14 }}>
      <View>
        <Ink size={18} weight="black" tight>
          {title}
        </Ink>
        {sub ? (
          <Ink size={13} color={P.ink2}>
            {sub}
          </Ink>
        ) : null}
      </View>
      {items.map((it, i) => (
        <View key={`${it.label}_${i}`} style={{ gap: 4 }}>
          <RankRow index={i} label={traduire(it.label)} value={it.count} max={items[0].count} color={color} suffix={traduire(" fois")} />
          {alerts && it.count >= 3 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 36 }}>
              <CIcon name="flag" size={13} color={color} />
              <Ink size={12} weight="extraBold" color={color}>
                {traduire("Revient souvent, à travailler en priorité")}</Ink>
            </View>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

export default function RoundsInsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trainings, loaded, reload } = useCombatData({ partners: false });
  const [sport, setSport] = useState<string | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const s = useMemo(() => debriefStats(trainings, sport), [trainings, sport]);
  const dominant = s.moods[0] ?? null;

  const head = (
    <EnTete
      titre={traduire("Tes débriefs")}
      sousTitre={s.nbDebriefed > 0 ? traduire("{0} sur {1}", plural(s.nbDebriefed, 'round débriefé', 'rounds débriefés'), plural(s.nbSessions, 'séance')) : traduire('Ce que tu notes après chaque round')}
      onRetour={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
      style={{ marginHorizontal: -22, marginTop: -8 }}
    />
  );

  return (
    <PremiumGate source="rounds" featureTitle={traduire("Analyse des rounds")} perks={[traduire('Tous tes débriefs de rounds réunis'), traduire('Ce qui a marché et ce qui a bloqué'), traduire('Ta tendance par sport')]}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
              tintColor={P.accent}
            />
          }
        >
          {head}

          {s.sports.length > 1 ? (
            <ChipScroll>
              <Chip label={traduire("Tous les sports")} on={sport === 'all'} onPress={() => setSport('all')} />
              {s.sports.map((sp) => (
                <Chip key={sp} label={SPORTS.some((x) => x.id === sp) ? getSportName(sp) : sp} on={sport === sp} onPress={() => setSport(sp)} />
              ))}
            </ChipScroll>
          ) : null}

          {loaded && s.nbDebriefed === 0 ? (
            <EmptyState title={traduire("Aucun round débriefé")} text={traduire("Après chaque round, note ton ressenti, ce qui a marché et ce qui a bloqué. Plus tu notes, plus tu vois clair.")} action={traduire("Nouvelle séance de combat")} onAction={() => router.push('/seance/combat' as any)} />
          ) : null}

          {s.nbDebriefed > 0 ? (
            <>
              <Enter i={0}>
                <Glass style={{ gap: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={40} weight="black" tight color={N}>
                        {s.avgRating > 0 ? s.avgRating.toFixed(1).replace('.', DECIMAL) : '0'}
                        <Ink size={14} weight="bold" color={P.muted}>
                          {traduire(' sur 10')}
                        </Ink>
                      </Ink>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {traduire("ta note moyenne")}</Ink>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={40} weight="black" tight>
                        {String(s.nbDebriefed)}
                      </Ink>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {traduire("rounds débriefés")}</Ink>
                    </View>
                  </View>
                  {dominant ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: `${dominant.info.color}12` }}>
                      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        <Glyph kind="sakura" size={24} color={P.accentText} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Ink size={12} weight="bold" color={P.ink2}>
                          {traduire("Ton ressenti le plus fréquent")}</Ink>
                        <Ink size={18} weight="black" color={dominant.info.color}>
                          {traduire(dominant.info.label)}
                        </Ink>
                      </View>
                    </View>
                  ) : null}
                </Glass>
              </Enter>

              {s.evolution.length > 1 ? (
                <Card style={{ gap: 10 }}>
                  <Ink size={18} weight="black" tight>
                    {traduire("L'évolution de tes notes")}</Ink>
                  <Ink size={13} color={P.ink2}>
                    {traduire("Moyenne par séance, {0}", plural(s.evolution.length, 'dernière séance', 'dernières séances'))}
                  </Ink>
                  <BrushTrend points={s.evolution.map((e) => ({ label: shortDate(e.date).split(' ')[0], value: e.avg * 10 }))} color={N} guide={null} unit={traduire(" sur 100")} />
                  <Ink size={12} color={P.muted}>
                    {traduire("Échelle sur 100 : 70 correspond à une note de 7 sur 10")}</Ink>
                </Card>
              ) : null}

              {s.moods.length > 0 ? (
                <Card style={{ gap: 12 }}>
                  <Ink size={18} weight="black" tight>
                    {traduire("Tes ressentis")}</Ink>
                  {s.moods.map((m) => {
                    const pct = Math.round((m.count / s.totalMoods) * 100);
                    return (
                      <View key={m.id} style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 22, alignItems: 'center' }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: m.info.color }} />
                          </View>
                          <Ink size={15} weight="bold" style={{ flex: 1 }}>
                            {traduire(m.info.label)}
                          </Ink>
                          <Ink size={14} weight="black" color={m.info.color}>
                            {`${pct} %`}
                          </Ink>
                        </View>
                        <InkBar value={pct / 100} color={m.info.color} height={8} />
                      </View>
                    );
                  })}
                </Card>
              ) : null}

              <TopCard title={traduire("Ce qui marche pour toi")} sub={traduire("Les techniques et positions que tu cites le plus")} items={s.topWorked} color={V} />
              <TopCard title={traduire("Ce qui te pose problème")} sub={traduire("Ce qui n'a pas marché et ce qui t'a contré")} items={s.topProblems} color={D} alerts />
              <TopCard title={traduire("Tes objectifs récurrents")} sub={traduire("Un objectif qui revient souvent mérite ton attention")} items={s.topObjectives} color={P.indigo} alerts />

              <Section title={traduire("Passer à l'action")} />
              <BigButton label={traduire("Ouvrir mon plan de jeu")} icon="flag" onPress={() => router.push('/game-plan' as any)} />
            </>
          ) : null}
        </ScrollView>
      </View>
    </PremiumGate>
  );
}
