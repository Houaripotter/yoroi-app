/**
 * Carte Poids de l'accueil (vague 26, courbe refaite en vague 32, carte refaite en vague 33).
 * En haut, « Ton poids » en petit et le grand chiffre : avec le style 1 (par defaut), c'est lui qui suit ton doigt
 * sur la courbe (valeur, date, ecart, statut), et il revient a aujourd'hui quand tu relaches. Dessous, la phrase
 * de statut (vague 42) et l'ecart de la periode.
 * La courbe sur 1, 3, 6 mois, 1 an ou « Mon plan » (du debut de ton plan jusqu'au torii, futur compris),
 * avec ton cap, son torii et ta ligne directrice (interrupteur a cote du choix de periode et dans les Reglages).
 * Vague 33 : la jauge en arc et les cases Perdu, Objectif, Reste laissent la place a un seul « chemin vers le torii »
 * (components/yoroi/v2/charts/CheminTorii.tsx). La ligne « A ce rythme » reste quand la carte n'annonce pas deja
 * une date d'arrivee. Tout vient de tes vraies pesees. Appui : le detail du poids. Sans pesee : un etat vide.
 * Vague 34, la carte « rouleau » (version D du labo compact, validee par Houari) : papier washi encadre comme un
 * rouleau monte, environ 390 points de haut au lieu de 554. La courbe (112 points) est posee sur une scene
 * (FondCourbe : la scene de ton accueil, ou les rizieres si elle a deja un torii, au choix dans Reglages), le vrai
 * torii en illustration a ta date d'arrivee, les periodes en onglets legers, et dessous le sentier de pierres ou ton
 * personnage marche vers le torii (SentierTorii). Plus de titre « Ton chemin vers le torii » ni de barre « Toi ».
 * Vague 42 (Houari : « on ne comprend pas énormément les choses ») : une carte qu'on comprend du premier coup.
 * La pastille « Au-dessus de ta ligne » devient une phrase claire sous le chiffre (« Tu es 0,7 kg au-dessus de ton
 * rythme prévu »), la courbe sur le papier (la scene reste un choix dans Reglages), une legende d'une ligne sous la
 * courbe (ton poids, ton rythme prevu, ton cap), l'interrupteur du torii quitte la carte (Reglages, Tes courbes),
 * et le chemin devient une barre de progression avec « 90 % du chemin ». Hauteur maximale 330 points.
 * Les pesees datees apres aujourd'hui (horloge du telephone ou import decale) sont ecartees de la carte : sinon
 * la courbe montrait un autre mois que ton torii.
 * 16 octobre (Personnaliser) : la ligne « Ton allure » passe en couleur (LigneAllure : tirets de la legende, valeur
 * dans le vert de la ligne, ecart dans la couleur du statut), et un petit bouton « Style » a droite des periodes
 * ouvre directement le choix du style de la courbe, avec ses apercus (/settings/courbes?choix=style).
 * 17 octobre : plus de parentheses autour de l'ecart, seul le chiffre cle prend la couleur (le reste en encre
 * secondaire, « au-dessus » en encre) ; chiffre, phrase et allure centres ; « pesée du jour » en encre avec un point vert.
 * 17 octobre soir, maquette B « Equilibree » (choisie par Houari) : le poids en grand (48) et l'ecart en pastille, le
 * statut en une ligne, une courbe respiree (136) dont la legende vient au toucher, les periodes en onglets discrets avec
 * « Style », et le chemin en une barre fine avec le torii et sa date unique (lib/v2/pesee/arrivee.ts). Le sentier et
 * l'allure quittent la carte ; « Où tu en seras » passe dans le detail du poids (app/poids-detail.tsx).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CourbePoids, POIDS } from '@/components/yoroi/v2/charts/CourbePoids';
import type { ScrubPoids } from '@/components/yoroi/v2/charts/CourbePoids';
import type { ModeSentier as ModeChemin } from '@/components/yoroi/v2/charts/SentierTorii';
import { SceneCourbe, sceneDuFond } from '@/components/yoroi/v2/charts/FondCourbe';
import { ToriiImage } from '@/components/yoroi/v2/charts/ToriiImage';
import { PeriodSwitch, PERIODE_PLAN, POIDS_PERIODS, POIDS_PERIODS_PLAN_COURT } from '@/components/yoroi/v2/charts/PeriodSwitch';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import type { DayWeight } from '@/lib/v2/weightStats';
import { formatKg } from '@/lib/v2/weightStats';
import { cadrerPeriode, texteDePeriode } from '@/lib/v2/pesee/cadrageCourbe';
import { ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import { localISO } from '@/lib/v2/accueil/hydration';
import { relativeDay } from '@/lib/v2/accueil/home';
import { goalProgress } from '@/lib/v2/accueil/projection';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { usePlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import { arriveePrevueTexte } from '@/lib/v2/pesee/arrivee';
import { jourCourt, phraseStatut, statutLigne, texteFenetreTorii } from '@/lib/v2/pesee/ligneDirectrice';
import type { Statut } from '@/lib/v2/pesee/ligneDirectrice';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { ECART_EAU_KG, etatObjectif, texteObjectif, texteTendance } from '@/lib/v2/pesee/etatObjectif';
import { FeuilleObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import type { QuoiObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import { Card, Icon, P, Press } from './kit';

const PERIODE_TEXTE: Record<number, string> = { 30: 'en 1 mois', 90: 'en 3 mois', 180: 'en 6 mois', 365: 'en 1 an', [PERIODE_PLAN]: 'depuis ton début' };

/** Couleur du mot cle de la phrase de statut, lisible en clair et en sombre (vague 42) */
function couleurTon(ton: Statut['ton']): string {
  const sombre = paletteSombre();
  if (ton === 'vert') return POIDS.capText;
  if (ton === 'bleu') return sombre ? '#8EA6FF' : '#2F50B8';
  if (ton === 'orange') return sombre ? '#F3A55C' : '#A14E00';
  return POIDS.axe;
}

