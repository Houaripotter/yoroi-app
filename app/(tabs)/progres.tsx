/**
 * Progres v2 : resume sportif du mois, puis Poids (courbe au pinceau), Corps
 * (composition, mensurations, photos), Force (maximum estime, series, tonnage),
 * Sante (ta montre, sommeil, infirmerie, zones, nutrition, jeune, coupe de poids, calculateurs : tout au meme endroit),
 * Annee (carte des jours, mois, regularite). Aucune gamification ici : elle vit dans le Dojo.
 * Progres consulte et analyse : aucun ajout ici, tout ajout passe par le bouton + (vague 13).
 * Vague 26 : onglet Resume en premier (grille de mini courbes), periode au-dessus de la courbe de poids avec 7 jours,
 * apercu des previsions dans Poids, seances par semaine dans Resume et Force.
 * Vague 40 (rangement) : bandeau de scene, vue d'ensemble sur un rouleau (poids, composition, mensurations,
 * forme, force, endurance), tes records (venus de Seances), puis cinq onglets legers, chacun avec son titre,
 * sa phrase et son illustration : Corps (poids, composition, mensurations), Force, Cardio (seances par semaine,
 * effort, annee), Sante, Photos. L'ancien Resume (doublon des courbes de Corps) laisse place a la vue d'ensemble.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { TourAnchor, registerTourScroller } from '@/components/yoroi/v2/tour/TourAnchor';
import { WeightTrendChart } from '@/components/yoroi/v2/progres/WeightTrendChart';
import { POIDS } from '@/components/yoroi/v2/charts/CourbePoids';
import { INK_TAB_BAR_SPACE } from '@/components/yoroi/v2/InkTabBar';
import { CorpsSection } from '@/components/yoroi/v2/progres/CorpsSection';
import { ForceSection } from '@/components/yoroi/v2/progres/ForceSection';
import { AnneeSection } from '@/components/yoroi/v2/progres/AnneeSection';
import { HealthNutritionCards } from '@/components/yoroi/v2/progres/HealthNutritionCards';
import { ExamplePreview } from '@/components/yoroi/v2/progres/ExamplePreview';
import { VueEnsemble } from '@/components/yoroi/v2/progres/Ensemble';
import type { EnsembleCible } from '@/components/yoroi/v2/progres/Ensemble';
import { RecordsCard } from '@/components/yoroi/v2/progres/RecordsCard';
import { EnteteSection } from '@/components/yoroi/v2/seances/Decor';
import type { Illus } from '@/components/yoroi/v2/seances/Decor';
import { useBiomarkers } from '@/lib/v2/progres/biomarkers';
import { useMeasuresData } from '@/lib/v2/progres/useProgresData';
import { DetailCue, GhostButton, GLASS, LegendMark, tapLight } from '@/components/yoroi/v2/progres/ui';
import { carteBlanche, ton } from '@/components/yoroi/v2/seance/pastel';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { PeriodSwitch, periodPhrase, SHORT_PERIODS } from '@/components/yoroi/v2/charts/PeriodSwitch';
import { usePremium } from '@/context/PremiumContext';
import { useWeightData } from '@/lib/v2/useWeightData';
import { useTrainingsData } from '@/lib/v2/progres/useProgresData';
import { SAMPLE_GOAL, sampleWeightSeries } from '@/lib/v2/progres/samples';
import { filterPeriod, formatKg, formatLongDate, weeklyRate } from '@/lib/v2/weightStats';
import type { DayWeight } from '@/lib/v2/weightStats';
import { getProfile } from '@/lib/database';
import { localISO } from '@/lib/v2/accueil/hydration';
import { dayMonth, projection } from '@/lib/v2/accueil/projection';
import { usePlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import { ligneArriveeCap } from '@/lib/v2/pesee/arrivee';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** 80 kg plutot que 80,0 kg, une decimale sinon (comme la carte Poids de l'accueil) */
const kgShort = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : formatKg(v));

// Vague 40 : cinq onglets legers, la vue d'ensemble au-dessus remplace l'ancien Resume
const SECTIONS = ['Corps', 'Force', 'Cardio', 'Santé', 'Photos'] as const;
type Section = (typeof SECTIONS)[number];

