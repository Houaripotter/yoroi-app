/**
 * Detail du poids v2, ouvert d'un appui sur la courbe de Progres ou la carte Poids de l'accueil :
 * grande courbe au doigt avec ton cap, ton torii et ta ligne directrice, periode (1 M a 1 A, « Mon plan »),
 * moyenne, plus bas, plus haut, evolution en tendance, explication et historique des pesees.
 * Vague 33 : la meme qualite que la carte de l'accueil : la pastille de statut suit le doigt sous le grand chiffre,
 * le chemin vers le torii sous la courbe, une decimale pour tous les poids, l'historique dit sur la periode.
 * Vague 34 : meme esprit que la carte rouleau de l'accueil : la courbe sur ta scene, et sous la courbe le sentier
 * de pierres ou ton personnage marche vers le vrai torii, sur papier washi.
 * Vague 35 : en-tete comme la carte : la pastille de statut a cote de « Poids », l'ecart de la periode entre
 * parentheses a cote du grand chiffre ; la trajectoire (ta ligne) bien visible sur la courbe.
 * Vague 42 (Houari : « on ne comprend pas énormément les choses ») : meme vocabulaire que la carte (« ton rythme
 * prévu », « ton cap »), le chemin en barre de progression, jamais de pesee datee apres aujourd'hui.
 * Consultation seulement : une nouvelle pesee passe par le bouton + (vague 13).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useRouter } from 'expo-router';
import { lienBilan } from '@/lib/v2/bilan/reglage';
import { useYoroiTheme } from '@/components/yoroi';
import { GhostButton, GUTTER } from '@/components/yoroi/v2/progres/ui';
import { MetricDetail } from '@/components/yoroi/v2/progres/MetricDetail';
import type { DetailPoint } from '@/components/yoroi/v2/progres/MetricDetail';
import { WeightTrendChart } from '@/components/yoroi/v2/progres/WeightTrendChart';
import { WEIGHT_EXPLAIN } from '@/components/yoroi/v2/progres/explain';
import { PastilleStatut, POIDS } from '@/components/yoroi/v2/charts/CourbePoids';
import { SentierTorii } from '@/components/yoroi/v2/charts/SentierTorii';
import type { ModeSentier as ModeChemin } from '@/components/yoroi/v2/charts/SentierTorii';
import { personnageImage } from '@/components/yoroi/v2/accueil/images';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { PERIODE_PLAN, POIDS_PERIODS, POIDS_PERIODS_PLAN } from '@/components/yoroi/v2/charts/PeriodSwitch';
import { DATA_CHANGED_EVENT, useWeightData } from '@/lib/v2/useWeightData';
import { historyCaption, weighInsOfDay } from '@/lib/v2/pesee/historiquePoids';
import { deleteWeight } from '@/lib/database';
import { appAlert, appChoices } from '@/components/yoroi/v2/fenetre/api';
import { logger } from '@/lib/security/logger';
import { formatKg, formatLongDate } from '@/lib/v2/weightStats';
import type { DayWeight } from '@/lib/v2/weightStats';
import { localISO } from '@/lib/v2/accueil/hydration';
import { goalProgress } from '@/lib/v2/accueil/projection';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { usePlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import { statutLigne } from '@/lib/v2/pesee/ligneDirectrice';
import Svg, { Path } from 'react-native-svg';
import { Icon } from '@/components/yoroi/v2/accueil/kit';
import { P, paletteSombre } from '@/components/yoroi/livePalette';
import { cadrerPeriode, partiesAllure, texteDePeriode } from '@/lib/v2/pesee/cadrageCourbe';
import { LigneAllure } from '@/components/yoroi/v2/charts/LigneAllure';
import { etatObjectif, texteDepuisDebut, texteDonnees, texteFourchette, texteProjection, texteRythme, texteTendance } from '@/lib/v2/pesee/etatObjectif';
import { CarteObjectif, FeuilleObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import type { QuoiObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import { traduire } from '@/lib/i18n/tr';

/**
 * « Comment on calcule » (18 octobre 2026, Houari : « les sources doivent être visibles dans l'app ») : chaque calcul
 * du poids et sa source. Les references completes sont dans app/scientific-sources.tsx (« Poids et projection »).
 */
