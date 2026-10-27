/**
 * Apercu du contenu bloque, dans le paywall ouvert depuis une fonction payante (27 octobre 2026).
 * Houari : « la carte Toutes les scènes montre des lignes grises vides, c'est moche, on devine rien ». Les lignes
 * fantomes sont parties : chaque mur montre un vrai morceau de l'app.
 *  - scenes      : une rangee des vraies miniatures de scenes, les verrouillees avec un petit cadenas, qui defile
 *                  lentement (immobile avec « réduire les animations ») ;
 *  - personnages : les vrais personnages du monde samourai, dans ton genre, cadenas sur ceux a debloquer ;
 *  - logos       : les vraies icones de l'app, cadenas sur les logos Premium ;
 *  - les autres  : deux vraies tuiles des apercus du carrousel Premium (Apercus.tsx) : courbe de force, semaine,
 *                  nutrition, chrono de combat, marquees « Exemple » quand ce ne sont pas tes chiffres ;
 *  - photos, videos, PDF : une rangee de stickers de l'app qui parlent de ce contenu.
 * L'icone pale a gauche du titre devient un sticker, qui suit le reglage Illustrations (stickers ou encre).
 * Ce paywall la n'est jamais celui de la fin de l'onboarding (il ne s'affiche que venu d'un mur).
 */
