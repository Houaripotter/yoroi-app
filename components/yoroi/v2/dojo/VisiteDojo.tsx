/**
 * Vague 48 : la visite du Dojo, avec la voix d'Antonin (ElevenLabs), comme la visite guidee de l'app.
 * Houari : « l'utilisateur pourra dire je veux les expliquer plus tard et il les reverra dans l'onglet Dojo ».
 *
 * Elle propose une fois de partir (« C'est parti » ou « Plus tard »), puis le bouton « ? » en haut du Dojo
 * la relance quand on veut. A chaque etape : le Dojo defile jusqu'a la bonne carte, l'ecran s'assombrit
 * autour d'elle, une bulle courte dit ce que c'est et la voix le dit. Quand la voix a fini, on passe seul
 * a l'etape suivante ; sans voix, « Suivant ». Rien n'est touche pour de vrai.
 * Voix : assets/sounds/dojo/dojo_fr_etape_XX.mp3 (meme texte que la bulle).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect as SvgRect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { appliquerVitesse, libelleVitesse, useVitesseVoix } from '@/lib/v2/visite/vitesseVoix';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/dojo/parts';
import { traduire } from '@/lib/i18n/tr';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { cadreDe, estimerBulle, hautDeBarre, placerBulle, type Ecran } from '@/components/yoroi/v2/tour/placement';

export type CibleDojo = 'hero' | 'aujourdhui' | 'recompense' | 'semaines' | 'sceaux' | 'aide';
/** r : le rayon des coins de la carte (28 octobre 2026 : le cadre epouse la carte) */
export type Rect = { x: number; y: number; w: number; h: number; r?: number };

type Etape = { titre: string; texte: string; cible?: CibleDojo; sticker: NomSticker };

export const ETAPES_DOJO: Etape[] = [
  { titre: traduire('Bienvenue dans ton Dojo'), texte: traduire('Bienvenue dans ton Dojo. Ici, chaque effort te rapporte des points. Je te montre tout en trente secondes.'), sticker: 'torii' },
  { titre: traduire('Ton rang'), texte: traduire('Voici ton personnage et ton rang. Plus tu gagnes de points, plus tu montes en rang, et plus tu débloques de récompenses.'), cible: 'hero', sticker: 'kabuto' },
  { titre: traduire('Ta série'), texte: traduire('Chaque jour, fais un petit geste : une séance, une pesée, ou juste un verre d’eau. Ta flamme compte les jours d’affilée.'), cible: 'aujourdhui', sticker: 'flamme' },
  { titre: traduire('Ton coffre du jour'), texte: traduire('Ton geste fait, ouvre ton coffre du jour. Plus ta série est longue, plus il rapporte. Tous les sept jours, c’est le grand coffre.'), cible: 'aujourdhui', sticker: 'coffre_ferme' },
  { titre: traduire('Ta prochaine récompense'), texte: traduire('Ici, ta prochaine récompense, et les points qu’il te reste pour l’avoir.'), cible: 'recompense', sticker: 'medaille_or' },
  { titre: traduire('Tes semaines'), texte: traduire('Choisis combien de séances tu veux faire par semaine. Chaque semaine réussie rapporte des points. Tu en rates une ? Un joker te sauve. Blessé ou malade ? Mets ta semaine en pause.'), cible: 'semaines', sticker: 'objectif_semaine' },
  { titre: traduire('Sceaux et niveaux'), texte: traduire('Plus bas, tes sceaux à collectionner, et ton niveau dans chaque sport.'), cible: 'sceaux', sticker: 'ceinture_nouee' },
  { titre: traduire('À toi de jouer'), texte: traduire('C’est tout. Reviens chaque jour ouvrir ton coffre. Pour revoir cette visite, touche le point d’interrogation, en haut du Dojo.'), cible: 'aide', sticker: 'aide' },
];

const VOIX: number[] = [
  require('@/assets/sounds/dojo/dojo_fr_etape_01.mp3'),
  require('@/assets/sounds/dojo/dojo_fr_etape_02.mp3'),
  require('@/assets/sounds/dojo/dojo_fr_etape_03.mp3'),
  require('@/assets/sounds/dojo/dojo_fr_etape_04.mp3'),
  require('@/assets/sounds/dojo/dojo_fr_etape_05.mp3'),
  require('@/assets/sounds/dojo/dojo_fr_etape_06.mp3'),
  require('@/assets/sounds/dojo/dojo_fr_etape_07.mp3'),
  require('@/assets/sounds/dojo/dojo_fr_etape_08.mp3'),
];

const KEY = '@yoroi_visite_dojo_v1';
const VOIX_KEY = '@yoroi_visite_dojo_voix';

