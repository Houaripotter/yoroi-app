/**
 * Onglet Sparring (pack combat) : tout ton jeu de combat d'entrainement.
 * Conseils, podium, objectif de la semaine, rounds par semaine, taux de victoire par mois,
 * partenaires (photo, fiche, renommage), techniques, finitions, records, intensite, jours, cardio.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { DeviceEventEmitter, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSportName } from '@/lib/sports';
import { generateSparringInsights } from '@/lib/sparringInsights';
import { computeGlobalInsights } from '@/lib/partnerInsightsService';
import type { GlobalInsight, PartnerStats as GlobalPartnerStats } from '@/lib/partnerInsightsService';
import {
  byIntensityOf, byWeekdayOf, cardioOf, coachInsightsOf, hasCombat, methodsCombinedOf, methodsTimelineOf, monthlyWinRateOf, partnerStatsOf,
  recentSessionsOf, sparringRecordsOf, streakDaysOf, submissionStatsOf, techniqueStatsOf, thisWeekRoundsOf, topMethodsOf, weeklyRoundsOf,
} from '@/lib/v2/carnet/sparring';
import type { PartnerStats } from '@/lib/v2/carnet/sparring';
import { PARTNERS_CHANGED_EVENT, SPARRING_PARTNERS_KEY, WEEKLY_GOAL_KEY, deletePartnerFiche, loadPartnerPhotos, renamePartner, savePartnerPhoto, savePhotoPermanently } from '@/lib/v2/carnet/partners';
import { compact, dayDate, lastMonths, monthLabel, relative, shortDate } from '@/lib/v2/carnet/format';
import { useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { P, Press, CIcon, Sheet2, BigStats, Columns, RankRow, RecordTile, MiniChips, SplitBar, BlockTitle, Kozane, winColor, BigButton } from '../ui';
import { TabEmpty, TabLoading } from './common';
import { EditPartnerSheet, GoalSheet, PartnerRow, PartnerSheet, Podium } from './SparringParts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { partagerTexte } from '@/lib/v2/partage/texte';
import { blancA, paletteSombre } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel, LOCALE, DECIMAL } from '@/lib/i18n/tr';

type PodiumMode = 'volume' | 'wins' | 'losses' | 'winrate' | 'subsGiven';
type SortMode = 'volume' | 'winrate' | 'recent' | 'level';

const TONE: Record<string, { bg: string; fg: string }> = {
  danger: { bg: P.dangerSoft, fg: P.danger },
  warn: { bg: P.goldSoft, fg: P.goldDark },
  info: { bg: P.indigoSoft, fg: P.indigo },
  good: { bg: P.mossSoft, fg: P.mossText },
  celebration: { bg: P.mossSoft, fg: P.mossText },
  positive: { bg: P.mossSoft, fg: P.mossText },
  warning: { bg: P.goldSoft, fg: P.goldDark },
  neutral: { bg: '#F4F2EC', fg: P.ink2 },
};

export function SparringView({ refreshKey }: { refreshKey: number }) {
  const router = useRouter();
  const { all, loading, reload } = useTrainings(() => true, refreshKey);
  const [sport, setSport] = useState<string | null>(null);
  const [goal, setGoal] = useState(10);
  const [goalDraft, setGoalDraft] = useState(10);
  const [goalOpen, setGoalOpen] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [fiches, setFiches] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<PartnerStats | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [podiumMode, setPodiumMode] = useState<PodiumMode>('volume');
  const [sortMode, setSortMode] = useState<SortMode>('volume');
  const [globalInsights, setGlobalInsights] = useState<GlobalInsight[]>([]);

  const refreshPhotos = useCallback(async () => {
    const r = await loadPartnerPhotos();
    setPhotos(r.photos);
    setFiches(r.fiches);
  }, []);

  useEffect(() => {
    refreshPhotos();
  }, [refreshPhotos, refreshKey]);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(PARTNERS_CHANGED_EVENT, refreshPhotos);
    return () => sub.remove();
  }, [refreshPhotos]);
  useEffect(() => {
    AsyncStorage.getItem(WEEKLY_GOAL_KEY)
      .then((v) => {
        if (v && parseInt(v, 10) > 0) setGoal(parseInt(v, 10));
      })
      .catch(() => {});
  }, []);

  // Conseils tires des fiches partenaires (archetypes, ceintures...)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SPARRING_PARTNERS_KEY);
        if (!raw) return setGlobalInsights([]);
        const partners: any[] = JSON.parse(raw);
        const stats: GlobalPartnerStats[] = partners.map((p) => {
          const wins = p.wins ?? 0;
          const losses = p.losses ?? 0;
          const draws = p.draws ?? 0;
          return { id: p.id, name: p.name, archetype: p.archetype, belt: p.belt, total: p.matchCount ?? wins + losses + draws, wins, losses, draws, winrate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null } as GlobalPartnerStats;
        });
        setGlobalInsights(computeGlobalInsights(stats));
      } catch {
        setGlobalInsights([]);
      }
    })();
  }, [refreshKey, fiches]);

  const photoOf = (name: string) => photos[name.trim().toLowerCase()] || undefined;

  const combatSports = useMemo(() => Array.from(new Set(all.filter(hasCombat).map((t) => t.sport).filter(Boolean))).sort(), [all]);
  const filtered = useMemo(() => all.filter((t) => hasCombat(t) && (!sport || t.sport === sport)), [all, sport]);

  const partners = useMemo(() => partnerStatsOf(filtered), [filtered]);
  const techniques = useMemo(() => techniqueStatsOf(filtered), [filtered]);
  const finitions = useMemo(() => submissionStatsOf(filtered), [filtered]);
  const recent = useMemo(() => recentSessionsOf(filtered), [filtered]);
  const weekly = useMemo(() => weeklyRoundsOf(filtered), [filtered]);
  const thisWeek = useMemo(() => thisWeekRoundsOf(filtered), [filtered]);
  const monthly = useMemo(() => monthlyWinRateOf(filtered), [filtered]);
  const topTaken = useMemo(() => topMethodsOf(filtered, 'methodsTaken'), [filtered]);
  const topGiven = useMemo(() => topMethodsOf(filtered, 'methodsGiven'), [filtered]);
  const combined = useMemo(() => methodsCombinedOf(filtered), [filtered]);
  const records = useMemo(() => sparringRecordsOf(filtered), [filtered]);
  const intensity = useMemo(() => byIntensityOf(filtered), [filtered]);
  const weekday = useMemo(() => byWeekdayOf(filtered), [filtered]);
  const cardio = useMemo(() => cardioOf(filtered), [filtered]);
  const months6 = useMemo(() => lastMonths(6), []);
  const timeline = useMemo(() => methodsTimelineOf(filtered, months6), [filtered, months6]);
  const streak = useMemo(() => streakDaysOf(filtered), [filtered]);

  const totals = useMemo(() => {
    let rounds = 0;
    let wins = 0;
    let losses = 0;
    for (const p of partners) {
      rounds += p.totalRounds;
      wins += p.wins;
      losses += p.losses;
    }
    return { rounds, wins, losses, winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null, partners: partners.length, techniques: techniques.length };
  }, [partners, techniques]);

  const coach = useMemo(() => coachInsightsOf(partners, topTaken, totals), [partners, topTaken, totals]);
  const autoInsights = useMemo(() => generateSparringInsights({ partners, methods: combined, trainings: filtered as any }, 3), [partners, combined, filtered]);

  const podium = useMemo(() => {
    const arr = [...partners];
    if (podiumMode === 'wins') return arr.sort((a, b) => b.wins - a.wins).slice(0, 3);
    if (podiumMode === 'losses') return arr.sort((a, b) => b.losses - a.losses).slice(0, 3);
    if (podiumMode === 'winrate') return arr.filter((p) => p.wins + p.losses >= 3).sort((a, b) => b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses)).slice(0, 3);
    if (podiumMode === 'subsGiven') return arr.sort((a, b) => b.submissionsGiven - a.submissionsGiven).slice(0, 3);
    return arr.slice(0, 3);
  }, [partners, podiumMode]);

  const sorted = useMemo(() => {
    const arr = [...partners];
    if (sortMode === 'winrate') return arr.sort((a, b) => (b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : -1) - (a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : -1));
    if (sortMode === 'recent') return arr.sort((a, b) => (b.lastSession ?? '').localeCompare(a.lastSession ?? ''));
    if (sortMode === 'level') return arr.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
    return arr;
  }, [partners, sortMode]);

  const podiumMetric = (p: PartnerStats) => {
    if (podiumMode === 'wins') return `${p.wins} victoires`;
    if (podiumMode === 'losses') return traduire("{0} défaites", p.losses);
    if (podiumMode === 'winrate') return `${Math.round((p.wins / Math.max(1, p.wins + p.losses)) * 100)} %`;
    if (podiumMode === 'subsGiven') return `${p.submissionsGiven} soumissions`;
    return `${p.totalRounds} rounds, ${p.wins} V ${p.losses} D`;
  };

  const pickImage = async (): Promise<string | null> => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        appAlert(traduire('Accès refusé'), traduire('Autorise l’accès à la galerie dans les réglages du téléphone.'));
        return null;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!r.canceled && r.assets?.[0]?.uri) return savePhotoPermanently(r.assets[0].uri);
    } catch (e) {
      appAlert('Oups', traduire('La galerie ne s’ouvre pas. Réessaie.'));
    }
    return null;
  };

  const photoMenu = (p: PartnerStats) => {
    const has = !!photoOf(p.name);
    appAlert(traduire("Photo de {0}", p.name), has ? traduire('Changer ou retirer la photo ?') : traduire('Ajouter une photo ?'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: has ? 'Changer' : traduire('Choisir dans la galerie'),
        onPress: async () => {
          const uri = await pickImage();
          if (uri) {
            await savePartnerPhoto(p.name, uri);
            refreshPhotos();
          }
        },
      },
      ...(has
        ? [
            {
              text: 'Retirer',
              style: 'destructive' as const,
              onPress: async () => {
                await savePartnerPhoto(p.name, '');
                refreshPhotos();
              },
            },
          ]
        : []),
    ]);
  };

  const openEdit = (name: string) => {
    setEditing(name);
    setEditName(name);
    setEditPhoto(photos[name.trim().toLowerCase()] || null);
  };

  const saveEdit = async () => {
    if (!editing || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await renamePartner(editing, editName.trim(), editPhoto);
      setEditing(null);
      await reload();
      await refreshPhotos();
    } catch (e) {
      appAlert('Oups', traduire('La fiche n’a pas pu être enregistrée. Réessaie.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const shareStats = () => {
    partagerTexte({ source: 'sparring', message: traduire("Mon sparring YOROI : {0} rounds, {1} partenaires, {2}, {3} techniques travaillées.", totals.rounds, totals.partners, totals.winRate !== null ? `${totals.winRate} % de victoires` : 'premiers rounds', totals.techniques) });
  };

  if (loading) return <TabLoading />;
  const isEmpty = partners.length === 0 && techniques.length === 0;
  const progress = Math.min(1, thisWeek / Math.max(1, goal));
  const reached = thisWeek >= goal;

  return (
    <View style={{ gap: 14 }}>
      {globalInsights.length > 0 ? (
        <View style={{ gap: 8 }}>
          {globalInsights.slice(0, 3).map((g) => (
            <View key={g.id} style={{ padding: 14, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, gap: 2 }}>
              <Ink size={14} weight="extraBold">{g.title}</Ink>
              <Ink size={13} weight="medium" color={P.ink2}>{g.text}</Ink>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Press onPress={() => router.push('/matchup-matrix' as any)} accessibilityRole="button" accessibilityLabel={traduire("Matrice des confrontations")}>
            <View style={{ padding: 14, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, gap: 4 }}>
              <CIcon name="grid" size={20} color={P.indigo} />
              <Ink size={14} weight="extraBold">Matrice</Ink>
              <Ink size={12} weight="medium" color={P.muted} numberOfLines={1}>{traduire("Volume et victoires")}</Ink>
            </View>
          </Press>
        </View>
        <View style={{ flex: 1 }}>
          <Press onPress={() => router.push('/partners-tier-list' as any)} accessibilityRole="button" accessibilityLabel={traduire("Classement des partenaires")}>
            <View style={{ padding: 14, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, gap: 4 }}>
              <CIcon name="crown" size={20} color={P.goldDark} />
              <Ink size={14} weight="extraBold">Classement</Ink>
              <Ink size={12} weight="medium" color={P.muted} numberOfLines={1}>{traduire("Tes partenaires classés")}</Ink>
            </View>
          </Press>
        </View>
      </View>

      {combatSports.length > 1 ? <MiniChips items={[{ key: null as string | null, label: traduire('Tous') }, ...combatSports.map((s) => ({ key: s as string | null, label: getSportName(s) }))]} value={sport} onChange={(k) => setSport(k === sport ? null : k)} /> : null}

      {isEmpty ? (
        <TabEmpty title={traduire("Démarre ton suivi de sparring")} text={traduire("Enregistre ta première séance de combat : partenaires, résultats et finitions seront analysés ici.")} action={traduire("Démarrer une séance de combat")} href="/seance/combat?sport=jjb" />
      ) : (
        <>
          <Sheet2>
            <BigStats
              items={[
                { value: String(totals.rounds), label: 'rounds' },
                { value: String(totals.partners), label: 'partenaires', color: P.indigo },
                { value: String(totals.techniques), label: 'techniques' },
                { value: totals.winRate !== null ? `${totals.winRate} %` : '--', label: traduire('de victoires'), color: winColor(totals.winRate) },
              ]}
            />
            {streak.current > 0 || streak.best > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: '#F4F2EC' }}>
                <Kozane on={streak.current > 0} w={24} h={30} />
                <Ink size={14} weight="extraBold" style={{ flex: 1 }}>{streak.current > 0 ? traduirePluriel(streak.current, streak.current > 1, "{0} semaine d’affilée au tatami", "{0} semaines d’affilée au tatami", streak.current) : traduire('Reviens cette semaine pour relancer ta série')}</Ink>
                <Ink size={12} weight="bold" color={P.muted}>{`record ${streak.best}`}</Ink>
              </View>
            ) : null}
          </Sheet2>

          {autoInsights.length > 0 || coach.length > 0 ? (
            <View style={{ gap: 8 }}>
              <BlockTitle title={traduire("Le coach")} aside={traduire("Ce que disent tes rounds")} />
              {autoInsights.map((ins) => {
                const t = TONE[ins.tone] ?? TONE.neutral;
                return (
                  <View key={ins.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: t.bg }}>
                    <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: t.fg }} />
                    <Ink size={14} weight="bold" style={{ flex: 1 }}>{ins.text}</Ink>
                  </View>
                );
              })}
              {coach.map((c, i) => {
                const t = TONE[c.tone];
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: t.bg }}>
                    <Glyph kind="sakura" size={22} color={t.fg} />
                    <Ink size={14} weight="bold" style={{ flex: 1 }}>{c.text}</Ink>
                  </View>
                );
              })}
            </View>
          ) : null}

          {partners.length >= 2 ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>{traduire("Le podium")}</Ink>
              <MiniChips
                items={[
                  { key: 'volume' as PodiumMode, label: traduire('Volume') },
                  { key: 'wins' as PodiumMode, label: 'Victoires' },
                  { key: 'losses' as PodiumMode, label: traduire('Défaites') },
                  { key: 'winrate' as PodiumMode, label: traduire('Taux de victoire') },
                  { key: 'subsGiven' as PodiumMode, label: 'Soumissions' },
                ]}
                value={podiumMode}
                onChange={setPodiumMode}
              />
              {podium.length > 0 ? <Podium partners={podium} photos={photos} metric={podiumMetric} onSelect={(p) => router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any)} /> : <Ink size={13} weight="medium" color={P.ink2}>{traduire("Pas assez de rounds pour ce classement.")}</Ink>}
            </Sheet2>
          ) : null}

          {/* Les badges de combat (gamification) sont dans le Dojo, section Combat et partage */}
          <Press onPress={() => router.push('/game-plan' as any)} accessibilityRole="button" accessibilityLabel={traduire("Mon plan de jeu")}>
            <View style={{ padding: 16, borderRadius: 22, backgroundColor: P.ink, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 80 }}>
              <Glyph kind="eventail" size={34} color={P.goldLight} />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={16} weight="extraBold" color={P.white}>{traduire("Mon plan de jeu")}</Ink>
                <Ink size={12} weight="medium" color={paletteSombre() ? 'rgba(29,32,41,0.7)' : 'rgba(255,255,255,0.7)'}>{traduire("Checklist et journal")}</Ink>
              </View>
            </View>
          </Press>

          <Sheet2>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={18} weight="black" tight>{traduire("Objectif de la semaine")}</Ink>
              <Press onPress={() => { setGoalDraft(goal); setGoalOpen(true); }} accessibilityRole="button" accessibilityLabel={traduire("Modifier l’objectif")}>
                <View style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center', backgroundColor: '#F4F2EC' }}>
                  <Ink size={12} weight="extraBold" color={P.ink2}>{traduire("Modifier")}</Ink>
                </View>
              </Press>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Ink size={44} weight="black" tight color={reached ? P.mossText : P.ink}>{String(thisWeek)}</Ink>
              <Ink size={16} weight="bold" color={P.muted}>{traduire("sur {0} rounds", goal)}</Ink>
            </View>
            <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}>
              {Array.from({ length: Math.min(goal, 20) }).map((_, i) => (
                <Kozane key={i} on={i < Math.round(progress * Math.min(goal, 20))} w={goal > 14 ? 14 : 20} h={goal > 14 ? 18 : 26} />
              ))}
            </View>
            <Ink size={13} weight="extraBold" color={reached ? P.mossText : P.goldDark}>{reached ? traduire('Objectif atteint, armure lacée.') : traduirePluriel(goal - thisWeek, goal - thisWeek > 1, "Encore {0} round", "Encore {0} rounds", goal - thisWeek)}</Ink>
          </Sheet2>

          {recent.length > 0 ? (
            <>
              <BlockTitle title={traduire("Séances récentes")} />
              {recent.map((s, i) => (
                <View key={s.id ?? i} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
                  <View style={{ width: 50, borderRadius: 14, backgroundColor: '#F4F2EC', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                    <Ink size={20} weight="black" tight color={P.accent}>{String(dayDate(s.date).getDate())}</Ink>
                    <Ink size={11} weight="bold" color={P.ink2}>{dayDate(s.date).toLocaleDateString(LOCALE, { month: 'short' }).replace('.', '')}</Ink>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Ink size={15} weight="extraBold" numberOfLines={1} style={{ flex: 1 }}>{getSportName(s.sport)}</Ink>
                      {s.roundsCount > 0 ? <Ink size={13} weight="bold" color={P.indigo}>{`${s.roundsCount} round${s.roundsCount > 1 ? 's' : ''}`}</Ink> : null}
                    </View>
                    {s.technicalTheme ? <Ink size={13} weight="bold" color={P.goldDark} numberOfLines={1}>{s.technicalTheme}</Ink> : null}
                    {s.partners.length > 0 ? <Ink size={12} weight="medium" color={P.ink2} numberOfLines={1}>{traduire("Avec {0}", s.partners.join(', '))}</Ink> : null}
                    {s.wins > 0 || s.losses > 0 ? <Ink size={12} weight="extraBold" color={P.ink2}>{`${s.wins} V, ${s.losses} D`}</Ink> : null}
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {weekly.length > 0 ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>{traduire("Rounds par semaine")}</Ink>
              {weekly.length < 3 ? <Ink size={13} weight="medium" color={P.ink2}>{traduire("Encore quelques semaines et ta courbe apparaîtra.")}</Ink> : <Columns items={weekly} goal={goal} />}
              <Ink size={12} weight="medium" color={P.muted}>{traduire("Ligne d’or : ton objectif de {0} rounds.", goal)}</Ink>
            </Sheet2>
          ) : null}

          {monthly.length > 0 ? (
            <Sheet2>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Ink size={18} weight="black" tight>{traduire("Victoires par mois")}</Ink>
                <Ink size={16} weight="black" color={winColor(monthly[monthly.length - 1].value)}>{`${monthly[monthly.length - 1].value} %`}</Ink>
              </View>
              {monthly.length < 3 ? <Ink size={13} weight="medium" color={P.ink2}>{traduire("Encore quelques mois pour voir ta tendance.")}</Ink> : <Columns items={monthly.map((m) => ({ label: monthLabel(m.key), value: m.value, display: `${m.value} %`, color: winColor(m.value) }))} highlightLast={false} />}
            </Sheet2>
          ) : null}

          {topTaken.length > 0 ? (
            <Sheet2 tint={P.dangerSoft}>
              <Ink size={18} weight="black" tight color={P.danger}>{traduire("Finitions subies, à défendre")}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {topTaken.map(([n, c]) => (
                  <View key={n} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: blancA(0.75) }}>
                    <Ink size={13} weight="extraBold" color={P.danger}>{traduire("{0}, {1} fois", n, c)}</Ink>
                  </View>
                ))}
              </View>
            </Sheet2>
          ) : null}

          {partners.length > 0 ? (
            <>
              <BlockTitle title="Partenaires" aside={traduire("{0} au total, garde appuyé pour modifier", partners.length)} />
              {partners.length >= 2 ? (
                <MiniChips
                  items={[
                    { key: 'volume' as SortMode, label: traduire('Volume') },
                    { key: 'winrate' as SortMode, label: traduire('Taux de victoire') },
                    { key: 'recent' as SortMode, label: traduire('Récent') },
                    { key: 'level' as SortMode, label: traduire('Niveau') },
                  ]}
                  value={sortMode}
                  onChange={setSortMode}
                />
              ) : null}
              {sorted.map((p, i) => (
                <PartnerRow
                  key={p.name}
                  p={p}
                  top={i === 0}
                  photo={photoOf(p.name)}
                  hasFiche={fiches.has(p.name.trim().toLowerCase())}
                  maxRounds={partners[0]?.totalRounds ?? 1}
                  onOpen={() => setSelected(p)}
                  onEdit={() => openEdit(p.name)}
                  onPhoto={() => photoMenu(p)}
                />
              ))}
            </>
          ) : null}

          {techniques.length > 0 ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>{traduire("Techniques travaillées")}</Ink>
              {techniques.slice(0, 10).map((t, i) => (
                <RankRow key={t.name} rank={i + 1} title={t.name} value={traduire("{0} fois", t.count)} ratio={t.count / techniques[0].count} color={P.goldDark} sub={t.lastSession ? traduire("Dernière fois {0}", relative(t.lastSession)) : undefined} />
              ))}
            </Sheet2>
          ) : null}

          {finitions.length > 0 ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>Finitions</Ink>
              {finitions.map((s) => (
                <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ink size={15} weight="bold" style={{ flex: 1 }} numberOfLines={1}>{s.name}</Ink>
                  {s.given > 0 ? <Ink size={13} weight="extraBold" color={P.mossText}>{traduirePluriel(s.given, s.given > 1, "{0} placée", "{0} placées", s.given)}</Ink> : null}
                  {s.taken > 0 ? <Ink size={13} weight="extraBold" color={P.danger}>{`${s.taken} subie${s.taken > 1 ? 's' : ''}`}</Ink> : null}
                </View>
              ))}
            </Sheet2>
          ) : null}

          {records.longest || records.mostSubs || records.best ? (
            <>
              <BlockTitle title={traduire("Tes records de sparring")} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {records.longest ? <RecordTile label={traduire("Plus longue séance")} value={`${records.longest.n} rounds`} sub={shortDate(records.longest.date)} tone="indigo" /> : null}
                {records.mostSubs ? <RecordTile label={traduire("Soumissions en une séance")} value={String(records.mostSubs.n)} sub={shortDate(records.mostSubs.date)} tone="moss" /> : null}
                {records.best ? <RecordTile label="Meilleur taux" value={`${Math.round(records.best.rate)} %`} sub={traduire("{0} sur {1}, {2}", records.best.wins, records.best.total, shortDate(records.best.date))} tone="red" /> : null}
              </View>
            </>
          ) : null}

          {intensity.guerre.total + intensity.technique.total + intensity.detendu.total > 0 ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>{traduire("Selon l’intensité")}</Ink>
              {([
                { k: 'guerre' as const, label: 'Guerre', sub: traduire('rounds à fond') },
                { k: 'technique' as const, label: traduire('Technique'), sub: traduire('travail du geste') },
                { k: 'detendu' as const, label: traduire('Détendu'), sub: traduire('sparring léger') },
              ]).map((m) => {
                const s = intensity[m.k];
                if (s.total === 0) return null;
                const wr = Math.round((s.wins / s.total) * 100);
                return (
                  <View key={m.k} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Ink size={15} weight="extraBold">{m.label}</Ink>
                      <Ink size={12} weight="medium" color={P.muted} style={{ flex: 1 }}>{m.sub}</Ink>
                      <Ink size={16} weight="black" color={winColor(wr)}>{`${wr} %`}</Ink>
                    </View>
                    <SplitBar parts={[{ value: s.wins, color: P.moss }, { value: s.draws, color: P.gold }, { value: s.losses, color: P.danger }]} />
                    <Ink size={12} weight="bold" color={P.muted}>{`${s.wins} V, ${s.losses} D${s.draws > 0 ? `, ${s.draws} N` : ''}`}</Ink>
                  </View>
                );
              })}
            </Sheet2>
          ) : null}

          {weekday.some((d) => d.sessions > 0) ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>{traduire("Selon le jour")}</Ink>
              <Columns
                items={weekday.map((d) => {
                  const wr = d.total > 0 ? Math.round((d.wins / d.total) * 100) : null;
                  return { label: d.label, value: d.sessions, display: wr !== null ? `${wr} %` : '', color: wr === null ? '#CFCAC0' : winColor(wr) };
                })}
                highlightLast={false}
              />
              <Ink size={12} weight="medium" color={P.muted}>{traduire("Hauteur : nombre de séances. Couleur : taux de victoire (vert au-dessus de 60 %, or entre 40 et 60, rouge en dessous).")}</Ink>
            </Sheet2>
          ) : null}

          {cardio.hours > 0 || cardio.kcal > 0 || cardio.avgHR !== null ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {cardio.hours > 0 ? <RecordTile label={traduire("Temps total")} value={`${cardio.hours >= 100 ? Math.round(cardio.hours) : cardio.hours.toFixed(1).replace('.', DECIMAL)} h`} sub={traduire("sur le tatami")} tone="indigo" /> : null}
              {cardio.kcal > 0 ? <RecordTile label={traduire("Calories")} value={compact(cardio.kcal)} sub={traduire("brûlées au total")} tone="gold" /> : null}
              {cardio.avgHR !== null ? <RecordTile label={traduire("Cœur moyen")} value={`${cardio.avgHR} bpm`} sub={traduire("sur {0} séances", cardio.hrCount)} tone="red" /> : null}
              {cardio.maxHR ? <RecordTile label={traduire("Cœur au plus haut")} value={`${Math.round(cardio.maxHR)} bpm`} sub={traduire("ton record")} tone="red" /> : null}
            </View>
          ) : null}

          {combined.length > 0 ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>{traduire("Carte des finitions")}</Ink>
              {combined.slice(0, 10).map((m) => (
                <View key={m.method} style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Ink size={14} weight="bold" numberOfLines={1} style={{ flex: 1 }}>{m.method}</Ink>
                    <Ink size={12} weight="extraBold" color={P.ink2}>{traduire("{0} placées, {1} subies", m.given, m.taken)}</Ink>
                  </View>
                  <SplitBar parts={[{ value: m.given, color: P.moss }, { value: m.taken, color: P.danger }]} height={8} />
                </View>
              ))}
            </Sheet2>
          ) : null}

          {timeline.length > 0 ? (
            <Sheet2>
              <Ink size={18} weight="black" tight>{traduire("Tes finitions mois après mois")}</Ink>
              {timeline.map((tl, i) => (
                <View key={tl.name} style={{ gap: 4 }}>
                  <Ink size={14} weight="extraBold" color={['#3D5D9E', '#6E8C3A', '#A8832F'][i]}>{tl.name}</Ink>
                  <Columns items={tl.values.map((v, j) => ({ label: monthLabel(months6[j]).slice(0, 3), value: v }))} height={84} color={['#3D5D9E', '#6E8C3A', '#A8832F'][i]} highlightLast={false} />
                </View>
              ))}
            </Sheet2>
          ) : null}

          {topGiven.length > 0 ? (
            <Sheet2 tint={P.mossSoft}>
              <Ink size={18} weight="black" tight color={P.mossText}>{traduire("Tes meilleures armes")}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {topGiven.map(([n, c]) => (
                  <View key={n} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: blancA(0.75) }}>
                    <Ink size={13} weight="extraBold" color={P.mossText}>{traduire("{0}, {1} fois", n, c)}</Ink>
                  </View>
                ))}
              </View>
            </Sheet2>
          ) : null}

          {totals.rounds > 0 ? <BigButton label={traduire("Partager mes stats de sparring")} tone="light" icon="share" onPress={shareStats} /> : null}
        </>
      )}

      {selected ? <PartnerSheet partner={selected} onClose={() => setSelected(null)} /> : null}
      <EditPartnerSheet
        name={editing}
        onClose={() => setEditing(null)}
        editName={editName}
        setEditName={setEditName}
        editPhoto={editPhoto}
        onPickPhoto={async () => {
          const uri = await pickImage();
          if (uri) setEditPhoto(uri);
        }}
        onRemovePhoto={() => setEditPhoto(null)}
        saving={savingEdit}
        onSave={saveEdit}
        onDelete={async () => {
          if (!editing) return;
          await deletePartnerFiche(editing);
          setEditing(null);
          refreshPhotos();
        }}
      />
      <GoalSheet
        visible={goalOpen}
        value={goalDraft}
        onChange={setGoalDraft}
        onClose={() => setGoalOpen(false)}
        onSave={async () => {
          setGoal(goalDraft);
          await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(goalDraft)).catch(() => {});
          setGoalOpen(false);
        }}
      />
    </View>
  );
}