import React, { useEffect, useMemo } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { isSceneLocked } from '@/components/yoroi/v2/espace/Pickers';
import { sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { ApercuCombat, ApercuNutrition, ApercuProgres, ApercuRythme } from '@/components/yoroi/v2/premium/Apercus';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { sectionsGalerie } from '@/lib/v2/espace/presentation';
import { MONDE_PERSONNAGES, isPackUnlocked, packImage } from '@/lib/v2/dojo/personnages';
import { LOGO_OPTIONS } from '@/lib/storage';
import type { SceneId } from '@/lib/v2/espace';
import type { SourcePremium } from '@/lib/v2/premium/sources';
import type { ApercuNutrition as DonneesNutrition } from '@/lib/v2/premium/apercus';

/** Le sticker du titre de chaque mur */
export const STICKER_MUR: Record<SourcePremium, NomSticker> = {
  prevision_poids: 'balance',
  periode_longue: 'calendrier',
  sante_annee: 'sante_appareils',
  photos_limite: 'appareil_photo',
  competitions_limite: 'trophee',
  videos: 'videos',
  progression_mouvements: 'musculation',
  signes_vitaux: 'coeur',
  bilan_pdf: 'bilan',
  partenaire_pdf: 'bilan',
  objectifs_dates: 'objectifs',
  scenes: 'torii',
  personnages: 'kabuto',
  logos: 'eventail',
  seche: 'seche',
  plan_nutrition: 'nutrition',
  bilan_annuel: 'records_parchemin',
  analyse_combat: 'combat',
  temps_tatami: 'tapis',
  rounds: 'gants',
  radar: 'boussole',
  competiteur: 'medaille_or',
  camp_competition: 'calendrier',
  matrice_adversaires: 'sparring',
  partenaires: 'poing',
  plan_de_match: 'carte_tresor',
  drills: 'repeter',
};

type Tuile = 'progres' | 'rythme' | 'nutrition' | 'combat';
type Genre = 'rangee_scenes' | 'rangee_personnages' | 'rangee_logos' | { tuiles: [Tuile, Tuile] } | { stickers: NomSticker[] };

/** Ce que montre chaque mur (liste fermee, testee) */
export function genreApercu(s: SourcePremium): Genre {
  switch (s) {
    case 'scenes':
      return 'rangee_scenes';
    case 'personnages':
      return 'rangee_personnages';
    case 'logos':
      return 'rangee_logos';
    case 'plan_nutrition':
    case 'seche':
      return { tuiles: ['nutrition', 'progres'] };
    case 'analyse_combat':
    case 'rounds':
    case 'temps_tatami':
    case 'matrice_adversaires':
    case 'partenaires':
    case 'plan_de_match':
    case 'drills':
    case 'competitions_limite':
    case 'competiteur':
    case 'camp_competition':
      return { tuiles: ['combat', 'rythme'] };
    case 'objectifs_dates':
      return { tuiles: ['rythme', 'progres'] };
    case 'photos_limite':
      return { stickers: ['appareil_photo', 'kimono', 'metre_ruban', 'records', 'jjb', 'balance', 'muscle'] };
    case 'videos':
      return { stickers: ['videos', 'play', 'techniques', 'jjb', 'sparring', 'carnet', 'gants'] };
    case 'bilan_pdf':
    case 'partenaire_pdf':
      return { stickers: ['bilan', 'records_parchemin', 'partager', 'donnees', 'noter', 'coach', 'records'] };
    default:
      return { tuiles: ['progres', 'rythme'] };
  }
}

/** Les scenes de la rangee : deux offertes d'abord, puis celles que Premium ouvre */
export function scenesApercu(rankIndex: number, max = 12): { id: SceneId; verrou: boolean }[] {
  const toutes = Array.from(new Set(sectionsGalerie('toutes').flatMap((s) => s.scenes)));
  const avec = toutes.map((id) => ({ id, verrou: isSceneLocked(id, rankIndex, false, false) }));
  const libres = avec.filter((x) => !x.verrou).slice(0, 2);
  const fermees = avec.filter((x) => x.verrou).slice(0, max - libres.length);
  return [...libres, ...fermees];
}

function Cadenas({ taille = 22 }: { taille?: number }) {
  return (
    <View style={{ position: 'absolute', top: 5, right: 5, width: taille, height: taille, borderRadius: taille / 2, backgroundColor: 'rgba(20,22,31,0.62)', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="lock" size={taille * 0.52} color="#FFFFFF" stroke={2.6} />
    </View>
  );
}

/** Une rangee qui defile lentement en boucle (le contenu est double), immobile avec « réduire les animations » */
function RangeeQuiDefile({ items, largeurItem, ecart = 8, hauteur, rendu }: { items: number; largeurItem: number; ecart?: number; hauteur: number; rendu: (i: number) => React.ReactNode }) {
  const reduire = useReducedMotion();
  const longueur = items * (largeurItem + ecart);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduire || items < 2) {
      x.value = 0;
      return;
    }
    x.value = 0;
    x.value = withRepeat(withTiming(-longueur, { duration: items * 2600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduire, longueur, items]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const tours = reduire ? 1 : 2;
  return (
    <View style={{ height: hauteur, overflow: 'hidden', borderRadius: 14 }}>
      <Animated.View style={[{ flexDirection: 'row', gap: ecart }, style]}>
        {Array.from({ length: items * tours }, (_, k) => (
          <View key={k}>{rendu(k % items)}</View>
        ))}
      </Animated.View>
    </View>
  );
}

function RangeeScenes({ rankIndex }: { rankIndex: number }) {
  const scenes = useMemo(() => scenesApercu(rankIndex), [rankIndex]);
  const W = 104;
  const H = 70;
  return (
    <RangeeQuiDefile
      items={scenes.length}
      largeurItem={W}
      hauteur={H}
      rendu={(i) => (
        <View style={{ width: W, height: H, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1E2336' }}>
          <Image source={sceneForNow(scenes[i].id)} resizeMode="cover" style={{ width: W, height: H }} accessibilityIgnoresInvertColors />
          {scenes[i].verrou ? <Cadenas /> : null}
        </View>
      )}
    />
  );
}

function RangeePersonnages({ rankIndex, genre }: { rankIndex: number; genre: 'h' | 'f' }) {
  const persos = useMemo(() => MONDE_PERSONNAGES.slice(0, 10).map((p) => ({ p, verrou: !isPackUnlocked(p, [], rankIndex, false) })), [rankIndex]);
  const W = 72;
  const H = 96;
  return (
    <RangeeQuiDefile
      items={persos.length}
      largeurItem={W}
      hauteur={H}
      rendu={(i) => (
        <View style={{ width: W, height: H, borderRadius: 14, overflow: 'hidden', backgroundColor: persos[i].p.fond }}>
          <Image source={packImage(persos[i].p, genre, 1)} resizeMode="contain" style={{ position: 'absolute', left: 2, right: 2, top: 4, bottom: 0 }} />
          {persos[i].verrou ? <Cadenas taille={20} /> : null}
        </View>
      )}
    />
  );
}

function RangeeLogos() {
  const S = 62;
  return (
    <RangeeQuiDefile
      items={LOGO_OPTIONS.length}
      largeurItem={S}
      ecart={10}
      hauteur={S}
      rendu={(i) => (
        <View style={{ width: S, height: S, borderRadius: 15, overflow: 'hidden' }}>
          <Image source={LOGO_OPTIONS[i].image} resizeMode="cover" style={{ width: S, height: S }} />
          {LOGO_OPTIONS[i].isPremium ? <Cadenas taille={18} /> : null}
        </View>
      )}
    />
  );
}

function RangeeStickers({ noms }: { noms: NomSticker[] }) {
  const illus = useIllustrations();
  const { theme } = useYoroiTheme();
  const S = 66;
  return (
    <RangeeQuiDefile
      items={noms.length}
      largeurItem={S}
      hauteur={S}
      rendu={(i) => (
        <View style={{ width: S, height: S, borderRadius: 16, backgroundColor: theme.colors.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={illus.img(noms[i])} resizeMode="contain" style={{ width: S - 12, height: S - 12 }} />
        </View>
      )}
    />
  );
}

/** Le contenu de l'apercu d'un mur, sur la largeur interieure de la carte */
export function ApercuMur({ source, largeur, rankIndex, genre, nutrition }: { source: SourcePremium; largeur: number; rankIndex: number; genre: 'h' | 'f'; nutrition: DonneesNutrition }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const g = genreApercu(source);
  let contenu: React.ReactNode;
  if (g === 'rangee_scenes') contenu = <RangeeScenes rankIndex={rankIndex} />;
  else if (g === 'rangee_personnages') contenu = <RangeePersonnages rankIndex={rankIndex} genre={genre} />;
  else if (g === 'rangee_logos') contenu = <RangeeLogos />;
  else if ('stickers' in g) contenu = <RangeeStickers noms={g.stickers} />;
  else {
    const w = Math.floor((largeur - 10) / 2) - 2;
    const h = 150;
    const tuile = (t: Tuile) =>
      t === 'progres' ? <ApercuProgres key={t} w={w} h={h} actif />
      : t === 'rythme' ? <ApercuRythme key={t} w={w} h={h} seances={null} />
      : t === 'nutrition' ? <ApercuNutrition key={t} w={w} h={h} d={nutrition} actif />
      : <ApercuCombat key={t} w={w} h={h} actif />;
    // les tuiles ont le fond de la carte : un fin contour pastel les detache
    contenu = <View style={{ flexDirection: 'row', gap: 10 }}>{g.tuiles.map((t) => <View key={t} style={{ borderRadius: 19, borderWidth: 1, borderColor: c.border, backgroundColor: c.fillSubtle, padding: 0, overflow: 'hidden' }}>{tuile(t)}</View>)}</View>;
  }
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ paddingTop: 2 }}>
      {contenu}
    </View>
  );
}

/** Le sticker du titre de la carte, selon le reglage Illustrations */
export function StickerMur({ source, taille = 36 }: { source: SourcePremium; taille?: number }) {
  const illus = useIllustrations();
  const img: ImageSourcePropType = illus.img(STICKER_MUR[source]);
  return <Image source={img} resizeMode="contain" style={{ width: taille, height: taille }} accessibilityIgnoresInvertColors />;
}
