/**
 * Records v2 (maquettes S5 et G3) : des records utiles par sport.
 * Force : charge max et max estime par exercice, une seance par point sur la courbe.
 * Course et cardio : plus longue distance, meilleure allure.
 * Combat : victoires, soumissions par technique, seances les plus longues.
 * Regularite : meilleure semaine, semaines d'affilee, volume total.
 * Parametre optionnel : focus (cle d'un record a afficher en premier).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { DeviceEventEmitter, Image, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { calculateAllRecords, generateRecordShareText } from '@/lib/records';
import { partagerTexte } from '@/lib/v2/partage/texte';
import type { NewRecordEvent, PersonalRecords, RecordType } from '@/lib/records';
import { getCombats } from '@/lib/fighterModeService';
import { successHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { todayISO } from '@/lib/v2/weightStats';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { chartSeries, combatSummary, formatRecordValue, regularity } from '@/lib/v2/seances/records';
import type { RecordLine } from '@/lib/v2/seances/records';
import { formatHours, mainSport } from '@/lib/v2/seances/weekSummary';
import { MONTHS, familyOf, isoOf, longDate, relativeDay } from '@/lib/v2/seances/sessionData';
import { BrushChart } from '@/components/yoroi/v2/seances/BrushChart';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { BackButton, BigButton, Chip, ChipRow, EmptyState, Glass, Hanko, SectionTitle, Segments, tap } from '@/components/yoroi/v2/seances/ui';
import { blancA } from '@/components/yoroi/livePalette';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { libelleUnite, versUnitePoids } from '@/lib/v2/unitePoids';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';
import { STICKERS, useIllustrations } from '@/components/yoroi/v2/stickers';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const RECORDS_CACHE_KEY = '@yoroi_records_cache_v1';
const RECORDS_CACHE_TTL = 10 * 60 * 1000;

type Group = 'force' | 'endurance' | 'combat' | 'regularite';
const GROUP_LABEL: Record<Group, string> = { force: traduire('Muscu'), endurance: 'Cardio', combat: traduire('Combat'), regularite: traduire('Régularité') };
const ORDER: Group[] = ['force', 'endurance', 'combat', 'regularite'];

function groupOf(l: RecordLine): Group {
  if (l.kind === 'force' || l.kind === 'reps') return 'force';
  if (l.kind === 'distance' || l.kind === 'allure') return 'endurance';
  const f = familyOf(l.sport);
  if (l.kind === 'rounds' || f === 'combat_sol' || f === 'combat_pied') return 'combat';
  return 'regularite';
}

function groupOfSport(sport: string): Group {
  const f = familyOf(sport);
  if (f === 'combat_sol' || f === 'combat_pied') return 'combat';
  if (f === 'cardio') return 'endurance';
  if (f === 'muscu') return 'force';
  return 'regularite';
}

function fmt1(v: number): string {
  return (Math.round(v * 10) / 10).toString().replace('.', DECIMAL);
}

function weekLabel(monday: string): string {
  const d = new Date(monday + 'T12:00:00');
  return traduire("semaine du {0} {1}", d.getDate(), MONTHS[d.getMonth()]);
}

type CompCombat = { resultat?: string; methode?: string; technique?: string };

export default function RecordsScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { records, loaded, trainings, favoris } = useSeancesData();
  // 18 octobre 2026 : charges stockees en kilos, affichees dans l'unite du reglage (kg ou lb) ; le poids du corps reste en kilos
  const unite = useUnitePoids();
  const uL = libelleUnite(unite);
  const cv = (kg: number) => versUnitePoids(kg, unite);
  const scrollRef = useRef<ScrollView>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [selected, setSelected] = useState<string | null>(params.focus ?? null);
  const [general, setGeneral] = useState<PersonalRecords | null>(null);
  const [newRecords, setNewRecords] = useState<NewRecordEvent[]>([]);
  const [combats, setCombats] = useState<CompCombat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Records generaux (poids, series) : meme calcul et meme cache que l'ancien ecran
  const loadGeneral = useCallback(async (celebrate = false, bypassCache = false) => {
    try {
      if (!bypassCache) {
        try {
          const cached = await AsyncStorage.getItem(RECORDS_CACHE_KEY);
          if (cached) {
            const { ts, data } = JSON.parse(cached);
            if (Date.now() - ts < RECORDS_CACHE_TTL) {
              setGeneral(data.records);
              setNewRecords(data.newRecords || []);
            }
          }
        } catch {
          // cache illisible
        }
      }
      const result = await calculateAllRecords();
      setGeneral(result.records);
      setNewRecords(result.newRecords);
      try {
        await AsyncStorage.setItem(RECORDS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: { records: result.records, newRecords: result.newRecords } }));
      } catch {
        // non bloquant
      }
      if (celebrate && result.newRecords.length > 0) {
        successHaptic();
        playSuccessSound();
      }
    } catch (error) {
      logger.error('Erreur chargement records:', error);
    } finally {
      setRefreshing(false);
    }
    try {
      const list = await getCombats();
      setCombats(list ?? []);
    } catch {
      setCombats([]);
    }
  }, []);

  useEffect(() => {
    loadGeneral(true);
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, () => {
      AsyncStorage.removeItem(RECORDS_CACHE_KEY).catch(() => {});
      loadGeneral(false, true);
    });
    return () => sub.remove();
  }, [loadGeneral]);

  const onRefresh = async () => {
    setRefreshing(true);
    await AsyncStorage.removeItem(RECORDS_CACHE_KEY).catch(() => {});
    await loadGeneral(true, true);
  };

  // Le texte peut contenir le poids ou le tour de taille : la personne voit d'abord le texte exact
  const share = (type: RecordType, value: number) => {
    partagerTexte({ source: 'record', message: generateRecordShareText(type, value), apercu: true });
  };

  const today = todayISO();
  const freshLimit = isoOf(new Date(Date.now() - 14 * 86400000));
  const combat = useMemo(() => combatSummary(trainings, combats), [trainings, combats]);
  const reg = useMemo(() => regularity(trainings, today), [trainings, today]);
  const hasCombat = useMemo(() => trainings.some((t) => groupOfSport(t.sport) === 'combat') || combats.length > 0, [trainings, combats]);

  const groups = useMemo(() => {
    const present = new Set(records.lines.map(groupOf));
    if (hasCombat) present.add('combat');
    if (trainings.length > 0) present.add('regularite');
    const main = groupOfSport(mainSport(favoris, trainings));
    const list = ORDER.filter((g) => present.has(g));
    // le sport principal passe en premier
    return list.includes(main) ? [main, ...list.filter((g) => g !== main)] : list;
  }, [records.lines, hasCombat, trainings, favoris]);

  useEffect(() => {
    if (params.focus) {
      const l = records.lines.find((x) => x.key === params.focus);
      if (l) {
        setGroup(groupOf(l));
        setSelected(l.key);
        return;
      }
    }
    if (groups.length && (!group || !groups.includes(group))) setGroup(groups[0]);
  }, [groups, params.focus, records.lines]); // eslint-disable-line react-hooks/exhaustive-deps

  const g0: Group = group ?? groups[0] ?? 'regularite';
  const lines = useMemo(() => records.lines.filter((l) => groupOf(l) === g0), [records.lines, g0]);
  const chartable = useMemo(
    () => lines.filter((l) => !l.minor && (g0 === 'force' || g0 === 'endurance')).sort((a, b) => b.history.length - a.history.length),
    [lines, g0],
  );
  const current: RecordLine | undefined = chartable.find((l) => l.key === selected) ?? chartable[0];

  const chartPoints = useMemo(() => {
    if (!current) return [];
    return chartSeries(current).map((p) => ({
      date: p.date,
      value: p.value,
      seal: p.isRecord,
      label: current.kind === 'force' ? `${Math.round(cv(p.value))} ${uL}` : formatRecordValue(current, p.value).main,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, unite]);

  const progress = useMemo(() => {
    if (!current || current.history.length < 2) return null;
    const first = current.history[0];
    const diff = current.kind === 'allure' ? first.value - current.best : current.best - first.value;
    if (Math.abs(diff) < 0.05) return null;
    const m = MONTHS[new Date(first.date.slice(0, 10) + 'T12:00:00').getMonth()];
    if (current.kind === 'force') return diff > 0 ? traduire("{0} {1} de plus depuis {2}", fmt1(Math.abs(cv(diff))), uL, m) : traduire("{0} {1} de moins depuis {2}", fmt1(Math.abs(cv(diff))), uL, m);
    if (current.kind === 'allure') return diff > 0 ? traduire("{0} secondes au km gagnées depuis {1}", Math.round(Math.abs(diff)), m) : traduire("{0} secondes au km perdues depuis {1}", Math.round(Math.abs(diff)), m);
    if (current.kind === 'distance') return diff > 0 ? traduire("{0} km de plus depuis {1}", fmt1(Math.abs(diff)), m) : traduire("{0} km de moins depuis {1}", fmt1(Math.abs(diff)), m);
    return diff > 0 ? traduire("{0} de plus depuis {1}", fmt1(Math.abs(diff)), m) : traduire("{0} de moins depuis {1}", fmt1(Math.abs(diff)), m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, unite]);

  const lastStamp = current ? [...current.history].reverse().find((p) => p.isRecord) : undefined;

  // Autres records : poids et mesures, sans la serie du jour quand elle est a zero
  const g = general;
  const otherRows: { label: string; value: string; date?: string; share?: { type: RecordType; value: number } }[] = [];
  if (g) {
    if (g.lowestWeight) otherRows.push({ label: traduire('Poids le plus bas'), value: `${fmt1(g.lowestWeight.value)} kg`, date: g.lowestWeight.date, share: { type: 'lowestWeight', value: g.lowestWeight.value } });
    if (g.startingWeight) otherRows.push({ label: traduire('Poids de départ'), value: `${fmt1(g.startingWeight.value)} kg`, date: g.startingWeight.date });
    if (g.lowestWaist) otherRows.push({ label: traduire('Tour de taille le plus bas'), value: `${g.lowestWaist.value} cm`, date: g.lowestWaist.date, share: { type: 'lowestWaist', value: g.lowestWaist.value } });
    if (g.longestStreak && g.longestStreak.value > 1) otherRows.push({ label: traduire('Plus longue série de jours'), value: traduire("{0} jours", g.longestStreak.value), date: g.longestStreak.date, share: { type: 'longestStreak', value: g.longestStreak.value } });
    if (g.bestMonthRegularity) otherRows.push({ label: traduire('Ton mois le plus régulier'), value: `${g.bestMonthRegularity.value} %`, date: g.bestMonthRegularity.label, share: { type: 'bestMonthRegularity', value: g.bestMonthRegularity.value } });
    if (g.totalMeasurements > 0) otherRows.push({ label: traduire('Pesées au total'), value: String(g.totalMeasurements) });
  }
  const dateText = (d?: string) => (!d ? '' : /^\d{4}-\d{2}-\d{2}/.test(d) ? longDate(d.slice(0, 10)) : d);
  const openTraining = (id?: number) => {
    if (id != null) router.push({ pathname: '/workout-detail', params: { id: String(id) } } as any);
  };

  const card = { borderRadius: 22, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.divider, paddingHorizontal: 14 } as const;

  const Tile = ({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) => (
    <View style={{ flexGrow: 1, flexBasis: '44%', padding: 14, borderRadius: 18, backgroundColor: blancA(0.84), borderWidth: 1, borderColor: c.divider, gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{label}</Ink>
      <Ink size={26} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
        {unit ? <Ink size={13} weight="bold" color={c.textSecondary}>{` ${unit}`}</Ink> : null}
      </Ink>
      {sub ? <Ink size={12} color={c.textMuted} numberOfLines={2}>{sub}</Ink> : null}
    </View>
  );

  const LineRow = ({ l, i, onPress, short }: { l: RecordLine; i: number; onPress?: () => void; short?: boolean }) => {
    const v = formatRecordValue(l, undefined, unite);
    const fresh = l.date >= freshLimit && l.stamps > 0;
    const on = current?.key === l.key;
    const shortName = short && l.kind !== 'force' && l.kind !== 'reps' ? (l.court ?? l.name.split(', ').slice(1).join(', ')) || l.name : l.name;
    return (
      <Pressable
        onPress={() => { tap(); onPress ? onPress() : openTraining(l.trainingId); }}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider, backgroundColor: on ? blancA(0.6) : 'transparent' }}
      >
        {l.minor ? (
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {illus.stickers ? (
              <Image source={STICKERS.gants} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            ) : (
              <Icon name="glove" size={18} color={c.textSecondary} />
            )}
          </View>
        ) : (
          <Hanko size={26} color={fresh ? c.record : '#B9B6AE'} rotate={-7} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold" numberOfLines={2}>{shortName.charAt(0).toUpperCase() + shortName.slice(1)}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={2}>{`${relativeDay(l.date, today)}${l.stamps > 0 ? traduire(", battu {0} fois", l.stamps) : ''}`}</Ink>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 1, maxWidth: '44%' }}>
          <Ink size={17} weight="black" tight numberOfLines={1}>{v.main}</Ink>
          <Ink size={11} color={c.textMuted} numberOfLines={2}>{traduire(v.sub)}</Ink>
        </View>
      </Pressable>
    );
  };

  /** Lignes groupees par sport (titre du sport au-dessus) */
  const bySport = (ls: RecordLine[]) => {
    const map = new Map<string, RecordLine[]>();
    ls.forEach((l) => {
      const k = l.sportNom ?? l.name.split(', ')[0];
      map.set(k, [...(map.get(k) ?? []), l]);
    });
    return Array.from(map.entries());
  };

  const combatDuree = lines.filter((l) => l.kind === 'duree');
  const combatRounds = lines.filter((l) => l.kind === 'rounds');
  const maxSub = combat.submissions[0]?.count ?? 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        <EnTete
          titre={traduire("Records")}
          sousTitre={records.totalStamps > 0 ? traduirePluriel(records.totalStamps, records.totalStamps > 1, "{0} record battu depuis le début", "{0} records battus depuis le début", records.totalStamps) : traduire('tes meilleures marques, sport par sport')}
          repli="/(tabs)/seances"
          style={{ marginHorizontal: -22, marginTop: -8 }}
        />

        {newRecords.length > 0 ? (
          <Glass style={{ gap: 8, borderColor: c.accentTint }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Hanko size={30} filled />
              <Ink size={16} weight="black" tight>{traduire("Nouveaux records")}</Ink>
            </View>
            {newRecords.map((nr, i) => (
              <Ink key={i} size={14} color={c.textSecondary}>{nr.message.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()}</Ink>
            ))}
          </Glass>
        ) : null}

        {loaded && trainings.length === 0 ? (
          <EmptyState
            title={traduire("Pas encore de record")}
            text={traduire("Enregistre tes séances avec tes charges, tes distances ou tes rounds. Dès que tu bats une marque, elle s’affiche ici.")}
            action={traduire("Commencer une séance")}
            onAction={() => router.push('/seance' as any)}
          />
        ) : null}

        {groups.length > 1 ? (
          <Segments items={groups.map((k) => ({ key: k, label: GROUP_LABEL[k] }))} value={g0} onChange={(k) => { setGroup(k); setSelected(null); }} />
        ) : null}

        {/* Force et endurance : un record choisi, sa courbe, puis la liste */}
        {(g0 === 'force' || g0 === 'endurance') && current ? (
          <>
            {chartable.length > 1 ? (
              <ChipRow>
                {chartable.slice(0, 14).map((l) => (
                  <Chip key={l.key} label={l.kind === 'force' || l.kind === 'reps' ? l.name : l.sportNom && l.kind === 'distance' ? traduire("{0}, distance", l.sportNom) : l.sportNom && l.kind === 'allure' ? traduire("{0}, allure", l.sportNom) : l.name} on={l.key === current.key} onPress={() => setSelected(l.key)} />
                ))}
              </ChipRow>
            ) : null}
            <View style={{ gap: 4, paddingHorizontal: 4 }}>
              <Ink size={15} weight="extraBold" numberOfLines={2}>{sansTiret(traduire(current.name))}</Ink>
              {current.kind === 'force' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <Tile
                    label={traduire("Charge max")}
                    value={current.maxLoad ? `${fmt1(cv(current.maxLoad.weight))}` : '0'}
                    unit={current.maxLoad ? `${uL} × ${current.maxLoad.reps}` : uL}
                  />
                  <Tile label={traduire("Max estimé sur 1 répétition")} value={String(Math.round(cv(current.best)))} unit={uL} />
                </View>
              ) : (
                <Ink size={48} weight="black" tight style={{ lineHeight: 54 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {current.kind === 'allure' ? formatRecordValue(current).main : current.kind === 'reps' ? String(Math.round(current.best)) : fmt1(current.best)}
                  <Ink size={18} weight="bold" color={c.textSecondary}>{current.kind === 'allure' ? traduire(' min par km') : current.kind === 'reps' ? traduire(' répétitions') : ' km'}</Ink>
                </Ink>
              )}
              {progress ? <Ink size={14} weight="bold" color={c.indigo}>{progress}</Ink> : null}
            </View>
            {chartPoints.length >= 2 ? (
              <View style={{ gap: 6 }}>
                <Ink size={12} weight="bold" color={c.textMuted} style={{ paddingHorizontal: 4 }}>
                  {current.kind === 'force' ? traduire('Ton max estimé, une séance par point') : current.kind === 'reps' ? traduire('Tes répétitions, une séance par point') : traduire('Évolution de ton record')}
                </Ink>
                <BrushChart
                  points={chartPoints}
                  width={width - 44}
                  color="#3D5D9E"
                  invert={current.kind === 'allure'}
                  format={(v) => (current.kind === 'allure' ? formatRecordValue(current, v).main : String(Math.round(current.kind === 'force' ? cv(v) : v)))}
                />
              </View>
            ) : (
              <Glass>
                <Ink size={14} color={c.textSecondary}>{traduire("Encore une séance avec cet exercice et ta courbe de progression apparaît ici.")}</Ink>
              </Glass>
            )}
            <Glass onPress={current.trainingId != null ? () => openTraining(current.trainingId) : undefined} label={traduire("Voir la séance du record")} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Hanko size={28} rotate={-6} color={lastStamp ? c.record : '#B9B6AE'} />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={15} weight="extraBold">{lastStamp ? `Dernier record, ${longDate(lastStamp.date)}` : traduire("Ta meilleure marque, {0}", longDate(current.date))}</Ink>
                <Ink size={13} color={c.textSecondary}>
                  {current.kind === 'force' && current.bestSet ? traduirePluriel(current.bestSet.reps, current.bestSet.reps > 1, "{0} {1} pour {2} répétition", "{0} {1} pour {2} répétitions", fmt1(cv(current.bestSet.weight)), uL, current.bestSet.reps) : formatRecordValue(current).main}
                </Ink>
              </View>
              {current.trainingId != null ? <Icon name="chevron" size={18} color={c.textMuted} /> : null}
            </Glass>

            <SectionTitle title={g0 === 'force' ? traduire('Tous tes exercices') : traduire('Tous tes records')} sub={g0 === 'force' ? traduire('charge max et max estimé') : undefined} />
            {g0 === 'force' ? (
              <View style={card}>
                {lines.map((l, i) => (
                  <Pressable
                    key={l.key}
                    onPress={() => { tap(); setSelected(l.key); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
                    onLongPress={() => openTraining(l.trainingId)}
                    accessibilityRole="button"
                    accessibilityHint={traduire("Appui long pour ouvrir la séance")}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}
                  >
                    <Hanko size={24} color={l.date >= freshLimit && l.stamps > 0 ? c.record : '#B9B6AE'} rotate={-7} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={15} weight="extraBold" numberOfLines={2}>{sansTiret(traduire(l.name))}</Ink>
                      <Ink size={12} color={c.textSecondary}>{relativeDay(l.date, today)}</Ink>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 1 }}>
                      <Ink size={16} weight="black" tight>{l.kind === 'reps' ? traduire("{0} rép.", Math.round(l.best)) : l.maxLoad ? `${fmt1(cv(l.maxLoad.weight))} ${uL} × ${l.maxLoad.reps}` : `${Math.round(cv(l.best))} ${uL}`}</Ink>
                      <Ink size={11} color={c.textMuted}>{l.kind === 'reps' ? traduire('au poids du corps') : traduire("max estimé {0} {1}", Math.round(cv(l.best)), uL)}</Ink>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              bySport(lines).map(([sportName, ls]) => (
                <View key={sportName} style={{ gap: 6 }}>
                  <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{sportName}</Ink>
                  <View style={card}>
                    {ls.map((l, i) => (
                      <LineRow key={l.key} l={l} i={i} short onPress={() => { setSelected(l.key); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} />
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}

        {/* Combat : victoires, soumissions par technique, seances les plus longues */}
        {g0 === 'combat' ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Tile label={traduire("Victoires en sparring")} value={String(combat.wins)} sub={combat.roundsTotal ? traduire("sur {0} rounds notés", combat.roundsTotal) : traduire('note tes rounds pour les compter')} />
              <Tile label={traduire("Soumissions placées")} value={String(combat.submissionsTotal)} sub={combat.submissions[0] ? `Surtout : ${combat.submissions[0].technique.trim().charAt(0).toUpperCase()}${combat.submissions[0].technique.trim().slice(1)}` : undefined} />
              {combat.compTotal > 0 ? <Tile label={traduire("Victoires en compétition")} value={String(combat.compWins)} sub={traduirePluriel(combat.compTotal, combat.compTotal > 1, "sur {0} combat", "sur {0} combats", combat.compTotal)} /> : null}
            </View>

            {combat.submissions.length > 0 ? (
              <>
                <SectionTitle title={traduire("Soumissions par technique")} />
                <View style={[card, { paddingVertical: 8 }]}>
                  {combat.submissions.slice(0, 8).map((s) => (
                    <View key={s.technique} style={{ paddingVertical: 8, gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                        <Ink size={14} weight="bold" style={{ flex: 1 }} numberOfLines={2}>{s.technique}</Ink>
                        <Ink size={14} weight="black">{String(s.count)}</Ink>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.max(6, (s.count / maxSub) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: '#A8832F' }} />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {combatDuree.length > 0 ? (
              <>
                <SectionTitle title={traduire("Tes séances les plus longues")} />
                <View style={card}>
                  {combatDuree.map((l, i) => <LineRow key={l.key} l={l} i={i} />)}
                </View>
              </>
            ) : null}

            {combatRounds.length > 0 ? (
              <>
                <SectionTitle title={traduire("Le plus de rounds")} sub={traduire("un repère de volume, pas un record")} />
                <View style={card}>
                  {combatRounds.map((l, i) => <LineRow key={l.key} l={l} i={i} />)}
                </View>
              </>
            ) : null}

            {combat.roundsTotal === 0 && combat.compTotal === 0 ? (
              <Glass style={{ gap: 10 }}>
                <Ink size={15} weight="extraBold">{traduire("Note tes rounds de sparring")}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire("Résultat et soumission de chaque round : tes victoires et tes techniques favorites s’affichent ici.")}</Ink>
                <BigButton label={traduire("Commencer une séance")} onPress={() => router.push('/seance' as any)} />
              </Glass>
            ) : null}
          </>
        ) : null}

        {/* Regularite */}
        {g0 === 'regularite' ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {reg.bestWeek ? <Tile label={traduire("Ta meilleure semaine")} value={String(reg.bestWeek.count)} unit={traduirePluriel(reg.bestWeek.count, reg.bestWeek.count > 1, "séance", "séances")} sub={weekLabel(reg.bestWeek.monday)} /> : null}
              {reg.longestWeekStreak > 0 ? <Tile label={traduire("Semaines d’affilée")} value={String(reg.longestWeekStreak)} unit="sem." sub={reg.currentWeekStreak > 1 ? traduire("en cours : {0} semaines", reg.currentWeekStreak) : traduire('ton record')} /> : null}
              <Tile label={traduire("Séances au total")} value={String(reg.totalSessions)} />
              <Tile label={traduire("Temps d’entraînement")} value={formatHours(reg.totalMinutes).value} unit={formatHours(reg.totalMinutes).unit || undefined} />
            </View>
            {lines.filter((l) => l.kind === 'duree').length > 0 ? (
              <>
                <SectionTitle title={traduire("Tes séances les plus longues")} />
                <View style={card}>
                  {lines.filter((l) => l.kind === 'duree').map((l, i) => <LineRow key={l.key} l={l} i={i} />)}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {otherRows.length > 0 ? (
          <>
            <SectionTitle title={traduire("Poids et mesures")} sub={traduire("tes repères hors séance")} />
            <View style={card}>
              {otherRows.map((r, i) => (
                <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}>
                  <View style={{ flex: 1, gap: 1, paddingVertical: 8 }}>
                    <Ink size={14} weight="bold">{traduire(r.label)}</Ink>
                    {r.date ? <Ink size={12} color={c.textMuted}>{dateText(r.date)}</Ink> : null}
                  </View>
                  <Ink size={16} weight="black">{r.value}</Ink>
                  {r.share ? (
                    <Pressable onPress={() => { tap(); share(r.share!.type, r.share!.value); }} accessibilityRole="button" accessibilityLabel={traduire("Partager : {0}", r.label)} hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="share" size={18} color={c.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : null}
        {g0 === 'force' && trainings.length > 0 ? (
          <Ink size={12} color={c.textMuted} style={{ textAlign: 'center', paddingHorizontal: 20 }}>
            {traduire("Le max estimé vient de tes séries (formule d’Epley). Ta première séance sur un exercice sert de point de départ.")}</Ink>
        ) : null}
      </ScrollView>
    </View>
  );
}