const COMMENT_ON_CALCULE: { titre: string; texte: string; source: string }[] = [
  { titre: traduire('Ta tendance'), texte: traduire('Un filtre suit ton niveau et ta pente, même les jours sans pesée. Une pesée très loin de l’attendu est bornée.'), source: 'Kalman (1960), Journal of Basic Engineering. Principe des tendances lissées : The Hacker’s Diet, MacroFactor.' },
  { titre: traduire('Ton rythme'), texte: traduire('La médiane des pentes entre tes pesées des 4 dernières semaines (6 si tu te pèses peu) : une pesée bizarre ne la tire pas.'), source: 'Sen (1968), Journal of the American Statistical Association.' },
  { titre: traduire('Le rythme conseillé'), texte: traduire('Perte : 0,5 à 1 % de ton poids par semaine pour garder ton muscle. Prise : 0,25 à 0,5 % pour limiter le gras.'), source: 'Helms et al. (2014), JISSN. Garthe et al. (2011), IJSNEM. Iraki et al. (2019), Sports.' },
  { titre: traduire('Ta projection'), texte: traduire('Ton rythme réel, jamais plus vite que ces repères, avec une fourchette de dates. Pas de règle des 7 700 kcal par kilo : elle surestime la perte sur la durée.'), source: 'Hall et al. (2011), The Lancet. Thomas et al. (2013), International Journal of Obesity.' },
  { titre: traduire('Le ralentissement'), texte: traduire('Le poids répond lentement et la perte ralentit avec le temps. Près de ton cap, YOROI ralentit encore ta projection : un choix prudent, pas un chiffre d’étude.'), source: 'Hall et al. (2011), The Lancet ; NIH, Body Weight Planner.' },
  { titre: traduire('L’eau'), texte: traduire('Sel, glucides, entraînement et cycle font varier l’eau d’un jour à l’autre. Au début d’une perte, une partie est de l’eau et du glycogène.'), source: 'Kreitzman et al. (1992), AJCN. White et al. (2011), Obstetrics and Gynecology International. Turicchi et al. (2020), PLoS ONE.' },
  { titre: traduire('Sports de combat'), texte: traduire('YOROI suit une perte progressive. Il ne calcule pas de coupe de poids d’avant pesée : elle se prépare avec un encadrement.'), source: 'Ricci et al. (2025), position de l’ISSN. Reale et al. (2017), IJSPP. Barley et al. (2019), Sports.' },
];

const PERIODE_TEXTE: Record<number, string> = { 30: traduire('en 1 mois'), 90: traduire('en 3 mois'), 180: traduire('en 6 mois'), 365: traduire('en 1 an'), [PERIODE_PLAN]: traduire('depuis ton début') };


