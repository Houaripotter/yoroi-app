/**
 * Ecran facultatif (31 octobre 2026, demande de Houari) : « Où as-tu entendu parler de YOROI ? », juste apres Ta tranche
 * d'age. Une seule reponse, en grille de trois. Les reseaux et magasins montrent leur vrai logo (LogosMarques.tsx, formes
 * et couleurs officielles, sans deformation) ; le cote kawaii vient du traitement autocollant : tuile arrondie, epais
 * contour blanc, petite ombre, legere inclinaison propre a chaque choix, petit rebond quand on le choisit.
 * Bouche a oreille, salle ou club, IA et autre prennent des stickers de l'app.
 * Seul ecran de l'app ou de vrais noms de marques s'affichent (exception demandee par Houari).
 * 3 novembre 2026 (Houari : « les logos TikTok et Instagram sont très flous ») : l'autocollant d'une marque est dessine
 * en entier dans un seul SVG (contour blanc, ombre, tuile, logo), inclinaison comprise. Avant, le SVG etait pose dans
 * une vue tournee et agrandie a 1,08 au repos : iOS etirait et tournait l'image deja dessinee, d'ou le flou. Au repos,
 * plus aucune mise a l'echelle ni rotation de vue ; le rebond du choix ne dure que le temps de l'animation.
 */
import React, { useEffect } from 'react';
import { Image, Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChoiceCard, MainButton, Shell, SkipLink, useColors } from './ui';
import type { Nav } from './types';
import Svg, { ClipPath, Defs, G, Rect } from 'react-native-svg';
import { DefsMarques, DessinMarque, type MarqueId } from './LogosMarques';
import { sourcesPour, type SourceConnu } from '@/lib/v2/onboarding/sourceConnu';
import { traduire } from '@/lib/i18n/tr';

/** Le nom affiche : les marques gardent leur nom (jamais traduit), le reste passe par traduire */
export function libelleSource(s: SourceConnu): string {
  switch (s) {
    case 'tiktok':
      return 'TikTok';
    case 'instagram':
      return 'Instagram';
    case 'youtube':
      return 'YouTube';
    case 'facebook':
      return 'Facebook';
    case 'google':
      return 'Google';
    case 'app_store':
      return 'App Store';
    case 'google_play':
      return 'Google Play';
    case 'snapchat':
      return 'Snapchat';
    case 'x':
      return 'X';
    case 'ia':
      return traduire('ChatGPT ou une IA');
    case 'amis':
      return traduire('Bouche à oreille');
    case 'club':
      return traduire('Salle, club ou coach');
    default:
      return traduire('Autre');
  }
}

const STICKER_SOURCE: Partial<Record<SourceConnu, NomSticker>> = {
  ia: 'cerveau',
  amis: 'groupe',
  club: 'gants',
  autre: 'etincelles',
};

/** Inclinaison stable de chaque autocollant (de -7 a 7 degres), tiree de son identifiant */
export function inclinaison(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return (h % 15) - 7;
}

const TUILE = 52;
const BORD = 4;
/** L'autocollant fait TUILE + 2 BORD ; la toile laisse la place a l'inclinaison et a l'ombre sans changer la mise en page */
const COTE = TUILE + 2 * BORD;
const TOILE = COTE + 14;
/** L'ombre douce : cinq couches translucides de plus en plus larges (pas de flou, net sur tous les ecrans) */
const OMBRE = [0, 0.8, 1.6, 2.4, 3.2];

/**
 * L'autocollant d'une marque, tout en vectoriel : ombre douce (trois rectangles translucides), contour blanc,
 * tuile du logo arrondie, filet discret, le tout incline dans le SVG (net sur tous les ecrans).
 */
