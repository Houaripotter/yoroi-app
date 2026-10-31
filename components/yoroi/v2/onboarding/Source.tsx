/**
 * Ecran facultatif (31 octobre 2026, demande de Houari) : « Où as-tu entendu parler de YOROI ? », juste apres Ta tranche
 * d'age. Une seule reponse, en grille de trois. Les reseaux et magasins montrent leur vrai logo (LogosMarques.tsx, formes
 * et couleurs officielles, sans deformation) ; le cote kawaii vient du traitement autocollant : tuile arrondie, epais
 * contour blanc, petite ombre, legere inclinaison propre a chaque choix, petit rebond quand on le choisit.
 * Bouche a oreille, salle ou club, IA et autre prennent des stickers de l'app.
 * Seul ecran de l'app ou de vrais noms de marques s'affichent (exception demandee par Houari).
 */
import React, { useEffect } from 'react';
import { Image, Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChoiceCard, MainButton, Shell, SkipLink, useColors } from './ui';
import type { Nav } from './types';
import { LogoMarque, type MarqueId } from './LogosMarques';
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

/** L'autocollant : contour blanc epais, ombre douce, incline ; il rebondit quand il est choisi */
function Autocollant({ id, choisi }: { id: SourceConnu; choisi: boolean }) {
  const c = useColors();
  const illus = useIllustrations();
  const angle = inclinaison(id);
  const s = useSharedValue(choisi ? 1.08 : 1);
  const r = useSharedValue(angle);
  useEffect(() => {
    if (choisi) {
      s.value = withSequence(withTiming(1.2, { duration: 110 }), withSpring(1.08, { damping: 7, stiffness: 260 }));
      r.value = withSequence(withTiming(-angle, { duration: 110 }), withSpring(angle, { damping: 6, stiffness: 220 }));
    } else {
      s.value = withSpring(1, { damping: 14, stiffness: 240 });
      r.value = withTiming(angle, { duration: 160 });
    }
  }, [choisi, angle, s, r]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }, { scale: s.value }] }));
  const sticker = STICKER_SOURCE[id];
  return (
    <Animated.View
      style={[
        { padding: BORD, borderRadius: 14 + BORD, backgroundColor: '#FFFFFF', shadowColor: '#1D2033', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
        anim,
      ]}
    >
      {sticker ? (
        <View style={{ width: TUILE, height: TUILE, borderRadius: 14, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={illus.img(sticker)} style={{ width: TUILE - 8, height: TUILE - 8 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      ) : (
        <View style={{ width: TUILE, height: TUILE, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(29,32,51,0.08)' }}>
          <LogoMarque id={id as MarqueId} taille={TUILE - 2} />
        </View>
      )}
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
