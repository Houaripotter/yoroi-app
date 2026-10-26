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
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
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

export type CibleDojo = 'hero' | 'aujourdhui' | 'recompense' | 'semaines' | 'sceaux' | 'aide';
export type Rect = { x: number; y: number; w: number; h: number };

type Etape = { titre: string; texte: string; cible?: CibleDojo };

export const ETAPES_DOJO: Etape[] = [
  { titre: traduire('Bienvenue dans ton Dojo'), texte: traduire('Bienvenue dans ton Dojo. Ici, chaque effort te rapporte des points. Je te montre tout en trente secondes.') },
  { titre: traduire('Ton rang'), texte: traduire('Voici ton personnage et ton rang. Plus tu gagnes de points, plus tu montes en rang, et plus tu débloques de récompenses.'), cible: 'hero' },
  { titre: traduire('Ta série'), texte: traduire('Chaque jour, fais un petit geste : une séance, une pesée, ou juste un verre d’eau. Ta flamme compte les jours d’affilée.'), cible: 'aujourdhui' },
  { titre: traduire('Ton coffre du jour'), texte: traduire('Ton geste fait, ouvre ton coffre du jour. Plus ta série est longue, plus il rapporte. Tous les sept jours, c’est le grand coffre.'), cible: 'aujourdhui' },
  { titre: traduire('Ta prochaine récompense'), texte: traduire('Ici, ta prochaine récompense, et les points qu’il te reste pour l’avoir.'), cible: 'recompense' },
  { titre: traduire('Tes semaines'), texte: traduire('Choisis combien de séances tu veux faire par semaine. Chaque semaine réussie rapporte des points. Tu en rates une ? Un joker te sauve. Blessé ou malade ? Mets ta semaine en pause.'), cible: 'semaines' },
  { titre: traduire('Sceaux et niveaux'), texte: traduire('Plus bas, tes sceaux à collectionner, et ton niveau dans chaque sport.'), cible: 'sceaux' },
  { titre: traduire('À toi de jouer'), texte: traduire('C’est tout. Reviens chaque jour ouvrir ton coffre. Pour revoir cette visite, touche le point d’interrogation, en haut du Dojo.'), cible: 'aide' },
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
  /** fait defiler le Dojo jusqu'a la cible et renvoie sa place a l'ecran */
  mesurer: (c: CibleDojo) => Promise<Rect | null>;
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
      const r = await mesurer(e.cible as CibleDojo);
      if (run.current !== id) return;
      setRect(r);
    })();
  }, [i, visible, mesurer, parle]);

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
  const voile = 'rgba(10,12,22,0.72)';
  const pad = 8;
  const r = rect ? { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 } : null;
  // la bulle se pose sous la carte si elle a la place, sinon au-dessus, sinon en bas
  const bulleH = 210;
  let bulleTop: number | undefined;
  let bulleBottom: number | undefined;
  if (!r) bulleTop = Math.max(insets.top + 60, height / 2 - bulleH / 2);
  else if (r.y + r.h + bulleH + 16 < height - insets.bottom) bulleTop = r.y + r.h + 14;
  else if (r.y - bulleH - 14 > insets.top) bulleTop = r.y - bulleH - 14;
  else bulleBottom = insets.bottom + 20;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => fermer(false)} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {r ? (
          <>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, r.y), backgroundColor: voile }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: r.y + r.h, bottom: 0, backgroundColor: voile }} />
            <View style={{ position: 'absolute', left: 0, width: Math.max(0, r.x), top: r.y, height: r.h, backgroundColor: voile }} />
            <View style={{ position: 'absolute', left: r.x + r.w, right: 0, top: r.y, height: r.h, backgroundColor: voile }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 26, borderWidth: 3, borderColor: '#F2C14E' }} />
          </>
        ) : (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: voile }} />
        )}

        <Animated.View key={`b${i}`} entering={FadeIn.duration(160)} style={{ position: 'absolute', left: 16, right: 16, top: bulleTop, bottom: bulleBottom, maxWidth: Math.min(520, width - 32), alignSelf: 'center', backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ink size={12} weight="extraBold" color={c.accent} style={{ flex: 1 }}>{traduire("{0} sur {1}", i + 1, ETAPES_DOJO.length)}</Ink>
            <Pressable onPress={basculerVoix} accessibilityRole="button" accessibilityLabel={voix ? traduire('Couper la voix') : traduire('Remettre la voix')} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name={voix ? 'volume-high' : 'volume-off'} size={20} color={c.accent} />
            </Pressable>
            {voix ? (
              <Pressable onPress={vitesseSuivante} accessibilityRole="button" accessibilityLabel={traduire("Vitesse de la voix : {0}. Changer", libelleVitesse(vitesse))} hitSlop={8} style={{ minWidth: 46, height: 40, borderRadius: 20, paddingHorizontal: 10, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={13} weight="extraBold" color={c.accent}>{libelleVitesse(vitesse)}</Ink>
              </Pressable>
            ) : null}
            {!premiere && !derniere ? (
              <Pressable onPress={() => fermer(false)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 }}>
                <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Passer")}</Ink>
              </Pressable>
            ) : null}
          </View>
          <Ink size={20} weight="black" tight>{traduire(e.titre)}</Ink>
          <Ink size={15} color={c.textSecondary} style={{ lineHeight: 21 }}>{traduire(e.texte)}</Ink>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {premiere ? (
              <Pressable onPress={() => fermer(false)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
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
              style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}
            >
              <Ink size={15} weight="black" color={c.onAccent}>{premiere ? traduire('C’est parti') : derniere ? traduire('Terminer') : traduire('Suivant')}</Ink>
            </Pressable>
          </View>
          {premiere ? <Ink size={12} color={c.textMuted} style={{ textAlign: 'center' }}>{traduire("Tu pourras la revoir avec le bouton « ? » en haut du Dojo.")}</Ink> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
