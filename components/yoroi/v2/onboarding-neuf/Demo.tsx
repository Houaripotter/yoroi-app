/**
 * onboarding-neuf/Demo.tsx : « Voilà ce qui t'attend », copie d'INRO (components/onboarding-nuit/Demo.tsx).
 *
 * Trois onglets touchables en pastilles. L'onglet en cours se remplit de gauche a droite en 9 000 ms ; « Continuer »
 * s'allume apres 1 500 ms et passe a l'onglet suivant, puis a l'ecran d'apres. Changement d'onglet : fondu de 300 ms.
 * Dans le cadre, une main montre ou toucher.
 *  1. Ton poids : la vraie carte Poids de l'accueil (CartePoids), avec ta pesee et ton cap.
 *  2. Ta seance : la serie qui se coche, le repos qui se lance tout seul (marque « Exemple »).
 *  3. Selon tes sports : le chrono de rounds avec les claquettes a 10 s de la fin, ou la silhouette des
 *     mensurations (vrai composant Silhouette).
 * Les chiffres d'exemple sont marques « Exemple » ; la carte Poids suit ta vraie pesee et ton cap.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CartePoids } from '@/components/yoroi/v2/accueil/CartePoids';
import { Silhouette, type SilhouetteItem } from '@/components/yoroi/v2/progres/Silhouette';
import { projectedSeries } from '@/components/yoroi/v2/onboarding/Demo';
import { addDaysIso, isoOf } from '@/lib/v2/onboarding/plan';
import { COMBAT_SPORTS } from '@/lib/sports';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { traduire } from '@/lib/i18n/tr';
import { kg } from '@/components/yoroi/v2/onboarding/ui';
import { Bouton, Ecran, Haut, ND, Sticker, Txt, alpha, vibre } from './kit';
import { FONT, useNuit, type Palette } from './theme';

export type OngletDemo = 'poids' | 'seance' | 'rounds' | 'mensurations';

/** Le troisieme onglet suit tes sports : les rounds si tu fais du combat, sinon les mensurations */
export function ongletsDemo(sports: string[], objectifs: string[]): OngletDemo[] {
  const combat = objectifs.includes('combat') || sports.some((s) => COMBAT_SPORTS.some((c) => c.id === s));
  return ['poids', 'seance', combat ? 'rounds' : 'mensurations'];
}

/** La main qui montre ou toucher : elle arrive, appuie, se retire, en boucle douce */
function Main({ x, y, delai = 900, periode = 3000 }: { x: number | string; y: number | string; delai?: number; periode?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(delai),
        Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
        Animated.timing(v, { toValue: 2, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.delay(Math.max(0, periode - delai - 1200)),
        Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v, delai, periode]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x as number,
        top: y as number,
        opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1, 2], outputRange: [26, 0, 3] }) },
          { scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1, 0.9] }) },
        ],
      }}
    >
      <View style={st.mainRond} />
      <Ionicons name="hand-left" size={40} color="#FFFFFF" style={st.mainOmbre} />
      <Ionicons name="hand-left-outline" size={40} color="#1D2033" style={{ position: 'absolute' }} />
    </Animated.View>
  );
}

function Exemple({ T }: { T: Palette }) {
  return (
    <View style={[st.exemple, { backgroundColor: T.bg, borderColor: T.line }]}>
      <Txt style={[st.exempleTxt, { color: T.sub }]}>{traduire('Exemple')}</Txt>
    </View>
  );
}

/* --------------------------------------------------------------- 1. poids */
function DemoPoids({ depart, cap, objectif, seances, recompo }: { depart: number; cap: number | null; objectif: Goal | null; seances: number; recompo: boolean }) {
  const ref = useMemo(() => addDaysIso(isoOf(new Date()), 28), []);
  const series = useMemo(() => projectedSeries(depart, cap, objectif, isoOf(new Date()), seances || null, recompo), [depart, cap, objectif, seances, recompo]);
  return (
    <View style={{ flex: 1, padding: 12 }} pointerEvents="none">
      <CartePoids series={series} targetWeight={objectif === 'maintain' ? null : cap} startWeight={depart} today={ref} />
      <Main x="62%" y={150} />
    </View>
  );
}