/** Titre, phrase et illustration de chaque onglet */
const INTRO: Record<Section, { title: string; sub: string; illus: Illus }> = {
  Corps: { title: traduire('Ton corps'), sub: traduire('Ton poids, ta composition et tes mensurations, mesure après mesure.'), illus: { ornement: 'bonsai' } },
  Force: { title: traduire('Ta force'), sub: traduire('Ton maximum estimé, tes séries par muscle et ton tonnage.'), illus: { tampon: 'objectif_muscle' } },
  Cardio: { title: traduire('Ton endurance'), sub: traduire('Tes séances et leur durée semaine après semaine, ton effort et ton année.'), illus: { tampon: 'vague' } },
  Santé: { title: traduire('Ta santé'), sub: traduire('Ta montre, ton sommeil, ton cœur, ta nutrition et tes soins.'), illus: { ornement: 'koi' } },
  Photos: { title: traduire('Tes photos'), sub: traduire('Ta transformation en images. Elles restent sur ton téléphone.'), illus: { ornement: 'fuji' } },
};

export default function Progres() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [section, setSection] = useState<Section>('Corps');
  // vague 44 : le bandeau de scene suit legerement le defilement (fil d'animation)
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // 27 octobre 2026 : la visite guidee remonte l'onglet en haut avant de montrer ta vue d'ensemble
  // 28 octobre 2026 : et elle le fait defiler jusqu'a ce qu'elle montre (tes records, tes cinq onglets)
  const scrollY = useRef(0);
  useEffect(
    () =>
      registerTourScroller('progres', {
        scrollBy: (dy) => (scrollRef.current as any)?.scrollTo?.({ y: Math.max(0, scrollY.current + dy), animated: true }),
        scrollToTop: () => (scrollRef.current as any)?.scrollTo?.({ y: 0, animated: true }),
      }),
    [scrollRef],
  );
  const tabsY = useRef(0);
  const weights = useWeightData();
  const bio = useBiomarkers();
  const measures = useMeasuresData();
  const { trainings } = useTrainingsData();
  const [femme, setFemme] = useState(false);
  const hasData = weights.series.length > 0 || trainings.length > 0;

  useEffect(() => {
    getProfile()
      .then((p) => setFemme((p as any)?.gender === 'femme'))
      .catch(() => {});
  }, []);

  const choose = (s: Section) => {
    if (s !== section) selectionAsync().catch(() => {});
    setSection(s);
    if (scrollY.current > tabsY.current) scrollRef.current?.scrollTo({ y: tabsY.current, animated: false });
  };

  const openCible = (t: EnsembleCible) => {
    const target: Section = t === 'corps' ? 'Corps' : t === 'force' ? 'Force' : t === 'cardio' ? 'Cardio' : 'Santé';
    if (target !== section) selectionAsync().catch(() => {});
    setSection(target);
    scrollRef.current?.scrollTo({ y: tabsY.current, animated: true });
  };
  const intro = INTRO[section];
  const illus = useIllustrations();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={64}
        contentContainerStyle={{ paddingBottom: insets.bottom + INK_TAB_BAR_SPACE }}
        showsVerticalScrollIndicator={false}
      >
        {/* 27 octobre 2026 (maquette Pastel-Progres) : le titre sur le fond de la page, plus de bandeau de scene */}
        <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: 12 }}>
          <Ink size={30} weight="black" tight accessibilityRole="header" style={{ letterSpacing: -0.5 }}>{traduire("Progrès")}</Ink>
          <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Comment tu évolues, en un coup d’œil")}</Ink>
        </View>

        {/* Vue d'ensemble : une tuile par facette, chacune ouvre son onglet */}
        {hasData ? (
          // 28 octobre 2026 : la marge sur l'ancre, pour que le cadre de la visite epouse les tuiles
          <TourAnchor id="progres.ensemble" rayon={22} style={{ marginHorizontal: 16 }}>
          <VueEnsemble
            series={weights.series}
            compo={bio.points}
            measures={measures.points}
            trainings={trainings}
            onOpen={openCible}
            style={{ marginTop: 0 }}
          />
          </TourAnchor>
        ) : null}

        {/* 25 octobre 2026 : ta semaine et ton mois, tout reuni (app/bilan-periode.tsx) */}
        {hasData ? (
          <TourAnchor id="progres.bilans" rayon={20} style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14 }}>
            {(['semaine', 'mois'] as const).map((t) => {
              // 28 octobre 2026 (Pastel) : deux tuiles pastel, ta semaine en bleu, ton mois en lilas, un sticker a droite
              const tt = ton(t === 'semaine' ? 'ciel' : 'lilas');
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    selectionAsync().catch(() => {});
                    router.push({ pathname: '/bilan-periode', params: { type: t } } as any);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => ({ flex: 1, minHeight: 68, borderRadius: 20, paddingLeft: 14, paddingRight: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tt.fond, opacity: pressed ? 0.85 : 1 })}
                >
                  <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
                    <Ink size={12.5} weight="extraBold" color={tt.encre} numberOfLines={1}>{t === 'semaine' ? traduire('Bilan') : traduire('Rendez-vous')}</Ink>
                    <Ink size={16} weight="black" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{t === 'semaine' ? traduire('Ta semaine') : traduire('Ton mois')}</Ink>
                  </View>
                  <Image source={illus.img(t === 'semaine' ? 'calendrier' : 'bilan')} style={{ width: 38, height: 38 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                </Pressable>
              );
            })}
          </TourAnchor>
        ) : null}

        {/* Tes records, venus de Seances */}
        {trainings.length ? (
          <TourAnchor id="progres.records" rayon={22} retrait={{ haut: 18 }} style={{ marginHorizontal: 16, gap: 10 }}>
            <EnteteSection title={traduire("Tes records")} sub={traduire("Tes meilleures marques du moment")} illus={{ tampon: 'record' }} action={traduire("Tout voir")} onAction={() => router.push('/records' as any)} style={{ marginTop: 18 }} />
            <RecordsCard trainings={trainings} femme={femme} />
          </TourAnchor>
        ) : null}

        <TourAnchor
          id="progres.onglets"
          rayon={16}
          onLayout={(e) => {
            tabsY.current = e.nativeEvent.layout.y;
          }}
          style={{ ...carteBlanche(c.surface, c.border), flexDirection: 'row', gap: 4, padding: 4, marginHorizontal: 16, marginTop: hasData ? 22 : 4, borderRadius: 16 }}
          accessibilityRole="tablist"
        >
          {SECTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => choose(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: s === section }}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, backgroundColor: s === section ? c.primary : 'transparent' }}
            >
              <Ink size={14} weight={s === section ? 'black' : 'extraBold'} color={s === section ? c.onPrimary : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{s}</Ink>
            </Pressable>
          ))}
        </TourAnchor>
        {/* Titre, phrase et illustration de l'onglet */}
        <EnteteSection title={traduire(intro.title)} sub={traduire(intro.sub)} illus={intro.illus} style={{ marginHorizontal: 12, marginTop: 18 }} />

        {section === 'Corps' ? (
          <>
            <WeightSection />
            <View style={{ height: 18 }} />
            <CorpsSection part="corps" />
          </>
        ) : section === 'Force' ? (
          <ForceSection part="force" />
        ) : section === 'Cardio' ? (
          <>
            <ForceSection part="cardio" />
            <AnneeSection />
          </>
        ) : section === 'Santé' ? (
          <View style={{ marginTop: 8 }}>
            <HealthNutritionCards />
          </View>
        ) : (
          <CorpsSection part="photos" />
        )}
      </Animated.ScrollView>
    </View>
  );
}

