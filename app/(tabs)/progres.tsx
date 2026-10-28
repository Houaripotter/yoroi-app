/**
 * Progres, maquette C « Themes en onglets » (validee par Houari le 28 octobre 2026), avec un emprunt a la maquette A.
 * De haut en bas :
 *  - PAR THEME, Progres, et le bouton rond du bilan de ta semaine ;
 *  - « Ta semaine en une phrase » et « Ta petite victoire du jour » (maquette A), construites uniquement avec des
 *    chiffres que l'app calcule deja (lib/v2/progres/phrasesProgres.ts, regle de choix testee) ;
 *  - les cinq themes en grosses pastilles avec leur sticker : Corps, Force, Cardio, Sante, Photos (le theme choisi
 *    est retenu) ; quand tu descends, ils restent colles en haut en petites pastilles ;
 *  - pour le theme choisi : sa phrase, son heros, puis son detail ;
 *  - tout en bas, tes bilans Ta semaine et Ton mois.
 * Corps : ta courbe de poids (ta tendance lissee, une pesee tres eloignee en point a part « pesée isolée »), le chemin
 * de pierres vers le torii (le meme dessin que l'accueil), le detail du poids, puis ta composition aux teintes
 * harmonisees, tes courbes, tes mensurations et ton historique. Force : ton maximum estime, tes records (le seul
 * endroit de l'app avec leur detail, Seances n'en montre qu'un apercu), tes series et ton tonnage. Cardio, Sante,
 * Photos : leur heros puis leur detail d'avant. Rien ne disparait : la vue d'ensemble d'avant devient la phrase de la
 * semaine, les phrases et les heros de chaque theme.
 * Aucun calcul ne change ici : seuls l'affichage et la courbe (tendance plus point isole) changent.
 * Avant : _archive_ancien_design_2026-10-09/progres_C_2026-10-28/progres.tsx.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedRef } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { RecordsCard } from '@/components/yoroi/v2/progres/RecordsCard';
import { CourbeTendance } from '@/components/yoroi/v2/progres/CourbeTendance';
import type { ScrubTendance } from '@/components/yoroi/v2/progres/CourbeTendance';
import { HeroCardio, HeroForce, HeroSante } from '@/components/yoroi/v2/progres/HerosProgres';
import {
  BarreThemesCollee,
  Capitales,
  CarteB,
  CarteSemaine,
  LigneDetail,
  Pastille,
  PhraseTheme,
  SelecteurPeriode,
  THEMES,
  THEME_INFO,
  TuilesThemes,
  teinte,
} from '@/components/yoroi/v2/progres/ThemesProgres';
import type { ThemeProgres } from '@/components/yoroi/v2/progres/ThemesProgres';
import { CheminPierres, paliersFranchis } from '@/components/yoroi/v2/charts/CheminPierres';
import { LegendMark, tapLight } from '@/components/yoroi/v2/progres/ui';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { SHORT_PERIODS } from '@/components/yoroi/v2/charts/PeriodSwitch';
import { usePremium } from '@/context/PremiumContext';
import { useWeightData } from '@/lib/v2/useWeightData';
import { useMeasuresData, usePhotosData, photosByDate, useTrainingsData } from '@/lib/v2/progres/useProgresData';
import { SAMPLE_GOAL, sampleWeightSeries } from '@/lib/v2/progres/samples';
import { formatKg, formatLongDate, weeklyRate } from '@/lib/v2/weightStats';
import type { DayWeight } from '@/lib/v2/weightStats';
import { getProfile } from '@/lib/database';
import { localISO } from '@/lib/v2/accueil/hydration';
import { dayMonth, projection } from '@/lib/v2/accueil/projection';
import { usePlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import type { PlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import { ligneArriveeCap, arriveePrevueTexte } from '@/lib/v2/pesee/arrivee';
import { etatObjectif } from '@/lib/v2/pesee/etatObjectif';
import type { EtatObjectif } from '@/lib/v2/pesee/etatObjectif';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { courbeTendance } from '@/lib/v2/progres/peseeIsolee';
import { viewSeries } from '@/lib/v2/progres/measures';
import { computeLifts, stagnations } from '@/lib/v2/progres/strength';
import { computeRecords, formatRecordValue, recordShortTitle } from '@/lib/v2/seances/records';
import { weekStreaks } from '@/lib/v2/progres/year';
import { durationOf, formatDuration, trainingsThisWeek } from '@/lib/v2/trainingWeek';
import { monthLong, num, sinceText } from '@/lib/v2/progres/format';
import { safeComputeForme } from '@/lib/v2/accueil/forme';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import { grammes, phraseCardio, phraseCorps, phraseForce, phrasePhotos, phraseSante, phraseSemaine, victoireDuJour } from '@/lib/v2/progres/phrasesProgres';
import type { FaitsProgres, Phrase, SensObjectif } from '@/lib/v2/progres/phrasesProgres';
import { traduire } from '@/lib/i18n/tr';
import { useTirerPourActualiser } from '@/lib/v2/actualiser/useTirerPourActualiser';

/** 80 kg plutot que 80,0 kg, une decimale sinon (comme la carte Poids de l'accueil) */
const kgShort = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : formatKg(v));

