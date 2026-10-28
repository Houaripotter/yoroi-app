/**
 * Ecran 1 de l'onboarding, l'accroche (vague 29, sur le principe de l'accroche d'INRO).
 * Vague 50 (Houari : « chaque titre doit avoir son propre défilement à l'intérieur ; la première, c'est tout le total,
 * après chaque page raconte quelque chose ») : un vrai carrousel de pages plein ecran, qu'on glisse au doigt.
 * Page 1 : le mur de toutes les cartes (les vraies fonctions de YOROI, chiffres tires de contentReport.generated.ts).
 * Puis une page par titre, avec son contenu : la carte poids avec le torii et le rythme prevu, les records tamponnes,
 * le chrono rounds avec les claquettes, tous les sports, la carte du plan et sa date estimee (lib/v2/pesee/estimation.ts),
 * l'armure qui se construit, et ce qui reste sur ton telephone. Chiffres fictifs marques « Exemple ».
 * 17 octobre 2026 (revue de l'onboarding) : les nouveautes ont leur page, dessinees avec les vrais composants
 * (Vitrines.tsx) : l'accueil en tuiles colorees avec « Ta santé aujourd'hui », les seances (exercices en francais,
 * Trouve ta machine, kilos, lieu), les cartes a partager (Story, Publication, Carre), les personnages de toutes
 * origines avec le choix du visage. Le trophee dore marque les records. La page du plan quitte l'accroche :
 * ta vraie date estimee arrive a l'ecran « Ou veux-tu arriver ? » et dans ton plan, avec tes chiffres.
 * Les points suivent, un point touche ouvre sa page, defilement automatique toutes les 5 s, en pause des que le doigt
 * touche le carrousel, reprise 6 s apres. Le bas (avis, note, Commencer, atouts, restaurer, liens) reste fixe dessous,
 * et l'ecran defile verticalement sur petit iPhone. Tout est en pause quand l'ecran n'est pas visible.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StatusBar, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, type IconName } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { SCENES, SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { AvisDefilants, Defilement, NoteLauriers, useEcranVisible } from '@/components/yoroi/v2/premium/Preuve';
import { CONTENT_COUNTS } from '@/lib/v2/creator/contentReport.generated';
import { GUERRIER_IMAGES, MONDE_PERSONNAGES, NEW_SCENES, VIE_PERSONNAGES } from '@/lib/v2/dojo/personnages';
import { imageTeinte } from '@/lib/v2/dojo/packsTeintes';
import type { EncreId } from './couleurs';
import { VitrineAccueil, VitrinePartage, VitrinePersonnages, VitrineSeance } from './Vitrines';
import { TropheeRecord } from '@/components/yoroi/v2/charts/core';
import { healthName } from '@/lib/v2/onboarding/save';
import { CartePoids } from '@/components/yoroi/v2/accueil/CartePoids';
import { CourbePoids } from '@/components/yoroi/v2/charts/CourbePoids';
import { ArmureEnConstruction, EtapesPiece } from '@/components/yoroi/v2/dojo/ArmureEnConstruction';
import { PIECES } from '@/lib/v2/dojo/pieces';
import { creerLigne } from '@/lib/v2/pesee/ligneDirectrice';
import type { DayWeight } from '@/lib/v2/weightStats';
import { usePremium } from '@/context/PremiumContext';
import { PREVIEW_PURCHASE_MESSAGE } from '@/lib/v2/creator/purchasePreview';
import { paywallEvent } from '@/lib/v2/premium/events';
import { storeName } from '@/lib/v2/onboarding/trial';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { GUTTER, MainButton, RoundIcon, decouper } from './ui';
import { ApercuDansBarre, useApercuVisible } from '@/components/yoroi/v2/studio/PreviewBar';
import { P } from '@/components/yoroi/livePalette';
import { LiensLegaux } from '@/components/yoroi/v2/premium/LiensLegaux';
import { traduire, LOCALE, DECIMAL } from '@/lib/i18n/tr';
import { BoutonLangue } from '@/components/yoroi/v2/langue/ChoixLangue';
import { illustration, useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { SceneAnimee } from '@/components/yoroi/v2/scenes/SceneAnimee';
import { SCENES_VOYAGES } from '@/lib/v2/espace/voyages';


/** Compteur reel du contenu (null s'il manque : la carte ne s'affiche pas) */
function count(id: string): number | null {
  const v = CONTENT_COUNTS.find((x) => x.id === id)?.value;
  return typeof v === 'number' && v > 0 ? v : null;
}
const fmt = (n: number) => n.toLocaleString(LOCALE).replace(/ | /g, ' ');

const N_SPORTS = count('sports');
const N_EXOS = count('exercices');
const N_TECH = count('techniques');
const N_SCENES = count('scenes');
const N_CITATIONS = count('citations');

type PageId = 'mur' | 'accueil' | 'poids' | 'coach' | 'records' | 'chrono' | 'sports' | 'seance' | 'scenes' | 'partage' | 'personnages' | 'armure' | 'tel';

// vague 30 : le mot cle de chaque titre en couleur (entre ** **). Vague 50 : une page par titre, la premiere est le tout
const PAGES: { id: PageId; titre: string; sous: string }[] = [
  { id: 'mur', titre: traduire('Ton carnet de **combattant**'), sous: traduire('Poids, coach, séances, records, chrono, scènes et ton Dojo. Glisse pour tout voir.') },
  // 17 octobre 2026 (revue de l'onboarding) : les nouveautes, dessinees avec les vrais composants (Vitrines.tsx)
  { id: 'accueil', titre: traduire('Ta santé du jour, **de ta montre**'), sous: traduire('Pas, exercice, calories, sommeil et cœur arrivent seuls sur ton accueil.') },
  { id: 'poids', titre: traduire('Ton poids, **enfin lisible**'), sous: traduire("Ta vraie tendance, pas le bruit de la balance. Avec {0} si tu veux.", healthName()) },
  // 27 octobre 2026 (Houari : « il manque le Coach ») : le coach et ses programmes, puis les scenes
  { id: 'coach', titre: traduire('Ton **coach** te guide'), sous: traduire('Un programme sur tes jours, ta séance du jour et la charge de chaque exercice.') },
  { id: 'records', titre: traduire('Tes records, **tamponnés**'), sous: traduire('Chaque record battu gagne son tampon dans ton carnet.') },
  { id: 'chrono', titre: traduire('Le chrono **des combattants**'), sous: traduire('Rounds, Tabata, repos muscu. Le gong, et les claquettes à 10 s de la fin.') },
  { id: 'sports', titre: traduire('Tous tes sports, **au même endroit**'), sous: N_SPORTS && N_EXOS ? traduire("{0} sports, {1} exercices, ta semaine en un coup d’œil.", fmt(N_SPORTS), fmt(N_EXOS)) : traduire('Tous tes sports, ta semaine d’un coup d’œil.') },
  { id: 'seance', titre: traduire('Tes séances, **plus simples**'), sous: traduire('Exercices en français, ta machine en image, ton lieu en un geste.') },
  { id: 'scenes', titre: traduire('Des scènes **qui bougent**'), sous: traduire('Marseille, Paris, Tokyo : choisis la scène de ton accueil.') },
  { id: 'partage', titre: traduire('Tes **cartes** à partager'), sous: traduire('Story, Publication ou Carré, et des modèles Record, Semaine, Minimal.') },
  { id: 'personnages', titre: traduire('Des personnages **qui te ressemblent**'), sous: traduire('De toutes origines, homme ou femme. Choisis ton visage.') },
  { id: 'armure', titre: traduire('Ton armure **grandit avec toi**'), sous: traduire('Cinq rangs, d’Ashigaru à Shōgun, et un Dojo à remplir de personnages.') },
  { id: 'tel', titre: traduire('Tout reste **sur ton téléphone**'), sous: traduire('Pas de compte à créer, pas de publicité. Ton suivi marche sans réseau.') },
];
const N_PAGES = PAGES.length;
/** vague 50 : une page toutes les 5 s, reprise 6 s apres le dernier toucher */
const AUTO_MS = 5000;
const REPRISE_MS = 6000;

