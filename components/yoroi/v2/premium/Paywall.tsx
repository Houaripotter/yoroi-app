/**
 * Paywall unique de YOROI Premium : fin de l'onboarding (source onboarding) et depuis l'app (source app).
 * Ordre des blocs, de haut en bas (13 octobre 2026, l'ordre compte plus que le graphisme) :
 *  1. le haut clair (26 octobre 2026) : la croix et Restaurer, le titre avec l'essai et sa vraie duree du store
 *     (seulement si l'utilisateur y a droit), puis le carrousel de quatre cartes Premium (CarrouselPremium.tsx) ;
 *  2. la preuve sociale : la vraie note avec lauriers et DEUX avis reels, les plus courts (lib/v2/premium/avis.ts) ;
 *  3. le tableau Gratuit contre Premium, 6 lignes vraies (PREMIUM_ROWS, limits.ts), puis ta carte « Ton plan »
 *     seulement quand le paywall ne vient pas d'un mur (elle prolonge le tableau : ce que Premium fait de TES chiffres) ;
 *  4. un apercu du contenu bloque, efface par un degrade : celui de la source quand on vient d'un mur
 *     (lib/v2/premium/sources.ts), sinon ta vraie courbe de 6 mois voilee ;
 *  5. le prix : UNE carte annuelle en grand (equivalent mensuel et economie calcules sur le store),
 *     le mensuel en lien discret « ou X par mois, sans engagement » ;
 *  7. ce qui se passe apres, en une ligne ;
 *  9. les mentions legales (3.1.2) juste sous le prix, visibles sans aller au bout, avec les liens
 *     Conditions (/terms), Confidentialite (/privacy-policy) et le contrat de licence Apple sur iOS.
 * Colle en bas, TOUJOURS visible pendant le defilement :
 *  6. le bouton d'achat et le vrai prix dessous ; sans offres, il dit « Réessayer » et relance le chargement
 *     (il ne promet jamais d'essai sans offre chargee) ;
 *  8. « Continuer gratuitement », un vrai bouton a contour, plein largeur, clairement secondaire.
 * Aucun prix ecrit en dur : tout vient de l'offering current (prix d'exemple marques comme tels,
 * seulement dans l'apercu du Studio quand le store ne renvoie rien).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton, type IconName } from '@/components/yoroi/v2/espace/ui';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { GOALS } from '@/components/yoroi/v2/onboarding/Objectif';
import { ENCRES } from '@/components/yoroi/v2/onboarding/couleurs';
import { CarteTonPlan, type LignePlan } from '@/components/yoroi/v2/premium/TonPlan';
import { estimerArrivee, fourchetteDates } from '@/lib/v2/pesee/estimation';
import { isoDuTemps, type Ligne } from '@/lib/v2/pesee/ligneDirectrice';
import { arriveePrevueTexte, toriiDuJour } from '@/lib/v2/pesee/arrivee';
import { lireToriiGarde } from '@/lib/v2/pesee/usePlanPoids';
import { toDailySeries } from '@/lib/v2/weightStats';
import { kg } from '@/components/yoroi/v2/onboarding/ui';
import { AvisCourts, NoteLauriers } from '@/components/yoroi/v2/premium/Preuve';
import { VeiledCurve } from '@/components/yoroi/v2/charts/VeiledCurve';
import { usePremium, type PremiumPackage } from '@/context/PremiumContext';
import { PREVIEW_PURCHASE_MESSAGE } from '@/lib/v2/creator/purchasePreview';
import { EXAMPLE_PACKAGES, previewTrial, usePaywallVariant } from '@/lib/v2/creator/paywallVariant';
import * as Notifications from 'expo-notifications';
import { FREE_FOREVER, PREMIUM_ROWS, savingsPercent, sortOffers, trialFor, type OfferInfo } from '@/lib/v2/premium/offer';
import { offresEvent, paywallEvent } from '@/lib/v2/premium/events';
import { SOURCES, couleurA, couleursSource, estSourcePremium, type SourcePaywall } from '@/lib/v2/premium/sources';
import { longDate, scheduleTrialReminder, storeName } from '@/lib/v2/onboarding/trial';
import { getProfile, getWeights } from '@/lib/database';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { getArmureState } from '@/lib/v2/armure';
import { GUERRIER_IMAGES, CLASSIQUE_IMAGES, parsePersonnage } from '@/lib/v2/dojo/personnages';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { estSceneClassique } from '@/lib/v2/espace/classique';
import type { SceneId } from '@/lib/v2/espace';
import { personnageImage as personnageAccueil, sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { CourbePoids } from '@/components/yoroi/v2/charts/CourbePoids';
import { LiensLegaux, LienLegalTexte } from '@/components/yoroi/v2/premium/LiensLegaux';
import { cartesPremium, regleePersonnage, texteCarte, type ObjectifPour, type ProfilPourToi } from '@/lib/v2/premium/pourToi';
import { getUserSettings } from '@/lib/storage';
import { CarrouselPremium } from '@/components/yoroi/v2/premium/CarrouselPremium';
import { apercuNutrition } from '@/lib/v2/premium/apercus';
import { ageDepuisNaissance } from '@/lib/v2/onboarding/trancheAge';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { basAtteint } from '@/lib/v2/premium/defilement';
import { ApercuDansBarre, useApercuVisible } from '@/components/yoroi/v2/studio/PreviewBar';
import { safeOpenURL } from '@/lib/security/validators';
import { playLevelUpSound } from '@/lib/soundManager';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, LANG } from '@/lib/i18n/tr';

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
  goals?: ObjectifPour[]; sports?: string[]; autre?: boolean };

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
};

/** vague 50 : de vraies dates, « du 28 janv. au 15 mai », « le 18 oct. » (lib/v2/pesee/estimation.ts) */
function arriveeCourte(earliest: string, latest: string): string {
  return fourchetteDates(earliest, latest);
}