/** Apercu en filigrane de la courbe de poids, avec des pesees d'exemple */
function WeightExample() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sample = useMemo(() => sampleWeightSeries(), []);
  const rate = weeklyRate(sample);
  const last = sample[sample.length - 1];
  return (
    <ExamplePreview
      bleed
      dim={0.4}
      title={traduire("Ta courbe se dessine dès la troisième pesée")}
      text={traduire("Monte sur la balance le matin, à jeun, quelques fois par semaine. YOROI lisse les variations et te montre la vraie tendance.")}
      plusHint={traduire("Touche + pour ta première pesée")}
      style={{ marginTop: 18 }}
    >
      <WeightTrendChart points={sample} goal={SAMPLE_GOAL} height={230} plan={false} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginTop: 8, flexWrap: 'wrap' }}>
        <LegendMark kind="line" color={POIDS.c2} label={traduire("ton poids")} />
        <LegendMark kind="dash" color={POIDS.cap} label={traduire("ton cap")} />
      </View>
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 14, paddingVertical: 12, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: c.border }}>
        <Stat value={formatKg(last.value)} label={traduire("dernière pesée")} />
        <Stat value={formatKg(last.trend)} label={traduire("tendance lissée")} border />
        <Stat value={rateText(rate)} label={traduire("en moins par semaine")} border />
      </View>
    </ExamplePreview>
  );
}

