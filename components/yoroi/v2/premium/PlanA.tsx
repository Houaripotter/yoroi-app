/**
 * Paywall, maquette A « Ton plan d'abord » (28 octobre 2026), avec la carte « Gratuit pour toujours » de la maquette C.
 * Briques d'affichage seulement : aucun prix, aucune offre, aucun achat ici (tout vient de Paywall.tsx et du store).
 *  - HerosPlan       : ta carte « Ton plan », ton personnage en entier sur ta scene, objectif, poids, seances, arrivee prevue ;
 *  - TuileCourbe     : ta courbe complete jusqu'au torii (tes pesees, sinon l'exemple marque « Exemple ») ;
 *  - TuileMacros     : tes macros par jour en anneau, aux couleurs exactes des anneaux d'activite (accueil/Visus.tsx) ;
 *  - MiniTuile et ses contenus (semaine par sport, ton monde, tes progres, ton combat) ;
 *  - NoteLigne, CarteGratuit, OffreCarte, Reassurance, Capitales.
 * Pastels clairs, cartes blanches, petites capitales colorees, jamais d'orange ni d'or dans les titres et les pastilles.
 * Stickers selon le reglage Illustrations (useIllustrations). Rien d'anime avec « réduire les animations ».
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, type IconName } from '@/components/yoroi/v2/espace/ui';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { couleurActivite } from '@/components/yoroi/v2/accueil/Visus';
import { Etoiles } from '@/components/yoroi/v2/premium/Preuve';
import { PiedArrivee, type LignePlan } from '@/components/yoroi/v2/premium/TonPlan';
import { storeRating } from '@/lib/v2/premium/offer';
import type { ApercuNutrition } from '@/lib/v2/premium/apercus';
import { LETTRES_JOURS } from '@/lib/v2/sante/anneauxJours';
import { LOCALE, traduire } from '@/lib/i18n/tr';

// ===== Couleurs =====

export const INDIGO = '#23358F';
export const BLEU = '#3557D9';
const LANTERNE = require('@/assets/avatars/app/ornements/lanterne_plan.webp');

export type TonPw = 'ciel' | 'menthe' | 'lilas' | 'rose' | 'bleu';

/** Fond pastel et encre de chaque ton, en clair et en sombre (memes fonds que les ecrans Pastel, seance/pastel.ts) */
const TONS: Record<TonPw, { fond: string; encre: string; fondSombre: string; encreSombre: string }> = {
  ciel: { fond: '#E6ECF8', encre: BLEU, fondSombre: '#252E4A', encreSombre: '#AFC0FF' },
  bleu: { fond: '#DCE3FF', encre: INDIGO, fondSombre: '#2A3557', encreSombre: '#DCE3FF' },
  menthe: { fond: '#E3F2EA', encre: '#1C6B45', fondSombre: '#22362D', encreSombre: '#8FD9B6' },
  lilas: { fond: '#EFE6F3', encre: '#8A3F78', fondSombre: '#352B3D', encreSombre: '#E3A3CB' },
  rose: { fond: '#FDE4EC', encre: '#A3174B', fondSombre: '#3A2230', encreSombre: '#F59BBB' },
};

export function usePw() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sombre = theme.isDark;
  return {
    sombre,
    page: c.background,
    carte: c.surface,
    encre: c.ink,
    gris: c.textSecondary,
    pale: c.textMuted,
    filet: sombre ? c.border : '#ECEEF5',
    bord: sombre ? c.border : '#E3E6F1',
    indigo: sombre ? c.accent : INDIGO,
    bleu: sombre ? '#AFC0FF' : BLEU,
    ton: (t: TonPw) => (sombre ? { fond: TONS[t].fondSombre, encre: TONS[t].encreSombre } : { fond: TONS[t].fond, encre: TONS[t].encre }),
    ombre: { shadowColor: '#1D2033', shadowOpacity: sombre ? 0 : 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: sombre ? 0 : 2 },
  };
}

