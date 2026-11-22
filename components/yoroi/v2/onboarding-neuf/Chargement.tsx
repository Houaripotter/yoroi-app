/**
 * onboarding-neuf/Chargement.tsx : « On prépare ton plan », copie du chargement d'INRO
 * (components/onboarding-nuit/Chargement.tsx), environ huit secondes, une seule horloge (toutes les 100 ms).
 *
 * Ici le chargement fait vraiment le travail : il lance l'enregistrement final qui existe deja (profil, pesee,
 * reglages, rappels, scene, armure : la fonction run, la meme que l'ancienne preparation). « Tout est prêt »
 * n'arrive qu'une fois l'enregistrement fini ; en cas d'echec, la fenetre « Réessayer ».
 *
 * 1. Trois etapes en haut, qui se cochent (0 a 1 900, 1 900 a 4 300, 4 300 a 7 200).
 * 2. Pendant les deux premieres : ton prenom (en grand, teinte) et tes reponses en pastilles inclinees qui
 *    apparaissent une par une (350 ms puis toutes les 400 ms) et derivent doucement ; deux miniatures de vrais
 *    ecrans de l'app flottent a droite.
 * 3. A 4 300 les pastilles s'effacent ; a 4 650, quatre vrais ecrans de YOROI arrivent en grille, floutes.
 * 4. A 7 500 « Tout est prêt, Prenom » ; a 8 000 le bouton. Tout du long, un vrai avis a la fois, toutes les 2,6 s.
 * 5. 22 novembre 2026 : apres une reprise depuis une autre app, une carte au-dessus de l'avis dit ce qui a ete
 *    recupere, avec les vrais chiffres de la reprise (FinReprise). Un chiffre inconnu ne s'affiche pas : une phrase
 *    sans chiffre a la place.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AVIS_STORES } from '@/lib/v2/premium/preuveSociale';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Alerte, Bouton, Ecran, ND, Txt, alpha } from './kit';
import { ECRANS_APP, FONT, useNuit, type Palette } from './theme';

const BORNES = [
  { debut: 0, fin: 1900 },
  { debut: 1900, fin: 4300 },
  { debut: 4300, fin: 7200 },
];
const T_PASTILLES_FIN = 4300;
const T_CARTES = 4650;
const T_PRET = 7500;
const T_BOUTON = 8000;

const PLACES: [number, number, number][] = [
  [0.06, 0.04, -4], [0.5, 0.11, 3], [0.2, 0.26, -2], [0.47, 0.37, 4],
  [0.05, 0.5, 2.5], [0.4, 0.61, -4], [0.08, 0.75, 3], [0.45, 0.86, -3],
];
const MINIS: { ecran: number; x: number; y: number; r: number }[] = [
  { ecran: 0, x: 0.72, y: 0.18, r: 7 },
  { ecran: 1, x: 0.74, y: 0.6, r: -6 },
];

function Flottant({ delai, x, y, r, graine, children }: { delai: number; x: number; y: number; r: number; graine: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  const d = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const entree = Animated.timing(v, { toValue: 1, duration: 520, delay: delai, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    const duree = 2200 + (graine % 4) * 350;
    const derive = Animated.loop(
      Animated.sequence([
        Animated.timing(d, { toValue: 1, duration: duree, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        Animated.timing(d, { toValue: 0, duration: duree, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      ]),
    );
    entree.start();
    derive.start();
    return () => {
      entree.stop();
      derive.stop();
    };
  }, [v, d, delai, graine]);
  const sens = graine % 2 === 0 ? 1 : -1;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: v,
        transform: [
          { translateY: Animated.add(v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }), d.interpolate({ inputRange: [0, 1], outputRange: [-5 * sens, 5 * sens] })) },
          { translateX: d.interpolate({ inputRange: [0, 1], outputRange: [-3 * sens, 3 * sens] }) },
          { rotate: `${r}deg` },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function Etape({ texte, etat, T }: { texte: string; etat: 'avenir' | 'encours' | 'fait'; T: Palette }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (etat === 'avenir') return;
    Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
  }, [etat, v]);
  return (
    <Animated.View style={[st.etape, { opacity: v }]}>
      <View style={st.etapeIcone}>
        {etat === 'fait' ? (
          <View style={[st.coche, { backgroundColor: T.acc }]}>
            <Ionicons name="checkmark" size={12} color={T.accInk} />
          </View>
        ) : (
          <ActivityIndicator size="small" color={T.ink} />
        )}
      </View>
      <Txt style={[st.etapeTxt, { color: etat === 'fait' ? T.sub : T.ink }]}>{texte}</Txt>
    </Animated.View>
  );
}

function CarteFloue({ ecran, largeur, hauteur, delai, T }: { ecran: { src: ImageSourcePropType; ratio: number }; largeur: number; hauteur: number; delai: number; T: Palette }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 520, delay: delai, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [v, delai]);
  const ih = Math.max(hauteur, largeur / ecran.ratio);
  const iw = ih * ecran.ratio;
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }}>
      <View style={[st.carte, { width: largeur, height: hauteur, backgroundColor: T.card, borderColor: T.line }]}>
        <Image source={ecran.src} blurRadius={22} style={{ position: 'absolute', width: iw, height: ih, left: (largeur - iw) / 2, top: 0 }} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(T.bg, 0.28) }]} />
        <View style={st.barres}>
          <View style={[st.barre, { width: largeur * 0.34, backgroundColor: alpha(T.ink, 0.32) }]} />
          <View style={[st.barre, { width: largeur * 0.22, height: 7, backgroundColor: alpha(T.ink, 0.2) }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const AVIS_MS = 2600;
function AvisDefilants({ T }: { T: Palette }) {
  const liste = AVIS_STORES.filter((r) => r.texte.length <= 150);
  const [n, setN] = useState(0);
  const fondu = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x + 1) % Math.max(1, liste.length)), AVIS_MS);
    return () => clearInterval(id);
  }, [liste.length]);
  useEffect(() => {
    fondu.setValue(0);
    Animated.timing(fondu, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
  }, [n, fondu]);
  const a = liste[n];
  if (!a) return null;
  return (
    <Animated.View style={[st.avis, { backgroundColor: T.card, borderColor: T.line, opacity: fondu }]}>
      <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
        {[0, 1, 2, 3, 4].map((k) => <Ionicons key={k} name="star" size={12} color={T.orFonce} />)}
      </View>
      <Txt style={[st.avisTxt, { color: T.ink }]} numberOfLines={3}>{`« ${a.texte} »`}</Txt>
      <Txt style={[st.avisNom, { color: T.sub }]} numberOfLines={1}>{`${a.pseudo} · ${a.store}`}</Txt>
    </Animated.View>
  );
}

/** Ce que la reprise a vraiment recupere (null : inconnu, rien d'affiche en chiffre) */
export type RepriseVue = { seances: number | null; exercices: number | null };