function WeightSection() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { series, goal, loading } = useWeightData();
  const [period, setPeriod] = useState<number>(90);
  const [scrub, setScrub] = useState<DayWeight | null>(null);
  const [weightGoal, setWeightGoal] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => {
        if (alive) setWeightGoal(p?.weight_goal ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const shown = useMemo(() => filterPeriod(series, period || null), [series, period]);
  const last = series[series.length - 1];
  const first = shown[0];
  const rate = weeklyRate(series);
  // ecart a l'objectif : sur la derniere pesee, meme regle que l'accueil et la fin de pesee (vague 32)
  const toGoal = goal && last ? last.value - goal : null;
  const openDetail = () => {
    tapLight();
    router.push('/poids-detail' as any);
  };

  if (!loading && series.length === 0) {
    return (
      <View>
        <WeightExample />
      </View>
    );
  }
  if (!last) return null;

  const head = scrub ?? null;
  const change = first ? last.trend - first.trend : 0;
  // Sens voulu : l'objectif chiffre d'abord, sinon le choix du profil (maintenir ou prendre).
  // Sans poids cible, « perdre » n'est que l'ancien defaut jamais choisi : on considere « maintenir ».
  const aim: 'lose' | 'gain' | 'maintain' =
    weightGoal === 'maintain' || weightGoal === 'gain'
      ? weightGoal
      : goal
        ? goal < last.trend - 0.2
          ? 'lose'
          : goal > last.trend + 0.2
            ? 'gain'
            : 'maintain'
        : 'maintain';
  // Le gros chiffre n'est mis en avant que s'il va dans le sens de ton objectif
  const emphasize = Math.abs(change) >= 0.05 && ((aim === 'lose' && change < 0) || (aim === 'gain' && change > 0));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, minHeight: 44 }}>
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
          {head ? traduire('Ce jour') : traduire('Ta courbe de poids')}
        </Ink>
        <DetailCue onPress={openDetail} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 2, minHeight: 104, gap: 2 }}>
        {head ? (
          <>
            <Ink size={15} weight="bold" color={c.textSecondary}>{formatLongDate(head.date)}</Ink>
            <Ink size={56} weight="black" tight>{formatKg(head.value)} <Ink size={22} weight="black" color={c.textSecondary}>{traduire('kilos')}</Ink></Ink>
            <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("tendance {0} kilos ce jour", formatKg(head.trend))}</Ink>
          </>
        ) : (
          emphasize ? (
            <>
              <Ink size={56} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{traduirePluriel(Math.abs(change), Math.abs(change) >= 2, "{0} kilo", "{0} kilos", formatKg(Math.abs(change)))}</Ink>
              <Ink size={17} weight="bold" color={c.textSecondary}>
                {change < 0 ? traduire("de moins {0}, en tendance", periodPhrase(period)) : traduire("de plus {0}, en tendance", periodPhrase(period))}
              </Ink>
            </>
          ) : (
            <>
              <Ink size={34} weight="black" tight numberOfLines={2}>{traduire("Ton poids {0}", periodPhrase(period))}</Ink>
              <Ink size={17} weight="bold" color={c.textSecondary}>
                {Math.abs(change) < 0.05
                  ? traduire("{0} kg en tendance, stable", formatKg(last.trend))
                  : change < 0
                    ? traduire("{0} kg en tendance, {1} kg de moins", formatKg(last.trend), formatKg(Math.abs(change)))
                    : traduire("{0} kg en tendance, {1} kg de plus", formatKg(last.trend), formatKg(Math.abs(change)))}
              </Ink>
            </>
          )
        )}
      </View>

      <PeriodSwitch value={period} onChange={setPeriod} options={SHORT_PERIODS} style={{ marginHorizontal: 16, marginTop: 10 }} />

      <View style={{ marginTop: 12 }}>
        <WeightTrendChart points={shown} series={series} goal={goal} height={300} onScrub={setScrub} onPress={openDetail} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <LegendMark kind="line" color={POIDS.c2} label={traduire("ton poids")} />
        {goal ? <LegendMark kind="dash" color={POIDS.cap} label={traduire("ton rythme prévu, jusqu’à ton cap")} /> : null}
      </View>

      <Ink size={12} color={c.textSecondary} style={{ paddingHorizontal: 16, marginTop: 8 }}>{traduire("Touche la courbe pour son détail, glisse ton doigt pour revoir chaque pesée.")}</Ink>

      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 20, paddingVertical: 14, paddingHorizontal: 14, ...carteBlanche(c.surface, c.border) }}>
        <Stat value={formatKg(last.value)} label={traduire("dernière pesée")} />
        <Stat value={formatKg(last.trend)} label={traduire("tendance lissée")} border />
        <Stat value={rateText(rate)} label={rate === null ? traduire('ton rythme, dès 4 pesées') : rate <= 0 ? traduire('en moins par semaine') : traduire('en plus par semaine')} border />
      </View>


      <Pressable
        onPress={() => router.push('/profile' as any)}
        accessibilityRole="button"
        accessibilityLabel={goal ? traduire("Objectif {0} kilos, modifier", formatKg(goal)) : traduire('Fixer ton objectif de poids')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, minHeight: 56, paddingHorizontal: 14, ...carteBlanche(c.surface, c.border), backgroundColor: pressed ? c.fillSoft : c.surface })}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={13} weight="bold" color={c.textSecondary}>{goal ? traduire("Objectif {0} kg", formatKg(goal)) : traduire('Ton objectif')}</Ink>
          <Ink size={15} weight="extraBold">
            {toGoal === null ? traduire('À fixer dans ton profil') : Math.abs(toGoal) < 0.05 || (aim === 'lose' && toGoal < 0) || (aim === 'gain' && toGoal > 0) ? traduire('Atteint, à ta dernière pesée') : traduire("Encore {0} kg, à ta dernière pesée", formatKg(Math.abs(toGoal)))}
          </Ink>
        </View>
        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={c.textMuted} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>

      {rate !== null && Math.abs(rate) > Math.max(1, last.trend * 0.01) ? (
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: ton('creme').fond }}>
          <Ink size={13} weight="bold" color={ton('creme').encre}>
            {traduire(`Ton poids bouge de plus d’un kilo par semaine. C’est rapide : vise plutôt un rythme lent et régulier, et demande conseil à un professionnel de santé si ça dure.`)}
          </Ink>
        </View>
      ) : null}

      <PredictionCard series={series} goal={goal} />

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 20 }}>
        <GhostButton label={traduire("Toutes tes pesées")} onPress={() => router.push('/pesees' as any)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

/**
 * Apercu des previsions (vague 26, deplace depuis Sante) : une ligne gratuite calculee sur ta vraie tendance,
 * rien si la tendance n'est pas encore fiable (moins de 4 pesees sur 4 semaines). La page complete reste Premium.
 */
function PredictionCard({ series, goal }: { series: DayWeight[]; goal: number | null }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { isPremium } = usePremium();
  const today = localISO();
  // 17 octobre : avec un cap, la date du torii, la meme que la carte Poids, le bilan et le paywall (lib/v2/pesee/arrivee.ts)
  const plan = usePlanPoids(series, goal, { enabled: goal != null, check: false, today });
  const last = series[series.length - 1];
  if (!last) return null;
  const arrivee = goal != null ? ligneArriveeCap(plan, goal, today) : null;
  // sans cap : ta tendance dans un mois (lib/v2/accueil/projection.ts)
  const proj = goal == null ? projection(series, null, today) : null;
  const line = arrivee ?? (proj === null ? traduire('Pas encore de date fiable') : proj.kind === 'goal' ? traduire("{0} kg vers le {1}", kgShort(proj.value), dayMonth(proj.date, today)) : traduire("{0} kg dans un mois", kgShort(proj.value)));
  const titre = arrivee ? traduire('Ton arrivée prévue') : traduire('À ce rythme');
  return (
    <Pressable
      onPress={() => {
        tapLight();
        router.push('/weight-predictions' as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={isPremium ? traduire("Prévisions, {0}, {1}", titre.toLowerCase(), line) : traduire("Prévisions, {0}, {1}, page complète avec Premium", titre.toLowerCase(), line)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, ...carteBlanche(c.surface, c.border), backgroundColor: pressed ? c.fillSoft : c.surface })}
    >
      <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Ink size={13} weight="bold" color={c.textSecondary}>{titre}</Ink>
          <Ink size={12} weight="extraBold" color={c.accent}>{isPremium ? traduire('Prévisions') : traduire('Prévisions, Premium')}</Ink>
        </View>
        <Ink size={15} weight="extraBold" numberOfLines={2}>{line}</Ink>
      </View>
      <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={c.accent} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </Pressable>
  );
}

function rateText(rate: number | null): string {
  if (rate === null) return traduire('Bientôt');
  const grams = Math.round(Math.abs(rate) * 1000 / 10) * 10;
  return grams >= 1000 ? `${formatKg(grams / 1000)} kg` : `${grams} g`;
}

function Stat({ value, label, border }: { value: string; label: string; border?: boolean }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flex: 1, gap: 4, paddingLeft: border ? 10 : 0, paddingRight: 6, borderLeftWidth: border ? 1.5 : 0, borderColor: theme.colors.border }}>
      <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Ink>
      <Ink size={12} color={theme.colors.textSecondary}>{label}</Ink>
    </View>
  );
}