/** 0 puis 1 une fois, a l'affichage ; 1 tout de suite avec « réduire les animations » */
function useRemplir(duree = 900, delai = 250): SharedValue<number> {
  const reduire = useReducedMotion();
  const v = useSharedValue(reduire ? 1 : 0);
  useEffect(() => {
    if (reduire) {
      v.value = 1;
      return;
    }
    v.value = withDelay(delai, withTiming(1, { duration: duree, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduire]);
  return v;
}

// ===== Petites briques =====

/** Petites capitales colorees, titre de section ou de tuile */
export function Capitales({ texte, couleur, taille = 11, lignes = 2, style }: { texte: string; couleur: string; taille?: number; lignes?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Ink size={taille} weight="black" color={couleur} numberOfLines={lignes} style={{ letterSpacing: taille * 0.12, lineHeight: Math.round(taille * 1.35) }} accessibilityRole="header">
        {texte.toUpperCase()}
      </Ink>
    </View>
  );
}

/** Pastille arrondie en capitales */
export function Pastille({ texte, fond, encre, taille = 10.5, contour }: { texte: string; fond: string; encre: string; taille?: number; contour?: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', height: taille + 13, paddingHorizontal: taille - 2, borderRadius: (taille + 13) / 2, backgroundColor: fond, borderWidth: contour ? 3 : 0, borderColor: contour }}>
      <Ink size={taille} weight="black" color={encre} numberOfLines={1} style={{ letterSpacing: 0.6 }}>{texte.toUpperCase()}</Ink>
    </View>
  );
}

function Sticker({ nom, taille }: { nom: NomSticker; taille: number }) {
  const illus = useIllustrations();
  return <Image source={illus.img(nom)} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

// ===== 1. Ta carte « Ton plan » =====

const STICKER_LIGNE: Partial<Record<IconName, NomSticker>> = { target: 'objectifs', scale: 'balance', calendar: 'calendrier' };

export function HerosPlan({ nom, lignes, arrivee, scene, personnages, largeur, a11y }: {
  nom: string;
  lignes: LignePlan[];
  arrivee: string | null;
  scene: ImageSourcePropType;
  /** ton personnage (un seul), ou l'homme et la femme de ton univers en alternance (genre « autre ») ; vide : la lanterne */
  personnages: ImageSourcePropType[];
  /** largeur de la carte */
  largeur: number;
  a11y: string;
}) {
  const p = usePw();
  const illus = useIllustrations();
  const reduire = useReducedMotion();
  const etroit = largeur < 350;
  const PHOTO = etroit ? 112 : largeur < 380 ? 120 : 128;
  const H_PERSO = etroit ? 164 : 176;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduire || personnages.length < 2) return;
    const t = setInterval(() => setI((x) => 1 - x), 3500);
    return () => clearInterval(t);
  }, [reduire, personnages.length]);
  const perso = personnages[i % Math.max(1, personnages.length)] ?? null;
  return (
    <View accessible accessibilityLabel={a11y} style={[{ borderRadius: 28, backgroundColor: p.carte, overflow: 'hidden', borderWidth: p.sombre ? 1 : 0, borderColor: p.bord }, { shadowColor: '#1D2033', shadowOpacity: p.sombre ? 0 : 0.08, shadowRadius: 26, shadowOffset: { width: 0, height: 10 }, elevation: p.sombre ? 0 : 4 }]}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: PHOTO, alignSelf: 'stretch', minHeight: H_PERSO - 8, backgroundColor: p.sombre ? '#1E2336' : '#E6ECF8', overflow: 'hidden' }}>
          <Image source={scene} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: p.sombre ? 0.7 : 0.62 }]} />
          {perso ? (
            <Animated.View key={i} entering={reduire || personnages.length < 2 ? undefined : FadeIn.duration(600)} exiting={reduire || personnages.length < 2 ? undefined : FadeOut.duration(600)} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {/* en entier, les pieds au ras du bas de la photo */}
              <Image source={perso} resizeMode="contain" style={{ position: 'absolute', bottom: -8, left: (PHOTO - H_PERSO * 0.75) / 2, width: H_PERSO * 0.75, height: H_PERSO }} />
            </Animated.View>
          ) : (
            <Image source={illus.img('lanterne_plan', LANTERNE)} resizeMode="contain" style={{ position: 'absolute', top: '8%', left: 10, width: PHOTO - 20, height: '84%' }} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 12, paddingBottom: 8, paddingHorizontal: etroit ? 12 : 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 }}>
            <Ink size={17} weight="black" color={p.indigo} numberOfLines={1} style={{ flexShrink: 1 }}>
              {nom ? traduire('{0}, ton plan', nom) : traduire('Ton plan')}
            </Ink>
            {nom ? null : (
              <>
                <View style={{ flex: 1 }} />
                <Pastille texte={traduire('À toi')} fond={p.ton('bleu').fond} encre={p.ton('bleu').encre} taille={10} />
              </>
            )}
          </View>
          <View style={{ marginTop: 4 }}>
            {lignes.map((l, k) => (
              <View key={l.icon + l.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingVertical: 5, borderTopWidth: k === 0 ? 0 : 1, borderColor: p.filet }}>
                {STICKER_LIGNE[l.icon] ? <Sticker nom={STICKER_LIGNE[l.icon] as NomSticker} taille={28} /> : <Icon name={l.icon} size={18} color={l.ink} />}
                <Ink size={etroit ? 14 : 15} weight="bold" color={p.gris} style={{ flex: 1, lineHeight: etroit ? 18 : 19 }}>
                  {l.depuis ? (
                    <>
                      <Ink size={etroit ? 14 : 15} weight="black" color={p.encre}>{l.depuis}</Ink>
                      {` ${traduire('vers')} `}
                      <Ink size={etroit ? 14 : 15} weight="black" color={l.ink}>{l.cle}</Ink>
                    </>
                  ) : (
                    <>
                      <Ink size={etroit ? 14 : 15} weight="black" color={l.ink}>{l.cle}</Ink>
                      {l.apres ? ` ${l.apres}` : ''}
                    </>
                  )}
                </Ink>
              </View>
            ))}
          </View>
        </View>
      </View>
      {arrivee ? <PiedArrivee arrivee={arrivee} compact={etroit} /> : null}
    </View>
  );
}

