/**
 * Paywall unique de YOROI Premium : fin de l'onboarding (source onboarding) et depuis l'app (source app).
 * 28 octobre 2026, maquette A « Ton plan d'abord » (Houari l'a choisie), avec la carte « Gratuit pour toujours » de la C.
 * De haut en bas :
 *  1. la croix (ou le retour) et Restaurer ;
 *  2. YOROI PREMIUM en bleu, « Ton chemin vers 74 kg, en entier. » (ton cap, sinon garder ton poids, sinon ton plan),
 *     l'essai et sa vraie duree du store seulement si tu y as droit, et ce qui reste gratuit ;
 *  3. ta carte « Ton plan » : ton personnage en entier sur ta scene (par defaut la Salle d'armes et le Rōnin), ton objectif,
 *     ton poids de depart vers ton cap, tes seances par semaine et l'arrivee prevue (vraies valeurs, jamais inventees).
 *     Venu d'une fonction payante (lib/v2/premium/sources.ts) : l'apercu de cette fonction prend cette place, en tete ;
 *  4. « Ce qui t'y mène plus vite » : ta courbe complete jusqu'au torii, tes macros par jour en anneau ;
 *  5. « Et tout le reste » : sport par sport, ton monde, tes progres, ton combat (seulement si tu en fais) ;
 *  6. la vraie note des stores, puis « Gratuit pour toujours » (pesee, seances, coach, semaine, chronos, Dojo) ;
 *  7. le choix de l'offre : l'annuel mis en avant (equivalent mensuel, economie et scene exclusive), le mensuel dessous ;
 *  8. ce qui se passe apres, la reassurance, les mentions legales (3.1.2) et les liens.
 * Colle en bas, TOUJOURS visible : le bouton principal partage (components/yoroi/v2/ui/BoutonPrincipal.tsx), le vrai prix
 * dessous, et « Continuer gratuitement ». Sans offres, il dit « Réessayer » (ou « Abonnement indisponible ici »).
 * Aucun prix ecrit en dur : tout vient de l'offering current (prix d'exemple marques comme tels, seulement dans
 * l'apercu du Studio quand le store ne renvoie rien). Briques d'affichage : components/yoroi/v2/premium/PlanA.tsx.
 * Version d'avant : _archive_ancien_design_2026-10-09/paywall_A_2026-10-28/premium/Paywall.tsx.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import Animated, { Easing, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { GOALS } from '@/components/yoroi/v2/onboarding/Objectif';
import { ENCRES } from '@/components/yoroi/v2/onboarding/couleurs';
import type { LignePlan } from '@/components/yoroi/v2/premium/TonPlan';
import { CarteGratuit, Capitales, ChargeProgres, HerosPlan, MiniTuile, NoteLigne, OffreCarte, RangeeMonde, Reassurance, RoundsCombat, SemaineSports, TuileCourbe, TuileMacros, usePw } from '@/components/yoroi/v2/premium/PlanA';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { estimerArrivee, fourchetteDates } from '@/lib/v2/pesee/estimation';
import { isoDuTemps, type Ligne } from '@/lib/v2/pesee/ligneDirectrice';
import { arriveePrevueTexte, toriiDuJour } from '@/lib/v2/pesee/arrivee';
import { lireToriiGarde } from '@/lib/v2/pesee/usePlanPoids';
import { toDailySeries } from '@/lib/v2/weightStats';
import { kg } from '@/components/yoroi/v2/onboarding/ui';
import { VeiledCurve } from '@/components/yoroi/v2/charts/VeiledCurve';
import { usePremium, type PremiumPackage } from '@/context/PremiumContext';
import { PREVIEW_PURCHASE_MESSAGE } from '@/lib/v2/creator/purchasePreview';
import { EXAMPLE_PACKAGES, previewTrial, usePaywallVariant } from '@/lib/v2/creator/paywallVariant';
import * as Notifications from 'expo-notifications';
import { savingsPercent, sortOffers, trialFor, type OfferInfo } from '@/lib/v2/premium/offer';
import { offresEvent, paywallEvent } from '@/lib/v2/premium/events';
import { SOURCES, estSourcePremium, type SourcePaywall, type SourcePremium } from '@/lib/v2/premium/sources';
import { longDate, scheduleTrialReminder, storeName } from '@/lib/v2/onboarding/trial';
import { getProfile, getWeights } from '@/lib/database';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { getArmureState } from '@/lib/v2/armure';
import { GUERRIER_IMAGES, CLASSIQUE_IMAGES, MONDE_PERSONNAGES, packImage, parsePersonnage } from '@/lib/v2/dojo/personnages';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { SCENES_CLASSIQUE, estSceneClassique } from '@/lib/v2/espace/classique';
import type { SceneId } from '@/lib/v2/espace';
import { personnageImage as personnageAccueil, sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { LiensLegaux, LienLegalTexte } from '@/components/yoroi/v2/premium/LiensLegaux';
import { faitDuCombat, regleePersonnage, type ObjectifPour } from '@/lib/v2/premium/pourToi';
import { getUserSettings } from '@/lib/storage';
import { CHRONO_COMBAT, apercuNutrition, joursPrevus } from '@/lib/v2/premium/apercus';
import { stickerSport } from '@/components/yoroi/v2/onboarding/SemaineCouleurs';
import type { ApercuNutrition as ApercuNutritionDonnees } from '@/lib/v2/premium/apercus';
import { ApercuMur, StickerMur } from '@/components/yoroi/v2/premium/ApercuMur';
import { ageDepuisNaissance } from '@/lib/v2/onboarding/trancheAge';
import { basAtteint } from '@/lib/v2/premium/defilement';
import { ApercuDansBarre, useApercuVisible } from '@/components/yoroi/v2/studio/PreviewBar';
import { safeOpenURL } from '@/lib/security/validators';
import { playLevelUpSound } from '@/lib/soundManager';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, LANG } from '@/lib/i18n/tr';
import { sticker } from '@/components/yoroi/v2/stickers';

const CASTLE = require('@/assets/avatars/app/monde/fonds/verticale_chateau.webp');
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const GUTTER = 20;
const DAY = 86400000;
const REMINDER_DAYS = 2;
/** Expo Go : RevenueCat n'y vend rien, l'achat ne marche que dans l'app installee */
const IN_EXPO_GO = (() => {
  const env = String((Constants as { executionEnvironment?: unknown }).executionEnvironment ?? '');
  return env === 'storeClient' || env === 'expo' || Constants.appOwnership === 'expo';
})();

/** vague 32 : copie web et Expo Go, ou le store ne peut pas donner de prix */
const TEST_BUILD = IN_EXPO_GO || Platform.OS === 'web';

export type PaywallSource = 'onboarding' | 'app';

type Recap = { name?: string; genre?: 'h' | 'f'; target?: number | null; sessions?: number | null; goal?: string | null; start?: number | null; height?: number | null; recompo?: boolean; univers?: ChoixUnivers;
  /** 27 octobre 2026 : tous tes objectifs, tes sports et le genre « autre », pour les cartes et le personnage */
  goals?: ObjectifPour[]; sports?: string[]; autre?: boolean;
  /** 27 octobre 2026 : la scene choisie a l'onboarding (ecran Ta scene) */
  scene?: string | null;
  /** 28 octobre 2026 : tes jours d'entrainement choisis a l'onboarding (0 = lundi) */
  jours?: number[] };

type Me = {
  name: string;
  genre: 'h' | 'f';
  goal: string | null;
  target: number | null;
  sessions: number | null;
  rankIndex: number;
  personnage: string | null;
  scene: ReturnType<typeof sceneMeta>;
  /** vague 48 : la scene de ton accueil (null avant lecture de l'espace) */
  sceneId: SceneId | null;
  weights: { t: number; v: number }[];
  /** vague 32 : poids du jour (derniere pesee de moins de 30 jours, ou celle de l'onboarding), taille, recomposition */
  start: number | null;
  height: number | null;
  /** 27 octobre 2026 : ton age (date de naissance du profil), pour l'apercu nutrition ; null a l'onboarding */
  age: number | null;
  recompo: boolean;
  /** 27 octobre 2026 : tes objectifs (onboarding ou espace), tes sports, genre declare « autre » */
  objectifs: ObjectifPour[];
  sports: string[];
  autre: boolean;
  /** 28 octobre 2026 : tes jours d'entrainement (onboarding ou espace, joursSemaine), 0 = lundi ; vide : selon ton rythme */
  jours: number[];
};