/** 'faite' (vue jusqu'au bout), 'plus_tard', ou null (jamais proposee) */
export async function etatVisiteDojo(): Promise<'faite' | 'plus_tard' | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'faite' || v === 'plus_tard' ? v : null;
  } catch {
    return 'faite';
  }
}

async function marquer(v: 'faite' | 'plus_tard') {
  try {
    await AsyncStorage.setItem(KEY, v);
  } catch {
    // sans importance
  }
}

type Props = {
  visible: boolean;
  /** fait defiler le Dojo jusqu'a la cible (ou elle tient avec une bulle de hBulle points) et renvoie sa place a l'ecran */
  mesurer: (c: CibleDojo, hBulle: number) => Promise<Rect | null>;
  onClose: (vue: boolean) => void;
};

export function VisiteDojo({ visible, mesurer, onClose }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [voix, setVoix] = useState(true);
  // 28 octobre 2026 : la bulle mesuree (elle se place avec sa vraie hauteur), le sticker selon le reglage Illustrations
  const [bulle, setBulle] = useState<{ i: number; h: number } | null>(null);
  const illus = useIllustrations();
  const voixRef = useRef(true);
  const player = useRef<AudioPlayer | null>(null);
  const run = useRef(0);
  // 18 octobre : la meme vitesse que la visite guidee (1x, 1,5x, 2x), gardee entre les lancements
  const [vitesse, vitesseSuivante] = useVitesseVoix();
  useEffect(() => {
    appliquerVitesse(player.current, vitesse);
  }, [vitesse]);

  const stop = useCallback(() => {
    const p = player.current;
    player.current = null;
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
    AsyncStorage.getItem(VOIX_KEY)
      .then((v) => {
        if (v === '0') {
          voixRef.current = false;
          setVoix(false);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (visible) setI(0);
    else stop();
  }, [visible, stop]);

  const parle = useCallback(
    (k: number) => {
      stop();
      if (!voixRef.current || !VOIX[k]) return;
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
      try {
        const p = createAudioPlayer(VOIX[k]);
        p.volume = 1;
        appliquerVitesse(p);
        p.addListener('playbackStatusUpdate', (st) => {
          if (!st.didJustFinish || player.current !== p) return;
          // l'etape d'accueil attend « C'est parti » ; la derniere attend « Terminer »
          if (k === 0 || k >= ETAPES_DOJO.length - 1) return;
          setTimeout(() => {
            if (player.current === p) setI(k + 1);
          }, 900);
        });
        p.play();
        player.current = p;
      } catch {
        // pas de voix : la visite marche sans
      }
    },
    [stop],
  );

  // deroule d'une etape : defiler, mesurer, parler
  useEffect(() => {
    if (!visible) return;
    const id = ++run.current;
    const e = ETAPES_DOJO[i];
    // la voix part tout de suite ; le cadre suit des que la carte est mesuree (l'ancien cadre reste en attendant)
    parle(i);
    if (!e?.cible) {
      setRect(null);
      return;
    }
    (async () => {
      const r = await mesurer(e.cible as CibleDojo, estimerBulle(e.titre, e.texte, Math.min(520, width - 32)));
      if (run.current !== id) return;
      setRect(r);
    })();
  }, [i, visible, mesurer, parle]); // eslint-disable-line react-hooks/exhaustive-deps

  const fermer = (vue: boolean) => {
    stop();
    void marquer(vue ? 'faite' : 'plus_tard');
    onClose(vue);
  };

  const basculerVoix = () => {
    tap();
    const v = !voix;
    voixRef.current = v;
    setVoix(v);
    AsyncStorage.setItem(VOIX_KEY, v ? '1' : '0').catch(() => undefined);
    if (!v) stop();
    else parle(i);
  };

  if (!visible) return null;
  const e = ETAPES_DOJO[i];
  const premiere = i === 0;
  const derniere = i === ETAPES_DOJO.length - 1;
  const voile = 'rgba(14,17,26,0.62)';
  // 28 octobre 2026 : meme geometrie que la visite guidee (components/yoroi/v2/tour/placement.ts) : le cadre epouse la
  // carte (ses coins plus la marge), la bulle se pose a cote avec sa vraie hauteur, jamais dessus, jamais hors de l'ecran
  const ecran: Ecran = { W: width, H: height, haut: insets.top + 8, bas: height - insets.bottom - 10, barre: hautDeBarre(height, insets.bottom) };
  const r = rect ? cadreDe({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, r: rect.r ?? 22 }, ecran, { marge: 8, surBarre: e.cible !== 'aide', plafond: insets.top * 0.5 }) : null;
  const bulleW = Math.min(520, width - 32);
  const mesuree = bulle && bulle.i === i ? bulle.h : null;
  const bulleH = mesuree ?? estimerBulle(e.titre, e.texte, bulleW);
  const bulleTop = placerBulle(r, bulleH, ecran).top;
  const rr = r?.r ?? 0;
  const trou = r
    ? `M0 0H${width}V${height}H0Z M${r.x + rr} ${r.y}H${r.x + r.w - rr}Q${r.x + r.w} ${r.y} ${r.x + r.w} ${r.y + rr}V${r.y + r.h - rr}Q${r.x + r.w} ${r.y + r.h} ${r.x + r.w - rr} ${r.y + r.h}H${r.x + rr}Q${r.x} ${r.y + r.h} ${r.x} ${r.y + r.h - rr}V${r.y + rr}Q${r.x} ${r.y} ${r.x + rr} ${r.y}Z`
    : `M0 0H${width}V${height}H0Z`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => fermer(false)} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Path d={trou} fill={voile} fillRule="evenodd" />
          {r ? (
            <>
              <SvgRect x={r.x - 3} y={r.y - 3} width={r.w + 6} height={r.h + 6} rx={rr + 3} fill="none" stroke={c.accent} strokeOpacity={0.35} strokeWidth={6} />
              <SvgRect x={r.x - 1.5} y={r.y - 1.5} width={r.w + 3} height={r.h + 3} rx={rr + 1.5} fill="none" stroke={c.accent} strokeWidth={3} />
            </>
          ) : null}
        </Svg>

        <View
          key={`b${i}`}
          onLayout={(ev) => {
            const h = Math.round(ev.nativeEvent.layout.height);
            if (h > 0 && (!bulle || bulle.i !== i || Math.abs(bulle.h - h) > 1)) setBulle({ i, h });
          }}
          style={{ position: 'absolute', width: bulleW, left: (width - bulleW) / 2, top: bulleTop, opacity: mesuree === null ? 0 : 1 }}
        >
        <Animated.View entering={FadeIn.duration(160)} style={{ backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border, paddingHorizontal: 18, paddingVertical: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 26, shadowOffset: { width: 0, height: 12 }, elevation: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* la partie en petites capitales colorees, et ou tu en es */}
            <Ink size={11.5} weight="black" color={c.accentText} numberOfLines={1} style={{ letterSpacing: 1.3, flexShrink: 1 }}>{traduire('Ton Dojo').toUpperCase()}</Ink>
            <Ink size={12.5} weight="extraBold" color={c.textSecondary} style={{ flex: 1 }}>{traduire("{0} sur {1}", i + 1, ETAPES_DOJO.length)}</Ink>
            <Pressable onPress={basculerVoix} accessibilityRole="button" accessibilityLabel={voix ? traduire('Couper la voix') : traduire('Remettre la voix')} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name={voix ? 'volume-high' : 'volume-off'} size={18} color={c.accentText} />
            </Pressable>
            {voix ? (
              <Pressable onPress={vitesseSuivante} accessibilityRole="button" accessibilityLabel={traduire("Vitesse de la voix : {0}. Changer", libelleVitesse(vitesse))} hitSlop={8} style={{ minWidth: 44, height: 34, borderRadius: 17, paddingHorizontal: 9, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={13} weight="extraBold" color={c.accentText}>{libelleVitesse(vitesse)}</Ink>
              </Pressable>
            ) : null}
            {!premiere && !derniere ? (
              // Passer, bien visible : une vraie pilule
              <Pressable onPress={() => fermer(false)} accessibilityRole="button" accessibilityLabel={traduire("Quitter la visite")} hitSlop={8} style={({ pressed }) => ({ height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: c.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.surface })}>
                <Ink size={14} weight="black" color={c.ink}>{traduire("Passer")}</Ink>
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={illus.img(e.sticker)} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Ink size={19} weight="black" tight style={{ flex: 1 }} accessibilityRole="header">{traduire(e.titre)}</Ink>
          </View>
          <Ink size={15} weight="medium" color={c.textSecondary} style={{ lineHeight: 21 }}>{traduire(e.texte)}</Ink>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
            {premiere ? (
              <Pressable onPress={() => fermer(false)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
                <Ink size={15} weight="extraBold" color={c.textSecondary}>{traduire("Plus tard")}</Ink>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                tap();
                if (derniere) fermer(true);
                else setI(i + 1);
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}
            >
              <Ink size={15.5} weight="black" color={c.onPrimary}>{premiere ? traduire('C’est parti') : derniere ? traduire('Terminer') : traduire('Suivant')}</Ink>
            </Pressable>
          </View>
          {premiere ? <Ink size={12} color={c.textMuted} style={{ textAlign: 'center' }}>{traduire("Tu pourras la revoir avec le bouton « ? » en haut du Dojo.")}</Ink> : null}
        </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
