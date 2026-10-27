/**
 * Ecran « Ta scène » (27 octobre 2026, demande de Houari), juste apres Ton univers : la scene de ton accueil.
 * En haut, l'apercu en grand avec ton personnage (comme la scene en carte de l'accueil) ; dessous, une grille
 * magazine des scenes de ton univers. Les scenes offertes se choisissent ; les scenes Premium (Marseille et Paris,
 * animees, quelques scenes Classique) se regardent en apercu, animees, avec la mention Premium : rien de verrouille
 * n'est enregistre (seule une scene ouverte part dans l'espace a la fin de l'onboarding, app/onboarding.tsx).
 * Reduire les animations : l'image fixe.
 */
import React, { useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { SceneAnimee } from '@/components/yoroi/v2/scenes/SceneAnimee';
import { SCENES_VOYAGES } from '@/lib/v2/espace/voyages';
import { SCENES_CLASSIQUE } from '@/lib/v2/espace/classique';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { illustrationUnivers } from './Univers';
import { GUTTER, MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

type Choix = { id: string; nom: string; image: ImageSourcePropType; ouverte: boolean; anim: string | null };

const JAPON_OUVERTES = ['samourai_armurerie', 'dojo', 'machiya_nuit', 'village', 'bambous', 'jardin'];
const PREMIUM_VOYAGES = ['marseille_calanque', 'voyage_moto_tour_eiffel'];

/** La scene posee par l'univers quand rien n'est choisi (lib/v2/dojo/choisirUnivers.ts) */
export function sceneParDefaut(u: ChoixUnivers): string {
  // 27 octobre 2026 (Houari) : la Salle d'armes par defaut au Japon
  return u === 'japon' ? 'samourai_armurerie' : 'classique_salle_jour';
}

export function scenesProposees(u: ChoixUnivers): Choix[] {
  const voyages: Choix[] = PREMIUM_VOYAGES.map((id) => SCENES_VOYAGES.find((s) => s.id === id))
    .filter((s): s is (typeof SCENES_VOYAGES)[number] => !!s)
    .map((s) => ({ id: s.id, nom: s.nom, image: s.image, ouverte: false, anim: s.anim }));
  if (u === 'japon') {
    const japon = JAPON_OUVERTES.map((id) => {
      const m = sceneMeta(id);
      return { id, nom: m.nom, image: m.image, ouverte: true, anim: null };
    });
    return [...japon, ...voyages];
  }
  const classique = SCENES_CLASSIQUE.filter((s) => s.offerte || s.id === 'classique_ville_nuit' || s.id === 'classique_mer_jour').map((s) => ({ id: s.id, nom: s.nom, image: s.image, ouverte: !!s.offerte, anim: null }));
  return [...classique, ...voyages];
}

export function ChoixScene({ nav, univers, genre, value, onPick, onNext }: {
  nav: Nav;
  univers: ChoixUnivers;
  genre: 'h' | 'f';
  value: string | null;
  onPick: (id: string) => void;
  onNext: () => void;
}) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const liste = scenesProposees(univers);
  const choisie = value && liste.some((s) => s.id === value && s.ouverte) ? value : sceneParDefaut(univers);
  const [vue, setVue] = useState<string>(choisie);
  const montree = liste.find((s) => s.id === vue) ?? liste[0];
  const W = width - GUTTER * 2;
  const H = Math.round(W * 0.56);
  const perso = illustrationUnivers(univers, genre, 0, true).perso;
  const colW = Math.floor((W - 10) / 2);
  return (
    <Shell {...nav} gap={12} title={traduire('Ta **scène**')} sub={traduire('Le décor de ton accueil. Touche pour voir, tu pourras changer dans Réglages, Personnaliser.')} footer={<MainButton label={traduire('Continuer')} onPress={onNext} />}>
      <View style={{ borderRadius: 24, overflow: 'hidden', height: H }}>
        {montree.anim ? (
          <SceneAnimee key={montree.id} scene={montree.anim as never} source={montree.image} width={W} height={H} borderRadius={24} />
        ) : (
          <Animated.Image key={montree.id} entering={FadeIn.duration(350)} source={montree.image} resizeMode="cover" style={{ width: W, height: H }} accessibilityIgnoresInvertColors />
        )}
        {perso ? <Image source={perso} resizeMode="contain" style={{ position: 'absolute', right: 6, bottom: 0, width: Math.round(H * 0.62), height: H - 10 }} accessibilityIgnoresInvertColors /> : null}
        <View style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
          {montree.ouverte ? null : <Icon name="crown" size={13} color="#A57A1C" />}
          <Ink size={13} weight="black" color={c.ink}>{montree.nom}</Ink>
        </View>
      </View>
      {montree.ouverte ? null : (
        <Animated.View entering={FadeIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, backgroundColor: '#F6EEDD', paddingHorizontal: 12, paddingVertical: 10 }}>
          <Icon name="crown" size={15} color="#A57A1C" />
          <Ink size={13} weight="bold" color="#7A5200" style={{ flex: 1, lineHeight: 18 }}>{traduire('Scène Premium, animée. Ton accueil garde ta scène offerte en attendant.')}</Ink>
        </Animated.View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {liste.map((s) => {
          const on = s.ouverte && s.id === choisie;
          const regardee = s.id === vue;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                tap('medium');
                setVue(s.id);
                if (s.ouverte) onPick(s.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={s.ouverte ? s.nom : traduire('{0}, avec Premium', s.nom)}
              style={{ width: colW }}
            >
              <View style={{ borderRadius: 18, overflow: 'hidden', borderWidth: on ? 3 : regardee ? 2 : 0, borderColor: on ? '#23358F' : '#C9D3FB' }}>
                <Image source={s.image} resizeMode="cover" style={{ width: '100%', height: Math.round(colW * 0.62) }} accessibilityIgnoresInvertColors />
                {on ? (
                  <View style={{ position: 'absolute', top: 7, right: 7, width: 26, height: 26, borderRadius: 13, backgroundColor: '#23358F', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={14} color="#FFFFFF" stroke={3} />
                  </View>
                ) : null}
                {s.ouverte ? null : (
                  <View style={{ position: 'absolute', top: 7, right: 7, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF1C7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Icon name="crown" size={11} color="#7A5200" />
                    <Ink size={10.5} weight="black" color="#7A5200">{s.anim ? traduire('Animée') : 'Premium'}</Ink>
                  </View>
                )}
              </View>
              <Ink size={12.5} weight={on ? 'black' : 'bold'} color={on ? '#23358F' : c.ink} numberOfLines={1} style={{ marginTop: 4, paddingHorizontal: 2 }}>{s.nom}</Ink>
            </Pressable>
          );
        })}
      </View>
    </Shell>
  );
}

export default ChoixScene;
