/**
 * Palmares (vague 18) : ton bilan victoires, defaites, nuls, tes medailles de competition
 * (notees sur chaque competition), ta serie, ton dernier combat, tes finitions preferees,
 * tes methodes de victoire et la liste de tes combats.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, ImageBackground, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllExtras } from '@/lib/v2/competition/extras';
import type { CompetitionExtra, Medaille } from '@/lib/v2/competition/extras';
import { MedalIcon } from '@/components/yoroi/v2/competition/Medal';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getCombats } from '@/lib/fighterModeService';
import { calculateRecord } from '@/lib/fighterMode';
import type { Combat } from '@/lib/fighterMode';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { isoOf, longDate, relativeDay } from '@/lib/v2/seances/sessionData';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { mainSportOf } from '@/lib/v2/seances/bannerSport';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { BackButton, BigButton, Chip, ChipRow, EmptyState, Glass, Hanko, SectionTitle, tap } from '@/components/yoroi/v2/seances/ui';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const SCENE = require('@/assets/avatars/app/monde/scenes/remparts.webp');

type Filter = 'all' | 'victoire' | 'defaite' | 'nul';
const METHOD_LABEL: Record<string, string> = { soumission: traduire('Soumission'), points: traduire('Points'), decision: traduire('Décision'), ko: 'KO', tko: traduire('KO technique'), abandon: traduire('Abandon'), forfait: traduire('Forfait'), dq: traduire('Disqualification') };
const METHOD_INK = ['#2C4A84', '#A8832F', '#6E8C3A', '#8C6A3F', '#3D5D9E', '#8B8D96', '#1D2029'];

export default function PalmaresScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gender, trainings, competitions } = useSeancesData();
  const [combats, setCombats] = useState<Combat[]>([]);
  const [extras, setExtras] = useState<Record<string, CompetitionExtra>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, ex] = await Promise.all([getCombats(), getAllExtras()]);
      setCombats(list ?? []);
      setExtras(ex);
    } catch (error) {
      logger.error('Error loading combats:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const add = () => {
    router.push('/seance/match' as any);
  };

  const record = calculateRecord(combats);
  const total = combats.length;
  const winRate = total > 0 ? (record.victoires / total) * 100 : 0;
  const sorted = useMemo(() => [...combats].sort((a, b) => (a.date < b.date ? 1 : -1)), [combats]);
  const streak = useMemo(() => {
    if (!sorted.length || sorted[0].resultat === 'nul') return null;
    let n = 0;
    for (const x of sorted) {
      if (x.resultat === sorted[0].resultat) n++;
      else break;
    }
    return { type: sorted[0].resultat, n };
  }, [sorted]);
  const last = sorted[0];
  const topTech = useMemo(() => {
    const f: Record<string, number> = {};
    combats.forEach((x) => {
      if (x.resultat === 'victoire' && x.technique) f[x.technique] = (f[x.technique] || 0) + 1;
    });
    return Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [combats]);
  const methods = useMemo(() => {
    const cnt: Record<string, number> = {};
    let wins = 0;
    combats.forEach((x) => {
      if (x.resultat === 'victoire' && x.methode) {
        cnt[x.methode] = (cnt[x.methode] || 0) + 1;
        wins++;
      }
    });
    return Object.entries(cnt).map(([k, n]) => ({ k, label: METHOD_LABEL[k] ?? k, n, pct: wins ? Math.round((n / wins) * 100) : 0 })).sort((a, b) => b.n - a.n);
  }, [combats]);
  // Medailles notees sur tes competitions, de la plus recente a la plus ancienne
  const medalled = useMemo(
    () =>
      competitions
        .map((k) => ({ k, m: extras[String(k.id)]?.medaille as Medaille | undefined }))
        .filter((x): x is { k: typeof competitions[number]; m: Medaille } => !!x.m && x.m !== 'aucune')
        .sort((a, b) => (a.k.date < b.k.date ? 1 : -1)),
    [competitions, extras],
  );
  const medalCount = (m: Medaille) => medalled.filter((x) => x.m === m).length;
  const list = filter === 'all' ? sorted : sorted.filter((x) => x.resultat === filter);
  const today = isoOf(new Date());
  // L'illustration suit le sport de ton dernier combat en competition, sinon ton sport principal
  const lastCompSport = sorted.map((x) => competitions.find((k) => k.id === x.competition_id)?.sport).find(Boolean);
  const bannerSport = lastCompSport || mainSportOf(trainings) || 'jjb';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.accent} colors={[c.accent]} />}
      >
        {/* Scene des remparts sous la neige : le personnage reste sur la scene, jamais derriere une carte */}
        <ImageBackground source={SCENE} resizeMode="cover" style={{ height: 228 + insets.top, overflow: 'hidden' }}>
          <LinearGradient colors={['rgba(242,241,236,0)', 'rgba(242,241,236,0)', c.background]} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <Image source={sportArt(bannerSport, gender, 3)} style={{ position: 'absolute', right: -4, bottom: -34, width: 150, height: 200 }} resizeMode="contain" />
          <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16 }}>
            <BackButton />
          </View>
          <View style={{ position: 'absolute', left: 16, bottom: 14, maxWidth: '60%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: P.white }}>
            <Ink size={28} weight="black" tight accessibilityRole="header">{traduire("Palmarès")}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Tes médailles et tes combats")}</Ink>
          </View>
        </ImageBackground>

        <View style={{ paddingHorizontal: 22, marginTop: 14, gap: 12 }}>
          <View style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: c.divider, padding: 18, gap: 12, shadowColor: c.ink, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Ton palmarès")}</Ink>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[{ v: record.victoires, l: 'victoires', col: c.ink }, { v: record.defaites, l: traduire('défaites'), col: c.accent }, { v: record.nuls, l: 'nuls', col: c.textSecondary }].map((x) => (
                <View key={x.l} style={{ flex: 1 }}>
                  <Ink size={44} weight="black" tight color={x.col} style={{ lineHeight: 48 }}>{String(x.v)}</Ink>
                  <Ink size={12} weight="bold" color={c.textMuted}>{x.l}</Ink>
                </View>
              ))}
            </View>
            {total > 0 ? (
              <View style={{ gap: 6 }}>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: c.fillSubtle, overflow: 'hidden', flexDirection: 'row' }}>
                  <View style={{ width: `${winRate}%`, backgroundColor: c.gold }} />
                </View>
                <Ink size={13} weight="bold" color={c.textSecondary}>{traduirePluriel(total, total > 1, "{0} % de victoires sur {1} combat", "{0} % de victoires sur {1} combats", Math.round(winRate), total)}</Ink>
              </View>
            ) : null}
          </View>

          {medalled.length ? (
            <Glass style={{ gap: 12 }}>
              <Ink size={17} weight="black" tight>{traduire("Tes médailles")}</Ink>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {(['or', 'argent', 'bronze'] as Medaille[]).map((m) => (
                  <View key={m} style={{ alignItems: 'center', gap: 2 }}>
                    <MedalIcon kind={m} size={46} />
                    <Ink size={26} weight="black" tight>{String(medalCount(m))}</Ink>
                    <Ink size={12} weight="bold" color={c.textMuted}>{m === 'or' ? 'or' : m === 'argent' ? 'argent' : 'bronze'}</Ink>
                  </View>
                ))}
              </View>
              {medalled.slice(0, 5).map(({ k, m }) => (
                <Pressable key={k.id} onPress={() => { tap(); router.push(`/competition-detail?id=${k.id}` as any); }} accessibilityRole="button" accessibilityLabel={traduire(k.nom)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
                  <MedalIcon kind={m} size={30} />
                  <View style={{ flex: 1 }}>
                    <Ink size={14} weight="extraBold" numberOfLines={2}>{traduire(k.nom)}</Ink>
                    <Ink size={12} color={c.textSecondary}>{longDate(k.date.slice(0, 10), true)}</Ink>
                  </View>
                  <Icon name="chevron" size={16} color={c.textMuted} />
                </Pressable>
              ))}
            </Glass>
          ) : null}

          {loaded && total === 0 ? (
            <EmptyState title={traduire("Ton premier combat t’attend")} text={traduire("Note tes combats de compétition : résultat, méthode, adversaire. Ton palmarès se construit ici.")} action={traduire("Ajouter un combat")} onAction={add} />
          ) : null}

          {streak && streak.n >= 2 ? (
            <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {streak.type === 'victoire' ? <Hanko size={36} color={c.gold} /> : <Icon name="flame" size={28} color={c.accent} />}
              <Ink size={16} weight="black" tight style={{ flex: 1 }}>{streak.type === 'victoire' ? traduire("{0} victoires d’affilée", streak.n) : traduire("{0} défaites d’affilée", streak.n)}</Ink>
            </Glass>
          ) : null}

          {last ? (
            <Glass onPress={() => router.push(`/combat-detail?id=${last.id}` as any)} label={traduire("Ton dernier combat")} style={{ gap: 4 }}>
              <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Ton dernier combat, {0}", relativeDay(last.date.slice(0, 10), today))}</Ink>
              <Ink size={18} weight="black" tight>{traduire("{0} contre {1}", last.resultat === 'victoire' ? traduire('Victoire') : last.resultat === 'defaite' ? traduire('Défaite') : traduire('Nul'), last.adversaire_nom || traduire('un adversaire'))}</Ink>
              <Ink size={13} color={c.textSecondary}>{[last.adversaire_club, last.methode ? METHOD_LABEL[last.methode] ?? last.methode : '', last.technique, last.temps].filter(Boolean).join(', ')}</Ink>
            </Glass>
          ) : null}

          {topTech.length ? (
            <Glass style={{ gap: 10 }}>
              <Ink size={17} weight="black" tight>{traduire("Tes finitions préférées")}</Ink>
              {topTech.map(([tech, n], i) => (
                <View key={tech} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Ink size={14} weight={i === 0 ? 'extraBold' : 'bold'}>{tech}</Ink>
                    <Ink size={14} weight="black">{String(n)}</Ink>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSubtle }}>
                    <View style={{ width: `${(n / topTech[0][1]) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: i === 0 ? c.accent : '#3D5D9E' }} />
                  </View>
                </View>
              ))}
            </Glass>
          ) : null}

          {methods.length ? (
            <Glass style={{ gap: 10 }}>
              <Ink size={17} weight="black" tight>{traduire("Comment tu gagnes")}</Ink>
              <View style={{ height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row' }}>
                {methods.map((m, i) => (
                  <View key={m.k} style={{ width: `${m.pct}%`, backgroundColor: METHOD_INK[i % METHOD_INK.length] }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {methods.map((m, i) => (
                  <View key={m.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: METHOD_INK[i % METHOD_INK.length] }} />
                    <Ink size={13} weight="bold">{methods.length > 1 ? traduire("{0} {1}\u00A0%", m.label, m.pct) : traduire("{0}, {1} sur {2}", m.label, m.n, m.n)}</Ink>
                  </View>
                ))}
              </View>
            </Glass>
          ) : null}

          {total > 0 ? (
            <>
              <SectionTitle title={traduire("Tes combats")} />
              <ChipRow>
                <Chip label={traduire("Tous {0}", total)} on={filter === 'all'} onPress={() => setFilter('all')} />
                <Chip label={traduire("Victoires {0}", record.victoires)} on={filter === 'victoire'} onPress={() => setFilter('victoire')} />
                <Chip label={traduire("Défaites {0}", record.defaites)} on={filter === 'defaite'} onPress={() => setFilter('defaite')} />
                <Chip label={traduire("Nuls {0}", record.nuls)} on={filter === 'nul'} onPress={() => setFilter('nul')} />
              </ChipRow>
              {list.length === 0 ? <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Aucun combat dans ce filtre.")}</Ink> : null}
              {list.map((x) => {
                const win = x.resultat === 'victoire';
                const loss = x.resultat === 'defaite';
                return (
                  <Pressable key={x.id} onPress={() => { tap(); router.push(`/combat-detail?id=${x.id}` as any); }} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: pressed ? P.white : blancA(0.8), borderWidth: 1, borderColor: c.divider })}>
                    <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: win ? c.goldTint : loss ? c.accentTint : c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                      <Ink size={19} weight="black" color={win ? c.goldDeep : loss ? c.accent : c.textSecondary} allowFontScaling={false}>{win ? 'V' : loss ? 'D' : 'N'}</Ink>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={15} weight="extraBold" numberOfLines={1}>{x.adversaire_nom || traduire('Adversaire')}</Ink>
                      <Ink size={12} color={c.textSecondary} numberOfLines={1}>{[longDate(x.date.slice(0, 10), true), x.methode ? METHOD_LABEL[x.methode] ?? x.methode : '', x.round && x.temps ? traduire("round {0}, {1}", x.round, x.temps) : ''].filter(Boolean).join(', ')}</Ink>
                    </View>
                    <Icon name="chevron" size={18} color={c.textMuted} />
                  </Pressable>
                );
              })}
              <BigButton label={traduire("Ajouter un combat")} icon="plus" onPress={add} style={{ marginTop: 6 }} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
