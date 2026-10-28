/**
 * Visite guidee de YOROI (13 octobre 2026), sur le modele de celle d'INRO.
 * Houari : « une presentation de l'app comme sur INRO, avec des astuces ou il appuie, ca bouge, un petit
 * encadre de la ou il appuie et ce que ca fait, et la voix d'Antonin qui dit quoi faire ».
 *
 * Elle se joue sur les VRAIS ecrans : l'ecran s'assombrit, un cadre arrondi indigo entoure l'element reel
 * (mesure par TourAnchor), un doigt vient appuyer dessus, une bulle courte dit ce que ca fait et la voix
 * le dit (assets/sounds/tour/tour_fr_etape_XX.mp3, voix ElevenLabs). Quand la voix a fini, la visite passe
 * seule a l'etape suivante ; sans voix (coupee ou fichier absent), on avance avec « Suivant ».
 * Rien n'est declenche pour de vrai : le doigt montre, l'app derriere ne recoit aucun appui, aucune donnee
 * n'est modifiee. Le menu du bouton + est montre tel quel, sans pouvoir etre touche.
 *
 * Lancement : une fois apres l'onboarding ou apres la mise a jour (elle remplace la presentation YOROI 3.0),
 * puis depuis Reglages, Aide (« Revoir la visite guidee ») et le Studio. Passer a tout moment.
 * Montee dans app/(tabs)/_layout.tsx (TourGate), au-dessus des onglets et de la barre.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { selectionAsync } from 'expo-haptics';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import Ajouter from '@/app/ajouter';
import { getTourScroller, measureTourAnchor } from './TourAnchor';
import { isVisiteDone, markTourSeen, markVisiteDone } from './keys';
import { _fenetreCurrent } from '@/components/yoroi/v2/fenetre/api';
import { ETAPES, avecDe, ciblesDe, rangDansPartie, tempsDeLecture, type Onglet, type Partie } from './etapes';
import { AIR_BULLE, MARGE_CADRE, cadreDe, defilementPourMontrer, estimerBulle, hautDeBarre, placerBulle, type Ecran, type Trou } from './placement';
import { montrerOngletPlus } from '@/lib/v2/visite/ongletPlus';
import { montrerPagePoids } from '@/lib/v2/visite/pagePoids';
import { entrerExemple, sortirExemple } from '@/lib/v2/visite/demoVisite';
import { remiseAZeroAuDemarrage } from '@/lib/v2/visite/vitrine';
import { appliquerVitesse, libelleVitesse, useVitesseVoix, vitesseCourante } from '@/lib/v2/visite/vitesseVoix';
import { traduire } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

const ONBOARDING_DONE_KEY = 'yoroi_onboarding_done';

// 18 octobre 2026 : les etapes sont dans ./etapes (parcours dans l'ordre des onglets, chaque etape avec son fichier de voix)
export { ETAPES, VISITE_TITRES } from './etapes';

/*
 * La voix d'Antonin (ElevenLabs), un fichier par texte (tour_fr_etape_01 a 15, numerotes dans l'ordre d'enregistrement).
 * Chaque etape dit quel fichier est le sien (champ voix de ./etapes). Si un texte change, refaire son fichier.
 */
const VOIX: number[] = [
  require('@/assets/sounds/tour/tour_fr_etape_01.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_02.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_03.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_04.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_05.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_06.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_07.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_08.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_09.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_10.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_11.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_12.mp3'),
  // 16 octobre : voix de l'etape « Personnalise » (les deux suivantes passent en 14 et 15)
  require('@/assets/sounds/tour/tour_fr_etape_13.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_14.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_15.mp3'),
  // 27 octobre : nouvel ordre de la visite (bouton plus, onglets, coach, reglages)
  require('@/assets/sounds/tour/tour_fr_etape_16.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_17.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_18.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_19.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_20.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_21.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_22.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_23.mp3'),
  require('@/assets/sounds/tour/tour_fr_etape_24.mp3'),
];

// ── Lancement ──────────────────────────────────────────────────────────────

const listeners = new Set<(depart: number, apercu: boolean) => void>();

/** Lance la visite (depuis les onglets). apercu : rien n'est marque comme vu (Studio). */
export function startVisite(depart = 0, apercu = false) {
  listeners.forEach((l) => l(depart, apercu));
}

type Router = ReturnType<typeof useRouter>;

/** Depuis n'importe quel ecran (Aide, Studio) : retour aux onglets, puis la visite */
export function lancerVisite(router: Router, depart = 0, apercu = false) {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {
    // rien a fermer
  }
  router.navigate('/(tabs)' as never);
  setTimeout(() => startVisite(depart, apercu), 650);
}

/** Visite en cours : les fenetres d'accueil (bienvenue du Dojo...) attendent qu'elle soit finie */
let enCours = false;
const enCoursListeners = new Set<(v: boolean) => void>();
function setEnCours(v: boolean) {
  enCours = v;
  enCoursListeners.forEach((l) => l(v));
}
export function useVisiteEnCours(): boolean {
  const [v, setV] = useState(enCours);
  useEffect(() => {
    enCoursListeners.add(setV);
    setV(enCours);
    return () => {
      enCoursListeners.delete(setV);
    };
  }, []);
  return v;
}

// ── Le composant ───────────────────────────────────────────────────────────

type Box = { x: number; y: number; w: number; h: number; r: number };

/** 28 octobre 2026 : la partie de l'app, en petites capitales colorees en haut de la bulle */
const PARTIES: Record<Partie, string> = {
  accueil: traduire('Accueil'),
  barre: traduire('Ta barre'),
  seances: traduire('Séances'),
  plus: traduire('Le bouton plus'),
  progres: traduire('Progrès'),
  dojo: traduire('Dojo'),
  fin: traduire('À toi'),
};
/** Le temps de l'agrandissement d'un onglet ouvert (InkTabBar, LinearTransition de 220 ms), avec de la marge */
const AGRANDISSEMENT_ONGLET = 320;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Une fenetre de l'app est ouverte (rappel, torii...) : la visite attend qu'elle soit fermee (2 minutes au plus) */
async function attendreFenetres(alive: () => boolean): Promise<void> {
  for (let k = 0; k < 240 && alive() && _fenetreCurrent(); k++) await wait(500);
}
const within = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

