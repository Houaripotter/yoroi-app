/**
 * Onglet Seances v2 (vague 11), esprit Strava, Hevy, Whoop :
 * 1. ta semaine en un coup d'oeil (seances, jours, duree, volume, charge, comparaison avec la semaine passee),
 *    ton prochain entrainement prevu (consultation, il ouvre le planning) ;
 *    (zones d'action) aucun ajout ici : commencer, noter, refaire ou lancer un creneau passe par le bouton + ;
 * 2. (vague 13) plus de liste de raccourcis en double : le planning et le calendrier s'ouvrent depuis
 *    le prochain entrainement, la montre depuis les filtres de l'historique, la seance oubliee depuis le bouton + ;
 * 3. ta derniere seance, les muscles travailles, tes records ;
 * 4. l'historique groupe par semaine ou par mois, filtre par sport ou par montre, avec recherche ;
 * 5. (vague 15) plus rien d'autre : Chrono, Carnet, Objectifs et Combat et competition sont sur l'accueil
 *    (Tes outils, hub /combat-hub), Clubs et Savoir dans Reglages, Selection YOROI retiree.
 * 6. (vague 26) apres ta derniere seance, la carte « Ton mois » : le calendrier du mois avec le logo
 *    de tes clubs sur chaque jour (le calendrier aime de l'ancienne app), toujours visible, il ouvre le planning.
 * Tirer vers le bas synchronise Apple Sante (ou Health Connect) puis recharge.
 * 8. (24 octobre 2026) sous le prochain entrainement, la carte Programmes : ton programme en cours ou l'entree vers /programmes.
 * 7. (16 octobre, SEANCES AVATAR) « Importer mes seances » depuis Apple Sante ou Health Connect : carte en haut tant
 *    que rien n'est importe, bouton dans l'etat vide, et le menu de l'onglet (les trois points). Masque sur le web.
 */
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { INK_TAB_BAR_SPACE } from '@/components/yoroi/v2/InkTabBar';
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { formatDuration, formatTonnage as tonnageText } from '@/lib/v2/trainingWeek';
import { todayISO } from '@/lib/v2/weightStats';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { firstSport, isoOf, parseExercises, relativeDay, sessionTitle } from '@/lib/v2/seances/sessionData';
import { formatRecordValue, recordShortTitle } from '@/lib/v2/seances/records';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import type { RecordLine } from '@/lib/v2/seances/records';
import { formatHours, formatTonnage, mainSport, sessionFacts, topExercises, weekMuscles } from '@/lib/v2/seances/weekSummary';
import { fr1, groupHistory, isImported, sportsByCount, weekCompare } from '@/lib/v2/seances/weekCompare';
import type { HistoryGroup } from '@/lib/v2/seances/weekCompare';
import { sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { SportThumb } from '@/components/yoroi/v2/seances/SessionRow';
import { computeWeekPlates } from '@/components/yoroi/v2/seances/WeekPlates';
import { LastSessionCard } from '@/components/yoroi/v2/seances/LastSession';
import type { LastSessionVM } from '@/components/yoroi/v2/seances/LastSession';
import { MuscleMap, MuscleScale } from '@/components/yoroi/v2/seances/MuscleMap';
import { WeekHero } from '@/components/yoroi/v2/seances/WeekHero';
import { NextUp, findNextSlot } from '@/components/yoroi/v2/seances/NextUp';
import { ProgrammeCard } from '@/components/yoroi/v2/seances/ProgrammeCard';
import { MesSeancesCarte } from '@/components/yoroi/v2/seances/MesSeancesCarte';
import { HistoryCard } from '@/components/yoroi/v2/seances/HistoryCard';
import { MonthCard } from '@/components/yoroi/v2/seances/MonthMarks';
import { ExampleFrame } from '@/components/yoroi/v2/seances/Example';
import { BigButton, Chip, ChipRow, EmptyState, Glass, Hanko, Row, SectionTitle, Segments, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { CarteImportSeances, ImportSeancesSheet } from '@/components/yoroi/v2/seances/ImportSeances';
import { importSeancesDisponible, nomSourceSante } from '@/lib/v2/seances/importSeances';
import { devNow } from '@/lib/v2/creator/devClock';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Grouping = 'semaine' | 'mois';
type Filter = { kind: 'tous' } | { kind: 'montre' } | { kind: 'sport'; sport: string };

function matches(t: Training, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [sessionTitle(t), t.notes, t.club_name, t.technical_theme, (t as any).location_name, ...parseExercises(t).map((e) => e.name)].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(s);
}

/** Libelle court d'un record : source unique lib/v2/seances/records */
const recordTitle = (l: RecordLine): string => recordShortTitle(l);

/** Resume d'un groupe d'historique : « 5 séances, 4 jours, 7 h 17, 12,4 t » */
function groupLine(g: HistoryGroup, unite: UnitePoids = 'kg'): string {
  const parts = [traduirePluriel(g.sessions, g.sessions > 1, "{0} séance", "{0} séances", g.sessions)];
  if (g.days !== g.sessions) parts.push(traduirePluriel(g.days, g.days > 1, "{0} jour", "{0} jours", g.days));
  if (g.minutes) parts.push(formatDuration(g.minutes));
  if (g.tonnageKg >= 100) parts.push(tonnageText(g.tonnageKg, unite));
  if (g.rounds) parts.push(traduirePluriel(g.rounds, g.rounds > 1, "{0} round", "{0} rounds", g.rounds));
  if (g.distanceKm > 0) parts.push(`${fr1(g.distanceKm)} km`);
  return parts.join(', ');
}

/** Exemple d'historique pour un nouvel utilisateur (affiche en filigrane, marque « exemple ») */
function sampleTrainings(today: string): Training[] {
  const d = (n: number) => isoOf(new Date(new Date(today + 'T12:00:00').getTime() - n * 86400000));
  return [
    { sport: 'musculation', date: d(1), start_time: '18:30', duration_minutes: 65, exercises: [{ name: 'Développé couché', sets: 4, reps: 8, weight: 70 }, { name: 'Squat', sets: 4, reps: 6, weight: 90 }] as any },
    { sport: 'jjb', session_type: 'sparring', date: d(3), start_time: '19:30', duration_minutes: 90, rounds: 6, heart_rate: 148 },
  ];
}

export default function Seances() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trainings, plan, occurrences, competitions, gender, weeklyGoal, favoris, typeDays, records, loaded, reload } = useSeancesData();
  // 18 octobre 2026 : charges et tonnage dans l'unite du reglage (kg ou lb), stockage en kilos
  const unite = useUnitePoids();
  const [filter, setFilter] = useState<Filter>({ kind: 'tous' });
  const [grouping, setGrouping] = useState<Grouping>('semaine');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [groupsShown, setGroupsShown] = useState(6);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const importSante = importSeancesDisponible();
  const scrollRef = useRef<ScrollView>(null);
  const historyY = useRef(0);
  const femme = gender === 'femme';

  const today = todayISO();
  const plates = useMemo(() => computeWeekPlates(trainings, plan, occurrences, isoOf(devNow()), typeDays), [trainings, plan, occurrences, typeDays]);
  const doneToday = plates.find((p) => p.isToday)?.count ?? 0;
  const next = useMemo(() => findNextSlot(plan, doneToday > 0), [plan, doneToday]);
  const week = useMemo(() => weekCompare(trainings, today), [trainings, today]);
  const muscles = useMemo(() => weekMuscles(trainings, today), [trainings, today]);
  const hasMuscles = muscles.some((m) => m.level > 0);
  const main = useMemo(() => mainSport(favoris, trainings), [favoris, trainings]);
  const sports = useMemo(() => sportsByCount(trainings), [trainings]);
  const importedCount = useMemo(() => trainings.filter(isImported).length, [trainings]);

  const filtered = useMemo(
    () =>
      trainings.filter((t) => {
        if (filter.kind === 'montre' && !isImported(t)) return false;
        if (filter.kind === 'sport' && firstSport(t.sport) !== filter.sport) return false;
        return matches(t, query);
      }),
    [trainings, filter, query],
  );
  const groups = useMemo(() => groupHistory(filtered, today, grouping), [filtered, today, grouping]);

  const slotsCount = useMemo(() => plan.filter((p) => !p.is_rest_day).length, [plan]);
  const validated = occurrences.filter((o) => o.status === 'validated').length;

  // Derniere seance, en carte riche
  const last = trainings[0];
  const lastVM: LastSessionVM | null = useMemo(() => {
    if (!last) return null;
    const f = sessionFacts(last);
    const facts: LastSessionVM['facts'] = [];
    const h = formatHours(f.minutes);
    if (f.minutes) facts.push({ label: traduire('durée'), value: h.value, unit: h.unit || undefined });
    if (f.tonnageKg > 0) {
      const tn = formatTonnage(f.tonnageKg, unite);
      facts.push({ label: 'tonnage', value: tn.value, unit: tn.unit });
    }
    if (f.sets > 0) facts.push({ label: traduire('séries'), value: String(f.sets) });
    if (f.rounds > 0 && facts.length < 3) facts.push({ label: 'rounds', value: String(f.rounds) });
    if (f.distanceKm > 0 && facts.length < 3) facts.push({ label: 'distance', value: fr1(f.distanceKm), unit: 'km' });
    if (last.heart_rate && last.heart_rate > 0 && facts.length < 3) facts.push({ label: traduire('FC moyenne'), value: String(Math.round(last.heart_rate)), unit: 'bpm' });
    return {
      title: sessionTitle(last),
      when: [relativeDay(last.date, today), last.club_name].filter(Boolean).join(', '),
      tint: sportTint(firstSport(last.sport)),
      art: sportImage(firstSport(last.sport), femme, 1),
      facts: facts.slice(0, 3),
      exercises: topExercises(last, 3, unite).map((e) => ({ name: e.name, best: e.best })),
      stamps: last.id ? records.stampedTrainings.get(last.id) ?? 0 : 0,
    };
  }, [last, today, femme, records.stampedTrainings, unite]);

  const pickFilter = (f: Filter) => {
    setFilter(f);
    setGroupsShown(grouping === 'mois' ? 4 : 6);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (await healthConnect.isAvailable()) await healthConnect.syncAll();
    } catch (e) {
      logger.warn('[Seances] Synchronisation santé impossible', e);
    }
    await reload();
    setRefreshing(false);
  };

  const filterLabel = filter.kind === 'montre' ? traduire('de ta montre') : filter.kind === 'sport' ? getSportName(filter.sport) : '';
  const isNew = loaded && trainings.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + INK_TAB_BAR_SPACE + 10, paddingHorizontal: 22, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        {/* En-tete, et le menu de l'onglet (16 octobre : importer tes seances) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Ink size={30} weight="black" tight accessibilityRole="header">{traduire("Séances")}</Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Importer toujours a portee, meme quand des seances viennent deja de Sante */}
          {importSante ? (
            <Pressable
              onPress={() => { tap(); setImportOpen(true); }}
              accessibilityRole="button"
              accessibilityLabel={traduire("Importer mes séances depuis {0}", nomSourceSante())}
              hitSlop={6}
              style={({ pressed }) => ({ height: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderColor: c.divider })}
            >
              <Icon name="download" size={18} color={c.accent} strokeWidth={2.6} />
              <Ink size={14} weight="extraBold" color={c.accent}>{traduire("Importer")}</Ink>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => { tap(); setMenuOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Menu des séances")}
            hitSlop={6}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderColor: c.divider })}
          >
            <Icon name="more" size={22} color={c.ink} strokeWidth={3.4} />
          </Pressable>
          </View>
        </View>

        {/* Importer mes seances : visible en haut tant que rien ne vient de Sante */}
        {importSante && loaded && trainings.length > 0 && importedCount === 0 ? <CarteImportSeances onPress={() => setImportOpen(true)} /> : null}

        {/* La semaine en un coup d'oeil */}
        <WeekHero
          week={week}
          plates={plates}
          weeklyGoal={weeklyGoal}
          art={sportImage(main, femme, 1)}
          tint={sportTint(main)}
          onOpenCharge={() => router.push('/charge' as any)}
          onChooseGoal={() => router.push('/settings?objectif=1' as any)}
        />

        {/* Prochain entrainement prevu */}
        <NextUp
          next={next}
          femme={femme}
          validated={validated}
          slotsCount={slotsCount}
          onPlanning={() => router.push('/planning' as any)}
          onCreate={() => router.push('/slots' as any)}
        />

        {/* 24 octobre 2026 : programmes d'entrainement, ton programme en cours */}
        <ProgrammeCard femme={femme} onOpen={() => router.push('/programmes' as any)} />

        {/* 25 octobre 2026 : tes seances enregistrees, a refaire en un appui */}
        <MesSeancesCarte />

        {/* Derniere seance */}
        {lastVM && last ? (
          <>
            <SectionTitle title={traduire("Ta dernière séance")} />
            <LastSessionCard
              vm={lastVM}
              onOpen={() => router.push({ pathname: '/workout-detail', params: { id: String(last.id) } } as any)}
            />
          </>
        ) : null}

        {/* Ton mois : calendrier du mois, toujours visible */}
        <SectionTitle title={traduire("Ton mois")} />
        <MonthCard trainings={trainings} competitions={competitions} onOpen={() => router.push('/planning?tab=mois' as any)} />

        {/* Muscles travailles */}
        {hasMuscles ? (
          <>
            <SectionTitle title={traduire("Muscles travaillés")} sub={traduire("cette semaine")} />
            <Glass style={{ gap: 12 }}>
              <MuscleMap loads={muscles} height={160} />
              <MuscleScale />
            </Glass>
          </>
        ) : null}

        {/* Records utiles */}
        <SectionTitle title={traduire("Tes records")} action={records.highlights.length ? traduire('Tout voir') : undefined} onAction={() => router.push('/records' as any)} />
        {records.highlights.length === 0 ? (
          <Glass onPress={() => router.push('/records' as any)} label={traduire("Tes records")} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Hanko size={28} color={c.textMuted} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="extraBold">{traduire("Ton premier record t’attend")}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire("Note tes charges, tes distances ou tes rounds : chaque marque battue reçoit son tampon ici.")}</Ink>
            </View>
          </Glass>
        ) : (
          <View style={{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, paddingHorizontal: 14 }}>
            {records.highlights.slice(0, 3).map((l, i) => {
              const v = formatRecordValue(l, undefined, unite);
              const fresh = l.stamps > 0 && l.date >= isoOf(new Date(Date.now() - 14 * 86400000));
              return (
                <Pressable
                  key={l.key}
                  onPress={() => { tap(); router.push({ pathname: '/records', params: { focus: l.key } } as any); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${recordTitle(l)}, ${v.main}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}
                >
                  <SportThumb sport={l.sport} femme={femme} size={40} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Ink size={15} weight="extraBold" numberOfLines={2}>{recordTitle(l)}</Ink>
                    <Ink size={12} color={c.textSecondary} numberOfLines={2}>{`${relativeDay(l.date, today)}, ${v.sub}`}</Ink>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: '40%' }}>
                    <Ink size={17} weight="black" tight numberOfLines={1}>{v.main}</Ink>
                    {fresh ? <Hanko size={16} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Historique */}
        <View
          onLayout={(e) => { historyY.current = e.nativeEvent.layout.y; }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 10, gap: 10 }}
        >
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={21} weight="black" tight>{traduire("Historique")}</Ink>
            {trainings.length > 0 ? (
              <Ink size={13} color={c.textSecondary}>
                {filterLabel
                  ? traduirePluriel(filtered.length, filtered.length > 1, "{0} séance {1}", "{0} séances {1}", filtered.length, filter.kind === 'sport' ? `de ${filterLabel}` : filterLabel)
                  : traduirePluriel(trainings.length, trainings.length > 1, "{0} séance au total", "{0} séances au total", trainings.length)}
              </Ink>
            ) : null}
          </View>
          {trainings.length > 0 ? (
            <Pressable
              onPress={() => { tap(); setSearchOpen((v) => !v); if (searchOpen) setQuery(''); }}
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? traduire('Fermer la recherche') : traduire('Chercher une séance')}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: searchOpen ? c.ink : P.carte, borderWidth: 1, borderColor: searchOpen ? c.ink : c.divider }}
            >
              <Icon name={searchOpen ? 'close' : 'search'} size={20} color={searchOpen ? P.paper : c.ink} />
            </Pressable>
          ) : null}
        </View>

        {searchOpen ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: c.border }}>
            <Icon name="search" size={18} color={c.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder={traduire("Exercice, club, note...")}
              placeholderTextColor={c.textMuted}
              style={{ flex: 1, fontSize: 15, color: c.ink, paddingVertical: 10 }}
              returnKeyType="search"
              accessibilityLabel={traduire("Chercher dans tes séances")}
            />
          </View>
        ) : null}

        {trainings.length > 0 ? (
          <>
            <Segments
              items={[{ key: 'semaine', label: traduire('Par semaine') }, { key: 'mois', label: traduire('Par mois') }]}
              value={grouping}
              onChange={(g) => { setGrouping(g); setGroupsShown(g === 'mois' ? 4 : 6); }}
            />
            {sports.length > 1 || importedCount > 0 ? (
              <ChipRow>
                <Chip label={traduire("Tous")} on={filter.kind === 'tous'} onPress={() => pickFilter({ kind: 'tous' })} />
                {importedCount > 0 ? <Chip label={traduire("De la montre")} on={filter.kind === 'montre'} onPress={() => pickFilter(filter.kind === 'montre' ? { kind: 'tous' } : { kind: 'montre' })} /> : null}
                {sports.length > 1
                  ? sports.map(({ sport }) => (
                      <Chip
                        key={sport}
                        label={getSportName(sport)}
                        on={filter.kind === 'sport' && filter.sport === sport}
                        onPress={() => pickFilter(filter.kind === 'sport' && filter.sport === sport ? { kind: 'tous' } : { kind: 'sport', sport })}
                      />
                    ))
                  : null}
              </ChipRow>
            ) : null}
          </>
        ) : null}

        {isNew ? (
          <>
            <EmptyState
              title={traduire("Ta première séance t’attend")}
              text={traduire("Muscu, combat ou course : note ta séance, ou relie ta montre, et ton historique se remplit ici semaine après semaine.")}
            />
            {importSante ? <BigButton label={traduire("Importer mes séances")} icon="download" tone="ink" onPress={() => setImportOpen(true)} /> : null}
            <PlusHint text={traduire("Touche + pour ta première séance")} align="center" />
            <ExampleFrame caption={traduire("Voilà à quoi ressemblera ton historique.")}>
              <View style={{ gap: 8 }}>
                <View style={{ paddingHorizontal: 4, gap: 1 }}>
                  <Ink size={16} weight="black" tight>{traduire("Cette semaine")}</Ink>
                  <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("2 séances, 2 h 35, 4,4 t, 6 rounds")}</Ink>
                </View>
                {sampleTrainings(today).map((t, i) => (
                  <HistoryCard key={i} t={t} femme={femme} stamps={i === 0 ? 1 : 0} />
                ))}
              </View>
            </ExampleFrame>
          </>
        ) : null}
        {loaded && trainings.length > 0 && groups.length === 0 ? (
          <Glass style={{ gap: 4 }}>
            <Ink size={15} weight="extraBold">{traduire("Aucune séance ne correspond")}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire("Essaie un autre mot ou un autre sport.")}</Ink>
          </Glass>
        ) : null}

        {groups.slice(0, groupsShown).map((g) => (
          <View key={g.key} style={{ gap: 8 }}>
            <View style={{ paddingHorizontal: 4, marginTop: 6, gap: 1 }}>
              <Ink size={16} weight="black" tight>{traduire(g.title)}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary}>{groupLine(g, unite)}</Ink>
            </View>
            {g.items.map((t) => (
              <HistoryCard key={t.id ?? `${t.date}${t.start_time}`} t={t} femme={femme} stamps={t.id ? records.stampedTrainings.get(t.id) ?? 0 : 0} />
            ))}
          </View>
        ))}
        {groups.length > groupsShown ? (
          <BigButton
            label={grouping === 'mois' ? traduire("Voir {0} mois de plus", Math.min(4, groups.length - groupsShown)) : traduire("Voir {0} semaines de plus", Math.min(6, groups.length - groupsShown))}
            tone="soft"
            onPress={() => setGroupsShown((n) => n + (grouping === 'mois' ? 4 : 6))}
          />
        ) : null}
      </ScrollView>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={traduire("Séances")}>
        {importSante ? (
          <Row icon="download" title={traduire("Importer mes séances")} sub={traduire("Depuis {0}, sans doublon", nomSourceSante())} onPress={() => { setMenuOpen(false); setTimeout(() => setImportOpen(true), 350); }} />
        ) : null}
        <Row icon="share" title={traduire("Importer un fichier")} sub={traduire("GPX ou TCX, depuis Strava ou Garmin")} onPress={() => { setMenuOpen(false); router.push('/import-workouts' as any); }} />
        <Row icon="calendar" title={traduire("Planning et calendrier")} onPress={() => { setMenuOpen(false); router.push('/planning' as any); }} />
      </Sheet>
      {importSante ? <ImportSeancesSheet visible={importOpen} onClose={() => setImportOpen(false)} onFini={() => { void reload(); }} /> : null}
    </View>
  );
}