export default function PoidsDetailScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { series: seriesIn, raw, goal, loading } = useWeightData();
  const today = localISO();
  const series = useMemo(() => (seriesIn.some((p) => p.date > today) ? seriesIn.filter((p) => p.date <= today) : seriesIn), [seriesIn, today]);
  const prefs = usePrefsCourbes();
  const plan = usePlanPoids(series, goal ?? null, { enabled: true, check: false, today });
  const capOn = prefs.cap && !!goal;
  const planOk = capOn && !!plan.ligne && !!plan.torii;
  // ton personnage a ton rang, comme dans la scene de l'accueil
  const { espace } = useEspace();
  const { armure } = useIdentite();
  const perso = useMemo(() => personnageImage(espace.personnage, Math.max(0, Math.min(4, armure?.rank.index ?? 0))), [espace.personnage, armure?.rank.index]);

  const byDate = useMemo(() => {
    const m = new Map<string, DayWeight>();
    series.forEach((p) => m.set(p.date, p));
    return m;
  }, [series]);
  // NUIT 14 : la legende dit la source de LA pesee montree (avant : celle d'une pesee quelconque du jour),
  // la tendance en petit, et les autres pesees du meme jour avec leur poids
  const points: DetailPoint[] = useMemo(
    () => series.map((p) => ({ date: p.date, value: p.value, caption: historyCaption(p, raw) })),
    [series, raw],
  );

  // NUIT 14 : une pesee fausse se corrige d'un appui : modifier, ou supprimer apres confirmation
  const onHistoryPress = (pt: DetailPoint) => {
    const day = weighInsOfDay(raw, pt.date);
    const shown = day.find((w) => w.id === byDate.get(pt.date)?.id) ?? day[0];
    if (!shown?.id) return;
    const kg = `${formatKg(Number(shown.weight))} kg`;
    const confirmDelete = () =>
      appAlert(traduire('Supprimer cette pesée ?'), traduire("{0}, {1}. Elle part pour de bon, avec sa composition.", kg, formatLongDate(pt.date)), [
        { text: traduire('Annuler'), style: 'cancel' },
        {
          text: traduire('Supprimer'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWeight(shown.id as number);
              DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            } catch (err) {
              logger.error('Suppression de la pesee impossible', err);
            }
          },
        },
      ]);
    appChoices(formatLongDate(pt.date), day.length > 1 ? traduire("{0}, la plus récente des {1} pesées de ce jour.", kg, day.length) : kg, [
      { text: traduire('Voir le bilan'), onPress: () => router.push(lienBilan({ type: 'corps', date: pt.date, origine: 'detail' }) as never) },
      { text: traduire('Modifier'), onPress: () => router.push({ pathname: '/pesee', params: { id: String(shown.id), date: pt.date, value: String(shown.weight) } } as any) },
      { text: traduire('Supprimer'), style: 'destructive', onPress: confirmDelete },
      ...(day.length > 1 ? [{ text: traduire("Voir les {0} pesées", day.length), onPress: () => router.push('/pesees' as any) }] : []),
      { text: traduire('Annuler'), style: 'cancel' as const },
    ]);
  };

  const last = series[series.length - 1];
  const good: 'up' | 'down' | 'none' = goal && last ? (goal < last.trend - 0.2 ? 'down' : goal > last.trend + 0.2 ? 'up' : 'none') : 'none';
  const depart = plan.ligne?.depart.date ?? null;
  // courbe v2 : le meme cadrage que la carte de l'accueil (lib/v2/pesee/cadrageCourbe.ts)
  const debutSuivi = plan.depart?.date ?? null;
  const cadrer = useCallback(
    <T extends { date: string }>(pts: T[], period: number) => cadrerPeriode(pts, period === PERIODE_PLAN && !(planOk && depart) ? 90 : period, debutSuivi),
    [planOk, depart, debutSuivi],
  );
  // 18 octobre : la feuille « Ton objectif » (debut, objectif, date du cap), qui remplace « Début de ton objectif »
  const [feuille, setFeuille] = useState<{ quoi: QuoiObjectif | null } | null>(null);

  // 18 octobre (audit du poids) : SOURCE UNIQUE (lib/v2/pesee/etatObjectif.ts), la meme que la carte de l'accueil :
  // debut, perdu, reste, part du chemin, allure, phrase et projection
  const etat = useMemo(
    () => etatObjectif({ series, cap: goal ?? null, depart: plan.depart, ligne: plan.ligne, torii: plan.torii, atteint: plan.atteint, choisie: plan.choisie, today }),
    [series, goal, plan.depart, plan.ligne, plan.torii, plan.atteint, plan.choisie, today],
  );
  // le chemin vers le torii, comme sur la carte de l'accueil (meme depart que la ligne directrice)
  const start = etat.debut?.poids ?? null;
  const gp = goal && start != null && last ? goalProgress(start, goal, last.value) : null;
  const mode: ModeChemin | null =
    !goal || start == null ? null : plan.ligne ? (plan.ligne.mode === 'perte' || plan.ligne.mode === 'prise' ? plan.ligne.mode : 'maintien') : Math.abs(goal - start) < 0.2 ? 'maintien' : gp?.losing ? 'perte' : 'prise';
  const atteint = plan.atteint || (mode !== 'maintien' && etat.atteint);
  // 17 octobre (maquette B de la carte de l'accueil) : « Où tu en seras » quitte la carte et vit ici, en bloc propre,
  // avec la meme prevision (meme ligne, meme torii) ; la page complete des predictions reste Premium
  // 18 octobre : poids dans 1 mois, passage du cap et avance sur ta date du cap, tires de la meme trajectoire
  const ouTuEnSeras = texteProjection(etat);
  const fourchette = texteFourchette(etat, today);
  const blocOuTuEnSeras = ouTuEnSeras ? (
    <Pressable
      onPress={() => router.push('/weight-predictions' as any)}
      accessibilityRole="button"
      accessibilityLabel={traduire("Où tu en seras : {0}{1}{2}. Voir tes prédictions", ouTuEnSeras.valeur, ouTuEnSeras.note ? `, ${ouTuEnSeras.note}` : '', fourchette ? `, fourchette ${fourchette}` : '')}
      style={({ pressed }) => ({ marginHorizontal: GUTTER, marginTop: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: 1, borderColor: c.border })}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M3 17c3-1 5-6 9-7s5 1 9-4" stroke={c.textSecondary} strokeWidth={2.2} strokeLinecap="round" strokeDasharray="0.1 4.2" />
        <Path d="M3 17c2.5-.8 4-3.4 6-5" stroke={c.textSecondary} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>
          {traduire("Où tu en seras")}</Ink>
        <Ink size={15} weight="extraBold" numberOfLines={1}>
          {ouTuEnSeras.valeur}
        </Ink>
        {ouTuEnSeras.note ? (
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>
            {traduire("À ton rythme, {0}", ouTuEnSeras.note)}
          </Ink>
        ) : null}
        {/* 18 octobre (etudes) : la fourchette, jamais une date seule */}
        {fourchette ? (
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>
            {`Fourchette : ${fourchette}`}
          </Ink>
        ) : null}
      </View>
      <Icon name="chevron" size={15} color={c.textSecondary} width={2.6} />
    </Pressable>
  ) : null;

  // 18 octobre (etudes) : ta tendance (sans l'eau du jour), ton rythme compare aux reperes, ou ce qu'il manque
  const tendanceTxt = texteTendance(etat);
  const rythmeTxt = texteRythme(etat);
  const manqueTxt = texteDonnees(etat);
  const tonCouleur = (t: 'vert' | 'bleu' | 'orange') => (t === 'vert' ? POIDS.capText : t === 'orange' ? (paletteSombre() ? '#F3A55C' : '#A14E00') : c.textSecondary);
  const blocRythme = last && (tendanceTxt || rythmeTxt || manqueTxt) ? (
    <View
      accessible
      accessibilityLabel={[tendanceTxt ? `${tendanceTxt.valeur}${tendanceTxt.note ? `, ${tendanceTxt.note}` : ''}` : null, rythmeTxt ? `${rythmeTxt.titre}. ${rythmeTxt.texte}` : null, manqueTxt ? `${manqueTxt.titre}. ${manqueTxt.texte}` : null].filter(Boolean).join('. ')}
      style={{ marginHorizontal: GUTTER, marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 10 }}
    >
      <Ink size={14} weight="black" numberOfLines={1}>
        {traduire("Ton rythme")}</Ink>
      {tendanceTxt ? (
        <View style={{ gap: 1 }}>
          <Ink size={15} weight="extraBold" numberOfLines={1}>
            {tendanceTxt.valeur}
          </Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={3}>
            {traduire("Ta balance : {0} kg. {1}.", formatKg(last.value), tendanceTxt.note ? tendanceTxt.note.charAt(0).toUpperCase() + tendanceTxt.note.slice(1) : '')}
          </Ink>
        </View>
      ) : null}
      {rythmeTxt ? (
        <View style={{ gap: 1 }}>
          <Ink size={15} weight="extraBold" color={tonCouleur(rythmeTxt.ton)} numberOfLines={1}>
            {traduire(rythmeTxt.titre)}
          </Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={4}>
            {traduire(rythmeTxt.texte)}
          </Ink>
        </View>
      ) : null}
      {manqueTxt ? (
        <View style={{ gap: 1 }}>
          <Ink size={15} weight="extraBold" numberOfLines={1}>
            {traduire(manqueTxt.titre)}
          </Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={4}>
            {traduire(manqueTxt.texte)}
          </Ink>
        </View>
      ) : null}
    </View>
  ) : null;

  // 18 octobre : « Comment on calcule », chaque calcul avec sa source, et toutes les sources
  const blocCalcul = (
    <View style={{ marginHorizontal: GUTTER, marginTop: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 12 }}>
      <Ink size={14} weight="black" numberOfLines={1}>
        {traduire("Comment on calcule")}</Ink>
      {COMMENT_ON_CALCULE.map((l) => (
        <View key={l.titre} style={{ gap: 2 }}>
          <Ink size={13.5} weight="extraBold">
            {traduire(l.titre)}
          </Ink>
          <Ink size={12.5} weight="medium" color={c.textSecondary}>
            {traduire(l.texte)}
          </Ink>
          <Ink size={11.5} weight="bold" color={c.textSecondary}>
            {`Source : ${l.source}`}
          </Ink>
        </View>
      ))}
      <Pressable
        onPress={() => router.push('/scientific-sources' as any)}
        accessibilityRole="link"
        accessibilityLabel={traduire("Voir toutes les sources")}
        style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
      >
        <Ink size={14} weight="extraBold" color={c.accent}>
          {traduire("Voir toutes les sources")}</Ink>
        <Icon name="chevron" size={15} color={c.accent} width={2.6} />
      </Pressable>
    </View>
  );

  return (
    <MetricDetail
      title={traduire("Ton poids")}
      sub={goal ? traduire("Ton cap : {0} kg", formatKg(goal)) : traduire('Tes pesées et ta vraie tendance.')}
      spec={{ label: 'Poids', unit: 'kg', digits: 1, good, deltaOne: 'kilo', deltaMany: 'kilos', minSpan: 2, keepZero: true }}
      points={points}
      color={c.ink}
      explain={WEIGHT_EXPLAIN}
      loading={loading}
      periods={planOk ? POIDS_PERIODS_PLAN : POIDS_PERIODS}
      // courbe v2 : « Mon plan » par defaut quand tu as un plan
      defaultPeriod={planOk ? PERIODE_PLAN : 90}
      periodFilter={(pts, period) => cadrer(pts, period).points}
      diffOf={(shown) => {
        const a = byDate.get(shown[0].date);
        const b = byDate.get(shown[shown.length - 1].date);
        return a && b ? b.trend - a.trend : null;
      }}
      diffNote="en tendance"
      headSide={(scrub) => {
        // vague 35, comme la carte de l'accueil : la pastille de statut a cote de « Poids », elle suit le doigt
        if (!capOn || !plan.ligne) return null;
        const p = scrub ?? (last ? { date: last.date, value: last.value } : null);
        if (!p) return null;
        return <PastilleStatut statut={statutLigne(plan.ligne, p.date, p.value, plan.torii)} small />;
      }}
      headNote={(scrub) => {
        // courbe v2 : ton allure en petit, sous le grand chiffre (elle n'est plus posee sur la courbe)
        // 16 octobre : en couleur, comme sur la carte de l'accueil (components/yoroi/v2/charts/LigneAllure.tsx)
        if (!capOn || !plan.ligne) return null;
        const p = scrub ?? (last ? { date: last.date, value: last.value } : null);
        const t = p ? partiesAllure(plan.ligne, plan.torii, p.date, p.value, today, !!scrub) : null;
        return t ? <LigneAllure parties={t} size={13} secondaire={c.textSecondary} style={{ marginTop: 3 }} /> : null;
      }}
      diffBeside={(diff, period) => {
        // 18 octobre : « Mon plan » dit le meme ecart que l'accueil (ton poids actuel moins ton debut, source unique) ;
        // avant, la tendance lissee donnait −1,1 kg quand l'accueil disait −3,7 et la barre 3,4 kg perdus
        if (period === PERIODE_PLAN && etat.variation != null) {
          const vPlan = etat.variation;
          const versPlan = Math.abs(vPlan) >= 0.05 && ((good === 'down' && vPlan < 0) || (good === 'up' && vPlan > 0));
          return (
            <Ink size={14} weight="extraBold" color={versPlan ? POIDS.capText : c.textSecondary} numberOfLines={1}>
              {`(${texteDepuisDebut(etat)})`}
            </Ink>
          );
        }
        // les autres periodes : l'ecart entre parentheses a cote du chiffre, en tendance (vert quand il va vers ton cap)
        const txt = texteDePeriode(period, cadrer(series, period).mention, PERIODE_TEXTE[PERIODE_PLAN]);
        const vers = diff !== null && Math.abs(diff) >= 0.05 && ((good === 'down' && diff < 0) || (good === 'up' && diff > 0));
        return (
          <Ink size={14} weight="extraBold" color={vers ? POIDS.capText : c.textSecondary} numberOfLines={1}>
            {diff === null ? traduire('(ta tendance arrive)') : Math.abs(diff) < 0.05 ? `(stable ${txt})` : `(${diff < 0 ? '−' : '+'}${formatKg(Math.abs(diff))} kg ${txt})`}
          </Ink>
        );
      }}
      renderChart={(shown, onScrub, period, setPeriod) => (
        <WeightTrendChart
          points={shown.map((p) => byDate.get(p.date)).filter((p): p is DayWeight => !!p)}
          goal={goal}
          height={period === PERIODE_PLAN ? 320 : 300}
          series={series}
          periode={period}
          debut={cadrer(series, period).debut}
          onToriiPress={() => setPeriod(PERIODE_PLAN)}
          projection={period === PERIODE_PLAN ? etat.projection?.points ?? null : null}
          legende
          fond
          onScrub={(p) => onScrub(p ? points.find((q) => q.date === p.date) ?? null : null)}
        />
      )}
      afterChart={
        <>
        {goal && mode && last && start != null ? (
          <>
          {/* 18 octobre : « Ton objectif », Début, Objectif et Date du cap, chacun avec « Changer » */}
          <CarteObjectif etat={etat} onChanger={(q) => setFeuille({ quoi: q })} style={{ marginHorizontal: GUTTER, marginTop: 14 }} />
          <FeuilleObjectif visible={!!feuille} quoi={feuille?.quoi ?? null} onClose={() => setFeuille(null)} etat={etat} series={series} today={today} cle={plan.cle} />
          <View style={{ marginHorizontal: GUTTER, marginTop: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderRadius: 22, backgroundColor: P.washi, borderWidth: 1, borderColor: P.washiBord }}>
            <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(44,74,132,0.18)' }} />
            <SentierTorii depart={start} cap={goal} actuel={etat.actuel?.poids ?? last.value} mode={mode} torii={capOn || atteint ? plan.torii : null} atteint={atteint} personnage={perso} />
          </View>
          </>
        ) : null}
        {blocOuTuEnSeras}
        {blocRythme}
        </>
      }
      // 18 octobre : la legende est celle de la carte de l'accueil, sous la courbe (LegendeCourbe), identique et complete
      legend={<></>}
      scrubLine={(p) => p.caption ?? ' '}
      historyNoun={[traduire('pesée'), traduire('pesées')]}
      onHistoryPress={onHistoryPress}
      historyHint={traduire("Une pesée fausse ? Appuie dessus pour la modifier ou la supprimer.")}
      after={
        <>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, marginTop: 16 }}>
          <GhostButton label={traduire("Toutes tes pesées")} onPress={() => router.push('/pesees' as any)} style={{ flex: 1 }} />
          {/* courbe-pred : ou tu en seras, a ton rythme et sur ta ligne */}
          <GhostButton label={traduire("Tes prédictions")} onPress={() => router.push('/weight-predictions' as any)} style={{ flex: 1 }} />
        </View>
        {blocCalcul}
        </>
      }
      empty={{
        title: traduire('Pas encore de pesée'),
        text: traduire('Pèse-toi le matin, à jeun. Ta courbe se dessine dès la troisième pesée.'),
        plusHint: traduire('Pèse-toi avec le bouton + de la barre d’onglets'),
      }}
    />
  );
}
