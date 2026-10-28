/**
 * Onglet Positions (pack combat) : ton jeu positionnel. Familles de soumissions donnees et subies,
 * themes techniques les plus travailles, temps cumule et derniere fois.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { parseRounds, useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { humanMinutes } from '@/lib/v2/carnet/format';
import { P, Sheet2, BigStats, SplitBar, RankRow } from '../ui';
import { TabEmpty, TabLoading } from './common';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

export const SUBMISSION_FAMILIES: Record<string, { label: string; kw: string[] }> = {
  chokes: { label: traduire('Étranglements'), kw: ['triangle', 'rnc', 'rear naked', 'guillotine', "d'arce", 'darce', 'ezekiel', 'cross collar', 'anaconda', 'bow and arrow', 'étranglement', 'etranglement', 'baseball', 'north south', 'loop choke', 'peruvian'] },
  arm: { label: traduire('Clés de bras'), kw: ['armbar', 'kimura', 'americana', 'americaine', 'omoplata', 'clé de bras', 'clef de bras', 'arm triangle', 'bras tendu', 'wrist lock'] },
  leg: { label: traduire('Clés de jambes'), kw: ['heel hook', 'kneebar', 'straight footlock', 'toe hold', 'calf slicer', 'leg lock', 'ashi', '50/50', 'talon', 'genou', 'saddle'] },
  back: { label: traduire('Depuis le dos'), kw: ['rnc', 'rear naked', 'bow and arrow', 'crucifix', 'back mount', 'dos'] },
  pressure: { label: traduire('Positions dominantes'), kw: ['mount', 'side control', 'knee on belly', 'monté', 'nord sud', 'north south', 'passage'] },
};

function family(name: string): string | null {
  const l = name.toLowerCase();
  for (const [k, f] of Object.entries(SUBMISSION_FAMILIES)) if (f.kw.some((w) => l.includes(w))) return k;
  return null;
}

export function PositionsView({ refreshKey }: { refreshKey: number }) {
  const { trainings, loading } = useTrainings((t) => t.sport === 'jjb' || t.sport === 'grappling' || t.sport === 'mma', refreshKey);

  const themes = useMemo(() => {
    const m: Record<string, { sessions: number; minutes: number; lastDate: string }> = {};
    for (const t of trainings) {
      const th = t.technical_theme?.trim();
      if (!th) continue;
      if (!m[th]) m[th] = { sessions: 0, minutes: 0, lastDate: t.date };
      m[th].sessions++;
      m[th].minutes += t.duration_minutes || 0;
      if (t.date > m[th].lastDate) m[th].lastDate = t.date;
    }
    return Object.entries(m).map(([theme, d]) => ({ theme, ...d })).sort((a, b) => b.sessions - a.sessions).slice(0, 10);
  }, [trainings]);

  const families = useMemo(() => {
    const given: Record<string, number> = {};
    const taken: Record<string, number> = {};
    for (const t of trainings) {
      for (const r of parseRounds(t.combat_rounds)) {
        for (const m of r.methodsGiven || []) {
          const f = family(m);
          if (f) given[f] = (given[f] || 0) + 1;
        }
        for (const m of r.methodsTaken || []) {
          const f = family(m);
          if (f) taken[f] = (taken[f] || 0) + 1;
        }
      }
    }
    return Object.keys(SUBMISSION_FAMILIES)
      .map((k) => ({ key: k, label: SUBMISSION_FAMILIES[k].label, given: given[k] || 0, taken: taken[k] || 0 }))
      .filter((f) => f.given > 0 || f.taken > 0)
      .sort((a, b) => b.given + b.taken - (a.given + a.taken));
  }, [trainings]);

  const hours = Math.round(trainings.reduce((s, t) => s + (t.duration_minutes || 0), 0) / 60);

  if (loading) return <TabLoading />;
  if (trainings.length === 0 || (themes.length === 0 && families.length === 0)) {
    return <TabEmpty title={traduire("Pas encore de carte de ton jeu")} text={traduire("Donne un thème technique à tes séances de JJB, grappling ou MMA, et note les soumissions de tes rounds.")} action={traduire("Démarrer une séance de combat")} href="/seance/combat?sport=jjb" />;
  }

  return (
    <View style={{ gap: 14 }}>
      <Sheet2>
        <BigStats
          items={[
            { value: String(trainings.length), label: traduire('séances') },
            { value: `${hours} h`, label: traduire('sur le tatami'), color: P.indigo },
            { value: String(themes.length), label: traduire('thèmes') },
            { value: String(families.length), label: 'familles', color: P.accent },
          ]}
        />
      </Sheet2>
      {families.length > 0 ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Familles de soumissions")}</Ink>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P.moss }} />
              <Ink size={12} weight="bold" color={P.ink2}>{traduire("Données")}</Ink>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P.danger }} />
              <Ink size={12} weight="bold" color={P.ink2}>{traduire("Subies")}</Ink>
            </View>
          </View>
          {families.map((f) => (
            <View key={f.key} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Ink size={15} weight="bold">{traduire(f.label)}</Ink>
                <Ink size={13} weight="extraBold" color={P.ink2}>{traduire("{0} données, {1} subies", f.given, f.taken)}</Ink>
              </View>
              <SplitBar parts={[{ value: f.given, color: P.moss }, { value: f.taken, color: P.danger }]} />
            </View>
          ))}
        </Sheet2>
      ) : null}
      {themes.length > 0 ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Thèmes les plus travaillés")}</Ink>
          {themes.map((t, i) => {
            const since = Math.floor((Date.now() - new Date(t.lastDate).getTime()) / 86400000);
            return <RankRow key={t.theme} rank={i + 1} title={sansTiret(t.theme)} value={traduire("{0} fois", t.sessions)} ratio={t.sessions / themes[0].sessions} color={P.indigo} sub={traduirePluriel(since, since > 1, "{0} cumulées, dernière fois il y a {1} jour", "{0} cumulées, dernière fois il y a {1} jours", humanMinutes(t.minutes), since)} />;
          })}
        </Sheet2>
      ) : null}
    </View>
  );
}
