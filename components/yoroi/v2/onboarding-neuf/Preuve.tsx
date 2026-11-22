/**
 * onboarding-neuf/Preuve.tsx : la preuve sociale, copiee d'INRO (components/onboarding-nuit/Preuve.tsx).
 *
 * Tout est centre : la pastille entre deux lauriers or (0 ms, 600 ms), le titre (650 ms), la note qui monte de 0
 * jusqu'a la vraie note (1 100 ms, apres 900 ms) avec le vrai nombre de notes, puis les vrais avis mot pour mot,
 * avec le logo du store d'ou ils viennent, en alternant gauche et droite (des 1 150 ms puis toutes les 380 ms).
 * Le bouton arrive en dernier. Chaque element : fondu et montee de 14 points en 480 ms.
 *
 * Rien n'est invente : tout vient de lib/v2/premium/preuveSociale.ts (releve sur les stores). Aucun nombre
 * d'utilisateurs ni de telechargements. Tous les avis viennent de l'App Store : aucun logo Google Play a cote d'un avis.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Laurier } from '@/components/yoroi/v2/premium/Preuve';
import { LogoMarque } from '@/components/yoroi/v2/onboarding/LogosMarques';
import { storeRating } from '@/lib/v2/premium/offer';
import { AVIS_STORES, type AvisStore } from '@/lib/v2/premium/preuveSociale';
import { DECIMAL, traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Bouton, Ecran, ND, Txt } from './kit';
import { FONT, useNuit, type Palette } from './theme';

function useEntree(delai: number, duree = 480) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: duree, delay: delai, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [v, delai, duree]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };
}

export function Etoiles({ taille, couleur }: { taille: number; couleur: string }) {
  return <Txt style={{ fontSize: taille, letterSpacing: taille * 0.15, color: couleur }}>★★★★★</Txt>;
}

function Avis({ avis, droite, delai, T }: { avis: AvisStore; droite: boolean; delai: number; T: Palette }) {
  const style = useEntree(delai);
  const play = avis.store === 'Google Play';
  const pastille = (
    <View style={[st.avatar, { borderColor: T.line }]}>
      <LogoMarque id={play ? 'google_play' : 'app_store'} taille={44} />
    </View>
  );
  return (
    <Animated.View style={[st.avis, style]}>
      {droite ? null : pastille}
      <View style={{ flex: 1 }}>
        <Etoiles taille={11} couleur={T.orFonce} />
        <Txt style={[st.avisTxt, { color: T.ink }]}>{`« ${avis.texte} »`}</Txt>
        <View style={st.signature}>
          <View style={[st.trait, { backgroundColor: T.line }]} />
          <Txt style={[st.auteur, { color: T.sub }]}>{`${avis.pseudo} · ${avis.store}`}</Txt>
        </View>
      </View>
      {droite ? pastille : null}
    </Animated.View>
  );
}

export function Preuve({ onNext }: { onNext: () => void }) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const note = storeRating();
  const badge = useEntree(0, 600);
  const titre = useEntree(650);
  const pastille = useEntree(850);
  const bouton = useEntree(950 + 3 * 380 + 200);

  const cible = note ? Number(note.note.replace(DECIMAL, '.')) : 0;
  const [monte, setMonte] = useState(0);
  useEffect(() => {
    if (!cible) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      const t0 = Date.now();
      id = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / 1100);
        setMonte(cible * (1 - Math.pow(1 - k, 3)));
        if (k >= 1 && id) clearInterval(id);
      }, 33);
    }, 900);
    return () => {
      clearTimeout(t);
      if (id) clearInterval(id);
    };
  }, [cible]);
  const noteTxt = note && monte >= cible ? note.note : monte.toFixed(1).replace('.', DECIMAL);

  return (
    <Ecran>
      <ScrollView contentContainerStyle={[st.corps, { paddingTop: 28 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={[st.badge, badge]}>
          <Laurier height={58} color={T.orFonce} />
          <View style={{ alignItems: 'center', paddingHorizontal: 6 }}>
            <Txt style={[st.badgeTxt, { color: T.ink }]}>APP STORE · GOOGLE PLAY</Txt>
            <Etoiles taille={15} couleur={T.orFonce} />
          </View>
          <Laurier height={58} color={T.orFonce} mirrored />
        </Animated.View>

        <Animated.View style={titre}>
          <Txt style={[st.titre, { color: T.ink }]}>{traduire('Ils l’ont déjà dans la poche')}</Txt>
        </Animated.View>

        {note ? (
          <Animated.View style={[st.pastille, { backgroundColor: T.acc }, pastille]}>
            <Txt style={[st.pastilleChiffre, { color: T.accInk }]}>{`${noteTxt} / 5`}</Txt>
            <Txt style={[st.pastilleSous, { color: T.accInk }]}>{traduirePluriel(note.total, note.total > 1, '{0} NOTE SUR LES STORES', '{0} NOTES SUR LES STORES', note.total)}</Txt>
          </Animated.View>
        ) : null}

        <View style={st.liste}>
          {AVIS_STORES.map((a, i) => (
            <Avis key={a.pseudo} avis={a} droite={i % 2 === 1} delai={1150 + Math.min(i, 4) * 380} T={T} />
          ))}
        </View>
      </ScrollView>

      <Animated.View style={[st.bas, { paddingBottom: Math.max(insets.bottom, 14) + 6 }, bouton]}>
        <Bouton label={traduire('Continuer')} onPress={onNext} />
      </Animated.View>
    </Ecran>
  );
}

const st = StyleSheet.create({
  corps: { paddingHorizontal: 22, paddingBottom: 24, alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: FONT.titreBold, fontSize: 12.5, letterSpacing: 0.8 },
  titre: { fontFamily: FONT.titre, fontSize: 27, lineHeight: 32, letterSpacing: -0.4, textAlign: 'center', marginTop: 18, maxWidth: 330 },
  pastille: { marginTop: 22, borderRadius: 20, paddingHorizontal: 26, paddingVertical: 12, alignItems: 'center', minWidth: 190 },
  pastilleChiffre: { fontFamily: FONT.titre, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  pastilleSous: { fontFamily: FONT.texteSemi, fontSize: 11.5, letterSpacing: 1, opacity: 0.85, marginTop: 2 },
  liste: { alignSelf: 'stretch', marginTop: 26, gap: 22 },
  avis: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#FFFFFF' },
  avisTxt: { fontFamily: FONT.texte, fontSize: 14, lineHeight: 20, marginTop: 4 },
  signature: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  trait: { width: 14, height: 1 },
  auteur: { fontFamily: FONT.texteMedium, fontSize: 12, fontStyle: 'italic' },
  bas: { paddingHorizontal: 22, paddingTop: 8 },
});