function CarteReprise({ reprise, T }: { reprise: RepriseVue; T: Palette }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 420, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [v]);
  const s = reprise.seances && reprise.seances > 0 ? reprise.seances : null;
  const x = s && reprise.exercices && reprise.exercices > 0 ? reprise.exercices : null;
  return (
    <Animated.View style={[st.reprise, { backgroundColor: alpha(T.acc, 0.07), borderColor: alpha(T.acc, 0.28), opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      <View style={[st.cocheGrande, { backgroundColor: T.acc }]}>
        <Ionicons name="checkmark" size={16} color={T.accInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={[st.repriseTitre, { color: T.ink }]} numberOfLines={2}>
          {s ? traduirePluriel(s, s > 1, '{0} séance récupérée', '{0} séances récupérées', s) : traduire('Tes séances sont dans YOROI')}
        </Txt>
        {x ? <Txt style={[st.repriseSous, { color: T.sub }]} numberOfLines={1}>{traduirePluriel(x, x > 1, '{0} exercice récupéré', '{0} exercices récupérés', x)}</Txt> : null}
      </View>
    </Animated.View>
  );
}

export function Chargement({ prenom, reponses, etapes, run, onNext, reprise }: {
  prenom: string;
  reponses: string[];
  /** les trois etapes (reponses.ts, etapesChargement) */
  etapes: string[];
  /** l'enregistrement final (une seule fois ; il se refait sans doublon) */
  run: () => Promise<void>;
  onNext: () => void;
  /** apres une reprise depuis une autre app : ce qui a ete recupere (absent sinon) */
  reprise?: RepriseVue | null;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const [t, setT] = useState(0);
  const [scene, setScene] = useState({ w: 0, h: 0 });
  const [fini, setFini] = useState(false);
  const [echec, setEchec] = useState(false);
  const [essai, setEssai] = useState(0);
  const p = prenom.trim();

  // l'enregistrement final, lance a l'arrivee (et a chaque « Réessayer »)
  useEffect(() => {
    let vivant = true;
    setFini(false);
    run()
      .then(() => vivant && setFini(true))
      .catch(() => vivant && setEchec(true));
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essai]);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const e = Date.now() - t0;
      setT(e);
      if (e > T_BOUTON + 200) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);

  // l'horloge attend l'enregistrement : « Tout est prêt » seulement quand c'est vraiment pret
  const tVu = fini ? t : Math.min(t, T_PRET - 300);

  const pastilles = useMemo(() => {
    const vues = new Set<string>();
    const out: { texte: string; prenom: boolean }[] = [];
    if (p) {
      out.push({ texte: p, prenom: true });
      vues.add(p.toLowerCase());
    }
    reponses.forEach((r) => {
      const x = (r ?? '').trim();
      if (!x || vues.has(x.toLowerCase())) return;
      vues.add(x.toLowerCase());
      out.push({ texte: x, prenom: false });
    });
    return out.slice(0, PLACES.length);
  }, [p, reponses]);

  const sortiePastilles = useRef(new Animated.Value(1)).current;
  const etapesVues = useRef(new Animated.Value(1)).current;
  const pret = useRef(new Animated.Value(0)).current;
  const bouton = useRef(new Animated.Value(0)).current;
  const sortiFait = useRef(false);
  const pretFait = useRef(false);
  const boutonFait = useRef(false);
  const tBouton = fini && t >= T_BOUTON;
  useEffect(() => {
    if (tVu >= T_PASTILLES_FIN && !sortiFait.current) {
      sortiFait.current = true;
      Animated.timing(sortiePastilles, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: ND }).start();
    }
    if (fini && tVu >= T_PRET && !pretFait.current) {
      pretFait.current = true;
      Animated.sequence([
        Animated.timing(etapesVues, { toValue: 0, duration: 220, useNativeDriver: ND }),
        Animated.timing(pret, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
      ]).start();
    }
    if (tBouton && !boutonFait.current) {
      boutonFait.current = true;
      Animated.timing(bouton, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
    }
  }, [tVu, fini, tBouton, sortiePastilles, etapesVues, pret, bouton]);

  const gw = scene.w > 0 ? Math.floor((scene.w - 40 - 12) / 2) : 0;
  const gh = scene.h > 0 ? Math.min(Math.round(gw * 1.22), Math.floor((scene.h - 12 - 16) / 2)) : 0;

  return (
    <Ecran>
      <View style={st.haut}>
        <Animated.View style={{ opacity: etapesVues, gap: 12 }}>
          {etapes.map((texte, i) => (
            <Etape key={texte} texte={texte} etat={tVu >= BORNES[i].fin ? 'fait' : tVu >= BORNES[i].debut ? 'encours' : 'avenir'} T={T} />
          ))}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[st.pret, { opacity: pret, transform: [{ translateY: pret.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
          <View style={[st.cocheGrande, { backgroundColor: T.acc }]}>
            <Ionicons name="checkmark" size={16} color={T.accInk} />
          </View>
          <Txt style={[st.pretTxt, { color: T.ink }]} numberOfLines={2}>
            {p ? (
              <>
                {traduire('Tout est prêt, {0}', '\u0000').split('\u0000')[0]}
                <Txt style={{ color: T.acc }}>{p}</Txt>
                {traduire('Tout est prêt, {0}', '\u0000').split('\u0000')[1] ?? ''}
              </>
            ) : (
              traduire('Tout est prêt')
            )}
          </Txt>
        </Animated.View>
      </View>

      <View style={st.scene} onLayout={(e: LayoutChangeEvent) => setScene({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {scene.w > 0 && tVu < T_PASTILLES_FIN + 500 ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: sortiePastilles }]}>
            {MINIS.map((m, i) => {
              const lw = 88;
              const e = ECRANS_APP[m.ecran];
              return (
                <Flottant key={`mini${i}`} delai={1300 + i * 900} x={m.x * scene.w} y={m.y * scene.h} r={m.r} graine={i + 3}>
                  <View style={[st.mini, { width: lw, height: lw / e.ratio, borderColor: T.line, backgroundColor: T.card }]}>
                    <Image source={e.src} style={{ width: lw, height: lw / e.ratio }} resizeMode="cover" />
                  </View>
                </Flottant>
              );
            })}
            {pastilles.map((pa, i) => {
              const [x, y, r] = PLACES[i];
              return (
                <Flottant key={pa.texte} delai={350 + i * 400} x={x * scene.w} y={y * scene.h} r={r} graine={i}>
                  <View style={[st.pastille, { maxWidth: scene.w * 0.62 }, pa.prenom ? { backgroundColor: alpha(T.acc, 0.14), borderColor: alpha(T.acc, 0.5) } : { backgroundColor: T.card, borderColor: T.line }]}>
                    <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[st.pastilleTxt, pa.prenom && st.pastillePrenom, { color: pa.prenom ? T.acc : T.ink }]}>{pa.texte}</Txt>
                  </View>
                </Flottant>
              );
            })}
          </Animated.View>
        ) : null}

        {gw > 0 && tVu >= T_CARTES - 50 ? (
          <View style={st.grille}>
            {ECRANS_APP.map((e, i) => (
              <CarteFloue key={i} ecran={e} largeur={gw} hauteur={gh} delai={i * 260} T={T} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        {reprise ? <CarteReprise reprise={reprise} T={T} /> : null}
        <AvisDefilants T={T} />
      </View>

      <Animated.View
        pointerEvents={tBouton ? 'auto' : 'none'}
        style={[st.bas, { paddingBottom: Math.max(insets.bottom, 14) + 6, opacity: bouton, transform: [{ translateY: bouton.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
      >
        <Bouton label={traduire('Continuer')} onPress={onNext} />
      </Animated.View>

      <Alerte
        visible={echec}
        titre={traduire('Enregistrement impossible')}
        texte={traduire('Ton profil n’a pas pu être enregistré. Réessaie.')}
        boutons={[{ label: traduire('Réessayer'), principal: true, onPress: () => setEssai((x) => x + 1) }]}
        onFerme={() => setEchec(false)}
      />
    </Ecran>
  );
}

const st = StyleSheet.create({
  haut: { paddingHorizontal: 22, paddingTop: 34, minHeight: 140 },
  etape: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  etapeIcone: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  coche: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  etapeTxt: { flex: 1, fontFamily: FONT.texteSemi, fontSize: 16 },
  pret: { position: 'absolute', left: 22, right: 22, top: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  cocheGrande: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pretTxt: { flexShrink: 1, fontFamily: FONT.titre, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  scene: { flex: 1, overflow: 'hidden' },
  pastille: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#1D2033', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  pastilleTxt: { fontFamily: FONT.titreBold, fontSize: 19, letterSpacing: -0.2 },
  pastillePrenom: { fontFamily: FONT.titre, fontSize: 26, letterSpacing: -0.4 },
  mini: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  grille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: 12, paddingHorizontal: 20, flex: 1, paddingBottom: 16 },
  carte: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  barres: { position: 'absolute', left: 14, bottom: 16, gap: 6 },
  barre: { height: 11, borderRadius: 4 },
  bas: { paddingHorizontal: 20, paddingTop: 8 },
  avis: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, minHeight: 96 },
  avisTxt: { fontFamily: FONT.texte, fontSize: 13.5, lineHeight: 19 },
  avisNom: { fontFamily: FONT.texteSemi, fontSize: 12, marginTop: 4 },
  reprise: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  repriseTitre: { fontFamily: FONT.titreBold, fontSize: 17, lineHeight: 22 },
  repriseSous: { fontFamily: FONT.texteSemi, fontSize: 14, lineHeight: 19, marginTop: 1 },
});