// ===== 2. Ta courbe en entier, jusqu'au torii =====

type Courbe = { hist: number[]; cible: number | null; torii: boolean; exemple: boolean };

function lisse(p: [number, number][]): string {
  if (p.length === 0) return '';
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length; i += 1) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

function MiniCourbe({ w, h, d }: { w: number; h: number; d: Courbe }) {
  const p = usePw();
  const illus = useIllustrations();
  const v = useRemplir(1100);
  const masque = useAnimatedStyle(() => ({ width: Math.round(w * (0.06 + v.value * 0.94)) }));
  const projette = d.cible != null && d.torii;
  const vals = [...d.hist, ...(d.cible != null ? [d.cible] : [])];
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const marge = Math.max(0.6, (hi - lo) * 0.12);
  const Y = (x: number) => 8 + ((hi + marge - x) / (hi - lo + 2 * marge)) * (h - 22);
  const xFinHist = projette ? w * 0.62 : w - 14;
  const n = d.hist.length;
  const hist: [number, number][] = d.hist.map((x, i) => [10 + (i * (xFinHist - 10)) / Math.max(1, n - 1), Y(x)]);
  const dernier = hist[hist.length - 1];
  const tx = w - 30;
  const proj: [number, number][] = projette && dernier ? Array.from({ length: 7 }, (_, k) => [dernier[0] + ((tx - dernier[0]) * k) / 6, Y(d.hist[n - 1] + ((d.cible as number) - d.hist[n - 1]) * (k / 6))]) : [];
  const ligne = lisse(hist);
  const aire = hist.length ? `${ligne} L${dernier[0].toFixed(1)} ${h} L${hist[0][0].toFixed(1)} ${h} Z` : '';
  const yCible = d.cible != null ? Y(d.cible) : null;
  const TS = 26;
  return (
    <View style={{ width: w, height: h }}>
      <Animated.View style={[{ height: h, overflow: 'hidden' }, masque]}>
        <Svg width={w} height={h}>
          <Defs>
            <SvgGradient id="pwA_aire" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#8FA6F8" stopOpacity={0.32} />
              <Stop offset="1" stopColor="#8FA6F8" stopOpacity={0} />
            </SvgGradient>
          </Defs>
          {yCible != null ? <Line x1={10} x2={w - 12} y1={yCible} y2={yCible} stroke={p.sombre ? '#3A4160' : '#D5DBEE'} strokeWidth={1.4} strokeDasharray="4 4" /> : null}
          {aire ? <Path d={aire} fill="url(#pwA_aire)" /> : null}
          <Path d={ligne} fill="none" stroke={p.indigo} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          {proj.length ? <Path d={lisse(proj)} fill="none" stroke="#8FA6F8" strokeWidth={3.2} strokeLinecap="round" strokeDasharray="1 7" /> : null}
          {dernier ? <Circle cx={dernier[0]} cy={dernier[1]} r={5.2} fill={p.carte} stroke={p.indigo} strokeWidth={3} /> : null}
        </Svg>
        {projette && yCible != null ? (
          <Image source={illus.img('torii')} resizeMode="contain" style={{ position: 'absolute', left: tx - TS * 0.3, top: Math.max(0, yCible - TS * 1.05), width: TS, height: TS }} />
        ) : null}
      </Animated.View>
    </View>
  );
}

