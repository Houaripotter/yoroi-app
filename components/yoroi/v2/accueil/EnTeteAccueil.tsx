/**
 * En-tete de l'accueil (27 octobre 2026, refonte Pastel, maquette Pastel-Final-Accueil choisie par Houari).
 * Sur le fond de la page, au dessus de la carte de la scene : ta photo (ou ton personnage) dans un rond de 48 avec une
 * ombre douce, la porte vers Reglages ; la date en petit (« Mardi 27 octobre ») au dessus de ton salut en gras ; a
 * droite, la lanterne (clair, sombre, auto) et la cloche des notifications, chacune dans un rond blanc en relief.
 * Avant, tout cela etait pose sur la scene (accueil/Scene.tsx, bandeau du bas et petits ronds translucides).
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { libelleMode } from '@/components/yoroi/YoroiThemeProvider';
import type { YoroiMode } from '@/components/yoroi/tokens';
import { ENTETE_PASTEL } from '@/lib/v2/saisons/geometrie';
import { ENTREE, P } from './kit';
import { LanterneMode } from './Lanterne';
import { NotifBell } from './NotifBell';
import { RondProfil, dateDuJour, greeting } from './Scene';
import { traduire } from '@/lib/i18n/tr';

export function EnTeteAccueil({ name, photo, personnage, rankIndex }: { name: string | null; photo: string | null; personnage: string; rankIndex: number }) {
  const [toast, setToast] = React.useState<YoroiMode | null>(null);
  const minuteur = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);
  const montrerMode = (m: YoroiMode) => {
    setToast(m);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setToast(null), 1600);
  };
  return (
    <Animated.View entering={ENTREE} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: ENTETE_PASTEL.rangee }}>
      <TourAnchor id="accueil.profil" rayon="rond">
        <RondProfil photo={photo} personnage={personnage} rankIndex={rankIndex} nom={name} taille={ENTETE_PASTEL.rangee} />
      </TourAnchor>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1}>
          {dateDuJour()}
        </Ink>
        <Ink size={21} weight="black" tight color={P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header" style={{ letterSpacing: -0.3 }}>
          {`${greeting()}, ${name ?? traduire('Athlète')}`}
        </Ink>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TourAnchor id="accueil.lanterne">
          <LanterneMode sceneSombre={false} relief onChange={montrerMode} />
        </TourAnchor>
        <NotifBell relief />
      </View>
      {toast ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(220)} pointerEvents="none" style={{ position: 'absolute', right: 0, top: ENTETE_PASTEL.rangee + 6, paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: P.ink, zIndex: 5 }}>
          <Ink size={12} weight="bold" color={P.paper} numberOfLines={1}>
            {libelleMode(toast)}
          </Ink>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
