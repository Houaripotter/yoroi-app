/**
 * Barre de navigation v2 : 4 onglets (Accueil, Seances, Progres, Dojo) et le bouton +.
 *
 * 13 novembre 2026, barre en verre (maquette mixte.html validee par Houari) :
 * 1. Au repos : une pilule de verre (flou, blanc translucide, bordure blanche fine, ombre douce) de 14 du bord gauche
 *    a 86 du bord droit, 70 de haut ; les 4 onglets avec leur sticker (ou l'icone au trait en Encre japonaise) et le
 *    nom dessous en petit ; l'onglet ouvert en pastel (#DCE3FF) avec icone et nom bleu nuit, les autres en gris.
 *    Le + est un rond de verre separe de 62, a droite. Le point d'or du coffre reste sur Dojo.
 *    Sur Android (pas de flou fiable), un blanc a 92 %. En sombre, les memes roles avec theme.colors.
 * 2. Appui long sur le + (300 ms) : vibration, l'ecran se voile et se floute, la barre s'efface, le + devient bleu
 *    nuit et tourne en ×. 4 bulles sortent en arc (Pesee, Muscu, Combat, Chrono) : tu glisses le doigt, la bulle
 *    grossit avec une petite vibration, tu lâches dessus et c'est lance ; ailleurs, ca se ferme. Un appui court
 *    ouvre toujours /ajouter. Les ecrans : lib/v2/nav/raccourcisPlus.ts.
 * 3. Au defilement d'une page d'onglet : la barre se replie en petite pilule de 52 (icones seules) avec un rond + de
 *    52 a cote ; elle se redeploie quand tu remontes, en haut de page, ou quand tu touches une icone.
 *    L'etat : lib/v2/nav/barreDefilement.ts. Pendant la visite guidee, la barre reste deployee.
 * Ancienne barre (pilule blanche, + au centre) : _archive_ancien_design_2026-10-09/barre_avant_verre_2026-11-13.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync, impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useYoroiTheme } from '../YoroiThemeProvider';
import { Ink } from './Ink';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { traduire } from '@/lib/i18n/tr';
import { STICKERS, useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { useCoffrePret } from '@/components/yoroi/v2/dojo/useCoffrePret';
import { changementDOnglet, deplierBarre, useBarreRepliee } from '@/lib/v2/nav/barreDefilement';
import { RACCOURCIS, TAILLE_BULLE, bulleSousLeDoigt, echelleArc, routeRaccourci, type IdRaccourci } from '@/lib/v2/nav/raccourcisPlus';
import { getEspace } from '@/lib/v2/espace';

const ICONS: Record<string, { label: string; d: string[]; join?: boolean; sticker: NomSticker }> = {
  index: { label: traduire('Accueil'), d: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], join: true, sticker: 'torii' },
  seances: { label: traduire('Séances'), d: ['M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11'], sticker: 'musculation' },
  progres: { label: traduire('Progrès'), d: ['M3 17l5-5 4 3 8-8', 'M15 7h5v5'], join: true, sticker: 'bilan' },
  dojo: { label: traduire('Dojo'), d: ['M3 6h18M5 9.5h14M7 6v15M17 6v15'], sticker: 'kabuto' },
};
/** Un nom d'onglet long (plus de 9 lettres) s'ecrit un peu plus petit */
export function libelleLong(l: string): boolean {
  return l.length > 9;
}
const ONGLETS = ['index', 'seances', 'progres', 'dojo'];

/** Les bulles du + : sticker et nom (mots deja traduits) */
const BULLES: Record<IdRaccourci, { sticker: NomSticker; nom: () => string; a11y: () => string }> = {
  pesee: { sticker: 'balance', nom: () => traduire('Pesée'), a11y: () => traduire('Ta pesée du jour') },
  muscu: { sticker: 'musculation', nom: () => traduire('Muscu'), a11y: () => traduire('Musculation') },
  combat: { sticker: 'gants', nom: () => traduire('Combat'), a11y: () => traduire('Démarrer une séance de combat') },
  chrono: { sticker: 'chrono', nom: () => traduire('Chrono'), a11y: () => traduire('Rounds de combat') },
};