export function AutocollantMarqueSvg({ id, angle }: { id: MarqueId; angle: number }) {
  const m = TOILE / 2;
  const o = m - COTE / 2;
  const t = m - TUILE / 2;
  const e = TUILE / 48;
  const clip = `yoroiClipMarque_${id}`;
  return (
    <Svg width={TOILE} height={TOILE} viewBox={`0 0 ${TOILE} ${TOILE}`}>
      <DefsMarques />
      <Defs>
        <ClipPath id={clip}>
          <Rect x={0} y={0} width={48} height={48} rx={14 / e} />
        </ClipPath>
      </Defs>
      <G rotation={angle} origin={`${m}, ${m}`}>
        {OMBRE.map((k) => (
          <Rect key={k} x={o - k} y={o + 1.2 + k * 0.6} width={COTE + 2 * k} height={COTE + 2 * k} rx={14 + BORD + k} fill="#1D2033" opacity={0.024} />
        ))}
        <Rect x={o} y={o} width={COTE} height={COTE} rx={14 + BORD} fill="#FFFFFF" />
        <G transform={`translate(${t} ${t}) scale(${e})`}>
          <G clipPath={`url(#${clip})`}>
            <DessinMarque id={id} />
          </G>
          <Rect x={0.5 / e} y={0.5 / e} width={48 - 1 / e} height={48 - 1 / e} rx={14 / e} fill="none" stroke="rgba(29,32,51,0.08)" strokeWidth={1 / e} />
        </G>
      </G>
    </Svg>
  );
}

/** L'autocollant : contour blanc epais, ombre douce, incline ; il rebondit quand il est choisi */
function Autocollant({ id, choisi }: { id: SourceConnu; choisi: boolean }) {
  const c = useColors();
  const illus = useIllustrations();
  const angle = inclinaison(id);
  const sticker = STICKER_SOURCE[id];
  // marques : l'inclinaison est dans le SVG, la vue reste droite et a l'echelle 1 au repos
  const repos = sticker ? angle : 0;
  const s = useSharedValue(1);
  const r = useSharedValue(repos);
  useEffect(() => {
    if (choisi) {
      s.value = withSequence(withTiming(1.16, { duration: 110 }), withSpring(1, { damping: 7, stiffness: 260 }));
      r.value = withSequence(withTiming(repos - 2 * angle, { duration: 110 }), withSpring(repos, { damping: 6, stiffness: 220 }));
    } else {
      s.value = withSpring(1, { damping: 14, stiffness: 240 });
      r.value = withTiming(repos, { duration: 160 });
    }
  }, [choisi, angle, repos, s, r]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }, { scale: s.value }] }));
  if (!sticker) {
    return (
      <Animated.View style={[{ width: COTE, height: COTE, alignItems: 'center', justifyContent: 'center' }, anim]}>
        <View style={{ position: 'absolute', left: (COTE - TOILE) / 2, top: (COTE - TOILE) / 2 }}>
          <AutocollantMarqueSvg id={id as MarqueId} angle={angle} />
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View
      style={[
        { padding: BORD, borderRadius: 14 + BORD, backgroundColor: '#FFFFFF', shadowColor: '#1D2033', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
        anim,
      ]}
    >
      <View style={{ width: TUILE, height: TUILE, borderRadius: 14, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={illus.img(sticker)} style={{ width: TUILE - 8, height: TUILE - 8 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    </Animated.View>
  );
}

export function Source({ nav, value, onPick, onNext, onSkip }: { nav: Nav; value: SourceConnu | null; onPick: (s: SourceConnu) => void; onNext: () => void; onSkip: () => void }) {
  const c = useColors();
  const choix = sourcesPour(Platform.OS);
  const lignes: SourceConnu[][] = [];
  for (let i = 0; i < choix.length; i += 3) lignes.push(choix.slice(i, i + 3));
  return (
    <Shell
      {...nav}
      gap={14}
      title={traduire('Où as-tu entendu parler de **YOROI** ?')}
      sub={traduire('Une seule réponse. Ça nous aide à faire connaître YOROI.')}
      footer={
        <>
          <MainButton label={traduire('Continuer')} onPress={onNext} disabled={!value} />
          <View style={{ alignItems: 'center' }}>
            <SkipLink onPress={onSkip} label={traduire('Passer cette étape')} />
          </View>
        </>
      }
    >
      <View style={{ gap: 12 }}>
        {lignes.map((ligne, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            {ligne.map((s) => {
              const on = value === s;
              const label = libelleSource(s);
              return (
                <ChoiceCard key={s} selected={on} onPress={() => onPick(s)} label={label} height={112} style={{ flex: 1 }}>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 8 }}>
                    <Autocollant id={s} choisi={on} />
                    <Ink size={13} weight="black" color={on ? c.accent : c.ink} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 15 }} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Ink>
                  </View>
                </ChoiceCard>
              );
            })}
            {ligne.length < 3 ? Array.from({ length: 3 - ligne.length }).map((_, k) => <View key={`v${k}`} style={{ flex: 1 }} />) : null}
          </View>
        ))}
      </View>
    </Shell>
  );
}

export default Source;