// ===== Cartes du mur =====

type Tile =
  | { k: 'stat'; w: number; n: string; label: string; sub: string; tone?: 'indigo' | 'gold' }
  | { k: 'couleur'; w: number; bg: 'indigo' | 'ink' | 'gold'; icon: IconName; kicker: string; title: string; sub: string; nouveau?: boolean }
  | { k: 'image'; w: number; src: ImageSourcePropType; label: string; sub?: string; fond: string }
  | { k: 'scene'; w: number; src: ImageSourcePropType; label: string; sub?: string; nouveau?: boolean }
  | { k: 'tampon'; w: number; t: TamponId; title: string; sub: string }
  | { k: 'poids'; w: number }
  | { k: 'tampons'; w: number; ids: TamponId[]; title: string; sub: string }
  | { k: 'illu'; w: number; src: ImageSourcePropType; fond: string; ink: string; kicker: string; title: string; sub: string };

function sport(id: string, g: 'h' | 'f'): ImageSourcePropType {
  const s = SPORT_ILLUS.find((x) => x.id === id) ?? SPORT_ILLUS[0];
  return g === 'f' ? s.f : s.h;
}
function scene(id: string): ImageSourcePropType {
  return (SCENES.find((s) => s.id === id) ?? SCENES[0]).image;
}
function monde(id: string, g: 'h' | 'f'): ImageSourcePropType {
  const p = MONDE_PERSONNAGES.find((x) => x.id === id) ?? MONDE_PERSONNAGES[0];
  return p.images[g][0];
}

/** 17 octobre 2026 : des personnages Vie reelle de toutes origines sur le mur (variantes de teinte, packsTeintes.ts) */
function origines(g: 'h' | 'f'): Tile[] {
  const out: Tile[] = [];
  const un = (id: string, t: 'peau_foncee' | 'peau_mate' | 'asie', gg: 'h' | 'f', fond: string) => {
    const p = VIE_PERSONNAGES.find((x) => x.id === id);
    const src = imageTeinte(id, t, gg);
    if (p && src !== undefined) out.push({ k: 'image', w: 112, src, label: p.names?.[gg] ?? p.name, sub: traduire('Vie réelle'), fond });
  };
  un('basket', 'peau_foncee', g, '#F6EEDD');
  un('soignant', 'asie', g === 'h' ? 'f' : 'h', '#DCE3FF');
  return out;
}

const SCENE_CALANQUE: ImageSourcePropType = require('@/assets/avatars/app/scenes_voyages/sc13_calanque_couchant.webp');

const ILLU_ENCRE = {
  chrono: require('@/assets/avatars/app/ornements/chrono.webp'),
  jjb: require('@/assets/avatars/app/carnet/jjb.webp'),
  ruban: require('@/assets/avatars/app/sceaux/decouverte/metre_ruban.webp'),
  musculation: require('@/assets/avatars/app/carnet/musculation.webp'),
  balance: require('@/assets/avatars/app/sceaux/decouverte/balance.webp'),
} satisfies Record<string, ImageSourcePropType>;

/** 27 octobre 2026 : les stickers (ou l'encre d'avant, reglage Illustrations) */
const ILLU = {
  get chrono(): ImageSourcePropType {
    return illustration('chrono', ILLU_ENCRE.chrono);
  },
  get jjb(): ImageSourcePropType {
    return illustration('jjb', ILLU_ENCRE.jjb);
  },
  get ruban(): ImageSourcePropType {
    return illustration('metre_ruban', ILLU_ENCRE.ruban);
  },
  get musculation(): ImageSourcePropType {
    return illustration('musculation', ILLU_ENCRE.musculation);
  },
  get balance(): ImageSourcePropType {
    return illustration('balance', ILLU_ENCRE.balance);
  },
  get coach(): ImageSourcePropType {
    return illustration('coach');
  },
  get kabuto(): ImageSourcePropType {
    return illustration('kabuto');
  },
};

/**
 * Vague 30 : les meilleures cartes de l'app (« celles qui donnent enormement envie ») :
 * la grande carte Poids avec sa jauge (le vrai composant de l'accueil, en exemple), les tampons de records,
 * le chrono, le carnet de techniques, les medailles, les scenes et les personnages, le Dojo, la sante,
 * les mensurations, la date d'arrivee estimee. Chiffres reels de contentReport.generated.ts.
 */
/** Vague 47 : encre des tuiles a fond pastel fixe, lisible en clair comme en sombre */
const ENCRE_PASTEL = '#1D2029';
const ENCRE_PASTEL_DOUCE = 'rgba(29,32,41,0.66)';