/* -------------------------------------------------------------- 2. seance */
const REPOS_S = 90;
function DemoSeance({ T }: { T: Palette }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setT(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, []);
  // la deuxieme serie se coche a 1,6 s, le repos se lance tout seul et descend
  const coche2 = t >= 1600;
  const reste = coche2 ? Math.max(0, REPOS_S - Math.floor((t - 1600) / 1000) * 6) : REPOS_S;
  const series = [
    { n: 1, charge: 80, reps: 8, fait: true },
    { n: 2, charge: 80, reps: 8, fait: coche2 },
    { n: 3, charge: 80, reps: 8, fait: false },
    { n: 4, charge: 80, reps: 8, fait: false },
  ];
  const mm = Math.floor(reste / 60);
  const ss = String(reste % 60).padStart(2, '0');
  return (
    <View style={{ flex: 1, padding: 14, gap: 10 }} pointerEvents="none">
      <View style={[st.carte, { backgroundColor: T.bg, borderColor: T.line }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Sticker nom="musculation" taille={40} />
          <View style={{ flex: 1 }}>
            <Txt style={[st.exo, { color: T.ink }]} numberOfLines={2}>{traduire('Développé Couché (Barre)')}</Txt>
            <Txt style={[st.petit, { color: T.sub }]}>{traduire('4 séries de 8')}</Txt>
          </View>
          <Exemple T={T} />
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {series.map((s) => (
            <View key={s.n} style={[st.serie, { backgroundColor: s.fait ? alpha(T.acc, 0.07) : T.card, borderColor: s.fait ? alpha(T.acc, 0.35) : T.line }]}>
              <Txt style={[st.serieN, { color: T.sub }]}>{traduire('Série {0}', s.n)}</Txt>
              <Txt style={[st.serieV, { color: T.ink }]}>{`${kg(s.charge)} kg`}</Txt>
              <Txt style={[st.serieV, { color: T.ink }]}>{`× ${s.reps}`}</Txt>
              <View style={[st.coche, { backgroundColor: s.fait ? T.acc : 'transparent', borderColor: s.fait ? T.acc : alpha(T.sub, 0.5) }]}>
                {s.fait ? <Ionicons name="checkmark" size={16} color={T.accInk} /> : null}
              </View>
            </View>
          ))}
        </View>
      </View>
      {coche2 ? (
        <View style={[st.repos, { backgroundColor: T.acc }]}>
          <Sticker nom="sablier" taille={30} />
          <View style={{ flex: 1 }}>
            <Txt style={[st.reposTitre, { color: T.accInk }]}>{traduire('Repos')}</Txt>
            <View style={st.reposPiste}>
              <View style={[st.reposRempli, { width: `${Math.round((reste / REPOS_S) * 100)}%` }]} />
            </View>
          </View>
          <Txt style={[st.reposCompte, { color: T.accInk }]}>{`${mm}:${ss}`}</Txt>
        </View>
      ) : null}
      <Main x="80%" y={coche2 ? 205 : 150} delai={500} periode={coche2 ? 9000 : 2200} />
    </View>
  );
}

/* -------------------------------------------------------------- 3. rounds */
function DemoRounds({ T }: { T: Palette }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setT(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, []);
  // un round de 3 min vu sur ses 18 dernieres secondes, en accelere : les claquettes a 10 s de la fin
  const reste = Math.max(0, 18 - Math.floor(t / 400));
  const claquettes = reste <= 10 && reste > 0;
  const fin = reste === 0;
  return (
    <View style={{ flex: 1, padding: 14 }} pointerEvents="none">
      <View style={[st.rounds, { backgroundColor: fin ? '#B0282E' : T.acc }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' }}>
          <Txt style={st.roundTitre}>{traduire('Round {0} sur {1}', 2, 5)}</Txt>
          <Exemple T={T} />
        </View>
        <Txt style={st.roundChrono}>{`0:${String(reste).padStart(2, '0')}`}</Txt>
        <View style={st.roundPiste}>
          <View style={[st.roundRempli, { width: `${Math.round(((180 - reste) / 180) * 100)}%` }]} />
        </View>
        <View style={[st.claquettes, { opacity: claquettes || fin ? 1 : 0.35 }]}>
          <Sticker nom="gong" taille={30} />
          <Txt style={st.claquettesTxt}>{fin ? traduire('Gong') : traduire('Les claquettes à 10 s de la fin')}</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          {[1, 2, 3, 4, 5].map((r) => (
            <View key={r} style={[st.point, { backgroundColor: r < 2 ? '#FFFFFF' : r === 2 ? T.or : 'rgba(255,255,255,0.3)' }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------- 3. mensurations */
const EXEMPLES_MENSURATIONS: { key: SilhouetteItem['key']; cm: number }[] = [
  { key: 'chest', cm: 102 },
  { key: 'waist', cm: 84 },
  { key: 'arm', cm: 36 },
  { key: 'hips', cm: 98 },
  { key: 'thigh', cm: 58 },
];
function DemoMensurations({ T }: { T: Palette }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setT(Date.now() - t0), 200);
    return () => clearInterval(id);
  }, []);
  const taille = t >= 1500;
  const items: SilhouetteItem[] = EXEMPLES_MENSURATIONS.map((m) => ({
    key: m.key,
    label: m.key === 'waist' ? traduire('Taille') : m.key === 'chest' ? traduire('Poitrine') : m.key === 'arm' ? traduire('Bras') : m.key === 'hips' ? traduire('Hanches') : traduire('Cuisse'),
    value: m.key === 'waist' && !taille ? traduire('à mesurer') : `${m.cm} cm`,
  }));
  return (
    <View style={{ flex: 1, padding: 10 }} pointerEvents="none">
      <View style={{ alignSelf: 'flex-end' }}>
        <Exemple T={T} />
      </View>
      <Silhouette items={items} height={300} active={taille ? 'waist' : null} />
      <Main x="40%" y={150} delai={600} periode={2800} />
    </View>
  );
}

/* ---------------------------------------------------------------- l'ecran */
function Onglet({ label, etat, progression, onPress, T }: { label: string; etat: 'fait' | 'encours' | 'avenir'; progression: Animated.Value; onPress: () => void; T: Palette }) {
  const largeur = etat === 'fait' ? '100%' : etat === 'avenir' ? '0%' : progression.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} accessibilityRole="tab" accessibilityState={{ selected: etat === 'encours' }} hitSlop={6}>
      <View style={[st.onglet, { backgroundColor: T.card, borderColor: etat === 'encours' ? T.acc : T.line }]}>
        <Animated.View style={[st.ongletPlein, { width: largeur, backgroundColor: alpha(T.acc, 0.2) }]} />
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[st.ongletTxt, { color: etat === 'encours' ? T.ink : T.sub }]}>{label}</Txt>
      </View>
    </Pressable>
  );
}

export function Demo({ onNext, onBack, onClose, depart, cap, objectif, objectifs, seances, sports, recompo, pageDepart = 0 }: {
  onNext: () => void;
  onBack: () => void;
  onClose?: () => void;
  depart: number;
  cap: number | null;
  objectif: Goal | null;
  objectifs: string[];
  seances: number;
  sports: string[];
  recompo: boolean;
  /** captures : l'onglet a montrer en premier */
  pageDepart?: number;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const onglets = useMemo(() => ongletsDemo(sports, objectifs), [sports, objectifs]);
  const [page, setPage] = useState(pageDepart);
  const [pret, setPret] = useState(false);
  const progression = useRef(new Animated.Value(0)).current;
  const fondu = useRef(new Animated.Value(1)).current;
  const id = onglets[page];
  const derniere = page === onglets.length - 1;

  const textes: Record<OngletDemo, { onglet: string; sous: string }> = {
    poids: { onglet: traduire('Ton poids'), sous: traduire('La tendance lisse l’eau et les repas : tu vois enfin la vraie courbe.') },
    seance: { onglet: traduire('Ta séance'), sous: traduire('Note ta série en un geste, le repos démarre seul.') },
    rounds: { onglet: traduire('Tes rounds'), sous: traduire('Tes rounds, ton repos, et les claquettes à 10 s de la fin.') },
    mensurations: { onglet: traduire('Tes mesures'), sous: traduire('Un tour de taille en un appui, sur la silhouette.') },
  };

  useEffect(() => {
    setPret(false);
    progression.setValue(0);
    fondu.setValue(0);
    Animated.timing(fondu, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
    const a = Animated.timing(progression, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: false });
    a.start();
    const t = setTimeout(() => setPret(true), 1500);
    return () => {
      a.stop();
      clearTimeout(t);
    };
  }, [page, progression, fondu]);

  const suivant = () => (derniere ? onNext() : setPage((p) => p + 1));
  const retour = () => (page === 0 ? onBack() : setPage((p) => p - 1));

  return (
    <Ecran>
      <Haut total={0} onBack={retour} onClose={onClose} />
      <View style={st.tete}>
        <Txt style={[st.titre, { color: T.ink }]}>{traduire('Voilà ce qui t’attend')}</Txt>
        <Animated.View style={{ opacity: fondu }}>
          <Txt style={[st.sous, { color: T.sub }]}>{textes[id].sous}</Txt>
        </Animated.View>
      </View>
      <View style={st.onglets}>
        {onglets.map((o, i) => (
          <Onglet
            key={o}
            label={textes[o].onglet}
            etat={i < page ? 'fait' : i === page ? 'encours' : 'avenir'}
            progression={progression}
            onPress={() => {
              vibre.choix();
              setPage(i);
            }}
            T={T}
          />
        ))}
      </View>
      <Animated.View style={[st.scene, { opacity: fondu, backgroundColor: T.card, borderColor: T.line }]}>
        {id === 'poids' ? <DemoPoids key="poids" depart={depart} cap={cap} objectif={objectif} seances={seances} recompo={recompo} /> : null}
        {id === 'seance' ? <DemoSeance key="seance" T={T} /> : null}
        {id === 'rounds' ? <DemoRounds key="rounds" T={T} /> : null}
        {id === 'mensurations' ? <DemoMensurations key="mensurations" T={T} /> : null}
      </Animated.View>
      <View style={[st.bas, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <Bouton label={traduire('Continuer')} onPress={suivant} actif={pret} />
      </View>
    </Ecran>
  );
}

const st = StyleSheet.create({
  tete: { paddingHorizontal: 22, paddingTop: 12 },
  titre: { fontFamily: FONT.titre, fontSize: 31, lineHeight: 36, letterSpacing: -0.5 },
  sous: { fontFamily: FONT.texte, fontSize: 14.5, lineHeight: 20, marginTop: 8, minHeight: 40 },
  onglets: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12 },
  onglet: { height: 38, borderRadius: 999, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ongletPlein: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  ongletTxt: { fontFamily: FONT.texteSemi, fontSize: 13.5, paddingHorizontal: 6 },
  scene: { flex: 1, marginTop: 14, marginBottom: 6, marginHorizontal: 12, borderRadius: 24, borderWidth: 1.5, overflow: 'hidden' },
  bas: { paddingHorizontal: 20, paddingTop: 8 },
  mainRond: { position: 'absolute', left: -6, top: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(35,53,143,0.18)' },
  mainOmbre: { textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6 },
  exemple: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  exempleTxt: { fontFamily: FONT.texteSemi, fontSize: 11 },
  carte: { borderRadius: 18, borderWidth: 1, padding: 14 },
  exo: { fontFamily: FONT.titreBold, fontSize: 16 },
  petit: { fontFamily: FONT.texte, fontSize: 12.5, marginTop: 1 },
  serie: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 46, gap: 10 },
  serieN: { flex: 1, fontFamily: FONT.texteSemi, fontSize: 13.5 },
  serieV: { width: 64, fontFamily: FONT.titreBold, fontSize: 15, textAlign: 'right' },
  coche: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  repos: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  reposTitre: { fontFamily: FONT.titreBold, fontSize: 14 },
  reposPiste: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 6, overflow: 'hidden' },
  reposRempli: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  reposCompte: { fontFamily: FONT.titre, fontSize: 24, fontVariant: ['tabular-nums'] },
  rounds: { flex: 1, borderRadius: 20, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 12 },
  roundTitre: { fontFamily: FONT.titreBold, fontSize: 15, color: '#FFFFFF', letterSpacing: 0.4 },
  roundChrono: { fontFamily: FONT.titre, fontSize: 92, lineHeight: 100, color: '#FFFFFF', letterSpacing: -3, fontVariant: ['tabular-nums'] },
  roundPiste: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  roundRempli: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  claquettes: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  claquettesTxt: { fontFamily: FONT.texteSemi, fontSize: 13.5, color: '#FFFFFF' },
  point: { width: 10, height: 10, borderRadius: 5 },
});
