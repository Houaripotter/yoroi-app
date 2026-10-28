/**
 * Dojo v2 (vague 14) : le monde du guerrier, seul endroit de la gamification.
 * En haut, ton personnage sur ta scene dans le cadre de ton rang, puis la piece d'armure
 * du palier suivant qui se construit en 3 etapes (vague 40, rang puis dan), le geste du jour, ton prochain objectif,
 * tes semaines tenues, tes niveaux par sport, tes sceaux et les portes du Dojo.
 * Une seule fois pour les anciens utilisateurs : la bienvenue « Rien de ton travail n'est perdu ».
 * Vague 45 : l'univers du personnage (Japon ou Classique, ou sans personnage) s'applique partout ici.
 * Vague 47 : scene, aujourd'hui (serie de jours et coffre du jour), ta prochaine recompense, semaines tenues,
 * sceaux, niveaux par sport, explorer le Dojo, boutique, combat et partage. Les regles d'XP sont dans le chemin.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { TourAnchor, registerTourScroller } from '@/components/yoroi/v2/tour/TourAnchor';
import { defilementPourMontrer, hautDeBarre } from '@/components/yoroi/v2/tour/placement';
import { FeatureList } from '@/components/yoroi/v2/FeatureList';
import { INK_TAB_BAR_SPACE } from '@/components/yoroi/v2/InkTabBar';
import { ArmureEnConstruction, EtapesPiece } from '@/components/yoroi/v2/dojo/ArmureEnConstruction';
import { construction } from '@/lib/v2/dojo/pieces';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';
import { SealMedal } from '@/components/yoroi/v2/dojo/SealMedal';
import { Celebration } from '@/components/yoroi/v2/dojo/Celebration';
import { Bienvenue } from '@/components/yoroi/v2/dojo/Bienvenue';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { SCENES_VOYAGES, animationDeScene, type VoyageSceneId } from '@/lib/v2/espace/voyages';
import { chargerScenesGagnees, donnerEssaiGrandCoffre, noterSceneAvantEssai, prochainPalier, verifierPaliersSerie } from '@/lib/v2/dojo/recompensesScenes';
import { SceneGagnee } from '@/components/yoroi/v2/dojo/SceneGagnee';
import { AbriDojo } from '@/components/yoroi/v2/dojo/AbriDojo';
import { usePremium } from '@/context/PremiumContext';
import { isThemeUnlocked } from '@/lib/v2/dojo/personnages';
import { saveEspace, type SceneId } from '@/lib/v2/espace';
import { BreathingFigure, GlassTag, ScenePlate } from '@/components/yoroi/v2/dojo/DojoHero';
import { Gates } from '@/components/yoroi/v2/dojo/Gates';
import { VitrineBoutique } from '@/components/yoroi/v2/dojo/VitrineBoutique';
import { imageDuRang, nomSceau, universDe, vignettesBoutique } from '@/lib/v2/dojo/dojoAffichage';
import { libelleChemin, libelleConstruction, rangNom, rangTenue, rangTitre } from '@/lib/v2/dojo/univers';
import { Bar, ChevronIcon, LevelPlate, LockIcon, PersonIcon, RankFrame, formatXp, tap } from '@/components/yoroi/v2/dojo/parts';
import { RANKS, getPendingCelebration, getWelcome, markCelebrationSeen, markWelcomeSeen, openDailyChest, setWeekPause } from '@/lib/v2/armure';
import { GLASS_L, loadHydration, saveHydrationAmount } from '@/lib/v2/accueil/hydration';
import { Aujourdhui } from '@/components/yoroi/v2/dojo/Aujourdhui';
import { BoutonPause, FeuillePause } from '@/components/yoroi/v2/dojo/PauseSemaine';
import { VisiteDojo, etatVisiteDojo, type CibleDojo, type Rect } from '@/components/yoroi/v2/dojo/VisiteDojo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { programmerRappelCoffre } from '@/lib/v2/dojo/rappelCoffre';
import type { BeltInfo, Celebration as CelebrationData, PauseKind, WeekStatus, WelcomeSummary } from '@/lib/v2/armure';
import { familyOf } from '@/lib/v2/dojo/seals';
import { useArmure } from '@/lib/v2/dojo/useArmure';
import { PACKS, THEMES, THEME_IMAGES, aUnPersonnage, parsePersonnage, personnageImage, personnageName } from '@/lib/v2/dojo/personnages';
import type { Gender } from '@/lib/v2/dojo/personnages';
import { carteBlanche, ton } from '@/components/yoroi/v2/seance/pastel';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const NB = ' ';
const SHORT_MONTHS = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const shortDay = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
};

/** Vague 48 : ancres de la visite du Dojo (la carte a entourer) */
const ANCRES: Partial<Record<CibleDojo, View | null>> = {};
/** 28 octobre 2026 : le rayon des coins de chaque carte montree par la visite du Dojo */
const RAYONS_DOJO: Record<CibleDojo, number> = { hero: 30, aujourdhui: 24, recompense: 22, semaines: 22, sceaux: 22, aide: 23 };