// Mesures de la maquette
const HAUT = 70;
const ROND = 62;
const BORD = 14;
const DROITE_PILULE = 86;
const MINI_HAUT = 52;
const MINI_ICONE = 42;
const MINI_ECART = 4;
const MINI_LARGEUR = 4 * MINI_ICONE + 3 * MINI_ECART + 2 * 6 + 2;
const MINI_ESPACE = 10;
const MINI_GROUPE = MINI_LARGEUR + MINI_ESPACE + MINI_HAUT;
/** Appui long sur le + */
const APPUI_LONG = 300;

export const INK_TAB_BAR_SPACE = HAUT + 22 + 20;

/** Le flou du verre : iOS (et le rendu web) ; Android garde un blanc presque opaque */
const FLOU = Platform.OS === 'ios' || Platform.OS === 'web';

/** Une couleur #RRGGBB avec une opacite */
function opacite(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

type Props = BottomTabBarProps & { onPressAdd: () => void };

/** Le fond de verre d'une forme : flou et voile blanc, ou blanc a 92 % sans flou */
function Verre({ rayon, sombre, surface, voile = 0.58 }: { rayon: number; sombre: boolean; surface: string; voile?: number }) {
  if (!FLOU) return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: rayon, backgroundColor: opacite(surface, 0.92) }]} />;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: rayon, overflow: 'hidden' }]}>
      <BlurView intensity={sombre ? 40 : 30} tint={sombre ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: opacite(surface, sombre ? voile + 0.12 : voile) }]} />
    </View>
  );
}