const ROUTES: Record<Onglet, string> = { index: '/(tabs)', seances: '/(tabs)/seances', progres: '/(tabs)/progres', dojo: '/(tabs)/dojo' };
/** L'ecran qui defile de chaque onglet (registerTourScroller) */
const SCROLLERS: Record<string, string> = { index: 'accueil', seances: 'seances', progres: 'progres', dojo: 'dojo' };
/** Le menu du bouton + defile aussi (app/ajouter.tsx) */
const SCROLLER_MENU = 'ajouter';

export function VisiteGuidee() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  // 28 octobre 2026 : le sticker de la bulle suit le reglage Illustrations (Stickers ou Encre japonaise)
  const illus = useIllustrations();

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Box | null>(null);
  const [voile, setVoile] = useState(true);
  const [menu, setMenu] = useState(false);
  const [ready, setReady] = useState(false);
  // 28 octobre 2026 : la hauteur mesuree de la bulle de l'etape (elle se place avec sa vraie taille)
  const [bulle, setBulle] = useState<{ i: number; h: number } | null>(null);
  const [tailleRoot, setTailleRoot] = useState({ w: 0, h: 0 });
  const [voix, setVoix] = useState(true);
  const voixRef = useRef(true);
  const apercuRef = useRef(false);
  const rootRef = useRef<View>(null);
  const runId = useRef(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  // 27 octobre : une etape sans voix enregistree avance seule apres le temps de lecture
  const lectureRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef(false);
  const ongletRef = useRef<Onglet>('index');
  const lastPress = useRef(0);
  const autoChecked = useRef(false);
  // 18 octobre : l'exemple (Heny, en memoire, lib/v2/visite/vitrine.ts) pendant la visite, puis tes vraies donnees
  const exempleRef = useRef<Promise<boolean> | null>(null);
  const [exemple, setExemple] = useState<'non' | 'chargement' | 'oui'>('non');
  const [finMessage, setFinMessage] = useState<string | null>(null);
  const [vitesse, vitesseSuivante] = useVitesseVoix();
  const debutRef = useRef(0);
  // 28 octobre 2026 : la pastille Exemple (la bulle reste dessous) et la page montree de la carte Ton poids
  const pastilleRef = useRef(true);
  const pagePoidsRef = useRef(0);
  // 28 octobre 2026 soir (captures de Houari : la bulle sous la Dynamic Island) : tout est place dans le repere de la
  // visite ; si elle ne commence pas tout en haut de la fenetre, la zone sure (barre d'etat, Dynamic Island) est decalee
  const rootYRef = useRef(0);
  // le cadre suit l'element si la page bouge pendant l'etape (defilement par la personne)
  const suiviRef = useRef<(() => Promise<void>) | null>(null);
  // element plus grand que la place : la page reste defilable pendant l'etape
  const [defilable, setDefilable] = useState(false);
  // la bulle apparait d'un coup, une fois placee (plus d'animation d'entree qui la montre a moitie a la mauvaise place)
  const bOpacity = useSharedValue(0);
  /** L'ecran pour placer le cadre et la bulle : sous la pastille Exemple, au dessus du bord bas, et le haut de la barre */
  const ecranDe = (menuOuvert: boolean): Ecran => {
    const dy = rootYRef.current;
    // jamais sous la barre d etat ni la Dynamic Island ; zone sure encore inconnue (0) : 47 points, la hauteur d un iPhone a encoche
    const hautSur = insets.top > 0 ? insets.top : Platform.OS === 'ios' ? 47 : 24;
    return {
      W,
      H,
      haut: hautSur + (pastilleRef.current ? 46 : 10) - dy,
      bas: H - insets.bottom - 10 - dy,
      // le menu + couvre la barre : ses elements descendent jusqu'au bas de l'ecran
      barre: (menuOuvert ? H - insets.bottom - 4 : hautDeBarre(H, insets.bottom)) - dy,
    };
  };

  // l'onglet ouvert, lu par le deroule
  const seg = segments[0] === '(tabs)' ? (segments[1] ?? 'index') : segments[0] ?? '';
  ongletRef.current = (['index', 'seances', 'progres', 'dojo'].includes(seg) ? seg : 'autre') as Onglet;

  const fx = useSharedValue(W / 2);
  const fy = useSharedValue(H * 0.7);
  const fOpacity = useSharedValue(0);
  const fScale = useSharedValue(1);
  const ripple = useSharedValue(0);

  const stopVoix = useCallback(() => {
    if (lectureRef.current) {
      clearTimeout(lectureRef.current);
      lectureRef.current = null;
    }
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try {
        p.pause();
        p.remove();
      } catch {
        // deja libere
      }
    }
  }, []);

  // 27 octobre 2026 : couper la voix ne vaut que pour la visite en cours. Avant, le choix etait garde : a une etape
  // sans voix enregistree, on touchait le haut parleur en croyant la remettre, on la coupait pour de bon, et plus
  // aucune etape ne parlait, meme aux visites suivantes.
  const remettreVoix = useCallback(() => {
    voixRef.current = true;
    setVoix(true);
  }, []);

  // Lancement : Aide, Studio, ou web avec ?visite=N (apercu, pour les captures)
  useEffect(() => {
    const start = (depart: number, apercu: boolean) => {
      apercuRef.current = apercu;
      remettreVoix();
      ouvrirExemple();
      setIndex(Math.max(0, Math.min(ETAPES.length - 1, depart)));
      setActive(true);
    };
    listeners.add(start);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const m = /[?&]visite=(\d+)/.exec(window.location.search);
      if (m) {
        autoChecked.current = true;
        setTimeout(() => {
          void attendreFenetres(() => true).then(() => start(Number(m[1]) - 1, true));
        }, 2500);
      }
    }
    return () => {
      listeners.delete(start);
    };
  }, []);

  // Une seule fois, de lui-meme : sur l'accueil, onboarding fini, visite jamais faite
  useEffect(() => {
    if (autoChecked.current || active || ongletRef.current !== 'index') return;
    autoChecked.current = true;
    let alive = true;
    (async () => {
      const [done, onb] = await Promise.all([isVisiteDone(), AsyncStorage.getItem(ONBOARDING_DONE_KEY).catch(() => null)]);
      if (!alive || done || onb !== 'true') {
        if (!done && onb !== 'true') autoChecked.current = false;
        return;
      }
      await wait(1400);
      await attendreFenetres(() => alive);
      if (alive && ongletRef.current === 'index') {
        apercuRef.current = false;
        remettreVoix();
        ouvrirExemple();
        setIndex(0);
        setActive(true);
      } else {
        autoChecked.current = false;
      }
    })();
    return () => {
      alive = false;
    };
  }, [seg, active]);

  /** Prepare l'exemple (une fois par visite). Ses ecritures restent en memoire. */
  const ouvrirExemple = useCallback(() => {
    if (exempleRef.current) return;
    debutRef.current = Date.now();
    setExemple('chargement');
    setFinMessage(null);
    exempleRef.current = entrerExemple()
      .then((ok) => {
        setExemple(ok ? 'oui' : 'non');
        return ok;
      })
      .catch(() => {
        setExemple('non');
        return false;
      });
  }, []);

  /** Ferme l'exemple : retour a tes vraies donnees (attend la fin du chargement s'il est en cours) */
  const fermerExemple = useCallback((message: boolean): Promise<void> => {
    const p = exempleRef.current;
    exempleRef.current = null;
    setExemple('non');
    if (!p) return Promise.resolve();
    return p
      .then(async (montre) => {
        await sortirExemple();
        if (!message || !montre) return;
        let neuf = false;
        try {
          const { getWeights } = await import('@/lib/database');
          neuf = (await getWeights(1)).length === 0;
        } catch {
          // la phrase generale
        }
        setFinMessage(neuf ? traduire('À toi maintenant : fais ta première pesée avec le bouton plus.') : traduire('Te revoilà sur tes données. Note ta pesée du jour avec le bouton plus.'));
        setTimeout(() => setFinMessage(null), 5000);
      })
      .catch(() => undefined);
  }, []);

  const finish = useCallback((marquer = true) => {
    runId.current += 1;
    stopVoix();
    const sortie = fermerExemple(marquer);
    fOpacity.value = withTiming(0, { duration: 150 });
    setActive(false);
    setHole(null);
    menuRef.current = false;
    setMenu(false);
    setReady(false);
    setBulle(null);
    // 28 octobre 2026 : tout revient comme avant la visite (la carte Ton poids sur sa premiere page, chaque onglet en haut)
    if (pagePoidsRef.current !== 0) {
      pagePoidsRef.current = 0;
      montrerPagePoids(0);
    }
    Object.values(SCROLLERS).forEach((k) => getTourScroller(k)?.scrollToTop());
    if (ongletRef.current !== 'index') router.navigate(ROUTES.index as never);
    if (!apercuRef.current && marquer) {
      // la visite remplace la presentation YOROI 3.0 : elle ne revient plus d'elle-meme
      void Promise.all([markVisiteDone(), markTourSeen()]);
      // Une seule fois, juste apres : pas de compte, tout est sur le telephone, une copie dans ton cloud de temps en temps
      // 18 octobre : apres le retour a tes vraies donnees
      void sortie
        .then(() => wait(700))
        .then(() => import('@/lib/v2/sauvegarde/rappel'))
        .then((m) => m.proposerSauvegardeDouce())
        .catch(() => undefined);
    }
  }, [router, fOpacity, stopVoix, fermerExemple]);

  /** Position d'une ancre, dans le repere de la visite */
  const anchorRect = useCallback(async (id: string): Promise<Box | null> => {
    const a = await within(measureTourAnchor(id), 800, null);
    const root = rootRef.current;
    if (!a || !root) return null;
    return within(
      new Promise<Box | null>((resolve) => {
        root.measureInWindow((rx, ry) => {
          rootYRef.current = ry || 0;
          resolve({ x: a.x - (rx || 0), y: a.y - (ry || 0), w: a.width, h: a.height, r: a.rayon });
        });
      }),
      800,
      null,
    );
  }, []);

  const parle = useCallback(
    (i: number) => {
      stopVoix();
      const e = ETAPES[i];
      if (!e || !voixRef.current) return;
      const last = i >= ETAPES.length - 1;
      /** la suivante, seulement si on est toujours sur cette etape */
      const suivante = (attente: number, si: () => boolean) => {
        if (last) return;
        if (lectureRef.current) clearTimeout(lectureRef.current);
        lectureRef.current = setTimeout(() => {
          lectureRef.current = null;
          if (si() && voixRef.current) setIndex((cur) => (cur === i ? i + 1 : cur));
        }, attente);
      };
      const n = e.voix;
      const fichier = n ? VOIX[n - 1] : undefined;
      // 27 octobre : pas encore de voix pour ce texte : la bulle se lit, puis la visite continue d'elle meme
      if (!fichier) {
        const jeton = runId.current;
        suivante(tempsDeLecture(e.texte, vitesseCourante()), () => runId.current === jeton);
        return;
      }
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
      let p: AudioPlayer | null = null;
      try {
        p = createAudioPlayer(fichier);
        playerRef.current = p;
        p.volume = 1;
        // 18 octobre : 1x, 1,5x ou 2x, sans voix aigue (lib/v2/visite/vitesseVoix.ts)
        appliquerVitesse(p);
        const lecteur = p;
        // la voix a fini : on passe seul a l'etape suivante (sauf la derniere)
        lecteur.addListener('playbackStatusUpdate', (st) => {
          try {
            if (!st.didJustFinish || playerRef.current !== lecteur) return;
            // un fichier vide ou trop court (voix pas encore enregistree) : on attend « Suivant »
            if (!st.duration || st.duration < 2) return;
            suivante(1300, () => playerRef.current === lecteur);
          } catch {
            // la visite continue avec « Suivant »
          }
        });
        lecteur.play();
      } catch {
        // pas de voix pour cette etape : la visite marche sans, et la suivante reessaie
        if (p) {
          try {
            p.remove();
          } catch {
            // deja libere
          }
        }
        if (playerRef.current === p) playerRef.current = null;
        const jeton = runId.current;
        suivante(tempsDeLecture(e.texte, vitesseCourante()), () => runId.current === jeton);
      }
    },
    [stopVoix],
  );

  // Deroule d'une etape
  // 27 octobre 2026 (Houari : « a l'etape Ton objectif ca bugue, ca descend jusqu'a Sante et plus aucune voix ») :
  // chaque etape est protegee. Une ancre absente ou hors de l'ecran : la bulle s'affiche seule, sans cadre, et la
  // visite continue. Une erreur dans une etape ne coupe jamais la voix ni les etapes suivantes.
  // 28 octobre 2026 (Houari : « la presentation ne s'adapte pas ») : le cadre prend la forme et la taille du moment de
  // l'element (rayon de l'ancre, onglet mesure apres son agrandissement), et l'ecran defile (accueil, onglets, menu +)
  // jusqu'a ce que l'element et sa bulle tiennent ensemble, sans que la bulle le cache (./placement.ts).
  useEffect(() => {
    if (!active) return;
    const id = ++runId.current;
    const alive = () => runId.current === id;
    const e = ETAPES[index];
    if (!e) return;
    let spoke = false;
    const say = () => {
      if (!spoke && alive()) {
        spoke = true;
        parle(index);
      }
    };

    const ids = ciblesDe(e);
    const autres = avecDe(e);
    let cid = ids[0] ?? '';
    const estOnglet = (k: string) => k.startsWith('onglet.');
    const ecran = ecranDe(!!e.menuPlus);
    const hBulle = estimerBulle(e.titre, e.texte, Math.min(W - 24, 440));

    /** Position de l'ancre (avec ses ancres « avec » dans le meme cadre, et coupee par son ancre « dans ») */
    const mesurer = async (id0: string): Promise<Box | null> => {
      let a = await anchorRect(id0);
      if (!a) return null;
      for (const k of autres) {
        if (k === id0) continue;
        const b = await anchorRect(k);
        if (!b) continue;
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        a = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y, r: Math.min(a.r, b.r) };
      }
      if (e.dans && e.dans !== id0) {
        const d = await anchorRect(e.dans);
        if (d) {
          const x = Math.max(a.x, d.x);
          const y = Math.max(a.y, d.y);
          const w = Math.min(a.x + a.w, d.x + d.w) - x;
          const h = Math.min(a.y + a.h, d.y + d.h) - y;
          if (w <= 0 || h <= 0) return null;
          a = { x, y, w, h, r: Math.min(a.r, w / 2, h / 2) };
        }
      }
      return a;
    };
    /** L'ecran bouge encore (defilement, onglet qui grandit, changement d'onglet) : on attend qu'il soit pose */
    const poser = async (r: Box | null): Promise<Box | null> => {
      let rect = r;
      for (let k = 0; k < 12 && rect; k++) {
        await wait(160);
        if (!alive()) return null;
        const again = await mesurer(cid);
        if (!again) break;
        const pose = Math.abs(again.y - rect.y) < 1 && Math.abs(again.x - rect.x) < 1 && Math.abs(again.w - rect.w) < 1 && Math.abs(again.h - rect.h) < 1;
        rect = again;
        if (pose) break;
      }
      return rect;
    };
    /** Le cadre autour de l'element, a sa forme (rayon de l'ancre plus la marge) */
    // 28 octobre 2026 soir : jamais sous la barre d'etat ; un element plus grand que la place : sa partie haute, la bulle dessous
    const cadre = (rect: Box): Trou => {
      const t = cadreDe(rect, ecran, { surBarre: !!cid && !estOnglet(cid) && !e.menuPlus, plafond: ecran.haut - 8 });
      const p = placerBulle(t, hBulle, ecran);
      if (!p.couvre || estOnglet(cid)) return t;
      const bas = ecran.bas - hBulle - 12;
      const h = Math.max(60, bas - t.y);
      return { ...t, h, r: Math.min(t.r, h / 2) };
    };
    /** L'element est vraiment a l'ecran (sinon : bulle seule, jamais un cadre perdu) */
    const aLEcran = (r: Box | null): r is Box => !!r && r.w > 0 && r.h > 0 && r.y < H - 40 && r.y + r.h > Math.max(40, insets.top) && r.x < W - 10 && r.x + r.w > 10;
    /** L'ecran qui defile pour cette etape : le menu +, sinon l'onglet ouvert */
    const scrollerDe = () => getTourScroller(e.menuPlus ? SCROLLER_MENU : SCROLLERS[ongletRef.current] ?? 'accueil');
    /** Amene l'element la ou il tient avec sa bulle (deux essais : le contenu peut finir avant) */
    const amener = async (r: Box | null): Promise<Box | null> => {
      if (!r || estOnglet(cid)) return r;
      let rect = r;
      for (let k = 0; k < 2; k++) {
        const dy = defilementPourMontrer(rect, hBulle, ecran);
        if (Math.abs(dy) < 4) break;
        const sc = scrollerDe();
        if (!sc) break;
        sc.scrollBy(dy);
        await wait(560);
        if (!alive()) return null;
        const again = await poser(await mesurer(cid));
        if (!again) break;
        const bouge = Math.abs(again.y - rect.y) >= 2;
        rect = again;
        // le bout du contenu : on ne peut pas aller plus loin
        if (!bouge) break;
      }
      return rect;
    };

    const run = async () => {
      // 28 octobre 2026 soir : pendant la transition, voile uni, ni cadre ni bulle ; tout revient ensemble une fois l'ecran pose
      setReady(false);
      setHole(null);
      setVoile(true);
      setDefilable(false);
      suiviRef.current = null;
      bOpacity.value = 0;
      stopVoix();
      fOpacity.value = withTiming(0, { duration: 150 });

      // 18 octobre : l'exemple (Heny) se prepare au lancement ; la visite l'attend avant de montrer (12 s au plus)
      if (exempleRef.current) {
        await within(exempleRef.current, 12000, false);
        if (!alive()) return;
      }

      // l'onglet de l'etape (le menu + se ferme avant de changer d'onglet)
      if (!e.menuPlus && menuRef.current) {
        menuRef.current = false;
        setMenu(false);
      }
      if (e.onglet && ongletRef.current !== e.onglet) {
        router.navigate(ROUTES[e.onglet] as never);
        await wait(700);
        if (!alive()) return;
      }
      if (e.haut) {
        try {
          getTourScroller(SCROLLERS[e.onglet ?? ongletRef.current] ?? 'accueil')?.scrollToTop();
        } catch {
          // l'ecran n'est pas encore pret
        }
        await wait(cid ? 650 : 0);
        if (!alive()) return;
      }
      // la carte Ton poids : la page de l'etape (sinon la premiere)
      const page = e.pagePoids ?? 0;
      if (page !== pagePoidsRef.current) {
        pagePoidsRef.current = page;
        montrerPagePoids(page);
        if (e.pagePoids !== undefined) {
          await wait(480);
          if (!alive()) return;
        }
      }
      // le menu du bouton +, montre tel quel, sur l'onglet de l'etape
      if (e.menuPlus) {
        const ouvrir = !menuRef.current;
        menuRef.current = true;
        setMenu(true);
        if (ouvrir) {
          await wait(550);
          if (!alive()) return;
        }
        montrerOngletPlus(e.ongletPlus ?? 'seance');
        await wait(220);
        if (!alive()) return;
      }

      let rect: Box | null = null;
      if (cid) {
        // plusieurs ancres possibles : la premiere presente a l'ecran ; un ecran qui vient de s'ouvrir : on reessaie
        const premiere = async () => {
          for (const id0 of ids) {
            const r = await mesurer(id0);
            if (r) {
              cid = id0;
              return r;
            }
          }
          return null;
        };
        rect = await premiere();
        for (let essai = 0; essai < 5 && !rect; essai++) {
          await wait(300);
          if (!alive()) return;
          rect = await premiere();
        }
        rect = await poser(rect);
        if (!alive()) return;
        // l'onglet n'avait pas encore defile (onglet pas encore affiche) : on le refait
        if (rect && e.haut && !aLEcran(rect)) {
          getTourScroller(SCROLLERS[e.onglet ?? ongletRef.current] ?? 'accueil')?.scrollToTop();
          await wait(700);
          if (!alive()) return;
          rect = await poser(await mesurer(cid));
          if (!alive()) return;
        }
        // l'element et sa bulle doivent tenir ensemble : l'ecran defile jusqu'a lui
        rect = await amener(rect);
        if (!alive()) return;
      }

      // rien a entourer, ou l'element n'est pas a l'ecran : la bulle seule, la visite continue
      if (!aLEcran(rect)) {
        setHole(null);
        setVoile(true);
        setReady(true);
        say();
        return;
      }

      const hole0 = cadre(rect);
      // plus grand que la place laissee a la bulle : la page reste defilable, le cadre suit
      const grand = rect.h + 2 * MARGE_CADRE + AIR_BULLE + hBulle > ecran.bas - ecran.haut;
      setDefilable(grand && !estOnglet(cid) && !e.menuPlus);
      setHole(hole0);
      setVoile(true);
      setReady(true);
      say();
      suiviRef.current = async () => {
        const r2 = await mesurer(cid);
        if (!alive() || !aLEcran(r2)) return;
        const t = cadre(r2);
        setHole((h) => (h && Math.abs(h.x - t.x) < 1 && Math.abs(h.y - t.y) < 1 && Math.abs(h.w - t.w) < 1 && Math.abs(h.h - t.h) < 1 ? h : t));
      };

      // 28 octobre 2026 soir : le doigt seulement quand il y a quelque chose a toucher, pose sur l'element lui meme
      if (e.sansDoigt || !e.appui) return;
      const cible = (await anchorRect(cid)) ?? rect;
      if (!alive()) return;
      const cx = cible.x + cible.w * (e.doigt?.x ?? 0.5);
      const cy = Math.min(H - 40, Math.max(hole0.y + 20, cible.y + cible.h * (e.doigt?.y ?? 0.5)));
      const travel = reduceMotion ? 0 : 650;
      fOpacity.value = withTiming(1, { duration: 220 });
      fx.value = withTiming(cx, { duration: travel, easing: Easing.out(Easing.cubic) });
      fy.value = withTiming(cy, { duration: travel, easing: Easing.out(Easing.cubic) });
      await wait(travel + 900);
      if (!alive()) return;
      if (e.appui) {
        fScale.value = withSequence(withTiming(0.8, { duration: 120 }), withTiming(1, { duration: 180 }));
        ripple.value = 0;
        ripple.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) });
        selectionAsync().catch(() => {});
        if (e.ouvre) {
          await wait(380);
          if (!alive()) return;
          router.navigate(ROUTES[e.ouvre] as never);
          // 28 octobre 2026 soir : le voile reste (meme rendu a chaque etape), le cadre reste autour de l'onglet
          fOpacity.value = withTiming(0, { duration: 300 });
          // 28 octobre 2026 : l'onglet ouvert s'etire (InkTabBar) ; le cadre suit sa vraie taille une fois pose
          await wait(AGRANDISSEMENT_ONGLET);
          if (!alive()) return;
          const apres = await poser(await mesurer(cid));
          if (alive() && aLEcran(apres)) setHole(cadre(apres));
        }
        if (e.ouvreMenu) {
          // 27 octobre : le doigt appuie sur +, le menu s'ouvre pour de vrai (sans pouvoir etre touche)
          await wait(380);
          if (!alive()) return;
          menuRef.current = true;
          setMenu(true);
          setVoile(false);
          fOpacity.value = withTiming(0, { duration: 300 });
          await wait(400);
          if (!alive()) return;
          montrerOngletPlus('seance');
          getTourScroller(SCROLLER_MENU)?.scrollToTop();
        }
        if (e.puisOngletPlus) {
          // 27 octobre : on passe d'un onglet du menu + a l'autre, le cadre suit (28 octobre : quand la voix y arrive)
          await wait(Math.round(2600 / Math.max(1, vitesseCourante())));
          if (!alive()) return;
          montrerOngletPlus(e.puisOngletPlus);
          await wait(260);
          if (!alive()) return;
          const apres = await poser(await mesurer(cid));
          if (alive() && aLEcran(apres)) setHole(cadre(apres));
        }
      }
    };
    // quoi qu'il arrive, la bulle finit par s'afficher et la voix part : on peut toujours avancer ou passer
    run()
      .catch(() => {
        if (alive()) setHole(null);
      })
      .finally(() => {
        if (!alive()) return;
        setReady(true);
        say();
      });
  }, [active, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setEnCours(active), [active]);

  // 28 octobre 2026 soir : la bulle se montre d'un coup, une fois mesuree et posee a sa place
  const placee = ready && bulle?.i === index;
  useEffect(() => {
    if (placee) bOpacity.value = withTiming(1, { duration: reduceMotion ? 0 : 180 });
  }, [placee, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // le cadre suit l'element si la page bouge pendant l'etape (element plus grand que l'ecran, defile a la main)
  useEffect(() => {
    if (!active || !ready) return;
    const t = setInterval(() => {
      void suiviRef.current?.();
    }, 300);
    return () => clearInterval(t);
  }, [active, ready, index]);

  // la visite s'arrete proprement si le composant disparait (et l'exemple se ferme)
  useEffect(
    () => () => {
      stopVoix();
      const p = exempleRef.current;
      exempleRef.current = null;
      if (p) void p.then(() => sortirExemple()).catch(() => undefined);
    },
    [stopVoix],
  );

  // 18 octobre : au lancement, une visite coupee (app fermee, plantage) est remise a zero. L'exemple ne vivait
  // qu'en memoire : il n'en reste rien, tes donnees n'ont pas bouge.
  useEffect(() => {
    void remiseAZeroAuDemarrage();
  }, []);

  // tu quittes l'app pendant la visite : elle s'arrete, l'exemple se ferme (elle reviendra au prochain lancement)
  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (etat) => {
      if (etat === 'background') finish(false);
    });
    return () => sub.remove();
  }, [active, finish]);

  // un autre ecran s'ouvre par-dessus les onglets (lien, notification) : la visite s'arrete, tes donnees reviennent
  const horsOnglets = segments[0] !== undefined && segments[0] !== '(tabs)';
  useEffect(() => {
    if (!active || !horsOnglets) return;
    const t = setTimeout(() => {
      if (Date.now() - debutRef.current > 2000) finish(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [active, horsOnglets, finish]);

  // la vitesse change pendant la lecture : la voix en cours suit
  useEffect(() => {
    appliquerVitesse(playerRef.current, vitesse);
  }, [vitesse]);

  const toggleVoix = () => {
    const next = !voix;
    voixRef.current = next;
    setVoix(next);
    selectionAsync().catch(() => {});
    if (next) parle(index);
    else stopVoix();
  };

  const go = (i: number) => {
    const now = Date.now();
    if (now - lastPress.current < 500) return;
    lastPress.current = now;
    setIndex(i);
  };

  const bulleStyle = useAnimatedStyle(() => ({ opacity: bOpacity.value }));
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fOpacity.value,
    transform: [{ translateX: fx.value - 23 }, { translateY: fy.value - 23 }, { scale: fScale.value }],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.9 * fOpacity.value,
    transform: [{ translateX: fx.value - 36 }, { translateY: fy.value - 36 }, { scale: 0.4 + ripple.value * 1.3 }],
  }));

  // 18 octobre : la visite finie, une phrase courte, sur tes vraies donnees
  if (!active) {
    if (!finMessage) return null;
    return (
      <Animated.View
        entering={FadeInDown.duration(260)}
        exiting={FadeOut.duration(220)}
        pointerEvents="none"
        style={[s.fin, { bottom: insets.bottom + 96, backgroundColor: c.surface, borderColor: c.border, shadowColor: '#000' }]}
        accessibilityLiveRegion="polite"
      >
        <Ink size={14.5} weight="bold" color={c.ink} style={{ textAlign: 'center', lineHeight: 20 }}>
          {finMessage}
        </Ink>
      </Animated.View>
    );
  }

  const e = ETAPES[index];
  // la pastille « Exemple » en haut : la bulle du haut se pose juste dessous
  const pastille = exemple !== 'non';
  pastilleRef.current = pastille;
  const last = index === ETAPES.length - 1;
  const first = index === 0;
  const { n: nPartie, sur: surPartie } = rangDansPartie(index);

  // 28 octobre 2026 : la bulle se place avec sa vraie hauteur (mesuree ; estimee le temps de la mesurer), a cote du
  // cadre, jamais dessus, jamais hors de l'ecran (./placement.ts). Ecran ouvert sans voile : au dessus de l'onglet.
  const bubbleW = Math.min(W - 24, 440);
  const ecranBulle = ecranDe(menu);
  // petit telephone et grande carte (Ton poids sur un iPhone SE) : la bulle se fait compacte (sans la ligne de
  // progression, sticker plus petit) pour tenir a cote de l'element. Decide sur l'estimation, stable d'un rendu a l'autre.
  const compact = !!hole && placerBulle(hole, estimerBulle(e.titre, e.texte, bubbleW), ecranBulle).couvre;
  const mesuree = bulle && bulle.i === index ? bulle.h : null;
  const estimee = estimerBulle(e.titre, e.texte, bubbleW) - (compact ? 38 : 0);
  // une mesure aberrante (plus haute que l'ecran) ne doit jamais renvoyer la bulle tout en haut
  const hBulle = Math.min(mesuree ?? estimee, Math.max(estimee * 1.5, 180), H * 0.7);
  const place = placerBulle(hole, hBulle, ecranBulle);
  const bubbleTop = place.top;

  const r = Math.max(0, hole?.r ?? 18);
  // le voile couvre toute la visite, quelle que soit sa taille reelle
  const Wv = Math.max(W, tailleRoot.w);
  const Hv = Math.max(H, tailleRoot.h);
  const veil =
    hole && voile && ready
      ? `M0 0H${Wv}V${Hv}H0Z M${hole.x + r} ${hole.y}H${hole.x + hole.w - r}Q${hole.x + hole.w} ${hole.y} ${hole.x + hole.w} ${hole.y + r}V${hole.y + hole.h - r}Q${hole.x + hole.w} ${hole.y + hole.h} ${hole.x + hole.w - r} ${hole.y + hole.h}H${hole.x + r}Q${hole.x} ${hole.y + hole.h} ${hole.x} ${hole.y + hole.h - r}V${hole.y + r}Q${hole.x} ${hole.y} ${hole.x + r} ${hole.y}Z`
      : `M0 0H${Wv}V${Hv}H0Z`;
  const veilColor = isDark ? 'rgba(6,8,13,0.7)' : 'rgba(14,17,26,0.6)';

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={StyleSheet.absoluteFill}
      pointerEvents={defilable ? 'box-none' : 'auto'}
      onLayout={(ev) => {
        const { width: w, height: h } = ev.nativeEvent.layout;
        if (Math.abs(w - tailleRoot.w) > 1 || Math.abs(h - tailleRoot.h) > 1) setTailleRoot({ w, h });
        rootRef.current?.measureInWindow((_x, y) => {
          rootYRef.current = y || 0;
        });
      }}
    >
      {/* le menu du bouton +, tel quel, sans pouvoir le toucher */}
      {menu ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Ajouter />
        </Animated.View>
      ) : null}

      {/* pendant la visite, l'app derriere ne recoit aucun appui (sauf le defilement quand l'element est plus grand que l'ecran) */}
      {!defilable ? <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} /> : null}

      {/* voile, avec la decoupe autour de l'element montre */}
      {/* 28 octobre 2026 soir : le meme voile a chaque etape (uni pendant les transitions, decoupe autour de l'element ensuite) */}
      {voile || !hole ? (
        <Animated.View entering={FadeIn.duration(220)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={Wv} height={Hv}>
            <Path d={veil} fill={veilColor} fillRule="evenodd" />
          </Svg>
        </Animated.View>
      ) : null}
      {hole && ready ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={Wv} height={Hv}>
            {/* le cadre epouse l'element : coins concentriques a ceux de l'element */}
            <Rect x={hole.x - 3} y={hole.y - 3} width={hole.w + 6} height={hole.h + 6} rx={r + 3} fill="none" stroke={c.accent} strokeOpacity={0.35} strokeWidth={6} />
            <Rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={r} fill="none" stroke={isDark ? c.accent : '#FFFFFF'} strokeWidth={1.5} strokeOpacity={0.9} />
            <Rect x={hole.x - 1.5} y={hole.y - 1.5} width={hole.w + 3} height={hole.h + 3} rx={r + 1.5} fill="none" stroke={isDark ? '#FFFFFF' : c.accent} strokeWidth={3} />
          </Svg>
        </View>
      ) : null}

      {/* l'onde de l'appui, puis le doigt */}
      <Animated.View pointerEvents="none" style={[s.ripple, rippleStyle]} />
      <Animated.View pointerEvents="none" style={[s.finger, fingerStyle]}>
        <View style={[s.fingerCore, { backgroundColor: isDark ? '#FFFFFF' : c.detail }]} />
      </Animated.View>

      {/* 18 octobre : tout ce que montre la visite est un exemple, jamais tes donnees */}
      {pastille ? (
        <View pointerEvents="none" style={[s.pastilleWrap, { top: insets.top + 6 }]}>
          <View style={[s.pastille, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="text" accessibilityLabel={exemple === 'oui' ? traduire('Exemple : profil de démo. Ce ne sont pas tes données') : traduire('Préparation de l’exemple')}>
            <View style={[s.pastillePoint, { backgroundColor: c.detail }]} />
            <Ink size={12.5} weight="extraBold" color={c.ink}>{exemple === 'oui' ? traduire('Exemple : profil de démo') : traduire('Préparation de l’exemple…')}</Ink>
          </View>
        </View>
      ) : null}

      {ready ? (
        // 28 octobre 2026 : la bulle au style de l'app (carte blanche, partie en petites capitales colorees, sticker,
        // bouton pastel) ; invisible le temps d'etre mesuree, puis posee a sa place
        <View
          key={index}
          onLayout={(ev) => {
            const h = Math.round(ev.nativeEvent.layout.height);
            if (h > 0 && (!bulle || bulle.i !== index || Math.abs(bulle.h - h) > 1)) setBulle({ i: index, h });
          }}
          // 28 octobre 2026 soir (captures de Houari : bulle collee en haut) : placee par translation depuis le haut de la
          // visite, et montree seulement une fois mesuree et placee, d'un fondu simple, sans animation d'entree de mise en page
          style={[s.bubbleWrap, { width: bubbleW, left: (W - bubbleW) / 2, top: 0, transform: [{ translateY: bubbleTop }] }]}
        >
        <Animated.View style={[s.bubble, { backgroundColor: c.surface, borderColor: c.border, shadowColor: '#000' }, bulleStyle]}>
          <View style={s.head}>
            <Ink size={11.5} weight="black" color={c.accentText} numberOfLines={1} style={{ flexShrink: 1, letterSpacing: 1.3 }}>
              {PARTIES[e.partie].toUpperCase()}
            </Ink>
            {compact ? (
              <Ink size={12.5} weight="extraBold" color={c.textSecondary} numberOfLines={1}>
                {traduire("{0} sur {1}", nPartie, surPartie)}
              </Ink>
            ) : null}
            <View style={{ flex: 1 }} />
            <Pressable onPress={toggleVoix} hitSlop={10} style={[s.voixBtn, { backgroundColor: c.accentTint }]} accessibilityRole="button" accessibilityLabel={voix ? traduire('Couper la voix') : traduire('Remettre la voix')}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke={c.accentText} strokeWidth={2} strokeLinejoin="round" />
                {voix ? (
                  <Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke={c.accentText} strokeWidth={2} strokeLinecap="round" />
                ) : (
                  <Path d="M16 9.5l5 5M21 9.5l-5 5" stroke={c.accentText} strokeWidth={2} strokeLinecap="round" />
                )}
              </Svg>
            </Pressable>
            {voix ? (
              <Pressable onPress={vitesseSuivante} hitSlop={8} style={[s.vitesseBtn, { backgroundColor: c.accentTint }]} accessibilityRole="button" accessibilityLabel={traduire("Vitesse de la voix : {0}. Changer", libelleVitesse(vitesse))}>
                <Ink size={13} weight="extraBold" color={c.accentText}>{libelleVitesse(vitesse)}</Ink>
              </Pressable>
            ) : null}
            {!last ? (
              // Passer, bien visible : une vraie pilule, pas un texte gris
              <Pressable onPress={() => finish()} hitSlop={8} style={({ pressed }) => [s.passer, { backgroundColor: pressed ? c.fillSoft : c.surface, borderColor: c.border }]} accessibilityRole="button" accessibilityLabel={traduire("Quitter la visite")}>
                <Ink size={14} weight="black" color={c.ink}>{traduire("Passer")}</Ink>
              </Pressable>
            ) : null}
          </View>

          {/* la progression : ou tu en es dans cette partie, et dans toute la visite */}
          {__DEV__ ? (
            // developpement seulement : les chiffres du placement, lisibles sur une capture (jamais en production)
            <Ink size={9} weight="medium" color={c.textMuted} style={{ position: 'absolute', right: 18, bottom: 2 }}>
              {`dev ${Math.round(bubbleTop)} h${Math.round(hBulle)}${mesuree === null ? '?' : ''} ${place.cote} trou ${hole ? `${Math.round(hole.y)}+${Math.round(hole.h)}` : '0'} H${Math.round(H)} in${Math.round(insets.top)}/${Math.round(insets.bottom)} r${Math.round(rootYRef.current)}`}
            </Ink>
          ) : null}
          {!compact ? (
          <View style={s.progres}>
            <View style={[s.track, { backgroundColor: c.accentTint }]}>
              <View style={{ width: `${((index + 1) / ETAPES.length) * 100}%`, height: '100%', borderRadius: 2, backgroundColor: c.detail }} />
            </View>
            <Ink size={12.5} weight="extraBold" color={c.textSecondary} accessibilityLabel={traduire("Étape {0} sur {1}", nPartie, surPartie)}>
              {traduire("{0} sur {1}", nPartie, surPartie)}
            </Ink>
          </View>
          ) : null}

          <View style={s.titreRang}>
            {e.sticker ? <Image source={illus.img(e.sticker)} style={compact ? s.stickerCompact : s.sticker} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            <Ink size={19} weight="black" tight color={c.ink} style={{ flex: 1 }} accessibilityRole="header">
              {traduire(e.titre)}
            </Ink>
          </View>
          <Ink size={15} weight="medium" color={c.textSecondary} style={{ marginTop: 6, lineHeight: 21 }}>
            {traduire(e.texte)}
          </Ink>

          <View style={s.actions}>
            {!first ? (
              <Pressable onPress={() => go(index - 1)} hitSlop={8} style={[s.prev, { backgroundColor: c.fillSoft }]} accessibilityRole="button" accessibilityLabel={traduire("Étape précédente")}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M15 5l-7 7 7 7" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }} />
            <BoutonPrincipal
              onPress={() => (last ? finish() : go(index + 1))}
              haptique="light"
              accessibilityLabel={last ? traduire('Terminer la visite') : traduire('Étape suivante')}
              hauteur={46}
              rayon={23}
              styleBouton={{ gap: 8, paddingHorizontal: 22 }}
            >
              {(col) => (
                <>
                  <Ink size={15.5} weight="black" color={col}>{last ? traduire('C’est parti') : first ? traduire('On y va') : traduire('Suivant')}</Ink>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M5 12h13M13 6l6 6-6 6" stroke={col} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </>
              )}
            </BoutonPrincipal>
          </View>
        </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  finger: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fingerCore: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FFFFFF' },
  ripple: { position: 'absolute', left: 0, top: 0, width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#FFFFFF' },
  bubbleWrap: { position: 'absolute' },
  bubble: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progres: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  titreRang: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  sticker: { width: 44, height: 44 },
  stickerCompact: { width: 32, height: 32 },
  passer: { height: 34, borderRadius: 17, borderWidth: 1.5, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  voixBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  vitesseBtn: { minWidth: 44, height: 34, borderRadius: 17, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  pastilleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pastille: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  pastillePoint: { width: 7, height: 7, borderRadius: 4 },
  fin: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  prev: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 22, minHeight: 46 },
});
