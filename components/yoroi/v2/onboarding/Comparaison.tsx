/**
 * Ecran 16/19 : « Tout au meme endroit ».
 * 15 octobre 2026 (Houari : « elle passe trop vite ») : refait en 3 etages qui racontent l'evolution du suivi,
 * puis l'etage YOROI. Avant, le carnet papier ; puis le tableur ; puis trois apps differentes ; aujourd'hui tout est dans YOROI.
 * Les etages se revelent un par un, lentement (1,5 s par etage), sans avance automatique : tu continues quand tu veux.
 * Pictos dessines en SVG (PictosEvolution.tsx), encre sur papier ; l'etage YOROI montre ton personnage (ou le kabuto).
 * Reduire les animations ou VoiceOver : tout est affiche d'un coup, sans mouvement.
 * Les fonctions citees existent toutes. 17 octobre 2026 : les six tuiles sont les six domaines de l'accueil, dans leurs couleurs.
 * Ancienne version (ancien monde puis tuiles, environ 1,6 s) : _archive_ancien_design_2026-10-09/onb_retouches/.
 * 26 octobre 2026 (Houari : « accélère un peu, c'est trop lent ») : environ 40 % plus rapide, un étage toutes les
 * 0,9 s (au lieu de 1,5 s), fondus de 0,45 s ; tout est là en un peu plus de 3 s au lieu de 5,8 s.
 */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Platform, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { guerrierImage } from '@/components/yoroi/v2/espace/assets';
import { CLASSIQUE_IMAGES } from '@/lib/v2/dojo/personnages';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { ENCRES_THEME as ENCRES } from './couleurs';
import { teinte } from '@/components/yoroi/v2/accueil/domaines';
import type { Domaine } from '@/components/yoroi/v2/accueil/domaines';
import { PictoCarnet, PictoTableur, PictoTroisApps } from './PictosEvolution';
import { MainButton, Riche, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

/** Rythme du recit (26 octobre 2026) : un etage toutes les 0,9 s, fondu de 0,45 s */
export const ETAGE_MS = 900;
const DEBUT_MS = 220;
const FONDU_MS = 450;
/** les six tuiles arrivent ce temps apres l'etage YOROI */
const TUILES_MS = 550;

const KABUTO = require('@/assets/avatars/app/ornements/kabuto.webp');

const AVANT: { cle: string; quand: string; titre: string; sous: string; Picto: React.ComponentType<{ size?: number }> }[] = [
  { cle: 'carnet', quand: traduire('Avant'), titre: traduire('Le carnet papier'), sous: traduire('Des pages qui se perdent.'), Picto: PictoCarnet },
  { cle: 'tableur', quand: 'Puis', titre: traduire('Le tableur'), sous: traduire('Des colonnes à remplir le soir.'), Picto: PictoTableur },
  { cle: 'apps', quand: 'Puis', titre: traduire('Trois apps différentes'), sous: traduire('Rien ne se parle.'), Picto: PictoTroisApps },
];

/**
 * 17 octobre 2026 : les six domaines de l'accueil, chacun dans sa couleur (accueil/domaines.ts), comme les tuiles
 * de ton accueil : poids violet, seances indigo, sante vert d'eau, eau bleu lagon, competitions prune, mensurations ocre.
 */
const TUILES: { src: ImageSourcePropType; titre: string; domaine: Domaine }[] = [
  { src: require('@/assets/avatars/app/sceaux/decouverte/balance.webp'), titre: 'Poids', domaine: 'poids' },
  { src: require('@/assets/avatars/app/carnet/musculation.webp'), titre: traduire('Séances'), domaine: 'seances' },
  { src: require('@/assets/avatars/app/sceaux/regularite/lune_soleil.webp'), titre: traduire('Ta santé'), domaine: 'forme' },
  { src: require('@/assets/avatars/app/ornements/vague.webp'), titre: 'Eau', domaine: 'eau' },
  { src: require('@/assets/avatars/app/ornements/kabuto.webp'), titre: traduire('Compétitions'), domaine: 'competition' },
  { src: require('@/assets/avatars/app/sceaux/decouverte/metre_ruban.webp'), titre: traduire('Mensurations'), domaine: 'mensurations' },
];

/** Le petit trait qui relie deux etages */
function Lien({ visible, calme }: { visible: boolean; calme: boolean }) {
  const c = useColors();
  const h = useWindowDimensions().height < 720 ? 8 : 14;
  if (!visible) return <View style={{ height: h }} />;
  return (
    <Animated.View entering={calme ? undefined : FadeIn.duration(FONDU_MS)} style={{ height: h, alignItems: 'flex-start', paddingLeft: 43 }}>
      <View style={{ width: 2, height: h, borderRadius: 1, backgroundColor: c.border }} />
    </Animated.View>
  );
}

/** Un etage de l'ancien monde : vignette papier, quand, titre, phrase ; il s'efface un peu quand YOROI arrive */
function Etage({ quand, titre, sous, Picto, eteint, calme, picto }: { quand: string; titre: string; sous: string; Picto: React.ComponentType<{ size?: number }>; eteint: boolean; calme: boolean; picto: number }) {
  const c = useColors();
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = calme ? (eteint ? 0.62 : 1) : withTiming(eteint ? 0.62 : 1, { duration: FONDU_MS });
  }, [eteint, calme, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View entering={calme ? undefined : FadeInDown.duration(FONDU_MS)}>
    <Animated.View
      accessible
      accessibilityLabel={`${quand} : ${titre}. ${sous}`}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingVertical: picto < 56 ? 8 : 12, paddingHorizontal: 12 }, anim]}
    >
      <View style={{ width: picto + 12, height: picto + 12, borderRadius: 18, backgroundColor: '#F2F1EC', alignItems: 'center', justifyContent: 'center' }}>
        <Picto size={picto} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={12} weight="extraBold" color={c.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{quand}</Ink>
        <Ink size={17} weight="black" tight color={c.ink}>{titre}</Ink>
        <Ink size={13} weight="medium" color={c.textSecondary} style={{ lineHeight: 18 }} numberOfLines={2}>{sous}</Ink>
      </View>
    </Animated.View>
    </Animated.View>
  );
}

