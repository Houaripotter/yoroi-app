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
import { AppState, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { selectionAsync } from 'expo-haptics';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import Ajouter from '@/app/ajouter';
import { getTourScroller, measureTourAnchor } from './TourAnchor';
import { isVisiteDone, markTourSeen, markVisiteDone, VISITE_VOIX_KEY } from './keys';
import { _fenetreCurrent } from '@/components/yoroi/v2/fenetre/api';
import { ETAPES, ciblesDe, type Onglet } from './etapes';
import { entrerExemple, sortirExemple } from '@/lib/v2/visite/demoVisite';
import { remiseAZeroAuDemarrage } from '@/lib/v2/visite/vitrine';
import { appliquerVitesse, libelleVitesse, useVitesseVoix } from '@/lib/v2/visite/vitesseVoix';
import { traduire } from '@/lib/i18n/tr';

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

type Box = { x: number; y: number; w: number; h: number };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Une fenetre de l'app est ouverte (rappel, torii...) : la visite attend qu'elle soit fermee (2 minutes au plus) */
async function attendreFenetres(alive: () => boolean): Promise<void> {
  for (let k = 0; k < 240 && alive() && _fenetreCurrent(); k++) await wait(500);
}
const within = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

const ROUTES: Record<Onglet, string> = { index: '/(tabs)', seances: '/(tabs)/seances', progres: '/(tabs)/progres', dojo: '/(tabs)/dojo' };

export function VisiteGuidee() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Box | null>(null);
  const [voile, setVoile] = useState(true);
  const [menu, setMenu] = useState(false);
  const [ready, setReady] = useState(false);
  const [voix, setVoix] = useState(true);
  const voixRef = useRef(true);
  const apercuRef = useRef(false);
  const rootRef = useRef<View>(null);
  const runId = useRef(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const ongletRef = useRef<Onglet>('index');
  const lastPress = useRef(0);
  const autoChecked = useRef(false);
  // 18 octobre : l'exemple (Heny, en memoire, lib/v2/visite/vitrine.ts) pendant la visite, puis tes vraies donnees
  const exempleRef = useRef<Promise<boolean> | null>(null);
  const [exemple, setExemple] = useState<'non' | 'chargement' | 'oui'>('non');
  const [finMessage, setFinMessage] = useState<string | null>(null);
  const [vitesse, vitesseSuivante] = useVitesseVoix();
  const debutRef = useRef(0);

  // l'onglet ouvert, lu par le deroule
  const seg = segments[0] === '(tabs)' ? (segments[1] ?? 'index') : segments[0] ?? '';
  ongletRef.current = (['index', 'seances', 'progres', 'dojo'].includes(seg) ? seg : 'autre') as Onglet;

  const fx = useSharedValue(W / 2);
  const fy = useSharedValue(H * 0.7);
  const fOpacity = useSharedValue(0);
  const fScale = useSharedValue(1);
  const ripple = useSharedValue(0);

  const stopVoix = useCallback(() => {
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

  useEffect(() => {
    AsyncStorage.getItem(VISITE_VOIX_KEY)
      .then((v) => {
        if (v === '0') {
          voixRef.current = false;
          setVoix(false);
        }
      })
      .catch(() => {});
  }, []);

  // Lancement : Aide, Studio, ou web avec ?visite=N (apercu, pour les captures)
  useEffect(() => {
    const start = (depart: number, apercu: boolean) => {
      apercuRef.current = apercu;
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
    setMenu(false);
    setReady(false);
    getTourScroller('accueil')?.scrollToTop();
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
        root.measureInWindow((rx, ry) => resolve({ x: a.x - (rx || 0), y: a.y - (ry || 0), w: a.width, h: a.height }));
      }),
      800,
      null,
    );
  }, []);

  const parle = useCallback(
    (i: number) => {
      stopVoix();
      const n = ETAPES[i]?.voix;
      const fichier = n ? VOIX[n - 1] : undefined;
      if (!voixRef.current || !fichier) return;
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
      try {
        const p = createAudioPlayer(fichier);
        p.volume = 1;
        // 18 octobre : 1x, 1,5x ou 2x, sans voix aigue (lib/v2/visite/vitesseVoix.ts)
        appliquerVitesse(p);
        // la voix a fini : on passe seul a l'etape suivante (sauf la derniere)
        p.addListener('playbackStatusUpdate', (st) => {
          if (!st.didJustFinish || playerRef.current !== p) return;
          if (i >= ETAPES.length - 1) return;
          // un fichier vide ou trop court (voix pas encore enregistree) : on attend « Suivant »
          if (!st.duration || st.duration < 2) return;
          setTimeout(() => {
            if (playerRef.current === p) setIndex(i + 1);
          }, 1300);
        });
        p.play();
        playerRef.current = p;
      } catch {
        // pas de voix : la visite marche sans
      }
    },
    [stopVoix],
  );

  // Deroule d'une etape
  useEffect(() => {
    if (!active) return;
    const id = ++runId.current;
    const alive = () => runId.current === id;
    const e = ETAPES[index];
    let spoke = false;
    const say = () => {
      if (!spoke && alive()) {
        spoke = true;
        parle(index);
      }
    };

    const ids = ciblesDe(e);
    let cid = ids[0] ?? '';
    const run = async () => {
      setReady(false);
      stopVoix();
      fOpacity.value = withTiming(0, { duration: 150 });

      // 18 octobre : l'exemple (Heny) se prepare au lancement ; la visite l'attend avant de montrer (12 s au plus)
      if (exempleRef.current) {
        await within(exempleRef.current, 12000, false);
        if (!alive()) return;
      }

      // l'onglet de l'etape
      if (e.onglet && ongletRef.current !== e.onglet) {
        router.navigate(ROUTES[e.onglet] as never);
        await wait(650);
        if (!alive()) return;
      }
      if (e.haut) {
        getTourScroller('accueil')?.scrollToTop();
        await wait(cid ? 650 : 0);
        if (!alive()) return;
      }
      // le menu du bouton +, montre tel quel
      const menuAvant = menu;
      setMenu(!!e.menuPlus);
      if (e.menuPlus && !menuAvant) {
        await wait(550);
        if (!alive()) return;
      }

      let rect: Box | null = null;
      if (cid) {
        // plusieurs ancres possibles (accueil A, B ou C) : la premiere presente a l'ecran
        const premiere = async () => {
          for (const id of ids) {
            const r = await anchorRect(id);
            if (r) {
              cid = id;
              return r;
            }
          }
          return null;
        };
        rect = await premiere();
        if (!rect) {
          await wait(400);
          if (!alive()) return;
          rect = await premiere();
        }
        // l'ecran bouge encore (defilement, changement d'onglet) : on attend qu'il soit pose
        for (let k = 0; k < 12 && rect; k++) {
          await wait(160);
          if (!alive()) return;
          const again = await anchorRect(cid);
          if (!again) break;
          const pose = Math.abs(again.y - rect.y) < 1 && Math.abs(again.x - rect.x) < 1;
          rect = again;
          if (pose) break;
        }
        // l'accueil n'avait pas encore defile (onglet pas encore affiche) : on le refait
        if (rect && e.haut && (rect.y + rect.h < 10 || rect.y > H - 20)) {
          getTourScroller('accueil')?.scrollToTop();
          await wait(700);
          if (!alive()) return;
          rect = await anchorRect(cid);
          for (let k = 0; k < 12 && rect; k++) {
            await wait(160);
            if (!alive()) return;
            const again = await anchorRect(cid);
            if (!again) break;
            const pose = Math.abs(again.y - rect.y) < 1;
            rect = again;
            if (pose) break;
          }
        }
        // bulleHaut : le bas de la carte vient juste au-dessus de la barre d'onglets (la bulle est en haut)
        const basVise = H - (Math.max(insets.bottom - 8, 0) + 14) - 72 - 10;
        const decalage = rect && e.bulleHaut ? rect.y + rect.h - basVise : 0;
        if (rect && e.defile && (e.bulleHaut ? Math.abs(decalage) > 6 : rect.y + rect.h > H - 300 || rect.y < insets.top + 20)) {
          getTourScroller('accueil')?.scrollBy(e.bulleHaut ? decalage : rect.y - (insets.top + 70));
          await wait(600);
          if (!alive()) return;
          rect = await anchorRect(cid);
          for (let k = 0; k < 12 && rect; k++) {
            await wait(160);
            if (!alive()) return;
            const again = await anchorRect(cid);
            if (!again) break;
            const pose = Math.abs(again.y - rect.y) < 1;
            rect = again;
            if (pose) break;
          }
        }
      }
      if (!alive()) return;

      if (!rect) {
        setHole(null);
        setReady(true);
        say();
        return;
      }

      const pad = 7;
      const top = Math.max(insets.top * 0.5, rect.y - pad);
      // une carte plus haute que l'ecran (petit telephone) : le cadre s'arrete au-dessus de la barre d'onglets
      const surBarre = !!cid && !cid.startsWith('onglet.') && !e.menuPlus;
      const hautBarre = H - (Math.max(insets.bottom - 8, 0) + 14) - 72;
      const bottom = Math.min(H - 4, rect.y + rect.h + pad, surBarre && rect.y < hautBarre - 40 ? hautBarre : H);
      setHole({ x: Math.max(4, rect.x - pad), y: top, w: Math.min(W - 8, rect.w + pad * 2), h: Math.max(20, bottom - top) });
      setVoile(true);
      setReady(true);
      say();

      // le doigt rejoint la cible, puis appuie
      const cx = rect.x + rect.w / 2;
      const cy = Math.min(H - 40, Math.max(top + 20, rect.y + Math.min(rect.h / 2, 90)));
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
          // l'ecran ouvert reste bien visible : plus de voile, le cadre reste autour de l'onglet
          setVoile(false);
          fOpacity.value = withTiming(0, { duration: 300 });
        }
      }
    };
    // quoi qu'il arrive, la bulle finit par s'afficher : on peut toujours avancer ou passer
    run()
      .catch(() => {})
      .finally(() => {
        if (alive()) setReady(true);
      });
  }, [active, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setEnCours(active), [active]);

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
    AsyncStorage.setItem(VISITE_VOIX_KEY, next ? '1' : '0').catch(() => {});
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
  const hautBulle = insets.top + (pastille ? 46 : 8);
  const last = index === ETAPES.length - 1;
  const first = index === 0;

  // la bulle : a l'oppose de la cible, sinon en bas
  const bubbleW = Math.min(W - 24, 440);
  const BULLE = 214;
  let bubbleTop: number | undefined;
  let bubbleBottom: number | undefined;
  if (!hole || !voile) {
    bubbleBottom = hole && !voile ? H - hole.y + 14 : insets.bottom + 110;
  } else if (hole.y + hole.h / 2 > H / 2) {
    bubbleBottom = H - hole.y + 14;
    if (hole.y - 14 - insets.top < BULLE) bubbleBottom = undefined;
  } else {
    bubbleTop = hole.y + hole.h + 14;
    if (H - bubbleTop - insets.bottom < BULLE) bubbleTop = undefined;
  }
  if (bubbleTop === undefined && bubbleBottom === undefined) bubbleBottom = insets.bottom + 16;
  if (e.bulleHaut && hole && voile) {
    bubbleTop = hautBulle;
    bubbleBottom = undefined;
  }
  if (!hole && (first || last)) {
    bubbleTop = undefined;
    bubbleBottom = Math.max(insets.bottom + 110, (H - BULLE) / 2 - 40);
  }

  const r = 18;
  const veil =
    hole && voile
      ? `M0 0H${W}V${H}H0Z M${hole.x + r} ${hole.y}H${hole.x + hole.w - r}Q${hole.x + hole.w} ${hole.y} ${hole.x + hole.w} ${hole.y + r}V${hole.y + hole.h - r}Q${hole.x + hole.w} ${hole.y + hole.h} ${hole.x + hole.w - r} ${hole.y + hole.h}H${hole.x + r}Q${hole.x} ${hole.y + hole.h} ${hole.x} ${hole.y + hole.h - r}V${hole.y + r}Q${hole.x} ${hole.y} ${hole.x + r} ${hole.y}Z`
      : `M0 0H${W}V${H}H0Z`;
  const veilColor = isDark ? 'rgba(6,8,13,0.7)' : 'rgba(14,17,26,0.6)';

  return (
    <View ref={rootRef} collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="auto">
      {/* le menu du bouton +, tel quel, sans pouvoir le toucher */}
      {menu ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Ajouter />
        </Animated.View>
      ) : null}

      {/* pendant la visite, l'app derriere ne recoit aucun appui */}
      <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} />

      {/* voile, avec la decoupe autour de l'element montre */}
      {voile || !hole ? (
        <Animated.View entering={FadeIn.duration(220)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={W} height={H}>
            <Path d={veil} fill={hole || first || last ? veilColor : 'rgba(14,17,26,0.35)'} fillRule="evenodd" />
          </Svg>
        </Animated.View>
      ) : null}
      {hole ? (
        <Animated.View key={`${index}-${hole.x}-${hole.y}`} entering={FadeIn.duration(260)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={W} height={H}>
            <Rect x={hole.x - 3} y={hole.y - 3} width={hole.w + 6} height={hole.h + 6} rx={r + 3} fill="none" stroke={c.accent} strokeOpacity={0.35} strokeWidth={6} />
            <Rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={r} fill="none" stroke={isDark ? c.accent : '#FFFFFF'} strokeWidth={1.5} strokeOpacity={0.9} />
            <Rect x={hole.x - 1.5} y={hole.y - 1.5} width={hole.w + 3} height={hole.h + 3} rx={r + 1.5} fill="none" stroke={isDark ? '#FFFFFF' : c.accent} strokeWidth={3} />
          </Svg>
        </Animated.View>
      ) : null}

      {/* l'onde de l'appui, puis le doigt */}
      <Animated.View pointerEvents="none" style={[s.ripple, rippleStyle]} />
      <Animated.View pointerEvents="none" style={[s.finger, fingerStyle]}>
        <View style={[s.fingerCore, { backgroundColor: isDark ? '#FFFFFF' : c.accent }]} />
      </Animated.View>

      {/* 18 octobre : tout ce que montre la visite est un exemple, jamais tes donnees */}
      {pastille ? (
        <View pointerEvents="none" style={[s.pastilleWrap, { top: insets.top + 6 }]}>
          <View style={[s.pastille, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="text" accessibilityLabel={exemple === 'oui' ? traduire('Exemple : profil de démo. Ce ne sont pas tes données') : traduire('Préparation de l’exemple')}>
            <View style={[s.pastillePoint, { backgroundColor: c.accent }]} />
            <Ink size={12.5} weight="extraBold" color={c.ink}>{exemple === 'oui' ? traduire('Exemple : profil de démo') : traduire('Préparation de l’exemple…')}</Ink>
          </View>
        </View>
      ) : null}

      {ready ? (
        <Animated.View
          key={index}
          entering={reduceMotion ? FadeIn.duration(160) : FadeInDown.duration(260)}
          style={[s.bubble, { width: bubbleW, left: (W - bubbleW) / 2, top: bubbleTop, bottom: bubbleBottom, backgroundColor: c.surface, borderColor: c.border, shadowColor: '#000' }]}
        >
          <View style={s.head}>
            <Ink size={12.5} weight="extraBold" color={c.accent}>{traduire("{0} sur {1}", index + 1, ETAPES.length)}</Ink>
            <View style={[s.track, { backgroundColor: c.accentTint }]}>
              <View style={{ width: `${((index + 1) / ETAPES.length) * 100}%`, height: '100%', borderRadius: 2, backgroundColor: c.accent }} />
            </View>
            <Pressable onPress={toggleVoix} hitSlop={10} style={[s.voixBtn, { backgroundColor: c.accentTint }]} accessibilityRole="button" accessibilityLabel={voix ? traduire('Couper la voix') : traduire('Remettre la voix')}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke={c.accent} strokeWidth={2} strokeLinejoin="round" />
                {voix ? (
                  <Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke={c.accent} strokeWidth={2} strokeLinecap="round" />
                ) : (
                  <Path d="M16 9.5l5 5M21 9.5l-5 5" stroke={c.accent} strokeWidth={2} strokeLinecap="round" />
                )}
              </Svg>
            </Pressable>
            {voix ? (
              <Pressable onPress={vitesseSuivante} hitSlop={8} style={[s.vitesseBtn, { backgroundColor: c.accentTint }]} accessibilityRole="button" accessibilityLabel={traduire("Vitesse de la voix : {0}. Changer", libelleVitesse(vitesse))}>
                <Ink size={13} weight="extraBold" color={c.accent}>{libelleVitesse(vitesse)}</Ink>
              </Pressable>
            ) : null}
            {!last ? (
              <Pressable onPress={() => finish()} hitSlop={12} accessibilityRole="button" accessibilityLabel={traduire("Quitter la visite")}>
                <Ink size={14} weight="bold" color={c.textSecondary}>Passer</Ink>
              </Pressable>
            ) : null}
          </View>

          <Ink size={19} weight="black" tight color={c.ink} style={{ marginTop: 10 }} accessibilityRole="header">
            {e.titre}
          </Ink>
          <Ink size={15} weight="medium" color={c.textSecondary} style={{ marginTop: 4, lineHeight: 21 }}>
            {e.texte}
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
            <Pressable
              onPress={() => (last ? finish() : go(index + 1))}
              style={({ pressed }) => [s.cta, { backgroundColor: pressed ? c.accentPressed : c.accent }]}
              accessibilityRole="button"
              accessibilityLabel={last ? traduire('Terminer la visite') : traduire('Étape suivante')}
            >
              <Ink size={15.5} weight="black" color={c.onAccent}>{last ? traduire('C’est parti') : first ? 'On y va' : traduire('Suivant')}</Ink>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12h13M13 6l6 6-6 6" stroke={c.onAccent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
        </Animated.View>
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
  bubble: {
    position: 'absolute',
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
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
