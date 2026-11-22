/**
 * onboarding-neuf/FiltrePluie.tsx
 *
 * La pluie de stickers, copiee d'INRO (components/onboarding-nuit/FiltrePluie.tsx), avec ce que contient vraiment
 * YOROI (compteurs.ts). Chorégraphie en 4 temps, en millisecondes depuis l'arrivee :
 *  1. 0 a 3 300, la pluie : 13 a 20 stickers tombent (selon la hauteur de l'ecran), rangees en quinconce qui se
 *     remplissent par le bas ; le compteur monte de 0 au total (1 800 ms, courbe cubique).
 *  2. 3 300, le zoom arriere : la pluie retrecit a 35 % et s'efface (750 ms), la carte de toutes les familles
 *     arrive de pres (1,6 vers 1, 850 ms).
 *  3. 5 100, la plongee : la carte grossit de 1 a 3,6 (850 ms) pile sur la tuile du centre, les autres s'effacent,
 *     le compteur redescend au chiffre de ta famille et passe en couleur d'action.
 *  4. 5 950 puis 6 350 : le contenu final, puis le message et six cartes vraies.
 * Le hasard vient d'un generateur a graine fixe : la pluie est toujours la meme. Sans rebond. Si le telephone
 * demande moins de mouvement, tout s'affiche directement.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOCALE, traduire } from '@/lib/i18n/tr';
import { Bouton, Ecran, Haut, ND, Sticker, Txt } from './kit';
import { famillePlongee, familles, nombre, total, type FamilleContenu } from './compteurs';
import { FONT, useNuit } from './theme';

const T_ZOOM_OUT = 3300;
const T_DIVE = 5100;
const T_GATHER = 5950;
const T_MESSAGE = 6350;

/** Nombre de stickers selon la hauteur de l'ecran : chacun lisible, pas de fouillis */
export function nombreStickers(hauteur: number): number {
  if (hauteur >= 880) return 20;
  if (hauteur >= 780) return 18;
  if (hauteur >= 680) return 16;
  return 13;
}

export interface Goutte {
  delay: number;
  duration: number;
  fall: number;
  tilt: number;
  spin: number;
  drift: number;
  x: number;
  y: number;
  scale: number;
  z: number;
}

/** Rangees qui alternent 3 et 2 stickers, en quinconce ; ca se remplit par le bas, comme un verre */
export function gouttes(count: number, seed: number): Goutte[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const places: { x: number; rang: number }[] = [];
  for (let rang = 0; places.length < count; rang += 1) {
    const xs = rang % 2 === 0 ? [0, 0.5, 1] : [0.25, 0.75];
    for (const x of xs) if (places.length < count) places.push({ x, rang });
  }
  const rows = places.length ? places[places.length - 1].rang + 1 : 1;
  const borne = (v: number) => Math.max(0, Math.min(1, v));
  return Array.from({ length: count }, (_, i) => ({
    delay: ((rows - 1 - places[i].rang) / Math.max(1, rows - 1)) * 1700 + rnd() * 320,
    duration: 700 + rnd() * 300,
    fall: 420 + rnd() * 260,
    tilt: (rnd() - 0.5) * 22,
    spin: (rnd() - 0.5) * 120,
    drift: (rnd() - 0.5) * 50,
    x: borne(places[i].x + (rnd() - 0.5) * 0.06),
    y: borne((places[i].rang + (rnd() - 0.5) * 0.18) / Math.max(1, rows - 1)),
    scale: 0.92 + rnd() * 0.12,
    z: places[i].rang * 10 + Math.floor(rnd() * 9),
  }));
}

const PILL_W = 112;
const PILL_H = 104;

type ItemPluie = { label: string; famille: FamilleContenu };

const Pill = React.memo(function Pill({ it, drop, animate, place }: { it: ItemPluie; drop: Goutte; animate: boolean; place: { left: number; top: number } }) {
  const v = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    const a = Animated.timing(v, { toValue: 1, duration: drop.duration, delay: drop.delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [animate, drop.duration, drop.delay, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-drop.fall, 0] });
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [drop.drift, 0] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: [`${(drop.tilt + drop.spin).toFixed(1)}deg`, `${drop.tilt.toFixed(1)}deg`] });
  const appear = v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  return (
    <Animated.View
      style={[
        f.pill,
        { position: 'absolute', left: place.left, top: place.top, width: PILL_W, zIndex: drop.z, opacity: appear, transform: [{ translateY }, { translateX }, { rotate }, { scale: drop.scale }] },
      ]}
    >
      <Sticker nom={it.famille.sticker} taille={58} />
      <View style={f.etiquette}>
        <Txt style={[f.famille, { color: it.famille.couleur }]} numberOfLines={1}>{it.famille.famille}</Txt>
        <Txt style={f.pillTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{it.label}</Txt>
      </View>
    </Animated.View>
  );
});

