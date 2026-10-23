/**
 * Decorations de saison de l'accueil, version 5 (18 octobre 2026) : les dessins et les animations de l'app INRO
 * de Houari, reprises telles quelles (./inro/), et deux stickers pour ce qu'INRO n'a pas (le kadomatsu et
 * l'etoile filante, dans assets/saisons/noel/). AUCUN espace ajoute : tout est en superposition, en position
 * absolue, dans les espaces vides ; la mise en page de l'accueil est exactement celle d'avant les saisons.
 * Les emplacements sont ceux de la v4 (lib/v2/saisons/geometrie.ts et vols.ts), inchanges.
 *
 * 1. DecorScene, sur la scene (au premier plan, jamais touchable) :
 *    Halloween : la toile d'INRO dans le coin gauche sous la lanterne et la cloche, son araignee qui descend,
 *                attend et remonte ; un vol de trois chauves souris d'INRO (ailes qui battent, vol en vagues)
 *                puis le fantome d'INRO, en alternance toutes les 15 secondes, d'un bord a l'autre.
 *    Noel      : la neige qui tombe ; le traineau d'INRO (Pere Noel, trois rennes au galop) puis l'etoile filante,
 *                en alternance, chacun toutes les 30 secondes, d'un bord a l'autre du ciel.
 *
 * 2. DecorOutils, dans le bloc de tes outils, DERRIERE eux, au DEBUT du trait de gauche de la citation (retours
 *    de Houari sur iPhone 15 Pro Max : a droite, « Records » et le bord de l'ecran ne laissaient pas la place) :
 *    Halloween : la tombe d'INRO et son chat noir assis dessus (40 de haut en tout), le squelette d'INRO (33) qui
 *                sort du sol derriere la tombe 3 secondes apres l'ouverture puis toutes les 15 secondes, et le
 *                zombie d'INRO (23) qui marche sur le trait, la tete sous les libelles, des 6 secondes.
 *    Noel      : le kadomatsu (sticker, 40 de haut), deux cadeaux d'INRO, et le bonhomme de neige d'INRO qui sort
 *                de derriere le kadomatsu au meme rythme que le squelette.
 *
 * 3. DecorCarte, sur la carte « Ton poids » (au premier plan) :
 *    Halloween : la citrouille d'INRO (48 de large) a gauche et a droite du grand chiffre (le visage luit), une toile d'INRO dans
 *                chaque coin du haut et son araignee qui descend le long du bord.
 *    Noel      : le sapin d'INRO (48 de haut) de chaque cote du chiffre (l'etoile scintille), la guirlande d'ampoules d'INRO.
 *    Seules les citrouilles et les sapins captent le toucher : une gerbe de bonbons d'INRO, ou de flocons,
 *    d'etoiles et de cadeaux d'INRO, jaillit et retombe, avec une vibration legere.
 *
 * Regles : une horloge par calque sur le fil d'affichage (30 images par seconde), arretee hors ecran (defilement),
 * ecran pas au premier plan, app en arriere plan ; rien pendant la visite guidee. « Réduire les animations » :
 * seuls les decors fixes restent (toiles, araignees au repos, citrouilles, sapins, guirlande allumee, tombe et chat,
 * kadomatsu et cadeaux), immobiles, et un appui pose quelques bonbons sans mouvement.
 * Mode sombre : le chat noir prend le liseré clair de l'araignee d'INRO ; en clair, le squelette et le bonhomme
 * de neige prennent un trait discret, sinon le blanc disparait sur le papier.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useFrameCallback, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Flocons } from '@/components/yoroi/v2/scenes/effets';
import type { EffetFlocons } from '@/lib/v2/scenes/animations';
import { useEcranVisible, useReduireAnimations } from '@/components/yoroi/v2/accueil/SceneAnimee';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { paletteSombre } from '@/components/yoroi/livePalette';
import type { SaisonId } from '@/lib/v2/saisons/calendrier';
import {
  ARAIGNEE_CARTE,
  BAS_CALQUE,
  DECOR_CARTE,
  GUIRLANDE_CARTE,
  HAUT_CALQUE,
  TOILE_CARTE,
  ZOMBIE_V5,
  boitesCarte,
  decorGaucheHalloween,
  decorGaucheNoel,
  type Boite,
} from '@/lib/v2/saisons/geometrie';
import {
  BATTEMENT_S,
  DEPART_CHAUVES_S,
  DEPART_ETOILE_S,
  DEPART_FANTOME_S,
  DEPART_TRAINEAU_S,
  DUREE_CHAUVES_S,
  DUREE_ETOILE_S,
  DUREE_FANTOME_S,
  DUREE_TRAINEAU_S,
  PERIODE_NOEL_S,
  VOL_CHAUVES,
  avancementPassage,
  positionVol,
  zoneDeVol,
  type ZoneVol,
} from '@/lib/v2/saisons/vols';
import {
  AraigneeInro,
  BonbonInro,
  CHAT_INRO,
  CHAUVE,
  COULEURS_BONBONS,
  ChatInro,
  ChauveSourisInro,
  CitrouilleInro,
  FANTOME,
  FantomeInro,
  SQUELETTE_INRO,
  SqueletteInro,
  TombeInro,
  ToileInro,
  ZOMBIE_INRO,
  ZombieInro,
  battementAile,
} from './inro/halloween';
import {
  AmpouleInro,
  BONHOMME_INRO,
  BonhommeInro,
  CADEAUX_INRO,
  COULEURS_AMPOULES,
  CadeauInro,
  EtoileInro,
  FIL_GUIRLANDE,
  FloconInro,
  SapinInro,
  TraineauInro,
} from './inro/noel';
import { Echelle } from './inro/echelle';
import { ampouleAllumee, vaEtVient } from './inro/mouvements';
import { traduire } from '@/lib/i18n/tr';

/** Les deux stickers de ce qu'INRO n'a pas (generes, detoures, 18 octobre 2026) */
const KADOMATSU = require('@/assets/saisons/noel/kadomatsu.webp');
const ETOILE_FILANTE = require('@/assets/saisons/noel/etoile_filante.webp');
/** Proportions de l'etoile filante (largeur / hauteur), la tete a droite */
export const RAPPORT_ETOILE_FILANTE = 3.35;