export function TuileCourbe({ courbe, style }: { courbe: Courbe; style?: StyleProp<ViewStyle> }) {
  const p = usePw();
  const t = p.ton('ciel');
  const [w, setW] = useState(0);
  return (
    <View style={[{ flex: 1, minWidth: 0, borderRadius: 24, backgroundColor: t.fond, padding: 12, paddingBottom: 10, gap: 8 }, p.ombre, style]} accessible accessibilityLabel={traduire('Ta courbe en entier, 6 mois, 1 an, tout ton historique')}>
      <Capitales texte={traduire('Ta courbe en entier')} couleur={t.encre} taille={10.5} />
      <View style={{ backgroundColor: p.carte, borderRadius: 16, paddingTop: 6, paddingHorizontal: 4, paddingBottom: 2 }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width - 8))}>
        {w > 0 && courbe.hist.length >= 2 ? <MiniCourbe w={w} h={68} d={courbe} /> : <View style={{ height: 68 }} />}
        {courbe.exemple ? (
          <View style={{ position: 'absolute', left: 8, bottom: 6, backgroundColor: p.ton('bleu').fond, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Ink size={8.5} weight="black" color={p.ton('bleu').encre} style={{ letterSpacing: 0.6 }}>{traduire('EXEMPLE')}</Ink>
          </View>
        ) : null}
      </View>
      <Ink size={12} weight="bold" color={p.gris} style={{ lineHeight: 16 }}>{traduire('6 mois, 1 an, tout ton historique')}</Ink>
    </View>
  );
}

// ===== 3. Tes macros par jour, en anneau =====

const CircleAnime = Animated.createAnimatedComponent(Circle);
/** Les pistes claires des anneaux (accueil/SanteJour.tsx) */
const PISTE_CLAIRE: Record<string, string> = { pas: '#FFE0EA', exercice: '#E9F9D2', 'energie-active': '#D6F8FA' };
/** proteines : l'anneau des pas, glucides : celui de l'exercice, lipides : celui de l'energie active */
const ANNEAU_MACRO: Record<'p' | 'g' | 'l', string> = { p: 'pas', g: 'exercice', l: 'energie-active' };