/** encre du mot cle : celle de l'objectif, assombrie pour l'or et le vermillon (contraste AA sur blanc) */
const INK_TEXTE: Record<string, string> = { [ENCRES.or.ink]: '#8A5F0E', [ENCRES.vermillon.ink]: '#9C4E2C' };

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
const COURBE_EXEMPLE = (() => {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const points: { date: string; value: number }[] = [];
  for (let i = 56; i >= 0; i -= 4) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12);
    const tendance = 79.6 + (i / 56) * 3;
    points.push({ date: iso(d), value: Math.round((tendance + (i % 8 === 0 ? 0.35 : -0.2)) * 10) / 10 });
  }
  const torii = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 12);
  return { points, cap: 78, torii: iso(torii) };
})();

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

// ===== Petits elements =====

function SectionTitle({ children }: { children: string }) {
  const { theme } = useYoroiTheme();
  return (
    <Ink size={12} weight="black" color={theme.colors.textSecondary} style={{ letterSpacing: 1.4, textAlign: 'center' }}>
      {children.toUpperCase()}
    </Ink>
  );
}


const FREE_W = 76;
const PREM_W = 86;

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
  // 26 octobre 2026 : les couleurs des pages Programmes et Coach (page #EDF1FA, carte indigo, teintes)
  const pal = usePaletteProgramme();
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
    goal: null,
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
  const heroTitle = isPremium ? (me.personnage && parsePersonnage(me.personnage).kind !== 'guerrier' && parsePersonnage(me.personnage).kind !== 'pack' ? traduire('Ton Premium est à toi.') : traduire('Ton armure Premium est à toi.')) : titleBottom ? 'Essaie YOROI en entier.' : traduire('Passe à YOROI Premium.');
  // 27 octobre 2026 : ce qui reste gratuit d'abord (honnete), le carrousel dit ensuite ce que Premium fait pour TOI
  const subtitle = isPremium ? traduire('Tout ce qui est marqué Premium est ouvert.') : traduire('Ta pesée, tes séances et ton coach restent gratuits. Premium te montre tout le chemin.');
  const buyLabel = trial ? traduire('Commencer mon essai gratuit') : 'M’abonner';
  // la ligne collee sous le bouton : prix total, periode, apres l'essai
  // espaces insecables : un prix et sa periode ne se coupent jamais en fin de ligne
  const nb = (x: string) => x.replace(/ /g, '\u00A0');
  const perMonth = selected?.info.perMonth && selected.info.kind !== 'monthly' ? nb(traduire("{0} par mois", selected.info.perMonth)) : null;
  const priceLine = !selected
    ? ''
    : trial
      ? `${nb(essaiGratuit(trial.days))}, puis ${nb(`${selected.info.priceString} ${selected.info.per}`)}`
      : `${nb(`${selected.info.priceString} ${selected.info.per}`)}${perMonth ? `, soit ${perMonth}` : ''}`;
  const priceSub = trial
    ? traduire("{0}Rien à payer aujourd’hui, annulable à tout moment.", perMonth ? `Soit ${perMonth}. ` : '')
    : traduire('Renouvellement automatique, annulable à tout\u00A0moment.');
  // sans offres : ce qui se passe, pres du bouton
  const waiting = retrying || offersStatus === 'loading';
  const noOfferLine = waiting
    ? traduire('Chargement des prix du store')
    : offersStatus === 'unavailable'
      ? traduire("L’abonnement passe par {0}, il n’est pas disponible sur cette version de l’app.", store)
      : traduire('Les prix n’ont pas pu se charger, vérifie ta connexion puis réessaie.');

  // vague 32 : ton plan en carte de membre, trois lignes et la date d'arrivee estimee (jamais inventee)
  // weight_goal vaut « maintain » par defaut en base : avec un poids vise loin du poids du jour, on ne l'affiche pas
  const contradiction = me.goal === 'maintain' && me.target != null && me.start != null && Math.abs(me.start - me.target) >= 1;
  const goalEntry = me.goal && !contradiction ? GOALS.find((g) => g.id === me.goal) ?? null : null;
  const maintient = me.goal === 'maintain' && !contradiction;
  const planLines: LignePlan[] = [];
  if (goalEntry) {
    planLines.push({ icon: 'target', ink: INK_TEXTE[goalEntry.encre.ink] ?? goalEntry.encre.ink, fond: goalEntry.encre.fond, cle: goalEntry.label, a11y: traduire("objectif, {0}", goalEntry.label.toLowerCase()) });
  }
  if (me.target && !maintient) {
    const from = me.start != null && Math.abs(me.start - me.target) >= 0.2 ? me.start : null;
    planLines.push({
      icon: 'scale',
      ink: ENCRES.indigo.ink,
      fond: ENCRES.indigo.fond,
      depuis: from != null ? `${kg(from)} kg` : undefined,
      cle: `${kg(me.target)} kg`,
      apres: from != null ? undefined : traduire('visés'),
      a11y: from != null ? traduire("de {0} à {1} kilos", kg(from), kg(me.target)) : traduire("{0} kilos visés", kg(me.target)),
    });
  } else if (maintient && me.start != null) {
    planLines.push({ icon: 'scale', ink: ENCRES.indigo.ink, fond: ENCRES.indigo.fond, cle: `${kg(me.start)} kg`, apres: traduire('à garder'), a11y: traduire("{0} kilos à garder", kg(me.start)) });
  }
  if (me.sessions) {
    const nbS = `${me.sessions} ${me.sessions > 1 ? traduire('séances') : traduire('séance')}`;
    planLines.push({ icon: 'calendar', ink: ENCRES.mousse.ink, fond: ENCRES.mousse.fond, cle: nbS, apres: 'par semaine', a11y: traduire("{0} par semaine", nbS) });
  }
  const estimation = !maintient && me.start != null && me.target != null
    ? estimerArrivee({ start: me.start, target: me.target, sessions: me.sessions, heightCm: me.height, recompo: me.recompo && me.target < me.start })
    : null;
  // 17 octobre : avec un plan, la date du torii (la meme que la carte Poids et le bilan) ; a l'onboarding, avant
  // que le plan existe, la fourchette de l'estimation (le torii sera son milieu)
  const planArrivee = plan6.aPlan ? plan6.arrivee : estimation?.kind === 'ok' ? arriveeCourte(estimation.earliest, estimation.latest) : null;
  // 17 octobre 2026 : ce que Premium fait de ton plan. Sans aucune donnee, la carte generale : des libelles, aucun chiffre
  const ciblePlan = me.target && !maintient ? kg(me.target) : null;
  const lignesGenerales: LignePlan[] = [
    { icon: 'target', ink: c.textSecondary, fond: c.fillSubtle, cle: 'Ton objectif', a11y: traduire('ton objectif') },
    { icon: 'scale', ink: c.textSecondary, fond: c.fillSubtle, cle: 'Ton poids visé', a11y: traduire('ton poids visé') },
    { icon: 'calendar', ink: c.textSecondary, fond: c.fillSubtle, cle: 'Ton rythme', apres: 'par semaine', a11y: traduire('ton rythme par semaine') },
  ];
  // 27 octobre 2026 (Houari : « Arrête les costumes au hasard. Reste sur l'homme ou la femme qu'il a choisi ») :
  // plus de vitrine qui tourne. Japon : ta tenue japonaise ; Classique : ta tenue normale ; sans personnage : rien ;
  // genre « autre » : homme et femme de ton univers en alternance (lib/v2/premium/pourToi.ts, regleePersonnage).
  // A l'onboarding, l'univers que tu viens de choisir ; dans l'app, ton personnage (un pack que tu as choisi reste le tien).
  const kindPerso = me.personnage ? parsePersonnage(me.personnage).kind : null;
  const universHero: ChoixUnivers = source === 'onboarding' && recap?.univers
    ? recap.univers
    : kindPerso === 'aucun' ? 'aucun' : kindPerso === 'classique' ? 'classique' : 'japon';
  const regle = regleePersonnage({ univers: universHero, genre: me.genre, autre: me.autre, personnage: source === 'onboarding' ? null : me.personnage });
  const mondeClassique = universHero !== 'japon';
  // la scene de ton accueil ; sans choix (debut de l'onboarding), la ruelle de nuit aux lanternes, ou la ville du soir en Classique
  const sceneHero: SceneId = (() => {
    const id = me.sceneId;
    if (mondeClassique) return id && estSceneClassique(id) ? id : 'classique_ville_nuit';
    if (!id || estSceneClassique(id) || (source === 'onboarding' && id === 'dojo')) return 'machiya_nuit';
    return id;
  })();
  const heroImg = regle.mode === 'fixe' ? personnageAccueil(regle.cle, me.rankIndex) : null;
  const vignetteAlterne = regle.mode === 'alterne'
    ? <VignetteAlterne scene={sceneForNow(sceneHero)} images={[personnageAccueil(regle.cles[0], me.rankIndex), personnageAccueil(regle.cles[1], me.rankIndex)]} />
    : undefined;
  const curve = weeklyPoints(me.weights);
  // le carrousel du haut : ta vraie courbe voilee au dela de la periode gratuite, sinon l'exemple marque comme tel
  const dessinCourbe = (w: number, h: number) =>
    curve.length >= 2 ? (
      <WeightCurve points={curve} width={w} height={h} color={c.accent} surface={pal.carte} ligne={plan6.ligne} torii={plan6.torii} />
    ) : (
      <View style={{ width: w }}>
        <CourbePoids points={COURBE_EXEMPLE.points} style={1} cap={COURBE_EXEMPLE.cap} torii={COURBE_EXEMPLE.torii} height={h} compact label={traduire("Exemple de courbe de poids")} />
        <View style={{ position: 'absolute', top: 0, left: 2, backgroundColor: c.accentTint, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
          <Ink size={9} weight="black" color={c.accent} style={{ letterSpacing: 0.8 }}>{traduire("EXEMPLE")}</Ink>
        </View>
      </View>
    );
  // 27 octobre 2026 : les cartes du carrousel, choisies et rangees selon TES reponses (lib/v2/premium/pourToi.ts)
  const profilPourToi: ProfilPourToi = {
    objectifs: me.objectifs.length ? me.objectifs : me.goal && !contradiction ? [me.goal as ObjectifPour] : [],
    depuis: me.start != null ? kg(me.start) : null,
    cible: ciblePlan,
    seances: me.sessions,
    sports: me.sports,
  };
  const cartesCarrousel = cartesPremium(profilPourToi).map((id) => texteCarte(id, profilPourToi));
  // l'apercu de la carte nutrition : le calcul de l'ecran Plan nutritionnel avec tes mesures, sinon l'exemple marque
  const apercuNutri = apercuNutrition({ poids: me.start, taille: me.height, age: me.age, genre: me.genre, objectifs: profilPourToi.objectifs });
  const small = height < 760;
  // 26 octobre 2026 : le carrousel clair remplace le bandeau sombre ; compact sur les petits ecrans (375 x 667),
  // pour que la carte de ton plan commence encore au dessus du bouton colle en bas
  // 27 octobre 2026 : un peu plus haut, pour un titre personnalise sur trois lignes sans rien couper
  const carrouselH = height < 720 ? 176 : height < 860 ? 184 : 196;
  const apercuBarre = useApercuVisible();
  const innerW = width - GUTTER * 2 - 32;

  // 17 octobre 2026 (Houari : « les boutons en gris tant que je n'ai pas scrollé jusqu'en bas ») : tant que le bas du
  // contenu n'a pas ete vu, le bouton d'abonnement et « Continuer gratuitement » sont attenues, TOUJOURS touchables
  // (Apple : achat et sortie clairs) ; le prix garde sa couleur. Arrive en bas, fondu vers les couleurs (coupe si
  // « réduire les animations »), acquis pour cette ouverture. Contenu qui tient sans defiler : en couleur d'emblee.
  const reduireAnim = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const mesureDefil = useRef({ y: 0, vue: 0, contenu: 0 });
  const vuRef = useRef(false);
  const [vuBas, setVuBas] = useState(false);
  const vif = useSharedValue(0);
  const verifierBas = () => {
    if (vuRef.current) return;
    const m = mesureDefil.current;
    if (!basAtteint(m.y, m.vue, m.contenu)) return;
    vuRef.current = true;
    setVuBas(true);
    // sans aucun defilement (le contenu tient), la couleur est la tout de suite
    vif.value = m.y > 0 && !reduireAnim ? withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }) : 1;
  };
  const attenuer = !isPremium;
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
      ? traduire("Aujourd’hui tout est ouvert{0}, premier débit le {1} sauf si tu annules avant.", reminderPossible ? `, rappel le ${dayMonth(new Date(trial.end.getTime() - REMINDER_DAYS * DAY))}` : '', dayMonth(trial.end))
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

  return (
    <View style={{ flex: 1, backgroundColor: pal.page }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 28 }}
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
        {/* 1. Haut clair (26 octobre 2026, Houari : « le fond noir en haut, ça ne donne pas envie ») : page claire,
            retour et Restaurer en haut, le titre lisible en encre, puis le carrousel des quatre cartes Premium
            (components/yoroi/v2/premium/CarrouselPremium.tsx). Le prix, l'essai, le bouton et les mentions ne bougent pas. */}
        <View style={{ backgroundColor: pal.page, paddingTop: insets.top + 8, gap: small ? 10 : 14 }}>
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <RoundButton icon={source === 'onboarding' && onBack ? 'back' : 'close'} label={closeLabel} onPress={onTopButton} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              {/* vague 49 : la pastille du Studio se loge dans la barre ; « Aperçu, sans achat » passe dessous */}
              {apercuBarre ? <ApercuDansBarre /> : preview ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,20,34,0.75)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Icon name="eye" size={14} color={c.goldLight} />
                  <Ink size={12} weight="extraBold" color="#FFFFFF" numberOfLines={1}>{exemple ? traduire('Aperçu, prix d’exemple') : traduire('Aperçu, sans achat')}</Ink>
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
                style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: pressed ? pal.teinte : pal.carte, borderWidth: 1, borderColor: pal.anneau })}
              >
                <Ink size={13} weight="extraBold" color={pal.texte}>{traduire("Restaurer")}</Ink>
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>
          {preview && apercuBarre ? (
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,20,34,0.75)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Icon name="eye" size={13} color={c.goldLight} />
                <Ink size={11.5} weight="extraBold" color="#FFFFFF" numberOfLines={1}>{exemple ? traduire('Aperçu, prix d’exemple') : traduire('Aperçu, sans achat')}</Ink>
              </View>
            </View>
          ) : null}
          <Animated.View entering={ENTREE} style={{ paddingHorizontal: GUTTER, alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="crown" size={14} color={pal.orange} />
              <Ink size={11.5} weight="black" color={pal.orange} style={{ letterSpacing: 1.6 }}>{traduire("YOROI PREMIUM")}</Ink>
            </View>
            <Ink size={small ? 24 : 28} weight="black" tight color={pal.texte} style={{ textAlign: 'center', lineHeight: small ? 28 : 33 }} accessibilityRole="header">
              {heroTitle}
              {titleBottom ? <Ink size={small ? 24 : 28} weight="black" tight color={pal.accent}>{`\n${titleBottom}`}</Ink> : null}
            </Ink>
            {height >= 720 ? <Ink size={13.5} weight="medium" color={pal.texte2} style={{ textAlign: 'center', lineHeight: 18, maxWidth: 340 }}>{subtitle}</Ink> : null}
          </Animated.View>
          <CarrouselPremium hauteur={carrouselH} marge={GUTTER} cartes={cartesCarrousel} courbe={dessinCourbe} seances={me.sessions} nutrition={apercuNutri} />
        </View>

        <View style={{ paddingHorizontal: GUTTER, gap: height < 720 ? 12 : height < 860 ? 14 : 20, paddingTop: height < 720 ? 10 : height < 860 ? 12 : 16 }}>
          {isPremium ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.successTint, borderRadius: 16, padding: 14 }}>
              <Icon name="check" size={18} color={c.successText} stroke={3} />
              <Ink size={15} weight="extraBold" color={c.successText}>{traduire("Ton accès Premium est actif")}</Ink>
            </View>
          ) : null}

          {/* 2. (17 octobre 2026, Houari : « mettre Heny ton plan, perdre du poids, etc., à la place des notes ») : ta carte
              « Ton plan » juste sous le bandeau, avec tes vrais chiffres, puis la phrase qui relie Premium a ce plan.
              Sans plan (onboarding pas fini), la meme carte en version generale, sans aucun chiffre. Venu d'un mur,
              l'apercu du contenu bloque prend cette place. */}
          {!isPremium && mur ? (
            <ApercuSource libelle={mur.libelle} phrase={mur.phrase(compteur)} {...couleursSource(c, mur.accent)} icone={mur.icone}>
              {mur.courbe && curve.length >= 2 ? (
                <View style={{ height: 110, overflow: 'hidden', borderRadius: 14 }} accessible accessibilityLabel={traduire("Aperçu de ta courbe de poids, la suite est avec Premium")}>
                  <WeightCurve points={curve} width={innerW} height={110} color={c.accent} surface={c.surface} ligne={plan6.ligne} torii={plan6.torii} />
                </View>
              ) : null}
            </ApercuSource>
          ) : null}
          {!isPremium && !mur ? (
            <View style={{ gap: small ? 10 : 12 }}>
              <CarteTonPlan name={me.name} scene={sceneForNow(sceneHero)} personnage={heroImg} lignes={planLines.length ? planLines : lignesGenerales} arrivee={planLines.length ? planArrivee : null} compact={height < 720} vignette={vignetteAlterne} />
            </View>
          ) : null}

          {/* 2 bis. (27 octobre 2026, Houari : « jette les choses inutiles ») : la carte de la courbe et la liste analyses,
              combat, scenes sont parties : le carrousel du haut dit deja, avec TES chiffres, ce que Premium fait pour toi. */}

          {/* 3. Ce que change l'abonnement, tire de lib/v2/premium/limits.ts et offer.ts (6 lignes) */}
          {!isPremium ? (
            <View style={{ gap: 10 }}>
              <SectionTitle>{traduire("Ce que change l’abonnement")}</SectionTitle>
              <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: PREM_W, backgroundColor: c.accentTint }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingVertical: 12 }}>
                  <View style={{ flex: 1 }} />
                  <Ink size={11.5} weight="black" color={c.textMuted} style={{ width: FREE_W, textAlign: 'center', letterSpacing: 1 }}>{traduire("GRATUIT")}</Ink>
                  <View style={{ width: PREM_W, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Icon name="crown" size={12} color={c.accent} />
                    <Ink size={11.5} weight="black" color={c.accent} style={{ letterSpacing: 1 }}>{traduire("PREMIUM")}</Ink>
                  </View>
                </View>
                {PREMIUM_ROWS.slice(0, 6).map((r) => (
                  <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14, borderTopWidth: 1, borderColor: c.divider, minHeight: 56 }}>
                    <View style={{ flex: 1, paddingRight: 8, paddingVertical: 9, gap: 2 }}>
                      <Ink size={14} weight="extraBold" style={{ lineHeight: 18 }}>{traduire(r.label)}</Ink>
                      <Ink size={11} color={c.textMuted} style={{ lineHeight: 14 }}>{traduire(r.sub)}</Ink>
                    </View>
                    <View style={{ width: FREE_W, alignItems: 'center', paddingHorizontal: 4 }}>
                      {r.free ? (
                        <Ink size={12} weight="bold" color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 15 }}>{r.free}</Ink>
                      ) : (
                        <View accessible accessibilityLabel={traduire("Pas inclus")}>
                          <Icon name="lock" size={15} color={c.textMuted} />
                        </View>
                      )}
                    </View>
                    <View style={{ width: PREM_W, alignItems: 'center', paddingHorizontal: 4 }}>
                      <Ink size={12.5} weight="black" color={c.accent} style={{ textAlign: 'center', lineHeight: 16 }}>{r.premium}</Ink>
                    </View>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.successTint }}>
                  <Icon name="check" size={15} color={c.successText} stroke={3} />
                  <Ink size={12} weight="bold" color={c.successText} style={{ flex: 1, lineHeight: 16 }}>{FREE_FOREVER}</Ink>
                </View>
              </View>
            </View>
          ) : null}

          {/* 4. Preuve sociale, descendue sous le tableau (17 octobre 2026) : la vraie note des deux stores, puis deux avis reels courts, inchanges */}
          {!isPremium ? (
            <View style={{ gap: small ? 10 : 12 }}>
              <NoteLauriers compact={small} />
              <AvisCourts />
            </View>
          ) : null}

          {/* 5. Le prix : une seule carte en grand (l'annuel), le mensuel en lien discret */}
          {isPremium ? null : offers.length > 0 ? (
            <View style={{ gap: 10 }}>
              {annual ? (
                <PlanCard
                  on={selected?.pkg.identifier === annual.pkg.identifier}
                  onPress={() => pick(annual)}
                  name={annual.info.duration || annual.info.short}
                  pill={annualTrial ? essaiGratuit(annualTrial.days) : null}
                  badge={savings ? traduire("Économise {0} %", savings) : null}
                  price={annual.info.priceString}
                  per={annual.info.per}
                  left={annual.info.perMonth ? traduire("Soit {0} par mois", annual.info.perMonth) : null}
                  right={annual.info.perDay ? traduire("{0} par jour", annual.info.perDay) : null}
                  extra={traduire("+ une scène exclusive offerte")}
                  a11y={`${annual.info.name}, ${annual.info.priceString} ${annual.info.per}${annual.info.perMonth ? traduire(", soit {0} par mois", annual.info.perMonth) : ''}${annualTrial ? traduire(", {0} jours gratuits", annualTrial.days) : ''}`}
                />
              ) : null}
              {monthly ? (
                annual && selected?.pkg.identifier !== monthly.pkg.identifier ? (
                  <Pressable onPress={() => pick(monthly)} accessibilityRole="button" accessibilityLabel={traduire("Choisir le mensuel, {0} par mois, sans engagement", monthly.info.priceString)} hitSlop={6} style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={14} weight="extraBold" color={c.ink} style={{ textDecorationLine: 'underline' }}>{traduire("ou {0} par mois, sans engagement", monthly.info.priceString)}</Ink>
                  </Pressable>
                ) : (
                  <PlanCard
                    on={selected?.pkg.identifier === monthly.pkg.identifier}
                    onPress={() => pick(monthly)}
                    name="1 mois, sans engagement"
                    pill={trialOf(monthly.pkg.raw) ? essaiGratuit(trialOf(monthly.pkg.raw)!.days) : null}
                    price={monthly.info.priceString}
                    per={monthly.info.per}
                    compact
                    a11y={`${monthly.info.name}, ${monthly.info.priceString} ${monthly.info.per}`}
                  />
                )
              ) : null}
              {others.map((o) => (
                <PlanCard
                  key={o.pkg.identifier}
                  on={selected?.pkg.identifier === o.pkg.identifier}
                  onPress={() => pick(o)}
                  name={o.info.duration || o.info.short}
                  pill={trialOf(o.pkg.raw) ? essaiGratuit(trialOf(o.pkg.raw)!.days) : null}
                  price={o.info.priceString}
                  per={o.info.per}
                  left={o.info.perMonth ? traduire("Soit {0} par mois", o.info.perMonth) : null}
                  compact
                  a11y={`${o.info.name}, ${o.info.priceString} ${o.info.per}`}
                />
              ))}
            </View>
          ) : waiting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 }}>
              <ChargementPetit size={18} />
              <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Chargement des offres")}</Ink>
            </View>
          ) : (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingVertical: 12, paddingHorizontal: 12 }}>
              {/* vague 32 : bandeau calme, sans rouge ; « Réessayer » est le bouton du pied */}
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.indigoTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={offersStatus === 'unavailable' || TEST_BUILD ? 'info' : 'sync'} size={16} color={c.indigo} />
              </View>
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

          {/* 7. Ce qui se passe apres, en une ligne */}
          {!isPremium && apres ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 }}>
              <View style={{ marginTop: 1 }}>
                <Icon name={trial ? 'bell' : 'check'} size={15} color={c.successText} stroke={2.4} />
              </View>
              <Ink size={13} weight="bold" color={c.textSecondary} style={{ flex: 1, lineHeight: 18 }}>{apres}</Ink>
            </View>
          ) : null}

          {/* 9. Mentions legales juste sous le prix (3.1.2) et liens : pages internes, lisibles hors connexion */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            {legal ? <Ink size={11.5} color={c.textSecondary} style={{ lineHeight: 16.5, textAlign: 'center' }}>{legal}</Ink> : null}
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

      {/* Colle en bas, toujours visible : 6. le bouton d'achat et le prix dessous, 8. Continuer gratuitement */}
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: insets.bottom + 6, backgroundColor: pal.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: theme.isDark ? 1 : 0, borderColor: c.border, shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
        {attenuer && !vuBas ? <IndicateurDefiler onPress={allerEnBas} reduire={!!reduireAnim} /> : null}
        {isPremium ? (
          <BottomButton label={traduire("Continuer")} onPress={() => onFinish('premium')} />
        ) : (
          <>
            {selected ? (
              <BottomButton label={buyLabel} onPress={() => void buy()} loading={busy} vif={attenuer ? vif : undefined} />
            ) : (
              <BottomButton
                label={offersStatus === 'unavailable' ? traduire('Abonnement indisponible ici') : traduire('Réessayer')}
                onPress={retryOffers}
                loading={waiting}
                disabled={offersStatus === 'unavailable'}
                vif={attenuer ? vif : undefined}
              />
            )}
            {selected ? (
              <View style={{ marginTop: 6, gap: 1 }}>
                <Ink size={13.5} weight="extraBold" style={{ textAlign: 'center', lineHeight: 18 }}>{priceLine}</Ink>
                <Ink size={11.5} weight="medium" color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 15 }}>{priceSub}</Ink>
              </View>
            ) : (
              <View style={{ marginTop: 6, gap: 2, alignItems: 'center' }} accessibilityLiveRegion="polite">
                <Ink size={13} weight="bold" color={!waiting && offersStatus === 'error' ? c.ink : c.textSecondary} style={{ textAlign: 'center', lineHeight: 17 }}>{noOfferLine}</Ink>
                {IN_EXPO_GO ? (
                  <Ink size={11.5} color={c.textMuted} style={{ textAlign: 'center', lineHeight: 15 }}>{traduire("Dans Expo Go, l’achat est impossible : il ne marche que dans l’app installée.")}</Ink>
                ) : null}
              </View>
            )}
            <BoutonGratuit onPress={() => continueFree('bouton')} vif={attenuer ? vif : undefined} />
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

function PlanCard({ on, onPress, name, pill, badge, price, per, left, right, extra, compact, a11y }: {
  on: boolean;
  onPress: () => void;
  name: string;
  pill?: string | null;
  badge?: string | null;
  price: string;
  per: string;
  left?: string | null;
  right?: string | null;
  extra?: string;
  compact?: boolean;
  a11y: string;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // texte des pastilles pleines (or, mousse) : blanc en clair, encre du fond en sombre (les teintes s'eclaircissent)
  const surClair = theme.isDark ? c.background : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={a11y}
      style={({ pressed }) => ({
        borderRadius: 22,
        borderWidth: on ? 2.5 : 1.5,
        borderColor: on ? c.ink : c.border,
        backgroundColor: c.surface,
        paddingHorizontal: on ? 16 : 17,
        paddingVertical: compact ? (on ? 13 : 14) : on ? 15 : 16,
        marginTop: badge ? 8 : 0,
        opacity: pressed ? 0.94 : 1,
      })}
    >
      {badge ? (
        <View style={{ position: 'absolute', top: -11, right: 16, backgroundColor: c.goldDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Ink size={11} weight="black" color={surClair}>{badge}</Ink>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Ink size={compact ? 16 : 19} weight="black" tight>{name}</Ink>
          {pill ? (
            <View style={{ backgroundColor: c.success, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Ink size={10.5} weight="black" color={surClair} style={{ letterSpacing: 0.8 }}>{pill.toUpperCase()}</Ink>
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Ink size={compact ? 18 : 24} weight="black" tight numberOfLines={1}>{price}</Ink>
          {compact && per ? <Ink size={11.5} weight="bold" color={c.textMuted}>{per}</Ink> : null}
        </View>
      </View>
      {left || right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
          {left ? <Ink size={13} weight="bold" color={c.textSecondary}>{left}</Ink> : <View />}
          {right ? <Ink size={13} weight="bold" color={c.textSecondary}>{right}</Ink> : null}
        </View>
      ) : null}
      {extra ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: c.divider }}>
          <Icon name="image" size={14} color={c.goldDeep} />
          <Ink size={12.5} weight="extraBold" color={c.goldDeep}>{extra}</Ink>
        </View>
      ) : null}
    </Pressable>
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
 * Apercu du contenu bloque quand le paywall vient d'un mur (lib/v2/premium/sources.ts) : son icone, son libelle,
 * sa phrase, puis le contenu (ta courbe voilee) ou, a defaut, des lignes fantomes sans aucune vraie valeur,
 * effacees vers le bas par un degrade vers la surface de la carte (le mode sombre suit).
 */
function ApercuSource({ libelle, phrase, encre, fond, icone, children }: { libelle: string; phrase: string; encre: string; fond: string; icone: IconName; children?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const largeurs = [0.86, 0.64, 0.74];
  return (
    <View style={{ borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icone} size={18} color={encre} />
        </View>
        <Ink size={16} weight="black" style={{ flex: 1 }} numberOfLines={2}>{libelle}</Ink>
        <PastillePremium />
      </View>
      <Ink size={14} weight="bold" color={c.textSecondary} style={{ lineHeight: 20 }}>{phrase}</Ink>
      {children ?? (
        <View style={{ gap: 10, paddingTop: 2 }} accessible accessibilityLabel={traduire("Aperçu de {0}, la suite est avec Premium", libelle)}>
          {largeurs.map((w, k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: fond }} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ height: 10, width: `${Math.round(w * 100)}%`, borderRadius: 5, backgroundColor: c.fillSubtle }} />
                <View style={{ height: 8, width: `${Math.round(w * 60)}%`, borderRadius: 4, backgroundColor: c.fillSoft }} />
              </View>
              <View style={{ width: 44, height: 14, borderRadius: 7, backgroundColor: fond }} />
            </View>
          ))}
          <LinearGradient pointerEvents="none" colors={[couleurA(c.surface, 0), couleurA(c.surface, 0.7), c.surface]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        </View>
      )}
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
    dy.value = withRepeat(withSequence(withTiming(2.5, { duration: 750, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 750, easing: Easing.inOut(Easing.quad) })), -1);
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

/**
 * Genre « autre » (27 octobre 2026) : la photo de ta carte « Ton plan » montre l'homme et la femme de ton univers en
 * alternance, toutes les 3,5 s, en fondu ; « réduire les animations » : la premiere image seulement, fixe.
 */
function VignetteAlterne({ scene, images }: { scene: ImageSourcePropType; images: [ImageSourcePropType, ImageSourcePropType] }) {
  const reduire = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduire) return;
    const t = setInterval(() => setI((x) => 1 - x), 3500);
    return () => clearInterval(t);
  }, [reduire]);
  const W = 84;
  const BUSTE = 168;
  return (
    <>
      <Image source={scene} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <Animated.View key={i} entering={reduire ? undefined : FadeIn.duration(600)} exiting={reduire ? undefined : FadeOut.duration(600)} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={images[i]} resizeMode="contain" style={{ position: 'absolute', top: 6, left: (W - BUSTE) / 2, width: BUSTE, height: BUSTE / 0.75 }} />
      </Animated.View>
    </>
  );
}

/** « Continuer gratuitement » : gris doux tant que le bas n'est pas vu (vif = 0), contour et encre ensuite. Toujours touchable. */
function BoutonGratuit({ onPress, vif }: { onPress: () => void; vif?: SharedValue<number> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const couleur = useAnimatedStyle(() => ({ opacity: vif ? vif.value : 1 }));
  const gris = useAnimatedStyle(() => ({ opacity: vif ? 1 - vif.value : 0 }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={traduire("Continuer gratuitement")}
      style={{ minHeight: 48, marginTop: 8, borderRadius: 16, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, overflow: 'hidden' }}
    >
      {({ pressed }) => (
        <>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: pressed ? c.fillSoft : c.surface }, couleur]} />
          <View>
            <Animated.View style={couleur}>
              <Ink size={15} weight="extraBold" color={c.ink}>{traduire("Continuer gratuitement")}</Ink>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, gris]}>
              <Ink size={15} weight="extraBold" color={c.textSecondary}>{traduire("Continuer gratuitement")}</Ink>
            </Animated.View>
          </View>
        </>
      )}
    </Pressable>
  );
}

function BottomButton({ label, onPress, loading, disabled, vif }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; vif?: SharedValue<number> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // 17 octobre 2026 : gris doux tant que le bas n'est pas vu (vif = 0), couleur ensuite ; jamais desactive pour autant
  const couleur = useAnimatedStyle(() => ({ opacity: vif ? vif.value : 1 }));
  const gris = useAnimatedStyle(() => ({ opacity: vif ? 1 - vif.value : 0 }));
  return (
    <Pressable
      onPress={() => {
        if (loading || disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!loading, disabled: !!disabled }}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : 1,
        minHeight: 58,
        borderRadius: 18,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: c.fillSubtle,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {({ pressed }) => (
        <>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: pressed ? c.accentPressed : c.accent }, couleur]} />
          {loading ? (
            <View>
              <Animated.View style={couleur}>
                <ActivityIndicator color={c.onAccent} />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, gris]}>
                <ActivityIndicator color={c.textSecondary} />
              </Animated.View>
            </View>
          ) : (
            <View>
              <Animated.View style={couleur}>
                <Ink size={17} weight="extraBold" color={c.onAccent} style={{ textAlign: 'center' }}>{label}</Ink>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, gris]}>
                <Ink size={17} weight="extraBold" color={c.textSecondary} style={{ textAlign: 'center' }}>{label}</Ink>
              </Animated.View>
            </View>
          )}
        </>
      )}
    </Pressable>
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
          <BottomButton label={traduire("C’est parti")} onPress={onDone} />
        </View>
      </View>
    </Animated.View>
  );
}

export default Paywall;