function buildRows(g: 'h' | 'f'): Tile[][] {
  const autre: 'h' | 'f' = g === 'h' ? 'f' : 'h';
  const r1: (Tile | null)[] = [
    { k: 'poids', w: 0 },
    // 27 octobre 2026 : le coach et ses programmes
    { k: 'illu', w: 200, src: ILLU.coach, fond: '#E8ECFF', ink: '#3557D9', kicker: 'Coach', title: traduire('Ta séance du jour'), sub: traduire('Un programme sur tes jours') },
    { k: 'tampons', w: 196, ids: ['record_force', 'record_endurance', 'record_combat'], title: traduire('Records tamponnés'), sub: traduire('Muscu, course, combat') },
    { k: 'illu', w: 188, src: ILLU.chrono, fond: '#F6EEDD', ink: '#A57A1C', kicker: 'Chrono', title: traduire('Rounds et Tabata'), sub: traduire('Le gong, les claquettes') },
    { k: 'image', w: 116, src: GUERRIER_IMAGES[g][4], label: 'Shōgun', sub: traduire('ton armure'), fond: '#F6EEDD' },
    { k: 'couleur', w: 196, bg: 'gold', icon: 'share', kicker: 'Partage', title: traduire('Tes cartes'), sub: traduire('Story, Publication, Carré'), nouveau: true },
    N_SPORTS ? { k: 'stat', w: 128, n: fmt(N_SPORTS), label: 'sports', sub: traduire('à noter en deux touches') } : null,
  ];
  const r2: (Tile | null)[] = [
    { k: 'illu', w: 196, src: ILLU.jjb, fond: '#EFE6F3', ink: '#8A3F78', kicker: 'Carnet', title: N_TECH ? `${fmt(N_TECH)} techniques` : traduire('Tes techniques'), sub: traduire('JJB, lutte et frappes') },
    { k: 'tampons', w: 200, ids: ['medaille_or', 'medaille_argent', 'medaille_bronze'], title: traduire('Compétitions'), sub: traduire('Ta catégorie, tes médailles') },
    // 27 octobre 2026 : une des nouvelles scenes de Marseille, la calanque au couchant
    N_SCENES ? { k: 'scene', w: 168, src: SCENE_CALANQUE, label: traduire("{0} scènes", N_SCENES), sub: traduire('dont {0} nouvelles', NEW_SCENES.length), nouveau: true } : null,
    { k: 'illu', w: 188, src: ILLU.ruban, fond: '#E3F2EA', ink: '#1C6B45', kicker: 'Mensurations', title: traduire('Taille, ventre, bras'), sub: traduire('Ce que la balance ne dit pas') },
    { k: 'illu', w: 196, src: ILLU.kabuto, fond: '#E6ECF8', ink: '#3557D9', kicker: 'Illustrations', title: traduire('Stickers ou encre'), sub: traduire('Le style de ton app') },
    N_EXOS ? { k: 'stat', w: 144, n: fmt(N_EXOS), label: traduire('exercices'), sub: traduire('dans la bibliothèque'), tone: 'gold' } : null,
    { k: 'image', w: 112, src: sport('boxe', autre), label: 'Boxe', fond: '#F6EEDD' },
  ];
  const r3: (Tile | null)[] = [
    { k: 'image', w: 120, src: monde('ninja', g), label: 'Ninja', sub: traduire('le Dojo'), fond: '#EFE6F3' },
    ...origines(g),
    { k: 'scene', w: 168, src: scene('dojo'), label: traduire('Le Dojo'), sub: traduire('tes personnages') },
    { k: 'couleur', w: 204, bg: 'ink', icon: 'heart', kicker: traduire('Ta santé aujourd’hui'), title: healthName(), sub: traduire('Pas, cœur, sommeil sur l’accueil'), nouveau: true },
    { k: 'couleur', w: 196, bg: 'indigo', icon: 'calendar', kicker: traduire('Ton cap'), title: traduire('Ta date estimée'), sub: traduire('Une fourchette honnête') },
    N_CITATIONS ? { k: 'stat', w: 132, n: fmt(N_CITATIONS), label: 'citations', sub: traduire('une par jour'), tone: 'gold' } : null,
    { k: 'image', w: 112, src: sport('jjb', g), label: 'JJB', fond: '#DCE3FF' },
  ];
  return [r1, r2, r3].map((r) => r.filter((t): t is Tile => t !== null));
}

/** Serie d'exemple pour la grande carte Poids : 30 jours d'une tendance qui descend doucement */
function serieExemple(): DayWeight[] {
  const out: DayWeight[] = [];
  const now = new Date();
  for (let i = 30; i >= 0; i -= 2) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const trend = Math.round((79.4 + (i / 30) * 2.6) * 10) / 10;
    const v = Math.round((trend + (i % 4 === 0 ? 0.3 : -0.2)) * 10) / 10;
    out.push({ date: iso, value: i === 0 ? trend : v, trend, hasComposition: false });
  }
  return out;
}