/**
 * 17 octobre (planche5) : le chiffre, la phrase de statut et l'allure centres. Compare a la version alignee a gauche,
 * le centre s'accorde avec tout le bas de la carte (legende, periodes, « 6,1 kg perdus ») deja centre.
 */
export const CENTRAGE_POIDS = true;

/**
 * Le mot cle de la phrase de statut : seul le chiffre prend la couleur (« 2,3 kg » en bleu), le reste
 * (« au-dessus ») en encre. null si le mot cle ne commence pas par un chiffre.
 */
export function cleChiffre(cle: string): [string, string] | null {
  const m = /^([−+-]?\s?\d[\d\s,.]*\s?kg)(.*)$/.exec(cle);
  return m ? [m[1], m[2]] : null;
}

/** Largeur du petit bouton « Style » (et de l'espace en miroir a gauche, pour garder les periodes au centre) */
const BOUTON_STYLE_L = 54;

/** Le petit bouton « Style » sous la courbe : il ouvre le choix du style de courbe, avec ses apercus */
function BoutonStyle({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel="Changer le style de ta courbe" hitSlop={8}>
      <View style={{ width: BOUTON_STYLE_L, height: 28, borderRadius: 14, borderWidth: 1, borderColor: P.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Path d="M5 19L16 8M14 6l4 4M18 3v3M16.5 4.5h3" stroke={POIDS.softText} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
        <Ink size={11.5} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
          Style
        </Ink>
      </View>
    </Press>
  );
}

type Props = {
  series: DayWeight[];
  targetWeight: number | null;
  /** poids de depart du profil ; sinon la premiere pesee */
  startWeight: number | null;
  /** vague 27, demonstration de l'onboarding : le jour de reference d'une carte projetee (AAAA-MM-JJ) */
  today?: string;
  /** vague 33 : carte d'exemple (onboarding) : ni plan, ni torii, ni fenetre, ni bouton vers le profil */
  demo?: boolean;
  /** vague 34 : ton rang (0 a 4), pour ton personnage sur le sentier ; maquette B : le sentier est dans le detail, prop gardee pour les appels */
  rankIndex?: number;
  /** 17 octobre : chiffre, phrase et allure centres (CENTRAGE_POIDS) ; prop pour comparer sur la planche */
  centre?: boolean;
};

export function CartePoids({ series: seriesIn, targetWeight, startWeight, today: todayProp, demo, centre = CENTRAGE_POIDS }: Props) {
  const router = useRouter();
  const { width: largeur } = useWindowDimensions();
  const today = todayProp ?? localISO();
  // vague 42 : jamais de pesee dans le futur (la courbe montrait janvier et le torii octobre)
  const series = useMemo(() => (seriesIn.some((p) => p.date > today) ? seriesIn.filter((p) => p.date <= today) : seriesIn), [seriesIn, today]);
  const exemple = !!todayProp || !!demo;
  const last = series[series.length - 1];
  const prefs = usePrefsCourbes();
  // ta scene et ton personnage (Ton espace) : le fond de la courbe et le marcheur du sentier
  const { espace } = useEspace();
  const fond = sceneDuFond(prefs.fond, espace.scene);
  const [choix, setPeriod] = useState<number | null>(null);
  const [scrub, setScrub] = useState<ScrubPoids | null>(null);
  // maquette B : la legende sous la courbe n'apparait qu'au toucher de la courbe
  const [legende, setLegende] = useState(false);
  // 18 octobre : la feuille « Ton objectif » (debut, objectif, date du cap)
  const [feuille, setFeuille] = useState<{ quoi: QuoiObjectif | null } | null>(null);

  // ton plan : la vraie carte de l'accueil seulement (pas les cartes d'exemple de l'onboarding)
  const plan = usePlanPoids(series, targetWeight, { enabled: !exemple, check: !exemple, today });
  const capOn = prefs.cap && targetWeight !== null;
  const planOk = capOn && !!plan.ligne && !!plan.torii;
  // courbe v2 (Houari : « la meilleure courbe, c'est Mon plan ») : « Mon plan » par defaut quand tu as un plan,
  // tant que tu n'as pas choisi une autre periode
  const period = choix ?? (planOk ? PERIODE_PLAN : 90);
  const periode = period === PERIODE_PLAN && !planOk ? 90 : period;

  // courbe v2 : le meme cadrage que le detail du poids (lib/v2/pesee/cadrageCourbe.ts) : la fenetre part du debut
  // de ton objectif ou de ta premiere vraie pesee, jamais d'un grand vide ; « depuis le 3 oct. » si la periode depasse
  const cadrage = useMemo(() => cadrerPeriode(series, periode, plan.depart?.date ?? null), [series, periode, plan.depart?.date]);
  // 18 octobre (audit du poids) : SOURCE UNIQUE des chiffres de ton objectif (lib/v2/pesee/etatObjectif.ts) : le meme
  // debut pour « depuis ton début », la barre, ton allure et ta projection, ici et dans le detail du poids
  const etat = useMemo(
    () =>
      etatObjectif({
        series,
        cap: targetWeight,
        depart: plan.depart ?? (startWeight && series.length ? { date: series[0].date, poids: startWeight } : null),
        ligne: plan.ligne,
        torii: plan.torii,
        atteint: plan.atteint,
        choisie: plan.choisie,
        today,
        projection: !exemple,
      }),
    [series, targetWeight, plan.depart, startWeight, plan.ligne, plan.torii, plan.atteint, plan.choisie, today, exemple],
  );
  const shown = cadrage.points;
  const curve = useMemo(() => shown.map((p) => ({ date: p.date, value: p.value })), [shown]);
  const openDetail = () => router.push('/poids-detail' as any);

  // le torii a bouge : une fenetre bienveillante, une seule fois
  const vu = useRef<string | null>(null);
  useEffect(() => {
    const f = plan.fenetre;
    if (!f || targetWeight === null || vu.current === f.date) return;
    vu.current = f.date;
    const t = texteFenetreTorii(f.kind, f.date, targetWeight, today);
    const timer = setTimeout(() => {
      appAlert(t.titre, t.texte, [{ text: 'Garder ce rythme', style: 'cancel' }, { text: 'Voir mon plan', onPress: () => router.push('/poids-detail' as any) }], {
        illustration: (
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F6EFD9', alignItems: 'center', justifyContent: 'center' }}>
            <ToriiImage width={42} />
          </View>
        ),
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [plan.fenetre, targetWeight, today, router]);

  if (!last) {
    return (
      <Press onPress={() => router.push('/progres' as any)} accessibilityRole="button" accessibilityLabel="Ton poids. Touche plus pour ta première pesée">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Ink size={13} weight="extraBold" color={POIDS.softText}>
              Ton poids
            </Ink>
            <Ink size={20} weight="black" tight>
              Ta courbe démarre à ta première pesée
            </Ink>
            <PlusHint text="Touche + pour ta première pesée" />
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: POIDS.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scale" size={28} color={POIDS.softText} width={2.2} />
          </View>
        </Card>
      </Press>
    );
  }

  // ecart sur la periode affichee
  const first = shown[0] ?? last;
  // « depuis ton début » (Mon plan) : la source unique, ton poids actuel moins ton debut (avant : la premiere pesee de la
  // courbe, d'ou −3,7 kg ici quand la barre disait 3,4 kg perdus) ; les autres periodes : l'ecart sur la periode
  const delta = periode === PERIODE_PLAN && etat.variation != null ? etat.variation : shown.length > 1 ? last.value - first.value : null;
  const isToday = last.date === today;
  const periodeTxt = texteDePeriode(periode, cadrage.mention, PERIODE_TEXTE[PERIODE_PLAN]);

  // depart, objectif, sens
  // le meme depart que la ligne directrice (regle unique, comme departDuChemin de lib/v2/accueil/projection.ts)
  const start = plan.depart?.poids ?? startWeight ?? series[0].value;
  const goal = targetWeight;
  // meme regle que la fin de pesee (goalProgress) : sur la pesee du jour
  const gp = goal !== null ? goalProgress(start, goal, last.value) : null;
  const mode: ModeChemin | null =
    goal === null ? null : plan.ligne ? (plan.ligne.mode === 'perte' || plan.ligne.mode === 'prise' ? plan.ligne.mode : 'maintien') : Math.abs(goal - start) < 0.2 ? 'maintien' : gp?.losing ? 'perte' : 'prise';
  const lossGoal = mode === 'perte' || (mode === null && delta !== null && delta < 0);
  const towardGoal = delta !== null && goal !== null && mode !== 'maintien' && Math.abs(delta) >= 0.05 && ((lossGoal && delta < 0) || (!lossGoal && delta > 0));
  const deltaText = delta === null ? 'ta tendance arrive' : Math.abs(delta) < 0.05 ? `stable ${periodeTxt}` : `${delta < 0 ? '−' : '+'}${formatKg(Math.abs(delta))} kg ${periodeTxt}`;
  // le chiffre cle seul (en couleur), le reste de la ligne en encre secondaire
  const deltaChiffre = delta !== null && Math.abs(delta) >= 0.05 ? `${delta < 0 ? '−' : '+'}${formatKg(Math.abs(delta))} kg` : null;
  const atteint = plan.atteint || (mode !== 'maintien' && etat.atteint);

  // le grand chiffre : la pesee touchee (style 1), sinon aujourd'hui
  const follow = prefs.style === 1 && scrub !== null && !scrub.last;
  const bigValue = follow && scrub ? scrub.point.value : last.value;
  const statutDuJour = capOn && plan.ligne ? statutLigne(plan.ligne, last.date, last.value, plan.torii) : null;
  // vague 42 : une phrase de tous les jours a la place de la pastille ; au doigt, elle parle de la pesee touchee
  // hors du doigt : la phrase de la source unique, qui ne contredit jamais ta projection
  const phrase = capOn && plan.ligne ? (follow && scrub ? phraseStatut(plan.ligne, scrub.point.date, scrub.point.value, plan.torii, true) : etat.phrase ?? phraseStatut(plan.ligne, last.date, last.value, plan.torii)) : null;
  const quand = follow && scrub ? `${scrub.point.week ? 'semaine du ' : 'le '}${jourCourt(scrub.point.date)}` : null;
  const ecartDepuis = follow && scrub ? last.value - scrub.point.value : 0;

  // 17 octobre (Houari : « la parenthèse est de la même couleur verte que le texte ») : plus de parentheses ;
  // seul le chiffre cle prend la couleur, les mots de liaison restent en encre secondaire
  const parenNode =
    follow && scrub ? (
      <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
        {quand}
        {Math.abs(ecartDepuis) < 0.05 ? (
          ', comme aujourd’hui'
        ) : (
          <>
            {', '}
            <Ink size={13} weight="extraBold" color={POIDS.softText}>{`${formatKg(Math.abs(ecartDepuis))} kg`}</Ink>
            {ecartDepuis < 0 ? ' perdus depuis' : ' repris depuis'}
          </>
        )}
      </Ink>
    ) : deltaChiffre ? (
      <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
        <Ink size={13} weight="extraBold" color={towardGoal ? POIDS.capText : P.ink}>
          {deltaChiffre}
        </Ink>
        {` ${periodeTxt}`}
      </Ink>
    ) : (
      <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
        {deltaText}
      </Ink>
    );

  // 17 octobre (maquette B, choisie par Houari) : le chemin en une barre fine, et la date unique du torii dessous
  // (lib/v2/pesee/arrivee.ts, la meme que Progres, la montre et le bilan)
  // 18 octobre : la part et le reste de la source unique (memes chiffres que le detail du poids)
  const chemin = goal !== null && etat.part != null && etat.reste != null && mode && mode !== 'maintien' && (capOn || atteint) ? { part: atteint ? 1 : etat.part, reste: atteint ? 0 : etat.reste } : null;
  const arrivee = chemin && !atteint ? arriveePrevueTexte({ torii: plan.torii, atteint }, today) : null;
  const objectifTxt = !exemple && goal !== null ? texteObjectif(etat) : null;
  // 18 octobre (etudes) : seulement quand ta derniere pesee s'ecarte d'au moins 0,6 kg de ta tendance
  const tendTxt = !exemple ? texteTendance(etat) : null;
  const eauTxt = tendTxt && etat.ecartTendance != null && Math.abs(etat.ecartTendance) >= ECART_EAU_KG && tendTxt.note ? `${tendTxt.valeur}, ${tendTxt.note}.` : null;

  const a11y = [
    `Ton poids : ${formatKg(last.value)} kilos, ${isToday ? 'pesée du jour' : relativeDay(last.date)}`,
    deltaText,
    statutDuJour ? statutDuJour.label : null,
    goal === null ? 'pas encore de cap' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const options = planOk ? POIDS_PERIODS_PLAN_COURT : POIDS_PERIODS;

  return (
    <View nativeID="carte-poids" testID="carte-poids">
    {/* vague 49 : meme carte que Ta semaine, sans papier washi ni double bordure */}
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* le heros : le grand chiffre (il suit ton doigt), l'ecart en pastille, le statut en une ligne */}
      <Press onPress={openDetail} haptic="light" accessibilityRole="button" accessibilityLabel={`${a11y}. Voir le détail`}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <Icon name="scale" size={16} color={POIDS.softText} width={2.5} />
              <Ink size={13} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
                Ton poids
              </Ink>
            </View>
            {!follow ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {isToday ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: POIDS.capText }} /> : null}
                <Ink size={12} weight="bold" color={isToday ? P.ink2 : P.muted} numberOfLines={1}>
                  {isToday ? 'pesée du jour' : relativeDay(last.date)}
                </Ink>
              </View>
            ) : null}
          </View>
          <View style={{ alignItems: centre ? 'center' : 'flex-start', gap: 8, paddingTop: 4 }}>
            <Ink size={48} weight="black" tight numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
              {formatKg(bigValue)}
              <Ink size={17} weight="bold" color={P.ink2}>
                {' kg'}
              </Ink>
            </Ink>
            <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '100%', paddingHorizontal: 11, minHeight: 28, borderRadius: 14, borderWidth: 1.5, borderColor: !follow && towardGoal ? POIDS.capText : P.line }}>
              {parenNode}
            </View>
          </View>
          {phrase ? (
            <Ink size={13.5} weight="bold" color={P.ink2} numberOfLines={2} style={{ marginTop: 10, lineHeight: 19, textAlign: centre ? 'center' : 'left' }}>
              {phrase.avant}
              {cleChiffre(phrase.cle) ? (
                <>
                  <Ink size={13.5} weight="extraBold" color={couleurTon(phrase.ton)}>
                    {cleChiffre(phrase.cle)![0]}
                  </Ink>
                  <Ink size={13.5} weight="extraBold" color={P.ink}>
                    {cleChiffre(phrase.cle)![1]}
                  </Ink>
                </>
              ) : (
                <Ink size={13.5} weight="extraBold" color={couleurTon(phrase.ton)}>
                  {phrase.cle}
                </Ink>
              )}
              {phrase.apres}
            </Ink>
          ) : null}
          {/* 18 octobre (etudes) : ta pesee loin de ta tendance, on dit que c'est sans doute de l'eau (la meme phrase
              que le detail du poids, lib/v2/pesee/etatObjectif.ts texteTendance) */}
          {eauTxt && !follow ? (
            <Ink size={12.5} weight="bold" color={P.muted} numberOfLines={3} style={{ marginTop: 6, lineHeight: 17, textAlign: centre ? 'center' : 'left' }}>
              {eauTxt}
            </Ink>
          ) : null}
        </View>
      </Press>

      {/* la courbe respiree : la ligne verte finit au torii, ta courbe violette au-dessus ; un toucher montre la legende */}
      {curve.length > 1 || periode === PERIODE_PLAN ? (
        <>
          <SceneCourbe scene={fond} style={{ marginHorizontal: 14, marginTop: 10, paddingBottom: fond ? 4 : 0 }}>
            <CourbePoids
              points={curve}
              style={prefs.style}
              showCap={capOn}
              cap={goal}
              ligne={plan.ligne}
              torii={plan.torii}
              atteint={plan.atteint}
              periode={periode}
              debut={cadrage.debut}
              today={today}
              height={136}
              surScene={!!fond}
              compact
              legende={legende}
              projection={etat.projection?.points ?? null}
              onScrub={setScrub}
              onPress={() => setLegende((v) => !v)}
              onToriiPress={planOk ? () => setPeriod(PERIODE_PLAN) : undefined}
              label={`Ta courbe de poids ${periode === PERIODE_PLAN ? 'sur ton plan, jusqu’au torii' : periodeTxt.replace('en ', 'sur ')}. Touche pour ${legende ? 'cacher' : 'voir'} la légende`}
            />
          </SceneCourbe>
          {/* les periodes en onglets discrets, au centre ; le bouton « Style » a droite */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginTop: 6 }}>
            {!exemple && largeur >= 400 ? <View style={{ width: BOUTON_STYLE_L }} /> : null}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <PeriodSwitch value={periode} onChange={setPeriod} options={options} variant="onglets" />
            </View>
            {!exemple ? <BoutonStyle onPress={() => router.push(ROUTES_PERSONNALISER.styleCourbe as any)} /> : null}
          </View>
        </>
      ) : (
        <View style={{ height: 6 }} />
      )}

      {/* le chemin vers le torii en une barre fine (ou de quoi fixer ton cap) */}
      {chemin ? (
        <Press onPress={openDetail} haptic="none" accessibilityRole="button" accessibilityLabel={`${atteint ? 'Torii atteint' : `${Math.round(chemin.part * 100)} % du chemin, encore ${formatKg(chemin.reste)} kilos`}${arrivee ? `, arrivée prévue ${arrivee}` : ''}. Voir le détail de ton poids`}>
          <View style={{ marginHorizontal: 18, marginTop: 12, marginBottom: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Ink size={12.5} weight="extraBold" color={P.ink} numberOfLines={1}>
                {atteint ? 'Torii atteint' : `${Math.round(chemin.part * 100)} % du chemin`}
              </Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                {!atteint ? (
                  <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1}>
                    {`encore ${formatKg(chemin.reste)} kg`}
                  </Ink>
                ) : null}
                <ToriiImage width={20} />
              </View>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: P.line, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(chemin.part * 100)}%`, height: 6, borderRadius: 3, backgroundColor: atteint ? POIDS.capText : POIDS.c3 }} />
            </View>
            {arrivee ? (
              <Ink size={11.5} weight="bold" color={P.muted} numberOfLines={1} style={{ textAlign: 'right' }}>
                {`${plan.choisie ? 'ta date du cap' : 'arrivée prévue'} ${arrivee}`}
              </Ink>
            ) : null}
          </View>
        </Press>
      ) : goal === null && !exemple ? (
        <Press onPress={() => router.push('/profile' as any)} accessibilityRole="button" accessibilityLabel="Fixer ton cap de poids">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 18, marginTop: 10, paddingVertical: 12, marginBottom: 4, borderTopWidth: 1, borderColor: P.line2 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#F6EFD9', alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={26} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={14.5} weight="extraBold" numberOfLines={1}>
                Fixe ton cap
              </Ink>
              <Ink size={12.5} weight="medium" color={P.ink2} numberOfLines={2}>
                Ton torii et ton rythme prévu apparaissent sur ta courbe
              </Ink>
            </View>
            <Icon name="chevron" size={15} color={P.muted} width={2.6} />
          </View>
        </Press>
      ) : (
        <View style={{ height: 12 }} />
      )}
      {/* 18 octobre (Houari : « pouvoir changer facilement la date de début, le poids objectif et la date du cap ») */}
      {objectifTxt ? (
        // 18 octobre 2026 : ancre de la visite guidee (« Ton objectif », avec Changer)
        <TourAnchor id="accueil.objectif">
        <Press onPress={() => setFeuille({ quoi: null })} haptic="light" accessibilityRole="button" accessibilityLabel={`Ton objectif : ${objectifTxt}${plan.torii ? `, date du cap le ${jourCourt(plan.torii)}` : ''}. Changer ton début, ton objectif ou ta date du cap`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginHorizontal: 18, marginTop: chemin ? -6 : 0, marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderColor: P.line2 }}>
            <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
              {`Ton objectif : ${objectifTxt}`}
            </Ink>
            <Ink size={12.5} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
              Changer
            </Ink>
          </View>
        </Press>
        </TourAnchor>
      ) : null}
      {!exemple ? (
        <FeuilleObjectif visible={!!feuille} quoi={feuille?.quoi ?? null} onClose={() => setFeuille(null)} etat={etat} series={series} today={today} cle={plan.cle} />
      ) : null}
      {/* « Où tu en seras » vit maintenant dans le detail du poids (app/poids-detail.tsx), en bloc propre */}
    </Card>
    </View>
  );
}
