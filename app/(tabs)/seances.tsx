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
 *    27 octobre : chaque bouton Importer ouvre un seul choix (Sante, autre app en CSV, GPX ou TCX).
 * 9. (28 octobre 2026, maquette A « Aujourd'hui d'abord », validee par Houari, avec un emprunt a la maquette C)
 *    En haut, la carte du jour (CarteDuJour : la seance du programme du Coach, sinon le creneau prevu, sinon
 *    l'appel vers le Coach), puis ta semaine (anneau et jours de L a D), ce qui vient (prochain entrainement),
 *    tes chiffres de la semaine (4 tuiles), puis « En detail » : des sections repliables (derniere seance, mes
 *    seances, ton mois, muscles travailles, records), chacune avec son resume une fois fermee, l'etat retenu.
 *    L'historique complet reste tout en bas. Rien n'a disparu. Ancienne version :
 *    _archive_ancien_design_2026-10-09/seances_A_2026-10-28.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE } from '@/lib/i18n/dateLocale';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { TourAnchor, registerTourScroller } from '@/components/yoroi/v2/tour/TourAnchor';
import { INK_TAB_BAR_SPACE } from '@/components/yoroi/v2/InkTabBar';
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { useTirerPourActualiser } from '@/lib/v2/actualiser/useTirerPourActualiser';
import { formatDuration, formatTonnage as tonnageText } from '@/lib/v2/trainingWeek';
import { todayISO } from '@/lib/v2/weightStats';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { firstSport, isoOf, parseExercises, relativeDay, sessionTitle } from '@/lib/v2/seances/sessionData';
import { formatRecordValue, recordShortTitle } from '@/lib/v2/seances/records';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import type { RecordLine } from '@/lib/v2/seances/records';
import { formatHours, formatTonnage, sessionFacts, topExercises, weekMuscles } from '@/lib/v2/seances/weekSummary';
import { fr1, groupHistory, isImported, sportsByCount, weekCompare } from '@/lib/v2/seances/weekCompare';
import type { HistoryGroup } from '@/lib/v2/seances/weekCompare';
import { sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { SportThumb } from '@/components/yoroi/v2/seances/SessionRow';
import { computeWeekPlates } from '@/components/yoroi/v2/seances/WeekPlates';
import { LastSessionBody } from '@/components/yoroi/v2/seances/LastSession';
import type { LastSessionVM } from '@/components/yoroi/v2/seances/LastSession';
import { WeekTiles } from '@/components/yoroi/v2/seances/WeekHero';
import { NextUp, findNextSlot } from '@/components/yoroi/v2/seances/NextUp';
import { MesSeancesListe, resumeMesSeances, useMesSeances } from '@/components/yoroi/v2/seances/MesSeancesCarte';
import { HistoryCard } from '@/components/yoroi/v2/seances/HistoryCard';
import { stickerDuSport } from '@/components/yoroi/v2/seances/MonthMarks';
import { ExampleFrame } from '@/components/yoroi/v2/seances/Example';
import { BigButton, Chip, ChipRow, EmptyState, Glass, Hanko, Row, Segments, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { CarteDuJour } from '@/components/yoroi/v2/seances/CarteDuJour';
import { SemaineAnneau } from '@/components/yoroi/v2/seances/SemaineAnneau';
import { MoisPastilles, RangeeDuMois, useMois } from '@/components/yoroi/v2/seances/MoisPastilles';
import { MusclesSemaine } from '@/components/yoroi/v2/seances/MusclesSemaine';
import { SectionRepliable, useSectionsOuvertes } from '@/components/yoroi/v2/seances/Repliable';
import { Petites } from '@/components/yoroi/v2/seances/kitA';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { dernierRecord, musclePrincipal } from '@/lib/v2/seances/carteDuJour';
import { CarteImportSeances, ImportSeancesSheet } from '@/components/yoroi/v2/seances/ImportSeances';
import { importSeancesDisponible, nomSourceSante } from '@/lib/v2/seances/importSeances';
import { devNow } from '@/lib/v2/creator/devClock';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { OMBRE_CARTE } from '@/components/yoroi/v2/seance/pastel';

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
  const { trainings, plan, occurrences, competitions, gender, weeklyGoal, typeDays, records, loaded, reload } = useSeancesData();
  // 18 octobre 2026 : charges et tonnage dans l'unite du reglage (kg ou lb), stockage en kilos
  const unite = useUnitePoids();
  const [filter, setFilter] = useState<Filter>({ kind: 'tous' });
  const [grouping, setGrouping] = useState<Grouping>('semaine');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [groupsShown, setGroupsShown] = useState(6);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // 27 octobre : un seul choix « Importer mes séances » (Santé, autre app, GPX ou TCX)
  const [choixImportOpen, setChoixImportOpen] = useState(false);
  const importSante = importSeancesDisponible();
  const scrollRef = useRef<ScrollView>(null);
  // 27 octobre 2026 : la visite guidee remonte l'onglet en haut avant de montrer ta semaine
  // 28 octobre 2026 : elle le fait aussi defiler jusqu'a ce qu'elle montre (ta derniere seance, ton mois, ton historique)
  const defileY = useRef(0);
  useEffect(
    () =>
      registerTourScroller('seances', {
        scrollBy: (dy) => scrollRef.current?.scrollTo({ y: Math.max(0, defileY.current + dy), animated: true }),
        scrollToTop: () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
      }),
    [],
  );
  const historyY = useRef(0);
  // 28 octobre 2026 (maquette A) : la barre compacte « Séances » en haut quand l'onglet a défilé
  const [compact, setCompact] = useState(false);
  const { width } = useWindowDimensions();
  const sections = useSectionsOuvertes();
  // la visite guidée montre ta dernière séance et ton mois : ces sections restent ouvertes pendant la visite
  const visite = useVisiteEnCours();
  const mesSeances = useMesSeances();
  const mois = useMois(trainings);
  const femme = gender === 'femme';

  const today = todayISO();
  const plates = useMemo(() => computeWeekPlates(trainings, plan, occurrences, isoOf(devNow()), typeDays), [trainings, plan, occurrences, typeDays]);
  const doneToday = plates.find((p) => p.isToday)?.count ?? 0;
  const next = useMemo(() => findNextSlot(plan, doneToday > 0), [plan, doneToday]);
  const week = useMemo(() => weekCompare(trainings, today), [trainings, today]);
  const muscles = useMemo(() => weekMuscles(trainings, today), [trainings, today]);
  const hasMuscles = muscles.some((m) => m.level > 0);
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

  // 28 octobre 2026 : tirer pour actualiser partage (Sante, autre telephone, tes seances)
  const { refreshControl } = useTirerPourActualiser({ relire: reload, sante: true });

  const filterLabel = filter.kind === 'montre' ? traduire('de ta montre') : filter.kind === 'sport' ? sansTiret(getSportName(filter.sport)) : '';
  const isNew = loaded && trainings.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scrollRef}
        onScroll={(ev) => {
          defileY.current = ev.nativeEvent.contentOffset.y;
          const bas = defileY.current > 84;
          if (bas !== compact) setCompact(bas);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + INK_TAB_BAR_SPACE + 10, paddingHorizontal: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {/* En-tete, et le menu de l'onglet (16 octobre : importer tes seances) */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Ink size={11} weight="extraBold" color={c.indigo} style={{ letterSpacing: 1.4 }} numberOfLines={1}>{format(devNow(), DATE_FNS_LOCALE.code === 'de' ? 'EEEE, d. MMMM' : 'EEEE d MMMM', { locale: DATE_FNS_LOCALE }).toLocaleUpperCase()}</Ink>
            <Ink size={32} weight="black" tight accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ letterSpacing: -1 }}>{traduire("Séances")}</Ink>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Importer toujours a portee. 27 octobre : ouvre le choix d'import, sur toutes les plateformes */}
            <Pressable
              onPress={() => { tap(); setChoixImportOpen(true); }}
              accessibilityRole="button"
              accessibilityLabel={traduire("Importer mes séances")}
              accessibilityHint={traduire("Choisis d’où viennent tes séances")}
              hitSlop={6}
              style={({ pressed }) => ({ height: 44, minWidth: 44, justifyContent: 'center', borderRadius: 22, paddingHorizontal: width < 400 && traduire("Importer").length > 9 ? 0 : 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: pressed ? c.fillSoft : P.white, borderWidth: 1, borderColor: 'transparent', shadowColor: '#1B2A44', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 })}
            >
              <Icon name="download" size={18} color={c.accentText} strokeWidth={2.6} />
              {/* 28 octobre 2026 : sur un petit écran, un libellé long (Importieren) laisse place au titre : l'icône seule */}
              {width < 400 && traduire("Importer").length > 9 ? null : <Ink size={14} weight="extraBold" color={c.accentText}>{traduire("Importer")}</Ink>}
            </Pressable>
          <Pressable
            onPress={() => { tap(); setMenuOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Menu des séances")}
            hitSlop={6}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : P.white, borderWidth: 1, borderColor: 'transparent', shadowColor: '#1B2A44', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 })}
          >
            <Icon name="more" size={22} color={c.ink} strokeWidth={3.4} />
          </Pressable>
          </View>
        </View>

        {/* Importer mes seances : visible en haut tant que rien ne vient de Sante */}
        {importSante && loaded && trainings.length > 0 && importedCount === 0 ? <CarteImportSeances onPress={() => setImportOpen(true)} /> : null}

        {/* 28 octobre 2026 (maquette A) : la seance du jour d'abord (programme du Coach, creneau prevu, ou le Coach) */}
        <TourAnchor id="seances.programme" rayon={30}>
          <CarteDuJour trainings={trainings} weeklyGoal={weeklyGoal} femme={femme} next={next} onCoach={() => router.push('/coach' as any)} />
        </TourAnchor>

        {/* Ta semaine : l'anneau de ton objectif et les jours de L a D */}
        <TourAnchor id="seances.semaine" rayon={24}>
          <SemaineAnneau week={week} plates={plates} trainings={trainings} weeklyGoal={weeklyGoal} onChooseGoal={() => router.push('/settings?objectif=1' as any)} />
        </TourAnchor>

        {/* Ce qui vient : le prochain entrainement prevu */}
        <Petites texte={traduire('Ce qui vient')} teinte="lilas" style={{ marginTop: 8, marginBottom: -4 }} />
        <TourAnchor id="seances.prochain" rayon={24}>
          <NextUp
            next={next}
            femme={femme}
            validated={validated}
            slotsCount={slotsCount}
            onPlanning={() => router.push('/planning' as any)}
            onCreate={() => router.push('/slots' as any)}
          />
        </TourAnchor>

        {/* Tes chiffres de la semaine : duree, tonnage, charge, jours */}
        <Petites texte={traduire('Tes chiffres de la semaine')} teinte="creme" style={{ marginTop: 8, marginBottom: -4 }} />
        <WeekTiles week={week} onOpenCharge={() => router.push('/charge' as any)} />

        {/* En detail : les sections repliables, chacune avec son resume */}
        <Petites
          texte={traduire('En détail')}
          teinte="bleu"
          style={{ marginTop: 8, marginBottom: -4 }}
          action={Object.values(sections.ouvert).some(Boolean) ? traduire('Tout replier') : traduire('Tout déplier')}
          onAction={() => sections.toutes(!Object.values(sections.ouvert).some(Boolean))}
        />
        <View style={{ gap: 10 }}>
          {lastVM && last ? (
            <TourAnchor id="seances.derniere" rayon={24}>
              <SectionRepliable
                titre={traduire('Ta dernière séance')}
                resume={sansTiret([lastVM.when.charAt(0).toUpperCase() + lastVM.when.slice(1), traduire(lastVM.title)].filter(Boolean).join(', '))}
                sticker={stickerDuSport(last.sport, !!last.is_outdoor) as NomSticker}
                teinte="lilas"
                ouvert={sections.ouvert.derniere || visite}
                onBasculer={() => sections.basculer('derniere')}
              >
                <LastSessionBody vm={lastVM} onOpen={() => router.push({ pathname: '/workout-detail', params: { id: String(last.id) } } as any)} />
              </SectionRepliable>
            </TourAnchor>
          ) : null}

          {mesSeances ? (
            <SectionRepliable
              titre={traduire('Mes séances')}
              resume={resumeMesSeances(mesSeances)}
              sticker="carnet"
              teinte="bleu"
              ouvert={sections.ouvert.mesSeances}
              onBasculer={() => sections.basculer('mesSeances')}
            >
              <MesSeancesListe liste={mesSeances} />
            </SectionRepliable>
          ) : null}

          <TourAnchor id="seances.mois" rayon={24}>
            <SectionRepliable
              titre={traduire('Ton mois')}
              resume={
                <View>
                  <Ink size={12.5} weight="bold" color={c.textSecondary}>{mois.resume}</Ink>
                  {sections.ouvert.mois || visite ? null : <RangeeDuMois trainings={trainings} />}
                </View>
              }
              sticker="calendrier"
              teinte="creme"
              ouvert={sections.ouvert.mois || visite}
              onBasculer={() => sections.basculer('mois')}
            >
              <MoisPastilles trainings={trainings} competitions={competitions} onOpen={() => router.push('/planning?tab=mois' as any)} />
            </SectionRepliable>
          </TourAnchor>

          {hasMuscles ? (
            <SectionRepliable
              titre={traduire('Muscles travaillés')}
              resume={(() => {
                const m = musclePrincipal(muscles);
                return m ? traduire('Cette semaine, surtout : {0}', traduire(m.name).toLocaleLowerCase()) : traduire('cette semaine');
              })()}
              sticker="muscle"
              teinte="peche"
              ouvert={sections.ouvert.muscles}
              onBasculer={() => sections.basculer('muscles')}
            >
              <MusclesSemaine loads={muscles} largeur={width - 32 - 28} />
            </SectionRepliable>
          ) : null}

          <SectionRepliable
            titre={traduire('Tes records')}
            resume={(() => {
              if (records.lines.length === 0) return traduire('Ton premier record t’attend');
              const d = dernierRecord(records.lines);
              const n = records.lines.length;
              return `${traduirePluriel(n, n > 1, '{0} record, le dernier {1}.', '{0} records, le dernier {1}.', n, d ? relativeDay(d.date, today) : '')} ${traduire('Le détail est dans Progrès.')}`;
            })()}
            sticker="records"
            teinte="menthe"
            ouvert={sections.ouvert.records}
            onBasculer={() => sections.basculer('records')}
          >
            {records.highlights.length === 0 ? (
              <Pressable onPress={() => { tap(); router.push('/records' as any); }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: c.background, padding: 12 }}>
                <Hanko size={26} color={c.textMuted} />
                <Ink size={13} color={c.textSecondary} style={{ flex: 1 }}>{traduire("Note tes charges, tes distances ou tes rounds : chaque marque battue reçoit son tampon ici.")}</Ink>
              </Pressable>
            ) : (
              <View style={{ borderRadius: 16, backgroundColor: c.background, paddingHorizontal: 12 }}>
                {records.highlights.slice(0, 3).map((l, i) => {
                  const v = formatRecordValue(l, undefined, unite);
                  const fresh = l.stamps > 0 && l.date >= isoOf(new Date(Date.now() - 14 * 86400000));
                  return (
                    <Pressable
                      key={l.key}
                      onPress={() => { tap(); router.push({ pathname: '/records', params: { focus: l.key } } as any); }}
                      accessibilityRole="button"
                      accessibilityLabel={`${recordTitle(l)}, ${v.main}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}
                    >
                      <SportThumb sport={l.sport} femme={femme} size={38} />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Ink size={14.5} weight="extraBold" numberOfLines={2}>{sansTiret(recordTitle(l))}</Ink>
                        <Ink size={12} color={c.textSecondary} numberOfLines={2}>{`${relativeDay(l.date, today)}, ${v.sub}`}</Ink>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: '40%' }}>
                        <Ink size={16} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{v.main}</Ink>
                        {fresh ? <Hanko size={16} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Pressable onPress={() => { tap(); router.navigate('/(tabs)/progres' as any); }} accessibilityRole="link" hitSlop={6} style={{ alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 2 }}>
              <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Tous tes records dans Progrès')}</Ink>
              <Icon name="chevron" size={15} color={c.accentText} />
            </Pressable>
          </SectionRepliable>
        </View>

        {/* Historique */}
        <TourAnchor
          id="seances.historique"
          rayon={16}
          onLayout={(e) => { historyY.current = e.nativeEvent.layout.y; }}
          style={{ marginTop: 14, gap: 4 }}
        >
          <Petites texte={traduire('Historique')} teinte="bleu" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2, minHeight: 44 }}>
            <Ink size={13} weight="bold" color={c.textSecondary} style={{ flex: 1 }}>
              {trainings.length > 0
                ? filterLabel
                  ? traduirePluriel(filtered.length, filtered.length > 1, "{0} séance {1}", "{0} séances {1}", filtered.length, filter.kind === 'sport' ? `de ${filterLabel}` : filterLabel)
                  : traduirePluriel(trainings.length, trainings.length > 1, "{0} séance au total", "{0} séances au total", trainings.length)
                : ''}
            </Ink>
            {trainings.length > 0 ? (
              <Pressable
                onPress={() => { tap(); setSearchOpen((v) => !v); if (searchOpen) setQuery(''); }}
                accessibilityRole="button"
                accessibilityLabel={searchOpen ? traduire('Fermer la recherche') : traduire('Chercher une séance')}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: searchOpen ? c.primary : c.surface, ...OMBRE_CARTE }}
              >
                <Icon name={searchOpen ? 'close' : 'search'} size={20} color={searchOpen ? c.onPrimary : c.ink} />
              </Pressable>
            ) : null}
          </View>
        </TourAnchor>

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
            <TourAnchor id="seances.filtres" rayon={16}>
              <Segments
                items={[{ key: 'semaine', label: traduire('Par semaine') }, { key: 'mois', label: traduire('Par mois') }]}
                value={grouping}
                onChange={(g) => { setGrouping(g); setGroupsShown(g === 'mois' ? 4 : 6); }}
              />
            </TourAnchor>
            {sports.length > 1 || importedCount > 0 ? (
              <ChipRow>
                <Chip label={traduire("Tous")} on={filter.kind === 'tous'} onPress={() => pickFilter({ kind: 'tous' })} />
                {importedCount > 0 ? <Chip label={traduire("De la montre")} on={filter.kind === 'montre'} onPress={() => pickFilter(filter.kind === 'montre' ? { kind: 'tous' } : { kind: 'montre' })} /> : null}
                {sports.length > 1
                  ? sports.map(({ sport }) => (
                      <Chip
                        key={sport}
                        label={sansTiret(getSportName(sport))}
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
            <BigButton label={traduire("Importer mes séances")} icon="download" tone="ink" onPress={() => setChoixImportOpen(true)} />
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
              <Ink size={16} weight="black" tight>{sansTiret(traduire(g.title))}</Ink>
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

      {compact ? (
        <Animated.View
          entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: insets.top, backgroundColor: theme.isDark ? 'rgba(17,20,29,0.96)' : 'rgba(245,246,251,0.96)', borderBottomWidth: 1, borderColor: c.divider }}
        >
          <Pressable onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} accessibilityRole="button" accessibilityLabel={traduire('Remonter en haut des séances')} style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={17} weight="extraBold">{traduire('Séances')}</Ink>
          </Pressable>
        </Animated.View>
      ) : null}

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={traduire("Séances")}>
        <Row icon="download" title={traduire("Importer mes séances")} sub={traduire("Depuis ta montre, une autre app ou un fichier")} onPress={() => { setMenuOpen(false); setTimeout(() => setChoixImportOpen(true), 350); }} />
        <Row icon="calendar" title={traduire("Planning et calendrier")} onPress={() => { setMenuOpen(false); router.push('/planning' as any); }} />
      </Sheet>
      {/* Le choix d'import : trois chemins clairs, chacun son icone */}
      <Sheet visible={choixImportOpen} onClose={() => setChoixImportOpen(false)} title={traduire("Importer mes séances")}>
        {importSante ? (
          <Row icon="watch" title={traduire("Depuis {0}", nomSourceSante())} sub={traduire("Tes séances enregistrées par ta montre ou ton téléphone")} onPress={() => { setChoixImportOpen(false); setTimeout(() => setImportOpen(true), 350); }} />
        ) : null}
        <Row icon="dumbbell" title={traduire("Depuis une autre app de muscu")} sub={traduire("Le fichier CSV exporté depuis ses réglages, ou tes notes copiées")} onPress={() => { setChoixImportOpen(false); router.push('/importer-carnet' as any); }} />
        <Row icon="map" title={traduire("Course ou vélo (GPX, TCX)")} sub={traduire("Un fichier de parcours depuis ta montre ou une app de course")} onPress={() => { setChoixImportOpen(false); router.push('/import-workouts' as any); }} />
      </Sheet>
      {importSante ? <ImportSeancesSheet visible={importOpen} onClose={() => setImportOpen(false)} onFini={() => { void reload(); }} /> : null}
    </View>
  );
}
