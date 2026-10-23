/**
 * Onglet Soumissions (pack combat) : soumissions donnees et subies, taux de finition,
 * evolution sur 12 mois, ton arsenal et tes failles a defendre.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { parseRounds, useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { lastMonths, monthLabel } from '@/lib/v2/carnet/format';
import { P, Sheet2, BigStats, Columns, RankRow, Hanko } from '../ui';
import { TabEmpty, TabLoading } from './common';
import { traduire } from '@/lib/i18n/tr';

export function SoumissionsView({ refreshKey }: { refreshKey: number }) {
  const { trainings, loading } = useTrainings((t) => t.sport === 'jjb' || t.sport === 'grappling' || t.sport === 'mma', refreshKey);

  const st = useMemo(() => {
    let given = 0;
    let taken = 0;
    let rounds = 0;
    let wins = 0;
    const gm: Record<string, number> = {};
    const tm: Record<string, number> = {};
    const month: Record<string, number> = {};
    for (const t of trainings) {
      for (const r of parseRounds(t.combat_rounds)) {
        rounds++;
        if (r.result === 'win') wins++;
        for (const m of r.methodsGiven || []) {
          given++;
          gm[m] = (gm[m] || 0) + 1;
          const k = t.date.slice(0, 7);
          month[k] = (month[k] || 0) + 1;
        }
        for (const m of r.methodsTaken || []) {
          taken++;
          tm[m] = (tm[m] || 0) + 1;
        }
      }
    }
    const finish = wins > 0 ? Math.round((given / wins) * 100) : null;
    return {
      given,
      taken,
      rounds,
      finish,
      topGiven: Object.entries(gm).sort((a, b) => b[1] - a[1]).slice(0, 8),
      topTaken: Object.entries(tm).sort((a, b) => b[1] - a[1]).slice(0, 8),
      months: lastMonths(12).map((k) => ({ label: monthLabel(k).slice(0, 3), value: month[k] || 0 })),
    };
  }, [trainings]);

  if (loading) return <TabLoading />;
  if (trainings.length === 0 || (st.given === 0 && st.taken === 0)) {
    return <TabEmpty title={traduire("Pas encore de soumission notée")} text={traduire("Note les soumissions données et subies dans tes rounds de sparring pour voir ton arsenal et tes failles.")} action={traduire("Démarrer un sparring")} href="/seance/combat?sport=jjb&type=sparring" />;
  }

  const hint = st.finish === null ? null : st.finish >= 60 ? traduire('Excellent, tu finis tes victoires.') : st.finish >= 30 ? traduire('Bon équilibre entre points et soumissions.') : traduire('Tu gagnes surtout aux points : travaille la finition.');

  return (
    <View style={{ gap: 14 }}>
      <Sheet2>
        <BigStats
          items={[
            { value: String(st.given), label: traduire('données'), color: P.mossText },
            { value: String(st.taken), label: 'subies', color: P.danger },
            { value: String(st.rounds), label: 'rounds' },
            { value: st.finish !== null ? `${st.finish} %` : '--', label: traduire('taux de finition'), color: P.indigo },
          ]}
        />
        {hint ? <Ink size={14} weight="medium" color={P.ink2}>{hint}</Ink> : null}
      </Sheet2>
      {st.months.some((m) => m.value > 0) ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Soumissions données, 12 mois")}</Ink>
          <Columns items={st.months} color={P.moss} />
        </Sheet2>
      ) : null}
      {st.topGiven.length > 0 ? (
        <Sheet2>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Hanko size={30} tampon="record_combat" />
            <Ink size={18} weight="black" tight>{traduire("Ton arsenal")}</Ink>
          </View>
          {st.topGiven.map(([n, c], i) => (
            <RankRow key={n} rank={i + 1} title={n} value={traduire("{0} fois", c)} ratio={c / st.topGiven[0][1]} color={P.mossText} />
          ))}
        </Sheet2>
      ) : null}
      {st.topTaken.length > 0 ? (
        <Sheet2 tint={P.dangerSoft}>
          <Ink size={18} weight="black" tight color={P.danger}>{traduire("À défendre")}</Ink>
          {st.topTaken.map(([n, c], i) => (
            <RankRow key={n} rank={i + 1} title={n} value={traduire("{0} fois", c)} ratio={c / st.topTaken[0][1]} color={P.danger} />
          ))}
          <Ink size={13} weight="medium" color={P.ink2}>{traduire("Les finitions qu’on te place le plus souvent. Travaille la défense sur la première.")}</Ink>
        </Sheet2>
      ) : null}
    </View>
  );
}