function Arc({ cx, r, ep, L, C, rot, couleur, v }: { cx: number; r: number; ep: number; L: number; C: number; rot: number; couleur: string; v: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ strokeDashoffset: L * (1 - v.value) }));
  return <CircleAnime cx={cx} cy={cx} r={r} fill="none" stroke={couleur} strokeWidth={ep} strokeLinecap="round" strokeDasharray={`${L.toFixed(2)} ${C.toFixed(2)}`} animatedProps={props} transform={`rotate(${rot.toFixed(2)} ${cx} ${cx})`} />;
}

export function AnneauMacros({ taille, ep, d }: { taille: number; ep: number; d: ApercuNutrition }) {
  const p = usePw();
  const v = useRemplir(900);
  const r = (taille - ep) / 2 - 1.5;
  const C = 2 * Math.PI * r;
  const m = taille / 2;
  const total = d.macros.reduce((s, x) => s + x.percent, 0) || 1;
  const ecart = ep + 4;
  let depart = -90;
  const segs = d.macros.map((x) => {
    const cle = ANNEAU_MACRO[x.key];
    const col = couleurActivite(cle);
    const part = x.percent / total;
    const L = Math.max(1, part * C - ecart);
    const rot = depart + (ecart / 2 / C) * 360;
    depart += part * 360;
    return { key: x.key, cle, col, L, rot };
  });
  return (
    <View style={{ width: taille, height: taille }}>
      <Svg width={taille} height={taille}>
        <Defs>
          {segs.map((s) => (
            <SvgGradient key={s.key} id={`pwA_m${s.key}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={s.col.debut} />
              <Stop offset="1" stopColor={s.col.fin} />
            </SvgGradient>
          ))}
        </Defs>
        {segs.map((s) => (
          <Circle key={`piste${s.key}`} cx={m} cy={m} r={r} fill="none" stroke={p.sombre ? s.col.piste : PISTE_CLAIRE[s.cle]} strokeWidth={ep} strokeLinecap="round" strokeDasharray={`${s.L.toFixed(2)} ${C.toFixed(2)}`} transform={`rotate(${s.rot.toFixed(2)} ${m} ${m})`} />
        ))}
        {/* le tres fin liseré plus sombre du vert et du cyan, en clair (couleurActivite, ombre) */}
        {segs.map((s) => (s.col.ombre ? <Arc key={`lis${s.key}`} cx={m} r={r} ep={ep + 1.4} L={s.L} C={C} rot={s.rot} couleur={`${s.col.ombre}66`} v={v} /> : null))}
        {segs.map((s) => <Arc key={`arc${s.key}`} cx={m} r={r} ep={ep} L={s.L} C={C} rot={s.rot} couleur={`url(#pwA_m${s.key})`} v={v} />)}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ink size={taille > 76 ? 17 : 15} weight="black" tight color={p.encre} style={{ lineHeight: taille > 76 ? 19 : 17 }}>{d.calories.toLocaleString(LOCALE)}</Ink>
        <Ink size={10} weight="black" color={p.gris} style={{ lineHeight: 12 }}>kcal</Ink>
      </View>
    </View>
  );
}

export function TuileMacros({ d, style }: { d: ApercuNutrition; style?: StyleProp<ViewStyle> }) {
  const p = usePw();
  const encre = p.sombre ? '#FF7AA2' : '#D70F45';
  const [w, setW] = useState(0);
  const anneau = w > 0 ? Math.max(64, Math.min(80, w - 66)) : 74;
  const a11y = traduire('Tes macros par jour, {0} kilocalories', d.calories) + ', ' + d.macros.map((x) => `${traduire(x.label)} ${x.grams} g`).join(', ');
  return (
    <View style={[{ flex: 1, minWidth: 0, borderRadius: 24, backgroundColor: p.carte, padding: 12, paddingBottom: 10, gap: 8, borderWidth: p.sombre ? 1 : 0, borderColor: p.bord }, p.ombre, style]} accessible accessibilityLabel={a11y}>
      <Capitales texte={traduire('Tes macros par jour')} couleur={encre} taille={10.5} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
        <AnneauMacros taille={anneau} ep={anneau > 72 ? 10 : 9} d={d} />
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          {d.macros.map((x) => {
            const col = couleurActivite(ANNEAU_MACRO[x.key]);
            return (
              <View key={x.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col.fin, borderWidth: 2, borderColor: col.debut }} />
                <Ink size={13.5} weight="black" color={p.encre} numberOfLines={1}>{`${x.grams} g`}</Ink>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6 }}>
        {d.exemple ? (
          <View style={{ backgroundColor: p.ton('bleu').fond, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Ink size={8.5} weight="black" color={p.ton('bleu').encre} style={{ letterSpacing: 0.6 }}>{traduire('EXEMPLE')}</Ink>
          </View>
        ) : null}
        <Ink size={12} weight="bold" color={p.gris} style={{ lineHeight: 16 }}>{traduire('Protéines, glucides, lipides')}</Ink>
      </View>
    </View>
  );
}

// ===== 4. Et tout le reste : petites tuiles =====

export function MiniTuile({ ton, titre, sous, children, style }: { ton: TonPw; titre: string; sous: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePw();
  const t = p.ton(ton);
  return (
    <View style={[{ flex: 1, minWidth: 0, minHeight: 112, borderRadius: 22, backgroundColor: t.fond, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 10, gap: 6 }, style]} accessible accessibilityLabel={`${titre}, ${sous}`}>
      <Capitales texte={titre} couleur={t.encre} taille={10} lignes={2} />
      <View style={{ flex: 1, justifyContent: 'center', minHeight: 30 }}>{children}</View>
      <Ink size={12} weight="bold" color={p.gris} style={{ lineHeight: 15 }}>{sous}</Ink>
    </View>
  );
}

/** Ta semaine : tes jours d'entrainement, le sticker de tes sports dessus */
export function SemaineSports({ jours, stickers }: { jours: number[]; stickers: NomSticker[] }) {
  const p = usePw();
  const [w, setW] = useState(0);
  const cell = w > 0 ? Math.max(14, Math.min(22, Math.floor((w - 6 * 2) / 7))) : 19;
  let k = 0;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {Array.from({ length: 7 }, (_, i) => {
        const on = jours.includes(i);
        const nom = on ? stickers[k++ % Math.max(1, stickers.length)] : null;
        return (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: cell, height: cell, borderRadius: cell / 2, backgroundColor: on ? p.carte : p.sombre ? 'rgba(255,255,255,0.08)' : '#ECEEF5', alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 0, borderColor: p.ton('bleu').fond }}>
              {nom ? <Sticker nom={nom} taille={cell - 6} /> : null}
            </View>
            <Ink size={9.5} weight="black" color={on ? p.encre : p.pale}>{LETTRES_JOURS[i] ?? ''}</Ink>
          </View>
        );
      })}
    </View>
  );
}

/** Ton monde : quatre vrais personnages (ou scenes) en ronds qui se chevauchent */
export function RangeeMonde({ images }: { images: { src: ImageSourcePropType; fond: string; portrait: boolean }[] }) {
  const p = usePw();
  const T = 36;
  return (
    <View style={{ flexDirection: 'row' }}>
      {images.slice(0, 4).map((im, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -8, width: T, height: T, borderRadius: T / 2, borderWidth: 3, borderColor: p.carte, backgroundColor: im.fond, overflow: 'hidden', shadowColor: '#1D2033', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}>
          <Image source={im.src} resizeMode="cover" style={im.portrait ? { position: 'absolute', top: 0, left: 0, width: T - 6, height: (T - 6) * 1.5 } : StyleSheet.absoluteFill} />
        </View>
      ))}
    </View>
  );
}

export function ChargeProgres() {
  const p = usePw();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Sticker nom="musculation" taille={30} />
      <Pastille texte={traduire('+5 % de charge')} fond={p.carte} encre={p.indigo} taille={10} />
    </View>
  );
}

export function RoundsCombat({ total = 5, enCours = 3 }: { total?: number; enCours?: number }) {
  const p = usePw();
  const v = useRemplir(1300);
  const plein = p.sombre ? '#F59BBB' : '#F27A9B';
  const remplir = useAnimatedStyle(() => ({ width: `${Math.round(v.value * 55)}%` as const }));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ width: 20, height: 10, borderRadius: 5, backgroundColor: i < enCours - 1 ? plein : p.carte, borderWidth: i === enCours - 1 ? 2 : 0, borderColor: plein, opacity: i >= enCours ? 0.6 : 1, overflow: 'hidden' }}>
            {i === enCours - 1 ? <Animated.View style={[{ height: '100%', backgroundColor: plein }, remplir]} /> : null}
          </View>
        ))}
      </View>
      <Ink size={13} weight="black" color={p.encre} numberOfLines={1}>{traduire('Round {0} sur {1}', enCours, total)}</Ink>
    </View>
  );
}