export function InkTabBar({ state, navigation, onPressAdd }: Props) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: W, height: Hfenetre } = useWindowDimensions();
  const bottom = Math.max(insets.bottom - 8, 0) + 14;
  const illus = useIllustrations();
  // 2 novembre 2026 : un point d'or sur l'onglet Dojo quand le coffre du jour attend (aucun chiffre)
  const coffrePret = useCoffrePret();
  const reduit = useReducedMotion();
  const visite = useVisiteEnCours();
  const replieDemande = useBarreRepliee();
  // pendant la visite guidee, la barre reste deployee (ses ancres doivent rester en place)
  const repliee = replieDemande && !visite;

  // ====== l'eventail du + ======
  const [ouvert, setOuvert] = useState(false);
  const [voile, setVoile] = useState(false);
  const [survol, setSurvol] = useState<IdRaccourci | null>(null);
  const ouvertRef = useRef(false);
  const survolRef = useRef<IdRaccourci | null>(null);
  const favorisRef = useRef<string[]>([]);
  const [H, setH] = useState(Hfenetre);

  const repli = useSharedValue(repliee ? 1 : 0);
  const eventail = useSharedValue(0);
  const appui = useSharedValue(0);

  // un autre onglet : la barre se redeploie
  useEffect(() => {
    changementDOnglet();
  }, [state.index]);

  useEffect(() => {
    repli.value = withTiming(repliee ? 1 : 0, { duration: reduit ? 120 : 280, easing: Easing.out(Easing.cubic) });
  }, [repliee, reduit, repli]);

  // le centre du + (depuis le bord gauche, et depuis le bas), a sa place du moment
  const echelle = echelleArc(W);
  const plusX = repliee ? W / 2 - MINI_GROUPE / 2 + MINI_LARGEUR + MINI_ESPACE + MINI_HAUT / 2 : W - BORD - ROND / 2;
  const plusBas = repliee ? bottom + 2 + MINI_HAUT / 2 : bottom + HAUT / 2;
  const decaleX = W / 2 - MINI_GROUPE / 2 + MINI_LARGEUR + MINI_ESPACE + MINI_HAUT / 2 - (W - BORD - ROND / 2);
  const decaleY = HAUT / 2 - (2 + MINI_HAUT / 2);

  const ouvrir = useCallback(() => {
    if (ouvertRef.current) return;
    ouvertRef.current = true;
    survolRef.current = null;
    setSurvol(null);
    setOuvert(true);
    setVoile(true);
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    eventail.value = withTiming(1, { duration: reduit ? 120 : 200 });
    getEspace()
      .then((e) => {
        favorisRef.current = e?.sportsFavoris ?? [];
      })
      .catch(() => {});
  }, [eventail, reduit]);

  const fermer = useCallback(() => {
    if (!ouvertRef.current) return;
    ouvertRef.current = false;
    survolRef.current = null;
    setSurvol(null);
    setOuvert(false);
    eventail.value = withTiming(0, { duration: reduit ? 100 : 180 });
    setTimeout(() => setVoile(false), reduit ? 110 : 200);
  }, [eventail, reduit]);

  const lancer = useCallback(
    (id: IdRaccourci) => {
      impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
      const r = routeRaccourci(id, favorisRef.current);
      fermer();
      router.push((r.params ? { pathname: r.pathname, params: r.params } : r.pathname) as any);
    },
    [fermer, router],
  );

  // retour Android : ferme l'eventail
  useEffect(() => {
    if (!ouvert) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      fermer();
      return true;
    });
    return () => sub.remove();
  }, [ouvert, fermer]);

  const suivreDoigt = useCallback(
    (x: number, y: number) => {
      if (!ouvertRef.current) return;
      const id = bulleSousLeDoigt(x - plusX, y - (H - plusBas), echelle);
      if (id !== survolRef.current) {
        survolRef.current = id;
        setSurvol(id);
        if (id) selectionAsync().catch(() => {});
      }
    },
    [plusX, plusBas, H, echelle],
  );

  const geste = useMemo(() => {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(APPUI_LONG)
      .onBegin(() => {
        appui.value = withTiming(1, { duration: 90 });
      })
      .onEnd((_e, ok) => {
        if (!ok) return;
        impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
        onPressAdd();
      })
      .onFinalize(() => {
        appui.value = withTiming(0, { duration: 140 });
      });
    const glisse = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(APPUI_LONG)
      .onStart((e) => {
        ouvrir();
        suivreDoigt(e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => suivreDoigt(e.absoluteX, e.absoluteY))
      .onFinalize(() => {
        appui.value = withTiming(0, { duration: 140 });
        if (!ouvertRef.current) return;
        const id = survolRef.current;
        if (id) lancer(id);
        else fermer();
      });
    return Gesture.Race(glisse, tap);
  }, [appui, onPressAdd, ouvrir, suivreDoigt, lancer, fermer]);

  // ====== styles animes ======
  const styleBarre = useAnimatedStyle(() => ({
    opacity: (1 - repli.value) * (1 - eventail.value),
    transform: [{ translateY: interpolate(repli.value, [0, 1], [0, 10]) }, { scale: interpolate(repli.value, [0, 1], [1, 0.92]) }],
  }));
  const styleMini = useAnimatedStyle(() => ({
    opacity: repli.value * (1 - eventail.value),
    transform: [{ translateY: interpolate(repli.value, [0, 1], [8, 0]) }, { scale: interpolate(repli.value, [0, 1], [0.9, 1]) }],
  }));
  const stylePlus = useAnimatedStyle(() => ({
    transform: [
      { translateX: repli.value * decaleX },
      { translateY: repli.value * decaleY },
      { scale: interpolate(repli.value, [0, 1], [1, MINI_HAUT / ROND]) * (1 - appui.value * 0.06) },
    ],
  }));
  const styleNuit = useAnimatedStyle(() => ({ opacity: eventail.value }));
  const styleCroix = useAnimatedStyle(() => ({ transform: [{ rotate: `${eventail.value * 45}deg` }] }));
  const stylePlusClair = useAnimatedStyle(() => ({ opacity: 1 - eventail.value }));
  const styleVoile = useAnimatedStyle(() => ({ opacity: eventail.value }));

  const onPressOnglet = (index: number) => {
    const route = state.routes[index];
    const focused = state.index === index;
    selectionAsync().catch(() => {});
    deplierBarre();
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  const icone = (name: string, focused: boolean, taille: number) => {
    const icon = ICONS[name];
    return illus.stickers ? (
      // le sticker en pleine couleur, jamais d'opacite baissee
      <Image source={STICKERS[icon.sticker]} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />
    ) : (
      <Svg width={taille * 0.66} height={taille * 0.66} viewBox="0 0 24 24" fill="none">
        {icon.d.map((d) => (
          <Path key={d} d={d} stroke={focused ? c.onPrimary : c.textSecondary} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin={icon.join ? 'round' : undefined} />
        ))}
      </Svg>
    );
  };

  const pastel = opacite(c.primary, 0.9);
  const bordVerre = isDark ? c.border : 'rgba(255,255,255,0.85)';
  const ombre = isDark ? c.shadow : c.accent;

  const renderTab = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index < 0) return null;
    const focused = state.index === index;
    const icon = ICONS[name];
    const point = name === 'dojo' && coffrePret && !focused;
    const nom = traduire(icon.label);
    return (
      <TourAnchor key={name} id={`onglet.${name}`} rayon={24} style={styles.ancre}>
        <Pressable
          onPress={() => onPressOnglet(index)}
          accessibilityRole="tab"
          accessibilityLabel={point ? traduire('Dojo, ton coffre est prêt') : nom}
          accessibilityState={{ selected: focused }}
          style={[styles.tab, focused ? { backgroundColor: pastel } : null]}
          hitSlop={4}
        >
          {icone(name, focused, 32)}
          {/* le nom toujours en entier, dans toutes les langues : un nom long s'ecrit plus petit, et peut encore se reduire */}
          <Ink size={libelleLong(nom) ? 9.5 : 11} weight="black" color={focused ? c.onPrimary : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.nom}>
            {nom}
          </Ink>
          {point ? <View pointerEvents="none" style={[styles.point, { backgroundColor: c.gold, borderColor: c.surface }]} /> : null}
        </Pressable>
      </TourAnchor>
    );
  };

  const renderMini = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index < 0) return null;
    const focused = state.index === index;
    const point = name === 'dojo' && coffrePret && !focused;
    return (
      <Pressable
        key={name}
        onPress={() => onPressOnglet(index)}
        accessibilityRole="tab"
        accessibilityLabel={point ? traduire('Dojo, ton coffre est prêt') : traduire(ICONS[name].label)}
        accessibilityState={{ selected: focused }}
        style={[styles.miniIcone, focused ? { backgroundColor: pastel } : null]}
        hitSlop={3}
      >
        {icone(name, focused, 28)}
        {point ? <View pointerEvents="none" style={[styles.pointMini, { backgroundColor: c.gold, borderColor: c.surface }]} /> : null}
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={(e) => setH(e.nativeEvent.layout.height || Hfenetre)}>
      {/* 2. le voile de l'eventail : l'ecran se floute ; le toucher ferme */}
      {voile ? (
        <Animated.View style={[StyleSheet.absoluteFill, styleVoile]} pointerEvents={ouvert ? 'auto' : 'none'}>
          {FLOU ? <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: FLOU ? 'rgba(27,31,59,0.30)' : 'rgba(27,31,59,0.55)' }]} onPress={fermer} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} />
        </Animated.View>
      ) : null}

      {/* 1. la barre de verre, au repos */}
      <Animated.View pointerEvents={repliee || ouvert ? 'none' : 'box-none'} style={[styles.barre, { bottom, left: BORD, right: DROITE_PILULE }, styleBarre]}>
        <View style={[styles.ombre, { shadowColor: ombre, borderRadius: HAUT / 2 }]}>
          <TourAnchor id="onglet.barre" rayon="rond" style={[styles.pilule, { borderColor: bordVerre }]}>
            <Verre rayon={HAUT / 2} sombre={isDark} surface={c.surface} />
            {ONGLETS.map(renderTab)}
          </TourAnchor>
        </View>
      </Animated.View>

      {/* 3. la barre repliee, au defilement */}
      <Animated.View
        pointerEvents={repliee && !ouvert ? 'box-none' : 'none'}
        accessibilityElementsHidden={!repliee}
        importantForAccessibility={repliee ? 'auto' : 'no-hide-descendants'}
        style={[styles.mini, { bottom: bottom + 2, left: W / 2 - MINI_GROUPE / 2, width: MINI_LARGEUR }, styleMini]}
      >
        <View style={[styles.ombre, { shadowColor: ombre, borderRadius: MINI_HAUT / 2 }]}>
          <View style={[styles.miniPilule, { borderColor: bordVerre }]}>
            <Verre rayon={MINI_HAUT / 2} sombre={isDark} surface={c.surface} voile={0.6} />
            {ONGLETS.map(renderMini)}
          </View>
        </View>
      </Animated.View>

      {/* 2. les bulles de l'eventail */}
      {voile
        ? RACCOURCIS.map((r, i) => (
            <Bulle
              key={r.id}
              id={r.id}
              rang={i}
              gauche={plusX + r.dx * echelle - TAILLE_BULLE / 2}
              bas={plusBas - r.dy * echelle - TAILLE_BULLE / 2}
              dx={r.dx * echelle}
              dy={r.dy * echelle}
              ouvert={ouvert}
              choisie={survol === r.id}
              reduit={reduit}
              sombre={isDark}
              surface={c.surface}
              img={illus.img(BULLES[r.id].sticker)}
              onPress={() => lancer(r.id)}
            />
          ))
        : null}

      {/* le + : rond de verre a droite ; appui court /ajouter, appui long l'eventail */}
      <Animated.View style={[styles.plusPlace, { bottom: bottom + (HAUT - ROND) / 2, right: BORD }, stylePlus]}>
        <TourAnchor id="onglet.plus" rayon="rond" style={styles.plusAncre}>
          <GestureDetector gesture={geste}>
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={traduire("Enregistrer une séance, une pesée ou une mesure")}
              accessibilityHint={traduire('Appui long : Pesée, Muscu, Combat et Chrono')}
              accessibilityActions={[{ name: 'activate' }, { name: 'raccourcis', label: traduire('Raccourcis') }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'raccourcis') ouvrir();
                else if (ouvertRef.current) fermer();
                else onPressAdd();
              }}
              style={[styles.ombre, styles.plus, { shadowColor: ombre }]}
            >
              <View style={[StyleSheet.absoluteFill, styles.plusBord, { borderColor: bordVerre }]}>
                <Verre rayon={ROND / 2} sombre={isDark} surface={c.surface} />
              </View>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: ROND / 2, backgroundColor: c.accent }, styleNuit]} />
              <Animated.View pointerEvents="none" style={styleCroix}>
                <Animated.View style={stylePlusClair}>
                  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 5v14M5 12h14" stroke={c.onPrimary} strokeWidth={2.4} strokeLinecap="round" />
                  </Svg>
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, styleNuit]}>
                  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 5v14M5 12h14" stroke={c.onAccent} strokeWidth={2.4} strokeLinecap="round" />
                  </Svg>
                </Animated.View>
              </Animated.View>
            </View>
          </GestureDetector>
        </TourAnchor>
      </Animated.View>
    </View>
  );
}

