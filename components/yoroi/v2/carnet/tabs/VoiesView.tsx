/**
 * Onglet Voies (pack nature, escalade) : meilleure cotation lue dans le theme des seances
 * (ex : 6b+, 7a flash), repartition par cotation et dernieres seances.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { sportsInPack } from '@/lib/sportPacks';
import { humanMinutes, shortDate } from '@/lib/v2/carnet/format';
import { useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, BigStats, BrushBar, BlockTitle } from '../ui';
import { SessionLine, TabEmpty, TabLoading } from './common';
import { traduire } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const NATURE = new Set(sportsInPack('nature'));
const GRADES = ['4a', '4b', '4c', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '8a', '8a+', '8b'];

function gradeTone(i: number): string {
  if (i < 6) return P.mossText;
  if (i < 9) return P.goldDark;
  if (i < 12) return P.indigo;
  return P.ink;
}

export function VoiesView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { trainings, loading } = useTrainings((t) => NATURE.has(t.sport), refreshKey);

  const st = useMemo(() => {
    const min = trainings.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const by: Record<string, number> = {};
    let best = -1;
    for (const t of trainings) {
      const theme = (t.technical_theme || '').toLowerCase();
      // Les cotations avec un plus d'abord, pour ne pas confondre 6a+ et 6a
      const order = GRADES.map((g, i) => ({ g, i })).sort((a, b) => b.g.length - a.g.length);
      const hit = order.find((x) => theme.includes(x.g));
      if (hit) {
        by[hit.g] = (by[hit.g] || 0) + 1;
        if (hit.i > best) best = hit.i;
      }
    }
    const dist = GRADES.map((g, i) => ({ g, i, count: by[g] || 0 })).filter((d) => d.count > 0);
    return { min, best, dist, max: Math.max(1, ...dist.map((d) => d.count)) };
  }, [trainings]);

  const recent = useMemo(() => [...trainings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), [trainings]);

  if (loading) return <TabLoading />;
  if (trainings.length === 0) {
    return hideEmpty ? null : <TabEmpty title={traduire("Aucune voie enregistrée")} text={traduire("Ajoute tes séances d’escalade avec la cotation dans le thème, par exemple 6b+ ou 7a flash.")} action={traduire("Ajouter une séance")} href="/seance/deja-faite?sport=escalade" />;
  }

  return (
    <View style={{ gap: 14 }}>
      <Sheet2>
        <BigStats
          items={[
            { value: String(trainings.length), label: traduire('séances') },
            { value: humanMinutes(st.min), label: traduire('en paroi') },
            { value: st.best >= 0 ? GRADES[st.best] : '--', label: traduire('meilleure cotation'), color: st.best >= 0 ? gradeTone(st.best) : P.muted },
            { value: String(st.dist.length), label: traduire('cotations tentées') },
          ]}
        />
      </Sheet2>
      {st.dist.length > 0 ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Par cotation")}</Ink>
          {st.dist.map((d) => (
            <View key={d.g} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Ink size={16} weight="black" color={gradeTone(d.i)}>{d.g}</Ink>
                <Ink size={13} weight="bold" color={P.ink2}>{`${d.count} voie${d.count > 1 ? 's' : ''}`}</Ink>
              </View>
              <BrushBar value={d.count / st.max} color={gradeTone(d.i)} height={8} />
            </View>
          ))}
        </Sheet2>
      ) : null}
      <BlockTitle title={traduire("Dernières séances")} />
      {recent.map((t) => (
        <SessionLine key={t.id ?? t.date} t={t} title={sansTiret(t.technical_theme || traduire('Séance de grimpe'))} chips={[shortDate(t.date), ...(t.duration_minutes ? [humanMinutes(t.duration_minutes)] : [])]} tone={P.indigo} />
      ))}
    </View>
  );
}
