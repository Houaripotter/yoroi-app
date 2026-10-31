/**
 * 31 octobre 2026 (cartes de partage v2) : le dessin des 10 directions, reproduit des planches
 * _propositions/cartes_partage_v2_2026-10-31 (html/directions.js). Les cotes du HTML (1080 x 1920 pixels)
 * passent par trois fonctions : X et Y placent, S donne une taille. En Story, 3 pixels font 1 point de la carte (360 x 640) ;
 * en Publication et en Carre, la zone utile est resserree (le haut et le bas de la story laissent la place
 * aux barres d'Instagram) et tout est reduit d'autant, le fond restant en plein cadre.
 * Les chiffres viennent de la vraie seance : une donnee absente masque son bloc.
 * 31 octobre 2026 (cartes ou l'on voit ta tete) : avec ta photo, le visage reste libre (du haut a 55 % de la hauteur,
 * au centre) ; un petit titre ou sticker dans le coin du haut, les chiffres en bloc compact en bas, un leger degrade
 * sombre en bas pour les lire. Le bloc se deplace et se redimensionne au doigt dans l'atelier (voir lib/v2/cartes/zoneVisage.ts).
 */
import React from 'react';
import { Image, Platform, Text, View } from 'react-native';
import type { ImageSourcePropType, TextStyle, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { ClipPath, Defs, G, Image as SvgImage, LinearGradient as SvgGradient, Path, Pattern, RadialGradient, Rect, Stop, Circle, Text as SvgText } from 'react-native-svg';
import { fontStyle, policeCarte, policesCartes } from '@/components/yoroi/fonts';
import type { FontWeightKey } from '@/components/yoroi/tokens';
import type { CarteData, DirectionId, FormatId, OptionsCarte, StatValue } from '@/lib/v2/cartes/types';
import type { CouleurCarte } from '@/lib/v2/cartes/couleurs';
import { rgba } from '@/lib/v2/cartes/couleurs';
import { allureTexte, stickerDeCarte } from '@/lib/v2/cartes/detailsSport';
import { anneeDe, conversionPour, ecussonHolo, grilleDe, lignesGala, serieDe, texteVerdict, verdictGala } from '@/lib/v2/cartes/directions';
import { chargeTexte } from '@/lib/v2/unitePoids';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { STICKERS } from '@/components/yoroi/v2/stickers';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire } from '@/lib/i18n/tr';
import { BADGES } from './fonds';
import { blocDeCarte, centre, coinDeCarte, echelleBloc, pivotParDefaut, transformBloc, zoneVisageActive } from '@/lib/v2/cartes/zoneVisage';
import type { Placement, Rect as Boite } from '@/lib/v2/cartes/zoneVisage';

const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');
const BLANC = '#FFFFFF';
const FOIS = '×';

// ============================================
// LE CONTEXTE D'UN DESSIN
// ============================================

export type CtxDirection = {
  d: CarteData;
  o: OptionsCarte;
  format: FormatId;
  W: number;
  H: number;
  /** le chiffre vedette (libelle, valeur, unite), null s'il n'y en a pas */
  hero: StatValue | null;
  /** les autres chiffres, 3 au plus */
  stats: StatValue[];
  titre: string;
  /** la date en toutes lettres, « Samedi 31 octobre » */
  date: string;
  /** le record de la seance, court : « 100 kg × 5 » et l'exercice ; null sans record */
  record: { nom: string; court: string } | null;
  /** ta photo (ou, dans un apercu sans photo, une photo d'ambiance) ; null : la couleur */
  photo: ImageSourcePropType | null;
  coul: CouleurCarte;
  /** autocollant seul : ni photo ni fond, le PNG garde la transparence */
  transparent: boolean;
  personnage: ImageSourcePropType | null;
  u: UnitePoids;
  /** le bloc des chiffres deplace au doigt dans l'atelier ; null : a sa place */
  placement?: Placement | null;
};

type Geo = { X: (px: number) => number; Y: (px: number) => number; S: (px: number) => number; bas: (px: number) => number; r: number };

/** Zone utile de chaque format, en pixels de l'export : la story garde 230 en haut et 270 en bas */
const ZONE: Record<FormatId, { haut: number; bas: number; h: number }> = {
  story: { haut: 230, bas: 270, h: 1920 },
  post: { haut: 66, bas: 48, h: 1350 },
  carre: { haut: 54, bas: 42, h: 1080 },
};

export function geo(format: FormatId, W: number): Geo {
  const z = ZONE[format];
  const k = W / 1080;
  const r = (z.h - z.haut - z.bas) / (1920 - 230 - 270);
  return {
    r,
    S: (px) => px * k * r,
    X: (px) => (540 + (px - 540) * r) * k,
    Y: (px) => (z.haut + (px - 230) * r) * k,
    // une cote prise depuis le bas (le pied a 270 pixels du bas en story)
    bas: (px) => (z.bas + (px - 270) * r) * k,
  };
}

// ============================================
// PETITS OUTILS
// ============================================

type Police = FontWeightKey | 'cond' | 'anton' | 'serif';

function police(f: Police): TextStyle {
  if (f === 'cond') return policeCarte('condense');
  if (f === 'anton') return policeCarte('anton');
  if (f === 'serif') return policeCarte('serif');
  return fontStyle(f);
}

/** Largeur d'un caractere, en part de la taille, par police (mesuree dans les fichiers) */
const LARGEUR: Record<Police, number> = { cond: 0.44, anton: 0.5, serif: 0.42, black: 0.68, extraBold: 0.64, bold: 0.6, medium: 0.58 };

/** La taille pour que le texte tienne sur une ligne dans la largeur donnee */
export function tailleQuiTient(texte: string, largeur: number, max: number, f: Police = 'black', min = 6): number {
  const n = Math.max(1, texte.length);
  return Math.max(min, Math.min(max, largeur / (n * LARGEUR[f])));
}

const OMBRE: TextStyle = { textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1.5 } };

function Tx({ t, size, f = 'black', color, ls = 0, lh, style, lines = 1, align, ombre, maj }: { t: React.ReactNode; size: number; f?: Police; color: string; ls?: number; lh?: number; style?: TextStyle | TextStyle[]; lines?: number; align?: TextStyle['textAlign']; ombre?: boolean; maj?: boolean }) {
  return (
    <Text
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      numberOfLines={lines}
      style={[police(f), { fontSize: size, lineHeight: Math.round(size * (lh ?? (f === 'cond' || f === 'anton' ? 1.0 : 1.22))), letterSpacing: ls, color, textAlign: align, includeFontPadding: false }, maj ? { textTransform: 'uppercase' } : {}, ombre ? OMBRE : {}, style ?? {}]}
    >
      {t}
    </Text>
  );
}

/** Un chiffre et son unite sur la meme ligne de base (texte imbrique) */
function Chiffre({ v, u, size, f = 'cond', usize, uf = 'black', color, ucolor, ombre, ls = 0, align, lh }: { v: string; u?: string; size: number; f?: Police; usize?: number; uf?: Police; color: string; ucolor?: string; ombre?: boolean; ls?: number; align?: TextStyle['textAlign']; lh?: number }) {
  return (
    <Text allowFontScaling={false} maxFontSizeMultiplier={1} numberOfLines={1} style={[police(f), { fontSize: size, lineHeight: Math.round(size * (lh ?? 1.02)), color, letterSpacing: ls, textAlign: align, fontVariant: ['tabular-nums'], includeFontPadding: false }, ombre ? OMBRE : {}]}>
      {v}
      {u ? <Text style={[police(uf), { fontSize: usize ?? size * 0.42, color: ucolor ?? color, letterSpacing: 0 }]}>{` ${u}`}</Text> : null}
    </Text>
  );
}

/** La taille d'un chiffre condense et de son unite pour tenir dans la largeur */
function tailleChiffre(v: string, u: string | undefined, largeur: number, max: number, f: Police = 'cond', ku = 0.42): number {
  const em = v.length * LARGEUR[f] + (u ? (u.length + 1) * LARGEUR.black * ku : 0);
  return Math.max(10, Math.min(max, largeur / Math.max(0.5, em)));
}

const plein: ViewStyle = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 };

/** Une image en plein cadre : ta photo (uri) avec expo-image sur iPhone, sinon Image */
function Photo({ src, style }: { src: ImageSourcePropType; style?: object }) {
  const uri = typeof src === 'object' && src && 'uri' in (src as object) ? (src as { uri: string }).uri : null;
  if (uri && Platform.OS === 'ios') return <ExpoImage key={uri} recyclingKey={uri} source={{ uri }} style={[plein, { width: '100%', height: '100%' }, style ?? {}]} contentFit="cover" transition={0} cachePolicy="memory-disk" />;
  return <Image source={src} style={[plein, { width: '100%', height: '100%' }, style ?? {}]} resizeMode="cover" />;
}

/** Le fond : ta photo, sinon ta couleur ; rien du tout pour l'autocollant seul */
function FondPhoto({ c, voile = 0 }: { c: CtxDirection; voile?: number }) {
  if (c.transparent) return null;
  return (
    <View pointerEvents="none" style={[plein, { backgroundColor: c.coul.fond }]}>
      {c.photo ? <Photo src={c.photo} /> : null}
      {c.photo && voile ? <View style={[plein, { backgroundColor: `rgba(0,0,0,${voile})` }]} /> : null}
    </View>
  );
}

/** L'encre sur le fond : blanc sur une photo ou en autocollant, l'encre de la couleur sinon */
function encre(c: CtxDirection): string {
  return c.photo || c.transparent ? BLANC : c.coul.encre;
}

/** Vrai quand la carte garde le visage libre : ta photo en plein cadre derriere les chiffres */
function visage(c: CtxDirection, id: DirectionId): boolean {
  return zoneVisageActive(id, !!c.photo, c.transparent);
}

/** Le leger degrade sombre du bas, pour lire les chiffres : il commence sous le visage */
function DegradeBas({ c, fort }: { c: CtxDirection; fort?: boolean }) {
  if (!c.photo || c.transparent) return null;
  return <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', `rgba(0,0,0,${fort ? 0.4 : 0.26})`, `rgba(0,0,0,${fort ? 0.78 : 0.66})`]} locations={[0.5, 0.66, 1]} style={plein} />;
}

/**
 * Le bloc des chiffres : deplace et grossi autour de son centre (pivot) quand tu l'as bouge dans l'atelier.
 * Une vue plein cadre porte la transformation : la capture de la carte la garde.
 */
function Bloc({ c, pivot, children }: { c: CtxDirection; pivot?: { x: number; y: number }; children: React.ReactNode }) {
  const t = transformBloc(c.placement, pivot ?? pivotParDefaut(c.W, c.H), c.W, c.H);
  if (!t) return <>{children}</>;
  return (
    <View pointerEvents="box-none" style={[plein, { transform: [{ translateX: t.tx }, { translateY: t.ty }, { scale: t.s }] }]}>
      {children}
    </View>
  );
}

/** La boite du bloc du bas, en points de la carte : le contenu se pose en bas */
function boiteBloc(b: Boite, extra?: ViewStyle): ViewStyle {
  return { position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, justifyContent: 'flex-end', ...(extra ?? {}) };
}