/** le theme choisi, retenu d'une visite a l'autre (confort de l'appareil seulement) */
const CLE_THEME = 'yoroi.progres.theme';

/** Le titre et la phrase de chaque theme quand il n'a pas encore de chiffre (les intros d'avant, rien ne disparait) */
const INTRO: Record<ThemeProgres, { titre: string; phraseTitre: string; sub: string }> = {
  Corps: { titre: 'Ton corps', phraseTitre: 'Ton corps en une phrase', sub: 'Ton poids, ta composition et tes mensurations, mesure après mesure.' },
  Force: { titre: 'Ta force', phraseTitre: 'Ta force en une phrase', sub: 'Ton maximum estimé, tes séries par muscle et ton tonnage.' },
  Cardio: { titre: 'Ton endurance', phraseTitre: 'Ton endurance en une phrase', sub: 'Tes séances et leur durée semaine après semaine, ton effort et ton année.' },
  Santé: { titre: 'Ta santé', phraseTitre: 'Ta santé en une phrase', sub: 'Ta montre, ton sommeil, ton cœur, ta nutrition et tes soins.' },
  Photos: { titre: 'Tes photos', phraseTitre: 'Tes photos en une phrase', sub: 'Ta transformation en images. Elles restent sur ton téléphone.' },
};

/** Ton poids et ton objectif : une seule lecture (plan, etat, sens, chemin), partagee par la phrase et la carte */
type Objectif = {
  plan: PlanPoids;
  etat: EtatObjectif;
  sens: SensObjectif | null;
  depart: number | null;
  atteint: boolean;
  chemin: { part: number; reste: number } | null;
};

function useObjectif(series: DayWeight[], goal: number | null, today: string): Objectif {
  const plan = usePlanPoids(series, goal, { enabled: goal != null, check: false, today });
  const prefs = usePrefsCourbes();
  const etat = useMemo(
    () => etatObjectif({ series, cap: goal, depart: plan.depart ?? null, ligne: plan.ligne, torii: plan.torii, atteint: plan.atteint, choisie: plan.choisie, today }),
    [series, goal, plan.depart, plan.ligne, plan.torii, plan.atteint, plan.choisie, today],
  );
  const depart = plan.depart?.poids ?? series[0]?.value ?? null;
  // le sens : ta ligne, sinon la place de ton cap par rapport a ton debut (meme regle que la carte de l'accueil)
  const sens: SensObjectif | null =
    goal == null || depart == null ? null : plan.ligne ? (plan.ligne.mode === 'perte' || plan.ligne.mode === 'prise' ? plan.ligne.mode : 'maintien') : Math.abs(goal - depart) < 0.2 ? 'maintien' : goal < depart ? 'perte' : 'prise';
  const atteint = plan.atteint || (sens !== 'maintien' && etat.atteint);
  const chemin = goal != null && etat.part != null && etat.reste != null && (sens === 'perte' || sens === 'prise') && (prefs.cap || atteint) ? { part: atteint ? 1 : etat.part, reste: atteint ? 0 : etat.reste } : null;
  return { plan, etat, sens, depart, atteint, chemin };
}