function useCountUp(target: number, from: number, enabled: boolean, dur: number) {
  const [n, setN] = useState(enabled ? from : target);
  useEffect(() => {
    if (!enabled) {
      setN(target);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / dur);
      setN(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) clearInterval(id);
    }, 33);
    return () => clearInterval(id);
  }, [target, from, enabled, dur]);
  return n;
}

function useMoinsDeMouvement(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    let vivant = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => vivant && setR(!!v))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);
  return r;
}

function Tuile({ fam, width, height, fade }: { fam: FamilleContenu; width: number; height: number; fade: Animated.AnimatedInterpolation<number> }) {
  const T = useNuit();
  return (
    <Animated.View style={[f.tile, { width, height, opacity: fade, borderColor: T.line }]}>
      <Sticker nom={fam.sticker} taille={40} style={{ marginBottom: 2 }} />
      <Txt style={[f.tileNum, { color: T.ink }]}>{nombre(fam.n, LOCALE)}</Txt>
      <Txt style={[f.tileLab, { color: T.sub }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fam.label}</Txt>
    </Animated.View>
  );
}

export function FiltrePluie({ objectifs, sports, onNext, onBack, onClose }: { objectifs: string[]; sports: string[]; onNext: () => void; onBack: () => void; onClose?: () => void }) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const reduce = useMoinsDeMouvement();
  const animate = !reduce;
  const { height, width } = useWindowDimensions();
  const tileW = Math.floor((width - 32 - 24) / 4);
  const tileH = Math.round(Math.min(116, Math.max(84, height * 0.112)));
  const cloudMax = nombreStickers(height);
  const drops = useMemo(() => gouttes(cloudMax, 20260905), [cloudMax]);
  const [scene, setScene] = useState({ w: 0, h: 0 });

  const liste = useMemo(familles, []);
  const TOTAL = useMemo(() => total(liste), [liste]);
  const plonge = famillePlongee(objectifs, sports);
  const centre = liste.find((x) => x.id === plonge) ?? liste[0];
  // la carte : quatre en haut, une a gauche, le centre sur deux colonnes, une a droite, quatre en bas
  const autour = liste.filter((x) => x.id !== centre.id && !(centre.id === 'exercice' && x.id === 'combat') && !(centre.id === 'combat' && x.id === 'sport'));
  const haut = autour.slice(0, 4);
  const gauche = autour[4];
  const droite = autour[5];
  const bas = autour.slice(6, 10);

  /** Ce qui tombe : toutes les familles melangees, un tiers au plus de la famille du centre */
  const nuage = useMemo<ItemPluie[]>(() => {
    const parFamille = liste.filter((x) => x.id !== 'combat' || centre.id === 'combat').map((fam) => fam.exemples.map((label) => ({ label, famille: fam })));
    const miens = (parFamille.find((l) => l[0]?.famille.id === centre.id) ?? []).slice(0, Math.ceil(cloudMax / 3));
    const autres = parFamille.filter((l) => l[0]?.famille.id !== centre.id);
    const melange: ItemPluie[] = [];
    for (let r = 0; melange.length < cloudMax - miens.length && r < 12; r += 1) {
      autres.forEach((l) => {
        if (l[r] && melange.length < cloudMax - miens.length) melange.push(l[r]);
      });
    }
    const out: ItemPluie[] = [];
    const pas = Math.max(1, Math.round((melange.length + miens.length) / Math.max(1, miens.length)));
    let a = 0;
    melange.forEach((it, i) => {
      if (i % pas === 0 && a < miens.length) out.push(miens[a++]);
      out.push(it);
    });
    while (a < miens.length) out.push(miens[a++]);
    return out.slice(0, cloudMax);
  }, [liste, centre.id, cloudMax]);

  /** 0 pluie, 1 vue d'en haut, 2 plongee, 3 contenu pose, 4 message */
  const [phase, setPhase] = useState(animate ? 0 : 4);
  const cloudOut = useRef(new Animated.Value(1)).current;
  const cloudShrink = useRef(new Animated.Value(0)).current;
  const mapIn = useRef(new Animated.Value(0)).current;
  const dive = useRef(new Animated.Value(0)).current;
  const keptIn = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const message = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) {
      setPhase(4);
      keptIn.setValue(1);
      message.setValue(1);
      return;
    }
    const tween = (v: Animated.Value, to: number, duration: number, easing = Easing.inOut(Easing.cubic)) => Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: ND });
    const timers = [
      setTimeout(() => {
        setPhase(1);
        tween(cloudShrink, 1, 750).start();
        tween(cloudOut, 0, 750).start();
        tween(mapIn, 1, 850, Easing.out(Easing.cubic)).start();
      }, T_ZOOM_OUT),
      setTimeout(() => {
        setPhase(2);
        tween(dive, 1, 850, Easing.in(Easing.cubic)).start();
      }, T_DIVE),
      setTimeout(() => {
        setPhase(3);
        tween(keptIn, 1, 420).start();
      }, T_GATHER),
      setTimeout(() => {
        setPhase(4);
        tween(message, 1, 440).start();
      }, T_MESSAGE),
    ];
    return () => timers.forEach(clearTimeout);
  }, [animate, cloudOut, cloudShrink, mapIn, dive, keptIn, message]);

  const shown = useCountUp(phase >= 2 ? centre.n : TOTAL, phase >= 2 ? TOTAL : phase === 1 ? TOTAL : 0, animate, phase >= 2 ? 800 : 1800);
  const surCentre = phase >= 2;

  const mapScale = Animated.multiply(mapIn.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }), dive.interpolate({ inputRange: [0, 1], outputRange: [1, 3.6] }));
  const mapOthers = dive.interpolate({ inputRange: [0, 0.55], outputRange: [1, 0], extrapolate: 'clamp' });
  const mapOpacity = Animated.multiply(mapIn, dive.interpolate({ inputRange: [0.7, 1], outputRange: [1, 0], extrapolate: 'clamp' }));
  const cloudScale = cloudShrink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });

  // les six cartes vraies : la famille du centre, puis les autres
  const cartes = [centre, ...liste.filter((x) => x.id !== centre.id && x.id !== 'combat' && x.id !== 'tampon' && x.id !== 'muscle')].slice(0, 6);

  return (
    <Ecran>
      <Haut total={0} onBack={onBack} onClose={onClose} />
      <View style={f.head}>
        <View style={f.numLine}>
          <Txt style={[f.num, { color: surCentre ? T.acc : T.ink }]}>{nombre(shown, LOCALE)}</Txt>
          <Txt style={[f.unit, { color: T.ink }]} numberOfLines={1}>{surCentre ? centre.label : traduire('contenus')}</Txt>
        </View>
        <Txt style={[f.lab, { color: T.sub }]} numberOfLines={2}>
          {phase === 1 ? traduire('{0} familles, toutes sans connexion', liste.length) : traduire('dans YOROI, sans connexion')}
        </Txt>
      </View>

      {phase < 3 ? (
        <View style={f.stage}>
          <Animated.View
            style={[f.cloudAbs, { opacity: cloudOut, transform: [{ scale: cloudScale }] }]}
            pointerEvents="none"
            onLayout={(e) => setScene({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          >
            {scene.w > 0 &&
              nuage.map((it, i) => (
                <Pill
                  key={`${it.famille.id}-${it.label}`}
                  it={it}
                  drop={drops[i % drops.length]}
                  animate={animate}
                  place={{
                    left: 10 + drops[i % drops.length].x * Math.max(0, scene.w - PILL_W - 20),
                    top: 6 + drops[i % drops.length].y * Math.max(0, scene.h - PILL_H - 12),
                  }}
                />
              ))}
          </Animated.View>

          {phase >= 1 ? (
            <View style={f.mapWrap} pointerEvents="none">
              <Animated.View style={[f.map, { opacity: mapOpacity, transform: [{ scale: mapScale }] }]}>
                <View style={f.mapRow}>{haut.map((t) => <Tuile key={t.id} fam={t} width={tileW} height={tileH} fade={mapOthers} />)}</View>
                <View style={f.mapRow}>
                  {gauche ? <Tuile fam={gauche} width={tileW} height={tileH} fade={mapOthers} /> : null}
                  <View style={[f.tile, { width: tileW * 2 + 8, height: tileH, borderColor: T.acc, borderWidth: 2, backgroundColor: T.card }]}>
                    <View style={f.centreStickers}>
                      <Sticker nom={centre.sticker} taille={Math.round(tileH * 0.34)} style={{ transform: [{ rotate: '-8deg' }] }} />
                      <Sticker nom={centre.id === 'combat' ? 'jjb' : 'kettlebell'} taille={Math.round(tileH * 0.37)} />
                      <Sticker nom={centre.id === 'combat' ? 'combat' : 'barre'} taille={Math.round(tileH * 0.32)} style={{ transform: [{ rotate: '8deg' }] }} />
                    </View>
                    <Txt style={[f.centreNum, { color: T.acc }]}>{nombre(centre.n, LOCALE)}</Txt>
                    <Txt style={[f.centreLab, { color: T.ink }]} numberOfLines={1}>{centre.label}</Txt>
                  </View>
                  {droite ? <Tuile fam={droite} width={tileW} height={tileH} fade={mapOthers} /> : null}
                </View>
                <View style={f.mapRow}>{bas.map((t) => <Tuile key={t.id} fam={t} width={tileW} height={tileH} fade={mapOthers} />)}</View>
              </Animated.View>
            </View>
          ) : null}
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: keptIn }}>
          <ScrollView contentContainerStyle={f.after} showsVerticalScrollIndicator={false}>
            <Animated.View style={{ opacity: message }}>
              <Txt style={[f.big, { color: T.ink }]}>{traduire('Tu ne cherches plus. Tu notes.')}</Txt>
              <Txt style={[f.section, { color: T.acc }]}>{traduire('ET TOUT ÇA VIENT AVEC')}</Txt>
              <View style={f.grid}>
                {cartes.map((fam) => (
                  <View key={fam.id} style={[f.gcard, { backgroundColor: T.card, borderColor: T.line }]}>
                    <Sticker nom={fam.sticker} taille={42} style={{ marginBottom: 4 }} />
                    <Txt style={[f.gnum, { color: T.acc }]}>{nombre(fam.n, LOCALE)}</Txt>
                    <Txt style={[f.glab, { color: T.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{fam.label}</Txt>
                    <Txt style={[f.gex, { color: T.sub }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fam.exemples[0] ?? ''}</Txt>
                  </View>
                ))}
              </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 14) + 4 }}>
        <Bouton label={traduire('Continuer')} onPress={onNext} />
      </View>
    </Ecran>
  );
}

const f = StyleSheet.create({
  head: { alignItems: 'center', paddingTop: 6, paddingHorizontal: 22 },
  numLine: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  num: { fontFamily: FONT.titre, fontSize: 54, lineHeight: 60, letterSpacing: -2.2, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: FONT.titreBold, fontSize: 18, flexShrink: 1 },
  lab: { fontFamily: FONT.texte, fontSize: 13.5, marginTop: 6, textAlign: 'center' },
  stage: { flex: 1, overflow: 'hidden', marginTop: 4 },
  cloudAbs: { position: 'absolute', top: 0, bottom: 40, left: 4, right: 4 },
  after: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  mapWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  map: { gap: 8 },
  mapRow: { flexDirection: 'row', gap: 8 },
  tile: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, shadowColor: '#1D2033', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  tileNum: { fontFamily: FONT.titre, fontSize: 19, lineHeight: 22, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  tileLab: { fontSize: 10.5, fontFamily: FONT.titreMedium, marginTop: 1 },
  centreStickers: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  centreNum: { fontFamily: FONT.titre, fontSize: 26, lineHeight: 29, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  centreLab: { fontSize: 12, lineHeight: 15, fontFamily: FONT.titreBold },
  pill: { alignItems: 'center' },
  etiquette: { marginTop: -6, maxWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: 9, borderWidth: 1, borderColor: '#E4E7F1', paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  famille: { fontFamily: FONT.titreBold, fontSize: 7, letterSpacing: 0.9 },
  pillTxt: { fontFamily: FONT.titreMedium, fontSize: 11, lineHeight: 13.5, color: '#1D2033', textAlign: 'center' },
  big: { fontFamily: FONT.titre, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, textAlign: 'center', marginTop: 6 },
  section: { fontSize: 11, fontFamily: FONT.titreBold, letterSpacing: 1.1, marginTop: 18, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 9 },
  gcard: { width: '48.6%', borderRadius: 18, borderWidth: 1, padding: 12 },
  gnum: { fontFamily: FONT.titre, fontSize: 22, lineHeight: 26, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  glab: { fontSize: 13.5, fontFamily: FONT.titreMedium },
  gex: { fontFamily: FONT.texte, fontSize: 12, lineHeight: 16, marginTop: 2 },
});