/** vague 50 : de vraies dates, « du 28 janv. au 15 mai », « le 18 oct. » (lib/v2/pesee/estimation.ts) */
function arriveeCourte(earliest: string, latest: string): string {
  return fourchetteDates(earliest, latest);
}


type Celebrate = { trialEnd: Date | null; restored: boolean };

/** L'armure Premium, toujours en silhouette classique */
const shogun = (g: 'h' | 'f') => GUERRIER_IMAGES[g === 'f' ? 'f' : 'h'][4];

/** Vague 45 : l'illustration Premium suit l'univers choisi. Classique : le Champion ; Sans personnage : aucune figure. */
const heroPremium = (personnage: string | null | undefined, g: 'h' | 'f') => {
  const k = personnage ? parsePersonnage(personnage).kind : 'guerrier';
  if (k === 'aucun') return null;
  if (k === 'classique') return CLASSIQUE_IMAGES[g === 'f' ? 'f' : 'h'][4];
  return shogun(g);
};

const dayMonth = (d: Date) => format(d, 'd MMMM', { locale: fr });

/** vague 48 : sans personnage, l'en-tete montre le produit : une courbe d'exemple (style 1) qui descend vers le torii de son cap */
/**
 * 27 octobre 2026 (Houari : « objectif perdre du poids, et la courbe montre l'inverse ») : l'exemple suit le sens de
 * ton objectif. Avec ton poids et ton cap : huit semaines de ton poids vers ton cap (60 % du chemin) ; sans eux,
 * l'exemple d'avant, qui descend. Toujours marque « Exemple ».
 */
function courbeExemple(start: number | null, target: number | null): { points: { date: string; value: number }[]; cap: number; torii: string } {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const points: { date: string; value: number }[] = [];
  const avecPlan = start != null && target != null && Math.abs(start - target) >= 0.5;
  const debut = avecPlan ? (start as number) : 82.6;
  const fin = avecPlan ? debut + ((target as number) - debut) * 0.6 : 79.6;
  for (let i = 56; i >= 0; i -= 4) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12);
    const tendance = fin + (i / 56) * (debut - fin);
    points.push({ date: iso(d), value: Math.round((tendance + (i % 8 === 0 ? 0.35 : -0.2)) * 10) / 10 });
  }
  const torii = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 12);
  return { points, cap: avecPlan ? (target as number) : 78, torii: iso(torii) };
}

/** L'exemple a de petites oscillations (une pesee isolee) : en tuile de 140 points, sa moyenne glissante sur 3 semaines */
function lisserExemple(v: number[]): number[] {
  return v.map((_, i) => {
    const f = v.slice(Math.max(0, i - 1), Math.min(v.length, i + 2));
    return f.reduce((a, b) => a + b, 0) / f.length;
  });
}

/** Une seule formule partout (vague 31) : « 7 jours gratuits », « 14 jours gratuits », « 1 jour gratuit ». La duree vient du store. */
function essaiGratuit(days: number): string {
  return days > 1 ? traduire("{0} jours gratuits", days) : traduire('1 jour gratuit');
}

/** « d’un an », « d’un mois », « de 3 mois », « d’une semaine » */
function deDuree(d: string): string {
  // Hors français, la durée est déjà traduite : « 1 year subscription », « Abo 1 Jahr »
  if (LANG !== 'fr') return d;
  if (d === '1 semaine') return traduire('d’une semaine');
  if (d.startsWith('1 ')) return traduire("d’un {0}", d.slice(2));
  return traduire("de {0}", d);
}

// ===== Animation d'entree : une seule fois, puis ecran calme =====

function useReveal() {
  const reduce = useReducedMotion();
  const bg = useSharedValue(reduce ? 1 : 0);
  const armor = useSharedValue(reduce ? 1 : 0);
  const halo = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.out(Easing.cubic);
    bg.value = withTiming(1, { duration: 900, easing: ease });
    halo.value = withDelay(200, withTiming(1, { duration: 900, easing: ease }));
    armor.value = withDelay(300, withTiming(1, { duration: 800, easing: ease }));
  }, [reduce, bg, armor, halo]);
  const bgStyle = useAnimatedStyle(() => ({ opacity: 0.4 + bg.value * 0.6, transform: [{ scale: 1.08 - bg.value * 0.08 }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value, transform: [{ scale: 0.7 + halo.value * 0.3 }] }));
  const armorStyle = useAnimatedStyle(() => ({ opacity: armor.value, transform: [{ translateY: (1 - armor.value) * 46 }, { scale: 0.9 + armor.value * 0.1 }] }));
  return { bgStyle, haloStyle, armorStyle };
}

function Halo({ size, color, id }: { size: number; color: string; id: string }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.75} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

// ===== Courbe de poids (vraies pesees, moyenne par semaine) =====

function weeklyPoints(list: { t: number; v: number }[]): { t: number; v: number }[] {
  if (list.length === 0) return [];
  const t0 = list[0].t;
  const buckets = new Map<number, { t: number; sum: number; n: number }>();
  for (const p of list) {
    const k = Math.floor((p.t - t0) / (7 * DAY));
    const b = buckets.get(k) ?? { t: 0, sum: 0, n: 0 };
    b.t += p.t;
    b.sum += p.v;
    b.n += 1;
    buckets.set(k, b);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => ({ t: b.t / b.n, v: b.sum / b.n }));
}

function WeightCurve({ points, width, height, color, surface, ligne, torii }: { points: { t: number; v: number }[]; width: number; height: number; color: string; surface: string; ligne?: Ligne | null; torii?: string | null }) {
  // vague 30 : vraie courbe lissee, nette sur les premieres semaines puis estompee sous un voile (charts/VeiledCurve)
  // vague 49 : avec ton rythme prevu (bande « ton allure » et tirets verts)
  return <VeiledCurve points={points} width={width} height={height} color={color} surface={surface} ligne={ligne} torii={torii} />;
}

// ===== Ecran =====