const PAS = 1 / 30;

/** L'horloge d'un calque, en secondes ; avance seulement quand joue est vrai */
function useHorloge(joue: boolean) {
  const temps = useSharedValue(0);
  const reste = useSharedValue(0);
  const horloge = useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    reste.value += dt;
    if (reste.value >= PAS) {
      temps.value += reste.value;
      reste.value = 0;
    }
  }, false);
  useEffect(() => {
    horloge.setActive(joue);
    return () => horloge.setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joue]);
  return temps;
}

/** Vrai quand le defilement depasse le seuil (calcule sur le fil d'affichage, un seul re-rendu par passage) */
function useAuDela(defile: SharedValue<number>, seuil: number): boolean {
  const [au, setAu] = useState(false);
  useAnimatedReaction(
    () => defile.value > seuil,
    (v, avant) => {
      if (v !== avant) runOnJS(setAu)(v);
    },
    [seuil],
  );
  return au;
}

/** Ce qui est commun aux trois calques : pret, anime, l'horloge */
function useCalque(saison: SaisonId | null, defile: SharedValue<number> | undefined, seuil: number) {
  const reduire = useReduireAnimations();
  const { visible } = useEcranVisible();
  const visite = useVisiteEnCours();
  const zero = useSharedValue(0);
  const horsEcran = useAuDela(defile ?? zero, seuil);
  const pret = !!saison && !visite;
  const temps = useHorloge(pret && !reduire && visible && !horsEcran);
  return { pret, reduire, temps, defile: defile ?? zero };
}

const cache = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

// ── Passages dans le ciel ───────────────────────────────────────────────────

/** Les chauves souris d'INRO : 64 x 40 a l'echelle 1 ; la plus grande du vol de YOROI (30) passe a 0,8 */
export const ECHELLE_CHAUVES = 0.8 / 30;
/** Le vol en vagues d'INRO, sur 22 points de haut */
const VAGUE_CHAUVES = 22;

