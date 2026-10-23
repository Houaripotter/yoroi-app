/**
 * Rangs S a D v2 : tes partenaires ranges par domination, une banniere par rang.
 * Calcule a partir de tes vrais rounds (victoires sur victoires et defaites).
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { allStats, effectiveStats, TIER_META, tierOf } from '@/lib/v2/combat/partners';
import type { LiveStats, Partner, Tier } from '@/lib/v2/combat/partners';
import { plural } from '@/lib/v2/combat/rounds';
import { Card, DetailScreen, EmptyState, Enter, P, Press, Seal } from '@/components/yoroi/v2/combat/ui';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { traduire } from '@/lib/i18n/tr';

const ORDER: Tier[] = ['S', 'A', 'B', 'C', 'D'];

export default function PartnersTierListScreen() {
  return (
    <PremiumGate source="partenaires" featureTitle={traduire("Rangs des partenaires")} perks={[traduire('Tes partenaires classés de S à D'), traduire('Tes bêtes noires repérées d’un coup d’œil'), traduire('Le rang mis à jour à chaque round noté')]}>
      <PartnersTierList />
    </PremiumGate>
  );
}

function PartnersTierList() {
  const router = useRouter();
  const { trainings, partners, loaded } = useCombatData();
  const stats = useMemo(() => allStats(partners, trainings), [partners, trainings]);
  const byTier = useMemo(() => {
    const out: Record<Tier, { p: Partner; s: LiveStats }[]> = { S: [], A: [], B: [], C: [], D: [] };
    for (const p of partners) {
      const s = effectiveStats(p, stats[p.id]?.live);
      out[tierOf(s.winRateVD, s.total)].push({ p, s });
    }
    for (const k of ORDER) out[k].sort((a, b) => b.s.total - a.s.total);
    return out;
  }, [partners, stats]);

  const open = (p: Partner) => router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any);

  return (
    <DetailScreen title="Rangs" subtitle={traduire("Tes partenaires classés selon ta domination")}>
      {loaded && partners.length === 0 ? (
        <EmptyState title={traduire("Aucun partenaire")} text={traduire("Ajoute tes partenaires et note tes rounds : ils seront rangés de S, tes bêtes noires, à C, ceux que tu domines.")} action={traduire("Ajouter un partenaire")} onAction={() => router.push('/sparring-partners' as any)} />
      ) : null}
      {ORDER.map((t, i) => {
        const list = byTier[t];
        if (list.length === 0) return null;
        const m = TIER_META[t];
        return (
          <Enter key={t} i={i}>
            <Card style={{ padding: 0, overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ width: 84, backgroundColor: m.color, alignItems: 'center', paddingVertical: 16, gap: 4 }}>
                <Ink size={38} weight="black" tight color={P.white}>
                  {t}
                </Ink>
                <Ink size={12} weight="extraBold" color={P.white} style={{ textAlign: 'center', paddingHorizontal: 6 }}>
                  {m.name}
                </Ink>
              </View>
              <View style={{ flex: 1, padding: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {list.map(({ p, s }) => (
                    <Press key={p.id} onPress={() => open(p)} accessibilityRole="button" accessibilityLabel={traduire("{0}, {1} % de victoires", p.name, s.winRateVD ?? 0)}>
                      <View style={{ alignItems: 'center', width: 78, gap: 4 }}>
                        <Seal name={p.name} photoUri={p.photoUri} belt={p.belt} size={54} tone={m.color} />
                        <Ink size={12} weight="extraBold" numberOfLines={2} style={{ textAlign: 'center', lineHeight: 15 }}>
                          {p.name}
                        </Ink>
                        {s.winRateVD != null ? (
                          <Ink size={13} weight="black" color={m.color}>
                            {`${s.winRateVD} %`}
                          </Ink>
                        ) : null}
                        <Ink size={11} weight="bold" color={P.muted}>
                          {plural(s.total, 'round')}
                        </Ink>
                      </View>
                    </Press>
                  ))}
                </View>
                <Ink size={12} color={P.ink2}>
                  {m.description}
                </Ink>
              </View>
            </Card>
          </Enter>
        );
      })}
    </DetailScreen>
  );
}