/** Le petit titre du coin du haut : le logo et une ligne courte, rien d'autre dans la zone du visage */
function CoinTitre({ c, titre, logo = true }: { c: CtxDirection; titre: string; logo?: boolean }) {
  const co = coinDeCarte(c.format, c.W, c.H);
  const t = Math.min(11, co.h * 0.36);
  return (
    <View style={{ position: 'absolute', left: co.x, top: co.y, width: co.w, height: co.h, flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
      {logo ? <Image source={LOGO} style={{ width: t * 2, height: t * 2, borderRadius: t * 0.48 }} /> : null}
      <Tx t={titre} size={t} color={BLANC} ls={t * 0.14} maj ombre lines={2} lh={1.12} style={{ flexShrink: 1, marginTop: t * 0.06 }} />
    </View>
  );
}

function Sticker({ src, x, y, w, rot = 0 }: { src: ImageSourcePropType; x: number; y: number; w: number; rot?: number }) {
  return <Image source={src} style={{ position: 'absolute', left: x, top: y, width: w, height: w, transform: [{ rotate: `${rot}deg` }] }} resizeMode="contain" />;
}

/** Le pied : logo YOROI et les deux badges officiels ; « badges » : seulement les badges, centres */
function Pied({ g, ink, mode = 'complet', gauche = 72, droite = 72, bas = 270, petit }: { g: Geo; ink: string; mode?: 'complet' | 'badges'; gauche?: number; droite?: number; bas?: number; petit?: boolean }) {
  const bh = g.S(petit ? 56 : 64);
  const logo = g.S(petit ? 62 : 74);
  const badges = (
    <View style={{ flexDirection: 'row', gap: g.S(14) }}>
      <Image source={BADGES.apple.image} style={{ width: bh * BADGES.apple.ratio, height: bh }} resizeMode="contain" />
      <Image source={BADGES.google.image} style={{ width: bh * BADGES.google.ratio, height: bh }} resizeMode="contain" />
    </View>
  );
  return (
    <View accessibilityLabel={traduire('YOROI, sur iPhone et Android')} style={{ position: 'absolute', left: g.X(gauche), right: g.X(droite), bottom: g.bas(bas), flexDirection: 'row', alignItems: 'center', justifyContent: mode === 'badges' ? 'center' : 'space-between' }}>
      {mode === 'complet' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: g.S(18) }}>
          <Image source={LOGO} style={{ width: logo, height: logo, borderRadius: logo * 0.24 }} />
          <Tx t="YOROI" size={g.S(petit ? 38 : 46)} color={ink} ls={g.S(6)} />
        </View>
      ) : null}
      {badges}
    </View>
  );
}

/** Libelle court en capitales, sans les precisions apres une virgule */
function court(l: string): string {
  return traduire(l).split(',')[0].toUpperCase();
}

function valeurTexte(s: StatValue): string {
  return `${s.value}${s.unit ? ` ${s.unit}` : ''}`;
}

/** Les couleurs franches de chaque sport, comme sur les planches */
function teinteSport(d: CarteData): 'course' | 'muscu' | 'combat' {
  return d.famille === 'course' ? 'course' : d.famille === 'combat' ? 'combat' : 'muscu';
}

// ============================================
// 01 AUTOCOLLANT NET
// ============================================

