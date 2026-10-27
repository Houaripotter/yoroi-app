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
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView as PagesScroll } from 'react-native-gesture-handler';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
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
import { Card, Icon, ombreCarte, P, Press } from './kit';
import { traduire, LANG } from '@/lib/i18n/tr';

const PERIODE_TEXTE: Record<number, string> = { 30: traduire('en 1 mois'), 90: traduire('en 3 mois'), 180: traduire('en 6 mois'), 365: traduire('en 1 an'), [PERIODE_PLAN]: traduire('depuis ton début') };

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
    <Press onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Changer le style de ta courbe")} hitSlop={8}>
      <View style={{ width: BOUTON_STYLE_L, height: 28, borderRadius: 14, borderWidth: 1, borderColor: P.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Path d="M5 19L16 8M14 6l4 4M18 3v3M16.5 4.5h3" stroke={POIDS.softText} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
        <Ink size={11.5} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
          {traduire("Style")}</Ink>
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
  /** 27 octobre 2026 (carrousel) : la page affichee (0 : ton poids et ton objectif, avec les citrouilles et les sapins ; 1 : ta courbe) */
  onPage?: (page: number) => void;
};

/**
 * 27 octobre 2026 soir (Houari : « la page 1 fait doublon ») : l'anneau du chemin en haut a droite de la page 1,
 * 62 points (la place prevue pour les citrouilles et les sapins), ton torii au centre ; le pourcentage est ecrit en toutes
 * lettres juste dessous (« 86 % du chemin »), il n'est donc plus repete dans l'anneau.
 */
function AnneauChemin({ part }: { part: number }) {
  const T = 44;
  const r = (14 / 36) * T;
  const ep = (4 / 36) * T;
  const tour = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, part));
  const piste = paletteSombre() ? P.pointInactif : '#ECE8FF';
  return (
    <View style={{ width: T, height: T, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={T} height={T} style={{ position: 'absolute' }}>
        <Circle cx={T / 2} cy={T / 2} r={r} stroke={piste} strokeWidth={ep} fill="none" />
        {p > 0 ? <Circle cx={T / 2} cy={T / 2} r={r} stroke="#8B7BE8" strokeWidth={ep} fill="none" strokeLinecap="round" strokeDasharray={`${tour * p} ${tour}`} transform={`rotate(-90 ${T / 2} ${T / 2})`} /> : null}
      </Svg>
      <ToriiImage width={18} />
    </View>
  );
}

/** 27 octobre 2026 soir : la carte en blanc pur, un voile lilas pastel en haut qui s'efface vers le blanc */
export const VOILE_CARTE_POIDS = { clair: '#E9E4FF', sombre: '#262449', hauteur: 150 } as const;

/** La partie fixe de la page courbe autour de la courbe (titre, panneau, periodes), pour caler sa hauteur sur la page 1 */
const CHROME_PAGE_COURBE = 102;
const COURBE_MIN = 136;
const COURBE_MAX = 196;
/** Les paliers du chemin : 25, 50, 75 et 100 % (le dernier, ton objectif, porte le torii) */
export const PALIERS_CHEMIN = [0.25, 0.5, 0.75, 1] as const;

/**
 * Decoupage en paliers, pour l'affichage seulement : le poids de chaque palier entre ton debut et ton objectif,
 * s'il est franchi (ta part du chemin l'a atteint) et le prochain a franchir, avec ce qu'il reste jusqu'a lui.
 */
export function paliersDuChemin(depart: number, objectif: number, actuel: number, part: number): { part: number; kg: number; franchi: boolean }[] & { prochain?: { kg: number; encore: number; dernier: boolean } | null } {
  const l = PALIERS_CHEMIN.map((f) => ({ part: f, kg: Math.round((depart + (objectif - depart) * f) * 10) / 10, franchi: part >= f - 1e-6 }));
  const suivant = l.find((x) => !x.franchi);
  return Object.assign(l, { prochain: suivant ? { kg: suivant.kg, encore: Math.max(0, Math.round(Math.abs(actuel - suivant.kg) * 10) / 10), dernier: suivant.part === 1 } : null });
}

const PASTILLE_PALIER = 18;
const BOUT_TORII = 24;

/** La barre du chemin en paliers : une pastille par palier (cochee si franchie), le torii au bout, les kilos dessous */
function BarrePaliers({ depart, objectif, part, atteint, fg2, chiffreC }: { depart: number; objectif: number; part: number; atteint: boolean; fg2: string; chiffreC: string }) {
  const sombre = paletteSombre();
  const pastel = sombre ? '#2C3866' : '#DCE3FF';
  const coche = sombre ? '#C9D4FF' : '#23358F';
  const vide = sombre ? '#1E2540' : P.white;
  const l = paliersDuChemin(depart, objectif, depart, atteint ? 1 : part);
  const p = Math.max(0, Math.min(1, atteint ? 1 : part));
  const marge = BOUT_TORII / 2;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: BOUT_TORII + 4, marginHorizontal: marge, justifyContent: 'center' }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: P.pointInactif, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(p * 100)}%`, height: 8, borderRadius: 4, backgroundColor: atteint ? POIDS.capText : P.detail }} />
        </View>
        {l.map((x) =>
          x.part === 1 ? (
            <View key={x.part} style={{ position: 'absolute', left: '100%', marginLeft: -BOUT_TORII / 2, width: BOUT_TORII, height: BOUT_TORII + 4, alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={BOUT_TORII} />
            </View>
          ) : (
            <View
              key={x.part}
              style={{
                position: 'absolute',
                left: `${x.part * 100}%`,
                marginLeft: -PASTILLE_PALIER / 2,
                width: PASTILLE_PALIER,
                height: PASTILLE_PALIER,
                borderRadius: PASTILLE_PALIER / 2,
                backgroundColor: x.franchi ? pastel : vide,
                borderWidth: 2,
                borderColor: x.franchi ? P.white : P.pointInactif,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {x.franchi ? (
                <Svg width={10} height={10} viewBox="0 0 24 24">
                  <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={coche} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
              ) : null}
            </View>
          ),
        )}
      </View>
      {/* les kilos : ton debut a gauche, chaque palier sous sa pastille, ton objectif sous le torii */}
      <View style={{ height: 16, marginHorizontal: marge, marginTop: 2 }}>
        <Ink size={11} weight="bold" color={fg2} numberOfLines={1} style={{ position: 'absolute', left: -marge, width: 60 }}>
          {formatKg(depart)}
        </Ink>
        {l.map((x) => (
          <Ink
            key={x.part}
            size={11}
            weight={x.part === 1 ? 'black' : 'bold'}
            color={x.part === 1 ? chiffreC : fg2}
            numberOfLines={1}
            style={x.part === 1 ? { position: 'absolute', right: -marge, width: 60, textAlign: 'right' } : { position: 'absolute', left: `${x.part * 100}%`, marginLeft: -30, width: 60, textAlign: 'center' }}
          >
            {formatKg(x.kg)}
          </Ink>
        ))}
      </View>
    </View>
  );
}

/** Les petits points de pagination du carrousel */
function PointsPages({ nb, page, couleur, inactif }: { nb: number; page: number; couleur: string; inactif: string }) {
  if (nb < 2) return null;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 10, paddingBottom: 14 }}>
      {Array.from({ length: nb }, (_, i) => (
        <View key={i} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? couleur : inactif }} />
      ))}
    </View>
  );
}

export function CartePoids({ series: seriesIn, targetWeight, startWeight, today: todayProp, demo, centre = CENTRAGE_POIDS, onPage }: Props) {
  const router = useRouter();
  const { width: largeur } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  // 27 octobre 2026 (refonte Ciel) : le carrousel de la carte bleue, sa page et sa largeur
  const [page, setPage] = useState(0);
  // 27 octobre 2026 soir (Houari : « le carrousel penche vers la droite ») : la largeur de depart est celle des
  // autres cartes de l'accueil (ecran moins 2 x 16), puis la vraie largeur mesuree, sans arrondi : chaque page fait
  // exactement la largeur du carrousel, la page 2 et la page 3 tombent pile au centre
  const [largeurCarte, setLargeurCarte] = useState(largeur - 32);
  // 27 octobre 2026 soir : la hauteur mesuree de la page 1, pour caler la courbe de la page 2 dessus
  const [hautPage1, setHautPage1] = useState(0);
  const pagesRef = useRef<React.ElementRef<typeof PagesScroll>>(null);
  useEffect(() => {
    onPage?.(page);
  }, [page, onPage]);
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
      appAlert(t.titre, t.texte, [{ text: traduire('Garder ce rythme'), style: 'cancel' }, { text: traduire('Voir mon plan'), onPress: () => router.push('/poids-detail' as any) }], {
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
      <Press onPress={() => router.push('/progres' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ton poids. Touche plus pour ta première pesée")}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Ink size={13} weight="extraBold" color={POIDS.softText}>
              {traduire("Ton poids")}</Ink>
            <Ink size={20} weight="black" tight>
              {traduire("Ta courbe démarre à ta première pesée")}</Ink>
            <PlusHint text={traduire("Touche + pour ta première pesée")} />
          </View>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: POIDS.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scale" size={20} color={POIDS.softText} width={2.2} />
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
  const deltaText = delta === null ? traduire('ta tendance arrive') : Math.abs(delta) < 0.05 ? traduire("stable {0}", periodeTxt) : `${delta < 0 ? '−' : '+'}${formatKg(Math.abs(delta))} kg ${periodeTxt}`;
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
  const quand = follow && scrub ? `${scrub.point.week ? traduire('semaine du ') : traduire('le ')}${jourCourt(scrub.point.date)}` : null;
  const ecartDepuis = follow && scrub ? last.value - scrub.point.value : 0;

  // 17 octobre (Houari : « la parenthèse est de la même couleur verte que le texte ») : plus de parentheses ;
  // seul le chiffre cle prend la couleur, les mots de liaison restent en encre secondaire
  // 27 octobre 2026 : la ligne de l'ecart, dans les couleurs de la carte blanche ou de la carte bleue
  const ligneEcart = (base: string, fortDoigt: string, fortVers: string, fort: string) =>
    follow && scrub ? (
      <Ink size={13} weight="bold" color={base} numberOfLines={1} style={{ flexShrink: 1 }}>
        {quand}
        {Math.abs(ecartDepuis) < 0.05 ? (
          traduire(', comme aujourd’hui')
        ) : (
          <>
            {', '}
            <Ink size={13} weight="extraBold" color={fortDoigt}>{`${formatKg(Math.abs(ecartDepuis))} kg`}</Ink>
            {ecartDepuis < 0 ? traduire(' perdus depuis') : traduire(' repris depuis')}
          </>
        )}
      </Ink>
    ) : deltaChiffre ? (
      <Ink size={13} weight="bold" color={base} numberOfLines={1} style={{ flexShrink: 1 }}>
        <Ink size={13} weight="extraBold" color={towardGoal ? fortVers : fort}>
          {deltaChiffre}
        </Ink>
        {` ${periodeTxt}`}
      </Ink>
    ) : (
      <Ink size={13} weight="bold" color={base} numberOfLines={1} style={{ flexShrink: 1 }}>
        {deltaText}
      </Ink>
    );
  const parenNode = ligneEcart(P.ink2, POIDS.softText, POIDS.capText, P.ink);

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
    traduire("Ton poids : {0} kilos, {1}", formatKg(last.value), isToday ? traduire('pesée du jour') : relativeDay(last.date)),
    deltaText,
    statutDuJour ? statutDuJour.label : null,
    goal === null ? traduire('pas encore de cap') : null,
  ]
    .filter(Boolean)
    .join(', ');

  const options = planOk ? POIDS_PERIODS_PLAN_COURT : POIDS_PERIODS;

  // 27 octobre 2026 (refonte Ciel) : les cartes d'exemple de l'onboarding gardent la carte blanche d'un seul tenant
  if (exemple) return (
    <View nativeID="carte-poids" testID="carte-poids">
    {/* vague 49 : meme carte que Ta semaine, sans papier washi ni double bordure */}
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* le heros : le grand chiffre (il suit ton doigt), l'ecart en pastille, le statut en une ligne */}
      <Press onPress={openDetail} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("{0}. Voir le détail", a11y)}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <Icon name="scale" size={16} color={POIDS.softText} width={2.5} />
              <Ink size={13} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
                {traduire("Ton poids")}</Ink>
            </View>
            {!follow ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {isToday ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: POIDS.capText }} /> : null}
                <Ink size={12} weight="bold" color={isToday ? P.ink2 : P.muted} numberOfLines={1}>
                  {isToday ? traduire('pesée du jour') : relativeDay(last.date)}
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
              label={traduire("Ta courbe de poids {0}. Touche pour {1} la légende", periode === PERIODE_PLAN ? traduire('sur ton plan, jusqu’au torii') : LANG === 'fr' ? periodeTxt.replace('en ', 'sur ') : periodeTxt, legende ? traduire('cacher') : traduire('voir'))}
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
        <Press onPress={openDetail} haptic="none" accessibilityRole="button" accessibilityLabel={traduire("{0}{1}. Voir le détail de ton poids", atteint ? traduire('Torii atteint') : traduire("{0} % du chemin, encore {1} kilos", Math.round(chemin.part * 100), formatKg(chemin.reste)), arrivee ? traduire(", arrivée prévue {0}", arrivee) : '')}>
          <View style={{ marginHorizontal: 18, marginTop: 12, marginBottom: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Ink size={12.5} weight="extraBold" color={P.ink} numberOfLines={1}>
                {atteint ? traduire('Torii atteint') : traduire("{0} % du chemin", Math.round(chemin.part * 100))}
              </Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                {!atteint ? (
                  <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1}>
                    {traduire("encore {0} kg", formatKg(chemin.reste))}
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
                {`${plan.choisie ? traduire('ta date du cap') : traduire('arrivée prévue')} ${arrivee}`}
              </Ink>
            ) : null}
          </View>
        </Press>
      ) : goal === null && !exemple ? (
        <Press onPress={() => router.push('/profile' as any)} accessibilityRole="button" accessibilityLabel={traduire("Fixer ton cap de poids")}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 18, marginTop: 10, paddingVertical: 12, marginBottom: 4, borderTopWidth: 1, borderColor: P.line2 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#F6EFD9', alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={26} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={14.5} weight="extraBold" numberOfLines={1}>
                {traduire("Fixe ton cap")}</Ink>
              <Ink size={12.5} weight="medium" color={P.ink2} numberOfLines={2}>
                {traduire("Ton torii et ton rythme prévu apparaissent sur ta courbe")}</Ink>
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
        <Press onPress={() => setFeuille({ quoi: null })} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Ton objectif : {0}{1}. Changer ton début, ton objectif ou ta date du cap", objectifTxt, plan.torii ? `, date du cap le ${jourCourt(plan.torii)}` : '')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginHorizontal: 18, marginTop: chemin ? -6 : 0, marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderColor: P.line2 }}>
            <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
              {traduire("Ton objectif : {0}", objectifTxt)}
            </Ink>
            <Ink size={12.5} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
              {traduire("Changer")}</Ink>
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

  // 27 octobre 2026 (refonte Ciel, choisie par Houari) : un grand rectangle sur toute la largeur, en carrousel.
  // 27 octobre 2026 soir (Houari : « la page 3 avec les paliers, je l'adore ») : deux pages seulement. Page 1 ton poids
  // en tete puis ton chemin en paliers et ton objectif (c'est elle qui porte les citrouilles et les sapins), page 2 ta courbe.
  // La carte passe en blanc pur avec l'ombre des autres cartes et un voile lilas pastel en haut : l'ancien fond
  // #E8ECFF se confondait avec le fond de l'app. Memes calculs qu'avant.
  const fg = P.ink;
  const fg2 = P.ink2;
  const fg3 = P.muted;
  const chiffreC = theme.colors.accentText;
  const sombre = paletteSombre();
  const lilas = sombre ? '#2C2A55' : '#EEEBFF';
  const pageCourbe = curve.length > 1 || periode === PERIODE_PLAN;
  const nbPages = 1 + (pageCourbe ? 1 : 0);
  const pageVue = Math.min(page, nbPages - 1);
  const W = Math.max(1, largeurCarte);
  // la courbe prend la hauteur laissee par la page 1, entre 136 et 196 points : pas de grand vide sous la courbe
  const hCourbe = Math.round(Math.max(COURBE_MIN, Math.min(COURBE_MAX, hautPage1 - CHROME_PAGE_COURBE - (fond ? 4 : 0))));

  // « depuis ton début » sur la page 1, quelle que soit la periode choisie sur la courbe (la source unique)
  const variation = etat.variation;
  const versDebut = variation != null && goal !== null && mode !== 'maintien' && ((lossGoal && variation < 0) || (!lossGoal && variation > 0));
  const ligneDebut =
    variation != null && Math.abs(variation) >= 0.05 ? (
      <Ink size={13} weight="bold" color={fg2} style={{ flexShrink: 1 }}>
        <Ink size={13} weight="extraBold" color={versDebut ? POIDS.capText : fg}>
          {`${variation < 0 ? '−' : '+'}${formatKg(Math.abs(variation))} kg`}
        </Ink>
        {` ${PERIODE_TEXTE[PERIODE_PLAN]}`}
      </Ink>
    ) : variation != null ? (
      <Ink size={13} weight="bold" color={fg2} style={{ flexShrink: 1 }}>
        {traduire("stable {0}", PERIODE_TEXTE[PERIODE_PLAN])}
      </Ink>
    ) : (
      ligneEcart(fg2, POIDS.softText, POIDS.capText, fg)
    );

  // Page 1 : ton poids en tete (l'ancienne page Ton poids), puis ton chemin en paliers et ton objectif
  const pageUne = (
    <View
      style={{ width: W, alignSelf: 'flex-start', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 0, gap: 8 }}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - hautPage1) > 1) setHautPage1(h);
      }}
    >
      <Press onPress={openDetail} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("{0}. Voir le détail", a11y)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Ink size={11} weight="black" color={P.indigo} numberOfLines={1} style={{ letterSpacing: 1.4 }}>
              {(isToday ? traduire('Ton poids') : `${traduire('Ton poids')}, ${relativeDay(last.date)}`).toUpperCase()}
            </Ink>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
              <Ink size={28} weight="black" tight numberOfLines={1} color={fg} style={{ fontVariant: ['tabular-nums'], letterSpacing: -0.8 }}>
                {formatKg(last.value)}
              </Ink>
              <Ink size={12} weight="black" color={chiffreC}>
                {'kg'}
              </Ink>
            </View>
            <View style={{ marginTop: 2, flexDirection: 'row' }}>{ligneDebut}</View>
          </View>
          {chemin ? (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <AnneauChemin part={chemin.part} />
              <Ink size={12} weight="black" color={chiffreC} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
                {`${Math.round(chemin.part * 100)} %`}
              </Ink>
            </View>
          ) : null}
        </View>
        {phrase ? (
          <Ink size={12.5} weight="bold" color={fg2} style={{ marginTop: 4, lineHeight: 17 }}>
            {phrase.avant}
            <Ink size={12.5} weight="black" color={phrase.ton === 'gris' ? fg : couleurTon(phrase.ton)}>
              {phrase.cle}
            </Ink>
            {phrase.apres}
          </Ink>
        ) : null}
        {eauTxt ? (
          <Ink size={11.5} weight="bold" color={fg3} style={{ marginTop: 2, lineHeight: 15 }}>
            {eauTxt}
          </Ink>
        ) : null}
      </Press>
      {chemin ? (
        <Press onPress={openDetail} haptic="none" accessibilityRole="button" accessibilityLabel={traduire("{0}{1}. Voir le détail de ton poids", atteint ? traduire('Torii atteint') : traduire("{0} % du chemin, encore {1} kilos", Math.round(chemin.part * 100), formatKg(chemin.reste)), arrivee ? traduire(", arrivée prévue {0}", arrivee) : '')}>
          <View style={{ gap: 6, paddingTop: 8, borderTopWidth: 1, borderColor: P.line2 }}>
            {/* le titre sur sa ligne, la date sur la sienne : rien n'est jamais coupe */}
            <View style={{ gap: 2 }}>
              <Ink size={atteint ? 16 : 18} weight="black" tight color={chiffreC}>
                {atteint ? traduire('Torii atteint') : traduire("{0} % du chemin", Math.round(chemin.part * 100))}
              </Ink>
              {arrivee ? (
                <Ink size={12.5} weight="bold" color={fg2}>
                  {`${plan.choisie ? traduire('ta date du cap') : traduire('arrivée prévue')} ${arrivee}`}
                </Ink>
              ) : null}
            </View>
            {/* 27 octobre 2026 soir (Houari : « des paliers qui donnent envie ») : la barre en 4 paliers, le torii au bout */}
            {goal !== null ? <BarrePaliers depart={start} objectif={goal} part={chemin.part} atteint={atteint} fg2={fg2} chiffreC={chiffreC} /> : null}
            {(() => {
              const pr = goal !== null && !atteint ? paliersDuChemin(start, goal, last.value, chemin.part).prochain : null;
              if (!pr) return null;
              return (
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', minHeight: 28, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: sombre ? '#2C3866' : '#DCE3FF', maxWidth: '100%' }}>
                  <Ink size={12.5} weight="bold" color={sombre ? '#C9D4FF' : '#23358F'} style={{ flexShrink: 1 }}>
                    {pr.dernier ? traduire('Dernier palier : ton objectif, ') : traduire('Prochain palier : {0} kg, ', formatKg(pr.kg))}
                    <Ink size={12.5} weight="black" color={sombre ? '#FFFFFF' : '#23358F'}>
                      {traduire('encore {0} kg', formatKg(pr.dernier ? chemin.reste : pr.encore))}
                    </Ink>
                  </Ink>
                </View>
              );
            })()}
          </View>
        </Press>
      ) : goal === null ? (
        <Press onPress={() => router.push('/profile' as any)} accessibilityRole="button" accessibilityLabel={traduire("Fixer ton cap de poids")}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderColor: P.line2 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: lilas, alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={22} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={16} weight="black" color={fg}>
                {traduire("Fixe ton cap")}</Ink>
              <Ink size={12.5} weight="medium" color={fg2}>
                {traduire("Ton torii et ton rythme prévu apparaissent sur ta courbe")}</Ink>
            </View>
            <Icon name="chevron" size={15} color={fg2} width={2.6} />
          </View>
        </Press>
      ) : null}
      {objectifTxt ? (
        <TourAnchor id="accueil.objectif">
        <Press onPress={() => setFeuille({ quoi: null })} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Ton objectif : {0}{1}. Changer ton début, ton objectif ou ta date du cap", objectifTxt, plan.torii ? `, date du cap le ${jourCourt(plan.torii)}` : '')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: P.line2 }}>
            <Ink size={12.5} weight="bold" color={fg2} style={{ flexShrink: 1 }}>
              {traduire("Ton objectif : {0}", objectifTxt)}
            </Ink>
            <View style={{ paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: lilas, justifyContent: 'center' }}>
              <Ink size={12.5} weight="extraBold" color={chiffreC} numberOfLines={1}>
                {traduire("Changer")}</Ink>
            </View>
          </View>
        </Press>
        </TourAnchor>
      ) : null}
    </View>
  );

  // Page 2 : ta courbe, sur son panneau, sans changement sur le fond ; le doigt ne la suit qu'apres un appui maintenu
  const pageDeLaCourbe = pageCourbe ? (
    <View style={{ width: W, paddingTop: 16, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20, paddingHorizontal: 16, marginBottom: 8 }}>
        <Ink size={13} weight="extraBold" color={fg2} numberOfLines={1} style={{ flexShrink: 1 }}>
          {traduire("Ta courbe de poids")}</Ink>
        {/* le chiffre suit ton doigt sur la courbe */}
        <Ink size={12.5} weight="extraBold" color={chiffreC} numberOfLines={1}>
          {follow && scrub ? `${formatKg(bigValue)} kg, ${quand}` : `${formatKg(last.value)} kg`}
        </Ink>
      </View>
      <View style={{ marginHorizontal: 10, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingTop: 4, paddingBottom: 6, overflow: 'hidden' }}>
        <SceneCourbe scene={fond} style={{ marginHorizontal: 6, marginTop: 4, paddingBottom: fond ? 4 : 0 }}>
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
            height={hCourbe}
            surScene={!!fond}
            compact
            legende={legende}
            projection={etat.projection?.points ?? null}
            onScrub={setScrub}
            onPress={() => setLegende((v) => !v)}
            onToriiPress={planOk ? () => setPeriod(PERIODE_PLAN) : undefined}
            suiviApresAppui
            label={traduire("Ta courbe de poids {0}. Touche pour {1} la légende", periode === PERIODE_PLAN ? traduire('sur ton plan, jusqu’au torii') : LANG === 'fr' ? periodeTxt.replace('en ', 'sur ') : periodeTxt, legende ? traduire('cacher') : traduire('voir'))}
          />
        </SceneCourbe>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, marginTop: 6 }}>
          {largeur >= 400 ? <View style={{ width: BOUTON_STYLE_L }} /> : null}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <PeriodSwitch value={periode} onChange={setPeriod} options={options} variant="onglets" />
          </View>
          <BoutonStyle onPress={() => router.push(ROUTES_PERSONNALISER.styleCourbe as any)} />
        </View>
      </View>
    </View>
  ) : null;

  return (
    <View
      nativeID="carte-poids"
      testID="carte-poids"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - largeurCarte) > 0.25) {
          setLargeurCarte(w);
          // la page affichee reste calee sur la nouvelle largeur
          if (page > 0) requestAnimationFrame(() => (pagesRef.current as any)?.scrollTo?.({ x: page * w, animated: false }));
        }
      }}
      style={[{ borderRadius: 28, backgroundColor: P.white }, ombreCarte]}
    >
      <View style={{ borderRadius: 28, overflow: 'hidden' }}>
        <LinearGradient
          pointerEvents="none"
          colors={[sombre ? VOILE_CARTE_POIDS.sombre : VOILE_CARTE_POIDS.clair, P.white]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          // un bord blanc de 5 tout autour du voile : la carte se detache nettement du fond de l'app
          style={{ position: 'absolute', left: 5, right: 5, top: 5, height: VOILE_CARTE_POIDS.hauteur, borderTopLeftRadius: 23, borderTopRightRadius: 23 }}
        />
        <PagesScroll
          ref={pagesRef as any}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          style={{ width: W }}
          contentContainerStyle={{ width: W * nbPages }}
          onScroll={(e) => {
            const p = Math.max(0, Math.min(nbPages - 1, Math.round(e.nativeEvent.contentOffset.x / W)));
            if (p !== page) setPage(p);
          }}
          accessibilityLabel={traduire("Ton poids et ton objectif, puis ta courbe. Glisse pour changer de page")}
        >
          {pageUne}
          {pageDeLaCourbe}
        </PagesScroll>
        {/* les points de pagination sur leur propre rangee, centres sous les pages : ils ne touchent plus aucun bouton */}
        <PointsPages nb={nbPages} page={pageVue} couleur={chiffreC} inactif={P.pointInactif} />
        {/* le liseré fin des autres cartes, pose par dessus : il ne retire aucun point a la largeur des pages */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28, borderWidth: 1, borderColor: P.line2 }} />
      </View>
      <FeuilleObjectif visible={!!feuille} quoi={feuille?.quoi ?? null} onClose={() => setFeuille(null)} etat={etat} series={series} today={today} cle={plan.cle} />
    </View>
  );
}