export default function Progres() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const illus = useIllustrations();
  const [section, setSection] = useState<ThemeProgres>('Corps');
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // la visite guidee remonte l'onglet en haut, puis le fait defiler jusqu'a ce qu'elle montre
  const scrollY = useRef(0);
  useEffect(
    () =>
      registerTourScroller('progres', {
        scrollBy: (dy) => (scrollRef.current as any)?.scrollTo?.({ y: Math.max(0, scrollY.current + dy), animated: true }),
        scrollToTop: () => (scrollRef.current as any)?.scrollTo?.({ y: 0, animated: true }),
      }),
    [scrollRef],
  );
  // le bas des grosses pastilles : au-dela, elles restent collees en haut
  const tuilesBas = useRef(0);
  const tuilesY = useRef(0);
  const [collee, setCollee] = useState(false);

  // le theme retenu
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CLE_THEME)
      .then((v) => {
        if (alive && v && (THEMES as readonly string[]).includes(v)) setSection(v as ThemeProgres);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const today = localISO();
  const weights = useWeightData();
  const measures = useMeasuresData();
  const photos = usePhotosData();
  const { trainings, reload: relireSeances } = useTrainingsData();
  const unite = useUnitePoids();
  const [femme, setFemme] = useState(false);
  // 28 octobre 2026 : tirer pour actualiser (Sante, autre telephone, poids, mesures, photos, seances)
  const { refreshControl } = useTirerPourActualiser({
    relire: () => Promise.all([weights.reload(), measures.reload(), photos.reload(), relireSeances()]),
    sante: true,
  });
  const [forme, setForme] = useState<FormeResult | null>(null);
  const hasData = weights.series.length > 0 || trainings.length > 0;

  useEffect(() => {
    getProfile()
      .then((p) => setFemme((p as any)?.gender === 'femme'))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let alive = true;
    safeComputeForme()
      .then((f) => alive && setForme(f))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [trainings.length]);

  const obj = useObjectif(weights.series, weights.goal, today);

  // ─── les faits, tous deja calcules ailleurs dans l'app ───
  const faits: FaitsProgres = useMemo(() => {
    const last = weights.series[weights.series.length - 1];
    const taille = viewSeries(measures.points, 'waist');
    const recents = computeRecords(trainings).lines.filter((l) => l.stamps > 0).sort((a, b) => (a.date < b.date ? 1 : -1));
    const r = recents[0];
    return {
      today,
      poids: last
        ? {
            rythme: weeklyRate(weights.series),
            sens: obj.sens,
            atteint: obj.atteint,
            paliers: obj.chemin ? paliersFranchis(obj.chemin.part, obj.atteint) : 0,
            depuisDebut: obj.etat.variation ?? null,
          }
        : null,
      taille: taille.length > 1 ? { ecart: taille[taille.length - 1].value - taille[0].value, texteDepuis: sinceText(taille[0].date) } : null,
      record: r ? { titre: recordShortTitle(r), valeur: formatRecordValue(r, undefined, unite).main, date: r.date.slice(0, 10) } : null,
      semaines: weekStreaks(trainings, today).current,
      seancesSemaine: trainingsThisWeek(trainings, today).length,
    };
  }, [weights.series, measures.points, trainings, today, obj.sens, obj.atteint, obj.chemin, obj.etat.variation, unite]);
  const semaine = useMemo(() => phraseSemaine(faits), [faits]);
  const victoire = useMemo(() => (semaine ? victoireDuJour(faits, semaine.cles) : null), [faits, semaine]);

  const phrases: Record<ThemeProgres, Phrase | null> = useMemo(() => {
    const lift = computeLifts(trainings)[0];
    const lp = lift?.points[lift.points.length - 1];
    const mois = today.slice(0, 7);
    const du = trainings.filter((t) => (t.date || '').slice(0, 7) === mois);
    const minutes = du.reduce((s, t) => s + durationOf(t), 0);
    const ph = photosByDate(photos.photos);
    const v = lp ? versUnitePoids(lp.value, unite) : 0;
    return {
      Corps: phraseCorps(faits),
      Force: lift && lp ? phraseForce({ exercice: lift.name, max: `${num(v, v >= 100 ? 0 : 1)} ${unite === 'lb' ? 'lb' : 'kg'}`, stagnent: stagnations(computeLifts(trainings), today).length }) : null,
      Cardio: phraseCardio({ duree: formatDuration(minutes), seances: du.length, mois: monthLong(today), km: du.reduce((s, t) => s + (t.distance || 0), 0) }),
      Santé: forme && forme.level ? phraseSante({ score: forme.score, niveau: forme.level.label }) : null,
      Photos: phrasePhotos({ nombre: ph.length, texteDepuis: ph[0] ? sinceText(ph[0].date.slice(0, 10)) : null }),
    };
  }, [faits, trainings, today, photos.photos, unite, forme]);

  const choisir = useCallback(
    (s: ThemeProgres) => {
      if (s !== section) selectionAsync().catch(() => {});
      setSection(s);
      AsyncStorage.setItem(CLE_THEME, s).catch(() => {});
      // plus bas que les pastilles : on revient juste sous elles, en haut du theme choisi
      if (scrollY.current > tuilesBas.current) (scrollRef.current as any)?.scrollTo?.({ y: Math.max(0, tuilesY.current - 8), animated: false });
    },
    [section, scrollRef],
  );

  const info = THEME_INFO[section];
  const intro = INTRO[section];
  const phrase = phrases[section];
  const ouvrirBilan = (t: 'semaine' | 'mois') => {
    selectionAsync().catch(() => {});
    router.push({ pathname: '/bilan-periode', params: { type: t } } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Animated.ScrollView
        ref={scrollRef}
        refreshControl={refreshControl}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollY.current = y;
          const dessus = tuilesBas.current > 0 && y > tuilesBas.current - insets.top - 20;
          if (dessus !== collee) setCollee(dessus);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingBottom: insets.bottom + INK_TAB_BAR_SPACE, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PAR THEME, Progres, et le bilan de ta semaine en rond */}
        <View style={{ paddingTop: insets.top + 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Ink size={11.5} weight="black" color={teinte('bleu').encre} style={{ letterSpacing: 1.6 }}>
              {traduire('Par thème').toUpperCase()}
            </Ink>
            <Ink size={34} weight="black" tight accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ letterSpacing: -1, lineHeight: 40 }}>
              {traduire('Progrès')}
            </Ink>
          </View>
          {hasData ? (
            <Pressable
              onPress={() => ouvrirBilan('semaine')}
              accessibilityRole="button"
              accessibilityLabel={traduire('Ta semaine en bilan')}
              style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1, shadowColor: '#1B2A44', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 })}
            >
              <Image source={illus.img('calendrier')} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </Pressable>
          ) : null}
        </View>

        {/* Ta semaine en une phrase et ta petite victoire du jour (maquette A) : seulement avec de vrais chiffres */}
        {semaine ? (
          <TourAnchor id="progres.ensemble" rayon={28} style={{ marginTop: 12 }}>
            <CarteSemaine phrase={semaine} victoire={victoire} />
          </TourAnchor>
        ) : null}

        {/* Les cinq themes */}
        <TourAnchor
          id="progres.onglets"
          rayon={22}
          style={{ marginTop: 14 }}
          onLayout={(e) => {
            tuilesY.current = e.nativeEvent.layout.y;
            tuilesBas.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
          }}
        >
          <TuilesThemes choisi={section} onChoisir={choisir} />
        </TourAnchor>

        {/* La phrase du theme : ses vrais chiffres, sinon ce qu'il montre */}
        {phrase ? (
          <PhraseTheme t={info.teinte} titre={traduire(intro.phraseTitre)} phrase={phrase} style={{ marginTop: 12 }} />
        ) : (
          <View style={{ marginTop: 12, borderRadius: 24, backgroundColor: teinte(info.teinte).fond, paddingHorizontal: 16, paddingVertical: 14 }}>
            <Capitales texte={traduire(intro.titre)} couleur={teinte(info.teinte).encre} />
            <Ink size={14.5} weight="bold" color={c.textSecondary} style={{ marginTop: 4, lineHeight: 20 }}>
              {traduire(intro.sub)}
            </Ink>
          </View>
        )}

        <View style={{ marginHorizontal: -16 }}>
          {section === 'Corps' ? (
            <>
              <WeightSection obj={obj} today={today} />
              <View style={{ height: 22 }} />
              <CorpsSection part="corps" pastel />
            </>
          ) : section === 'Force' ? (
            <>
              <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                <HeroForce trainings={trainings} />
              </View>
              {/* Tes records : le seul endroit de l'app avec leur detail (Seances n'en montre qu'un apercu) */}
              <TourAnchor id="progres.records" rayon={22} style={{ marginHorizontal: 16, marginTop: 20, gap: 8 }}>
                <Capitales texte={traduire('Tes records')} couleur={teinte('bleu').encre} action={traduire('Tout voir')} onAction={() => router.push('/records' as any)} />
                <RecordsCard trainings={trainings} femme={femme} />
              </TourAnchor>
              <ForceSection part="force" />
            </>
          ) : section === 'Cardio' ? (
            <>
              <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                <HeroCardio trainings={trainings} today={today} />
              </View>
              <ForceSection part="cardio" />
              <AnneeSection />
            </>
          ) : section === 'Santé' ? (
            <>
              <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                <HeroSante forme={forme} />
              </View>
              <View style={{ marginTop: 8 }}>
                <HealthNutritionCards />
              </View>
            </>
          ) : (
            <CorpsSection part="photos" />
          )}
        </View>

        {/* Tes bilans : ta semaine et ton mois, tout reuni (app/bilan-periode.tsx) */}
        {hasData ? (
          <>
            <Capitales texte={traduire('Tes bilans')} couleur={teinte('bleu').encre} style={{ marginTop: 28 }} />
            <TourAnchor id="progres.bilans" rayon={22} style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {(['semaine', 'mois'] as const).map((t) => {
                const tt = teinte(t === 'semaine' ? 'bleu' : 'lilas');
                return (
                  <Pressable
                    key={t}
                    onPress={() => ouvrirBilan(t)}
                    accessibilityRole="button"
                    accessibilityLabel={t === 'semaine' ? traduire('Bilan, ta semaine') : traduire('Chaque mois, ton mois')}
                    style={({ pressed }) => ({ flex: 1, minHeight: 70, borderRadius: 22, paddingLeft: 14, paddingRight: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tt.fond, opacity: pressed ? 0.85 : 1 })}
                  >
                    <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
                      <Ink size={10.5} weight="black" color={tt.encre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ letterSpacing: 1.2 }}>
                        {(t === 'semaine' ? traduire('Bilan') : traduire('Chaque mois')).toUpperCase()}
                      </Ink>
                      <Ink size={16} weight="black" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {t === 'semaine' ? traduire('Ta semaine') : traduire('Ton mois')}
                      </Ink>
                    </View>
                    <Image source={illus.img(t === 'semaine' ? 'calendrier' : 'bilan')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  </Pressable>
                );
              })}
            </TourAnchor>
          </>
        ) : null}
      </Animated.ScrollView>

      {/* les themes restent sous ton pouce quand tu descends dans le detail */}
      {collee ? (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <BarreThemesCollee choisi={section} onChoisir={choisir} haut={insets.top} />
        </Animated.View>
      ) : null}
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

/** Le rythme dans une pastille : menthe s'il va vers ton objectif (ou stable sans objectif), creme sinon */
function pastilleRythme(rate: number | null, sens: SensObjectif | null): { texte: string; t: 'menthe' | 'creme' } | null {
  if (rate === null) return null;
  if (Math.abs(rate) < 0.03) return { texte: traduire('stable en tendance'), t: sens === 'perte' || sens === 'prise' ? 'creme' : 'menthe' };
  const vers = (sens === 'perte' && rate < 0) || (sens === 'prise' && rate > 0) || sens === null || sens === 'maintien';
  return { texte: rate < 0 ? traduire('{0} de moins par semaine', grammes(rate)) : traduire('{0} de plus par semaine', grammes(rate)), t: vers ? 'menthe' : 'creme' };
}

function WeightSection({ obj, today }: { obj: Objectif; today: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { series, goal, loading } = useWeightData();
  const [period, setPeriod] = useState<number>(90);
  const [scrub, setScrub] = useState<ScrubTendance | null>(null);
  // l'interrupteur « Afficher mon cap et ma ligne » des Reglages : ton rythme prevu en pointilles
  const capOn = usePrefsCourbes().cap;

  const courbe = useMemo(() => courbeTendance(series.map((p) => ({ date: p.date, value: p.value })), today), [series, today]);
  const isolees = useMemo(() => {
    const fin = courbe[courbe.length - 1]?.date;
    return courbe.filter((p) => p.isolee && fin && (!period || Date.parse(`${fin}T12:00:00`) - Date.parse(`${p.date}T12:00:00`) <= period * 86400000));
  }, [courbe, period]);
  const last = series[series.length - 1];
  const rate = weeklyRate(series);
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

  // ta tendance : le meme filtre que l'accueil et que la courbe (bout de la courbe = gros chiffre)
  const tend = courbe[courbe.length - 1]?.tendance ?? last.trend;
  const toGoal = goal && last ? last.value - goal : null;
  const pr = pastilleRythme(rate, obj.sens);
  const bleu = teinte('bleu');
  const creme = teinte('creme');
  const ch = obj.chemin;
  const paliers = ch ? paliersFranchis(ch.part, obj.atteint) : 0;
  const arrivee = ch && !obj.atteint ? arriveePrevueTexte({ torii: obj.plan.torii, atteint: obj.atteint }, today) : null;
  const derniere = isolees[isolees.length - 1] ?? null;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* le heros du theme Corps : ton poids, ta courbe, ton chemin */}
      <CarteB style={{ marginTop: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Capitales texte={scrub ? traduire('Ce jour') : traduire('Ton poids')} couleur={bleu.encre} style={{ flexShrink: 1 }} />
          {pr && !scrub ? <Pastille texte={pr.texte} t={pr.t} /> : null}
        </View>
        {scrub ? (
          <View style={{ marginTop: 2, minHeight: 64 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Ink size={38} weight="black" tight style={{ letterSpacing: -1.2 }}>{formatKg(scrub.value)}</Ink>
              <Ink size={15} weight="extraBold" color={c.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
                {scrub.isolee ? traduire('kg, pesée isolée') : 'kg'}
              </Ink>
            </View>
            <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>
              {traduire('{0}, tendance {1} kg', formatLongDate(scrub.date), formatKg(scrub.trend))}
            </Ink>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2, minHeight: 64 }}>
            <Ink size={38} weight="black" tight style={{ letterSpacing: -1.2 }}>{formatKg(tend)}</Ink>
            <Ink size={15} weight="extraBold" color={c.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
              {traduire('kg en tendance')}
            </Ink>
          </View>
        )}

        <SelecteurPeriode value={period} onChange={setPeriod} options={SHORT_PERIODS} style={{ marginTop: 8 }} />

        <View style={{ marginTop: 18 }}>
          <CourbeTendance
            series={series}
            period={period}
            today={today}
            height={150}
            ligne={goal != null && capOn ? obj.plan.ligne : null}
            torii={obj.plan.torii}
            atteint={obj.atteint}
            onScrub={setScrub}
            onPress={openDetail}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 }}>
          <LegendMark kind="line" color={bleu.encre} label={traduire('ta tendance')} />
          <LegendMark kind="dot" color={theme.isDark ? '#3A4670' : '#C9D3F7'} label={traduire('tes pesées')} />
          {goal != null && capOn && obj.plan.ligne ? <LegendMark kind="dash" color="#5FC08F" label={traduire('ton rythme prévu')} /> : null}
        </View>

        {/* ton chemin de pierres vers le torii (le meme dessin que l'accueil) */}
        {ch && goal != null && obj.depart != null ? (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: c.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <Ink size={15} weight="extraBold" color={obj.atteint ? (theme.isDark ? '#F6B09C' : '#B8432F') : c.ink} numberOfLines={1}>
                  {obj.atteint ? traduire('Torii atteint') : traduire('{0} % du chemin', Math.round(ch.part * 100))}
                </Ink>
                <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>
                  {obj.atteint
                    ? obj.sens === 'prise'
                      ? traduire('plus de {0} kg, ton objectif', kgShort(goal))
                      : traduire('sous les {0} kg, ton objectif', kgShort(goal))
                    : arrivee
                      ? traduire('encore {0} kg, arrivée prévue {1}', formatKg(ch.reste), arrivee)
                      : traduire('encore {0} kg', formatKg(ch.reste))}
                </Ink>
              </View>
              <Pastille texte={traduire('{0} paliers sur 4', paliers)} t="menthe" style={{ flexShrink: 0 }} />
            </View>
            <View style={{ marginTop: 8, marginHorizontal: -4 }}>
              <CheminPierres depart={obj.depart} objectif={goal} part={ch.part} atteint={obj.atteint} fg2={c.textSecondary} />
            </View>
          </View>
        ) : null}
      </CarteB>

      {/* ton poids, le detail */}
      <Capitales texte={traduire('Ton poids, le détail')} couleur={creme.encre} style={{ marginTop: 22 }} />
      <CarteB style={{ marginTop: 8, flexDirection: 'row', paddingVertical: 14 }}>
        <Stat value={formatKg(last.value)} unit="kg" label={traduire('dernière pesée')} />
        <Stat value={formatKg(tend)} unit="kg" label={traduire('tendance lissée')} border />
        <Stat value={rateText(rate)} label={rate === null ? traduire('ton rythme, dès 4 pesées') : rate <= 0 ? traduire('en moins par semaine') : traduire('en plus par semaine')} border />
      </CarteB>

      <CarteB style={{ marginTop: 10 }}>
        <LigneDetail
          premiere
          sticker="objectifs"
          fond={teinte('peche').fond}
          titre={goal ? traduire('Objectif {0} kg', formatKg(goal)) : traduire('Ton objectif')}
          sous={
            toGoal === null
              ? traduire('À fixer dans ton profil')
              : obj.atteint
                ? traduire('Torii atteint en tendance')
                : Math.abs(toGoal) < 0.05 || (obj.sens === 'perte' && toGoal < 0) || (obj.sens === 'prise' && toGoal > 0)
                  ? traduire('Atteint, à ta dernière pesée')
                  : traduire('Encore {0} kg, à ta dernière pesée', formatKg(Math.abs(toGoal)))
          }
          onPress={() => router.push('/profile' as any)}
          a11y={goal ? traduire('Objectif {0} kilos, modifier', formatKg(goal)) : traduire('Fixer ton objectif de poids')}
        />
        <PredictionRow series={series} goal={goal} plan={obj.plan} />
        <LigneDetail sticker="carnet" fond={bleu.fond} titre={traduire('Toutes tes pesées')} sous={traduire('Chaque pesée, jour par jour')} onPress={() => router.push('/pesees' as any)} />
        <LigneDetail sticker="torii_courbe" fond={creme.fond} titre={traduire('Ta courbe en détail')} sous={traduire('Ton plan, tes périodes, chaque pesée')} onPress={() => router.push('/poids-detail' as any)} />
      </CarteB>

      {/* une pesee isolee ne fait pas plonger ta courbe : on le dit, avec ses chiffres */}
      {derniere ? (
        <View style={[carteBlanche(c.surface, c.border), { marginTop: 10, flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20 }]}>
          <IllusPetite nom="recherche" />
          <Ink size={12.5} weight="bold" color={c.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
            <Ink size={12.5} weight="extraBold" color={c.ink}>
              {traduire('Une pesée isolée ne fait pas plonger ta courbe.')}
            </Ink>
            {` ${traduire('Celle du {0} ({1}) reste un point à part, ta tendance l’amortit. Touche la courbe pour revoir chaque pesée.', formatLongDate(derniere.date), formatKg(derniere.value))}`}
          </Ink>
        </View>
      ) : null}

      {rate !== null && Math.abs(rate) > Math.max(1, last.trend * 0.01) ? (
        <View style={{ marginTop: 10, padding: 14, borderRadius: 18, backgroundColor: creme.fond }}>
          <Ink size={13} weight="bold" color={creme.encre}>
            {traduire(`Ton poids bouge de plus d’un kilo par semaine. C’est rapide : vise plutôt un rythme lent et régulier, et demande conseil à un professionnel de santé si ça dure.`)}
          </Ink>
        </View>
      ) : null}
    </View>
  );
}

function IllusPetite({ nom }: { nom: 'recherche' }) {
  const illus = useIllustrations();
  return <Image source={illus.img(nom)} style={{ width: 30, height: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

/**
 * Apercu des previsions (vague 26) : une ligne gratuite calculee sur ta vraie tendance, rien si la tendance n'est pas
 * encore fiable. La page complete reste Premium (« Prévisions, Premium »).
 */
function PredictionRow({ series, goal, plan }: { series: DayWeight[]; goal: number | null; plan: PlanPoids }) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const today = localISO();
  const last = series[series.length - 1];
  if (!last) return null;
  const arrivee = goal != null ? ligneArriveeCap(plan, goal, today) : null;
  const proj = goal == null ? projection(series, null, today) : null;
  const line = arrivee ?? (proj === null ? traduire('Pas encore de date fiable') : proj.kind === 'goal' ? traduire("{0} kg vers le {1}", kgShort(proj.value), dayMonth(proj.date, today)) : traduire("{0} kg dans un mois", kgShort(proj.value)));
  const titre = arrivee ? traduire('Ton arrivée prévue') : traduire('À ce rythme');
  return (
    <LigneDetail
      sticker="sablier"
      fond={teinte('creme').fond}
      titre={titre}
      sous={line}
      dessous={<Pastille texte={isPremium ? traduire('Prévisions') : traduire('Prévisions, Premium')} t="bleu" style={{ paddingVertical: 3 }} />}
      onPress={() => {
        tapLight();
        router.push('/weight-predictions' as any);
      }}
      a11y={isPremium ? traduire("Prévisions, {0}, {1}", titre.toLowerCase(), line) : traduire("Prévisions, {0}, {1}, page complète avec Premium", titre.toLowerCase(), line)}
    />
  );
}

function rateText(rate: number | null): string {
  if (rate === null) return traduire('Bientôt');
  return grammes(rate);
}

function Stat({ value, unit, label, border }: { value: string; unit?: string; label: string; border?: boolean }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2, paddingLeft: border ? 10 : 0, paddingRight: 6, borderLeftWidth: border ? 1 : 0, borderColor: theme.colors.divider }}>
      <Ink size={21} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ letterSpacing: -0.5 }}>
        {value}
        {unit ? (
          <Ink size={12} weight="extraBold" color={theme.colors.textMuted}>
            {` ${unit}`}
          </Ink>
        ) : null}
      </Ink>
      <Ink size={12} weight="bold" color={theme.colors.textSecondary} numberOfLines={2}>
        {label}
      </Ink>
    </View>
  );
}