// ===== 5. La note, en une ligne =====

export function NoteLigne() {
  const p = usePw();
  const r = storeRating();
  if (!r) return null;
  return (
    <View accessible accessibilityLabel={traduire('{0} sur 5, {1} notes, {2}', r.note, r.total, r.stores)} style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40, borderRadius: 20, backgroundColor: p.carte, paddingHorizontal: 14, borderWidth: p.sombre ? 1 : 0, borderColor: p.bord }, p.ombre]}>
      <Ink size={16} weight="black" color={p.encre}>{r.note}</Ink>
      <Etoiles size={15} />
      <Ink size={13} weight="bold" color={p.gris} numberOfLines={1}>{traduire('{0} notes', r.total)}</Ink>
    </View>
  );
}

// ===== 6. Gratuit pour toujours (emprunt a la maquette C) =====

const GRATUIT: { nom: NomSticker; texte: string }[] = [
  { nom: 'balance', texte: 'Ta pesée' },
  { nom: 'carnet', texte: 'Tes séances' },
  { nom: 'coach', texte: 'Ton coach' },
  { nom: 'calendrier', texte: 'Ta semaine' },
  { nom: 'sablier', texte: 'Les chronos' },
  { nom: 'torii', texte: 'Le Dojo' },
];

export function CarteGratuit() {
  const p = usePw();
  const t = p.ton('menthe');
  const textes = GRATUIT.map((g) => traduire(g.texte));
  return (
    <View accessible accessibilityLabel={`${traduire('Gratuit pour toujours, sans limite')} : ${textes.join(', ')}`} style={{ borderRadius: 24, backgroundColor: t.fond, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 8 }}>
      <Capitales texte={traduire('Gratuit pour toujours, sans limite')} couleur={t.encre} taille={10.5} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {GRATUIT.map((g, i) => (
          <View key={g.nom} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingLeft: 5, paddingRight: 10, borderRadius: 15, backgroundColor: p.carte }}>
            <Sticker nom={g.nom} taille={20} />
            <Ink size={12.5} weight="black" color={p.encre} numberOfLines={1}>{textes[i]}</Ink>
          </View>
        ))}
      </View>
    </View>
  );
}