/** 01 avec ta photo : le titre au coin, le chiffre et 3 stats en bloc compact sous le visage */
function NetPhoto(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const b = blocDeCarte(c.format, c.W, c.H);
  const k = echelleBloc(b);
  const ink = BLANC;
  const trace = c.d.seance?.trace;
  const h = c.hero;
  const larg = b.w - (trace ? 70 * k : 0);
  const st = c.stats.slice(0, 3);
  const col = (b.w - 14 * k) / Math.max(1, st.length);
  return (
    <>
      <FondPhoto c={c} />
      <DegradeBas c={c} />
      <CoinTitre c={c} titre={c.titre} />
      <Bloc c={c} pivot={centre(b)}>
        <View style={boiteBloc(b)}>
          {h ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Tx t={court(h.label)} size={9 * k} f="extraBold" color={ink} ls={1.8 * k} ombre />
                <Chiffre v={h.value} u={h.unit} size={tailleChiffre(h.value, h.unit, larg, 76 * k, 'cond', 0.26)} usize={21 * k} color={ink} ombre lh={0.94} />
              </View>
              {trace ? <View style={{ width: 62 * k, height: 58 * k }}><Trace pts={trace.points} couleur={ink} epais={0.035} /></View> : null}
            </View>
          ) : null}
          {st.length ? (
            <View style={{ flexDirection: 'row', marginTop: 7 * k, borderTopWidth: 1, borderColor: rgba(ink, 0.9), paddingTop: 6 * k }}>
              {st.map((x, i) => (
                <View key={x.key + i} style={{ flex: 1, paddingLeft: i ? 7 * k : 0, borderLeftWidth: i ? 1 : 0, borderColor: rgba(ink, 0.9) }}>
                  <Tx t={court(x.label)} size={7.4 * k} f="extraBold" color={ink} ls={1.4 * k} ombre />
                  <Chiffre v={x.value} u={x.unit} size={tailleChiffre(x.value, x.unit, col - 8 * k, 30 * k, 'cond', 0.31)} usize={10 * k} uf="extraBold" color={ink} ombre />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Bloc>
      <Pied g={g} ink={ink} mode="badges" />
    </>
  );
}

function Net(c: CtxDirection) {
  if (visage(c, 'net')) return NetPhoto(c);
  const g = geo(c.format, c.W);
  const ink = encre(c);
  const ombre = !!c.photo || c.transparent;
  const trace = c.d.seance?.trace;
  const larg = g.S(936) - (trace ? g.S(240) : 0);
  const h = c.hero;
  const hs = h ? tailleChiffre(h.value, h.unit, larg, g.S(250), 'cond', 0.26) : 0;
  return (
    <>
      <FondPhoto c={c} />
      <Bloc c={c}>
      <View style={{ position: 'absolute', left: g.X(72), right: g.X(72), top: g.Y(1010) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: g.S(14) }}>
          <Image source={LOGO} style={{ width: g.S(54), height: g.S(54), borderRadius: g.S(13) }} />
          <Tx t={`YOROI · ${c.titre}`} size={g.S(28)} color={ink} ls={g.S(6)} maj ombre={ombre} style={{ flexShrink: 1 }} />
          <View style={{ flex: 1, height: Math.max(1, g.S(3)), backgroundColor: rgba(ink, 0.9), marginLeft: g.S(6) }} />
        </View>
        {h ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: g.S(6) }}>
            <View>
              <Tx t={court(h.label)} size={g.S(26)} f="extraBold" color={ink} ls={g.S(6)} ombre={ombre} style={{ marginTop: g.S(14) }} />
              <Chiffre v={h.value} u={h.unit} size={hs} usize={g.S(64)} color={ink} ombre={ombre} lh={0.92} />
            </View>
            {trace ? <View style={{ width: g.S(220), height: g.S(210) }}><Trace pts={trace.points} couleur={ink} epais={0.035} /></View> : null}
          </View>
        ) : null}
        {c.stats.length ? (
          <View style={{ flexDirection: 'row', marginTop: g.S(22), borderTopWidth: Math.max(1, g.S(3)), borderColor: rgba(ink, 0.9), paddingTop: g.S(18) }}>
            {c.stats.slice(0, 3).map((s, i) => {
              const col = (g.S(936) - g.S(22) * 2) / 3;
              return (
                <View key={s.key + i} style={{ flex: 1, paddingLeft: i ? g.S(22) : 0, borderLeftWidth: i ? Math.max(1, g.S(3)) : 0, borderColor: rgba(ink, 0.9) }}>
                  <Tx t={court(s.label)} size={g.S(22)} f="extraBold" color={ink} ls={g.S(5)} ombre={ombre} />
                  <Chiffre v={s.value} u={s.unit} size={tailleChiffre(s.value, s.unit, col, g.S(96), 'cond', 0.31)} usize={g.S(30)} uf="extraBold" color={ink} ombre={ombre} />
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      </Bloc>
      <Pied g={g} ink={ink} mode="badges" />
    </>
  );
}

/** Le trace GPS en blanc */
function Trace({ pts, couleur, epais = 0.03 }: { pts: [number, number][]; couleur: string; epais?: number }) {
  const maxX = Math.max(...pts.map((p) => p[0]), 0.01);
  const maxY = Math.max(...pts.map((p) => p[1]), 0.01);
  const m = 0.06;
  const dd = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(' ');
  return (
    <Svg width="100%" height="100%" viewBox={`${-m} ${-m} ${maxX + 2 * m} ${maxY + 2 * m}`}>
      <Path d={dd} stroke="rgba(0,0,0,0.35)" strokeWidth={epais * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={dd} stroke={couleur} strokeWidth={epais} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[0][0]} cy={pts[0][1]} r={epais * 1.3} fill={couleur} />
    </Svg>
  );
}

// ============================================
// 02 AUTOCOLLANT CHROME
// ============================================

/** Un texte en metal chrome : relief en couches sombres, degrade de reflets, filet clair. Dessine en SVG. */
function TexteChrome({ t, size, w, id }: { t: string; size: number; w: number; id: string }) {
  const h = size * 1.12;
  const couches = [];
  const n = 14;
  for (let i = n; i >= 1; i--) couches.push(<SvgText key={i} x={w / 2 + i * size * 0.0011} y={size * 0.9 + i * size * 0.0034} fill={`url(#ex${id})`} fontFamily={policesCartes.condense} fontSize={size} textAnchor="middle">{t}</SvgText>);
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ transform: [{ skewX: '-9deg' }] }}>
      <Defs>
        <SvgGradient id={`ch${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.22" stopColor="#dceaff" />
          <Stop offset="0.44" stopColor="#8e9aab" />
          <Stop offset="0.5" stopColor="#1e232b" />
          <Stop offset="0.56" stopColor="#4b5666" />
          <Stop offset="0.7" stopColor="#f1dcc0" />
          <Stop offset="0.86" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#9aa7b7" />
        </SvgGradient>
        <SvgGradient id={`ex${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5b6675" />
          <Stop offset="1" stopColor="#0d1015" />
        </SvgGradient>
      </Defs>
      <G opacity={0.55}>
        <SvgText x={w / 2} y={size * 0.9 + size * 0.07} fill="#000" fontFamily={policesCartes.condense} fontSize={size} textAnchor="middle">{t}</SvgText>
      </G>
      {couches}
      <SvgText x={w / 2} y={size * 0.9} fill={`url(#ch${id})`} stroke="#2a303a" strokeWidth={Math.max(0.6, size * 0.01)} fontFamily={policesCartes.condense} fontSize={size} textAnchor="middle">{t}</SvgText>
      <SvgText x={w / 2} y={size * 0.9} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={Math.max(0.4, size * 0.0075)} fontFamily={policesCartes.condense} fontSize={size} textAnchor="middle">{t}</SvgText>
    </Svg>
  );
}

/** 02 avec ta photo : le chiffre chrome plus petit en bas, les stats en verre depoli dessous */
function ChromePhoto(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const b = blocDeCarte(c.format, c.W, c.H);
  const k = echelleBloc(b);
  const h = c.hero;
  const val = h ? `${h.value}${h.unit ? ` ${h.unit.toUpperCase()}` : ''}` : '';
  const size = Math.min(72 * k, (b.w * 0.94) / Math.max(1, val.length * 0.45));
  const st = c.stats.slice(0, 3);
  return (
    <>
      <FondPhoto c={c} />
      <DegradeBas c={c} />
      <CoinTitre c={c} titre={c.titre} />
      <Bloc c={c} pivot={centre(b)}>
        <View style={boiteBloc(b, { alignItems: 'center' })}>
          {h ? <TexteChrome t={val} size={size} w={b.w} id="vp" /> : null}
          <Tx t={h?.label ? traduire(h.label) : c.titre} size={8.6 * k} f="extraBold" color={BLANC} ls={1.8 * k} maj ombre align="center" style={{ marginTop: 2 * k, maxWidth: b.w }} />
          {st.length ? (
            <View style={{ flexDirection: 'row', gap: 6 * k, marginTop: 8 * k }}>
              {st.map((x, i) => (
                <View key={x.key + i} style={{ width: (b.w - 12 * k) / 3, paddingVertical: 6 * k, paddingHorizontal: 6 * k, borderRadius: 9 * k, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center' }}>
                  <LinearGradient colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0.08)']} style={plein} />
                  <Tx t={court(x.label)} size={7 * k} f="extraBold" color={BLANC} ls={1.4 * k} style={{ opacity: 0.92 }} ombre />
                  <Chiffre v={x.value} u={x.unit} size={tailleChiffre(x.value, x.unit, (b.w - 12 * k) / 3 - 14 * k, 21 * k, 'black', 0.44)} f="black" usize={9 * k} uf="extraBold" color={BLANC} ombre />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Bloc>
      <Pied g={g} ink={BLANC} mode="badges" />
    </>
  );
}

function Chrome(c: CtxDirection) {
  if (visage(c, 'chrome')) return ChromePhoto(c);
  const g = geo(c.format, c.W);
  const h = c.hero;
  const ombre = true;
  const val = h?.value ?? '';
  const size = Math.min(g.S(330), (c.W * 0.92) / Math.max(1, val.length * 0.45));
  return (
    <>
      <FondPhoto c={c} />
      <Bloc c={c} pivot={{ x: c.W / 2, y: g.Y(900) }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: g.Y(560), alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: g.S(16) }}>
          <Image source={LOGO} style={{ width: g.S(58), height: g.S(58), borderRadius: g.S(14), borderWidth: Math.max(1, g.S(3)), borderColor: '#dfe6ee' }} />
          <Tx t="YOROI" size={g.S(30)} color={BLANC} ls={g.S(8)} ombre={ombre} />
        </View>
        {h ? <TexteChrome t={val} size={size} w={c.W} id="v" /> : null}
        {h?.unit ? <View style={{ marginTop: -g.S(24) }}><TexteChrome t={h.unit.toUpperCase()} size={g.S(120)} w={c.W} id="u" /></View> : null}
        <Tx t={`${c.titre}${h?.label ? ` · ${traduire(h.label)}` : ''}`} size={g.S(30)} f="extraBold" color={BLANC} ls={g.S(6)} maj ombre={ombre} style={{ marginTop: g.S(14), maxWidth: c.W - 24 }} align="center" />
        {c.stats.length ? (
          <View style={{ flexDirection: 'row', gap: g.S(18), marginTop: g.S(40) }}>
            {c.stats.slice(0, 3).map((s, i) => (
              <View key={s.key + i} style={{ minWidth: g.S(230), maxWidth: (c.W - 30) / Math.min(3, c.stats.length), paddingVertical: g.S(22), paddingHorizontal: g.S(26), borderRadius: g.S(26), overflow: 'hidden', borderWidth: Math.max(1, g.S(2)), borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center' }}>
                <LinearGradient colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0.08)']} style={plein} />
                <View style={{ position: 'absolute', left: g.S(12), right: g.S(12), top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.6)' }} />
                <Tx t={court(s.label)} size={g.S(22)} f="extraBold" color={BLANC} ls={g.S(5)} style={{ opacity: 0.92 }} ombre />
                <Chiffre v={s.value} u={s.unit} size={tailleChiffre(s.value, s.unit, g.S(200), g.S(64), 'black', 0.44)} f="black" usize={g.S(28)} uf="extraBold" color={BLANC} ombre />
              </View>
            ))}
          </View>
        ) : null}
      </View>
      </Bloc>
      <Pied g={g} ink={BLANC} mode="badges" />
    </>
  );
}

// ============================================
// 03 PLANCHE DE STICKERS
// ============================================

const COULEURS_STICKERS = {
  course: ['#FF3B30', '#FFD60A', '#2F6BFF'],
  muscu: ['#FFD60A', '#FF2D87', '#2F6BFF'],
  combat: ['#2F6BFF', '#FFD60A', '#FF3B30'],
} as const;

const encreSur = (x: string) => (x === '#FFD60A' ? '#111111' : BLANC);

/** Le titre en lettres de sticker : epais contour blanc (SVG), sur deux lignes au plus */
function TitreSticker({ t, w, size, couleur, contour, uneLigne }: { t: string; w: number; size: number; couleur: string; contour: number; uneLigne?: boolean }) {
  const mots = t.toUpperCase().split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  for (const m of mots) {
    const der = lignes[lignes.length - 1];
    if (der && (der.length + 1 + m.length) * 0.56 * size <= w && lignes.length) lignes[lignes.length - 1] = `${der} ${m}`;
    else lignes.push(m);
  }
  const l2 = uneLigne ? [lignes.join(' ')] : lignes.length > 2 ? [lignes[0], lignes.slice(1).join(' ')] : lignes;
  const plusLong = Math.max(...l2.map((x) => x.length));
  const fs = Math.min(size, (w - contour) / Math.max(1, plusLong * 0.56));
  const lh = fs * 0.88;
  const h = lh * l2.length + contour + fs * 0.12;
  return (
    <Svg width={w} height={h}>
      {l2.map((x, i) => (
        <SvgText key={`c${i}`} x={contour / 2} y={contour / 2 + fs * 0.86 + i * lh} fill={BLANC} stroke={BLANC} strokeWidth={contour} strokeLinejoin="round" fontFamily={policesCartes.condense} fontSize={fs}>{x}</SvgText>
      ))}
      {l2.map((x, i) => (
        <SvgText key={`t${i}`} x={contour / 2} y={contour / 2 + fs * 0.86 + i * lh} fill={couleur} fontFamily={policesCartes.condense} fontSize={fs}>{x}</SvgText>
      ))}
    </Svg>
  );
}

function PastilleSticker({ s, bg, x, y, rot, size, g }: { s: { l: string; v: string; u?: string }; bg: string; x: number; y: number; rot: number; size: number; g: Geo }) {
  const ink = encreSur(bg);
  return (
    <View style={{ position: 'absolute', left: x, top: y, transform: [{ rotate: `${rot}deg` }], paddingTop: g.S(20), paddingBottom: g.S(24), paddingHorizontal: g.S(40), borderRadius: 999, borderWidth: g.S(12), borderColor: BLANC, backgroundColor: bg, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: g.S(20), shadowOffset: { width: 0, height: g.S(14) }, elevation: 6 }}>
      <Tx t={s.l} size={g.S(22)} color={ink} ls={g.S(5)} maj style={{ opacity: 0.9 }} />
      <Chiffre v={s.v} u={s.u} f="black" size={Math.min(size, tailleChiffre(s.v, s.u, g.S(340), size, 'black', 0.42))} uf="black" color={ink} lh={1.05} />
    </View>
  );
}

/** Une pastille de la planche compacte (avec ta photo) : posee dans le flux, pas en absolu */
function PastillePetite({ s, bg, rot, k, maxW }: { s: { l: string; v: string; u?: string }; bg: string; rot: number; k: number; maxW: number }) {
  const ink = encreSur(bg);
  return (
    <View style={{ maxWidth: maxW, flexShrink: 1, transform: [{ rotate: `${rot}deg` }], paddingTop: 4 * k, paddingBottom: 5 * k, paddingHorizontal: 11 * k, borderRadius: 999, borderWidth: 3.2 * k, borderColor: BLANC, backgroundColor: bg, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 5 * k, shadowOffset: { width: 0, height: 3 * k }, elevation: 4 }}>
      <Tx t={s.l} size={6.4 * k} color={ink} ls={1.3 * k} maj style={{ opacity: 0.9 }} />
      <Chiffre v={s.v} u={s.u} f="black" size={tailleChiffre(s.v, s.u, Math.min(90 * k, maxW - 29 * k), 19 * k, 'black', 0.42)} uf="black" color={ink} lh={1.05} />
    </View>
  );
}

/** 03 avec ta photo : un sticker au coin du haut, la planche compacte en bas (titre, chiffre, pastilles) */
function StickersPhoto(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const b = blocDeCarte(c.format, c.W, c.H);
  const co = coinDeCarte(c.format, c.W, c.H);
  const k = echelleBloc(b);
  const col = COULEURS_STICKERS[teinteSport(c.d)];
  const h = c.hero;
  const [s1, s2, s3] = c.stats;
  const signature = c.record ? { l: traduire('Record battu'), v: c.record.court } : s3 ? { l: court(s3.label), v: valeurTexte(s3) } : null;
  const ombre = { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 7 * k, shadowOffset: { width: 0, height: 4 * k } } as const;
  return (
    <>
      <FondPhoto c={c} />
      <DegradeBas c={c} />
      <Sticker src={STICKERS[stickerDeCarte(c.d)]} x={co.x} y={co.y} w={Math.min(co.h, co.w)} rot={-10} />
      <Bloc c={c} pivot={centre(b)}>
        <View style={boiteBloc(b)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={[{ transform: [{ rotate: '-3deg' }] }, ombre]}>
              <TitreSticker t={c.titre} w={b.w * 0.64} size={30 * k} couleur={col[0]} contour={7 * k} uneLigne />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 * k, paddingVertical: 3.5 * k, paddingLeft: 3.5 * k, paddingRight: 8 * k, backgroundColor: '#111111', borderWidth: 2.8 * k, borderColor: BLANC, borderRadius: 999, transform: [{ rotate: '-6deg' }] }}>
              <Image source={LOGO} style={{ width: 20 * k, height: 20 * k, borderRadius: 10 * k }} />
              <Tx t="YOROI" size={11.5 * k} color={BLANC} ls={1.6 * k} />
            </View>
          </View>
          {h ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 * k }}>
              <View style={[{ transform: [{ rotate: '-3deg' }], paddingTop: 6 * k, paddingBottom: 7 * k, paddingHorizontal: 13 * k, backgroundColor: BLANC, borderRadius: 13 * k, elevation: 8 }, ombre]}>
                <Tx t={court(h.label)} size={8 * k} color={col[0] === '#FFD60A' ? '#111111' : col[0]} ls={1.6 * k} />
                <Chiffre v={h.value} u={h.unit} size={tailleChiffre(h.value, h.unit, b.w * 0.58, 52 * k, 'cond', 0.3)} usize={17 * k} color="#111111" lh={0.95} />
              </View>
              {c.record ? <Image source={STICKERS.trophee} style={{ width: 42 * k, height: 42 * k, marginLeft: 8 * k, transform: [{ rotate: '14deg' }] }} resizeMode="contain" /> : null}
              <Image source={STICKERS.flamme} style={{ width: 36 * k, height: 36 * k, marginLeft: 4 * k, transform: [{ rotate: '12deg' }] }} resizeMode="contain" />
            </View>
          ) : null}
          {/* une seule rangee de pastilles : la planche ne remonte jamais vers le visage */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 * k, marginTop: 6 * k }}>
            {s1 ? <PastillePetite s={{ l: court(s1.label), v: s1.value, u: s1.unit }} bg={col[1]} rot={-4} k={k} maxW={(b.w - 10 * k) / 3} /> : null}
            {s2 ? <PastillePetite s={{ l: court(s2.label), v: s2.value, u: s2.unit }} bg={col[2]} rot={3} k={k} maxW={(b.w - 10 * k) / 3} /> : null}
            {signature ? <PastillePetite s={signature} bg="#111111" rot={-2} k={k} maxW={(b.w - 10 * k) / 3} /> : null}
          </View>
        </View>
      </Bloc>
      <Pied g={g} ink={BLANC} mode="badges" />
    </>
  );
}

function Stickers(c: CtxDirection) {
  if (visage(c, 'stickers')) return StickersPhoto(c);
  const g = geo(c.format, c.W);
  const col = COULEURS_STICKERS[teinteSport(c.d)];
  const h = c.hero;
  const [s1, s2, s3] = c.stats;
  const signature = c.record ? { l: traduire('Record battu'), v: c.record.court } : s3 ? { l: court(s3.label), v: valeurTexte(s3) } : null;
  return (
    <>
      <FondPhoto c={c} />
      <Bloc c={c} pivot={{ x: c.W / 2, y: g.Y(1100) }}>
      <Sticker src={STICKERS[stickerDeCarte(c.d)]} x={g.X(70)} y={g.Y(250)} w={g.S(420)} rot={-10} />
      <View style={{ position: 'absolute', left: g.X(440), top: g.Y(330), transform: [{ rotate: '6deg' }], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: g.S(18), shadowOffset: { width: 0, height: g.S(12) } }}>
        <TitreSticker t={c.titre} w={g.S(600)} size={g.S(150)} couleur={col[0]} contour={g.S(30)} />
      </View>
      {h ? (
        <View style={{ position: 'absolute', left: g.X(90), top: g.Y(760), transform: [{ rotate: '-4deg' }], paddingTop: g.S(26), paddingBottom: g.S(30), paddingHorizontal: g.S(46), backgroundColor: BLANC, borderRadius: g.S(44), shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: g.S(28), shadowOffset: { width: 0, height: g.S(18) }, elevation: 8 }}>
          <Tx t={court(h.label)} size={g.S(28)} color={col[0] === '#FFD60A' ? '#111111' : col[0]} ls={g.S(6)} />
          <Chiffre v={h.value} u={h.unit} size={tailleChiffre(h.value, h.unit, g.S(700), g.S(230), 'cond', 0.3)} usize={g.S(70)} color="#111111" lh={0.95} />
        </View>
      ) : null}
      {c.record ? <Sticker src={STICKERS.trophee} x={g.X(800)} y={g.Y(690)} w={g.S(190)} rot={14} /> : null}
      {s1 ? <PastilleSticker g={g} s={{ l: court(s1.label), v: s1.value, u: s1.unit }} bg={col[1]} x={g.X(650)} y={g.Y(1125)} rot={7} size={g.S(70)} /> : null}
      {s2 ? <PastilleSticker g={g} s={{ l: court(s2.label), v: s2.value, u: s2.unit }} bg={col[2]} x={g.X(90)} y={g.Y(1150)} rot={-7} size={g.S(70)} /> : null}
      <Sticker src={STICKERS.flamme} x={g.X(455)} y={g.Y(1150)} w={g.S(150)} rot={12} />
      {signature ? <PastilleSticker g={g} s={signature} bg="#111111" x={g.X(100)} y={g.Y(1350)} rot={3} size={g.S(52)} /> : null}
      <View style={{ position: 'absolute', right: g.X(80), top: g.Y(1330), transform: [{ rotate: '-6deg' }], flexDirection: 'row', alignItems: 'center', gap: g.S(14), paddingVertical: g.S(14), paddingLeft: g.S(14), paddingRight: g.S(30), backgroundColor: '#111111', borderWidth: g.S(10), borderColor: BLANC, borderRadius: 999 }}>
        <Image source={LOGO} style={{ width: g.S(78), height: g.S(78), borderRadius: g.S(39) }} />
        <Tx t="YOROI" size={g.S(44)} color={BLANC} ls={g.S(6)} />
      </View>
      </Bloc>
      <Pied g={g} ink={BLANC} mode="badges" />
    </>
  );
}

// ============================================
// 04 CARTE HOLOGRAPHIQUE
// ============================================

const ACCENT_HOLO = { course: '#FF5A1F', muscu: '#FF2D87', combat: '#3D7BFF' } as const;

function Holo(c: CtxDirection) {
  const g = geo(c.format, c.W);
  // la couleur choisie colore la carte ; le noir garde l'accent du sport
  const acc = c.coul.id === 'noir' ? ACCENT_HOLO[teinteSport(c.d)] : c.coul.fond;
  const ec = ecussonHolo(c.d);
  const an = anneeDe(c.d);
  const h = c.hero;
  const L = g.S(840);
  const Hc = g.S(1190);
  const cx = (n: number) => g.S(n);
  return (
    <>
      <Svg width={c.W} height={c.H} style={plein}>
        <Defs>
          <RadialGradient id="hb" cx="50%" cy="42%" rx="110%" ry="60%">
            <Stop offset="0" stopColor={acc} />
            <Stop offset="0.5" stopColor="#1a0630" />
            <Stop offset="1" stopColor="#050208" />
          </RadialGradient>
          <RadialGradient id="hg" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#ff2d87" stopOpacity={0.45} />
            <Stop offset="0.45" stopColor="#2fb8ff" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#8b5cff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={c.W} height={c.H} fill="url(#hb)" />
        <Rect x={g.X(40)} y={g.Y(300)} width={g.S(1000)} height={g.S(1250)} fill="url(#hg)" />
      </Svg>
      <Tx t={traduire('Ta carte du jour')} size={g.S(30)} color={BLANC} ls={g.S(9)} maj align="center" style={{ position: 'absolute', left: 0, right: 0, top: g.Y(232) - g.S(36) }} />
      <View style={{ position: 'absolute', left: g.X(120), top: g.Y(310), width: L, height: Hc, transform: [{ perspective: 1200 }, { rotateY: '-9deg' }, { rotateX: '4deg' }, { rotateZ: '-1.2deg' }], borderRadius: g.S(46), overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.65, shadowRadius: g.S(60), shadowOffset: { width: -g.S(30), height: g.S(50) } }}>
        <LinearGradient colors={['#ff8fd8', '#ffe86b', '#7dffbf', '#73d0ff', '#b39bff', '#ff8fd8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={plein} />
        <View style={{ position: 'absolute', left: cx(20), top: cx(20), right: cx(20), bottom: cx(20), borderRadius: g.S(32), overflow: 'hidden' }}>
          <LinearGradient colors={['#1b1b24', '#0b0b10']} style={plein} />
          <View style={{ position: 'absolute', left: cx(24), right: cx(24), top: cx(24), height: cx(690), borderRadius: g.S(22), overflow: 'hidden', backgroundColor: acc }}>
            {c.photo ? <Photo src={c.photo} /> : (
              <>
                <LinearGradient colors={[acc, '#1b1b24']} style={plein} />
                <Image source={STICKERS[stickerDeCarte(c.d)]} style={{ position: 'absolute', alignSelf: 'center', top: cx(90), width: cx(420), height: cx(420) }} resizeMode="contain" />
              </>
            )}
            <LinearGradient colors={['rgba(11,11,16,0)', 'rgba(11,11,16,0.95)']} locations={[0.55, 1]} style={plein} />
          </View>
          {ec ? (
            <View style={{ position: 'absolute', left: cx(52), top: cx(52), width: cx(150), paddingTop: cx(16), paddingBottom: cx(18), alignItems: 'center', borderTopLeftRadius: cx(22), borderTopRightRadius: cx(22), borderBottomLeftRadius: cx(75), borderBottomRightRadius: cx(75), overflow: 'hidden' }}>
              <LinearGradient colors={['#fff6c4', '#ffd23c', '#f29b00']} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={plein} />
              <Tx t={ec.valeur} f="cond" size={tailleQuiTient(ec.valeur, cx(130), cx(104), 'cond')} color="#1b1200" lh={0.95} />
              <Tx t={ec.label} size={cx(20)} color="#1b1200" ls={cx(3)} />
            </View>
          ) : null}
          {an ? (
            <View style={{ position: 'absolute', right: cx(50), top: cx(52), backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: Math.max(1, cx(2)), borderColor: 'rgba(255,255,255,0.5)', borderRadius: 999, paddingVertical: cx(10), paddingHorizontal: cx(22) }}>
              <Tx t={traduire('SAISON {0}', an)} size={cx(22)} color={BLANC} ls={cx(4)} />
            </View>
          ) : null}
          <Tx t={c.titre} f="cond" size={tailleQuiTient(c.titre, cx(700) / 1.25, cx(118), 'cond')} color={BLANC} maj ombre style={{ position: 'absolute', left: cx(52), right: cx(52), top: cx(560) }} />
          <View style={{ position: 'absolute', left: cx(24), right: cx(24), top: cx(730), height: cx(62), borderRadius: cx(14), overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: cx(26) }}>
            <LinearGradient colors={[acc, '#ffd60a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={plein} />
            <Tx t={c.date} size={cx(25)} color="#111111" ls={cx(4)} maj style={{ flexShrink: 1 }} />
            {c.record ? <Tx t={traduire('Record')} size={cx(25)} color="#111111" ls={cx(4)} maj /> : null}
          </View>
          {h ? (
            <View style={{ position: 'absolute', left: cx(44), right: cx(44), top: cx(812), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Tx t={court(h.label)} size={cx(24)} f="extraBold" color={rgba(BLANC, 0.8)} ls={cx(4)} style={{ flexShrink: 1, marginBottom: cx(16) }} />
              <Chiffre v={h.value} u={h.unit} size={tailleChiffre(h.value, h.unit, cx(460), cx(112), 'cond', 0.32)} usize={cx(36)} color={BLANC} />
            </View>
          ) : null}
          {c.stats.length ? (
            <View style={{ position: 'absolute', left: cx(44), right: cx(44), top: cx(948), flexDirection: 'row', gap: cx(14) }}>
              {c.stats.slice(0, 3).map((s, i) => (
                <View key={s.key + i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: cx(16), paddingVertical: cx(14), paddingHorizontal: cx(8), alignItems: 'center' }}>
                  <Tx t={court(s.label)} size={cx(18)} f="extraBold" color={rgba(BLANC, 0.75)} ls={cx(3)} />
                  <Chiffre v={s.value} u={s.unit} f="black" size={tailleChiffre(s.value, s.unit, cx(220), cx(44), 'black', 0.45)} usize={cx(20)} color={BLANC} />
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: cx(44), right: cx(44), bottom: cx(26), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: cx(10) }}>
              <Image source={LOGO} style={{ width: cx(40), height: cx(40), borderRadius: cx(9) }} />
              <Tx t="YOROI" size={cx(19)} f="extraBold" color={BLANC} ls={cx(3)} />
            </View>
            {c.record ? <Tx t={c.record.nom} size={cx(19)} f="extraBold" color={rgba(BLANC, 0.9)} ls={cx(3)} maj style={{ flexShrink: 1, marginLeft: cx(20) }} /> : null}
          </View>
        </View>
        {/* le reflet qui traverse la carte */}
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)']} locations={[0.28, 0.4, 0.47, 0.55]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.85 }} style={plein} />
        <LinearGradient pointerEvents="none" colors={['rgba(255,60,180,0.10)', 'rgba(255,220,60,0.08)', 'rgba(60,255,170,0.08)', 'rgba(60,180,255,0.10)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={plein} />
      </View>
      <Pied g={g} ink={BLANC} />
    </>
  );
}

// ============================================
// 05 RETROSPECTIVE EXPLOSIVE
// ============================================

const PALETTE_RETRO = {
  course: { bg: '#FF4D00', a: '#FFE500', b: '#FF2D87', c: '#111111', t: BLANC, big: '#111111' },
  muscu: { bg: '#C8FF00', a: '#FF2D87', b: '#2F3BFF', c: '#111111', t: '#111111', big: '#111111' },
  combat: { bg: '#5B2BFF', a: '#00E0FF', b: '#FFE500', c: BLANC, t: BLANC, big: '#FFE500' },
} as const;

function Retro(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const t = teinteSport(c.d);
  const p = PALETTE_RETRO[t];
  const cv = conversionPour(c.d);
  if (!cv) return Net(c);
  const autres = c.stats.concat(c.hero ? [c.hero] : []).filter((s) => s.key !== cv.cle).slice(0, 3);
  const perso = c.personnage ?? STICKERS[stickerDeCarte(c.d)];
  return (
    <>
      <View style={[plein, { backgroundColor: p.bg }]} />
      <View style={{ position: 'absolute', right: -g.S(180), top: g.Y(160), width: g.S(560), height: g.S(560), backgroundColor: p.b, borderRadius: g.S(120), transform: [{ rotate: '18deg' }] }} />
      <View style={{ position: 'absolute', left: -g.S(220), top: g.Y(980), width: g.S(900), height: g.S(900), borderRadius: g.S(450), backgroundColor: p.a }} />
      <Svg width={g.S(480)} height={g.S(400)} style={{ position: 'absolute', left: g.X(520), top: g.Y(940), transform: [{ rotate: '-14deg' }] }}>
        <Path d={`M${g.S(240)} 0 L${g.S(480)} ${g.S(400)} L0 ${g.S(400)} Z`} fill={p.b} />
      </Svg>
      <Tx t={cv.intro} size={g.S(54)} color={p.t} style={{ position: 'absolute', left: g.X(72), right: g.X(72), top: g.Y(250) }} />
      <View style={{ position: 'absolute', left: g.X(72), right: g.X(72), top: g.Y(320) }}>
        <Chiffre v={cv.valeur} u={cv.unite} size={tailleChiffre(cv.valeur, cv.unite, g.S(936), g.S(330), 'cond', 0.4)} usize={g.S(130)} color={p.big} lh={0.9} ls={-g.S(6)} />
      </View>
      <Tx t={cv.lien} size={g.S(54)} color={p.t} style={{ position: 'absolute', left: g.X(72), top: g.Y(640) }} />
      <View style={{ position: 'absolute', left: g.X(72), right: g.X(72), top: g.Y(700), flexDirection: 'row', alignItems: 'flex-end', gap: g.S(26) }}>
        <Tx t={cv.nombre} f="cond" size={tailleQuiTient(cv.nombre, g.S(440), g.S(300), 'cond')} color={p.c} lh={0.86} />
        <View style={{ flexShrink: 1, maxWidth: g.S(440), paddingBottom: g.S(16) }}>
          <Tx t={cv.libelle} size={g.S(56)} color={p.c} maj lines={2} lh={1.0} />
          <Tx t={cv.detail} size={g.S(36)} f="extraBold" color={p.c} lines={2} />
        </View>
      </View>
      <Image source={perso} style={{ position: 'absolute', right: -g.S(20), bottom: g.bas(372), height: g.S(720), width: g.S(520) }} resizeMode="contain" />
      <View style={{ position: 'absolute', left: g.X(72), top: g.Y(1130), gap: g.S(16) }}>
        {autres.map((s, i) => (
          <View key={s.key + i} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', borderRadius: 999, paddingVertical: g.S(16), paddingHorizontal: g.S(30), gap: g.S(14) }}>
            <Tx t={court(s.label)} size={g.S(22)} f="extraBold" color={rgba(BLANC, 0.8)} ls={g.S(4)} />
            <Tx t={valeurTexte(s)} size={g.S(40)} color={BLANC} />
          </View>
        ))}
      </View>
      <Pied g={g} ink={t === 'combat' ? BLANC : '#111111'} />
    </>
  );
}

// ============================================
// 06 FLASH ARGENTIQUE
// ============================================

function phraseFlash(d: CarteData): string {
  if (d.moment === 'pesee') return traduire('la balance a parlé.');
  if (d.moment === 'semaine') return traduire('une semaine bien remplie.');
  if (d.moment === 'mois') return traduire('un mois bien rempli.');
  if (d.moment === 'annee') return traduire('une année au compteur.');
  if (d.famille === 'muscu') return traduire('les muscles ont dit merci.');
  if (d.famille === 'course') return traduire('un pas après l’autre.');
  if (d.famille === 'combat') return traduire('zéro excuse sur le tatami.');
  return traduire('une de plus au compteur.');
}

/** La date de l'appareil jetable : « '26 10 31 », null si la date n'est pas connue */
export function dateFlash(iso: string | null | undefined): string | null {
  const m = /^(\d{2})(\d{2})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `'${m[2]} ${m[3]} ${m[4]}` : null;
}

function Flash(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const trous = Array.from({ length: c.format === 'story' ? 22 : c.format === 'post' ? 16 : 12 });
  const df = dateFlash(c.d.dateIso ?? c.d.exploit?.date ?? c.d.semaine?.debut);
  const h = c.hero;
  // avec ta photo, le titre reste petit dans le coin du cadre : le visage reste libre
  const vis = visage(c, 'flash');
  const Rail = ({ gauche }: { gauche: boolean }) => (
    <View style={{ position: 'absolute', top: 0, bottom: 0, [gauche ? 'left' : 'right']: 0, width: c.W * (86 / 1080), justifyContent: 'space-around', alignItems: 'center', paddingVertical: 6 }}>
      {trous.map((_, i) => <View key={i} style={{ width: c.W * (40 / 1080), height: c.W * (56 / 1080), borderRadius: 3, backgroundColor: 'rgba(244,239,230,0.92)' }} />)}
    </View>
  );
  const Bord = ({ gauche, textes }: { gauche: boolean; textes: string[] }) => (
    <View style={{ position: 'absolute', top: 0, bottom: 0, [gauche ? 'left' : 'right']: c.W * (90 / 1080), width: c.W * (30 / 1080), justifyContent: 'space-around', alignItems: 'center' }}>
      {textes.map((x, i) => (
        <View key={i} style={{ width: c.W * (30 / 1080), height: 60, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
          <View style={{ position: 'absolute', width: 60, left: c.W * (15 / 1080) - 30, top: 22, alignItems: 'center', transform: [{ rotate: gauche ? '90deg' : '-90deg' }] }}>
            <Text allowFontScaling={false} style={[police('extraBold'), { fontSize: c.W * (22 / 1080), color: '#ff9a1f', letterSpacing: 1.5, includeFontPadding: false }]}>{x}</Text>
          </View>
        </View>
      ))}
    </View>
  );
  return (
    <>
      <View style={[plein, { backgroundColor: '#0b0b0b' }]} />
      <Rail gauche />
      <Rail gauche={false} />
      <Bord gauche textes={['YOROI 400', '24', '24A', 'YOROI 400']} />
      <Bord gauche={false} textes={['25', 'YOROI 400', '25A']} />
      <View style={{ position: 'absolute', left: c.W * (130 / 1080), right: c.W * (130 / 1080), top: g.Y(200), height: g.S(1210), borderRadius: 2, overflow: 'hidden', backgroundColor: c.coul.fond }}>
        {c.photo ? <Photo src={c.photo} /> : (
          <>
            <LinearGradient colors={[c.coul.fond, c.coul.profond]} style={plein} />
            <Image source={STICKERS[stickerDeCarte(c.d)]} style={{ position: 'absolute', alignSelf: 'center', top: g.S(420), width: g.S(520), height: g.S(520) }} resizeMode="contain" />
          </>
        )}
        <LinearGradient colors={['rgba(255,120,40,0.10)', 'rgba(40,0,80,0.18)']} style={plein} />
        <Svg width="100%" height="100%" style={plein}>
          <Defs>
            <RadialGradient id="fl" cx="50%" cy="42%" rx="60%" ry="45%">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.34} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="vg" cx="50%" cy="45%" rx="70%" ry="62%">
              <Stop offset="0.68" stopColor="#000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000" stopOpacity={0.75} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fl)" />
          <Rect width="100%" height="100%" fill="url(#vg)" />
        </Svg>
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']} locations={[0, vis ? 0.18 : 0.32]} style={plein} />
        {vis ? (
          <View style={{ position: 'absolute', left: g.S(40), top: g.S(30), width: c.W * 0.4 }}>
            <Tx t={`${c.titre},`} f="serif" size={tailleQuiTient(`${c.titre},`, c.W * 0.4, g.S(62), 'serif')} color={BLANC} lh={0.98} ombre />
            <Tx t={phraseFlash(c.d)} f="serif" size={g.S(30)} color={BLANC} lh={1.05} ombre style={{ marginTop: g.S(4), opacity: 0.95 }} />
          </View>
        ) : (
          <View style={{ position: 'absolute', left: g.S(46), right: g.S(46), top: g.S(40) }}>
            <Tx t={`${c.titre},`} f="serif" size={tailleQuiTient(`${c.titre},`, g.S(730), g.S(128), 'serif')} color={BLANC} lh={0.95} ombre ls={-g.S(2)} />
            <Tx t={phraseFlash(c.d)} f="serif" size={g.S(52)} color={BLANC} lines={2} lh={1.05} ombre style={{ marginTop: g.S(10), opacity: 0.95 }} />
          </View>
        )}
        {df ? <Tx t={df} f="cond" size={g.S(50)} color="#ff8a1a" ls={g.S(6)} style={{ position: 'absolute', right: g.S(40), bottom: g.S(36), textShadowColor: 'rgba(255,120,0,0.9)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }} /> : null}
      </View>
      <Bloc c={c} pivot={{ x: c.W / 2, y: g.Y(1500) }}>
      <View style={{ position: 'absolute', left: c.W * (130 / 1080), right: c.W * (130 / 1080), top: g.Y(1440), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
        {h ? <Chiffre v={h.value} u={h.unit} size={tailleChiffre(h.value, h.unit, g.S(430), g.S(150), 'cond', 0.27)} usize={g.S(40)} uf="extraBold" color="#f4efe6" lh={0.9} /> : <View />}
        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
          {c.stats.slice(0, 3).map((s, i) => <Tx key={s.key + i} t={`${court(s.label)}  ${valeurTexte(s)}`} size={g.S(28)} f="extraBold" color="#f4efe6" ls={g.S(3)} lh={1.5} />)}
        </View>
      </View>
      </Bloc>
      <Pied g={g} ink={BLANC} gauche={130} droite={130} bas={250} petit />
    </>
  );
}

// ============================================
// 07 MAILLOT
// ============================================

const PALETTE_MAILLOT = {
  course: { wall: '#1747FF', j: '#FF3B1F', n: BLANC, o: '#111111', trim: '#FFE500' },
  muscu: { wall: '#FFD000', j: '#111111', n: '#FFD000', o: BLANC, trim: '#FF2D55' },
  combat: { wall: '#FF2D55', j: '#F5F5F5', n: '#1747FF', o: '#111111', trim: '#1747FF' },
} as const;

/** Ce qui est floque : le record s'il y en a un (sa charge), sinon ton chiffre du jour */
export function flocage(c: Pick<CtxDirection, 'd' | 'hero' | 'record' | 'titre' | 'u'>): { numero: string; sous: string; dos: string } | null {
  const e = c.d.exploit;
  if (c.d.moment === 'exploit' && e) return e.hero.value ? { numero: e.hero.value, sous: [e.hero.unit, e.accroche].filter(Boolean).join(' '), dos: e.surtitre } : null;
  const r = c.d.seance?.records?.[0];
  if (r?.poids && r.reps) return { numero: chargeTexte(r.poids, c.u).replace(/\s*(kg|lb)$/i, ''), sous: traduire('{0} au {1}, record', c.u, sansTiret(r.nom).toLowerCase()), dos: c.titre };
  if (!c.hero) return null;
  return { numero: c.hero.value, sous: `${c.hero.unit ? `${c.hero.unit} ` : ''}${traduire(c.hero.label)}`, dos: c.titre };
}

function Maillot(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const p = PALETTE_MAILLOT[teinteSport(c.d)];
  const f = flocage(c);
  const clair = p.wall === '#FFD000';
  const n = f?.numero ?? '';
  const fs = Math.min(n.length > 2 ? 360 : 470, 560 / Math.max(1, n.length * 0.44));
  const yN = n.length > 2 ? 640 : 700;
  const sous = (f?.sous ?? '').toUpperCase();
  const dos = (f?.dos ?? '').toUpperCase();
  const fsDos = Math.min(78, 600 / Math.max(1, dos.length * 0.5));
  const fsSous = Math.min(38, 640 / Math.max(1, sous.length * 0.62));
  const jw = g.S(940);
  const st = c.stats.slice(0, 3);
  return (
    <>
      <View style={[plein, { backgroundColor: p.wall }]} />
      <Svg width={c.W} height={c.H} style={plein}>
        <Defs>
          <RadialGradient id="mw" cx="50%" cy="35%" rx="90%" ry="70%">
            <Stop offset="0.45" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.4} />
          </RadialGradient>
        </Defs>
        <Rect width={c.W} height={c.H} fill="url(#mw)" />
      </Svg>
      <Tx t={c.date} size={g.S(30)} color={clair ? '#111111' : BLANC} ls={g.S(9)} maj align="center" style={{ position: 'absolute', left: 0, right: 0, top: g.Y(235) - g.S(30) }} />
      {/* le maillot et ses chiffres : un seul bloc, deplace et redimensionne au doigt dans l'atelier */}
      <Bloc c={c} pivot={{ x: c.W / 2, y: g.Y(860) }}>
      <Svg width={jw} height={g.S(1040)} viewBox="0 0 940 1040" style={{ position: 'absolute', left: g.X(70), top: g.Y(290) }}>
        <Defs>
          <Pattern id="mesh" width="14" height="14" patternUnits="userSpaceOnUse">
            <Circle cx="7" cy="7" r="2.6" fill="rgba(0,0,0,0.16)" />
          </Pattern>
          <SvgGradient id="fold" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity={0.28} />
            <Stop offset="0.18" stopColor="#000" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#fff" stopOpacity={0.1} />
            <Stop offset="0.82" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.3} />
          </SvgGradient>
          <ClipPath id="jc">
            <Path d="M300 60 Q470 120 640 60 L830 140 Q900 175 915 250 L930 420 L780 450 L770 330 L770 1010 Q470 1040 170 1010 L170 330 L160 450 L10 420 L25 250 Q40 175 110 140 Z" />
          </ClipPath>
        </Defs>
        <Path d="M470 0 L470 40 M380 70 Q470 -10 560 70" stroke="#222" strokeWidth={10} fill="none" strokeLinecap="round" />
        <Path d="M150 140 Q470 30 790 140" stroke="#3a2a1a" strokeWidth={22} fill="none" strokeLinecap="round" />
        <G clipPath="url(#jc)">
          <Rect width="940" height="1040" fill={p.j} />
          <Rect width="940" height="1040" fill="url(#mesh)" />
          <Path d="M10 395 L170 420 L170 380 L15 355 Z M930 395 L770 420 L770 380 L925 355 Z" fill={p.trim} />
          <Path d="M300 60 Q470 120 640 60 L640 80 Q470 140 300 80 Z" fill={p.trim} />
          <Rect x="170" y="960" width="600" height="18" fill={p.trim} />
          {dos ? <SvgText x="470" y="240" textAnchor="middle" fontFamily={policesCartes.condense} fontSize={fsDos} letterSpacing={8} fill={p.n} stroke={p.o} strokeWidth={6}>{dos}</SvgText> : null}
          {dos ? <SvgText x="470" y="240" textAnchor="middle" fontFamily={policesCartes.condense} fontSize={fsDos} letterSpacing={8} fill={p.n}>{dos}</SvgText> : null}
          {n ? <SvgText x="470" y={yN} textAnchor="middle" fontFamily={policesCartes.condense} fontSize={fs} fill={p.o} stroke={p.o} strokeWidth={26} strokeLinejoin="round">{n}</SvgText> : null}
          {n ? <SvgText x="470" y={yN} textAnchor="middle" fontFamily={policesCartes.condense} fontSize={fs} fill={p.n}>{n}</SvgText> : null}
          {n ? <SvgText x="470" y={yN} textAnchor="middle" fontFamily={policesCartes.condense} fontSize={fs} fill="none" stroke={p.trim} strokeWidth={5} strokeDasharray="14 9" opacity={0.9}>{n}</SvgText> : null}
          {sous ? <SvgText x="470" y="800" textAnchor="middle" fontFamily={policesCartes.condense} fontSize={fsSous} letterSpacing={4} fill={p.n} opacity={0.95}>{sous}</SvgText> : null}
          <G transform="translate(395 870)">
            <Rect width="150" height="56" rx="10" fill="#fff" />
            <SvgImage href={LOGO} x="6" y="4" width="48" height="48" />
            <SvgText x="62" y="37" fontFamily={policesCartes.condense} fontSize="26" letterSpacing="2" fill="#111">YOROI</SvgText>
          </G>
          <Rect width="940" height="1040" fill="url(#fold)" />
        </G>
      </Svg>
      {st.length ? (
        <View style={{ position: 'absolute', left: g.X(72), right: g.X(72), top: g.Y(1350), flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#111111', borderRadius: g.S(26), paddingVertical: g.S(26), paddingHorizontal: g.S(34) }}>
          {st.map((s, i) => (
            <View key={s.key + i} style={{ alignItems: 'center', flexShrink: 1 }}>
              <Tx t={court(s.label)} size={g.S(20)} f="extraBold" color={p.trim === '#1747FF' ? '#5B8BFF' : p.trim} ls={g.S(4)} />
              <Chiffre v={s.value} u={s.unit} f="black" size={tailleChiffre(s.value, s.unit, g.S(860) / st.length, g.S(52), 'black', 0.42)} usize={g.S(22)} color={BLANC} />
            </View>
          ))}
        </View>
      ) : null}
      </Bloc>
      <Pied g={g} ink={clair ? '#111111' : BLANC} />
    </>
  );
}

// ============================================
// 08 AFFICHE DE GALA
// ============================================

const JAUNE_GALA = '#FFD400';
const ROUGE_GALA = '#E50914';
const OMBRE_TOI: TextStyle = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 4 } };

/** Le face a face de la seance : les lignes avant et aujourd'hui, le verdict ; seul sans seance precedente */
function faceAFace(c: CtxDirection) {
  const lignes = lignesGala(c.d);
  const solo = !lignes.length;
  const v = texteVerdict(verdictGala(lignes));
  // sans seance precedente : seulement aujourd'hui, tes chiffres du jour
  const rangees = solo ? [c.hero, ...c.stats].filter((x): x is StatValue => !!x).slice(0, 3).map((s) => ({ label: court(s.label) + (s.unit ? ` (${s.unit.toUpperCase()})` : ''), avant: '', apres: s.value })) : lignes.map((l) => ({ label: court(l.label) + (l.unite ? ` (${l.unite.toUpperCase()})` : ''), avant: l.avant, apres: l.apres }));
  return { solo, v, rangees };
}

/** 08 avec ta photo : ta photo en bichromie rouge en plein cadre, l'affiche au coin, le face a face en bas */
function GalaPhoto(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const b = blocDeCarte(c.format, c.W, c.H);
  const co = coinDeCarte(c.format, c.W, c.H);
  const k = echelleBloc(b);
  const { solo, v, rangees } = faceAFace(c);
  const larg = b.w * 0.27;
  return (
    <>
      <View style={[plein, { backgroundColor: '#0a0a0a', overflow: 'hidden' }]}>
        {c.photo ? <Photo src={c.photo} style={Platform.OS === 'android' ? { filter: [{ grayscale: 1 }, { contrast: 1.4 }, { brightness: 0.9 }] } : undefined} /> : null}
        <View style={[plein, { backgroundColor: ROUGE_GALA, mixBlendMode: 'multiply' }]} />
        <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(10,10,10,0.55)', '#0a0a0a']} locations={[0, 0.16, 0.5, 0.68]} style={plein} />
      </View>
      <View style={{ position: 'absolute', left: co.x, top: co.y, width: co.w, gap: 3 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: JAUNE_GALA, paddingVertical: 1.5, paddingHorizontal: 7, transform: [{ skewX: '-10deg' }] }}>
          <Tx t={traduire('COMBAT PRINCIPAL')} f="anton" size={Math.min(12, co.h * 0.24)} color="#111111" ls={1.4} />
        </View>
        <Tx t={`${c.date}${c.titre ? ` · ${c.titre}` : ''}`} size={Math.min(8, co.h * 0.17)} color={BLANC} ls={1.1} maj ombre lines={2} lh={1.15} />
      </View>
      <Bloc c={c} pivot={centre(b)}>
        <View style={boiteBloc(b)}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 * k }}>
            <Tx t={traduire('TOI')} f="anton" size={40 * k} color={BLANC} lh={1.0} style={OMBRE_TOI} />
            {solo ? null : (
              <>
                <View style={{ width: 22 * k, height: 22 * k, borderRadius: 11 * k, backgroundColor: JAUNE_GALA, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}>
                  <Tx t="VS" f="anton" size={11 * k} color="#111111" />
                </View>
                <Tx t={traduire('TOI')} f="anton" size={40 * k} color={BLANC} lh={1.0} style={OMBRE_TOI} />
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: solo ? 'center' : 'space-between', marginTop: 2 * k }}>
            {solo ? null : <Tx t={traduire('Séance précédente')} size={7.2 * k} color={BLANC} ls={1.4 * k} maj />}
            <Tx t={traduire('Aujourd’hui')} size={7.2 * k} color={JAUNE_GALA} ls={1.4 * k} maj />
          </View>
          {rangees.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 25 * k, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
              <Tx t={r.avant} f="anton" size={tailleQuiTient(r.avant || '0', larg, 23 * k, 'anton')} color={rgba(BLANC, 0.55)} style={{ width: larg }} />
              <Tx t={r.label} size={7 * k} f="extraBold" color={BLANC} ls={1.2 * k} align="center" style={{ flex: 1 }} />
              <Tx t={r.apres} f="anton" size={tailleQuiTient(r.apres, larg, 23 * k, 'anton')} color={JAUNE_GALA} align="right" style={{ width: larg }} />
            </View>
          ))}
          <View style={{ marginTop: 8 * k, marginHorizontal: -6 * k, backgroundColor: ROUGE_GALA, transform: [{ rotate: '-2.5deg' }], paddingVertical: 4 * k, alignItems: 'center' }}>
            <Text allowFontScaling={false} numberOfLines={1} style={[police('anton'), { fontSize: tailleQuiTient(`${v.debut} ${v.fin}`, b.w, 17 * k, 'anton'), color: BLANC, letterSpacing: 1.2 * k }]}>
              {`${v.debut} `}
              <Text style={{ color: JAUNE_GALA }}>{v.fin}</Text>
            </Text>
          </View>
        </View>
      </Bloc>
      <Pied g={g} ink={BLANC} bas={250} />
    </>
  );
}

function Gala(c: CtxDirection) {
  if (visage(c, 'gala')) return GalaPhoto(c);
  const g = geo(c.format, c.W);
  const { solo, v, rangees } = faceAFace(c);
  const JAUNE = JAUNE_GALA;
  const ROUGE = ROUGE_GALA;
  return (
    <>
      <View style={[plein, { backgroundColor: '#0a0a0a' }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: g.Y(1130), overflow: 'hidden', backgroundColor: c.coul.id === 'noir' ? ROUGE : c.coul.fond }}>
        {c.photo ? (
          <>
            <Photo src={c.photo} style={Platform.OS === 'android' ? { filter: [{ grayscale: 1 }, { contrast: 1.4 }, { brightness: 0.9 }] } : undefined} />
            {/* la bichromie rouge : le rouge multiplie la photo */}
            <View style={[plein, { backgroundColor: ROUGE, mixBlendMode: 'multiply' }]} />
          </>
        ) : (
          <LinearGradient colors={[c.coul.id === 'noir' ? ROUGE : c.coul.fond, c.coul.id === 'noir' ? '#5a0004' : c.coul.profond]} style={plein} />
        )}
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', '#0a0a0a']} locations={[0, 0.3, 0.6, 1]} style={plein} />
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: g.Y(230) - g.S(30), alignItems: 'center' }}>
        <Tx t={`${c.date}${c.titre ? ` · ${c.titre}` : ''}`} size={g.S(26)} color={BLANC} ls={g.S(6)} maj style={{ maxWidth: c.W - 30 }} align="center" />
        <View style={{ marginTop: g.S(16), backgroundColor: JAUNE, paddingVertical: g.S(6), paddingHorizontal: g.S(26), transform: [{ skewX: '-10deg' }] }}>
          <Tx t={traduire('COMBAT PRINCIPAL')} f="anton" size={g.S(44)} color="#111111" ls={g.S(6)} />
        </View>
      </View>
      <Bloc c={c} pivot={{ x: c.W / 2, y: g.Y(1100) }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: g.Y(620), flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: g.S(30) }}>
        <Tx t={traduire('TOI')} f="anton" size={g.S(320)} color={BLANC} lh={0.95} style={{ textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 4 } }} />
        {solo ? null : (
          <>
            <View style={{ width: g.S(150), height: g.S(150), borderRadius: g.S(75), backgroundColor: JAUNE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}>
              <Tx t="VS" f="anton" size={g.S(78)} color="#111111" />
            </View>
            <Tx t={traduire('TOI')} f="anton" size={g.S(320)} color={BLANC} lh={0.95} style={{ textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 4 } }} />
          </>
        )}
      </View>
      <View style={{ position: 'absolute', left: g.X(120), right: g.X(120), top: g.Y(930), flexDirection: 'row', justifyContent: solo ? 'center' : 'space-between' }}>
        {solo ? null : <Tx t={traduire('Séance précédente')} size={g.S(26)} color={BLANC} ls={g.S(5)} maj />}
        <Tx t={traduire('Aujourd’hui')} size={g.S(26)} color={JAUNE} ls={g.S(5)} maj />
      </View>
      <View style={{ position: 'absolute', left: g.X(72), right: g.X(72), top: g.Y(1010) }}>
        {rangees.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: g.S(112), borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
            <Tx t={r.avant} f="anton" size={tailleQuiTient(r.avant || '0', g.S(300), g.S(84), 'anton')} color={rgba(BLANC, 0.55)} style={{ width: g.S(300) }} />
            <Tx t={r.label} size={g.S(24)} f="extraBold" color={BLANC} ls={g.S(4)} align="center" style={{ flex: 1 }} />
            <Tx t={r.apres} f="anton" size={tailleQuiTient(r.apres, g.S(300), g.S(84), 'anton')} color={JAUNE} align="right" style={{ width: g.S(300) }} />
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', left: g.X(40), right: g.X(40), top: g.Y(1380), backgroundColor: ROUGE, transform: [{ rotate: '-2.5deg' }], paddingVertical: g.S(18), alignItems: 'center' }}>
        <Text allowFontScaling={false} numberOfLines={1} style={[police('anton'), { fontSize: tailleQuiTient(`${v.debut} ${v.fin}`, g.S(960), g.S(60), 'anton'), color: BLANC, letterSpacing: g.S(4) }]}>
          {`${v.debut} `}
          <Text style={{ color: JAUNE }}>{v.fin}</Text>
        </Text>
      </View>
      </Bloc>
      <Pied g={g} ink={BLANC} bas={250} />
    </>
  );
}

// ============================================
// 09 SERIE EN FEU
// ============================================

const JOURS_LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Le jour de la carte (lundi 0), dans la derniere semaine de la grille ; -1 sans date */
function jourDeCarte(d: CarteData): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.dateIso ?? '');
  if (!m) return -1;
  return (new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getDay() + 6) % 7;
}

function pillsSerie(c: CtxDirection): { l: string; v: string }[] {
  return [c.d.moment === 'seance' ? { l: traduire('Aujourd’hui'), v: c.titre } : null, c.hero ? { l: '', v: valeurTexte(c.hero) } : null, c.stats[0] ? { l: '', v: `${valeurTexte(c.stats[0])} ${traduire(c.stats[0].label)}` } : null].filter((x): x is { l: string; v: string } => !!x);
}

/** 09 avec ta photo : ta photo nette, la flamme au coin, le nombre de semaines et la grille compacte en bas */
function SeriePhoto(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const b = blocDeCarte(c.format, c.W, c.H);
  const co = coinDeCarte(c.format, c.W, c.H);
  const k = echelleBloc(b);
  const nb = String(serieDe(c.d) ?? '');
  const grille = grilleDe(c.d);
  const dow = jourDeCarte(c.d);
  const ts = Math.min(74 * k, (b.w * 0.42) / Math.max(1, nb.length * 0.45));
  const cw = 8.4 * k;
  const ch = 6.4 * k;
  const gap = 2 * k;
  return (
    <>
      <View style={[plein, { backgroundColor: '#000' }]}>{c.photo ? <Photo src={c.photo} /> : null}</View>
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(30,6,0,0.45)', 'rgba(120,34,0,0.82)']} locations={[0.48, 0.64, 1]} style={plein} />
      <Sticker src={STICKERS.flamme} x={co.x} y={co.y} w={Math.min(co.h, co.w)} />
      <Bloc c={c} pivot={centre(b)}>
        <View style={boiteBloc(b)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 * k }}>
            <View style={{ flexShrink: 1 }}>
              <Svg width={b.w * 0.46} height={ts * 1.02}>
                <Defs>
                  <SvgGradient id="snp" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0.3" stopColor="#ffffff" />
                    <Stop offset="0.7" stopColor="#FFD24A" />
                    <Stop offset="1" stopColor="#FF7A00" />
                  </SvgGradient>
                </Defs>
                <SvgText x={0} y={ts * 0.92} fontFamily={policesCartes.condense} fontSize={ts} fill="rgba(0,0,0,0.35)" dy={2}>{nb}</SvgText>
                <SvgText x={0} y={ts * 0.92} fontFamily={policesCartes.condense} fontSize={ts} fill="url(#snp)">{nb}</SvgText>
              </Svg>
              <Tx t={traduire('semaines d’affilée')} size={9.5 * k} color={BLANC} ls={1.6 * k} maj ombre />
            </View>
            {grille ? (
              <View style={{ flexDirection: 'row', gap, marginBottom: 2 * k }}>
                {grille.map((sem, w) => (
                  <View key={w} style={{ gap }}>
                    {sem.map((on, j) => (w === 11 && j === dow ? (
                      <View key={j} style={{ width: cw, height: ch, borderRadius: 2 * k, backgroundColor: BLANC, borderWidth: 1, borderColor: '#FF5A00' }} />
                    ) : (
                      <View key={j} style={{ width: cw, height: ch, borderRadius: 2 * k, backgroundColor: on ? ((w * 7 + j) % 3 === 1 ? '#FFB020' : '#FF6A00') : 'rgba(255,255,255,0.18)' }} />
                    )))}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 * k, marginTop: 8 * k }}>
            {pillsSerie(c).map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 * k, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingVertical: 4 * k, paddingHorizontal: 9 * k, maxWidth: b.w }}>
                {p.l ? <Tx t={p.l} size={6.6 * k} f="extraBold" color={rgba(BLANC, 0.8)} ls={1 * k} maj /> : null}
                <Tx t={p.v} size={10.5 * k} color={BLANC} style={{ flexShrink: 1 }} />
              </View>
            ))}
          </View>
        </View>
      </Bloc>
      <Pied g={g} ink={BLANC} />
    </>
  );
}

function Serie(c: CtxDirection) {
  if (visage(c, 'serie')) return SeriePhoto(c);
  const g = geo(c.format, c.W);
  const n = serieDe(c.d);
  const grille = grilleDe(c.d);
  const dow = jourDeCarte(c.d);
  const nb = String(n ?? '');
  const taille = Math.min(g.S(340), (c.W * 0.8) / Math.max(1, nb.length * 0.45));
  const case_ = { w: g.S(54), h: g.S(40), gap: g.S(9) };
  const pills = pillsSerie(c);
  return (
    <>
      <View style={[plein, { backgroundColor: c.photo ? '#000' : c.coul.profond }]}>
        {c.photo ? <Photo src={c.photo} style={{ opacity: 0.55 }} /> : <LinearGradient colors={['#1a0a00', c.coul.id === 'noir' ? '#3a1200' : c.coul.profond]} style={plein} />}
      </View>
      <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(20,4,0,0.55)', 'rgba(255,80,0,0.55)']} locations={[0, 0.45, 1]} style={plein} />
      <Svg width={g.S(500)} height={g.S(500)} style={{ position: 'absolute', left: g.X(290), top: g.Y(150) }}>
        <Defs>
          <RadialGradient id="sg" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="rgb(255,150,0)" stopOpacity={0.85} />
            <Stop offset="0.65" stopColor="rgb(255,60,0)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sg)" />
      </Svg>
      <Bloc c={c} pivot={{ x: c.W / 2, y: g.Y(1000) }}>
      <Sticker src={STICKERS.flamme} x={g.X(375)} y={g.Y(215)} w={g.S(330)} />
      <Svg width={c.W} height={taille * 1.02} style={{ position: 'absolute', left: 0, top: g.Y(575) }}>
        <Defs>
          <SvgGradient id="sn" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.3" stopColor="#ffffff" />
            <Stop offset="0.7" stopColor="#FFD24A" />
            <Stop offset="1" stopColor="#FF7A00" />
          </SvgGradient>
        </Defs>
        <SvgText x={c.W / 2} y={taille * 0.92} textAnchor="middle" fontFamily={policesCartes.condense} fontSize={taille} fill="rgba(0,0,0,0.35)" dy={4}>{nb}</SvgText>
        <SvgText x={c.W / 2} y={taille * 0.92} textAnchor="middle" fontFamily={policesCartes.condense} fontSize={taille} fill="url(#sn)">{nb}</SvgText>
      </Svg>
      <Tx t={traduire('semaines d’affilée')} size={g.S(46)} color={BLANC} ls={g.S(8)} maj align="center" style={{ position: 'absolute', left: 0, right: 0, top: g.Y(885) }} />
      {grille ? (
        <View style={{ position: 'absolute', left: g.X(96), top: g.Y(1010), flexDirection: 'row', gap: case_.gap }}>
          <View style={{ gap: case_.gap, width: g.S(40) }}>
            {JOURS_LETTRES.map((j, i) => <View key={i} style={{ height: case_.h, justifyContent: 'center' }}><Tx t={j} size={g.S(22)} color={rgba(BLANC, 0.75)} /></View>)}
          </View>
          {grille.map((sem, w) => (
            <View key={w} style={{ gap: case_.gap }}>
              {sem.map((on, j) => {
                const auj = w === 11 && j === dow;
                return auj ? (
                  <View key={j} style={{ width: case_.w, height: case_.h, borderRadius: g.S(10), backgroundColor: BLANC, borderWidth: g.S(4), borderColor: '#FF5A00' }} />
                ) : on ? (
                  <LinearGradient key={j} colors={(w * 7 + j) % 3 === 1 ? ['#FFE27A', '#FF8A00'] : ['#FFC93C', '#FF5A00']} style={{ width: case_.w, height: case_.h, borderRadius: g.S(10) }} />
                ) : (
                  <View key={j} style={{ width: case_.w, height: case_.h, borderRadius: g.S(10), backgroundColor: 'rgba(255,255,255,0.14)' }} />
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: g.X(72), right: g.X(72), top: g.Y(grille ? 1450 : 1050), flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: g.S(18) }}>
        {pills.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: g.S(10), backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingVertical: g.S(12), paddingHorizontal: g.S(26), maxWidth: c.W - 30 }}>
            {p.l ? <Tx t={p.l} size={g.S(20)} f="extraBold" color={rgba(BLANC, 0.8)} ls={g.S(3)} maj /> : null}
            <Tx t={p.v} size={g.S(32)} color={BLANC} style={{ flexShrink: 1 }} />
          </View>
        ))}
      </View>
      </Bloc>
      <Pied g={g} ink={BLANC} />
    </>
  );
}

// ============================================
// 10 DIFFUSION TV
// ============================================

const ACCENT_TV = { course: '#FF4D00', muscu: '#E50914', combat: '#1F6BFF' } as const;

/** Le panneau de droite : temps au kilometre, exercices et charges, techniques ; vide sans donnee */
export function panneauTv(d: CarteData, u: UnitePoids): { titre: string; lignes: { g: string; dr: string; top: boolean }[] } | null {
  const s = d.moment === 'seance' ? d.seance : null;
  if (!s) return null;
  if (s.splits && s.splits.length >= 2) {
    const best = Math.min(...s.splits.map((x) => x.secondes));
    return { titre: traduire('Temps au km'), lignes: s.splits.slice(0, 10).map((x) => ({ g: `KM ${x.km}`, dr: allureTexte(x.secondes), top: x.secondes === best })) };
  }
  if (s.meilleures?.length) {
    const rec = (s.records ?? []).map((r) => r.nom.toLowerCase());
    return { titre: traduire('Exercices'), lignes: s.meilleures.slice(0, 6).map((m) => ({ g: sansTiret(m.nom), dr: `${chargeTexte(m.poids, u)} ${FOIS} ${m.reps}`, top: rec.includes(m.nom.toLowerCase()) })) };
  }
  if (s.techniques?.length) return { titre: traduire('Techniques'), lignes: s.techniques.slice(0, 6).map((t) => ({ g: sansTiret(t), dr: '', top: false })) };
  return null;
}

function Tv(c: CtxDirection) {
  const g = geo(c.format, c.W);
  const acc = ACCENT_TV[teinteSport(c.d)];
  const pan = panneauTv(c.d, c.u);
  const course = !!c.d.seance?.splits?.length;
  const h = c.hero;
  const bandeau = [c.record ? `${traduire('RECORD BATTU')} · ${c.record.nom.toUpperCase()} ${c.record.court.toUpperCase()}` : null, ...[h, ...c.stats].filter((x): x is StatValue => !!x).map((s) => `${court(s.label)} ${valeurTexte(s).toUpperCase()}`)].filter(Boolean).join(' · ');
  const rh = g.S(course ? 52 : 70);
  // avec ta photo : le panneau de droite (temps au km, exercices) cacherait le visage, il laisse la place ;
  // la barre YOROI EN DIRECT reste petite dans le coin
  const vis = visage(c, 'tv');
  const m = vis ? 0.68 : 1;
  const S = (px: number) => g.S(px) * m;
  return (
    <>
      <View style={[plein, { backgroundColor: c.coul.fond }]}>
        {c.photo ? <Photo src={c.photo} /> : <LinearGradient colors={[c.coul.fond, c.coul.profond]} style={plein} />}
      </View>
      <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} locations={[0, 0.25, 0.5, 0.85]} style={plein} />
      <View style={{ position: 'absolute', left: vis ? coinDeCarte(c.format, c.W, c.H).x : g.X(60), top: g.Y(230), height: S(72), flexDirection: 'row' }}>
        <View style={{ backgroundColor: BLANC, flexDirection: 'row', alignItems: 'center', gap: S(10), paddingLeft: S(10), paddingRight: S(20) }}>
          <Image source={LOGO} style={{ width: S(54), height: S(54), borderRadius: S(12) }} />
          <Tx t="YOROI" size={S(32)} color="#111111" ls={S(4)} />
        </View>
        <View style={{ backgroundColor: acc, flexDirection: 'row', alignItems: 'center', gap: S(12), paddingHorizontal: S(22) }}>
          <View style={{ width: S(16), height: S(16), borderRadius: S(8), backgroundColor: BLANC }} />
          <Tx t={traduire('EN DIRECT')} size={S(28)} color={BLANC} ls={S(4)} />
        </View>
        {c.d.heure ? (
          <View style={{ backgroundColor: '#111111', justifyContent: 'center', paddingHorizontal: S(22) }}>
            <Tx t={c.d.heure} size={S(30)} color={BLANC} />
          </View>
        ) : null}
      </View>
      {pan && !vis && (c.format === 'story' || pan.lignes.length <= 6) ? (
        <View style={{ position: 'absolute', right: g.X(60), top: g.Y(340), width: g.S(440), backgroundColor: 'rgba(10,10,14,0.82)', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ backgroundColor: acc, paddingVertical: g.S(14), paddingHorizontal: g.S(20) }}>
            <Tx t={pan.titre} size={g.S(24)} color={BLANC} ls={g.S(4)} maj />
          </View>
          {pan.lignes.map((l, i) => (
            <View key={i} style={{ height: rh, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: g.S(20), borderTopWidth: i ? 0.5 : 0, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: l.top ? '#FFD400' : 'transparent', gap: 6 }}>
              <Tx t={l.g} size={g.S(course ? 26 : 24)} f="extraBold" color={l.top ? '#111111' : BLANC} style={{ flexShrink: 1 }} />
              {l.dr ? <Tx t={l.dr} size={g.S(course ? 28 : 26)} color={l.top ? '#111111' : BLANC} /> : null}
            </View>
          ))}
        </View>
      ) : null}
      <Bloc c={c} pivot={{ x: c.W / 2, y: g.Y(1300) }}>
      <View style={{ position: 'absolute', left: g.X(70), right: g.X(70), top: g.Y(1080) }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: BLANC, paddingVertical: g.S(10), paddingHorizontal: g.S(26), transform: [{ skewX: '-12deg' }], maxWidth: '100%' }}>
          <Tx t={`${c.titre} · ${c.date}`} size={g.S(34)} color="#111111" ls={g.S(4)} maj />
        </View>
        <View style={{ marginTop: g.S(6), flexDirection: 'row', alignItems: 'stretch', transform: [{ skewX: '-12deg' }] }}>
          {h ? (
            <View style={{ backgroundColor: acc, paddingTop: g.S(8), paddingBottom: g.S(4), paddingHorizontal: g.S(28), justifyContent: 'center' }}>
              <Chiffre v={h.value} u={h.unit} size={tailleChiffre(h.value, h.unit, g.S(c.stats.length ? 470 : 860), g.S(h.value.length > 4 ? 150 : 170), 'cond', 0.3)} usize={g.S(50)} color={BLANC} />
            </View>
          ) : null}
          {c.stats.length ? (
            <View style={{ backgroundColor: '#111111', flex: 1, flexDirection: 'row' }}>
              {c.stats.slice(0, 3).map((s, i) => (
                <View key={s.key + i} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 0.7, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 2 }}>
                  <Tx t={court(s.label)} size={g.S(17)} f="extraBold" color={rgba(BLANC, 0.75)} ls={g.S(3)} />
                  <Chiffre v={s.value} u={s.unit} f="black" size={tailleChiffre(s.value, s.unit, g.S(140), g.S(course ? 40 : 46), 'black', 0.44)} usize={g.S(20)} color={BLANC} />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      {bandeau ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: g.Y(1440), height: g.S(62), backgroundColor: '#FFD400', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#111111', height: '100%', justifyContent: 'center', paddingHorizontal: g.S(22), marginRight: g.S(22) }}>
            <Tx t={traduire('EN BREF')} size={g.S(28)} color="#FFD400" ls={g.S(4)} />
          </View>
          <Tx t={`${bandeau} · ${bandeau}`} size={g.S(28)} color="#111111" ls={g.S(2)} style={{ flexShrink: 0 }} />
        </View>
      ) : null}
      </Bloc>
      <Pied g={g} ink={BLANC} />
    </>
  );
}

// ============================================
// LE CHOIX DU DESSIN
// ============================================

export const DESSINS: Record<DirectionId, (c: CtxDirection) => React.ReactElement> = {
  net: Net,
  chrome: Chrome,
  stickers: Stickers,
  holo: Holo,
  retro: Retro,
  flash: Flash,
  maillot: Maillot,
  gala: Gala,
  serie: Serie,
  tv: Tv,
};

export function Dessin({ id, c }: { id: DirectionId; c: CtxDirection }) {
  const F = DESSINS[id] ?? Net;
  return F(c);
}

/** Le fond de la carte sous le dessin (transparent pour l'autocollant seul) */
export function fondDe(id: DirectionId, c: Pick<CtxDirection, 'transparent' | 'coul'>): string {
  if (c.transparent) return 'transparent';
  if (id === 'flash' || id === 'gala') return '#0a0a0a';
  if (id === 'holo') return '#050208';
  return c.coul.fond;
}

