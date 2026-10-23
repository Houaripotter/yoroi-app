/**
 * Matrice des confrontations v2 : une grille de plaques, une plaque par partenaire
 * (taille selon le volume de rounds, teinte selon ton taux de victoire),
 * et ton bilan face a chaque style de combat.
 */
import React, { useMemo, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { ARCHETYPE_META } from '@/lib/partnerModel';
import type { Archetype } from '@/lib/partnerModel';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { allStats, effectiveStats, winrateTone } from '@/lib/v2/combat/partners';
import type { Partner } from '@/lib/v2/combat/partners';
import { plural } from '@/lib/v2/combat/rounds';
import { Card, Chip, ChipScroll, DetailScreen, EmptyState, Enter, P, Press, Section } from '@/components/yoroi/v2/combat/ui';

type Filter = 'all' | 'beasts' | 'friends';
const LEGEND = [
  { l: 'Moins de 30 %', c: '#B0282E' },
  { l: '30 à 50 %', c: '#A8832F' },
  { l: '50 à 70 %', c: '#3D5D9E' },
  { l: 'Plus de 70 %', c: '#4F6B28' },
];
/** Sigle du style de combat, en lettres latines */
const ARCH_MARK: Record<Archetype, string> = { gardien: 'GA', passeur: 'PA', striker: 'ST', bagarreur: 'BA', takedown: 'TD', polyvalent: 'PO' };

export default function MatchupMatrixScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { trainings, partners, loaded } = useCombatData();
  const [filter, setFilter] = useState<Filter>('all');
  const stats = useMemo(() => allStats(partners, trainings), [partners, trainings]);
  const rows = useMemo(() => partners.map((p) => ({ p, s: effectiveStats(p, stats[p.id]?.live) })).sort((a, b) => b.s.total - a.s.total), [partners, stats]);
  const filtered = rows.filter(({ s }) => {
    if (filter === 'beasts') return s.winRateVD != null && s.winRateVD < 40 && s.total >= 3;
    if (filter === 'friends') return s.winRateVD != null && s.winRateVD >= 60 && s.total >= 3;
    return true;
  });
  const maxTotal = Math.max(1, ...rows.map((r) => r.s.total));
  const grid = width - 44;
  const unit = Math.floor((grid - 20) / 3);

  // Bilan par style de combat (somme des rounds contre chaque style)
  const styles = useMemo(() => {
    const acc: Partial<Record<Archetype, { w: number; l: number; n: number; people: number }>> = {};
    for (const { p, s } of rows) {
      if (!p.archetype) continue;
      const a = acc[p.archetype] ?? { w: 0, l: 0, n: 0, people: 0 };
      a.w += s.wins;
      a.l += s.losses;
      a.n += s.total;
      a.people += 1;
      acc[p.archetype] = a;
    }
    return (Object.keys(ARCHETYPE_META) as Archetype[]).map((k) => ({ k, v: acc[k] }));
  }, [rows]);
  const hasStyles = styles.some((x) => x.v);

  const open = (p: Partner) => router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any);

  return (
    <PremiumGate source="matrice_adversaires" featureTitle="Matrice des confrontations" perks={['Tes confrontations sur une seule grille', 'Tes bêtes noires et tes partenaires favorables', 'Ta réussite face à chaque style']}>
      <DetailScreen title="Matrice" subtitle="Taille selon les rounds, teinte selon ta réussite">
        <ChipScroll>
          {([
            { k: 'all', l: 'Tous' },
            { k: 'beasts', l: 'Bêtes noires' },
            { k: 'friends', l: 'Favorables' },
          ] as const).map((f) => (
            <Chip key={f.k} label={f.l} on={filter === f.k} onPress={() => setFilter(f.k)} />
          ))}
        </ChipScroll>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {LEGEND.map((l) => (
            <View key={l.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: l.c }} />
              <Ink size={12} weight="bold" color={P.ink2}>
                {l.l}
              </Ink>
            </View>
          ))}
        </View>

        {loaded && filtered.length === 0 ? (
          <EmptyState title={rows.length === 0 ? 'Aucune confrontation' : 'Personne dans ce filtre'} text="Enregistre des séances de sparring avec un résultat par round pour voir ta matrice." action={rows.length === 0 ? 'Mes partenaires' : undefined} onAction={rows.length === 0 ? () => router.push('/sparring-partners' as any) : undefined} />
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {filtered.map(({ p, s }, i) => {
            const big = s.total / maxTotal > 0.66 && s.total >= 3;
            const w = big ? unit * 2 + 10 : unit;
            const h = big ? unit * 1.15 : unit * 1.2;
            const tone = winrateTone(s.winRateVD);
            return (
              <Enter key={p.id} i={Math.min(i, 8)}>
                <Press onPress={() => open(p)} accessibilityRole="button" accessibilityLabel={`${p.name}, ${s.winRateVD ?? 0} % sur ${plural(s.total, 'round')}`}>
                  <View style={{ width: w, height: h, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: tone, overflow: 'hidden', padding: 12, paddingBottom: 22, justifyContent: 'space-between' }}>
                    {p.photoUri ? <Image source={{ uri: p.photoUri }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.28 }} resizeMode="cover" /> : null}
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 12, height: 3, backgroundColor: 'rgba(255,255,255,0.32)' }} />
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 5, height: 3, backgroundColor: 'rgba(255,255,255,0.32)' }} />
                    <Ink size={big ? 18 : 14} weight="black" color={P.white} numberOfLines={2}>
                      {p.name}
                    </Ink>
                    <View>
                      <Ink size={big ? 34 : 24} weight="black" tight color={P.white} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {s.winRateVD != null ? `${s.winRateVD}\u00A0%` : 'Nouveau'}
                      </Ink>
                      <Ink size={11} weight="bold" color="rgba(255,255,255,0.9)">
                        {plural(s.total, 'round')}
                      </Ink>
                    </View>
                  </View>
                </Press>
              </Enter>
            );
          })}
        </View>

        {rows.length > 0 ? (
          <>
            <Section title="Face à chaque style" sub={hasStyles ? 'Ton bilan cumulé contre chaque style de combat' : 'Indique le style de tes partenaires dans leur fiche pour remplir cette grille'} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {styles.map(({ k, v }) => {
                const wr = v && v.w + v.l > 0 ? Math.round((v.w / (v.w + v.l)) * 100) : null;
                const tone = v ? winrateTone(wr) : P.line;
                return (
                  <Card key={k} style={{ width: (grid - 10) / 2, padding: 14, gap: 6, borderColor: v ? `${tone}55` : P.line2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: v ? tone : P.paper, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink weight="black" size={15} color={v ? P.white : P.muted} allowFontScaling={false}>
                          {ARCH_MARK[k]}
                        </Ink>
                      </View>
                      <Ink size={15} weight="black" style={{ flex: 1 }} numberOfLines={1}>
                        {ARCHETYPE_META[k].label}
                      </Ink>
                    </View>
                    <Ink size={24} weight="black" tight color={v ? tone : P.muted}>
                      {wr != null ? `${wr}\u00A0%` : 'À découvrir'}
                    </Ink>
                    <Ink size={12} weight="bold" color={P.ink2}>
                      {v ? `${plural(v.people, 'partenaire')}, ${plural(v.n, 'round')}` : 'Aucun partenaire de ce style'}
                    </Ink>
                  </Card>
                );
              })}
            </View>
          </>
        ) : null}
      </DetailScreen>
    </PremiumGate>
  );
}