// ===== 7. Les offres =====

function Radio({ on }: { on: boolean }) {
  const p = usePw();
  if (on) {
    return (
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: p.indigo, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={13} color={p.sombre ? p.page : '#FFFFFF'} stroke={3.4} />
      </View>
    );
  }
  return <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: p.sombre ? p.bord : '#C9CEDF', backgroundColor: p.carte }} />;
}

export function OffreCarte({ on, onPress, nom, pastille, badge, sous, prix, per, cadeau, a11y }: {
  on: boolean;
  onPress: () => void;
  nom: string;
  /** l'essai gratuit renvoye par le store, sinon rien */
  pastille?: string | null;
  badge?: string | null;
  sous?: string | null;
  prix: string;
  per?: string | null;
  cadeau?: { image: ImageSourcePropType; texte: string } | null;
  a11y: string;
}) {
  const p = usePw();
  const lilas = p.ton('lilas');
  const vert = p.ton('menthe');
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, checked: on }}
      accessibilityLabel={a11y}
      style={({ pressed }) => [
        {
          borderRadius: 24,
          backgroundColor: p.carte,
          borderWidth: on ? 3 : 1.5,
          borderColor: on ? p.indigo : p.bord,
          paddingHorizontal: on ? 14.5 : 16,
          paddingVertical: on ? 14.5 : 14,
          marginTop: badge ? 10 : 0,
          opacity: pressed ? 0.94 : 1,
        },
        on && !p.sombre ? { shadowColor: INDIGO, shadowOpacity: 0.16, shadowRadius: 26, shadowOffset: { width: 0, height: 12 }, elevation: 5 } : null,
      ]}
    >
      {badge ? (
        <View style={{ position: 'absolute', top: -15, right: 14 }}>
          <Pastille texte={badge} fond={vert.fond} encre={vert.encre} taille={11} contour={p.carte} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Radio on={on} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Ink size={17} weight="black" color={p.encre}>{nom}</Ink>
            {pastille ? <Pastille texte={pastille} fond={vert.fond} encre={vert.encre} taille={9.5} /> : null}
          </View>
          {sous ? <Ink size={13} weight="bold" color={p.gris} style={{ lineHeight: 17 }}>{sous}</Ink> : null}
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Ink size={21} weight="black" tight color={p.encre} numberOfLines={1}>{prix}</Ink>
          {per ? <Ink size={12} weight="bold" color={p.gris} numberOfLines={1}>{per}</Ink> : null}
        </View>
      </View>
      {cadeau ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, backgroundColor: lilas.fond }}>
          <View style={{ width: 52, height: 36, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: p.carte, backgroundColor: lilas.fond }}>
            <Image source={cadeau.image} resizeMode="cover" style={{ width: 48, height: 32 }} />
          </View>
          <Ink size={13} weight="black" color={lilas.encre} style={{ flex: 1, lineHeight: 17 }}>{cadeau.texte}</Ink>
        </View>
      ) : null}
    </Pressable>
  );
}

