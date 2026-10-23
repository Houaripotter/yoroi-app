/**
 * Onglet Competitions : palmares (victoires, defaites, taux), prochaine competition avec compte a rebours,
 * dernier combat, methodes de victoire, finitions preferees, adversaires recurrents.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { P_CLAIR, paletteSombre } from '@/components/yoroi/livePalette';
import { DeviceEventEmitter, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getCombats } from '@/lib/fighterModeService';
import { getCompetitions } from '@/lib/database';
import type { Combat } from '@/lib/fighterMode';
import type { Competition } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import logger from '@/lib/security/logger';
import { longDate, shortDate } from '@/lib/v2/carnet/format';
import { P, Sheet2, BigStats, RankRow, ResultDot, BigButton, Press, Hanko, winColor } from '../ui';
import { TabEmpty, TabLoading } from './common';
import { traduire } from '@/lib/i18n/tr';

const METHOD_LABEL: Record<string, string> = { soumission: traduire('Soumission'), points: traduire('Points'), decision: traduire('Décision'), 'décision': traduire('Décision'), ko: 'KO', tko: traduire('Arrêt de l’arbitre'), autre: 'Autre' };

export function CompetitionsView({ refreshKey }: { refreshKey: number }) {
  const router = useRouter();
  const [combats, setCombats] = useState<Combat[]>([]);
  const [comps, setComps] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, k] = await Promise.all([getCombats(), getCompetitions()]);
      setCombats(c ?? []);
      setComps(k ?? []);
    } catch (e) {
      logger.error('[CompetitionsView] chargement impossible', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const st = useMemo(() => {
    const wins = combats.filter((c) => c.resultat === 'victoire').length;
    const losses = combats.filter((c) => c.resultat === 'defaite').length;
    const draws = combats.filter((c) => c.resultat === 'nul').length;
    const total = wins + losses + draws;
    return { wins, losses, draws, total, rate: total > 0 ? Math.round((wins / total) * 100) : null };
  }, [combats]);

  const techniques = useMemo(() => {
    const m: Record<string, number> = {};
    combats.forEach((c) => {
      if (c.resultat === 'victoire' && c.technique) m[c.technique] = (m[c.technique] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [combats]);

  const methods = useMemo(() => {
    const w = combats.filter((c) => c.resultat === 'victoire');
    const m: Record<string, number> = {};
    w.forEach((c) => {
      const k = c.methode || 'autre';
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([method, count]) => ({ method, count, pct: w.length > 0 ? Math.round((count / w.length) * 100) : 0 })).sort((a, b) => b.count - a.count);
  }, [combats]);

  const next = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return comps.filter((c) => new Date(c.date) >= today).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
  }, [comps]);
  const daysLeft = next ? Math.ceil((new Date(next.date).getTime() - Date.now()) / 86400000) : null;

  const last = useMemo(() => [...combats].sort((a, b) => b.date.localeCompare(a.date))[0], [combats]);

  const opponents = useMemo(() => {
    const m: Record<string, { count: number; wins: number; losses: number; club?: string }> = {};
    combats.forEach((c) => {
      const n = c.adversaire_nom?.trim();
      if (!n) return;
      if (!m[n]) m[n] = { count: 0, wins: 0, losses: 0, club: c.adversaire_club };
      m[n].count++;
      if (c.resultat === 'victoire') m[n].wins++;
      else if (c.resultat === 'defaite') m[n].losses++;
    });
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [combats]);

  if (loading) return <TabLoading />;
  if (combats.length === 0 && comps.length === 0) {
    return <TabEmpty title={traduire("Pas encore de compétition")} text={traduire("Ajoute tes compétitions et tes combats : ton palmarès, tes finitions et tes adversaires apparaîtront ici.")} action={traduire("Aller aux compétitions")} href="/competitions" />;
  }

  const res = (r?: string) => (r === 'victoire' ? 'V' : r === 'defaite' ? 'D' : 'N');

  return (
    <View style={{ gap: 14 }}>
      <Sheet2>
        <BigStats
          items={[
            { value: String(st.total), label: 'combats' },
            { value: String(st.wins), label: 'victoires', color: P.mossText },
            { value: String(st.losses), label: traduire('défaites'), color: P.danger },
            { value: st.rate !== null ? `${st.rate} %` : '--', label: traduire('de victoires'), color: winColor(st.rate) },
          ]}
        />
      </Sheet2>

      {next && daysLeft !== null ? (
        <Press onPress={() => router.push('/competitions' as any)} accessibilityRole="button" accessibilityLabel={traduire("Prochaine compétition : {0}", next.nom)}>
          <View style={{ borderRadius: 28, backgroundColor: P.ink, padding: 20, gap: 6, overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ position: 'absolute', right: -8, top: -22 }}>
              <Glyph kind="sakura" size={140} color="rgba(255,255,255,0.05)" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={13} weight="bold" color={paletteSombre() ? P_CLAIR.goldDark : P.goldLight}>{traduire("Prochaine compétition")}</Ink>
              <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: daysLeft <= 7 ? P.accent : daysLeft <= 30 ? P.gold : P.moss }}>
                <Ink size={13} weight="black" color={P.white}>{daysLeft <= 0 ? traduire("Aujourd'hui") : traduire("J moins {0}", daysLeft)}</Ink>
              </View>
            </View>
            <Ink size={24} weight="black" tight color={P.white} numberOfLines={2}>{traduire(next.nom)}</Ink>
            <Ink size={13} weight="medium" color={paletteSombre() ? 'rgba(29,32,41,0.75)' : 'rgba(255,255,255,0.75)'}>{`${longDate(next.date)}${next.lieu ? `, ${next.lieu}` : ''}`}</Ink>
            {next.categorie_poids ? <Ink size={13} weight="extraBold" color={paletteSombre() ? P_CLAIR.goldDark : P.goldLight}>{traduire("Catégorie {0}", next.categorie_poids)}</Ink> : null}
          </View>
        </Press>
      ) : null}

      {last ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Dernier combat")}</Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ResultDot result={res(last.resultat)} size={40} />
            <View style={{ flex: 1 }}>
              <Ink size={16} weight="extraBold" numberOfLines={1}>{`Contre ${last.adversaire_nom ?? traduire('un adversaire')}`}</Ink>
              {last.adversaire_club ? <Ink size={12} weight="bold" color={P.muted}>{last.adversaire_club}</Ink> : null}
              {last.methode || last.technique ? <Ink size={13} weight="medium" color={P.ink2}>{`${last.methode ? METHOD_LABEL[last.methode] ?? last.methode : ''}${last.technique ? `${last.methode ? ', ' : ''}${last.technique}` : ''}`}</Ink> : null}
            </View>
            <Ink size={12} weight="bold" color={P.muted}>{shortDate(last.date)}</Ink>
          </View>
        </Sheet2>
      ) : null}

      {methods.length > 0 ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Comment tu gagnes")}</Ink>
          {methods.map((m, i) => (
            <RankRow key={m.method} title={METHOD_LABEL[m.method] ?? m.method} value={traduire("{0} sur {1}", m.count, st.wins)} sub={methods.length > 1 ? traduire("soit {0} % de tes victoires", m.pct) : undefined} ratio={m.pct / 100} color={['#6E8C3A', '#3D5D9E', '#A8832F'][i % 3]} />
          ))}
        </Sheet2>
      ) : null}

      {techniques.length > 0 ? (
        <Sheet2>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Hanko size={30} tampon="record_combat" />
            <Ink size={18} weight="black" tight>{traduire("Tes finitions préférées")}</Ink>
          </View>
          {techniques.map(([t, c], i) => (
            <RankRow key={t} rank={i + 1} title={t} value={traduire("{0} fois", c)} ratio={c / techniques[0][1]} color={P.accent} />
          ))}
        </Sheet2>
      ) : null}

      {opponents.length > 0 ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Adversaires récurrents")}</Ink>
          {opponents.map(([name, d]) => {
            const decided = d.wins + d.losses;
            const wr = decided > 0 ? Math.round((d.wins / decided) * 100) : null;
            return (
              <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Ink size={15} weight="bold" numberOfLines={1}>{name}</Ink>
                  {d.club ? <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>{d.club}</Ink> : null}
                </View>
                <Ink size={13} weight="extraBold" color={P.mossText}>{`${d.wins} V`}</Ink>
                <Ink size={13} weight="extraBold" color={P.danger}>{`${d.losses} D`}</Ink>
                {wr !== null ? <Ink size={14} weight="black" color={winColor(wr)}>{`${wr} %`}</Ink> : null}
              </View>
            );
          })}
        </Sheet2>
      ) : null}

      <BigButton label={traduire("Voir tous les combats, {0}", st.total)} tone="ink" icon="chevron" onPress={() => router.push('/competitions' as any)} />
    </View>
  );
}