/** La vraie carte Poids de l'accueil, reduite pour tenir dans une tuile, marquee « Exemple » */
function TuilePoids({ h }: { h: number }) {
  const series = useMemo(serieExemple, []);
  const [natH, setNatH] = useState(250);
  const W = 340;
  // la tuile montre le haut de la carte (poids du jour et jauge), assez grand pour se lire
  const w = Math.round(Math.max(196, Math.min(260, h * 1.4)));
  const s = w / W;
  return (
    <View style={{ width: w, height: h, borderRadius: 18, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        onLayout={(e) => {
          const hh = e.nativeEvent.layout.height;
          if (hh > 0 && Math.abs(hh - natH) > 1) setNatH(hh);
        }}
        style={{ position: 'absolute', width: W, left: (w - W) / 2, top: (natH * s - natH) / 2, transform: [{ scale: s }] }}
      >
        <CartePoids demo series={series} targetWeight={77} startWeight={82} />
      </View>
      <View style={{ position: 'absolute', top: 6, right: 6 }}>
        <Pastille label="Exemple" />
      </View>
    </View>
  );
}

function TileView({ t, h }: { t: Tile; h: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const small = h < 104;
  const card = { width: t.w, height: h, borderRadius: 18, overflow: 'hidden' as const };
  const white = { ...card, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border };

  switch (t.k) {
    case 'poids':
      return <TuilePoids h={h} />;
    case 'tampons':
      return (
        <View style={[white, { paddingHorizontal: 12, paddingVertical: small ? 6 : 10, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {t.ids.map((id, k) => (
              <Tampon key={id} name={id} size={small ? 38 : Math.min(64, Math.round(h * 0.36))} rotate={[-9, 5, -4][k] ?? 0} style={{ marginLeft: k ? -8 : 0 }} accessibilityLabel={null} />
            ))}
          </View>
          <View style={{ gap: 1 }}>
            <Ink size={15} weight="black" tight numberOfLines={1}>{traduire(t.title)}</Ink>
            {!small ? <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={1}>{traduire(t.sub)}</Ink> : null}
          </View>
        </View>
      );
    case 'illu':
      return (
        <View style={[card, { backgroundColor: t.fond, padding: 12, justifyContent: 'flex-end' }]}>
          <Image source={t.src} resizeMode="contain" style={{ position: 'absolute', right: -4, top: -4, width: h * 0.72, height: h * 0.72 }} accessibilityIgnoresInvertColors />
          <View style={{ gap: 1, paddingRight: 6 }}>
            {/* vague 47 : fond pastel fixe, donc encre fixe (en sombre, le texte clair du theme ne se lisait plus) */}
            <Ink size={10} weight="black" color={t.ink} style={{ letterSpacing: 0.9 }} numberOfLines={1}>{t.kicker.toUpperCase()}</Ink>
            <Ink size={15} weight="black" color={ENCRE_PASTEL} tight numberOfLines={1}>{traduire(t.title)}</Ink>
            {!small ? <Ink size={11} weight="bold" color={ENCRE_PASTEL_DOUCE} numberOfLines={1}>{traduire(t.sub)}</Ink> : null}
          </View>
        </View>
      );
    case 'stat': {
      const col = t.tone === 'gold' ? c.goldDeep : c.accent;
      return (
        <View style={[white, { paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', gap: small ? 0 : 2 }]}>
          <Ink size={small ? 26 : 32} weight="black" tight color={col} style={{ lineHeight: small ? 30 : 38 }} numberOfLines={1}>{t.n}</Ink>
          <Ink size={13} weight="extraBold" numberOfLines={1}>{traduire(t.label)}</Ink>
          {!small ? <Ink size={11} color={c.textMuted} numberOfLines={1}>{traduire(t.sub)}</Ink> : null}
        </View>
      );
    }
    case 'couleur': {
      // 17 octobre 2026 : indigo de la charte fixe (en sombre, l'accent clair rendait le texte blanc illisible)
      // 27 octobre 2026 (refonte Pastel) : l'indigo devient le pastel bleu (texte bleu nuit), plus de carre autour de l'icone
      // 27 octobre 2026 (refonte Pastel, suite) : la tuile sante passe de l'encre pleine a la menthe, l'or au creme
      const bg = t.bg === 'indigo' ? '#DCE3FF' : t.bg === 'ink' ? '#E3F2EA' : '#F6EEDD';
      const onBg = t.bg === 'gold' ? '#1D2033' : t.bg === 'indigo' ? '#23358F' : '#1C6B45';
      const soft = t.bg === 'gold' ? 'rgba(29,32,41,0.66)' : t.bg === 'indigo' ? 'rgba(35,53,143,0.72)' : 'rgba(28,107,69,0.78)';
      const iconBg = 'transparent';
      const iconCol = t.bg === 'gold' ? c.goldDeep : t.bg === 'ink' ? '#1C6B45' : '#23358F';
      return (
        <View style={[card, { backgroundColor: bg, padding: h < 84 ? 10 : 12, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ width: small ? 28 : 32, height: small ? 28 : 32, borderRadius: 10, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={t.icon} size={small ? 15 : 17} color={iconCol} />
            </View>
            {t.nouveau ? <Pastille label={traduire("Nouveau")} /> : null}
          </View>
          <View style={{ gap: 1 }}>
            {/* vague 31 : carte basse (petits iPhone avec les avis), le titre seul pour ne rien couper */}
            {h >= 84 ? <Ink size={10} weight="black" color={soft} style={{ letterSpacing: 0.9 }} numberOfLines={1}>{t.kicker.toUpperCase()}</Ink> : null}
            <Ink size={15} weight="black" color={onBg} tight numberOfLines={1}>{traduire(t.title)}</Ink>
            {!small ? <Ink size={11} weight="medium" color={soft} numberOfLines={1}>{traduire(t.sub)}</Ink> : null}
          </View>
        </View>
      );
    }
    case 'image':
      return (
        <View style={[card, { backgroundColor: t.fond, alignItems: 'center', justifyContent: 'flex-end' }]}>
          <Image source={t.src} resizeMode="contain" style={{ position: 'absolute', top: -h * 0.06, left: -t.w * 0.2, width: t.w * 1.4, height: h * 1.06 - (small ? 20 : 30) }} accessibilityIgnoresInvertColors />
          <View style={{ alignItems: 'center', paddingBottom: small ? 5 : 7 }}>
            <Ink size={12} weight="black" color={ENCRE_PASTEL} numberOfLines={1}>{traduire(t.label)}</Ink>
            {t.sub && !small ? <Ink size={10} weight="bold" color={ENCRE_PASTEL_DOUCE} numberOfLines={1}>{traduire(t.sub)}</Ink> : null}
          </View>
        </View>
      );
    case 'scene':
      return (
        <View style={[card, { backgroundColor: c.fillSoft }]}>
          <Image source={t.src} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: t.w, height: h }} accessibilityIgnoresInvertColors />
          <LinearGradient colors={['rgba(16,20,34,0)', 'rgba(16,20,34,0.78)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' }} />
          {t.nouveau ? (
            <View style={{ position: 'absolute', top: 9, right: 9 }}>
              <Pastille label={traduire("Nouveau")} />
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: 12, right: 12, bottom: 9 }}>
            <Ink size={15} weight="black" color="#FFFFFF" tight numberOfLines={1}>{traduire(t.label)}</Ink>
            {t.sub && !small ? <Ink size={11} weight="bold" color="rgba(255,255,255,0.82)" numberOfLines={1}>{traduire(t.sub)}</Ink> : null}
          </View>
        </View>
      );
    case 'tampon':
      return (
        <View style={[white, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 }]}>
          <Tampon name={t.t} size={small ? 46 : 62} rotate={-8} accessibilityLabel={null} />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={15} weight="black" tight numberOfLines={1}>{traduire(t.title)}</Ink>
            <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={2}>{traduire(t.sub)}</Ink>
          </View>
        </View>
      );
  }
}

function Pastille({ label, tinte = false, blanche = false }: { label: string; tinte?: boolean; blanche?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ backgroundColor: tinte ? c.accentTint : blanche ? '#FFFFFF' : P.white, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Ink size={9.5} weight="black" color={tinte ? c.accentText : '#23358F'} style={{ letterSpacing: 0.8 }}>{label.toUpperCase()}</Ink>
    </View>
  );
}

// ===== Pages du carrousel (vague 50) =====

/** Le contenu d'une page, dessine a sa taille, reduit seulement s'il ne tient pas dans la hauteur disponible */
function Ajuste({ w, h, designW, children }: { w: number; h: number; designW: number; children: React.ReactNode }) {
  const [natH, setNatH] = useState(0);
  const s = natH > 0 ? Math.min(1, h / natH, w / designW) : 1;
  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }} pointerEvents="none">
      <View
        onLayout={(e) => {
          const hh = e.nativeEvent.layout.height;
          if (hh > 0 && Math.abs(hh - natH) > 1) setNatH(hh);
        }}
        style={{ position: 'absolute', width: designW, left: (w - designW) / 2, top: natH > 0 ? (h - natH) / 2 : 0, opacity: natH > 0 ? 1 : 0, transform: [{ scale: s }] }}
      >
        {children}
      </View>
    </View>
  );
}

const isoJ = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Exemple de la page Poids : huit semaines qui descendent, le cap a 78 kg, le torii dans un mois, le rythme prevu */
const POIDS_EXEMPLE = (() => {
  const now = new Date();
  const points: { date: string; value: number }[] = [];
  for (let i = 56; i >= 0; i -= 4) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12);
    const tendance = 79.6 + (i / 56) * 3;
    points.push({ date: isoJ(d), value: Math.round((tendance + (i % 8 === 0 ? 0.3 : -0.15)) * 10) / 10 });
  }
  const torii = isoJ(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 34, 12));
  const ligne = creerLigne({ date: points[0].date, poids: 82.6 }, 78, 'perte');
  return { points, cap: 78, torii, ligne };
})();

function PageCarte({ children, style }: { children: React.ReactNode; style?: object }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return <View style={[{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 14 }, style]}>{children}</View>;
}

function PagePoids({ designW }: { designW: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const ex = POIDS_EXEMPLE;
  const der = ex.points[ex.points.length - 1].value;
  const perdu = Math.round((ex.points[0].value - der) * 10) / 10;
  return (
    <PageCarte style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ton poids")}</Ink>
        <Pastille label="Exemple" tinte />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Ink size={34} weight="black" tight style={{ lineHeight: 38 }}>{`${String(der).replace('.', DECIMAL)} kg`}</Ink>
        <Ink size={13.5} weight="extraBold" color={c.successText} style={{ paddingBottom: 5 }}>{traduire("{0} kg en 2 mois", String(perdu).replace('.', DECIMAL))}</Ink>
      </View>
      <CourbePoids points={ex.points} style={1} cap={ex.cap} ligne={ex.ligne} torii={ex.torii} height={168} legende label={traduire("Exemple de courbe de poids, avec ton rythme prévu jusqu’au torii")} />
    </PageCarte>
  );
}

const RECORDS: { t: TamponId; kicker: string; titre: string; sous: string }[] = [
  { t: 'record_force', kicker: traduire('Record de force'), titre: traduire('Développé couché, 100 kg'), sous: traduire('5 kg de plus que ton ancien record') },
  { t: 'record_endurance', kicker: traduire('Record d’endurance'), titre: traduire('10 km en 46 min 20'), sous: traduire('1 min 05 plus vite') },
  { t: 'record_combat', kicker: traduire('Record de combat'), titre: traduire('6 rounds de sparring'), sous: traduire('Ta plus longue séance de combat') },
];

function PageRecords() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 10 }}>
      {RECORDS.map((r, k) => (
        <PageCarte key={r.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
          <Tampon name={r.t} size={70} rotate={[-8, 6, -4][k]} accessibilityLabel={null} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <TropheeRecord size={16} />
              <Ink size={10.5} weight="black" color={c.record} style={{ letterSpacing: 1 }} numberOfLines={1}>{r.kicker.toUpperCase()}</Ink>
            </View>
            <Ink size={17} weight="black" tight numberOfLines={1}>{traduire(r.titre)}</Ink>
            <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>{r.sous}</Ink>
          </View>
          {k === 0 ? (
            <View style={{ position: 'absolute', top: 8, right: 10 }}>
              <Pastille label="Exemple" tinte />
            </View>
          ) : null}
        </PageCarte>
      ))}
    </View>
  );
}

/** Le chrono rounds en plein combat : round 3 sur 5, les 10 dernieres secondes en rouge, les claquettes */
// 27 octobre 2026 (refonte Pastel) : la carte du chrono passe de la nuit au creme, texte encre
const CREME = '#F6EEDD';
const CREME_TITRE = '#A57A1C';
const ROUGE_CHRONO = '#F0644B';
const EFFORT = '#7E9FE0';
const REPOS = '#9DBB63';

function PageChrono({ g }: { g: 'h' | 'f' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const rounds = 5;
  const actuel = 3;
  return (
    <View style={{ borderRadius: 24, backgroundColor: CREME, padding: 16, gap: 12, overflow: 'hidden' }}>
      <Image source={sport('boxe', g)} resizeMode="contain" style={{ position: 'absolute', right: -18, top: 8, width: 132, height: 176, opacity: 0.95 }} accessibilityIgnoresInvertColors />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Ink size={11} weight="black" color={CREME_TITRE} style={{ letterSpacing: 1 }}>{traduire("ROUND {0} SUR {1}", actuel, rounds)}</Ink>
        </View>
        <Pastille label={traduire('Exemple')} blanche />
      </View>
      <View style={{ gap: 0 }}>
        <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire("Boxe, rounds de 3 min")}</Ink>
        <Ink size={78} weight="black" tight color={ROUGE_CHRONO} style={{ lineHeight: 86, fontVariant: ['tabular-nums'] }}>0:08</Ink>
      </View>
      {/* la frise des rounds : barre haute l'effort, barre basse le repos, comme sur l'ecran du chrono */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 30 }}>
        {Array.from({ length: rounds * 2 - 1 }).map((_, k) => {
          const effort = k % 2 === 0;
          const n = Math.floor(k / 2) + 1;
          const fait = effort ? n < actuel : n < actuel;
          const enCours = effort && n === actuel;
          return (
            <View
              key={k}
              style={{ flex: effort ? 3 : 1, height: effort ? 30 : 12, borderRadius: 6, backgroundColor: effort ? EFFORT : REPOS, opacity: fait || enCours ? 1 : 0.32, borderWidth: enCours ? 2 : 0, borderColor: c.ink }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F6EEDD', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Icon name="bell" size={14} color={ROUGE_CHRONO} stroke={2.6} />
          <Ink size={12.5} weight="extraBold" color={c.ink}>{traduire("Clac clac clac, plus que 10 s")}</Ink>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Icon name="timer" size={14} color={CREME_TITRE} stroke={2.4} />
          <Ink size={12.5} weight="extraBold" color={c.ink}>{traduire("Gong au début et à la fin")}</Ink>
        </View>
      </View>
    </View>
  );
}

const SPORTS_PAGE: { id: string; fond: string }[] = [
  { id: 'boxe', fond: '#F6EEDD' },
  { id: 'jjb', fond: '#DCE3FF' },
  { id: 'mma', fond: '#EFE6F3' },
  { id: 'musculation', fond: '#F6EEDD' },
  { id: 'running', fond: '#E3F2EA' },
  { id: 'fitness', fond: '#EFE6F3' },
];

function PageSports({ g, designW }: { g: 'h' | 'f'; designW: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const tw = Math.floor((designW - 16) / 3);
  const stats = [N_SPORTS ? { n: fmt(N_SPORTS), l: 'sports' } : null, N_EXOS ? { n: fmt(N_EXOS), l: 'exercices' } : null, N_TECH ? { n: fmt(N_TECH), l: 'techniques' } : null].filter((x): x is { n: string; l: string } => x !== null);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SPORTS_PAGE.map((s, k) => {
          const il = SPORT_ILLUS.find((x) => x.id === s.id);
          if (!il) return null;
          return (
            <View key={s.id} style={{ width: tw, height: 112, borderRadius: 18, backgroundColor: s.fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Image source={k % 2 ? (g === 'f' ? il.h : il.f) : g === 'f' ? il.f : il.h} resizeMode="contain" style={{ position: 'absolute', top: 4, left: 0, width: tw, height: 84 }} accessibilityIgnoresInvertColors />
              <Ink size={12.5} weight="black" color={ENCRE_PASTEL} style={{ paddingBottom: 6 }} numberOfLines={1}>{traduire(il.nom)}</Ink>
            </View>
          );
        })}
      </View>
      {stats.length ? (
        <PageCarte style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 }}>
          {stats.map((s, k) => (
            <View key={s.l} style={{ alignItems: 'center' }}>
              <Ink size={24} weight="black" tight color={k === 1 ? c.goldDeep : c.accent}>{s.n}</Ink>
              <Ink size={12} weight="extraBold" color={c.textSecondary}>{s.l}</Ink>
            </View>
          ))}
        </PageCarte>
      ) : null}
    </View>
  );
}

const RANGS = ['Ashigaru', 'Bushi', traduire('Samouraï'), 'Rōnin', 'Shōgun'];

/** 27 octobre 2026 (Houari) : le Rōnin en vedette, l'homme et la femme a tour de role (toutes les 2,8 s, fixe si Reduire les animations) */
function useAlterne(ms: number): number {
  const reduire = useReducedMotion();
  const [k, setK] = useState(0);
  useEffect(() => {
    if (reduire) return;
    const t = setInterval(() => setK((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [reduire, ms]);
  return reduire ? 0 : k;
}

function PageArmure({ g }: { g: 'h' | 'f'; designW: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const k = useAlterne(2800);
  const gg: 'h' | 'f' = k % 2 === 0 ? g : g === 'h' ? 'f' : 'h';
  return (
    <View style={{ gap: 10 }}>
      <View style={{ borderRadius: 24, backgroundColor: '#F6EEDD', flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 6, paddingRight: 14, paddingTop: 10, overflow: 'hidden', minHeight: 214 }}>
        <View style={{ width: 160, height: 204 }}>
          <Animated.Image key={gg} entering={FadeIn.duration(600)} exiting={FadeOut.duration(600)} source={GUERRIER_IMAGES[gg][3]} resizeMode="contain" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: 160, height: 204 }} accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1, gap: 5, paddingBottom: 16 }}>
          <Ink size={10.5} weight="black" color="#A57A1C" style={{ letterSpacing: 1 }}>{traduire('RANG 4 SUR 5')}</Ink>
          <Ink size={26} weight="black" tight color={c.ink}>Rōnin</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} style={{ lineHeight: 17 }}>{traduire('Chaque séance et chaque pesée font monter ton rang, d’Ashigaru à Shōgun.')}</Ink>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            {RANGS.map((r, i) => (
              <View key={r} style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: i <= 3 ? (i === 3 ? '#A57A1C' : '#D9B866') : c.surface }} />
            ))}
          </View>
        </View>
      </View>
      <PageCarte style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}>
        <ArmureEnConstruction piece={PIECES.samourai} progres={0.66} taille={84} />
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={10.5} weight="black" color={c.goldDeep} style={{ letterSpacing: 1 }}>{traduire('EN CONSTRUCTION')}</Ink>
          <Ink size={17} weight="black" tight numberOfLines={1}>{traduire(PIECES.samourai.nom)}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>{traduire("Tes séances dévoilent ta pièce suivante, étape par étape.")}</Ink>
          <EtapesPiece faites={2} />
        </View>
      </PageCarte>
    </View>
  );
}

/** 27 octobre 2026 (Houari : « il manque le Coach ») : la seance du jour du coach, en exemple, dans le pastel du Coach */
const SEANCE_EXEMPLE: { nom: string; detail: string }[] = [
  { nom: traduire('Développé couché'), detail: traduire('4 séries de 8, 60 kg') },
  { nom: traduire('Rowing barre'), detail: traduire('4 séries de 10, 50 kg') },
  { nom: 'Dips', detail: traduire('3 séries de 10') },
];

function PageCoach() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const jours = [true, false, true, false, true, false, false];
  return (
    <View style={{ gap: 10 }}>
      <View style={{ borderRadius: 24, backgroundColor: '#E8ECFF', padding: 16, gap: 10, overflow: 'hidden' }}>
        <Image source={illus.img('coach')} resizeMode="contain" style={{ position: 'absolute', right: 8, top: 8, width: 78, height: 78 }} accessibilityIgnoresInvertColors />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ink size={10.5} weight="black" color="#3557D9" style={{ letterSpacing: 1.2 }}>{traduire('SÉANCE DU JOUR')}</Ink>
          <Pastille label={traduire('Exemple')} blanche />
        </View>
        <Ink size={22} weight="black" tight color={c.ink} style={{ maxWidth: '70%' }}>{traduire('Haut du corps')}</Ink>
        <View style={{ gap: 6 }}>
          {SEANCE_EXEMPLE.map((x) => (
            <View key={x.nom} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ink size={14} weight="black" color={c.ink} style={{ flex: 1 }} numberOfLines={1}>{x.nom}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{x.detail}</Ink>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#E3F2EA', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Icon name="up" size={13} color="#1C6B45" stroke={2.6} />
          <Ink size={12} weight="black" color="#1C6B45">{traduire('+5 % de charge quand tu réussis')}</Ink>
        </View>
      </View>
      <PageCarte style={{ gap: 8, paddingVertical: 12 }}>
        <Ink size={10.5} weight="black" color="#8A3F78" style={{ letterSpacing: 1.2 }}>{traduire('TON PROGRAMME SUR TES JOURS')}</Ink>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
            <View key={i} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: jours[i] ? '#EFE6F3' : c.fillSoft, borderWidth: jours[i] ? 2 : 0, borderColor: '#B35A9E' }}>
              <Ink size={13} weight="black" color={jours[i] ? '#6E2F60' : c.textMuted}>{traduire(l)}</Ink>
            </View>
          ))}
        </View>
      </PageCarte>
    </View>
  );
}