function ChauveSouris({ zone, s, k, retard, temps }: { zone: ZoneVol; s: number; k: number; retard: number; temps: SharedValue<number> }) {
  const echelle = s * ECHELLE_CHAUVES;
  const style = useAnimatedStyle(() => {
    const q = avancementPassage(temps.value, DEPART_CHAUVES_S + retard, BATTEMENT_S, DUREE_CHAUVES_S);
    const p = q ?? 0;
    const w = CHAUVE.w * echelle;
    const pos = positionVol(p, zone, w, k);
    // Comme dans INRO : vol en vagues, elle penche dans le sens de la pente et grossit en approchant.
    const vague = Math.sin(p * Math.PI * 2.5);
    const pente = Math.cos(p * Math.PI * 2.5);
    const f = battementAile(temps.value, retard);
    return {
      opacity: q === null ? 0 : interpolate(p, [0, 0.06, 0.94, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: pos.x - (CHAUVE.w - w) / 2 },
        { translateY: pos.y - (CHAUVE.h - CHAUVE.h * echelle) / 2 + (VAGUE_CHAUVES / 2) * (1 + vague) - f * 3 * echelle },
        { rotateZ: `${pente * 10}deg` },
        { scale: echelle * interpolate(p, [0, 0.5, 1], [0.85, 1.1, 0.9]) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: CHAUVE.w, height: CHAUVE.h }, style]}>
      <ChauveSourisInro temps={temps} decalage={retard} />
    </Animated.View>
  );
}

function Fantome({ zone, temps }: { zone: ZoneVol; temps: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const q = avancementPassage(temps.value, DEPART_FANTOME_S, BATTEMENT_S, DUREE_FANTOME_S);
    const p = positionVol(q ?? 0, zone, FANTOME.w, 0.35);
    // Comme dans INRO : il flotte, monte et descend, se dandine et palpite doucement.
    const bob = vaEtVient(temps.value, 0.9);
    const o = q === null ? 0 : Math.min(1, (q ?? 0) * 8, (1 - (q ?? 0)) * 8) * (0.75 + 0.25 * bob);
    return { opacity: o, transform: [{ translateX: p.x }, { translateY: p.y + 8 - 8 * bob }, { rotate: `${-6 + 12 * bob}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: FANTOME.w, height: FANTOME.h }, style]}>
      <FantomeInro />
    </Animated.View>
  );
}

/** Le traineau d'INRO, a la taille qu'il a sur la carte du planning d'INRO */
const TW = 120;
const TH = (TW * 40) / 150;
/** Il monte en traversant, comme dans INRO */
const MONTEE_TRAINEAU = 60;

function Traineau({ zone, temps }: { zone: ZoneVol; temps: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const q = avancementPassage(temps.value, DEPART_TRAINEAU_S, PERIODE_NOEL_S, DUREE_TRAINEAU_S);
    const p = q ?? 0;
    const pos = positionVol(p, zone, TW, 0.2);
    const y = pos.y + MONTEE_TRAINEAU * (1 - p) + Math.sin(p * Math.PI * 3) * 8;
    return {
      opacity: q === null ? 0 : interpolate(p, [0, 0.05, 0.95, 1], [0, 1, 1, 0]),
      transform: [{ translateX: pos.x }, { translateY: y }, { rotateZ: '-6deg' }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: TW, height: TH }, style]}>
      <TraineauInro w={TW} temps={temps} />
    </Animated.View>
  );
}

const EF = 84;
const EFH = EF / RAPPORT_ETOILE_FILANTE;

function EtoileFilante({ largeur, zone, temps }: { largeur: number; zone: ZoneVol; temps: SharedValue<number> }) {
  const x0 = largeur * 0.12;
  const x1 = largeur * 0.78;
  const y0 = zone.yMin - 18;
  const y1 = zone.yMin + 34;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const style = useAnimatedStyle(() => {
    const q = avancementPassage(temps.value, DEPART_ETOILE_S, PERIODE_NOEL_S, DUREE_ETOILE_S);
    const p = q ?? 0;
    const o = q === null ? 0 : Math.min(1, p * 6, (1 - p) * 3);
    return { opacity: o, transform: [{ translateX: x0 + p * (x1 - x0) - EF }, { translateY: y0 + p * (y1 - y0) - EFH / 2 }, { rotate: `${angle}rad` }, { scale: 0.85 + 0.15 * Math.sin(p * Math.PI) }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: EF, height: EFH, transformOrigin: 'right' }, style]}>
      <Image source={ETOILE_FILANTE} style={{ width: EF, height: EFH }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </Animated.View>
  );
}

// ── Calque 1 : la scene ─────────────────────────────────────────────────────

export type DecorSceneProps = {
  saison: SaisonId | null;
  largeur: number;
  hauteur: number;
  /** haut de la zone utile (sous la barre d'etat) */
  haut: number;
  /** defilement de l'accueil : le decor suit et s'efface ; absent dans un apercu */
  scrollY?: SharedValue<number>;
};

/** La toile de la scene : dans le coin gauche, juste sous la lanterne et la cloche, au dessus de ta photo */
export function toileScene(hauteur: number, haut: number) {
  const y = haut + 40;
  const taille = 46;
  const fil = y + 6;
  const bas = Math.min(haut + 92, hauteur - 92 - 16);
  return { y, taille, araignee: { x: 13, fil, haut: Math.min(bas, y + 14), bas, taille: 16 } };
}

/** L'araignee d'INRO sur la scene : un peu plus grande que la place de la v4, remontee d'autant */
const ARAIGNEE_SCENE = 18;

export function DecorScene({ saison, largeur, hauteur, haut, scrollY }: DecorSceneProps) {
  const { pret, reduire, temps, defile } = useCalque(saison, scrollY, hauteur * 0.5);
  const style = useAnimatedStyle(() => {
    const y = defile.value;
    return { opacity: interpolate(y, [0, hauteur * 0.45], [1, 0], Extrapolation.CLAMP), transform: [{ translateY: -Math.max(0, y) }] };
  });
  const hChauve = CHAUVE.h * 30 * ECHELLE_CHAUVES + VAGUE_CHAUVES;
  const zoneChauves = useMemo(() => zoneDeVol({ largeur, hauteur, haut, hSprite: hChauve }), [largeur, hauteur, haut, hChauve]);
  const zoneFantome = useMemo(() => zoneDeVol({ largeur, hauteur, haut, hSprite: FANTOME.h + 8 }), [largeur, hauteur, haut]);
  const zoneTraineau = useMemo(() => zoneDeVol({ largeur, hauteur, haut, hSprite: TH + MONTEE_TRAINEAU }), [largeur, hauteur, haut]);
  const neige: EffetFlocons = useMemo(
    () => ({ type: 'neige', zone: { x: 0, y: 0, l: 100, h: 100 }, nombre: 26, duree: 11, taille: [2, 4.5], derive: 4, opacite: 0.85, couleur: '#F7FAFF' }),
    [],
  );
  if (!pret || largeur <= 0 || hauteur <= 0) return null;
  // Noel avec « Réduire les animations » : rien de fixe sur la scene
  if (saison === 'noel' && reduire) return null;
  const t = toileScene(hauteur, haut);
  const a = t.araignee;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: largeur, height: hauteur, overflow: 'hidden' }, style]} {...cache}>
      {saison === 'halloween' ? (
        <>
          <View style={{ position: 'absolute', left: 0, top: t.y }}>
            <ToileInro taille={t.taille} couleur="rgba(232,239,245,0.6)" />
          </View>
          <AraigneeInro
            x={a.x}
            fil={a.fil}
            haut={a.haut - (ARAIGNEE_SCENE - a.taille)}
            bas={a.bas - (ARAIGNEE_SCENE - a.taille)}
            taille={ARAIGNEE_SCENE}
            duree={2.6}
            pause={1.8}
            decalage={0}
            temps={temps}
            soie="rgba(232,239,245,0.6)"
          />
          {!reduire ? (
            <>
              {VOL_CHAUVES.map((b, i) => (
                <ChauveSouris key={i} zone={zoneChauves} s={b.s} k={b.k} retard={b.retard} temps={temps} />
              ))}
              <Fantome zone={zoneFantome} temps={temps} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Flocons effet={neige} temps={temps} cadre={{ w: largeur, h: hauteur }} graine="saison-noel" />
          <Traineau zone={zoneTraineau} temps={temps} />
          <EtoileFilante largeur={largeur} zone={zoneTraineau} temps={temps} />
        </>
      )}
    </Animated.View>
  );
}

// ── Calque 2 : derriere tes outils, au debut du trait de gauche de la citation ─

/**
 * v5 (Houari sur iPhone 15 Pro Max) : au bout de droite, la tombe et le chat touchaient « Records » et le bord.
 * Tout est maintenant au debut du trait de gauche (lib/v2/saisons/geometrie.ts, decorGaucheHalloween et
 * decorGaucheNoel), en entier dans l'ecran, sans toucher le premier rond ni « Chrono ».
 */

/** Le zombie d'INRO a 23 de haut : il marche SUR le trait, la tete sous les libelles de tes outils */
const ECHELLE_ZOMBIE = ZOMBIE_V5.h / ZOMBIE_INRO.h;
const ZW = ZOMBIE_V5.w;
const ZH = ZOMBIE_V5.h;
const PERIODE_ZOMBIE = 40;
/** Il passe une premiere fois 6 secondes apres l'ouverture */
const DEPART_ZOMBIE = 6;
const DUREE_ZOMBIE = 24;

function Zombie({ largeur, temps }: { largeur: number; temps: SharedValue<number> }) {
  const marche = useAnimatedStyle(() => {
    const q = avancementPassage(temps.value, DEPART_ZOMBIE, PERIODE_ZOMBIE, DUREE_ZOMBIE);
    const x = -ZW + (q ?? 0) * (largeur + 2 * ZW);
    return { opacity: q === null ? 0 : 1, transform: [{ translateX: x }, { translateY: ZOMBIE_V5.pieds - ZH }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: ZW, height: ZH }, marche]}>
      <Echelle w={ZOMBIE_INRO.w} h={ZOMBIE_INRO.h} k={ECHELLE_ZOMBIE}>
        <ZombieInro temps={temps} />
      </Echelle>
    </Animated.View>
  );
}

/** Le squelette ou le bonhomme sort 3 secondes apres l'ouverture, puis toutes les 15 secondes */
const PERIODE_COUCOU = 15;
const DEPART_COUCOU = 3;
const DUREE_COUCOU = 4.2;

/**
 * Il sort du sol derriere la tombe (ou le kadomatsu), monte jusqu'a sa place, fait coucou de la main, puis
 * redescend. La fenetre coupe tout ce qui est sous le trait : il sort vraiment du sol.
 */
function Coucou({ fenetre, boite, temps, qui }: { fenetre: Boite; boite: Boite; temps: SharedValue<number>; qui: 'squelette' | 'bonhomme' }) {
  const cache = fenetre.y + fenetre.h - boite.y;
  const monte = useAnimatedStyle(() => {
    const q = avancementPassage(temps.value, DEPART_COUCOU, PERIODE_COUCOU, DUREE_COUCOU);
    const s = q === null ? 0 : q * DUREE_COUCOU;
    const sorti = s < 0.7 ? s / 0.7 : s < 3.3 ? 1 : Math.max(0, 1 - (s - 3.3) / 0.8);
    return { transform: [{ translateY: (1 - sorti) * cache + (sorti > 0.99 ? 1.2 * Math.sin(temps.value * 3) : 0) }] };
  });
  const clair = !paletteSombre();
  const modele = qui === 'squelette' ? SQUELETTE_INRO : BONHOMME_INRO;
  const k = boite.h / modele.h;
  return (
    <View style={{ position: 'absolute', left: fenetre.x, top: fenetre.y, width: fenetre.w, height: fenetre.h, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', left: boite.x - fenetre.x, top: boite.y - fenetre.y, width: boite.w, height: boite.h }, monte]}>
        <Echelle w={modele.w} h={modele.h} k={k}>
          {qui === 'squelette' ? (
            <SqueletteInro temps={temps} contour={clair ? 'rgba(29,32,41,0.55)' : undefined} />
          ) : (
            <BonhommeInro temps={temps} contour={clair ? 'rgba(42,18,32,0.35)' : undefined} />
          )}
        </Echelle>
      </Animated.View>
    </View>
  );
}

const calque = { position: 'absolute' as const, left: 0, bottom: -BAS_CALQUE, height: HAUT_CALQUE };

export type DecorOutilsProps = {
  saison: SaisonId | null;
  /** largeur de l'ecran (le bloc de tes outils va d'un bord a l'autre) */
  largeur: number;
  scrollY?: SharedValue<number>;
  /** defilement au dela duquel la ligne est sortie de l'ecran */
  seuil?: number;
};

/** Derriere tes outils : tombe, chat et squelette, ou kadomatsu, cadeaux et bonhomme de neige ; le zombie */
export function DecorOutils({ saison, largeur, scrollY, seuil = 100000 }: DecorOutilsProps) {
  const { pret, reduire, temps } = useCalque(saison, scrollY, seuil);
  if (!pret || largeur <= 0) return null;
  if (saison === 'halloween') {
    const d = decorGaucheHalloween();
    return (
      <View pointerEvents="none" style={[calque, { width: largeur }]} {...cache}>
        {/* le squelette d'abord : il sort de derriere la tombe */}
        {!reduire ? <Coucou fenetre={d.fenetre} boite={d.squelette} temps={temps} qui="squelette" /> : null}
        <View style={{ position: 'absolute', left: d.tombe.x, top: d.tombe.y }}>
          <TombeInro w={d.tombe.w} h={d.tombe.h} />
        </View>
        <View style={{ position: 'absolute', left: d.chat.x, top: d.chat.y }}>
          <Echelle w={CHAT_INRO.w} h={CHAT_INRO.h} k={d.chat.h / CHAT_INRO.h}>
            <ChatInro temps={temps} halo={paletteSombre() ? 'rgba(236,234,227,0.45)' : undefined} />
          </Echelle>
        </View>
        {/* le zombie en dernier : il passe devant la tombe et le chat */}
        {!reduire ? <Zombie largeur={largeur} temps={temps} /> : null}
      </View>
    );
  }
  const d = decorGaucheNoel();
  return (
    <View pointerEvents="none" style={[calque, { width: largeur }]} {...cache}>
      {!reduire ? <Coucou fenetre={d.fenetre} boite={d.bonhomme} temps={temps} qui="bonhomme" /> : null}
      <Image
        source={KADOMATSU}
        style={{ position: 'absolute', left: d.kadomatsu.x, top: d.kadomatsu.y, width: d.kadomatsu.w, height: d.kadomatsu.h }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={{ position: 'absolute', left: d.grand.x, top: d.grand.y }}>
        <CadeauInro taille={d.grand.w} {...CADEAUX_INRO[1]} />
      </View>
      <View style={{ position: 'absolute', left: d.petit.x, top: d.petit.y }}>
        <CadeauInro taille={d.petit.w} {...CADEAUX_INRO[2]} />
      </View>
    </View>
  );
}

// ── Gerbes : les bonbons d'INRO, ses flocons, ses etoiles et ses cadeaux ────

type Sorte = 'bonbon' | 'flocon' | 'etoile' | 'cadeau';
const DUREE_GERBE = 1.6;
const GRAVITE = 950;

type Grain = { sorte: Sorte; couleur: string; cadeau: number; vx: number; vy: number; rot0: number; w: number; retard: number };

function tirerGerbe(saison: SaisonId, n: number): Grain[] {
  const sortes: Sorte[] = saison === 'halloween' ? ['bonbon'] : ['flocon', 'etoile', 'cadeau', 'flocon'];
  return Array.from({ length: n }, (_, i) => {
    const angle = (-90 + (Math.random() * 120 - 60)) * (Math.PI / 180);
    const v = 300 + Math.random() * 190;
    return {
      sorte: sortes[i % sortes.length],
      couleur: saison === 'halloween' ? COULEURS_BONBONS[(i + Math.floor(Math.random() * 6)) % COULEURS_BONBONS.length] : i % 4 === 0 ? '#FACC15' : '#F59E0B',
      cadeau: i % CADEAUX_INRO.length,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      rot0: Math.random() * 360,
      w: (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 420),
      retard: Math.random() * 0.12,
    };
  });
}

function DessinGrain({ g }: { g: Pick<Grain, 'sorte' | 'couleur' | 'cadeau'> }) {
  switch (g.sorte) {
    case 'flocon':
      return <FloconInro taille={16} />;
    case 'etoile':
      return <EtoileInro taille={16} couleur={g.couleur} />;
    case 'cadeau':
      return <CadeauInro taille={14} {...CADEAUX_INRO[g.cadeau]} />;
    default:
      return <BonbonInro couleur={g.couleur} />;
  }
}

function GrainVolant({ g, p, x0, y0 }: { g: Grain; p: SharedValue<number>; x0: number; y0: number }) {
  const style = useAnimatedStyle(() => {
    const t = p.value * DUREE_GERBE - g.retard;
    if (t <= 0) return { opacity: 0, transform: [{ translateX: x0 }, { translateY: y0 }, { rotate: '0deg' }] };
    const fin = DUREE_GERBE - 0.35;
    const o = t < fin ? 1 : Math.max(0, 1 - (t - fin) / 0.3);
    return { opacity: o, transform: [{ translateX: x0 + g.vx * t }, { translateY: y0 + g.vy * t + 0.5 * GRAVITE * t * t }, { rotate: `${g.rot0 + g.w * t}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: -11, top: -11 }, style]}>
      <DessinGrain g={g} />
    </Animated.View>
  );
}

/** Avec « Réduire les animations » : quelques grains poses, sans mouvement */
const POSES: { dx: number; dy: number; rot: number }[] = [
  { dx: -20, dy: -20, rot: -20 },
  { dx: 0, dy: -34, rot: 15 },
  { dx: 20, dy: -22, rot: 35 },
  { dx: -10, dy: -46, rot: 10 },
  { dx: 14, dy: -48, rot: -30 },
];

function useGerbe(saison: SaisonId | null, reduire: boolean) {
  const p = useSharedValue(1);
  const [gerbe, setGerbe] = useState<{ id: number; x: number; y: number; grains: Grain[]; fixe: boolean } | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);
  const lancer = (x: number, y: number) => {
    if (!saison) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    if (minuteur.current) clearTimeout(minuteur.current);
    const grains = tirerGerbe(saison, reduire ? POSES.length : 14);
    setGerbe((g) => ({ id: (g?.id ?? 0) + 1, x, y, grains, fixe: reduire }));
    if (!reduire) {
      p.value = 0;
      p.value = withTiming(1, { duration: DUREE_GERBE * 1000, easing: Easing.linear });
    }
    minuteur.current = setTimeout(() => setGerbe(null), reduire ? 1400 : DUREE_GERBE * 1000 + 100);
  };
  const rendu = gerbe
    ? gerbe.fixe
      ? gerbe.grains.map((g, i) => (
          <View key={`${gerbe.id}-${i}`} style={{ position: 'absolute', left: gerbe.x + POSES[i].dx - 11, top: gerbe.y + POSES[i].dy - 11, transform: [{ rotate: `${POSES[i].rot}deg` }] }}>
            <DessinGrain g={g} />
          </View>
        ))
      : gerbe.grains.map((g, i) => <GrainVolant key={`${gerbe.id}-${i}`} g={g} p={p} x0={gerbe.x} y0={gerbe.y} />)
    : null;
  return { lancer, rendu };
}