export function Paywall({ source, origine, compteur, preview, recap, onFinish, onBack, onClose }: {
  source: PaywallSource;
  /** d'ou vient le paywall (mur Premium, reglages...), pour la mesure et l'apercu du contenu bloque */
  origine?: SourcePaywall;
  /** compteur reel passe par le mur (photos deja prises...), null sinon */
  compteur?: number | null;
  preview: boolean;
  /** reponses en cours de l'onboarding (prioritaires sur les donnees enregistrees) */
  recap?: Recap;
  onFinish: (how: 'free' | 'premium') => void;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // 28 octobre 2026 (maquette A) : pastels, cartes blanches, indigo et bleu de la maquette (PlanA.tsx)
  const pw = usePw();
  // 27 octobre 2026 (refonte Pastel) : le fond de page de l'app (#F5F6FB), plus le bleu des pages Programmes
  const page = c.background;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isPremium: realPremium, packages: storePackages, offersStatus: storeStatus, offersAttempt, offersRecovered, reloadOffers, trialEligibility, purchase, restore, refresh } = usePremium();
  // source envoyee a la mesure : celle du mur ou de l'entree, sinon l'endroit (onboarding ou app)
  const src: SourcePaywall = origine ?? (source === 'onboarding' ? 'onboarding' : 'app');
  const mur = estSourcePremium(origine) ? SOURCES[origine] : null;
  // Studio : variante forcee, appliquee seulement en apercu (achat bloque, aucun appel au store)
  const forcedVariant = usePaywallVariant();
  const variant = preview ? forcedVariant : 'reel';
  const exemple = variant !== 'reel' && variant !== 'erreur' && variant !== 'chargement' && storePackages.length === 0;
  const packages = variant === 'erreur' || variant === 'chargement' ? [] : exemple ? EXAMPLE_PACKAGES : storePackages;
  const offersStatus: typeof storeStatus = variant === 'erreur' ? 'error' : variant === 'chargement' ? 'loading' : exemple ? 'ready' : storeStatus;
  const forcedTrial = useMemo(() => (variant === 'essai' || variant === 'bienvenue' ? previewTrial() : null), [variant]);
  const trialOf = (raw: unknown) => (variant === 'reel' ? trialFor(raw, trialEligibility) : forcedTrial);
  // en apercu, l'ecran se montre comme a un compte gratuit
  const isPremium = preview ? false : realPremium;

  // vague 49 : ton rythme prevu sur la courbe de 6 mois (debut du plan du profil, sinon ta premiere pesee de la periode)
  // 17 octobre : aPlan (un plan existe, hors onboarding) et arrivee (« le 22 novembre », la date du torii)
  const [plan6, setPlan6] = useState<{ ligne: Ligne | null; torii: string | null; aPlan: boolean; arrivee: string | null }>({ ligne: null, torii: null, aPlan: false, arrivee: null });
  const [me, setMe] = useState<Me>(() => ({
    name: recap?.name?.trim() ?? '',
    genre: recap?.genre ?? 'h',
    // 28 octobre 2026 : l'objectif de l'onboarding des la premiere image (avant la lecture du profil)
    goal: recap?.goal ?? null,
    target: recap?.target ?? null,
    sessions: recap?.sessions ?? null,
    rankIndex: 0,
    personnage: null,
    scene: sceneMeta('dojo'),
    sceneId: null,
    weights: [],
    start: recap?.start ?? null,
    height: recap?.height ?? null,
    age: null,
    recompo: recap?.recompo ?? false,
    objectifs: recap?.goals ?? [],
    sports: recap?.sports ?? [],
    jours: recap?.jours ?? [],
    autre: recap?.autre ?? false,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState<Celebrate | null>(null);
  // Reessayer touche dans un apercu force du Studio : indicateur bref, aucun appel au store
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    paywallEvent('affichage', { source: src, apercu: preview });
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // vague 48 : l'en-tete (ton personnage, ta scene) se lit tout de suite dans l'espace, sans attendre la base
  useEffect(() => {
    let alive = true;
    getEspace()
      .then((e) => {
        if (alive) setMe((prev) => ({ ...prev, personnage: e.personnage ?? null, scene: sceneMeta(e.scene), sceneId: e.scene ?? null }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // ton plan : profil, espace et pesees des 6 derniers mois
  useEffect(() => {
    let alive = true;
    (async () => {
      const [profile, espace, armure, weights, toutes, memoTorii, reglages] = await Promise.all([
        getProfile().catch(() => null),
        getEspace().catch(() => null),
        getArmureState().catch(() => null),
        getWeights(183).catch(() => []),
        getWeights().catch(() => []),
        lireToriiGarde().catch(() => null),
        recap ? Promise.resolve(null) : getUserSettings().catch(() => null),
      ]);
      if (!alive) return;
      const since = Date.now() - 183 * DAY;
      const pts = (weights ?? [])
        .map((w) => ({ t: Date.parse(String(w.date).length <= 10 ? `${w.date}T12:00:00` : String(w.date)), v: Number(w.weight) }))
        .filter((p) => Number.isFinite(p.t) && p.t >= since && p.v > 0)
        .sort((a, b) => a.t - b.t);
      const profileGenre: 'h' | 'f' | null = profile?.avatar_gender === 'femme' ? 'f' : profile?.avatar_gender === 'homme' ? 'h' : null;
      {
        const capPlan = recap?.target !== undefined ? recap.target : profile?.target_weight ?? null;
        const todayIso = isoDuTemps(Date.now());
        // 17 octobre : le torii de la carte Poids (lib/v2/pesee/arrivee.ts, source unique), plus un calcul a part
        const series = toDailySeries((toutes ?? []).filter((w) => w && Number(w.weight) > 0));
        const t = toriiDuJour({ profil: profile, series, cap: capPlan ?? null, today: todayIso, memo: memoTorii ?? null });
        // hors onboarding, ton plan existe deja : « Arrivée prévue » montre la date de ton torii, rien d'autre
        const aPlan = !recap && !!t.plan;
        setPlan6({ ligne: t.ligne, torii: t.torii, aPlan, arrivee: aPlan ? arriveePrevueTexte(t, todayIso) : null });
      }
      setMe((prev) => ({
        name: recap?.name !== undefined ? recap.name.trim() : (profile?.name ?? '').trim(),
        genre: recap?.genre ?? profileGenre ?? prev.genre,
        goal: recap?.goal !== undefined ? recap.goal : profile?.weight_goal ?? null,
        target: recap?.target !== undefined ? recap.target : profile?.target_weight ?? null,
        sessions: recap?.sessions ?? (objectifVise(espace) || null),
        rankIndex: armure?.rank?.index ?? 0,
        personnage: espace?.personnage ?? null,
        scene: sceneMeta(espace?.scene),
        sceneId: espace?.scene ?? null,
        weights: pts,
        start: recap?.start != null ? recap.start : pts.length && pts[pts.length - 1].t >= Date.now() - 30 * DAY ? pts[pts.length - 1].v : null,
        height: recap?.height ?? profile?.height_cm ?? null,
        age: ageDepuisNaissance(profile?.birth_date) ?? (profile?.age && profile.age > 0 ? profile.age : null),
        recompo: recap?.recompo ?? false,
        objectifs: recap?.goals ?? (espace?.objectifs?.length ? espace.objectifs : recap?.goal ? [recap.goal as ObjectifPour] : profile?.weight_goal ? [profile.weight_goal as ObjectifPour] : []),
        sports: recap?.sports ?? espace?.sportsFavoris ?? [],
        jours: recap?.jours ?? espace?.joursSemaine ?? [],
        autre: recap?.autre ?? reglages?.genreDeclare === 'autre',
      }));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Offres =====
  const offers = useMemo(() => sortOffers<PremiumPackage>(packages), [packages]);
  const annual = offers.find((o) => o.info.kind === 'annual') ?? null;
  const monthly = offers.find((o) => o.info.kind === 'monthly') ?? null;
  const others = offers.filter((o) => o !== annual && o !== monthly);
  const savings = savingsPercent(annual?.info ?? null, monthly?.info ?? null);
  const selected = offers.find((o) => o.pkg.identifier === selectedId) ?? offers[0] ?? null;
  const trial = selected ? trialOf(selected.pkg.raw) : null;
  const annualTrial = annual ? trialOf(annual.pkg.raw) : null;
  const reminderPossible = trial ? trial.end.getTime() - REMINDER_DAYS * DAY > Date.now() + 3600000 : false;
  const store = storeName();

  // apercu du Studio : la bienvenue Premium s'ouvre tout de suite
  useEffect(() => {
    if (variant === 'bienvenue') setCelebrate({ trialEnd: (forcedTrial ?? previewTrial()).end, restored: false });
    else if (variant === 'restaure') setCelebrate({ trialEnd: null, restored: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const pick = (o: { pkg: PremiumPackage; info: OfferInfo }) => {
    if (o.pkg.identifier === selected?.pkg.identifier) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedId(o.pkg.identifier);
    paywallEvent('choix_formule', { source: src, formule: o.info.kind, produit: o.info.productId });
  };

  const startCelebration = (next: Celebrate) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    void playLevelUpSound();
    setCelebrate(next);
  };

  const doRestore = useCallback(async () => {
    if (preview) {
      appAlert(traduire('Aperçu'), PREVIEW_PURCHASE_MESSAGE);
      return;
    }
    setBusy(true);
    const res = await restore();
    setBusy(false);
    paywallEvent('restauration', { source: src, resultat: res.success ? (res.restored ? 'retrouve' : 'aucun') : 'erreur' });
    if (res.success && res.restored) startCelebration({ trialEnd: null, restored: true });
    else if (res.success) appAlert(traduire('Aucun achat trouvé'), traduire("Aucun abonnement actif n’est associé à ce compte {0}.", store));
    else if (res.error) appAlert(traduire('Restauration impossible'), res.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, restore, src, store]);

  const buy = async () => {
    if (!selected || busy) return;
    paywallEvent('appui_bouton', { source: src, formule: selected.info.kind, essai: Boolean(trial) });
    if (preview) {
      appAlert(traduire('Aperçu'), PREVIEW_PURCHASE_MESSAGE);
      return;
    }
    setBusy(true);
    const res = await purchase(selected.pkg);
    setBusy(false);
    if (res.success) {
      paywallEvent('achat_reussi', { source: src, formule: selected.info.kind, essai: Boolean(trial) });
      startCelebration({ trialEnd: trial?.end ?? null, restored: false });
      return;
    }
    if (res.cancelled) {
      paywallEvent('achat_annule', { source: src, formule: selected.info.kind });
      return;
    }
    paywallEvent('achat_erreur', { source: src, formule: selected.info.kind, raison: res.needsRestore ? 'acces_inactif' : 'erreur' });
    if (res.needsRestore) {
      appAlert(traduire('Achat validé, Premium pas encore actif'), res.error, [
        { text: traduire('Plus tard'), style: 'cancel' },
        { text: traduire('Restaurer mes achats'), onPress: () => void doRestore() },
      ]);
    } else if (res.error) {
      appAlert(traduire('Achat impossible'), res.error);
    }
  };

  // sans offres : le bouton du pied dit « Réessayer » et relance le chargement (jamais de faux prix, jamais d'essai promis)
  const retryOffers = () => {
    if (busy || offersStatus === 'loading' || retrying) return;
    paywallEvent('appui_bouton', { source: src, formule: 'aucune', essai: false, offres: offersStatus });
    // apercu force du Studio : aucun appel au store
    if (preview && variant !== 'reel') {
      setRetrying(true);
      setTimeout(() => setRetrying(false), 900);
      return;
    }
    void reloadOffers();
  };

  // mesure du chargement des offres : erreur finale, nouvelle tentative, offres recuperees apres un echec
  // la tentative deja faite au demarrage de l'app ne compte pas : seulement celles vues sur ce paywall
  const tentativeVue = React.useRef(offersAttempt);
  useEffect(() => {
    if (preview || offersAttempt < 2 || offersAttempt === tentativeVue.current) return;
    tentativeVue.current = offersAttempt;
    offresEvent('paywall_offerings_retry', { source: src, tentative: offersAttempt });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offersAttempt]);
  useEffect(() => {
    if (preview) return;
    if (storeStatus === 'error') offresEvent('paywall_offerings_error', { source: src, tentative: offersAttempt });
    else if (storeStatus === 'ready' && offersRecovered) offresEvent('paywall_offerings_recovered', { source: src, tentative: offersAttempt });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeStatus, offersRecovered]);

  const continueFree = (via: 'bouton' | 'fermer') => {
    paywallEvent('continuer_gratuit', { source: src, via });
    onFinish('free');
  };

  const finishCelebration = async () => {
    const end = celebrate?.trialEnd ?? null;
    // l'autorisation des notifications n'est demandee qu'ici, apres l'achat et la bienvenue
    if (end && reminderPossible) {
      // en apercu : seulement la demande d'autorisation du telephone, aucun rappel programme
      if (preview) await Notifications.requestPermissionsAsync().catch(() => undefined);
      else await scheduleTrialReminder(end);
    }
    setCelebrate(null);
    onFinish('premium');
  };

  // ===== Textes =====
  const heroTrial = trial ?? annualTrial;
  const titleBottom = isPremium || !heroTrial ? null : `${essaiGratuit(heroTrial.days).replace(/^./, (x) => x.toUpperCase())}.`;
  const premiumTitle = me.personnage && parsePersonnage(me.personnage).kind !== 'guerrier' && parsePersonnage(me.personnage).kind !== 'pack' ? traduire('Ton Premium est à toi.') : traduire('Ton armure Premium est à toi.');
  const buyLabel = trial ? traduire('Commencer mon essai gratuit') : traduire('Passer à Premium');
  // la ligne collee sous le bouton : le prix total en gras, puis l'equivalent mensuel ; avec l'essai, l'essai d'abord
  // espaces insecables : un prix et sa periode ne se coupent jamais en fin de ligne
  const nb = (x: string) => x.replace(/ /g, ' ');
  const perMonth = selected?.info.perMonth && selected.info.kind !== 'monthly' ? selected.info.perMonth : null;
  const priceBold = !selected ? '' : trial ? nb(essaiGratuit(trial.days)) : nb(`${selected.info.priceString} ${selected.info.per}`);
  const priceRest = !selected
    ? ''
    : trial
      ? traduire(', puis {0}', nb(`${selected.info.priceString} ${selected.info.per}`))
      : perMonth ? nb(traduire(', soit {0} par mois', perMonth)) : selected.info.kind === 'monthly' ? traduire(', sans engagement') : '';
  // sans offres : ce qui se passe, pres du bouton
  const waiting = retrying || offersStatus === 'loading';
  const noOfferLine = waiting
    ? traduire('Chargement des prix du store')
    : offersStatus === 'unavailable'
      ? traduire("L’abonnement passe par {0}, il n’est pas disponible sur cette version de l’app.", store)
      : traduire('Les prix n’ont pas pu se charger, vérifie ta connexion puis réessaie.');

  // vague 32 : ton plan, trois lignes et la date d'arrivee estimee (jamais inventee)
  // weight_goal vaut « maintain » par defaut en base : avec un poids vise loin du poids du jour, on ne l'affiche pas
  // 27 octobre 2026 : un poids vise dans le mauvais sens (perdre avec un cap au dessus, prendre avec un cap en dessous) est ignore
  const sensFaux = me.target != null && me.start != null && ((me.goal === 'lose' && me.target >= me.start) || (me.goal === 'gain' && me.target <= me.start));
  const contradiction = sensFaux || (me.goal === 'maintain' && me.target != null && me.start != null && Math.abs(me.start - me.target) >= 1);
  const cibleSure = sensFaux ? null : me.target;
  const goalEntry = me.goal && !contradiction ? GOALS.find((g) => g.id === me.goal) ?? null : null;
  const maintient = me.goal === 'maintain' && !contradiction;
  // 28 octobre 2026 (maquette A) : plus d'orange ni d'or ; perdre en vert mousse, prendre en indigo, garder en lilas
  const encreObjectif = (id: string) => (id === 'lose' ? pw.ton('menthe').encre : id === 'maintain' ? pw.ton('lilas').encre : pw.indigo);
  const planLines: LignePlan[] = [];
  if (goalEntry) {
    planLines.push({ icon: 'target', ink: encreObjectif(goalEntry.id), fond: goalEntry.encre.fond, cle: goalEntry.label, a11y: traduire("objectif, {0}", goalEntry.label.toLowerCase()) });
  }
  if (cibleSure && !maintient) {
    const from = me.start != null && Math.abs(me.start - cibleSure) >= 0.2 ? me.start : null;
    planLines.push({
      icon: 'scale',
      ink: pw.indigo,
      fond: ENCRES.indigo.fond,
      depuis: from != null ? `${kg(from)} kg` : undefined,
      cle: `${kg(cibleSure)} kg`,
      apres: from != null ? undefined : traduire('visés'),
      a11y: from != null ? traduire("de {0} à {1} kilos", kg(from), kg(cibleSure)) : traduire("{0} kilos visés", kg(cibleSure)),
    });
  } else if (maintient && me.start != null) {
    planLines.push({ icon: 'scale', ink: pw.indigo, fond: ENCRES.indigo.fond, cle: `${kg(me.start)} kg`, apres: traduire('à garder'), a11y: traduire("{0} kilos à garder", kg(me.start)) });
  }
  if (me.sessions) {
    const nbS = `${me.sessions} ${me.sessions > 1 ? traduire('séances') : traduire('séance')}`;
    planLines.push({ icon: 'calendar', ink: pw.encre, fond: ENCRES.mousse.fond, cle: nbS, apres: traduire('par semaine'), a11y: traduire("{0} par semaine", nbS) });
  }
  const estimation = !maintient && me.start != null && cibleSure != null
    ? estimerArrivee({ start: me.start, target: cibleSure, sessions: me.sessions, heightCm: me.height, recompo: me.recompo && cibleSure < me.start })
    : null;
  // 17 octobre : avec un plan, la date du torii (la meme que la carte Poids et le bilan) ; a l'onboarding, avant
  // que le plan existe, la fourchette de l'estimation (le torii sera son milieu)
  const planArrivee = plan6.aPlan ? plan6.arrivee : estimation?.kind === 'ok' ? arriveeCourte(estimation.earliest, estimation.latest) : null;
  const ciblePlan = cibleSure && !maintient ? kg(cibleSure) : null;
  const lignesGenerales: LignePlan[] = [
    { icon: 'target', ink: c.textSecondary, fond: c.fillSubtle, cle: traduire('Ton objectif'), a11y: traduire('ton objectif') },
    { icon: 'scale', ink: c.textSecondary, fond: c.fillSubtle, cle: traduire('Ton poids visé'), a11y: traduire('ton poids visé') },
    { icon: 'calendar', ink: c.textSecondary, fond: c.fillSubtle, cle: traduire('Ton rythme'), apres: traduire('par semaine'), a11y: traduire('ton rythme par semaine') },
  ];
  const lignesHeros = planLines.length ? planLines : lignesGenerales;

  // le titre : ton chemin vers ton cap ; garder ton poids ; sinon ton plan. Venu d'un mur : passe a Premium.
  const heroTitle = isPremium
    ? premiumTitle
    : mur
      ? titleBottom ? traduire('Essaie YOROI en entier.') : traduire('Passe à YOROI Premium.')
      : ciblePlan
        ? traduire('Ton chemin vers {0} kg, en entier.', ciblePlan)
        : maintient && me.start != null
          ? traduire('Ton plan pour garder {0} kg.', kg(me.start))
          : traduire('Ton plan, en entier.');
  const subtitle = isPremium
    ? traduire('Tout ce qui est marqué Premium est ouvert.')
    : !mur && (ciblePlan || maintient)
      ? traduire('Ta pesée, tes séances et ton coach restent gratuits. Premium t’aide à y arriver.')
      : traduire('Ta pesée, tes séances et ton coach restent gratuits. Premium te montre tout le chemin.');

  // 27 octobre 2026 (Houari : « Arrête les costumes au hasard. Reste sur l'homme ou la femme qu'il a choisi ») :
  // Japon : ta tenue japonaise ; Classique : ta tenue normale ; sans personnage : la lanterne ;
  // genre « autre » : homme et femme de ton univers en alternance (lib/v2/premium/pourToi.ts, regleePersonnage).
  // A l'onboarding, l'univers que tu viens de choisir ; dans l'app, ton personnage (un pack que tu as choisi reste le tien).
  const kindPerso = me.personnage ? parsePersonnage(me.personnage).kind : null;
  const universHero: ChoixUnivers = source === 'onboarding' && recap?.univers
    ? recap.univers
    : kindPerso === 'aucun' ? 'aucun' : kindPerso === 'classique' ? 'classique' : 'japon';
  const regle = regleePersonnage({ univers: universHero, genre: me.genre, autre: me.autre, personnage: source === 'onboarding' ? null : me.personnage });
  const mondeClassique = universHero !== 'japon';
  // 27 octobre 2026 (Houari : « le kimono sur fond rose orangé me soûle ») : a l'onboarding, la scene choisie a l'ecran
  // Ta scene, sinon la Salle d'armes (Japon) ou la salle de sport (Classique) ; dans l'app, ta scene, sinon la Salle d'armes
  const sceneHero: SceneId = (() => {
    const id = (source === 'onboarding' ? recap?.scene ?? null : me.sceneId) as SceneId | null;
    if (mondeClassique) return id && estSceneClassique(id) ? id : 'classique_salle_jour';
    if (!id || estSceneClassique(id) || (source === 'onboarding' && id === 'dojo')) return 'samourai_armurerie';
    return id;
  })();
  // a l'onboarding, l'exemple montre le Rōnin (rang 4), jamais le kimono du premier rang
  const rangHero = source === 'onboarding' ? 3 : me.rankIndex;
  const personnagesHeros: ImageSourcePropType[] = regle.mode === 'fixe'
    ? (() => { const img = personnageAccueil(regle.cle, rangHero); return img ? [img] : []; })()
    : regle.mode === 'alterne' ? [personnageAccueil(regle.cles[0], rangHero), personnageAccueil(regle.cles[1], rangHero)] : [];
  const a11yHeros = [me.name ? traduire("{0}, ton plan", me.name) : traduire('Ton plan'), ...lignesHeros.map((l) => l.a11y), planLines.length && planArrivee ? traduire("arrivée prévue {0}", planArrivee) : null].filter(Boolean).join(', ');

  // 28 octobre 2026 (maquette A) : ta courbe complete jusqu'au torii, tes vraies pesees par semaine ; sans elles,
  // l'exemple dans le sens de ton objectif (courbeExemple), marque « Exemple »
  const curve = weeklyPoints(me.weights);
  const exempleCourbe = courbeExemple(me.start, ciblePlan ? cibleSure : null);
  const courbeTuile = curve.length >= 2
    ? { hist: curve.slice(-12).map((x) => x.v), cible: ciblePlan ? cibleSure : maintient && me.start != null ? me.start : null, torii: !!ciblePlan, exemple: false }
    : { hist: lisserExemple(exempleCourbe.points.map((x) => x.value)), cible: exempleCourbe.cap, torii: true, exemple: true };
  // les objectifs et sports : pour l'apercu nutrition et les tuiles qui te concernent (combat seulement si tu en fais)
  const objectifsPour: ObjectifPour[] = me.objectifs.length ? me.objectifs : me.goal && !contradiction ? [me.goal as ObjectifPour] : [];
  const apercuNutri = apercuNutrition({ poids: me.start, taille: me.height, age: me.age, genre: me.genre, objectifs: objectifsPour });
  const combat = faitDuCombat({ objectifs: objectifsPour, sports: me.sports });
  const joursSemaine = me.jours.length ? me.jours : joursPrevus(me.sessions);
  const stickersSports = (me.sports.length ? me.sports : [null]).map((s) => stickerSport(s));
  // ton monde : quatre vrais personnages du monde samourai, ou quatre scenes de ton univers Classique
  const imagesMonde = mondeClassique
    ? SCENES_CLASSIQUE.slice(0, 4).map((s) => ({ src: s.image, fond: pw.ton('lilas').fond, portrait: false }))
    : MONDE_PERSONNAGES.slice(0, 4).map((pk) => ({ src: packImage(pk, me.genre, 1), fond: pk.fond, portrait: true }));
  const tuilesReste: { cle: string; node: React.ReactNode }[] = [
    ...(joursSemaine.length ? [{ cle: 'rythme', node: <MiniTuile ton="menthe" titre={traduire('Sport par sport')} sous={traduire('Ton rythme et tes buts datés')}><SemaineSports jours={joursSemaine} stickers={stickersSports} /></MiniTuile> }] : []),
    { cle: 'monde', node: <MiniTuile ton="lilas" titre={traduire('Ton monde')} sous={mondeClassique ? traduire('Toutes les scènes') : traduire('Tout le monde samouraï')}><RangeeMonde images={imagesMonde} /></MiniTuile> },
    { cle: 'progres', node: <MiniTuile ton="ciel" titre={traduire('Tes progrès')} sous={traduire('Charges, mesures, photos sans limite')}><ChargeProgres /></MiniTuile> },
    ...(combat ? [{ cle: 'combat', node: <MiniTuile ton="rose" titre={traduire('Ton combat')} sous={traduire('Rounds analysés, camp, coupe')}><RoundsCombat total={CHRONO_COMBAT.rounds} /></MiniTuile> }] : []),
  ];
  const rangees: { cle: string; node: React.ReactNode }[][] = [];
  for (let i = 0; i < tuilesReste.length; i += 2) rangees.push(tuilesReste.slice(i, i + 2));

  const small = height < 760;
  const apercuBarre = useApercuVisible();
  const innerW = width - GUTTER * 2 - 32;

  // 17 octobre 2026 : tant que le bas du contenu n'a pas ete vu, un petit chevron dans la barre du bas invite a
  // defiler (il ne couvre jamais aucun texte) ; arrive en bas, il s'efface. 28 octobre 2026 (maquette A) : le bouton
  // d'achat garde toujours sa couleur, comme sur la maquette choisie.
  const reduireAnim = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const mesureDefil = useRef({ y: 0, vue: 0, contenu: 0 });
  const vuRef = useRef(false);
  const [vuBas, setVuBas] = useState(false);
  const verifierBas = () => {
    if (vuRef.current) return;
    const m = mesureDefil.current;
    if (!basAtteint(m.y, m.vue, m.contenu)) return;
    vuRef.current = true;
    setVuBas(true);
  };
  const allerEnBas = () => scrollRef.current?.scrollToEnd({ animated: !reduireAnim });

  const closeLabel = source === 'onboarding' && onBack ? traduire('Retour') : traduire('Fermer');
  const onTopButton = () => {
    if (source === 'onboarding' && onBack) onBack();
    else if (onClose) onClose();
    else continueFree('fermer');
  };
  const openTerms = () => router.push('/terms' as never);
  const openPrivacy = () => router.push('/privacy-policy' as never);

  // 7. ce qui se passe apres, en une ligne, avec les vraies dates du store
  const apres = !selected
    ? null
    : trial
      ? traduire("Aujourd’hui tout est ouvert{0}, premier débit le {1} sauf si tu annules avant.", reminderPossible ? traduire(', rappel le {0}', dayMonth(new Date(trial.end.getTime() - REMINDER_DAYS * DAY))) : '', dayMonth(trial.end))
      : traduire("Tout est ouvert dès l’achat. Annulable à tout moment dans ton compte {0}.", store);

  // texte legal complet (3.1.2) : nom, duree, prix, apres l'essai, renouvellement, resiliation, debit, gestion
  const legal = offers.length
    ? [
        ...offers.map((o) => {
          const t = trialOf(o.pkg.raw);
          return traduire("{0} : abonnement {1}à {2}{3}{4}.", traduire(o.info.name), o.info.duration ? `${deDuree(o.info.duration)} ` : '', o.info.priceString, o.info.perMonth ? traduire(", soit {0} par mois", o.info.perMonth) : '', t ? traduire(", après {0}", essaiGratuit(t.days)) : '');
        }),
        traduire("Le paiement est débité sur ton compte {0} {1}. L’abonnement se renouvelle automatiquement au même prix, sauf résiliation au moins 24 heures avant la fin de la période en cours. Tu le gères et tu le résilies à tout moment dans les réglages de ton compte {2}. Supprimer l’app ne l’annule pas.", store, trial ? traduire('à la fin de l’essai gratuit') : traduire('à la confirmation de l’achat'), store),
      ].join(' ')
    : '';

  // une offre en carte : l'annuel en grand avec l'equivalent mensuel, le mensuel dessous, sans engagement
  const carteOffre = (o: { pkg: PremiumPackage; info: OfferInfo }) => {
    const t = trialOf(o.pkg.raw);
    const annuel = o.info.kind === 'annual';
    const mensuel = o.info.kind === 'monthly';
    const parMois = !mensuel && o.info.perMonth ? o.info.perMonth : null;
    const sous = annuel
      ? [`${o.info.priceString} ${o.info.per}`, o.info.perDay ? traduire('{0} par jour', o.info.perDay) : null].filter(Boolean).join(', ')
      : mensuel ? traduire('Sans engagement') : parMois ? `${o.info.priceString} ${o.info.per}` : null;
    return (
      <OffreCarte
        key={o.pkg.identifier}
        on={selected?.pkg.identifier === o.pkg.identifier}
        onPress={() => pick(o)}
        nom={annuel ? traduire('Annuel') : mensuel ? traduire('Mensuel') : o.info.duration || o.info.short}
        pastille={t ? essaiGratuit(t.days) : null}
        badge={annuel && savings ? traduire('Économise {0} %', savings) : null}
        sous={sous}
        prix={parMois ?? o.info.priceString}
        per={parMois || mensuel ? traduire('par mois') : o.info.per}
        cadeau={annuel ? { image: sceneForNow('sommet'), texte: traduire('Une scène exclusive offerte avec l’annuel') } : null}
        a11y={`${o.info.name}, ${o.info.priceString} ${o.info.per}${parMois ? traduire(', soit {0} par mois', parMois) : ''}${t ? traduire(', {0} jours gratuits', t.days) : ''}${annuel ? `, ${traduire('Une scène exclusive offerte avec l’annuel')}` : ''}`}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: page }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const n = e.nativeEvent;
          mesureDefil.current = { y: n.contentOffset.y, vue: n.layoutMeasurement.height, contenu: n.contentSize.height };
          verifierBas();
        }}
        onLayout={(e) => {
          mesureDefil.current.vue = e.nativeEvent.layout.height;
          verifierBas();
        }}
        onContentSizeChange={(_w, h) => {
          mesureDefil.current.contenu = h;
          verifierBas();
        }}
      >
        {/* 1. La barre du haut : retour (ou fermer) et Restaurer, la pastille d'apercu du Studio au milieu */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <RoundButton icon={source === 'onboarding' && onBack ? 'back' : 'close'} label={closeLabel} onPress={onTopButton} />
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            {/* vague 49 : la pastille du Studio se loge dans la barre ; « Aperçu, sans achat » passe dessous */}
            {apercuBarre ? <ApercuDansBarre /> : preview ? (
              <View style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: width < 400 ? 9 : 12, paddingVertical: 7 }}>
                <Icon name="eye" size={width < 400 ? 12 : 14} color={c.onPrimary} />
                <Ink size={width < 400 ? 11 : 12} weight="extraBold" color={c.onPrimary} numberOfLines={1} style={{ flexShrink: 1 }}>{exemple ? traduire('Aperçu, prix d’exemple') : traduire('Aperçu, sans achat')}</Ink>
              </View>
            ) : null}
          </View>
          {!isPremium ? (
            <Pressable
              onPress={() => void doRestore()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={traduire("Restaurer mes achats")}
              hitSlop={6}
              style={({ pressed }) => [{ flexShrink: 0, minHeight: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? pw.ton('bleu').fond : pw.carte, borderWidth: pw.sombre ? 1 : 0, borderColor: pw.bord }, { shadowColor: '#1B2A44', shadowOpacity: pw.sombre ? 0 : 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: pw.sombre ? 0 : 2 }]}
            >
              <Ink size={14} weight="black" color={pw.indigo}>{traduire("Restaurer")}</Ink>
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
        {preview && apercuBarre ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Icon name="eye" size={13} color={c.onPrimary} />
              <Ink size={11.5} weight="extraBold" color={c.onPrimary} numberOfLines={1}>{exemple ? traduire('Aperçu, prix d’exemple') : traduire('Aperçu, sans achat')}</Ink>
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: GUTTER, paddingTop: small ? 10 : 14 }}>
          {/* 2. Le titre : la couronne et YOROI PREMIUM en bleu, ton chemin vers ton cap, ce qui reste gratuit */}
          <Animated.View entering={ENTREE} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="crown" size={13} color={pw.bleu} />
              <Ink size={11} weight="black" color={pw.bleu} style={{ letterSpacing: 1.5 }}>{traduire("YOROI PREMIUM")}</Ink>
            </View>
            <Ink size={small ? 25 : 29} weight="black" tight color={pw.encre} style={{ lineHeight: small ? 29 : 33 }} accessibilityRole="header">
              {heroTitle}
              {titleBottom ? <Ink size={small ? 25 : 29} weight="black" tight color={pw.bleu}>{`\n${titleBottom}`}</Ink> : null}
            </Ink>
            <Ink size={small ? 13.5 : 14} weight="bold" color={pw.gris} style={{ lineHeight: small ? 19 : 20 }}>{subtitle}</Ink>
          </Animated.View>

          {isPremium ? (
            <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.successTint, borderRadius: 16, padding: 14 }}>
              <Icon name="check" size={18} color={c.successText} stroke={3} />
              <Ink size={15} weight="extraBold" color={c.successText}>{traduire("Ton accès Premium est actif")}</Ink>
            </View>
          ) : null}

          {/* 3. Venu d'une fonction payante : l'apercu de ce que tu as demande, en tete. Sinon : ta carte « Ton plan ». */}
          {!isPremium && mur ? (
            <View style={{ marginTop: 14 }}>
              <ApercuSource source={origine as SourcePremium} largeur={innerW} rankIndex={me.rankIndex} genre={me.genre} nutrition={apercuNutri} libelle={mur.libelle} phrase={mur.phrase(compteur)}>
                {mur.courbe && curve.length >= 2 ? (
                  <View style={{ height: 110, overflow: 'hidden', borderRadius: 14 }} accessible accessibilityLabel={traduire("Aperçu de ta courbe de poids, la suite est avec Premium")}>
                    <WeightCurve points={curve} width={innerW} height={110} color={c.accent} surface={c.surface} ligne={plan6.ligne} torii={plan6.torii} />
                  </View>
                ) : null}
              </ApercuSource>
            </View>
          ) : (
            <View style={{ marginTop: 14 }}>
              <HerosPlan nom={me.name} lignes={lignesHeros} arrivee={planLines.length ? planArrivee : null} scene={sceneForNow(sceneHero)} personnages={personnagesHeros} largeur={width - GUTTER * 2} a11y={a11yHeros} />
            </View>
          )}

          {/* 4. Ce qui t'y mene plus vite : ta courbe jusqu'au torii, tes macros par jour */}
          <Capitales texte={traduire('Ce qui t’y mène plus vite')} couleur={pw.bleu} style={{ marginTop: 18, marginBottom: 8, marginHorizontal: 2 }} />
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <TuileCourbe courbe={courbeTuile} />
            <TuileMacros d={apercuNutri} />
          </View>

          {/* 5. Et tout le reste : sport par sport, ton monde, tes progres, ton combat (seulement si tu en fais) */}
          <Capitales texte={traduire('Et tout le reste')} couleur={pw.bleu} style={{ marginTop: 18, marginBottom: 8, marginHorizontal: 2 }} />
          <View style={{ gap: 10 }}>
            {rangees.map((r) => (
              <View key={r.map((x) => x.cle).join('')} style={{ flexDirection: 'row', gap: 10 }}>
                {r.map((x) => <React.Fragment key={x.cle}>{x.node}</React.Fragment>)}
              </View>
            ))}
          </View>

          {/* 6. La vraie note des stores, en une ligne */}
          {!isPremium ? <View style={{ marginTop: 12 }}><NoteLigne /></View> : null}

          {/* 7. Gratuit pour toujours (maquette C), juste avant le choix, pour rassurer */}
          {!isPremium ? <View style={{ marginTop: 18 }}><CarteGratuit /></View> : null}

          {/* 8. Le choix de l'offre : l'annuel mis en avant, le mensuel dessous ; prix et essai du store seulement */}
          {isPremium ? null : (
            <>
              <Capitales texte={traduire('Choisis ton offre')} couleur={pw.bleu} style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 2 }} />
              {offers.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {annual ? carteOffre(annual) : null}
                  {monthly ? carteOffre(monthly) : null}
                  {others.map(carteOffre)}
                </View>
              ) : waiting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 }}>
                  <ChargementPetit size={18} />
                  <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Chargement des offres")}</Ink>
                </View>
              ) : (
                <View accessibilityLiveRegion="polite" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: pw.carte, paddingVertical: 12, paddingHorizontal: 12, borderWidth: pw.sombre ? 1 : 0, borderColor: pw.bord }, pw.ombre]}>
                  {/* vague 32 : bandeau calme, sans rouge ; « Réessayer » est le bouton du pied */}
                  <Image source={sticker('sablier')} style={{ width: 38, height: 38 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Ink size={13.5} weight="extraBold" style={{ lineHeight: 18 }}>
                      {offersStatus === 'unavailable' || TEST_BUILD ? traduire('Prix indisponibles ici') : traduire('Prix momentanément indisponibles')}
                    </Ink>
                    <Ink size={12} weight="medium" color={c.textSecondary} style={{ lineHeight: 16 }}>
                      {TEST_BUILD
                        ? traduire('Ils s’affichent dans l’app installée.')
                        : offersStatus === 'unavailable'
                          ? traduire("L’abonnement passe par {0}.", store)
                          : traduire('Rien n’a été débité. Touche Réessayer en bas.')}
                    </Ink>
                  </View>
                </View>
              )}
            </>
          )}

          {/* 9. Ce qui se passe apres, en une ligne */}
          {!isPremium && apres ? (
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 }}>
              <View style={{ marginTop: 1 }}>
                <Icon name={trial ? 'bell' : 'check'} size={15} color={c.successText} stroke={2.4} />
              </View>
              <Ink size={13} weight="bold" color={c.textSecondary} style={{ flex: 1, lineHeight: 18 }}>{apres}</Ink>
            </View>
          ) : null}

          {/* 10. Annulable, sans pub, tes donnees sur ton telephone */}
          {!isPremium ? <View style={{ marginTop: 14 }}><Reassurance /></View> : null}

          {/* 11. Mentions legales (3.1.2) et liens : pages internes, lisibles hors connexion */}
          <View style={{ alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 4 }}>
            {legal ? <Ink size={11.5} weight="medium" color={c.textSecondary} style={{ lineHeight: 17, textAlign: 'center' }}>{legal}</Ink> : null}
            {/* vague 49 : liens centres, meme style que l'accroche ; Restaurer et le contrat Apple sur leur propre ligne */}
            <LiensLegaux
              liens={[
                { label: traduire('Conditions d’utilisation (EULA)'), onPress: openTerms },
                { label: traduire('Confidentialité'), onPress: openPrivacy },
              ]}
            />
            {Platform.OS === 'ios' ? <LienLegalTexte label={traduire("Contrat de licence Apple")} onPress={() => void safeOpenURL(APPLE_EULA_URL)} /> : null}
            {!isPremium ? <LienLegalTexte label={traduire("Restaurer mes achats")} onPress={() => void doRestore()} role="button" /> : null}
          </View>
        </View>
      </ScrollView>

      {/* Colle en bas, toujours visible : le bouton principal (degrade indigo, texte blanc), le vrai prix dessous,
          puis « Continuer gratuitement ». Un fondu vers la page au dessus, comme sur la maquette. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: insets.bottom + 4, backgroundColor: page }}>
        <LinearGradient pointerEvents="none" colors={[`${page}00`, page]} style={{ position: 'absolute', left: 0, right: 0, top: -22, height: 22 }} />
        {!isPremium && !vuBas ? <IndicateurDefiler onPress={allerEnBas} reduire={!!reduireAnim} /> : null}
        {isPremium ? (
          <BoutonPrincipal label={traduire("Continuer")} onPress={() => onFinish('premium')} hauteur={58} />
        ) : (
          <>
            {selected ? (
              <BoutonPrincipal accessibilityLabel={buyLabel} onPress={() => void buy()} loading={busy} hauteur={58} tailleTexte={17}>
                {(couleur) => (
                  <>
                    <Ink size={17} weight="extraBold" color={couleur} numberOfLines={1} style={{ flexShrink: 1 }}>{buyLabel}</Ink>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12h13M13 6l6 6-6 6" stroke={couleur} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </View>
                  </>
                )}
              </BoutonPrincipal>
            ) : (
              <BoutonPrincipal
                label={offersStatus === 'unavailable' ? traduire('Abonnement indisponible ici') : traduire('Réessayer')}
                onPress={retryOffers}
                loading={waiting}
                disabled={offersStatus === 'unavailable'}
                hauteur={58}
              />
            )}
            {selected ? (
              <Ink size={13} weight="bold" color={pw.gris} style={{ marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
                <Ink size={13} weight="black" color={pw.encre}>{priceBold}</Ink>
                {priceRest}
              </Ink>
            ) : (
              <View style={{ marginTop: 6, gap: 2, alignItems: 'center' }} accessibilityLiveRegion="polite">
                <Ink size={13} weight="bold" color={!waiting && offersStatus === 'error' ? c.ink : c.textSecondary} style={{ textAlign: 'center', lineHeight: 17 }}>{noOfferLine}</Ink>
                {IN_EXPO_GO ? (
                  <Ink size={11.5} color={c.textMuted} style={{ textAlign: 'center', lineHeight: 15 }}>{traduire("Dans Expo Go, l’achat est impossible : il ne marche que dans l’app installée.")}</Ink>
                ) : null}
              </View>
            )}
            <Pressable onPress={() => continueFree('bouton')} accessibilityRole="button" accessibilityLabel={traduire("Continuer gratuitement")} hitSlop={4} style={({ pressed }) => ({ minHeight: 44, marginTop: 2, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : 'transparent' })}>
              <Ink size={14.5} weight="black" color={pw.gris}>{traduire("Continuer gratuitement")}</Ink>
            </Pressable>
          </>
        )}
      </View>

      {celebrate ? (
        <Welcome
          genre={me.genre}
          personnage={me.personnage}
          restored={celebrate.restored}
          trialEnd={celebrate.trialEnd}
          reminder={Boolean(celebrate.trialEnd) && reminderPossible}
          onDone={() => void finishCelebration()}
        />
      ) : null}
    </View>
  );
}

/** Petite pastille « Premium » avec cadenas, aux couleurs de l'accent du theme */
function PastillePremium() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.accentTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Icon name="lock" size={12} color={c.accent} />
      <Ink size={11} weight="extraBold" color={c.accent}>{traduire("Premium")}</Ink>
    </View>
  );
}

/**
 * Apercu du contenu bloque quand le paywall vient d'un mur (lib/v2/premium/sources.ts) : son sticker (reglage
 * Illustrations), son libelle, sa phrase, puis le contenu (ta courbe voilee) ou, a defaut, un vrai apercu de l'app
 * (ApercuMur.tsx : vraies scenes, vrais personnages, vrais logos, vraies tuiles). 27 octobre 2026 : plus de lignes
 * fantomes (version d'avant : _archive_ancien_design_2026-10-09/accueil_2_2026-10-27/Paywall.tsx).
 */
function ApercuSource({ source, largeur, rankIndex, genre, nutrition, libelle, phrase, children }: { source: SourcePremium; largeur: number; rankIndex: number; genre: 'h' | 'f'; nutrition: ApercuNutritionDonnees; libelle: string; phrase: string; children?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <StickerMur source={source} taille={38} />
        <Ink size={16} weight="black" style={{ flex: 1 }} numberOfLines={2}>{libelle}</Ink>
        <PastillePremium />
      </View>
      <Ink size={14} weight="bold" color={c.textSecondary} style={{ lineHeight: 20 }}>{phrase}</Ink>
      <View accessible accessibilityLabel={traduire("Aperçu de {0}, la suite est avec Premium", libelle)}>
        {children ?? <ApercuMur source={source} largeur={largeur} rankIndex={rankIndex} genre={genre} nutrition={nutrition} />}
      </View>
    </View>
  );
}

/**
 * Indice de defilement (27 octobre 2026, Houari : « "Fais défiler pour tout voir" est au milieu du texte, on ne peut
 * rien lire ») : plus de pastille flottante posee sur le contenu. Un petit chevron DANS la barre du bas, au dessus du
 * bouton : il ne couvre jamais aucun texte. Il descend et remonte lentement (immobile si « réduire les animations »),
 * le toucher fait defiler jusqu'en bas, et il s'efface des que le bas est atteint.
 */
function IndicateurDefiler({ onPress, reduire }: { onPress: () => void; reduire: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const dy = useSharedValue(0);
  useEffect(() => {
    if (reduire) return;
    // 27 octobre 2026 : trois allers retours puis immobile, plus de boucle sans fin
    dy.value = withRepeat(withSequence(withTiming(2.5, { duration: 750, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 750, easing: Easing.inOut(Easing.quad) })), 3);
  }, [reduire, dy]);
  const fleche = useAnimatedStyle(() => ({ transform: [{ translateY: dy.value }] }));
  return (
    <Animated.View exiting={FadeOut.duration(200)} style={{ alignItems: 'center', marginTop: -4, marginBottom: 2 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={traduire("Fais défiler pour tout voir")}
        hitSlop={{ top: 6, bottom: 4, left: 40, right: 40 }}
        style={{ height: 18, width: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View style={fleche}>
          <Icon name="down" size={16} color={c.textMuted} stroke={2.6} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Bienvenue Premium apres l'achat : illustration, son et vibration (lances par l'appelant) */
function Welcome({ genre, personnage = null, restored, trialEnd, reminder, onDone }: { genre: 'h' | 'f'; personnage?: string | null; restored: boolean; trialEnd: Date | null; reminder: boolean; onDone: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { bgStyle, haloStyle, armorStyle } = useReveal();
  return (
    <Animated.View entering={ENTREE} style={[StyleSheet.absoluteFill, { backgroundColor: c.darkCard }]} accessibilityViewIsModal>
      <Animated.Image source={CASTLE} resizeMode="cover" style={[StyleSheet.absoluteFill, bgStyle]} />
      <LinearGradient colors={['rgba(29,32,41,0)', 'rgba(29,32,41,0.55)', 'rgba(29,32,41,0.92)']} locations={[0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingTop: insets.top + 20 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', alignSelf: 'center', top: insets.top + 60 }, haloStyle]}>
          <Halo id="welcomeHalo" size={340} color={c.goldLight} />
        </Animated.View>
        {(() => {
          // vague 45 : la figure de l'univers choisi, ou rien sans personnage
          const img = heroPremium(personnage, genre);
          return img ? <Animated.Image source={img} resizeMode="contain" style={[{ width: 260, height: 347, marginBottom: 8 }, armorStyle]} /> : <View style={{ height: 120 }} />;
        })()}
        <View style={{ alignSelf: 'stretch', paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 16, gap: 10 }}>
          <Ink size={30} weight="black" tight color={c.onDark} style={{ textAlign: 'center' }}>{restored ? traduire('Ton Premium est de retour') : traduire('Bienvenue dans YOROI Premium')}</Ink>
          <Ink size={15} color={c.onDarkSecondary} style={{ textAlign: 'center', lineHeight: 21 }}>
            {trialEnd ? traduire("Tout ce qui est marqué Premium est ouvert dès maintenant. Ton essai court jusqu’au {0}.", longDate(trialEnd)) : traduire('Tout ce qui est marqué Premium est ouvert dès maintenant.')}
          </Ink>
          {reminder ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12 }}>
              <Icon name="bell" size={16} color={c.goldLight} />
              <Ink size={13} weight="bold" color={c.onDark} style={{ flex: 1 }}>{traduire("Pour te rappeler la fin de l’essai 2 jours avant, ton téléphone va te demander d’autoriser les notifications.")}</Ink>
            </View>
          ) : null}
          <BoutonPrincipal label={traduire("C’est parti")} onPress={onDone} hauteur={58} />
        </View>
      </View>
    </Animated.View>
  );
}

export default Paywall;