/** 27 octobre 2026 : les scenes de l'accueil, la calanque de Marseille animee en grand (video de la scene), trois autres en dessous */
const SCENES_PAGE: string[] = ['voyage_moto_tour_eiffel', 'voyage_yatai_pont', 'voyage_balancoire_plage'];

function PageScenes({ designW, actif }: { designW: number; actif: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const calanque = SCENES_VOYAGES.find((x) => x.id === 'marseille_calanque');
  const petites = SCENES_PAGE.map((id) => SCENES_VOYAGES.find((x) => x.id === id)).filter((x): x is (typeof SCENES_VOYAGES)[number] => !!x);
  const grandH = Math.round((designW * 670) / 1200);
  const pw = Math.floor((designW - 16) / 3);
  return (
    <View style={{ gap: 8 }}>
      {calanque ? (
        <View>
          <SceneAnimee scene={calanque.anim as never} source={calanque.image} width={designW} height={grandH} actif={actif} borderRadius={22} />
          <View style={{ position: 'absolute', left: 10, bottom: 10, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Ink size={12} weight="black" color={c.ink}>{calanque.nom}</Ink>
          </View>
          <View style={{ position: 'absolute', right: 10, top: 10 }}>
            <Pastille label={traduire('Marseille')} blanche />
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {petites.map((x) => (
          <View key={x.id} style={{ width: pw, gap: 4 }}>
            <Image source={x.image} resizeMode="cover" style={{ width: pw, height: Math.round(pw * 0.62), borderRadius: 14 }} accessibilityIgnoresInvertColors />
            <Ink size={11.5} weight="black" color={c.ink} numberOfLines={1}>{x.nom}</Ink>
          </View>
        ))}
      </View>
    </View>
  );
}

// 27 octobre 2026 (retour du proprio) : chaque ligne a sa propre teinte douce (fond pastel, picto colore),
// prise dans les encres de l'onboarding qui suivent le mode clair ou sombre
// 27 octobre 2026 soir (Houari : « des stickers a la place des icones ») : un sticker par ligne (nom : le sticker attendu,
// remplace : le meilleur existant en attendant, voir _propositions/audit_onboarding_2026-10-27/AUDIT.md)
const SUR_TEL: { icon: IconName; titre: string; sous: string; encre: EncreId; sticker: NomSticker }[] = [
  { icon: 'user', encre: 'indigo', sticker: 'sans_compte', titre: traduire('Pas de compte à créer'), sous: traduire('Tu ouvres l’app, tu commences.') },
  { icon: 'shield', encre: 'mousse', sticker: 'hors_ligne', titre: traduire('Ton suivi marche sans réseau'), sous: traduire('À la salle, au dojo, en déplacement.') },
  { icon: 'lock', encre: 'prune', sticker: 'donnees_telephone', titre: traduire('Tes données restent chez toi'), sous: traduire('Sur ton téléphone, sans compte en ligne.') },
  { icon: 'close', encre: 'vermillon', sticker: 'sans_publicite', titre: traduire('Aucune publicité'), sous: traduire('Ni en gratuit, ni en Premium.') },
  { icon: 'save', encre: 'sarcelle', sticker: 'sauvegarde', titre: traduire('Ta sauvegarde, quand tu veux'), sous: traduire('À remettre sur un autre téléphone.') },
];

function PageTel() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  return (
    <PageCarte style={{ paddingVertical: 6 }}>
      {SUR_TEL.map((r, k) => (
        <View key={r.titre} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: k ? 1 : 0, borderTopColor: c.divider }}>
          <Image source={illus.img(r.sticker)} style={{ width: 42, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={15} weight="black" tight numberOfLines={1}>{traduire(r.titre)}</Ink>
            <Ink size={12.5} weight="medium" color={c.textSecondary} numberOfLines={1}>{r.sous}</Ink>
          </View>
        </View>
      ))}
    </PageCarte>
  );
}

// ===== Ecran =====

const ROW_GAP = 10;
/** vague 50 : hauteur minimale du contenu d'une page, pour qu'il se lise. En dessous, l'ecran defile verticalement au doigt */
const CONTENU_MIN = 282;
const CONTENU_MIN_PETIT = 250;

export function Accroche({
  genre,
  onStart,
  onRestoreBackup,
  restoringBackup,
  preview,
  onOpenTerms,
  onOpenPrivacy,
  onClose,
}: {
  genre: 'h' | 'f';
  onStart: () => void;
  onRestoreBackup: () => void;
  restoringBackup: boolean;
  /** apercu du Studio : rien n'est restaure */
  preview: boolean;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onClose?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const apercu = useApercuVisible();
  const visible = useEcranVisible();
  const [held, setHeld] = useState(false);
  const [i, setI] = useState(0);
  const [pagerH, setPagerH] = useState(0);
  const rows = useMemo(() => buildRows(genre), [genre]);
  const short = height < 760;
  // petits ecrans (iPhone SE) : tout se resserre, les avis passent en cartes basses
  const tiny = height < 720;
  const avis = height >= 900;
  // vague 50 : le doigt sur le carrousel met le defilement automatique en pause, il reprend 6 s apres
  const [manuel, setManuel] = useState(false);
  const paused = !visible || held || manuel;
  const { restore } = usePremium();
  const pager = useRef<ScrollView>(null);
  const iRef = useRef(0);
  iRef.current = i;
  const reprise = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (reprise.current) clearTimeout(reprise.current);
  }, []);
  const pause = () => {
    setManuel(true);
    if (reprise.current) clearTimeout(reprise.current);
  };
  const reprendre = () => {
    if (reprise.current) clearTimeout(reprise.current);
    reprise.current = setTimeout(() => setManuel(false), REPRISE_MS);
  };
  const allerA = (k: number, animated = true) => {
    const n = ((k % N_PAGES) + N_PAGES) % N_PAGES;
    pager.current?.scrollTo({ x: n * width, y: 0, animated });
    setI(n);
  };
  // la page suit le doigt : celle qui occupe le plus l'ecran
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const k = Math.max(0, Math.min(N_PAGES - 1, Math.round(x / Math.max(1, width))));
    if (k !== iRef.current) {
      iRef.current = k;
      setI(k);
    }
  };
  // largeur changee (rotation, fenetre web) : la page courante reste en place
  useEffect(() => {
    pager.current?.scrollTo({ x: iRef.current * width, y: 0, animated: false });
  }, [width]);

  const [restoringPurchases, setRestoringPurchases] = useState(false);

  // « Deja abonne ? » : l'abonnement revient tout de suite, l'onboarding continue pour creer le profil
  const onRestorePurchases = async () => {
    if (preview) {
      appAlert(traduire('Aperçu'), PREVIEW_PURCHASE_MESSAGE);
      return;
    }
    setRestoringPurchases(true);
    const res = await restore().catch(() => ({ success: false, restored: false, error: traduire('Réessaie dans un instant.') }));
    setRestoringPurchases(false);
    paywallEvent('restauration', { source: 'onboarding', resultat: res.success ? (res.restored ? 'retrouve' : 'aucun') : 'erreur' });
    if (res.success && res.restored) appAlert(traduire('Ton Premium est de retour'), traduire('Ton abonnement est actif. Termine ton profil, tout sera ouvert.'));
    else if (res.success) appAlert(traduire('Aucun achat trouvé'), traduire("Aucun abonnement actif n’est associé à ce compte {0}.", storeName()));
    else appAlert(traduire('Restauration impossible'), res.error ?? traduire('Réessaie dans un instant.'));
  };

  // une page toutes les 5 s, sauf quand l'ecran est cache ou que le doigt vient de toucher le carrousel
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => allerA(iRef.current + 1), AUTO_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused, width]);

  const onPager = (e: LayoutChangeEvent) => {
    const hh = Math.round(e.nativeEvent.layout.height);
    if (Math.abs(hh - pagerH) > 1) setPagerH(hh);
  };
  // hauteurs fixes du titre et du sous-titre : toutes les pages s'alignent
  const padTop = tiny ? 4 : short ? 8 : 12;
  const titreH = short ? 62 : 72;
  const sousH = short ? 38 : 42;
  const contenuH = Math.max(0, pagerH - padTop - titreH - sousH - 6);
  const designW = Math.min(width - 32, 370);

  // le mur de la premiere page : trois rangees seulement s'il y a la place pour des cartes d'au moins 120 points
  const nRows = contenuH >= 120 * 3 + ROW_GAP * 2 + 8 ? 3 : 2;
  const tileH = contenuH > 0 ? Math.max(62, Math.min(150, Math.floor((contenuH - ROW_GAP * (nRows - 1) - 8) / nRows))) : 0;
  const shown = useMemo(() => {
    if (nRows === 3) return rows;
    const r3 = rows[2] ?? [];
    const half = Math.ceil(r3.length / 2);
    return [[...rows[0], ...r3.slice(0, half)], [...rows[1], ...r3.slice(half)]];
  }, [rows, nRows]);
  const speeds = [22, 17, 25];

  const contenu = (id: PageId) => {
    if (contenuH <= 0) return null;
    if (id === 'mur') {
      return (
        <View style={{ width, height: contenuH, overflow: 'hidden', justifyContent: 'center' }} pointerEvents="none">
          <View style={{ gap: ROW_GAP }}>
            {shown.map((r, k) => (
              <Defilement key={k} speed={speeds[k]} direction={k % 2 === 0 ? 'left' : 'right'} paused={!visible || i !== 0} start={[0, 0.4, 0.7][k]}>
                {r.map((t, j) => (
                  <TileView key={j} t={t} h={tileH} />
                ))}
              </Defilement>
            ))}
          </View>
          <LinearGradient pointerEvents="none" start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} colors={[c.background, `${c.background}00`]} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 26 }} />
          <LinearGradient pointerEvents="none" start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} colors={[`${c.background}00`, c.background]} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 26 }} />
        </View>
      );
    }
    const page =
      id === 'poids' ? <PagePoids designW={designW} />
      : id === 'records' ? <PageRecords />
      : id === 'chrono' ? <PageChrono g={genre} />
      : id === 'sports' ? <PageSports g={genre} designW={designW} />
      : id === 'accueil' ? <VitrineAccueil seulSante />
      : id === 'coach' ? <PageCoach />
      : id === 'scenes' ? <PageScenes designW={designW} actif={i === PAGES.findIndex((p) => p.id === 'scenes') && visible} />
      : id === 'seance' ? <VitrineSeance />
      : id === 'partage' ? <VitrinePartage largeur={designW} />
      : id === 'personnages' ? <VitrinePersonnages genre={genre} />
      : id === 'armure' ? <PageArmure g={genre} designW={designW} />
      : <PageTel />;
    return (
      <Ajuste w={width} h={contenuH} designW={designW}>
        {page}
      </Ajuste>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle="dark-content" />
      {/* vague 48 : tout l'ecran defile quand il depasse (grand texte, petit iPhone) ; vague 50 : le carrousel glisse a l'horizontale */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} alwaysBounceVertical={false} directionalLockEnabled>
      {/* Marque, sauvegarde, fermer (apercu) */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* 23 octobre 2026 : le choix de la langue, en haut à gauche, dès la première page */}
        <BoutonLangue />
        {/* vague 30 : en apercu du Studio, la pastille se loge ici, jamais sur le titre */}
        {apercu ? <ApercuDansBarre /> : <Ink size={14} weight="black" color={c.ink} style={{ letterSpacing: 3.2, flex: 1 }}>YOROI</Ink>}
        <Pressable
          onPress={restoringBackup ? undefined : onRestoreBackup}
          accessibilityRole="button"
          accessibilityLabel={traduire("J’ai déjà une sauvegarde")}
          hitSlop={6}
          style={({ pressed }) => ({ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
        >
          {restoringBackup ? <ActivityIndicator size="small" color={c.accent} /> : <Icon name="restore" size={14} color={c.accent} />}
          {apercu ? null : <Ink size={12} weight="extraBold" color={c.ink} numberOfLines={1}>{restoringBackup ? traduire('Restauration') : traduire('J’ai déjà une sauvegarde')}</Ink>}
        </Pressable>
        {onClose ? <RoundIcon name="close" label={traduire("Fermer l’aperçu")} onPress={onClose} /> : null}
      </View>

      {/* vague 50 : le carrousel de pages plein ecran, chaque page avec son titre et son contenu */}
      <View
        style={{ flex: 1, minHeight: padTop + titreH + sousH + 6 + (short ? CONTENU_MIN_PETIT : CONTENU_MIN) }}
        onLayout={onPager}
        onTouchStart={pause}
        onTouchEnd={reprendre}
        onTouchCancel={reprendre}
      >
        {pagerH > 0 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            disableIntervalMomentum
            onScrollBeginDrag={pause}
            onScrollEndDrag={reprendre}
            onMomentumScrollEnd={reprendre}
            style={{ flex: 1 }}
            accessibilityLabel={traduire("Les pages de présentation de YOROI, glisse à gauche ou à droite")}
          >
            {PAGES.map((p, k) => (
              <View key={p.id} style={{ width, height: pagerH }} accessible accessibilityLabel={traduire("Page {0} sur {1}. {2}. {3}", k + 1, N_PAGES, p.titre.replace(/\*\*/g, ''), p.sous)}>
                <View style={{ paddingHorizontal: GUTTER, paddingTop: padTop }}>
                  <View style={{ height: titreH, justifyContent: 'center' }}>
                    <Ink size={short ? 26 : 29} weight="black" tight numberOfLines={2} style={{ textAlign: 'center', lineHeight: short ? 30 : 34 }} accessibilityRole="header">
                      {decouper(p.titre).map((m, j) => (m.cle ? <Ink key={j} size={short ? 26 : 29} weight="black" tight color={c.accent}>{m.txt}</Ink> : m.txt))}
                    </Ink>
                  </View>
                  <View style={{ height: sousH }}>
                    <Ink size={short ? 13 : 14} color={c.textSecondary} numberOfLines={2} style={{ textAlign: 'center', lineHeight: short ? 18 : 19 }}>{p.sous}</Ink>
                  </View>
                </View>
                <View style={{ marginTop: 6 }}>{Math.abs(k - i) <= 1 || k === 0 ? contenu(p.id) : <View style={{ height: contenuH }} />}</View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* les points : la page courante en long, un point touche ouvre sa page */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 2 }}>
        {PAGES.map((p, k) => (
          <Pressable
            key={p.id}
            onPress={() => {
              tap();
              pause();
              allerA(k);
              reprendre();
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Page {0} sur {1}, {2}", k + 1, N_PAGES, p.titre.replace(/\*\*/g, ''))}
            accessibilityState={{ selected: k === i }}
            hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
            style={{ paddingHorizontal: 4, paddingVertical: 8 }}
          >
            <View style={{ width: k === i ? 20 : 7, height: 7, borderRadius: 3.5, backgroundColor: k === i ? c.detail : c.border }} />
          </Pressable>
        ))}
      </View>

      {/* Avis reels, note, bouton, pastilles, liens : fixes sous le carrousel */}
      <View style={{ paddingTop: tiny ? 2 : 4, paddingBottom: insets.bottom + 6 }}>
        {/* vague 31 : les avis defilent sur tous les ecrans, en cartes basses sous 900 points de haut */}
        <View onTouchStart={() => setHeld(true)} onTouchEnd={() => setHeld(false)} onTouchCancel={() => setHeld(false)}>
          <AvisDefilants paused={!visible || held} compact={!avis} draggable />
        </View>
        {tiny ? <View style={{ height: 6 }} /> : <View style={{ height: 1, backgroundColor: c.divider, marginHorizontal: 28, marginTop: 10, marginBottom: short ? 6 : 8 }} />}
        <NoteLauriers compact={short} />
        <View style={{ paddingHorizontal: GUTTER, paddingTop: tiny ? 8 : short ? 10 : 12, gap: tiny ? 6 : short ? 8 : 10 }}>
          <MainButton label={traduire("Commencer")} onPress={onStart} />
          {/* vague 30 : les vrais atouts, en grand (plus de « Version gratuite » : l'app est freemium) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginHorizontal: -8 }}>
            {/* 27 octobre 2026 (Houari : « trop neutres ») : un sticker et un texte dans sa couleur pastel */}
            <Atout nom="hors_ligne" encre="#23358F" label={traduire('Hors ligne')} tiny={tiny} />
            <Atout nom="sans_publicite" encre="#A57A1C" label={traduire("Sans publicité")} tiny={tiny} />
            <Atout nom="donnees_telephone" encre="#8A3F78" label={traduire("Données sur ton téléphone")} tiny={tiny} large />
            <Atout nom="sante_appareils" encre="#1C6B45" label={healthName()} tiny={tiny} large />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Pressable onPress={restoringPurchases ? undefined : () => void onRestorePurchases()} accessibilityRole="button" accessibilityLabel={traduire("Déjà abonné ? Restaurer mes achats")} hitSlop={4} style={{ minHeight: 30, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {restoringPurchases ? <ActivityIndicator size="small" color={c.accent} /> : null}
              <Ink size={12.5} color={c.textSecondary}>
                {traduire('Déjà abonné ? ')}
                <Ink size={12.5} weight="extraBold" color={c.accent}>{traduire("Restaurer mes achats")}</Ink>
              </Ink>
            </Pressable>
            {/* vague 49 : la phrase seule, puis les deux liens centres sur une ligne (meme style que le paywall) */}
            <Ink size={11} color={c.textMuted} style={{ textAlign: 'center', lineHeight: 16, maxWidth: width - GUTTER * 2 }}>
              {traduire("En continuant, tu confirmes avoir 13 ans ou plus et tu acceptes ces conditions.")}</Ink>
            <LiensLegaux
              size={11.5}
              liens={[
                { label: Platform.OS === 'ios' ? 'Conditions d’utilisation (EULA)' : 'Conditions d’utilisation', onPress: onOpenTerms },
                { label: traduire('Confidentialité'), onPress: onOpenPrivacy },
              ]}
            />
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

/** Un atout de l'app : son sticker (ou l'encre japonaise, selon l'univers), le libelle dans sa couleur, deux lignes au plus */
function Atout({ nom, encre, label, tiny, large }: { nom: NomSticker; encre: string; label: string; tiny?: boolean; large?: boolean }) {
  const illus = useIllustrations();
  const t = tiny ? 34 : 42;
  return (
    <View style={{ flex: large ? 1.3 : 1, alignItems: 'center', gap: tiny ? 2 : 4 }} accessible accessibilityLabel={label}>
      <Image source={illus.img(nom)} style={{ width: t, height: t }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Ink size={tiny ? 11 : 12} weight="black" color={encre} numberOfLines={2} style={{ textAlign: 'center', lineHeight: tiny ? 13 : 15 }}>{label}</Ink>
    </View>
  );
}

export default Accroche;