export function Comparaison({ nav, genre = 'h', univers = 'japon', onNext }: { nav: Nav; genre?: 'h' | 'f'; univers?: ChoixUnivers; onNext: () => void }) {
  const c = useColors();
  const { height } = useWindowDimensions();
  const petit = height < 720;
  const reduce = useReducedMotion();
  const [lecteur, setLecteur] = useState(false);
  useEffect(() => {
    let vivant = true;
    // sur le web, react-native-web repond toujours oui : on ne s'y fie pas
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => {
        if (vivant) setLecteur(!!v);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);
  const calme = !!reduce || lecteur;
  // nombre d'etages visibles : 0 a 3 pour l'ancien monde, 4 avec YOROI, 5 avec ses fonctions
  const [etape, setEtape] = useState(calme ? 5 : 0);
  useEffect(() => {
    if (calme) {
      setEtape(5);
      return;
    }
    const timers = [0, 1, 2, 3].map((i) => setTimeout(() => setEtape((e) => Math.max(e, i + 1)), DEBUT_MS + i * ETAGE_MS));
    timers.push(setTimeout(() => setEtape(5), DEBUT_MS + 3 * ETAGE_MS + TUILES_MS));
    return () => timers.forEach(clearTimeout);
  }, [calme]);

  const perso = univers === 'japon' ? guerrierImage(genre, 4) : univers === 'classique' ? CLASSIQUE_IMAGES[genre === 'f' ? 'f' : 'h'][4] : null;
  const picto = petit ? 44 : 60;
  const yoroi = etape >= 4;

  return (
    <Shell {...nav} title={traduire("Tout au **même endroit**")} gap={0} footer={<MainButton label={traduire("Continuer")} onPress={onNext} />}>
      <View style={{ height: petit ? 6 : 16 }} />
      {AVANT.map((e, i) => (
        <React.Fragment key={e.cle}>
          {i > 0 ? <Lien visible={etape > i} calme={calme} /> : null}
          {etape > i ? <Etage quand={e.quand} titre={e.titre} sous={e.sous} Picto={e.Picto} eteint={yoroi} calme={calme} picto={picto} /> : <View style={{ height: picto + (petit ? 28 : 36) }} />}
        </React.Fragment>
      ))}
      <Lien visible={yoroi} calme={calme} />
      {yoroi ? (
        <Animated.View
          entering={calme ? undefined : FadeInDown.duration(FONDU_MS)}
          style={{ borderRadius: 24, backgroundColor: ENCRES.indigo.fond, borderWidth: 2, borderColor: ENCRES.indigo.ink, padding: 14, gap: 12 }}
        >
          <View accessible accessibilityRole="header" accessibilityLabel={traduire("Aujourd’hui : tout est dans YOROI. Tout ton suivi, une seule app.")} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: picto + 12, height: picto + 12, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Image source={perso ?? KABUTO} style={{ width: picto + 4, height: picto + 4 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={12} weight="extraBold" color={ENCRES.indigo.ink} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{traduire("Aujourd’hui")}</Ink>
              <Ink size={petit ? 24 : 28} weight="black" tight color={c.ink} style={{ letterSpacing: 3 }}>YOROI</Ink>
              <Riche text={traduire("Tout ton suivi. **Une seule app.**")} size={14} weight="bold" color={c.ink} ink={ENCRES.indigo.ink} />
            </View>
          </View>
          {etape >= 5 ? (
            <Animated.View entering={calme ? undefined : FadeIn.duration(FONDU_MS)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
              {TUILES.map((t) => (
                <View key={t.titre} style={{ width: '31.5%', borderRadius: 14, backgroundColor: teinte(t.domaine).fond, borderWidth: 1, borderColor: teinte(t.domaine).bord, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 4 }}>
                  <Image source={t.src} style={{ width: petit ? 30 : 36, height: petit ? 30 : 36 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  <Ink size={11} weight="extraBold" color={teinte(t.domaine).texte} numberOfLines={1} style={{ textAlign: 'center' }}>{traduire(t.titre)}</Ink>
                </View>
              ))}
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : (
        <View style={{ height: picto + 40 }} />
      )}
      {etape >= 5 ? (
        <Animated.View entering={calme ? undefined : FadeIn.delay(200).duration(FONDU_MS)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 14 }}>
          <Icon name="shield" size={16} color={c.accent} />
          <Riche text={traduire("**Hors ligne**, tout reste sur ton téléphone")} size={14} weight="bold" color={c.ink} />
        </Animated.View>
      ) : null}
    </Shell>
  );
}

export default Comparaison;
