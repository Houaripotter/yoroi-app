/**
 * La carte de l'accueil qui propose le coach, une seule fois, après la visite guidée (26 octobre 2026).
 * Règle et stockage : lib/v2/onboarding/propositionCoach.ts. Oui : app/coach-depart.tsx (le coach garde sa logique,
 * rien ne lance une séance). Plus tard : la carte disparaît et ne revient plus, le coach reste dans son onglet.
 * Montée sur l'accueil (app/(tabs)/index.tsx), sous la carte Poids.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { BoutonIllustre, CarteIllustree } from '@/components/yoroi/v2/programmes/Habillage';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { isVisiteDone } from '@/components/yoroi/v2/tour/keys';
import { lireDepart } from '@/lib/v2/programmes/depart';
import { lireProposition, proposerCoach, repondreProposition } from '@/lib/v2/onboarding/propositionCoach';
import { traduire } from '@/lib/i18n/tr';

export function PropositionCoach() {
  const router = useRouter();
  const enCours = useVisiteEnCours();
  const [montre, setMontre] = useState(false);
  const [verif, setVerif] = useState(0);

  const verifier = useCallback(async (): Promise<boolean> => {
    const [etat, visiteFaite, depart] = await Promise.all([lireProposition(), isVisiteDone(), lireDepart().catch(() => null)]);
    return proposerCoach({ etat, visiteFaite, visiteEnCours: enCours, depart });
  }, [enCours]);

  // a chaque retour sur l'accueil, et juste apres la fin de la visite (le temps qu'elle soit notee)
  useFocusEffect(
    useCallback(() => {
      setVerif((x) => x + 1);
    }, []),
  );
  useEffect(() => {
    if (enCours) {
      setMontre(false);
      return;
    }
    let vivant = true;
    const t = setTimeout(() => {
      void verifier()
        .then((ok) => {
          if (vivant) setMontre(ok);
        })
        .catch(() => undefined);
    }, 900);
    return () => {
      vivant = false;
      clearTimeout(t);
    };
  }, [enCours, verif, verifier]);

  if (!montre) return null;

  const oui = () => {
    tap();
    setMontre(false);
    void repondreProposition('oui').finally(() => router.push({ pathname: '/coach-depart' as any, params: { depuis: 'visite' } }));
  };
  const plusTard = () => {
    tap();
    setMontre(false);
    void repondreProposition('plus_tard');
  };

  return (
    <Animated.View entering={FadeInDown.duration(380)} exiting={FadeOut.duration(180)}>
      <CarteIllustree
        surtitre={traduire('Quand tu veux')}
        titre={traduire('Ton coach peut te préparer un programme')}
        texte={traduire('Il reprend tes objectifs, tes jours et tes sports. Sinon, il t’attend dans tes outils, en haut de l’accueil.')}
        style={{ minHeight: 0 }}
      >
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <BoutonIllustre label={traduire('Oui')} icone="list" onPress={oui} accessibilityLabel={traduire('Oui, préparer mon programme avec le coach')} />
          </View>
          <View style={{ flex: 1 }}>
            <BoutonIllustre label={traduire('Plus tard')} discret onPress={plusTard} />
          </View>
        </View>
      </CarteIllustree>
    </Animated.View>
  );
}

export default PropositionCoach;