// ===== 8. Reassurance =====

export function Reassurance() {
  const p = usePw();
  const items: { nom: NomSticker | null; titre: string; sous: string; ton: TonPw }[] = [
    // aucun sticker « coche » : une coche verte dessinee, comme sur la maquette
    { nom: null, titre: traduire('Annulable'), sous: traduire('à tout moment'), ton: 'menthe' },
    { nom: 'sans_publicite', titre: traduire('Sans pub'), sous: traduire('jamais'), ton: 'rose' },
    { nom: 'donnees_telephone', titre: traduire('Tes données'), sous: traduire('sur ton téléphone'), ton: 'ciel' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((x) => (
        <View key={x.titre} accessible accessibilityLabel={`${x.titre} ${x.sous}`} style={{ flex: 1, minWidth: 0, borderRadius: 20, backgroundColor: p.ton(x.ton).fond, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 6, alignItems: 'center', gap: 4 }}>
          {x.nom ? (
            <Sticker nom={x.nom} taille={34} />
          ) : (
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.carte, borderWidth: 3, borderColor: p.ton('menthe').encre, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={17} color={p.ton('menthe').encre} stroke={3.4} />
            </View>
          )}
          <Ink size={13} weight="black" color={p.encre} style={{ textAlign: 'center', lineHeight: 16 }}>{x.titre}</Ink>
          <Ink size={11.5} weight="bold" color={p.gris} style={{ textAlign: 'center', lineHeight: 14 }}>{x.sous}</Ink>
        </View>
      ))}
    </View>
  );
}
