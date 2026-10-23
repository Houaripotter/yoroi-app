/**
 * Classement sparring v2 : tes partenaires hisses en bannieres nobori.
 * Podium des trois premiers, puis une banniere par partenaire.
 * Tri par taux de victoire, nombre de rounds ou progression recente.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { allStats, effectiveStats } from '@/lib/v2/combat/partners';
import type { LiveStats, Partner } from '@/lib/v2/combat/partners';
import { beltOf, plural } from '@/lib/v2/combat/rounds';
import { BeltBar, Card, Chip, ChipScroll, CIcon, D, DetailScreen, EmptyState, Enter, N, Nobori, P, Press, Seal, sportLabel, V, WdlRow } from '@/components/yoroi/v2/combat/ui';

type Sort = 'winrate' | 'rounds' | 'progression';
const SORTS: { k: Sort; l: string }[] = [
  { k: 'winrate', l: 'Taux de victoire' },
  { k: 'rounds', l: 'Rounds' },
  { k: 'progression', l: 'Progression' },
];
const PODIUM = ['#C59D45', '#8B8D96', '#9C5B33'];

function valueOf(s: LiveStats, sort: Sort): string {
  if (sort === 'rounds') return String(s.total);
  if (sort === 'progression') return `${s.progressionScore}\u00A0%`;
  return `${s.winRate ?? 0}\u00A0%`;
}

function TrendMark({ t }: { t: LiveStats['trend'] }) {
  return <CIcon name={t === 'up' ? 'up' : t === 'down' ? 'down' : 'flat'} size={18} color={t === 'up' ? '#4F6B28' : t === 'down' ? D : P.muted} />;
}

export default function SparringRankingScreen() {
  const router = useRouter();
  const { trainings, partners, loaded } = useCombatData();
  const [sort, setSort] = useState<Sort>('winrate');
  const stats = useMemo(() => allStats(partners, trainings), [partners, trainings]);
  const ranked = useMemo(() => {
    const rows = partners.map((p) => ({ p, s: effectiveStats(p, stats[p.id]?.live) }));
    return rows.sort((a, b) => {
      if (sort === 'rounds') return b.s.total - a.s.total;
      if (sort === 'progression') return b.s.progressionScore - a.s.progressionScore;
      return (b.s.winRate ?? 0) - (a.s.winRate ?? 0);
    });
  }, [partners, stats, sort]);

  const open = (p: Partner) => router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any);
  const top = ranked.slice(0, 3);
  const podiumOrder = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const podiumRank = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);

  return (
    <PremiumGate source="partenaires" featureTitle="Classement sparring" perks={['Tes partenaires classés par taux de victoire', 'Tes rounds et ta progression face à chacun', 'Qui monte, qui stagne, qui baisse']}>
      <DetailScreen title="Classement" subtitle={loaded ? plural(ranked.length, 'partenaire') : 'Lecture de tes rounds'}>
        <ChipScroll>
          {SORTS.map((s) => (
            <Chip key={s.k} label={s.l} on={sort === s.k} onPress={() => setSort(s.k)} />
          ))}
        </ChipScroll>

        {loaded && ranked.length === 0 ? (
          <EmptyState title="Personne à classer" text="Ajoute tes partenaires de sparring et note tes rounds : ils seront hissés ici selon ta domination." action="Ajouter un partenaire" onAction={() => router.push('/sparring-partners' as any)} />
        ) : null}

        {top.length > 0 ? (
          <Enter i={0}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10, paddingTop: 6 }}>
              {podiumOrder.map((row, i) => {
                const rank = podiumRank[i];
                const h = rank === 0 ? 250 : rank === 1 ? 214 : 190;
                const color = rank === 0 ? P.goldDark : rank === 1 ? P.indigo : P.lacquer;
                return (
                  <Press key={row.p.id} onPress={() => open(row.p)} accessibilityRole="button" accessibilityLabel={`${rank + 1}, ${row.p.name}, ${valueOf(row.s, sort)}`}>
                    <Nobori width={106} height={h} color={color}>
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: PODIUM[rank], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: P.white }}>
                          <Ink size={14} weight="black" color={P.white}>
                            {String(rank + 1)}
                          </Ink>
                        </View>
                        <Seal name={row.p.name} photoUri={row.p.photoUri} belt={row.p.belt} size={rank === 0 ? 58 : 50} tone={P.ink} rotate={0} />
                        <Ink size={13} weight="black" color={P.white} numberOfLines={2} style={{ maxWidth: 94, textAlign: 'center', lineHeight: 16 }}>
                          {row.p.name}
                        </Ink>
                        <Ink size={rank === 0 ? 26 : 22} weight="black" tight color={P.white}>
                          {valueOf(row.s, sort)}
                        </Ink>
                      </View>
                    </Nobori>
                  </Press>
                );
              })}
            </View>
          </Enter>
        ) : null}

        {ranked.map((row, i) => {
          const b = beltOf(row.p.belt);
          const isTop = i < 3;
          return (
            <Enter key={row.p.id} i={Math.min(i + 1, 8)}>
              <Press onPress={() => open(row.p)} accessibilityRole="button" accessibilityLabel={`${i + 1}, ${row.p.name}`}>
                <Card style={{ padding: 0, overflow: 'hidden', flexDirection: 'row', borderColor: isTop ? `${PODIUM[i]}88` : P.line2 }}>
                  <View style={{ width: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: isTop ? PODIUM[i] : P.ink }}>
                    <Ink size={22} weight="black" color={P.white}>
                      {String(i + 1)}
                    </Ink>
                    <View style={{ position: 'absolute', right: -9, top: '50%', marginTop: -9, width: 18, height: 18, transform: [{ rotate: '45deg' }], backgroundColor: P.white }} />
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingLeft: 16 }}>
                    <Seal name={row.p.name} photoUri={row.p.photoUri} belt={row.p.belt} size={46} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ink size={16} weight="black" numberOfLines={2} style={{ flexShrink: 1 }}>
                          {row.p.name}
                        </Ink>
                        <TrendMark t={row.s.trend} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <WdlRow wins={row.s.wins} losses={row.s.losses} draws={row.s.draws} size={12} />
                      </View>
                      {b || row.p.sport || row.s.total > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <BeltBar belt={row.p.belt} width={48} height={8} />
                          <Ink size={12} weight="bold" color={P.muted} style={{ flex: 1 }}>
                            {[sportLabel(row.p.sport), plural(row.s.total, 'round')].filter(Boolean).join(', ')}
                          </Ink>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 54 }}>
                      <Ink size={22} weight="black" tight color={(row.s.winRate ?? 0) >= 60 ? V : (row.s.winRate ?? 0) >= 40 ? N : D}>
                        {valueOf(row.s, sort)}
                      </Ink>
                      <Ink size={11} weight="bold" color={P.ink2}>
                        {sort === 'rounds' ? 'rounds' : sort === 'progression' ? 'récent' : 'victoires'}
                      </Ink>
                    </View>
                  </View>
                </Card>
              </Press>
            </Enter>
          );
        })}

        {ranked.length > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4, flexWrap: 'wrap' }}>
            {[
              { t: 'up' as const, l: 'En progression' },
              { t: 'stable' as const, l: 'Stable' },
              { t: 'down' as const, l: 'En baisse' },
            ].map((x) => (
              <View key={x.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TrendMark t={x.t} />
                <Ink size={12} weight="bold" color={P.ink2}>
                  {x.l}
                </Ink>
              </View>
            ))}
          </View>
        ) : null}
      </DetailScreen>
    </PremiumGate>
  );
}