function Section({ i, children, ancre }: { i: number; children: React.ReactNode; ancre?: CibleDojo }) {
  return (
    <Animated.View entering={ENTREE}>
      <View collapsable={false} ref={ancre ? (v) => { ANCRES[ancre] = v; } : undefined}>{children}</View>
    </Animated.View>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 2 }}>
      <Ink size={18} weight="black" tight style={{ flex: 1 }} accessibilityRole="header">
        {title}
      </Ink>
      {action && onAction ? (
        <Pressable
          onPress={() => {
            tap();
            onAction();
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: 44, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}
        >
          <Ink size={14} weight="extraBold" color={c.accent}>{action}</Ink>
          <ChevronIcon size={14} color={c.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Dojo() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: winH } = useWindowDimensions();
  const { snap, espace, reload } = useArmure();
  const [refreshing, setRefreshing] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [welcome, setWelcome] = useState<WelcomeSummary | null>(null);
  // la bienvenue attend la fin de la visite guidee
  const visiteEnCours = useVisiteEnCours();

  const st = snap?.state;
  const rank = st?.rank ?? { ...RANKS[0], nextMinXp: RANKS[1].minXp };
  const xp = st?.xp ?? 0;
  // Vague 45 : l'univers choisi donne les noms de rangs, la piece qui se construit et les libelles
  const u = universDe(espace);
  const avecPerso = aUnPersonnage(espace.personnage);
  // vague 47 : seuls le guerrier et le sportif Classique changent de tenue a chaque rang (pas les personnages Vie reelle, Sports, Legendes)
  const tenueEvolue = ['guerrier', 'classique'].includes(parsePersonnage(espace.personnage).kind);
  const cons = useMemo(() => construction(xp, u), [xp, u]);
  const title = rangTitre(rank.index, rank.dan ?? 0, u);
  const gender: Gender = parsePersonnage(espace.personnage).gender;
  const image = personnageImage(espace.personnage, rank.index, st?.sportCounts ?? {});
  const scene = THEME_IMAGES[espace.scene] ?? THEME_IMAGES.dojo;
  // objectif de seances pas encore choisi par l'utilisateur : on le dit, sans l'imposer
  const goalOpen = st && st.goalChosen !== undefined ? !st.goalChosen : espace.objectifChoisi !== true;
  const weekGoal = st?.weeklyGoal ?? espace.objectifSemaine;

  useEffect(() => {
    if (!snap) return;
    let alive = true;
    // la bienvenue des anciens utilisateurs passe avant tout, une seule fois
    getWelcome()
      .then(async (w) => {
        if (!alive) return;
        if (w) {
          setWelcome(w);
          return;
        }
        const cel = await getPendingCelebration();
        if (alive && (cel.rankUp || cel.seals.length || cel.plate)) setCelebration(cel);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [snap]);

  // vague 40 : l'eclat dore sur la piece quand une etape ou un rang vient d'etre gagne
  const [eclat, setEclat] = useState(false);
  const closeCelebration = useCallback(() => {
    setCelebration((cel) => {
      if (cel && (cel.plate || cel.rankUp)) setEclat(true);
      return null;
    });
    void markCelebrationSeen({ plate: true });
  }, []);

  const closeWelcome = useCallback(() => {
    setWelcome(null);
    void markWelcomeSeen().then(() => markCelebrationSeen({ plate: true }));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const go = (href: string) => router.push(href as any);

  // Vague 48 : la visite du Dojo avec la voix
  const scrollRef = useRef<ScrollView>(null);
  // 27 octobre 2026 : la visite guidee remonte l'onglet en haut avant de montrer ton rang
  // 28 octobre 2026 : et elle le fait defiler jusqu'a ce qu'elle montre (ta serie, ta prochaine recompense)
  const scrollY = useRef(0);
  useEffect(
    () =>
      registerTourScroller('dojo', {
        scrollBy: (dy) => scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: true }),
        scrollToTop: () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
      }),
    [],
  );
  const [visite, setVisite] = useState(false);
  const [visiteEtat, setVisiteEtat] = useState<'faite' | 'plus_tard' | null>('faite');
  useEffect(() => {
    void etatVisiteDojo().then(setVisiteEtat);
  }, []);
  // proposee une fois, apres la bienvenue et les celebrations
  useEffect(() => {
    if (!snap || welcome || celebration || visiteEnCours || visiteEtat !== null) return;
    const t = setTimeout(() => setVisite(true), 900);
    return () => clearTimeout(t);
  }, [snap, welcome, celebration, visiteEnCours, visiteEtat]);
  // 28 octobre 2026 : la carte s'arrete la ou elle tient avec sa bulle (components/yoroi/v2/tour/placement.ts), et dit
  // le rayon de ses coins pour que le cadre de la visite l'epouse
  const mesurer = useCallback(async (cible: CibleDojo, hBulle: number): Promise<Rect | null> => {
    const v = ANCRES[cible];
    if (!v) return null;
    const rayon = RAYONS_DOJO[cible];
    const enFenetre = () =>
      new Promise<Rect | null>((resolve) => {
        try {
          v.measureInWindow((x, y, w, h) => resolve(w > 0 ? { x, y, w, h, r: rayon } : null));
        } catch {
          resolve(null);
        }
      });
    // vague 48 : defilement instantane et mesure juste apres, pour que chaque etape s'affiche sans attente
    const attendre = (ms: number) => new Promise((res) => setTimeout(res, ms));
    if (cible === 'aide') {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      const r0 = await enFenetre();
      const ecran = { W: width, H: winH, haut: insets.top + 8, bas: winH - insets.bottom - 10, barre: hautDeBarre(winH, insets.bottom) };
      const dy = r0 ? defilementPourMontrer(r0, hBulle, ecran, 8) : 0;
      if (r0 && Math.abs(dy) >= 4) scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: false });
      else if (r0) return r0;
    }
    await attendre(60);
    return (await enFenetre()) ?? (await attendre(150), enFenetre());
  }, [insets.top, insets.bottom, winH, width]);

  // Vague 47 : le rappel du coffre suit l'etat du jour (rien si les notifications ne sont pas autorisees)
  useEffect(() => {
    if (st?.coffre) void programmerRappelCoffre(st);
  }, [st?.coffre?.etat, st?.serie?.jours]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vague 47 : le coffre du jour, et un verre d'eau pour faire le geste en un geste
  const { isPremium, isAnnualPremium } = usePremium();
  const ouvrirCoffre = useCallback(async () => {
    const r = await openDailyChest();
    // 18 octobre : le grand coffre d'un compte gratuit offre 24 h d'essai d'une scene Voyages encore fermee
    let cadeau: { id: string; nom: string; image: ImageSourcePropType } | null = null;
    if (r?.grand && !isPremium) {
      const verrouillee = (id: VoyageSceneId) => {
        const t = THEMES.find((x) => x.id === id);
        return !!t && !isThemeUnlocked(t, rank.index, false, isAnnualPremium);
      };
      const essai = await donnerEssaiGrandCoffre(verrouillee).catch(() => null);
      const v = essai ? SCENES_VOYAGES.find((x) => x.id === essai.id) : null;
      if (v) cadeau = { id: v.id, nom: v.nom, image: v.image };
    }
    await reload(true);
    return r ? { ...r, cadeau } : null;
  }, [reload, isPremium, isAnnualPremium, rank.index]);
  // mettre une scene gagnee ou en essai (la scene d'avant est gardee pour la fin de l'essai)
  const mettreScene = useCallback(
    async (id: string, essai: boolean) => {
      if (essai) await noterSceneAvantEssai(espace.sceneFixe ?? espace.scene);
      await saveEspace({ scene: id as SceneId });
      await reload(true);
    },
    [espace.sceneFixe, espace.scene, reload],
  );

  // 18 octobre : les scenes gagnees avec la serie (7, 30 et 100 jours d'affilee)
  const [sceneGagnee, setSceneGagnee] = useState<string | null>(null);
  const [gagneesEnAttente, setGagneesEnAttente] = useState<string[]>([]);
  useEffect(() => {
    if (!st?.serie) return;
    void verifierPaliersSerie(st.serie.jours, st.serie.record)
      .then((n) => (n.length ? setGagneesEnAttente((a) => [...a, ...n.filter((x) => !a.includes(x))]) : undefined))
      .catch(() => undefined);
  }, [st?.serie?.jours, st?.serie?.record]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void chargerScenesGagnees();
  }, []);
  const palierSuivant = st?.serie ? prochainPalier(Math.max(st.serie.jours, 0)) : null;
  const textePalier = palierSuivant
    ? traduirePluriel(palierSuivant.reste, palierSuivant.reste > 1, "Encore {0} jour d’affilée pour gagner la scène {1}", "Encore {0} jours d’affilée pour gagner la scène {1}", palierSuivant.reste, SCENES_VOYAGES.find((x) => x.id === palierSuivant.scene)?.nom ?? '')
    : undefined;
  const noterVerre = useCallback(async () => {
    const h = await loadHydration();
    await saveHydrationAmount(Math.round((h.amount + GLASS_L) * 1000) / 1000, h.goal);
    await reload(true);
  }, [reload]);

  // Vague 47 : la pause de la semaine, dans une feuille a trois choix
  const [pauseOuverte, setPauseOuverte] = useState(false);
  const choisirPause = (k: PauseKind) => {
    setPauseOuverte(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void setWeekPause(k).then(() => reload(true));
  };
  const reprendreSemaine = () => {
    void setWeekPause(null).then(() => reload(true));
  };

  const weeks = useMemo(() => (st?.weeks ?? []).slice(-4), [st?.weeks]);
  // Vague 45 : les objectifs de rang sont deja dans « Ta prochaine recompense », on garde les autres, dans l'univers choisi
  // Vague 45 : la vitrine de la boutique
  const vignettes = useMemo(() => vignettesBoutique(u, espace.personnage, rank.index), [u, espace.personnage, rank.index]);
  const imageChemin = imageDuRang(espace.personnage, Math.min(4, rank.index + 1), u).image;
  const belts: BeltInfo[] = snap?.belts?.length ? snap.belts : st?.topBelts ?? [];
  const seals = snap?.seals ?? [];
  const earnedSeals = seals.filter((s) => s.earned).sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''));
  const sealsCount = st?.sealsCount ?? earnedSeals.length;
  const sealsTotal = st?.sealsTotal ?? (seals.length || 41);
  const nextSeal = seals.filter((s) => !s.earned && s.target > 1).sort((a, b) => b.current / b.target - a.current / a.target)[0];

  // Mesures de la scene
  const W = width - 32;
  // vague 47 : scene un peu plus basse pour que ta serie et ton coffre se voient sans defiler
  const heroH = Math.round(Math.min(370, Math.max(320, W * 1.0)));
  const figH = heroH - 112;
  const figW = Math.round((figH * 3) / 4);
  const plateT = 58;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scrollRef}
        onScroll={(ev) => {
          scrollY.current = ev.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: insets.bottom + INK_TAB_BAR_SPACE, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* En-tete */}
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Ink size={30} weight="black" tight accessibilityRole="header" style={{ letterSpacing: -0.5 }}>{traduire("Dojo")}</Ink>
          </View>
          {/* vague 48 : la visite du Dojo, a revoir quand on veut */}
          <TourAnchor id="dojo.aide" rayon="rond">
          <Pressable
            ref={(v) => {
              ANCRES.aide = v as unknown as View | null;
            }}
            onPress={() => {
              tap();
              setVisite(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Comment marche le Dojo, la visite avec la voix")}
            style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.surface, shadowColor: '#1B2A44', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 })}
          >
            <Ink size={18} weight="black" color={c.accentText}>?</Ink>
            {visiteEtat !== 'faite' ? <View style={{ position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: '#E8551E' }} /> : null}
          </Pressable>
          </TourAnchor>
          <Pressable
            onPress={() => {
              tap();
              go('/dojo/boutique');
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Personnages et scènes")}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: pressed ? c.fillSoft : c.surface, shadowColor: '#1B2A44', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 })}
          >
            <PersonIcon color={c.accentText} />
            <Ink size={14} weight="extraBold">{traduire("Personnages")}</Ink>
          </Pressable>
        </View>

        {/* Scene : ton personnage et ton rang */}
        <Section i={0} ancre="hero">
          <TourAnchor id="dojo.rang" rayon={30}>
          <Pressable
            onPress={() => {
              tap();
              go('/dojo/rangs');
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("{0}rang {1}, {2} XP. Voir {3}", avecPerso ? `${personnageName(espace.personnage)}, ` : '', title, formatXp(xp), libelleChemin(u).toLowerCase())}
          >
            <RankFrame rankIndex={rank.index} dan={rank.dan ?? 0}>
            <ScenePlate scene={scene} height={heroH} animation={animationDeScene(espace.scene)}>
              <View style={{ position: 'absolute', left: 14, right: 14, top: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <GlassTag style={{ flexShrink: 1, maxWidth: '86%' }}>
                  <Ink size={12} weight="extraBold" color={c.goldDeep}>{rank.dan ? (rank.dan === 1 ? traduire("Rang {0} sur {1}, 1er dan", RANKS.length, RANKS.length) : traduire("Rang {0} sur {1}, {2}e dan", RANKS.length, RANKS.length, rank.dan)) : traduire("Rang {0} sur {1}", rank.index + 1, RANKS.length)}</Ink>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Ink size={20} weight="black" tight numberOfLines={1} style={{ flexShrink: 1 }}>
                      {rangNom(rank.index, u)}
                    </Ink>
                  </View>
                  {/* Vague 45 : la tenue du rang, seulement quand un personnage la porte */}
                  {tenueEvolue ? <Ink size={12} color={c.textSecondary} numberOfLines={2}>{rangTenue(rank.index, u)}</Ink> : null}
                </GlassTag>
              </View>
              {/* Vague 45 : « Sans personnage », la scene seule */}
              {avecPerso ? (
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
                  <BreathingFigure source={image} width={figW} height={figH} label={`${personnageName(espace.personnage)}, ${rangTenue(rank.index, u).toLowerCase()}`} />
                </View>
              ) : null}
            </ScenePlate>
            </RankFrame>
          </Pressable>
          </TourAnchor>
        </Section>

        {/* Vague 47 : aujourd'hui, ta serie de jours et ton coffre du jour (la raison de revenir chaque jour) */}
        {st?.serie && st.coffre ? (
          <Section i={1} ancre="aujourdhui">
            <TourAnchor id="dojo.aujourdhui" rayon={24}>
              <Aujourdhui serie={st.serie} coffre={st.coffre} onOuvrir={ouvrirCoffre} onVerre={noterVerre} onCadeau={(id) => void mettreScene(id, true)} palier={isPremium ? undefined : textePalier} suite={cons.resteXp > 0 ? traduire("Encore {0}{1}XP pour {2}", formatXp(cons.resteXp), NB, cons.palier) : undefined} />
            </TourAnchor>
            {/* 18 octobre : ton rang, ton XP et ta serie a l'abri, copie automatique dans ton cloud */}
            <AbriDojo rang={title} xp={xp} serie={st.serie.jours} />
          </Section>
        ) : null}

        {/* Vague 45 : « Ta prochaine recompense », la piece qui se construit et la barre vers le prochain rang, toujours visibles */}
        <Section i={1} ancre="recompense">
          <TourAnchor id="dojo.recompense" rayon={22}>
          <Pressable
            onPress={() => {
              tap();
              go('/dojo/rangs');
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Ta prochaine récompense : {0}, {1}, étape {2} sur 3, {3}. {4} XP sur {5}, encore {6} XP", cons.palier, cons.piece.nom, cons.enCours, cons.piece.etapes[cons.faites], formatXp(xp), formatXp(cons.objectifXp), formatXp(cons.resteXp))}
            style={({ pressed }) => ({ ...carteBlanche(c.surface, c.border), backgroundColor: pressed ? c.fillSoft : c.surface, padding: 16, gap: 14 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ArmureEnConstruction piece={cons.piece} progres={cons.progres} taille={88} eclat={eclat} />
                <EtapesPiece faites={cons.faites} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Ink size={12.5} weight="extraBold" color={ton('creme').encre}>{traduire("Ta prochaine récompense")}</Ink>
                <Ink size={20} weight="black" tight numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>{cons.palier}</Ink>
                <Ink size={14} weight="extraBold" numberOfLines={2}>{traduire(cons.piece.nom)}</Ink>
                <Ink size={12} color={c.textSecondary} numberOfLines={3}>
                  {traduire("{0} : étape {1} sur 3, {2}", tenueEvolue ? libelleConstruction(u) : traduire('Ta récompense se construit'), cons.enCours, cons.piece.etapes[cons.faites])}
                </Ink>
              </View>
              <ChevronIcon />
            </View>
            <View style={{ gap: 6 }}>
              <Bar progress={cons.progres} color={c.gold} track={c.fillSoft} height={8} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, rowGap: 2 }}>
                <Ink size={13} weight="bold" color={c.textSecondary} style={{ flexGrow: 1 }}>{traduire("{0}{1}XP sur {2}", formatXp(xp), NB, formatXp(cons.objectifXp))}</Ink>
                <Ink size={13} weight="extraBold" color={c.accent}>{traduire("encore {0}{1}XP", formatXp(cons.resteXp), NB)}</Ink>
              </View>
            </View>
          </Pressable>
          </TourAnchor>
        </Section>

        {/* Vague 47 : tes semaines reussies, avec des jokers et une pause faciles a comprendre */}
        <Section i={4} ancre="semaines">
          <View style={{ ...carteBlanche(c.surface, c.border), padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Ink size={34} weight="black" tight color={st && st.weekStreak > 0 ? c.accent : c.ink}>{String(st?.weekStreak ?? 0)}</Ink>
                  <Ink size={16} weight="extraBold" style={{ flexShrink: 1 }}>
                    {(st?.weekStreak ?? 0) > 1 ? traduire('semaines réussies d’affilée') : traduire('semaine réussie d’affilée')}
                  </Ink>
                </View>
                <Ink size={13} color={c.textSecondary}>
                  {traduirePluriel(weekGoal, weekGoal > 1, "Ton objectif : {0} séance par semaine. Chaque semaine réussie : +{1}{2}XP.", "Ton objectif : {0} séances par semaine. Chaque semaine réussie : +{1}{2}XP.", weekGoal, st?.weekXp ?? 50, NB)}
                </Ink>
                {st?.bestStreak ? <Ink size={13} color={c.textSecondary}>{traduirePluriel(st.bestStreak, st.bestStreak > 1, "Ton record : {0} semaine.", "Ton record : {0} semaines.", st.bestStreak)}</Ink> : null}
                {goalOpen ? (
                  <Pressable onPress={() => router.push('/settings?objectif=1' as any)} accessibilityRole="button" accessibilityLabel={traduire("Choisir mon objectif de séances")} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                    <Ink size={13} weight="extraBold" color={c.accent}>{traduire("Choisir mon objectif")}</Ink>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ alignItems: 'center', gap: 2 }} accessible accessibilityLabel={traduirePluriel((st?.shields ?? 0), (st?.shields ?? 0) > 1, "{0} joker sur 2", "{0} jokers sur 2", st?.shields ?? 0)}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <MaterialCommunityIcons name={(st?.shields ?? 0) >= 1 ? 'cards-playing' : 'cards-playing-outline'} size={28} color={(st?.shields ?? 0) >= 1 ? c.gold : c.textMuted} />
                  <MaterialCommunityIcons name={(st?.shields ?? 0) >= 2 ? 'cards-playing' : 'cards-playing-outline'} size={28} color={(st?.shields ?? 0) >= 2 ? c.gold : c.textMuted} />
                </View>
                <Ink size={11} weight="bold" color={c.textMuted}>{(st?.shields ?? 0) === 0 ? traduire('aucun joker') : traduirePluriel(st?.shields ?? 0, (st?.shields ?? 0) > 1, "{0} joker", "{0} jokers", st?.shields)}</Ink>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {weeks.map((w) => (
                <WeekTile key={w.monday} w={w} />
              ))}
              {Array.from({ length: Math.max(0, 4 - weeks.length) }).map((_, i) => (
                <View key={`v${i}`} style={{ flex: 1, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed' }} />
              ))}
            </View>
            <Ink size={13} color={c.textSecondary}>{traduire("Tu rates une semaine ? Un joker la sauve et ta série continue. Tu gagnes un joker toutes les 4 semaines réussies, 2 au maximum.")}</Ink>
            <BoutonPause pause={st?.pauseThisWeek ?? null} onPause={() => setPauseOuverte(true)} onReprendre={reprendreSemaine} />
          </View>
        </Section>

        {/* Sceaux */}
        <Section i={5} ancre="sceaux">
          <SectionHead title={traduire("Tes sceaux")} action="Collection" onAction={() => go('/dojo/sceaux')} />
          <Pressable
            onPress={() => {
              tap();
              go('/dojo/sceaux');
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("{0} sceaux sur {1}. Voir la collection", sealsCount, sealsTotal)}
            style={({ pressed }) => ({ ...carteBlanche(c.surface, c.border), backgroundColor: pressed ? c.fillSoft : c.surface, padding: 16, gap: 14 })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {(earnedSeals.length ? earnedSeals.slice(0, 4) : seals.slice(0, 4)).map((s) => (
                <View key={s.id} style={{ alignItems: 'center', gap: 4, width: (W - 32) / 4 }}>
                  <SealMedal id={s.id} color={familyOf(s.family).ink} size={Math.min(70, Math.floor((W - 32) / 4) - 6)} earned={s.earned} />
                  <Ink size={11} weight="bold" color={s.earned ? c.ink : c.textMuted} numberOfLines={2} style={{ textAlign: 'center' }}>{nomSceau(s, u)}</Ink>
                </View>
              ))}
              {seals.length === 0
                ? ['s1', 's2', 's3', 's4'].map((k) => (
                    <View key={k} style={{ alignItems: 'center', width: (W - 32) / 4 }}>
                      <Hanko size={56} shape="rond" earned={false} tampon="erable" />
                    </View>
                  ))
                : null}
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Ink size={22} weight="black" tight>{String(sealsCount)}</Ink>
                <Ink size={14} weight="bold" color={c.textSecondary} style={{ flex: 1 }}>{traduirePluriel(sealsCount, sealsCount > 1, "sceau sur {0}", "sceaux sur {0}", sealsTotal)}</Ink>
              </View>
              <Bar progress={sealsTotal ? sealsCount / sealsTotal : 0} color={c.gold} />
              {nextSeal ? (
                <Ink size={13} color={c.textSecondary} numberOfLines={2}>{traduire("Le plus proche : {0}, {1} sur {2}", nomSceau(nextSeal, u), nextSeal.current, nextSeal.target)}</Ink>
              ) : null}
            </View>
          </Pressable>
        </Section>

        {/* Niveaux de pratique par sport */}
        <Section i={4}>
          <SectionHead title={traduire("Tes niveaux par sport")} action={traduire("Tout voir")} onAction={() => go('/dojo/ceintures')} />
          {belts.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: -4, marginBottom: -12 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 10 }} snapToInterval={158} decelerationRate="fast">
              {belts.map((b) => (
                <SportCard key={b.sport} b={b} gender={gender} onPress={() => go('/dojo/ceintures')} />
              ))}
            </ScrollView>
          ) : (
            <Pressable
              onPress={() => {
                tap();
                go('/dojo/ceintures');
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ ...carteBlanche(c.surface, c.border), flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: pressed ? c.fillSoft : c.surface })}
            >
              <View style={{ width: 64, height: 80, borderRadius: 14, backgroundColor: PACKS[0].fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Image source={PACKS[0].images[gender][0]} style={{ width: 64, height: 78 }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Ink size={15} weight="extraBold">{traduire("Un niveau par sport")}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire("Ta première séance te fait Novice. Initié arrive à 10 séances, Maître à 365.")}</Ink>
              </View>
              <ChevronIcon />
            </Pressable>
          )}
        </Section>

        {/* Portes du Dojo */}
        <Section i={6}>
          <SectionHead title={traduire("Explorer le Dojo")} />
          <Gates
            width={W}
            gates={[
              {
                key: 'rangs',
                title: libelleChemin(u),
                value: traduire("{0} rangs puis les dan, tu es {1}", RANKS.length, title),
                fond: ton('creme').fond,
                image: imageChemin ?? cons.piece.image,
                onPress: () => go('/dojo/rangs'),
              },
              {
                key: 'journal',
                title: traduire('Journal d’XP'),
                value: `${formatXp(xp)}${NB}XP gagnés`,
                fond: ton('lilas').fond,
                kanjiColor: c.indigo,
                tampon: u === 'classique' ? 'objectif_maintien' : 'frein_programme',
                onPress: () => go('/dojo/journal'),
              },
            ]}
          />
        </Section>

        {/* Vague 45 : la vitrine de la boutique remplace la porte « Personnages et scènes » */}
        <Section i={6}>
          <SectionHead title={avecPerso ? traduire('Personnages et scènes') : traduire('Scènes')} action="Boutique" onAction={() => go('/dojo/boutique')} />
          <VitrineBoutique vignettes={vignettes} total={traduire("{0} personnages, {1} scènes", PACKS.length + 1, THEMES.length)} onOuvrir={() => go('/dojo/boutique')} />
        </Section>

        <Section i={7}>
          <FeatureList
            title={traduire("Combat et partage")}
            items={[
              { label: traduire('Succès de sparring'), sub: traduire('Tes rounds, tes finitions, tes partenaires'), href: '/combat-achievements' },
              { label: traduire('Carte de combattant'), href: '/fighter-card' },
              { label: traduire('Partager tes séances et bilans'), href: '/share-hub' },
            ]}
          />
        </Section>
      </ScrollView>

      <VisiteDojo
        visible={visite}
        mesurer={mesurer}
        onClose={(vue) => {
          setVisite(false);
          setVisiteEtat(vue ? 'faite' : 'plus_tard');
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }}
      />

      <FeuillePause visible={pauseOuverte} onChoisir={choisirPause} onClose={() => setPauseOuverte(false)} />

      <Celebration
        visible={!!celebration}
        rankUp={celebration?.rankUp ?? null}
        seals={celebration?.seals ?? []}
        recap={celebration?.recap ?? false}
        plate={celebration?.plate ?? null}
        xp={xp}
        image={image}
        scene={THEME_IMAGES.nuit}
        univers={u}
        avecPersonnage={avecPerso}
        onClose={closeCelebration}
      />

      {/* 18 octobre : la scene gagnee avec la serie, apres la bienvenue, les celebrations et la visite */}
      <SceneGagnee
        key={gagneesEnAttente[0] ?? 'aucune'}
        sceneId={!welcome && !celebration && !visite && !visiteEnCours ? (gagneesEnAttente[0] ?? null) : null}
        onMettre={(id) => void mettreScene(id, false)}
        onClose={() => setGagneesEnAttente((a) => a.slice(1))}
      />
      <Bienvenue visible={!!welcome && !visiteEnCours} summary={welcome} image={image} scene={scene} onClose={closeWelcome} />
    </View>
  );
}

function SportCard({ b, gender, onPress }: { b: BeltInfo; gender: Gender; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pack = PACKS.find((p) => p.kind === 'sport' && p.sports.includes(b.sport));
  const lvl = b.count >= 100 ? 3 : b.count >= 25 ? 2 : 1;
  const barColor = b.belt.id === 'blanche' ? b.next?.color ?? '#E8C33A' : b.belt.color;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire("{0}, niveau {1}, {2} séances", b.sportName, b.belt.name, b.count)}
      style={({ pressed }) => ({ ...carteBlanche(c.surface, c.border), width: 148, padding: 8, paddingBottom: 12, gap: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ height: 120, borderRadius: 16, backgroundColor: pack?.fond ?? c.fillSoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
        {pack ? <Image source={pack.images[gender][lvl - 1]} style={{ width: '100%', height: 132, marginBottom: -10 }} resizeMode="contain" /> : <LevelPlate color={b.belt.color} edge={b.belt.edge} size={44} />}
        <View style={{ position: 'absolute', top: 8, left: 8 }}>
          <LevelPlate color={b.belt.color} edge={b.belt.edge} size={20} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 4, gap: 3 }}>
        <Ink size={14} weight="extraBold" numberOfLines={2}>{traduire(b.sportName)}</Ink>
        <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{traduirePluriel(b.count, b.count > 1, "{0}, {1} séance", "{0}, {1} séances", b.belt.name, b.count)}</Ink>
        <View style={{ marginTop: 4 }}>
          <Bar progress={b.progress} color={barColor} height={6} />
        </View>
        <Ink size={11} color={c.textMuted} numberOfLines={2}>{b.next ? traduire("encore {0} pour {1}", b.remaining, b.next.name) : 'sommet atteint'}</Ink>
      </View>
    </Pressable>
  );
}

function WeekTile({ w }: { w: WeekStatus }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  let bg: string = c.fillSoft;
  let border = 'transparent';
  let color: string = c.textSecondary;
  let label = traduire("{0} sur {1}", w.count, w.goal);
  let dashed = false;
  if (w.status === 'tenue') {
    bg = c.primary;
    color = c.onPrimary;
  } else if (w.status === 'pause') {
    bg = c.goldTint;
    color = c.goldDeep;
    label = 'pause';
  } else if (w.status === 'protegee') {
    bg = 'transparent';
    border = c.gold;
    color = c.goldDeep;
    label = 'joker';
  } else if (w.status === 'manquee') {
    color = c.textMuted;
  } else if (w.status === 'en_cours') {
    bg = 'transparent';
    border = c.accent;
    color = c.accent;
    dashed = true;
  }
  return (
    <View style={{ flex: 1, gap: 4 }} accessible accessibilityLabel={traduire("Semaine du {0} : {1}", shortDay(w.monday), label)}>
      <View style={{ height: 40, borderRadius: 12, backgroundColor: bg, borderWidth: border === 'transparent' ? 0 : 2, borderColor: border, borderStyle: dashed ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
        <Ink size={12} weight="extraBold" color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Ink>
      </View>
      <Ink size={11} color={c.textMuted} style={{ textAlign: 'center' }} numberOfLines={1}>{shortDay(w.monday)}</Ink>
    </View>
  );
}