// ── Calque 3 : la carte « Ton poids » ───────────────────────────────────────

/** L'ampoule d'INRO tient sous le bas de la guirlande (GUIRLANDE_CARTE.bas) */
const H_AMPOULE = GUIRLANDE_CARTE.bas - GUIRLANDE_CARTE.fil;

function GuirlandeAmpoules({ largeur, temps }: { largeur: number; temps: SharedValue<number> }) {
  const { debut, fil, pas } = GUIRLANDE_CARTE;
  const n = Math.max(2, Math.floor((largeur - 2 * debut) / pas) + 1);
  const ecart = (largeur - 2 * debut) / (n - 1);
  const xs = Array.from({ length: n }, (_, i) => debut + i * ecart);
  let d = `M${xs[0]} ${fil}`;
  for (let i = 1; i < n; i++) d += ` Q${(xs[i - 1] + xs[i]) / 2} ${fil + 5} ${xs[i]} ${fil}`;
  return (
    <>
      <Svg width={largeur} height={8} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Path d={d} stroke={FIL_GUIRLANDE.couleur} strokeWidth={FIL_GUIRLANDE.epaisseur} fill="none" />
      </Svg>
      {xs.map((x, i) => (
        <AmpouleClignote key={i} x={x} y={fil} i={i} temps={temps} />
      ))}
    </>
  );
}