/** Une bulle de l'eventail : verre, sticker et nom ; elle sort du + en ressort (un fondu si moins d'animations) */
function Bulle(p: {
  id: IdRaccourci;
  rang: number;
  gauche: number;
  bas: number;
  dx: number;
  dy: number;
  ouvert: boolean;
  choisie: boolean;
  reduit: boolean;
  sombre: boolean;
  surface: string;
  img: any;
  onPress: () => void;
}) {
  const sortie = useSharedValue(0);
  const prise = useSharedValue(0);
  useEffect(() => {
    if (p.ouvert) sortie.value = p.reduit ? withTiming(1, { duration: 150 }) : withDelay(p.rang * 40, withSpring(1, { damping: 14, stiffness: 190, mass: 0.8 }));
    else sortie.value = withTiming(0, { duration: p.reduit ? 100 : 150 });
  }, [p.ouvert, p.reduit, p.rang, sortie]);
  useEffect(() => {
    prise.value = p.reduit ? (p.choisie ? 1 : 0) : withSpring(p.choisie ? 1 : 0, { damping: 15, stiffness: 260 });
  }, [p.choisie, p.reduit, prise]);
  const style = useAnimatedStyle(() => {
    const s = sortie.value;
    const o = Math.min(1, Math.max(0, s));
    if (p.reduit) return { opacity: o, transform: [{ scale: 1 + prise.value * 0.14 }] };
    return {
      opacity: o,
      transform: [{ translateX: (1 - s) * -p.dx }, { translateY: (1 - s) * -p.dy }, { scale: (0.4 + 0.6 * s) * (1 + prise.value * 0.14) }],
    };
  });
  const b = BULLES[p.id];
  return (
    <Animated.View pointerEvents={p.ouvert ? 'box-none' : 'none'} style={[styles.bulle, { left: p.gauche, bottom: p.bas }, style]}>
      <Pressable onPress={p.onPress} accessibilityRole="button" accessibilityLabel={b.a11y()} style={[styles.bulleVerre, p.choisie ? styles.bulleChoisie : null]}>
        <Verre rayon={26} sombre={p.sombre} surface={p.surface} voile={0.75} />
        <Image source={p.img} style={styles.bulleSticker} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Pressable>
      <Ink size={14} weight="black" color="#FFFFFF" numberOfLines={1} style={styles.bulleNom}>
        {b.nom()}
      </Ink>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barre: { position: 'absolute', height: HAUT },
  pilule: {
    height: HAUT,
    borderRadius: HAUT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  ombre: {
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
  ancre: { flex: 1, height: HAUT - 12, marginHorizontal: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 24, paddingHorizontal: 4, gap: 1 },
  nom: { maxWidth: '100%', textAlign: 'center' },
  point: { position: 'absolute', top: 4, right: 8, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  mini: { position: 'absolute', height: MINI_HAUT },
  miniPilule: {
    height: MINI_HAUT,
    borderRadius: MINI_HAUT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: MINI_ECART,
    paddingHorizontal: 6,
  },
  miniIcone: { width: MINI_ICONE, height: MINI_ICONE, borderRadius: MINI_ICONE / 2, alignItems: 'center', justifyContent: 'center' },
  pointMini: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  plusPlace: { position: 'absolute', width: ROND, height: ROND },
  plusAncre: { width: ROND, height: ROND },
  plus: { width: ROND, height: ROND, borderRadius: ROND / 2, alignItems: 'center', justifyContent: 'center' },
  plusBord: { borderRadius: ROND / 2, borderWidth: 1 },
  bulle: { position: 'absolute', width: TAILLE_BULLE, alignItems: 'center' },
  bulleVerre: {
    width: TAILLE_BULLE,
    height: TAILLE_BULLE,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  bulleChoisie: { borderWidth: 4, borderColor: '#FFFFFF' },
  bulleSticker: { width: 48, height: 48 },
  bulleNom: {
    position: 'absolute',
    top: TAILLE_BULLE + 6,
    left: (TAILLE_BULLE - 110) / 2,
    width: 110,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