function AmpouleClignote({ x, y, i, temps }: { x: number; y: number; i: number; temps: SharedValue<number> }) {
  // Comme dans INRO : chacune a son rythme ; au repos, toutes allumees
  const style = useAnimatedStyle(() => ({ opacity: temps.value > 0 ? ampouleAllumee(temps.value, ((i * 170) % 900) / 1000) : 1 }));
  const couleur = COULEURS_AMPOULES[i % COULEURS_AMPOULES.length];
  return (
    <Animated.View style={[{ position: 'absolute', left: x - (H_AMPOULE * 12) / 36, top: y }, style]}>
      <AmpouleInro couleur={couleur} h={H_AMPOULE} />
    </Animated.View>
  );
}

export type DecorCarteProps = {
  saison: SaisonId | null;
  /** largeur de la carte « Ton poids » */
  largeur: number;
  scrollY?: SharedValue<number>;
  /** defilement au dela duquel la carte est sortie de l'ecran */
  seuil?: number;
};

/**
 * Sur la carte « Ton poids », posee par dessus en position absolue : citrouilles ou sapins de chaque cote du
 * chiffre (les seuls touchables), toiles et araignees ou guirlande. Ne touche a aucun calcul de poids.
 */
export function DecorCarte({ saison, largeur, scrollY, seuil = 100000 }: DecorCarteProps) {
  const { pret, reduire, temps } = useCalque(saison, scrollY, seuil);
  const gerbe = useGerbe(saison, reduire);
  if (!pret || largeur <= 0) return null;
  const b = boitesCarte(largeur);
  const cotes = [b.gauche, b.droite];
  const a = ARAIGNEE_CARTE;
  const sombre = paletteSombre();
  // les couleurs d'INRO : fil et toile selon le theme, encre de l'araignee
  const toile = sombre ? 'rgba(232,239,245,0.35)' : 'rgba(26,43,61,0.3)';
  const soie = sombre ? 'rgba(232,239,245,0.6)' : 'rgba(120,130,140,0.75)';
  const encre = sombre ? '#0B0710' : '#231A2B';
  const hSapin = DECOR_CARTE.h;
  const wSapin = (hSapin * 54) / 70;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, width: largeur, height: b.chiffre.y + b.chiffre.h }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: largeur, height: b.chiffre.y + b.chiffre.h }} {...cache}>
        {saison === 'halloween' ? (
          <>
            <View style={{ position: 'absolute', left: 0, top: 0 }}>
              <ToileInro taille={TOILE_CARTE} couleur={toile} />
            </View>
            <View style={{ position: 'absolute', left: largeur - TOILE_CARTE, top: 0 }}>
              <ToileInro taille={TOILE_CARTE} couleur={toile} miroir />
            </View>
            <AraigneeInro x={a.x + a.taille / 2} fil={a.fil} haut={a.haut} bas={a.bas} taille={a.taille} duree={2.6} pause={1.8} decalage={0} temps={temps} encre={encre} soie={soie} />
            <AraigneeInro x={largeur - a.x - a.taille / 2} fil={a.fil} haut={a.haut} bas={a.bas} taille={a.taille} duree={3.2} pause={2.6} decalage={2.1} temps={temps} encre={encre} soie={soie} />
            {cotes.map((c, i) => (
              <View key={i} style={{ position: 'absolute', left: c.x, top: c.y + c.h - c.w * 0.9 }}>
                <CitrouilleInro w={c.w} temps={temps} phase={i * 1.3} />
              </View>
            ))}
          </>
        ) : (
          <>
            <GuirlandeAmpoules largeur={largeur} temps={temps} />
            {cotes.map((c, i) => (
              <View key={i} style={{ position: 'absolute', left: c.x + (c.w - wSapin) / 2, top: c.y }}>
                <SapinInro h={hSapin} temps={temps} phase={i * 0.45} />
              </View>
            ))}
          </>
        )}
        {gerbe.rendu}
      </View>
      {cotes.map((c, i) => (
        <Pressable
          key={i}
          onPress={() => gerbe.lancer(c.x + c.w / 2, c.y + c.h * 0.35)}
          accessibilityRole="button"
          accessibilityLabel={saison === 'halloween' ? traduire('Citrouille d’Halloween, touche pour des bonbons') : traduire('Sapin de Noël, touche pour des flocons et des cadeaux')}
          style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h }}
        />
      ))}
    </View>
  );
}
